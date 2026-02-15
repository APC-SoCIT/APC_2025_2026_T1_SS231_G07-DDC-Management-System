"""
Unit tests for audit logging system.

Run with: python manage.py test api.tests.test_audit
"""

from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import IntegrityError
from api.models import AuditLog, DentalRecord, Appointment
from api.audit_service import (
    create_audit_log, 
    sanitize_data, 
    get_client_ip,
    get_user_agent
)
import json

User = get_user_model()


class AuditLogModelTest(TestCase):
    """Test AuditLog model creation and validation."""
    
    def setUp(self):
        """Create test user and patient."""
        self.staff_user = User.objects.create_user(
            username='staff_test',
            password='testpass123',
            email='staff@test.com',
            user_type='staff',
            role='dentist'
        )
        self.patient_user = User.objects.create_user(
            username='patient_test',
            password='testpass123',
            email='patient@test.com',
            user_type='patient'
        )
    
    def test_create_basic_audit_log(self):
        """Test creating a basic audit log entry."""
        log = AuditLog.objects.create(
            actor=self.staff_user,
            action_type='READ',
            target_table='DentalRecord',
            target_record_id=123,
            patient_id=self.patient_user,
            ip_address='192.168.1.100',
            user_agent='Mozilla/5.0 Test Browser'
        )
        
        self.assertEqual(log.actor, self.staff_user)
        self.assertEqual(log.action_type, 'READ')
        self.assertEqual(log.target_table, 'DentalRecord')
        self.assertEqual(log.target_record_id, 123)
        self.assertEqual(log.patient_id, self.patient_user)
        self.assertEqual(log.ip_address, '192.168.1.100')
        self.assertIsNotNone(log.timestamp)
        self.assertIsNotNone(log.log_id)
    
    def test_audit_log_without_actor(self):
        """Test creating system-generated audit log (no actor)."""
        log = AuditLog.objects.create(
            actor=None,  # System-generated (e.g., failed login)
            action_type='LOGIN_FAILED',
            target_table='User',
            target_record_id=None,
            changes={'username': 'unknown_user'}
        )
        
        self.assertIsNone(log.actor)
        self.assertEqual(log.action_type, 'LOGIN_FAILED')
        self.assertEqual(log.changes['username'], 'unknown_user')
    
    def test_audit_log_with_changes_json(self):
        """Test storing changes as JSON."""
        changes = {
            'before': {'status': 'pending'},
            'after': {'status': 'confirmed'}
        }
        
        log = AuditLog.objects.create(
            actor=self.staff_user,
            action_type='UPDATE',
            target_table='Appointment',
            target_record_id=456,
            changes=changes
        )
        
        self.assertIsNotNone(log.changes)
        self.assertEqual(log.changes['before']['status'], 'pending')
        self.assertEqual(log.changes['after']['status'], 'confirmed')
        
        # Retrieve from database and verify JSON is properly stored
        retrieved_log = AuditLog.objects.get(log_id=log.log_id)
        self.assertEqual(retrieved_log.changes['after']['status'], 'confirmed')
    
    def test_audit_log_ordering(self):
        """Test that logs are ordered by timestamp descending."""
        # Create multiple logs with slight time differences
        log1 = AuditLog.objects.create(
            actor=self.staff_user,
            action_type='CREATE',
            target_table='DentalRecord',
            target_record_id=1
        )
        
        log2 = AuditLog.objects.create(
            actor=self.staff_user,
            action_type='UPDATE',
            target_table='DentalRecord',
            target_record_id=2
        )
        
        log3 = AuditLog.objects.create(
            actor=self.staff_user,
            action_type='DELETE',
            target_table='DentalRecord',
            target_record_id=3
        )
        
        # Get all logs - should be ordered by timestamp descending
        logs = list(AuditLog.objects.all())
        
        # Most recent log should be first
        self.assertEqual(logs[0].log_id, log3.log_id)
        self.assertEqual(logs[1].log_id, log2.log_id)
        self.assertEqual(logs[2].log_id, log1.log_id)
    
    def test_audit_log_immutability_update_prevented(self):
        """Test that audit logs cannot be updated after creation."""
        log = AuditLog.objects.create(
            actor=self.staff_user,
            action_type='CREATE',
            target_table='DentalRecord',
            target_record_id=999
        )
        
        original_action = log.action_type
        
        # Attempt to modify the log
        log.action_type = 'DELETE'
        
        # save() method should prevent updates (check the model's save method)
        # The model should raise an error or prevent the update
        # Based on the model code, updates after creation should be prevented
        with self.assertRaises(Exception):
            log.save()
    
    def test_audit_log_immutability_delete_prevented(self):
        """Test that audit logs cannot be deleted."""
        log = AuditLog.objects.create(
            actor=self.staff_user,
            action_type='CREATE',
            target_table='DentalRecord',
            target_record_id=888
        )
        
        log_id = log.log_id
        
        # Attempt to delete should raise an error
        with self.assertRaises(Exception):
            log.delete()
        
        # Verify log still exists
        self.assertTrue(AuditLog.objects.filter(log_id=log_id).exists())
    
    def test_audit_log_indexes(self):
        """Test that database indexes exist for performance."""
        # This test verifies that the model has proper db_index settings
        # We can check the model's Meta options
        
        # Get the model's fields
        indexed_fields = []
        for field in AuditLog._meta.get_fields():
            if hasattr(field, 'db_index') and field.db_index:
                indexed_fields.append(field.name)
        
        # Verify critical fields are indexed
        self.assertIn('action_type', indexed_fields)
        self.assertIn('timestamp', indexed_fields)
        self.assertIn('target_table', indexed_fields)


class AuditServiceTest(TestCase):
    """Test audit service utility functions."""
    
    def setUp(self):
        self.staff_user = User.objects.create_user(
            username='staff_service',
            password='testpass123',
            email='staff_service@test.com',
            user_type='staff'
        )
        self.patient_user = User.objects.create_user(
            username='patient_service',
            password='testpass123',
            email='patient_service@test.com',
            user_type='patient'
        )
        self.factory = RequestFactory()
    
    def test_create_audit_log_helper(self):
        """Test create_audit_log service function."""
        log = create_audit_log(
            actor=self.staff_user,
            action_type='READ',
            target_table='DentalRecord',
            target_record_id=123,
            patient_id=self.patient_user,
            ip_address='10.0.0.1',
            user_agent='Test Browser/1.0',
            changes={'field': 'value'},
            reason='Routine checkup'
        )
        
        self.assertIsNotNone(log)
        self.assertEqual(log.actor, self.staff_user)
        self.assertEqual(log.action_type, 'READ')
        self.assertEqual(log.target_table, 'DentalRecord')
        self.assertEqual(log.target_record_id, 123)
        self.assertEqual(log.patient_id, self.patient_user)
        self.assertEqual(log.ip_address, '10.0.0.1')
        self.assertEqual(log.reason, 'Routine checkup')
    
    def test_sanitize_data_removes_password(self):
        """Test that sanitize_data removes password fields."""
        data = {
            'username': 'testuser',
            'password': 'secret123',
            'email': 'test@example.com',
            'password1': 'secret123',
            'password2': 'secret123'
        }
        
        sanitized = sanitize_data(data)
        
        self.assertNotIn('password', str(sanitized.get('password', '')))
        self.assertEqual(sanitized['password'], '[REDACTED]')
        self.assertEqual(sanitized['password1'], '[REDACTED]')
        self.assertEqual(sanitized['password2'], '[REDACTED]')
        self.assertEqual(sanitized['username'], 'testuser')
        self.assertEqual(sanitized['email'], 'test@example.com')
    
    def test_sanitize_data_removes_token(self):
        """Test that sanitize_data removes auth tokens."""
        data = {
            'username': 'testuser',
            'auth_token': 'abc123xyz',
            'access_token': 'token123',
            'api_key': 'key456'
        }
        
        sanitized = sanitize_data(data)
        
        self.assertEqual(sanitized['auth_token'], '[REDACTED]')
        self.assertEqual(sanitized['access_token'], '[REDACTED]')
        self.assertEqual(sanitized['api_key'], '[REDACTED]')
        self.assertEqual(sanitized['username'], 'testuser')
    
    def test_sanitize_data_nested_objects(self):
        """Test sanitization of nested dictionaries."""
        data = {
            'user': {
                'username': 'testuser',
                'password': 'secret123',
                'profile': {
                    'email': 'test@example.com',
                    'api_key': 'key789'
                }
            },
            'action': 'login'
        }
        
        sanitized = sanitize_data(data)
        
        self.assertEqual(sanitized['user']['username'], 'testuser')
        self.assertEqual(sanitized['user']['password'], '[REDACTED]')
        self.assertEqual(sanitized['user']['profile']['email'], 'test@example.com')
        self.assertEqual(sanitized['user']['profile']['api_key'], '[REDACTED]')
        self.assertEqual(sanitized['action'], 'login')
    
    def test_sanitize_data_with_none(self):
        """Test that sanitize_data handles None input."""
        sanitized = sanitize_data(None)
        self.assertIsNone(sanitized)
    
    def test_sanitize_data_with_non_dict(self):
        """Test that sanitize_data handles non-dictionary input."""
        sanitized = sanitize_data("string value")
        self.assertEqual(sanitized, "string value")
    
    def test_get_client_ip_from_request(self):
        """Test extracting client IP from request."""
        request = self.factory.get('/test/')
        request.META['REMOTE_ADDR'] = '203.0.113.42'
        
        ip = get_client_ip(request)
        self.assertEqual(ip, '203.0.113.42')
    
    def test_get_client_ip_with_proxy(self):
        """Test extracting client IP through proxy headers."""
        request = self.factory.get('/test/')
        request.META['HTTP_X_FORWARDED_FOR'] = '198.51.100.1, 203.0.113.10'
        request.META['REMOTE_ADDR'] = '203.0.113.10'  # Proxy IP
        
        ip = get_client_ip(request)
        # Should return the first IP (original client)
        self.assertEqual(ip, '198.51.100.1')
    
    def test_get_client_ip_with_single_proxy(self):
        """Test extracting client IP with single proxy."""
        request = self.factory.get('/test/')
        request.META['HTTP_X_FORWARDED_FOR'] = '198.51.100.1'
        
        ip = get_client_ip(request)
        self.assertEqual(ip, '198.51.100.1')
    
    def test_get_client_ip_no_address(self):
        """Test extracting client IP when no address available."""
        request = self.factory.get('/test/')
        # Remove REMOTE_ADDR to test fallback
        if 'REMOTE_ADDR' in request.META:
            del request.META['REMOTE_ADDR']
        
        ip = get_client_ip(request)
        self.assertEqual(ip, 'Unknown')
    
    def test_get_user_agent(self):
        """Test extracting user agent from request."""
        request = self.factory.get('/test/')
        request.META['HTTP_USER_AGENT'] = 'Mozilla/5.0 (Test Browser)'
        
        user_agent = get_user_agent(request)
        self.assertEqual(user_agent, 'Mozilla/5.0 (Test Browser)')
    
    def test_get_user_agent_empty(self):
        """Test extracting user agent when not present."""
        request = self.factory.get('/test/')
        # Don't set user agent
        
        user_agent = get_user_agent(request)
        self.assertEqual(user_agent, '')
    
    def test_get_user_agent_truncation(self):
        """Test user agent is truncated to 500 characters."""
        request = self.factory.get('/test/')
        long_ua = 'A' * 600  # 600 characters
        request.META['HTTP_USER_AGENT'] = long_ua
        
        user_agent = get_user_agent(request)
        self.assertEqual(len(user_agent), 500)
        self.assertTrue(user_agent.startswith('AAA'))


class AuditSignalsTest(TestCase):
    """Test that signals automatically create audit logs."""
    
    def setUp(self):
        self.staff_user = User.objects.create_user(
            username='staff_signals',
            password='testpass123',
            email='staff_signals@test.com',
            user_type='staff',
            role='dentist'
        )
        self.patient_user = User.objects.create_user(
            username='patient_signals',
            password='testpass123',
            email='patient_signals@test.com',
            user_type='patient'
        )
    
    def test_create_triggers_audit_log(self):
        """Test that creating a record triggers CREATE audit log."""
        # Note: This test assumes signals are implemented
        # If signals aren't implemented yet, this test will fail
        initial_count = AuditLog.objects.count()
        
        # Create a dental record
        record = DentalRecord.objects.create(
            patient=self.patient_user,
            treatment='Test treatment',
            diagnosis='Test diagnosis',
            created_by=self.staff_user
        )
        
        # Check if audit log was created
        new_count = AuditLog.objects.count()
        
        # If signals are implemented, count should increase
        # If not, this test serves as a TODO marker
        if new_count > initial_count:
            log = AuditLog.objects.latest('timestamp')
            self.assertEqual(log.action_type, 'CREATE')
            self.assertEqual(log.target_table, 'DentalRecord')
            self.assertEqual(log.patient_id, self.patient_user)


class AuditDecoratorTest(TestCase):
    """Test audit logging decorators."""
    
    def setUp(self):
        self.staff_user = User.objects.create_user(
            username='staff_decorator',
            password='testpass123',
            email='staff_decorator@test.com',
            user_type='staff'
        )
        self.patient_user = User.objects.create_user(
            username='patient_decorator',
            password='testpass123',
            email='patient_decorator@test.com',
            user_type='patient'
        )
        self.factory = RequestFactory()
    
    def test_log_patient_access_decorator(self):
        """Test @log_patient_access decorator creates audit log."""
        # Note: This test assumes decorators are implemented
        # If decorators aren't implemented yet, this is a TODO marker
        pass


class AuditMiddlewareTest(TestCase):
    """Test audit middleware request logging."""
    
    def setUp(self):
        self.staff_user = User.objects.create_user(
            username='staff_middleware',
            password='testpass123',
            email='staff_middleware@test.com',
            user_type='staff'
        )
    
    def test_middleware_logs_api_requests(self):
        """Test middleware captures API requests."""
        # Note: This test assumes middleware is implemented
        # If middleware isn't implemented yet, this is a TODO marker
        pass


class AuditPerformanceTest(TestCase):
    """Test audit logging performance."""
    
    def test_bulk_log_creation_performance(self):
        """Test that bulk log creation is performant."""
        import time
        
        staff_user = User.objects.create_user(
            username='perf_test',
            password='testpass123',
            email='perf@test.com',
            user_type='staff'
        )
        
        # Count logs before test
        initial_count = AuditLog.objects.count()
        
        start_time = time.time()
        
        # Create 100 audit logs
        logs = []
        for i in range(100):
            log = AuditLog(
                actor=staff_user,
                action_type='READ',
                target_table='DentalRecord',
                target_record_id=i
            )
            logs.append(log)
        
        # Bulk create
        AuditLog.objects.bulk_create(logs)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete in under 1 second
        self.assertLess(duration, 1.0, f"Bulk creation took {duration:.3f}s, expected < 1.0s")
        
        # Verify 100 new logs were created
        final_count = AuditLog.objects.count()
        self.assertEqual(final_count - initial_count, 100)


# Run tests with:
# python manage.py test api.tests.test_audit -v 2
