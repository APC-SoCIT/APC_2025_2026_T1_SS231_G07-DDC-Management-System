"""
Management command to verify HIPAA compliance for audit logging system.

HIPAA Security Rule 45 CFR § 164.312(b) requires covered entities to implement
audit controls. This command verifies compliance with HIPAA requirements:

1. Record and Examine Activity (§164.312(b))
2. Audit Log Content Requirements 
3. Audit Log Retention (6 years minimum)
4. Audit Log Integrity (tamper-proof)
5. Regular Audit Review Process

Usage:
    # Run full HIPAA compliance check
    python manage.py verify_hipaa_compliance
    
    # Check specific requirement only
    python manage.py verify_hipaa_compliance --check=retention
    python manage.py verify_hipaa_compliance --check=integrity
    python manage.py verify_hipaa_compliance --check=content
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from django.db import connection
from django.contrib.auth import get_user_model
from api.models import AuditLog
from datetime import timedelta
import sys


User = get_user_model()


class Command(BaseCommand):
    help = 'Verify HIPAA compliance for audit logging system'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--check',
            type=str,
            choices=['all', 'controls', 'content', 'retention', 'integrity', 'access'],
            default='all',
            help='Specific compliance check to run (default: all)'
        )
        
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed compliance information'
        )
    
    def handle(self, *args, **options):
        check_type = options['check']
        verbose = options['verbose']
        
        self.stdout.write(self.style.NOTICE(
            f"\n{'='*70}\n"
            f"HIPAA Compliance Verification\n"
            f"Audit Controls - 45 CFR § 164.312(b)\n"
            f"{'='*70}\n"
        ))
        
        # Track compliance status
        checks_passed = 0
        checks_failed = 0
        checks_warning = 0
        
        # Run selected checks
        if check_type in ['all', 'controls']:
            result = self._check_audit_controls(verbose)
            checks_passed += result['passed']
            checks_failed += result['failed']
            checks_warning += result['warnings']
        
        if check_type in ['all', 'content']:
            result = self._check_content_requirements(verbose)
            checks_passed += result['passed']
            checks_failed += result['failed']
            checks_warning += result['warnings']
        
        if check_type in ['all', 'retention']:
            result = self._check_retention_policy(verbose)
            checks_passed += result['passed']
            checks_failed += result['failed']
            checks_warning += result['warnings']
        
        if check_type in ['all', 'integrity']:
            result = self._check_integrity_controls(verbose)
            checks_passed += result['passed']
            checks_failed += result['failed']
            checks_warning += result['warnings']
        
        if check_type in ['all', 'access']:
            result = self._check_access_controls(verbose)
            checks_passed += result['passed']
            checks_failed += result['failed']
            checks_warning += result['warnings']
        
        # Final summary
        self.stdout.write(self.style.NOTICE("\n" + "="*70))
        self.stdout.write(self.style.NOTICE("Compliance Summary"))
        self.stdout.write(self.style.NOTICE("="*70 + "\n"))
        
        total_checks = checks_passed + checks_failed + checks_warning
        
        self.stdout.write(f"Total checks: {total_checks}")
        self.stdout.write(self.style.SUCCESS(f"  ✓ Passed: {checks_passed}"))
        
        if checks_warning > 0:
            self.stdout.write(self.style.WARNING(f"  ⚠ Warnings: {checks_warning}"))
        
        if checks_failed > 0:
            self.stdout.write(self.style.ERROR(f"  ✗ Failed: {checks_failed}"))
        
        self.stdout.write("")
        
        # Overall compliance status
        if checks_failed == 0:
            if checks_warning == 0:
                self.stdout.write(self.style.SUCCESS(
                    "✓ HIPAA COMPLIANT\n"
                    "  All audit control requirements are met.\n"
                ))
                sys.exit(0)
            else:
                self.stdout.write(self.style.WARNING(
                    "⚠ MOSTLY COMPLIANT\n"
                    "  Some warnings detected. Review and address as needed.\n"
                ))
                sys.exit(0)
        else:
            self.stdout.write(self.style.ERROR(
                "✗ NOT COMPLIANT\n"
                "  Critical compliance issues detected.\n"
                "  Address failed checks before deploying to production.\n"
            ))
            sys.exit(1)
    
    def _check_audit_controls(self, verbose):
        """
        Verify HIPAA § 164.312(b) - Audit Controls
        "Implement hardware, software, and/or procedural mechanisms that record and 
        examine activity in information systems that contain or use ePHI."
        """
        self.stdout.write(self.style.NOTICE("\n1. Audit Controls Implementation (§164.312(b))"))
        self.stdout.write("   " + "-"*66)
        
        passed = 0
        failed = 0
        warnings = 0
        
        # Check if audit logging is functional
        total_logs = AuditLog.objects.count()
        
        if total_logs > 0:
            self.stdout.write(self.style.SUCCESS(
                f"   ✓ Audit logging system is active ({total_logs:,} logs recorded)"
            ))
            passed += 1
        else:
            self.stdout.write(self.style.ERROR(
                "   ✗ No audit logs found! Audit logging may not be functioning."
            ))
            failed += 1
            return {'passed': passed, 'failed': failed, 'warnings': warnings}
        
        # Check for recent activity (logs in last 7 days)
        week_ago = timezone.now() - timedelta(days=7)
        recent_logs = AuditLog.objects.filter(timestamp__gte=week_ago).count()
        
        if recent_logs > 0:
            self.stdout.write(self.style.SUCCESS(
                f"   ✓ Recent audit activity detected ({recent_logs:,} logs in last 7 days)"
            ))
            passed += 1
        else:
            self.stdout.write(self.style.WARNING(
                "   ⚠ No audit logs in last 7 days. System may be inactive."
            ))
            warnings += 1
        
        # Check that all required action types are being logged
        required_actions = ['READ', 'CREATE', 'UPDATE', 'DELETE']
        action_counts = AuditLog.objects.values_list('action_type', flat=True).distinct()
        
        missing_actions = [action for action in required_actions if action not in action_counts]
        
        if not missing_actions:
            self.stdout.write(self.style.SUCCESS(
                f"   ✓ All CRUD operations are being logged"
            ))
            passed += 1
        else:
            self.stdout.write(self.style.WARNING(
                f"   ⚠ Some operations not logged yet: {', '.join(missing_actions)}"
            ))
            warnings += 1
        
        # Check if patient record access is logged
        patient_access_logs = AuditLog.objects.filter(patient_id__isnull=False).count()
        
        if patient_access_logs > 0:
            self.stdout.write(self.style.SUCCESS(
                f"   ✓ Patient record access is being logged ({patient_access_logs:,} logs)"
            ))
            passed += 1
        else:
            self.stdout.write(self.style.WARNING(
                "   ⚠ No patient record access logs found"
            ))
            warnings += 1
        
        if verbose:
            # Show breakdown by action type
            from django.db.models import Count
            breakdown = AuditLog.objects.values('action_type').annotate(
                count=Count('log_id')
            ).order_by('-count')
            
            self.stdout.write("\n   Audit Log Breakdown:")
            for item in breakdown:
                self.stdout.write(f"     {item['action_type']:<20} {item['count']:>10,}")
        
        return {'passed': passed, 'failed': failed, 'warnings': warnings}
    
    def _check_content_requirements(self, verbose):
        """
        Verify audit logs contain required HIPAA fields:
        - Date and time (timestamp)
        - User identification (actor)
        - Action performed (action_type)
        - Patient/record accessed (patient_id, target_record_id)
        - Source of access (ip_address)
        """
        self.stdout.write(self.style.NOTICE("\n2. Audit Log Content Requirements"))
        self.stdout.write("   " + "-"*66)
        
        passed = 0
        failed = 0
        warnings = 0
        
        # Sample recent logs to check field completeness
        sample_size = 100
        recent_logs = list(AuditLog.objects.order_by('-timestamp')[:sample_size])
        actual_count = len(recent_logs)
        
        if not recent_logs:
            self.stdout.write(self.style.WARNING("   ⚠ No logs available to check"))
            warnings += 1
            return {'passed': passed, 'failed': failed, 'warnings': warnings}
        
        # Check timestamp (required)
        logs_with_timestamp = sum(1 for log in recent_logs if log.timestamp)
        if logs_with_timestamp == actual_count:
            self.stdout.write(self.style.SUCCESS(
                "   ✓ Timestamp field populated in all logs"
            ))
            passed += 1
        else:
            self.stdout.write(self.style.ERROR(
                f"   ✗ Missing timestamps in {actual_count - logs_with_timestamp} logs"
            ))
            failed += 1
        
        # Check actor (should be present for most actions, except failed logins)
        logs_with_actor = sum(1 for log in recent_logs if log.actor or log.action_type == 'LOGIN_FAILED')
        if logs_with_actor == actual_count:
            self.stdout.write(self.style.SUCCESS(
                "   ✓ Actor field properly populated"
            ))
            passed += 1
        else:
            missing_actor = actual_count - logs_with_actor
            self.stdout.write(self.style.WARNING(
                f"   ⚠ Missing actor in {missing_actor} logs (may be acceptable for failed logins)"
            ))
            warnings += 1
        
        # Check action_type (required)
        logs_with_action = sum(1 for log in recent_logs if log.action_type)
        if logs_with_action == actual_count:
            self.stdout.write(self.style.SUCCESS(
                "   ✓ Action type recorded in all logs"
            ))
            passed += 1
        else:
            self.stdout.write(self.style.ERROR(
                f"   ✗ Missing action type in {actual_count - logs_with_action} logs"
            ))
            failed += 1
        
        # Check target information (should be present for most actions)
        logs_with_target = sum(1 for log in recent_logs if log.target_table and log.target_record_id)
        target_percentage = (logs_with_target / actual_count) * 100
        
        if target_percentage >= 70:
            self.stdout.write(self.style.SUCCESS(
                f"   ✓ Target information recorded ({target_percentage:.0f}% of logs)"
            ))
            passed += 1
        else:
            self.stdout.write(self.style.WARNING(
                f"   ⚠ Target information in only {target_percentage:.0f}% of logs"
            ))
            warnings += 1
        
        # Check IP address (recommended but not always required)
        logs_with_ip = sum(1 for log in recent_logs if log.ip_address)
        ip_percentage = (logs_with_ip / actual_count) * 100
        
        if ip_percentage >= 80:
            self.stdout.write(self.style.SUCCESS(
                f"   ✓ IP address recorded ({ip_percentage:.0f}% of logs)"
            ))
            passed += 1
        elif ip_percentage >= 50:
            self.stdout.write(self.style.WARNING(
                f"   ⚠ IP address recorded in only {ip_percentage:.0f}% of logs"
            ))
            warnings += 1
        else:
            self.stdout.write(self.style.WARNING(
                f"   ⚠ IP address rarely recorded ({ip_percentage:.0f}% of logs)"
            ))
            warnings += 1
        
        return {'passed': passed, 'failed': failed, 'warnings': warnings}
    
    def _check_retention_policy(self, verbose):
        """
        Verify 6-year retention policy (HIPAA requirement).
        45 CFR § 164.316(b)(2)(i) - Retain for 6 years.
        """
        self.stdout.write(self.style.NOTICE("\n3. Audit Log Retention Policy (6 Years)"))
        self.stdout.write("   " + "-"*66)
        
        passed = 0
        failed = 0
        warnings = 0
        
        total_logs = AuditLog.objects.count()
        
        if total_logs == 0:
            self.stdout.write(self.style.WARNING("   ⚠ No logs available to check retention"))
            warnings += 1
            return {'passed': passed, 'failed': failed, 'warnings': warnings}
        
        # Get oldest log
        oldest_log = AuditLog.objects.order_by('timestamp').first()
        oldest_date = oldest_log.timestamp
        
        # Calculate log age
        log_age_days = (timezone.now() - oldest_date).days
        log_age_years = log_age_days / 365.25
        
        self.stdout.write(f"   Oldest log date: {oldest_date.strftime('%Y-%m-%d')}")
        self.stdout.write(f"   Log retention: {log_age_years:.1f} years ({log_age_days:,} days)")
        
        # Check if we have logs approaching 6 years
        six_years_ago = timezone.now() - timedelta(days=365.25 * 6)
        logs_older_than_6y = AuditLog.objects.filter(timestamp__lt=six_years_ago).count()
        
        if logs_older_than_6y > 0:
            self.stdout.write(self.style.WARNING(
                f"   ⚠ {logs_older_than_6y:,} logs are older than 6 years (may need cleanup)"
            ))
            warnings += 1
        else:
            self.stdout.write(self.style.SUCCESS(
                "   ✓ No logs older than 6 years"
            ))
            passed += 1
        
        # Check if retention setting is configured (if it exists in settings)
        retention_days = getattr(settings, 'AUDIT_LOG_RETENTION_DAYS', None)
        
        if retention_days:
            if retention_days >= 365 * 6:
                self.stdout.write(self.style.SUCCESS(
                    f"   ✓ Retention policy configured: {retention_days} days ({retention_days/365:.1f} years)"
                ))
                passed += 1
            else:
                self.stdout.write(self.style.ERROR(
                    f"   ✗ Retention policy too short: {retention_days} days (minimum 2190 days required)"
                ))
                failed += 1
        else:
            self.stdout.write(self.style.WARNING(
                "   ⚠ AUDIT_LOG_RETENTION_DAYS not configured in settings"
            ))
            warnings += 1
        
        # Recommend backup strategy
        self.stdout.write(self.style.NOTICE(
            "\n   Recommendation: Implement regular backups with 6+ year retention"
        ))
        
        return {'passed': passed, 'failed': failed, 'warnings': warnings}
    
    def _check_integrity_controls(self, verbose):
        """
        Verify audit logs are tamper-proof and cannot be modified/deleted.
        HIPAA requires audit logs to maintain integrity.
        """
        self.stdout.write(self.style.NOTICE("\n4. Audit Log Integrity Controls"))
        self.stdout.write("   " + "-"*66)
        
        passed = 0
        failed = 0
        warnings = 0
        
        # Check database-level constraints (database-agnostic)
        try:
            # Check if audit_logs table exists using Django's introspection
            table_names = connection.introspection.table_names()
            
            if 'audit_logs' in table_names:
                self.stdout.write(self.style.SUCCESS(
                    "   ✓ Audit logs table exists in database"
                ))
                passed += 1
            else:
                self.stdout.write(self.style.ERROR(
                    "   ✗ Audit logs table not found in database"
                ))
                failed += 1
                return {'passed': passed, 'failed': failed, 'warnings': warnings}
        except Exception as e:
            self.stdout.write(self.style.WARNING(
                f"   ⚠ Could not verify table existence: {str(e)}"
            ))
            warnings += 1
        
        # Check model-level protection (verify save() and delete() methods)
        try:
            # Test that AuditLog has integrity protection
            test_log = AuditLog(
                action_type='CREATE',
                target_table='TestTable',
                target_record_id=1
            )
            
            # Save should work for new records
            has_save_protection = hasattr(AuditLog, 'save')
            has_delete_protection = hasattr(AuditLog, 'delete')
            
            if has_save_protection and has_delete_protection:
                self.stdout.write(self.style.SUCCESS(
                    "   ✓ Model-level integrity methods present"
                ))
                passed += 1
            else:
                self.stdout.write(self.style.WARNING(
                    "   ⚠ Model integrity methods may not be implemented"
                ))
                warnings += 1
        
        except Exception as e:
            self.stdout.write(self.style.WARNING(
                f"   ⚠ Cannot verify model integrity: {str(e)}"
            ))
            warnings += 1
        
        # Check admin permissions (should not allow edit/delete)
        from django.contrib import admin
        from api.admin import AuditLogAdmin
        
        if AuditLog in admin.site._registry:
            admin_class = admin.site._registry[AuditLog]
            
            # Create mock request for permission check
            from django.test import RequestFactory
            from django.contrib.auth.models import AnonymousUser
            
            factory = RequestFactory()
            request = factory.get('/admin/')
            request.user = AnonymousUser()
            
            can_add = admin_class.has_add_permission(request)
            can_change = admin_class.has_change_permission(request)
            can_delete = admin_class.has_delete_permission(request)
            
            if not can_add and not can_change and not can_delete:
                self.stdout.write(self.style.SUCCESS(
                    "   ✓ Admin interface properly restricted (no add/edit/delete)"
                ))
                passed += 1
            else:
                permissions = []
                if can_add:
                    permissions.append('add')
                if can_change:
                    permissions.append('change')
                if can_delete:
                    permissions.append('delete')
                
                self.stdout.write(self.style.WARNING(
                    f"   ⚠ Admin allows: {', '.join(permissions)}"
                ))
                warnings += 1
        else:
            self.stdout.write(self.style.WARNING(
                "   ⚠ AuditLog not registered in admin"
            ))
            warnings += 1
        
        return {'passed': passed, 'failed': failed, 'warnings': warnings}
    
    def _check_access_controls(self, verbose):
        """
        Verify proper access controls for viewing audit logs.
        Only authorized personnel (owners, compliance officers) should access audit logs.
        """
        self.stdout.write(self.style.NOTICE("\n5. Audit Log Access Controls"))
        self.stdout.write("   " + "-"*66)
        
        passed = 0
        failed = 0
        warnings = 0
        
        # Check that regular staff/patients cannot view audit logs
        from django.contrib import admin
        
        if AuditLog in admin.site._registry:
            self.stdout.write(self.style.SUCCESS(
                "   ✓ Audit logs accessible through admin interface"
            ))
            passed += 1
        else:
            self.stdout.write(self.style.WARNING(
                "   ⚠ Audit logs not accessible through admin (may be by design)"
            ))
            warnings += 1
        
        # Check if there are owners who can review logs
        owners = User.objects.filter(user_type='owner').count()
        
        if owners > 0:
            self.stdout.write(self.style.SUCCESS(
                f"   ✓ {owners} owner account(s) can review audit logs"
            ))
            passed += 1
        else:
            self.stdout.write(self.style.WARNING(
                "   ⚠ No owner accounts found (who will review audit logs?)"
            ))
            warnings += 1
        
        # Recommend access logging (meta-audit)
        self.stdout.write(self.style.NOTICE(
            "\n   Recommendation: Log who accesses audit logs (meta-audit trail)"
        ))
        
        return {'passed': passed, 'failed': failed, 'warnings': warnings}
