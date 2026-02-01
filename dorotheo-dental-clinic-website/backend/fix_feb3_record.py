import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import DentistAvailability, ClinicLocation

print("=== Fixing Feb 3 Record ===")

# Get the Alabang clinic
alabang = ClinicLocation.objects.get(id=2)
print(f"Alabang Clinic: {alabang.name}")

# Find the broken Feb 3 record
feb3_records = DentistAvailability.objects.filter(date='2026-02-03', clinic__isnull=True)
print(f"\nFound {feb3_records.count()} Feb 3 records with clinic=null")

for record in feb3_records:
    print(f"\nRecord ID: {record.id}")
    print(f"  Date: {record.date}")
    print(f"  Time: {record.start_time}-{record.end_time}")
    print(f"  Dentist ID: {record.dentist_id}")
    print(f"  Current Clinic: {record.clinic}")
    print(f"  Apply to all: {record.apply_to_all_clinics}")
    
    # Update to Alabang clinic
    record.clinic = alabang
    record.apply_to_all_clinics = False
    record.save()
    print(f"  ✓ Fixed! Now assigned to: {record.clinic.name}")

print("\n=== All Feb 3 Records After Fix ===")
all_feb3 = DentistAvailability.objects.filter(date='2026-02-03')
for record in all_feb3:
    clinic_name = record.clinic.name if record.clinic else "None"
    print(f"ID {record.id}: {record.date} | Dentist {record.dentist_id} | Clinic: {clinic_name} | {record.start_time}-{record.end_time}")
