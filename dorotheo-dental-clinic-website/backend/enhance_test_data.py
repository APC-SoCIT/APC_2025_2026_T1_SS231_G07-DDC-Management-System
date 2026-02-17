#!/usr/bin/env python
"""
Script to enhance the current database with additional test data
"""
import os
import django
import sys
from datetime import date, time, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import User, Service, ClinicLocation, Appointment
from django.contrib.auth.hashers import make_password

def create_additional_services():
    """Create more dental services"""
    print("\n📋 CREATING ADDITIONAL SERVICES")
    print("=" * 70)
    
    clinics = list(ClinicLocation.objects.all())
    
    services_data = [
        {"name": "Tooth Extraction", "description": "Safe removal of damaged or problematic teeth", "duration": 45, "color": "#EF4444"},
        {"name": "Dental Filling", "description": "Cavity repair with composite materials", "duration": 30, "color": "#3B82F6"},
        {"name": "Teeth Whitening", "description": "Professional whitening treatment", "duration": 60, "color": "#8B5CF6"},
        {"name": "Root Canal", "description": "Endodontic treatment to save infected teeth", "duration": 90, "color": "#F59E0B"},
        {"name": "Dental Crown", "description": "Custom cap to restore damaged teeth", "duration": 60, "color": "#10B981"},
        {"name": "Braces Consultation", "description": "Orthodontic evaluation and planning", "duration": 45, "color": "#EC4899"},
    ]
    
    created = 0
    for service_data in services_data:
        service, was_created = Service.objects.get_or_create(
            name=service_data["name"],
            defaults={
                "description": service_data["description"],
                "duration": service_data["duration"],
                "color": service_data["color"]
            }
        )
        
        if was_created:
            service.clinics.set(clinics)
            print(f"   ✓ Created: {service.name} ({service.duration} mins)")
            created += 1
        else:
            print(f"   - Exists: {service.name}")
    
    total = Service.objects.count()
    print(f"\n📊 Total services in database: {total} ({created} new)")

def create_sample_patients():
    """Create sample patient accounts"""
    print("\n👥 CREATING SAMPLE PATIENTS")
    print("=" * 70)
    
    patients_data = [
        {"email": "maria.santos@gmail.com", "first_name": "Maria", "last_name": "Santos", "phone": "+63 917 123 4567"},
        {"email": "juan.dela.cruz@gmail.com", "first_name": "Juan", "last_name": "Dela Cruz", "phone": "+63 918 234 5678"},
        {"email": "ana.reyes@gmail.com", "first_name": "Ana", "last_name": "Reyes", "phone": "+63 919 345 6789"},
        {"email": "pedro.garcia@gmail.com", "first_name": "Pedro", "last_name": "Garcia", "phone": "+63 920 456 7890"},
        {"email": "rosa.martinez@gmail.com", "first_name": "Rosa", "last_name": "Martinez", "phone": "+63 921 567 8901"},
    ]
    
    created = 0
    for patient_data in patients_data:
        user, was_created = User.objects.get_or_create(
            email=patient_data["email"],
            defaults={
                "username": patient_data["email"],
                "first_name": patient_data["first_name"],
                "last_name": patient_data["last_name"],
                "phone": patient_data["phone"],
                "user_type": "patient",
                "password": make_password("Patient123!"),
                "is_active": True
            }
        )
        
        if was_created:
            print(f"   ✓ Created: {user.get_full_name()} ({user.email})")
            created += 1
        else:
            print(f"   - Exists: {user.get_full_name()}")
    
    total_patients = User.objects.filter(user_type='patient').count()
    print(f"\n📊 Total patients in database: {total_patients} ({created} new)")

def create_sample_appointments():
    """Create sample appointments"""
    print("\n📅 CREATING SAMPLE APPOINTMENTS")
    print("=" * 70)
    
    patients = list(User.objects.filter(user_type='patient')[:5])
    dentist = User.objects.filter(role='dentist').first()
    services = list(Service.objects.all()[:4])
    clinics = list(ClinicLocation.objects.all())
    
    if not dentist:
        print("   ⚠ No dentist found, skipping appointments")
        return
    
    if not patients:
        print("   ⚠ No patients found, skipping appointments")
        return
    
    # Create appointments for next few days
    appointments_created = 0
    today = date.today()
    
    appointment_configs = [
        {"days_offset": 1, "hour": 9, "status": "scheduled"},
        {"days_offset": 1, "hour": 11, "status": "scheduled"},
        {"days_offset": 2, "hour": 10, "status": "scheduled"},
        {"days_offset": 2, "hour": 14, "status": "scheduled"},
        {"days_offset": 3, "hour": 9, "status": "scheduled"},
        {"days_offset": -2, "hour": 10, "status": "completed"},
        {"days_offset": -5, "hour": 14, "status": "completed"},
    ]
    
    for i, config in enumerate(appointment_configs):
        if i >= len(patients):
            break
            
        appointment_date = today + timedelta(days=config["days_offset"])
        
        # Skip weekends
        if appointment_date.weekday() >= 5:
            continue
        
        appointment, was_created = Appointment.objects.get_or_create(
            patient=patients[i % len(patients)],
            dentist=dentist,
            date=appointment_date,
            time=time(config["hour"], 0),
            defaults={
                "service": services[i % len(services)],
                "clinic": clinics[i % len(clinics)],
                "status": config["status"],
                "notes": f"Sample appointment {i+1}"
            }
        )
        
        if was_created:
            status_emoji = "✅" if config["status"] == "completed" else "📅"
            print(f"   {status_emoji} {appointment.patient.get_full_name()} - {appointment_date} at {appointment.time} ({config['status']})")
            appointments_created += 1
    
    total_appointments = Appointment.objects.count()
    print(f"\n📊 Total appointments in database: {total_appointments} ({appointments_created} new)")

def main():
    print("\n" + "=" * 70)
    print("ENHANCING DATABASE WITH TEST DATA")
    print("=" * 70)
    
    create_additional_services()
    create_sample_patients()
    create_sample_appointments()
    
    print("\n" + "=" * 70)
    print("✅ DATABASE ENHANCEMENT COMPLETE!")
    print("=" * 70)
    
    # Final summary
    print("\n📊 FINAL DATABASE SUMMARY:")
    print(f"   - Clinics: {ClinicLocation.objects.count()}")
    print(f"   - Users: {User.objects.count()}")
    print(f"   - Dentists: {User.objects.filter(role='dentist').count()}")
    print(f"   - Patients: {User.objects.filter(user_type='patient').count()}")
    print(f"   - Services: {Service.objects.count()}")
    print(f"   - Appointments: {Appointment.objects.count()}")
    print(f"   - Dentist Availability Slots: {User.objects.filter(role='dentist').first().date_availability.count() if User.objects.filter(role='dentist').exists() else 0}")

if __name__ == '__main__':
    main()
