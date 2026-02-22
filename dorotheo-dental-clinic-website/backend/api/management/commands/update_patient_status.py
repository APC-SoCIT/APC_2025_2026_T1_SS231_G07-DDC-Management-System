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

        # Subquery: does this patient have ANY completed appointment (ever)?
        any_completed = Appointment.objects.filter(
            patient=OuterRef('pk'),
            status='completed',
        )

        # Non-archived patients annotated with both subquery results.
        # Patients with no completed appointments at all are intentionally excluded from
        # deactivation to preserve the "new patient = active" behavior in User.update_patient_status().
        patient_qs = User.objects.filter(user_type='patient', is_archived=False).annotate(
            has_recent_appointment=Exists(recent_completed),
            has_any_completed_appointment=Exists(any_completed),
        )

        # Single UPDATE for patients that should become active (recent appointment, currently inactive)
        activated = User.objects.filter(
            pk__in=patient_qs.filter(has_recent_appointment=True, is_active_patient=False).values('pk')
        ).update(is_active_patient=True)

        # Single UPDATE for patients that should become inactive:
        # – has old appointments (at least one completed) but none within the 2-year window
        # – currently marked active
        # Patients with NO completed appointments are left active (new/no-show patients).
        deactivated = User.objects.filter(
            pk__in=patient_qs.filter(
                has_recent_appointment=False,
                has_any_completed_appointment=True,
                is_active_patient=True,
            ).values('pk')
        ).update(is_active_patient=False)

        total_changed = activated + deactivated

        self.stdout.write(
            self.style.SUCCESS(
                f'update_patient_status complete: '
                f'{activated} activated, {deactivated} deactivated '
                f'({total_changed} total changed).'
            )
        )
