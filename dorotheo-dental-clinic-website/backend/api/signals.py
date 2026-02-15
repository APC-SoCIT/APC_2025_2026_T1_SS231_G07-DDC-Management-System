"""
Django signals for automatic audit logging.

This module implements HIPAA-compliant audit trails by automatically
logging all CREATE, UPDATE, and DELETE operations on critical models.

Signal handlers are triggered by Django's ORM and work across all
access methods (API, admin panel, management commands, etc.).
"""

import threading
import logging
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.forms.models import model_to_dict
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist

logger = logging.getLogger(__name__)

User = get_user_model()

# Thread-local storage to hold pre-save model state
_thread_locals = threading.local()

# Models that should be audited (all models containing PHI)
AUDITED_MODELS = {
    'User', 'DentalRecord', 'Appointment', 'Billing', 
    'Invoice', 'TreatmentPlan', 'Document', 'PatientIntakeForm'
}

# Flag to prevent duplicate signal registration
_signals_registered = False


def get_patient_id_from_instance(instance):
    """
    Extract patient ID from a model instance.
    
    Returns the patient User ID if the instance has a patient relationship,
    otherwise returns None (for non-patient-specific records).
    """
    # Direct patient field
    if hasattr(instance, 'patient') and instance.patient:
        return instance.patient.id
    
    # User model - only return ID if it's a patient
    if instance.__class__.__name__ == 'User':
        if hasattr(instance, 'user_type') and instance.user_type == 'patient':
            return instance.id
    
    # Through appointment relationship
    if hasattr(instance, 'appointment') and instance.appointment:
        if hasattr(instance.appointment, 'patient'):
            return instance.appointment.patient.id
    
    return None


def serialize_model_instance(instance, exclude_fields=None):
    """
    Convert model instance to dictionary, excluding sensitive fields.
    
    Args:
        instance: Django model instance
        exclude_fields: List of field names to exclude (beyond defaults)
    
    Returns:
        Dictionary with sanitized model data
    """
    from api.audit_service import sanitize_data
    from datetime import datetime, date, time
    from decimal import Decimal
    
    if exclude_fields is None:
        exclude_fields = []
    
    # Always exclude these fields
    default_excludes = ['password', 'auth_token']
    exclude_fields.extend(default_excludes)
    
    try:
        data = model_to_dict(instance, exclude=exclude_fields)
        # Convert any non-serializable objects to strings
        for key, value in data.items():
            if value is None:
                continue
            elif hasattr(value, 'id'):
                # ForeignKey - store the ID
                data[key] = value.id
            elif isinstance(value, (datetime, date, time)):
                # Convert datetime objects to ISO format strings
                data[key] = value.isoformat()
            elif isinstance(value, Decimal):
                # Convert Decimal to string
                data[key] = str(value)
            elif hasattr(value, 'name'):
                # File field - store the file path/name
                data[key] = str(value.name) if value else None
            elif not isinstance(value, (str, int, float, bool, list, dict)):
                # Catch-all for any other non-JSON-serializable types
                data[key] = str(value)
        return sanitize_data(data)
    except Exception as e:
        logger.error(f"Error serializing {instance.__class__.__name__}: {e}")
        return {}


def get_old_instance_key(instance):
    """Generate a unique key for storing pre-save state in thread-local storage."""
    return f"{instance.__class__.__name__}_{instance.pk}_{id(instance)}"


# ==================== USER SIGNALS ====================

@receiver(pre_save, sender=User)
def user_pre_save(sender, instance, **kwargs):
    """Capture User state before modification."""
    if instance.pk:  # Only for updates, not creates
        try:
            old_instance = User.objects.get(pk=instance.pk)
            key = get_old_instance_key(instance)
            _thread_locals.__dict__[key] = serialize_model_instance(old_instance)
        except ObjectDoesNotExist:
            pass
        except Exception as e:
            logger.error(f"Error in user_pre_save: {e}")


@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    """Log User creation or modification."""
    # Import here to avoid circular imports
    from api.audit_service import create_audit_log
    
    try:
        action_type = 'CREATE' if created else 'UPDATE'
        key = get_old_instance_key(instance)
        old_data = _thread_locals.__dict__.get(key, {})
        new_data = serialize_model_instance(instance)
        
        changes = {}
        if not created and old_data:
            # Track what changed using before/after format
            before = {}
            after = {}
            for field, new_value in new_data.items():
                old_value = old_data.get(field)
                if old_value != new_value:
                    before[field] = old_value
                    after[field] = new_value
            if before:  # Only log if something actually changed
                changes = {'before': before, 'after': after}
        elif created:
            changes = new_data
        
        # Get audit context from instance if set by view layer
        actor = getattr(instance, '_audit_actor', None)
        ip_address = getattr(instance, '_audit_ip', None)
        user_agent = getattr(instance, '_audit_user_agent', '')
        
        # For patient records, patient_id is the user themselves
        patient_id = instance if instance.user_type == 'patient' else None
        
        create_audit_log(
            actor=actor,
            action_type=action_type,
            target_table='User',
            target_record_id=instance.id,
            patient_id=patient_id,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error in user_post_save: {e}")
    finally:
        # Clean up thread-local storage
        if key in _thread_locals.__dict__:
            del _thread_locals.__dict__[key]


@receiver(post_delete, sender=User)
def user_post_delete(sender, instance, **kwargs):
    """Log User deletion."""
    from api.audit_service import create_audit_log
    
    try:
        actor = getattr(instance, '_audit_actor', None)
        ip_address = getattr(instance, '_audit_ip', None)
        user_agent = getattr(instance, '_audit_user_agent', '')
        
        deleted_data = serialize_model_instance(instance)
        patient_id = instance if instance.user_type == 'patient' else None
        
        create_audit_log(
            actor=actor,
            action_type='DELETE',
            target_table='User',
            target_record_id=instance.id,
            patient_id=patient_id,
            changes={'deleted_data': deleted_data},
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error in user_post_delete: {e}")


# ==================== DENTAL RECORD SIGNALS ====================

@receiver(pre_save, sender='api.DentalRecord')
def dental_record_pre_save(sender, instance, **kwargs):
    """Capture DentalRecord state before modification."""
    if instance.pk:
        try:
            from api.models import DentalRecord
            old_instance = DentalRecord.objects.get(pk=instance.pk)
            key = get_old_instance_key(instance)
            _thread_locals.__dict__[key] = serialize_model_instance(old_instance)
        except ObjectDoesNotExist:
            pass
        except Exception as e:
            logger.error(f"Error in dental_record_pre_save: {e}")


@receiver(post_save, sender='api.DentalRecord')
def dental_record_post_save(sender, instance, created, **kwargs):
    """Log DentalRecord creation or modification."""
    from api.audit_service import create_audit_log
    
    try:
        action_type = 'CREATE' if created else 'UPDATE'
        key = get_old_instance_key(instance)
        old_data = _thread_locals.__dict__.get(key, {})
        new_data = serialize_model_instance(instance)
        
        changes = {}
        if not created and old_data:
            # Track what changed using before/after format
            before = {}
            after = {}
            for field, new_value in new_data.items():
                old_value = old_data.get(field)
                if old_value != new_value:
                    before[field] = old_value
                    after[field] = new_value
            if before:  # Only log if something actually changed
                changes = {'before': before, 'after': after}
        elif created:
            # For creates, log key medical information but not full content
            changes = {
                'treatment': 'Created',
                'diagnosis': 'Created',
                'appointment_id': instance.appointment.id if instance.appointment else None,
                'clinic_id': instance.clinic.id if instance.clinic else None,
            }
        
        actor = getattr(instance, '_audit_actor', None)
        ip_address = getattr(instance, '_audit_ip', None)
        user_agent = getattr(instance, '_audit_user_agent', '')
        
        create_audit_log(
            actor=actor,
            action_type=action_type,
            target_table='DentalRecord',
            target_record_id=instance.id,
            patient_id=instance.patient if instance.patient else None,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error in dental_record_post_save: {e}")
    finally:
        if key in _thread_locals.__dict__:
            del _thread_locals.__dict__[key]


@receiver(post_delete, sender='api.DentalRecord')
def dental_record_post_delete(sender, instance, **kwargs):
    """Log DentalRecord deletion."""
    from api.audit_service import create_audit_log
    
    try:
        actor = getattr(instance, '_audit_actor', None)
        ip_address = getattr(instance, '_audit_ip', None)
        user_agent = getattr(instance, '_audit_user_agent', '')
        
        # Log deletion but don't store full medical content
        deleted_data = {
            'patient_id': instance.patient.id if instance.patient else None,
            'appointment_id': instance.appointment.id if instance.appointment else None,
            'created_at': str(instance.created_at),
        }
        
        create_audit_log(
            actor=actor,
            action_type='DELETE',
            target_table='DentalRecord',
            target_record_id=instance.id,
            patient_id=instance.patient if instance.patient else None,
            changes={'deleted_data': deleted_data},
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error in dental_record_post_delete: {e}")


# ==================== APPOINTMENT SIGNALS ====================

@receiver(pre_save, sender='api.Appointment')
def appointment_pre_save(sender, instance, **kwargs):
    """Capture Appointment state before modification."""
    if instance.pk:
        try:
            from api.models import Appointment
            old_instance = Appointment.objects.select_related('patient', 'dentist', 'service').get(pk=instance.pk)
            key = get_old_instance_key(instance)
            _thread_locals.__dict__[key] = serialize_model_instance(old_instance)
        except ObjectDoesNotExist:
            pass
        except Exception as e:
            logger.error(f"Error in appointment_pre_save: {e}")


@receiver(post_save, sender='api.Appointment')
def appointment_post_save(sender, instance, created, **kwargs):
    """Log Appointment creation or modification."""
    from api.audit_service import create_audit_log
    
    try:
        action_type = 'CREATE' if created else 'UPDATE'
        key = get_old_instance_key(instance)
        old_data = _thread_locals.__dict__.get(key, {})
        new_data = serialize_model_instance(instance)
        
        changes = {}
        if not created and old_data:
            # Track what changed using before/after format
            before = {}
            after = {}
            for field, new_value in new_data.items():
                old_value = old_data.get(field)
                if old_value != new_value:
                    before[field] = old_value
                    after[field] = new_value
            if before:  # Only log if something actually changed
                changes = {'before': before, 'after': after}
        elif created:
            changes = {
                'date': str(instance.date),
                'time': str(instance.time),
                'status': instance.status,
                'service_id': instance.service.id if instance.service else None,
                'dentist_id': instance.dentist.id if instance.dentist else None,
                'clinic_id': instance.clinic.id if instance.clinic else None,
            }
        
        actor = getattr(instance, '_audit_actor', None)
        ip_address = getattr(instance, '_audit_ip', None)
        user_agent = getattr(instance, '_audit_user_agent', '')
        
        create_audit_log(
            actor=actor,
            action_type=action_type,
            target_table='Appointment',
            target_record_id=instance.id,
            patient_id=instance.patient if instance.patient else None,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error in appointment_post_save: {e}")
    finally:
        if key in _thread_locals.__dict__:
            del _thread_locals.__dict__[key]


@receiver(post_delete, sender='api.Appointment')
def appointment_post_delete(sender, instance, **kwargs):
    """Log Appointment deletion."""
    from api.audit_service import create_audit_log
    
    try:
        actor = getattr(instance, '_audit_actor', None)
        ip_address = getattr(instance, '_audit_ip', None)
        user_agent = getattr(instance, '_audit_user_agent', '')
        
        deleted_data = {
            'patient_id': instance.patient.id if instance.patient else None,
            'date': str(instance.date),
            'time': str(instance.time),
            'status': instance.status,
        }
        
        create_audit_log(
            actor=actor,
            action_type='DELETE',
            target_table='Appointment',
            target_record_id=instance.id,
            patient_id=instance.patient if instance.patient else None,
            changes={'deleted_data': deleted_data},
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error in appointment_post_delete: {e}")


# ==================== BILLING SIGNALS ====================

@receiver(pre_save, sender='api.Billing')
def billing_pre_save(sender, instance, **kwargs):
    """Capture Billing state before modification."""
    if instance.pk:
        try:
            from api.models import Billing
            old_instance = Billing.objects.select_related('patient', 'appointment').get(pk=instance.pk)
            key = get_old_instance_key(instance)
            _thread_locals.__dict__[key] = serialize_model_instance(old_instance)
        except ObjectDoesNotExist:
            pass
        except Exception as e:
            logger.error(f"Error in billing_pre_save: {e}")


@receiver(post_save, sender='api.Billing')
def billing_post_save(sender, instance, created, **kwargs):
    """Log Billing creation or modification."""
    from api.audit_service import create_audit_log
    
    try:
        action_type = 'CREATE' if created else 'UPDATE'
        key = get_old_instance_key(instance)
        old_data = _thread_locals.__dict__.get(key, {})
        new_data = serialize_model_instance(instance)
        
        changes = {}
        if not created and old_data:
            # Track financial changes using before/after format
            before = {}
            after = {}
            for field, new_value in new_data.items():
                old_value = old_data.get(field)
                if old_value != new_value:
                    before[field] = old_value
                    after[field] = new_value
            if before:  # Only log if something actually changed
                changes = {'before': before, 'after': after}
        elif created:
            changes = {
                'amount': str(instance.amount),
                'status': instance.status,
                'appointment_id': instance.appointment.id if instance.appointment else None,
            }
        
        actor = getattr(instance, '_audit_actor', None)
        ip_address = getattr(instance, '_audit_ip', None)
        user_agent = getattr(instance, '_audit_user_agent', '')
        
        create_audit_log(
            actor=actor,
            action_type=action_type,
            target_table='Billing',
            target_record_id=instance.id,
            patient_id=instance.patient if instance.patient else None,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error in billing_post_save: {e}")
    finally:
        if key in _thread_locals.__dict__:
            del _thread_locals.__dict__[key]


@receiver(post_delete, sender='api.Billing')
def billing_post_delete(sender, instance, **kwargs):
    """Log Billing deletion."""
    from api.audit_service import create_audit_log
    
    try:
        actor = getattr(instance, '_audit_actor', None)
        ip_address = getattr(instance, '_audit_ip', None)
        user_agent = getattr(instance, '_audit_user_agent', '')
        
        deleted_data = {
            'patient_id': instance.patient.id if instance.patient else None,
            'amount': str(instance.amount),
            'status': instance.status,
        }
        
        create_audit_log(
            actor=actor,
            action_type='DELETE',
            target_table='Billing',
            target_record_id=instance.id,
            patient_id=instance.patient if instance.patient else None,
            changes={'deleted_data': deleted_data},
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error in billing_post_delete: {e}")


# ==================== INVOICE SIGNALS ====================

@receiver(pre_save, sender='api.Invoice')
def invoice_pre_save(sender, instance, **kwargs):
    """Capture Invoice state before modification."""
    if instance.pk:
        try:
            from api.models import Invoice
            old_instance = Invoice.objects.select_related('patient', 'appointment').get(pk=instance.pk)
            key = get_old_instance_key(instance)
            _thread_locals.__dict__[key] = serialize_model_instance(old_instance)
        except ObjectDoesNotExist:
            pass
        except Exception as e:
            logger.error(f"Error in invoice_pre_save: {e}")


@receiver(post_save, sender='api.Invoice')
def invoice_post_save(sender, instance, created, **kwargs):
    """Log Invoice creation or modification."""
    from api.audit_service import create_audit_log
    
    try:
        action_type = 'CREATE' if created else 'UPDATE'
        key = get_old_instance_key(instance)
        old_data = _thread_locals.__dict__.get(key, {})
        new_data = serialize_model_instance(instance)
        
        changes = {}
        if not created and old_data:
            # Track what changed using before/after format
            before = {}
            after = {}
            for field, new_value in new_data.items():
                old_value = old_data.get(field)
                if old_value != new_value:
                    before[field] = old_value
                    after[field] = new_value
            if before:  # Only log if something actually changed
                changes = {'before': before, 'after': after}
        elif created:
            changes = {
                'invoice_number': instance.invoice_number if hasattr(instance, 'invoice_number') else None,
                'total_amount': str(instance.total_amount) if hasattr(instance, 'total_amount') else None,
                'status': instance.status if hasattr(instance, 'status') else None,
            }
        
        actor = getattr(instance, '_audit_actor', None)
        ip_address = getattr(instance, '_audit_ip', None)
        user_agent = getattr(instance, '_audit_user_agent', '')
        
        create_audit_log(
            actor=actor,
            action_type=action_type,
            target_table='Invoice',
            target_record_id=instance.id,
            patient_id=instance.patient if instance.patient else None,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error in invoice_post_save: {e}")
    finally:
        if key in _thread_locals.__dict__:
            del _thread_locals.__dict__[key]


@receiver(post_delete, sender='api.Invoice')
def invoice_post_delete(sender, instance, **kwargs):
    """Log Invoice deletion."""
    from api.audit_service import create_audit_log
    
    try:
        actor = getattr(instance, '_audit_actor', None)
        ip_address = getattr(instance, '_audit_ip', None)
        user_agent = getattr(instance, '_audit_user_agent', '')
        
        deleted_data = {
            'patient_id': instance.patient.id if instance.patient else None,
            'invoice_number': instance.invoice_number if hasattr(instance, 'invoice_number') else None,
            'total_amount': str(instance.total_amount) if hasattr(instance, 'total_amount') else None,
        }
        
        create_audit_log(
            actor=actor,
            action_type='DELETE',
            target_table='Invoice',
            target_record_id=instance.id,
            patient_id=instance.patient if instance.patient else None,
            changes={'deleted_data': deleted_data},
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error in invoice_post_delete: {e}")


# ==================== TREATMENT PLAN SIGNALS ====================

@receiver(pre_save, sender='api.TreatmentPlan')
def treatment_plan_pre_save(sender, instance, **kwargs):
    """Capture TreatmentPlan state before modification."""
    if instance.pk:
        try:
            from api.models import TreatmentPlan
            old_instance = TreatmentPlan.objects.select_related('patient').get(pk=instance.pk)
            key = get_old_instance_key(instance)
            _thread_locals.__dict__[key] = serialize_model_instance(old_instance)
        except ObjectDoesNotExist:
            pass
        except Exception as e:
            logger.error(f"Error in treatment_plan_pre_save: {e}")


@receiver(post_save, sender='api.TreatmentPlan')
def treatment_plan_post_save(sender, instance, created, **kwargs):
    """Log TreatmentPlan creation or modification."""
    from api.audit_service import create_audit_log
    
    try:
        action_type = 'CREATE' if created else 'UPDATE'
        key = get_old_instance_key(instance)
        old_data = _thread_locals.__dict__.get(key, {})
        new_data = serialize_model_instance(instance)
        
        changes = {}
        if not created and old_data:
            # Track what changed using before/after format
            before = {}
            after = {}
            for field, new_value in new_data.items():
                old_value = old_data.get(field)
                if old_value != new_value:
                    before[field] = old_value
                    after[field] = new_value
            if before:  # Only log if something actually changed
                changes = {'before': before, 'after': after}
        elif created:
            changes = {
                'title': instance.title,
                'status': instance.status,
                'start_date': str(instance.start_date),
            }
        
        actor = getattr(instance, '_audit_actor', None)
        ip_address = getattr(instance, '_audit_ip', None)
        user_agent = getattr(instance, '_audit_user_agent', '')
        
        create_audit_log(
            actor=actor,
            action_type=action_type,
            target_table='TreatmentPlan',
            target_record_id=instance.id,
            patient_id=instance.patient if instance.patient else None,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error in treatment_plan_post_save: {e}")
    finally:
        if key in _thread_locals.__dict__:
            del _thread_locals.__dict__[key]


@receiver(post_delete, sender='api.TreatmentPlan')
def treatment_plan_post_delete(sender, instance, **kwargs):
    """Log TreatmentPlan deletion."""
    from api.audit_service import create_audit_log
    
    try:
        actor = getattr(instance, '_audit_actor', None)
        ip_address = getattr(instance, '_audit_ip', None)
        user_agent = getattr(instance, '_audit_user_agent', '')
        
        deleted_data = {
            'patient_id': instance.patient.id if instance.patient else None,
            'title': instance.title,
            'status': instance.status,
        }
        
        create_audit_log(
            actor=actor,
            action_type='DELETE',
            target_table='TreatmentPlan',
            target_record_id=instance.id,
            patient_id=instance.patient if instance.patient else None,
            changes={'deleted_data': deleted_data},
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error in treatment_plan_post_delete: {e}")


# ==================== DOCUMENT SIGNALS ====================

@receiver(pre_save, sender='api.Document')
def document_pre_save(sender, instance, **kwargs):
    """Capture Document state before modification."""
    if instance.pk:
        try:
            from api.models import Document
            old_instance = Document.objects.select_related('patient').get(pk=instance.pk)
            key = get_old_instance_key(instance)
            _thread_locals.__dict__[key] = serialize_model_instance(old_instance)
        except ObjectDoesNotExist:
            pass
        except Exception as e:
            logger.error(f"Error in document_pre_save: {e}")


@receiver(post_save, sender='api.Document')
def document_post_save(sender, instance, created, **kwargs):
    """Log Document creation or modification."""
    from api.audit_service import create_audit_log
    
    try:
        action_type = 'CREATE' if created else 'UPDATE'
        key = get_old_instance_key(instance)
        old_data = _thread_locals.__dict__.get(key, {})
        new_data = serialize_model_instance(instance, exclude_fields=['file'])
        
        changes = {}
        if not created and old_data:
            # Track what changed using before/after format
            before = {}
            after = {}
            for field, new_value in new_data.items():
                old_value = old_data.get(field)
                if old_value != new_value:
                    before[field] = old_value
                    after[field] = new_value
            if before:  # Only log if something actually changed
                changes = {'before': before, 'after': after}
        elif created:
            # Log metadata but not file content
            changes = {
                'document_type': instance.document_type,
                'title': instance.title,
                'file_name': instance.file.name if instance.file else None,
            }
        
        actor = getattr(instance, '_audit_actor', None)
        ip_address = getattr(instance, '_audit_ip', None)
        user_agent = getattr(instance, '_audit_user_agent', '')
        
        create_audit_log(
            actor=actor,
            action_type=action_type,
            target_table='Document',
            target_record_id=instance.id,
            patient_id=instance.patient if instance.patient else None,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error in document_post_save: {e}")
    finally:
        if key in _thread_locals.__dict__:
            del _thread_locals.__dict__[key]


@receiver(post_delete, sender='api.Document')
def document_post_delete(sender, instance, **kwargs):
    """Log Document deletion."""
    from api.audit_service import create_audit_log
    
    try:
        actor = getattr(instance, '_audit_actor', None)
        ip_address = getattr(instance, '_audit_ip', None)
        user_agent = getattr(instance, '_audit_user_agent', '')
        
        deleted_data = {
            'patient_id': instance.patient.id if instance.patient else None,
            'document_type': instance.document_type,
            'title': instance.title,
            'file_name': instance.file.name if instance.file else None,
        }
        
        create_audit_log(
            actor=actor,
            action_type='DELETE',
            target_table='Document',
            target_record_id=instance.id,
            patient_id=instance.patient if instance.patient else None,
            changes={'deleted_data': deleted_data},
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error in document_post_delete: {e}")


# ==================== PATIENT INTAKE FORM SIGNALS ====================

@receiver(pre_save, sender='api.PatientIntakeForm')
def patient_intake_form_pre_save(sender, instance, **kwargs):
    """Capture PatientIntakeForm state before modification."""
    if instance.pk:
        try:
            from api.models import PatientIntakeForm
            old_instance = PatientIntakeForm.objects.select_related('patient').get(pk=instance.pk)
            key = get_old_instance_key(instance)
            _thread_locals.__dict__[key] = serialize_model_instance(old_instance)
        except ObjectDoesNotExist:
            pass
        except Exception as e:
            logger.error(f"Error in patient_intake_form_pre_save: {e}")


@receiver(post_save, sender='api.PatientIntakeForm')
def patient_intake_form_post_save(sender, instance, created, **kwargs):
    """Log PatientIntakeForm creation or modification."""
    from api.audit_service import create_audit_log
    
    try:
        action_type = 'CREATE' if created else 'UPDATE'
        key = get_old_instance_key(instance)
        old_data = _thread_locals.__dict__.get(key, {})
        new_data = serialize_model_instance(instance)
        
        changes = {}
        if not created and old_data:
            # Track medical information changes using before/after format
            before = {}
            after = {}
            for field, new_value in new_data.items():
                old_value = old_data.get(field)
                if old_value != new_value:
                    before[field] = old_value
                    after[field] = new_value
            if before:  # Only log if something actually changed
                changes = {'before': before, 'after': after}
        elif created:
            # Log form creation but not full medical content
            changes = {
                'form_created': True,
                'has_allergies': bool(instance.allergies) if hasattr(instance, 'allergies') else None,
                'has_medications': bool(instance.current_medications) if hasattr(instance, 'current_medications') else None,
            }
        
        actor = getattr(instance, '_audit_actor', None)
        ip_address = getattr(instance, '_audit_ip', None)
        user_agent = getattr(instance, '_audit_user_agent', '')
        
        create_audit_log(
            actor=actor,
            action_type=action_type,
            target_table='PatientIntakeForm',
            target_record_id=instance.id,
            patient_id=instance.patient if instance.patient else None,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error in patient_intake_form_post_save: {e}")
    finally:
        if key in _thread_locals.__dict__:
            del _thread_locals.__dict__[key]


@receiver(post_delete, sender='api.PatientIntakeForm')
def patient_intake_form_post_delete(sender, instance, **kwargs):
    """Log PatientIntakeForm deletion."""
    from api.audit_service import create_audit_log
    
    try:
        actor = getattr(instance, '_audit_actor', None)
        ip_address = getattr(instance, '_audit_ip', None)
        user_agent = getattr(instance, '_audit_user_agent', '')
        
        deleted_data = {
            'patient_id': instance.patient.id if instance.patient else None,
            'form_type': 'PatientIntakeForm',
        }
        
        create_audit_log(
            actor=actor,
            action_type='DELETE',
            target_table='PatientIntakeForm',
            target_record_id=instance.id,
            patient_id=instance.patient if instance.patient else None,
            changes={'deleted_data': deleted_data},
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error in patient_intake_form_post_delete: {e}")


# ==================== SIGNAL REGISTRATION ====================

def register_audit_signals():
    """
    Register all audit signals.
    
    This function is called from api/apps.py when the Django app initializes.
    It ensures all signal handlers are properly connected.
    """
    global _signals_registered
    if _signals_registered:
        logger.debug("Audit signals already registered, skipping")
        return
    
    _signals_registered = True
    logger.info(f"Audit signals registered successfully for models: {', '.join(AUDITED_MODELS)}")
