"""
Management command to send appointment reminders
Run daily via cron job or task scheduler: python manage.py send_appointment_reminders
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models import Appointment
from api.email_service import send_appointment_reminder
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send email reminders for appointments scheduled in the next 24 hours'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=24,
            help='Send reminders for appointments within this many hours (default: 24)',
        )

    def handle(self, *args, **options):
        hours_ahead = options['hours']
        now = timezone.now()
        reminder_time = now + timedelta(hours=hours_ahead)
        
        # Get confirmed appointments for tomorrow
        upcoming_appointments = Appointment.objects.filter(
            status='confirmed',
            date=reminder_time.date()
        )
        
        sent_count = 0
        failed_count = 0
        
        self.stdout.write(f"Checking for appointments on {reminder_time.date()}...")
        self.stdout.write(f"Found {upcoming_appointments.count()} confirmed appointments")
        
        for appointment in upcoming_appointments:
            try:
                if send_appointment_reminder(appointment):
                    sent_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Sent reminder to {appointment.patient.email} "
                            f"for {appointment.date} at {appointment.time}"
                        )
                    )
                else:
                    failed_count += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f"✗ Failed to send reminder to {appointment.patient.email}"
                        )
                    )
            except Exception as e:
                failed_count += 1
                logger.error(f"Error sending reminder for appointment {appointment.id}: {str(e)}")
                self.stdout.write(
                    self.style.ERROR(
                        f"✗ Error sending to {appointment.patient.email}: {str(e)}"
                    )
                )
        
        # Summary
        self.stdout.write(self.style.SUCCESS(f"\n{'='*50}"))
        self.stdout.write(self.style.SUCCESS(f"Summary:"))
        self.stdout.write(self.style.SUCCESS(f"  Successfully sent: {sent_count}"))
        if failed_count > 0:
            self.stdout.write(self.style.ERROR(f"  Failed: {failed_count}"))
        self.stdout.write(self.style.SUCCESS(f"{'='*50}\n"))
