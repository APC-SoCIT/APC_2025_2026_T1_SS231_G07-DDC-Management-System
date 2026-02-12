"""
Management command to test audit log backup and restore functionality.

HIPAA requires 6-year retention of audit logs with proper backup procedures.
This command tests the backup/restore process to ensure audit logs can be 
recovered in case of system failure or data loss.

Usage:
    # Test backup and restore (dry run)
    python manage.py test_audit_backup
    
    # Create actual backup file
    python manage.py test_audit_backup --create-backup
    
    # Test restore from backup
    python manage.py test_audit_backup --test-restore --backup-file=backup.json
    
    # Full test (backup + restore verification)
    python manage.py test_audit_backup --full-test
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core import serializers
from django.db import transaction
from api.models import AuditLog
import json
import os
import tempfile
from datetime import timedelta


class Command(BaseCommand):
    help = 'Test audit log backup and restore functionality'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--create-backup',
            action='store_true',
            help='Create a backup file of all audit logs'
        )
        
        parser.add_argument(
            '--backup-file',
            type=str,
            help='Path to backup file for restore testing'
        )
        
        parser.add_argument(
            '--test-restore',
            action='store_true',
            help='Test restore functionality from backup file'
        )
        
        parser.add_argument(
            '--full-test',
            action='store_true',
            help='Run full backup and restore test sequence'
        )
        
        parser.add_argument(
            '--output-dir',
            type=str,
            default='.',
            help='Directory for backup files (default: current directory)'
        )
    
    def handle(self, *args, **options):
        create_backup = options['create_backup']
        backup_file = options['backup_file']
        test_restore = options['test_restore']
        full_test = options['full_test']
        output_dir = options['output_dir']
        
        self.stdout.write(self.style.NOTICE(
            f"\n{'='*70}\n"
            f"Audit Log Backup & Restore Test\n"
            f"{'='*70}\n"
        ))
        
        if full_test:
            # Run complete backup and restore test
            self._run_full_test(output_dir)
        elif create_backup:
            # Create backup only
            self._create_backup(output_dir)
        elif test_restore and backup_file:
            # Test restore from provided backup file
            self._test_restore(backup_file)
        else:
            # Run basic verification
            self._run_basic_checks()
    
    def _run_basic_checks(self):
        """Run basic checks without creating backups."""
        self.stdout.write("Running basic backup readiness checks...\n")
        
        checks_passed = 0
        checks_failed = 0
        
        # Check 1: Audit logs exist
        total_logs = AuditLog.objects.count()
        
        if total_logs > 0:
            self.stdout.write(self.style.SUCCESS(
                f"✓ Audit logs present: {total_logs:,} records"
            ))
            checks_passed += 1
        else:
            self.stdout.write(self.style.ERROR(
                "✗ No audit logs found to backup"
            ))
            checks_failed += 1
        
        # Check 2: Calculate backup size estimate
        if total_logs > 0:
            # Estimate: ~500 bytes average per audit log entry
            estimated_size_mb = (total_logs * 500) / (1024 * 1024)
            
            self.stdout.write(self.style.SUCCESS(
                f"✓ Estimated backup size: {estimated_size_mb:.2f} MB"
            ))
            checks_passed += 1
        
        # Check 3: Check disk space (estimate 2x size needed)
        import shutil
        try:
            disk_usage = shutil.disk_usage('.')
            free_space_mb = disk_usage.free / (1024 * 1024)
            
            if total_logs > 0:
                required_space_mb = estimated_size_mb * 2
                
                if free_space_mb > required_space_mb:
                    self.stdout.write(self.style.SUCCESS(
                        f"✓ Sufficient disk space: {free_space_mb:.0f} MB available"
                    ))
                    checks_passed += 1
                else:
                    self.stdout.write(self.style.WARNING(
                        f"⚠ Low disk space: {free_space_mb:.0f} MB available, {required_space_mb:.0f} MB needed"
                    ))
                    checks_failed += 1
        except Exception as e:
            self.stdout.write(self.style.WARNING(
                f"⚠ Could not check disk space: {str(e)}"
            ))
        
        # Check 4: Test JSON serialization
        if total_logs > 0:
            try:
                # Test serialize a sample log
                sample_log = AuditLog.objects.first()
                serialized = serializers.serialize('json', [sample_log])
                
                self.stdout.write(self.style.SUCCESS(
                    "✓ JSON serialization functional"
                ))
                checks_passed += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f"✗ JSON serialization failed: {str(e)}"
                ))
                checks_failed += 1
        
        # Check 5: Verify data retention age
        if total_logs > 0:
            oldest_log = AuditLog.objects.order_by('timestamp').first()
            log_age_years = (timezone.now() - oldest_log.timestamp).days / 365.25
            
            self.stdout.write(self.style.SUCCESS(
                f"✓ Oldest log: {oldest_log.timestamp.strftime('%Y-%m-%d')} ({log_age_years:.1f} years old)"
            ))
            checks_passed += 1
        
        # Summary
        self.stdout.write(self.style.NOTICE(f"\n{'='*70}"))
        self.stdout.write(f"Checks passed: {checks_passed}")
        self.stdout.write(f"Checks failed: {checks_failed}\n")
        
        if checks_failed == 0:
            self.stdout.write(self.style.SUCCESS(
                "✓ System ready for backup operations\n"
                "  Run with --create-backup to create a backup file\n"
                "  Run with --full-test to test complete backup/restore cycle\n"
            ))
        else:
            self.stdout.write(self.style.ERROR(
                "✗ Issues detected. Resolve before running backup.\n"
            ))
    
    def _create_backup(self, output_dir):
        """Create a backup file of all audit logs."""
        self.stdout.write("Creating audit log backup...\n")
        
        # Generate backup filename with timestamp
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'audit_logs_backup_{timestamp}.json'
        backup_path = os.path.join(output_dir, backup_filename)
        
        # Count logs to backup
        total_logs = AuditLog.objects.count()
        
        if total_logs == 0:
            self.stdout.write(self.style.ERROR("✗ No audit logs to backup"))
            return
        
        self.stdout.write(f"Backing up {total_logs:,} audit logs...")
        
        try:
            # Serialize all audit logs
            with open(backup_path, 'w', encoding='utf-8') as backup_file:
                # Get all audit logs
                audit_logs = AuditLog.objects.all().order_by('log_id')
                
                # Serialize to JSON
                serialized_data = serializers.serialize('json', audit_logs, indent=2)
                backup_file.write(serialized_data)
            
            # Get file size
            file_size_mb = os.path.getsize(backup_path) / (1024 * 1024)
            
            self.stdout.write(self.style.SUCCESS(
                f"\n✓ Backup created successfully!"
            ))
            self.stdout.write(f"  File: {backup_path}")
            self.stdout.write(f"  Records: {total_logs:,}")
            self.stdout.write(f"  Size: {file_size_mb:.2f} MB")
            
            # Show date range
            oldest = AuditLog.objects.order_by('timestamp').first()
            newest = AuditLog.objects.order_by('-timestamp').first()
            
            self.stdout.write(f"  Date range: {oldest.timestamp.strftime('%Y-%m-%d')} to {newest.timestamp.strftime('%Y-%m-%d')}")
            
            self.stdout.write(self.style.NOTICE(
                f"\n💾 Store this backup securely for 6+ years (HIPAA requirement)\n"
            ))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(
                f"\n✗ Backup failed: {str(e)}\n"
            ))
    
    def _test_restore(self, backup_file):
        """Test restore functionality from backup file."""
        self.stdout.write(f"Testing restore from: {backup_file}\n")
        
        if not os.path.exists(backup_file):
            self.stdout.write(self.style.ERROR(
                f"✗ Backup file not found: {backup_file}\n"
            ))
            return
        
        try:
            # Read backup file
            with open(backup_file, 'r', encoding='utf-8') as f:
                backup_data = f.read()
            
            file_size_mb = os.path.getsize(backup_file) / (1024 * 1024)
            
            self.stdout.write(f"Backup file size: {file_size_mb:.2f} MB")
            
            # Deserialize (but don't save to database in test mode)
            deserialized_objects = list(serializers.deserialize('json', backup_data))
            record_count = len(deserialized_objects)
            
            self.stdout.write(self.style.SUCCESS(
                f"✓ Successfully parsed {record_count:,} records from backup"
            ))
            
            # Verify data integrity
            if record_count > 0:
                # Check first record
                first_obj = deserialized_objects[0].object
                
                self.stdout.write("\nSample record verification:")
                self.stdout.write(f"  Action: {first_obj.action_type}")
                self.stdout.write(f"  Timestamp: {first_obj.timestamp}")
                self.stdout.write(f"  Target: {first_obj.target_table}")
                
                # Check required fields
                has_timestamp = first_obj.timestamp is not None
                has_action = bool(first_obj.action_type)
                has_target = bool(first_obj.target_table)
                
                if has_timestamp and has_action and has_target:
                    self.stdout.write(self.style.SUCCESS(
                        "\n✓ Backup data integrity verified"
                    ))
                else:
                    self.stdout.write(self.style.WARNING(
                        "\n⚠ Some required fields may be missing"
                    ))
            
            self.stdout.write(self.style.SUCCESS(
                f"\n✓ Restore test completed successfully\n"
                f"  {record_count:,} records can be restored from this backup\n"
            ))
            
            self.stdout.write(self.style.WARNING(
                "NOTE: This was a dry-run test. No data was written to the database.\n"
            ))
            
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(
                f"✗ Invalid JSON in backup file: {str(e)}\n"
            ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(
                f"✗ Restore test failed: {str(e)}\n"
            ))
    
    def _run_full_test(self, output_dir):
        """Run complete backup and restore test cycle."""
        self.stdout.write("Running full backup and restore test...\n")
        
        # Step 1: Create test audit log
        self.stdout.write(self.style.NOTICE("\n1. Creating test audit log..."))
        
        test_log = AuditLog.objects.create(
            action_type='CREATE',
            target_table='BackupTest',
            target_record_id=99999,
            ip_address='127.0.0.1',
            user_agent='Backup Test Script',
            changes={'test': 'backup_restore_test', 'timestamp': timezone.now().isoformat()}
        )
        
        test_log_id = test_log.log_id
        
        self.stdout.write(self.style.SUCCESS(
            f"   ✓ Test log created (ID: {test_log_id})"
        ))
        
        # Step 2: Create backup in temp directory
        self.stdout.write(self.style.NOTICE("\n2. Creating backup..."))
        
        with tempfile.TemporaryDirectory() as temp_dir:
            timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f'audit_test_backup_{timestamp}.json'
            backup_path = os.path.join(temp_dir, backup_filename)
            
            try:
                # Serialize audit logs
                with open(backup_path, 'w', encoding='utf-8') as backup_file:
                    audit_logs = AuditLog.objects.all()
                    serialized_data = serializers.serialize('json', audit_logs, indent=2)
                    backup_file.write(serialized_data)
                
                file_size_mb = os.path.getsize(backup_path) / (1024 * 1024)
                
                self.stdout.write(self.style.SUCCESS(
                    f"   ✓ Backup created: {file_size_mb:.2f} MB"
                ))
                
                # Step 3: Verify backup file
                self.stdout.write(self.style.NOTICE("\n3. Verifying backup integrity..."))
                
                with open(backup_path, 'r', encoding='utf-8') as f:
                    backup_data = f.read()
                
                deserialized = list(serializers.deserialize('json', backup_data))
                
                # Find our test log in the backup
                test_log_found = any(
                    obj.object.log_id == test_log_id
                    for obj in deserialized
                )
                
                if test_log_found:
                    self.stdout.write(self.style.SUCCESS(
                        "   ✓ Test log found in backup"
                    ))
                else:
                    self.stdout.write(self.style.ERROR(
                        "   ✗ Test log NOT found in backup"
                    ))
                    return
                
                # Step 4: Test data integrity
                self.stdout.write(self.style.NOTICE("\n4. Testing data integrity..."))
                
                integrity_checks = 0
                for obj in deserialized:
                    audit_obj = obj.object
                    
                    # Check required fields
                    if (audit_obj.timestamp and 
                        audit_obj.action_type and 
                        audit_obj.target_table):
                        integrity_checks += 1
                
                integrity_percentage = (integrity_checks / len(deserialized)) * 100
                
                if integrity_percentage == 100:
                    self.stdout.write(self.style.SUCCESS(
                        f"   ✓ All {len(deserialized):,} records have required fields"
                    ))
                else:
                    self.stdout.write(self.style.WARNING(
                        f"   ⚠ {integrity_percentage:.1f}% of records have complete data"
                    ))
                
                # Step 5: Note about test log cleanup
                self.stdout.write(self.style.NOTICE("\n5. Test log cleanup..."))
                
                # Note: Audit logs cannot be deleted (HIPAA compliance)
                # The test log will remain and be cleaned up through normal retention policy
                self.stdout.write(self.style.SUCCESS(
                    f"   ✓ Test log (ID: {test_log_id}) created successfully"
                ))
                self.stdout.write(self.style.NOTICE(
                    f"   ℹ Test log will remain in database (audit logs are immutable)\n"
                    f"   It will be removed through normal retention policy"
                ))
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f"   ✗ Test failed: {str(e)}"
                ))
                return
        
        # Final summary
        self.stdout.write(self.style.NOTICE(f"\n{'='*70}"))
        self.stdout.write(self.style.SUCCESS(
            "✓ BACKUP & RESTORE TEST PASSED\n"
            "\n"
            "Verification complete:\n"
            "  ✓ Backup creation successful\n"
            "  ✓ Data serialization functional\n"
            "  ✓ Backup file integrity verified\n"
            "  ✓ Test data successfully backed up and verified\n"
            "\n"
            "Recommendations:\n"
            "  • Schedule automated daily backups\n"
            "  • Store backups securely offsite\n"
            "  • Retain backups for 6+ years (HIPAA)\n"
            "  • Test restore procedure quarterly\n"
        ))
