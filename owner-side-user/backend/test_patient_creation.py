#!/usr/bin/env python3
"""
Test creating a patient record to verify Django-Supabase integration
"""
import os
import sys
import django
from pathlib import Path

# Add the project directory to the Python path
project_dir = Path(__file__).resolve().parent
sys.path.append(str(project_dir))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')

# Initialize Django
django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile, PatientMedicalHistory, Service, Appointment

def test_patient_creation():
    """Test creating a patient and verify it appears in Supabase"""
    try:
        print("🧪 Testing Patient Creation in Supabase Database")
        print("=" * 60)
        
        # Create a test user
        print("1. Creating Django User...")
        user = User.objects.create_user(
            username='testpatient123',
            email='test@example.com',
            first_name='Test',
            last_name='Patient'
        )
        print(f"   ✅ Created User: {user.username} (ID: {user.id})")
        
        # Create medical history
        print("2. Creating Medical History...")
        medical_history = PatientMedicalHistory.objects.create(
            allergies='No known allergies',
            medications='None',
            conditions='Healthy'
        )
        print(f"   ✅ Created Medical History (ID: {medical_history.id})")
        
        # Create user profile
        print("3. Creating User Profile...")
        profile = UserProfile.objects.create(
            user=user,
            f_name='Test',
            l_name='Patient',
            patient_medical_history=medical_history
        )
        print(f"   ✅ Created UserProfile (ID: {profile.id})")
        
        # Create a service
        print("4. Creating Service...")
        service = Service.objects.create(
            servicename='Teeth Cleaning',
            servicedesc='Regular dental cleaning',
            category='Preventive',
            standard_duration_mins=60,
            standard_price=100.00
        )
        print(f"   ✅ Created Service: {service.servicename} (ID: {service.id})")
        
        # Verify the records were created
        print("\n📊 Verification:")
        print(f"   Total Users: {User.objects.count()}")
        print(f"   Total UserProfiles: {UserProfile.objects.count()}")
        print(f"   Total Medical Histories: {PatientMedicalHistory.objects.count()}")
        print(f"   Total Services: {Service.objects.count()}")
        
        # Try to retrieve the created patient
        retrieved_profile = UserProfile.objects.get(id=profile.id)
        print(f"\n✅ Successfully retrieved patient: {retrieved_profile.get_full_name()}")
        print(f"   Email: {retrieved_profile.user.email}")
        print(f"   Medical History: {retrieved_profile.patient_medical_history.allergies}")
        
        print("\n🎉 SUCCESS: Django is successfully writing to and reading from Supabase!")
        print("🔗 Your frontend can now add patient records and they will appear in your Supabase database.")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing patient creation: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_patient_creation()