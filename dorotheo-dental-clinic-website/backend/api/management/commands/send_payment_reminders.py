"""
Management command to send payment reminders for overdue invoices
Run weekly via cron job: python manage.py send_payment_reminders
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models import Billing
from api.email_service import send_payment_reminder
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send payment reminders for pending invoices'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Send reminders for invoices older than this many days (default: 7)',
        )

    def handle(self, *args, **options):
        days_old = options['days']
        cutoff_date = timezone.now() - timedelta(days=days_old)
        
        # Get pending bills older than cutoff date
        pending_bills = Billing.objects.filter(
            status='pending',
            created_at__lte=cutoff_date
        ).order_by('created_at')
        
        sent_count = 0
        failed_count = 0
        
        self.stdout.write(
            f"Checking for pending invoices older than {days_old} days "
            f"(before {cutoff_date.date()})..."
        )
        self.stdout.write(f"Found {pending_bills.count()} pending invoices")
        
        for billing in pending_bills:
            try:
                # Calculate days overdue
                days_overdue = (timezone.now() - billing.created_at).days
                
                if send_payment_reminder(billing, days_overdue=days_overdue):
                    sent_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Sent reminder to {billing.patient.email} "
                            f"for Invoice #{billing.id} (₱{billing.amount:,.2f}, {days_overdue} days old)"
                        )
                    )
                else:
                    failed_count += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f"✗ Failed to send reminder to {billing.patient.email}"
                        )
                    )
            except Exception as e:
                failed_count += 1
                logger.error(f"Error sending payment reminder for billing {billing.id}: {str(e)}")
                self.stdout.write(
                    self.style.ERROR(
                        f"✗ Error sending to {billing.patient.email}: {str(e)}"
                    )
                )
        
        # Summary
        self.stdout.write(self.style.SUCCESS(f"\n{'='*50}"))
        self.stdout.write(self.style.SUCCESS(f"Summary:"))
        self.stdout.write(self.style.SUCCESS(f"  Successfully sent: {sent_count}"))
        if failed_count > 0:
            self.stdout.write(self.style.ERROR(f"  Failed: {failed_count}"))
        
        if sent_count > 0:
            total_amount = sum(b.amount for b in pending_bills)
            self.stdout.write(
                self.style.WARNING(
                    f"  Total outstanding: ₱{total_amount:,.2f}"
                )
            )
        self.stdout.write(self.style.SUCCESS(f"{'='*50}\n"))
