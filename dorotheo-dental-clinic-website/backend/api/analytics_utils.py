"""
Analytics utility functions for the Dorotheo Dental Clinic Management System.

All aggregation query functions used by the analytics API endpoint.
Uses Django ORM only (no raw SQL). Revenue is based on Payment model,
not the legacy Billing model.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.db.models import (
    Sum, Count, Avg, F, Q, Value, Min, Subquery, OuterRef
)
from django.db.models.functions import (
    TruncDay, TruncWeek, TruncMonth, TruncYear, ExtractHour, Coalesce
)

from api.models import (
    Payment, PaymentSplit, Invoice, InvoiceItem,
    Appointment, Service, User, InventoryItem, ClinicLocation
)


# =============================================================================
# Helper Functions
# =============================================================================

def get_date_range(period, start_date=None, end_date=None):
    """
    Returns (start_date, end_date) tuple based on period or custom dates.
    
    Periods:
        - daily: today only
        - weekly: last 7 days
        - monthly: last 30 days
        - annual: last 365 days
    """
    today = date.today()

    if start_date and end_date:
        # Custom dates provided — parse if strings
        if isinstance(start_date, str):
            start_date = date.fromisoformat(start_date)
        if isinstance(end_date, str):
            end_date = date.fromisoformat(end_date)
        return start_date, end_date

    if period == 'daily':
        return today, today
    elif period == 'weekly':
        return today - timedelta(days=6), today
    elif period == 'annual':
        return today - timedelta(days=364), today
    else:
        # Default: monthly (last 30 days)
        return today - timedelta(days=29), today


def apply_clinic_filter(queryset, clinic_id, clinic_field='clinic'):
    """Optionally filters a queryset by clinic_id."""
    if clinic_id:
        return queryset.filter(**{clinic_field: clinic_id})
    return queryset


def get_trunc_function(period):
    """
    Returns the appropriate truncation function for time-series grouping.
    
    - daily: TruncDay (single day, but still group by day)
    - weekly: TruncDay (daily points within the week)
    - monthly: TruncDay (daily points within the month)
    - annual: TruncMonth (monthly points for 12 months)
    """
    trunc_map = {
        'daily': TruncDay,
        'weekly': TruncDay,
        'monthly': TruncDay,
        'annual': TruncMonth,
    }
    return trunc_map.get(period, TruncDay)


def _decimal_to_float(value):
    """Convert Decimal to float for JSON serialization."""
    if isinstance(value, Decimal):
        return float(value)
    return value or 0.0


# =============================================================================
# Financial Query Functions
# =============================================================================

def get_financial_summary(start_date, end_date, clinic_id=None):
    """
    Returns dict with total_revenue, total_invoiced, outstanding_balance,
    overdue_amount, total_expenses, profit, average_revenue_per_patient.
    """
    # --- Total Revenue (collected payments in period) ---
    payments_qs = Payment.objects.filter(
        is_voided=False,
        payment_date__range=(start_date, end_date)
    )
    payments_qs = apply_clinic_filter(payments_qs, clinic_id)
    total_revenue = payments_qs.aggregate(
        total=Coalesce(Sum('amount'), Value(Decimal('0')))
    )['total']

    # --- Total Invoiced (invoices created in period, excluding cancelled) ---
    invoices_qs = Invoice.objects.filter(
        invoice_date__range=(start_date, end_date)
    ).exclude(status='cancelled')
    invoices_qs = apply_clinic_filter(invoices_qs, clinic_id)
    total_invoiced = invoices_qs.aggregate(
        total=Coalesce(Sum('total_due'), Value(Decimal('0')))
    )['total']

    # --- Outstanding Balance (all sent/overdue invoices — snapshot, not date-filtered) ---
    outstanding_qs = Invoice.objects.filter(status__in=['sent', 'overdue'])
    outstanding_qs = apply_clinic_filter(outstanding_qs, clinic_id)
    outstanding_balance = outstanding_qs.aggregate(
        total=Coalesce(Sum('balance'), Value(Decimal('0')))
    )['total']

    # --- Overdue Amount ---
    overdue_qs = Invoice.objects.filter(status='overdue')
    overdue_qs = apply_clinic_filter(overdue_qs, clinic_id)
    overdue_amount = overdue_qs.aggregate(
        total=Coalesce(Sum('balance'), Value(Decimal('0')))
    )['total']

    # --- Total Expenses (items consumed via invoices in period) ---
    expense_qs = InvoiceItem.objects.filter(
        invoice__invoice_date__range=(start_date, end_date),
        invoice__status__in=['sent', 'paid', 'overdue']
    )
    if clinic_id:
        expense_qs = expense_qs.filter(invoice__clinic_id=clinic_id)
    total_expenses = expense_qs.aggregate(
        total=Coalesce(Sum('total_price'), Value(Decimal('0')))
    )['total']

    # --- Profit ---
    profit = total_revenue - total_expenses

    # --- Average Revenue per Patient ---
    unique_patients = payments_qs.values('patient').distinct().count()
    avg_revenue_per_patient = (
        _decimal_to_float(total_revenue) / unique_patients
        if unique_patients > 0 else 0.0
    )

    return {
        'total_revenue': _decimal_to_float(total_revenue),
        'total_invoiced': _decimal_to_float(total_invoiced),
        'outstanding_balance': _decimal_to_float(outstanding_balance),
        'overdue_amount': _decimal_to_float(overdue_amount),
        'total_expenses': _decimal_to_float(total_expenses),
        'profit': _decimal_to_float(profit),
        'average_revenue_per_patient': round(avg_revenue_per_patient, 2),
    }


def get_revenue_time_series(start_date, end_date, period, clinic_id=None):
    """
    Returns list of {date, revenue, expenses} dicts for charting.
    """
    trunc_fn = get_trunc_function(period)

    # Revenue time series
    payments_qs = Payment.objects.filter(
        is_voided=False,
        payment_date__range=(start_date, end_date)
    )
    payments_qs = apply_clinic_filter(payments_qs, clinic_id)
    revenue_series = (
        payments_qs
        .annotate(period_date=trunc_fn('payment_date'))
        .values('period_date')
        .annotate(revenue=Coalesce(Sum('amount'), Value(Decimal('0'))))
        .order_by('period_date')
    )

    # Expenses time series
    expense_qs = InvoiceItem.objects.filter(
        invoice__invoice_date__range=(start_date, end_date),
        invoice__status__in=['sent', 'paid', 'overdue']
    )
    if clinic_id:
        expense_qs = expense_qs.filter(invoice__clinic_id=clinic_id)
    expense_series = (
        expense_qs
        .annotate(period_date=trunc_fn('invoice__invoice_date'))
        .values('period_date')
        .annotate(expenses=Coalesce(Sum('total_price'), Value(Decimal('0'))))
        .order_by('period_date')
    )

    # Merge revenue and expenses by date
    revenue_map = {
        entry['period_date'].isoformat() if hasattr(entry['period_date'], 'isoformat') else str(entry['period_date']): _decimal_to_float(entry['revenue'])
        for entry in revenue_series
    }
    expense_map = {
        entry['period_date'].isoformat() if hasattr(entry['period_date'], 'isoformat') else str(entry['period_date']): _decimal_to_float(entry['expenses'])
        for entry in expense_series
    }

    # Combine all dates
    all_dates = sorted(set(list(revenue_map.keys()) + list(expense_map.keys())))

    return [
        {
            'date': d,
            'revenue': revenue_map.get(d, 0.0),
            'expenses': expense_map.get(d, 0.0),
        }
        for d in all_dates
    ]


def get_revenue_by_service(start_date, end_date, clinic_id=None):
    """
    Returns list of {service, category, revenue, count} dicts.
    Uses PaymentSplit → Invoice → Appointment → Service chain.
    """
    splits_qs = PaymentSplit.objects.filter(
        is_voided=False,
        payment__is_voided=False,
        payment__payment_date__range=(start_date, end_date)
    )
    if clinic_id:
        splits_qs = splits_qs.filter(payment__clinic_id=clinic_id)

    result = (
        splits_qs
        .values(
            service_name=F('invoice__appointment__service__name'),
            category=F('invoice__appointment__service__category')
        )
        .annotate(
            revenue=Coalesce(Sum('amount'), Value(Decimal('0'))),
            count=Count('id')
        )
        .order_by('-revenue')
    )

    return [
        {
            'service': entry['service_name'] or 'Unknown',
            'category': entry['category'] or 'other',
            'revenue': _decimal_to_float(entry['revenue']),
            'count': entry['count'],
        }
        for entry in result
    ]


def get_revenue_by_dentist(start_date, end_date, clinic_id=None):
    """
    Returns list of {dentist_id, dentist_name, revenue, appointment_count} dicts.
    Uses PaymentSplit.provider for dentist attribution.
    """
    splits_qs = PaymentSplit.objects.filter(
        is_voided=False,
        payment__is_voided=False,
        payment__payment_date__range=(start_date, end_date),
        provider__isnull=False
    )
    if clinic_id:
        splits_qs = splits_qs.filter(payment__clinic_id=clinic_id)

    result = (
        splits_qs
        .values(
            dentist_id=F('provider__id'),
            first=F('provider__first_name'),
            last=F('provider__last_name')
        )
        .annotate(
            revenue=Coalesce(Sum('amount'), Value(Decimal('0'))),
            appointment_count=Count('invoice__appointment', distinct=True)
        )
        .order_by('-revenue')
    )

    return [
        {
            'dentist_id': entry['dentist_id'],
            'dentist_name': f"{entry['first'] or ''} {entry['last'] or ''}".strip() or 'Unknown',
            'revenue': _decimal_to_float(entry['revenue']),
            'appointment_count': entry['appointment_count'],
        }
        for entry in result
    ]


def get_revenue_by_clinic(start_date, end_date):
    """
    Returns list of {clinic_id, clinic_name, revenue} dicts.
    """
    result = (
        Payment.objects.filter(
            is_voided=False,
            payment_date__range=(start_date, end_date),
            clinic__isnull=False
        )
        .values(
            clinic_id_val=F('clinic__id'),
            clinic_name=F('clinic__name')
        )
        .annotate(
            revenue=Coalesce(Sum('amount'), Value(Decimal('0')))
        )
        .order_by('-revenue')
    )

    return [
        {
            'clinic_id': entry['clinic_id_val'],
            'clinic_name': entry['clinic_name'] or 'Unknown',
            'revenue': _decimal_to_float(entry['revenue']),
        }
        for entry in result
    ]


def get_invoice_status_distribution(start_date, end_date, clinic_id=None):
    """
    Returns list of {status, count, total} dicts.
    """
    invoices_qs = Invoice.objects.filter(
        invoice_date__range=(start_date, end_date)
    )
    invoices_qs = apply_clinic_filter(invoices_qs, clinic_id)

    result = (
        invoices_qs
        .values('status')
        .annotate(
            count=Count('id'),
            total=Coalesce(Sum('total_due'), Value(Decimal('0')))
        )
        .order_by('-count')
    )

    return [
        {
            'status': entry['status'],
            'count': entry['count'],
            'total': _decimal_to_float(entry['total']),
        }
        for entry in result
    ]


def get_payment_method_distribution(start_date, end_date, clinic_id=None):
    """
    Returns list of {method, method_display, count, total} dicts.
    """
    payments_qs = Payment.objects.filter(
        is_voided=False,
        payment_date__range=(start_date, end_date)
    )
    payments_qs = apply_clinic_filter(payments_qs, clinic_id)

    # Build display name map from Payment model choices
    method_display_map = dict(Payment.PAYMENT_METHOD_CHOICES)

    result = (
        payments_qs
        .values('payment_method')
        .annotate(
            count=Count('id'),
            total=Coalesce(Sum('amount'), Value(Decimal('0')))
        )
        .order_by('-total')
    )

    return [
        {
            'method': entry['payment_method'],
            'method_display': method_display_map.get(entry['payment_method'], entry['payment_method']),
            'count': entry['count'],
            'total': _decimal_to_float(entry['total']),
        }
        for entry in result
    ]


# =============================================================================
# Operational Query Functions
# =============================================================================

def get_operational_summary(start_date, end_date, clinic_id=None):
    """
    Returns dict with total_appointments, completed, cancelled, missed counts,
    cancellation_rate, no_show_rate, new_patients, returning_patients,
    total_unique_patients.
    """
    # All appointments in date range — match by scheduled date OR completed_at date
    appt_qs = Appointment.objects.filter(
        Q(date__range=(start_date, end_date)) |
        Q(completed_at__date__range=(start_date, end_date))
    ).distinct()
    appt_qs = apply_clinic_filter(appt_qs, clinic_id)

    total_appointments = appt_qs.count()
    completed = appt_qs.filter(status='completed').count()
    cancelled = appt_qs.filter(status='cancelled').count()
    missed = appt_qs.filter(status='missed').count()

    cancellation_rate = round(
        (cancelled / total_appointments * 100) if total_appointments > 0 else 0, 1
    )
    no_show_rate = round(
        (missed / total_appointments * 100) if total_appointments > 0 else 0, 1
    )

    # --- New vs Returning Patients ---
    # First-ever completed appointment actual date per patient (use completed_at when set)
    all_completed_appts = (
        Appointment.objects.filter(status='completed')
        .only('patient_id', 'date', 'completed_at')
    )
    patient_first_map: dict = {}
    for appt in all_completed_appts:
        actual_date = appt.completed_at.date() if appt.completed_at else appt.date
        pid = appt.patient_id
        if pid not in patient_first_map or actual_date < patient_first_map[pid]:
            patient_first_map[pid] = actual_date

    # New = first actual visit falls within the date range
    new_patient_ids_set = {
        pid for pid, first_date in patient_first_map.items()
        if start_date <= first_date <= end_date
    }
    new_patients = len(new_patient_ids_set)

    # Returning = had a completed appointment in range, but first visit was before range
    returning_patients_qs = appt_qs.filter(status='completed').exclude(
        patient_id__in=new_patient_ids_set
    ).values('patient').distinct()
    returning_patients = returning_patients_qs.count()

    total_unique_patients = appt_qs.values('patient').distinct().count()

    return {
        'total_appointments': total_appointments,
        'completed': completed,
        'cancelled': cancelled,
        'missed': missed,
        'cancellation_rate': cancellation_rate,
        'no_show_rate': no_show_rate,
        'new_patients': new_patients,
        'returning_patients': returning_patients,
        'total_unique_patients': total_unique_patients,
    }


def get_appointment_status_distribution(start_date, end_date, clinic_id=None):
    """Returns list of {status, count} dicts."""
    appt_qs = Appointment.objects.filter(
        Q(date__range=(start_date, end_date)) |
        Q(completed_at__date__range=(start_date, end_date))
    ).distinct()
    appt_qs = apply_clinic_filter(appt_qs, clinic_id)

    result = (
        appt_qs
        .values('status')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    return [
        {'status': entry['status'], 'count': entry['count']}
        for entry in result
    ]


def get_top_services(start_date, end_date, clinic_id=None):
    """
    Returns top services by completed appointment count.
    List of {service, category, count} dicts.
    """
    appt_qs = Appointment.objects.filter(
        Q(date__range=(start_date, end_date)) |
        Q(completed_at__date__range=(start_date, end_date)),
        status='completed',
        service__isnull=False
    ).distinct()
    appt_qs = apply_clinic_filter(appt_qs, clinic_id)

    result = (
        appt_qs
        .values(
            service_name=F('service__name'),
            category=F('service__category')
        )
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    return [
        {
            'service': entry['service_name'] or 'Unknown',
            'category': entry['category'] or 'other',
            'count': entry['count'],
        }
        for entry in result
    ]


def get_appointments_by_clinic(start_date, end_date):
    """Returns list of {clinic_id, clinic_name, count} dicts."""
    result = (
        Appointment.objects.filter(
            Q(date__range=(start_date, end_date)) |
            Q(completed_at__date__range=(start_date, end_date)),
            clinic__isnull=False
        ).distinct()
        .values(
            clinic_id_val=F('clinic__id'),
            clinic_name=F('clinic__name')
        )
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    return [
        {
            'clinic_id': entry['clinic_id_val'],
            'clinic_name': entry['clinic_name'] or 'Unknown',
            'count': entry['count'],
        }
        for entry in result
    ]


def get_appointments_by_dentist(start_date, end_date, clinic_id=None):
    """Returns list of {dentist_id, dentist_name, count} dicts."""
    appt_qs = Appointment.objects.filter(
        Q(date__range=(start_date, end_date)) |
        Q(completed_at__date__range=(start_date, end_date)),
        dentist__isnull=False
    ).distinct()
    appt_qs = apply_clinic_filter(appt_qs, clinic_id)

    result = (
        appt_qs
        .values(
            dentist_id_val=F('dentist__id'),
            first=F('dentist__first_name'),
            last=F('dentist__last_name')
        )
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    return [
        {
            'dentist_id': entry['dentist_id_val'],
            'dentist_name': f"{entry['first'] or ''} {entry['last'] or ''}".strip() or 'Unknown',
            'count': entry['count'],
        }
        for entry in result
    ]


def get_busiest_hours(start_date, end_date, clinic_id=None):
    """Returns list of {hour, count} dicts sorted by count descending."""
    appt_qs = Appointment.objects.filter(
        Q(date__range=(start_date, end_date)) |
        Q(completed_at__date__range=(start_date, end_date)),
        status='completed'
    ).distinct()
    appt_qs = apply_clinic_filter(appt_qs, clinic_id)

    result = (
        appt_qs
        .annotate(hour=ExtractHour('time'))
        .values('hour')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    return [
        {'hour': entry['hour'], 'count': entry['count']}
        for entry in result
    ]


def get_patient_volume_time_series(start_date, end_date, period, clinic_id=None):
    """
    Returns list of {date, appointments, new_patients} dicts for time-series charting.
    """
    trunc_fn = get_trunc_function(period)

    # All appointments in period (match by scheduled date OR completed_at date)
    appt_qs = Appointment.objects.filter(
        Q(date__range=(start_date, end_date)) |
        Q(completed_at__date__range=(start_date, end_date)),
        status='completed'
    ).distinct()
    appt_qs = apply_clinic_filter(appt_qs, clinic_id)

    # Build appointment counts in Python, grouping by actual completion date
    # (falls back to scheduled date if completed_at is not set)
    from collections import defaultdict

    def _get_period_key(dt_date):
        if period == 'annual':
            return dt_date.replace(day=1).isoformat()
        return dt_date.isoformat()

    appt_count_map = defaultdict(int)
    for appt in appt_qs.only('date', 'completed_at'):
        actual_date = appt.completed_at.date() if appt.completed_at else appt.date
        # Only count if this date falls within the requested range
        if start_date <= actual_date <= end_date:
            appt_count_map[_get_period_key(actual_date)] += 1

    # New patients per period — use completed_at date if available, else scheduled date
    # First-ever completed appointment per patient (across all time)
    all_completed = (
        Appointment.objects.filter(status='completed')
        .only('patient_id', 'date', 'completed_at')
        .order_by('patient_id', 'date')
    )
    patient_first_map: dict = {}
    for appt in all_completed:
        actual_date = appt.completed_at.date() if appt.completed_at else appt.date
        pid = appt.patient_id
        if pid not in patient_first_map or actual_date < patient_first_map[pid]:
            patient_first_map[pid] = actual_date

    new_patient_map = defaultdict(int)
    for pid, first_date in patient_first_map.items():
        if start_date <= first_date <= end_date:
            new_patient_map[_get_period_key(first_date)] += 1

    # Build result list over all date buckets that have data
    all_keys = sorted(set(list(appt_count_map.keys()) + list(new_patient_map.keys())))
    result = [
        {
            'date': key,
            'appointments': appt_count_map.get(key, 0),
            'new_patients': new_patient_map.get(key, 0),
        }
        for key in all_keys
    ]

    return result


# =============================================================================
# Inventory Query Functions
# =============================================================================

def get_inventory_summary(clinic_id=None):
    """
    Returns dict with low_stock_count, total_value, low_stock_items list,
    and inventory_value_by_clinic list.
    """
    inv_qs = InventoryItem.objects.all()
    inv_qs = apply_clinic_filter(inv_qs, clinic_id)

    # Total inventory value
    total_value = inv_qs.aggregate(
        total=Coalesce(Sum('cost'), Value(Decimal('0')))
    )['total']

    # Low stock items (quantity <= min_stock)
    low_stock_qs = inv_qs.filter(quantity__lte=F('min_stock'))
    low_stock_count = low_stock_qs.count()

    low_stock_items = [
        {
            'id': item.id,
            'name': item.name,
            'category': item.category,
            'quantity': item.quantity,
            'min_stock': item.min_stock,
            'clinic': item.clinic.name if item.clinic else 'Unassigned',
            'clinic_id': item.clinic_id,
        }
        for item in low_stock_qs.select_related('clinic')[:20]
    ]

    # Inventory value by clinic
    value_by_clinic = (
        InventoryItem.objects.filter(clinic__isnull=False)
        .values(
            clinic_id_val=F('clinic__id'),
            clinic_name=F('clinic__name')
        )
        .annotate(
            value=Coalesce(Sum('cost'), Value(Decimal('0')))
        )
        .order_by('-value')
    )

    inventory_value_by_clinic = [
        {
            'clinic_id': entry['clinic_id_val'],
            'clinic_name': entry['clinic_name'] or 'Unknown',
            'value': _decimal_to_float(entry['value']),
        }
        for entry in value_by_clinic
    ]

    return {
        'low_stock_count': low_stock_count,
        'total_value': _decimal_to_float(total_value),
        'low_stock_items': low_stock_items,
        'inventory_value_by_clinic': inventory_value_by_clinic,
    }
