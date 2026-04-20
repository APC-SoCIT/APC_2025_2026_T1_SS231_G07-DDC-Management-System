#!/usr/bin/env python
"""
Script to create initial owner and staff accounts for testing.
Run this after clearing the database to get started quickly.
"""
import os
import sys
from datetime import date

import django
from django.db import IntegrityError

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import User

# Email constants
OWNER_EMAIL = 'owner@admin.dorotheo.com'
RECEPTIONIST_EMAIL = 'receptionist@gmail.com'
DENTIST_EMAIL = 'dentist@gmail.com'
PATIENT_EMAIL = 'airoravinera@gmail.com'
PATIENT_ADDRESS = 'The Grand Towers Manila, P. Ocampo Sr Street Malate Manila'

USER_FIELDS = {field.name for field in User._meta.concrete_fields}


def _address_kwargs(address_text):
    """Map address text to whichever address schema exists on User."""
    if 'address' in USER_FIELDS:
        return {'address': address_text}
    if 'address_street' in USER_FIELDS:
        return {'address_street': address_text}
    return {}


def _set_user_address(user, address_text):
    """Set address on a User instance and return fields for update_fields."""
    update_fields = []
    if 'address' in USER_FIELDS:
        user.address = address_text
        update_fields.append('address')
    elif 'address_street' in USER_FIELDS:
        user.address_street = address_text
        update_fields.append('address_street')
    return update_fields


def create_initial_accounts():
    """Create initial owner and staff accounts."""
    print('=' * 60)
    print('CREATING INITIAL ACCOUNTS')
    print('=' * 60)

    # Create owner account (check both email and username to avoid unique constraint errors)
    if User.objects.filter(username=OWNER_EMAIL).exists() or User.objects.filter(email=OWNER_EMAIL).exists():
        print('- Owner account already exists')
    else:
        try:
            owner = User.objects.create_user(
                username=OWNER_EMAIL,
                email=OWNER_EMAIL,
                password='owner123',
                user_type='owner',
                first_name='Marvin',
                last_name='Dorotheo',
                phone='09171234567',
                **_address_kwargs('Dorotheo Dental Clinic Main Office'),
            )
            print('✓ Owner account created:')
            print('  Email: owner@admin.dorotheo.com')
            print('  Password: owner123')
            print(f'  Name: {owner.get_full_name()}')
        except IntegrityError:
            print('[WARNING] Owner account could not be created due to unique constraint. Skipping.')

    # Create receptionist account
    if User.objects.filter(username=RECEPTIONIST_EMAIL).exists() or User.objects.filter(email=RECEPTIONIST_EMAIL).exists():
        print('- Receptionist account already exists')
    else:
        try:
            receptionist = User.objects.create_user(
                username=RECEPTIONIST_EMAIL,
                email=RECEPTIONIST_EMAIL,
                password='Receptionist2546!',
                user_type='staff',
                role='receptionist',
                first_name='Reception',
                last_name='Staff',
                phone='09170000001',
                **_address_kwargs('Front Desk'),
            )
            print('✓ Receptionist account created:')
            print('  Email: receptionist@gmail.com')
            print('  Password: Receptionist2546!')
            print(f'  Name: {receptionist.get_full_name()}')
        except IntegrityError:
            print('[WARNING] Receptionist account could not be created due to unique constraint. Skipping.')

    # Create dentist account
    if User.objects.filter(username=DENTIST_EMAIL).exists() or User.objects.filter(email=DENTIST_EMAIL).exists():
        print('- Dentist account already exists')
    else:
        try:
            dentist = User.objects.create_user(
                username=DENTIST_EMAIL,
                email=DENTIST_EMAIL,
                password='Dentist2546!',
                user_type='staff',
                role='dentist',
                first_name='Dental',
                last_name='Doctor',
                phone='09170000002',
                **_address_kwargs('Clinic Room 1'),
            )
            print('✓ Dentist account created:')
            print('  Email: dentist@gmail.com')
            print('  Password: Dentist2546!')
            print(f'  Name: {dentist.get_full_name()}')
        except IntegrityError:
            print('[WARNING] Dentist account could not be created due to unique constraint. Skipping.')

    # Create demo patient account
    if User.objects.filter(username=PATIENT_EMAIL).exists() or User.objects.filter(email=PATIENT_EMAIL).exists():
        try:
            patient = User.objects.get(email=PATIENT_EMAIL)
        except User.DoesNotExist:
            # fallback: try by username
            patient = User.objects.filter(username=PATIENT_EMAIL).first()

        if patient:
            patient.phone = '09171091048'
            patient.birthday = date(2004, 9, 10)

            update_fields = ['phone', 'birthday']
            update_fields.extend(_set_user_address(patient, PATIENT_ADDRESS))

            patient.save(update_fields=update_fields)
            print('- Patient account already exists (updated phone/address fields/birthday)')
        else:
            print('[WARNING] Patient record exists by username but could not be retrieved; skipping update.')
    else:
        try:
            patient = User.objects.create_user(
                username=PATIENT_EMAIL,
                email=PATIENT_EMAIL,
                password='Airo2546!',
                user_type='patient',
                first_name='Airo',
                last_name='Ravinera',
                phone='09171091048',
                birthday=date(2004, 9, 10),
                **_address_kwargs(PATIENT_ADDRESS),
            )
            print('✓ Patient account created:')
            print('  Email: airoravinera@gmail.com')
            print('  Password: Airo2546!')
            print(f'  Name: {patient.get_full_name()}')
        except IntegrityError:
            print('[WARNING] Patient account could not be created due to unique constraint. Skipping.')

    print('\n' + '=' * 60)
    print('INITIAL ACCOUNTS CREATED SUCCESSFULLY!')
    print('=' * 60)
    print('\nYou can now login with:')
    print('  Owner: owner@admin.dorotheo.com / owner123')
    print('  Receptionist: receptionist@gmail.com / Receptionist2546!')
    print('  Dentist: dentist@gmail.com / Dentist2546!')
    print('  Patient: airoravinera@gmail.com / Airo2546!')
    print('\nPatients can register through the website.\n')


if __name__ == '__main__':
    create_initial_accounts()