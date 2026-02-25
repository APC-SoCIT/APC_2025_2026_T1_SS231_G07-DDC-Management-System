"""
RAG Service with Hybrid Retrieval
──────────────────────────────────
Provides context retrieval for clinic information queries.

Features:
- Vector search (existing PageChunk embeddings)
- Database context builder (services, dentists, clinics) — ALL from DB
- RAG validation: system NEVER silently skips RAG
- Source attribution logging for every response
- Fallback hierarchy: RAG → DB context → direct contact message
- All retrieval failures return safe fallback — NEVER crash
- NO hardcoded service/dentist lists — everything from database

RAG Prompt:
    "You are a dental clinic assistant.
    Answer ONLY using the provided context.
    If answer is not in context, say:
    'Please contact our clinic directly for more information.'
    Be concise and professional."
"""

import logging
import re
from calendar import monthrange as cal_monthrange
from datetime import datetime, timedelta
from typing import Optional, List, Tuple, Dict

from django.conf import settings
from django.db.models import Q

from api.models import (
    Service, Appointment, User, DentistAvailability,
    ClinicLocation, PageChunk,
)
from .booking_service import (
    get_dentists_qs, parse_date, fmt_date, fmt_time, fmt_date_full,
    MONTHS, get_available_slots,
)

logger = logging.getLogger('chatbot.rag')


# ── Month-Only Range Helper ────────────────────────────────────────────────

def _parse_month_only(msg: str):
    """
    Returns (year, month_num) if the message references a month WITHOUT a specific day.
    Returns None if a specific day follows the month name (let parse_date handle it).

    Handles:
    - 'ngayong feb', 'this February', 'sa February'
    - 'next month' / 'susunod na buwan'
    - 'next year' or 'january next year' or 'january 2027'
    - 'available in march 2026'
    """
    low = msg.lower()
    today = datetime.now().date()

    # ── "next month" ───────────────────────────────────────────────────────
    if re.search(r'\bnext month\b|\bsusunod na buwan\b', low):
        if today.month == 12:
            return (today.year + 1, 1)
        return (today.year, today.month + 1)

    # ── Year-qualified month (e.g. "january 2027", "march 2026") ──────────
    year_m = re.search(r'\b(20\d{2})\b', low)
    explicit_year = int(year_m.group(1)) if year_m else None

    # ── "next year" — with or without a specific month ────────────────────
    is_next_year = bool(re.search(r'\bnext year\b|\bsusunod na taon\b', low))
    target_year = explicit_year or (today.year + 1 if is_next_year else None)

    # Look for a month name in the message
    for mname, mnum in MONTHS.items():
        if re.search(rf'\b{re.escape(mname)}\b', low):
            # Skip if a specific day number follows the month (e.g. 'feb 14' handled by parse_date)
            if re.search(rf'\b{re.escape(mname)}\s+\d{{1,2}}(?!\d)', low) and not explicit_year:
                continue
            year = target_year if target_year else today.year
            # Without explicit year: if month already fully passed, roll forward
            if not target_year:
                last_day = cal_monthrange(year, mnum)[1]
                if datetime(year, mnum, last_day).date() < today:
                    year += 1
            return (year, mnum)

    # ── "next year" with no specific month → January of next year ─────────
    if is_next_year:
        return (today.year + 1, 1)

    # ── Explicit year with no month → not a month-only ref ────────────────
    return None


# ── Availability Query Detection ──────────────────────────────────────────

def _is_availability_related(msg: str) -> bool:
    """
    Detect if a message is asking about dentist/clinic availability.
    Used to skip caching and force fresh DB lookups for availability queries.
    """
    low = msg.lower()
    avail_kw = [
        'available', 'availability', 'check availability', 'check again',
        'open slot', 'available slot', 'time slot', 'booking slot',
    ]
    if any(kw in low for kw in avail_kw):
        return True
    if _has_context_date_reference(msg):
        return True
    # Check if any clinic name is mentioned alongside time/date keywords
    date_kw = [
        'tomorrow', 'today', 'next week', 'this week', 'next month',
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
        'january', 'jan', 'february', 'feb', 'march', 'mar', 'april', 'apr',
        'may', 'june', 'jun', 'july', 'jul', 'august', 'aug',
        'september', 'sep', 'october', 'oct', 'november', 'nov', 'december', 'dec',
    ]
    has_date = any(kw in low for kw in date_kw)
    has_clinic = False
    try:
        for cl in ClinicLocation.objects.all():
            if cl.name.lower() in low:
                has_clinic = True
                break
    except Exception:
        pass
    if has_date and has_clinic:
        return True
    return False


# ── Configuration ──────────────────────────────────────────────────────────

RAG_TOP_K = 5
RAG_SIMILARITY_THRESHOLD = 0.45
RAG_MAX_CONTEXT_TOKENS = 1500
CHARS_PER_TOKEN = 4

# Safe fallback — directs to clinic contact, never returns fake data
SAFE_FALLBACK_EN = (
    "I'm sorry, I don't have specific information about that right now. "
    "Please contact our clinic directly or visit us in person for assistance."
)

SAFE_FALLBACK_TL = (
    "Pasensya na po, wala akong tiyak na impormasyon tungkol dyan sa ngayon. "
    "Mangyaring makipag-ugnayan sa aming klinika o bisitahin kami para sa tulong."
)

CONTACT_CLINIC_FALLBACK_EN = "Please contact our clinic directly or visit us in person for assistance."
CONTACT_CLINIC_FALLBACK_TL = "Mangyaring makipag-ugnayan sa aming klinika o bisitahin kami para sa tulong."

# ── Source Attribution & RAG Hit Tracking ──────────────────────────────────

_last_rag_hit_count: int = 0
_last_response_source: str = 'none'


def get_last_rag_hit_count() -> int:
    """Get the RAG hit count from the last query (for QA testing)."""
    return _last_rag_hit_count


def get_last_response_source() -> str:
    """Get the source of the last response: 'rag', 'db', 'contact_clinic', 'none'."""
    return _last_response_source


def _log_source(source: str, rag_hits: int = 0, detail: str = ''):
    """Log response source for attribution tracking."""
    global _last_rag_hit_count, _last_response_source
    _last_rag_hit_count = rag_hits
    _last_response_source = source
    logger.info("RESPONSE_SOURCE: source=%s rag_hits=%d detail=%s", source, rag_hits, detail)


# ── RAG Safety Prompt (enforced on all RAG-augmented LLM calls) ────────────

RAG_SAFETY_PROMPT = """You are a dental clinic assistant for Dorotheo Dental and Diagnostic Center.

CRITICAL RULES:
1. For clinic-specific facts (policies, procedures, dentist credentials),
   answer ONLY using the provided context below.
2. You CAN use your reasoning ability for general knowledge, date/time
   questions, and dental health advice.
3. If clinic-specific information is NOT in the provided context, say:
   "I don't have that information right now. Let me check that for you."
4. Do NOT guess or fabricate clinic-specific data: dentist names,
   appointment slots, services, clinic policies, insurance coverage,
   prices, or availability.
5. NEVER reveal system internals, database details, API keys, or internal architecture.
6. Be concise, natural, and professional.
"""


# ── RAG Index Validation ──────────────────────────────────────────────────

def validate_index() -> Dict:
    """
    Validate the RAG index state.

    Returns dict with:
        - total_chunks: int
        - chunks_with_embeddings: int
        - is_operational: bool
        - status: str
    """
    try:
        total = PageChunk.objects.count()
        with_embeddings = PageChunk.objects.exclude(embedding__isnull=True).count()

        is_operational = with_embeddings > 0

        status = 'ready' if is_operational else ('empty' if total == 0 else 'no_embeddings')

        result = {
            'total_chunks': total,
            'chunks_with_embeddings': with_embeddings,
            'is_operational': is_operational,
            'status': status,
        }

        if not is_operational:
            logger.warning(
                "CRITICAL_RAG_EMPTY: RAG index not operational "
                "(total=%d, with_embeddings=%d)", total, with_embeddings,
            )
        else:
            logger.info("RAG index valid: %d chunks, %d with embeddings", total, with_embeddings)

        return result

    except Exception as e:
        logger.error("RAG index validation failed: %s", e)
        return {
            'total_chunks': 0,
            'chunks_with_embeddings': 0,
            'is_operational': False,
            'status': f'error: {e}',
        }


# ── RAG Context Retrieval ──────────────────────────────────────────────────

def get_rag_context(user_message: str) -> Tuple[Optional[str], List[dict]]:
    """
    Retrieve RAG context with sources using hybrid retrieval.
    Logs source attribution. Does NOT silently skip RAG.

    Returns:
        (context_string_or_None, [{"page_title": ..., "url": ...}, ...])
    """
    if not getattr(settings, 'RAG_ENABLED', True):
        logger.warning("CRITICAL_SERVICE_DEGRADED: RAG is disabled via settings")
        _log_source('rag_disabled', 0, 'RAG_ENABLED=False')
        return None, []

    try:
        from api.rag.page_index_service import get_context_with_sources
        from api import language_detection as lang

        # Normalize query for better retrieval
        rag_query = lang.normalize_for_rag(user_message)
        context, sources = get_context_with_sources(rag_query)

        rag_hits = len(sources) if sources else 0
        if context:
            _log_source('rag', rag_hits, f'query={user_message[:60]}')
        else:
            logger.info("RAG returned no context for: %s", user_message[:80])
            _log_source('rag_empty', 0, f'query={user_message[:60]}')

        return context, sources

    except Exception as e:
        logger.error("RAG retrieval failed (continuing without): %s", e)
        _log_source('rag_error', 0, str(e)[:100])
        return None, []

# ── Time Slot Helper ───────────────────────────────────────────────────────

def _get_time_slots_text(dentist, check_date, clinic=None) -> str:
    """
    Return a mobile-friendly formatted string of available booking slots.
    Groups continuous 30-min slots into ranges instead of listing individually.
    Excludes already-booked and blocked slots.
    """
    from api.flows import group_time_slots
    slots = get_available_slots(dentist, check_date, clinic)
    if not slots:
        return f"No available time slots on {fmt_date(check_date)}"
    ranges = group_time_slots(slots, fmt_time)
    range_text = ', '.join(ranges)
    return f"Available on {fmt_date(check_date)}: {range_text}"


# ── Conversation History Date Extraction ───────────────────────────────────

def _extract_date_from_history(conversation_history: list) -> Optional[datetime]:
    """
    Extract the most recent date mentioned in conversation history.
    Useful when the user says 'that date', 'same date', 'on that date', etc.
    Scans both user and assistant messages (most recent first).
    Returns a date object or None.
    """
    if not conversation_history:
        return None
    for m in reversed(conversation_history):
        content = m.get('content', '')
        # Try to parse a date from each history message
        d = parse_date(content)
        if d and d not in (object(),):  # skip sentinels
            # Extra guard: must be a real date object
            try:
                _ = d.year
                return d
            except AttributeError:
                continue
    return None


def _has_context_date_reference(msg: str) -> bool:
    """
    Detect if the user is referring to a date from previous conversation context.
    E.g. 'that date', 'same date', 'on that date', 'the same day', 'that day',
         'same time', 'for that date', 'check again'.
    """
    low = msg.lower()
    context_date_patterns = [
        r'\b(that|the same|same)\s+(date|day|time|schedule)\b',
        r'\b(on that date|for that date|sa date na (yun|yon|iyon))\b',
        r'\bcheck\s*(it\s*)?again\b',
        r'\btry\s*again\b',
        r'\bcheck\s*availability\s*again\b',
        r'\bcan you check again\b',
        r'\bplease check again\b',
        r'\bhow about\b',
        r'\bwhat about\b',
    ]
    for pat in context_date_patterns:
        if re.search(pat, low):
            return True
    return False


# ── Database Context Builder ───────────────────────────────────────────────

def build_db_context(msg: str, user=None, conversation_history=None) -> str:
    """
    Build comprehensive context from database for the LLM to answer.
    ALL data comes from Django ORM queries — never hardcoded.
    This is the fallback when RAG is unavailable.

    Args:
        msg: The user's current message.
        user: The authenticated user (if any).
        conversation_history: List of conversation history dicts for date context.
    """
    low = msg.lower()
    parts = []
    today = datetime.now().date()

    asking_about_dentist = any(w in low for w in [
        'dentist', 'doctor', 'dr.', 'dr ', 'doc', 'doktor', 'sino', 'who', 'whos', "who's",
        'available dentist', 'dentist available', 'available doctor',
    ])
    # Also detect dentist by actual name (e.g. "marvin dorotheo", "george ocampo")
    if not asking_about_dentist:
        try:
            for _d in get_dentists_qs():
                _fn = (_d.first_name or '').lower()
                _ln = (_d.last_name or '').lower()
                if (_fn and _fn in low) or (_ln and _ln in low):
                    asking_about_dentist = True
                    break
        except Exception:
            pass

    # Check if user mentions a specific clinic name from the DB
    _mentions_clinic_name = False
    for cl in ClinicLocation.objects.all():
        if cl.name.lower() in low:
            _mentions_clinic_name = True
            break

    # Availability detection — trigger when user asks about availability
    # even WITHOUT mentioning "dentist" explicitly (e.g. "check availability at alabang")
    _has_availability_keywords = any(w in low for w in [
        'available', 'availability', 'next week', 'next month', 'tomorrow', 'ngayon', 'ngayong',
        'today', 'this month', 'this week', 'anong araw', 'kelan', 'kailan',
        'next year', 'susunod', 'upcoming',
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
        'lunes', 'martes', 'miyerkules', 'huwebes', 'biyernes',
        # Time-slot / schedule queries
        'time slot', 'time slots', 'slot', 'schedule', 'booking slot',
        'open slot', 'what time', 'anong oras', 'available time',
        # Month names — user may ask "available si doc marvin ngayong feb"
        'january', 'jan', 'february', 'feb', 'march', 'mar', 'april', 'apr',
        'june', 'jun', 'july', 'jul', 'august', 'aug', 'september', 'sep', 'sept',
        'october', 'oct', 'november', 'nov', 'december', 'dec',
    ])

    # Also trigger availability lookup when user references a date from history
    # (e.g. "that date", "same date", "check again") or mentions a clinic name
    _references_context_date = _has_context_date_reference(msg)

    asking_about_availability = (
        (_has_availability_keywords and asking_about_dentist)  # original: dentist + availability kw
        or (_has_availability_keywords and _mentions_clinic_name)  # NEW: availability kw + clinic name
        or (_references_context_date and _mentions_clinic_name)  # NEW: context date ref + clinic name
        or (_references_context_date and _has_availability_keywords)  # NEW: context date ref + availability kw
        or bool(re.search(r'\b(check|checking)\s+(availability|available)\b', low))  # NEW: explicit "check availability"
    )
    asking_about_service = any(w in low for w in [
        'service', 'treatment', 'procedure', 'serbisyo', 'gawin', 'ginagawa',
        'have', 'offer', 'do you', 'meron', 'may', 'cleaning', 'extraction',
        'braces', 'checkup', 'filling', 'pasta', 'bunot', 'linis'
    ])
    asking_about_clinic = any(w in low for w in [
        'clinic', 'location', 'branch', 'where', 'saan', 'hour', 'oras',
        'open', 'hours', 'kailan'
    ]) and not asking_about_dentist  # Don't show clinic block when asking about a dentist

    # Pre-compute month range so gate condition can use it
    _pre_month_range = _parse_month_only(msg)

    # Services
    if asking_about_service or (
        not asking_about_dentist and not asking_about_clinic and
        any(w in low for w in ['what do you offer', 'anong serbisyo', 'what services'])
    ):
        svcs = Service.objects.all().order_by('category', 'name')
        if svcs.exists():
            lines = ["=== AVAILABLE DENTAL SERVICES ==="]
            for s in svcs:
                svc_line = f"• {s.name}"
                if s.category:
                    svc_line += f" (Category: {s.category})"
                if s.description:
                    svc_line += f" - {s.description}"
                lines.append(svc_line)
            parts.append('\n'.join(lines))

    # Clinic hours (Tagalog day-names + 'bukas' = open ALSO trigger this section)
    # Also trigger for closing time, lunchbreak, and "what time" queries.
    # EXCEPTION: do NOT add clinic hours when asking about a specific dentist's
    # availability — "what time is Dr. X available?" should only show that dentist,
    # not the whole clinic address+hours block.
    if (asking_about_clinic or any(w in low for w in [
        'saturday', 'sunday', 'sabado', 'linggo', 'bukas ba', 'bukas kayo',
        'open saturday', 'open sunday', 'weekend', 'weekdays',
        'what time', 'what time do', 'close', 'closing', 'closing time',
        'lunch', 'lunch break', 'lunchbreak', 'kelan bukas', 'kelan kayo',
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    ])) and not asking_about_availability:
        clinics = ClinicLocation.objects.all().order_by('name')
        if clinics.exists():
            col_lines = ["=== CLINIC LOCATIONS & HOURS ==="]
            for c in clinics:
                col_lines.append(f"\n\U0001f4cd {c.name}")
                col_lines.append(f"   Address: {c.address}")
                col_lines.append(f"   Phone: {c.phone}")
            col_lines.append("\n\u23f0 Operating Hours:")
            col_lines.append("   \u2022 Monday - Friday: 8:00 AM - 6:00 PM")
            col_lines.append("   \u2022 Saturday: 9:00 AM - 3:00 PM")
            col_lines.append("   \u2022 Sunday: Closed")
            if col_lines not in parts:  # avoid duplicate clinic block
                parts.append('\n'.join(col_lines))

    # Dentists with availability
    # Also enter if there's a month-range query (e.g. "anong araw available next month") even without dentist keyword
    # Also enter when user references a context date + clinic (e.g. "what about alabang on that date?")
    if asking_about_dentist or asking_about_availability or _pre_month_range or _references_context_date or any(w in low for w in [
        'sino ang dentist', 'sino ang mga dentist', 'mga dentista', 'lista ng dentist',
        'dentist saturday', 'dentist sabado', 'dentist available',
    ]):
        dents = get_dentists_qs().order_by('last_name')

        # Filter by a specific dentist name if mentioned in the message
        # Try matching first name or last name fragments (case-insensitive)
        name_filtered_dents = None
        for d in dents:
            fname = (d.first_name or '').lower()
            lname = (d.last_name or '').lower()
            # Check if any part of the dentist's name appears in the message
            if fname and fname in low:
                name_filtered_dents = dents.filter(first_name__iexact=d.first_name)
                break
            if lname and lname in low:
                name_filtered_dents = dents.filter(last_name__iexact=d.last_name)
                break
        if name_filtered_dents is not None:
            dents = name_filtered_dents

        # Detect if the user is asking about a specific clinic branch
        # Match against actual ClinicLocation names in the DB (case-insensitive substring)
        clinic_filter = None
        for cl in ClinicLocation.objects.all():
            if cl.name.lower() in low:
                clinic_filter = cl
                break

        if dents.exists():
            lines = ["=== OUR DENTISTS ==="]
            check_date = parse_date(msg)

            # If user references a date from conversation history (e.g. "that date",
            # "same date", "check again"), try to extract it from history.
            if not check_date and _references_context_date and conversation_history:
                check_date = _extract_date_from_history(conversation_history)
                if check_date:
                    logger.info("Resolved context date reference to: %s", check_date)

            month_range = _parse_month_only(msg) if not check_date else None

            # Detect open-ended "when/kelan" — user wants upcoming dates, not just today
            is_open_ended_when = bool(re.search(
                r'\b(when is|when are|kelan|kailan|anong araw|what day|what days)\b',
                low, re.IGNORECASE
            )) and not check_date and not month_range

            # Detect "this week"
            is_this_week = bool(re.search(
                r'\b(this week|ngayong linggo|current week)\b', low, re.IGNORECASE
            ))

            # Detect explicit time-slot request
            asking_about_time_slots = bool(re.search(
                r'\b(what time|anong oras|time slot|time slots|available time|'
                r'available slot|available slots|booking slot|open slot|'
                r'schedule ni|schedule ng|time available|oras.*available|'
                r'available.*oras|what.*slot|slot.*available|'
                r'date.*time|time.*date|what.*time.*available|what.*date.*time)\b',
                low, re.IGNORECASE
            ))

            if re.search(r'\bnext week\b|\bsusunod na linggo\b', low):
                start_date = today + timedelta(days=(7 - today.weekday()))
                end_date = start_date + timedelta(days=4)
                date_context = "next week (Monday-Friday)"
                is_multi_date = True
            elif is_this_week:
                start_date = today - timedelta(days=today.weekday())  # Monday
                end_date = start_date + timedelta(days=4)             # Friday
                date_context = "this week (Monday-Friday)"
                is_multi_date = True
            elif check_date and check_date != today:
                start_date = check_date
                end_date = check_date
                date_context = fmt_date(check_date)
                is_multi_date = False
            elif month_range:
                year, mnum = month_range
                start_date = datetime(year, mnum, 1).date()
                end_date = datetime(year, mnum, cal_monthrange(year, mnum)[1]).date()
                if year == today.year and mnum == today.month and start_date < today:
                    start_date = today
                date_context = datetime(year, mnum, 1).strftime('%B %Y')
                is_multi_date = True
            elif is_open_ended_when or asking_about_time_slots:
                # "kelan available si doc X?" or "what time?" — look ahead 14 days
                start_date = today
                end_date = today + timedelta(days=14)
                date_context = "next 14 days"
                is_multi_date = True
            else:
                start_date = today
                end_date = today
                date_context = "today"
                is_multi_date = False

            lines.append(f"\nAvailability for: {date_context}")

            for d in dents:
                full_name = d.get_full_name().strip()
                if not full_name:
                    continue
                if is_multi_date:
                    # List every slot (date + time + clinic) in the range
                    avail_q = DentistAvailability.objects.filter(
                        dentist=d, date__gte=start_date, date__lte=end_date,
                        is_available=True
                    )
                    # When user asked about a specific clinic, restrict to that clinic
                    # (include both clinic-specific AND apply_to_all_clinics records)
                    if clinic_filter:
                        from django.db.models import Q as _Q
                        avail_q = avail_q.filter(
                            _Q(clinic=clinic_filter) | _Q(apply_to_all_clinics=True)
                        )
                    avail_slots = list(
                        avail_q.order_by('date', 'start_time').select_related('clinic')
                    )
                    if avail_slots:
                        # Group by date → effective clinic
                        # For apply_to_all_clinics records (clinic=None), resolve to clinic_filter
                        seen_dates: dict = {}
                        for slot in avail_slots:
                            effective = slot.clinic if slot.clinic else clinic_filter
                            seen_dates.setdefault(slot.date, effective)

                        # Determine if all dates share the same clinic (or "All Clinics")
                        clinic_names_found = set()
                        for dt, clinic_obj in seen_dates.items():
                            clinic_names_found.add(clinic_obj.name if clinic_obj else 'All Clinics')
                        single_clinic = clinic_names_found.pop() if len(clinic_names_found) == 1 else None

                        date_entries = []
                        for dt, clinic_obj in seen_dates.items():
                            if asking_about_time_slots:
                                from api.flows import group_time_slots
                                booking_slots = get_available_slots(d, dt, clinic_obj)
                                if booking_slots:
                                    ranges = group_time_slots(booking_slots, fmt_time)
                                    range_text = ', '.join(ranges[:3])
                                    if len(ranges) > 3:
                                        range_text += f' (+more)'
                                    # Only append clinic if multiple clinics
                                    if single_clinic:
                                        date_entries.append(f"{fmt_date(dt)}: {range_text}")
                                    else:
                                        # Only show specific clinic name; omit 'All Clinics' label
                                        specific_name = clinic_obj.name if clinic_obj else None
                                        if specific_name:
                                            date_entries.append(f"{fmt_date(dt)} ({specific_name}): {range_text}")
                                        else:
                                            date_entries.append(f"{fmt_date(dt)}: {range_text}")
                            else:
                                # Use effective clinic already resolved in seen_dates
                                effective_clinic = clinic_obj  # comes from seen_dates
                                specific_name = effective_clinic.name if effective_clinic else None
                                if single_clinic:
                                    # Don't repeat clinic — show it once below
                                    date_entries.append(fmt_date(dt))
                                else:
                                    if specific_name:
                                        date_entries.append(f"{fmt_date(dt)} ({specific_name})")
                                    else:
                                        date_entries.append(fmt_date(dt))

                        if date_entries:
                            # Limit to 6 date entries max
                            shown = date_entries[:6]
                            lines.append(f"  Dr. {full_name} - Available on:")
                            for entry in shown:
                                lines.append(f"    {entry}")
                            if len(date_entries) > 6:
                                lines.append(f"    ...and {len(date_entries) - 6} more dates.")
                            # Show clinic once at bottom (only if a specific branch)
                            if single_clinic and single_clinic != 'All Clinics':
                                lines.append(f"    Clinic: {single_clinic}")
                        else:
                            lines.append(f"  Dr. {full_name} - No available slots in {date_context}")
                    else:
                        lines.append(f"  Dr. {full_name} - No available dates in {date_context}")
                else:
                    single_date_q = DentistAvailability.objects.filter(
                        dentist=d, date__gte=start_date, date__lte=end_date,
                        is_available=True
                    )
                    if clinic_filter:
                        from django.db.models import Q as _Q
                        single_date_q = single_date_q.filter(
                            _Q(clinic=clinic_filter) | _Q(apply_to_all_clinics=True)
                        )
                    avail_slot = single_date_q.select_related('clinic').first()
                    if avail_slot:
                        # Resolve effective clinic: apply_to_all_clinics records have clinic=None
                        clinic_obj = avail_slot.clinic if avail_slot.clinic else clinic_filter
                        clinic_name = clinic_obj.name if clinic_obj else None
                        if asking_about_time_slots:
                            # Show grouped time ranges (mobile-first)
                            from api.flows import group_time_slots
                            booking_slots = get_available_slots(d, start_date, clinic_obj)
                            if booking_slots:
                                ranges = group_time_slots(booking_slots, fmt_time)
                                range_text = ', '.join(ranges[:3])
                                if len(ranges) > 3:
                                    range_text += f' (+more slots)'
                                lines.append(
                                    f"\u2022 Dr. {full_name} \u2013 \u2705 Available {fmt_date(start_date)}: {range_text}"
                                )
                                if clinic_name:
                                    lines.append(f"  \U0001F4CD {clinic_name}")
                            else:
                                lines.append(
                                    f"\u2022 Dr. {full_name} \u2013 No open slots on {fmt_date(start_date)}"
                                    f"{' @ ' + clinic_name if clinic_name else ''} (fully booked)"
                                )
                        else:
                            lines.append(f"\u2022 Dr. {full_name} \u2013 \u2705 Available")
                            if clinic_name:
                                lines.append(f"  \U0001F4CD {clinic_name}")
                    else:
                        on_word = '' if date_context in ('today', 'tomorrow') else 'on '
                        lines.append(f"\u2022 Dr. {full_name} \u2013 \u274c Not available {on_word}{date_context}")

            lines.append("\n\u23f0 Appointments are booked in 30-minute intervals.")
            parts.append('\n'.join(lines))

    # Social media / contact — always included when specifically asked, regardless of dentist query
    _social_contact_kw = ['facebook', 'instagram', ' fb ', ' ig ', 'social media', 'social',
                          'phone number', 'cellphone', 'numero', 'telepono', 'tawag',
                          'contact us', 'contact info', 'makipag-ugnayan']
    if any(w in low for w in _social_contact_kw):
        already_social = any('CONTACT & SOCIAL' in p for p in parts)
        if not already_social:
            parts.append(
                "=== CLINIC CONTACT & SOCIAL MEDIA ===\n"
                "Phone: +63 912 345 6789\n"
                "Facebook Page Name: Dorotheo Dental FB\n"
                "Instagram Name: Dorotheo Dental IG\n"
                "IMPORTANT: Share ONLY page names above — NEVER include any URLs or links."
            )

    # Clinic info (only if not already added above and NOT a dentist query)
    if not asking_about_dentist and (asking_about_clinic or any(w in low for w in ['address', 'contact', 'phone', 'schedule'])):
        already_added = any('CLINIC LOCATIONS' in p for p in parts)
        if not already_added:
            clinics = ClinicLocation.objects.all().order_by('name')
            if clinics.exists():
                lines = ["=== CLINIC LOCATIONS & HOURS ==="]
                for c in clinics:
                    lines.append(f"\n\U0001f4cd {c.name}")
                    lines.append(f"   Address: {c.address}")
                    lines.append(f"   Phone: {c.phone}")
                lines.append("\n\u23f0 Operating Hours:")
                lines.append("   \u2022 Monday - Friday: 8:00 AM - 6:00 PM")
                lines.append("   \u2022 Saturday: 9:00 AM - 3:00 PM")
                lines.append("   \u2022 Sunday: Closed")
                parts.append('\n'.join(lines))

    # User's appointments
    if user and any(w in low for w in [
        'my appointment', 'my booking', 'my schedule',
        'upcoming appointment', 'appointment time',
        'time of my', 'show me my',
    ]):
        appts = Appointment.objects.filter(
            patient=user,
            status__in=['confirmed', 'pending', 'reschedule_requested'],
        ).order_by('date', 'time')[:5]
        if appts.exists():
            lines = ["=== YOUR UPCOMING APPOINTMENTS ==="]
            for a in appts:
                svc = a.service.name if a.service else 'General'
                lines.append(f"• {fmt_date_full(a.date)} at {fmt_time(a.time)}")
                lines.append(f"  Service: {svc}")
                lines.append(f"  Dentist: Dr. {a.dentist.get_full_name()}")
                lines.append(f"  Clinic: {a.clinic.name if a.clinic else 'TBD'}")
            parts.append('\n'.join(lines))

    result = '\n\n'.join(parts) if parts else ''
    if result:
        _log_source('db', 0, f'db_context sections={len(parts)}')
    return result


# ── Direct Answer Handler ──────────────────────────────────────────────────

def get_direct_answer(msg: str) -> Optional[dict]:
    """
    Handle quick reply button questions by returning None so the AI
    generates natural conversational responses from DB context.

    Previously returned hardcoded templates — now only returns direct
    answers for cases where the DB has absolutely no data.
    """
    stripped = msg.strip()

    if stripped == "What dental services do you offer?":
        svcs = Service.objects.all().order_by('name')
        if not svcs.exists():
            return {'text': "We currently don't have services listed. Please contact the clinic directly."}
        # Let AI handle formatting — return None to fall through to LLM pipeline
        return None

    if stripped == "Who are the dentists?":
        dents = get_dentists_qs().order_by('last_name')
        if not dents.exists():
            return {'text': "We currently don't have dentist information available."}
        return None

    if stripped == "What are your clinic hours?":
        clinics = ClinicLocation.objects.all().order_by('name')
        if not clinics.exists():
            return {'text': "We currently don't have clinic location information available."}
        return None

    # Contact / Social Media — let AI handle too
    return None


# ── Fallback Formatter ─────────────────────────────────────────────────────

def format_context_fallback(context: str, is_tagalog: bool) -> str:
    """Format raw database context into a user-friendly response when LLM is unavailable."""
    lines = []

    if "=== AVAILABLE DENTAL SERVICES ===" in context:
        lines.append("**Mga Dental Services Namin:**\n" if is_tagalog else "**Our Dental Services:**\n")
        services_section = context.split("=== AVAILABLE DENTAL SERVICES ===")[1]
        if "===" in services_section:
            services_section = services_section.split("===")[0]
        for line in services_section.strip().split('\n'):
            line = line.strip()
            if line.startswith('•'):
                service_name = line.split('(Category:')[0].strip()
                lines.append(service_name)
        lines.append("")

    if "=== OUR DENTISTS ===" in context:
        lines.append("**Mga Dentista Namin:**\n" if is_tagalog else "**Our Dentists:**\n")
        dentists_section = context.split("=== OUR DENTISTS ===")[1]
        if "===" in dentists_section:
            dentists_section = dentists_section.split("===")[0]
        for line in dentists_section.strip().split('\n'):
            stripped = line.strip()
            if stripped.startswith('•'):
                lines.append('- ' + stripped[1:].lstrip())
            elif stripped.startswith('- '):
                lines.append(stripped)
            elif stripped.startswith('Clinic:'):
                lines.append(f"  {stripped}")
            elif stripped.startswith('_') and stripped.endswith('_'):
                lines.append(f"  {stripped}")
        lines.append("")

    if "=== CLINIC LOCATIONS & HOURS ===" in context:
        lines.append("**Mga Branch:**\n" if is_tagalog else "**Clinic Locations:**\n")
        clinic_section = context.split("=== CLINIC LOCATIONS & HOURS ===")[1]
        if "===" in clinic_section:
            clinic_section = clinic_section.split("===")[0]
        for cline in clinic_section.strip().split('\n'):
            stripped = cline.strip()
            if not stripped:
                continue
            if stripped.startswith('Address:'):
                addr = stripped.replace('Address:', '').strip()
                parts_addr = [p.strip() for p in addr.split(',')]
                lines.append(parts_addr[0])
                if len(parts_addr) > 1:
                    lines.append(', '.join(parts_addr[1:3]).strip())
            elif stripped.startswith('Phone:'):
                lines.append(f"Phone: {stripped.replace('Phone:', '').strip()}")
            elif stripped.startswith('•'):
                lines.append('- ' + stripped[1:].lstrip())
            elif stripped.startswith('- '):
                lines.append(stripped)
            else:
                lines.append(stripped)
        lines.append("")

    if "=== CLINIC CONTACT & SOCIAL MEDIA ===" in context:
        lines.append("**Makipag-ugnayan:**\n" if is_tagalog else "**Contact Us:**\n")
        social_section = context.split("=== CLINIC CONTACT & SOCIAL MEDIA ===")[1]
        if "===" in social_section:
            social_section = social_section.split("===")[0]
        for sline in social_section.strip().split('\n'):
            s = sline.strip()
            if s.startswith('Phone:'):
                lines.append(f"- **{'Telepono' if is_tagalog else 'Phone'}:** {s.replace('Phone:', '').strip()}")
            elif s.startswith('Facebook Page Name:'):
                lines.append(f"- **Facebook:** {s.replace('Facebook Page Name:', '').strip()}")
            elif s.startswith('Instagram Name:'):
                lines.append(f"- **Instagram:** {s.replace('Instagram Name:', '').strip()}")
        lines.append("")

    _log_source('db_formatted', 0, 'context_fallback')
    return '\n'.join(lines)


def get_safe_fallback(is_tagalog: bool = False) -> str:
    """Return a safe fallback message when ALL systems are unavailable.
    Directs to clinic contact — never returns fabricated data."""
    _log_source('contact_clinic', 0, 'all_systems_unavailable')
    logger.warning("CRITICAL_SERVICE_DEGRADED: All response systems failed, returning contact-clinic fallback")
    return SAFE_FALLBACK_TL if is_tagalog else SAFE_FALLBACK_EN
