# Security Best Practices for Audit Logging
## HIPAA Compliance & Data Protection Guide

**Version:** 1.0  
**Last Updated:** February 2026  
**Status:** Reference Document

---

## 🎯 Document Purpose

This document provides essential security guidelines for implementing and maintaining a HIPAA-compliant audit logging system. Follow these practices to ensure:
- **Patient Privacy** - No sensitive medical/personal data in audit logs
- **Audit Integrity** - Logs cannot be tampered with or deleted
- **Security** - Credentials and secrets never logged
- **Compliance** - Meets HIPAA audit control requirements

---

## 🚨 CRITICAL: What to NEVER Log

### 1. Authentication Credentials

**❌ NEVER LOG:**
```python
# BAD - Logging passwords
create_audit_log(
    actor=user,
    action_type='LOGIN_SUCCESS',
    changes={'username': 'john', 'password': 'secret123'}  # ❌ NEVER DO THIS
)

# BAD - Logging auth tokens
create_audit_log(
    changes={'token': user.auth_token.key}  # ❌ NEVER DO THIS
)
```

**✅ CORRECT APPROACH:**
```python
# GOOD - Sanitize before logging
from api.audit_service import sanitize_data

login_data = {'username': 'john', 'password': 'secret123'}
create_audit_log(
    actor=user,
    action_type='LOGIN_SUCCESS',
    changes=sanitize_data(login_data)  # Password removed automatically
)
```

**Fields to ALWAYS Sanitize:**
- `password`, `passwd`, `pwd`
- `auth_token`, `token`, `access_token`, `refresh_token`
- `api_key`, `secret_key`, `private_key`
- `ssn`, `social_security_number`
- `credit_card`, `card_number`, `cvv`

### 2. Sensitive Medical Information

**❌ NEVER LOG FULL MEDICAL DETAILS:**

HIPAA considers these "Protected Health Information" (PHI):
- **Medical diagnoses** - Don't log full text, only record IDs
- **Treatment details** - Reference record IDs, not descriptions
- **Prescription information** - Drug names, dosages are PHI
- **Lab results** - Test results are PHI
- **Medical images** - X-rays, scans

**❌ BAD:**
```python
create_audit_log(
    action_type='UPDATE',
    changes={
        'before': {'diagnosis': 'HIV positive', 'medications': ['ART therapy']},
        'after': {'diagnosis': 'HIV positive, Stage 2', 'medications': ['ART + supplement']}
    }
)
```

**✅ GOOD:**
```python
create_audit_log(
    action_type='UPDATE',
    target_table='DentalRecord',
    target_record_id=123,  # Reference only
    changes={
        'fields_modified': ['diagnosis', 'medications'],  # Field names only
        'record_updated_at': '2026-02-10T14:30:00Z'
    }
)
```

**RULE:** Log **WHAT** was accessed/changed, not **THE CONTENT**

### 3. Personal Identifiable Information (PII)

**Minimal PII Logging:**

Only log what's necessary for identification:

**❌ BAD:**
```python
changes={
    'patient_name': 'John Smith',
    'email': 'john.smith@email.com',
    'phone': '555-1234',
    'address': '123 Main St, City, State',
    'date_of_birth': '1980-05-15',
    'ssn': '123-45-6789'  # ❌❌❌ NEVER
}
```

**✅ GOOD:**
```python
patient_id=123,  # Reference ID only
target_table='User',
target_record_id=123
# Patient details retrieved from User table when needed, not stored in audit log
```

---

## 🔒 Audit Log Protection

### 1. Database Security

**Separate Audit Database (Recommended):**

```python
# In settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'clinic_db',
        # ... production database
    },
    'audit_db': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'clinic_audit_db',  # Separate database
        'USER': 'audit_user',  # Restricted user
        'OPTIONS': {
            'options': '-c default_transaction_read_only=on'  # Read-only!
        }
    }
}

# Audit logs use separate DB
class AuditLog(models.Model):
    class Meta:
        db_table = 'audit_logs'
        # This model uses the audit_db
```

**Benefits:**
- ✅ Audit logs isolated from application data
- ✅ Can set different backup schedules (longer retention)
- ✅ Separate database user with restricted permissions
- ✅ Harder for attackers to tamper with logs

**Database Permissions:**

```sql
-- Create audit database user with minimal permissions
CREATE USER audit_writer WITH PASSWORD 'strong_password';

-- Grant INSERT only (no UPDATE or DELETE)
GRANT CONNECT ON DATABASE clinic_audit_db TO audit_writer;
GRANT INSERT ON TABLE audit_logs TO audit_writer;
GRANT USAGE, SELECT ON SEQUENCE audit_logs_log_id_seq TO audit_writer;

-- Audit reader for compliance reviews
CREATE USER audit_reader WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE clinic_audit_db TO audit_reader;
GRANT SELECT ON TABLE audit_logs TO audit_reader;

-- No one should have DELETE permission on audit logs
REVOKE DELETE ON TABLE audit_logs FROM PUBLIC;
```

### 2. Application-Level Protection

**Read-Only Audit Logs in Django:**

```python
# In api/models.py
class AuditLog(models.Model):
    # ... fields ...
    
    def save(self, *args, **kwargs):
        """Override save to prevent updates (allow create only)."""
        if self.pk is not None:
            # Record already exists in database
            raise ValueError("Audit logs cannot be modified after creation")
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """Prevent deletion of audit logs."""
        raise ValueError("Audit logs cannot be deleted")
    
    class Meta:
        permissions = [
            ("view_audit_logs", "Can view audit logs"),
        ]
        default_permissions = ('add',)  # Only 'add' permission, no change/delete
```

**Admin Interface Protection:**

```python
# In api/admin.py
@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        """Manually adding audit logs is prohibited."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Audit logs cannot be edited."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Audit logs cannot be deleted."""
        return False
    
    def has_view_permission(self, request, obj=None):
        """Only owners can view audit logs."""
        return request.user.is_superuser or request.user.user_type == 'owner'
```

### 3. Access Control

**Who Can View Audit Logs:**

```python
# HIPAA requires audit log access to be restricted

AUDIT_LOG_VIEWERS = {
    'owner': True,       # ✅ Clinic owners (compliance officers)
    'admin': True,       # ✅ System administrators
    'staff': False,      # ❌ Regular staff cannot view
    'patient': False,    # ❌ Patients cannot view audit logs
}

# Exception: Patients can request THEIR OWN access history
def get_patient_audit_history(patient_user):
    """Patients can see who accessed their records."""
    return AuditLog.objects.filter(
        patient_id=patient_user.id,
        action_type__in=['READ', 'UPDATE', 'DELETE', 'EXPORT']
    ).values(
        'timestamp', 'actor__first_name', 'actor__last_name', 
        'action_type', 'target_table'
    )  # Return summary, not full details
```

**API Endpoint Protection:**

```python
# In api/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_access_history(request):
    """
    Allow patients to see who accessed their records.
    HIPAA Right of Access - patients can request access logs.
    """
    if request.user.user_type != 'patient':
        return Response({'error': 'This endpoint is for patients only'}, status=403)
    
    # Get access logs for this patient
    logs = AuditLog.objects.filter(
        patient_id=request.user.id,
        action_type__in=['READ', 'UPDATE', 'EXPORT']
    ).select_related('actor').order_by('-timestamp')[:100]
    
    # Return sanitized summary
    data = [{
        'date': log.timestamp.isoformat(),
        'accessed_by': f"{log.actor.first_name} {log.actor.last_name}" if log.actor else 'System',
        'action': log.action_type,
        'resource': log.target_table
    } for log in logs]
    
    return Response(data)
```

---

## 🛡️ Security Implementation Checklist

### Phase 1: Foundation Security

- [ ] **Sanitize all input data before audit logging**
  - Use `sanitize_data()` function consistently
  - Test with password/token fields
  
- [ ] **Never log raw request bodies**
  - Exclude password fields
  - Exclude file uploads (log metadata only)
  
- [ ] **Use environment variables for sensitive config**
  ```python
  # ❌ BAD
  AUDIT_DB_PASSWORD = 'hardcoded_password'
  
  # ✅ GOOD
  AUDIT_DB_PASSWORD = os.environ.get('AUDIT_DB_PASSWORD')
  ```

- [ ] **Enable HTTPS for all API endpoints**
  - Audit logs contain IP addresses and user agents
  - Ensure transmission is encrypted
  
- [ ] **Set up audit database with restricted permissions**
  - Separate database user for audit writes
  - No DELETE permissions for anyone

### Phase 2: Signal Security

- [ ] **Verify signals don't log sensitive model fields**
  ```python
  SENSITIVE_FIELDS = ['password', 'ssn', 'credit_card']
  
  def get_field_changes(before, after):
      changes = {}
      for field in before.keys():
          if field.lower() in SENSITIVE_FIELDS:
              changes[field] = '***REDACTED***'
          elif before[field] != after[field]:
              changes[field] = {'before': before[field], 'after': after[field]}
      return changes
  ```

- [ ] **Protect audit logs in signal handlers**
  - Wrap in try/except to prevent crashes
  - Log failures to separate error log
  
- [ ] **Test signal handlers with sensitive data**
  - Create test with password change
  - Verify password not in audit log

### Phase 3: Read Operation Security

- [ ] **Decorator doesn't expose sensitive data**
  - Only log patient ID, not full patient object
  - Don't log query results
  
- [ ] **Search logging excludes query content**
  ```python
  # ❌ BAD
  changes={'search_query': 'patient with HIV'}
  
  # ✅ GOOD
  changes={'search_performed': True, 'result_count': 5}
  ```

- [ ] **Export logging tracks what, not content**
  - Log "exported dental records for patient 123"
  - Don't log the actual exported data

### Phase 4: Middleware & Admin Security

- [ ] **Middleware rate limiting to prevent DoS**
  - Limit audit log creation per user/IP
  - Monitor for suspicious activity
  
- [ ] **Admin interface has proper authentication**
  - Require strong passwords
  - Enable 2FA for owners
  
- [ ] **Audit log export is encrypted**
  - CSV exports should be password-protected
  - Use SFTP/SCP for transmission, not email
  
- [ ] **Management commands require authorization**
  ```python
  # In cleanup_audit_logs command
  def handle(self, *args, **options):
      # Require explicit confirmation
      if not options['force']:
          confirm = input("Type 'DELETE' to confirm: ")
          if confirm != 'DELETE':
              self.stdout.write("Cancelled.")
              return
  ```

### Phase 5: Production Security

- [ ] **Audit logs backed up separately**
  - Daily backups to secure location
  - 6+ year retention as required by HIPAA
  
- [ ] **Monitor audit log access**
  - Alert when audit logs are accessed
  - Track who views audit logs (meta-audit)
  
- [ ] **Scheduled security reviews**
  - Monthly: Review failed login attempts
  - Quarterly: Full audit log compliance review
  - Annually: External security audit

- [ ] **Incident response plan**
  - What to do if audit logs are tampered with
  - How to preserve logs during security incident
  
- [ ] **Staff training**
  - Train owners on how to review audit logs
  - Document what patterns indicate security issues

---

## 💉 HIPAA Compliance Verification

### Required Audit Controls (45 CFR § 164.312(b))

HIPAA requires covered entities to implement audit controls. Verify your implementation meets these requirements:

#### ✅ 1. Record and Examine Activity

**Requirement:**  
"Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use electronic protected health information."

**Your Implementation:**
- ✅ Audit logs record ALL access to patient records (READ, UPDATE, DELETE)
- ✅ Logs include: timestamp, user, action, patient record
- ✅ Admin interface allows examination of logs
- ✅ Export functionality for compliance reviews

**Verification Test:**
```python
# Test that patient record access is logged
def test_hipaa_audit_control_compliance():
    # Access a patient record
    response = client.get(f'/api/dental-records/{patient_record_id}/')
    
    # Verify audit log created
    log = AuditLog.objects.filter(
        action_type='READ',
        target_record_id=patient_record_id,
        patient_id=patient.id
    ).latest('timestamp')
    
    assert log is not None
    assert log.actor == staff_user
    assert log.timestamp is not None
```

#### ✅ 2. Audit Log Content Requirements

**HIPAA Requires Logging:**
- ✅ **Date and time** - `timestamp` field (indexed)
- ✅ **User identification** - `actor` field (user who performed action)
- ✅ **Action performed** - `action_type` field (CREATE/READ/UPDATE/DELETE/etc.)
- ✅ **Patient/record accessed** - `patient_id` and `target_record_id` fields
- ✅ **Source of access** - `ip_address` field

**Optional but Recommended:**
- ✅ **User agent** - Detect unauthorized access from unusual devices
- ✅ **Before/after values** - Track data modifications
- ✅ **Reason for access** - Document legitimate access (future enhancement)

#### ✅ 3. Audit Log Retention

**Requirement:**  
HIPAA requires 6 years of audit log retention.

**Your Implementation:**
```python
# In settings.py
AUDIT_LOG_RETENTION_DAYS = 365 * 6  # 6 years

# Automated cleanup (management command)
python manage.py cleanup_audit_logs --days=2190  # Only delete logs > 6 years old
```

**Backup Strategy:**
```bash
# Daily backup of audit database
pg_dump clinic_audit_db > /backups/audit_$(date +%Y%m%d).sql

# Weekly offsite backup
rsync -avz /backups/audit_*.sql remote_server:/secure/backups/

# Verify backups monthly
python manage.py test_audit_backup_restore
```

#### ✅ 4. Audit Log Integrity

**Requirement:**  
Audit logs must be tamper-proof and protected from unauthorized modification.

**Your Implementation:**
- ✅ **Database-level:** No UPDATE or DELETE permissions
- ✅ **Application-level:** `save()` and `delete()` methods raise exceptions
- ✅ **Admin-level:** No edit/delete permissions in Django admin
- ✅ **Monitoring:** Alert on any failed modification attempts

**Integrity Verification:**
```python
# Optional: Add cryptographic hash for each log entry
import hashlib
import json

class AuditLog(models.Model):
    # ... existing fields ...
    integrity_hash = models.CharField(max_length=64)
    
    def save(self, *args, **kwargs):
        if not self.integrity_hash:
            # Generate hash of log data
            data = f"{self.timestamp}{self.actor_id}{self.action_type}{self.target_table}{self.target_record_id}"
            self.integrity_hash = hashlib.sha256(data.encode()).hexdigest()
        super().save(*args, **kwargs)
    
    def verify_integrity(self):
        """Verify log hasn't been tampered with."""
        data = f"{self.timestamp}{self.actor_id}{self.action_type}{self.target_table}{self.target_record_id}"
        expected_hash = hashlib.sha256(data.encode()).hexdigest()
        return self.integrity_hash == expected_hash
```

#### ✅ 5. Regular Audit Review

**Requirement:**  
Covered entities must regularly review audit logs.

**Recommended Schedule:**
- **Daily:** Automated review for suspicious activity (script)
- **Weekly:** Manual review of flagged items (owner)
- **Monthly:** Comprehensive access review (compliance officer)
- **Quarterly:** External audit (if required)

**Automated Monitoring Script:**
```python
# In api/management/commands/review_audit_security.py
from django.core.management.base import BaseCommand
from api.models import AuditLog
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Review audit logs for suspicious activity'
    
    def handle(self, *args, **options):
        week_ago = timezone.now() - timedelta(days=7)
        
        # Check for excessive failed logins
        failed_logins = AuditLog.objects.filter(
            action_type='LOGIN_FAILED',
            timestamp__gte=week_ago
        ).count()
        
        if failed_logins > 50:
            self.stdout.write(self.style.ERROR(
                f"⚠️  ALERT: {failed_logins} failed login attempts in past week"
            ))
        
        # Check for after-hours access
        after_hours = AuditLog.objects.filter(
            timestamp__gte=week_ago,
            action_type='READ'
        ).exclude(
            timestamp__hour__gte=8,
            timestamp__hour__lt=18
        ).count()
        
        if after_hours > 100:
            self.stdout.write(self.style.WARNING(
                f"⚠️  {after_hours} record accesses outside business hours"
            ))
        
        # Check for unusual export activity
        exports = AuditLog.objects.filter(
            action_type='EXPORT',
            timestamp__gte=week_ago
        ).count()
        
        if exports > 20:
            self.stdout.write(self.style.WARNING(
                f"⚠️  {exports} data exports in past week (review legitimacy)"
            ))
```

---

## 🔍 Common Security Anti-Patterns

### ❌ Anti-Pattern 1: Logging Full Request Bodies

**Problem:**
```python
# BAD - Logs all form data including passwords
create_audit_log(
    action_type='LOGIN_ATTEMPT',
    changes=request.POST.dict()  # ❌ Contains password!
)
```

**Solution:**
```python
# GOOD - Sanitize first
from api.audit_service import sanitize_data

create_audit_log(
    action_type='LOGIN_ATTEMPT',
    changes=sanitize_data(request.POST.dict())
)
```

### ❌ Anti-Pattern 2: Storing PHI in Changes Field

**Problem:**
```python
# BAD - Stores full patient data
create_audit_log(
    action_type='READ',
    changes={
        'patient': {
            'name': 'John Doe',
            'diagnosis': 'Diabetes',  # ❌ PHI!
            'medications': ['Insulin']  # ❌ PHI!
        }
    }
)
```

**Solution:**
```python
# GOOD - Reference only
create_audit_log(
    action_type='READ',
    target_table='DentalRecord',
    target_record_id=record.id,
    patient_id=record.patient_id,
    changes={'fields_accessed': ['diagnosis', 'medications']}
)
```

### ❌ Anti-Pattern 3: Allowing Audit Log Deletion

**Problem:**
```python
# BAD - Allows deletion in admin
class AuditLogAdmin(admin.ModelAdmin):
    # Default permissions include delete
    pass  # ❌ Staff can delete audit logs!
```

**Solution:**
```python
# GOOD - Disable deletion
class AuditLogAdmin(admin.ModelAdmin):
    def has_delete_permission(self, request, obj=None):
        return False  # ✅ No one can delete
```

### ❌ Anti-Pattern 4: Not Validating Audit Log Integrity

**Problem:**
```python
# No way to detect if audit logs are tampered with
```

**Solution:**
```python
# Add integrity checks
def verify_audit_log_integrity():
    """Verify no audit logs have been modified."""
    for log in AuditLog.objects.all():
        if not log.verify_integrity():
            raise SecurityError(f"Audit log {log.log_id} integrity compromised!")
```

---

## 📋 Pre-Production Security Checklist

Before deploying audit logging to production:

### Code Review
- [ ] All uses of `create_audit_log()` reviewed
- [ ] No sensitive data in `changes` field
- [ ] All password fields sanitized
- [ ] Authentication tokens excluded
- [ ] PHI not stored in audit logs

### Database Security
- [ ] Audit logs in separate database (or separate schema)
- [ ] Database user has INSERT-only permissions
- [ ] No DELETE grants on audit_logs table
- [ ] Database backups configured (6+ year retention)
- [ ] Backup restoration tested

### Application Security
- [ ] AuditLog model prevents updates/deletes
- [ ] Admin interface is read-only for audit logs
- [ ] Only owners can access audit logs
- [ ] Rate limiting enabled (prevent DoS)
- [ ] HTTPS enforced for all admin pages

### HIPAA Compliance
- [ ] All patient record access logged
- [ ] Audit logs include required fields (date, user, action, patient)
- [ ] Logs retained for 6 years
- [ ] Regular review process established
- [ ] Staff trained on audit log access

### Monitoring & Alerts
- [ ] Failed login alerts configured
- [ ] Suspicious activity monitoring enabled
- [ ] Audit log access tracking (meta-audit)
- [ ] Database storage alerts (disk space)
- [ ] Backup failure alerts

### Documentation
- [ ] Security procedures documented
- [ ] Incident response plan created
- [ ] Staff training materials prepared
- [ ] Compliance checklist available for auditors
- [ ] Regular review schedule established

---

## 🚨 Incident Response

### If Audit Logs Are Compromised

1. **Immediately:**
   - Take affected systems offline
   - Preserve current state (snapshot databases)
   - Document timeline of events
   - Notify security team

2. **Investigation:**
   - Review database access logs
   - Check application logs for suspicious activity
   - Identify scope of compromise
   - Determine if patient data was affected

3. **Notification:**
   - **If PHI accessed:** Must notify affected patients within 60 days (HIPAA)
   - **If breach >500 patients:** Notify HHS and local media
   - Document all notifications

4. **Remediation:**
   - Restore audit logs from backup
   - Patch security vulnerabilities
   - Review and strengthen access controls
   - Conduct post-incident review

5. **Prevention:**
   - Implement additional monitoring
   - Review security procedures
   - Retrain staff if necessary
   - Update incident response plan

---

## 📚 References

### HIPAA Regulations
- **45 CFR § 164.312(b)** - Audit Controls
- **45 CFR § 164.308(a)(1)(ii)(D)** - Information System Activity Review
- **45 CFR § 164.316(b)(2)** - Time Limit for Audit Logs (6 years)

### Security Standards
- **NIST SP 800-92** - Guide to Computer Security Log Management
- **NIST SP 800-53 (AU Family)** - Audit and Accountability Controls
- **CIS Controls v8** - Control 8: Audit Log Management

### Django Security
- [Django Security Best Practices](https://docs.djangoproject.com/en/stable/topics/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## ✅ Final Verification

Run this comprehensive security check before production:

```bash
# 1. Run security tests
python manage.py test api.tests.test_audit_security -v 2

# 2. Check for sensitive data in audit logs
python manage.py check_audit_security

# 3. Verify HIPAA compliance
python manage.py verify_hipaa_compliance

# 4. Test backup/restore
python manage.py test_audit_backup

# 5. Run Django security checks
python manage.py check --deploy
```

**Expected Result:** All checks pass ✅

---

**Document Status:** Complete  
**Maintenance:** Review quarterly and update as regulations change  
**Contact:** Security team for questions or incidents

🔒 **Remember:** Security is ongoing, not a one-time implementation!
