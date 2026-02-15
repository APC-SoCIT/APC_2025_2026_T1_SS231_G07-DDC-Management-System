from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse, path
from django.http import HttpResponse
from django.utils import timezone
from django.shortcuts import render
from django.db.models import Count, Q
from datetime import timedelta
from .models import (
    User, Service, Appointment, DentalRecord,
    Document, InventoryItem, Billing, ClinicLocation,
    TreatmentPlan, TeethImage, StaffAvailability, DentistAvailability,
    DentistNotification, AppointmentNotification, PasswordResetToken, BlockedTimeSlot,
    Invoice, InvoiceItem, PatientBalance, Payment, PaymentSplit, AuditLog
)
import csv
import json


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """
    Django admin interface for audit logs.
    
    Provides read-only access to audit records with filtering,
    search, and export capabilities for compliance reviews.
    """
    
    # ===== LIST VIEW CONFIGURATION =====
    
    list_display = [
        'timestamp_formatted',
        'actor_link',
        'action_type_badge',
        'target_info',
        'patient_link',
        'ip_address',
        'status_indicator',
    ]
    
    list_filter = [
        'action_type',
        'target_table',
        ('timestamp', admin.DateFieldListFilter),
        'actor',
    ]
    
    search_fields = [
        'actor__username',
        'actor__email',
        'actor__first_name',
        'actor__last_name',
        'patient_id',
        'ip_address',
        'target_table',
        'target_record_id',
    ]
    
    date_hierarchy = 'timestamp'
    
    ordering = ['-timestamp']
    
    list_per_page = 50
    
    # ===== DETAIL VIEW CONFIGURATION =====
    
    fieldsets = (
        ('Action Information', {
            'fields': ('action_type', 'timestamp', 'actor', 'reason')
        }),
        ('Target Information', {
            'fields': ('target_table', 'target_record_id', 'patient_id')
        }),
        ('Request Context', {
            'fields': ('ip_address', 'user_agent')
        }),
        ('Changes (JSON)', {
            'fields': ('changes_formatted',),
            'classes': ('collapse',),
        }),
    )
    
    readonly_fields = [
        'timestamp',
        'actor',
        'action_type',
        'target_table',
        'target_record_id',
        'patient_id',
        'ip_address',
        'user_agent',
        'changes_formatted',
        'reason',
    ]
    
    # ===== CUSTOM DISPLAY METHODS =====
    
    def timestamp_formatted(self, obj):
        """Display timestamp in readable format."""
        local_time = timezone.localtime(obj.timestamp)
        return local_time.strftime('%Y-%m-%d %H:%M:%S')
    timestamp_formatted.short_description = 'Time'
    timestamp_formatted.admin_order_field = 'timestamp'
    
    def actor_link(self, obj):
        """Display actor as link to user admin."""
        if obj.actor:
            url = reverse('admin:api_user_change', args=[obj.actor.id])
            return format_html(
                '<a href="{}">{}</a>',
                url,
                obj.actor.get_full_name() or obj.actor.username
            )
        return format_html('<em>System</em>')
    actor_link.short_description = 'Actor'
    actor_link.admin_order_field = 'actor'
    
    def action_type_badge(self, obj):
        """Display action type with color badge."""
        colors = {
            'CREATE': '#28a745',  # Green
            'READ': '#17a2b8',    # Blue
            'UPDATE': '#ffc107',  # Yellow
            'DELETE': '#dc3545',  # Red
            'LOGIN_SUCCESS': '#28a745',
            'LOGIN_FAILED': '#dc3545',
            'LOGOUT': '#6c757d',
            'EXPORT': '#fd7e14',  # Orange
            'API_REQUEST': '#17a2b8',  # Blue
            'ACCESS_DENIED': '#dc3545',  # Red
        }
        color = colors.get(obj.action_type, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 8px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.action_type
        )
    action_type_badge.short_description = 'Action'
    action_type_badge.admin_order_field = 'action_type'
    
    def target_info(self, obj):
        """Display target table and record ID."""
        return f"{obj.target_table} #{obj.target_record_id}"
    target_info.short_description = 'Target'
    
    def patient_link(self, obj):
        """Display patient as link if available."""
        # patient_id is a ForeignKey, so obj.patient_id is already a User object (or None)
        if obj.patient_id:
            try:
                patient = obj.patient_id  # Already a User object
                url = reverse('admin:api_user_change', args=[patient.id])
                return format_html(
                    '<a href="{}">{}</a>',
                    url,
                    patient.get_full_name() or f"Patient #{patient.id}"
                )
            except Exception:
                # If the patient was deleted, patient_id might be None or invalid
                return f"Patient (deleted)"
        return '-'
    patient_link.short_description = 'Patient'
    
    def status_indicator(self, obj):
        """Visual indicator for successful/failed operations."""
        # Check if there's a status code in changes
        status_code = None
        if obj.changes and isinstance(obj.changes, dict):
            status_code = obj.changes.get('status_code')
        
        if obj.action_type == 'LOGIN_FAILED':
            return format_html('<span style="color: red;">❌ Failed</span>')
        elif obj.action_type == 'ACCESS_DENIED':
            return format_html('<span style="color: red;">🚫 Denied</span>')
        elif status_code and status_code >= 400:
            return format_html('<span style="color: orange;">⚠️ Error</span>')
        else:
            return format_html('<span style="color: green;">✓ Success</span>')
    status_indicator.short_description = 'Status'
    
    def changes_formatted(self, obj):
        """Display changes as formatted JSON."""
        if obj.changes:
            formatted = json.dumps(obj.changes, indent=2)
            return format_html('<pre>{}</pre>', formatted)
        return '-'
    changes_formatted.short_description = 'Changes'
    
    # ===== PERMISSIONS (READ-ONLY) =====
    
    def has_add_permission(self, request):
        """Audit logs cannot be manually created."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Audit logs cannot be edited."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Audit logs cannot be deleted manually."""
        return False
    
    def has_view_permission(self, request, obj=None):
        """Only allow owners and superusers to view audit logs."""
        return request.user.is_superuser or getattr(request.user, 'user_type', None) == 'owner'
    
    # ===== CUSTOM URL FOR DASHBOARD =====
    
    def get_urls(self):
        """Add custom URL for dashboard."""
        urls = super().get_urls()
        custom_urls = [
            path('dashboard/', self.admin_site.admin_view(self.dashboard_view), name='auditlog_dashboard'),
        ]
        return custom_urls + urls
    
    def dashboard_view(self, request):
        """Render audit statistics dashboard."""
        
        # Date ranges
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        # Total logs
        total_logs = AuditLog.objects.count()
        
        # Logs by time period
        logs_today = AuditLog.objects.filter(timestamp__gte=today_start).count()
        logs_this_week = AuditLog.objects.filter(timestamp__gte=week_ago).count()
        logs_this_month = AuditLog.objects.filter(timestamp__gte=month_ago).count()
        
        # Logs by action type (all time)
        logs_by_action = AuditLog.objects.values('action_type').annotate(
            count=Count('log_id')
        ).order_by('-count')
        
        # Failed login attempts (last 7 days)
        failed_logins = AuditLog.objects.filter(
            action_type='LOGIN_FAILED',
            timestamp__gte=week_ago
        ).count()
        
        # Most active users (last 30 days)
        top_users = AuditLog.objects.filter(
            timestamp__gte=month_ago,
            actor__isnull=False
        ).values(
            'actor__username', 'actor__first_name', 'actor__last_name'
        ).annotate(
            action_count=Count('log_id')
        ).order_by('-action_count')[:10]
        
        # Most accessed patients (last 30 days)
        top_patients = AuditLog.objects.filter(
            timestamp__gte=month_ago,
            patient_id__isnull=False
        ).values('patient_id').annotate(
            access_count=Count('log_id')
        ).order_by('-access_count')[:10]
        
        # Enrich patient data
        patient_ids = [item['patient_id'] for item in top_patients]
        patients_dict = {u.id: u for u in User.objects.filter(id__in=patient_ids)}
        
        for item in top_patients:
            patient = patients_dict.get(item['patient_id'])
            if patient:
                item['patient_name'] = patient.get_full_name() or f"Patient #{patient.id}"
            else:
                item['patient_name'] = f"Patient #{item['patient_id']} (deleted)"
        
        # Suspicious activity indicators
        suspicious_activity = []
        
        # Check for unusual login patterns
        failed_login_by_ip = AuditLog.objects.filter(
            action_type='LOGIN_FAILED',
            timestamp__gte=week_ago
        ).values('ip_address').annotate(
            count=Count('log_id')
        ).filter(count__gte=5).order_by('-count')
        
        for item in failed_login_by_ip:
            suspicious_activity.append({
                'type': 'Multiple Failed Logins',
                'description': f"{item['count']} failed login attempts from {item['ip_address']}",
                'severity': 'high' if item['count'] >= 10 else 'medium'
            })
        
        # Check for after-hours access (outside 8 AM - 6 PM)
        after_hours_logs = AuditLog.objects.filter(
            timestamp__gte=week_ago,
            action_type='READ'
        ).exclude(
            Q(timestamp__hour__gte=8) & Q(timestamp__hour__lt=18)
        ).count()
        
        if after_hours_logs > 50:
            suspicious_activity.append({
                'type': 'After-Hours Access',
                'description': f"{after_hours_logs} record accesses outside business hours (8 AM - 6 PM)",
                'severity': 'low'
            })
        
        # Check for multiple access denied attempts
        access_denied_count = AuditLog.objects.filter(
            action_type='ACCESS_DENIED',
            timestamp__gte=week_ago
        ).count()
        
        if access_denied_count > 10:
            suspicious_activity.append({
                'type': 'Access Denied Attempts',
                'description': f"{access_denied_count} unauthorized access attempts detected",
                'severity': 'high' if access_denied_count > 50 else 'medium'
            })
        
        # Prepare context
        context = {
            **self.admin_site.each_context(request),
            'title': 'Audit Log Dashboard',
            'total_logs': total_logs,
            'logs_today': logs_today,
            'logs_this_week': logs_this_week,
            'logs_this_month': logs_this_month,
            'logs_by_action': logs_by_action,
            'failed_logins': failed_logins,
            'top_users': top_users,
            'top_patients': top_patients,
            'suspicious_activity': suspicious_activity,
        }
        
        return render(request, 'admin/audit_dashboard.html', context)
    
    # ===== ACTIONS (CSV EXPORT) =====
    
    actions = ['export_as_csv', 'export_for_patient']
    
    def export_as_csv(self, request, queryset):
        """Export selected audit logs as CSV file."""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="audit_logs_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Timestamp',
            'Actor',
            'Action',
            'Target Table',
            'Target Record ID',
            'Patient ID',
            'IP Address',
            'User Agent',
            'Changes'
        ])
        
        for log in queryset:
            writer.writerow([
                log.timestamp,
                log.actor.username if log.actor else 'System',
                log.action_type,
                log.target_table,
                log.target_record_id,
                log.patient_id or '',
                log.ip_address,
                log.user_agent,
                json.dumps(log.changes) if log.changes else ''
            ])
        
        return response
    export_as_csv.short_description = 'Export selected as CSV'
    
    def export_for_patient(self, request, queryset):
        """Export all audit logs for patients in selected records."""
        patient_ids = queryset.values_list('patient_id', flat=True).distinct()
        patient_ids = [pid for pid in patient_ids if pid]  # Remove None
        
        if not patient_ids:
            self.message_user(request, "No patient IDs found in selected records.", level='warning')
            return
        
        # Get all logs for these patients
        all_logs = AuditLog.objects.filter(patient_id__in=patient_ids).order_by('-timestamp')
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="patient_audit_logs_{timezone.now().strftime("%Y%m%d")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Patient ID', 'Timestamp', 'Actor', 'Action', 'Target', 'IP Address'])
        
        for log in all_logs:
            writer.writerow([
                log.patient_id,
                log.timestamp,
                log.actor.username if log.actor else 'System',
                log.action_type,
                f"{log.target_table}:{log.target_record_id}",
                log.ip_address
            ])
        
        self.message_user(request, f"Exported {all_logs.count()} audit logs for {len(patient_ids)} patients.")
        return response
    export_for_patient.short_description = 'Export full history for these patients'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'user_type', 'is_active')
    list_filter = ('user_type', 'is_active', 'is_staff')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('user_type', 'phone', 'birthday', 'age', 'address', 'profile_picture', 'is_active_patient')}),
    )

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'created_at')
    list_filter = ('category', 'created_at')
    search_fields = ('name', 'description')
    ordering = ('-created_at',)

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'dentist', 'date', 'time', 'status', 'service')
    list_filter = ('status', 'date', 'dentist')
    search_fields = ('patient__username', 'patient__email', 'notes')
    ordering = ('-date', '-time')
    date_hierarchy = 'date'

@admin.register(DentalRecord)
class DentalRecordAdmin(admin.ModelAdmin):
    list_display = ('patient', 'treatment', 'created_at', 'created_by')
    list_filter = ('created_at', 'created_by')
    search_fields = ('patient__username', 'treatment', 'notes')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'document_type', 'title', 'uploaded_at')
    list_filter = ('document_type', 'uploaded_at')
    search_fields = ('patient__username', 'title')
    ordering = ('-uploaded_at',)

@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'quantity', 'min_stock', 'cost', 'supplier', 'updated_at')
    list_filter = ('category', 'updated_at')
    search_fields = ('name', 'supplier')
    ordering = ('name',)
    
    def get_list_display(self, request):
        list_display = super().get_list_display(request)
        return list_display

@admin.register(Billing)
class BillingAdmin(admin.ModelAdmin):
    list_display = ('patient', 'amount', 'status', 'paid', 'created_at')
    list_filter = ('status', 'paid', 'created_at')
    search_fields = ('patient__username', 'description')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'

@admin.register(ClinicLocation)
class ClinicLocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'phone')
    search_fields = ('name', 'address')

@admin.register(TreatmentPlan)
class TreatmentPlanAdmin(admin.ModelAdmin):
    list_display = ('patient', 'title', 'status', 'start_date', 'created_by')
    list_filter = ('status', 'start_date')
    search_fields = ('patient__username', 'title', 'description')
    ordering = ('-start_date',)

@admin.register(TeethImage)
class TeethImageAdmin(admin.ModelAdmin):
    list_display = ('patient', 'uploaded_by', 'is_latest', 'uploaded_at')
    list_filter = ('is_latest', 'uploaded_at', 'uploaded_by')
    search_fields = ('patient__username', 'uploaded_by__username', 'notes')
    ordering = ('-uploaded_at',)
    readonly_fields = ('uploaded_at',)
    date_hierarchy = 'uploaded_at'

@admin.register(StaffAvailability)
class StaffAvailabilityAdmin(admin.ModelAdmin):
    list_display = ('staff', 'day_of_week', 'is_available', 'start_time', 'end_time')
    list_filter = ('day_of_week', 'is_available', 'staff')
    search_fields = ('staff__username', 'staff__first_name', 'staff__last_name')
    ordering = ('staff', 'day_of_week')

@admin.register(DentistAvailability)
class DentistAvailabilityAdmin(admin.ModelAdmin):
    list_display = ('dentist', 'date', 'start_time', 'end_time', 'is_available')
    list_filter = ('is_available', 'date', 'dentist')
    search_fields = ('dentist__username', 'dentist__first_name', 'dentist__last_name')
    ordering = ('dentist', 'date')
    date_hierarchy = 'date'

@admin.register(DentistNotification)
class DentistNotificationAdmin(admin.ModelAdmin):
    list_display = ('dentist', 'notification_type', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at', 'dentist')
    search_fields = ('dentist__username', 'message')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'

@admin.register(AppointmentNotification)
class AppointmentNotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'notification_type', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at', 'recipient')
    search_fields = ('recipient__username', 'message')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'

@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'expires_at', 'is_used')
    list_filter = ('is_used', 'created_at', 'expires_at')
    search_fields = ('user__email', 'user__username', 'token')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)

@admin.register(BlockedTimeSlot)
class BlockedTimeSlotAdmin(admin.ModelAdmin):
    list_display = ('date', 'start_time', 'end_time', 'reason', 'created_by', 'created_at')
    list_filter = ('date', 'created_at', 'created_by')
    search_fields = ('reason', 'created_by__username')
    ordering = ('-date', 'start_time')
    date_hierarchy = 'date'


# Invoice Management
class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0
    readonly_fields = ('total_price',)
    fields = ('item_name', 'quantity', 'unit_price', 'total_price', 'description')


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'reference_number', 'patient', 'clinic', 'total_due', 'balance', 'status', 'invoice_date', 'due_date')
    list_filter = ('status', 'invoice_date', 'due_date', 'clinic', 'created_at')
    search_fields = ('invoice_number', 'reference_number', 'patient__username', 'patient__email', 'patient__first_name', 'patient__last_name')
    ordering = ('-created_at',)
    date_hierarchy = 'invoice_date'
    readonly_fields = ('invoice_number', 'reference_number', 'subtotal', 'balance', 'created_at', 'updated_at', 'sent_at', 'paid_at')
    inlines = [InvoiceItemInline]
    
    fieldsets = (
        ('Invoice Information', {
            'fields': ('invoice_number', 'reference_number', 'status')
        }),
        ('Related Records', {
            'fields': ('appointment', 'patient', 'clinic', 'created_by')
        }),
        ('Financial Details', {
            'fields': ('service_charge', 'items_subtotal', 'subtotal', 'interest_rate', 'interest_amount', 'total_due', 'amount_paid', 'balance')
        }),
        ('Dates', {
            'fields': ('invoice_date', 'due_date', 'sent_at', 'paid_at', 'created_at', 'updated_at')
        }),
        ('Payment Information', {
            'fields': ('payment_instructions', 'bank_account', 'notes')
        }),
        ('PDF File', {
            'fields': ('pdf_file',)
        }),
    )


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'item_name', 'quantity', 'unit_price', 'total_price', 'created_at')
    list_filter = ('created_at', 'invoice__status')
    search_fields = ('item_name', 'invoice__invoice_number', 'description')
    ordering = ('-created_at',)
    readonly_fields = ('total_price', 'created_at', 'updated_at')


@admin.register(PatientBalance)
class PatientBalanceAdmin(admin.ModelAdmin):
    list_display = ('patient', 'total_invoiced', 'total_paid', 'current_balance', 'last_invoice_date', 'last_payment_date', 'updated_at')
    list_filter = ('last_invoice_date', 'last_payment_date', 'updated_at')
    search_fields = ('patient__username', 'patient__email', 'patient__first_name', 'patient__last_name')
    ordering = ('-current_balance',)
    readonly_fields = ('updated_at',)


class PaymentSplitInline(admin.TabularInline):
    model = PaymentSplit
    extra = 0
    readonly_fields = ('created_at', 'updated_at', 'voided_at')
    fields = ('invoice', 'amount', 'provider', 'is_voided', 'voided_at')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('payment_number', 'patient', 'clinic', 'amount', 'payment_date', 'payment_method', 'recorded_by', 'is_voided')
    list_filter = ('payment_method', 'payment_date', 'is_voided', 'clinic')
    search_fields = ('payment_number', 'patient__username', 'patient__email', 'patient__first_name', 'patient__last_name', 'notes', 'check_number', 'reference_number')
    ordering = ('-payment_date', '-created_at')
    date_hierarchy = 'payment_date'
    readonly_fields = ('payment_number', 'created_at', 'updated_at', 'voided_at')
    inlines = [PaymentSplitInline]
    
    fieldsets = (
        ('Payment Information', {
            'fields': ('payment_number', 'patient', 'clinic', 'recorded_by')
        }),
        ('Payment Details', {
            'fields': ('amount', 'payment_date', 'payment_method', 'check_number', 'bank_name', 'reference_number', 'notes')
        }),
        ('Void Information', {
            'fields': ('is_voided', 'voided_at', 'voided_by', 'void_reason')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(PaymentSplit)
class PaymentSplitAdmin(admin.ModelAdmin):
    list_display = ('payment', 'invoice', 'amount', 'provider', 'is_voided', 'created_at')
    list_filter = ('is_voided', 'created_at')
    search_fields = ('payment__payment_number', 'invoice__invoice_number', 'provider__username')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'voided_at')


admin.site.site_header = "Dorotheo Dental Clinic - Administration"
admin.site.site_title = "Dental Clinic Admin"
admin.site.index_title = "Welcome to Dental Clinic Management System"

# Set custom index template to show audit dashboard link
admin.site.index_template = 'admin/custom_index.html'

