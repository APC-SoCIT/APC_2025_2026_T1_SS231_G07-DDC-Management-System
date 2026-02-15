# Phase 4: Middleware & Admin Interface
## Audit Controls Implementation - Week 4

**Estimated Duration:** 5-7 days  
**Prerequisites:** Phases 1, 2, and 3 completed  
**Goal:** Comprehensive audit coverage with middleware + admin interface for log management

---

## 🎯 Phase Overview

Phase 4 completes the audit system with two major components:
1. **Middleware** for automatic request tracking (catches everything)
2. **Admin Interface** for viewing, filtering, and exporting audit logs

**What You'll Build:**
- ✅ Global audit middleware for API request tracking
- ✅ Django admin interface for audit logs
- ✅ Advanced filtering and search capabilities
- ✅ Audit log export functionality (CSV/JSON)
- ✅ Management commands for log cleanup and maintenance
- ✅ Dashboard with audit statistics
- ✅ Optional: Async logging with Celery for performance

---

## 📋 Task Checklist

- [ ] Task 4.1: Create audit middleware
- [ ] Task 4.2: Configure middleware in settings
- [ ] Task 4.3: Create admin interface for audit logs
- [ ] Task 4.4: Add filtering and search
- [ ] Task 4.5: Implement log export functionality
- [ ] Task 4.6: Create cleanup management command
- [ ] Task 4.7: Add audit statistics dashboard
- [ ] Task 4.8: Optional - Implement async logging with Celery

---

## 🔨 Task 4.1: Create Audit Middleware

### Context
Middleware sits between the web server and your Django views, intercepting all requests. This provides a safety net to catch any requests that might not have explicit audit logging.

### LLM Prompt

```
TASK: Create global audit middleware to track all API requests

CONTEXT:
You have implemented audit logging in Phases 1-3 (login, model changes, READ operations). Phase 4 adds middleware as a final safety net to ensure NO request goes unlogged.

FILE TO CREATE: backend/api/middleware.py (NEW FILE)

REQUIREMENTS:

The middleware should:
1. Intercept all requests to /api/ endpoints
2. Only log authenticated requests
3. Store request method, path, user, IP, user agent
4. Log response status code
5. Skip logging for static files, health checks, and audit log admin
6. Use async processing to minimize performance impact
7. Handle exceptions gracefully (never crash requests)

STRATEGIC DECISION:
- **Option A:** Log ALL requests (comprehensive but noisy)
- **Option B:** Log only requests not already covered by signals/decorators (reduces duplication)

RECOMMENDED: **Option B** - Skip if a request is covered by existing logging

COMPLETE MIDDLEWARE IMPLEMENTATION:

```python
"""
Audit middleware for comprehensive request tracking.

This middleware provides a safety net to ensure all API access is logged.
It runs AFTER signals and decorators, so it can detect and skip requests
that are already logged to avoid duplication.

Priority: This is the LAST line of defense for audit coverage.
"""

import time
import logging
from django.utils.deprecation import MiddlewareMixin
from django.urls import resolve
from api.models import AuditLog
from api.audit_service import get_client_ip, get_user_agent, create_audit_log

logger = logging.getLogger(__name__)


class AuditMiddleware(MiddlewareMixin):
    """
    Middleware to track all API requests for HIPAA compliance.
    
    This middleware logs requests that aren't already captured by
    signal handlers or view decorators. It acts as a safety net.
    """
    
    # Endpoints to skip (already logged elsewhere or not sensitive)
    SKIP_PATHS = [
        '/api/login/',          # Already logged in views.py
        '/api/logout/',         # Already logged in views.py
        '/api/health/',         # Health check endpoint
        '/api/admin/',          # Django admin (has own logging)
        '/static/',             # Static files
        '/media/',              # Media files (logged when accessed via views)
    ]
    
    # Actions that are already logged by signals/decorators
    ACTIONS_WITH_EXISTING_LOGGING = {
        'POST': True,    # CREATE - logged by signals
        'PUT': True,     # UPDATE - logged by signals
        'PATCH': True,   # UPDATE - logged by signals
        'DELETE': True,  # DELETE - logged by signals
        'GET': False,    # READ - may or may not be logged by decorators
    }
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """Store request start time for latency measurement."""
        request._audit_start_time = time.time()
        return None
    
    def process_response(self, request, response):
        """Log request after response is generated."""
        
        # Skip if not an API request
        if not request.path.startswith('/api/'):
            return response
        
        # Skip if unauthenticated
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return response
        
        # Skip if path is in exclusion list
        if self._should_skip_path(request.path):
            return response
        
        # Skip if status indicates failure (already not logged by other means)
        if response.status_code >= 400:
            # Still log authentication failures if not already logged
            if response.status_code == 401 and not self._is_login_endpoint(request.path):
                self._log_request(request, response, 'ACCESS_DENIED')
            return response
        
        # Check if this request is already logged
        if self._is_already_logged(request, response):
            return response
        
        # Log the request
        self._log_request(request, response, 'API_REQUEST')
        
        return response
    
    def _should_skip_path(self, path):
        """Check if path should be excluded from logging."""
        for skip_path in self.SKIP_PATHS:
            if path.startswith(skip_path):
                return True
        return False
    
    def _is_login_endpoint(self, path):
        """Check if this is a login/logout endpoint."""
        return path in ['/api/login/', '/api/logout/', '/api/register/']
    
    def _is_already_logged(self, request, response):
        """
        Determine if this request was already logged by signals or decorators.
        
        Strategy:
        - POST/PUT/PATCH/DELETE are logged by signals → skip
        - GET requests to detail endpoints (e.g., /api/users/123/) are logged by decorators
        - GET requests to list endpoints (e.g., /api/users/) are NOT logged → log them
        """
        method = request.method
        
        # Modifications are always logged by signals
        if method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return True
        
        # GET requests: check if it's a detail view (has decorators) or list view (no logging)
        if method == 'GET':
            return self._is_detail_view(request)
        
        return False
    
    def _is_detail_view(self, request):
        """
        Check if GET request is for a detail view (logged by decorator) or list view (not logged).
        
        Detail views have URLs like: /api/users/123/
        List views have URLs like: /api/users/
        """
        try:
            # Resolve the URL to get view name and kwargs
            resolver_match = resolve(request.path)
            
            # If URL has a 'pk' or 'id' parameter, it's a detail view
            if 'pk' in resolver_match.kwargs or 'id' in resolver_match.kwargs:
                return True  # Detail view - already logged by decorator
            
            # Check if it's a custom action with detail=True
            # (These are handled by decorators on specific actions)
            if hasattr(resolver_match, 'url_name') and resolver_match.url_name:
                # Custom actions like /api/users/123/export_records/
                # are logged by decorators
                if '/' in request.path.strip('/').split('/')[-1]:
                    return True
            
        except Exception as e:
            logger.debug(f"Could not resolve URL for audit check: {e}")
        
        return False  # List view or undetermined - should be logged
    
    def _log_request(self, request, response, action_type='API_REQUEST'):
        """Create audit log entry for request."""
        
        # Calculate request duration
        duration_ms = 0
        if hasattr(request, '_audit_start_time'):
            duration_ms = int((time.time() - request._audit_start_time) * 1000)
        
        # Extract target information from URL
        target_table = self._extract_target_table(request.path)
        target_record_id = self._extract_record_id(request.path)
        patient_id = None  # Middleware doesn't have context to determine patient
        
        # Build changes field with request metadata
        changes = {
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration_ms': duration_ms,
        }
        
        # Add query parameters if present
        if request.GET:
            changes['query_params'] = dict(request.GET)
        
        # Add request body for non-GET requests (sanitized)
        if request.method != 'GET' and hasattr(request, 'data'):
            from api.audit_service import sanitize_data
            try:
                changes['request_body'] = sanitize_data(dict(request.data))
            except:
                pass
        
        try:
            create_audit_log(
                actor=request.user,
                action_type=action_type,
                target_table=target_table or 'API',
                target_record_id=target_record_id or 0,
                patient_id=patient_id,
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                changes=changes
            )
        except Exception as e:
            logger.error(f"Middleware failed to create audit log: {e}")
    
    def _extract_target_table(self, path):
        """Extract model name from URL path."""
        # Examples:
        # /api/users/123/ → User
        # /api/appointments/456/ → Appointment
        # /api/dental-records/789/ → DentalRecord
        
        parts = path.strip('/').split('/')
        if len(parts) >= 2 and parts[0] == 'api':
            resource = parts[1]
            
            # Map URL paths to model names
            mapping = {
                'users': 'User',
                'appointments': 'Appointment',
                'dental-records': 'DentalRecord',
                'billing': 'Billing',
                'invoices': 'Invoice',
                'documents': 'Document',
                'services': 'Service',
                'inventory': 'InventoryItem',
            }
            
            return mapping.get(resource, resource.title())
        
        return None
    
    def _extract_record_id(self, path):
        """Extract record ID from URL path."""
        # Examples:
        # /api/users/123/ → 123
        # /api/users/123/appointments/ → 123
        
        parts = path.strip('/').split('/')
        
        # Look for numeric parts (record IDs)
        for part in parts:
            if part.isdigit():
                return int(part)
        
        return None


class AuditThrottleMiddleware(MiddlewareMixin):
    """
    Optional: Rate limit audit log creation to prevent DoS on audit database.
    
    This middleware tracks audit log creation rate and blocks excessive logging
    from single IPs or users.
    """
    
    # Maximum audit logs per user per minute
    MAX_LOGS_PER_MINUTE = 100
    
    # In-memory cache of recent log counts (use Redis in production)
    _log_counts = {}
    
    def process_response(self, request, response):
        """Check if user is exceeding audit log limits."""
        
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return response
        
        # Check current rate
        user_key = f"audit_rate_{request.user.id}"
        current_count = self._log_counts.get(user_key, 0)
        
        if current_count > self.MAX_LOGS_PER_MINUTE:
            logger.warning(f"User {request.user.id} exceeding audit log rate limit")
            # Don't block request, just stop logging
            return response
        
        # Increment count
        self._log_counts[user_key] = current_count + 1
        
        return response
```

PERFORMANCE OPTIMIZATION:

For high-traffic applications, implement async logging:

```python
# In middleware.py, add at top:
from django.conf import settings

# In _log_request method:
def _log_request(self, request, response, action_type='API_REQUEST'):
    # ... build changes dict ...
    
    # Check if async logging is enabled
    if getattr(settings, 'AUDIT_ASYNC_LOGGING', False):
        # Defer to Celery task (implemented in Task 4.8)
        from api.tasks import create_audit_log_async
        create_audit_log_async.delay(
            actor_id=request.user.id,
            action_type=action_type,
            # ... rest of parameters ...
        )
    else:
        # Synchronous logging
        create_audit_log(
            actor=request.user,
            action_type=action_type,
            # ... rest of parameters ...
        )
```

VALIDATION:

After creating middleware:
1. Check for syntax errors: `python manage.py check`
2. Import test: `python manage.py shell` → `from api.middleware import AuditMiddleware`
3. Verify class inherits from MiddlewareMixin
4. Ensure all methods return proper values
```

---

## 🔨 Task 4.2: Configure Middleware in Settings

### LLM Prompt

```
TASK: Register audit middleware in Django settings

CONTEXT:
You created AuditMiddleware in Task 4.1. Now register it in settings.py so Django loads it.

FILE TO MODIFY: backend/dental_clinic/settings.py

LOCATION: Find the MIDDLEWARE list (around line 38-50)

REQUIREMENTS:

The middleware should be placed AFTER authentication middleware but BEFORE any response-processing middleware.

CURRENT MIDDLEWARE (approximately):
```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

MODIFIED MIDDLEWARE:
```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    # ADD AUDIT MIDDLEWARE HERE (after authentication)
    'api.middleware.AuditMiddleware',  # Must be after AuthenticationMiddleware
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

WHY THIS POSITION:
- ✅ **After AuthenticationMiddleware** - needs request.user to be set
- ✅ **Before MessageMiddleware** - processes before response modifications
- ✅ **After CSRF/Common** - request has been properly processed

OPTIONAL CONFIGURATION:

Add these settings at the end of settings.py:

```python
# ============================================
# AUDIT LOGGING CONFIGURATION
# ============================================

# Enable/disable audit middleware globally
AUDIT_MIDDLEWARE_ENABLED = True

# Enable async logging (requires Celery)
AUDIT_ASYNC_LOGGING = False  # Set to True after implementing Celery in Task 4.8

# Audit log retention period (days)
AUDIT_LOG_RETENTION_DAYS = 365 * 6  # 6 years for HIPAA compliance

# Rate limiting (logs per user per minute)
AUDIT_MAX_LOGS_PER_MINUTE = 100

# Paths to exclude from middleware logging
AUDIT_SKIP_PATHS = [
    '/api/login/',
    '/api/logout/',
    '/api/health/',
    '/admin/',
    '/static/',
    '/media/',
]
```

UPDATE MIDDLEWARE TO USE SETTINGS:

Modify middleware.py to read from settings:

```python
# At top of middleware.py
from django.conf import settings

class AuditMiddleware(MiddlewareMixin):
    # Read skip paths from settings
    SKIP_PATHS = getattr(settings, 'AUDIT_SKIP_PATHS', [
        '/api/login/',
        '/api/logout/',
        # ... defaults ...
    ])
    
    def process_response(self, request, response):
        # Check if middleware is enabled
        if not getattr(settings, 'AUDIT_MIDDLEWARE_ENABLED', True):
            return response
        
        # ... rest of method ...
```

VALIDATION:

1. Start server: `python manage.py runserver`
2. Check console for errors during startup
3. Make an API request: `curl http://localhost:8000/api/users/`
4. Check audit logs: `SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 5;`
5. Verify middleware is capturing requests

TEST MIDDLEWARE ORDERING:

```python
# In Django shell
from django.conf import settings
print(settings.MIDDLEWARE)
# Verify AuditMiddleware appears after AuthenticationMiddleware
```

TROUBLESHOOTING:

If middleware causes errors:
- **"User object has no attribute 'is_authenticated'"** → Middleware is before AuthenticationMiddleware
- **"AuditMiddleware not found"** → Check the import path matches your file structure
- **Performance issues** → Enable async logging (Task 4.8)
```

---

## 🔨 Task 4.3: Create Admin Interface for Audit Logs

### LLM Prompt

```
TASK: Create Django admin interface for viewing and managing audit logs

CONTEXT:
You have audit logs being created by signals, decorators, and middleware. Now create an admin interface so owners can review audit trails for compliance and security monitoring.

FILE TO MODIFY: backend/api/admin.py

REQUIREMENTS:

Create a comprehensive admin interface with:
1. List view with key fields (actor, action, timestamp, patient, IP)
2. Filtering by action type, date range, user, patient
3. Search by user, patient ID, IP address
4. Read-only fields (no editing audit logs)
5. Custom display methods for better readability
6. Export to CSV functionality
7. Pagination for performance
8. Custom permissions (only owner/admin can view)

COMPLETE ADMIN IMPLEMENTATION:

```python
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.http import HttpResponse
from django.utils import timezone
from api.models import AuditLog, User
import csv
import json


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """
    Django admin interface for audit logs.
    
    Provides read-only access to audit records with filtering,
    search, and export capabilities for compliance reviews.
    """
    
    # ===== LIST VIEW CONFIGURATION =====
    
    list_display = [
        'timestamp_formatted',
        'actor_link',
        'action_type_badge',
        'target_info',
        'patient_link',
        'ip_address',
        'status_indicator',
    ]
    
    list_filter = [
        'action_type',
        'target_table',
        ('timestamp', admin.DateFieldListFilter),
        'actor',
    ]
    
    search_fields = [
        'actor__username',
        'actor__email',
        'actor__first_name',
        'actor__last_name',
        'patient_id',
        'ip_address',
        'target_table',
        'target_record_id',
    ]
    
    date_hierarchy = 'timestamp'
    
    ordering = ['-timestamp']
    
    list_per_page = 50
    
    # ===== DETAIL VIEW CONFIGURATION =====
    
    fieldsets = (
        ('Action Information', {
            'fields': ('action_type', 'timestamp', 'actor', 'reason')
        }),
        ('Target Information', {
            'fields': ('target_table', 'target_record_id', 'patient_id')
        }),
        ('Request Context', {
            'fields': ('ip_address', 'user_agent')
        }),
        ('Changes (JSON)', {
            'fields': ('changes_formatted',),
            'classes': ('collapse',),
        }),
    )
    
    readonly_fields = [
        'timestamp',
        'actor',
        'action_type',
        'target_table',
        'target_record_id',
        'patient_id',
        'ip_address',
        'user_agent',
        'changes_formatted',
        'reason',
    ]
    
    # ===== CUSTOM DISPLAY METHODS =====
    
    def timestamp_formatted(self, obj):
        """Display timestamp in readable format."""
        local_time = timezone.localtime(obj.timestamp)
        return local_time.strftime('%Y-%m-%d %H:%M:%S')
    timestamp_formatted.short_description = 'Time'
    timestamp_formatted.admin_order_field = 'timestamp'
    
    def actor_link(self, obj):
        """Display actor as link to user admin."""
        if obj.actor:
            url = reverse('admin:api_user_change', args=[obj.actor.id])
            return format_html(
                '<a href="{}">{}</a>',
                url,
                obj.actor.get_full_name() or obj.actor.username
            )
        return format_html('<em>System</em>')
    actor_link.short_description = 'Actor'
    actor_link.admin_order_field = 'actor'
    
    def action_type_badge(self, obj):
        """Display action type with color badge."""
        colors = {
            'CREATE': '#28a745',  # Green
            'READ': '#17a2b8',    # Blue
            'UPDATE': '#ffc107',  # Yellow
            'DELETE': '#dc3545',  # Red
            'LOGIN_SUCCESS': '#28a745',
            'LOGIN_FAILED': '#dc3545',
            'LOGOUT': '#6c757d',
            'EXPORT': '#fd7e14',  # Orange
        }
        color = colors.get(obj.action_type, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 8px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.action_type
        )
    action_type_badge.short_description = 'Action'
    action_type_badge.admin_order_field = 'action_type'
    
    def target_info(self, obj):
        """Display target table and record ID."""
        return f"{obj.target_table} #{obj.target_record_id}"
    target_info.short_description = 'Target'
    
    def patient_link(self, obj):
        """Display patient as link if available."""
        if obj.patient_id:
            try:
                patient = User.objects.get(id=obj.patient_id)
                url = reverse('admin:api_user_change', args=[patient.id])
                return format_html(
                    '<a href="{}">{}</a>',
                    url,
                    patient.get_full_name() or f"Patient #{patient.id}"
                )
            except User.DoesNotExist:
                return f"Patient #{obj.patient_id} (deleted)"
        return '-'
    patient_link.short_description = 'Patient'
    
    def status_indicator(self, obj):
        """Visual indicator for successful/failed operations."""
        # Check if there's a status code in changes
        status_code = None
        if obj.changes and isinstance(obj.changes, dict):
            status_code = obj.changes.get('status_code')
        
        if obj.action_type == 'LOGIN_FAILED':
            return format_html('<span style="color: red;">❌ Failed</span>')
        elif status_code and status_code >= 400:
            return format_html('<span style="color: orange;">⚠️ Error</span>')
        else:
            return format_html('<span style="color: green;">✓ Success</span>')
    status_indicator.short_description = 'Status'
    
    def changes_formatted(self, obj):
        """Display changes as formatted JSON."""
        if obj.changes:
            formatted = json.dumps(obj.changes, indent=2)
            return format_html('<pre>{}</pre>', formatted)
        return '-'
    changes_formatted.short_description = 'Changes'
    
    # ===== PERMISSIONS =====
    
    def has_add_permission(self, request):
        """Audit logs cannot be manually created."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Audit logs cannot be edited."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Audit logs cannot be deleted manually."""
        return False
    
    def has_view_permission(self, request, obj=None):
        """Only allow owners and superusers to view audit logs."""
        return request.user.is_superuser or request.user.user_type == 'owner'
    
    # ===== ACTIONS =====
    
    actions = ['export_as_csv', 'export_for_patient']
    
    def export_as_csv(self, request, queryset):
        """Export selected audit logs as CSV file."""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="audit_logs_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Timestamp',
            'Actor',
            'Action',
            'Target Table',
            'Target Record ID',
            'Patient ID',
            'IP Address',
            'User Agent',
            'Changes'
        ])
        
        for log in queryset:
            writer.writerow([
                log.timestamp,
                log.actor.username if log.actor else 'System',
                log.action_type,
                log.target_table,
                log.target_record_id,
                log.patient_id or '',
                log.ip_address,
                log.user_agent,
                json.dumps(log.changes) if log.changes else ''
            ])
        
        return response
    export_as_csv.short_description = 'Export selected as CSV'
    
    def export_for_patient(self, request, queryset):
        """Export all audit logs for patients in selected records."""
        patient_ids = queryset.values_list('patient_id', flat=True).distinct()
        patient_ids = [pid for pid in patient_ids if pid]  # Remove None
        
        # Get all logs for these patients
        all_logs = AuditLog.objects.filter(patient_id__in=patient_ids).order_by('-timestamp')
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="patient_audit_logs_{timezone.now().strftime("%Y%m%d")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Patient ID', 'Timestamp', 'Actor', 'Action', 'Target', 'IP Address'])
        
        for log in all_logs:
            writer.writerow([
                log.patient_id,
                log.timestamp,
                log.actor.username if log.actor else 'System',
                log.action_type,
                f"{log.target_table}:{log.target_record_id}",
                log.ip_address
            ])
        
        self.message_user(request, f"Exported {all_logs.count()} audit logs for {len(patient_ids)} patients.")
        return response
    export_for_patient.short_description = 'Export full history for these patients'
```

REGISTER IN URLS (if not auto-discovered):

Ensure Django admin is enabled in urls.py:
```python
# In dental_clinic/urls.py
from django.contrib import admin

urlpatterns = [
    path('admin/', admin.site.urls),
    # ... other URLs ...
]
```

CUSTOMIZE ADMIN SITE:

Add to beginning of admin.py:
```python
# Customize admin site header
admin.site.site_header = "Dorotheo Dental Clinic - Audit Management"
admin.site.site_title = "Audit Logs"
admin.site.index_title = "HIPAA Compliance Audit System"
```

VALIDATION:

1. Run migrations: `python manage.py migrate`
2. Create superuser if needed: `python manage.py createsuperuser`
3. Start server: `python manage.py runserver`
4. Access admin: http://localhost:8000/admin/
5. Navigate to: Audit Log Entries
6. Verify:
   - ✅ Can view logs
   - ✅ Cannot add/edit/delete logs
   - ✅ Filtering works
   - ✅ Search works
   - ✅ Export CSV works
   - ✅ Colors and badges display correctly

SCREENSHOTS FOR DOCUMENTATION:
Take screenshots showing:
- List view with colored action badges
- Filtered view (e.g., all LOGIN_FAILED)
- Detail view with formatted JSON
- Export CSV functionality
```

---

## 🔨 Task 4.4: Create Management Command for Log Cleanup

### LLM Prompt

```
TASK: Create management command to clean up old audit logs per HIPAA retention policy

CONTEXT:
HIPAA requires 6 years of audit log retention, after which logs can be purged. Create a management command to automatically delete old logs.

FILE TO CREATE: backend/api/management/commands/cleanup_audit_logs.py (NEW FILE)

REQUIREMENTS:

The command should:
1. Delete audit logs older than 6 years (configurable)
2. Provide summary of deleted records
3. Support dry-run mode (preview without deleting)
4. Support date override for testing
5. Create a log of cleanup operations
6. Be safe (ask for confirmation in production)

COMPLETE COMMAND IMPLEMENTATION:

```python
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
```

SCHEDULE AUTOMATIC CLEANUP:

Create a scheduled task to run monthly:

**Windows (Task Scheduler):**
```powershell
# In backend/setup_audit_cleanup.ps1
$action = New-ScheduledTaskAction -Execute "python" -Argument "manage.py cleanup_audit_logs --force" -WorkingDirectory "C:\path\to\backend"
$trigger = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 1 -At 2am
Register-ScheduledTask -TaskName "Django Audit Cleanup" -Action $action -Trigger $trigger
```

**Linux (cron):**
```bash
# Add to crontab (crontab -e)
0 2 1 * * cd /path/to/backend && python manage.py cleanup_audit_logs --force >> /var/log/audit_cleanup.log 2>&1
```

**Railway/Production:**
```yaml
# In railway.toml or equivalent
[[schedules]]
  command = "python manage.py cleanup_audit_logs --force"
  schedule = "0 2 1 * *"  # Monthly at 2 AM
```

VALIDATION:

Test the command:
```bash
# 1. Dry run to preview
python manage.py cleanup_audit_logs --dry-run

# 2. Test with short retention (1 day) to see it work
python manage.py cleanup_audit_logs --days=1 --dry-run

# 3. Actual deletion with confirmation
python manage.py cleanup_audit_logs

# 4. Force mode (no confirmation)
python manage.py cleanup_audit_logs --force
```

Expected output:
```
============================================================
Audit Log Cleanup
============================================================
Retention period: 2190 days
Cutoff date: 2020-02-10 14:23:10
Mode: LIVE DELETION

Audit logs to be deleted:
Action Type          Count
--------------------------------
READ                   1,245
UPDATE                   823
CREATE                   456
LOGIN_SUCCESS            234
DELETE                    89
--------------------------------
TOTAL                  2,847

✓ Successfully deleted 2,847 audit log records.
```
```

---

## 🔨 Task 4.5: Add Audit Statistics Dashboard

### LLM Prompt

```
TASK: Create a simple statistics dashboard for audit log overview

CONTEXT:
Provide clinic owners with an at-a-glance view of audit activity for compliance monitoring.

OPTION 1 - Django Admin Dashboard (Simple):
Add custom admin views showing statistics.

OPTION 2 - API Endpoint (For Frontend Dashboard):
Create API endpoint that returns audit statistics.

RECOMMENDED: Implement BOTH

IMPLEMENTATION:

**OPTION 1 - Admin Dashboard View:**

```python
# Add to api/admin.py

from django.contrib import admin
from django.urls import path
from django.shortcuts import render
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from api.models import AuditLog


class AuditLogAdmin(admin.ModelAdmin):
    # ... existing admin code ...
    
    def get_urls(self):
        """Add custom URL for dashboard."""
        urls = super().get_urls()
        custom_urls = [
            path('dashboard/', self.admin_site.admin_view(self.dashboard_view), name='auditlog_dashboard'),
        ]
        return custom_urls + urls
    
    def dashboard_view(self, request):
        """Render audit statistics dashboard."""
        
        # Date ranges
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        # Total logs
        total_logs = AuditLog.objects.count()
        
        # Logs by time period
        logs_today = AuditLog.objects.filter(timestamp__gte=today_start).count()
        logs_this_week = AuditLog.objects.filter(timestamp__gte=week_ago).count()
        logs_this_month = AuditLog.objects.filter(timestamp__gte=month_ago).count()
        
        # Logs by action type (all time)
        logs_by_action = AuditLog.objects.values('action_type').annotate(
            count=Count('log_id')
        ).order_by('-count')
        
        # Failed login attempts (last 7 days)
        failed_logins = AuditLog.objects.filter(
            action_type='LOGIN_FAILED',
            timestamp__gte=week_ago
        ).count()
        
        # Most active users (last 30 days)
        top_users = AuditLog.objects.filter(
            timestamp__gte=month_ago
        ).values(
            'actor__username', 'actor__first_name', 'actor__last_name'
        ).annotate(
            action_count=Count('log_id')
        ).order_by('-action_count')[:10]
        
        # Most accessed patients (last 30 days)
        top_patients = AuditLog.objects.filter(
            timestamp__gte=month_ago,
            patient_id__isnull=False
        ).values('patient_id').annotate(
            access_count=Count('log_id')
        ).order_by('-access_count')[:10]
        
        # Suspicious activity indicators
        suspicious_activity = []
        
        # Check for unusual login patterns
        failed_login_by_ip = AuditLog.objects.filter(
            action_type='LOGIN_FAILED',
            timestamp__gte=week_ago
        ).values('ip_address').annotate(
            count=Count('log_id')
        ).filter(count__gte=5).order_by('-count')
        
        for item in failed_login_by_ip:
            suspicious_activity.append({
                'type': 'Multiple Failed Logins',
                'description': f"{item['count']} failed login attempts from {item['ip_address']}",
                'severity': 'high' if item['count'] >= 10 else 'medium'
            })
        
        # Check for after-hours access
        after_hours_logs = AuditLog.objects.filter(
            timestamp__gte=week_ago,
            action_type='READ'
        ).exclude(
            Q(timestamp__hour__gte=8) & Q(timestamp__hour__lt=18)
        ).count()
        
        if after_hours_logs > 50:
            suspicious_activity.append({
                'type': 'After-Hours Access',
                'description': f"{after_hours_logs} record accesses outside business hours (8 AM - 6 PM)",
                'severity': 'low'
            })
        
        # Prepare context
        context = {
            **self.admin_site.each_context(request),
            'title': 'Audit Log Dashboard',
            'total_logs': total_logs,
            'logs_today': logs_today,
            'logs_this_week': logs_this_week,
            'logs_this_month': logs_this_month,
            'logs_by_action': logs_by_action,
            'failed_logins': failed_logins,
            'top_users': top_users,
            'top_patients': top_patients,
            'suspicious_activity': suspicious_activity,
        }
        
        return render(request, 'admin/audit_dashboard.html', context)
```

**Dashboard Template:**

Create: `backend/templates/admin/audit_dashboard.html`

```html
{% extends "admin/base_site.html" %}
{% load static %}

{% block content %}
<h1>Audit Log Dashboard</h1>

<div class="dashboard-container">
    <!-- Summary Cards -->
    <div class="cards-row">
        <div class="stat-card">
            <h3>Total Audit Logs</h3>
            <div class="stat-number">{{ total_logs|default:"0" }}</div>
            <div class="stat-label">All Time</div>
        </div>
        
        <div class="stat-card">
            <h3>Today</h3>
            <div class="stat-number">{{ logs_today|default:"0" }}</div>
            <div class="stat-label">{{ logs_this_week|default:"0" }} this week</div>
        </div>
        
        <div class="stat-card">
            <h3>This Month</h3>
            <div class="stat-number">{{ logs_this_month|default:"0" }}</div>
            <div class="stat-label">Last 30 days</div>
        </div>
        
        <div class="stat-card {% if failed_logins > 0 %}warning{% endif %}">
            <h3>Failed Logins</h3>
            <div class="stat-number">{{ failed_logins|default:"0" }}</div>
            <div class="stat-label">Last 7 days</div>
        </div>
    </div>
    
    <!-- Charts Section -->
    <div class="charts-row">
        <div class="chart-card">
            <h3>Logs by Action Type</h3>
            <table class="action-stats">
                <thead>
                    <tr>
                        <th>Action</th>
                        <th>Count</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    {% for action in logs_by_action %}
                    <tr>
                        <td>{{ action.action_type }}</td>
                        <td>{{ action.count }}</td>
                        <td>{% widthratio action.count total_logs 100 %}%</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        
        <div class="chart-card">
            <h3>Most Active Users (30 days)</h3>
            <table class="user-stats">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {% for user in top_users %}
                    <tr>
                        <td>{{ user.actor__first_name }} {{ user.actor__last_name }}</td>
                        <td>{{ user.action_count }}</td>
                    </tr>
                    {% empty %}
                    <tr><td colspan="2">No data</td></tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
    </div>
    
    <!-- Suspicious Activity Section -->
    {% if suspicious_activity %}
    <div class="alert-section">
        <h3>⚠️ Suspicious Activity Detected</h3>
        {% for alert in suspicious_activity %}
        <div class="alert-item severity-{{ alert.severity }}">
            <strong>{{ alert.type }}:</strong> {{ alert.description }}
        </div>
        {% endfor %}
    </div>
    {% endif %}
</div>

<style>
.dashboard-container {
    padding: 20px;
}
.cards-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}
.stat-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
}
.stat-card.warning {
    border-color: #ffc107;
    background: #fff3cd;
}
.stat-number {
    font-size: 36px;
    font-weight: bold;
    color: #2196F3;
}
.stat-label {
    color: #666;
    margin-top: 10px;
}
.charts-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}
.chart-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
}
.action-stats, .user-stats {
    width: 100%;
    border-collapse: collapse;
}
.action-stats th, .user-stats th {
    background: #f5f5f5;
    padding: 10px;
    text-align: left;
}
.action-stats td, .user-stats td {
    padding: 8px;
    border-bottom: 1px solid #eee;
}
.alert-section {
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 8px;
    padding: 20px;
}
.alert-item {
    padding: 10px;
    margin: 10px 0;
    border-left: 4px solid #ffc107;
    background: white;
}
.alert-item.severity-high {
    border-left-color: #dc3545;
}
</style>
{% endblock %}
```

Add link to dashboard in admin index:

```python
# In admin.py, customize admin site
from django.contrib import admin

admin.site.index_template = 'admin/custom_index.html'
```

Create `backend/templates/admin/custom_index.html`:
```html
{% extends "admin/index.html" %}

{% block content %}
{{ block.super }}

<div style="margin: 20px 0;">
    <a href="{% url 'admin:auditlog_dashboard' %}" class="button" style="background: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
        📊 View Audit Dashboard
    </a>
</div>
{% endblock %}
```

**OPTION 2 - API Endpoint:**

Add to api/views.py:

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from api.models import AuditLog

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_statistics(request):
    """
    Get audit log statistics for dashboard.
    Only accessible by owners.
    """
    if request.user.user_type != 'owner':
        return Response({'error': 'Owner access required'}, status=403)
    
    now = timezone.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    stats = {
        'total_logs': AuditLog.objects.count(),
        'logs_this_week': AuditLog.objects.filter(timestamp__gte=week_ago).count(),
        'logs_this_month': AuditLog.objects.filter(timestamp__gte=month_ago).count(),
        'by_action_type': list(AuditLog.objects.values('action_type').annotate(count=Count('log_id'))),
        'failed_logins_week': AuditLog.objects.filter(
            action_type='LOGIN_FAILED',
            timestamp__gte=week_ago
        ).count(),
    }
    
    return Response(stats)

# Add to urls.py:
path('audit/statistics/', audit_statistics, name='audit_statistics'),
```

VALIDATION:

1. Access admin dashboard: http://localhost:8000/admin/api/auditlog/dashboard/
2. Verify statistics are displayed correctly
3. Check API endpoint: GET /api/audit/statistics/
4. Test with different date ranges
```

---

## 🔨 Task 4.6: Optional - Implement Async Logging with Celery

### Context
For high-traffic applications, synchronous audit logging can add 10-30ms to each request. Async logging with Celery eliminates this overhead.

### LLM Prompt

```
TASK: Set up async audit logging with Celery for improved performance

CONTEXT:
Your audit system works but may be slow under load. Celery allows you to defer audit log creation to background workers, making requests faster.

PREREQUISITES:
- Redis or RabbitMQ installed (message broker)
- Celery library installed

INSTALLATION:

```bash
pip install celery redis  # or 'celery[rabbitmq]'
```

Add to requirements.txt:
```
celery==5.3.4
redis==5.0.1
```

FILE TO CREATE: backend/dental_clinic/celery.py (NEW FILE)

```python
"""
Celery configuration for Django project.

This sets up Celery for async task processing, including
async audit log creation.
"""

import os
from celery import Celery

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')

# Create Celery app
app = Celery('dental_clinic')

# Load config from Django settings with CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all registered Django apps
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
    """Debug task to test Celery is working."""
    print(f'Request: {self.request!r}')
```

MODIFY: backend/dental_clinic/__init__.py

```python
# This will make sure the app is always imported when
# Django starts so that shared_task will use this app.
from .celery import app as celery_app

__all__ = ('celery_app',)
```

ADD CELERY SETTINGS: backend/dental_clinic/settings.py

```python
# ============================================
# CELERY CONFIGURATION
# ============================================

# Broker URL (Redis)
CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Result backend
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Task serialization
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'

# Timezone
CELERY_TIMEZONE = 'UTC'

# Task routing
CELERY_TASK_ROUTES = {
    'api.tasks.create_audit_log_async': {'queue': 'audit'},
}

# Enable async audit logging
AUDIT_ASYNC_LOGGING = False  # Set to True after testing
```

CREATE CELERY TASKS: backend/api/tasks.py (NEW FILE)

```python
"""
Celery tasks for async processing.

These tasks are executed by Celery workers in the background,
preventing them from blocking HTTP requests.
"""

from celery import shared_task
from api.models import AuditLog, User
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def create_audit_log_async(self, actor_id, action_type, target_table, target_record_id, 
                           patient_id=None, ip_address='0.0.0.0', user_agent='', 
                           changes=None, reason=''):
    """
    Create audit log entry asynchronously.
    
    This task is executed by a Celery worker, not in the request thread.
    Failures are retried up to 3 times.
    
    Args:
        actor_id: User ID performing the action (None for system)
        action_type: Type of action (CREATE, READ, UPDATE, etc.)
        target_table: Model name being accessed
        target_record_id: Primary key of affected record
        patient_id: Patient ID if applicable
        ip_address: Client IP address
        user_agent: Client user agent string
        changes: Dict of before/after or other metadata
        reason: Optional justification
    """
    try:
        # Get actor
        actor = None
        if actor_id:
            try:
                actor = User.objects.get(id=actor_id)
            except User.DoesNotExist:
                logger.warning(f"Actor {actor_id} not found for audit log")
        
        # Create audit log
        AuditLog.objects.create(
            actor=actor,
            action_type=action_type,
            target_table=target_table,
            target_record_id=target_record_id,
            patient_id=patient_id,
            ip_address=ip_address,
            user_agent=user_agent,
            changes=changes,
            reason=reason
        )
        
        logger.debug(f"Async audit log created: {action_type} on {target_table}:{target_record_id}")
        
    except Exception as exc:
        logger.error(f"Failed to create async audit log: {exc}")
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)


@shared_task
def cleanup_old_audit_logs():
    """
    Periodic task to clean up old audit logs.
    
    This task can be scheduled via Celery Beat to run monthly.
    """
    from django.core.management import call_command
    
    call_command('cleanup_audit_logs', '--force')
```

UPDATE AUDIT SERVICE: backend/api/audit_service.py

```python
from django.conf import settings

def create_audit_log(actor, action_type, target_table, target_record_id, **kwargs):
    """Create an audit log entry (sync or async based on settings)."""
    
    # Check if async logging is enabled
    if getattr(settings, 'AUDIT_ASYNC_LOGGING', False):
        # Use Celery task
        from api.tasks import create_audit_log_async
        
        create_audit_log_async.delay(
            actor_id=actor.id if actor else None,
            action_type=action_type,
            target_table=target_table,
            target_record_id=target_record_id,
            patient_id=kwargs.get('patient_id'),
            ip_address=kwargs.get('ip_address', '0.0.0.0'),
            user_agent=kwargs.get('user_agent', ''),
            changes=kwargs.get('changes'),
            reason=kwargs.get('reason', '')
        )
    else:
        # Synchronous creation (existing code)
        try:
            AuditLog.objects.create(
                actor=actor,
                action_type=action_type,
                target_table=target_table,
                target_record_id=target_record_id,
                **kwargs
            )
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
```

RUNNING CELERY:

Development:
```bash
# Terminal 1: Start Django
python manage.py runserver

# Terminal 2: Start Celery worker
celery -A dental_clinic worker -l info

# Terminal 3: Optional - Celery flower (monitoring)
celery -A dental_clinic flower
```

Production (Railway/similar):
```yaml
# In Procfile or railway.toml
web: gunicorn dental_clinic.wsgi
worker: celery -A dental_clinic worker -l info
```

TESTING:

1. Enable async logging in settings: `AUDIT_ASYNC_LOGGING = True`
2. Start Celery worker
3. Make an API request
4. Check Celery worker logs for task execution
5. Verify audit log was created in database

MONITORING:

Install Flower for Celery monitoring:
```bash
pip install flower
celery -A dental_clinic flower
# Access at http://localhost:5555
```

TROUBLESHOOTING:

- **"Connection refused"** → Redis not running: `redis-server`
- **Tasks not executing** → Worker not started
- **Tasks failing silently** → Check worker logs: `-l debug`
```

---

## 📊 Phase 4 Completion Criteria

You have successfully completed Phase 4 when:

- ✅ Audit middleware captures all API requests
- ✅ Middleware skips already-logged requests (no duplication)
- ✅ Admin interface displays audit logs with filtering/search
- ✅ Audit logs are read-only in admin (cannot be edited/deleted)
- ✅ CSV export functionality works
- ✅ Cleanup management command successfully removes old logs
- ✅ Dashboard shows audit statistics
- ✅ Optional: Async logging with Celery (for performance)
- ✅ Performance overhead < 5ms per request (with async logging)

---

## 🚀 Next Steps

Once Phase 4 is complete:
1. Review admin dashboard and verify statistics
2. Test management commands
3. Enable async logging if performance is a concern
4. Proceed to [PHASE_5_TESTING_VALIDATION.md](./PHASE_5_TESTING_VALIDATION.md)

---

**Phase 4 Status:** Ready for Implementation  
**Next Phase:** [PHASE_5_TESTING_VALIDATION.md](./PHASE_5_TESTING_VALIDATION.md)
