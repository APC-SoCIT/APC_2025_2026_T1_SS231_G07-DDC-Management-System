"""
Script to fix existing availability records that don't have clinic information.
Sets apply_to_all_clinics=True for records with clinic=null.
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import DentistAvailability, StaffAvailability, BlockedTimeSlot

def fix_dentist_availability():
    """Fix DentistAvailability records with null clinic"""
    records = DentistAvailability.objects.filter(clinic__isnull=True, apply_to_all_clinics=False)
    count = records.count()
    
    if count > 0:
        print(f"Found {count} DentistAvailability records with null clinic")
        records.update(apply_to_all_clinics=True)
        print(f"Updated {count} records to apply_to_all_clinics=True")
    else:
        print("No DentistAvailability records need fixing")

def fix_staff_availability():
    """Fix StaffAvailability records with null clinics"""
    records = StaffAvailability.objects.filter(clinics__isnull=True, apply_to_all_clinics=False)
    count = records.count()
    
    if count > 0:
        print(f"Found {count} StaffAvailability records with null clinics")
        records.update(apply_to_all_clinics=True)
        print(f"Updated {count} records to apply_to_all_clinics=True")
    else:
        print("No StaffAvailability records need fixing")

def fix_blocked_time_slots():
    """Fix BlockedTimeSlot records with null clinic"""
    records = BlockedTimeSlot.objects.filter(clinic__isnull=True, apply_to_all_clinics=False)
    count = records.count()
    
    if count > 0:
        print(f"Found {count} BlockedTimeSlot records with null clinic")
        records.update(apply_to_all_clinics=True)
        print(f"Updated {count} records to apply_to_all_clinics=True")
    else:
        print("No BlockedTimeSlot records need fixing")

if __name__ == '__main__':
    print("=" * 60)
    print("Fixing availability records with missing clinic information")
    print("=" * 60)
    
    fix_dentist_availability()
    print()
    fix_staff_availability()
    print()
    fix_blocked_time_slots()
    
    print()
    print("=" * 60)
    print("Done!")
    print("=" * 60)
