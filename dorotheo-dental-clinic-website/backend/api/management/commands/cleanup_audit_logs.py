"""
Management command to clean up old audit logs.

HIPAA requires 6 years of audit log retention. This command removes
logs older than the retention period.

Usage:
    # Preview what would be deleted
    python manage.py cleanup_audit_logs --dry-run
    
    # Delete logs older than 6 years
    python manage.py cleanup_audit_logs
    
    # Delete logs older than custom retention period
    python manage.py cleanup_audit_logs --days=2190  # 6 years
    
    # Force without confirmation (for automated scripts)
    python manage.py cleanup_audit_logs --force
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.conf import settings
from api.models import AuditLog
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clean up audit logs older than retention period (default: 6 years for HIPAA compliance)'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=365 * 6,  # 6 years
            help='Retention period in days (default: 2190 days / 6 years)'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
        
        parser.add_argument(
            '--force',
            action='store_true',
            help='Skip confirmation prompt (use in automated scripts)'
        )
        
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Number of records to delete per batch (default: 1000)'
        )
    
    def handle(self, *args, **options):
        retention_days = options['days']
        dry_run = options['dry_run']
        force = options['force']
        batch_size = options['batch_size']
        
        # Calculate cutoff date
        cutoff_date = timezone.now() - timedelta(days=retention_days)
        
        self.stdout.write(self.style.NOTICE(
            f"\n{'='*60}\n"
            f"Audit Log Cleanup\n"
            f"{'='*60}\n"
        ))
        
        self.stdout.write(f"Retention period: {retention_days} days")
        self.stdout.write(f"Cutoff date: {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')}")
        self.stdout.write(f"Mode: {'DRY RUN' if dry_run else 'LIVE DELETION'}\n")
        
        # Query old logs
        old_logs = AuditLog.objects.filter(timestamp__lt=cutoff_date)
        total_count = old_logs.count()
        
        if total_count == 0:
            self.stdout.write(self.style.SUCCESS(
                "✓ No audit logs found older than retention period."
            ))
            return
        
        # Show breakdown by action type
        self.stdout.write("\nAudit logs to be deleted:")
        self.stdout.write(f"{'Action Type':<20} {'Count':>10}")
        self.stdout.write("-" * 32)
        
        from django.db.models import Count
        breakdown = old_logs.values('action_type').annotate(count=Count('log_id')).order_by('-count')
        
        for item in breakdown:
            self.stdout.write(f"{item['action_type']:<20} {item['count']:>10}")
        
        self.stdout.write("-" * 32)
        self.stdout.write(f"{'TOTAL':<20} {total_count:>10}\n")
        
        # Show date range of logs to be deleted
        oldest_log = old_logs.order_by('timestamp').first()
        if oldest_log:
            self.stdout.write(f"Oldest log: {oldest_log.timestamp.strftime('%Y-%m-%d')}")
            self.stdout.write(f"Newest log to delete: {cutoff_date.strftime('%Y-%m-%d')}\n")
        
        # Dry run mode
        if dry_run:
            self.stdout.write(self.style.WARNING(
                "✓ DRY RUN MODE: No records were deleted.\n"
                "  Run without --dry-run to perform actual deletion."
            ))
            return
        
        # Confirmation prompt (skip if --force)
        if not force:
            self.stdout.write(self.style.WARNING(
                f"\n⚠️  WARNING: This will permanently delete {total_count} audit log records."
            ))
            self.stdout.write("This action cannot be undone.\n")
            
            confirm = input("Type 'DELETE' to confirm: ")
            if confirm != 'DELETE':
                self.stdout.write(self.style.ERROR("✗ Deletion cancelled."))
                return
        
        # Perform deletion in batches
        self.stdout.write("\nDeleting audit logs...")
        
        deleted_count = 0
        batch_number = 1
        
        while True:
            # Delete a batch
            batch_ids = list(old_logs.values_list('log_id', flat=True)[:batch_size])
            
            if not batch_ids:
                break
            
            AuditLog.objects.filter(log_id__in=batch_ids).delete()
            deleted_count += len(batch_ids)
            
            self.stdout.write(
                f"  Batch {batch_number}: Deleted {len(batch_ids)} records "
                f"({deleted_count}/{total_count})",
                ending='\r'
            )
            
            batch_number += 1
        
        self.stdout.write("\n")
        
        # Log the cleanup operation
        logger.info(
            f"Audit log cleanup completed: {deleted_count} records deleted "
            f"(retention period: {retention_days} days)"
        )
        
        # Success message
        self.stdout.write(self.style.SUCCESS(
            f"\n✓ Successfully deleted {deleted_count} audit log records.\n"
        ))
        
        # Show remaining audit log count
        remaining_count = AuditLog.objects.count()
        self.stdout.write(f"Remaining audit logs: {remaining_count}")
        
        if remaining_count > 0:
            oldest_remaining = AuditLog.objects.order_by('timestamp').first()
            self.stdout.write(
                f"Oldest remaining log: {oldest_remaining.timestamp.strftime('%Y-%m-%d')}"
            )
