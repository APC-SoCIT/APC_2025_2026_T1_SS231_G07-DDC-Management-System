#!/usr/bin/env python
"""
Script to create dentist availability schedules
"""
import os
import django
import sys
from datetime import time, date, timedelta

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import User, DentistAvailability, ClinicLocation

def create_dentist_availability():
    """Create availability schedules for all dentists for the next 3 months"""
    
    print("=" * 70)
    print("CREATING DENTIST AVAILABILITY SCHEDULES")
    print("=" * 70)
    
    # Get all dentists
    dentists = User.objects.filter(role='dentist')
    
    if not dentists.exists():
        print("⚠ No dentists found in the system")
        return
    
    # Get all clinics
    clinics = ClinicLocation.objects.all()
    
    if not clinics.exists():
        print("⚠ No clinics found. Please create clinics first.")
        return
    
    # Generate dates for the next 3 months (weekdays only)
    start_date = date.today()
    end_date = start_date + timedelta(days=90)
    
    dates_to_schedule = []
    current_date = start_date
    
    while current_date <= end_date:
        # Skip weekends (5 = Saturday, 6 = Sunday)
        if current_date.weekday() < 5:
            dates_to_schedule.append(current_date)
        current_date += timedelta(days=1)
    
    print(f"\n📅 Scheduling {len(dates_to_schedule)} weekdays for {len(dentists)} dentist(s) across {len(clinics)} clinic(s)")
    
    # Create availability for each dentist
    created_count = 0
    skipped_count = 0
    
    for dentist in dentists:
        print(f"\n👨‍⚕️ Processing: {dentist.get_full_name()}")
        
        # Create availability for each clinic and date
        for clinic in clinics:
            clinic_created = 0
            
            for availability_date in dates_to_schedule:
                # Check if availability already exists
                existing = DentistAvailability.objects.filter(
                    dentist=dentist,
                    clinic=clinic,
                    date=availability_date
                ).first()
                
                if existing:
                    skipped_count += 1
                    continue
                
                # Create availability: 9:00 AM - 5:00 PM
                DentistAvailability.objects.create(
                    dentist=dentist,
                    clinic=clinic,
                    date=availability_date,
                    start_time=time(9, 0),  # 9:00 AM
                    end_time=time(17, 0),   # 5:00 PM
                    is_available=True,
                    apply_to_all_clinics=False
                )
                
                created_count += 1
                clinic_created += 1
            
            print(f"   ✓ {clinic.name}: {clinic_created} days scheduled")
    
    print("\n" + "=" * 70)
    print("✅ DENTIST AVAILABILITY SCHEDULES CREATED!")
    print("=" * 70)
    
    # Summary
    total_schedules = DentistAvailability.objects.count()
    print(f"\n📊 Results:")
    print(f"   - Total schedules in database: {total_schedules}")
    print(f"   - New schedules created: {created_count}")
    print(f"   - Existing schedules skipped: {skipped_count}")
    
    for dentist in dentists:
        count = DentistAvailability.objects.filter(dentist=dentist).count()
        print(f"   - {dentist.get_full_name()}: {count} time slots")

if __name__ == '__main__':
    create_dentist_availability()
