#!/usr/bin/env python
"""Check all data in database"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import User, Appointment, Service, ClinicLocation, DentalRecord, Payment, InventoryItem

print('=== DATABASE STATUS ===\n')
print(f'Users: {User.objects.count()}')
print(f'  - Patients: {User.objects.filter(user_type="patient").count()}')
print(f'  - Dentists: {User.objects.filter(user_type="dentist").count()}')
print(f'  - Staff: {User.objects.filter(user_type="staff").count()}')
print(f'  - Owners: {User.objects.filter(user_type="owner").count()}')
print(f'\nAppointments: {Appointment.objects.count()}')
print(f'Services: {Service.objects.count()}')
print(f'Clinics: {ClinicLocation.objects.count()}')
print(f'Dental Records: {DentalRecord.objects.count()}')
print(f'Payments: {Payment.objects.count()}')
print(f'Inventory Items: {InventoryItem.objects.count()}')

print('\n=== CLINIC DETAILS ===')
for clinic in ClinicLocation.objects.all():
    print(f'  - {clinic.name} (ID: {clinic.id})')
