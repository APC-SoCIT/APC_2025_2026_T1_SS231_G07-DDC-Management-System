import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
import django
django.setup()

from api.models import DentistAvailability, ClinicLocation

# Get Alabang clinic
alabang = ClinicLocation.objects.get(id=2)
print(f'Alabang clinic: {alabang.name} (ID: {alabang.id})')

# Find the Feb 2 record with no clinic and 8:00 AM start time
broken_record = DentistAvailability.objects.filter(
    date='2026-02-02',
    clinic__isnull=True,
    start_time='08:00:00'
).first()

if broken_record:
    print(f'\nFound broken record: {broken_record.date} {broken_record.start_time}-{broken_record.end_time}')
    broken_record.clinic = alabang
    broken_record.save()
    print(f'Fixed! Now assigned to: {broken_record.clinic.name}')
else:
    print('No broken record found')
