#!/usr/bin/env python
"""Check appointments in database"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import Appointment

print(f'Total appointments: {Appointment.objects.count()}')
print('First 10 appointments:')
for apt in Appointment.objects.all().order_by('-created_at')[:10]:
    clinic_name = apt.clinic.name if apt.clinic else "None"
    print(f'  ID:{apt.id}, Patient:{apt.patient.get_full_name()}, Date:{apt.date}, Time:{apt.time}, Status:{apt.status}, Clinic:{clinic_name}')

print('\nAppointments by status:')
from django.db.models import Count
status_counts = Appointment.objects.values('status').annotate(count=Count('id'))
for item in status_counts:
    print(f'  {item["status"]}: {item["count"]}')
