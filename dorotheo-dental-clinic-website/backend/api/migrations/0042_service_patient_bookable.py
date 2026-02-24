"""
Migration: Add patient_bookable field to Service model.

Sets Cleaning and Consultation as patient_bookable=True.
All other services default to False (staff/owner only).
"""

from django.db import migrations, models


def set_patient_bookable_services(apps, schema_editor):
    """Mark Cleaning and Consultation as patient-bookable."""
    Service = apps.get_model('api', 'Service')
    updated = Service.objects.filter(
        name__iregex=r'^(cleaning|consultation)$'
    ).update(patient_bookable=True)
    print(f"[OK] Marked {updated} services as patient_bookable=True")


def unset_patient_bookable_services(apps, schema_editor):
    """Reverse: unmark all services."""
    Service = apps.get_model('api', 'Service')
    Service.objects.all().update(patient_bookable=False)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0041_appointment_booking_safety_constraints'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='patient_bookable',
            field=models.BooleanField(
                default=False,
                help_text=(
                    "Whether patients can book this service themselves "
                    "(via chatbot or frontend). Only Cleaning and Consultation "
                    "should be True. Staff can book any service."
                ),
            ),
        ),
        migrations.RunPython(
            set_patient_bookable_services,
            unset_patient_bookable_services,
        ),
    ]
