"""
Decorators for audit logging in views.

These decorators automatically create audit log entries for data access
operations, particularly READ operations required for HIPAA compliance.
"""

import functools
import logging
from django.core.exceptions import ObjectDoesNotExist
from api.models import AuditLog, User
from api.audit_service import create_audit_log, get_client_ip, get_user_agent

logger = logging.getLogger(__name__)


def log_patient_access(action_type='READ', target_table='User', extract_patient_id=None):
    """
    Decorator to log access to patient data.
    
    Args:
        action_type: Type of action (default: 'READ')
        target_table: Model name being accessed (default: 'User')
        extract_patient_id: Custom function to extract patient_id from request/view args
                           If None, attempts auto-detection from pk parameter
    
    Usage:
        @log_patient_access(action_type='READ', target_table='DentalRecord')
        def view_dental_record(request, pk):
            record = DentalRecord.objects.get(pk=pk)
            return Response(serialize(record))
        
        # For ViewSet methods:
        class UserViewSet(viewsets.ModelViewSet):
            @log_patient_access(action_type='READ', target_table='User')
            def retrieve(self, request, pk=None):
                # ... view logic ...
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(*args, **kwargs):
            # Execute the view function first
            response = view_func(*args, **kwargs)
            
            # Extract request and view arguments
            # For function-based views: view_func(request, ...)
            # For ViewSet methods: method(self, request, ...)
            if len(args) >= 2 and hasattr(args[0], 'request'):
                # ViewSet method: self, request
                request = args[1]
                pk = kwargs.get('pk')
            elif len(args) >= 1 and hasattr(args[0], 'user'):
                # Function-based view: request, pk
                request = args[0]
                pk = kwargs.get('pk') or kwargs.get('id')
            else:
                logger.warning("Could not extract request from view arguments")
                return response
            
            # Only log successful responses
            if hasattr(response, 'status_code') and response.status_code >= 400:
                return response
            
            # Skip logging for unauthenticated users
            if not request.user.is_authenticated:
                return response
            
            # Extract patient_id
            patient_id = None
            patient_instance = None
            target_record_id = None
            
            if extract_patient_id:
                # Use custom extraction function
                patient_id = extract_patient_id(request, args, kwargs)
                target_record_id = patient_id
            elif pk:
                # Auto-detect patient_id based on target_table
                target_record_id = pk
                patient_id = _auto_extract_patient_id(target_table, pk)
            
            # Convert patient_id to User instance if it's an integer
            if patient_id and isinstance(patient_id, int):
                try:
                    patient_instance = User.objects.get(pk=patient_id)
                except User.DoesNotExist:
                    patient_instance = None
            elif patient_id and isinstance(patient_id, User):
                patient_instance = patient_id
            
            # Create audit log
            try:
                create_audit_log(
                    actor=request.user,
                    action_type=action_type,
                    target_table=target_table,
                    target_record_id=target_record_id or 0,
                    patient_id=patient_instance,
                    ip_address=get_client_ip(request),
                    user_agent=get_user_agent(request),
                    changes={'endpoint': request.path, 'method': request.method}
                )
            except Exception as e:
                logger.error(f"Failed to create READ audit log: {e}")
            
            return response
        
        return wrapper
    return decorator


def _auto_extract_patient_id(target_table, record_id):
    """
    Automatically extract patient_id based on target table and record ID.
    
    Args:
        target_table: Model name (e.g., 'User', 'DentalRecord')
        record_id: Primary key of the record being accessed
        
    Returns:
        int or None: Patient ID if determinable
    """
    try:
        if target_table == 'User':
            # If accessing User record, check if it's a patient
            user = User.objects.get(pk=record_id)
            return user.id if user.user_type == 'patient' else None
        
        elif target_table == 'DentalRecord':
            from api.models import DentalRecord
            record = DentalRecord.objects.select_related('patient').get(pk=record_id)
            return record.patient.id if record.patient else None
        
        elif target_table == 'Appointment':
            from api.models import Appointment
            appt = Appointment.objects.select_related('patient').get(pk=record_id)
            return appt.patient.id if appt.patient else None
        
        elif target_table == 'Billing':
            from api.models import Billing
            billing = Billing.objects.select_related('patient').get(pk=record_id)
            return billing.patient.id if billing.patient else None
        
        elif target_table == 'Invoice':
            from api.models import Invoice
            invoice = Invoice.objects.select_related('appointment__patient').get(pk=record_id)
            return invoice.appointment.patient.id if invoice.appointment and invoice.appointment.patient else None
        
        elif target_table == 'Document':
            from api.models import Document
            doc = Document.objects.select_related('patient').get(pk=record_id)
            return doc.patient.id if doc.patient else None
        
        elif target_table == 'PatientIntakeForm':
            from api.models import PatientIntakeForm
            form = PatientIntakeForm.objects.select_related('patient').get(pk=record_id)
            return form.patient.id if form.patient else None
        
        elif target_table == 'ClinicalNote':
            from api.models import ClinicalNote
            note = ClinicalNote.objects.select_related('patient').get(pk=record_id)
            return note.patient.id if note.patient else None
        
        elif target_table == 'TeethImage':
            from api.models import TeethImage
            image = TeethImage.objects.select_related('patient').get(pk=record_id)
            return image.patient.id if image.patient else None
        
        elif target_table == 'TreatmentPlan':
            from api.models import TreatmentPlan
            plan = TreatmentPlan.objects.select_related('patient').get(pk=record_id)
            return plan.patient.id if plan.patient else None
        
    except ObjectDoesNotExist:
        logger.warning(f"Could not find {target_table} with ID {record_id}")
    except Exception as e:
        logger.error(f"Error extracting patient_id: {e}")
    
    return None


def log_export(target_table='User'):
    """
    Decorator specifically for export operations.
    
    Export operations are high-risk because they extract data from the system.
    Always log these with action_type='EXPORT'.
    
    Usage:
        @log_export(target_table='DentalRecord')
        def export_dental_records(request):
            # ... export logic ...
    """
    return log_patient_access(action_type='EXPORT', target_table=target_table)


def log_search(query_param='search'):
    """
    Decorator for search operations.
    
    Only logs if search is for a specific patient (by ID or specific name).
    Skips generic searches like "tooth" or filtering by status.
    
    Args:
        query_param: Request parameter name containing search query
    
    Usage:
        @log_search(query_param='q')
        def search_patients(request):
            query = request.GET.get('q')
            # ... search logic ...
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(*args, **kwargs):
            # Execute view first
            response = view_func(*args, **kwargs)
            
            # Extract request
            request = args[1] if len(args) >= 2 and hasattr(args[0], 'request') else args[0]
            
            # Get search query
            search_query = request.GET.get(query_param, '')
            
            # Only log if it looks like a patient-specific search
            if _is_patient_specific_search(search_query):
                try:
                    create_audit_log(
                        actor=request.user,
                        action_type='READ',
                        target_table='User',
                        target_record_id=0,  # Unknown until results processed
                        patient_id=None,  # Don't know specific patient yet
                        ip_address=get_client_ip(request),
                        user_agent=get_user_agent(request),
                        changes={'search_query': search_query, 'endpoint': request.path}
                    )
                except Exception as e:
                    logger.error(f"Failed to log search operation: {e}")
            
            return response
        
        return wrapper
    return decorator


def _is_patient_specific_search(query):
    """
    Determine if a search query is patient-specific.
    
    Patient-specific searches:
    - Numeric IDs: "12345"
    - Full names: "John Doe" (has space)
    - Email addresses: contains @
    
    Generic searches (skip logging):
    - Single words: "cavity", "active"
    - Short queries: < 3 characters
    """
    if not query or len(query) < 3:
        return False
    
    # Numeric ID
    if query.isdigit():
        return True
    
    # Email address
    if '@' in query:
        return True
    
    # Full name (has space)
    if ' ' in query.strip():
        return True
    
    # Everything else is generic
    return False
