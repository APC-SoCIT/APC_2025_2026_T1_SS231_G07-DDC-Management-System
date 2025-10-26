#!/usr/bin/env python
"""
Script to create initial owner and staff accounts for testing.
Run this after clearing the database to get started quickly.
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import User

def create_initial_accounts():
    """Create initial owner and staff accounts"""
    print("=" * 60)
    print("CREATING INITIAL ACCOUNTS")
    print("=" * 60)
    
    # Create owner account
    if not User.objects.filter(email='owner@admin.dorotheo.com').exists():
        owner = User.objects.create_user(
            username='owner@admin.dorotheo.com',
            email='owner@admin.dorotheo.com',
            password='owner123',
            user_type='owner',
            first_name='Marvin',
            last_name='Dorotheo',
            phone='09171234567',
            address='Dorotheo Dental Clinic Main Office'
        )
        print("✓ Owner account created:")
        print(f"  Email: owner@admin.dorotheo.com")
        print(f"  Password: owner123")
        print(f"  Name: {owner.get_full_name()}")
    else:
        print("- Owner account already exists")
    
    print("\n" + "=" * 60)
    print("INITIAL ACCOUNTS CREATED SUCCESSFULLY!")
    print("=" * 60)
    print("\nYou can now login with:")
    print("  Owner: owner@dorotheo.com / owner123")
    print("\nPatients can register through the website.\n")

if __name__ == '__main__':
    create_initial_accounts()
