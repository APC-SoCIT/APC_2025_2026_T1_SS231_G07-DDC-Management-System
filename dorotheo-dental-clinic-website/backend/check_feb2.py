import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
import django
django.setup()

from api.models import DentistAvailability, ClinicLocation

print('All clinics:')
for c in ClinicLocation.objects.all():
    print(f'  ID {c.id}: {c.name}')

print('\nAll Feb 2 records:')
for avail in DentistAvailability.objects.filter(date='2026-02-02').all():
    clinic_name = avail.clinic.name if avail.clinic else "None"
    print(f'  Date: {avail.date}, Clinic ID: {avail.clinic_id}, Apply to all: {avail.apply_to_all_clinics}, Clinic: {clinic_name}, Time: {avail.start_time}-{avail.end_time}')
