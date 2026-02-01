import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import DentistAvailability

print("=== Deleting Feb 3 Records for Testing ===")

# Delete all Feb 3 records
feb3_records = DentistAvailability.objects.filter(date='2026-02-03')
count = feb3_records.count()
print(f"Found {count} Feb 3 records")

if count > 0:
    feb3_records.delete()
    print(f"✓ Deleted {count} Feb 3 record(s)")

print("\n=== Remaining Feb 3 Records ===")
remaining = DentistAvailability.objects.filter(date='2026-02-03')
print(f"Count: {remaining.count()}")
