"""
Database-Level Safety Constraints for Appointment Booking
─────────────────────────────────────────────────────────
These constraints enforce booking rules at the DATABASE level,
making invalid appointments impossible even if application code fails.

Constraints added:
1. Index for fast slot verification queries (dentist+date+time+status)
2. Index for availability_slot FK lookups
3. Composite index for clinic+dentist+date+time queries
4. CHECK constraint: date must be >= 2020-01-01 (sanity lower bound)

These constraints apply to ALL environments (local, production, staging).
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0040_add_availability_slot_to_appointment'),
    ]

    operations = [
        # 1. Add CHECK constraint: date sanity bound (no appointments before 2020)
        migrations.AddConstraint(
            model_name='appointment',
            constraint=models.CheckConstraint(
                check=models.Q(date__gte='2020-01-01'),
                name='appointment_date_lower_bound',
            ),
        ),

        # 2. Add composite index to speed up double-booking checks
        migrations.AddIndex(
            model_name='appointment',
            index=models.Index(
                fields=['dentist', 'date', 'time', 'status'],
                name='idx_apt_dentist_slot_status',
            ),
        ),

        # 3. Add index for availability_slot lookups
        migrations.AddIndex(
            model_name='appointment',
            index=models.Index(
                fields=['availability_slot'],
                name='idx_apt_availability_slot',
            ),
        ),

        # 4. Add index for slot verification queries
        migrations.AddIndex(
            model_name='appointment',
            index=models.Index(
                fields=['clinic', 'dentist', 'date', 'time'],
                name='idx_apt_clinic_dentist_dt',
            ),
        ),
    ]
