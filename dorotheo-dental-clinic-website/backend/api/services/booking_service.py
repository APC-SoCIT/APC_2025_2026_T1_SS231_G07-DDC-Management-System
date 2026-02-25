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

# Sentinels returned by parse_date() for explicit user errors.
# All are truthy so `parse_date(msg) or parse_date(combined)` short-circuits.
INVALID_DATE = object()    # e.g. "feb 30" — date doesn't exist in the calendar
PAST_DATE = object()       # e.g. "jan 5" when today is Feb 24
FAR_FUTURE_DATE = object() # e.g. "2027 march 10" — beyond MAX_FUTURE_DAYS

_DATE_SENTINELS = (INVALID_DATE, PAST_DATE, FAR_FUTURE_DATE)


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
    
    Uses timezone-safe server time to filter past slots.
    """
    from django.utils import timezone as tz

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

    # Filter out past time slots when the date is today (Philippines local time)
    # Use localtime() so the comparison is against Asia/Manila time, not UTC.
    now_local = tz.localtime(tz.now())
    now_time = now_local.time() if date == now_local.date() else None

    # Enforce MAX_FUTURE_DAYS limit
    from .booking_validation_service import MAX_FUTURE_DAYS
    max_date = now_local.date() + timedelta(days=MAX_FUTURE_DAYS)
    if date > max_date:
        return []

    slots = []
    for t in generate_slots(avail.start_time, avail.end_time):
        if now_time and t <= now_time:
            continue
        t_str = t.strftime('%H:%M')
        if t_str not in {str(bt)[:5] for bt in booked} and not is_blocked(t, blocked):
            slots.append(t)
    return slots


def has_availability_record(
    dentist: User,
    date: date_obj,
    clinic: Optional[ClinicLocation] = None,
) -> bool:
    """
    Check if a DentistAvailability record exists for the given dentist on the
    given date at the given clinic.  This is a lighter check than
    get_available_slots() — it answers "did the dentist set their schedule?"
    without computing individual slot availability.
    """
    qs = DentistAvailability.objects.filter(
        dentist=dentist, date=date, is_available=True,
    )
    if clinic:
        qs = qs.filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True))
    return qs.exists()


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

def parse_date(msg: str):
    """
    Extract a date from user message using regex and date parsing.
    Supports English, Tagalog, and common date formats.

    Returns:
        date_obj   – a valid future date was found
        INVALID_DATE – the user explicitly typed an impossible date (e.g. "feb 30")
        None       – no date-like pattern was recognised at all

    Rejects dates beyond MAX_FUTURE_DAYS to prevent far-future bookings.
    """
    from .booking_validation_service import MAX_FUTURE_DAYS
    from django.utils import timezone as _tz

    # ALWAYS use Philippines local time so "today"/"tomorrow" resolve correctly
    # regardless of the server's UTC offset.
    today = _tz.localtime(_tz.now()).date()
    max_date = today + timedelta(days=MAX_FUTURE_DAYS)
    low = msg.lower()
    
    def _validate_and_return(d: date_obj):
        """Reject past dates and dates beyond the allowed future window."""
        if d < today:
            return PAST_DATE
        if d > max_date:
            logger.warning("Date %s exceeds MAX_FUTURE_DAYS (%d). Rejected.", d, MAX_FUTURE_DAYS)
            return FAR_FUTURE_DATE
        return d

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
                return _validate_and_return(d)
            except ValueError:
                # The user wrote a real month name but an impossible day
                # (e.g. "feb 30", "april 31").  Signal this explicitly so
                # the caller can tell the user instead of silently ignoring it.
                return INVALID_DATE

    # Relative date keywords (English & Tagalog)
    ngayon_match = re.search(r'(?<![a-z])ngayon(?![a-z])', low)
    if 'today' in low or ngayon_match:
        return _validate_and_return(today)
    if 'tomorrow' in low or 'bukas' in low:
        return _validate_and_return(today + timedelta(days=1))
    if 'the day after tomorrow' in low or 'samakalawa' in low or 'makalawa' in low:
        return _validate_and_return(today + timedelta(days=2))
    if re.search(r'\bnext week\b|\bsusunod na linggo\b', low):
        return _validate_and_return(today + timedelta(days=(7 - today.weekday())))

    # MM/DD format
    m = re.search(r'(\d{1,2})[/-](\d{1,2})', msg)
    if m:
        try:
            d = date_obj(today.year, int(m.group(1)), int(m.group(2)))
            if d < today:
                d = date_obj(today.year + 1, int(m.group(1)), int(m.group(2)))
            return _validate_and_return(d)
        except ValueError:
            return INVALID_DATE

    # Day of week — use word-boundary match to prevent 'month' triggering 'mon'
    for dname, dnum in DAYS_OF_WEEK.items():
        if re.search(r'\b' + re.escape(dname) + r'\b', low):
            ahead = (dnum - today.weekday()) % 7 or 7
            return _validate_and_return(today + timedelta(days=ahead))

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
    # Partial matching — require the clinic-name word to appear as a full word
    # (word boundary) so that e.g. "baclaran" never matches "bacoor".
    for c in ClinicLocation.objects.all():
        for word in c.name.lower().split():
            if (
                len(word) > 3
                and word not in ('dental', 'clinic', 'dorotheo')
                and re.search(r'\b' + re.escape(word) + r'\b', low)
            ):
                return c
    return None


def _has_unmatched_location_hint(msg: str) -> bool:
    """
    Return True when the message looks like it's specifying a place
    (e.g. "at baclaran", "sa taguig") but that place doesn't match any
    known clinic.  Used to suppress stale-history clinic bleeding.
    """
    # Match "at <word>" or "sa <word>" style phrases
    m = re.search(r'\b(?:at|sa|in|near)\s+([a-zA-ZÑñ]{4,})', msg, re.IGNORECASE)
    if not m:
        return False
    candidate = m.group(1).lower()
    # If any known clinic matches the candidate, it's NOT unmatched
    for c in ClinicLocation.objects.all():
        if candidate in c.name.lower():
            return False
        for word in c.name.lower().split():
            if len(word) > 3 and word not in ('dental', 'clinic', 'dorotheo'):
                if re.search(r'\b' + re.escape(word) + r'\b', candidate):
                    return False
    return True


def _has_unmatched_service_mention(msg: str) -> Optional[str]:
    """
    Return the candidate service name (title-cased) if the message explicitly
    names something as a service but it doesn't match any known service alias.

    Examples:
        "i said nail polish for service"  → "Nail Polish"
        "for tooth whitening"             → None (whitening IS in aliases)
        "book a cleaning"                 → None (matched)

    Used to block stale-history service bleeding and show a clear error:
    "Nail Polish isn't something we book online — we only offer Cleaning and
    Consultation for online booking."
    """
    low = msg.lower()

    # ── Non-dental service keywords ────────────────────────────────────
    # If the candidate matches one of these, it's clearly not a dental
    # service and we should immediately flag it as unmatched so the
    # chatbot says "we don't offer that" rather than hallucinating.
    _NON_DENTAL = (
        'physical exam', 'physical examination', 'checkup physical',
        'general checkup', 'body check', 'medical exam',
        'nail polish', 'nail', 'manicure', 'pedicure',
        'haircut', 'hair', 'massage', 'spa', 'facial',
        'eye exam', 'eye check', 'skin care', 'derma',
        'blood test', 'lab test', 'x-ray', 'xray',
        'vaccine', 'vaccination', 'immunization',
    )

    # Quick check: does the message contain a known non-dental phrase?
    for nd in _NON_DENTAL:
        if nd in low:
            # Make sure it's not part of a dental service alias
            is_dental = False
            for aliases in SERVICE_ALIASES.values():
                if any(nd in alias or alias in nd for alias in aliases):
                    is_dental = True
                    break
            if not is_dental:
                return nd.title()

    # Patterns that unambiguously name a service
    patterns = [
        r'\bi said\s+(.{2,30}?)\s+(?:for service|as service|is the service|for the service)\b',
        r'\bservice\s+(?:is|should be|was|:)\s*([a-zA-Z][a-zA-Z\s]{1,28})',
        r'\bchange\s+(?:the\s+)?service\s+to\s+([a-zA-Z][a-zA-Z\s]{1,28})',
        r'\bfor\s+([a-zA-Z][a-zA-Z\s]{2,28}?)\s+service\b',
        r'\bwant\s+([a-zA-Z][a-zA-Z\s]{2,28}?)\s+(?:service|appointment)\b',
        r'\bbook.*?for\s+([a-zA-Z][a-zA-Z\s]{2,20}?)\s+(?:at|po|please|with|\Z)',
        # "book appointment <service> <date/time/clinic>" pattern
        r'\bbook\s+(?:an?\s+)?(?:appointment\s+)?(?:for\s+)?([a-zA-Z][a-zA-Z\s]{2,25}?)\s+(?:on|at|in|sa|with|for|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|next|\d)',
    ]

    candidate = None
    for pattern in patterns:
        m = re.search(pattern, low, re.IGNORECASE)
        if m:
            candidate = m.group(1).strip()
            break

    if not candidate or len(candidate) < 3:
        return None

    # Strip trailing noise words
    noise = ('at', 'po', 'please', 'the', 'a', 'an', 'my', 'your')
    for w in noise:
        if candidate.endswith(f' {w}'):
            candidate = candidate[: -(len(w) + 1)].strip()

    if len(candidate) < 3:
        return None

    # If it matches any known alias, it's recognised — let normal flow handle it
    for svc_name, aliases in SERVICE_ALIASES.items():
        if any(alias in candidate or candidate in alias for alias in aliases):
            return None

    return candidate.title()


def _has_unmatched_doctor_hint(msg: str) -> Optional[str]:
    """
    Return the raw candidate name (original case) if the message mentions a
    doctor keyword (dr / doc / doctor) followed by a name that does NOT match
    any dentist in the database.

    Examples:
        "book with doc gabriel"   → "gabriel"  (if no Gabriel in DB)
        "see dr. santos"          → None        (Santos found in DB)
        "i need a dentist"        → None        (no doctor keyword + name)

    Used to produce an "invalid" FieldValidation instead of a silent
    "missing" when the user clearly named a non-existent dentist.
    """
    m = re.search(r'\b(?:dr\.?|doc\.?|doctor)\s+([a-zA-ZÑñ]+)', msg, re.IGNORECASE)
    if not m:
        return None
    candidate = m.group(1).lower()
    for d in get_dentists_qs():
        if (candidate in d.last_name.lower() or
                candidate in d.first_name.lower()):
            return None  # matched a real dentist — not unmatched
    return m.group(1)  # return original-case candidate


def find_service(msg: str, patient_only: bool = True) -> Optional[Service]:
    """
    Match service from message using aliases and DB lookup.
    
    Args:
        patient_only: If True (default), only match services with patient_bookable=True.
                      This prevents patients/chatbot from booking restricted services
                      like extraction, root canal, etc.
    """
    low = msg.lower()

    # Check aliases first
    for svc_name, aliases in SERVICE_ALIASES.items():
        if any(alias in low for alias in aliases):
            qs = Service.objects.filter(name__icontains=svc_name)
            if patient_only:
                qs = qs.filter(patient_bookable=True)
            match = qs.first()
            if match:
                return match

    # Exact name match with word boundaries (fallback)
    qs = Service.objects.all()
    if patient_only:
        qs = qs.filter(patient_bookable=True)
    for s in qs:
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

    Returns a dict with keys:
        clinic, dentist, date, time, service,
        invalid_date_msg (str | None) — set when user typed an impossible
                                        date like "feb 30".
    """
    invalid_date_msg: Optional[str] = None

    invalid_service_name: Optional[str] = None

    if is_fresh:
        clinic = find_clinic(msg)
        dentist = find_dentist(msg)
        _raw_date = parse_date(msg)
        time_val = parse_time(msg)
        _unmatched_svc_name_fresh = _has_unmatched_service_mention(msg)
        if _unmatched_svc_name_fresh:
            service = None
            invalid_service_name = _unmatched_svc_name_fresh
        else:
            service = find_service(msg) or find_service(msg, patient_only=False)
    else:
        # Filter out stale data from before flow resets
        filtered_hist = _filter_stale_history(hist)

        combined_user = ' '.join(
            [m['content'] for m in filtered_hist if m['role'] == 'user'] + [msg]
        )

        # Don't let history bleed a clinic through when the user is
        # explicitly naming a location that doesn't match any known clinic
        # (e.g. "at baclaran" vs the real clinic "Bacoor").
        clinic_from_msg = find_clinic(msg)
        if clinic_from_msg:
            clinic = clinic_from_msg
        elif _has_unmatched_location_hint(msg):
            clinic = None   # user named a place we don't recognise — don't guess
        else:
            clinic = find_clinic(combined_user)

        # Always fall back to history for dentist — the booking flow no longer
        # emits [BOOK_STEP_3] tags, so don't gate on them. _filter_stale_history
        # already scrubs anything before a FLOW_COMPLETE reset.
        dentist = find_dentist(msg) or find_dentist(combined_user)

        _raw_date = parse_date(msg)
        if _raw_date is None:
            _raw_date = parse_date(combined_user)
        time_val = parse_time(msg) or parse_time(combined_user)

        # --- Service extraction (history-bleed guard) ---
        # First check the current message for an UNRECOGNISED service mention
        # (e.g. "nail polish"). If found, block history from supplying a
        # different service so the user gets a clear "not bookable online" error
        # instead of silently inheriting "Cleaning" from an earlier message.
        _unmatched_svc_name = _has_unmatched_service_mention(msg)
        if _unmatched_svc_name:
            # Current msg names an unrecognized service — don't bleed history
            service = None
            invalid_service_name = _unmatched_svc_name
        else:
            service = find_service(msg) or find_service(combined_user)
            # If no patient-bookable service was found, check whether a
            # NON-bookable service was mentioned. Passing it through lets
            # _check_service_field produce the "cannot be booked online"
            # error instead of silently asking "which service?".
            if service is None:
                service = (
                    find_service(msg, patient_only=False)
                    or find_service(combined_user, patient_only=False)
                )
            invalid_service_name = None

    # Resolve date sentinels (INVALID_DATE, PAST_DATE, FAR_FUTURE_DATE)
    if _raw_date is INVALID_DATE:
        invalid_date_msg = (
            "Hmm, that date doesn't seem to exist on the calendar "
            "— for example, February only has 28 or 29 days. Could you double-check?"
        )
        date = None
    elif _raw_date is PAST_DATE:
        invalid_date_msg = (
            "That date has already passed — we can only book future appointments."
        )
        date = None
    elif _raw_date is FAR_FUTURE_DATE:
        from .booking_validation_service import MAX_FUTURE_DAYS
        invalid_date_msg = (
            f"That's a bit too far out — we can only schedule up to "
            f"{MAX_FUTURE_DAYS} days ahead. How about something sooner?"
        )
        date = None
    else:
        date = _raw_date

    # Infer clinic from dentist if dentist is known but not clinic
    if dentist and not clinic:
        clinic = infer_clinic_from_dentist(dentist)

    return {
        'clinic': clinic,
        'dentist': dentist,
        'date': date,
        'time': time_val,
        'service': service,
        'invalid_date_msg': invalid_date_msg,
        'invalid_service_name': invalid_service_name,
    }


def match_appointment(msg: str, qs) -> Optional[Appointment]:
    """
    Try to match user's message to an appointment in queryset.

    Matching logic:
    - Relative date keywords (today/tomorrow/ngayon/bukas) → match by resolved date
    - If BOTH service name AND date are mentioned → require BOTH to match the same appointment
    - If only service OR only date is mentioned → match on whichever is found
    - If only one appointment exists → return it
    - If no match → return None (caller should provide helpful mismatch feedback)
    """
    from datetime import date as _date
    low = msg.lower()

    # -- Relative date resolution (today / tomorrow / ngayon / bukas) --
    # Must run before the main match loop because "today" never appears in
    # month-name date_variants like "february 25".
    _today = _date.today()
    _rel_date = None
    if re.search(r'\btoday\b|\bngayon\b', low):
        _rel_date = _today
    elif re.search(r'\btomorrow\b|\bbukas\b', low):
        _rel_date = _today + timedelta(days=1)
    if _rel_date is not None:
        rel_matches = [a for a in qs if a.date == _rel_date]
        if len(rel_matches) == 1:
            return rel_matches[0]
        # Multiple on same relative day → fall through to service/date disambiguation

    # Build match data for each appointment
    match_data = []
    for a in qs:
        svc = (a.service.name if a.service else 'appointment').lower()
        date_variants = [
            a.date.strftime('%B %d').lower(),               # "february 23"
            a.date.strftime('%b %d').lower(),                # "feb 23" (zero-padded)
            (a.date.strftime('%b ') + str(a.date.day)).lower(),  # "feb 2" (no zero-pad)
            (a.date.strftime('%B ') + str(a.date.day)).lower(),  # "february 2" (cross-platform)
        ]
        # Remove duplicates
        date_variants = list(set(v for v in date_variants if v))

        svc_match = svc in low
        date_match = any(d in low for d in date_variants)

        match_data.append({
            'appointment': a,
            'svc_name': svc,
            'date_variants': date_variants,
            'svc_match': svc_match,
            'date_match': date_match,
        })

    # Detect what the user mentioned
    any_svc_in_msg = any(m['svc_match'] for m in match_data)
    any_date_in_msg = any(m['date_match'] for m in match_data)

    # Also check if user mentioned a service name that exists in appointments
    # but doesn't match a specific appointment's date
    all_svc_names = set(m['svc_name'] for m in match_data)
    user_mentioned_service = any(s in low for s in all_svc_names)

    # Check if user mentioned a date-like pattern
    import re as _re
    user_mentioned_date = bool(_re.search(
        r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|'
        r'january|february|march|april|june|july|august|september|october|november|december)'
        r'\s*\d{1,2}\b', low
    ))

    # CASE 1: Both service AND date mentioned → require BOTH to match the same appointment
    if (user_mentioned_service or any_svc_in_msg) and (user_mentioned_date or any_date_in_msg):
        for m in match_data:
            if m['svc_match'] and m['date_match']:
                return m['appointment']
        # Both mentioned but no single appointment matches both → return None
        # (The caller will show helpful mismatch message)
        return None

    # CASE 2: Only service OR only date mentioned → match on what's found
    for m in match_data:
        if m['svc_match'] or m['date_match']:
            return m['appointment']

    # CASE 3: Exact quick-reply label match (e.g., "Cleaning – February 23, 2026 at 9:00 AM")
    for a in qs:
        svc = a.service.name if a.service else 'Appointment'
        # Match against the label format used in quick replies (with or without time)
        label_with_time = f"{svc} – {a.date.strftime('%B %d, %Y')} at {fmt_time(a.time)}".lower()
        label_full = f"{svc} – {a.date.strftime('%B %d, %Y')}".lower()
        label_short = f"{svc} – {a.date.strftime('%B %d')}".lower()
        label_fmt_date = f"{svc} – {fmt_date(a.date)}".lower()
        label_fmt_date_time = f"{svc} – {fmt_date(a.date)} at {fmt_time(a.time)}".lower()
        if any(lbl in low for lbl in [label_with_time, label_fmt_date_time, label_full, label_short, label_fmt_date]):
            return a

    # CASE 4: Only one appointment → auto-select
    if qs.count() == 1:
        return qs.first()

    return None


def get_appointment_mismatch_message(msg: str, qs, is_tl: bool, action: str = 'cancel') -> Optional[str]:
    """
    When a user mentions a service+date combo that doesn't match any appointment,
    generate a helpful message showing what they actually have.

    Args:
        msg: The user's message
        qs: QuerySet of upcoming appointments
        is_tl: Whether to respond in Tagalog
        action: 'cancel' or 'reschedule'

    Returns:
        A helpful mismatch message, or None if no mismatch detected.
    """
    import re as _re
    low = msg.lower()

    # Extract what service the user mentioned
    mentioned_svc = None
    for a in qs:
        svc = (a.service.name if a.service else '').lower()
        if svc and svc in low:
            mentioned_svc = a.service.name
            break

    # Extract what date the user mentioned
    mentioned_date = None
    date_match = _re.search(
        r'\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|'
        r'jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
        r'\s*(\d{1,2})\b', low
    )
    if date_match:
        mentioned_date = f"{date_match.group(1).capitalize()} {date_match.group(2)}"

    if not mentioned_svc and not mentioned_date:
        return None

    # Build the list of actual appointments
    actual_list = []
    for a in qs:
        svc = a.service.name if a.service else 'Appointment'
        actual_list.append(f"- **{svc}** on **{a.date.strftime('%B %d, %Y')}** at **{fmt_time(a.time)}**")

    actual_text = '\n'.join(actual_list)

    if is_tl:
        parts = []
        if mentioned_svc and mentioned_date:
            parts.append(
                f"Wala po kayong appointment para sa **{mentioned_svc}** sa **{mentioned_date}**."
            )
        elif mentioned_svc:
            parts.append(
                f"Hindi ko po mahanap ang appointment para sa **{mentioned_svc}** sa petsang binanggit ninyo."
            )
        elif mentioned_date:
            parts.append(
                f"Wala po kayong appointment sa **{mentioned_date}**."
            )
        parts.append(f"\nNarito po ang inyong mga kasalukuyang appointment:\n{actual_text}")
        verb = 'kanselahin' if action == 'cancel' else 'i-reschedule'
        parts.append(f"\nAlin po ang gusto ninyong {verb}?")
        return '\n'.join(parts)
    else:
        parts = []
        if mentioned_svc and mentioned_date:
            parts.append(
                f"You don't have an appointment for **{mentioned_svc}** on **{mentioned_date}**."
            )
        elif mentioned_svc:
            parts.append(
                f"I couldn't find a **{mentioned_svc}** appointment on that date."
            )
        elif mentioned_date:
            parts.append(
                f"You don't have an appointment on **{mentioned_date}**."
            )
        parts.append(f"\nHere are your current appointments:\n{actual_text}")
        verb = 'cancel' if action == 'cancel' else 'reschedule'
        parts.append(f"\nWhich one would you like to {verb}?")
        return '\n'.join(parts)



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
    
    SLOT-VERIFIED: The appointment is linked to a verified DentistAvailability
    record. If no valid slot exists, booking is rejected.

    Returns:
        (appointment, None) on success
        (None, error_message) on validation failure
    """
    # Centralized validation (Rules A-K, including slot verification)
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

    # Get the validated availability slot
    avail_slot = validate_new_booking.last_validated_slot
    if not avail_slot:
        # This should never happen if validate_new_booking passed,
        # but guard defensively
        secmon.log_invalid_booking_attempt(
            user_id=patient.id,
            reason='missing_validated_slot',
            details='Validation passed but no slot reference found',
        )
        logger.error(
            "CRITICAL: validate_new_booking passed but last_validated_slot is None. "
            "patient=%s dentist=%s date=%s time=%s",
            patient.id, dentist.id, date, time_val,
        )
        return None, "Internal error: slot verification failed. Please try again."

    appt = Appointment.objects.create(
        patient=patient,
        dentist=dentist,
        service=service,
        clinic=clinic,
        availability_slot=avail_slot,
        date=date,
        time=time_val,
        status='confirmed',
        notes='Automatically booked by AI Sage',
    )

    secmon.record_booking_attempt(patient.id)

    logger.info(
        "Appointment created: id=%d user=%s clinic=%s dentist=%s date=%s time=%s "
        "service=%s availability_slot=%d",
        appt.id, patient.id, clinic.name, dentist.get_full_name(),
        date, time_val, service.name, avail_slot.id,
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
    Returns a conversational message string if blocked, or None if clear.
    """
    is_tl = detected_lang in ('tl', 'tl-mix')

    if Appointment.objects.filter(
        patient=user, status='reschedule_requested'
    ).exists():
        if is_tl:
            return (
                "Mukhang mayroon ka pang nakabinbing kahilingang mag-reschedule. "
                "Tapusin muna natin iyon bago gumawa ng bagong pagbabago."
            )
        return (
            "It looks like you already have a pending reschedule request. "
            "Let's complete that first before making any new changes."
        )

    if Appointment.objects.filter(
        patient=user, status='cancel_requested'
    ).exists():
        if is_tl:
            return (
                "Mukhang mayroon ka pang nakabinbing kahilingang mag-cancel. "
                "Tapusin muna natin iyon bago gumawa ng bagong pagbabago."
            )
        return (
            "It looks like you already have a pending cancellation request. "
            "Let's complete that first before making any new changes."
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
