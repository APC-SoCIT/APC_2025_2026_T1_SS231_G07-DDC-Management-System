from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import ClinicLocation, Service


class Command(BaseCommand):
    help = 'Create the three clinic locations with proper names for color-coding'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-services',
            action='store_true',
            help='Skip assigning services to clinics',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('🏥 CREATING CLINIC LOCATIONS'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        
        try:
            with transaction.atomic():
                # 1. Create/Update Main Clinic (Bacoor) - GREEN
                main_clinic, main_created = ClinicLocation.objects.update_or_create(
                    id=1,
                    defaults={
                        'name': "Dorotheo Dental Clinic - Bacoor (Main)",
                        'address': "Unit 5, 2nd Floor, SM City Bacoor, Tirona Highway, Bacoor, Cavite 4102",
                        'phone': "+63 46 417 1234"
                    }
                )
                if main_created:
                    self.stdout.write(self.style.SUCCESS(f"✓ Created Main Clinic (Bacoor) - ID: {main_clinic.id}"))
                    self.stdout.write(self.style.WARNING(f"  Color: GREEN 🟢"))
                else:
                    self.stdout.write(self.style.WARNING(f"✓ Updated Main Clinic (Bacoor) - ID: {main_clinic.id}"))
                    self.stdout.write(self.style.WARNING(f"  Color: GREEN 🟢"))

                # 2. Create Alabang Branch - BLUE
                alabang_clinic, alabang_created = ClinicLocation.objects.get_or_create(
                    name="Dorotheo Dental Clinic - Alabang",
                    defaults={
                        'address': "Ground Floor, Festival Mall, Filinvest City, Alabang, Muntinlupa City 1781",
                        'phone': "+63 2 8809 5678"
                    }
                )
                if alabang_created:
                    self.stdout.write(self.style.SUCCESS(f"✓ Created Alabang Clinic - ID: {alabang_clinic.id}"))
                    self.stdout.write(self.style.WARNING(f"  Color: BLUE 🔵"))
                else:
                    self.stdout.write(self.style.WARNING(f"✓ Alabang Clinic already exists - ID: {alabang_clinic.id}"))
                    self.stdout.write(self.style.WARNING(f"  Color: BLUE 🔵"))

                # 3. Create Poblacion Branch - PURPLE
                poblacion_clinic, poblacion_created = ClinicLocation.objects.get_or_create(
                    name="Dorotheo Dental Clinic - Poblacion",
                    defaults={
                        'address': "2nd Floor, Poblacion Commercial Center, 5678 P. Burgos Street, Poblacion, Makati City 1210",
                        'phone': "+63 2 8888 9012"
                    }
                )
                if poblacion_created:
                    self.stdout.write(self.style.SUCCESS(f"✓ Created Poblacion Clinic - ID: {poblacion_clinic.id}"))
                    self.stdout.write(self.style.WARNING(f"  Color: PURPLE 🟣"))
                else:
                    self.stdout.write(self.style.WARNING(f"✓ Poblacion Clinic already exists - ID: {poblacion_clinic.id}"))
                    self.stdout.write(self.style.WARNING(f"  Color: PURPLE 🟣"))

                self.stdout.write('')
                self.stdout.write(self.style.SUCCESS('=' * 70))
                self.stdout.write(self.style.SUCCESS('📊 CLINIC SUMMARY'))
                self.stdout.write(self.style.SUCCESS('=' * 70))
                
                all_clinics = ClinicLocation.objects.all()
                for clinic in all_clinics:
                    color_indicator = ''
                    if 'bacoor' in clinic.name.lower() or 'main' in clinic.name.lower():
                        color_indicator = '🟢 GREEN'
                    elif 'alabang' in clinic.name.lower():
                        color_indicator = '🔵 BLUE'
                    elif 'poblacion' in clinic.name.lower() or 'makati' in clinic.name.lower():
                        color_indicator = '🟣 PURPLE'
                    else:
                        color_indicator = '⚪ GRAY (default)'
                    
                    self.stdout.write(f"ID: {clinic.id} | {clinic.name} | {color_indicator}")
                    self.stdout.write(f"  📍 {clinic.address}")
                    self.stdout.write(f"  📞 {clinic.phone}")
                    self.stdout.write('')

                # 4. Assign Services to All Clinics (Optional)
                if not options['skip_services']:
                    self.stdout.write(self.style.SUCCESS('=' * 70))
                    self.stdout.write(self.style.SUCCESS('🔧 ASSIGNING SERVICES TO CLINICS'))
                    self.stdout.write(self.style.SUCCESS('=' * 70))
                    
                    services = Service.objects.all()
                    if services.exists():
                        for service in services:
                            # Add all clinics to each service
                            service.clinics.add(main_clinic, alabang_clinic, poblacion_clinic)
                        
                        self.stdout.write(self.style.SUCCESS(f"✓ Assigned {services.count()} services to all 3 clinics"))
                    else:
                        self.stdout.write(self.style.WARNING("⚠ No services found. Run after creating services."))
                
                self.stdout.write('')
                self.stdout.write(self.style.SUCCESS('=' * 70))
                self.stdout.write(self.style.SUCCESS('✅ CLINIC SETUP COMPLETE!'))
                self.stdout.write(self.style.SUCCESS('=' * 70))
                self.stdout.write('')
                self.stdout.write(self.style.WARNING('📝 Note: Clinic colors are automatically assigned by the frontend based on names:'))
                self.stdout.write(self.style.WARNING('   • Names containing "Bacoor" or "Main" → GREEN 🟢'))
                self.stdout.write(self.style.WARNING('   • Names containing "Alabang" → BLUE 🔵'))
                self.stdout.write(self.style.WARNING('   • Names containing "Poblacion" or "Makati" → PURPLE 🟣'))
                self.stdout.write('')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error creating clinics: {str(e)}'))
            raise
