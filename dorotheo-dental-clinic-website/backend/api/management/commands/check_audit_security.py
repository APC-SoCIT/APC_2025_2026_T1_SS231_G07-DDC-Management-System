"""
Management command to check audit log security and detect sensitive data.

This command scans audit logs for potential security issues including:
- Passwords, tokens, and authentication credentials
- Social Security Numbers and credit card numbers
- Protected Health Information (PHI) in changes field
- Other sensitive data that should never be logged

Usage:
    # Check all audit logs
    python manage.py check_audit_security
    
    # Check only recent logs (last 30 days)
    python manage.py check_audit_security --days=30
    
    # Show detailed findings
    python manage.py check_audit_security --verbose
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from api.models import AuditLog
from datetime import timedelta
import json
import re


class Command(BaseCommand):
    help = 'Scan audit logs for sensitive data and security issues'
    
    # Sensitive field patterns to detect
    SENSITIVE_PATTERNS = {
        'password': r'(password|passwd|pwd)["\']?\s*[:=]\s*["\']?[\w\S]{3,}',
        'token': r'(token|auth_token|access_token|refresh_token|api_key|secret_key)["\']?\s*[:=]\s*["\']?[\w\-\.]{10,}',
        'ssn': r'\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b',
        'credit_card': r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
        'email_password': r'(email|e-mail).*password',
    }
    
    # Sensitive field names that should never appear in unredacted form
    SENSITIVE_FIELDS = [
        'password', 'passwd', 'pwd', 'password_hash',
        'auth_token', 'token', 'access_token', 'refresh_token',
        'api_key', 'secret_key', 'private_key',
        'ssn', 'social_security_number',
        'credit_card', 'card_number', 'cvv', 'card_cvv',
    ]
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            help='Only check logs from the last N days (default: check all)'
        )
        
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed findings with log IDs and excerpts'
        )
        
        parser.add_argument(
            '--limit',
            type=int,
            default=100,
            help='Maximum number of issues to report per category (default: 100)'
        )
    
    def handle(self, *args, **options):
        days = options['days']
        verbose = options['verbose']
        limit = options['limit']
        
        self.stdout.write(self.style.NOTICE(
            f"\n{'='*70}\n"
            f"Audit Log Security Check\n"
            f"{'='*70}\n"
        ))
        
        # Build query
        query = AuditLog.objects.all()
        
        if days:
            cutoff_date = timezone.now() - timedelta(days=days)
            query = query.filter(timestamp__gte=cutoff_date)
            self.stdout.write(f"Scanning logs from the last {days} days...")
        else:
            self.stdout.write("Scanning all audit logs...")
        
        total_logs = query.count()
        self.stdout.write(f"Total logs to scan: {total_logs:,}\n")
        
        if total_logs == 0:
            self.stdout.write(self.style.SUCCESS("✓ No audit logs to check."))
            return
        
        # Track issues found
        issues = {
            'passwords': [],
            'tokens': [],
            'ssn': [],
            'credit_cards': [],
            'sensitive_fields': [],
            'phi_warnings': [],
        }
        
        # Scan logs in batches
        batch_size = 1000
        checked_count = 0
        
        self.stdout.write("Scanning for security issues...\n")
        
        for log in query.iterator(chunk_size=batch_size):
            checked_count += 1
            
            if checked_count % batch_size == 0:
                self.stdout.write(f"  Progress: {checked_count:,}/{total_logs:,} logs scanned", ending='\r')
            
            # Check changes field for sensitive data
            if log.changes:
                changes_str = json.dumps(log.changes, default=str).lower()
                
                # Check for password patterns
                if re.search(self.SENSITIVE_PATTERNS['password'], changes_str, re.IGNORECASE):
                    issues['passwords'].append({
                        'log_id': log.log_id,
                        'timestamp': log.timestamp,
                        'action_type': log.action_type,
                        'actor': str(log.actor) if log.actor else 'Anonymous'
                    })
                
                # Check for token patterns
                if re.search(self.SENSITIVE_PATTERNS['token'], changes_str, re.IGNORECASE):
                    issues['tokens'].append({
                        'log_id': log.log_id,
                        'timestamp': log.timestamp,
                        'action_type': log.action_type,
                        'actor': str(log.actor) if log.actor else 'Anonymous'
                    })
                
                # Check for SSN patterns
                if re.search(self.SENSITIVE_PATTERNS['ssn'], changes_str):
                    issues['ssn'].append({
                        'log_id': log.log_id,
                        'timestamp': log.timestamp,
                        'action_type': log.action_type,
                        'actor': str(log.actor) if log.actor else 'Anonymous'
                    })
                
                # Check for credit card patterns
                if re.search(self.SENSITIVE_PATTERNS['credit_card'], changes_str):
                    issues['credit_cards'].append({
                        'log_id': log.log_id,
                        'timestamp': log.timestamp,
                        'action_type': log.action_type,
                        'actor': str(log.actor) if log.actor else 'Anonymous'
                    })
                
                # Check for sensitive field names
                for field in self.SENSITIVE_FIELDS:
                    if field in changes_str and f'***redacted***' not in changes_str:
                        # Check if it's actually a sensitive value, not just the field name
                        if f'"{field}"' in changes_str or f"'{field}'" in changes_str:
                            issues['sensitive_fields'].append({
                                'log_id': log.log_id,
                                'timestamp': log.timestamp,
                                'action_type': log.action_type,
                                'field': field,
                                'actor': str(log.actor) if log.actor else 'Anonymous'
                            })
                            break
                
                # Warn about potential PHI in changes field (long text values)
                # PHI like diagnoses, treatment notes should not be in audit logs
                if isinstance(log.changes, dict):
                    for key, value in log.changes.items():
                        if isinstance(value, str) and len(value) > 200:
                            # Long text might be medical notes or diagnoses
                            if any(medical_term in value.lower() for medical_term in 
                                   ['diagnosis', 'treatment', 'medication', 'prescription', 'symptom']):
                                issues['phi_warnings'].append({
                                    'log_id': log.log_id,
                                    'timestamp': log.timestamp,
                                    'action_type': log.action_type,
                                    'field': key,
                                    'length': len(value),
                                    'actor': str(log.actor) if log.actor else 'Anonymous'
                                })
                                break
        
        self.stdout.write(f"\n  Completed: {checked_count:,}/{total_logs:,} logs scanned\n")
        
        # Report findings
        self.stdout.write(self.style.NOTICE("\n" + "="*70))
        self.stdout.write(self.style.NOTICE("Security Scan Results"))
        self.stdout.write(self.style.NOTICE("="*70 + "\n"))
        
        total_issues = sum(len(v) for v in issues.values())
        
        if total_issues == 0:
            self.stdout.write(self.style.SUCCESS(
                "✓ No security issues detected!\n"
                "  All audit logs appear to be properly sanitized.\n"
            ))
            return
        
        # Report each category of issues
        self._report_issues(
            "🚨 CRITICAL: Passwords Detected",
            issues['passwords'],
            "Passwords or password-like patterns were found in audit logs!",
            verbose,
            limit
        )
        
        self._report_issues(
            "🚨 CRITICAL: Authentication Tokens Detected",
            issues['tokens'],
            "Auth tokens or API keys were found in audit logs!",
            verbose,
            limit
        )
        
        self._report_issues(
            "🚨 CRITICAL: Social Security Numbers Detected",
            issues['ssn'],
            "SSN patterns were found in audit logs!",
            verbose,
            limit
        )
        
        self._report_issues(
            "🚨 CRITICAL: Credit Card Numbers Detected",
            issues['credit_cards'],
            "Credit card number patterns were found in audit logs!",
            verbose,
            limit
        )
        
        self._report_issues(
            "⚠️  WARNING: Sensitive Field Names Found",
            issues['sensitive_fields'],
            "Sensitive field names appear in audit logs (may be acceptable if values are redacted).",
            verbose,
            limit
        )
        
        self._report_issues(
            "⚠️  WARNING: Potential PHI in Changes Field",
            issues['phi_warnings'],
            "Long text with medical terminology detected. Audit logs should reference IDs, not contain PHI.",
            verbose,
            limit
        )
        
        # Summary
        self.stdout.write(self.style.NOTICE("\n" + "="*70))
        self.stdout.write(self.style.NOTICE("Summary"))
        self.stdout.write(self.style.NOTICE("="*70 + "\n"))
        
        critical_issues = len(issues['passwords']) + len(issues['tokens']) + len(issues['ssn']) + len(issues['credit_cards'])
        warnings = len(issues['sensitive_fields']) + len(issues['phi_warnings'])
        
        self.stdout.write(f"Total issues found: {total_issues:,}")
        self.stdout.write(f"  Critical issues: {critical_issues:,}")
        self.stdout.write(f"  Warnings: {warnings:,}\n")
        
        if critical_issues > 0:
            self.stdout.write(self.style.ERROR(
                "✗ CRITICAL SECURITY ISSUES DETECTED!\n"
                "  Immediate action required:\n"
                "  1. Review the API code that creates these audit logs\n"
                "  2. Ensure sanitize_data() is called before logging\n"
                "  3. Update code to prevent sensitive data from being logged\n"
                "  4. Consider removing these audit logs manually if confirmed\n"
            ))
        elif warnings > 0:
            self.stdout.write(self.style.WARNING(
                "⚠️  Some warnings detected.\n"
                "  Review findings to ensure no sensitive data is exposed.\n"
            ))
    
    def _report_issues(self, title, issues_list, description, verbose, limit):
        """Report a category of security issues."""
        if not issues_list:
            return
        
        count = len(issues_list)
        
        if count > 0:
            self.stdout.write(self.style.ERROR(f"\n{title}"))
            self.stdout.write(f"  {description}")
            self.stdout.write(f"  Count: {count:,}\n")
            
            if verbose and count > 0:
                self.stdout.write("  Details:")
                for issue in issues_list[:limit]:
                    timestamp = issue['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
                    self.stdout.write(
                        f"    Log ID {issue['log_id']}: {issue['action_type']} "
                        f"by {issue['actor']} at {timestamp}"
                    )
                    if 'field' in issue:
                        self.stdout.write(f"      Field: {issue['field']}")
                
                if count > limit:
                    self.stdout.write(f"    ... and {count - limit} more (use --limit to show more)")
                
                self.stdout.write("")
