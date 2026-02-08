from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Service, Appointment, DentalRecord,
    Document, InventoryItem, Billing, ClinicLocation,
    TreatmentPlan, TeethImage, StaffAvailability, DentistAvailability,
    DentistNotification, AppointmentNotification, PasswordResetToken, BlockedTimeSlot,
    Invoice, InvoiceItem, PatientBalance, Payment, PaymentSplit
)


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


admin.site.site_header = "Dental Clinic Administration"
admin.site.site_title = "Dental Clinic Admin"
admin.site.index_title = "Welcome to Dental Clinic Management System"

