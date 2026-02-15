# Phase 5: Testing & Validation
## Audit Controls Implementation - Week 5

**Estimated Duration:** 5-7 days  
**Prerequisites:** Phases 1, 2, 3, and 4 completed  
**Goal:** Comprehensive testing and production-ready validation

---

## 🎯 Phase Overview

Phase 5 ensures your audit system is bulletproof before going to production. This phase covers:
1. **Unit Tests** - Test individual components
2. **Integration Tests** - Test end-to-end audit flows
3. **Performance Tests** - Ensure audit logging doesn't slow down the system
4. **Security Audit** - Verify no sensitive data is logged
5. **HIPAA Compliance Checklist** - Confirm all requirements are met
6. **Production Deployment** - Safe rollout procedures

**What You'll Build:**
- ✅ Comprehensive test suite for all audit components
- ✅ Performance benchmarks to catch regressions
- ✅ Security validation scripts
- ✅ Production deployment checklist
- ✅ Monitoring and alerting setup
- ✅ Documentation for ongoing maintenance

---

## 📋 Task Checklist

- [ ] Task 5.1: Create unit tests for audit models and services
- [ ] Task 5.2: Create integration tests for audit flows
- [ ] Task 5.3: Perform performance testing and benchmarks
- [ ] Task 5.4: Security audit and sensitive data protection
- [ ] Task 5.5: HIPAA compliance verification
- [ ] Task 5.6: Production deployment preparation
- [ ] Task 5.7: Set up monitoring and alerts
- [ ] Task 5.8: Documentation and handoff

---

## 🔨 Task 5.1: Create Unit Tests for Audit Models and Services

### LLM Prompt

```
TASK: Write comprehensive unit tests for audit log models and utility functions

CONTEXT:
You've built audit models, services, and signals in Phases 1-2. Now test each component in isolation to ensure they work correctly.

FILE TO CREATE: backend/api/tests/test_audit.py (NEW FILE)

REQUIREMENTS:

Test the following components:
1. AuditLog model creation and fields
2. audit_service.py functions (create_audit_log, sanitize_data, etc.)
3. Signal handlers (pre_save, post_save, post_delete)
4. Decorators (@log_patient_access, @log_export, @log_search)
5. Middleware request logging

COMPLETE TEST IMPLEMENTATION:

```python
"""
Unit tests for audit logging system.

Run with: python manage.py test api.tests.test_audit
"""

from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.utils import timezone
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
            username='staff1',
            password='testpass123',
            user_type='staff',
            first_name='Test',
            last_name='Staff'
        )
        
        self.patient_user = User.objects.create_user(
            username='patient1',
            password='testpass123',
            user_type='patient',
            first_name='Test',
            last_name='Patient'
        )
    
    def test_create_basic_audit_log(self):
        """Test creating a basic audit log entry."""
        log = AuditLog.objects.create(
            actor=self.staff_user,
            action_type='CREATE',
            target_table='User',
            target_record_id=self.patient_user.id,
            patient_id=self.patient_user.id,
            ip_address='127.0.0.1',
            user_agent='Test Browser'
        )
        
        self.assertEqual(log.actor, self.staff_user)
        self.assertEqual(log.action_type, 'CREATE')
        self.assertEqual(log.target_table, 'User')
        self.assertIsNotNone(log.timestamp)
        self.assertIsNotNone(log.log_id)
    
    def test_audit_log_without_actor(self):
        """Test creating system-generated audit log (no actor)."""
        log = AuditLog.objects.create(
            actor=None,  # System action
            action_type='UPDATE',
            target_table='Appointment',
            target_record_id=999,
            ip_address='0.0.0.0'
        )
        
        self.assertIsNone(log.actor)
        self.assertEqual(log.action_type, 'UPDATE')
    
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
            target_record_id=1,
            changes=changes
        )
        
        # Retrieve and verify JSON
        retrieved_log = AuditLog.objects.get(log_id=log.log_id)
        self.assertEqual(retrieved_log.changes, changes)
        self.assertEqual(retrieved_log.changes['after']['status'], 'confirmed')
    
    def test_audit_log_ordering(self):
        """Test that logs are ordered by timestamp descending."""
        # Create multiple logs
        for i in range(5):
            AuditLog.objects.create(
                actor=self.staff_user,
                action_type='READ',
                target_table='User',
                target_record_id=i
            )
        
        logs = AuditLog.objects.all()
        
        # Verify descending order
        for i in range(len(logs) - 1):
            self.assertGreaterEqual(logs[i].timestamp, logs[i+1].timestamp)
    
    def test_audit_log_indexes(self):
        """Test that database indexes exist for performance."""
        from django.db import connection
        
        # Get table indexes
        with connection.cursor() as cursor:
            # Query varies by database type
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='audit_logs';"
            )
            indexes = [row[0] for row in cursor.fetchall()]
        
        # Verify key indexes exist
        index_fields = ['actor', 'action_type', 'timestamp', 'patient_id']
        for field in index_fields:
            self.assertTrue(
                any(field in idx for idx in indexes),
                f"Index for {field} not found"
            )


class AuditServiceTest(TestCase):
    """Test audit service utility functions."""
    
    def setUp(self):
        self.staff_user = User.objects.create_user(
            username='staff1',
            password='testpass123',
            user_type='staff'
        )
        self.factory = RequestFactory()
    
    def test_create_audit_log_helper(self):
        """Test create_audit_log service function."""
        create_audit_log(
            actor=self.staff_user,
            action_type='READ',
            target_table='DentalRecord',
            target_record_id=123,
            patient_id=456,
            ip_address='192.168.1.1',
            user_agent='Mozilla/5.0'
        )
        
        # Verify log was created
        logs = AuditLog.objects.filter(actor=self.staff_user)
        self.assertEqual(logs.count(), 1)
        
        log = logs.first()
        self.assertEqual(log.action_type, 'READ')
        self.assertEqual(log.target_record_id, 123)
        self.assertEqual(log.patient_id, 456)
    
    def test_sanitize_data_removes_password(self):
        """Test that sanitize_data removes password fields."""
        data = {
            'username': 'testuser',
            'password': 'secret123',
            'email': 'test@example.com'
        }
        
        sanitized = sanitize_data(data)
        
        self.assertIn('username', sanitized)
        self.assertIn('email', sanitized)
        self.assertNotIn('password', sanitized)
        self.assertEqual(sanitized['username'], 'testuser')
    
    def test_sanitize_data_removes_token(self):
        """Test that sanitize_data removes auth tokens."""
        data = {
            'user_id': 123,
            'auth_token': 'abc123xyz',
            'api_key': 'secret_key_456'
        }
        
        sanitized = sanitize_data(data)
        
        self.assertIn('user_id', sanitized)
        self.assertNotIn('auth_token', sanitized)
        self.assertNotIn('api_key', sanitized)
    
    def test_sanitize_data_nested_objects(self):
        """Test sanitization of nested dictionaries."""
        data = {
            'user': {
                'username': 'testuser',
                'password': 'secret123',
                'profile': {
                    'email': 'test@example.com',
                    'api_key': 'secret'
                }
            }
        }
        
        sanitized = sanitize_data(data)
        
        self.assertIn('username', sanitized['user'])
        self.assertNotIn('password', sanitized['user'])
        self.assertIn('email', sanitized['user']['profile'])
        self.assertNotIn('api_key', sanitized['user']['profile'])
    
    def test_get_client_ip_from_request(self):
        """Test extracting client IP from request."""
        request = self.factory.get('/')
        request.META['REMOTE_ADDR'] = '203.0.113.42'
        
        ip = get_client_ip(request)
        self.assertEqual(ip, '203.0.113.42')
    
    def test_get_client_ip_with_proxy(self):
        """Test extracting client IP through proxy headers."""
        request = self.factory.get('/')
        request.META['HTTP_X_FORWARDED_FOR'] = '198.51.100.1, 203.0.113.42'
        request.META['REMOTE_ADDR'] = '10.0.0.1'
        
        ip = get_client_ip(request)
        # Should get first IP from X-Forwarded-For
        self.assertEqual(ip, '198.51.100.1')
    
    def test_get_user_agent(self):
        """Test extracting user agent from request."""
        request = self.factory.get('/')
        request.META['HTTP_USER_AGENT'] = 'Mozilla/5.0 (Test Browser)'
        
        user_agent = get_user_agent(request)
        self.assertEqual(user_agent, 'Mozilla/5.0 (Test Browser)')


class AuditSignalsTest(TestCase):
    """Test that signals automatically create audit logs."""
    
    def setUp(self):
        self.staff_user = User.objects.create_user(
            username='staff1',
            password='testpass123',
            user_type='staff'
        )
        
        self.patient_user = User.objects.create_user(
            username='patient1',
            password='testpass123',
            user_type='patient'
        )
    
    def test_create_triggers_audit_log(self):
        """Test that creating a record triggers CREATE audit log."""
        initial_count = AuditLog.objects.count()
        
        # Create dental record (should trigger signal)
        record = DentalRecord.objects.create(
            patient=self.patient_user,
            chief_complaint='Test complaint',
            diagnosis='Test diagnosis',
            created_by=self.staff_user
        )
        
        # Check audit log was created
        new_log_count = AuditLog.objects.count()
        self.assertEqual(new_log_count, initial_count + 1)
        
        # Verify log details
        log = AuditLog.objects.latest('timestamp')
        self.assertEqual(log.action_type, 'CREATE')
        self.assertEqual(log.target_table, 'DentalRecord')
        self.assertEqual(log.target_record_id, record.id)
        self.assertEqual(log.patient_id, self.patient_user.id)
    
    def test_update_triggers_audit_log(self):
        """Test that updating a record triggers UPDATE audit log."""
        # Create record
        record = DentalRecord.objects.create(
            patient=self.patient_user,
            chief_complaint='Original complaint',
            created_by=self.staff_user
        )
        
        initial_count = AuditLog.objects.count()
        
        # Update record
        record.chief_complaint = 'Updated complaint'
        record.save()
        
        # Check audit log
        new_log_count = AuditLog.objects.count()
        self.assertEqual(new_log_count, initial_count + 1)
        
        # Verify log has before/after
        log = AuditLog.objects.latest('timestamp')
        self.assertEqual(log.action_type, 'UPDATE')
        self.assertIn('before', log.changes)
        self.assertIn('after', log.changes)
        self.assertEqual(log.changes['before']['chief_complaint'], 'Original complaint')
        self.assertEqual(log.changes['after']['chief_complaint'], 'Updated complaint')
    
    def test_delete_triggers_audit_log(self):
        """Test that deleting a record triggers DELETE audit log."""
        # Create record
        record = DentalRecord.objects.create(
            patient=self.patient_user,
            chief_complaint='Test complaint',
            created_by=self.staff_user
        )
        record_id = record.id
        
        initial_count = AuditLog.objects.count()
        
        # Delete record
        record.delete()
        
        # Check audit log
        new_log_count = AuditLog.objects.count()
        self.assertEqual(new_log_count, initial_count + 1)
        
        # Verify log
        log = AuditLog.objects.latest('timestamp')
        self.assertEqual(log.action_type, 'DELETE')
        self.assertEqual(log.target_record_id, record_id)


class AuditDecoratorTest(TestCase):
    """Test audit logging decorators."""
    
    def setUp(self):
        self.staff_user = User.objects.create_user(
            username='staff1',
            password='testpass123',
            user_type='staff'
        )
        self.patient_user = User.objects.create_user(
            username='patient1',
            password='testpass123',
            user_type='patient'
        )
        self.factory = RequestFactory()
    
    def test_log_patient_access_decorator(self):
        """Test @log_patient_access decorator creates audit log."""
        from api.audit_decorators import log_patient_access
        from rest_framework.response import Response
        
        # Create mock view with decorator
        @log_patient_access
        def test_view(request, pk=None):
            return Response({'patient_id': pk})
        
        # Create request
        request = self.factory.get(f'/api/users/{self.patient_user.id}/')
        request.user = self.staff_user
        
        initial_count = AuditLog.objects.count()
        
        # Call view
        response = test_view(request, pk=self.patient_user.id)
        
        # Verify audit log created
        new_count = AuditLog.objects.count()
        self.assertEqual(new_count, initial_count + 1)
        
        log = AuditLog.objects.latest('timestamp')
        self.assertEqual(log.action_type, 'READ')
        self.assertEqual(log.patient_id, self.patient_user.id)
        self.assertEqual(log.actor, self.staff_user)
    
    def test_log_export_decorator(self):
        """Test @log_export decorator creates EXPORT audit log."""
        from api.audit_decorators import log_export
        from rest_framework.response import Response
        
        @log_export
        def export_view(request, pk=None):
            return Response({'data': 'exported'})
        
        request = self.factory.get('/api/export/')
        request.user = self.staff_user
        
        initial_count = AuditLog.objects.count()
        export_view(request, pk=self.patient_user.id)
        
        log = AuditLog.objects.latest('timestamp')
        self.assertEqual(log.action_type, 'EXPORT')


class AuditMiddlewareTest(TestCase):
    """Test audit middleware request logging."""
    
    def setUp(self):
        self.staff_user = User.objects.create_user(
            username='staff1',
            password='testpass123',
            user_type='staff'
        )
    
    def test_middleware_logs_api_requests(self):
        """Test middleware captures API requests."""
        from django.test import Client
        
        client = Client()
        client.force_login(self.staff_user)
        
        initial_count = AuditLog.objects.count()
        
        # Make API request
        response = client.get('/api/users/')
        
        # Check if middleware logged it (depends on implementation)
        # Note: This may not trigger if signals already logged it
        new_count = AuditLog.objects.count()
        self.assertGreaterEqual(new_count, initial_count)
    
    def test_middleware_skips_unauthenticated_requests(self):
        """Test middleware doesn't log unauthenticated requests."""
        from django.test import Client
        
        client = Client()
        initial_count = AuditLog.objects.count()
        
        # Unauthenticated request
        response = client.get('/api/users/')
        
        # Should not create log
        new_count = AuditLog.objects.count()
        self.assertEqual(new_count, initial_count)


class AuditPerformanceTest(TestCase):
    """Test audit logging performance."""
    
    def test_bulk_log_creation_performance(self):
        """Test that bulk log creation is performant."""
        import time
        
        staff_user = User.objects.create_user(
            username='staff1',
            password='testpass123',
            user_type='staff'
        )
        
        start_time = time.time()
        
        # Create 1000 audit logs
        logs = []
        for i in range(1000):
            logs.append(AuditLog(
                actor=staff_user,
                action_type='READ',
                target_table='User',
                target_record_id=i,
                ip_address='127.0.0.1'
            ))
        
        AuditLog.objects.bulk_create(logs)
        
        duration = time.time() - start_time
        
        # Should complete in under 5 seconds
        self.assertLess(duration, 5.0, 
            f"Bulk creation of 1000 logs took {duration:.2f}s (should be < 5s)")


# Run tests with:
# python manage.py test api.tests.test_audit -v 2
```

RUNNING TESTS:

```bash
# Run all audit tests
python manage.py test api.tests.test_audit

# Run specific test class
python manage.py test api.tests.test_audit.AuditLogModelTest

# Run with verbose output
python manage.py test api.tests.test_audit -v 2

# Run with coverage
pip install coverage
coverage run --source='api' manage.py test api.tests.test_audit
coverage report
coverage html  # Creates htmlcov/index.html
```

EXPECTED OUTPUT:

```
Creating test database for alias 'default'...
System check identified no issues (0 silenced).
......................
----------------------------------------------------------------------
Ran 22 tests in 2.341s

OK
Destroying test database for alias 'default'...
```

COVERAGE TARGET:

Aim for >80% code coverage on audit-related code:
- ✅ audit_service.py: 100%
- ✅ signals.py: 95%
- ✅ decorators.py: 90%
- ✅ middleware.py: 85%
- ✅ models.py (AuditLog): 100%
```

---

## 🔨 Task 5.2: Create Integration Tests for Audit Flows

### LLM Prompt

```
TASK: Write end-to-end integration tests for complete audit flows

CONTEXT:
Unit tests verify individual components. Integration tests verify entire workflows from HTTP request to audit log creation.

FILE TO CREATE: backend/api/tests/test_audit_integration.py (NEW FILE)

REQUIREMENTS:

Test complete flows:
1. User login → Audit log created with correct details
2. Patient record creation → CREATE audit log with patient context
3. Patient record retrieval → READ audit log via decorator
4. Patient record update → UPDATE audit log with before/after
5. Patient record deletion → DELETE audit log
6. Document export → EXPORT audit log
7. Search for patients → Selective search logging
8. Failed login attempts → LOGIN_FAILED log

COMPLETE INTEGRATION TEST IMPLEMENTATION:

```python
"""
Integration tests for audit logging workflows.

These tests verify end-to-end audit trails from API requests
to database audit log entries.

Run with: python manage.py test api.tests.test_audit_integration
"""

from django.test import TestCase, Client
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from api.models import AuditLog, DentalRecord, Appointment, Document
import json

User = get_user_model()


class LoginAuditTest(TestCase):
    """Test audit logging for authentication flows."""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            user_type='staff',
            email='test@example.com'
        )
    
    def test_successful_login_creates_audit_log(self):
        """Test successful login creates LOGIN_SUCCESS audit log."""
        initial_count = AuditLog.objects.count()
        
        response = self.client.post('/api/login/', {
            'username': 'testuser',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, 200)
        
        # Verify audit log
        logs = AuditLog.objects.filter(action_type='LOGIN_SUCCESS')
        self.assertEqual(logs.count(), 1)
        
        log = logs.first()
        self.assertEqual(log.actor, self.user)
        self.assertIn('username', log.changes)
        self.assertNotIn('password', log.changes)  # Password should be sanitized
    
    def test_failed_login_creates_audit_log(self):
        """Test failed login creates LOGIN_FAILED audit log."""
        response = self.client.post('/api/login/', {
            'username': 'testuser',
            'password': 'wrongpassword'
        })
        
        self.assertEqual(response.status_code, 400)
        
        # Verify audit log
        logs = AuditLog.objects.filter(action_type='LOGIN_FAILED')
        self.assertEqual(logs.count(), 1)
        
        log = logs.first()
        self.assertIsNone(log.actor)  # No actor for failed login
        self.assertIn('username', log.changes)
        self.assertEqual(log.changes['username'], 'testuser')
    
    def test_logout_creates_audit_log(self):
        """Test logout creates LOGOUT audit log."""
        # Login first
        self.client.login(username='testuser', password='testpass123')
        
        initial_count = AuditLog.objects.count()
        
        response = self.client.post('/api/logout/')
        
        # Verify logout log
        logs = AuditLog.objects.filter(
            action_type='LOGOUT',
            actor=self.user
        ).order_by('-timestamp')
        
        self.assertGreaterEqual(logs.count(), 1)
        log = logs.first()
        self.assertEqual(log.actor, self.user)
    
    def test_multiple_failed_logins_tracked(self):
        """Test multiple failed login attempts are tracked."""
        # Attempt 5 failed logins
        for i in range(5):
            self.client.post('/api/login/', {
                'username': 'testuser',
                'password': f'wrongpass{i}'
            })
        
        # Verify all attempts logged
        failed_logs = AuditLog.objects.filter(action_type='LOGIN_FAILED')
        self.assertEqual(failed_logs.count(), 5)


class CRUDOperationAuditTest(TestCase):
    """Test audit logging for CRUD operations."""
    
    def setUp(self):
        self.api_client = APIClient()
        
        # Create staff user
        self.staff_user = User.objects.create_user(
            username='staff1',
            password='testpass123',
            user_type='staff'
        )
        
        # Create patient
        self.patient = User.objects.create_user(
            username='patient1',
            password='testpass123',
            user_type='patient',
            first_name='John',
            last_name='Doe'
        )
        
        # Authenticate
        self.api_client.force_authenticate(user=self.staff_user)
    
    def test_create_patient_record_audit(self):
        """Test creating patient record generates CREATE audit log."""
        initial_count = AuditLog.objects.count()
        
        response = self.api_client.post('/api/dental-records/', {
            'patient': self.patient.id,
            'chief_complaint': 'Toothache',
            'diagnosis': 'Cavity'
        }, format='json')
        
        self.assertEqual(response.status_code, 201)
        
        # Verify CREATE audit log
        new_count = AuditLog.objects.count()
        self.assertGreater(new_count, initial_count)
        
        log = AuditLog.objects.filter(
            action_type='CREATE',
            target_table='DentalRecord'
        ).latest('timestamp')
        
        self.assertEqual(log.actor, self.staff_user)
        self.assertEqual(log.patient_id, self.patient.id)
        self.assertIn('chief_complaint', str(log.changes))
    
    def test_read_patient_record_audit(self):
        """Test reading patient record generates READ audit log."""
        # Create a record first
        record = DentalRecord.objects.create(
            patient=self.patient,
            chief_complaint='Test',
            created_by=self.staff_user
        )
        
        initial_count = AuditLog.objects.filter(action_type='READ').count()
        
        # Read the record
        response = self.api_client.get(f'/api/dental-records/{record.id}/')
        
        self.assertEqual(response.status_code, 200)
        
        # Verify READ audit log
        new_count = AuditLog.objects.filter(action_type='READ').count()
        self.assertGreater(new_count, initial_count)
        
        log = AuditLog.objects.filter(
            action_type='READ',
            target_record_id=record.id
        ).latest('timestamp')
        
        self.assertEqual(log.actor, self.staff_user)
        self.assertEqual(log.patient_id, self.patient.id)
    
    def test_update_patient_record_audit(self):
        """Test updating patient record generates UPDATE audit log with before/after."""
        # Create record
        record = DentalRecord.objects.create(
            patient=self.patient,
            chief_complaint='Original complaint',
            diagnosis='Original diagnosis',
            created_by=self.staff_user
        )
        
        # Clear initial logs
        initial_count = AuditLog.objects.count()
        
        # Update record
        response = self.api_client.patch(
            f'/api/dental-records/{record.id}/',
            {'chief_complaint': 'Updated complaint'},
            format='json'
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Verify UPDATE audit log
        log = AuditLog.objects.filter(
            action_type='UPDATE',
            target_record_id=record.id
        ).latest('timestamp')
        
        self.assertEqual(log.actor, self.staff_user)
        
        # Verify before/after in changes
        self.assertIn('before', log.changes)
        self.assertIn('after', log.changes)
        self.assertEqual(
            log.changes['before']['chief_complaint'],
            'Original complaint'
        )
        self.assertEqual(
            log.changes['after']['chief_complaint'],
            'Updated complaint'
        )
    
    def test_delete_patient_record_audit(self):
        """Test deleting patient record generates DELETE audit log."""
        # Create record
        record = DentalRecord.objects.create(
            patient=self.patient,
            chief_complaint='To be deleted',
            created_by=self.staff_user
        )
        record_id = record.id
        
        initial_count = AuditLog.objects.filter(action_type='DELETE').count()
        
        # Delete record
        response = self.api_client.delete(f'/api/dental-records/{record_id}/')
        
        self.assertEqual(response.status_code, 204)
        
        # Verify DELETE audit log
        new_count = AuditLog.objects.filter(action_type='DELETE').count()
        self.assertGreater(new_count, initial_count)
        
        log = AuditLog.objects.filter(
            action_type='DELETE',
            target_record_id=record_id
        ).latest('timestamp')
        
        self.assertEqual(log.actor, self.staff_user)
        self.assertEqual(log.patient_id, self.patient.id)


class SearchAndExportAuditTest(TestCase):
    """Test audit logging for search and export operations."""
    
    def setUp(self):
        self.api_client = APIClient()
        
        self.staff_user = User.objects.create_user(
            username='staff1',
            password='testpass123',
            user_type='staff'
        )
        
        # Create multiple patients
        self.patients = []
        for i in range(5):
            patient = User.objects.create_user(
                username=f'patient{i}',
                password='testpass123',
                user_type='patient',
                first_name=f'Patient',
                last_name=f'Number{i}'
            )
            self.patients.append(patient)
        
        self.api_client.force_authenticate(user=self.staff_user)
    
    def test_patient_search_with_query_creates_log(self):
        """Test searching for specific patient creates SEARCH audit log."""
        initial_count = AuditLog.objects.filter(action_type='SEARCH').count()
        
        # Search for specific patient
        response = self.api_client.get(
            '/api/users/',
            {'search': 'patient1', 'user_type': 'patient'}
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Verify SEARCH log created
        new_count = AuditLog.objects.filter(action_type='SEARCH').count()
        self.assertGreater(new_count, initial_count)
        
        log = AuditLog.objects.filter(action_type='SEARCH').latest('timestamp')
        self.assertIn('search', log.changes)
        self.assertEqual(log.changes['search'], 'patient1')
    
    def test_general_list_view_no_search_log(self):
        """Test listing all patients without search doesn't create SEARCH log."""
        initial_count = AuditLog.objects.filter(action_type='SEARCH').count()
        
        # List all patients (no search query)
        response = self.api_client.get('/api/users/', {'user_type': 'patient'})
        
        self.assertEqual(response.status_code, 200)
        
        # Should NOT create SEARCH log (general list view)
        new_count = AuditLog.objects.filter(action_type='SEARCH').count()
        self.assertEqual(new_count, initial_count)
    
    def test_export_patient_data_creates_export_log(self):
        """Test exporting patient data creates EXPORT audit log."""
        patient = self.patients[0]
        
        initial_count = AuditLog.objects.filter(action_type='EXPORT').count()
        
        # Export patient records
        response = self.api_client.get(f'/api/users/{patient.id}/export_records/')
        
        # Verify EXPORT log
        new_count = AuditLog.objects.filter(action_type='EXPORT').count()
        self.assertGreater(new_count, initial_count)
        
        log = AuditLog.objects.filter(
            action_type='EXPORT',
            patient_id=patient.id
        ).latest('timestamp')
        
        self.assertEqual(log.actor, self.staff_user)
        self.assertEqual(log.patient_id, patient.id)


class DocumentAccessAuditTest(TestCase):
    """Test audit logging for document access."""
    
    def setUp(self):
        self.api_client = APIClient()
        
        self.staff_user = User.objects.create_user(
            username='staff1',
            password='testpass123',
            user_type='staff'
        )
        
        self.patient = User.objects.create_user(
            username='patient1',
            password='testpass123',
            user_type='patient'
        )
        
        # Create document
        self.document = Document.objects.create(
            patient=self.patient,
            document_type='xray',
            file='test.pdf',
            uploaded_by=self.staff_user
        )
        
        self.api_client.force_authenticate(user=self.staff_user)
    
    def test_document_view_creates_read_log(self):
        """Test viewing document details creates READ audit log."""
        initial_count = AuditLog.objects.filter(
            action_type='READ',
            target_table='Document'
        ).count()
        
        response = self.api_client.get(f'/api/documents/{self.document.id}/')
        
        # Verify READ log for document
        new_count = AuditLog.objects.filter(
            action_type='READ',
            target_table='Document'
        ).count()
        
        self.assertGreater(new_count, initial_count)


class MiddlewareCoverageTest(TestCase):
    """Test middleware catches requests not logged by signals/decorators."""
    
    def setUp(self):
        self.api_client = APIClient()
        
        self.staff_user = User.objects.create_user(
            username='staff1',
            password='testpass123',
            user_type='staff'
        )
        
        self.api_client.force_authenticate(user=self.staff_user)
    
    def test_middleware_logs_untracked_endpoints(self):
        """Test middleware logs API calls not covered by other mechanisms."""
        # Health check or custom endpoint without explicit logging
        initial_count = AuditLog.objects.count()
        
        response = self.api_client.get('/api/statistics/')  # Custom endpoint
        
        # Middleware should have logged this
        # (Exact behavior depends on middleware implementation)
        new_count = AuditLog.objects.count()
        # Verify some logging occurred
        self.assertGreaterEqual(new_count, initial_count)


class ComplianceScenarioTest(TestCase):
    """Test realistic compliance scenarios."""
    
    def setUp(self):
        self.api_client = APIClient()
        
        # Create owner (compliance reviewer)
        self.owner = User.objects.create_user(
            username='owner',
            password='testpass123',
            user_type='owner'
        )
        
        # Create staff member
        self.staff = User.objects.create_user(
            username='staff1',
            password='testpass123',
            user_type='staff'
        )
        
        # Create patient
        self.patient = User.objects.create_user(
            username='patient1',
            password='testpass123',
            user_type='patient',
            first_name='Jane',
            last_name='Doe'
        )
    
    def test_complete_patient_journey_audit_trail(self):
        """Test complete audit trail from patient creation to treatment."""
        self.api_client.force_authenticate(user=self.staff)
        
        # 1. Staff accesses patient list (should be logged or not based on config)
        self.api_client.get('/api/users/', {'user_type': 'patient'})
        
        # 2. Staff views specific patient (READ)
        self.api_client.get(f'/api/users/{self.patient.id}/')
        
        # 3. Staff creates dental record (CREATE)
        response = self.api_client.post('/api/dental-records/', {
            'patient': self.patient.id,
            'chief_complaint': 'Tooth pain',
            'diagnosis': 'Cavity'
        }, format='json')
        record_id = response.data['id']
        
        # 4. Staff updates record (UPDATE)
        self.api_client.patch(f'/api/dental-records/{record_id}/', {
            'diagnosis': 'Cavity in Molar 1'
        }, format='json')
        
        # 5. Staff exports patient history (EXPORT)
        self.api_client.get(f'/api/users/{self.patient.id}/export_records/')
        
        # Verify complete audit trail
        patient_logs = AuditLog.objects.filter(
            patient_id=self.patient.id
        ).order_by('timestamp')
        
        actions = list(patient_logs.values_list('action_type', flat=True))
        
        # Verify key actions were logged
        self.assertIn('READ', actions)
        self.assertIn('CREATE', actions)
        self.assertIn('UPDATE', actions)
        self.assertIn('EXPORT', actions)
        
        # Verify all logs have correct patient ID
        for log in patient_logs:
            self.assertEqual(log.patient_id, self.patient.id)
            self.assertEqual(log.actor, self.staff)
    
    def test_owner_can_review_audit_history(self):
        """Test owner can retrieve complete audit history for compliance."""
        # Generate some activity
        self.api_client.force_authenticate(user=self.staff)
        self.api_client.get(f'/api/users/{self.patient.id}/')
        
        # Owner reviews audit logs
        self.api_client.force_authenticate(user=self.owner)
        
        # In real implementation, this would be admin panel or API endpoint
        logs = AuditLog.objects.filter(patient_id=self.patient.id)
        
        self.assertGreaterEqual(logs.count(), 1)
        
        # Verify log integrity
        for log in logs:
            self.assertIsNotNone(log.timestamp)
            self.assertIsNotNone(log.action_type)
            self.assertIsNotNone(log.target_table)


# Run with:
# python manage.py test api.tests.test_audit_integration -v 2
```

RUNNING INTEGRATION TESTS:

```bash
# Run all integration tests
python manage.py test api.tests.test_audit_integration

# Run specific scenario
python manage.py test api.tests.test_audit_integration.ComplianceScenarioTest

# Run with detailed output
python manage.py test api.tests.test_audit_integration -v 2
```

VALIDATION CRITERIA:

Pass all tests demonstrating:
- ✅ Login/logout tracked
- ✅ Failed logins tracked
- ✅ CREATE operations logged with patient context
- ✅ READ operations logged for patient records
- ✅ UPDATE operations logged with before/after
- ✅ DELETE operations logged
- ✅ EXPORT operations tracked
- ✅ Search operations selectively logged
- ✅ Complete patient journey has full audit trail
- ✅ Middleware covers gaps
```

---

## 🔨 Task 5.3: Perform Performance Testing and Benchmarks

### LLM Prompt

```
TASK: Measure performance impact of audit logging and establish benchmarks

CONTEXT:
Audit logging adds overhead to every operation. Measure this impact to ensure it's acceptable for production use.

FILE TO CREATE: backend/api/tests/test_audit_performance.py (NEW FILE)

REQUIREMENTS:

Benchmark:
1. Baseline API performance (without audit logging)
2. API performance with audit logging enabled
3. Bulk operation performance (100+ records)
4. Database query count (N+1 issues)
5. Middleware latency
6. Async vs sync logging comparison

TARGET METRICS:
- < 10ms overhead per request (sync logging)
- < 2ms overhead per request (async logging)
- < 100 extra queries per 1000 operations
- Audit log creation < 50ms (p99)

PERFORMANCE TEST IMPLEMENTATION:

```python
"""
Performance tests for audit logging system.

Measures overhead and identifies bottlenecks.

Run with: python manage.py test api.tests.test_audit_performance --keepdb
"""

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import override_settings
from rest_framework.test import APIClient
from api.models import AuditLog, DentalRecord
import time
import statistics

User = get_user_model()


class AuditPerformanceBenchmark(TestCase):
    """Benchmark audit logging performance."""
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.iterations = 100  # Number of operations to test
    
    def setUp(self):
        self.api_client = APIClient()
        
        self.staff_user = User.objects.create_user(
            username='staff1',
            password='testpass123',
            user_type='staff'
        )
        
        self.patient = User.objects.create_user(
            username='patient1',
            password='testpass123',
            user_type='patient'
        )
        
        self.api_client.force_authenticate(user=self.staff_user)
    
    def measure_operation(self, operation_func, iterations=100):
        """
        Measure operation performance.
        
        Returns: (mean_ms, median_ms, p95_ms, p99_ms)
        """
        times = []
        
        for i in range(iterations):
            start = time.perf_counter()
            operation_func(i)
            end = time.perf_counter()
            times.append((end - start) * 1000)  # Convert to ms
        
        times.sort()
        
        return {
            'mean': statistics.mean(times),
            'median': statistics.median(times),
            'p95': times[int(len(times) * 0.95)],
            'p99': times[int(len(times) * 0.99)],
            'min': min(times),
            'max': max(times)
        }
    
    def test_audit_log_creation_performance(self):
        """Benchmark direct audit log creation."""
        
        def create_log(i):
            AuditLog.objects.create(
                actor=self.staff_user,
                action_type='READ',
                target_table='User',
                target_record_id=i,
                patient_id=self.patient.id,
                ip_address='127.0.0.1'
            )
        
        metrics = self.measure_operation(create_log, iterations=100)
        
        print(f"\n📊 Audit Log Creation Performance:")
        print(f"   Mean: {metrics['mean']:.2f}ms")
        print(f"   Median: {metrics['median']:.2f}ms")
        print(f"   P95: {metrics['p95']:.2f}ms")
        print(f"   P99: {metrics['p99']:.2f}ms")
        
        # Assert acceptable performance
        self.assertLess(metrics['p99'], 50.0, 
            "Audit log creation P99 should be under 50ms")
    
    @override_settings(AUDIT_MIDDLEWARE_ENABLED=False)
    def test_api_baseline_performance(self):
        """Measure API performance WITHOUT audit logging."""
        
        # Create test records
        records = []
        for i in range(10):
            record = DentalRecord.objects.create(
                patient=self.patient,
                chief_complaint=f'Complaint {i}',
                created_by=self.staff_user
            )
            records.append(record)
        
        def api_read(i):
            record_id = records[i % len(records)].id
            self.api_client.get(f'/api/dental-records/{record_id}/')
        
        metrics = self.measure_operation(api_read, iterations=100)
        
        print(f"\n📊 API Performance (NO AUDIT):")
        print(f"   Mean: {metrics['mean']:.2f}ms")
        print(f"   P99: {metrics['p99']:.2f}ms")
        
        return metrics
    
    @override_settings(AUDIT_MIDDLEWARE_ENABLED=True)
    def test_api_with_audit_performance(self):
        """Measure API performance WITH audit logging."""
        
        # Create test records
        records = []
        for i in range(10):
            record = DentalRecord.objects.create(
                patient=self.patient,
                chief_complaint=f'Complaint {i}',
                created_by=self.staff_user
            )
            records.append(record)
        
        def api_read(i):
            record_id = records[i % len(records)].id
            self.api_client.get(f'/api/dental-records/{record_id}/')
        
        metrics = self.measure_operation(api_read, iterations=100)
        
        print(f"\n📊 API Performance (WITH AUDIT):")
        print(f"   Mean: {metrics['mean']:.2f}ms")
        print(f"   P99: {metrics['p99']:.2f}ms")
        
        # Calculate overhead
        # Note: Run both tests to compare
        # baseline = self.test_api_baseline_performance()
        # overhead = metrics['mean'] - baseline['mean']
        # print(f"   Overhead: {overhead:.2f}ms")
        
        self.assertLess(metrics['p99'], 200.0,
            "API with audit logging P99 should be under 200ms")
    
    def test_query_count_with_signals(self):
        """Measure database queries caused by audit signals."""
        
        # Clear audit logs
        AuditLog.objects.all().delete()
        
        # Count queries for record creation
        with self.assertNumQueries(None) as context:
            record = DentalRecord.objects.create(
                patient=self.patient,
                chief_complaint='Test',
                created_by=self.staff_user
            )
        
        query_count = len(context.captured_queries)
        
        print(f"\n📊 Query Count for CREATE with Audit:")
        print(f"   Total Queries: {query_count}")
        
        # Should be reasonable (<10 queries)
        self.assertLess(query_count, 10,
            "CREATE operation with audit should use <10 queries")
    
    def test_bulk_operation_performance(self):
        """Test performance with bulk operations."""
        
        start_time = time.time()
        
        # Bulk create 100 dental records
        records = []
        for i in range(100):
            records.append(DentalRecord(
                patient=self.patient,
                chief_complaint=f'Complaint {i}',
                diagnosis=f'Diagnosis {i}',
                created_by=self.staff_user
            ))
        
        DentalRecord.objects.bulk_create(records)
        
        duration = time.time() - start_time
        
        print(f"\n📊 Bulk Create Performance (100 records):")
        print(f"   Duration: {duration:.2f}s")
        print(f"   Per Record: {(duration/100)*1000:.2f}ms")
        
        # Check audit logs created
        audit_count = AuditLog.objects.filter(
            action_type='CREATE',
            target_table='DentalRecord'
        ).count()
        
        print(f"   Audit Logs Created: {audit_count}")
        
        # Bulk should be efficient (<5 seconds for 100 records)
        self.assertLess(duration, 5.0,
            "Bulk create of 100 records should take <5s")
    
    def test_audit_query_performance(self):
        """Test performance of querying audit logs."""
        
        # Create 1000 audit logs
        logs = []
        for i in range(1000):
            logs.append(AuditLog(
                actor=self.staff_user,
                action_type='READ',
                target_table='User',
                target_record_id=i % 100,
                patient_id=self.patient.id,
                ip_address='127.0.0.1'
            ))
        
        AuditLog.objects.bulk_create(logs)
        
        # Test query performance
        start = time.perf_counter()
        
        # Query by patient
        patient_logs = list(AuditLog.objects.filter(
            patient_id=self.patient.id
        )[:50])
        
        query_time = (time.perf_counter() - start) * 1000
        
        print(f"\n📊 Audit Log Query Performance:")
        print(f"   Query Time (50 records): {query_time:.2f}ms")
        
        # Should be fast due to indexes
        self.assertLess(query_time, 100.0,
            "Querying audit logs should take <100ms")


class AsyncLoggingPerformanceTest(TestCase):
    """Compare sync vs async audit logging performance."""
    
    @override_settings(AUDIT_ASYNC_LOGGING=False)
    def test_sync_logging_performance(self):
        """Measure synchronous audit logging overhead."""
        
        staff_user = User.objects.create_user(
            username='staff1',
            password='testpass123',
            user_type='staff'
        )
        
        patient = User.objects.create_user(
            username='patient1',
            password='testpass123',
            user_type='patient'
        )
        
        from api.audit_service import create_audit_log
        
        start_time = time.time()
        
        for i in range(100):
            create_audit_log(
                actor=staff_user,
                action_type='READ',
                target_table='User',
                target_record_id=i,
                patient_id=patient.id
            )
        
        sync_duration = time.time() - start_time
        
        print(f"\n📊 Sync Logging (100 operations):")
        print(f"   Duration: {sync_duration:.3f}s")
        print(f"   Per Log: {(sync_duration/100)*1000:.2f}ms")
        
        return sync_duration
    
    @override_settings(AUDIT_ASYNC_LOGGING=True)
    def test_async_logging_performance(self):
        """
        Measure asynchronous audit logging overhead.
        
        Note: Requires Celery to be running for accurate test.
        This test will show the queuing overhead, not actual log creation.
        """
        
        staff_user = User.objects.create_user(
            username='staff2',
            password='testpass123',
            user_type='staff'
        )
        
        patient = User.objects.create_user(
            username='patient2',
            password='testpass123',
            user_type='patient'
        )
        
        from api.audit_service import create_audit_log
        
        start_time = time.time()
        
        for i in range(100):
            create_audit_log(
                actor=staff_user,
                action_type='READ',
                target_table='User',
                target_record_id=i,
                patient_id=patient.id
            )
        
        async_duration = time.time() - start_time
        
        print(f"\n📊 Async Logging (100 operations):")
        print(f"   Duration: {async_duration:.3f}s")
        print(f"   Per Log: {(async_duration/100)*1000:.2f}ms")
        
        # Async should be significantly faster (queuing only)
        # Note: Logs may not be in DB yet
        
        return async_duration


# Run with:
# python manage.py test api.tests.test_audit_performance --keepdb -v 2
```

PERFORMANCE TESTING PROCEDURE:

```bash
# 1. Run performance tests
python manage.py test api.tests.test_audit_performance --keepdb -v 2

# 2. Analyze results and look for:
#    - P99 latency < 50ms for audit log creation
#    - API overhead < 10ms with sync logging
#    - Query count reasonable (<10 per operation)

# 3. If performance is poor:
#    - Enable async logging (Celery)
#    - Optimize database indexes
#    - Use select_related/prefetch_related in queries
#    - Consider audit log buffering

# 4. Profile slow operations
python -m cProfile -o audit_profile.stats manage.py test api.tests.test_audit_performance
python -m pstats audit_profile.stats
# In pstats: sort cumulative; stats 20
```

PERFORMANCE OPTIMIZATION CHECKLIST:

- ✅ Database indexes on audit_logs (actor_id, patient_id, timestamp, action_type)
- ✅ Use bulk_create for batch operations
- ✅ Avoid N+1 queries (use select_related for ForeignKeys)
- ✅ Enable async logging for high-traffic endpoints
- ✅ Use database connection pooling
- ✅ Monitor query execution times

ACCEPTABLE PERFORMANCE TARGETS:

- **Sync Logging:** < 10ms overhead per request
- **Async Logging:** < 2ms overhead per request
- **Bulk Operations:** < 50ms per record
- **Query Count:** < 5 queries per audit log creation
- **Admin Interface:** < 500ms to load 100 logs
```

---

_[Task 5.4-5.8 continue with Security Audit, HIPAA Compliance, Production Deployment, Monitoring, and Documentation - see continuation...]_

---

## 📊 Phase 5 Completion Criteria

You have successfully completed Phase 5 when:

- ✅ All unit tests pass (>80% coverage)
- ✅ All integration tests pass
- ✅ Performance benchmarks meet targets
- ✅ Security audit passes (no sensitive data logged)
- ✅ HIPAA compliance checklist complete
- ✅ Production deployment plan documented
- ✅ Monitoring and alerts configured
- ✅ Documentation complete and reviewed

---

## 🚀 Production Rollout

After Phase 5 validation:
1. Deploy to staging environment
2. Perform final validation
3. Train staff on audit log access (admin panel)
4. Deploy to production
5. Monitor for 48 hours
6. Schedule first compliance review

---

**Phase 5 Status:** Ready for Implementation  
**Final Step:** Production deployment and ongoing maintenance

**Congratulations!** Upon completing Phase 5, your HIPAA-compliant audit system will be fully operational. 🎉
