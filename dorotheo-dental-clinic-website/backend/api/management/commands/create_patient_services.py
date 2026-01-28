from django.core.management.base import BaseCommand
from api.models import Service

class Command(BaseCommand):
    help = 'Create Cleaning and Consultation services for patient booking'

    def handle(self, *args, **options):
        # Create Cleaning service
        cleaning, created = Service.objects.get_or_create(
            name='Cleaning',
            defaults={
                'category': 'preventive',
                'description': 'Professional dental cleaning to remove plaque and tartar buildup, promoting oral health and preventing gum disease.',
                'duration': 60,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Successfully created "Cleaning" service'))
        else:
            self.stdout.write(self.style.WARNING('"Cleaning" service already exists'))

        # Create Consultation service
        consultation, created = Service.objects.get_or_create(
            name='Consultation',
            defaults={
                'category': 'preventive',
                'description': 'Initial dental examination and consultation to assess oral health, discuss concerns, and develop treatment plans.',
                'duration': 30,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Successfully created "Consultation" service'))
        else:
            self.stdout.write(self.style.WARNING('"Consultation" service already exists'))

        self.stdout.write(self.style.SUCCESS('\nPatient booking services are ready!'))
