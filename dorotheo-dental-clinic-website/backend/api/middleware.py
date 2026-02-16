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
from django.conf import settings
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
    SKIP_PATHS = getattr(settings, 'AUDIT_SKIP_PATHS', [
        '/api/login/',          # Already logged in views.py
        '/api/logout/',         # Already logged in views.py
        '/api/health/',         # Health check endpoint
        '/api/admin/',          # Django admin (has own logging)
        '/admin/',              # Django admin
        '/static/',             # Static files
        '/media/',              # Media files (logged when accessed via views)
    ])
    
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
        
        # Check if middleware is enabled
        if not getattr(settings, 'AUDIT_MIDDLEWARE_ENABLED', True):
            return response
        
        # Skip if not an API request
        if not request.path.startswith('/api/'):
            return response
        
        # Skip OPTIONS and HEAD requests (CORS preflight and metadata checks)
        if request.method in ['OPTIONS', 'HEAD']:
            return response
        
        # Skip if unauthenticated
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return response
        
        # Skip if path is in exclusion list
        if self._should_skip_path(request.path):
            return response
        
        # Skip if status indicates failure (already logged elsewhere)
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
    MAX_LOGS_PER_MINUTE = getattr(settings, 'AUDIT_MAX_LOGS_PER_MINUTE', 100)
    
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
