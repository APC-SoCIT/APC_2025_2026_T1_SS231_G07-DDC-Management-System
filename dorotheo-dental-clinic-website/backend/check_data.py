#!/usr/bin/env python
"""Quick script to check if database has data"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import User, Appointment, Service, ClinicLocation

# Check data counts
patients = User.objects.filter(user_type='patient').count()
appointments = Appointment.objects.count()
services = Service.objects.count()
clinics = ClinicLocation.objects.count()

print("\n=== DATABASE CHECK ===")
print(f"Patients: {patients}")
print(f"Appointments: {appointments}")
print(f"Services: {services}")
print(f"Clinics: {clinics}")

if patients == 0:
    print("\n⚠️  No patients found!")
if appointments == 0:
    print("⚠️  No appointments found!")
if services == 0:
    print("⚠️  No services found!")
if clinics == 0:
    print("⚠️  No clinics found!")

if patients > 0 or appointments > 0:
    print("\n✅ Database has data")
else:
    print("\n❌ Database is empty - run: python manage.py loaddata initial_data.json")

print("===================\n")
