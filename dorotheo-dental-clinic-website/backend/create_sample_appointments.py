#!/usr/bin/env python
"""
Create sample appointments for testing the appointments page.
"""
import os
import django
from datetime import datetime, timedelta, time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import User, Appointment, Service, ClinicLocation
from django.utils import timezone

def create_sample_appointments():
    """Create sample appointments for testing"""
    print("=== Creating Sample Appointments ===\n")
    
    # Get patients
    patients = list(User.objects.filter(user_type='patient')[:5])
    if not patients:
        print("❌ No patients found. Please create patients first.")
        return
    
    # Get dentists/staff
    dentists = list(User.objects.filter(user_type__in=['dentist', 'staff', 'owner'])[:3])
    if not dentists:
        print("❌ No dentists found. Please create dentists first.")
        return
    
    # Get services
    services = list(Service.objects.all()[:5])
    if not services:
        print("❌ No services found. Please create services first.")
        return
    
    # Get clinics
    clinics = list(ClinicLocation.objects.all())
    if not clinics:
        print("❌ No clinics found. Please create clinics first.")
        return
    
    print(f"Found {len(patients)} patients, {len(dentists)} dentists, {len(services)} services, {len(clinics)} clinics\n")
    
    # Create appointments for different dates
    today = datetime.now().date()
    times = [time(10, 0), time(11, 0), time(13, 0), time(14, 30), time(16, 0)]
    statuses = ['confirmed', 'pending', 'completed', 'waiting']
    
    appointments_created = 0
    
    # Create appointments for past 3 days, today, and next 7 days
    for day_offset in range(-3, 8):
        appointment_date = today + timedelta(days=day_offset)
        
        # Create 2-3 appointments per day
        num_appointments = 2 if day_offset < 0 else 3
        
        for i in range(num_appointments):
            patient = patients[appointments_created % len(patients)]
            dentist = dentists[appointments_created % len(dentists)]
            service = services[appointments_created % len(services)]
            clinic = clinics[appointments_created % len(clinics)]
            appointment_time = times[appointments_created % len(times)]
            
            # Set status based on date
            if day_offset < 0:
                # Past appointments - mix of completed and missed
                status = 'completed' if i % 2 == 0 else 'missed'
            elif day_offset == 0:
                # Today - mix of confirmed and waiting
                status = 'waiting' if i % 2 == 0 else 'confirmed'
            else:
                # Future - confirmed or pending
                status = 'confirmed' if i % 2 == 0 else 'pending'
            
            try:
                appointment = Appointment.objects.create(
                    patient=patient,
                    dentist=dentist,
                    service=service,
                    clinic=clinic,
                    date=appointment_date,
                    time=appointment_time,
                    status=status,
                    notes=f"Sample appointment for {patient.get_full_name()}",
                )
                print(f"✓ Created: {patient.get_full_name()} - {service.name} - {appointment_date} {appointment_time} - {status} - {clinic.name}")
                appointments_created += 1
            except Exception as e:
                print(f"✗ Failed to create appointment: {e}")
    
    print(f"\n=== Summary ===")
    print(f"Total appointments created: {appointments_created}")
    print(f"\nAppointments by status:")
    from django.db.models import Count
    status_counts = Appointment.objects.values('status').annotate(count=Count('id'))
    for item in status_counts:
        print(f"  {item['status']}: {item['count']}")
    
    print(f"\nAppointments by clinic:")
    clinic_counts = Appointment.objects.values('clinic__name').annotate(count=Count('id'))
    for item in clinic_counts:
        print(f"  {item['clinic__name']}: {item['count']}")

if __name__ == '__main__':
    create_sample_appointments()
