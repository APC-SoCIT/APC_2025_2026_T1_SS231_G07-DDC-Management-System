#!/usr/bin/env python
"""
Script to clear all data from the database for fresh testing.
This will delete all records from all tables (except migrations).
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import (
    Service, Appointment, ToothChart, DentalRecord,
    Document, InventoryItem, Billing, ClinicLocation,
    TreatmentPlan, TeethImage
)
from rest_framework.authtoken.models import Token

User = get_user_model()

def clear_all_data():
    """Clear all data from all tables"""
    print("=" * 60)
    print("CLEARING ALL DATABASE DATA")
    print("=" * 60)
    
    # Clear in order to respect foreign key constraints
    models_to_clear = [
        ('Tokens', Token),
        ('Teeth Images', TeethImage),
        ('Treatment Plans', TreatmentPlan),
        ('Clinic Locations', ClinicLocation),
        ('Billings', Billing),
        ('Inventory Items', InventoryItem),
        ('Documents', Document),
        ('Dental Records', DentalRecord),
        ('Tooth Charts', ToothChart),
        ('Appointments', Appointment),
        ('Services', Service),
        ('Users', User),
    ]
    
    for model_name, model in models_to_clear:
        count = model.objects.count()
        if count > 0:
            model.objects.all().delete()
            print(f"✓ Deleted {count} {model_name}")
        else:
            print(f"- No {model_name} to delete")
    
    print("\n" + "=" * 60)
    print("DATABASE CLEARED SUCCESSFULLY!")
    print("=" * 60)
    print("\nThe database is now empty and ready for fresh data.")
    print("You can now register new users and add data through the application.\n")

if __name__ == '__main__':
    import sys
    
    # Check if --force flag is provided
    if '--force' in sys.argv:
        clear_all_data()
    else:
        # Confirm before clearing
        print("\n⚠️  WARNING: This will delete ALL data from the database!")
        print("This action cannot be undone.\n")
        
        confirm = input("Type 'yes' to confirm: ").strip().lower()
        
        if confirm == 'yes':
            clear_all_data()
        else:
            print("\nOperation cancelled. No data was deleted.")
