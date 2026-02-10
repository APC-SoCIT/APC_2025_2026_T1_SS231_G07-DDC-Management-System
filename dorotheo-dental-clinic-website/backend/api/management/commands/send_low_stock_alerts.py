"""
Management command to send low stock alerts
Run daily via cron job or task scheduler: python manage.py send_low_stock_alerts
"""
from django.core.management.base import BaseCommand
from django.db.models import Q
from api.models import InventoryItem, User
from api.email_service import send_low_stock_alert
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send email alerts for low stock inventory items'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Send alerts even if they were sent recently (for testing)',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        
        # Get all inventory items
        all_items = InventoryItem.objects.all()
        
        # Filter for low stock items
        low_stock_items = [item for item in all_items if item.is_low_stock]
        
        sent_count = 0
        failed_count = 0
        skipped_count = 0
        
        self.stdout.write(f"Checking inventory stock levels...")
        self.stdout.write(f"Total items: {all_items.count()}")
        self.stdout.write(f"Low stock items: {len(low_stock_items)}")
        
        if not low_stock_items:
            self.stdout.write(self.style.SUCCESS("✓ All inventory items are adequately stocked!"))
            return
        
        # Get staff and owner emails
        staff_users = User.objects.filter(Q(user_type='staff') | Q(user_type='owner'))
        staff_emails = list(staff_users.values_list('email', flat=True))
        
        if not staff_emails:
            self.stdout.write(
                self.style.WARNING("⚠ No staff or owner users found to notify!")
            )
            return
        
        self.stdout.write(f"Staff recipients: {len(staff_emails)}")
        self.stdout.write("=" * 60)
        
        for item in low_stock_items:
            try:
                # Send low stock alert email
                if send_low_stock_alert(item, staff_emails):
                    sent_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Sent alert for: {item.name} "
                            f"(Stock: {item.quantity}, Min: {item.min_stock})"
                        )
                    )
                else:
                    failed_count += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f"✗ Failed to send alert for: {item.name}"
                        )
                    )
            except Exception as e:
                failed_count += 1
                logger.error(f"Error sending low stock alert for {item.name}: {str(e)}")
                self.stdout.write(
                    self.style.ERROR(
                        f"✗ Error with {item.name}: {str(e)}"
                    )
                )
        
        # Summary
        self.stdout.write("=" * 60)
        self.stdout.write(self.style.SUCCESS(f"📊 Summary:"))
        self.stdout.write(f"  Low stock items: {len(low_stock_items)}")
        self.stdout.write(f"  Alerts sent: {sent_count}")
        if failed_count > 0:
            self.stdout.write(self.style.ERROR(f"  Failed: {failed_count}"))
        if skipped_count > 0:
            self.stdout.write(self.style.WARNING(f"  Skipped: {skipped_count}"))
        
        if sent_count > 0:
            self.stdout.write(
                self.style.WARNING(
                    f"\n⚠️ Action Required: {sent_count} items need restocking!"
                )
            )
        
        self.stdout.write(self.style.SUCCESS(f"{'='*60}\n"))
