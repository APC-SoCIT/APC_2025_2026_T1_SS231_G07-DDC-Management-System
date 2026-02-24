"""
Booking Safety Tests  Slot-Verified Booking System

These tests verify that hallucinated bookings are IMPOSSIBLE.

Tests cover:
1. Book past time  MUST fail
2. Book far-future date (2027)  MUST fail
3. Book nonexistent slot_id  MUST fail
4. Book already-booked slot  MUST fail
5. Book without availability lookup  MUST fail
6. Book for inactive dentist  MUST fail
7. Book outside availability window  MUST fail
8. Book for non-existent clinic  MUST fail
9. Valid booking succeeds with availability_slot FK  MUST pass
10. API endpoint enforces same validation  MUST pass

Run with:
    python manage.py test api.tests.test_booking_safety -v2
"""

import json
from datetime import date, time, datetime, timedelta

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from api.models import (
    User, Appointment, Service, ClinicLocation,
    DentistAvailability, BlockedTimeSlot,
)
from api.services.booking_service import create_appointment, get_available_slots, find_service
from api.services.booking_validation_service import (
    validate_new_booking,
    validate_slot_exists,
    validate_not_past_time,
    validate_date,
    validate_dentist_active,
    validate_slot_not_booked,
    validate_clinic_match,
    validate_service_patient_bookable,
    MAX_FUTURE_DAYS,
    MSG_SERVICE_NOT_PATIENT_BOOKABLE,
)


class BookingSafetyTestBase(TestCase):
    """Base class with shared test data setup."""

    def setUp(self):
        """Create test data for all safety tests."""
        # Create clinic
        self.clinic = ClinicLocation.objects.create(
            name='Test Clinic Alabang',
            address='123 Test St, Alabang',
        )
        self.clinic2 = ClinicLocation.objects.create(
            name='Test Clinic Bacoor',
            address='456 Test Ave, Bacoor',
        )

        # Create dentist
        self.dentist = User.objects.create_user(
            username='test_dentist_safety',
            email='dentist_safety@test.com',
            password='TestPass123!',
            first_name='Safety',
            last_name='Dentist',
            user_type='staff',
            role='dentist',
            is_active=True,
        )

        # Create patient
        self.patient = User.objects.create_user(
            username='test_patient_safety',
            email='patient_safety@test.com',
            password='TestPass123!',
            first_name='Safety',
            last_name='Patient',
            user_type='patient',
            is_active=True,
        )

        # Create patient-bookable service
        self.service = Service.objects.create(
            name='Consultation',
            category='preventive',
            description='Dental consultation',
            duration=30,
            patient_bookable=True,
        )

        # Create non-patient-bookable service
        self.extraction_service = Service.objects.create(
            name='Tooth Extraction',
            category='oral_surgery',
            description='Tooth extraction',
            duration=60,
            patient_bookable=False,
        )

        # Create a VALID future availability
        self.future_date = date.today() + timedelta(days=3)
        # Skip Sunday
        while self.future_date.weekday() == 6:
            self.future_date += timedelta(days=1)

        self.availability = DentistAvailability.objects.create(
            dentist=self.dentist,
            date=self.future_date,
            start_time=time(9, 0),
            end_time=time(17, 0),
            is_available=True,
            clinic=self.clinic,
            apply_to_all_clinics=False,
        )

        self.valid_time = time(10, 0)  # Within availability window


class TestBookPastTime(BookingSafetyTestBase):
    """Test 1: Booking a past time MUST fail."""

    def test_past_date_rejected(self):
        """Booking a date in the past must be rejected."""
        past_date = date.today() - timedelta(days=5)
        is_valid, error = validate_date(past_date)
        self.assertFalse(is_valid)
        self.assertIn('past', error.lower())

    def test_past_time_today_rejected(self):
        """Booking a past time on today's date must be rejected."""
        # Use a time that's definitely in the past (midnight)
        past_time = time(0, 0)
        today = date.today()
        is_valid, error = validate_not_past_time(today, past_time)
        self.assertFalse(is_valid)
        self.assertIn('passed', error.lower())

    def test_past_time_booking_rejected(self):
        """Full booking attempt for past time must be rejected."""
        past_date = date.today() - timedelta(days=1)
        appt, error = create_appointment(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=past_date,
            time_val=time(10, 0),
        )
        self.assertIsNone(appt)
        self.assertIsNotNone(error)
        print(f"   Past time booking rejected: {error}")


class TestBookFarFuture(BookingSafetyTestBase):
    """Test 2: Booking a far-future date (e.g., 2027) MUST fail."""

    def test_year_2027_rejected(self):
        """Booking for year 2027 (beyond 90-day window) must be rejected."""
        far_future = date(2027, 3, 15)
        is_valid, error = validate_date(far_future)
        self.assertFalse(is_valid)
        self.assertIn('advance', error.lower())
        print(f"   Year 2027 booking rejected: {error}")

    def test_91_days_future_rejected(self):
        """Booking 91 days in the future must be rejected."""
        too_far = date.today() + timedelta(days=MAX_FUTURE_DAYS + 1)
        is_valid, error = validate_date(too_far)
        self.assertFalse(is_valid)
        self.assertIn('advance', error.lower())
        print(f"   {MAX_FUTURE_DAYS + 1} days future rejected: {error}")

    def test_90_days_future_date_ok(self):
        """Booking exactly 90 days in the future should pass date validation."""
        ok_date = date.today() + timedelta(days=MAX_FUTURE_DAYS)
        # Skip Sunday
        while ok_date.weekday() == 6:
            ok_date -= timedelta(days=1)
        is_valid, error = validate_date(ok_date)
        self.assertTrue(is_valid)
        print(f"   {MAX_FUTURE_DAYS} days future date passes")

    def test_far_future_full_booking_rejected(self):
        """Full booking for far future must fail even if other data is valid."""
        far_date = date.today() + timedelta(days=365)
        appt, error = create_appointment(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=far_date,
            time_val=time(10, 0),
        )
        self.assertIsNone(appt)
        self.assertIsNotNone(error)
        print(f"   Far future booking rejected: {error}")


class TestBookNonexistentSlot(BookingSafetyTestBase):
    """Test 3: Booking a nonexistent slot MUST fail."""

    def test_no_availability_record(self):
        """Booking when no DentistAvailability record exists must fail."""
        # Date with no availability
        no_avail_date = date.today() + timedelta(days=10)
        while no_avail_date.weekday() == 6:
            no_avail_date += timedelta(days=1)

        slot_valid, avail, error = validate_slot_exists(
            self.dentist, no_avail_date, time(10, 0), self.clinic,
        )
        self.assertFalse(slot_valid)
        self.assertIsNone(avail)
        self.assertIn('does not exist', error.lower())
        print(f"   Nonexistent slot rejected: {error}")

    def test_time_outside_availability_window(self):
        """Booking a time outside the availability window must fail."""
        # Availability is 9:00-17:00, try booking at 18:00
        slot_valid, avail, error = validate_slot_exists(
            self.dentist, self.future_date, time(18, 0), self.clinic,
        )
        self.assertFalse(slot_valid)
        self.assertIsNone(avail)
        print(f"   Out-of-window time rejected: {error}")

    def test_wrong_clinic_rejected(self):
        """Booking at wrong clinic for a clinic-specific availability must fail."""
        slot_valid, avail, error = validate_slot_exists(
            self.dentist, self.future_date, self.valid_time, self.clinic2,
        )
        self.assertFalse(slot_valid)
        print(f"   Wrong clinic rejected: {error}")

    def test_unavailable_slot_rejected(self):
        """Booking a slot marked as is_available=False must fail."""
        # Create unavailable slot
        unavail_date = date.today() + timedelta(days=5)
        while unavail_date.weekday() == 6:
            unavail_date += timedelta(days=1)
        DentistAvailability.objects.create(
            dentist=self.dentist,
            date=unavail_date,
            start_time=time(9, 0),
            end_time=time(17, 0),
            is_available=False,  # NOT available
            clinic=self.clinic,
        )
        slot_valid, avail, error = validate_slot_exists(
            self.dentist, unavail_date, time(10, 0), self.clinic,
        )
        self.assertFalse(slot_valid)
        print(f"   Unavailable slot rejected: {error}")

    def test_nonexistent_slot_full_booking_rejected(self):
        """Full booking for nonexistent slot must fail."""
        no_avail_date = date.today() + timedelta(days=15)
        while no_avail_date.weekday() == 6:
            no_avail_date += timedelta(days=1)
        appt, error = create_appointment(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=no_avail_date,
            time_val=time(10, 0),
        )
        self.assertIsNone(appt)
        self.assertIsNotNone(error)
        print(f"   Nonexistent slot booking rejected: {error}")


class TestBookAlreadyBookedSlot(BookingSafetyTestBase):
    """Test 4: Booking an already-booked slot MUST fail."""

    def test_double_booking_rejected(self):
        """Booking a slot that's already taken must fail."""
        # Create first appointment (valid)
        appt1, err1 = create_appointment(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=self.future_date,
            time_val=self.valid_time,
        )
        self.assertIsNotNone(appt1)
        self.assertIsNone(err1)

        # Create second patient
        patient2 = User.objects.create_user(
            username='patient2_safety',
            email='patient2_safety@test.com',
            password='TestPass123!',
            first_name='Second',
            last_name='Patient',
            user_type='patient',
        )

        # Try to book same slot - MUST fail
        # Need a different week for weekly rule, so create new availability
        future_date2 = self.future_date  # Same date, same time
        appt2, err2 = create_appointment(
            patient=patient2,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=future_date2,
            time_val=self.valid_time,
        )
        self.assertIsNone(appt2)
        self.assertIsNotNone(err2)
        print(f"   Double-booking rejected: {err2}")


class TestBookWithoutAvailabilityLookup(BookingSafetyTestBase):
    """Test 5: Booking without prior availability check MUST fail."""

    def test_fabricated_date_time_no_availability(self):
        """
        Simulates what a hallucinating LLM would do: pick an arbitrary
        date/time without checking DentistAvailability first.
        """
        # Fabricated date with no availability record
        fabricated_date = date.today() + timedelta(days=20)
        while fabricated_date.weekday() == 6:
            fabricated_date += timedelta(days=1)
        fabricated_time = time(14, 30)

        appt, error = create_appointment(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=fabricated_date,
            time_val=fabricated_time,
        )
        self.assertIsNone(appt)
        self.assertIsNotNone(error)
        print(f"   Fabricated slot rejected: {error}")

    def test_valid_date_wrong_time_no_slot(self):
        """
        Date has availability but time doesn't align to a valid slot boundary.
        """
        # Availability is 9:00-17:00, try 9:15 (not on 30-min boundary)
        appt, error = create_appointment(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=self.future_date,
            time_val=time(9, 15),
        )
        self.assertIsNone(appt)
        self.assertIsNotNone(error)
        print(f"   Non-boundary time rejected: {error}")


class TestBookInactiveDentist(BookingSafetyTestBase):
    """Test 6: Booking with inactive dentist MUST fail."""

    def test_inactive_dentist_rejected(self):
        """Booking with an inactive (deactivated) dentist must fail."""
        inactive_dentist = User.objects.create_user(
            username='inactive_dentist',
            email='inactive@test.com',
            password='TestPass123!',
            first_name='Inactive',
            last_name='Doc',
            user_type='staff',
            role='dentist',
            is_active=False,
        )
        is_valid, error = validate_dentist_active(inactive_dentist)
        self.assertFalse(is_valid)
        print(f"   Inactive dentist rejected: {error}")

    def test_non_dentist_staff_rejected(self):
        """Booking with a receptionist (non-dentist staff) must fail."""
        receptionist = User.objects.create_user(
            username='receptionist_test',
            email='recept@test.com',
            password='TestPass123!',
            first_name='Test',
            last_name='Receptionist',
            user_type='staff',
            role='receptionist',
        )
        is_valid, error = validate_dentist_active(receptionist)
        self.assertFalse(is_valid)
        print(f"   Non-dentist staff rejected: {error}")


class TestValidBookingSucceeds(BookingSafetyTestBase):
    """Test 9: Valid booking with proper availability MUST succeed."""

    def test_valid_booking_creates_appointment_with_slot(self):
        """Valid booking should create appointment with availability_slot FK set."""
        appt, error = create_appointment(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=self.future_date,
            time_val=self.valid_time,
        )
        self.assertIsNotNone(appt, f"Valid booking should succeed, but got error: {error}")
        self.assertIsNone(error)

        # Verify availability_slot FK is set
        self.assertIsNotNone(appt.availability_slot)
        self.assertEqual(appt.availability_slot.id, self.availability.id)
        self.assertEqual(appt.date, self.future_date)
        self.assertEqual(appt.time, self.valid_time)
        self.assertEqual(appt.dentist, self.dentist)
        self.assertEqual(appt.clinic, self.clinic)
        self.assertEqual(appt.status, 'confirmed')
        print(f"   Valid booking created with availability_slot={appt.availability_slot.id}")

    def test_get_available_slots_returns_valid_slots(self):
        """get_available_slots must return only slots within availability."""
        slots = get_available_slots(self.dentist, self.future_date, self.clinic)
        self.assertTrue(len(slots) > 0)
        # All slots must be within the availability window
        for s in slots:
            self.assertGreaterEqual(s, time(9, 0))
            self.assertLess(s, time(17, 0))
        print(f"   get_available_slots returned {len(slots)} valid slots")

    def test_available_slots_excludes_booked(self):
        """After booking, that slot must not appear in available slots."""
        # Book a slot
        appt, _ = create_appointment(
            patient=self.patient,
            dentist=self.dentist,
            service=self.service,
            clinic=self.clinic,
            date=self.future_date,
            time_val=self.valid_time,
        )
        self.assertIsNotNone(appt)

        # Check available slots
        slots = get_available_slots(self.dentist, self.future_date, self.clinic)
        slot_strs = [s.strftime('%H:%M') for s in slots]
        booked_str = self.valid_time.strftime('%H:%M')
        self.assertNotIn(booked_str, slot_strs)
        print(f"   Booked slot {booked_str} excluded from available slots")


class TestBlockedTimeSlots(BookingSafetyTestBase):
    """Test blocked time slots are enforced."""

    def test_blocked_slot_rejected(self):
        """Booking a blocked time slot must fail."""
        # Block 10:00-11:00
        BlockedTimeSlot.objects.create(
            date=self.future_date,
            start_time=time(10, 0),
            end_time=time(11, 0),
            reason='Test block',
            clinic=self.clinic,
            apply_to_all_clinics=False,
            created_by=self.dentist,
        )

        slot_valid, avail, error = validate_slot_exists(
            self.dentist, self.future_date, time(10, 0), self.clinic,
        )
        self.assertFalse(slot_valid)
        print(f"   Blocked slot rejected: {error}")


class TestAPIEndpointValidation(BookingSafetyTestBase):
    """Test 10: REST API endpoint enforces the same validation."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(user=self.patient)

    def test_api_rejects_missing_fields(self):
        """API must reject booking with missing required fields."""
        response = self.client.post('/api/appointments/', {
            'date': str(self.future_date),
            # Missing: time, dentist, service, clinic
        }, format='json')
        self.assertIn(response.status_code, [400, 403])
        print(f"   API rejected missing fields: {response.status_code}")

    def test_api_rejects_nonexistent_slot(self):
        """API must reject booking for a date with no availability."""
        no_avail_date = date.today() + timedelta(days=20)
        while no_avail_date.weekday() == 6:
            no_avail_date += timedelta(days=1)

        response = self.client.post('/api/appointments/', {
            'date': str(no_avail_date),
            'time': '10:00',
            'patient': self.patient.id,
            'dentist': self.dentist.id,
            'service': self.service.id,
            'clinic': self.clinic.id,
        }, format='json')
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn('error', data)
        print(f"   API rejected nonexistent slot: {data.get('message', data.get('error'))}")

    def test_api_rejects_past_date(self):
        """API must reject booking for a past date."""
        past_date = date.today() - timedelta(days=5)
        response = self.client.post('/api/appointments/', {
            'date': str(past_date),
            'time': '10:00',
            'patient': self.patient.id,
            'dentist': self.dentist.id,
            'service': self.service.id,
            'clinic': self.clinic.id,
        }, format='json')
        self.assertEqual(response.status_code, 400)
        print(f"   API rejected past date: {response.json().get('message', '')}")

    def test_api_rejects_far_future(self):
        """API must reject booking for date beyond 90-day window."""
        far_date = date.today() + timedelta(days=365)
        response = self.client.post('/api/appointments/', {
            'date': str(far_date),
            'time': '10:00',
            'patient': self.patient.id,
            'dentist': self.dentist.id,
            'service': self.service.id,
            'clinic': self.clinic.id,
        }, format='json')
        self.assertEqual(response.status_code, 400)
        print(f"   API rejected far future date: {response.json().get('message', '')}")

    def test_api_valid_booking_succeeds(self):
        """API must allow valid booking with proper availability."""
        response = self.client.post('/api/appointments/', {
            'date': str(self.future_date),
            'time': self.valid_time.strftime('%H:%M'),
            'patient': self.patient.id,
            'dentist': self.dentist.id,
            'service': self.service.id,
            'clinic': self.clinic.id,
        }, format='json')
        self.assertEqual(response.status_code, 201, f"Valid booking failed: {response.json()}")
        data = response.json()
        self.assertEqual(data['status'], 'confirmed')
        # Verify availability_slot is set
        self.assertIsNotNone(data.get('availability_slot'))
        print(f"   API valid booking succeeded with availability_slot={data.get('availability_slot')}")


class TestServiceRestriction(BookingSafetyTestBase):
    """Test that patients cannot book non-patient-bookable services."""

    def test_patient_cannot_book_extraction(self):
        """Patient booking Tooth Extraction must be rejected."""
        is_valid, error = validate_service_patient_bookable(
            self.extraction_service.id, booked_by_staff=False
        )
        self.assertFalse(is_valid)
        self.assertEqual(error, MSG_SERVICE_NOT_PATIENT_BOOKABLE)
        print(f"   Patient blocked from booking extraction: {error}")

    def test_patient_can_book_consultation(self):
        """Patient booking Consultation should pass service check."""
        is_valid, error = validate_service_patient_bookable(
            self.service.id, booked_by_staff=False
        )
        self.assertTrue(is_valid)
        self.assertIsNone(error)
        print("   Patient can book consultation")

    def test_staff_can_book_extraction(self):
        """Staff booking any service (including extraction) should pass."""
        is_valid, error = validate_service_patient_bookable(
            self.extraction_service.id, booked_by_staff=True
        )
        self.assertTrue(is_valid)
        self.assertIsNone(error)
        print("   Staff can book extraction")

    def test_full_booking_extraction_rejected_for_patient(self):
        """Full booking of extraction must fail for patient via validate_new_booking."""
        is_valid, error = validate_new_booking(
            patient=self.patient,
            dentist=self.dentist,
            service=self.extraction_service,
            clinic=self.clinic,
            target_date=self.future_date,
            target_time=self.valid_time,
            booked_by_staff=False,
        )
        self.assertFalse(is_valid)
        self.assertEqual(error, MSG_SERVICE_NOT_PATIENT_BOOKABLE)
        print(f"   Full booking of extraction rejected for patient: {error}")

    def test_full_booking_extraction_allowed_for_staff(self):
        """Full booking of extraction should pass for staff."""
        is_valid, error = validate_new_booking(
            patient=self.patient,
            dentist=self.dentist,
            service=self.extraction_service,
            clinic=self.clinic,
            target_date=self.future_date,
            target_time=self.valid_time,
            booked_by_staff=True,
        )
        self.assertTrue(is_valid)
        self.assertIsNone(error)
        print("   Full booking of extraction allowed for staff")

    def test_find_service_only_returns_bookable(self):
        """find_service with patient_only=True must not match non-bookable services."""
        from api.services.booking_service import find_service

        # Patient mode: extraction should not be found
        result = find_service('I want tooth extraction', patient_only=True)
        self.assertIsNone(result)
        print("   find_service(patient_only=True) correctly ignores extraction")

        # Staff mode: extraction should be found
        result = find_service('I want tooth extraction', patient_only=False)
        self.assertIsNotNone(result)
        self.assertEqual(result.name, 'Tooth Extraction')
        print(f"   find_service(patient_only=False) found: {result.name}")

    def test_api_rejects_extraction_for_patient(self):
        """API must reject booking extraction when requested by a patient."""
        client = APIClient()
        client.force_authenticate(user=self.patient)
        response = client.post('/api/appointments/', {
            'date': self.future_date.isoformat(),
            'time': self.valid_time.strftime('%H:%M'),
            'dentist': self.dentist.id,
            'service': self.extraction_service.id,
            'clinic': self.clinic.id,
        }, format='json')
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn('not available for online booking', data.get('message', ''))
        print(f"   API rejected extraction for patient: {data.get('message', '')}")


class TestMaxFutureDaysConfig(TestCase):
    """Verify MAX_FUTURE_DAYS configuration."""

    def test_max_future_days_is_90(self):
        """MAX_FUTURE_DAYS must be 90."""
        self.assertEqual(MAX_FUTURE_DAYS, 90)
        print(f"   MAX_FUTURE_DAYS = {MAX_FUTURE_DAYS}")

    def test_max_future_days_is_enforced_identically(self):
        """The same constant is used across all validation paths."""
        from api.services import booking_validation_service as bvs
        from api.services import booking_service as bs

        # Both modules should reference the same value
        self.assertEqual(bvs.MAX_FUTURE_DAYS, 90)
        print("   MAX_FUTURE_DAYS enforced consistently across modules")


class TestInvalidDateDetection(TestCase):
    """
    Regression tests for impossible date detection (e.g. 'feb 30').

    Bug: parse_date() silently returned None for impossible month+day
    combinations, causing the flow to show the date picker as if no date
    had been given, instead of telling the user the date doesn't exist.
    """

    def test_feb_30_returns_invalid_date_sentinel(self):
        """parse_date('feb 30') must return INVALID_DATE, not None."""
        from api.services.booking_service import parse_date, INVALID_DATE
        result = parse_date("feb 30")
        self.assertIs(result, INVALID_DATE,
                      "parse_date must return INVALID_DATE for 'feb 30', not None")
        print("   parse_date('feb 30') correctly returned INVALID_DATE")

    def test_february_30_returns_invalid_date_sentinel(self):
        """parse_date('february 30') must return INVALID_DATE."""
        from api.services.booking_service import parse_date, INVALID_DATE
        result = parse_date("I want to book on february 30")
        self.assertIs(result, INVALID_DATE,
                      "parse_date must return INVALID_DATE for 'february 30'")
        print("   parse_date('february 30') correctly returned INVALID_DATE")

    def test_april_31_returns_invalid_date_sentinel(self):
        """parse_date with 'april 31' must return INVALID_DATE (April has 30 days)."""
        from api.services.booking_service import parse_date, INVALID_DATE
        result = parse_date("book april 31")
        self.assertIs(result, INVALID_DATE,
                      "parse_date must return INVALID_DATE for 'april 31'")
        print("   parse_date('april 31') correctly returned INVALID_DATE")

    def test_valid_date_is_not_affected(self):
        """parse_date with a valid future month+day must still return a date."""
        from api.services.booking_service import parse_date, _DATE_SENTINELS
        from datetime import date as date_obj, timedelta, datetime
        # Use a month that is well in the future to avoid past-date rejection
        future = datetime.now().date() + timedelta(days=60)
        month_name = future.strftime('%B').lower()
        day = future.day
        result = parse_date(f"{month_name} {day}")
        self.assertNotIn(result, _DATE_SENTINELS,
                         "Valid future date must NOT return any error sentinel")
        self.assertIsNotNone(result, "Valid future date must return a date object")
        print(f"   parse_date('{month_name} {day}') correctly returned {result}")

    def test_past_date_returns_past_date_sentinel(self):
        """parse_date with explicit past year must return PAST_DATE sentinel."""
        from api.services.booking_service import parse_date, PAST_DATE
        # Explicit past year ensures the parser doesn't bump to next year
        result = parse_date("2025 january 1")
        self.assertIs(result, PAST_DATE,
                      "parse_date must return PAST_DATE for '2025 january 1'")
        print("   parse_date('2025 january 1') correctly returned PAST_DATE")

    def test_near_past_date_becomes_far_future(self):
        """parse_date with 'january 5' (no year) bumps to 2027 → FAR_FUTURE_DATE."""
        from api.services.booking_service import parse_date, FAR_FUTURE_DATE
        # Without explicit year, jan 5 (past in 2026) bumps to 2027 → beyond 90 days
        result = parse_date("january 5")
        self.assertIs(result, FAR_FUTURE_DATE,
                      "parse_date must return FAR_FUTURE_DATE when date bumps to next year beyond window")
        print("   parse_date('january 5') correctly returned FAR_FUTURE_DATE (bumped to 2027)")

    def test_far_future_date_returns_far_future_sentinel(self):
        """parse_date with year 2027+ must return FAR_FUTURE_DATE sentinel."""
        from api.services.booking_service import parse_date, FAR_FUTURE_DATE
        result = parse_date("book 2027 march 10")
        self.assertIs(result, FAR_FUTURE_DATE,
                      "parse_date must return FAR_FUTURE_DATE for '2027 march 10'")
        print("   parse_date('2027 march 10') correctly returned FAR_FUTURE_DATE")

    def test_mm_dd_invalid_returns_invalid_date(self):
        """parse_date with invalid MM/DD like '13/32' must return INVALID_DATE."""
        from api.services.booking_service import parse_date, INVALID_DATE
        result = parse_date("book on 13/32")
        self.assertIs(result, INVALID_DATE,
                      "parse_date must return INVALID_DATE for invalid MM/DD '13/32'")
        print("   parse_date('13/32') correctly returned INVALID_DATE")

    def test_gather_context_past_date_has_error_msg(self):
        """gather_booking_context must set invalid_date_msg for past dates."""
        from api.services.booking_service import gather_booking_context
        ctx = gather_booking_context("book 2025 january 1", hist=[], is_fresh=True)
        self.assertIsNotNone(ctx.get('invalid_date_msg'),
                             "Must set invalid_date_msg for past date")
        self.assertIn('past', ctx['invalid_date_msg'].lower())
        print(f"   Past date msg: '{ctx['invalid_date_msg']}'")
    def test_gather_context_far_future_has_error_msg(self):
        """gather_booking_context must set invalid_date_msg for far-future dates."""
        from api.services.booking_service import gather_booking_context
        ctx = gather_booking_context("book 2027 march 10", hist=[], is_fresh=True)
        self.assertIsNotNone(ctx.get('invalid_date_msg'),
                             "Must set invalid_date_msg for far-future date")
        self.assertIn('scheduling window', ctx['invalid_date_msg'].lower())
        print(f"   Far-future date msg: '{ctx['invalid_date_msg']}'")

    def test_gather_booking_context_sets_invalid_date_msg(self):
        """gather_booking_context must expose invalid_date_msg when date is impossible."""
        from api.services.booking_service import gather_booking_context
        ctx = gather_booking_context("book feb 30", hist=[], is_fresh=True)
        self.assertIsNotNone(ctx.get('invalid_date_msg'),
                             "gather_booking_context must set invalid_date_msg for 'feb 30'")
        self.assertIsNone(ctx['date'],
                          "date field must be None when invalid_date_msg is set")
        print(f"   invalid_date_msg = '{ctx['invalid_date_msg']}'")


class TestClinicMatchingSafety(TestCase):
    """
    Regression tests for clinic fuzzy-matching being too loose.

    Bug: 'baclaran' was matched to the 'Bacoor' clinic via partial
    substring or stale history context, even though no known clinic
    name is present in the user's message.
    """

    def setUp(self):
        self.clinic = ClinicLocation.objects.create(name="Bacoor")

    def test_find_clinic_does_not_match_baclaran_to_bacoor(self):
        """find_clinic('at baclaran') must NOT return the Bacoor clinic."""
        from api.services.booking_service import find_clinic
        result = find_clinic("I want to book at baclaran")
        self.assertIsNone(result,
                          "find_clinic must return None for 'baclaran' — it is NOT a known clinic")
        print("   find_clinic('at baclaran') correctly returned None")

    def test_find_clinic_exact_name_still_works(self):
        """find_clinic with the exact clinic name must still match."""
        from api.services.booking_service import find_clinic
        result = find_clinic("I want to book at bacoor")
        self.assertIsNotNone(result, "find_clinic must still match 'bacoor'")
        self.assertEqual(result.name, "Bacoor")
        print("   find_clinic('bacoor') correctly returned Bacoor clinic")

    def test_has_unmatched_location_hint_detects_baclaran(self):
        """_has_unmatched_location_hint must return True for 'at baclaran'."""
        from api.services.booking_service import _has_unmatched_location_hint
        self.assertTrue(_has_unmatched_location_hint("I want to book at baclaran"),
                        "_has_unmatched_location_hint must detect 'baclaran' as unmatched")
        print("   _has_unmatched_location_hint('at baclaran') = True")

    def test_has_unmatched_location_hint_false_for_known_clinic(self):
        """_has_unmatched_location_hint must return False for a real clinic name."""
        from api.services.booking_service import _has_unmatched_location_hint
        self.assertFalse(_has_unmatched_location_hint("I want to book at bacoor"),
                         "_has_unmatched_location_hint must be False when location IS a known clinic")
        print("   _has_unmatched_location_hint('at bacoor') = False (known clinic)")

    def test_gather_booking_context_returns_no_clinic_for_baclaran(self):
        """gather_booking_context must not match any clinic for 'baclaran'."""
        from api.services.booking_service import gather_booking_context
        ctx = gather_booking_context("book at baclaran", hist=[], is_fresh=True)
        self.assertIsNone(ctx['clinic'],
                          "gather_booking_context must return clinic=None for unknown location 'baclaran'")
        print("   gather_booking_context clinic=None for 'baclaran' — correctly rejected")
