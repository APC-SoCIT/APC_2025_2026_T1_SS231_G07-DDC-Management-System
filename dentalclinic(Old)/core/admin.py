from django.contrib import admin
from .models import Patient, Dentist, Treatment, Appointment, Invoice


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "email", "phone", "created_at")
    search_fields = ("first_name", "last_name", "email", "phone")


@admin.register(Dentist)
class DentistAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "specialization", "email", "phone")
    search_fields = ("first_name", "last_name", "specialization", "email", "phone")


@admin.register(Treatment)
class TreatmentAdmin(admin.ModelAdmin):
    list_display = ("name", "price")
    search_fields = ("name",)


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("patient", "dentist", "treatment", "start_time", "end_time")
    list_filter = ("dentist", "start_time")
    search_fields = ("patient__first_name", "patient__last_name", "dentist__last_name")


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("appointment", "subtotal", "tax", "total", "paid", "issued_at")
    list_filter = ("paid",)

# Register your models here.
