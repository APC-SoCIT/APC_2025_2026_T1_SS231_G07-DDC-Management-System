# Analytics Dashboard — Full Implementation Plan

> **System**: Dorotheo Dental Clinic Management System  
> **Stack**: Django REST Framework (backend) · Next.js 14 + TypeScript (frontend) · PostgreSQL  
> **Date**: 2026-02-20  
> **Audience**: LLM coding agent (Claude/Copilot) — follow instructions literally  

---

## 0. Executive Summary

The current Analytics page (`frontend/app/owner/analytics/page.tsx`) is a **static shell** — all data arrays are empty (`const billings: Billing[] = []`), the page is never connected to the backend, and the existing `analytics` Django view (`backend/api/views.py:2011`) returns only 8 flat numbers with no time-series, no filtering by clinic/date-range, and no Invoice/Payment awareness.

This plan transforms the analytics feature into a **real-time, multi-clinic, multi-metric dashboard** backed by efficient Django ORM aggregations and visualized with `recharts` (already installed).

---

## 1. Current-State Analysis

### 1.1 Backend Data Models (source of truth)

| Model | File Location | Key Financial Fields | Notes |
|---|---|---|---|
| `Invoice` | `backend/api/models.py:784` | `service_charge`, `items_subtotal`, `subtotal`, `interest_amount`, `total_due`, `amount_paid`, `balance`, `status` (draft/sent/paid/overdue/cancelled), `invoice_date`, `due_date`, `paid_at` | One-to-one with `Appointment`. The **primary revenue source**. |
| `InvoiceItem` | `backend/api/models.py:900` | `quantity`, `unit_price`, `total_price` | Line-item costs (inventory items used). |
| `Payment` | `backend/api/models.py:951` | `amount`, `payment_date`, `payment_method`, `is_voided` | Actual cash received. Linked to patient + clinic. |
| `PaymentSplit` | `backend/api/models.py:1019` | `amount`, `provider` (FK→User dentist), `is_voided` | Allocates a Payment across multiple Invoices. **Key for revenue-per-dentist**. |
| `PatientBalance` | `backend/api/models.py:932` | `total_invoiced`, `total_paid`, `current_balance` | Aggregate per-patient. |
| `Billing` (legacy) | `backend/api/models.py:376` | `amount`, `status`, `paid` | Older billing model — **not used by Invoice/Payment system**. Current analytics view reads from this. |
| `Appointment` | `backend/api/models.py:260` | `status`, `date`, `time`, `completed_at`, FK→`service`, FK→`dentist`, FK→`clinic` | Central operational record. |
| `Service` | `backend/api/models.py:230` | `name`, `category`, `duration` | Service catalog. |
| `InventoryItem` | `backend/api/models.py:347` | `name`, `quantity`, `unit_cost`, `cost` | Tracks supplies. `cost = unit_cost * quantity`. |
| `User` | `backend/api/models.py:7` | `user_type`, `role`, `is_active_patient`, `is_archived`, `created_at` | Patients, staff (receptionist/dentist), owner. |
| `ClinicLocation` | `backend/api/models.py:410` | `name`, `address` | Multi-clinic support. |

### 1.2 Existing Analytics Endpoint

```python
# backend/api/views.py:2011-2042
@api_view(['GET'])
def analytics(request):
    total_revenue = Billing.objects.filter(paid=True).aggregate(Sum('amount'))['amount__sum'] or 0
    total_expenses = InventoryItem.objects.aggregate(total=Sum(F('cost') * F('quantity')))['total'] or 0
    ...
```

**Problems**:
1. Uses legacy `Billing` model — should use `Invoice` + `Payment` models.
2. No date-range filtering (daily/weekly/monthly/annual).
3. No clinic filtering.
4. No time-series data (cannot draw charts).
5. No service-level or dentist-level breakdowns.
6. Expense calculation is wrong: `cost` already = `unit_cost * quantity`, so multiplying again is a double-count.
7. Returns 8 flat fields — no granularity.

### 1.3 Existing Frontend Analytics Page

```tsx
// frontend/app/owner/analytics/page.tsx
const billings: Billing[] = []       // ← empty, never fetched
const inventory: InventoryItem[] = [] // ← empty, never fetched
```

The page has a nice UI layout with time-filter buttons (Daily/Weekly/Monthly/Annual), four summary cards (Revenue/Expenses/Profit/Pending), and two breakdown tables. But **none of it is connected to any API**.

### 1.4 Existing Frontend API Client

```typescript
// frontend/lib/api.ts:507-512
getAnalytics: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/analytics/`, { ... })
    return response.json()
},
```

Exists but returns the flat 8-field response from the broken backend. No query-param support for date-range or clinic.

### 1.5 Available Charting Library

`recharts@2.15.4` is already in `frontend/package.json:58`. No need to install anything.

---

## 2. Analytics Scope — Metrics to Implement

### Phase 1: Financial Analytics (Core)

| Metric ID | Metric | Source Query | Granularity |
|---|---|---|---|
| F1 | **Total Revenue** (collected) | `Payment.objects.filter(is_voided=False).aggregate(Sum('amount'))` | by period |
| F2 | **Total Invoiced** | `Invoice.objects.exclude(status='cancelled').aggregate(Sum('total_due'))` | by period |
| F3 | **Outstanding Balance** | `Invoice.objects.filter(status__in=['sent','overdue']).aggregate(Sum('balance'))` | snapshot |
| F4 | **Overdue Amount** | `Invoice.objects.filter(status='overdue').aggregate(Sum('balance'))` | snapshot |
| F5 | **Revenue by Service Category** | Join `PaymentSplit → Invoice → Appointment → Service` group by `service.category` | by period |
| F6 | **Revenue by Service** | Same join, group by `service.name` | by period |
| F7 | **Revenue by Dentist** | `PaymentSplit` group by `provider` | by period |
| F8 | **Revenue by Clinic** | `Payment` group by `clinic` | by period |
| F9 | **Revenue Time-Series** | `Payment` annotated by `TruncDay/TruncWeek/TruncMonth` | chart data |
| F10 | **Invoice Status Distribution** | `Invoice.objects.values('status').annotate(Count('id'), Sum('total_due'))` | snapshot |
| F11 | **Payment Method Distribution** | `Payment.objects.values('payment_method').annotate(count, sum)` | by period |
| F12 | **Expenses** (inventory cost) | `InvoiceItem.objects.aggregate(Sum('total_price'))` using items actually consumed via invoices | by period |
| F13 | **Profit** | F1 − F12 | by period |

### Phase 2: Operational / Patient Analytics

| Metric ID | Metric | Source Query | Granularity |
|---|---|---|---|
| O1 | **Patient Volume** (appointments completed) | `Appointment.objects.filter(status='completed').count()` | by period |
| O2 | **New vs Returning Patients** | Patients whose first completed appointment is within the period vs. those who had a prior one | by period |
| O3 | **Appointment Status Distribution** | `Appointment.objects.values('status').annotate(Count('id'))` | snapshot |
| O4 | **Appointments by Clinic** | group by `clinic` | by period |
| O5 | **Appointments by Dentist** | group by `dentist` | by period |
| O6 | **Cancellation / No-Show Rate** | count of `cancelled` + `missed` / total | by period |
| O7 | **Average Revenue per Patient** | total payments / unique patients in period | by period |
| O8 | **Top Services by Volume** | `Appointment.objects.filter(status='completed').values('service__name').annotate(Count('id'))` | by period |
| O9 | **Patient Retention Rate** | Patients who returned within 6 months of last visit / total | snapshot |
| O10 | **Busiest Time Slots** | `Appointment.objects.values('time').annotate(Count('id'))` | snapshot |

### Phase 3: Inventory / Expense Analytics (stretch)

| Metric ID | Metric | Source |
|---|---|---|
| I1 | **Low Stock Items Count** | `InventoryItem.objects.filter(quantity__lte=F('min_stock'))` |
| I2 | **Inventory Value by Clinic** | `InventoryItem.objects.values('clinic__name').annotate(Sum('cost'))` |
| I3 | **Inventory Cost Trend** | Items used via `InvoiceItem` over time |

---

## 3. Architecture & Implementation Design

### 3.1 Backend — New Analytics API Endpoint

**Strategy**: Replace the existing `analytics()` view with a new, parameterized view that accepts query parameters and returns structured data.

**File**: `backend/api/views.py` — rewrite the `analytics` function (line 2011).

**Query Parameters**:

| Param | Type | Default | Description |
|---|---|---|---|
| `period` | `daily\|weekly\|monthly\|annual` | `monthly` | Determines date-range and time-series truncation |
| `clinic_id` | `int\|null` | `null` (all clinics) | Filter all queries to a specific clinic |
| `start_date` | `YYYY-MM-DD` | auto-calculated from period | Custom start date override |
| `end_date` | `YYYY-MM-DD` | today | Custom end date override |

**Response Shape** (single endpoint, structured sections):

```json
{
  "period": "monthly",
  "start_date": "2026-01-21",
  "end_date": "2026-02-20",
  "clinic_id": null,
  "clinic_name": "All Clinics",

  "financial": {
    "total_revenue": 125000.00,
    "total_invoiced": 150000.00,
    "outstanding_balance": 25000.00,
    "overdue_amount": 5000.00,
    "total_expenses": 30000.00,
    "profit": 95000.00,
    "average_revenue_per_patient": 2500.00,
    "revenue_time_series": [
      { "date": "2026-01-21", "revenue": 5000.00, "expenses": 1200.00 },
      { "date": "2026-01-22", "revenue": 3000.00, "expenses": 800.00 }
    ],
    "revenue_by_service": [
      { "service": "Dental Cleaning", "category": "preventive", "revenue": 40000.00, "count": 25 }
    ],
    "revenue_by_dentist": [
      { "dentist_id": 5, "dentist_name": "Dr. Smith", "revenue": 80000.00, "appointment_count": 40 }
    ],
    "revenue_by_clinic": [
      { "clinic_id": 1, "clinic_name": "Main Branch", "revenue": 75000.00 }
    ],
    "invoice_status_distribution": [
      { "status": "paid", "count": 40, "total": 100000.00 },
      { "status": "sent", "count": 10, "total": 30000.00 },
      { "status": "overdue", "count": 5, "total": 20000.00 }
    ],
    "payment_method_distribution": [
      { "method": "cash", "method_display": "Cash", "count": 30, "total": 80000.00 },
      { "method": "gcash", "method_display": "GCash", "count": 15, "total": 45000.00 }
    ]
  },

  "operational": {
    "total_appointments": 120,
    "completed_appointments": 95,
    "cancelled_appointments": 10,
    "missed_appointments": 5,
    "cancellation_rate": 8.33,
    "no_show_rate": 4.17,
    "new_patients": 15,
    "returning_patients": 60,
    "total_unique_patients": 75,
    "appointment_status_distribution": [
      { "status": "completed", "count": 95 },
      { "status": "confirmed", "count": 10 }
    ],
    "top_services": [
      { "service": "Dental Cleaning", "category": "preventive", "count": 25 }
    ],
    "appointments_by_clinic": [
      { "clinic_id": 1, "clinic_name": "Main Branch", "count": 60 }
    ],
    "appointments_by_dentist": [
      { "dentist_id": 5, "dentist_name": "Dr. Smith", "count": 40 }
    ],
    "busiest_hours": [
      { "hour": 9, "count": 20 },
      { "hour": 10, "count": 25 }
    ],
    "patient_volume_time_series": [
      { "date": "2026-01-21", "appointments": 5, "new_patients": 2 }
    ]
  },

  "inventory": {
    "low_stock_count": 3,
    "total_inventory_value": 50000.00,
    "low_stock_items": [
      { "id": 1, "name": "Dental Composite", "quantity": 2, "min_stock": 10, "clinic": "Main Branch" }
    ],
    "inventory_value_by_clinic": [
      { "clinic_id": 1, "clinic_name": "Main Branch", "value": 30000.00 }
    ]
  }
}
```

### 3.2 Backend — ORM Query Strategy

All queries will use **Django ORM aggregation** (no raw SQL). Key tools:

```python
from django.db.models import Sum, Count, Avg, F, Q, Value
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, TruncYear, ExtractHour, Coalesce
```

**Date range logic** (helper function):

```python
def get_date_range(period, start_date=None, end_date=None):
    today = date.today()
    if start_date and end_date:
        return parse_date(start_date), parse_date(end_date)
    if period == 'daily':
        return today, today
    elif period == 'weekly':
        return today - timedelta(days=7), today
    elif period == 'monthly':
        return today - timedelta(days=30), today
    elif period == 'annual':
        return today - timedelta(days=365), today
    return today - timedelta(days=30), today
```

**Clinic filtering** (applied to all querysets):

```python
def apply_clinic_filter(queryset, clinic_id, clinic_field='clinic'):
    if clinic_id:
        return queryset.filter(**{f'{clinic_field}_id': clinic_id})
    return queryset
```

**Time-series truncation**:

```python
trunc_map = {
    'daily': TruncDay,      # hourly points within the day → actually just 1 point
    'weekly': TruncDay,     # daily points for 7 days
    'monthly': TruncDay,    # daily points for 30 days
    'annual': TruncMonth,   # monthly points for 12 months
}
```

### 3.3 Frontend — Component Architecture

```
frontend/app/owner/analytics/
└── page.tsx                     ← Main page (orchestrator)

frontend/components/analytics/
├── analytics-summary-cards.tsx  ← The 4 KPI cards (Revenue, Expenses, Profit, Pending)
├── revenue-chart.tsx            ← Line/Area chart (revenue + expenses over time)
├── patient-volume-chart.tsx     ← Bar chart (appointments + new patients over time)
├── revenue-by-service.tsx       ← Horizontal bar chart or pie chart
├── revenue-by-dentist.tsx       ← Bar chart
├── invoice-status-chart.tsx     ← Donut/Pie chart
├── payment-method-chart.tsx     ← Pie chart
├── top-services-table.tsx       ← Table of top services by volume
├── appointment-status-chart.tsx ← Donut chart
├── busiest-hours-chart.tsx      ← Bar chart by hour
├── low-stock-alerts.tsx         ← List of low-stock items
└── analytics-loading.tsx        ← Skeleton loading state
```

### 3.4 Frontend — State Management & API Integration

**API Client Update** (`frontend/lib/api.ts`):

```typescript
getAnalytics: async (token: string, params?: {
    period?: 'daily' | 'weekly' | 'monthly' | 'annual'
    clinic_id?: number | null
    start_date?: string
    end_date?: string
}) => {
    const searchParams = new URLSearchParams()
    if (params?.period) searchParams.append('period', params.period)
    if (params?.clinic_id) searchParams.append('clinic_id', params.clinic_id.toString())
    if (params?.start_date) searchParams.append('start_date', params.start_date)
    if (params?.end_date) searchParams.append('end_date', params.end_date)
    const qs = searchParams.toString()
    const response = await fetch(`${API_BASE_URL}/analytics/${qs ? `?${qs}` : ''}`, {
        headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch analytics')
    return response.json()
},
```

**State in page.tsx**:

```typescript
const [period, setPeriod] = useState<'daily'|'weekly'|'monthly'|'annual'>('monthly')
const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse | null>(null)
const [loading, setLoading] = useState(true)
// clinic_id comes from ClinicSelector context (already exists)
```

**Data fetching**: `useEffect` on `[period, selectedClinic]` that calls `getAnalytics`.

### 3.5 TypeScript Types

```typescript
// frontend/lib/types/analytics.ts

export interface AnalyticsResponse {
  period: string
  start_date: string
  end_date: string
  clinic_id: number | null
  clinic_name: string
  financial: FinancialAnalytics
  operational: OperationalAnalytics
  inventory: InventoryAnalytics
}

export interface FinancialAnalytics {
  total_revenue: number
  total_invoiced: number
  outstanding_balance: number
  overdue_amount: number
  total_expenses: number
  profit: number
  average_revenue_per_patient: number
  revenue_time_series: TimeSeriesPoint[]
  revenue_by_service: ServiceRevenue[]
  revenue_by_dentist: DentistRevenue[]
  revenue_by_clinic: ClinicRevenue[]
  invoice_status_distribution: StatusDistribution[]
  payment_method_distribution: PaymentMethodDistribution[]
}

export interface OperationalAnalytics {
  total_appointments: number
  completed_appointments: number
  cancelled_appointments: number
  missed_appointments: number
  cancellation_rate: number
  no_show_rate: number
  new_patients: number
  returning_patients: number
  total_unique_patients: number
  appointment_status_distribution: StatusDistribution[]
  top_services: TopService[]
  appointments_by_clinic: ClinicCount[]
  appointments_by_dentist: DentistCount[]
  busiest_hours: HourCount[]
  patient_volume_time_series: PatientVolumePoint[]
}

export interface InventoryAnalytics {
  low_stock_count: number
  total_inventory_value: number
  low_stock_items: LowStockItem[]
  inventory_value_by_clinic: ClinicValue[]
}

// ... sub-types for each array element
```

---

## 4. Implementation Phases & Acceptance Criteria

### Phase 1: Backend Analytics Engine

**Files to modify**: `backend/api/views.py`  
**Files to create**: `backend/api/analytics_utils.py`

**Acceptance Criteria**:
- [ ] `GET /api/analytics/?period=monthly` returns the full response shape above
- [ ] `period` parameter correctly filters by daily/weekly/monthly/annual
- [ ] `clinic_id` parameter filters all metrics to a specific clinic
- [ ] Revenue metrics use `Payment` (not legacy `Billing`) model
- [ ] Expense metrics use `InvoiceItem.total_price` (items actually consumed)
- [ ] Time-series data is correctly truncated (daily points for weekly/monthly, monthly for annual)
- [ ] New vs returning patient calculation is accurate
- [ ] All queries are optimized — no N+1 queries
- [ ] Endpoint requires authentication and owner/staff role

### Phase 2: Frontend API Integration & Types

**Files to modify**: `frontend/lib/api.ts`  
**Files to create**: `frontend/lib/types/analytics.ts`

**Acceptance Criteria**:
- [ ] `getAnalytics` accepts `period`, `clinic_id`, `start_date`, `end_date` params
- [ ] TypeScript interfaces match the backend response shape exactly
- [ ] Error handling for API failures

### Phase 3: Frontend Summary Cards & Revenue Chart

**Files to modify**: `frontend/app/owner/analytics/page.tsx`  
**Files to create**: `frontend/components/analytics/analytics-summary-cards.tsx`, `frontend/components/analytics/revenue-chart.tsx`, `frontend/components/analytics/analytics-loading.tsx`

**Acceptance Criteria**:
- [ ] Page fetches data from API on mount and when period/clinic changes
- [ ] Summary cards show Revenue, Expenses, Profit, Outstanding with real data
- [ ] Revenue vs Expenses line chart renders with `recharts`
- [ ] Loading skeleton shows while data is loading
- [ ] Currency values are formatted as PHP with proper locale

### Phase 4: Service, Dentist & Invoice Breakdown Charts

**Files to create**: `frontend/components/analytics/revenue-by-service.tsx`, `frontend/components/analytics/revenue-by-dentist.tsx`, `frontend/components/analytics/invoice-status-chart.tsx`, `frontend/components/analytics/payment-method-chart.tsx`

**Acceptance Criteria**:
- [ ] Revenue by Service bar chart with category colors
- [ ] Revenue by Dentist bar chart
- [ ] Invoice Status donut chart (paid/sent/overdue/draft)
- [ ] Payment Method pie chart with proper labels
- [ ] All charts are responsive
- [ ] Empty states handled gracefully

### Phase 5: Operational Analytics Charts

**Files to create**: `frontend/components/analytics/patient-volume-chart.tsx`, `frontend/components/analytics/appointment-status-chart.tsx`, `frontend/components/analytics/top-services-table.tsx`, `frontend/components/analytics/busiest-hours-chart.tsx`, `frontend/components/analytics/low-stock-alerts.tsx`

**Acceptance Criteria**:
- [ ] Patient volume chart shows completed appointments + new patients over time
- [ ] Appointment status donut chart
- [ ] Top services ranked table
- [ ] Busiest hours bar chart
- [ ] Low stock alerts list with item counts
- [ ] New vs Returning patients display

### Phase 6: Polish, Export & Performance

**Acceptance Criteria**:
- [ ] All charts have tooltips with formatted values
- [ ] Tab navigation to switch between Financial / Operational / Inventory sections
- [ ] Responsive layout (mobile-friendly)
- [ ] Optional: CSV/PDF export of analytics data
- [ ] Optional: Date range picker for custom ranges
- [ ] Performance: Backend response < 500ms for typical data volumes

---

## 5. Database Query Examples (for LLM reference)

### Revenue (collected) in date range:
```python
from django.db.models import Sum
from api.models import Payment

total_revenue = Payment.objects.filter(
    is_voided=False,
    payment_date__range=(start_date, end_date)
).aggregate(total=Sum('amount'))['total'] or Decimal('0')
```

### Revenue time series (daily):
```python
from django.db.models.functions import TruncDay

revenue_series = Payment.objects.filter(
    is_voided=False,
    payment_date__range=(start_date, end_date)
).annotate(
    date=TruncDay('payment_date')
).values('date').annotate(
    revenue=Sum('amount')
).order_by('date')
```

### Revenue by service (via PaymentSplit → Invoice → Appointment → Service):
```python
revenue_by_service = PaymentSplit.objects.filter(
    is_voided=False,
    payment__is_voided=False,
    payment__payment_date__range=(start_date, end_date)
).values(
    service_name=F('invoice__appointment__service__name'),
    category=F('invoice__appointment__service__category')
).annotate(
    revenue=Sum('amount'),
    count=Count('id')
).order_by('-revenue')
```

### New vs Returning patients:
```python
from django.db.models import Min

# First-ever completed appointment date for each patient
patient_first_visit = Appointment.objects.filter(
    status='completed'
).values('patient').annotate(
    first_visit=Min('date')
)

# New = first_visit in range; Returning = first_visit before range, but had appointment in range
new_patients = patient_first_visit.filter(
    first_visit__range=(start_date, end_date)
).count()

returning_patients = Appointment.objects.filter(
    status='completed',
    date__range=(start_date, end_date)
).exclude(
    patient__in=patient_first_visit.filter(first_visit__range=(start_date, end_date)).values('patient')
).values('patient').distinct().count()
```

### Expenses (items consumed via invoices in period):
```python
from api.models import InvoiceItem

total_expenses = InvoiceItem.objects.filter(
    invoice__invoice_date__range=(start_date, end_date),
    invoice__status__in=['sent', 'paid', 'overdue']
).aggregate(total=Sum('total_price'))['total'] or Decimal('0')
```

### Busiest hours:
```python
from django.db.models.functions import ExtractHour

busiest = Appointment.objects.filter(
    status='completed',
    date__range=(start_date, end_date)
).annotate(
    hour=ExtractHour('time')
).values('hour').annotate(
    count=Count('id')
).order_by('-count')
```

---

## 6. File-by-File Change List

| # | File | Action | Description |
|---|---|---|---|
| 1 | `backend/api/analytics_utils.py` | **CREATE** | All aggregation query functions |
| 2 | `backend/api/views.py` | **MODIFY** | Rewrite `analytics()` view to use `analytics_utils` |
| 3 | `frontend/lib/types/analytics.ts` | **CREATE** | TypeScript interfaces for API response |
| 4 | `frontend/lib/api.ts` | **MODIFY** | Update `getAnalytics` to accept params |
| 5 | `frontend/components/analytics/analytics-summary-cards.tsx` | **CREATE** | 4 KPI cards |
| 6 | `frontend/components/analytics/revenue-chart.tsx` | **CREATE** | Revenue/Expenses line chart |
| 7 | `frontend/components/analytics/analytics-loading.tsx` | **CREATE** | Skeleton loader |
| 8 | `frontend/app/owner/analytics/page.tsx` | **MODIFY** | Rewrite to fetch data & compose components |
| 9 | `frontend/components/analytics/revenue-by-service.tsx` | **CREATE** | Service revenue chart |
| 10 | `frontend/components/analytics/revenue-by-dentist.tsx` | **CREATE** | Dentist revenue chart |
| 11 | `frontend/components/analytics/invoice-status-chart.tsx` | **CREATE** | Invoice status donut |
| 12 | `frontend/components/analytics/payment-method-chart.tsx` | **CREATE** | Payment method pie |
| 13 | `frontend/components/analytics/patient-volume-chart.tsx` | **CREATE** | Patient volume bar chart |
| 14 | `frontend/components/analytics/appointment-status-chart.tsx` | **CREATE** | Appointment status donut |
| 15 | `frontend/components/analytics/top-services-table.tsx` | **CREATE** | Top services table |
| 16 | `frontend/components/analytics/busiest-hours-chart.tsx` | **CREATE** | Busiest hours bar chart |
| 17 | `frontend/components/analytics/low-stock-alerts.tsx` | **CREATE** | Low stock items list |

---

## 7. Constraints & Conventions

1. **Authentication**: All analytics endpoints require `IsAuthenticated`. Only `owner` and `staff` users should access analytics.
2. **Currency**: All monetary values in Philippine Peso (PHP). Format with `₱` prefix and 2 decimal places.
3. **Date format**: Backend returns ISO format (`YYYY-MM-DD`). Frontend formats for display.
4. **Color palette**: Match existing app CSS variables (`--color-primary: #1a5632`, etc.). Use consistent chart colors.
5. **Recharts**: Use `ResponsiveContainer` for all charts. Import from `recharts` (already installed v2.15.4).
6. **No new models**: All analytics are computed from existing data models via aggregation queries.
7. **No raw SQL**: Use Django ORM aggregations only.
8. **Clinic selector**: The owner layout already has a `<ClinicSelector>` component. Read selected clinic from the existing context/prop system.
9. **Existing design**: Match the existing card/table styling from the current analytics page (green gradient for revenue, red for expenses, blue for profit, amber for pending).

---

## 8. Step-by-Step Implementation Prompts

See the companion prompts below. Each prompt is self-contained, references this plan, and produces one testable deliverable.
