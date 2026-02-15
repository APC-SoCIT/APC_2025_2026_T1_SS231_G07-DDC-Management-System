# Phase 2: Model-Level Tracking with Django Signals
## Audit Controls Implementation - Week 2

**Estimated Duration:** 5-7 days  
**Prerequisites:** Phase 1 completed and tested  
**Goal:** Automatic audit logging for all CREATE, UPDATE, DELETE operations on critical models

---

## 🎯 Phase Overview

This phase implements automatic change tracking at the Django model level using signals. By the end of Phase 2, every modification to patient data will be automatically logged with before/after snapshots.

**What You'll Build:**
- ✅ Django signal handlers for critical models
- ✅ Automatic before/after change tracking
- ✅ Patient identification for all operations
- ✅ Batch signal processing for performance
- ✅ Comprehensive unit tests

**Critical Models to Track:**
- User (patient records)
- DentalRecord (medical history)
- Appointment (scheduling, status changes)
- Billing / Invoice (financial records)
- TreatmentPlan (treatment details)
- Document (file uploads)
- PatientIntakeForm (medical questionnaires)

---

## 📋 Task Checklist

- [ ] Task 2.1: Create signals module structure
- [ ] Task 2.2: Implement pre_save handlers for change capture
- [ ] Task 2.3: Implement post_save handlers for CREATE/UPDATE logging
- [ ] Task 2.4: Implement post_delete handlers
- [ ] Task 2.5: Register signals in app configuration
- [ ] Task 2.6: Test signal handlers
- [ ] Task 2.7: Performance optimization

---

## 🔨 Task 2.1: Create Signals Module Structure

### Context
Django signals allow you to execute code whenever a model is saved or deleted, without modifying the model's save/delete methods. This is perfect for audit logging because it works even when changes come from the Django admin, management commands, or bulk operations.

### LLM Prompt

```
TASK: Create a Django signals module for automatic audit logging

CONTEXT:
You are implementing Phase 2 of a HIPAA-compliant audit system for a dental clinic. Phase 1 created the AuditLog model and basic login tracking. Now you need to automatically log all data modifications using Django signals.

FILE TO CREATE: backend/api/signals.py (NEW FILE)

REQUIREMENTS:

The signals module should have this structure:

1. Imports section
2. Thread-local storage for holding pre-save data
3. Helper function to extract patient_id from any model instance
4. Helper function to serialize model data safely
5. Signal handlers for different event types
6. Registration function to connect all signals

COMPLETE FILE TEMPLATE:

```python
"""
Django signals for automatic audit logging.

This module implements HIPAA-compliant audit trails by automatically
logging all CREATE, UPDATE, and DELETE operations on critical models.

Signal handlers are triggered by Django's ORM and work across all
access methods (API, admin panel, management commands, etc.).
"""

import threading
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.forms.models import model_to_dict
from django.contrib.auth import get_user_model
from api.models import (
    AuditLog, DentalRecord, Appointment, Billing, 
    Invoice, TreatmentPlan, Document, PatientIntakeForm
)
from api.audit_service import create_audit_log, sanitize_data
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

# Thread-local storage to hold pre-save model state
_thread_locals = threading.local()

# Models that should be audited (all models containing PHI)
AUDITED_MODELS = {
    'User', 'DentalRecord', 'Appointment', 'Billing', 
    'Invoice', 'TreatmentPlan', 'Document', 'PatientIntakeForm'
}


def get_patient_id_from_instance(instance):
    """
    Extract patient ID from a model instance.
    
    Different models store patient references differently:
    - User: if user_type == 'patient', return own ID
    - DentalRecord, Appointment, etc: have .patient ForeignKey
    - Invoice: patient is in .appointment.patient
    """
    # Implementation here
    pass


def serialize_model_instance(instance, exclude_fields=None):
    """
    Convert model instance to dictionary, excluding sensitive fields.
    
    Args:
        instance: Django model instance
        exclude_fields: List of field names to exclude
        
    Returns:
        dict: Sanitized model data
    """
    # Implementation here
    pass


# === PRE-SAVE SIGNALS (Capture "before" state) ===

@receiver(pre_save, sender=User)
def user_pre_save(sender, instance, **kwargs):
    """Capture User state before modification."""
    if instance.pk:  # Only for updates, not creates
        try:
            old_instance = User.objects.get(pk=instance.pk)
            _thread_locals.user_old_data = model_to_dict(old_instance)
        except User.DoesNotExist:
            pass


@receiver(pre_save, sender=DentalRecord)
def dental_record_pre_save(sender, instance, **kwargs):
    """Capture DentalRecord state before modification."""
    if instance.pk:
        try:
            old_instance = DentalRecord.objects.get(pk=instance.pk)
            _thread_locals.dental_record_old_data = model_to_dict(old_instance)
        except DentalRecord.DoesNotExist:
            pass


# TODO: Add pre_save handlers for other models
# - Appointment
# - Billing
# - Invoice
# - TreatmentPlan
# - Document
# - PatientIntakeForm


# === POST-SAVE SIGNALS (Log CREATE/UPDATE) ===

@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    """Log User creation or modification."""
    # Skip audit logging for the AuditLog model itself
    if sender == AuditLog:
        return
    
    action_type = 'CREATE' if created else 'UPDATE'
    
    # Get old data from thread-local storage
    old_data = getattr(_thread_locals, 'user_old_data', None)
    
    # Build changes dict
    changes = None
    if not created and old_data:
        new_data = model_to_dict(instance)
        changes = {
            'before': sanitize_data(old_data),
            'after': sanitize_data(new_data)
        }
    
    # Determine patient_id
    patient_id = instance.id if instance.user_type == 'patient' else None
    
    # Get current request context if available
    # NOTE: This requires middleware to set the current user
    actor = getattr(instance, '_audit_actor', None)
    ip_address = getattr(instance, '_audit_ip', '0.0.0.0')
    user_agent = getattr(instance, '_audit_user_agent', '')
    
    try:
        create_audit_log(
            actor=actor,
            action_type=action_type,
            target_table='User',
            target_record_id=instance.id,
            patient_id=patient_id,
            ip_address=ip_address,
            user_agent=user_agent,
            changes=changes
        )
    except Exception as e:
        logger.error(f"Failed to create audit log for User {instance.id}: {e}")
    finally:
        # Clean up thread-local storage
        if hasattr(_thread_locals, 'user_old_data'):
            delattr(_thread_locals, 'user_old_data')


# TODO: Add post_save handlers for other models


# === POST-DELETE SIGNALS (Log DELETE) ===

@receiver(post_delete, sender=User)
def user_post_delete(sender, instance, **kwargs):
    """Log User deletion."""
    if sender == AuditLog:
        return
    
    patient_id = instance.id if instance.user_type == 'patient' else None
    actor = getattr(instance, '_audit_actor', None)
    ip_address = getattr(instance, '_audit_ip', '0.0.0.0')
    
    # Capture the deleted data
    deleted_data = sanitize_data(model_to_dict(instance))
    
    try:
        create_audit_log(
            actor=actor,
            action_type='DELETE',
            target_table='User',
            target_record_id=instance.id,
            patient_id=patient_id,
            ip_address=ip_address,
            changes={'deleted_record': deleted_data}
        )
    except Exception as e:
        logger.error(f"Failed to log deletion of User {instance.id}: {e}")


# TODO: Add post_delete handlers for other models


def register_audit_signals():
    """
    Explicitly register all audit signals.
    
    Called from apps.py when the app is ready.
    """
    logger.info("Audit signals registered successfully")
```

IMPLEMENTATION NOTES:

1. Thread-local storage:
   - Holds pre-save state temporarily
   - Cleared after post-save
   - Thread-safe for concurrent requests

2. Actor attribution:
   - Signals don't have access to `request` object
   - Solution: Views/middleware set `instance._audit_actor` before saving
   - Fallback: None (system action)

3. Performance:
   - Signals add ~10-20ms overhead per save
   - Use select_related/prefetch_related in handlers
   - Consider async processing in Phase 4

4. Error handling:
   - Audit logging wrapped in try/except
   - Failures logged but don't prevent save
   - Application code continues even if audit fails

HELPER FUNCTION IMPLEMENTATIONS:

```python
def get_patient_id_from_instance(instance):
    """Extract patient ID from model instance."""
    model_name = instance.__class__.__name__
    
    if model_name == 'User':
        return instance.id if instance.user_type == 'patient' else None
    
    # Models with direct .patient ForeignKey
    if hasattr(instance, 'patient'):
        return instance.patient.id if instance.patient else None
    
    # Invoice: patient is in appointment
    if model_name == 'Invoice' and hasattr(instance, 'appointment'):
        return instance.appointment.patient.id if instance.appointment.patient else None
    
    return None


def serialize_model_instance(instance, exclude_fields=None):
    """Convert instance to dict, excluding sensitive fields."""
    exclude_fields = exclude_fields or []
    exclude_fields.extend(['password', 'auth_token'])
    
    data = model_to_dict(instance, exclude=exclude_fields)
    return sanitize_data(data)
```

VALIDATION:
After creating signals.py, verify:
1. No syntax errors: python manage.py check
2. Imports resolve correctly
3. All AUDITED_MODELS are imported
4. Signal decorators use correct senders
```

---

## 🔨 Task 2.2: Implement Complete Signal Handlers

### LLM Prompt

```
TASK: Complete signal handler implementation for all critical models

CONTEXT:
You created the signals.py skeleton in Task 2.1. Now implement the remaining signal handlers for all models containing Protected Health Information (PHI).

FILE TO MODIFY: backend/api/signals.py

MODELS TO ADD:
1. Appointment - patient scheduling
2. DentalRecord - medical records
3. Billing - financial transactions
4. Invoice - detailed billing
5. TreatmentPlan - treatment details
6. Document - uploaded files
7. PatientIntakeForm - medical questionnaires

REQUIREMENTS:

For EACH model, create three signal handlers:

1. @receiver(pre_save, sender=ModelName)
   - Capture old state before modification
   - Store in thread-local: _thread_locals.{model_name_lower}_old_data
   - Only execute if instance.pk exists (updates only)
   - Handle DoesNotExist exceptions

2. @receiver(post_save, sender=ModelName)
   - Log CREATE or UPDATE action
   - Extract patient_id using get_patient_id_from_instance()
   - Build changes dict with before/after states
   - Extract audit context (_audit_actor, _audit_ip, _audit_user_agent)
   - Call create_audit_log()
   - Clean up thread-local storage

3. @receiver(post_delete, sender=ModelName)
   - Log DELETE action
   - Capture deleted data
   - Extract patient_id
   - Extract audit context
   - Call create_audit_log()

CODE PATTERN FOR EACH MODEL:

```python
# === APPOINTMENT SIGNALS ===

@receiver(pre_save, sender=Appointment)
def appointment_pre_save(sender, instance, **kwargs):
    """Capture Appointment state before modification."""
    if instance.pk:
        try:
            old_instance = Appointment.objects.select_related('patient', 'dentist').get(pk=instance.pk)
            _thread_locals.appointment_old_data = {
                'patient_id': old_instance.patient.id if old_instance.patient else None,
                'dentist_id': old_instance.dentist.id if old_instance.dentist else None,
                'date': str(old_instance.date),
                'time': str(old_instance.time),
                'status': old_instance.status,
                'type': old_instance.type,
                'notes': old_instance.notes,
            }
        except Appointment.DoesNotExist:
            pass


@receiver(post_save, sender=Appointment)
def appointment_post_save(sender, instance, created, **kwargs):
    """Log Appointment creation or modification."""
    if sender == AuditLog:
        return
    
    action_type = 'CREATE' if created else 'UPDATE'
    old_data = getattr(_thread_locals, 'appointment_old_data', None)
    
    # Build current state
    new_data = {
        'patient_id': instance.patient.id if instance.patient else None,
        'dentist_id': instance.dentist.id if instance.dentist else None,
        'date': str(instance.date),
        'time': str(instance.time),
        'status': instance.status,
        'type': instance.type,
        'notes': instance.notes,
    }
    
    changes = None
    if not created and old_data:
        changes = {
            'before': old_data,
            'after': new_data,
            'changed_fields': [k for k in new_data if old_data.get(k) != new_data.get(k)]
        }
    
    patient_id = instance.patient.id if instance.patient else None
    actor = getattr(instance, '_audit_actor', None)
    ip_address = getattr(instance, '_audit_ip', '0.0.0.0')
    user_agent = getattr(instance, '_audit_user_agent', '')
    
    try:
        create_audit_log(
            actor=actor,
            action_type=action_type,
            target_table='Appointment',
            target_record_id=instance.id,
            patient_id=patient_id,
            ip_address=ip_address,
            user_agent=user_agent,
            changes=changes
        )
    except Exception as e:
        logger.error(f"Failed to create audit log for Appointment {instance.id}: {e}")
    finally:
        if hasattr(_thread_locals, 'appointment_old_data'):
            delattr(_thread_locals, 'appointment_old_data')


@receiver(post_delete, sender=Appointment)
def appointment_post_delete(sender, instance, **kwargs):
    """Log Appointment deletion."""
    if sender == AuditLog:
        return
    
    patient_id = instance.patient.id if instance.patient else None
    actor = getattr(instance, '_audit_actor', None)
    ip_address = getattr(instance, '_audit_ip', '0.0.0.0')
    
    deleted_data = {
        'patient_id': patient_id,
        'date': str(instance.date),
        'time': str(instance.time),
        'status': instance.status,
        'type': instance.type,
    }
    
    try:
        create_audit_log(
            actor=actor,
            action_type='DELETE',
            target_table='Appointment',
            target_record_id=instance.id,
            patient_id=patient_id,
            ip_address=ip_address,
            changes={'deleted_record': deleted_data}
        )
    except Exception as e:
        logger.error(f"Failed to log deletion of Appointment {instance.id}: {e}")
```

SPECIFIC CONSIDERATIONS:

1. DentalRecord signals:
   - Include diagnosis, treatment, notes in changes
   - This is highly sensitive PHI - ensure sanitization
   - Patient ID is direct: instance.patient.id

2. Billing/Invoice signals:
   - Include amount, status changes
   - Track payment modifications
   - Patient ID from appointment relationship

3. Document signals:
   - Log file uploads/deletions
   - Store filename and document_type in changes
   - Don't store actual file content in audit log

4. PatientIntakeForm signals:
   - Capture allergies, medications, conditions changes
   - Highly sensitive medical information
   - Patient ID is direct: instance.patient.id

OPTIMIZATION:
- Use select_related() in pre_save to minimize queries
- Only capture fields that matter for auditing
- Skip audit logging for AuditLog model itself

ERROR HANDLING:
- All signal handlers must have try/except
- Log errors but don't raise exceptions
- Clean up thread-locals in finally block

TASK OUTPUT:
Provide complete signal handler implementations for all seven models following the pattern above.
```

---

## 🔨 Task 2.3: Register Signals in App Configuration

### Context
Django signals need to be imported when the app initializes. The proper place to do this is in the AppConfig's ready() method.

### LLM Prompt

```
TASK: Register audit signals when Django app starts

CONTEXT:
You created signal handlers in signals.py. Now you need to ensure Django loads and connects these signals when the app starts. Without this step, signals won't fire.

FILE TO MODIFY: backend/api/apps.py

CURRENT STATE:
The file likely has a basic ApiConfig class:
```python
from django.apps import AppConfig

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
```

REQUIREMENTS:

1. Override the ready() method
2. Import signals module to trigger @receiver decorators
3. Add checks to prevent signals from registering multiple times
4. Add logging to confirm signals loaded

MODIFIED CODE:

```python
from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    
    def ready(self):
        """
        Initialize app components when Django starts.
        
        This method is called when the app is fully loaded.
        Import signals here to ensure they're connected.
        """
        # Import signals to register handlers
        try:
            from api import signals
            signals.register_audit_signals()  # Call explicit registration function
            logger.info("API app ready: Audit signals registered")
        except Exception as e:
            logger.error(f"Failed to register audit signals: {e}")
            # Don't crash the app if audit registration fails
            # but log it for investigation
```

VERIFICATION:
After modification, start Django and check logs:

```bash
python manage.py runserver
```

You should see in console:
```
INFO - API app ready: Audit signals registered
INFO - Audit signals registered successfully
```

TROUBLESHOOTING:

If signals fire twice:
- This is normal in development (runserver auto-reloads)
- In production, ready() is only called once
- Add flag to prevent double registration if needed:

```python
# In signals.py
_signals_registered = False

def register_audit_signals():
    global _signals_registered
    if _signals_registered:
        return
    _signals_registered = True
    logger.info("Audit signals registered successfully")
```

If signals don't fire:
- Check apps.py default_app_config is set (if needed)
- Verify signals.py has no import errors
- Check all @receiver decorators are properly formatted
- Ensure models are imported in signals.py
```

---

## 🔨 Task 2.4: Add Audit Context to View Layer

### Context
Signals don't have access to the HTTP request, so they can't know WHO made the change. You need to attach audit context (actor, IP, user agent) to model instances before saving them.

### LLM Prompt

```
TASK: Inject audit context into model instances before save operations

CONTEXT:
Your signal handlers look for _audit_actor, _audit_ip, and _audit_user_agent attributes on model instances. These aren't standard Django fields - you need to set them in your views before calling .save().

FILES TO MODIFY:
- backend/api/views.py (add audit context to all save operations)

STRATEGY:

There are two approaches:
1. Manual injection in each view (more control, more code)
2. DRF perform_create/perform_update overrides (cleaner, DRF-specific)

RECOMMENDED: Use DRF overrides for ViewSets

IMPLEMENTATION FOR VIEWSETS:

Find your UserViewSet, AppointmentViewSet, etc. and add these methods:

```python
from api.audit_service import get_client_ip, get_user_agent

class UserViewSet(viewsets.ModelViewSet):
    # ... existing code ...
    
    def perform_create(self, serializer):
        """Override to inject audit context before creation."""
        instance = serializer.save()
        instance._audit_actor = self.request.user
        instance._audit_ip = get_client_ip(self.request)
        instance._audit_user_agent = get_user_agent(self.request)
        # Note: save() is already called by serializer.save()
        # The signal will capture this context
        return instance
    
    def perform_update(self, serializer):
        """Override to inject audit context before update."""
        instance = serializer.save()
        instance._audit_actor = self.request.user
        instance._audit_ip = get_client_ip(self.request)
        instance._audit_user_agent = get_user_agent(self.request)
        return instance
    
    def perform_destroy(self, instance):
        """Override to inject audit context before deletion."""
        instance._audit_actor = self.request.user
        instance._audit_ip = get_client_ip(self.request)
        super().perform_destroy(instance)
```

APPLY TO ALL VIEWSETS:

Find these ViewSets in views.py and add the three methods to each:
- UserViewSet
- AppointmentViewSet (if exists)
- DentalRecordViewSet
- BillingViewSet
- InvoiceViewSet
- ServiceViewSet (if contains PHI)
- DocumentViewSet

ALTERNATIVE: Create a Mixin

To avoid repetition, create a reusable mixin:

```python
class AuditContextMixin:
    """Mixin to automatically inject audit context into model operations."""
    
    def _inject_audit_context(self, instance):
        """Attach current request context to instance for audit logging."""
        if hasattr(self, 'request') and self.request.user.is_authenticated:
            instance._audit_actor = self.request.user
            instance._audit_ip = get_client_ip(self.request)
            instance._audit_user_agent = get_user_agent(self.request)
    
    def perform_create(self, serializer):
        instance = serializer.save()
        self._inject_audit_context(instance)
        return instance
    
    def perform_update(self, serializer):
        instance = serializer.save()
        self._inject_audit_context(instance)
        return instance
    
    def perform_destroy(self, instance):
        self._inject_audit_context(instance)
        super().perform_destroy(instance)


# Then use it:
class UserViewSet(AuditContextMixin, viewsets.ModelViewSet):
    # All audit context injection handled by mixin
    pass
```

FUNCTION-BASED VIEWS:

If you have function-based views (like your current login/logout), inject manually:

```python
@api_view(['POST'])
def some_function_view(request):
    user = User.objects.get(id=request.data['id'])
    user.email = request.data['email']
    
    # Inject audit context
    user._audit_actor = request.user
    user._audit_ip = get_client_ip(request)
    user._audit_user_agent = get_user_agent(request)
    
    user.save()
    return Response({'status': 'updated'})
```

SYSTEM OPERATIONS (No Request Context):

For management commands or cron jobs, set actor to None:

```python
# In management command
user = User.objects.get(id=patient_id)
user._audit_actor = None  # System action
user._audit_ip = '0.0.0.0'
user._audit_user_agent = 'System/Scheduled Task'
user.save()
```

VALIDATION:
After implementation:
1. Create a new patient via API
2. Query audit logs: SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1;
3. Verify actor_id is correct (your user ID)
4. Verify ip_address is captured
5. Verify user_agent is captured

If actor_id is NULL:
- Check perform_create override is being called
- Check self.request.user is authenticated
- Verify mixin is in correct order: AuditContextMixin before ModelViewSet
```

---

## 🔨 Task 2.5: Write Comprehensive Tests

### LLM Prompt

```
TASK: Create comprehensive unit tests for Phase 2 signal-based audit logging

FILE TO CREATE: backend/api/tests/test_audit_signals.py (NEW FILE)

REQUIREMENTS:

Test the following scenarios:

1. CREATE operations create audit logs
2. UPDATE operations create audit logs with before/after
3. DELETE operations create audit logs with deleted data
4. Patient ID is correctly extracted for all models
5. Audit context (actor, IP) is captured from views
6. Multiple updates to same record create multiple logs
7. Bulk operations create individual logs
8. Signal failures don't crash saves
9. Thread-local storage is properly cleaned up

TEST CLASS STRUCTURE:

```python
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from api.models import (
    AuditLog, Appointment, DentalRecord, 
    Billing, PatientIntakeForm
)
from api.audit_service import get_client_ip, get_user_agent
from rest_framework.test import APIClient
from datetime import date, time

User = get_user_model()


class TestAuditSignalsBase(TestCase):
    """Base class with common setup."""
    
    def setUp(self):
        """Create test users and request factory."""
        self.patient = User.objects.create_user(
            username='patient1',
            email='patient@test.com',
            password='pass123',
            user_type='patient',
            first_name='John',
            last_name='Doe'
        )
        
        self.dentist = User.objects.create_user(
            username='dentist1',
           email='dentist@test.com',
            password='pass123',
            user_type='staff',
            role='dentist',
            first_name='Dr.',
            last_name='Smith'
        )
        
        self.factory = RequestFactory()
        
        # Clear any existing audit logs
        AuditLog.objects.all().delete()
    
    def inject_audit_context(self, instance, actor):
        """Helper to inject audit context into instance."""
        request = self.factory.post('/test/')
        request.user = actor
        request.META['REMOTE_ADDR'] = '192.168.1.100'
        request.META['HTTP_USER_AGENT'] = 'TestClient/1.0'
        
        instance._audit_actor = actor
        instance._audit_ip = get_client_ip(request)
        instance._audit_user_agent = get_user_agent(request)


class TestUserSignals(TestAuditSignalsBase):
    """Test User model signal handlers."""
    
    def test_user_creation_creates_audit_log(self):
        """Test that creating a user creates an audit log."""
        AuditLog.objects.all().delete()
        
        user = User.objects.create_user(
            username='newpatient',
            email='new@test.com',
            password='pass123',
            user_type='patient'
        )
        self.inject_audit_context(user, self.dentist)
        
        logs = AuditLog.objects.filter(
            action_type='CREATE',
            target_table='User',
            target_record_id=user.id
        )
        
        self.assertEqual(logs.count(), 1)
        log = logs.first()
        self.assertEqual(log.actor, self.dentist)
        self.assertEqual(log.patient_id, user.id)
    
    def test_user_update_captures_changes(self):
        """Test that updating a user logs before/after values."""
        AuditLog.objects.all().delete()
        
        # First update
        self.patient.email = 'newemail@test.com'
        self.inject_audit_context(self.patient, self.dentist)
        self.patient.save()
        
        logs = AuditLog.objects.filter(
            action_type='UPDATE',
            target_table='User',
            target_record_id=self.patient.id
        )
        
        self.assertEqual(logs.count(), 1)
        log = logs.first()
        self.assertIsNotNone(log.changes)
        self.assertIn('before', log.changes)
        self.assertIn('after', log.changes)
        self.assertEqual(log.changes['before']['email'], 'patient@test.com')
        self.assertEqual(log.changes['after']['email'], 'newemail@test.com')
    
    def test_user_deletion_logs_deleted_data(self):
        """Test that deleting a user logs the deleted record."""
        AuditLog.objects.all().delete()
        
        user_id = self.patient.id
        self.inject_audit_context(self.patient, self.dentist)
        self.patient.delete()
        
        logs = AuditLog.objects.filter(
            action_type='DELETE',
            target_table='User',
            target_record_id=user_id
        )
        
        self.assertEqual(logs.count(), 1)
        log = logs.first()
        self.assertIn('deleted_record', log.changes)
        self.assertEqual(log.changes['deleted_record']['email'], 'patient@test.com')


class TestAppointmentSignals(TestAuditSignalsBase):
    """Test Appointment model signal handlers."""
    
    def test_appointment_creation_logs_with_patient_id(self):
        """Test that appointment creation includes patient ID."""
        from api.models import ClinicLocation
        
        clinic = ClinicLocation.objects.create(
            name='Test Clinic',
            address='123 Test St'
        )
        
        AuditLog.objects.all().delete()
        
        appt = Appointment.objects.create(
            patient=self.patient,
            dentist=self.dentist,
            clinic=clinic,
            date=date(2026, 3, 1),
            time=time(10, 0),
            type='checkup',
            status='confirmed'
        )
        self.inject_audit_context(appt, self.dentist)
        
        logs = AuditLog.objects.filter(
            action_type='CREATE',
            target_table='Appointment'
        )
        
        self.assertEqual(logs.count(), 1)
        log = logs.first()
        self.assertEqual(log.patient_id, self.patient.id)
        self.assertEqual(log.target_record_id, appt.id)
    
    def test_appointment_status_change_tracked(self):
        """Test that status changes are captured in audit log."""
        from api.models import ClinicLocation
        
        clinic = ClinicLocation.objects.create(
            name='Test Clinic',
            address='123 Test St'
        )
        
        appt = Appointment.objects.create(
            patient=self.patient,
            dentist=self.dentist,
            clinic=clinic,
            date=date(2026, 3, 1),
            time=time(10, 0),
            type='checkup',
            status='confirmed'
        )
        
        AuditLog.objects.all().delete()
        
        # Change status
        appt.status = 'completed'
        self.inject_audit_context(appt, self.dentist)
        appt.save()
        
        logs = AuditLog.objects.filter(
            action_type='UPDATE',
            target_table='Appointment'
        )
        
        self.assertEqual(logs.count(), 1)
        log = logs.first()
        self.assertIn('changed_fields', log.changes)
        self.assertIn('status', log.changes['changed_fields'])
        self.assertEqual(log.changes['before']['status'], 'confirmed')
        self.assertEqual(log.changes['after']['status'], 'completed')


class TestDentalRecordSignals(TestAuditSignalsBase):
    """Test DentalRecord model signal handlers."""
    
    def test_dental_record_creation_logged(self):
        """Test dental record creation is audited."""
        AuditLog.objects.all().delete()
        
        record = DentalRecord.objects.create(
            patient=self.patient,
            dentist=self.dentist,
            diagnosis='Cavity on tooth #14',
            treatment='Filling',
            notes='Patient tolerated procedure well'
        )
        self.inject_audit_context(record, self.dentist)
        
        logs = AuditLog.objects.filter(
            action_type='CREATE',
            target_table='DentalRecord'
        )
        
        self.assertEqual(logs.count(), 1)
        log = logs.first()
        self.assertEqual(log.patient_id, self.patient.id)
        self.assertEqual(log.actor, self.dentist)


class TestSignalPerformance(TestAuditSignalsBase):
    """Test signal handler performance and edge cases."""
    
    def test_bulk_create_logs_individually(self):
        """Test that bulk_create generates individual audit logs."""
        # Note: Django bulk_create doesn't trigger signals
        # This is expected behavior - document it
        pass
    
    def test_signal_failure_doesnt_crash_save(self):
        """Test that audit log failures don't prevent saves."""
        # Temporarily break audit logging
        from unittest.mock import patch
        
        with patch('api.signals.create_audit_log', side_effect=Exception('Test error')):
            # This should still succeed
            user = User.objects.create_user(
                username='testuser',
                email='test@example.com',
                password='pass123'
            )
            self.assertIsNotNone(user.id)
    
    def test_multiple_saves_create_multiple_logs(self):
        """Test that saving same record multiple times creates multiple logs."""
        AuditLog.objects.all().delete()
        
        self.patient.email = 'email1@test.com'
        self.inject_audit_context(self.patient, self.dentist)
        self.patient.save()
        
        self.patient.email = 'email2@test.com'
        self.inject_audit_context(self.patient, self.dentist)
        self.patient.save()
        
        logs = AuditLog.objects.filter(
            action_type='UPDATE',
            target_table='User',
            target_record_id=self.patient.id
        )
        
        self.assertEqual(logs.count(), 2)
```

RUNNING TESTS:
```bash
cd backend
python manage.py test api.tests.test_audit_signals -v 2
```

EXPECTED RESULTS:
- All tests pass
- No signal errors in logs
- Audit logs are created for all operations
- Before/after changes are correctly captured
- Patient IDs are properly extracted

DEBUGGING FAILED TESTS:
If tests fail, check:
1. Signals are registered (check apps.py ready() method)
2. Signal handlers have correct imports
3. Thread-local storage is cleaned up
4. AuditLog model exists and is migrated
```

---

## 🔨 Task 2.6: Performance Optimization

### Context
Signal handlers add overhead to every save operation. For high-traffic applications, this needs optimization.

### LLM Prompt

```
TASK: Optimize signal handler performance

CONTEXT:
Your signal handlers work but may be slow for bulk operations. Implement optimizations to minimize database queries and processing time.

OPTIMIZATION STRATEGIES:

1. **Minimize Queries in Signals**

Current pre_save:
```python
@receiver(pre_save, sender=Appointment)
def appointment_pre_save(sender, instance, **kwargs):
    if instance.pk:
        old_instance = Appointment.objects.get(pk=instance.pk)  # Query 1
        # This triggers additional queries for ForeignKeys
```

Optimized:
```python
@receiver(pre_save, sender=Appointment)
def appointment_pre_save(sender, instance, **kwargs):
    if instance.pk:
        old_instance = Appointment.objects.select_related(
            'patient', 'dentist', 'clinic'
        ).get(pk=instance.pk)  # Single query with joins
```

2. **Skip Audit for Non-PHI Changes**

Some fields don't need auditing:
```python
# In signals.py
NON_PHI_FIELDS = {'last_login', 'updated_at', 'created_at'}

def should_audit_changes(old_data, new_data):
    """Check if any PHI fields changed."""
    changed_fields = [k for k in new_data if old_data.get(k) != new_data.get(k)]
    phi_changed = any(field not in NON_PHI_FIELDS for field in changed_fields)
    return phi_changed

# In post_save handler:
if not created and old_data:
    if not should_audit_changes(old_data, new_data):
        return  # Skip audit if only non-PHI fields changed
```

3. **Defer Audit Log Creation**

For non-critical logs, defer to async task:
```python
# In signals.py
from django.conf import settings

def should_defer_audit_log(action_type, model_name):
    """Decide if audit log can be created asynchronously."""
    # Critical actions: log immediately
    if action_type in ['DELETE', 'LOGIN_FAILED']:
        return False
    # Non-critical: can be deferred
    return True

# In post_save handler:
if settings.CELERY_ENABLED and should_defer_audit_log(action_type, 'User'):
    # Defer to async task (Phase 4)
    from api.tasks import create_audit_log_async
    create_audit_log_async.delay(actor_id, action_type, ...)
else:
    # Synchronous logging
    create_audit_log(actor, action_type, ...)
```

4. **Batch Signal Processing**

For bulk operations (if you modify bulk_create to trigger signals):
```python
audit_logs_to_create = []

for instance in instances:
    log = AuditLog(
        actor=actor,
        action_type='CREATE',
        # ... fields ...
    )
    audit_logs_to_create.append(log)

# Single bulk insert
AuditLog.objects.bulk_create(audit_logs_to_create)
```

5. **Database Connection Pooling**

If using separate audit database, enable connection pooling:
```python
# settings.py
DATABASES = {
    'audit_db': {
        'ENGINE': 'django.db.backends.postgresql',
        # ... connection details ...
        'CONN_MAX_AGE': 600,  # Keep connections open for 10 minutes
        'OPTIONS': {
            'pool_size': 10,  # Connection pool size
        }
    }
}
```

BENCHMARK PERFORMANCE:

Create a test script:
```python
# test_audit_performance.py
import time
from api.models import User, AuditLog

# Measure baseline (no auditing)
AuditLog.objects.all().delete()
start = time.time()
for i in range(100):
    user = User.objects.create_user(
        username=f'user{i}',
        email=f'user{i}@test.com',
        password='pass123'
    )
end = time.time()
print(f"100 creates without audit: {end - start:.2f}s")

# Measure with auditing
AuditLog.objects.all().delete()
start = time.time()
for i in range(100):
    user = User.objects.create_user(
        username=f'user{i}_audit',
        email=f'user{i}_audit@test.com',
        password='pass123'
    )
    user._audit_actor = None
    user._audit_ip = '127.0.0.1'
    user._audit_user_agent = 'Benchmark'
end = time.time()
print(f"100 creates with audit: {end - start:.2f}s")
print(f"Overhead per create: {(end - start) / 100 * 1000:.1f}ms")
```

TARGET PERFORMANCE:
- < 20ms overhead per CREATE operation
- < 30ms overhead per UPDATE operation
- < 10ms overhead per DELETE operation (already deleted, just log)

If exceeding targets, enable async logging (Phase 4).
```

---

## 📊 Phase 2 Completion Criteria

You have successfully completed Phase 2 when:

- ✅ Signal handlers exist for all critical models
- ✅ CREATE operations generate audit logs
- ✅ UPDATE operations capture before/after changes
- ✅ DELETE operations log deleted data
- ✅ Patient IDs correctly extracted for all models
- ✅ Audit context (actor, IP) captured from views
- ✅ All unit tests pass
- ✅ Performance overhead < 30ms per operation
- ✅ Signal failures don't crash application
- ✅ Thread-local storage properly cleaned up

---

## 🚀 Next Steps

Once Phase 2 is complete:
1. Verify all tests pass
2. Check audit logs in database for CREATE/UPDATE/DELETE entries
3. Review code for DRY violations (consider mixins)
4. Proceed to [PHASE_3_READ_LOGGING.md](./PHASE_3_READ_LOGGING.md)

---

**Phase 2 Status:** Ready for Implementation  
**Next Phase:** [PHASE_3_READ_LOGGING.md](./PHASE_3_READ_LOGGING.md)
