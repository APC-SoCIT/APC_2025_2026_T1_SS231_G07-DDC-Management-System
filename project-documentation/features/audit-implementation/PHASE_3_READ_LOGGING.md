# Phase 3: View-Level READ Logging
## Audit Controls Implementation - Week 3

**Estimated Duration:** 5-7 days  
**Prerequisites:** Phases 1 and 2 completed  
**Goal:** Track all patient data READ operations to comply with HIPAA "right to know who accessed my records"

---

## 🎯 Phase Overview

HIPAA requires logging not just changes to data, but also WHO looked at patient records. Phase 3 implements READ access logging for all sensitive views.

**What You'll Build:**
- ✅ Decorator for automatic READ logging
- ✅ Patient detail view access tracking
- ✅ Medical record view logging
- ✅ Selective search logging (specific patient lookups only)
- ✅ Export/download tracking
- ✅ Integration with existing ViewSets

**Critical Decision:** Not all "reads" need logging:
- ✅ **DO log:** Individual patient record views, medical history access, document views
- ❌ **DON'T log:** Bulk list views (e.g., viewing page of 20 patients in staff dashboard)
- ⚠️ **SELECTIVE:** Search operations (log if searching for specific patient by ID/name, skip generic filters)

---

## 📋 Task Checklist

- [ ] Task 3.1: Create logging decorator for READ operations
- [ ] Task 3.2: Apply decorator to patient detail views
- [ ] Task 3.3: Log medical record access
- [ ] Task 3.4: Log document/image views
- [ ] Task 3.5: Implement selective search logging
- [ ] Task 3.6: Log export operations
- [ ] Task 3.7: Write integration tests

---

## 🔨 Task 3.1: Create READ Logging Decorator

### Context
A decorator is the cleanest way to add READ logging to views without modifying their core logic. The decorator wraps the view function and logs after successful execution.

### LLM Prompt

```
TASK: Create a reusable decorator for logging READ operations on patient data

CONTEXT:
You are implementing Phase 3 of HIPAA-compliant audit logging. Phase 1 and 2 handle authentication and data changes. Now you need to log whenever someone VIEWS patient data.

FILE TO CREATE: backend/api/decorators.py (NEW FILE)

REQUIREMENTS:

The decorator should:
1. Be applicable to both function-based views and ViewSet methods
2. Extract patient_id from view arguments or request data
3. Only log successful responses (status < 400)
4. Capture actor, IP address, and user agent
5. Support custom target_table parameter for different models
6. Handle errors gracefully (don't crash view if logging fails)

COMPLETE FILE IMPLEMENTATION:

```python
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
            target_record_id = None
            
            if extract_patient_id:
                # Use custom extraction function
                patient_id = extract_patient_id(request, args, kwargs)
                target_record_id = patient_id
            elif pk:
                # Auto-detect patient_id based on target_table
                target_record_id = pk
                patient_id = _auto_extract_patient_id(target_table, pk)
            
            # Create audit log
            try:
                create_audit_log(
                    actor=request.user,
                    action_type=action_type,
                    target_table=target_table,
                    target_record_id=target_record_id or 0,
                    patient_id=patient_id,
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
                        patient_id=None,
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
```

VALIDATION:
After creating the file, test imports:
```bash
python manage.py shell
>>> from api.decorators import log_patient_access, log_export, log_search
>>> print("Decorators imported successfully")
```

USAGE PATTERNS:

1. Function-based view:
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
@log_patient_access(action_type='READ', target_table='User')
def get_patient_detail(request, pk):
    patient = User.objects.get(pk=pk)
    return Response(UserSerializer(patient).data)
```

2. ViewSet method:
```python
class UserViewSet(viewsets.ModelViewSet):
    @log_patient_access(action_type='READ', target_table='User')
    def retrieve(self, request, pk=None):
        user = self.get_object()
        serializer = self.get_serializer(user)
        return Response(serializer.data)
```

3. Custom patient_id extraction:
```python
def extract_patient_from_invoice(request, args, kwargs):
    invoice_id = kwargs.get('pk')
    invoice = Invoice.objects.get(pk=invoice_id)
    return invoice.appointment.patient.id

@log_patient_access(
    action_type='READ',
    target_table='Invoice',
    extract_patient_id=extract_patient_from_invoice
)
def view_invoice(request, pk):
    # ...
```
```

---

## 🔨 Task 3.2: Apply Decorator to UserViewSet Patient Views

### LLM Prompt

```
TASK: Add READ logging to patient record views

CONTEXT:
You created the log_patient_access decorator in Task 3.1. Now apply it to the UserViewSet to log whenever staff view patient records.

FILE TO MODIFY: backend/api/views.py

LOCATION: Find the UserViewSet class (around line 400-550 based on your code)

REQUIREMENTS:

1. Import the decorator at the top of views.py:
```python
from api.decorators import log_patient_access, log_export
```

2. Add decorator to retrieve() method:
The retrieve() method is called when viewing a single patient's details (GET /api/users/{id}/)

CURRENT CODE (approximately):
```python
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def retrieve(self, request, pk=None):
        """Get single user details."""
        user = self.get_object()
        serializer = self.get_serializer(user)
        return Response(serializer.data)
```

MODIFIED CODE:
```python
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    @log_patient_access(action_type='READ', target_table='User')
    def retrieve(self, request, pk=None):
        """Get single user details."""
        user = self.get_object()
        serializer = self.get_serializer(user)
        return Response(serializer.data)
```

3. Add decorator to custom action methods that return patient data:

If you have methods like:
- export_records() - use @log_export(target_table='User')
- patient_history() - use @log_patient_access
- patient_billing() - use @log_patient_access

Example:
```python
class UserViewSet(viewsets.ModelViewSet):
    # ... existing code ...
    
    @action(detail=True, methods=['get'])
    @log_export(target_table='User')
    def export_records(self, request, pk=None):
        """Export patient records as JSON/PDF."""
        user = self.get_object()
        # ... export logic ...
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def patients(self, request):
        """List all patients."""
        # DON'T log this - it's a list view, not accessing specific patient
        patients = User.objects.filter(user_type='patient')
        # ... rest of logic ...
```

4. DO NOT decorate these methods (they're bulk operations):
- list() - returns multiple patients
- patients() - returns patient list
- staff() - returns staff list

RULE OF THUMB:
- ✅ Decorate: detail=True actions (single record access)
- ❌ Skip: detail=False actions (list/bulk operations)
- ✅ Decorate: Export/download operations (always log data leaving system)

VALIDATION:
After modification:
1. Start server: python manage.py runserver
2. Log in as staff
3. View a patient detail page GET /api/users/123/
4. Check audit logs:
   ```sql
   SELECT * FROM audit_logs 
   WHERE action_type='READ' AND target_table='User' 
   ORDER BY timestamp DESC LIMIT 5;
   ```
5. Verify: Actor is your user, patient_id is 123, IP and user agent captured
```

---

## 🔨 Task 3.3: Log DentalRecord Access

### LLM Prompt

```
TASK: Add READ logging to dental record views

CONTEXT:
Dental records contain highly sensitive Protected Health Information (PHI). All access must be logged per HIPAA requirements.

FILE TO MODIFY: backend/api/views.py

LOCATION: Find DentalRecordViewSet or dental record view functions

REQUIREMENTS:

If using ViewSet:
```python
class DentalRecordViewSet(viewsets.ModelViewSet):
    queryset = DentalRecord.objects.all()
    serializer_class = DentalRecordSerializer
    
    @log_patient_access(action_type='READ', target_table='DentalRecord')
    def retrieve(self, request, pk=None):
        """View single dental record."""
        record = self.get_object()
        serializer = self.get_serializer(record)
        return Response(serializer.data)
    
    @log_patient_access(action_type='READ', target_table='DentalRecord')
    @action(detail=True, methods=['get'])
    def with_history(self, request, pk=None):
        """Get dental record with full patient history."""
        record = self.get_object()
        # ... fetch related history ...
        return Response(data)
```

If using function-based views:
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
@log_patient_access(action_type='READ', target_table='DentalRecord')
def get_dental_record(request, pk):
    try:
        record = DentalRecord.objects.select_related('patient', 'dentist').get(pk=pk)
        serializer = DentalRecordSerializer(record)
        return Response(serializer.data)
    except DentalRecord.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)
```

APPLY TO ALL DENTAL RECORD ENDPOINTS:
- Individual record retrieval
- Viewing patient's complete dental history
- Viewing tooth charts
- Viewing treatment plans
- Viewing associated images/documents

SPECIAL CASE - Patient Viewing Own Records:
```python
@action(detail=False, methods=['get'])
@log_patient_access(action_type='READ', target_table='DentalRecord')
def my_records(self, request):
    """Allow patient to view their own dental records."""
    if request.user.user_type != 'patient':
        return Response({'error': 'Patients only'}, status=403)
    
    records = DentalRecord.objects.filter(patient=request.user)
    serializer = self.get_serializer(records, many=True)
    
    # For self-access, patient_id is request.user.id
    # Decorator handles this automatically based on query results
    
    return Response(serializer.data)
```

VALIDATION:
Test with:
1. Staff viewing patient dental record → Log created with staff as actor
2. Patient viewing own records → Log created with patient as actor
3. Unauthorized access attempt (403 response) → No log created (failed request)

Check database:
```sql
SELECT 
    al.action_type,
    al.target_table,
    al.target_record_id,
    al.patient_id,
    u.username as actor,
    al.timestamp
FROM audit_logs al
JOIN api_user u ON al.actor_id = u.id
WHERE al.target_table = 'DentalRecord'
ORDER BY al.timestamp DESC
LIMIT 10;
```
```

---

## 🔨 Task 3.4: Log Document and Image Views

### LLM Prompt

```
TASK: Log access to uploaded documents and dental images

CONTEXT:
Documents and images (X-rays, photos) are PHI and must be audited. This includes both viewing image files and downloading documents.

FILE TO MODIFY: backend/api/views.py

SCENARIO ANALYSIS:

Your system likely serves images/documents in one of these ways:
1. Through Django views (good - can be logged)
2. Direct URL to media files (bad - bypass logging)
3. Signed URLs (good - can log generation)

RECOMMENDED APPROACH:

Force all document/image access through logged endpoints:

```python
from django.http import FileResponse, Http404
import os

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    
    @log_patient_access(action_type='READ', target_table='Document')
    def retrieve(self, request, pk=None):
        """Get document metadata."""
        document = self.get_object()
        serializer = self.get_serializer(document)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    @log_patient_access(action_type='READ', target_table='Document')
    def download(self, request, pk=None):
        """Download document file."""
        document = self.get_object()
        
        # Check permissions
        if not self._can_access_document(request.user, document):
            return Response({'error': 'Forbidden'}, status=403)
        
        # Serve file
        file_path = document.file.path
        if not os.path.exists(file_path):
            raise Http404("File not found")
        
        response = FileResponse(open(file_path, 'rb'))
        response['Content-Disposition'] = f'attachment; filename="{document.file.name}"'
        
        # Additional audit log specifically for file downloads
        create_audit_log(
            actor=request.user,
            action_type='EXPORT',
            target_table='Document',
            target_record_id=document.id,
            patient_id=document.patient.id if document.patient else None,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            changes={'filename': document.file.name, 'file_size': os.path.getsize(file_path)}
        )
        
        return response
    
    def _can_access_document(self, user, document):
        """Check if user can access this document."""
        # Owner and staff can access all documents
        if user.user_type in ['owner', 'staff']:
            return True
        # Patients can only access their own documents
        if user.user_type == 'patient' and document.patient == user:
            return True
        return False


# For teeth images
@api_view(['GET'])
@permission_classes([IsAuthenticated])
@log_patient_access(action_type='READ', target_table='ToothChart')
def view_teeth_image(request, patient_id):
    """View patient's teeth chart image."""
    # Verify permission
    if request.user.user_type == 'patient' and request.user.id != patient_id:
        return Response({'error': 'Forbidden'}, status=403)
    
    try:
        user = User.objects.get(pk=patient_id, user_type='patient')
        if not user.teeth_image:
            return Response({'error': 'No image uploaded'}, status=404)
        
        # Serve image
        image_path = user.teeth_image.path
        return FileResponse(open(image_path, 'rb'), content_type='image/jpeg')
    
    except User.DoesNotExist:
        return Response({'error': 'Patient not found'}, status=404)
```

PREVENT DIRECT MEDIA ACCESS:

In nginx/Apache configuration (production):
```nginx
# Block direct access to media files
location /media/ {
    internal;  # Only accessible through X-Accel-Redirect
    alias /path/to/media/;
}
```

In Django settings.py:
```python
# Development: Django serves media (slow but logged)
if DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # Production: Use nginx with logged Django view
    # All media access goes through views that create audit logs
    pass
```

VALIDATION:
1. Access document via API endpoint → Audit log created
2. Try direct media URL (/media/documents/file.pdf) → Should be blocked in production
3. Download document → EXPORT audit log created with filename
4. Patient downloads own document → Log shows patient as actor
5. Staff downloads patient document → Log shows staff as actor

Check logs:
```sql
SELECT * FROM audit_logs 
WHERE action_type='EXPORT' AND target_table='Document'
ORDER BY timestamp DESC;
```
```

---

## 🔨 Task 3.5: Implement Selective Search Logging

### LLM Prompt

```
TASK: Add intelligent search logging that only logs patient-specific searches

CONTEXT:
Generic searches like "status:active" or "cavity" don't need logging. But searching for "John Doe" or patient ID "12345" should be logged for HIPAA compliance.

FILE TO MODIFY: backend/api/views.py

CURRENT IMPLEMENTATION (likely):
```python
@api_view(['GET'])
def search_patients(request):
    query = request.GET.get('search', '')
    patients = User.objects.filter(
        Q(first_name__icontains=query) |
        Q(last_name__icontains=query) |
        Q(email__icontains=query),
        user_type='patient'
    )
    serializer = UserSerializer(patients, many=True)
    return Response(serializer.data)
```

ENHANCED WITH SELECTIVE LOGGING:
```python
from api.decorators import log_search

@api_view(['GET'])
@log_search(query_param='search')  # Automatically logs patient-specific searches
def search_patients(request):
    query = request.GET.get('search', '')
    patients = User.objects.filter(
        Q(first_name__icontains=query) |
        Q(last_name__icontains=query) |
        Q(email__icontains=query),
        user_type='patient'
    )
    
    serializer = UserSerializer(patients, many=True)
    
    # If search was patient-specific and returned result, log it
    if patients.exists() and len(query) > 2:
        # Decorator already logged the search
        # Optionally update log with result count
        pass
    
    return Response(serializer.data)
```

FOR VIEWSET IMPLEMENTATION:
```python
class UserViewSet(viewsets.ModelViewSet):
    # ... existing code ...
    
    def get_queryset(self):
        """Override queryset to add search filtering."""
        queryset = User.objects.all()
        search_query = self.request.query_params.get('search', None)
        
        if search_query:
            # Log if patient-specific search
            if self._is_patient_specific_search(search_query):
                try:
                    create_audit_log(
                        actor=self.request.user,
                        action_type='READ',
                        target_table='User',
                        target_record_id=0,
                        patient_id=None,
                        ip_address=get_client_ip(self.request),
                        user_agent=get_user_agent(self.request),
                        changes={'search_query': search_query}
                    )
                except Exception as e:
                    logger.error(f"Failed to log search: {e}")
            
            queryset = queryset.filter(
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(email__icontains=search_query)
            )
        
        return queryset
    
    def _is_patient_specific_search(self, query):
        """Check if search query is patient-specific."""
        # Reuse logic from decorators module
        from api.decorators import _is_patient_specific_search
        return _is_patient_specific_search(query)
```

EXAMPLES OF WHAT TO LOG:

✅ Log these searches:
- "john.doe@example.com" (email search)
- "John Doe" (full name)
- "12345" (patient ID)
- "Maria Garcia" (name with space)

❌ Skip these searches:
- "active" (status filter)
- "cavity" (generic term)
- "Dr" (title search)
- "" (empty search)
- "Ma" (too short)

VALIDATION:
Test various search queries:
```python
# In Django shell
from api.models import AuditLog

# Clear logs
AuditLog.objects.all().delete()

# Make requests
# 1. Search "Mary Johnson" → Should create log
# 2. Search "active" → Should NOT create log
# 3. Search "mary.j@test.com" → Should create log
# 4. Search "12345" → Should create log

# Check results
logs = AuditLog.objects.filter(action_type='READ')
for log in logs:
    print(f"Search: {log.changes.get('search_query')} at {log.timestamp}")
```

Expected output:
```
Search: Mary Johnson at 2026-02-15 14:23:10
Search: mary.j@test.com at 2026-02-15 14:23:45
Search: 12345 at 2026-02-15 14:24:02
```

"active" should not appear in logs.
```

---

## 🔨 Task 3.6: Log All Export Operations

### LLM Prompt

```
TASK: Ensure all data export/download operations are logged with action_type='EXPORT'

CONTEXT:
HIPAA requires strict logging when data leaves the system. All exports (CSV, PDF, JSON) must be tracked.

FILE TO MODIFY: backend/api/views.py

FIND ALL EXPORT ENDPOINTS:

Look for views that:
- Generate PDFs
- Export CSV files
- Return full records as JSON
- Send data via email
- Generate reports

EXAMPLE IMPLEMENTATIONS:

1. Patient Records Export:
```python
@action(detail=True, methods=['get'])
@log_export(target_table='User')
def export_records(self, request, pk=None):
    """Export patient records as JSON."""
    user = self.get_object()
    
    # Gather all patient data
    data = {
        'patient': UserSerializer(user).data,
        'appointments': AppointmentSerializer(
            Appointment.objects.filter(patient=user), many=True
        ).data,
        'dental_records': DentalRecordSerializer(
            DentalRecord.objects.filter(patient=user), many=True
        ).data,
        'billing': BillingSerializer(
            Billing.objects.filter(patient=user), many=True
        ).data,
    }
    
    # Additional specific export logging
    create_audit_log(
        actor=request.user,
        action_type='EXPORT',
        target_table='User',
        target_record_id=user.id,
        patient_id=user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        changes={
            'export_type': 'full_records',
            'records_included': list(data.keys()),
            'record_counts': {k: len(v) if isinstance(v, list) else 1 for k, v in data.items()}
        }
    )
    
    return Response(data)
```

2. Invoice PDF Generation:
```python
from django.http import HttpResponse
from api.invoice_generator import generate_invoice_pdf

@action(detail=True, methods=['get'])
@log_export(target_table='Invoice')
def download_pdf(self, request, pk=None):
    """Generate and download invoice PDF."""
    invoice = self.get_object()
    
    # Generate PDF
    pdf_content = generate_invoice_pdf(invoice)
    
    # Create response
    response = HttpResponse(pdf_content, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.id}.pdf"'
    
    # Additional export log with PDF details
    create_audit_log(
        actor=request.user,
        action_type='EXPORT',
        target_table='Invoice',
        target_record_id=invoice.id,
        patient_id=invoice.appointment.patient.id if invoice.appointment else None,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        changes={
            'format': 'PDF',
            'file_size': len(pdf_content),
            'invoice_number': invoice.invoice_number,
        }
    )
    
    return response
```

3. Bulk Export (Multiple Patients):
```python
@action(detail=False, methods=['post'])
@permission_classes([IsOwner])  # Only owner can do bulk exports
def bulk_export(self, request):
    """Export multiple patient records (requires owner permission)."""
    patient_ids = request.data.get('patient_ids', [])
    
    # Validate
    if len(patient_ids) > 100:
        return Response({'error': 'Maximum 100 patients per export'}, status=400)
    
    # Gather data
    patients = User.objects.filter(id__in=patient_ids, user_type='patient')
    data = UserSerializer(patients, many=True).data
    
    # Log each patient export individually
    for patient in patients:
        try:
            create_audit_log(
                actor=request.user,
                action_type='EXPORT',
                target_table='User',
                target_record_id=patient.id,
                patient_id=patient.id,
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                changes={'export_type': 'bulk_export', 'total_patients': len(patient_ids)}
            )
        except Exception as e:
            logger.error(f"Failed to log bulk export for patient {patient.id}: {e}")
    
    return Response(data)
```

4. Email Exports:
```python
from api.email_service import send_email

@action(detail=True, methods=['post'])
@log_export(target_table='User')
def email_records(self, request, pk=None):
    """Email patient records to authorized recipient."""
    user = self.get_object()
    recipient_email = request.data.get('email')
    
    # Validate recipient is authorized
    if recipient_email != user.email and not request.user.user_type in ['owner', 'staff']:
        return Response({'error': 'Unauthorized'}, status=403)
    
    # Generate data
    records_data = self._compile_patient_records(user)
    
    # Send email
    send_email(
        to=recipient_email,
        subject=f'Patient Records for {user.get_full_name()}',
        body='Records attached',
        attachments=[{'filename': 'records.pdf', 'content': records_data}]
    )
    
    # Log export via email
    create_audit_log(
        actor=request.user,
        action_type='EXPORT',
        target_table='User',
        target_record_id=user.id,
        patient_id=user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        changes={
            'export_method': 'email',
            'recipient': recipient_email,
            'timestamp': timezone.now().isoformat()
        }
    )
    
    return Response({'message': 'Records emailed successfully'})
```

SECURITY REQUIREMENTS FOR EXPORTS:

1. Permission checks:
   - Staff/Owner can export any patient
   - Patients can only export own records
   - Log even failed export attempts

2. Rate limiting (implement in Phase 4):
```python
from rest_framework.throttling import UserRateThrottle

class ExportRateThrottle(UserRateThrottle):
    rate = '10/hour'  # Maximum 10 exports per hour per user

class UserViewSet(viewsets.ModelViewSet):
    @action(detail=True, methods=['get'])
    @log_export(target_table='User')
    @throttle_classes([ExportRateThrottle])
    def export_records(self, request, pk=None):
        # ... export logic ...
```

VALIDATION:
Test all export endpoints:
1. Export patient records → Check audit_logs for EXPORT entry
2. Generate invoice PDF → Check for file_size in changes field
3. Bulk export 5 patients → Check for 5 separate audit logs
4. Email records → Check for export_method='email' in log

Query:
```sql
SELECT 
    al.target_record_id as patient_id,
    al.changes->>'export_type' as export_type,
    al.changes->>'format' as format,
    u.username as exported_by,
    al.timestamp
FROM audit_logs al
JOIN api_user u ON al.actor_id = u.id
WHERE al.action_type = 'EXPORT'
ORDER BY al.timestamp DESC;
```
```

---

## 🔨 Task 3.7: Write Integration Tests

### LLM Prompt

```
TASK: Create integration tests for all READ logging functionality

FILE TO CREATE: backend/api/tests/test_audit_read_logging.py (NEW FILE)

REQUIREMENTS:

Test scenarios:
1. Viewing patient detail creates READ log
2. Viewing dental record creates READ log
3. Downloading document creates EXPORT log
4. Patient-specific search creates log
5. Generic search does NOT create log
6. List views do NOT create logs
7. Failed requests (403/404) do NOT create logs
8. Multiple views of same record create multiple logs
9. Patient viewing own records creates log with self as actor

COMPLETE TEST FILE:

```python
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from api.models import AuditLog, DentalRecord, Document,Appointment
from datetime import date, time

User = get_user_model()


class TestReadAuditLogging(TestCase):
    """Integration tests for READ operation audit logging."""
    
    def setUp(self):
        """Create test users and authenticate."""
        # Create patient
        self.patient = User.objects.create_user(
            username='patient1',
            email='patient@test.com',
            password='pass123',
            user_type='patient',
            first_name='John',
            last_name='Doe'
        )
        
        # Create staff
        self.staff = User.objects.create_user(
            username='staff1',
            email='staff@test.com',
            password='pass123',
            user_type='staff',
            role='dentist',
            first_name='Dr.',
            last_name='Smith'
        )
        
        # Create owner
        self.owner = User.objects.create_user(
            username='owner1',
            email='owner@test.com',
            password='pass123',
            user_type='owner',
            first_name='Owner',
            last_name='Admin'
        )
        
        # Create API client
        self.client = APIClient()
        
        # Clear audit logs
        AuditLog.objects.all().delete()
    
    def _authenticate_as(self, user):
        """Helper to authenticate client as specific user."""
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    
    def test_view_patient_detail_creates_read_log(self):
        """Test that viewing patient detail creates audit log."""
        self._authenticate_as(self.staff)
        
        # Clear logs
        AuditLog.objects.all().delete()
        
        # View patient detail
        response = self.client.get(f'/api/users/{self.patient.id}/')
        
        self.assertEqual(response.status_code, 200)
        
        # Check audit log
        logs = AuditLog.objects.filter(
            action_type='READ',
            target_table='User',
            target_record_id=self.patient.id
        )
        
        self.assertEqual(logs.count(), 1)
        log = logs.first()
        self.assertEqual(log.actor, self.staff)
        self.assertEqual(log.patient_id, self.patient.id)
        self.assertIsNotNone(log.ip_address)
    
    def test_patient_viewing_own_record_logged(self):
        """Test that patients viewing their own records creates log."""
        self._authenticate_as(self.patient)
        
        AuditLog.objects.all().delete()
        
        response = self.client.get(f'/api/users/{self.patient.id}/')
        self.assertEqual(response.status_code, 200)
        
        logs = AuditLog.objects.filter(action_type='READ', target_table='User')
        self.assertEqual(logs.count(), 1)
        
        log = logs.first()
        self.assertEqual(log.actor, self.patient)
        self.assertEqual(log.patient_id, self.patient.id)
    
    def test_list_view_not_logged(self):
        """Test that listing patients does NOT create audit logs."""
        self._authenticate_as(self.staff)
        
        AuditLog.objects.all().delete()
        
        # Get patient list
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, 200)
        
        # Should not create audit log for list view
        logs = AuditLog.objects.filter(action_type='READ')
        self.assertEqual(logs.count(), 0)
    
    def test_failed_request_not_logged(self):
        """Test that failed requests don't create audit logs."""
        self._authenticate_as(self.staff)
        
        AuditLog.objects.all().delete()
        
        # Try to access non-existent patient
        response = self.client.get('/api/users/99999/')
        self.assertEqual(response.status_code, 404)
        
        # Should not log failed request
        logs = AuditLog.objects.filter(action_type='READ')
        self.assertEqual(logs.count(), 0)
    
    def test_multiple_views_create_multiple_logs(self):
        """Test that viewing same record twice creates two logs."""
        self._authenticate_as(self.staff)
        
        AuditLog.objects.all().delete()
        
        # View patient twice
        self.client.get(f'/api/users/{self.patient.id}/')
        self.client.get(f'/api/users/{self.patient.id}/')
        
        logs = AuditLog.objects.filter(
            action_type='READ',
            target_table='User',
            target_record_id=self.patient.id
        )
        
        self.assertEqual(logs.count(), 2)
    
    def test_dental_record_view_logged(self):
        """Test that viewing dental records creates audit log."""
        # Create dental record
        record = DentalRecord.objects.create(
            patient=self.patient,
            dentist=self.staff,
            diagnosis='Test diagnosis',
            treatment='Test treatment'
        )
        
        self._authenticate_as(self.staff)
        AuditLog.objects.all().delete()
        
        # View dental record
        response = self.client.get(f'/api/dental-records/{record.id}/')
        self.assertEqual(response.status_code, 200)
        
        logs = AuditLog.objects.filter(
            action_type='READ',
            target_table='DentalRecord'
        )
        
        self.assertEqual(logs.count(), 1)
        log = logs.first()
        self.assertEqual(log.patient_id, self.patient.id)
    
    def test_document_download_logged_as_export(self):
        """Test that downloading documents creates EXPORT log."""
        # Create document
        document = Document.objects.create(
            patient=self.patient,
            document_type='xray',
            file='test.pdf'
        )
        
        self._authenticate_as(self.staff)
        AuditLog.objects.all().delete()
        
        # Download document (adjust URL based on your routing)
        response = self.client.get(f'/api/documents/{document.id}/download/')
        
        # Should create EXPORT log
        logs = AuditLog.objects.filter(
            action_type='EXPORT',
            target_table='Document'
        )
        
        self.assertEqual(logs.count(), 1)
    
    def test_patient_specific_search_logged(self):
        """Test that searching for specific patient creates log."""
        self._authenticate_as(self.staff)
        AuditLog.objects.all().delete()
        
        # Search for specific patient by full name
        response = self.client.get('/api/users/', {'search': 'John Doe'})
        self.assertEqual(response.status_code, 200)
        
        # Should create log for patient-specific search
        logs = AuditLog.objects.filter(action_type='READ')
        self.assertGreater(logs.count(), 0)
        
        log = logs.first()
        self.assertIn('search_query', log.changes)
        self.assertEqual(log.changes['search_query'], 'John Doe')
    
    def test_generic_search_not_logged(self):
        """Test that generic searches don't create logs."""
        self._authenticate_as(self.staff)
        AuditLog.objects.all().delete()
        
        # Generic search
        response = self.client.get('/api/users/', {'search': 'active'})
        self.assertEqual(response.status_code, 200)
        
        # Should NOT create log
        logs = AuditLog.objects.filter(action_type='READ')
        self.assertEqual(logs.count(), 0)


class TestExportAuditLogging(TestCase):
    """Test audit logging for data exports."""
    
    def setUp(self):
        """Create test data."""
        self.patient = User.objects.create_user(
            username='patient2',
            email='patient2@test.com',
            password='pass123',
            user_type='patient'
        )
        
        self.staff = User.objects.create_user(
            username='staff2',
            email='staff2@test.com',
            password='pass123',
            user_type='staff',
            role='receptionist'
        )
        
        self.client = APIClient()
        token, _ = Token.objects.get_or_create(user=self.staff)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        
        AuditLog.objects.all().delete()
    
    def test_export_patient_records_logged(self):
        """Test that exporting patient records creates EXPORT log."""
        response = self.client.get(f'/api/users/{self.patient.id}/export_records/')
        
        # Check for EXPORT log
        logs = AuditLog.objects.filter(
            action_type='EXPORT',
            target_table='User',
            target_record_id=self.patient.id
        )
        
        self.assertGreater(logs.count(), 0)
        log = logs.first()
        self.assertEqual(log.actor, self.staff)
        self.assertIn('export_type', log.changes)
```

RUNNING TESTS:
```bash
python manage.py test api.tests.test_audit_read_logging -v 2
```

EXPECTED OUTPUT:
```
test_view_patient_detail_creates_read_log ... ok
test_patient_viewing_own_record_logged ... ok
test_list_view_not_logged ... ok
test_failed_request_not_logged ... ok
test_multiple_views_create_multiple_logs ... ok
test_dental_record_view_logged ... ok
test_document_download_logged_as_export ... ok
test_patient_specific_search_logged ... ok
test_generic_search_not_logged ... ok
test_export_patient_records_logged ... ok

Ran 10 tests in 2.145s
OK
```
```

---

## 📊 Phase 3 Completion Criteria

You have successfully completed Phase 3 when:

- ✅ Decorator for READ logging exists and is reusable
- ✅ Patient detail views create READ audit logs
- ✅ Dental record views create READ audit logs
- ✅ Document downloads create EXPORT audit logs
- ✅ Patient-specific searches create logs
- ✅ Generic searches do NOT create logs
- ✅ List/bulk views do NOT create logs (performance)
- ✅ Failed requests (403/404) do NOT create logs
- ✅ All integration tests pass
- ✅ Performance acceptable (< 50ms overhead per request)

---

## 🚀 Next Steps

Once Phase 3 is complete:
1. Review audit logs for READ actions
2. Test from frontend to ensure all user actions are captured
3. Proceed to [PHASE_4_MIDDLEWARE_ADMIN.md](./PHASE_4_MIDDLEWARE_ADMIN.md)

---

**Phase 3 Status:** Ready for Implementation  
**Next Phase:** [PHASE_4_MIDDLEWARE_ADMIN.md](./PHASE_4_MIDDLEWARE_ADMIN.md)
