#!/usr/bin/env python3
"""
Check what tables exist in the database
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

from django.db import connection

def check_tables():
    """Check what tables exist in the database"""
    try:
        with connection.cursor() as cursor:
            # Get all table names
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            tables = cursor.fetchall()
            
            print("✅ Tables in Supabase database:")
            for table in tables:
                print(f"   - {table[0]}")
            
            print(f"\n📊 Total tables: {len(tables)}")
            
            # Check if Django's expected tables exist
            expected_django_tables = [
                'api_userprofile',
                'api_patient', 
                'api_appointment',
                'api_service',
                'api_invoice'
            ]
            
            existing_table_names = [table[0] for table in tables]
            
            print("\n🔍 Django model tables status:")
            for table in expected_django_tables:
                status = "✅ EXISTS" if table in existing_table_names else "❌ MISSING"
                print(f"   - {table}: {status}")
                
            # Check if your custom schema tables exist (from hey.md)
            custom_tables = [
                'user',
                'patient_medical_history',
                'appointment',
                'service',
                'invoices'
            ]
            
            print("\n🗂️  Custom schema tables (from hey.md):")
            for table in custom_tables:
                status = "✅ EXISTS" if table in existing_table_names else "❌ MISSING"
                print(f"   - {table}: {status}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking tables: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Checking Supabase Database Tables")
    print("=" * 50)
    check_tables()