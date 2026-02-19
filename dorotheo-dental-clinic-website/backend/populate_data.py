"""
Script to populate the database with sample data
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import User, Service, ClinicLocation

def populate_services():
    """Add dental services"""
    clinic = ClinicLocation.objects.first()
    
    services_data = [
        {"name": "Dental Cleaning", "category": "preventive", "description": "Professional teeth cleaning and polishing to remove plaque and tartar", "duration": 45},
        {"name": "Fluoride Treatment", "category": "preventive", "description": "Fluoride application to strengthen tooth enamel", "duration": 30},
        {"name": "Dental Sealants", "category": "preventive", "description": "Protective coating applied to chewing surfaces", "duration": 45},
        
        {"name": "Tooth Filling", "category": "restorations", "description": "Dental filling for cavities using composite materials", "duration": 60},
        {"name": "Dental Crown", "category": "restorations", "description": "Crown installation for damaged or weak teeth", "duration": 90},
        {"name": "Dental Bridge", "category": "restorations", "description": "Bridge to replace one or more missing teeth", "duration": 120},
        {"name": "Root Canal", "category": "restorations", "description": "Root canal treatment to save infected teeth", "duration": 90},
        
        {"name": "Tooth Extraction", "category": "oral_surgery", "description": "Simple tooth extraction procedure", "duration": 30},
        {"name": "Wisdom Tooth Removal", "category": "oral_surgery", "description": "Surgical removal of wisdom teeth", "duration": 60},
        {"name": "Dental Implant", "category": "oral_surgery", "description": "Tooth implant surgery for missing teeth", "duration": 120},
        
        {"name": "Metal Braces", "category": "orthodontics", "description": "Traditional metal braces for teeth alignment", "duration": 120},
        {"name": "Ceramic Braces", "category": "orthodontics", "description": "Tooth-colored ceramic braces", "duration": 120},
        {"name": "Braces Adjustment", "category": "orthodontics", "description": "Monthly braces adjustment and tightening", "duration": 30},
        
        {"name": "Panoramic X-Ray", "category": "xrays", "description": "Full mouth X-ray imaging", "duration": 15},
        {"name": "Bitewing X-Ray", "category": "xrays", "description": "X-ray of specific teeth areas", "duration": 10},
    ]
    
    created = 0
    for data in services_data:
        service, is_new = Service.objects.get_or_create(
            name=data["name"],
            defaults={
                "category": data["category"],
                "description": data["description"],
                "duration": data["duration"]
            }
        )
        if is_new:
            if clinic:
                service.clinics.add(clinic)
            created += 1
            print(f"✓ Created: {service.name}")
    
    print(f"\n✅ Created {created} new services")
    print(f"📊 Total services: {Service.objects.count()}")

if __name__ == "__main__":
    print("Populating database with sample services...")
    print()
    populate_services()
    print("\n✨ Done! Refresh your browser to see the services.")
