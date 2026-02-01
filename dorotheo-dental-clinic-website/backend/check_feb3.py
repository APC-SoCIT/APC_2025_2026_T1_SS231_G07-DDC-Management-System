import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import DentistAvailability, ClinicLocation

print("=== All Clinics ===")
for clinic in ClinicLocation.objects.all():
    print(f"ID: {clinic.id}, Name: {clinic.name}")

print("\n=== All Feb 3, 2026 Availability Records ===")
records = DentistAvailability.objects.filter(date='2026-02-03').order_by('id')
print(f"Found {records.count()} records for Feb 3, 2026")

for record in records:
    clinic_name = record.clinic.name if record.clinic else "None"
    print(f"\nRecord ID: {record.id}")
    print(f"  Date: {record.date}")
    print(f"  Dentist ID: {record.dentist_id}")
    print(f"  Clinic ID: {record.clinic_id}")
    print(f"  Clinic Name: {clinic_name}")
    print(f"  Apply to all: {record.apply_to_all_clinics}")
    print(f"  Time: {record.start_time}-{record.end_time}")

print("\n=== All Availability Records (Recent) ===")
all_records = DentistAvailability.objects.all().order_by('-id')[:10]
for record in all_records:
    clinic_name = record.clinic.name if record.clinic else "None"
    print(f"ID {record.id}: {record.date} | Dentist {record.dentist_id} | Clinic: {clinic_name} | {record.start_time}-{record.end_time}")
