# PHI Encryption Implementation Plan
## HIPAA-Compliant Encryption for Protected Health Information

---

## 🎯 Objectives

Implement comprehensive encryption to protect Protected Health Information (PHI) in compliance with HIPAA Security Rule requirements:

1. **Encryption at Rest**: Encrypt sensitive medical data stored in the database
2. **Encryption in Transit**: Ensure all data transmission uses secure protocols
3. **Key Management**: Secure storage and rotation of encryption keys
4. **Access Control**: Implement proper authentication and authorization
5. **Audit Logging**: Track all access to PHI

---

## 📋 HIPAA Requirements Checklist

### Required by HIPAA Security Rule:

- ✅ **164.312(a)(2)(iv)** - Encryption and Decryption (Addressable)
- ✅ **164.312(e)(1)** - Transmission Security
- ✅ **164.312(e)(2)(ii)** - Encryption (Addressable)
- ✅ **164.308(a)(1)(ii)(D)** - Information System Activity Review
- ✅ **164.310(d)(1)** - Device and Media Controls

### PHI Data to Encrypt:

**Critical (Must Encrypt):**
- Medical diagnoses
- Treatment plans and notes
- Medical history
- Prescription information
- Mental health records

**Important (Should Encrypt):**
- Patient contact information (phone, address)
- Appointment notes
- Billing information
- Medical images metadata

**Non-PHI (No Encryption Needed):**
- User email (used for login)
- User names (used for identification)
- Appointment dates/times (for scheduling)
- Service names

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │   HTTPS/TLS 1.3 - All Communication Encrypted         │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ Encrypted Transit
                       │ (TLS 1.3)
┌──────────────────────▼──────────────────────────────────────┐
│                  Backend (Django/Railway)                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Application Layer - Auto Encrypt/Decrypt PHI         │  │
│  │  django-encrypted-model-fields (AES-256-GCM)          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Encryption Key stored in Environment Variables       │  │
│  │  FIELD_ENCRYPTION_KEY (Django Secret Key derivative)  │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ Encrypted Connection
                       │ (SSL/TLS)
┌──────────────────────▼──────────────────────────────────────┐
│              Database (PostgreSQL/Supabase)                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  PHI Fields Stored as Encrypted Blobs                 │  │
│  │  AES-256-GCM encrypted ciphertext                     │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Database-Level Encryption at Rest (Supabase)         │  │
│  │  Additional layer of security                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📅 Implementation Phases

### Phase 1: Backend - Field-Level Encryption Setup

#### Task 1.1: Install Encryption Library
**Objective**: Add encryption capability to Django

**Prompt for LLM**:
```
Install and configure django-encrypted-model-fields for PHI encryption in a Django 4.2.7 project:

REQUIREMENTS:
1. Install the package django-encrypted-model-fields
2. Add to requirements.txt with version pinning
3. Verify compatibility with:
   - Django 4.2.7
   - Python 3.11+
   - PostgreSQL (Supabase)
   - SQLite (local development)

INSTALLATION STEPS:
1. Command to install: pip install django-encrypted-model-fields
2. Add to requirements.txt
3. Verify installation: python -c "import encrypted_model_fields"

CONFIGURATION:
- The package uses Django's SECRET_KEY by default for encryption
- Uses AES-256-GCM encryption (HIPAA compliant)
- Automatic encryption on save, decryption on read
- Works with Django ORM queries

Provide exact commands and expected output.
Test on both local SQLite and production PostgreSQL.
```

#### Task 1.2: Generate Dedicated Encryption Key
**Objective**: Create separate key for field encryption (security best practice)

**Prompt for LLM**:
```
Create a dedicated encryption key for PHI field encryption separate from Django SECRET_KEY:

REQUIREMENTS:
1. Generate cryptographically secure 256-bit key
2. Store in environment variable: FIELD_ENCRYPTION_KEY
3. Add to .env and .env.example files
4. Configure django-encrypted-model-fields to use this key
5. Document key rotation process

SECURITY REQUIREMENTS:
- Use Python secrets module for key generation
- Base64 encode for storage
- Never commit to git
- Different key for development vs production
- Minimum 256 bits (32 bytes)

CREATE FILES:
1. backend/generate_encryption_key.py - Script to generate new key
2. Update backend/.env.example with placeholder
3. Update backend/dental_clinic/settings.py to read key

SCRIPT REQUIREMENTS (generate_encryption_key.py):
```python
# Generate a secure encryption key for PHI encryption
# Run once, save to .env file
# Usage: python generate_encryption_key.py
```

Output:
- Generated key in base64 format
- Instructions for adding to .env
- Warning about key security

Follow NIST guidelines for cryptographic key generation.
```

#### Task 1.3: Update Django Settings
**Objective**: Configure encryption settings

**Prompt for LLM**:
```
Update backend/dental_clinic/settings.py to configure field-level encryption:

CONFIGURATION NEEDED:
1. Import required modules
2. Load FIELD_ENCRYPTION_KEY from environment
3. Configure django-encrypted-model-fields settings
4. Add fallback for local development
5. Add encryption validation on startup

CODE STRUCTURE:
```python
import os
from cryptography.fernet import Fernet

# Field Encryption Configuration
FIELD_ENCRYPTION_KEY = os.environ.get('FIELD_ENCRYPTION_KEY')

if not FIELD_ENCRYPTION_KEY:
    if DEBUG:
        # Generate temporary key for local development
        # WARNING: Data encrypted with this key will be lost on restart
        FIELD_ENCRYPTION_KEY = Fernet.generate_key().decode()
        print("WARNING: Using temporary encryption key for development")
    else:
        raise ValueError("FIELD_ENCRYPTION_KEY must be set in production")

# Encryption settings
ENCRYPTED_FIELDS_KEYNAME = 'FIELD_ENCRYPTION_KEY'
```

ERROR HANDLING:
- Raise clear error if key missing in production
- Warn if using temporary key in development
- Validate key format on startup

SECURITY NOTES:
- Add comment about key rotation procedure
- Document what happens if key is lost (data unrecoverable)
- Link to key management documentation
```

#### Task 1.4: Update Models with Encrypted Fields
**Objective**: Apply encryption to PHI fields

**Prompt for LLM**:
```
Update backend/api/models.py to encrypt PHI fields using django-encrypted-model-fields:

FIELDS TO ENCRYPT:

1. DentalRecord model:
   - treatment (TextField → EncryptedTextField)
   - diagnosis (TextField → EncryptedTextField)
   - notes (TextField → EncryptedTextField)

2. Appointment model:
   - notes (TextField → EncryptedTextField)
   - reschedule_notes (TextField → EncryptedTextField)
   - cancel_reason (TextField → EncryptedTextField)

3. Document model:
   - description (TextField → EncryptedTextField)

4. User model (optional, consider privacy):
   - phone (CharField → EncryptedCharField) - Consider if needed
   - address (TextField → EncryptedTextField) - Consider if needed

IMPLEMENTATION REQUIREMENTS:
```python
from encrypted_model_fields.fields import EncryptedTextField, EncryptedCharField

class DentalRecord(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dental_records')
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True)
    clinic = models.ForeignKey('ClinicLocation', on_delete=models.SET_NULL, null=True, blank=True)
    
    # ENCRYPTED FIELDS - PHI
    treatment = EncryptedTextField()     # Changed from TextField
    diagnosis = EncryptedTextField()     # Changed from TextField
    notes = EncryptedTextField()         # Changed from TextField
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.patient.get_full_name()} - {self.created_at.date()}"
```

IMPORTANT CONSIDERATIONS:
1. Encrypted fields cannot be used in database queries (WHERE, ORDER BY)
2. Keep searchable fields unencrypted (names, dates, IDs)
3. Add comments marking which fields contain PHI
4. Consider index impact (encrypted fields cannot be indexed)

MIGRATION STRATEGY:
- Create migration that converts existing data
- Backup database before migration
- Test migration on copy of production data
- Provide rollback plan

Apply same pattern to all models listed above.
Maintain all existing model methods and properties.
Add docstrings noting HIPAA compliance.
```

#### Task 1.5: Create Data Migration Script
**Objective**: Encrypt existing unencrypted data

**Prompt for LLM**:
```
Create a Django data migration to encrypt existing PHI data in backend/api/migrations/:

REQUIREMENTS:
1. Read existing unencrypted data
2. Re-save each record (triggers encryption)
3. Handle large datasets (batch processing)
4. Provide progress indicators
5. Handle errors gracefully
6. Create backup before migration

MIGRATION SCRIPT STRUCTURE:
```python
from django.db import migrations
from django.core.management import call_command

def encrypt_existing_data(apps, schema_editor):
    """
    Encrypt all existing PHI data.
    This migration re-saves all records to trigger field encryption.
    """
    DentalRecord = apps.get_model('api', 'DentalRecord')
    Appointment = apps.get_model('api', 'Appointment')
    Document = apps.get_model('api', 'Document')
    
    # Batch size for memory efficiency
    BATCH_SIZE = 100
    
    # Encrypt dental records
    total_records = DentalRecord.objects.count()
    print(f"Encrypting {total_records} dental records...")
    
    for i in range(0, total_records, BATCH_SIZE):
        records = DentalRecord.objects.all()[i:i+BATCH_SIZE]
        for record in records:
            record.save()  # Triggers encryption
        print(f"Progress: {min(i+BATCH_SIZE, total_records)}/{total_records}")
    
    # Repeat for other models...

def reverse_encryption(apps, schema_editor):
    """
    WARNING: Cannot decrypt data if encryption key is lost.
    This migration cannot be reversed safely.
    """
    raise Exception("Cannot reverse encryption migration. Restore from backup.")

class Migration(migrations.Migration):
    dependencies = [
        ('api', 'XXXX_previous_migration'),
    ]
    
    operations = [
        migrations.RunPython(encrypt_existing_data, reverse_encryption),
    ]
```

ERROR HANDLING:
- Catch and log errors for individual records
- Continue processing even if some records fail
- Create error report file
- Don't raise exception for entire migration

SAFETY MEASURES:
- Require manual confirmation before running
- Create automatic backup
- Test on database copy first
- Provide rollback instructions

Generate complete migration file ready to use.
Include progress tracking and error reporting.
```

---

### Phase 2: Encryption in Transit (HTTPS/TLS)

#### Task 2.1: Verify HTTPS Configuration
**Objective**: Ensure all communication uses TLS 1.3

**Prompt for LLM**:
```
Create a comprehensive check and documentation for HTTPS/TLS configuration across the application:

VERIFY THESE COMPONENTS:

1. Frontend (Vercel):
   - HTTPS enabled by default
   - TLS 1.3 support
   - HSTS headers configured
   - No mixed content warnings

2. Backend (Railway):
   - HTTPS endpoint configured
   - TLS certificate valid
   - Force HTTPS redirect
   - Secure cookies enabled

3. Database (Supabase):
   - SSL connection enforced
   - Certificate validation
   - Minimum TLS version

CREATE VERIFICATION SCRIPT (backend/check_tls_config.py):
```python
#!/usr/bin/env python3
"""
Verify TLS/HTTPS configuration for HIPAA compliance
Run: python check_tls_config.py
"""
import os
import ssl
import requests
from urllib.parse import urlparse

def check_https_endpoint(url):
    """Check if endpoint uses HTTPS with valid certificate"""
    try:
        response = requests.get(url, timeout=10)
        # Check if using HTTPS
        # Check TLS version
        # Check certificate validity
        # Check HSTS headers
        return {
            'url': url,
            'https': url.startswith('https://'),
            'status': response.status_code,
            'hsts': 'Strict-Transport-Security' in response.headers,
            'secure': True if response.url.startswith('https://') else False
        }
    except Exception as e:
        return {'url': url, 'error': str(e)}

def check_database_ssl():
    """Verify database connection uses SSL"""
    # Check DATABASE_URL includes SSL requirement
    # Test actual connection SSL status
    pass

def main():
    print("HIPAA TLS/HTTPS Configuration Check")
    print("=" * 50)
    
    # Check frontend
    frontend_url = os.getenv('NEXT_PUBLIC_API_URL', 'http://localhost:3000')
    # Check backend  
    backend_url = os.getenv('RAILWAY_PUBLIC_URL', 'http://localhost:8000')
    
    # Run checks and report
    pass

if __name__ == '__main__':
    main()
```

DJANGO SETTINGS UPDATES (settings.py):
```python
# HTTPS/TLS Configuration for HIPAA Compliance
if not DEBUG:
    # Force HTTPS
    SECURE_SSL_REDIRECT = True
    
    # HSTS (HTTP Strict Transport Security)
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    
    # Secure cookies
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True
    
    # Additional security headers
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'
```

OUTPUT REQUIREMENTS:
- Complete security settings for Django
- Verification script with clear pass/fail output
- Documentation of TLS configuration
- Checklist for production deployment
```

#### Task 2.2: Configure Database SSL Connection
**Objective**: Enforce encrypted database connections

**Prompt for LLM**:
```
Update database configuration in backend/dental_clinic/settings.py to enforce SSL/TLS connections:

REQUIREMENTS:
1. Require SSL for PostgreSQL connections
2. Validate server certificates
3. Handle both local (SQLite) and production (PostgreSQL)
4. Add connection health checks

CONFIGURATION:
```python
import dj_database_url

# Database Configuration
if os.environ.get('DATABASE_URL'):
    # Production: PostgreSQL with SSL
    DATABASES = {
        'default': dj_database_url.config(
            default=os.environ.get('DATABASE_URL'),
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=True,  # Enforce SSL connection
        )
    }
    
    # Additional SSL options for PostgreSQL
    DATABASES['default']['OPTIONS'] = {
        'sslmode': 'require',  # Require SSL encryption
        'sslrootcert': os.path.join(BASE_DIR, 'ca-certificate.crt'),  # Optional: CA cert
    }
else:
    # Local development: SQLite (no SSL needed)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Connection health check
DATABASES['default']['CONN_HEALTH_CHECKS'] = True
```

SUPABASE-SPECIFIC CONFIG:
- Supabase enforces SSL by default
- Connection string should include sslmode=require
- Document how to download CA certificate if needed

ERROR HANDLING:
- Clear error message if SSL connection fails
- Instructions for troubleshooting SSL issues
- Fallback only in DEBUG mode

DOCUMENTATION:
- How to obtain SSL certificates
- How to verify SSL connection
- What to do if connection fails
```

---

### Phase 3: Key Management & Security

#### Task 3.1: Create Key Management System
**Objective**: Secure key storage and rotation procedures

**Prompt for LLM**:
```
Create a comprehensive key management system for encryption keys:

CREATE THESE COMPONENTS:

1. Key Generation Script (backend/scripts/generate_keys.py):
```python
"""
Generate encryption keys for PHI protection
Usage: python scripts/generate_keys.py --environment [dev|prod]
"""
import secrets
import base64
import argparse
from cryptography.fernet import Fernet

def generate_field_encryption_key():
    """Generate AES-256 key for field encryption"""
    return Fernet.generate_key().decode('utf-8')

def generate_django_secret_key():
    """Generate Django SECRET_KEY"""
    return base64.b64encode(secrets.token_bytes(50)).decode('utf-8')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--environment', required=True, choices=['dev', 'prod'])
    args = parser.parse_args()
    
    print(f"Generating keys for {args.environment} environment")
    print("=" * 60)
    print()
    print("Add these to your .env file:")
    print()
    print(f"FIELD_ENCRYPTION_KEY={generate_field_encryption_key()}")
    print(f"SECRET_KEY={generate_django_secret_key()}")
    print()
    print("⚠️  SECURITY WARNINGS:")
    print("1. Never commit these keys to git")
    print("2. Store in secure password manager")
    print("3. Use different keys for dev and production")
    print("4. Back up keys securely - lost keys = lost data")
    print("5. Rotate keys every 90 days (HIPAA recommendation)")
    
if __name__ == '__main__':
    main()
```

2. Key Rotation Procedure Document (backend/docs/KEY_ROTATION.md):

# Encryption Key Rotation Procedure

## When to Rotate Keys:
- Every 90 days (HIPAA recommended)
- When employee with key access leaves
- Suspected key compromise
- Security audit recommendation

## Rotation Steps:
1. Generate new key
2. Configure Django to support dual keys (old + new)
3. Re-encrypt all data with new key (data migration)
4. Verify all data encrypted with new key
5. Remove old key from configuration
6. Update production environment variables
7. Document rotation in audit log

3. Key Storage Documentation:
- Railway environment variables (production)
- .env file (local development)
- Never in code/git
- Backup in secure password manager (1Password, LastPass)

PROVIDE:
- Complete scripts ready to run
- Step-by-step rotation procedure
- Checklist for key security
- Disaster recovery plan for lost keys
```

#### Task 3.2: Implement Audit Logging
**Objective**: Track all PHI access (HIPAA requirement)

**Prompt for LLM**:
```
Create comprehensive audit logging system for PHI access in backend/api/audit_logger.py:

REQUIREMENTS:
1. Log all PHI record access (read, write, delete)
2. Record user, timestamp, action, record ID
3. Store logs securely (separate from main database)
4. Retention: 6 years (HIPAA requirement)
5. Tamper-proof logging

CREATE AUDIT LOGGING SYSTEM:
```python
"""
HIPAA-Compliant Audit Logging for PHI Access
All access to Protected Health Information must be logged
"""
import logging
from django.utils import timezone
from django.contrib.auth import get_user_model

# Configure audit logger
audit_logger = logging.getLogger('phi_audit')

class PHIAccessLog(models.Model):
    """
    Audit log for PHI access (HIPAA 164.308(a)(1)(ii)(D))
    Retention: 6 years minimum
    """
    ACTION_CHOICES = (
        ('read', 'Read'),
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('export', 'Export'),
    )
    
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.PROTECT)  # Never delete
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=50)  # DentalRecord, Appointment, etc.
    record_id = models.IntegerField()
    patient_id = models.IntegerField()
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    success = models.BooleanField(default=True)
    failure_reason = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp', 'user']),
            models.Index(fields=['patient_id', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.action} - {self.model_name}:{self.record_id}"

def log_phi_access(user, action, model_name, record_id, patient_id, request, success=True, failure_reason=''):
    """
    Log PHI access for HIPAA compliance
    
    Args:
        user: User performing the action
        action: 'read', 'create', 'update', 'delete', 'export'
        model_name: Name of model (DentalRecord, Appointment, etc.)
        record_id: ID of the record
        patient_id: ID of the patient
        request: Django request object (for IP and user agent)
        success: Whether the action succeeded
        failure_reason: Reason for failure if unsuccessful
    """
    PHIAccessLog.objects.create(
        user=user,
        action=action,
        model_name=model_name,
        record_id=record_id,
        patient_id=patient_id,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        success=success,
        failure_reason=failure_reason
    )
    
    # Also log to file
    audit_logger.info(
        f"PHI Access: user={user.id} action={action} model={model_name} "
        f"record={record_id} patient={patient_id} success={success}"
    )

def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
```

INTEGRATE WITH VIEWS:
- Add logging decorator for PHI access
- Log in serializers for API access
- Log in admin interface
- Log bulk operations

SETTINGS CONFIGURATION:
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'phi_audit_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/phi_audit.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 100,  # Keep 100 files (6+ years of logs)
            'formatter': 'audit',
        },
    },
    'formatters': {
        'audit': {
            'format': '{asctime} {levelname} {message}',
            'style': '{',
        },
    },
    'loggers': {
        'phi_audit': {
            'handlers': ['phi_audit_file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

ADMIN INTERFACE:
- View-only access to audit logs
- Search and filter capabilities
- Export for compliance reviews
- Cannot delete or modify logs

Provide complete implementation ready to use.
```

#### Task 3.3: Create Access Control Middleware
**Objective**: Enforce proper authorization for PHI access

**Prompt for LLM**:
```
Create middleware to enforce access control and log PHI access in backend/api/middleware/phi_access_control.py:

REQUIREMENTS:
1. Verify user has permission to access PHI
2. Log all PHI record access
3. Block unauthorized access attempts
4. Rate limiting for sensitive operations
5. Session timeout (15 minutes idle - HIPAA recommendation)

MIDDLEWARE IMPLEMENTATION:
```python
"""
PHI Access Control Middleware
Enforces authorization and logs all PHI access
"""
from django.utils import timezone
from django.http import JsonResponse
from .audit_logger import log_phi_access, PHIAccessLog

class PHIAccessControlMiddleware:
    """
    Middleware to control and log PHI access
    """
    
    PHI_MODELS = ['dentalrecord', 'appointment', 'document', 'billing']
    PHI_ENDPOINTS = [
        '/api/dental-records/',
        '/api/appointments/',
        '/api/documents/',
        '/api/billings/',
        '/api/patients/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Check if accessing PHI endpoint
        if self.is_phi_endpoint(request.path):
            # Verify authentication
            if not request.user.is_authenticated:
                return JsonResponse({'error': 'Authentication required'}, status=401)
            
            # Check session timeout
            if self.is_session_expired(request):
                return JsonResponse({'error': 'Session expired'}, status=401)
            
            # Verify authorization
            if not self.has_phi_access_permission(request):
                # Log unauthorized access attempt
                log_phi_access(
                    user=request.user,
                    action='read',
                    model_name='Unknown',
                    record_id=0,
                    patient_id=0,
                    request=request,
                    success=False,
                    failure_reason='Insufficient permissions'
                )
                return JsonResponse({'error': 'Insufficient permissions'}, status=403)
            
            # Update last activity time
            request.session['last_activity'] = timezone.now().isoformat()
        
        response = self.get_response(request)
        
        # Log successful PHI access (if applicable)
        if self.is_phi_endpoint(request.path) and response.status_code == 200:
            self.log_phi_access_from_response(request, response)
        
        return response
    
    def is_phi_endpoint(self, path):
        """Check if endpoint accesses PHI"""
        return any(path.startswith(endpoint) for endpoint in self.PHI_ENDPOINTS)
    
    def is_session_expired(self, request):
        """Check if session has expired (15 minute timeout)"""
        last_activity = request.session.get('last_activity')
        if not last_activity:
            return False
        
        last_activity_time = timezone.datetime.fromisoformat(last_activity)
        idle_time = timezone.now() - last_activity_time
        
        # 15 minute timeout (HIPAA recommendation)
        return idle_time.total_seconds() > 900
    
    def has_phi_access_permission(self, request):
        """Verify user has permission to access PHI"""
        user = request.user
        
        # Owners and staff have access
        if user.user_type in ['owner', 'staff']:
            return True
        
        # Patients can only access their own records
        if user.user_type == 'patient':
            patient_id = request.resolver_match.kwargs.get('patient_id')
            return patient_id == user.id if patient_id else False
        
        return False
    
    def log_phi_access_from_response(self, request, response):
        """Extract record info from response and log"""
        # Implementation depends on response structure
        pass
```

SETTINGS.PY UPDATE:
```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'api.middleware.phi_access_control.PHIAccessControlMiddleware',  # ADD THIS
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Session configuration
SESSION_COOKIE_AGE = 900  # 15 minutes
SESSION_SAVE_EVERY_REQUEST = True  # Update session on every request
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
```

Provide complete middleware ready to integrate.
Include unit tests for authorization logic.
```

---

### Phase 4: Frontend Security Enhancements

#### Task 4.1: Enforce HTTPS in Next.js
**Objective**: Ensure frontend only communicates via HTTPS

**Prompt for LLM**:
```
Update Next.js configuration to enforce HTTPS and secure communication in frontend/:

UPDATE FILES:

1. next.config.mjs:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ]
  },
  
  // Redirect HTTP to HTTPS in production
  async redirects() {
    return process.env.NODE_ENV === 'production' ? [
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http'
          }
        ],
        destination: 'https://:host/:path*',
        permanent: true
      }
    ] : []
  }
}

export default nextConfig
```

2. Update API Client (frontend/lib/api.ts):
```typescript
// Ensure API calls always use HTTPS in production
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Validate HTTPS in production
if (typeof window !== 'undefined' && 
    process.env.NODE_ENV === 'production' && 
    !API_URL.startsWith('https://')) {
  console.error('API URL must use HTTPS in production')
  throw new Error('Insecure API URL detected')
}

// Add security headers to all requests
const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'Cache-Control': 'no-store'  // Don't cache PHI
}
```

3. Environment Variables (.env.example):
```
# API Configuration - MUST use HTTPS in production
NEXT_PUBLIC_API_URL=https://your-backend-domain.railway.app
```

SECURITY CHECKS:
- Warn if running with HTTP in production
- Add CSP (Content Security Policy) headers
- Disable caching for PHI endpoints
- Add request/response interceptors for security headers

Create complete configuration ready to deploy.
```

#### Task 4.2: Implement Secure Session Management
**Objective**: Timeout inactive sessions, secure token storage

**Prompt for LLM**:
```
Create secure session management for frontend in frontend/lib/auth-security.ts:

REQUIREMENTS:
1. 15-minute idle timeout (HIPAA)
2. Secure token storage (not in localStorage)
3. Auto-logout on timeout
4. Session activity tracking
5. Warning before timeout

IMPLEMENTATION:
```typescript
/**
 * Secure session management for HIPAA compliance
 * - 15 minute idle timeout
 * - Secure token storage
 * - Activity tracking
 */

const IDLE_TIMEOUT = 15 * 60 * 1000 // 15 minutes in milliseconds
const WARNING_TIME = 2 * 60 * 1000  // Warn 2 minutes before timeout

class SecureSessionManager {
  private idleTimer: NodeJS.Timeout | null = null
  private warningTimer: NodeJS.Timeout | null = null
  private lastActivity: number = Date.now()
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.initActivityListeners()
      this.startIdleTimer()
    }
  }
  
  /**
   * Track user activity
   */
  private initActivityListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.resetIdleTimer()
      }, true)
    })
  }
  
  /**
   * Start idle timeout timer
   */
  private startIdleTimer() {
    this.clearTimers()
    
    // Warning timer (2 minutes before logout)
    this.warningTimer = setTimeout(() => {
      this.showTimeoutWarning()
    }, IDLE_TIMEOUT - WARNING_TIME)
    
    // Logout timer
    this.idleTimer = setTimeout(() => {
      this.handleTimeout()
    }, IDLE_TIMEOUT)
  }
  
  /**
   * Reset idle timer on activity
   */
  private resetIdleTimer() {
    this.lastActivity = Date.now()
    this.startIdleTimer()
  }
  
  /**
   * Show warning before timeout
   */
  private showTimeoutWarning() {
    // Show modal/toast warning
    const timeRemaining = Math.floor((IDLE_TIMEOUT - (Date.now() - this.lastActivity)) / 1000)
    console.warn(`Session will timeout in ${timeRemaining} seconds`)
    
    // Emit event for UI to show warning
    window.dispatchEvent(new CustomEvent('session-timeout-warning', {
      detail: { timeRemaining }
    }))
  }
  
  /**
   * Handle session timeout
   */
  private handleTimeout() {
    console.log('Session timed out due to inactivity')
    
    // Clear tokens
    this.clearSession()
    
    // Redirect to login
    window.location.href = '/login?timeout=true'
  }
  
  /**
   * Clear timers
   */
  private clearTimers() {
    if (this.idleTimer) clearTimeout(this.idleTimer)
    if (this.warningTimer) clearTimeout(this.warningTimer)
  }
  
  /**
   * Clear session data securely
   */
  private clearSession() {
    // Remove token from sessionStorage (more secure than localStorage)
    sessionStorage.removeItem('authToken')
    sessionStorage.removeItem('userData')
    
    // Clear any cached PHI data
    sessionStorage.clear()
    
    this.clearTimers()
  }
  
  /**
   * Store token securely
   */
  public setToken(token: string) {
    // Use sessionStorage instead of localStorage
    // SessionStorage is cleared when tab closes
    sessionStorage.setItem('authToken', token)
    this.resetIdleTimer()
  }
  
  /**
   * Get token
   */
  public getToken(): string | null {
    return sessionStorage.getItem('authToken')
  }
  
  /**
   * Manual logout
   */
  public logout() {
    this.clearSession()
  }
}

// Export singleton instance
export const sessionManager = new SecureSessionManager()

// Timeout warning component hook
export function useSessionTimeout() {
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  
  useEffect(() => {
    const handleWarning = (event: CustomEvent) => {
      setShowWarning(true)
      setTimeRemaining(event.detail.timeRemaining)
    }
    
    window.addEventListener('session-timeout-warning', handleWarning as EventListener)
    
    return () => {
      window.removeEventListener('session-timeout-warning', handleWarning as EventListener)
    }
  }, [])
  
  const extendSession = () => {
    setShowWarning(false)
    sessionManager.resetIdleTimer()
  }
  
  return { showWarning, timeRemaining, extendSession }
}
```

INTEGRATE WITH AUTH:
- Update login flow to use sessionManager
- Replace localStorage with sessionStorage
- Add timeout warning modal
- Clear all data on logout

TOKEN SECURITY:
- Never store in localStorage (XSS vulnerable)
- Use sessionStorage (cleared on tab close)
- Consider httpOnly cookies for production
- Token expiration should match session timeout

Provide complete implementation with React hooks.
```

---

### Phase 5: Testing & Validation

#### Task 5.1: Create Encryption Test Suite
**Objective**: Verify encryption works correctly

**Prompt for LLM**:
```
Create comprehensive test suite for encryption in backend/api/tests/test_phi_encryption.py:

TEST CASES:

1. Field Encryption Tests:
```python
from django.test import TestCase
from api.models import DentalRecord, Appointment, User
from cryptography.fernet import Fernet
import os

class PHIEncryptionTests(TestCase):
    """Test PHI field encryption"""
    
    def setUp(self):
        """Create test data"""
        self.patient = User.objects.create_user(
            username='testpatient',
            email='patient@test.com',
            user_type='patient'
        )
        self.dentist = User.objects.create_user(
            username='testdentist',
            email='dentist@test.com',
            user_type='staff',
            role='dentist'
        )
    
    def test_dental_record_treatment_encrypted(self):
        """Test that treatment field is encrypted in database"""
        # Create record with sensitive data
        record = DentalRecord.objects.create(
            patient=self.patient,
            treatment="Root canal therapy on tooth #14",
            diagnosis="Severe dental caries",
            notes="Patient reported pain level 8/10",
            created_by=self.dentist
        )
        
        # Read from database directly (bypassing Django ORM)
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT treatment, diagnosis, notes FROM api_dentalrecord WHERE id = %s",
                [record.id]
            )
            raw_data = cursor.fetchone()
        
        # Verify data is encrypted in database
        self.assertNotEqual(raw_data[0], "Root canal therapy on tooth #14")
        self.assertNotEqual(raw_data[1], "Severe dental caries")
        self.assertNotEqual(raw_data[2], "Patient reported pain level 8/10")
        
        # Verify data is decrypted when accessed through Django
        record.refresh_from_db()
        self.assertEqual(record.treatment, "Root canal therapy on tooth #14")
        self.assertEqual(record.diagnosis, "Severe dental caries")
        self.assertEqual(record.notes, "Patient reported pain level 8/10")
    
    def test_appointment_notes_encrypted(self):
        """Test that appointment notes are encrypted"""
        # Similar test for Appointment model
        pass
    
    def test_encryption_with_special_characters(self):
        """Test encryption handles special characters"""
        special_text = "Patient has ñ allergy to penicillin (500mg) & aspirin"
        record = DentalRecord.objects.create(
            patient=self.patient,
            treatment=special_text,
            created_by=self.dentist
        )
        record.refresh_from_db()
        self.assertEqual(record.treatment, special_text)
    
    def test_encryption_with_unicode(self):
        """Test encryption handles unicode characters"""
        unicode_text = "患者有牙齿问题 🦷"
        record = DentalRecord.objects.create(
            patient=self.patient,
            treatment=unicode_text,
            created_by=self.dentist
        )
        record.refresh_from_db()
        self.assertEqual(record.treatment, unicode_text)
    
    def test_empty_encrypted_field(self):
        """Test that empty encrypted fields work correctly"""
        record = DentalRecord.objects.create(
            patient=self.patient,
            treatment="Cleaning",
            diagnosis="",  # Empty encrypted field
            notes="",
            created_by=self.dentist
        )
        record.refresh_from_db()
        self.assertEqual(record.diagnosis, "")
        self.assertEqual(record.notes, "")
    
    def test_bulk_create_encrypted_records(self):
        """Test bulk operations with encrypted fields"""
        records = [
            DentalRecord(
                patient=self.patient,
                treatment=f"Treatment {i}",
                diagnosis=f"Diagnosis {i}",
                created_by=self.dentist
            )
            for i in range(100)
        ]
        DentalRecord.objects.bulk_create(records)
        
        # Verify all records encrypted
        for record in DentalRecord.objects.all():
            self.assertIsNotNone(record.treatment)
    
    def test_search_on_encrypted_field_fails(self):
        """Verify that searching on encrypted fields doesn't work"""
        DentalRecord.objects.create(
            patient=self.patient,
            treatment="Root canal",
            created_by=self.dentist
        )
        
        # This should not find the record (encrypted fields can't be searched)
        results = DentalRecord.objects.filter(treatment__icontains="Root")
        self.assertEqual(results.count(), 0)
```

2. Key Management Tests:
```python
def test_missing_encryption_key_raises_error(self):
    """Test that missing key raises error in production"""
    # Test with missing FIELD_ENCRYPTION_KEY
    pass

def test_invalid_encryption_key_raises_error(self):
    """Test that invalid key format raises error"""
    pass
```

3. Migration Tests:
```python
def test_data_migration_encrypts_existing_data(self):
    """Test that migration encrypts existing unencrypted data"""
    pass
```

RUN TESTS:
```bash
python manage.py test api.tests.test_phi_encryption
```

Provide complete test suite with >90% coverage.
Include performance tests for large datasets.
```

#### Task 5.2: Create Security Audit Script
**Objective**: Automated security compliance checking

**Prompt for LLM**:
```
Create automated security audit script in backend/scripts/security_audit.py:

AUDIT CHECKS:

```python
#!/usr/bin/env python3
"""
HIPAA Security Compliance Audit Script
Checks encryption, access controls, and configuration

Usage: python scripts/security_audit.py
"""

import os
import sys
import django
from termcolor import colored

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from django.conf import settings
from django.db import connection
from api.models import DentalRecord, Appointment, User

class SecurityAudit:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.warnings = []
    
    def check_encryption_key_configured(self):
        """Check if encryption key is set"""
        key = os.environ.get('FIELD_ENCRYPTION_KEY')
        if key and len(key) > 20:
            self.passed.append("✓ Encryption key configured")
        else:
            self.failed.append("✗ FIELD_ENCRYPTION_KEY not properly configured")
    
    def check_encrypted_fields(self):
        """Verify PHI fields are encrypted in database"""
        # Check if data is actually encrypted
        record = DentalRecord.objects.first()
        if record:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT treatment FROM api_dentalrecord LIMIT 1"
                )
                raw_treatment = cursor.fetchone()[0]
            
            # If readable, it's not encrypted
            if raw_treatment == record.treatment:
                self.failed.append("✗ DentalRecord.treatment is NOT encrypted")
            else:
                self.passed.append("✓ DentalRecord fields are encrypted")
        else:
            self.warnings.append("⚠ No dental records to test encryption")
    
    def check_https_configuration(self):
        """Check HTTPS/TLS configuration"""
        if not settings.DEBUG:
            if settings.SECURE_SSL_REDIRECT:
                self.passed.append("✓ HTTPS redirect enabled")
            else:
                self.failed.append("✗ HTTPS redirect not enabled")
            
            if settings.SECURE_HSTS_SECONDS > 0:
                self.passed.append("✓ HSTS configured")
            else:
                self.failed.append("✗ HSTS not configured")
        else:
            self.warnings.append("⚠ Running in DEBUG mode")
    
    def check_session_security(self):
        """Check session configuration"""
        if settings.SESSION_COOKIE_SECURE:
            self.passed.append("✓ Secure session cookies")
        else:
            self.failed.append("✗ Session cookies not secure")
        
        if settings.SESSION_COOKIE_AGE <= 900:  # 15 minutes
            self.passed.append("✓ Session timeout configured (15 min)")
        else:
            self.warnings.append(f"⚠ Session timeout is {settings.SESSION_COOKIE_AGE/60} minutes")
    
    def check_database_ssl(self):
        """Check database connection uses SSL"""
        db_config = settings.DATABASES['default']
        if 'sslmode' in db_config.get('OPTIONS', {}):
            self.passed.append("✓ Database SSL configured")
        elif 'sqlite' in db_config.get('ENGINE', ''):
            self.warnings.append("⚠ Using SQLite (no SSL needed for local dev)")
        else:
            self.failed.append("✗ Database SSL not configured")
    
    def check_audit_logging(self):
        """Check audit logging is configured"""
        if 'phi_audit' in settings.LOGGING.get('loggers', {}):
            self.passed.append("✓ PHI audit logging configured")
        else:
            self.failed.append("✗ PHI audit logging not configured")
    
    def check_debug_mode(self):
        """Check DEBUG is disabled in production"""
        if not settings.DEBUG:
            self.passed.append("✓ DEBUG mode disabled")
        else:
            self.failed.append("✗ DEBUG mode enabled (DANGER in production)")
    
    def check_secret_key(self):
        """Check SECRET_KEY is set and strong"""
        key = settings.SECRET_KEY
        if len(key) > 50 and key != 'django-insecure-dev-key-change-in-production':
            self.passed.append("✓ SECRET_KEY is strong")
        else:
            self.failed.append("✗ SECRET_KEY is weak or default")
    
    def run_audit(self):
        """Run all audit checks"""
        print("=" * 60)
        print("HIPAA SECURITY COMPLIANCE AUDIT")
        print("=" * 60)
        print()
        
        checks = [
            self.check_encryption_key_configured,
            self.check_encrypted_fields,
            self.check_https_configuration,
            self.check_session_security,
            self.check_database_ssl,
            self.check_audit_logging,
            self.check_debug_mode,
            self.check_secret_key,
        ]
        
        for check in checks:
            check()
        
        # Print results
        print("\nPASSED CHECKS:")
        for item in self.passed:
            print(colored(item, 'green'))
        
        print("\nWARNINGS:")
        for item in self.warnings:
            print(colored(item, 'yellow'))
        
        print("\nFAILED CHECKS:")
        for item in self.failed:
            print(colored(item, 'red'))
        
        print("\n" + "=" * 60)
        print(f"Summary: {len(self.passed)} passed, {len(self.warnings)} warnings, {len(self.failed)} failed")
        
        if self.failed:
            print(colored("\n⚠️  AUDIT FAILED - Please fix issues before deployment", 'red', attrs=['bold']))
            return False
        else:
            print(colored("\n✓ AUDIT PASSED - System is HIPAA compliant", 'green', attrs=['bold']))
            return True

if __name__ == '__main__':
    audit = SecurityAudit()
    success = audit.run_audit()
    sys.exit(0 if success else 1)
```

Run before each deployment to verify compliance.
Include in CI/CD pipeline.
```

---

### Phase 6: Documentation & Training

#### Task 6.1: Create HIPAA Compliance Documentation
**Objective**: Document encryption implementation for audits

**Prompt for LLM**:
```
Create comprehensive HIPAA compliance documentation in backend/docs/HIPAA_COMPLIANCE.md:

DOCUMENT STRUCTURE:

# HIPAA Compliance Documentation
## Dorotheo Dental Clinic Management System

### 1. Overview
Brief description of system and PHI handling

### 2. Technical Safeguards Implemented

#### 2.1 Encryption at Rest (164.312(a)(2)(iv))
- Field-level encryption using AES-256-GCM
- Encrypted fields: treatment, diagnosis, notes, etc.
- Library: django-encrypted-model-fields
- Key management: Environment variables

#### 2.2 Encryption in Transit (164.312(e)(2)(ii))
- TLS 1.3 for all connections
- HTTPS enforced on frontend and backend
- Database connections use SSL
- Certificate validation enabled

#### 2.3 Access Control (164.312(a)(1))
- Role-based access control (RBAC)
- Authentication required for all PHI access
- Session timeout: 15 minutes
- Automatic logout on inactivity

#### 2.4 Audit Controls (164.312(b))
- All PHI access logged
- Logs include: user, timestamp, action, record ID
- Log retention: 6 years
- Tamper-proof logging

#### 2.5 Integrity Controls (164.312(c)(1))
- Data validation on input
- Database constraints
- Backup verification

#### 2.6 Person or Entity Authentication (164.312(d))
- Django authentication system
- Token-based API authentication
- Strong password requirements
- Account lockout after failed attempts

### 3. Administrative Safeguards

#### 3.1 Security Management Process
- Risk assessment conducted
- Security incidents logged
- Regular security audits

#### 3.2 Workforce Security
- Access based on job role
- Staff training on PHI handling
- Termination procedures

### 4. Physical Safeguards

#### 4.1 Facility Access Controls
- Cloud infrastructure (Railway, Vercel, Supabase)
- Physical security managed by providers
- SOC 2 compliant providers

### 5. Breach Notification Procedures

If PHI breach suspected:
1. Immediately secure system
2. Assess scope of breach
3. Notify affected patients (within 60 days)
4. Report to HHS if >500 patients affected
5. Document incident

### 6. Business Associate Agreements (BAA)

Required BAAs with:
- ✓ Railway (backend hosting) - BAA signed
- ✓ Vercel (frontend hosting) - BAA signed
- ✓ Supabase (database) - BAA signed
- ✓ Resend (email service) - BAA required

### 7. Audit Checklist

Use for compliance audits:
- [ ] Encryption keys properly secured
- [ ] HTTPS enforced on all endpoints
- [ ] Session timeouts configured
- [ ] Audit logs active and retained
- [ ] Access controls enforced
- [ ] BAAs signed with all vendors
- [ ] Security training completed
- [ ] Incident response plan documented

### 8. Contact Information

Security Officer: [Name]
Email: security@dorotheodental.com
Phone: [Number]

Include all HIPAA requirements with implementation details.
Provide evidence of compliance for audits.
```

#### Task 6.2: Create Developer Security Guide
**Objective**: Train developers on secure PHI handling

**Prompt for LLM**:
```
Create developer guide for working with PHI in backend/docs/DEVELOPER_SECURITY_GUIDE.md:

# Developer Security Guide
## Working with Protected Health Information (PHI)

### What is PHI?

Protected Health Information includes:
- Patient names, addresses, phone numbers
- Medical diagnoses and treatments
- Appointment notes and medical history
- Billing information
- Any health-related data that can identify a patient

### Security Requirements When Coding

#### 1. Never Log PHI
❌ BAD:
```python
print(f"Patient {patient.name} has diagnosis: {record.diagnosis}")
logger.info(f"Treatment: {record.treatment}")
```

✅ GOOD:
```python
print(f"Processing record ID: {record.id}")
logger.info(f"Treatment record created", extra={'record_id': record.id})
```

#### 2. Always Use Encrypted Fields for PHI
❌ BAD:
```python
class MedicalNote(models.Model):
    content = models.TextField()  # PHI stored unencrypted!
```

✅ GOOD:
```python
from encrypted_model_fields.fields import EncryptedTextField

class MedicalNote(models.Model):
    content = EncryptedTextField()  # PHI encrypted
```

#### 3. Log PHI Access
✅ REQUIRED:
```python
from api.audit_logger import log_phi_access

def get_dental_record(request, record_id):
    record = DentalRecord.objects.get(id=record_id)
    
    # Log access
    log_phi_access(
        user=request.user,
        action='read',
        model_name='DentalRecord',
        record_id=record.id,
        patient_id=record.patient.id,
        request=request
    )
    
    return record
```

#### 4. Validate Access Permissions
❌ BAD:
```python
# Anyone can access any patient's records
def get_patient_records(request, patient_id):
    return Patient.objects.get(id=patient_id).dental_records.all()
```

✅ GOOD:
```python
def get_patient_records(request, patient_id):
    # Patients can only access their own records
    if request.user.user_type == 'patient' and request.user.id != patient_id:
        raise PermissionDenied("Cannot access other patient's records")
    
    return Patient.objects.get(id=patient_id).dental_records.all()
```

#### 5. Never Cache PHI
❌ BAD:
```python
@cache_page(60 * 15)  # Don't cache PHI!
def get_patient_details(request, patient_id):
    pass
```

✅ GOOD:
```python
@never_cache
def get_patient_details(request, patient_id):
    pass
```

#### 6. Sanitize Error Messages
❌ BAD:
```python
except Exception as e:
    return Response({'error': str(e)})  # Might leak PHI in error message
```

✅ GOOD:
```python
except Exception as e:
    logger.error(f"Error processing record {record_id}: {str(e)}")
    return Response({'error': 'An error occurred processing your request'})
```

### Testing with PHI

- Never use real patient data in development
- Use faker library to generate test data
- Always test with synthetic data

### Code Review Checklist

Before submitting code that touches PHI:
- [ ] PHI fields use encrypted field types
- [ ] No PHI in logs or error messages
- [ ] Access permissions validated
- [ ] PHI access logged
- [ ] No caching of PHI
- [ ] HTTPS enforced
- [ ] Error messages sanitized

### Security Resources

- HIPAA Security Rule: https://www.hhs.gov/hipaa/for-professionals/security/
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Django Security: https://docs.djangoproject.com/en/4.2/topics/security/

Provide complete guide with examples.
Include common mistakes and how to avoid them.
```

---

## 🔄 Implementation Timeline

### Week 1: Foundation (20 hours)
- Day 1-2: Install and configure encryption library
- Day 3-4: Update models with encrypted fields
- Day 5: Create and run data migration

### Week 2: Security Infrastructure (20 hours)
- Day 1-2: Implement audit logging
- Day 3-4: Create access control middleware
- Day 5: Configure HTTPS/TLS settings

### Week 3: Frontend & Key Management (16 hours)
- Day 1-2: Frontend security enhancements
- Day 3: Key management system
- Day 4: Session timeout implementation

### Week 4: Testing & Documentation (24 hours)
- Day 1-2: Write and run encryption tests
- Day 3: Security audit script
- Day 4-5: Documentation and training materials

**Total: 80 hours (~2 months part-time)**

---

## 💰 Cost Considerations

### One-Time Costs:
- Development time: 80 hours
- Security audit (external): $2,000-5,000 (recommended)
- Legal review (BAAs): $1,000-3,000

### Ongoing Costs:
- No additional hosting costs (encryption built-in)
- Key rotation: 2 hours quarterly
- Compliance audits: Annual
- Log storage: Minimal (<$10/month)

---

## ✅ Success Criteria

- [ ] All PHI fields encrypted at rest (AES-256)
- [ ] All communication uses TLS 1.3
- [ ] Audit logging active and tested
- [ ] Session timeout enforced (15 minutes)
- [ ] Access controls validated
- [ ] Security audit script passing
- [ ] Documentation complete
- [ ] Team trained on secure development
- [ ] BAAs signed with all vendors
- [ ] Penetration testing passed
- [ ] Ready for HIPAA compliance audit

---

## 🚨 Critical Security Warnings

1. **Encryption Key Loss = Data Loss**
   - Backup keys securely (password manager)
   - Document key locations
   - Test backup restore procedure

2. **Never Commit Keys to Git**
   - Use .env files
   - Add to .gitignore
   - Rotate keys if accidentally committed

3. **Production Deployment Checklist**
   - [ ] DEBUG = False
   - [ ] HTTPS enforced
   - [ ] Strong encryption keys set
   - [ ] Audit logging enabled
   - [ ] Session timeouts configured
   - [ ] Run security audit script

4. **Key Rotation Required**
   - Rotate every 90 days minimum
   - Rotate immediately if:
     - Employee with key access leaves
     - Suspected compromise
     - Security incident

---

## 📞 Support & Incident Response

### Security Incident Contacts:
- Security Officer: [Name] - [Email] - [Phone]
- System Administrator: [Name] - [Email] - [Phone]
- Legal Counsel: [Name] - [Email] - [Phone]

### Incident Response Steps:
1. **Detect**: Monitor logs, user reports, system alerts
2. **Contain**: Disable affected accounts, isolate systems
3. **Assess**: Determine scope and impact
4. **Notify**: Inform security officer within 1 hour
5. **Remediate**: Fix vulnerability, restore from backup
6. **Document**: Complete incident report
7. **Review**: Conduct post-incident review

---

## 📚 References & Resources

- **HIPAA Security Rule**: https://www.hhs.gov/hipaa/for-professionals/security/
- **NIST Encryption Guidelines**: https://csrc.nist.gov/publications/
- **Django Security**: https://docs.djangoproject.com/en/4.2/topics/security/
- **OWASP Healthcare**: https://owasp.org/www-project-healthcare-security/
- **django-encrypted-model-fields**: https://pypi.org/project/django-encrypted-model-fields/

---

## 🏁 Next Steps

1. Review this plan with security officer and legal team
2. Obtain necessary approvals and budget
3. Schedule implementation sprints
4. Assign tasks to development team
5. Set up security audit schedule
6. Begin Phase 1 implementation

---

**Remember: Security is not a one-time project. It's an ongoing process.**

*Last Updated: February 5, 2026*
*Next Review: May 5, 2026*
