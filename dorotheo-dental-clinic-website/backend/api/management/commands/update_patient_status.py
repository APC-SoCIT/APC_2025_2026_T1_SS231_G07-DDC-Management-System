"""
Django management command to bulk-update is_active_patient for all patients.

Uses a single SQL Exists() subquery — no Python-level iteration.
Set is_active_patient=True  for patients with a completed appointment in the last 730 days.
Set is_active_patient=False for patients without any such appointment.

Usage:
    python manage.py update_patient_status

Schedule (Azure WebJob / cron):
    Run every 6 hours to keep statuses fresh without relying on request-time updates.
"""

from django.core.management.base import BaseCommand
from django.db.models import Exists, OuterRef
from django.utils import timezone
from datetime import timedelta

from api.models import User, Appointment


class Command(BaseCommand):
    help = 'Bulk-update is_active_patient for all patients based on 2-year appointment threshold'

    def handle(self, *args, **options):
        two_years_ago = timezone.now().date() - timedelta(days=730)

        # Subquery: does this patient have a completed appointment within the last 730 days?
        recent_completed = Appointment.objects.filter(
            patient=OuterRef('pk'),
            status='completed',
            date__gte=two_years_ago,
        )

        # All non-archived patient IDs annotated with the subquery result
        patient_qs = User.objects.filter(user_type='patient').annotate(
            has_recent_appointment=Exists(recent_completed)
        )

        # Single UPDATE for patients that should become active
        activated = User.objects.filter(
            pk__in=patient_qs.filter(has_recent_appointment=True, is_active_patient=False).values('pk')
        ).update(is_active_patient=True)

        # Single UPDATE for patients that should become inactive
        deactivated = User.objects.filter(
            pk__in=patient_qs.filter(has_recent_appointment=False, is_active_patient=True).values('pk')
        ).update(is_active_patient=False)

        total_changed = activated + deactivated

        self.stdout.write(
            self.style.SUCCESS(
                f'update_patient_status complete: '
                f'{activated} activated, {deactivated} deactivated '
                f'({total_changed} total changed).'
            )
        )
