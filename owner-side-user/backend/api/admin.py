from django.contrib import admin
from django.contrib.auth.models import User
from .models import (
    # NEW MODELS
    UserProfile, PatientMedicalHistory, Service, Invoice, Appointment,
    AppointmentService, InsuranceDetail, TreatmentRecord, Payment, Role,
    # LEGACY MODELS
    Patient, LegacyAppointment, InventoryItem, BillingRecord, FinancialRecord
)


# =============================================================================
# NEW MODEL ADMIN CLASSES
# =============================================================================

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_full_name', 'get_user_email', 'date_of_creation']
    search_fields = ['f_name', 'l_name', 'user__email']
    list_filter = ['date_of_creation']
    readonly_fields = ['date_of_creation']
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    get_full_name.short_description = 'Full Name'
    
    def get_user_email(self, obj):
        return obj.user.email if obj.user else 'N/A'
    get_user_email.short_description = 'Email'


@admin.register(PatientMedicalHistory)
class PatientMedicalHistoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'allergies', 'medications', 'conditions', 'last_updated']
    search_fields = ['allergies', 'medications', 'conditions']
    readonly_fields = ['last_updated']


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['id', 'servicename', 'category', 'standard_duration_mins', 'standard_price']
    search_fields = ['servicename', 'servicedesc']
    list_filter = ['category']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['id', 'invoice_date', 'due_date', 'total_amount', 'status']
    search_fields = ['id', 'status']
    list_filter = ['invoice_date', 'due_date', 'status']


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_patient_name', 'get_staff_name', 'appointment_start_time', 'status']
    search_fields = ['patient__email', 'staff__email']
    list_filter = ['status', 'appointment_start_time']
    readonly_fields = ['created_at']
    
    def get_patient_name(self, obj):
        if obj.patient:
            profile = getattr(obj.patient, 'userprofile', None)
            return profile.get_full_name() if profile else obj.patient.email
        return 'N/A'
    get_patient_name.short_description = 'Patient'
    
    def get_staff_name(self, obj):
        if obj.staff:
            profile = getattr(obj.staff, 'userprofile', None)
            return profile.get_full_name() if profile else obj.staff.email
        return 'N/A'
    get_staff_name.short_description = 'Staff'


@admin.register(TreatmentRecord)
class TreatmentRecordAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_appointment', 'diagnosis', 'record_date']
    search_fields = ['diagnosis', 'treatment_performed']
    list_filter = ['record_date']
    
    def get_appointment(self, obj):
        return f"Appointment {obj.appointment.id}" if obj.appointment else 'N/A'
    get_appointment.short_description = 'Appointment'


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'payment_date', 'amount', 'payment_method']
    search_fields = ['payment_method', 'transaction_id']
    list_filter = ['payment_date', 'payment_method']


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'get_user_name']
    search_fields = ['title', 'description']
    
    def get_user_name(self, obj):
        if obj.user:
            profile = getattr(obj.user, 'userprofile', None)
            return profile.get_full_name() if profile else obj.user.email
        return 'N/A'
    get_user_name.short_description = 'User'


# =============================================================================
# LEGACY MODEL ADMIN CLASSES
# =============================================================================

@admin.register(Patient)
class LegacyPatientAdmin(admin.ModelAdmin):
    list_display = ['patient_id', 'name', 'email', 'age', 'contact', 'last_visit']
    search_fields = ['patient_id', 'name', 'email']
    list_filter = ['last_visit', 'created_at']
    readonly_fields = ['patient_id', 'created_at', 'updated_at']


@admin.register(LegacyAppointment)
class LegacyAppointmentAdmin(admin.ModelAdmin):
    list_display = ['appointment_id', 'patient', 'date', 'time', 'doctor', 'status']
    search_fields = ['appointment_id', 'patient__name', 'doctor']
    list_filter = ['status', 'date', 'doctor']
    readonly_fields = ['appointment_id', 'created_at', 'updated_at']


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'quantity', 'min_stock', 'status', 'supplier', 'last_updated']
    search_fields = ['name', 'category', 'supplier']
    list_filter = ['category', 'supplier', 'last_updated']
    readonly_fields = ['last_updated', 'created_at']

    def status(self, obj):
        return obj.status
    status.short_description = 'Stock Status'


@admin.register(BillingRecord)
class BillingRecordAdmin(admin.ModelAdmin):
    list_display = ['patient', 'last_payment', 'amount', 'payment_method']
    search_fields = ['patient__name', 'patient__email']
    list_filter = ['last_payment', 'payment_method']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(FinancialRecord)
class FinancialRecordAdmin(admin.ModelAdmin):
    list_display = ['record_type', 'month', 'year', 'amount']
    search_fields = ['month', 'year', 'description']
    list_filter = ['record_type', 'year', 'month']
    readonly_fields = ['created_at', 'updated_at']
