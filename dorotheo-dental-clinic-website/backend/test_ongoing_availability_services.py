"""
Comprehensive Test Suite for:
1. Ongoing Appointment Status Feature
2. Dentist Availability API (auth fix)
3. Service Update API (M2M fix)

Run with: python manage.py test test_ongoing_availability_services --verbosity=2
Or standalone: python test_ongoing_availability_services.py
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, timedelta, time
from api.models import (
    Appointment, Service, ClinicLocation, DentistAvailability
)

User = get_user_model()


class OngoingAppointmentStatusTests(TestCase):
    """Tests for the new 'Ongoing' appointment feature."""

    def setUp(self):
        """Set up test data."""
        # Create clinic
        self.clinic = ClinicLocation.objects.create(
            name="Test Clinic",
            address="123 Test St",
            phone="09171234567",
        )

        # Create owner
        self.owner = User.objects.create_user(
            username="owner_test",
            email="owner@test.com",
            password="testpass123",
            user_type="owner",
            first_name="Test",
            last_name="Owner",
        )

        # Create staff/dentist
        self.dentist = User.objects.create_user(
            username="dentist_test",
            email="dentist@test.com",
            password="testpass123",
            user_type="staff",
            role="dentist",
            first_name="Test",
            last_name="Dentist",
        )

        # Create patient
        self.patient = User.objects.create_user(
            username="patient_test",
            email="patient@test.com",
            password="testpass123",
            user_type="patient",
            first_name="Test",
            last_name="Patient",
        )

        # Create service
        self.service = Service.objects.create(
            name="Cleaning",
            category="preventive",
            description="Dental cleaning",
            duration=30,
            color="#10b981",
        )
        self.service.clinics.add(self.clinic)

        # Create confirmed appointment
        self.appointment = Appointment.objects.create(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=date.today(),
            time=time(10, 0),
            status="confirmed",
            patient_status="pending",
        )

        # Setup API client
        self.client = APIClient()

    def test_appointment_has_patient_status_field(self):
        """Test that Appointment model has patient_status field."""
        apt = self.appointment
        self.assertIn(apt.patient_status, ['pending', 'waiting', 'ongoing', 'done'])

    def test_mark_appointment_ongoing_via_patch(self):
        """Test setting patient_status to 'ongoing' via PATCH."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            f"/api/appointments/{self.appointment.id}/",
            {"patient_status": "ongoing", "status": "confirmed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.patient_status, "ongoing")
        self.assertEqual(self.appointment.status, "confirmed")

    def test_mark_appointment_ongoing_preserves_confirmed_status(self):
        """Test that marking as ongoing keeps status='confirmed'."""
        self.client.force_authenticate(user=self.owner)
        self.client.patch(
            f"/api/appointments/{self.appointment.id}/",
            {"patient_status": "ongoing", "status": "confirmed"},
            format="json",
        )
        self.appointment.refresh_from_db()
        # Status should remain confirmed (not changed to something else)
        self.assertEqual(self.appointment.status, "confirmed")
        self.assertEqual(self.appointment.patient_status, "ongoing")

    def test_ongoing_to_done_transition(self):
        """Test transitioning from ongoing to done (completed)."""
        self.client.force_authenticate(user=self.owner)
        # First mark as ongoing
        self.client.patch(
            f"/api/appointments/{self.appointment.id}/",
            {"patient_status": "ongoing", "status": "confirmed"},
            format="json",
        )
        # Then mark as done
        response = self.client.patch(
            f"/api/appointments/{self.appointment.id}/",
            {"patient_status": "done", "status": "completed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.patient_status, "done")
        self.assertEqual(self.appointment.status, "completed")

    def test_filter_ongoing_appointments(self):
        """Test filtering appointments by patient_status='ongoing'."""
        self.client.force_authenticate(user=self.owner)
        # Mark appointment as ongoing
        self.appointment.patient_status = "ongoing"
        self.appointment.save()

        # Create another non-ongoing appointment
        other_apt = Appointment.objects.create(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=date.today(),
            time=time(14, 0),
            status="confirmed",
            patient_status="pending",
        )

        # Fetch all appointments and filter manually (as frontend does)
        response = self.client.get("/api/appointments/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data if isinstance(response.data, list) else response.data.get('results', [])
        ongoing = [apt for apt in data if apt.get('patient_status') == 'ongoing']
        self.assertEqual(len(ongoing), 1)
        self.assertEqual(ongoing[0]['id'], self.appointment.id)

    def test_patient_status_choices_include_ongoing(self):
        """Test that the PATIENT_STATUS_CHOICES includes 'ongoing'."""
        choices = dict(Appointment.PATIENT_STATUS_CHOICES)
        self.assertIn('ongoing', choices)
        self.assertEqual(choices['ongoing'], 'Ongoing')

    def test_staff_can_mark_ongoing(self):
        """Test that staff user can mark appointment as ongoing."""
        self.client.force_authenticate(user=self.dentist)
        response = self.client.patch(
            f"/api/appointments/{self.appointment.id}/",
            {"patient_status": "ongoing", "status": "confirmed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.patient_status, "ongoing")


class DentistAvailabilityAuthTests(TestCase):
    """Tests for dentist availability API authentication."""

    def setUp(self):
        """Set up test data."""
        self.clinic = ClinicLocation.objects.create(
            name="Test Clinic",
            address="123 Test St",
            phone="09171234567",
        )

        self.owner = User.objects.create_user(
            username="owner_avail_test",
            email="owner_avail@test.com",
            password="testpass123",
            user_type="owner",
            first_name="Test",
            last_name="Owner",
        )

        self.dentist = User.objects.create_user(
            username="dentist_avail_test",
            email="dentist_avail@test.com",
            password="testpass123",
            user_type="staff",
            role="dentist",
            first_name="Test",
            last_name="Dentist",
        )

        self.client = APIClient()

    def test_unauthenticated_returns_401(self):
        """Test that unauthenticated request returns 401."""
        response = self.client.get("/api/dentist-availability/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_owner_can_access_availability(self):
        """Test that authenticated owner can access availability."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(
            f"/api/dentist-availability/?dentist_id={self.owner.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dentist_can_access_own_availability(self):
        """Test that authenticated dentist can access own availability."""
        self.client.force_authenticate(user=self.dentist)
        response = self.client.get(
            f"/api/dentist-availability/?dentist_id={self.dentist.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_bulk_create_availability(self):
        """Test bulk creating availability dates."""
        self.client.force_authenticate(user=self.owner)
        tomorrow = date.today() + timedelta(days=1)
        day_after = date.today() + timedelta(days=2)

        response = self.client.post(
            "/api/dentist-availability/bulk_create/",
            {
                "dentist_id": self.owner.id,
                "apply_to_all_clinics": True,
                "dates": [
                    {
                        "date": str(tomorrow),
                        "start_time": "09:00:00",
                        "end_time": "17:00:00",
                        "is_available": True,
                    },
                    {
                        "date": str(day_after),
                        "start_time": "09:00:00",
                        "end_time": "17:00:00",
                        "is_available": True,
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data), 2)

    def test_bulk_delete_availability(self):
        """Test bulk deleting availability dates."""
        self.client.force_authenticate(user=self.owner)
        tomorrow = date.today() + timedelta(days=1)

        # First create
        DentistAvailability.objects.create(
            dentist=self.owner,
            date=tomorrow,
            start_time=time(9, 0),
            end_time=time(17, 0),
            is_available=True,
            apply_to_all_clinics=True,
        )

        # Then delete
        response = self.client.post(
            "/api/dentist-availability/bulk_delete/",
            {
                "dentist_id": self.owner.id,
                "dates": [str(tomorrow)],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            DentistAvailability.objects.filter(
                dentist=self.owner, date=tomorrow
            ).exists()
        )

    def test_token_auth_with_drf_token(self):
        """Test that DRF Token authentication works."""
        from rest_framework.authtoken.models import Token

        token, _ = Token.objects.get_or_create(user=self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        response = self.client.get(
            f"/api/dentist-availability/?dentist_id={self.owner.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_calendar_date_click_creates_availability(self):
        """Test simulating calendar date click -> save availability flow."""
        self.client.force_authenticate(user=self.owner)
        target_date = date.today() + timedelta(days=5)

        # Simulate what the calendar component does when clicking a date
        response = self.client.post(
            "/api/dentist-availability/bulk_create/",
            {
                "dentist_id": self.owner.id,
                "apply_to_all_clinics": True,
                "dates": [
                    {
                        "date": str(target_date),
                        "start_time": "09:00:00",
                        "end_time": "17:00:00",
                        "is_available": True,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify it was created
        avail = DentistAvailability.objects.filter(
            dentist=self.owner, date=target_date
        )
        self.assertTrue(avail.exists())
        self.assertEqual(avail.first().start_time, time(9, 0))


class ServiceUpdateM2MTests(TestCase):
    """Tests for service update with M2M clinic fields (AuditContextMixin fix)."""

    def setUp(self):
        """Set up test data."""
        self.clinic1 = ClinicLocation.objects.create(
            name="Clinic A",
            address="123 Main St",
            phone="09171111111",
        )
        self.clinic2 = ClinicLocation.objects.create(
            name="Clinic B",
            address="456 Side St",
            phone="09172222222",
        )

        self.owner = User.objects.create_user(
            username="owner_svc_test",
            email="owner_svc@test.com",
            password="testpass123",
            user_type="owner",
            first_name="Test",
            last_name="Owner",
        )

        self.service = Service.objects.create(
            name="Dental Cleaning",
            category="preventive",
            description="Professional teeth cleaning",
            duration=30,
            color="#10b981",
        )
        self.service.clinics.add(self.clinic1)

        self.client = APIClient()

    def test_update_service_name_only(self):
        """Test updating just the service name works."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            f"/api/services/{self.service.id}/",
            {"name": "Deep Cleaning"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.service.refresh_from_db()
        self.assertEqual(self.service.name, "Deep Cleaning")

    def test_update_service_with_clinic_ids(self):
        """Test updating service with clinic_ids (M2M field) works."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            f"/api/services/{self.service.id}/",
            {"clinic_ids": [self.clinic1.id, self.clinic2.id]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.service.refresh_from_db()
        clinic_ids = set(self.service.clinics.values_list("id", flat=True))
        self.assertEqual(clinic_ids, {self.clinic1.id, self.clinic2.id})

    def test_update_service_with_formdata(self):
        """Test updating service with FormData (as frontend sends)."""
        self.client.force_authenticate(user=self.owner)
        # Simulate form data update (how frontend sends it)
        response = self.client.patch(
            f"/api/services/{self.service.id}/",
            {
                "name": "Updated Cleaning",
                "description": "Updated description",
                "duration": 45,
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.service.refresh_from_db()
        self.assertEqual(self.service.name, "Updated Cleaning")
        self.assertEqual(self.service.duration, 45)

    def test_update_service_with_m2m_and_regular_fields(self):
        """Test updating both M2M and regular fields simultaneously."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            f"/api/services/{self.service.id}/",
            {
                "name": "Combined Update",
                "duration": 60,
                "clinic_ids": [self.clinic2.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.service.refresh_from_db()
        self.assertEqual(self.service.name, "Combined Update")
        self.assertEqual(self.service.duration, 60)
        clinic_ids = list(self.service.clinics.values_list("id", flat=True))
        self.assertEqual(clinic_ids, [self.clinic2.id])

    def test_update_service_preserves_existing_m2m_when_not_sent(self):
        """Test that not sending clinic_ids preserves existing clinics."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            f"/api/services/{self.service.id}/",
            {"name": "Name Only Update"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.service.refresh_from_db()
        self.assertEqual(self.service.name, "Name Only Update")
        # Clinics should still be clinic1
        clinic_ids = list(self.service.clinics.values_list("id", flat=True))
        self.assertEqual(clinic_ids, [self.clinic1.id])

    def test_unauthenticated_update_still_works(self):
        """Test that service update works even without authentication (AllowAny)."""
        # ServiceViewSet has AllowAny permissions
        response = self.client.patch(
            f"/api/services/{self.service.id}/",
            {"name": "Anon Update"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.service.refresh_from_db()
        self.assertEqual(self.service.name, "Anon Update")


if __name__ == "__main__":
    import unittest

    # Run tests
    print("=" * 70)
    print("RUNNING TESTS: Ongoing Status, Availability Auth, Service Update M2M")
    print("=" * 70)
    
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    suite.addTests(loader.loadTestsFromTestCase(OngoingAppointmentStatusTests))
    suite.addTests(loader.loadTestsFromTestCase(DentistAvailabilityAuthTests))
    suite.addTests(loader.loadTestsFromTestCase(ServiceUpdateM2MTests))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n" + "=" * 70)
    if result.wasSuccessful():
        print("ALL TESTS PASSED!")
    else:
        print(f"FAILURES: {len(result.failures)}, ERRORS: {len(result.errors)}")
    print("=" * 70)
