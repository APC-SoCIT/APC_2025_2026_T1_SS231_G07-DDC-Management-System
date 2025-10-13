#!/usr/bin/env python
"""Test script to check user deletion"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import User, Appointment, InsuranceDetail, Role

# Get a test user
user = User.objects.last()  # Use last user to avoid deleting important ones
if not user:
    print("No users found in database")
else:
    print(f"Testing delete for user: {user.email} (ID: {user.id})")
    print(f"User has medical history: {user.patient_medical_history.id if user.patient_medical_history else 'None'}")
    
    try:
        user_id = user.id
        medical_history = user.patient_medical_history
        
        # Manually delete related records
        print("Deleting related appointments (patient)...")
        Appointment.objects.filter(patient=user).delete()
        
        print("Deleting related appointments (staff)...")
        Appointment.objects.filter(staff=user).delete()
        
        print("Deleting related insurance details...")
        InsuranceDetail.objects.filter(user=user).delete()
        
        print("Deleting related roles...")
        Role.objects.filter(user=user).delete()
        
        print("Deleting user...")
        user.delete()
        
        print("Deleting orphaned medical history...")
        if medical_history and not User.objects.filter(patient_medical_history=medical_history).exists():
            medical_history.delete()
        
        print(f"✓ Delete successful! User ID {user_id} was deleted.")
    except Exception as e:
        print(f"✗ Delete failed with error:")
        print(f"  {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
