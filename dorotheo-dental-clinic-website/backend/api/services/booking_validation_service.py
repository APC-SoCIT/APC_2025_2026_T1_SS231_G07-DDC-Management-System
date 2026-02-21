"""
Centralized Booking Validation Service
───────────────────────────────────────
Enforces ALL booking business rules in a single place.

Rules enforced:
  A — One confirmed booking per week per patient
  B — No booking while pending reschedule/cancellation exists
  C — Modification only for approved/confirmed appointments
  D — Input validation (date, time, dentist, service, clinic)
  E — Double-booking guards (dentist & patient)

All validation returns (is_valid: bool, error_message: str | None).
"""

import logging
from datetime import datetime, timedelta, time as time_obj, date as date_obj
from typing import Optional, Tuple

from django.db.models import Q

from api.models import (
    Appointment, User, Service, ClinicLocation,
    DentistAvailability,
)

logger = logging.getLogger('chatbot.validation')


# ── Response Messages ──────────────────────────────────────────────────────

MSG_ALREADY_BOOKED_THIS_WEEK = (
    "You already have a booking this week. "
    "Please reschedule or cancel your existing appointment if needed."
)

MSG_PENDING_REQUEST = (
    "Your previous request is still pending approval. "
    "Please wait for confirmation before making a new booking."
)

MSG_NOT_ELIGIBLE_FOR_MODIFICATION = (
    "This appointment is not eligible for modification at this time."
)

MSG_INVALID_DATE = "Please provide a valid future date."
MSG_INVALID_TIME = "Please provide a time within clinic working hours (8:00 AM - 6:00 PM, Mon-Fri; 9:00 AM - 3:00 PM, Sat)."
MSG_DENTIST_NOT_FOUND = "The specified dentist does not exist in our system."
MSG_SERVICE_NOT_FOUND = "The specified service does not exist in our system."
MSG_CLINIC_NOT_FOUND = "The specified clinic location does not exist in our system."
MSG_SLOT_TAKEN_DENTIST = "That time slot has already been booked for this dentist. Please pick a different time."
MSG_SLOT_TAKEN_PATIENT = "You already have an appointment at this date and time."
MSG_SUNDAY_CLOSED = "The clinic is closed on Sundays. Please choose another day."
MSG_PAST_DATE = "You cannot book an appointment in the past. Please select a future date."
MSG_PAST_TIME = "That time has already passed today. Please select a later time."


# ── Statuses that count as "active" (block double-booking) ─────────────────

ACTIVE_STATUSES = ['confirmed', 'pending']
PENDING_STATUSES = ['reschedule_requested', 'cancel_requested']
MODIFIABLE_STATUSES = ['confirmed']   # Only confirmed can be rescheduled/cancelled


# ══════════════════════════════════════════════════════════════════════════
# RULE A — One booking per week
# ══════════════════════════════════════════════════════════════════════════

def validate_one_booking_per_week(
    patient: User,
    target_date: date_obj,
    exclude_appointment_id: Optional[int] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Ensure patient has at most ONE active appointment in the same ISO week.

    Args:
        patient: The patient user.
        target_date: The date they want to book.
        exclude_appointment_id: Appointment to ignore (for reschedule).

    Returns:
        (True, None) if valid, (False, error_msg) if violation.
    """
    week_start = target_date - timedelta(days=target_date.weekday())
    week_end = week_start + timedelta(days=6)

    qs = Appointment.objects.filter(
        patient=patient,
        date__gte=week_start,
        date__lte=week_end,
        status__in=ACTIVE_STATUSES,
    )
    if exclude_appointment_id:
        qs = qs.exclude(id=exclude_appointment_id)

    if qs.exists():
        logger.warning(
            "Booking rejected: patient=%s already has appointment in week of %s",
            patient.id, target_date,
        )
        return False, MSG_ALREADY_BOOKED_THIS_WEEK

    return True, None


# ══════════════════════════════════════════════════════════════════════════
# RULE B — No booking while pending requests exist
# ══════════════════════════════════════════════════════════════════════════

def validate_no_pending_requests(patient: User) -> Tuple[bool, Optional[str]]:
    """
    Block booking/reschedule/cancel if patient has unresolved requests.

    Returns:
        (True, None) if clear, (False, error_msg) if blocked.
    """
    has_pending = Appointment.objects.filter(
        patient=patient,
        status__in=PENDING_STATUSES,
    ).exists()

    if has_pending:
        logger.warning(
            "Booking rejected: patient=%s has pending request",
            patient.id,
        )
        return False, MSG_PENDING_REQUEST

    return True, None


# ══════════════════════════════════════════════════════════════════════════
# RULE C — Modification eligibility
# ══════════════════════════════════════════════════════════════════════════

def validate_modification_eligible(appointment: Appointment) -> Tuple[bool, Optional[str]]:
    """
    Only confirmed appointments can be rescheduled or cancelled.

    Returns:
        (True, None) if eligible, (False, error_msg) if not.
    """
    if appointment.status not in MODIFIABLE_STATUSES:
        logger.warning(
            "Modification rejected: appointment=%d status=%s (not in %s)",
            appointment.id, appointment.status, MODIFIABLE_STATUSES,
        )
        return False, MSG_NOT_ELIGIBLE_FOR_MODIFICATION

    return True, None


# ══════════════════════════════════════════════════════════════════════════
# RULE D — Input validation
# ══════════════════════════════════════════════════════════════════════════

def validate_date(target_date: date_obj) -> Tuple[bool, Optional[str]]:
    """
    Validate that date is a valid future date and not a Sunday.
    """
    today = datetime.now().date()

    if target_date < today:
        return False, MSG_PAST_DATE

    if target_date.weekday() == 6:  # Sunday
        return False, MSG_SUNDAY_CLOSED

    return True, None


def validate_time(target_time: time_obj, target_date: date_obj) -> Tuple[bool, Optional[str]]:
    """
    Validate that time is within clinic working hours and not in the past.

    Working hours:
      Mon-Fri: 8:00 AM - 6:00 PM
      Sat:     9:00 AM - 3:00 PM
    """
    today = datetime.now().date()

    # Past time check (if booking for today)
    if target_date == today and target_time <= datetime.now().time():
        return False, MSG_PAST_TIME

    day_of_week = target_date.weekday()

    if day_of_week < 5:  # Mon-Fri
        open_time = time_obj(8, 0)
        close_time = time_obj(18, 0)
    elif day_of_week == 5:  # Saturday
        open_time = time_obj(9, 0)
        close_time = time_obj(15, 0)
    else:
        return False, MSG_SUNDAY_CLOSED

    if target_time < open_time or target_time >= close_time:
        return False, MSG_INVALID_TIME

    return True, None


def validate_dentist_exists(dentist_id: int) -> Tuple[bool, Optional[str]]:
    """Validate the dentist exists in the database."""
    exists = User.objects.filter(
        Q(id=dentist_id),
        Q(user_type='staff', role='dentist') | Q(user_type='owner'),
    ).exists()

    if not exists:
        return False, MSG_DENTIST_NOT_FOUND
    return True, None


def validate_service_exists(service_id: int) -> Tuple[bool, Optional[str]]:
    """Validate the service exists in the database."""
    if not Service.objects.filter(id=service_id).exists():
        return False, MSG_SERVICE_NOT_FOUND
    return True, None


def validate_clinic_exists(clinic_id: int) -> Tuple[bool, Optional[str]]:
    """Validate the clinic location exists in the database."""
    if not ClinicLocation.objects.filter(id=clinic_id).exists():
        return False, MSG_CLINIC_NOT_FOUND
    return True, None


# ══════════════════════════════════════════════════════════════════════════
# RULE E — Double-booking guards
# ══════════════════════════════════════════════════════════════════════════

def validate_no_dentist_conflict(
    dentist: User,
    target_date: date_obj,
    target_time: time_obj,
    exclude_appointment_id: Optional[int] = None,
) -> Tuple[bool, Optional[str]]:
    """Check that the dentist doesn't already have a booking at this slot."""
    qs = Appointment.objects.filter(
        dentist=dentist,
        date=target_date,
        time=target_time,
        status__in=ACTIVE_STATUSES,
    )
    if exclude_appointment_id:
        qs = qs.exclude(id=exclude_appointment_id)

    if qs.exists():
        return False, MSG_SLOT_TAKEN_DENTIST
    return True, None


def validate_no_patient_conflict(
    patient: User,
    target_date: date_obj,
    target_time: time_obj,
    exclude_appointment_id: Optional[int] = None,
) -> Tuple[bool, Optional[str]]:
    """Check that the patient doesn't already have a booking at this slot."""
    qs = Appointment.objects.filter(
        patient=patient,
        date=target_date,
        time=target_time,
        status__in=ACTIVE_STATUSES,
    )
    if exclude_appointment_id:
        qs = qs.exclude(id=exclude_appointment_id)

    if qs.exists():
        return False, MSG_SLOT_TAKEN_PATIENT
    return True, None


# ══════════════════════════════════════════════════════════════════════════
# COMPOSITE VALIDATORS (used before creating/modifying appointments)
# ══════════════════════════════════════════════════════════════════════════

def validate_new_booking(
    patient: User,
    dentist: User,
    service: Service,
    clinic: ClinicLocation,
    target_date: date_obj,
    target_time: time_obj,
) -> Tuple[bool, Optional[str]]:
    """
    Run ALL validations required before creating a new appointment.

    Returns:
        (True, None) if all checks pass,
        (False, first_error_message) on first failure.
    """
    checks = [
        lambda: validate_no_pending_requests(patient),
        lambda: validate_one_booking_per_week(patient, target_date),
        lambda: validate_date(target_date),
        lambda: validate_time(target_time, target_date),
        lambda: validate_dentist_exists(dentist.id),
        lambda: validate_service_exists(service.id),
        lambda: validate_clinic_exists(clinic.id),
        lambda: validate_no_dentist_conflict(dentist, target_date, target_time),
        lambda: validate_no_patient_conflict(patient, target_date, target_time),
    ]

    for check in checks:
        is_valid, error = check()
        if not is_valid:
            return False, error

    return True, None


def validate_reschedule(
    appointment: Appointment,
    new_date: date_obj,
    new_time: time_obj,
) -> Tuple[bool, Optional[str]]:
    """
    Run ALL validations required before submitting a reschedule request.

    Returns:
        (True, None) if all checks pass,
        (False, first_error_message) on first failure.
    """
    checks = [
        lambda: validate_modification_eligible(appointment),
        lambda: validate_no_pending_requests(appointment.patient),
        lambda: validate_date(new_date),
        lambda: validate_time(new_time, new_date),
        lambda: validate_no_dentist_conflict(
            appointment.dentist, new_date, new_time,
            exclude_appointment_id=appointment.id,
        ),
        lambda: validate_one_booking_per_week(
            appointment.patient, new_date,
            exclude_appointment_id=appointment.id,
        ),
    ]

    for check in checks:
        is_valid, error = check()
        if not is_valid:
            return False, error

    return True, None


def validate_cancellation(appointment: Appointment) -> Tuple[bool, Optional[str]]:
    """
    Run ALL validations required before submitting a cancel request.

    Returns:
        (True, None) if all checks pass,
        (False, first_error_message) on first failure.
    """
    checks = [
        lambda: validate_modification_eligible(appointment),
        lambda: validate_no_pending_requests(appointment.patient),
    ]

    for check in checks:
        is_valid, error = check()
        if not is_valid:
            return False, error

    return True, None
