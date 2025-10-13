#!/usr/bin/env python3
"""
Supabase Database Connection Test Script
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
from django.core.management.color import no_style

def test_database_connection():
    """Test the database connection"""
    try:
        # Test basic connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            print("✅ Database connection successful!")
            print(f"   Test query result: {result}")
        
        # Get database info
        db_settings = connection.settings_dict
        print(f"   Database Engine: {db_settings['ENGINE']}")
        print(f"   Database Name: {db_settings['NAME']}")
        print(f"   Database Host: {db_settings['HOST']}")
        print(f"   Database Port: {db_settings['PORT']}")
        
        # Test if we can see tables
        table_names = connection.introspection.table_names()
        print(f"   Existing tables: {len(table_names)}")
        if table_names:
            print(f"   Sample tables: {table_names[:5]}")
        
        return True
        
    except Exception as e:
        print("❌ Database connection failed!")
        print(f"   Error: {str(e)}")
        print(f"   Error type: {type(e).__name__}")
        
        # Check if it's a configuration issue
        if "could not connect to server" in str(e).lower():
            print("\n💡 Troubleshooting tips:")
            print("   1. Check your DATABASE_URL in .env file")
            print("   2. Verify Supabase project is active")
            print("   3. Check your database password")
            print("   4. Ensure your IP is allowed in Supabase")
        
        return False

def check_env_configuration():
    """Check if environment variables are properly set"""
    print("🔍 Checking environment configuration...")
    
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        print("✅ DATABASE_URL is set")
        # Don't print the full URL for security, just check if it looks right
        if 'supabase' in database_url.lower():
            print("   ✅ Appears to be a Supabase URL")
        if 'postgresql://' in database_url:
            print("   ✅ Uses PostgreSQL protocol")
        print()
    else:
        print("❌ DATABASE_URL is not set in environment")
        print("   Please check your .env file")
        print()

if __name__ == "__main__":
    print("=== Supabase Database Connection Test ===\n")
    
    check_env_configuration()
    test_database_connection()
    
    print("\n=== Test Complete ===")