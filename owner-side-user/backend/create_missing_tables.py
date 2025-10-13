#!/usr/bin/env python3
"""
Manually create missing Django tables in Supabase
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
from django.db import models
from api.models import UserProfile, Service, Invoice

def create_missing_tables():
    """Create missing Django tables"""
    style = no_style()
    
    # Get the missing models
    missing_models = [UserProfile, Service, Invoice]
    
    try:
        with connection.cursor() as cursor:
            print("🔧 Creating missing Django tables...")
            
            for model in missing_models:
                table_name = model._meta.db_table
                
                # Check if table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = %s
                    );
                """, [table_name])
                
                exists = cursor.fetchone()[0]
                
                if not exists:
                    print(f"   Creating table: {table_name}")
                    
                    # Get the SQL to create the table
                    from django.db import connection
                    from django.core.management.sql import sql_create_index
                    from django.db.backends.utils import names_digest
                    
                    # Create the table using Django's schema editor
                    from django.db import connection
                    with connection.schema_editor() as schema_editor:
                        schema_editor.create_model(model)
                    
                    print(f"   ✅ Created {table_name}")
                else:
                    print(f"   ⏭️  Table {table_name} already exists")
        
        print("\n✅ All missing tables created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

if __name__ == "__main__":
    print("🛠️  Creating Missing Django Tables in Supabase")
    print("=" * 60)
    create_missing_tables()