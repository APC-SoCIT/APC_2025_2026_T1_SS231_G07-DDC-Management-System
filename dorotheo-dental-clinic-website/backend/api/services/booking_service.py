"""
Deterministic Booking Service
──────────────────────────────
Handles all appointment-related database operations.
Appointment booking does NOT depend on LLM reasoning.

Features:
- Slot-filling entity extraction (regex, date parsing, DB lookups)
- Partial booking session management
- Smart recommendations (dentist, dates, times)
- All availability from Supabase/DB queries — NO hallucination
- Django transaction.atomic() for booking confirmation
- Double-booking guards
- Once-a-week booking rule
"""

import re
import logging
from datetime import datetime, timedelta, time as time_obj, date as date_obj
from typing import Optional, List, Dict, Any, Tuple

from django.db import transaction
from django.db.models import Q

from api.models import (
    Service, Appointment, User, DentistAvailability,
    ClinicLocation, BlockedTimeSlot,
)
from .booking_validation_service import (
    validate_new_booking,
    validate_reschedule,
    validate_cancellation,
)
from .appointment_state_machine import (
    transition_appointment,
    can_reschedule,
    can_cancel,
)
from . import security_monitor as secmon

logger = logging.getLogger('chatbot.booking')


# ── Date/Time Parse Constants ──────────────────────────────────────────────

MONTHS = {
    'january': 1, 'jan': 1, 'february': 2, 'feb': 2, 'march': 3, 'mar': 3,
    'april': 4, 'apr': 4, 'may': 5, 'june': 6, 'jun': 6, 'july': 7, 'jul': 7,
    'august': 8, 'aug': 8, 'september': 9, 'sept': 9, 'sep': 9,
    'october': 10, 'oct': 10, 'november': 11, 'nov': 11, 'december': 12, 'dec': 12,
}

DAYS_OF_WEEK = {
    'monday': 0, 'mon': 0, 'tuesday': 1, 'tue': 1, 'tues': 1,
    'wednesday': 2, 'wed': 2, 'thursday': 3, 'thu': 3, 'thurs': 3,
    'friday': 4, 'fri': 4, 'saturday': 5, 'sat': 5, 'sunday': 6, 'sun': 6,
    # Tagalog days
    'lunes': 0, 'martes': 1, 'miyerkules': 2, 'huwebes': 3,
    'biyernes': 4, 'sabado': 5, 'linggo': 6,
}

SERVICE_ALIASES = {
    'cleaning': ['cleaning', 'clean', 'linis', 'paglinis', 'teeth cleaning', 'clean teeth'],
    'consultation': ['consultation', 'consult', 'checkup', 'check-up', 'check up',
                     'konsulta', 'pa-check', 'pacheck', 'tingin', 'check ko', 'pa-checkup'],
    'extraction': ['extraction', 'extract', 'bunot', 'pabunot', 'pull tooth', 'pull',
                   'bunot ng ngipin', 'tanggal ngipin', 'bunot ko'],
    'filling': ['filling', 'fill', 'pasta', 'papasta', 'tooth filling',
                'pasta ng ngipin', 'palagyan ng pasta', 'fill ko'],
    'whitening': ['whitening', 'whiten', 'bleach', 'paputi', 'teeth whitening',
                  'paputi ng ngipin', 'whitening treatment'],
    'braces': ['braces', 'orthodontic', 'bracket', 'pabrace',
               'brace', 'lagyan ng braces', 'bracket ng ngipin'],
    'root canal': ['root canal', 'rootcanal'],
    'denture': ['denture', 'dentures', 'pustiso', 'false teeth',
                'pangil', 'pustiso ng ngipin'],
    'crown': ['crown', 'dental crown', 'cap'],
    'veneers': ['veneer', 'veneers'],
}


# ── Formatting Helpers ─────────────────────────────────────────────────────

def fmt_time(t: time_obj) -> str:
    """Format a time object to '9:00 AM' style."""
    return t.strftime('%I:%M %p').lstrip('0')


def fmt_date(d: date_obj) -> str:
    """Format a date object to 'Monday, February 09'."""
    return d.strftime('%A, %B %d')


def fmt_date_full(d: date_obj) -> str:
    """Format a date object to 'Monday, February 09, 2026'."""
    return d.strftime('%A, %B %d, %Y')


# ── DB Query Helpers ───────────────────────────────────────────────────────

def get_dentists_qs():
    """Queryset of all dentist-role users (staff dentists + owner)."""
    return User.objects.filter(
        Q(user_type='staff', role='dentist') | Q(user_type='owner')
    )


def get_booked_times(dentist: User, date: date_obj) -> set:
    """Return set of time values already booked for dentist on date."""
    return set(
        Appointment.objects.filter(
            dentist=dentist, date=date,
            status__in=['confirmed', 'pending', 'reschedule_requested'],
        ).values_list('time', flat=True)
    )


def get_blocked_ranges(date: date_obj, clinic: Optional[ClinicLocation] = None) -> List[tuple]:
    """Return list of (start_time, end_time) tuples for blocked slots."""
    qs = BlockedTimeSlot.objects.filter(date=date)
    if clinic:
        qs = qs.filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True))
    return [(b.start_time, b.end_time) for b in qs]


def is_blocked(slot_time: time_obj, blocked: List[tuple]) -> bool:
    """Check if a time slot falls within any blocked range."""
    for bs, be in blocked:
        if bs <= slot_time < be:
            return True
    return False


def generate_slots(start: time_obj, end: time_obj, duration_minutes: int = 30):
    """Yield time objects from start to end in duration steps."""
    cur = datetime.combine(datetime.today(), start)
    finish = datetime.combine(datetime.today(), end)
    while cur < finish:
        yield cur.time()
        cur += timedelta(minutes=duration_minutes)


def get_available_slots(
    dentist: User,
    date: date_obj,
    clinic: Optional[ClinicLocation] = None,
) -> List[time_obj]:
    """
    Return list of available time slots for a dentist on a date at a clinic.
    Respects DentistAvailability, existing bookings, and blocked slots.
    All data comes from the database — NO hallucination.
    """
    avail_qs = DentistAvailability.objects.filter(
        dentist=dentist, date=date, is_available=True,
    )
    if clinic:
        avail_qs = avail_qs.filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True))

    avail = avail_qs.first()
    if not avail:
        return []

    booked = get_booked_times(dentist, date)
    blocked = get_blocked_ranges(date, clinic)

    # Filter out past time slots when the date is today
    now_time = datetime.now().time() if date == datetime.now().date() else None

    slots = []
    for t in generate_slots(avail.start_time, avail.end_time):
        if now_time and t <= now_time:
            continue
        t_str = t.strftime('%H:%M')
        if t_str not in {str(bt)[:5] for bt in booked} and not is_blocked(t, blocked):
            slots.append(t)
    return slots


def get_alt_dentists_on_date(
    clinic: ClinicLocation,
    date: date_obj,
    exclude_dentist: Optional[User] = None,
) -> List[User]:
    """
    Return dentists (excluding exclude_dentist) who have open slots
    at the given clinic on the given specific date.
    Used to suggest alternatives when the chosen dentist is fully booked.
    """
    avail_ids = DentistAvailability.objects.filter(
        date=date, is_available=True,
    ).filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True)).values_list('dentist_id', flat=True)
    candidates = get_dentists_qs().filter(id__in=avail_ids)
    if exclude_dentist:
        candidates = candidates.exclude(id=exclude_dentist.id)
    result = []
    for d in candidates:
        if get_available_slots(d, date, clinic):
            result.append(d)
    return result


def get_dentists_with_openings(
    clinic: ClinicLocation,
    start_date: date_obj,
    look_days: int = 14,
) -> List[User]:
    """Return dentists who have at least 1 open slot at clinic within look_days."""
    end_date = start_date + timedelta(days=look_days)
    dentists = get_dentists_qs()
    result = []
    for d in dentists:
        avails = DentistAvailability.objects.filter(
            dentist=d, date__gte=start_date, date__lte=end_date,
            is_available=True,
        ).filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True))
        for av in avails:
            if get_available_slots(d, av.date, clinic):
                result.append(d)
                break
    return result


def patient_has_appointment_this_week(patient: User, ref_date: date_obj) -> bool:
    """True if patient already has a non-cancelled appointment in the same ISO week."""
    week_start = ref_date - timedelta(days=ref_date.weekday())
    week_end = week_start + timedelta(days=6)
    return Appointment.objects.filter(
        patient=patient,
        date__gte=week_start,
        date__lte=week_end,
        status__in=['confirmed', 'pending'],
    ).exists()


def infer_clinic_from_dentist(dentist: User) -> Optional[ClinicLocation]:
    """Infer clinic from dentist's assigned clinic or availability records."""
    if dentist.assigned_clinic:
        return dentist.assigned_clinic
    av = DentistAvailability.objects.filter(
        dentist=dentist, is_available=True, clinic__isnull=False,
    ).first()
    return av.clinic if av else ClinicLocation.objects.first()


def recommend_alt_clinic(
    exclude_clinic: ClinicLocation,
    today: date_obj,
) -> Optional[ClinicLocation]:
    """Find an alternative clinic with available dentists."""
    for c in ClinicLocation.objects.exclude(id=exclude_clinic.id):
        if get_dentists_with_openings(c, today):
            return c
    return None


# ── Entity Extraction (Structured, Deterministic) ─────────────────────────

def parse_date(msg: str) -> Optional[date_obj]:
    """
    Extract a date from user message using regex and date parsing.
    Supports English, Tagalog, and common date formats.
    """
    today = datetime.now().date()
    low = msg.lower()

    # 0. Explicit multi-word range keywords — return None so _parse_month_only handles them
    if re.search(r'\bnext month\b|\bsusunod na buwan\b', low):
        return None
    if re.search(r'\bnext year\b|\bsusunod na taon\b', low):
        return None

    # Detect explicit year (e.g. 2027) to qualify month-only references
    year_m = re.search(r'\b(20\d{2})\b', low)
    explicit_year = int(year_m.group(1)) if year_m else None

    # Month + day takes PRIORITY over relative keywords
    # Use (?!\d) to prevent '20' from '2027' being parsed as a day number
    for mname, mnum in MONTHS.items():
        m = re.search(rf'\b{mname}\s+(\d{{1,2}})(?!\d)', low)
        if m:
            day = int(m.group(1))
            year = explicit_year if explicit_year else today.year
            try:
                d = date_obj(year, mnum, day)
                if not explicit_year and d < today:
                    d = date_obj(today.year + 1, mnum, day)
                return d
            except ValueError:
                continue

    # Relative date keywords (English & Tagalog)
    ngayon_match = re.search(r'(?<![a-z])ngayon(?![a-z])', low)
    if 'today' in low or ngayon_match:
        return today
    if 'tomorrow' in low or 'bukas' in low:
        return today + timedelta(days=1)
    if 'the day after tomorrow' in low or 'samakalawa' in low or 'makalawa' in low:
        return today + timedelta(days=2)
    if re.search(r'\bnext week\b|\bsusunod na linggo\b', low):
        return today + timedelta(days=(7 - today.weekday()))

    # MM/DD format
    m = re.search(r'(\d{1,2})[/-](\d{1,2})', msg)
    if m:
        try:
            d = date_obj(today.year, int(m.group(1)), int(m.group(2)))
            if d < today:
                d = date_obj(today.year + 1, int(m.group(1)), int(m.group(2)))
            return d
        except ValueError:
            pass

    # Day of week — use word-boundary match to prevent 'month' triggering 'mon'
    for dname, dnum in DAYS_OF_WEEK.items():
        if re.search(r'\b' + re.escape(dname) + r'\b', low):
            ahead = (dnum - today.weekday()) % 7 or 7
            return today + timedelta(days=ahead)

    return None


def parse_weekday_name(msg: str) -> Optional[int]:
    """
    Returns weekday int (0=Mon..6=Sun) if the message is a bare day-of-week name,
    else None.  Strips common filler words so 'lunes po' also matches.
    Used to detect inputs like 'monday' that should trigger a multi-date picker.
    """
    low = re.sub(r'\b(next|this|susunod|araw na|sa|ng|ang|po|naman|please|pls)\b', '', msg.lower()).strip()
    for dname, dnum in DAYS_OF_WEEK.items():
        if low == dname:
            return dnum
    return None


def parse_time(msg: str) -> Optional[time_obj]:
    """Extract a time from user message using regex patterns."""
    low = msg.lower()
    patterns = [
        (r'(\d{1,2}):(\d{2})\s*([ap]m)', True),
        (r'(\d{1,2})\s*([ap]m)', False),
    ]
    for pat, has_min in patterns:
        m = re.search(pat, low)
        if m:
            hour = int(m.group(1))
            minute = int(m.group(2)) if has_min else 0
            period = m.group(3) if has_min else m.group(2)
            if period == 'pm' and hour != 12:
                hour += 12
            elif period == 'am' and hour == 12:
                hour = 0
            return time_obj(hour, minute)

    # Tagalog time expressions
    m_tl = re.search(r'(\d{1,2})\s*(?:ng\s+|sa\s+)?(umaga|hapon|gabi)', low)
    if m_tl:
        hour = int(m_tl.group(1))
        period_tl = m_tl.group(2)
        if period_tl in ('hapon', 'gabi') and hour != 12:
            hour += 12
        elif period_tl == 'umaga' and hour == 12:
            hour = 0
        return time_obj(hour, 0)
    if 'tanghali' in low:
        return time_obj(12, 0)

    # Bare HH:MM without AM/PM — infer from clinic hours (e.g. "4:30" → 4:30 PM)
    # Hours 1-6 without AM/PM are assumed to be PM (afternoon clinic hours).
    # Hours 7-12 are assumed to be AM (morning clinic hours; 12 = noon).
    m_bare = re.search(r'\b(\d{1,2}):(\d{2})\b', low)
    if m_bare:
        hour = int(m_bare.group(1))
        minute = int(m_bare.group(2))
        if 0 <= minute <= 59 and 1 <= hour <= 12:
            if 1 <= hour <= 6:
                hour += 12  # afternoon: 1:00–6:59 → PM
            # hours 7–12 remain as-is (7–11 AM; 12 = noon/PM)
            return time_obj(hour, minute)

    return None


def find_dentist(msg: str) -> Optional[User]:
    """Match dentist from message using name patterns and DB lookup."""
    low = msg.lower()

    for d in get_dentists_qs():
        full = d.get_full_name().lower()
        last = (d.last_name or '').lower()
        first = (d.first_name or '').lower()

        if not full.strip():
            continue

        patterns = []
        if full:
            patterns += [f'dr. {full}', f'dr {full}', f'doctor {full}', f'doc {full}']
        if last:
            patterns += [f'dr. {last}', f'dr {last}', f'doctor {last}', f'doc {last}']
        if first:
            patterns += [f'dr. {first}', f'dr {first}', f'doctor {first}', f'doc {first}']
        if patterns and any(p in low for p in patterns):
            return d

    # Fallback: match name with dr/doc prefix
    has_prefix = any(p in low for p in ['dr.', 'dr ', 'doc ', 'doctor '])
    if has_prefix:
        for d in get_dentists_qs():
            last = (d.last_name or '').lower()
            first = (d.first_name or '').lower()
            if last and last in low:
                return d
            if first and first in low:
                return d

    # Tagalog "si [name]" particle and bare name (without any prefix)
    for d in get_dentists_qs():
        last = (d.last_name or '').lower()
        first = (d.first_name or '').lower()
        if last:
            if f'si {last}' in low:
                return d
            if len(last) > 3 and re.search(r'\b' + re.escape(last) + r'\b', low):
                return d
        if first:
            if f'si {first}' in low:
                return d
            if len(first) > 3 and re.search(r'\b' + re.escape(first) + r'\b', low):
                return d

    return None


def find_clinic(msg: str) -> Optional[ClinicLocation]:
    """Match clinic location from message using name matching."""
    low = msg.lower()
    for c in ClinicLocation.objects.all():
        if c.name.lower() in low:
            return c
    # Partial matching
    for c in ClinicLocation.objects.all():
        for word in c.name.lower().split():
            if len(word) > 3 and word not in ('dental', 'clinic', 'dorotheo') and word in low:
                return c
    return None


def find_service(msg: str) -> Optional[Service]:
    """Match service from message using aliases and DB lookup."""
    low = msg.lower()

    # Check aliases first
    for svc_name, aliases in SERVICE_ALIASES.items():
        if any(alias in low for alias in aliases):
            match = Service.objects.filter(name__icontains=svc_name).first()
            if match:
                return match

    # Exact name match with word boundaries (fallback)
    for s in Service.objects.all():
        sname = s.name.lower()
        pattern = r'(?:^|[\s,.:;!?-])' + re.escape(sname) + r'(?:$|[\s,.:;!?-])'
        if re.search(pattern, low):
            return s

    return None


# ── Booking Context Gathering ──────────────────────────────────────────────

def gather_booking_context(
    msg: str,
    hist: list,
    is_fresh: bool = False,
) -> Dict[str, Any]:
    """
    Extract structured booking entities from current message and history.

    If is_fresh=True, only uses current message (avoids stale context).
    """
    if is_fresh:
        clinic = find_clinic(msg)
        dentist = find_dentist(msg)
        date = parse_date(msg)
        time_val = parse_time(msg)
        service = find_service(msg)
    else:
        # Filter out stale data from before flow resets
        filtered_hist = _filter_stale_history(hist)

        combined_user = ' '.join(
            [m['content'] for m in filtered_hist if m['role'] == 'user'] + [msg]
        )

        clinic = find_clinic(msg) or find_clinic(combined_user)
        dentist = find_dentist(msg)
        if not dentist and _has_step_tag(filtered_hist, '[BOOK_STEP_3'):
            dentist = find_dentist(combined_user)

        date = parse_date(msg) or parse_date(combined_user)
        time_val = parse_time(msg) or parse_time(combined_user)
        service = find_service(msg) or find_service(combined_user)

    # Infer clinic from dentist if dentist is known but not clinic
    if dentist and not clinic:
        clinic = infer_clinic_from_dentist(dentist)

    return {
        'clinic': clinic,
        'dentist': dentist,
        'date': date,
        'time': time_val,
        'service': service,
    }


def match_appointment(msg: str, qs) -> Optional[Appointment]:
    """Try to match user's message to an appointment in queryset."""
    low = msg.lower()
    for a in qs:
        svc = (a.service.name if a.service else 'appointment').lower()
        dstr_full = a.date.strftime('%B %d').lower()              # "february 23"
        dstr_abbr = a.date.strftime('%b %d').lower()              # "feb 23" (zero-padded)
        dstr_short = (a.date.strftime('%b ') + str(a.date.day)).lower()  # "feb 2" (no zero-pad)
        if svc in low or dstr_full in low or dstr_abbr in low or dstr_short in low:
            return a
    if qs.count() == 1:
        return qs.first()
    return None


# ── Appointment Creation (Atomic) ─────────────────────────────────────────

@transaction.atomic
def create_appointment(
    patient: User,
    dentist: User,
    service: Service,
    clinic: ClinicLocation,
    date: date_obj,
    time_val: time_obj,
) -> Tuple[Optional[Appointment], Optional[str]]:
    """
    Create an appointment inside a Django atomic transaction.
    Uses centralized booking_validation_service for ALL constraint checks.

    Returns:
        (appointment, None) on success
        (None, error_message) on validation failure
    """
    # Centralized validation (Rules A-E)
    is_valid, error_msg = validate_new_booking(
        patient=patient,
        dentist=dentist,
        service=service,
        clinic=clinic,
        target_date=date,
        target_time=time_val,
    )
    if not is_valid:
        secmon.log_invalid_booking_attempt(
            user_id=patient.id,
            reason='validation_failed',
            details=error_msg,
        )
        return None, error_msg

    appt = Appointment.objects.create(
        patient=patient,
        dentist=dentist,
        service=service,
        clinic=clinic,
        date=date,
        time=time_val,
        status='confirmed',
        notes='Automatically booked by AI Sage',
    )

    secmon.record_booking_attempt(patient.id)

    logger.info(
        "Appointment created: id=%d user=%s clinic=%s dentist=%s date=%s time=%s service=%s",
        appt.id, patient.id, clinic.name, dentist.get_full_name(), date, time_val, service.name,
    )

    return appt, None


# ── Reschedule (Atomic) ───────────────────────────────────────────────────

@transaction.atomic
def submit_reschedule_request(
    appointment: Appointment,
    new_date: date_obj,
    new_time: time_obj,
) -> Tuple[bool, Optional[str]]:
    """
    Submit a reschedule request inside an atomic transaction.
    Uses centralized validation and state machine.

    Returns:
        (True, None) on success
        (False, error_message) on failure
    """
    # Centralized validation
    is_valid, error_msg = validate_reschedule(appointment, new_date, new_time)
    if not is_valid:
        secmon.log_invalid_booking_attempt(
            user_id=appointment.patient.id,
            reason='reschedule_validation_failed',
            details=error_msg,
        )
        return False, error_msg

    # State machine transition
    success, transition_error = transition_appointment(
        appointment, 'reschedule_requested',
        actor=f'patient_{appointment.patient.id}',
        reason=f'Reschedule to {new_date} {new_time}',
    )
    if not success:
        return False, transition_error

    appointment.reschedule_date = new_date
    appointment.reschedule_time = new_time
    appointment.reschedule_notes = "Rescheduled via AI Sage"
    appointment.save(update_fields=[
        'reschedule_date', 'reschedule_time', 'reschedule_notes',
    ])

    logger.info(
        "Reschedule request: appt=%d new_date=%s new_time=%s",
        appointment.id, new_date, new_time,
    )

    return True, None


# ── Cancel (Atomic) ───────────────────────────────────────────────────────

@transaction.atomic
def submit_cancel_request(appointment: Appointment) -> bool:
    """
    Submit a cancellation request (soft delete).
    Uses centralized validation and state machine.
    Returns True on success, False on failure.
    """
    # Centralized validation
    is_valid, error_msg = validate_cancellation(appointment)
    if not is_valid:
        secmon.log_invalid_booking_attempt(
            user_id=appointment.patient.id,
            reason='cancel_validation_failed',
            details=error_msg,
        )
        logger.warning(
            "Cancel request rejected: appt=%d reason=%s",
            appointment.id, error_msg,
        )
        return False

    # State machine transition
    success, transition_error = transition_appointment(
        appointment, 'cancel_requested',
        actor=f'patient_{appointment.patient.id}',
        reason='Cancellation requested via AI Sage',
    )
    if not success:
        logger.warning(
            "Cancel state transition failed: appt=%d error=%s",
            appointment.id, transition_error,
        )
        return False

    appointment.cancel_reason = 'Cancellation requested via AI Sage'
    appointment.cancel_requested_at = datetime.now()
    appointment.save(update_fields=['cancel_reason', 'cancel_requested_at'])

    logger.info("Cancel request: appt=%d", appointment.id)
    return True


# ── Pending Request Check ─────────────────────────────────────────────────

def check_pending_requests(user: User, detected_lang: str = 'en') -> Optional[str]:
    """
    Check if patient has any pending reschedule or cancellation requests.
    Returns a message string if blocked, or None if clear to proceed.
    """
    is_tl = detected_lang in ('tl', 'tl-mix')

    if Appointment.objects.filter(
        patient=user, status='reschedule_requested'
    ).exists():
        if is_tl:
            return (
                "🚫 Hindi po kayo maaaring mag-book, mag-reschedule, o mag-cancel habang mayroon pang "
                "nakabinbing kahilingang mag-reschedule.\n\n"
                "Mangyaring hintayin po ang pagsusuri at pagkumpirma ng staff sa inyong "
                "kahilingan bago gumawa ng bagong aksyon."
            )
        return (
            "🚫 You cannot book, reschedule, or cancel while a reschedule request is pending.\n\n"
            "Please wait for staff to review and confirm your pending reschedule request "
            "before taking any new action."
        )

    if Appointment.objects.filter(
        patient=user, status='cancel_requested'
    ).exists():
        if is_tl:
            return (
                "🚫 Hindi po kayo maaaring mag-book, mag-reschedule, o mag-cancel habang mayroon pang "
                "nakabinbing kahilingang mag-cancel.\n\n"
                "Mangyaring hintayin po ang pagsusuri at pagkumpirma ng staff sa inyong "
                "kahilingan bago gumawa ng bagong aksyon."
            )
        return (
            "🚫 You cannot book, reschedule, or cancel while a cancellation request is pending.\n\n"
            "Please wait for staff to review and confirm your pending cancellation request "
            "before taking any new action."
        )

    return None


def was_just_unblocked(user: User, history: list) -> bool:
    """True if the last message was a PENDING_BLOCK but user is now unblocked."""
    from .intent_service import _last_assistant
    last_msg = _last_assistant(history, 1)
    if not last_msg or '[PENDING_BLOCK]' not in last_msg[0]:
        return False
    still_pending = Appointment.objects.filter(
        patient=user,
        status__in=['reschedule_requested', 'cancel_requested']
    ).exists()
    return not still_pending


# ── Internal Helpers ───────────────────────────────────────────────────────

def _filter_stale_history(hist: list) -> list:
    """Filter out messages before a flow reset point."""
    filtered = hist or []
    last_block_idx = -1
    for i, m in enumerate(filtered):
        content = m.get('content', '')
        if m.get('role') == 'assistant' and any(tag in content for tag in (
            '[PENDING_REQUEST]', '[PENDING_BLOCK]',
            '[APPROVAL_WELCOME]', '[FLOW_COMPLETE]',
        )):
            last_block_idx = i
    if last_block_idx >= 0:
        filtered = filtered[last_block_idx + 1:]
    return filtered


def _has_step_tag(hist: list, tag: str) -> bool:
    """Check if a step tag exists in recent history."""
    from .intent_service import step_tag_exists
    return step_tag_exists(hist, tag)
