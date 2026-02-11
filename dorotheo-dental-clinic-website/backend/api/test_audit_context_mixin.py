"""
Test AuditContextMixin Integration
Tests that the AuditContextMixin properly injects audit context into model operations.
"""

from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from api.models import Appointment, Service, ClinicLocation, AuditLog
from api.views import AppointmentViewSet
from datetime import date, time

User = get_user_model()


class AuditContextMixinTest(TestCase):
    """Test that AuditContextMixin injects audit context into ViewSet operations."""
    
    def setUp(self):
        """Create test data."""
        # Create users
        self.owner = User.objects.create_user(
            username='owner',
            email='owner@test.com',
            password='testpass123',
            user_type='owner'
        )
        
        self.patient = User.objects.create_user(
            username='patient',
            email='patient@test.com',
            password='testpass123',
            user_type='patient',
            first_name='John',
            last_name='Doe'
        )
        
        self.dentist = User.objects.create_user(
            username='dentist',
            email='dentist@test.com',
            password='testpass123',
            user_type='staff',
            role='dentist'
        )
        
        # Create clinic and service
        self.clinic = ClinicLocation.objects.create(
            name='Test Clinic',
            address='123 Test St'
        )
        
        self.service = Service.objects.create(
            name='Cleaning',
            category='preventive',
            description='Basic cleaning'
        )
        
        # Setup request factory
        self.factory = RequestFactory()
    
    def test_audit_context_injected_on_create(self):
        """Test that audit context is injected when creating an appointment."""
        # Clear existing audit logs
        AuditLog.objects.all().delete()
        
        # Create request with authenticated user
        request = self.factory.post('/api/appointments/')
        request.user = self.owner
        
        # Create viewset instance
        viewset = AppointmentViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        
        # Create appointment data
        appointment = Appointment.objects.create(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=date(2026, 2, 15),
            time=time(10, 0),
            status='confirmed'
        )
        
        # Inject audit context (this is what the mixin does)
        viewset._inject_audit_context(appointment)
        
        # Verify audit attributes are set
        self.assertEqual(appointment._audit_actor, self.owner)
        self.assertIsNotNone(appointment._audit_ip)
        self.assertIsNotNone(appointment._audit_user_agent)
        
        print("✓ Audit context successfully injected into new appointment")
    
    def test_audit_context_with_unauthenticated_request(self):
        """Test that audit context handles unauthenticated requests gracefully."""
        # Create request without authentication
        request = self.factory.post('/api/appointments/')
        request.user = None
        
        # Create viewset instance
        viewset = AppointmentViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        
        # Create appointment
        appointment = Appointment.objects.create(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=date(2026, 2, 16),
            time=time(11, 0),
            status='confirmed'
        )
        
        # Inject audit context (should not crash)
        viewset._inject_audit_context(appointment)
        
        # Verify no audit attributes are set
        self.assertFalse(hasattr(appointment, '_audit_actor'))
        
        print("✓ Audit context handles unauthenticated requests correctly")
    
    def test_mixin_applied_to_all_critical_viewsets(self):
        """Test that AuditContextMixin is applied to all ViewSets that handle PHI."""
        from api.views import (
            UserViewSet, AppointmentViewSet, DentalRecordViewSet,
            BillingViewSet, InvoiceViewSet, TreatmentPlanViewSet,
            DocumentViewSet, PatientIntakeFormViewSet
        )
        
        critical_viewsets = [
            UserViewSet, AppointmentViewSet, DentalRecordViewSet,
            BillingViewSet, InvoiceViewSet, TreatmentPlanViewSet,
            DocumentViewSet, PatientIntakeFormViewSet
        ]
        
        for viewset_class in critical_viewsets:
            # Check if _inject_audit_context method exists
            self.assertTrue(
                hasattr(viewset_class, '_inject_audit_context'),
                f"{viewset_class.__name__} is missing _inject_audit_context method"
            )
            
            # Check if perform_create is overridden
            self.assertTrue(
                hasattr(viewset_class, 'perform_create'),
                f"{viewset_class.__name__} is missing perform_create method"
            )
            
            # Check if perform_update is overridden
            self.assertTrue(
                hasattr(viewset_class, 'perform_update'),
                f"{viewset_class.__name__} is missing perform_update method"
            )
            
            # Check if perform_destroy is overridden
            self.assertTrue(
                hasattr(viewset_class, 'perform_destroy'),
                f"{viewset_class.__name__} is missing perform_destroy method"
            )
        
        print(f"✓ All {len(critical_viewsets)} critical ViewSets have AuditContextMixin methods")


if __name__ == '__main__':
    import django
    import os
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
    django.setup()
    
    # Run tests
    from django.test.utils import get_runner
    from django.conf import settings
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(['api.test_audit_context_mixin'])
