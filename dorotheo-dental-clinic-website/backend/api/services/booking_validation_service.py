"""
Centralized Booking Validation Service
───────────────────────────────────────
Enforces ALL booking business rules in a single place.
SLOT-VERIFIED BOOKING — hallucinated appointments are technically impossible.

Rules enforced:
  A — One confirmed booking per week per patient
  B — No booking while pending reschedule/cancellation exists
  C — Modification only for approved/confirmed appointments
  D — Input validation (date, time, dentist, service, clinic)
  E — Double-booking guards (dentist & patient)
  F — SLOT EXISTENCE: time slot must exist in DentistAvailability (NEW)
  G — PAST TIME: slot start_time must be in the future (timezone-safe) (NEW)
  H — FUTURE WINDOW: date must be within MAX_FUTURE_DAYS (NEW)
  I — DENTIST ACTIVE: dentist must exist and be active (NEW)
  J — SLOT NOT BOOKED: slot must not already be booked (NEW)
  K — CLINIC MATCH: slot must belong to correct clinic (NEW)

All validation returns (is_valid: bool, error_message: str | None).
This logic runs IDENTICALLY in local, production, and staging.
NO environment flags may bypass it.
"""

import logging
from datetime import datetime, timedelta, time as time_obj, date as date_obj
from typing import Optional, Tuple

from django.db.models import Q
from django.utils import timezone

from api.models import (
    Appointment, User, Service, ClinicLocation,
    DentistAvailability,
)

logger = logging.getLogger('chatbot.validation')

# ── Configuration (applies to ALL environments) ───────────────────────────

MAX_FUTURE_DAYS = 90  # Cannot book more than 90 days in advance


# ── Response Messages ──────────────────────────────────────────────────────
# These are the defense-in-depth messages shown when the flow-level
# validation is bypassed somehow.  Keep them conversational.

MSG_ALREADY_BOOKED_THIS_WEEK = (
    "You already have a booking this week — we only allow one per week. "
    "You'd need to reschedule or cancel the existing one first."
)

MSG_PENDING_REQUEST = (
    "It looks like you still have a pending request waiting for approval. "
    "Let's wait for that to be confirmed before making any new changes."
)

MSG_NOT_ELIGIBLE_FOR_MODIFICATION = (
    "This appointment can't be modified right now."
)

MSG_INVALID_DATE = "That doesn't look like a valid date — could you try again with a future date?"
MSG_INVALID_TIME = (
    "That time falls outside our clinic hours. "
    "We're open 8 AM – 6 PM on weekdays and 9 AM – 3 PM on Saturdays."
)
MSG_DENTIST_NOT_FOUND = "We couldn't find that dentist in our system."
MSG_DENTIST_INACTIVE = "That dentist isn't currently active in our system."
MSG_SERVICE_NOT_FOUND = "We don't seem to have that service on file."
MSG_SERVICE_NOT_PATIENT_BOOKABLE = (
    "That service is offered at our clinic, but it can't be booked online. "
    "Online booking is only available for Cleaning and Consultation. "
    "For anything else, give us a call or drop by the clinic."
)
MSG_CLINIC_NOT_FOUND = "We don't have that clinic location in our system."
MSG_SLOT_TAKEN_DENTIST = "That time slot was just taken — would you like to pick a different time?"
MSG_SLOT_TAKEN_PATIENT = "You already have an appointment at that date and time."
MSG_SUNDAY_CLOSED = "We're closed on Sundays — how about another day?"
MSG_PAST_DATE = "That date is in the past — we can only book future appointments."
MSG_PAST_TIME = "That time has already passed for today. How about a later slot?"
MSG_SLOT_NOT_FOUND = (
    "That time slot doesn't seem to exist in the dentist's schedule. "
    "Could you pick one of the available slots instead?"
)
MSG_SLOT_ALREADY_BOOKED = (
    "Oops — someone just grabbed that slot! Could you pick a different time?"
)
MSG_FUTURE_LIMIT = (
    f"That's a bit too far out — we can only schedule up to "
    f"{MAX_FUTURE_DAYS} days ahead. How about something sooner?"
)
MSG_CLINIC_MISMATCH = (
    "That time slot belongs to a different clinic. "
    "Let's pick a slot from the right one."
)


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
    Validate that date is a valid future date, not a Sunday,
    and within the allowed future booking window.
    """
    today = datetime.now().date()

    if target_date < today:
        return False, MSG_PAST_DATE

    if target_date.weekday() == 6:  # Sunday
        return False, MSG_SUNDAY_CLOSED

    # RULE H: Future window constraint
    max_date = today + timedelta(days=MAX_FUTURE_DAYS)
    if target_date > max_date:
        return False, MSG_FUTURE_LIMIT

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


def validate_service_patient_bookable(service_id: int, booked_by_staff: bool = False) -> Tuple[bool, Optional[str]]:
    """
    Validate the service is bookable by patients.
    Staff/owners can book any service; patients can only book patient_bookable services.
    """
    if booked_by_staff:
        return True, None
    svc = Service.objects.filter(id=service_id).first()
    if not svc:
        return False, MSG_SERVICE_NOT_FOUND
    if not svc.patient_bookable:
        logger.warning(
            "SERVICE_REJECTED: service=%s (%s) is not patient-bookable",
            svc.id, svc.name,
        )
        return False, MSG_SERVICE_NOT_PATIENT_BOOKABLE
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
# RULE F — Slot existence verification (CRITICAL SAFETY)
# ══════════════════════════════════════════════════════════════════════════

def validate_slot_exists(
    dentist: User,
    target_date: date_obj,
    target_time: time_obj,
    clinic: ClinicLocation,
) -> Tuple[bool, Optional['DentistAvailability'], Optional[str]]:
    """
    Verify that the requested time slot actually exists in the
    DentistAvailability table. This is the PRIMARY defense against
    hallucinated bookings.

    Checks:
    1. A DentistAvailability record exists for this dentist+date+clinic
    2. The availability is marked is_available=True
    3. The requested time falls within the availability window
    4. The slot is not blocked

    Returns:
        (True, availability_record, None) if valid
        (False, None, error_message) if invalid
    """
    from api.models import BlockedTimeSlot

    # Find the availability record
    avail = DentistAvailability.objects.filter(
        dentist=dentist,
        date=target_date,
        is_available=True,
    ).filter(
        Q(clinic=clinic) | Q(apply_to_all_clinics=True)
    ).first()

    if not avail:
        logger.warning(
            "SLOT_REJECT: No availability found for dentist=%s date=%s clinic=%s",
            dentist.id, target_date, clinic.name,
        )
        return False, None, MSG_SLOT_NOT_FOUND

    # Verify the requested time falls within the availability window
    if target_time < avail.start_time or target_time >= avail.end_time:
        logger.warning(
            "SLOT_REJECT: Time %s outside availability window %s-%s for dentist=%s date=%s",
            target_time, avail.start_time, avail.end_time, dentist.id, target_date,
        )
        return False, None, MSG_SLOT_NOT_FOUND

    # Verify the time aligns to a valid 30-minute slot boundary
    from datetime import datetime as dt, timedelta as td
    slot_start = dt.combine(target_date, avail.start_time)
    requested = dt.combine(target_date, target_time)
    diff = (requested - slot_start).total_seconds()
    if diff < 0 or diff % (30 * 60) != 0:
        logger.warning(
            "SLOT_REJECT: Time %s not on 30-minute boundary from %s",
            target_time, avail.start_time,
        )
        return False, None, MSG_SLOT_NOT_FOUND

    # Check blocked time slots
    blocked = BlockedTimeSlot.objects.filter(
        date=target_date,
        start_time__lte=target_time,
        end_time__gt=target_time,
    ).filter(
        Q(clinic=clinic) | Q(apply_to_all_clinics=True)
    )
    if blocked.exists():
        logger.warning(
            "SLOT_REJECT: Time %s is blocked for date=%s clinic=%s",
            target_time, target_date, clinic.name,
        )
        return False, None, MSG_SLOT_NOT_FOUND

    return True, avail, None


# ══════════════════════════════════════════════════════════════════════════
# RULE G — Past time check (timezone-safe)
# ══════════════════════════════════════════════════════════════════════════

def validate_not_past_time(
    target_date: date_obj,
    target_time: time_obj,
) -> Tuple[bool, Optional[str]]:
    """
    Verify that the slot is in the future using Philippines local time.
    Uses timezone.localtime() so the comparison is always against local
    clinic time (Asia/Manila), not UTC. This prevents past-time slots
    from being booked when the server's UTC offset differs from PHP+8.
    """
    now_local = timezone.localtime(timezone.now())
    current_date = now_local.date()
    current_time = now_local.time()

    if target_date < current_date:
        return False, MSG_PAST_DATE

    if target_date == current_date and target_time <= current_time:
        logger.warning(
            "SLOT_REJECT: Past time %s on today's date %s (server time: %s)",
            target_time, target_date, current_time,
        )
        return False, MSG_PAST_TIME

    return True, None


# ══════════════════════════════════════════════════════════════════════════
# RULE I — Dentist active check
# ══════════════════════════════════════════════════════════════════════════

def validate_dentist_active(dentist: User) -> Tuple[bool, Optional[str]]:
    """
    Verify the dentist exists, is active, and has proper role.
    """
    if not dentist or not dentist.pk:
        return False, MSG_DENTIST_NOT_FOUND

    if not dentist.is_active:
        return False, MSG_DENTIST_INACTIVE

    if dentist.user_type == 'staff' and dentist.role != 'dentist':
        return False, MSG_DENTIST_INACTIVE

    if dentist.user_type not in ('staff', 'owner'):
        return False, MSG_DENTIST_INACTIVE

    return True, None


# ══════════════════════════════════════════════════════════════════════════
# RULE J — Slot not already booked
# ══════════════════════════════════════════════════════════════════════════

def validate_slot_not_booked(
    dentist: User,
    target_date: date_obj,
    target_time: time_obj,
    exclude_appointment_id: Optional[int] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Check that no other active appointment exists at this exact slot.
    """
    qs = Appointment.objects.filter(
        dentist=dentist,
        date=target_date,
        time=target_time,
        status__in=ACTIVE_STATUSES,
    )
    if exclude_appointment_id:
        qs = qs.exclude(id=exclude_appointment_id)

    if qs.exists():
        logger.warning(
            "SLOT_REJECT: Slot already booked for dentist=%s date=%s time=%s",
            dentist.id, target_date, target_time,
        )
        return False, MSG_SLOT_ALREADY_BOOKED

    return True, None


# ══════════════════════════════════════════════════════════════════════════
# RULE K — Clinic match verification
# ══════════════════════════════════════════════════════════════════════════

def validate_clinic_match(
    avail: 'DentistAvailability',
    clinic: ClinicLocation,
) -> Tuple[bool, Optional[str]]:
    """
    Verify the availability slot belongs to the correct clinic.
    """
    if avail.apply_to_all_clinics:
        return True, None

    if avail.clinic_id != clinic.id:
        logger.warning(
            "SLOT_REJECT: Availability clinic=%s does not match requested clinic=%s",
            avail.clinic_id, clinic.id,
        )
        return False, MSG_CLINIC_MISMATCH

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
    booked_by_staff: bool = False,
) -> Tuple[bool, Optional[str]]:
    """
    Run ALL validations required before creating a new appointment.
    Includes SLOT VERIFICATION — the primary defense against hallucinated bookings.
    Includes SERVICE RESTRICTION — patients can only book patient_bookable services.

    This function runs identically in local, production, and staging.
    No environment flags may bypass any check.

    Args:
        booked_by_staff: If True, skips patient_bookable check (staff can book anything).

    Returns:
        (True, None) if all checks pass,
        (False, first_error_message) on first failure.
    
    Side effect: stores validated availability_slot on success
    (accessible via validate_new_booking.last_validated_slot)
    """
    # Reset last validated slot
    validate_new_booking.last_validated_slot = None

    # Pre-flight checks (no DB slot lookups needed)
    preflight_checks = [
        lambda: validate_no_pending_requests(patient),
        lambda: validate_one_booking_per_week(patient, target_date),
        lambda: validate_date(target_date),
        lambda: validate_not_past_time(target_date, target_time),
        lambda: validate_time(target_time, target_date),
        lambda: validate_dentist_active(dentist),
        lambda: validate_service_exists(service.id),
        lambda: validate_service_patient_bookable(service.id, booked_by_staff),
        lambda: validate_clinic_exists(clinic.id),
    ]

    for check in preflight_checks:
        is_valid, error = check()
        if not is_valid:
            logger.warning(
                "BOOKING_REJECTED: patient=%s reason=%s",
                patient.id, error,
            )
            return False, error

    # CRITICAL: Slot existence verification (Rules F, J, K)
    slot_valid, avail_slot, slot_error = validate_slot_exists(
        dentist, target_date, target_time, clinic,
    )
    if not slot_valid:
        logger.warning(
            "BOOKING_REJECTED_SLOT: patient=%s dentist=%s date=%s time=%s clinic=%s reason=%s",
            patient.id, dentist.id, target_date, target_time, clinic.name, slot_error,
        )
        return False, slot_error

    # Verify clinic match (Rule K)
    is_valid, error = validate_clinic_match(avail_slot, clinic)
    if not is_valid:
        return False, error

    # Verify slot not already booked (Rule J)
    is_valid, error = validate_slot_not_booked(dentist, target_date, target_time)
    if not is_valid:
        return False, error

    # Double-booking guards (Rules E)
    double_book_checks = [
        lambda: validate_no_dentist_conflict(dentist, target_date, target_time),
        lambda: validate_no_patient_conflict(patient, target_date, target_time),
    ]

    for check in double_book_checks:
        is_valid, error = check()
        if not is_valid:
            return False, error

    # Store validated slot for caller to use
    validate_new_booking.last_validated_slot = avail_slot

    logger.info(
        "BOOKING_VALIDATED: patient=%s dentist=%s date=%s time=%s clinic=%s slot_id=%s",
        patient.id, dentist.id, target_date, target_time, clinic.name, avail_slot.id,
    )

    return True, None


# Initialize the attribute
validate_new_booking.last_validated_slot = None


def validate_reschedule(
    appointment: Appointment,
    new_date: date_obj,
    new_time: time_obj,
) -> Tuple[bool, Optional[str]]:
    """
    Run ALL validations required before submitting a reschedule request.
    Includes slot verification to prevent rescheduling to non-existent slots.

    Returns:
        (True, None) if all checks pass,
        (False, first_error_message) on first failure.
    """
    checks = [
        lambda: validate_modification_eligible(appointment),
        lambda: validate_no_pending_requests(appointment.patient),
        lambda: validate_date(new_date),
        lambda: validate_not_past_time(new_date, new_time),
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

    # Verify slot exists for reschedule target
    if appointment.dentist and appointment.clinic:
        slot_valid, _, slot_error = validate_slot_exists(
            appointment.dentist, new_date, new_time, appointment.clinic,
        )
        if not slot_valid:
            return False, slot_error

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
