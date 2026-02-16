"""
HIPAA-Compliant Audit Logging Service

This module provides centralized functions for creating audit log entries
throughout the dental clinic management system.

Key Features:
- Extracts client IP and user agent information from requests
- Sanitizes sensitive data (passwords, tokens, etc.) before logging
- Creates audit log entries with proper error handling
- Ensures audit logging never crashes the main application

Security: All functions automatically strip sensitive fields like passwords,
tokens, and authentication credentials before logging.
"""

from django.core.exceptions import ValidationError
from django.forms.models import model_to_dict
from django.conf import settings
import logging
import concurrent.futures
import threading

logger = logging.getLogger(__name__)

# Thread pool executor for async audit logging (max 2 workers to avoid database contention)
_audit_executor = concurrent.futures.ThreadPoolExecutor(max_workers=2, thread_name_prefix='audit_log')

# Sensitive fields that should NEVER be logged
# These are stripped from all audit log data to comply with HIPAA security requirements
SENSITIVE_FIELDS = {
    'password', 'passwd', 'pwd', 'password1', 'password2',
    'auth_token', 'token', 'access_token', 'refresh_token',
    'api_key', 'secret_key', 'private_key', 'secret',
    'session_key', 'csrfmiddlewaretoken', 'csrf_token',
    'ssn', 'social_security_number',
    'credit_card', 'card_number', 'cvv', 'cvc',
}


def get_client_ip(request):
    """
    Extract client IP address from Django request object.
    
    Handles both direct connections and requests behind proxies/load balancers.
    Checks X-Forwarded-For header first (for proxied requests), then falls back
    to REMOTE_ADDR.
    
    Args:
        request: Django HttpRequest object
    
    Returns:
        str: IP address as string (e.g., '192.168.1.1'), or 'Unknown' if not available
    
    Example:
        >>> ip = get_client_ip(request)
        >>> print(f"Request from: {ip}")
        Request from: 192.168.1.100
    """
    # Check X-Forwarded-For header (set by proxies/load balancers)
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2, ...)
        # The first IP is the original client
        ip = x_forwarded_for.split(',')[0].strip()
        return ip
    
    # Fallback to REMOTE_ADDR (direct connection)
    ip = request.META.get('REMOTE_ADDR', 'Unknown')
    return ip


def get_user_agent(request):
    """
    Extract user agent string from Django request object.
    
    The user agent identifies the browser/client making the request.
    Truncated to 500 characters to fit database field constraints.
    
    Args:
        request: Django HttpRequest object
    
    Returns:
        str: User agent string (max 500 chars), or empty string if not available
    
    Example:
        >>> ua = get_user_agent(request)
        >>> print(f"Client: {ua}")
        Client: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0
    """
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    # Truncate to 500 characters to match database field size
    if len(user_agent) > 500:
        user_agent = user_agent[:500]
    
    return user_agent


def sanitize_data(data):
    """
    Remove sensitive fields from a dictionary before audit logging.
    
    This function recursively removes passwords, tokens, and other sensitive
    information from dictionaries to ensure they are never stored in audit logs.
    This is critical for HIPAA compliance and security.
    
    Args:
        data: Dictionary to sanitize, or None
    
    Returns:
        dict: Clean copy of data with sensitive fields removed, or None if input was None
    
    Security:
        The following fields are automatically removed:
        - Passwords: password, passwd, pwd, password1, password2
        - Auth tokens: token, auth_token, access_token, refresh_token
        - API keys: api_key, secret_key, private_key, secret
        - Session data: session_key, csrfmiddlewaretoken, csrf_token
        - PII: ssn, social_security_number, credit_card, card_number, cvv
    
    Example:
        >>> user_data = {'username': 'john', 'password': 'secret123', 'email': 'john@example.com'}
        >>> clean_data = sanitize_data(user_data)
        >>> print(clean_data)
        {'username': 'john', 'email': 'john@example.com'}  # password removed
    """
    if data is None:
        return None
    
    if not isinstance(data, dict):
        return data
    
    # Create a copy to avoid modifying the original
    sanitized = {}
    
    for key, value in data.items():
        # Check if the key (case-insensitive) is in sensitive fields
        if key.lower() in SENSITIVE_FIELDS:
            # Replace sensitive value with a marker
            sanitized[key] = '[REDACTED]'
        elif isinstance(value, dict):
            # Recursively sanitize nested dictionaries
            sanitized[key] = sanitize_data(value)
        elif isinstance(value, list):
            # Sanitize lists of dictionaries
            sanitized[key] = [
                sanitize_data(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            # Keep non-sensitive values as-is
            sanitized[key] = value
    
    return sanitized


def _write_audit_log_entry(actor_id, action_type, target_table, target_record_id, 
                           patient_id_val, ip_address, user_agent, changes, reason):
    """
    Internal function that performs the actual database write for audit logs.
    This runs in a background thread when async logging is enabled.
    
    Args:
        actor_id: ID of User who performed the action (can be None)
        action_type: Action type string
        target_table: Name of the model/table affected
        target_record_id: ID of the specific record affected
        patient_id_val: ID of patient User (can be None)
        ip_address: IP address string
        user_agent: User agent string
        changes: Dictionary of changes (pre-sanitized)
        reason: String justification
    
    Returns:
        AuditLog: The created audit log instance, or None if creation failed
    """
    import time
    max_retries = 3
    retry_delay = 0.1  # 100ms
    
    for attempt in range(max_retries):
        try:
            # Import here to avoid circular dependency
            from api.models import AuditLog
            from django import db
            from django.db import OperationalError, IntegrityError
            from django.contrib.auth import get_user_model
            
            # Close old database connections (important for thread safety)
            db.close_old_connections()
            
            # Use _id suffix to assign ForeignKey by ID without fetching objects
            # This avoids SELECT queries that can cause SQLite table locks in tests
            audit_log = AuditLog.objects.create(
                actor_id=actor_id,  # Direct ID assignment
                action_type=action_type,
                target_table=target_table,
                target_record_id=target_record_id,
                patient_id_id=patient_id_val,  # Note: patient_id field uses _id suffix
                ip_address=ip_address,
                user_agent=user_agent,
                changes=changes,
                reason=reason
            )
            
            logger.debug(f"Audit log created: {action_type} on {target_table}:{target_record_id} by actor_id={actor_id}")
            return audit_log
        
        except IntegrityError as e:
            if 'FOREIGN KEY constraint failed' in str(e):
                # In async/threaded context, the referenced user might not be visible yet
                # due to transaction isolation (especially in tests)
                User = get_user_model()
                
                # Check if actor exists in this thread's database connection
                if actor_id and not User.objects.filter(id=actor_id).exists():
                    logger.warning(
                        f"Cannot create audit log: actor_id={actor_id} does not exist in worker thread. "
                        f"This can happen in tests with async logging due to transaction isolation."
                    )
                    return None
                
                # Check if patient exists
                if patient_id_val and not User.objects.filter(id=patient_id_val).exists():
                    logger.warning(
                        f"Cannot create audit log: patient_id={patient_id_val} does not exist in worker thread. "
                        f"This can happen in tests with async logging due to transaction isolation."
                    )
                    return None
                
                # If both exist but we still got IntegrityError, something else is wrong
                logger.error(
                    f"IntegrityError creating audit log even though foreign keys exist: {str(e)}",
                    exc_info=True
                )
                return None
            else:
                # Different IntegrityError (not foreign key)
                logger.error(f"IntegrityError creating audit log: {str(e)}", exc_info=True)
                return None
            
        except OperationalError as e:
            if 'database table is locked' in str(e) or 'database is locked' in str(e):
                # SQLite table lock - retry with exponential backoff
                if attempt < max_retries - 1:
                    wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                    logger.warning(f"SQLite lock detected, retrying in {wait_time}s (attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"Failed to create audit log after {max_retries} retries: {str(e)}")
                    return None
            else:
                # Not a lock error, don't retry
                logger.error(f"Failed to create audit log in worker thread: {str(e)}", exc_info=True)
                return None
                
        except Exception as e:
            # Log the error but don't crash the application
            logger.error(f"Failed to create audit log in worker thread: {str(e)}", exc_info=True)
            return None
        finally:
            # Close connections after thread work
            db.close_old_connections()
    
    return None


def create_audit_log(actor, action_type, target_table, target_record_id, **kwargs):
    """
    Create an audit log entry with proper error handling.
    
    This is the main function for creating audit logs. When async logging is enabled,
    it offloads the database write to a background thread, allowing the HTTP response
    to return immediately without waiting for the audit log to be written.
    
    This is the main function for creating audit logs. It handles all database
    operations and ensures that audit logging failures never crash the application.
    
    Args:
        actor: User instance who performed the action (can be None for failed logins)
        action_type: Action type string (must match AuditLog.ACTION_CHOICES)
        target_table: Name of the model/table affected (e.g., 'User', 'Appointment')
        target_record_id: ID of the specific record affected (can be None)
        **kwargs: Additional fields:
            - patient_id: User instance (patient whose data was accessed)
            - ip_address: IP address string
            - user_agent: User agent string
            - changes: Dictionary of before/after values (will be sanitized)
            - reason: String justification for the action
    
    Returns:
        AuditLog: The created audit log instance (sync mode), or None (async mode)
    
    Error Handling:
        - Automatically sanitizes 'changes' dictionary to remove sensitive data
        - Logs errors but never raises exceptions
        - Returns None if audit log creation fails
    
    Example:
        >>> from api.audit_service import create_audit_log
        >>> 
        >>> # Log a successful login
        >>> create_audit_log(
        ...     actor=user,
        ...     action_type='LOGIN_SUCCESS',
        ...     target_table='User',
        ...     target_record_id=user.id,
        ...     ip_address='192.168.1.100',
        ...     user_agent='Mozilla/5.0...',
        ...     changes={'login_method': 'username'}
        ... )
        >>> 
        >>> # Log a patient record update
        >>> create_audit_log(
        ...     actor=request.user,
        ...     action_type='UPDATE',
        ...     target_table='DentalRecord',
        ...     target_record_id=123,
        ...     patient_id=patient_user,
        ...     ip_address=get_client_ip(request),
        ...     user_agent=get_user_agent(request),
        ...     changes={'field_updated': 'diagnosis'},
        ...     reason='Updated after X-ray results'
        ... )
    """
    try:
        # Extract IDs in main thread (safer than passing model instances to threads)
        actor_id = actor.id if actor else None
        patient_id_val = kwargs.get('patient_id').id if kwargs.get('patient_id') else None
        
        # Sanitize changes dictionary in main thread (CPU work done before threading)
        changes = kwargs.get('changes')
        if changes:
            changes = sanitize_data(changes)
        else:
            changes = None
        
        # Extract other parameters
        ip_address = kwargs.get('ip_address')
        user_agent = kwargs.get('user_agent', '')
        reason = kwargs.get('reason', '')
        
        # Check if async logging is enabled
        async_enabled = getattr(settings, 'AUDIT_ASYNC_LOGGING', False)
        
        if async_enabled:
            # Submit to thread pool for non-blocking write
            _audit_executor.submit(
                _write_audit_log_entry,
                actor_id, action_type, target_table, target_record_id,
                patient_id_val, ip_address, user_agent, changes, reason
            )
            # Return None immediately (fire-and-forget)
            return None
        else:
            # Synchronous mode - call directly and return result
            return _write_audit_log_entry(
                actor_id, action_type, target_table, target_record_id,
                patient_id_val, ip_address, user_agent, changes, reason
            )
        
    except Exception as e:
        # Log the error but don't crash the application
        # Audit logging should never prevent normal operations
        logger.error(f"Failed to create audit log: {str(e)}", exc_info=True)
        return None


def log_model_change(actor, action, instance, old_data=None, request=None, reason=''):
    """
    High-level function for logging model changes with full context.
    
    This function automatically extracts model information, IP address, and user agent,
    making it easy to log changes from views and viewsets.
    
    Args:
        actor: User instance who performed the action
        action: Action type string ('CREATE', 'UPDATE', 'DELETE', 'READ')
        instance: The model instance that was changed
        old_data: Dictionary of old values (for UPDATE actions, optional)
        request: Django HttpRequest object (optional, for IP/user agent extraction)
        reason: String justification for the change (optional)
    
    Returns:
        AuditLog: The created audit log instance, or None if creation failed
    
    Example:
        >>> from api.audit_service import log_model_change
        >>> 
        >>> # Log appointment creation
        >>> appointment = Appointment.objects.create(...)
        >>> log_model_change(
        ...     actor=request.user,
        ...     action='CREATE',
        ...     instance=appointment,
        ...     request=request,
        ...     reason='Created by patient via booking form'
        ... )
        >>> 
        >>> # Log dental record update
        >>> old_diagnosis = dental_record.diagnosis
        >>> dental_record.diagnosis = 'New diagnosis'
        >>> dental_record.save()
        >>> log_model_change(
        ...     actor=request.user,
        ...     action='UPDATE',
        ...     instance=dental_record,
        ...     old_data={'diagnosis': old_diagnosis},
        ...     request=request,
        ...     reason='Updated after consultation'
        ... )
    """
    try:
        # Get model name and ID
        target_table = instance.__class__.__name__
        target_record_id = instance.pk
        
        # Determine if this involves a patient
        patient_id = None
        if hasattr(instance, 'patient'):
            patient_id = instance.patient
        elif hasattr(instance, 'user_type') and instance.user_type == 'patient':
            # The instance itself is a patient
            patient_id = instance
        
        # Extract IP and user agent if request is provided
        ip_address = None
        user_agent = ''
        if request:
            ip_address = get_client_ip(request)
            user_agent = get_user_agent(request)
        
        # Build changes dictionary
        changes = {}
        if action == 'UPDATE' and old_data:
            changes = {'old_values': old_data}
        elif action == 'CREATE':
            # For creates, optionally log key fields (but not full record)
            changes = {'action': 'created'}
        elif action == 'DELETE':
            changes = {'action': 'deleted'}
        
        # Create the audit log
        return create_audit_log(
            actor=actor,
            action_type=action,
            target_table=target_table,
            target_record_id=target_record_id,
            patient_id=patient_id,
            ip_address=ip_address,
            user_agent=user_agent,
            changes=changes,
            reason=reason
        )
        
    except Exception as e:
        logger.error(f"Failed to log model change: {str(e)}", exc_info=True)
        return None
