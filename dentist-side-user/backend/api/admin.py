from django.contrib import admin
from .models import Patient, Appointment, InventoryItem, BillingRecord, FinancialRecord


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['patient_id', 'name', 'email', 'age', 'contact', 'last_visit']
    search_fields = ['patient_id', 'name', 'email']
    list_filter = ['last_visit', 'created_at']
    readonly_fields = ['patient_id', 'created_at', 'updated_at']


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
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
