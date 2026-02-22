"""
Comprehensive tests for patient list pagination scalability.
Tests the /api/users/patients/ endpoint and related functionality.

Tests cover:
  - Paginated response structure
  - Correct total count vs page size
  - Page navigation (no duplicates, correct slicing)
  - is_active_patient status accuracy
  - Clinic filter
  - patient_stats endpoint
  - patient_search endpoint
  - archived_patients pagination
  - Query count efficiency
  - Ordering correctness
  - update_patient_status management command
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from api.models import Appointment, ClinicLocation, Service

User = get_user_model()


class PatientPaginationTestCase(TestCase):
    """Tests for patient list pagination behavior."""

    @classmethod
    def setUpTestData(cls):
        """Create test data once for all tests in this class.

        Layout:
        - 1 staff user (used as dentist & authenticated caller)
        - 1 owner user
        - 2 clinic locations
        - 1 service
        - 50 patients:
            patients 1-25: recent completed appointment -> active
            patients 26-35: only old completed appointment (>730 days) -> inactive
            patients 36-50: no appointments -> inactive
        """
        cls.clinic_a = ClinicLocation.objects.create(
            name='Clinic A', address='Address A', phone='111-1111'
        )
        cls.clinic_b = ClinicLocation.objects.create(
            name='Clinic B', address='Address B', phone='222-2222'
        )

        cls.service = Service.objects.create(
            name='Cleaning', category='preventive',
            description='Dental cleaning', duration=30,
        )

        cls.staff_user = User.objects.create_user(
            username='staff_test', password='testpass123',
            email='staff_test@example.com', user_type='staff',
            role='dentist', first_name='Staff', last_name='User',
        )

        cls.owner_user = User.objects.create_user(
            username='owner_test', password='testpass123',
            email='owner_test@example.com', user_type='owner',
            first_name='Owner', last_name='User',
        )

        two_years_ago = timezone.now().date() - timedelta(days=730)
        recent_date = timezone.now().date() - timedelta(days=30)
        old_date = two_years_ago - timedelta(days=60)  # ~790 days ago

        cls.patients = []
        for i in range(1, 51):
            patient = User.objects.create_user(
                username=f'patient_{i:03d}',
                password='testpass123',
                email=f'patient_{i:03d}@example.com',
                user_type='patient',
                first_name=f'First{i:03d}',
                last_name=f'Last{i:03d}',
                assigned_clinic=cls.clinic_a if i <= 30 else cls.clinic_b,
                is_active_patient=True,  # will be corrected by endpoint logic
            )
            cls.patients.append(patient)

            if i <= 25:
                # Recent completed appointment -> should be active
                Appointment.objects.create(
                    patient=patient, dentist=cls.staff_user,
                    service=cls.service, clinic=cls.clinic_a,
                    date=recent_date, time='10:00',
                    status='completed',
                    completed_at=timezone.now() - timedelta(days=30),
                )
            elif i <= 35:
                # Old completed appointment -> should be inactive
                Appointment.objects.create(
                    patient=patient, dentist=cls.staff_user,
                    service=cls.service, clinic=cls.clinic_a,
                    date=old_date, time='10:00',
                    status='completed',
                    completed_at=timezone.now() - timedelta(days=790),
                )
            # patients 36-50: no appointments at all -> inactive

    def setUp(self):
        """Set up API client and authenticate as staff for each test."""
        self.client = APIClient()
        self.client.force_authenticate(user=self.staff_user)

    # --------------------------------------------------
    # Paginated response structure
    # --------------------------------------------------

    def test_paginated_response_structure(self):
        """Response must contain count, next, previous, results."""
        response = self.client.get('/api/users/patients/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('count', data)
        self.assertIn('next', data)
        self.assertIn('previous', data)
        self.assertIn('results', data)
        self.assertIsInstance(data['results'], list)

    def test_count_reflects_total_not_page_size(self):
        """count must equal total patients (50), not just the page length."""
        response = self.client.get('/api/users/patients/')
        data = response.json()
        self.assertEqual(data['count'], 50)
        self.assertEqual(len(data['results']), 20)  # default page_size

    # --------------------------------------------------
    # Page size
    # --------------------------------------------------

    def test_default_page_size_is_20(self):
        """Without page_size param, results should contain 20 items."""
        response = self.client.get('/api/users/patients/')
        data = response.json()
        self.assertEqual(len(data['results']), 20)

    def test_custom_page_size(self):
        """page_size=10 should yield 10 results."""
        response = self.client.get('/api/users/patients/?page_size=10')
        data = response.json()
        self.assertEqual(len(data['results']), 10)
        self.assertEqual(data['count'], 50)

    def test_large_page_size_returns_all(self):
        """page_size=100 (>50 patients) returns all 50 in one page."""
        response = self.client.get('/api/users/patients/?page_size=100')
        data = response.json()
        self.assertEqual(len(data['results']), 50)
        self.assertIsNone(data['next'])

    # --------------------------------------------------
    # Page navigation
    # --------------------------------------------------

    def test_page_navigation_no_duplicates(self):
        """Pages 1-3 (page_size=20) should cover all 50 patients without duplicates."""
        all_ids = set()
        for page_num in range(1, 4):
            response = self.client.get(
                f'/api/users/patients/?page={page_num}&page_size=20'
            )
            data = response.json()
            page_ids = {p['id'] for p in data['results']}
            # No overlap with previous pages
            self.assertEqual(
                len(page_ids & all_ids), 0,
                f'Duplicate IDs found on page {page_num}'
            )
            all_ids |= page_ids

        # All 50 patients accounted for
        self.assertEqual(len(all_ids), 50)

    def test_page_1_has_next_no_previous(self):
        """First page has next link but no previous."""
        response = self.client.get('/api/users/patients/?page_size=20')
        data = response.json()
        self.assertIsNotNone(data['next'])
        self.assertIsNone(data['previous'])

    def test_last_page_has_no_next(self):
        """Last page has previous link but no next."""
        response = self.client.get('/api/users/patients/?page=3&page_size=20')
        data = response.json()
        self.assertIsNone(data['next'])
        self.assertIsNotNone(data['previous'])
        self.assertEqual(len(data['results']), 10)  # 50 - 2*20 = 10

    def test_invalid_page_returns_error(self):
        """Requesting a page beyond the last should return an error (404 or 500)."""
        response = self.client.get('/api/users/patients/?page=999')
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_500_INTERNAL_SERVER_ERROR])

    # --------------------------------------------------
    # is_active_patient status
    # --------------------------------------------------

    def test_active_patient_status_correct(self):
        """Patients with recent appointments should be marked active."""
        response = self.client.get('/api/users/patients/?page_size=50')
        data = response.json()
        results = data['results']

        by_username = {p['username']: p for p in results}

        for i in range(1, 26):
            username = f'patient_{i:03d}'
            self.assertTrue(
                by_username[username]['is_active_patient'],
                f'{username} should be active'
            )

    def test_inactive_patient_status_correct(self):
        """Patients with only old or no appointments should be inactive."""
        response = self.client.get('/api/users/patients/?page_size=50')
        data = response.json()
        results = data['results']

        by_username = {p['username']: p for p in results}

        for i in range(26, 51):
            username = f'patient_{i:03d}'
            self.assertFalse(
                by_username[username]['is_active_patient'],
                f'{username} should be inactive'
            )

    # --------------------------------------------------
    # Clinic filter
    # --------------------------------------------------

    def test_clinic_filter_as_owner(self):
        """Owner users can filter patients by clinic."""
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.get(
            f'/api/users/patients/?clinic={self.clinic_b.id}&page_size=50'
        )
        data = response.json()
        # Patients 31-50 are assigned to clinic_b -> 20 patients
        self.assertEqual(data['count'], 20)
        for p in data['results']:
            self.assertEqual(p['assigned_clinic'], self.clinic_b.id)

    def test_clinic_filter_ignored_for_staff(self):
        """Staff users' clinic param should be ignored (they see all patients)."""
        response = self.client.get(
            f'/api/users/patients/?clinic={self.clinic_b.id}&page_size=50'
        )
        data = response.json()
        self.assertEqual(data['count'], 50)

    # --------------------------------------------------
    # Ordering
    # --------------------------------------------------

    def test_ordering_by_date_joined_then_id(self):
        """Results should be ordered by (date_joined, id)."""
        response = self.client.get('/api/users/patients/?page_size=50')
        data = response.json()
        ids = [p['id'] for p in data['results']]
        self.assertEqual(ids, sorted(ids))

    # --------------------------------------------------
    # Query count efficiency
    # --------------------------------------------------

    def test_query_count_reasonable(self):
        """The patients endpoint should use fewer than 15 SQL queries."""
        from django.test.utils import CaptureQueriesContext
        from django.db import connection

        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get('/api/users/patients/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        num_queries = len(ctx)
        self.assertLessEqual(
            num_queries, 15,
            f'Expected <= 15 queries, got {num_queries}'
        )

    # --------------------------------------------------
    # patient_stats endpoint
    # --------------------------------------------------

    def test_patient_stats_returns_counts(self):
        """patient_stats should return total, active, and inactive counts."""
        # First, ensure is_active_patient is up-to-date
        self.client.get('/api/users/patients/?page_size=50')

        response = self.client.get('/api/users/patient_stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('total_patients', data)
        self.assertIn('active_patients', data)
        self.assertIn('inactive_patients', data)
        self.assertEqual(
            data['total_patients'],
            data['active_patients'] + data['inactive_patients']
        )

    def test_patient_stats_correct_values(self):
        """patient_stats should report 25 active and 25 inactive (after status update)."""
        # Trigger status update by fetching all patients
        self.client.get('/api/users/patients/?page_size=50')

        response = self.client.get('/api/users/patient_stats/')
        data = response.json()
        self.assertEqual(data['total_patients'], 50)
        self.assertEqual(data['active_patients'], 25)
        self.assertEqual(data['inactive_patients'], 25)

    def test_patient_stats_with_clinic_filter(self):
        """Owner can filter stats by clinic."""
        # Update all patient statuses first
        self.client.get('/api/users/patients/?page_size=50')

        self.client.force_authenticate(user=self.owner_user)
        response = self.client.get(
            f'/api/users/patient_stats/?clinic={self.clinic_a.id}'
        )
        data = response.json()
        # Clinic A: patients 1-30
        self.assertEqual(data['total_patients'], 30)

    # --------------------------------------------------
    # patient_search endpoint
    # --------------------------------------------------

    def test_patient_search_returns_results(self):
        """Searching for 'First001' should return patient_001."""
        response = self.client.get('/api/users/patient_search/?q=First001')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['first_name'], 'First001')

    def test_patient_search_partial_match(self):
        """Searching for 'First00' should return patients 1-9."""
        response = self.client.get('/api/users/patient_search/?q=First00')
        data = response.json()
        self.assertEqual(len(data), 9)

    def test_patient_search_short_query_returns_empty(self):
        """Query shorter than 2 characters should return empty array."""
        response = self.client.get('/api/users/patient_search/?q=F')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data, [])

    def test_patient_search_empty_query_returns_empty(self):
        """Empty query should return empty array."""
        response = self.client.get('/api/users/patient_search/?q=')
        data = response.json()
        self.assertEqual(data, [])

    def test_patient_search_max_20_results(self):
        """Search returning many matches is limited to 20."""
        response = self.client.get('/api/users/patient_search/?q=Last')
        data = response.json()
        self.assertLessEqual(len(data), 20)

    def test_patient_search_returns_lightweight_fields(self):
        """Search results should only include id, first_name, last_name, email."""
        response = self.client.get('/api/users/patient_search/?q=First001')
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertIn('id', data[0])
        self.assertIn('first_name', data[0])
        self.assertIn('last_name', data[0])
        self.assertIn('email', data[0])
        # Should NOT include heavyweight fields
        self.assertNotIn('profile_picture', data[0])
        self.assertNotIn('appointments', data[0])

    def test_patient_search_excludes_archived(self):
        """Archived patients should not appear in search results."""
        patient = self.patients[0]
        patient.is_archived = True
        patient.save()

        try:
            response = self.client.get('/api/users/patient_search/?q=First001')
            data = response.json()
            self.assertEqual(len(data), 0)
        finally:
            patient.is_archived = False
            patient.save()

    def test_patient_search_by_email(self):
        """Search by email should work."""
        response = self.client.get('/api/users/patient_search/?q=patient_002@')
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['email'], 'patient_002@example.com')

    # --------------------------------------------------
    # archived_patients endpoint
    # --------------------------------------------------

    def test_archived_patients_paginated_structure(self):
        """archived_patients should return paginated response."""
        patient = self.patients[0]
        patient.is_archived = True
        patient.save()

        try:
            response = self.client.get('/api/users/archived_patients/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            data = response.json()
            self.assertIn('count', data)
            self.assertIn('next', data)
            self.assertIn('previous', data)
            self.assertIn('results', data)
        finally:
            patient.is_archived = False
            patient.save()

    def test_archived_patients_only_shows_archived(self):
        """Only archived patients should appear in the archived list."""
        for p in self.patients[:2]:
            p.is_archived = True
            p.save()

        try:
            response = self.client.get('/api/users/archived_patients/')
            data = response.json()
            self.assertEqual(data['count'], 2)
        finally:
            for p in self.patients[:2]:
                p.is_archived = False
                p.save()

    def test_archived_patients_respects_page_size(self):
        """archived_patients should respect page_size parameter."""
        for p in self.patients[:5]:
            p.is_archived = True
            p.save()

        try:
            response = self.client.get('/api/users/archived_patients/?page_size=2')
            data = response.json()
            self.assertEqual(data['count'], 5)
            self.assertEqual(len(data['results']), 2)
            self.assertIsNotNone(data['next'])
        finally:
            for p in self.patients[:5]:
                p.is_archived = False
                p.save()


class UpdatePatientStatusCommandTestCase(TestCase):
    """Tests for the update_patient_status management command."""

    @classmethod
    def setUpTestData(cls):
        cls.service = Service.objects.create(
            name='Filling', category='restorations',
            description='Dental filling', duration=30,
        )
        cls.staff_user = User.objects.create_user(
            username='cmd_staff', password='testpass123',
            email='cmd_staff@example.com', user_type='staff',
            role='dentist', first_name='Cmd', last_name='Staff',
        )

    def _create_patient(self, username, email, has_recent=False, has_old=False, is_active=True):
        """Helper to create a patient with optional appointments."""
        patient = User.objects.create_user(
            username=username, password='testpass123',
            email=email, user_type='patient',
            first_name=username, last_name='Test',
            is_active_patient=is_active,
        )

        two_years_ago = timezone.now().date() - timedelta(days=730)

        if has_recent:
            Appointment.objects.create(
                patient=patient, dentist=self.staff_user,
                service=self.service,
                date=timezone.now().date() - timedelta(days=30),
                time='10:00', status='completed',
                completed_at=timezone.now() - timedelta(days=30),
            )

        if has_old:
            Appointment.objects.create(
                patient=patient, dentist=self.staff_user,
                service=self.service,
                date=two_years_ago - timedelta(days=60),
                time='10:00', status='completed',
                completed_at=timezone.now() - timedelta(days=790),
            )

        return patient

    def test_command_activates_patients_with_recent_appointments(self):
        """Patient with recent appointment but is_active_patient=False should be activated."""
        patient = self._create_patient(
            'activate_me', 'activate@test.com',
            has_recent=True, is_active=False,
        )

        call_command('update_patient_status')
        patient.refresh_from_db()
        self.assertTrue(patient.is_active_patient)

    def test_command_deactivates_patients_without_recent_appointments(self):
        """Patient with only old appointment and is_active_patient=True should be deactivated."""
        patient = self._create_patient(
            'deactivate_me', 'deactivate@test.com',
            has_old=True, is_active=True,
        )

        call_command('update_patient_status')
        patient.refresh_from_db()
        self.assertFalse(patient.is_active_patient)

    def test_command_deactivates_patients_with_no_appointments(self):
        """Patient with no appointments and is_active_patient=True should be deactivated."""
        patient = self._create_patient(
            'no_appts', 'no_appts@test.com',
            has_recent=False, has_old=False, is_active=True,
        )

        call_command('update_patient_status')
        patient.refresh_from_db()
        self.assertFalse(patient.is_active_patient)

    def test_command_is_idempotent(self):
        """Running the command twice produces the same result."""
        p_active = self._create_patient(
            'idem_active', 'idem_active@test.com',
            has_recent=True, is_active=False,
        )
        p_inactive = self._create_patient(
            'idem_inactive', 'idem_inactive@test.com',
            has_old=True, is_active=True,
        )

        # Run twice
        call_command('update_patient_status')
        call_command('update_patient_status')

        p_active.refresh_from_db()
        p_inactive.refresh_from_db()

        self.assertTrue(p_active.is_active_patient)
        self.assertFalse(p_inactive.is_active_patient)

    def test_command_does_not_affect_non_patients(self):
        """Staff and owner users should not be modified by the command."""
        staff = User.objects.create_user(
            username='cmd_staff2', password='testpass123',
            email='cmd_staff2@test.com', user_type='staff',
            is_active_patient=True,
        )

        call_command('update_patient_status')
        staff.refresh_from_db()
        self.assertTrue(staff.is_active_patient)

    def test_command_handles_mixed_statuses(self):
        """Command correctly handles a batch of patients with varied statuses."""
        p1 = self._create_patient('mix_1', 'mix1@test.com', has_recent=True, is_active=False)
        p2 = self._create_patient('mix_2', 'mix2@test.com', has_recent=True, is_active=True)
        p3 = self._create_patient('mix_3', 'mix3@test.com', has_old=True, is_active=True)
        p4 = self._create_patient('mix_4', 'mix4@test.com', has_old=False, is_active=False)

        call_command('update_patient_status')

        p1.refresh_from_db()
        p2.refresh_from_db()
        p3.refresh_from_db()
        p4.refresh_from_db()

        self.assertTrue(p1.is_active_patient)    # activated
        self.assertTrue(p2.is_active_patient)     # stays active
        self.assertFalse(p3.is_active_patient)    # deactivated
        self.assertFalse(p4.is_active_patient)    # stays inactive
