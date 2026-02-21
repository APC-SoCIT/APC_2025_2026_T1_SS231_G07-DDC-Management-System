"""
Comprehensive Unit Tests for Phase 2: Audit Signal Handlers
Tests automatic audit logging for all CREATE, UPDATE, DELETE operations.
"""

from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.utils import timezone
from api.models import (
    AuditLog, Appointment, DentalRecord, 
    Billing, Invoice, TreatmentPlan, Document, 
    PatientIntakeForm, Service, ClinicLocation
)
from api.audit_service import get_client_ip, get_user_agent
from datetime import date, time, timedelta
from decimal import Decimal
import json

User = get_user_model()


class TestAuditSignalsBase(TestCase):
    """Base class with common setup for all audit signal tests."""
    
    def setUp(self):
        """Create test users, clinic, and clear audit logs."""
        # Create test users
        self.owner = User.objects.create_user(
            username='owner1',
            email='owner@clinic.com',
            password='testpass123',
            user_type='owner',
            first_name='Owner',
            last_name='Admin'
        )
        
        self.patient = User.objects.create_user(
            username='patient1',
            email='patient@test.com',
            password='testpass123',
            user_type='patient',
            first_name='John',
            last_name='Doe',
            phone='555-1234'
        )
        
        self.dentist = User.objects.create_user(
            username='dentist1',
            email='dentist@clinic.com',
            password='testpass123',
            user_type='staff',
            role='dentist',
            first_name='Dr. Sarah',
            last_name='Smith'
        )
        
        self.receptionist = User.objects.create_user(
            username='receptionist1',
            email='receptionist@clinic.com',
            password='testpass123',
            user_type='staff',
            role='receptionist',
            first_name='Jane',
            last_name='Miller'
        )
        
        # Create clinic and service for appointments
        self.clinic = ClinicLocation.objects.create(
            name='Main Clinic',
            address='123 Main St, City, State 12345',
            phone='555-0100'
        )
        
        self.service = Service.objects.create(
            name='General Checkup',
            category='preventive',
            description='Routine dental examination'
        )
        
        # Setup request factory
        self.factory = RequestFactory()
        
        # Clear all audit logs before each test
        AuditLog.objects.all().delete()
    
    def inject_audit_context(self, instance, actor, ip='192.168.1.100', user_agent='TestClient/1.0'):
        """
        Helper method to inject audit context into an instance.
        This simulates what AuditContextMixin does in views.py
        """
        request = self.factory.post('/test/')
        request.user = actor
        request.META['REMOTE_ADDR'] = ip
        request.META['HTTP_USER_AGENT'] = user_agent
        
        instance._audit_actor = actor
        instance._audit_ip = get_client_ip(request)
        instance._audit_user_agent = get_user_agent(request)
    
    def assertAuditLogExists(self, action_type, target_table, target_record_id=None, actor=None, patient_id=None):
        """Helper to assert an audit log exists with expected values."""
        filters = {
            'action_type': action_type,
            'target_table': target_table
        }
        if target_record_id:
            filters['target_record_id'] = target_record_id
        if actor:
            filters['actor'] = actor
        if patient_id:
            filters['patient_id'] = patient_id
        
        logs = AuditLog.objects.filter(**filters)
        self.assertTrue(
            logs.exists(),
            f"No audit log found for {action_type} on {target_table}"
        )
        return logs.first()


class TestUserSignals(TestAuditSignalsBase):
    """Test User model signal handlers."""
    
    def test_user_creation_creates_audit_log(self):
        """Test that creating a patient user creates a CREATE audit log."""
        # Clear logs from setUp
        AuditLog.objects.all().delete()
        
        # Create a new patient WITHOUT saving first
        new_patient = User(
            username='newpatient',
            email='newpatient@test.com',
            user_type='patient',
            first_name='Alice',
            last_name='Johnson'
        )
        new_patient.set_password('testpass123')
        
        # Inject audit context BEFORE save
        self.inject_audit_context(new_patient, self.receptionist)
        # Now save - signals will have context
        new_patient.save()
        
        # Verify audit log was created
        log = self.assertAuditLogExists(
            action_type='CREATE',
            target_table='User',
            target_record_id=new_patient.id,
            patient_id=new_patient
        )
        
        # Verify log details
        self.assertEqual(log.actor, self.receptionist)
        self.assertEqual(log.ip_address, '192.168.1.100')
        self.assertEqual(log.user_agent, 'TestClient/1.0')
        
        print(f"✓ User CREATE audit log verified (Log ID: {log.log_id})")
    
    def test_user_update_captures_before_after_changes(self):
        """Test that updating a user captures before/after values."""
        AuditLog.objects.all().delete()
        
        # Update patient email
        old_email = self.patient.email
        new_email = 'updated@test.com'
        
        self.patient.email = new_email
        self.inject_audit_context(self.patient, self.receptionist)
        self.patient.save()
        
        # Verify UPDATE audit log
        log = self.assertAuditLogExists(
            action_type='UPDATE',
            target_table='User',
            target_record_id=self.patient.id,
            patient_id=self.patient
        )
        
        # Verify changes are captured
        self.assertIsNotNone(log.changes)
        self.assertIn('email', log.changes)
        
        # Verify email change is recorded (signals use {field: {old, new}} format)
        self.assertEqual(log.changes['email']['old'], old_email)
        self.assertEqual(log.changes['email']['new'], new_email)
        
        print(f"✓ User UPDATE audit log captures changes correctly")
    
    def test_user_deletion_logs_deleted_data(self):
        """Test that deleting a user logs the deleted record data."""
        # Create a temporary STAFF user to delete (not patient, to avoid PROTECT constraint)
        temp_staff = User.objects.create_user(
            username='tempstaff',
            email='temp@staff.com',
            password='testpass123',
            user_type='staff',
            role='receptionist',
            first_name='Temp',
            last_name='Staff'
        )
        
        AuditLog.objects.all().delete()
        
        # Store ID before deletion
        staff_id = temp_staff.id
        staff_email = temp_staff.email
        
        # Inject audit context and delete
        self.inject_audit_context(temp_staff, self.owner)
        temp_staff.delete()
        
        # Verify DELETE audit log
        log = self.assertAuditLogExists(
            action_type='DELETE',
            target_table='User',
            target_record_id=staff_id
        )
        
        # Verify deleted data is captured (signals use 'deleted_data' key)
        self.assertIsNotNone(log.changes)
        self.assertIn('deleted_data', log.changes)
        self.assertEqual(log.changes['deleted_data']['email'], staff_email)
        
        print(f"✓ User DELETE audit log captures deleted data")
    
    def test_staff_creation_no_patient_id(self):
        """Test that creating staff users doesn't set patient_id in audit log."""
        AuditLog.objects.all().delete()
        
        # Create staff WITHOUT saving first
        new_staff = User(
            username='newstaff',
            email='newstaff@clinic.com',
            user_type='staff',
            role='receptionist'
        )
        new_staff.set_password('testpass123')
        
        # Inject audit context BEFORE save
        self.inject_audit_context(new_staff, self.owner)
        # Now save with context
        new_staff.save()
        
        # Verify audit log exists but patient_id is None
        log = self.assertAuditLogExists(
            action_type='CREATE',
            target_table='User',
            target_record_id=new_staff.id
        )
        
        self.assertIsNone(log.patient_id, "Staff creation should not set patient_id")
        
        print(f"✓ Staff user creation correctly sets patient_id=None")


class TestAppointmentSignals(TestAuditSignalsBase):
    """Test Appointment model signal handlers."""
    
    def test_appointment_creation_logs_with_patient_id(self):
        """Test that appointment creation includes patient ID in audit log."""
        AuditLog.objects.all().delete()
        
        # Create appointment WITHOUT saving first
        appt = Appointment(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=date(2026, 3, 15),
            time=time(10, 30),
            status='confirmed'
        )
        
        # Inject context BEFORE save
        self.inject_audit_context(appt, self.receptionist)
        # Now save with context
        appt.save()
        
        # Verify audit log with patient_id
        log = self.assertAuditLogExists(
            action_type='CREATE',
            target_table='Appointment',
            target_record_id=appt.id,
            patient_id=self.patient
        )
        
        self.assertEqual(log.actor, self.receptionist)
        
        print(f"✓ Appointment CREATE audit log includes patient_id")
    
    def test_appointment_status_change_tracked(self):
        """Test that appointment status changes are captured with before/after."""
        # Create appointment
        appt = Appointment.objects.create(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=date(2026, 3, 15),
            time=time(10, 30),
            status='confirmed'
        )
        
        AuditLog.objects.all().delete()
        
        # Change status
        appt.status = 'completed'
        self.inject_audit_context(appt, self.dentist)
        appt.save()
        
        # Verify UPDATE log
        log = self.assertAuditLogExists(
            action_type='UPDATE',
            target_table='Appointment',
            target_record_id=appt.id
        )
        
        # Verify status change is captured (signals use {field: {old, new}} format)
        changes = log.changes
        self.assertIn('status', changes)
        self.assertEqual(changes['status']['old'], 'confirmed')
        self.assertEqual(changes['status']['new'], 'completed')
        
        print(f"✓ Appointment status change tracked in audit log")
    
    def test_appointment_cancellation_logged(self):
        """Test that appointment cancellation is logged."""
        # Create appointment
        appt = Appointment.objects.create(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=date(2026, 3, 15),
            time=time(10, 30),
            status='confirmed'
        )
        
        appt_id = appt.id
        AuditLog.objects.all().delete()
        
        # Delete appointment (cancellation)
        self.inject_audit_context(appt, self.patient)
        appt.delete()
        
        # Verify DELETE log
        log = self.assertAuditLogExists(
            action_type='DELETE',
            target_table='Appointment',
            target_record_id=appt_id
        )
        
        self.assertIsNotNone(log.changes)
        self.assertIn('deleted_data', log.changes)
        
        print(f"✓ Appointment cancellation (DELETE) logged")


class TestDentalRecordSignals(TestAuditSignalsBase):
    """Test DentalRecord model signal handlers."""
    
    def test_dental_record_creation_logged(self):
        """Test that creating a dental record creates an audit log."""
        AuditLog.objects.all().delete()
        
        # Create dental record
        record = DentalRecord.objects.create(
            patient=self.patient,
            clinic=self.clinic,
            created_by=self.dentist,
            diagnosis='Cavity on tooth #14',
            treatment='Composite filling',
            notes='Patient tolerated procedure well. No complications.'
        )
        
        # Inject context and re-save
        self.inject_audit_context(record, self.dentist)
        record.save()
        
        # Verify CREATE log with patient_id
        log = self.assertAuditLogExists(
            action_type='CREATE',
            target_table='DentalRecord',
            target_record_id=record.id,
            patient_id=self.patient
        )
        
        print(f"✓ DentalRecord CREATE audit log verified")
    
    def test_dental_record_update_tracked(self):
        """Test that dental record modifications are tracked."""
        # Create record
        record = DentalRecord.objects.create(
            patient=self.patient,
            clinic=self.clinic,
            created_by=self.dentist,
            diagnosis='Initial diagnosis',
            treatment='Initial treatment'
        )
        
        AuditLog.objects.all().delete()
        
        # Update diagnosis
        record.diagnosis = 'Updated diagnosis after x-ray'
        self.inject_audit_context(record, self.dentist)
        record.save()
        
        # Verify UPDATE log
        log = self.assertAuditLogExists(
            action_type='UPDATE',
            target_table='DentalRecord',
            target_record_id=record.id
        )
        
        # Verify diagnosis change captured (signals use {field: {old, new}} format)
        self.assertIn('diagnosis', log.changes)
        self.assertIn('Initial diagnosis', log.changes['diagnosis']['old'])
        self.assertIn('Updated diagnosis', log.changes['diagnosis']['new'])
        
        print(f"✓ DentalRecord UPDATE audit log captures changes")
    
    def test_dental_record_deletion_logged(self):
        """Test that dental record deletion is logged (rare but possible)."""
        # Create record
        record = DentalRecord.objects.create(
            patient=self.patient,
            clinic=self.clinic,
            created_by=self.dentist,
            diagnosis='Test diagnosis',
            treatment='Test treatment'
        )
        
        record_id = record.id
        AuditLog.objects.all().delete()
        
        # Delete record
        self.inject_audit_context(record, self.owner)
        record.delete()
        
        # Verify DELETE log
        log = self.assertAuditLogExists(
            action_type='DELETE',
            target_table='DentalRecord',
            target_record_id=record_id
        )
        
        self.assertIn('deleted_data', log.changes)
        
        print(f"✓ DentalRecord DELETE audit log verified")


class TestBillingSignals(TestAuditSignalsBase):
    """Test Billing model signal handlers."""
    
    def test_billing_creation_logged(self):
        """Test that creating a billing record creates an audit log."""
        AuditLog.objects.all().delete()
        
        # Create billing record
        billing = Billing.objects.create(
            patient=self.patient,
            clinic=self.clinic,
            appointment=None,  # Can be None for manual billing
            amount=Decimal('150.00'),
            description='General checkup billing',
            status='pending'
        )
        
        # Inject context and re-save
        self.inject_audit_context(billing, self.receptionist)
        billing.save()
        
        # Verify CREATE log
        log = self.assertAuditLogExists(
            action_type='CREATE',
            target_table='Billing',
            target_record_id=billing.id,
            patient_id=self.patient
        )
        
        print(f"✓ Billing CREATE audit log verified")
    
    def test_billing_payment_status_change_tracked(self):
        """Test that payment status changes are tracked."""
        # Create billing
        billing = Billing.objects.create(
            patient=self.patient,
            clinic=self.clinic,
            amount=Decimal('150.00'),
            description='Payment status test',
            status='pending'
        )
        
        AuditLog.objects.all().delete()
        
        # Mark as paid
        billing.status = 'paid'
        self.inject_audit_context(billing, self.receptionist)
        billing.save()
        
        # Verify UPDATE log
        log = self.assertAuditLogExists(
            action_type='UPDATE',
            target_table='Billing',
            target_record_id=billing.id
        )
        
        # Verify status change (signals use {field: {old, new}} format)
        self.assertEqual(log.changes['status']['old'], 'pending')
        self.assertEqual(log.changes['status']['new'], 'paid')
        
        print(f"✓ Billing payment status change tracked")


class TestInvoiceSignals(TestAuditSignalsBase):
    """Test Invoice model signal handlers."""
    
    def test_invoice_creation_logged(self):
        """Test that invoice creation creates an audit log."""
        AuditLog.objects.all().delete()
        
        # Create appointment first (required for Invoice)
        appt = Appointment.objects.create(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=date(2026, 3, 20),
            time=time(10, 0),
            status='completed'
        )
        
        # Create invoice
        invoice = Invoice.objects.create(
            appointment=appt,
            patient=self.patient,
            clinic=self.clinic,
            invoice_number=f'INV-2026-02-{Invoice.objects.count() + 1:04d}',
            reference_number=f'REF-{Invoice.objects.count() + 1:04d}',
            service_charge=Decimal('200.00'),
            invoice_date=date.today(),
            due_date=date.today() + timedelta(days=30),
            status='draft'
        )
        
        # Inject context and re-save
        self.inject_audit_context(invoice, self.receptionist)
        invoice.save()
        
        # Verify CREATE log
        log = self.assertAuditLogExists(
            action_type='CREATE',
            target_table='Invoice',
            target_record_id=invoice.id,
            patient_id=self.patient
        )
        
        print(f"✓ Invoice CREATE audit log verified")
    
    def test_invoice_status_update_tracked(self):
        """Test that invoice status changes are tracked."""
        # Create appointment first
        appt = Appointment.objects.create(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=date(2026, 3, 21),
            time=time(11, 0),
            status='completed'
        )
        
        # Create invoice
        invoice = Invoice.objects.create(
            appointment=appt,
            patient=self.patient,
            clinic=self.clinic,
            invoice_number=f'INV-2026-02-{Invoice.objects.count() + 1:04d}',
            reference_number=f'REF-{Invoice.objects.count() + 1:04d}',
            service_charge=Decimal('200.00'),
            invoice_date=date.today(),
            due_date=date.today() + timedelta(days=30),
            status='draft'
        )
        
        AuditLog.objects.all().delete()
        
        # Update status to sent
        invoice.status = 'sent'
        self.inject_audit_context(invoice, self.receptionist)
        invoice.save()
        
        # Verify UPDATE log
        log = self.assertAuditLogExists(
            action_type='UPDATE',
            target_table='Invoice',
            target_record_id=invoice.id
        )
        
        # Verify status change (signals use {field: {old, new}} format)
        self.assertEqual(log.changes['status']['old'], 'draft')
        self.assertEqual(log.changes['status']['new'], 'sent')
        
        print(f"✓ Invoice status update tracked")


class TestTreatmentPlanSignals(TestAuditSignalsBase):
    """Test TreatmentPlan model signal handlers."""
    
    def test_treatment_plan_creation_logged(self):
        """Test that treatment plan creation creates an audit log."""
        AuditLog.objects.all().delete()
        
        # Create treatment plan
        plan = TreatmentPlan.objects.create(
            patient=self.patient,
            created_by=self.dentist,
            title='Comprehensive Restorative Treatment',
            description='Multiple cavities - estimated 3 visits',
            start_date=date.today(),
            status='planned'
        )
        
        # Inject context and re-save
        self.inject_audit_context(plan, self.dentist)
        plan.save()
        
        # Verify CREATE log
        log = self.assertAuditLogExists(
            action_type='CREATE',
            target_table='TreatmentPlan',
            target_record_id=plan.id,
            patient_id=self.patient
        )
        
        print(f"✓ TreatmentPlan CREATE audit log verified")
    
    def test_treatment_plan_completion_tracked(self):
        """Test that treatment plan status changes are tracked."""
        # Create plan
        plan = TreatmentPlan.objects.create(
            patient=self.patient,
            created_by=self.dentist,
            title='Test Treatment Plan',
            description='Test treatment plan for status tracking',
            start_date=date.today(),
            status='planned'
        )
        
        AuditLog.objects.all().delete()
        
        # Mark as completed
        plan.status = 'completed'
        self.inject_audit_context(plan, self.dentist)
        plan.save()
        
        # Verify UPDATE log
        log = self.assertAuditLogExists(
            action_type='UPDATE',
            target_table='TreatmentPlan',
            target_record_id=plan.id
        )
        
        # Verify status change (signals use {field: {old, new}} format)
        self.assertEqual(log.changes['status']['old'], 'planned')
        self.assertEqual(log.changes['status']['new'], 'completed')
        
        print(f"✓ TreatmentPlan status change tracked")


class TestDocumentSignals(TestAuditSignalsBase):
    """Test Document model signal handlers."""
    
    def test_document_upload_logged(self):
        """Test that document upload creates an audit log."""
        AuditLog.objects.all().delete()
        
        # Create document record
        doc = Document.objects.create(
            patient=self.patient,
            clinic=self.clinic,
            title='X-Ray Results',
            document_type='xray',
            file='documents/xray_2026_02_15.pdf',
            uploaded_by=self.dentist
        )
        
        # Inject context and re-save
        self.inject_audit_context(doc, self.dentist)
        doc.save()
        
        # Verify CREATE log
        log = self.assertAuditLogExists(
            action_type='CREATE',
            target_table='Document',
            target_record_id=doc.id,
            patient_id=self.patient
        )
        
        print(f"✓ Document upload (CREATE) audit log verified")
    
    def test_document_deletion_logged(self):
        """Test that document deletion is logged."""
        # Create document
        doc = Document.objects.create(
            patient=self.patient,
            clinic=self.clinic,
            title='Old Document',
            document_type='report',
            file='documents/old_doc.pdf',
            uploaded_by=self.dentist
        )
        
        doc_id = doc.id
        AuditLog.objects.all().delete()
        
        # Delete document
        self.inject_audit_context(doc, self.dentist)
        doc.delete()
        
        # Verify DELETE log
        log = self.assertAuditLogExists(
            action_type='DELETE',
            target_table='Document',
            target_record_id=doc_id
        )
        
        self.assertIn('deleted_data', log.changes)
        
        print(f"✓ Document deletion (DELETE) audit log verified")


class TestPatientIntakeFormSignals(TestAuditSignalsBase):
    """Test PatientIntakeForm model signal handlers."""
    
    def test_intake_form_submission_logged(self):
        """Test that intake form submission creates an audit log."""
        AuditLog.objects.all().delete()
        
        # Create intake form
        form = PatientIntakeForm.objects.create(
            patient=self.patient,
            filled_by=self.patient,
            medical_conditions='No significant medical history',
            current_medications='None',
            allergies='Penicillin',
            emergency_contact_name='Jane Doe',
            emergency_contact_phone='555-5678',
            emergency_contact_relationship='Spouse',
            insurance_provider='Blue Cross',
            insurance_policy_number='BC123456'
        )
        
        # Inject context and re-save
        self.inject_audit_context(form, self.patient)
        form.save()
        
        # Verify CREATE log
        log = self.assertAuditLogExists(
            action_type='CREATE',
            target_table='PatientIntakeForm',
            target_record_id=form.id,
            patient_id=self.patient
        )
        
        print(f"✓ PatientIntakeForm submission (CREATE) audit log verified")
    
    def test_intake_form_update_tracked(self):
        """Test that intake form updates are tracked."""
        # Create a second patient for intake form (OneToOneField)
        patient2 = User.objects.create_user(
            username='patient2',
            email='patient2@test.com',
            password='testpass123',
            user_type='patient',
            first_name='Jane',
            last_name='Smith'
        )
        
        # Create form
        form = PatientIntakeForm.objects.create(
            patient=patient2,
            filled_by=patient2,
            medical_conditions='Initial history',
            current_medications='None',
            allergies='None'
        )
        
        AuditLog.objects.all().delete()
        
        # Update allergies
        form.allergies = 'Penicillin, Latex'
        self.inject_audit_context(form, self.receptionist)
        form.save()
        
        # Verify UPDATE log
        log = self.assertAuditLogExists(
            action_type='UPDATE',
            target_table='PatientIntakeForm',
            target_record_id=form.id
        )
        
        # Verify allergy change (signals use {field: {old, new}} format)
        self.assertEqual(log.changes['allergies']['old'], 'None')
        self.assertEqual(log.changes['allergies']['new'], 'Penicillin, Latex')
        
        print(f"✓ PatientIntakeForm update tracked")


class TestAuditContextCapture(TestAuditSignalsBase):
    """Test that audit context (actor, IP, user_agent) is properly captured."""
    
    def test_audit_context_captured_from_views(self):
        """Test that actor, IP, and user_agent are captured correctly."""
        AuditLog.objects.all().delete()
        
        # Create appointment WITHOUT saving first
        appt = Appointment(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=date(2026, 3, 20),
            time=time(14, 0),
            status='confirmed'
        )
        
        # Inject custom audit context BEFORE save
        custom_ip = '10.0.0.42'
        custom_user_agent = 'Mozilla/5.0 (Custom Browser)'
        self.inject_audit_context(appt, self.receptionist, ip=custom_ip, user_agent=custom_user_agent)
        # Now save with context
        appt.save()
        
        # Verify audit log has correct context
        log = self.assertAuditLogExists(
            action_type='CREATE',
            target_table='Appointment',
            target_record_id=appt.id
        )
        
        self.assertEqual(log.actor, self.receptionist)
        self.assertEqual(log.ip_address, custom_ip)
        self.assertEqual(log.user_agent, custom_user_agent)
        
        print(f"✓ Audit context (actor, IP, user_agent) captured correctly")
    
    def test_audit_without_context_defaults_gracefully(self):
        """Test that operations without audit context don't crash (system operations)."""
        AuditLog.objects.all().delete()
        
        # Create user without injecting audit context (simulates system operation)
        system_user = User.objects.create_user(
            username='systemuser',
            email='system@test.com',
            password='testpass123',
            user_type='patient'
        )
        # Don't inject audit context - just save
        system_user.save()
        
        # Verify audit log created but with no actor/IP
        log = self.assertAuditLogExists(
            action_type='CREATE',
            target_table='User',
            target_record_id=system_user.id
        )
        
        # Actor should be None for system operations
        self.assertIsNone(log.actor)
        
        print(f"✓ Operations without audit context handled gracefully")


class TestMultipleOperations(TestAuditSignalsBase):
    """Test multiple operations and edge cases."""
    
    def test_multiple_saves_create_multiple_logs(self):
        """Test that saving the same record multiple times creates multiple logs."""
        AuditLog.objects.all().delete()
        
        # First update
        self.patient.email = 'email1@test.com'
        self.inject_audit_context(self.patient, self.receptionist)
        self.patient.save()
        
        # Second update
        self.patient.email = 'email2@test.com'
        self.inject_audit_context(self.patient, self.receptionist)
        self.patient.save()
        
        # Third update
        self.patient.phone = '555-9999'
        self.inject_audit_context(self.patient, self.receptionist)
        self.patient.save()
        
        # Verify 3 separate UPDATE logs
        logs = AuditLog.objects.filter(
            action_type='UPDATE',
            target_table='User',
            target_record_id=self.patient.id
        ).order_by('timestamp')
        
        self.assertEqual(logs.count(), 3)
        
        # Verify each log captured the correct change (signals use field-level format)
        email_log_1 = logs[0]
        self.assertIn('email', email_log_1.changes)
        self.assertEqual(email_log_1.changes['email']['new'], 'email1@test.com')
        
        email_log_2 = logs[1]
        self.assertIn('email', email_log_2.changes)
        self.assertEqual(email_log_2.changes['email']['new'], 'email2@test.com')
        
        print(f"✓ Multiple saves create multiple audit logs")
    
    def test_different_actors_tracked_separately(self):
        """Test that operations by different users are tracked separately."""
        AuditLog.objects.all().delete()
        
        # Receptionist updates phone
        self.patient.phone = '555-1111'
        self.inject_audit_context(self.patient, self.receptionist)
        self.patient.save()
        
        # Owner updates email
        self.patient.email = 'updated_by_owner@test.com'
        self.inject_audit_context(self.patient, self.owner)
        self.patient.save()
        
        # Verify both logs with different actors
        logs = AuditLog.objects.filter(
            action_type='UPDATE',
            target_table='User',
            target_record_id=self.patient.id
        ).order_by('timestamp')
        
        self.assertEqual(logs.count(), 2)
        self.assertEqual(logs[0].actor, self.receptionist)
        self.assertEqual(logs[1].actor, self.owner)
        
        print(f"✓ Different actors tracked correctly in separate logs")


class TestSignalPerformanceAndEdgeCases(TestAuditSignalsBase):
    """Test signal handler performance and edge cases."""
    
    def test_signal_failure_doesnt_crash_save(self):
        """Test that audit log failures don't prevent model saves."""
        from unittest.mock import patch
        
        # Temporarily break audit logging by raising an exception in signal handler
        # Patch the post_save signal handler itself
        with patch('api.signals.user_post_save', side_effect=Exception('Simulated audit failure')):
            # This should still succeed despite audit failure
            test_user = User.objects.create_user(
                username='testcrash',
                email='testcrash@test.com',
                password='testpass123',
                user_type='patient'
            )
            
            # Verify user was created successfully
            self.assertIsNotNone(test_user.id)
            self.assertTrue(User.objects.filter(id=test_user.id).exists())
        
        print(f"✓ Signal failures don't crash model saves (graceful degradation)")
    
    def test_rapid_successive_updates(self):
        """Test that rapid successive updates are all logged correctly."""
        AuditLog.objects.all().delete()
        
        # Perform 5 rapid updates
        for i in range(5):
            self.patient.phone = f'555-{1000 + i}'
            self.inject_audit_context(self.patient, self.receptionist)
            self.patient.save()
        
        # Verify all 5 updates were logged
        logs = AuditLog.objects.filter(
            action_type='UPDATE',
            target_table='User',
            target_record_id=self.patient.id
        )
        
        self.assertEqual(logs.count(), 5)
        
        print(f"✓ Rapid successive updates all logged correctly")
    
    def test_concurrent_different_model_operations(self):
        """Test that operations on different models don't interfere with each other."""
        AuditLog.objects.all().delete()
        
        # Update patient
        self.patient.email = 'concurrent1@test.com'
        self.inject_audit_context(self.patient, self.receptionist)
        self.patient.save()
        
        # Create appointment
        appt = Appointment.objects.create(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=date(2026, 4, 1),
            time=time(9, 0),
            status='confirmed'
        )
        self.inject_audit_context(appt, self.receptionist)
        appt.save()
        
        # Create dental record
        record = DentalRecord.objects.create(
            patient=self.patient,
            clinic=self.clinic,
            created_by=self.dentist,
            diagnosis='Concurrent test',
            treatment='Concurrent treatment'
        )
        self.inject_audit_context(record, self.dentist)
        record.save()
        
        # Verify all 3 operations were logged correctly
        user_log = AuditLog.objects.filter(target_table='User', action_type='UPDATE').first()
        appt_log = AuditLog.objects.filter(target_table='Appointment', action_type='CREATE').first()
        record_log = AuditLog.objects.filter(target_table='DentalRecord', action_type='CREATE').first()
        
        self.assertIsNotNone(user_log)
        self.assertIsNotNone(appt_log)
        self.assertIsNotNone(record_log)
        
        print(f"✓ Concurrent operations on different models logged correctly")


class TestSignalIntegrity(TestAuditSignalsBase):
    """Test audit log data integrity and completeness."""
    
    def test_all_required_fields_populated(self):
        """Test that all required audit log fields are populated."""
        AuditLog.objects.all().delete()
        
        # Create appointment WITHOUT saving first
        appt = Appointment(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=date(2026, 3, 25),
            time=time(11, 0),
            status='confirmed'
        )
        # Inject context BEFORE save
        self.inject_audit_context(appt, self.receptionist)
        # Now save with context
        appt.save()
        
        # Get audit log
        log = AuditLog.objects.filter(
            target_table='Appointment',
            action_type='CREATE',
            target_record_id=appt.id
        ).first()
        
        # Verify all critical fields are populated
        self.assertIsNotNone(log.log_id, "log_id should be populated")
        self.assertIsNotNone(log.action_type, "action_type should be populated")
        self.assertIsNotNone(log.target_table, "target_table should be populated")
        self.assertIsNotNone(log.target_record_id, "target_record_id should be populated")
        self.assertIsNotNone(log.patient_id, "patient_id should be populated")
        self.assertIsNotNone(log.timestamp, "timestamp should be populated")
        self.assertIsNotNone(log.actor, "actor should be populated")
        self.assertIsNotNone(log.ip_address, "ip_address should be populated")
        self.assertIsNotNone(log.user_agent, "user_agent should be populated")
        
        print(f"✓ All required audit log fields are populated")
    
    def test_audit_log_immutability(self):
        """Test that audit logs cannot be modified after creation."""
        AuditLog.objects.all().delete()
        
        # Create user
        new_user = User.objects.create_user(
            username='immutability_test',
            email='immutable@test.com',
            password='testpass123',
            user_type='patient'
        )
        self.inject_audit_context(new_user, self.receptionist)
        new_user.save()
        
        # Get audit log
        log = AuditLog.objects.filter(
            target_table='User',
            action_type='CREATE',
            target_record_id=new_user.id
        ).first()
        
        # Try to modify the audit log (should raise exception)
        with self.assertRaises(Exception):
            log.action_type = 'UPDATE'
            log.save()
        
        print(f"✓ Audit logs are immutable (cannot be modified)")
    
    def test_sensitive_data_not_logged(self):
        """Test that sensitive data (passwords) are not logged."""
        AuditLog.objects.all().delete()
        
        # Create user with password
        new_user = User.objects.create_user(
            username='password_test',
            email='password@test.com',
            password='SuperSecret123!',
            user_type='patient'
        )
        self.inject_audit_context(new_user, self.receptionist)
        new_user.save()
        
        # Get audit log
        log = AuditLog.objects.filter(
            target_table='User',
            action_type='CREATE',
            target_record_id=new_user.id
        ).first()
        
        # Verify password is NOT in the changes field
        if log.changes:
            changes_str = json.dumps(log.changes)
            # Password field might appear in field names, but the SECRET should not
            self.assertNotIn('SuperSecret123!', changes_str, "Password value should not be logged")
        
        print(f"✓ Sensitive data (passwords) not logged in audit trail")


# Test execution summary
if __name__ == '__main__':
    import sys
    
    print("\n" + "="*70)
    print("PHASE 2 AUDIT SIGNALS - COMPREHENSIVE TEST SUITE")
    print("="*70)
    print("\nTest Categories:")
    print("  1. User model signals (CREATE, UPDATE, DELETE)")
    print("  2. Appointment model signals")
    print("  3. DentalRecord model signals")
    print("  4. Billing model signals")
    print("  5. Invoice model signals")
    print("  6. TreatmentPlan model signals")
    print("  7. Document model signals")
    print("  8. PatientIntakeForm model signals")
    print("  9. Audit context capture (actor, IP, user_agent)")
    print(" 10. Multiple operations and edge cases")
    print(" 11. Performance and error handling")
    print(" 12. Data integrity and security")
    print("\nRunning tests...")
    print("="*70 + "\n")
    
    # Run tests
    from django.test.utils import get_runner
    from django.conf import settings
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner(verbosity=2)
    failures = test_runner.run_tests(['api.test_audit_signals'])
    
    if failures:
        sys.exit(1)
    else:
        print("\n" + "="*70)
        print("✅ ALL PHASE 2 AUDIT SIGNAL TESTS PASSED")
        print("="*70 + "\n")
