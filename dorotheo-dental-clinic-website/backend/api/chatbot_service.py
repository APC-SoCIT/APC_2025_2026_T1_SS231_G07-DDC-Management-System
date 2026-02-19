"""
Google Gemini AI Chatbot Service for Dorotheo Dental Clinic
AI Sage – Dental Scheduling Master with Smart Routing
"""

import google.generativeai as genai
import os
from dotenv import load_dotenv
import re
from datetime import datetime, timedelta, time as time_obj
from django.db.models import Q
from .models import (
    Service, Appointment, User, DentistAvailability,
    ClinicLocation, BlockedTimeSlot,
)
from .views import create_appointment_notification, create_patient_notification

# ── Utility helpers ────────────────────────────────────────────────────────

def _fmt_time(t):
    """Format a time object to '9:00 AM' style."""
    return t.strftime('%I:%M %p').lstrip('0')


def _fmt_date(d):
    """Format a date object to 'Monday, February 09'."""
    return d.strftime('%A, %B %d')


def _fmt_date_full(d):
    """Format a date object to 'Monday, February 09, 2026'."""
    return d.strftime('%A, %B %d, %Y')


def _dentists_qs():
    """Queryset of all dentist-role users (staff dentists + owner)."""
    return User.objects.filter(
        Q(user_type='staff', role='dentist') | Q(user_type='owner')
    )


def _generate_slots(start, end, duration_minutes=30):
    """Yield datetime objects from *start* to *end* in *duration* steps."""
    cur = datetime.combine(datetime.today(), start)
    finish = datetime.combine(datetime.today(), end)
    while cur < finish:
        yield cur.time()
        cur += timedelta(minutes=duration_minutes)


def _booked_times(dentist, date):
    """Return set of 'HH:MM' strings already booked for *dentist* on *date*."""
    return set(
        Appointment.objects.filter(
            dentist=dentist, date=date,
            status__in=['confirmed', 'pending', 'reschedule_requested'],
        ).values_list('time', flat=True)
    )


def _blocked_ranges(date, clinic=None):
    """Return list of (start, end) time tuples for blocked slots."""
    qs = BlockedTimeSlot.objects.filter(date=date)
    if clinic:
        qs = qs.filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True))
    return [(b.start_time, b.end_time) for b in qs]


def _is_blocked(slot_time, blocked):
    for bs, be in blocked:
        if bs <= slot_time < be:
            return True
    return False


def _available_slots(dentist, date, clinic=None):
    """
    Return list of available time() objects for a dentist on a date at a clinic.
    Respects DentistAvailability, existing bookings, and blocked slots.
    """
    avail_qs = DentistAvailability.objects.filter(
        dentist=dentist, date=date, is_available=True,
    )
    if clinic:
        avail_qs = avail_qs.filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True))

    avail = avail_qs.first()
    if not avail:
        return []

    booked = _booked_times(dentist, date)
    blocked = _blocked_ranges(date, clinic)

    slots = []
    for t in _generate_slots(avail.start_time, avail.end_time):
        t_str = t.strftime('%H:%M')
        if t_str not in {str(bt)[:5] for bt in booked} and not _is_blocked(t, blocked):
            slots.append(t)
    return slots


def _dentists_with_openings(clinic, start_date, look_days=14):
    """Return dentists who have ≥1 open slot at *clinic* within *look_days*."""
    end_date = start_date + timedelta(days=look_days)
    dentists = _dentists_qs()
    result = []
    for d in dentists:
        avails = DentistAvailability.objects.filter(
            dentist=d, date__gte=start_date, date__lte=end_date,
            is_available=True,
        ).filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True))
        for av in avails:
            if _available_slots(d, av.date, clinic):
                result.append(d)
                break
    return result


def _patient_has_appointment_this_week(patient, ref_date):
    """True if patient already has a non-cancelled appointment in the same ISO week."""
    iso = ref_date.isocalendar()
    week_start = ref_date - timedelta(days=ref_date.weekday())
    week_end = week_start + timedelta(days=6)
    return Appointment.objects.filter(
        patient=patient,
        date__gte=week_start,
        date__lte=week_end,
        status__in=['confirmed', 'pending'],
    ).exists()


# ── Parse helpers ──────────────────────────────────────────────────────────

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


def _parse_date(msg):
    today = datetime.now().date()
    low = msg.lower()
    # English & Tagalog & Taglish
    if 'today' in low or 'ngayon' in low:
        return today
    if 'tomorrow' in low or 'bukas' in low:
        return today + timedelta(days=1)
    if 'the day after tomorrow' in low or 'samakalawa' in low or 'makalawa' in low:
        return today + timedelta(days=2)
    # Tagalog: "next week" / "susunod na linggo"
    if 'next week' in low or 'susunod na linggo' in low:
        return today + timedelta(days=(7 - today.weekday()))  # next Monday
    # Month + day
    for mname, mnum in MONTHS.items():
        m = re.search(rf'{mname}\s+(\d{{1,2}})', low)
        if m:
            day = int(m.group(1))
            year = today.year
            try:
                d = datetime(year, mnum, day).date()
                if d < today:
                    d = datetime(year + 1, mnum, day).date()
                return d
            except ValueError:
                continue
    # MM/DD
    m = re.search(r'(\d{1,2})[/-](\d{1,2})', msg)
    if m:
        try:
            d = datetime(today.year, int(m.group(1)), int(m.group(2))).date()
            if d < today:
                d = datetime(today.year + 1, int(m.group(1)), int(m.group(2))).date()
            return d
        except ValueError:
            pass
    # Day of week
    for dname, dnum in DAYS_OF_WEEK.items():
        if dname in low:
            ahead = (dnum - today.weekday()) % 7 or 7
            return today + timedelta(days=ahead)
    return None


def _parse_time(msg):
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
    # Tagalog time: "9 ng umaga", "3 ng hapon", "tanghali" (noon)
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
    return None


def _find_dentist(msg):
    """Match dentist from message. Supports Dr./Doc prefix and partial last-name matching."""
    low = msg.lower()
    
    # Try exact "Dr. FullName" style first
    for d in _dentists_qs():
        full = d.get_full_name().lower()
        last = d.last_name.lower() if d.last_name else ''
        first = d.first_name.lower() if d.first_name else ''
        patterns = [
            f'dr. {full}', f'dr {full}', f'doctor {full}', f'doc {full}',
            f'dr. {last}', f'dr {last}', f'doctor {last}', f'doc {last}',
        ]
        if any(p in low for p in patterns):
            return d
    
    # Fallback: match just the last name if "dr/doc/doctor" prefix is present
    has_prefix = any(p in low for p in ['dr.', 'dr ', 'doc ', 'doctor '])
    if has_prefix:
        for d in _dentists_qs():
            last = d.last_name.lower() if d.last_name else ''
            if last and last in low:
                return d
    
    return None


def _find_clinic(msg):
    low = msg.lower()
    for c in ClinicLocation.objects.all():
        if c.name.lower() in low:
            return c
    # Partial matching: check if key location words appear (e.g. "bacoor", "alabang", "poblacion")
    for c in ClinicLocation.objects.all():
        # Split clinic name and check if any significant word (>3 chars) matches
        for word in c.name.lower().split():
            if len(word) > 3 and word not in ('dental', 'clinic', 'dorotheo') and word in low:
                return c
    return None


def _find_service(msg):
    low = msg.lower()
    
    # Common aliases first (explicit intent - more reliable)
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
    
    # Check aliases first (more explicit and reliable)
    for svc_name, aliases in SERVICE_ALIASES.items():
        if any(alias in low for alias in aliases):
            # Try to find matching service in DB
            match = Service.objects.filter(name__icontains=svc_name).first()
            if match:
                return match
    
    # Exact name match with word boundaries (stricter - only as fallback)
    # This prevents accidental matches on common short words
    for s in Service.objects.all():
        sname = s.name.lower()
        # Only match if it appears as a distinct word/phrase, not buried in another word
        # Require either: start of string, or preceded by space/punctuation
        # and either: end of string, or followed by space/punctuation
        pattern = r'(?:^|[\s,.:;!?-])' + re.escape(sname) + r'(?:$|[\s,.:;!?-])'
        if re.search(pattern, low):
            return s
    
    return None


# ── Flow state helpers ─────────────────────────────────────────────────────

def _last_assistant(history, n=3):
    """Return last *n* assistant messages (most-recent first)."""
    return [m['content'] for m in reversed(history or []) if m.get('role') == 'assistant'][:n]


def _step_tag(history, tag):
    """True if any recent assistant message contains *tag*."""
    return any(tag in m for m in _last_assistant(history, 6))


# ═══════════════════════════════════════════════════════════════════════════
# Main service class
# ═══════════════════════════════════════════════════════════════════════════

class DentalChatbotService:
    """
    AI Sage – Dental Scheduling Master with Smart Routing.
    Handles Booking (5-step), Rescheduling (locked-dentist/service),
    Cancellation (soft), and general Q&A via Gemini.
    """

    MODEL_NAME = "models/gemini-2.5-flash"

    RESTRICTED_KW = [
        'password', 'admin', 'database', 'secret', 'token', 'credential',
        'api key', 'private key', 'connection string', 'sql', 'delete',
        'drop table', 'django admin', 'superuser', 'staff password',
    ]

    # ── init ──────────────────────────────────────────────────────────────

    def __init__(self, user=None):
        self.user = user
        self.is_authenticated = user is not None
        load_dotenv()  # This loads the variables from .env
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(self.MODEL_NAME)

    # ── pending request lock ───────────────────────────────────────────────

    def _check_pending_requests(self):
        """Check if patient has any pending reschedule or cancellation requests.
        Returns a reply dict if blocked, or None if clear to proceed.
        Enforces: No booking, rescheduling, or cancelling while a request is pending.
        """
        if not self.is_authenticated:
            return None

        pending_reschedule = Appointment.objects.filter(
            patient=self.user,
            status='reschedule_requested'
        ).exists()

        pending_cancel = Appointment.objects.filter(
            patient=self.user,
            status='cancel_requested'
        ).exists()

        if pending_reschedule:
            return self._reply(
                "🚫 You cannot book, reschedule, or cancel while a reschedule request is pending.\n\n"
                "Please wait for staff/owner to review and confirm your pending reschedule request "
                "before taking any new action.",
                tag='[PENDING_BLOCK]'
            )

        if pending_cancel:
            return self._reply(
                "🚫 You cannot book, reschedule, or cancel while a cancellation request is pending.\n\n"
                "Please wait for staff/owner to review and confirm your pending cancellation request "
                "before taking any new action.",
                tag='[PENDING_BLOCK]'
            )

        return None

    def _was_just_unblocked(self, hist):
        """True if the last assistant message was a PENDING_BLOCK but
        the patient no longer has any pending requests (i.e. staff approved it).
        This means we should welcome them back to the main menu."""
        if not self.is_authenticated:
            return False
        last_msg = _last_assistant(hist, 1)
        if not last_msg or '[PENDING_BLOCK]' not in last_msg[0]:
            return False
        # They WERE blocked — check if they're still blocked
        still_pending = Appointment.objects.filter(
            patient=self.user,
            status__in=['reschedule_requested', 'cancel_requested']
        ).exists()
        return not still_pending

    # ── public entry point ────────────────────────────────────────────────

    def get_response(self, user_message, conversation_history=None):
        try:
            # Security gate
            if not self._is_safe(user_message):
                return self._reply(
                    "I can't provide information about system credentials or "
                    "private data. I'm here to help with dental services and "
                    "appointments. How else can I assist you?"
                )

            low = user_message.lower().strip()
            hist = conversation_history or []

            # ── Detect if user was previously blocked but is now unblocked ──
            # (Staff/Owner approved the pending request)
            if self._was_just_unblocked(hist):
                return self._reply(
                    "\u2705 **Your request has been approved!** You can now book, reschedule, "
                    "or cancel appointments.\n\n"
                    "What would you like to do?\n\n"
                    "\u2022 **Book Appointment**\n"
                    "\u2022 **Reschedule Appointment**\n"
                    "\u2022 **Cancel Appointment**",
                    ['Book Appointment', 'Reschedule Appointment', 'Cancel Appointment'],
                    tag='[APPROVAL_WELCOME]'
                )

            # ── Detect NEW explicit intent from user message FIRST ──
            # Button clicks and explicit intents always take priority.
            # Pass EMPTY history so the new flow starts completely fresh —
            # this prevents stale step tags from a previous/different flow
            # from polluting the new one (e.g. clicking "Reschedule" while
            # mid-booking no longer causes "I couldn't understand that date").
            if self._wants_cancel(low):
                return self._handle_cancel(user_message, [])

            if self._wants_reschedule(low):
                return self._handle_reschedule(user_message, [])

            if self._wants_booking(low):
                return self._handle_booking(user_message, [])

            # ── General Q&A questions always bypass active flows ──
            # If the user asks an informational question (services, hours,
            # dentists, etc.) while mid-flow, answer it via Gemini instead
            # of continuing the flow — preserves the "Or ask me:" buttons.
            if self._is_general_qa(low):
                return self._gemini_answer(user_message, hist)

            # ── Continue ongoing flow (if no new explicit intent) ──
            # Only continue the MOST RECENTLY started flow.
            # This prevents old flow tags from hijacking when the user
            # clicks back on a button from a previous flow.
            active = self._detect_most_recent_flow(hist)
            if active == 'cancel':
                return self._handle_cancel(user_message, hist)
            if active == 'reschedule':
                return self._handle_reschedule(user_message, hist)
            if active == 'booking':
                return self._handle_booking(user_message, hist)

            # ── Fallback: general Q&A via Gemini ──
            return self._gemini_answer(user_message, hist)

        except Exception as e:
            err = str(e)
            if 'API_KEY' in err.upper():
                return self._reply(None, error="API configuration error. Please contact support.")
            return self._reply(None, error=f"Chatbot error: {err}")

    # ── intent detection ──────────────────────────────────────────────────

    @staticmethod
    def _wants_booking(low):
        kw = ['book appointment', 'book an appointment', 'schedule appointment',
              'make an appointment', 'make appointment', 'set an appointment',
              'i want to book', 'want to book', 'want to schedule', 'reserve appointment',
              'book a', 'schedule a', 'new appointment',
              # Button-click variants
              'book', 'schedule',
              # Tagalog
              'mag-book', 'magbook', 'pa-book', 'pabook', 'pa-schedule', 'paschedule',
              'magpa-appointment', 'magpa appointment', 'gusto ko mag-book',
              'gusto ko magbook', 'magpa-set', 'set appointment',
              'paki-book', 'pakibook',
              # Taglish (mixed)
              'book ko', 'schedule ko', 'mag-book ako', 'magbook ako',
              'gusto ko book', 'book na', 'schedule na',]
        return any(k in low for k in kw) and 'reschedule' not in low and 'cancel' not in low and 'i-cancel' not in low

    @staticmethod
    def _wants_cancel(low):
        kw = ['cancel appointment', 'cancel my appointment', 'cancel an appointment',
              'i want to cancel', 'want to cancel', 'cancel my', 'cancel the',
              # Button-click variants
              'cancel',
              # Tagalog
              'i-cancel', 'ikansel', 'i-cancel ko', 'cancel ko',
              'wag na', 'ayoko na', 'remove appointment',
              'gusto ko i-cancel', 'paki-cancel', 'pakicancel',
              # Taglish (mixed)
              'cancel ko na', 'cancel na lang', 'i-cancel na',
              'wag na yung', 'ayoko na yung',]
        return any(k in low for k in kw) and 'book' not in low and 'reschedule' not in low

    @staticmethod
    def _wants_reschedule(low):
        kw = ['reschedule', 'change appointment', 'move appointment',
              'change my appointment', 'reschedule my appointment',
              'want to reschedule', 'i want to change', 'need to reschedule',
              # Button-click variants
              'reschedule appointment',
              # Tagalog
              'palitan ang schedule', 'palitan schedule', 'palit schedule',
              'ilipat ang appointment', 'ilipat appointment', 'lipat schedule',
              'resched', 'pa-resched', 'paresched',
              'gusto ko i-reschedule', 'gusto ko mag-resched',
              'paki-resched', 'pakiresched',
              # Taglish (mixed)
              'resched ko', 'resched na', 'change ko', 'palitan ko',
              'resched ko yung', 'lipat ko', 'change ko yung',]
        return any(k in low for k in kw) and 'cancel' not in low and 'i-cancel' not in low

    @staticmethod
    def _is_general_qa(low):
        """
        Detect general informational / Q&A questions that should break out
        of any active booking/reschedule/cancel flow and go straight to
        Gemini Q&A — even if the chat history has active flow tags.
        """
        kw = [
            # Services
            'what dental services', 'what services', 'services do you offer',
            'services offered', 'what treatments', 'list of services',
            'what procedures', 'available services', 'anong serbisyo',
            'anong services', 'mga serbisyo', 'mga services',
            # Dentists / staff
            'who are the dentists', 'who are your dentists', 'list of dentists',
            'your dentists', 'available dentists', 'sino ang dentist',
            'sino ang mga dentist', 'mga dentista', 'who is the dentist',
            # Clinic hours
            'clinic hours', 'your hours', 'what are your hours',
            'operating hours', 'business hours', 'opening hours',
            'what time', 'open hours', 'when are you open', 'when do you open',
            'anong oras', 'oras ng clinic', 'schedule ng clinic', 'bukas kayo',
            # Clinics / location
            'where are you located', 'clinic location', 'where is your clinic',
            'branches', 'clinic address', 'your locations',
            'saan kayo', 'address ng clinic',
            # General dental knowledge / info
            'how much', 'what is', 'what are', 'can you explain',
            'tell me about', 'what does', 'how do', 'what should',
            'when should', 'why does', 'is it normal', 'is it okay',
        ]
        return any(k in low for k in kw)

    @staticmethod
    def _is_confirm_yes(low):
        """Detect confirmation (English + Tagalog + Taglish)."""
        kw = ['yes', 'confirm', 'proceed', 'yeah', 'yep', 'sure', 'go ahead',
              'request cancel', 'yes cancel', 'yes, cancel', 'confirm cancel', 'yes, request',
              # Tagalog
              'oo', 'oo po', 'yes po', 'sige', 'sige po', 'okay', 'okay po',
              'opo', 'g', 'go', 'tara', 'ok',
              # Taglish
              'okay na', 'sige na', 'go na', 'yes na', 'confirm na',]
        return any(k in low for k in kw)

    @staticmethod
    def _is_confirm_no(low):
        """Detect rejection / keep appointment (English + Tagalog + Taglish)."""
        kw = ['no', 'nope', 'keep appointment', 'keep my appointment', 'nevermind',
              'never mind', 'don\'t cancel', 'dont cancel', 'stay',
              # Tagalog
              'hindi', 'hindi po', 'huwag', 'wag', 'wag na lang',
              'ayaw', 'ayaw ko', 'wag na po', 'cancel request',
              # Taglish
              'keep na lang', 'wag muna', 'stay na lang', 'huwag muna',]
        return any(k in low for k in kw)

    @staticmethod
    def _flow_is_terminated(hist):
        """True if the last assistant message ended a flow or blocked the user.
        Any of these tags means the chatbot should return to idle/main-menu."""
        last_msg = _last_assistant(hist, 1)
        if not last_msg:
            return False
        return any(tag in last_msg[0] for tag in (
            '[FLOW_COMPLETE]', '[PENDING_BLOCK]', '[APPROVAL_WELCOME]',
        ))

    def _in_booking_flow(self, hist):
        if self._flow_is_terminated(hist):
            return False
        return _step_tag(hist, '[BOOK_STEP_')

    def _in_cancel_flow(self, hist):
        if self._flow_is_terminated(hist):
            return False
        return _step_tag(hist, '[CANCEL_STEP_')

    def _in_reschedule_flow(self, hist):
        if self._flow_is_terminated(hist):
            return False
        return _step_tag(hist, '[RESCHED_STEP_')

    def _detect_most_recent_flow(self, hist):
        """Find which flow was MOST RECENTLY active by scanning assistant
        messages from newest to oldest. Returns 'booking', 'reschedule',
        'cancel', or None. This ensures that if multiple flows have tags
        in history, only the latest one is continued."""
        if self._flow_is_terminated(hist):
            return None
        for m in reversed(hist or []):
            if m.get('role') != 'assistant':
                continue
            content = m.get('content', '')
            if '[CANCEL_STEP_' in content:
                return 'cancel'
            if '[RESCHED_STEP_' in content:
                return 'reschedule'
            if '[BOOK_STEP_' in content:
                return 'booking'
        return None

    # ══════════════════════════════════════════════════════════════════════
    # BOOKING FLOW  (5 steps)
    # ══════════════════════════════════════════════════════════════════════

    def _handle_booking(self, msg, hist):
        if not self.is_authenticated:
            return self._reply(
                "You need to be logged in to book an appointment. "
                "Please log in first and try again."
            )

        # 🔒 PENDING REQUEST LOCK — Block booking if pending reschedule/cancellation exists
        pending_block = self._check_pending_requests()
        if pending_block:
            return pending_block

        # Check if user is explicitly requesting a new booking
        # If they say "book appointment" etc., always start fresh
        low = msg.lower()
        explicit_new_booking = self._wants_booking(low)
        
        # Check if this is a fresh booking intent or continuing an existing flow
        # Fresh if: explicit intent OR not currently in a booking flow
        is_fresh_booking = explicit_new_booking or not self._in_booking_flow(hist)
        
        # Gather what we already know from history + current message
        # If fresh booking, only use current message to avoid stale context
        ctx = self._gather_booking_ctx(msg, hist, is_fresh_booking)
        clinic = ctx['clinic']
        dentist = ctx['dentist']
        date = ctx['date']
        time_val = ctx['time']
        service = ctx['service']

        today = datetime.now().date()

        # ── STEP 1: Clinic ────────────────────────────────────────────
        if not clinic:
            clinics = ClinicLocation.objects.all()
            if not clinics.exists():
                return self._reply("No clinic locations are set up yet. Please contact the clinic directly.")

            lines = ["**Step 1: Choose a Clinic**\n"]
            qr = []
            for c in clinics:
                open_dentists = _dentists_with_openings(c, today)
                tag = f" ({len(open_dentists)} dentist{'s' if len(open_dentists)!=1 else ''} available)" if open_dentists else " (no openings this period)"
                lines.append(f"• {c.name}{tag}")
                qr.append(c.name)
            lines.append("\nPlease select a clinic:")
            return self._reply('\n'.join(lines), qr, tag='[BOOK_STEP_1]')

        # ── STEP 2: Dentist (based on DentistAvailability at clinic) ──────
        if not dentist:
            # Fetch dentists who have DentistAvailability records at this clinic
            # within the next 30 days (matching manual booking logic)
            end_date = today + timedelta(days=30)
            
            # Get all dentists with availability records at this clinic
            dentist_ids_with_avail = DentistAvailability.objects.filter(
                Q(clinic=clinic) | Q(apply_to_all_clinics=True),
                date__gte=today,
                date__lte=end_date,
                is_available=True
            ).values_list('dentist_id', flat=True).distinct()
            
            if not dentist_ids_with_avail:
                # Recommend another clinic
                alt = self._recommend_alt_clinic(clinic, today)
                if alt:
                    return self._reply(
                        f"Unfortunately **{clinic.name}** has no dentists with openings right now.\n\n"
                        f"However, **{alt.name}** has availability! Would you like to book there instead?",
                        [alt.name, "No thanks"],
                        tag='[BOOK_STEP_1]'
                    )
                return self._reply(
                    f"No dentists have open slots at {clinic.name} in the next month. "
                    "Please contact the clinic directly."
                )
            
            # Get user objects for these dentists
            available_dentists = _dentists_qs().filter(id__in=dentist_ids_with_avail)
            
            lines = [f"**Step 2: Choose a Dentist** (at {clinic.name})\n"]
            qr = []
            for d in available_dentists:
                name = f"Dr. {d.get_full_name()}"
                lines.append(f"• {name}")
                qr.append(name)
            lines.append("\nPlease select a dentist:")
            return self._reply('\n'.join(lines), qr, tag='[BOOK_STEP_2]')

        # ── STEP 3: Date & Time ───────────────────────────────────────
        if not date:
            end = today + timedelta(days=30)
            avails = DentistAvailability.objects.filter(
                dentist=dentist, date__gte=today, date__lte=end,
                is_available=True,
            ).filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True)).order_by('date')

            dates_with_slots = []
            for av in avails:
                if _available_slots(dentist, av.date, clinic):
                    dates_with_slots.append(av.date)
                if len(dates_with_slots) >= 8:
                    break

            if not dates_with_slots:
                alt_dentists = [d for d in _dentists_with_openings(clinic, today) if d.id != dentist.id]
                if alt_dentists:
                    alt = alt_dentists[0]
                    return self._reply(
                        f"Dr. {dentist.get_full_name()} is currently fully booked, "
                        f"but **Dr. {alt.get_full_name()}** is available at the same clinic. "
                        "Would you like to see them instead?",
                        [f"Dr. {alt.get_full_name()}", "No thanks"],
                        tag='[BOOK_STEP_2]'
                    )
                return self._reply(
                    f"Dr. {dentist.get_full_name()} has no openings in the next 30 days. "
                    "Please try a different dentist or clinic."
                )

            lines = [f"**Step 3: Choose a Date**\n\nDr. {dentist.get_full_name()} at {clinic.name}:\n"]
            qr = []
            for d in dates_with_slots:
                label = _fmt_date(d)
                lines.append(f"• {label}")
                qr.append(d.strftime('%B %d'))
            lines.append("\nSelect a date:")
            return self._reply('\n'.join(lines), qr, tag='[BOOK_STEP_3]')

        if not time_val:
            slots = _available_slots(dentist, date, clinic)
            if not slots:
                return self._reply(
                    f"No open slots on {_fmt_date(date)} for Dr. {dentist.get_full_name()}. "
                    "Please pick a different date.",
                    tag='[BOOK_STEP_3]'
                )
            lines = [f"**Step 3: Choose a Time** ({_fmt_date(date)})\n"]
            qr = []
            for s in slots:
                label = _fmt_time(s)
                lines.append(f"• {label}")
                qr.append(label)
            lines.append("\nSelect a time:")
            return self._reply('\n'.join(lines), qr, tag='[BOOK_STEP_3T]')

        # ── STEP 4: Service (Cleaning or Consultation only) ───────────
        if not service:
            allowed = Service.objects.filter(
                name__iregex=r'(clean|consult)',
            )
            if not allowed.exists():
                allowed = Service.objects.all()

            lines = ["**Step 4: Choose a Service**\n"]
            qr = []
            for s in allowed:
                lines.append(f"• {s.name}")
                qr.append(s.name)
            lines.append("\nSelect a service:")
            return self._reply('\n'.join(lines), qr, tag='[BOOK_STEP_4]')

        # ── STEP 5: Validate & Finalize ───────────────────────────────
        # Once-a-Week Booking Rule
        if _patient_has_appointment_this_week(self.user, date):
            next_week = date + timedelta(days=(7 - date.weekday()))
            return self._reply(
                "⚠️ **You can only book one appointment per week.**\n\n"
                f"Your next available booking window starts **{_fmt_date(next_week)}**. "
                "Would you like to pick a date in that week instead?",
                [next_week.strftime('%B %d')],
                tag='[BOOK_STEP_3]'
            )

        # Double-booking guard — dentist conflict
        conflict = Appointment.objects.filter(
            dentist=dentist, date=date, time=time_val,
            status__in=['confirmed', 'pending'],
        ).exists()
        if conflict:
            return self._reply(
                "That slot was just booked! Please pick a different time.",
                tag='[BOOK_STEP_3T]'
            )

        # Double-booking guard — patient overlap
        patient_conflict = Appointment.objects.filter(
            patient=self.user, date=date, time=time_val,
            status__in=['confirmed', 'pending'],
        ).exists()
        if patient_conflict:
            return self._reply(
                "⚠️ You already have an appointment at this date and time. "
                "A patient cannot have overlapping appointments. Please pick a different time.",
                tag='[BOOK_STEP_3T]'
            )

        # Create
        appt = Appointment.objects.create(
            patient=self.user,
            dentist=dentist,
            service=service,
            clinic=clinic,
            date=date,
            time=time_val,
            status='confirmed',
            notes='Automatically booked by AI Sage',
        )
        
        # Send notification to staff/owner
        create_appointment_notification(appt, 'new_appointment')
        
        # Send notification to patient
        create_patient_notification(appt, 'appointment_confirmed')

        return self._reply(
            f"✅ **Appointment Booked Successfully!**\n\n"
            f"**Clinic:** {clinic.name}\n"
            f"**Dentist:** Dr. {dentist.get_full_name()}\n"
            f"**Date:** {_fmt_date_full(date)}\n"
            f"**Time:** {_fmt_time(time_val)}\n"
            f"**Service:** {service.name}\n"
            f"**Status:** Confirmed\n\n"
            "Your appointment has been confirmed! See you soon.",
            tag='[FLOW_COMPLETE]'
        )

    # ── gather accumulated booking context ────────────────────────────

    def _gather_booking_ctx(self, msg, hist, is_fresh_booking=False):
        """Scan history + current message for clinic/dentist/date/time/service.
        
        If is_fresh_booking=True, only search current message to avoid using
        stale context from previous failed booking attempts.
        """
        if is_fresh_booking:
            # Fresh booking - only use current message, not history
            clinic = _find_clinic(msg)
            dentist = _find_dentist(msg)
            date = _parse_date(msg)
            time_val = _parse_time(msg)
            service = _find_service(msg)
        else:
            # Continuing existing flow - but filter out stale data from before pending request errors
            # Find the last [PENDING_REQUEST] tag in history to avoid using old booking data
            filtered_hist = hist or []
            last_block_idx = -1
            for i, m in enumerate(filtered_hist):
                content = m.get('content', '')
                if m.get('role') == 'assistant' and (
                    '[PENDING_REQUEST]' in content
                    or '[PENDING_BLOCK]' in content
                    or '[APPROVAL_WELCOME]' in content
                ):
                    last_block_idx = i
            
            # If there was a pending block or approval reset, only use messages AFTER it
            if last_block_idx >= 0:
                filtered_hist = filtered_hist[last_block_idx + 1:]
            
            combined_user = ' '.join(
                [m['content'] for m in filtered_hist if m['role'] == 'user'] + [msg]
            )
            combined_all = ' '.join(
                [m['content'] for m in filtered_hist] + [msg]
            )

            clinic = _find_clinic(msg) or _find_clinic(combined_user)
            
            # Dentist search: Only search current message if we're at Step 2 or earlier
            # Once past Step 2, search history to preserve the selected dentist
            dentist = _find_dentist(msg)
            if not dentist and _step_tag(filtered_hist, '[BOOK_STEP_3'):
                # We're at Step 3 or later, dentist must have been selected - search history
                dentist = _find_dentist(combined_user)
            
            date = _parse_date(msg) or _parse_date(combined_user)
            
            # Time search: Try current message first, then history
            time_val = _parse_time(msg)
            if not time_val:
                # Search history for time (important for Step 4 when selecting service)
                time_val = _parse_time(combined_user)
            
            service = _find_service(msg) or _find_service(combined_user)

        # If dentist picked but no clinic, infer from dentist's assigned_clinic or availability
        if dentist and not clinic:
            clinic = self._infer_clinic_from_dentist(dentist)

        return dict(clinic=clinic, dentist=dentist, date=date, time=time_val, service=service)

    @staticmethod
    def _infer_clinic_from_dentist(dentist):
        if dentist.assigned_clinic:
            return dentist.assigned_clinic
        av = DentistAvailability.objects.filter(
            dentist=dentist, is_available=True, clinic__isnull=False,
        ).first()
        return av.clinic if av else ClinicLocation.objects.first()

    @staticmethod
    def _recommend_alt_clinic(exclude_clinic, today):
        for c in ClinicLocation.objects.exclude(id=exclude_clinic.id):
            if _dentists_with_openings(c, today):
                return c
        return None

    # ══════════════════════════════════════════════════════════════════════
    # RESCHEDULING FLOW  (date/time only – dentist & service locked)
    # Matches manual booking: Sends reschedule REQUEST to staff/owner
    # ══════════════════════════════════════════════════════════════════════

    def _handle_reschedule(self, msg, hist):
        if not self.is_authenticated:
            return self._reply("Please log in first to reschedule an appointment.")

        # 🔒 PENDING REQUEST LOCK — Block reschedule if pending reschedule/cancellation exists
        pending_block = self._check_pending_requests()
        if pending_block:
            return pending_block

        # Only show confirmed/pending appointments (not reschedule_requested)
        upcoming = Appointment.objects.filter(
            patient=self.user,
            date__gte=datetime.now().date(),
            status__in=['confirmed', 'pending'],
        ).order_by('date', 'time')

        if not upcoming.exists():
            return self._reply("You have no upcoming appointments to reschedule.")

        # STEP R1: Pick appointment
        if not _step_tag(hist, '[RESCHED_STEP_'):
            lines = ["**Reschedule – Select Appointment**\n"]
            qr = []
            for a in upcoming:
                svc = a.service.name if a.service else 'Appointment'
                label = f"{svc} – {_fmt_date(a.date)}"
                lines.append(f"• {label}")
                qr.append(label)
            lines.append("\nSelect the appointment you'd like to reschedule:")
            lines.append("\n*Note: You can only change the date/time. Dentist and service stay the same.*")
            return self._reply('\n'.join(lines), qr, tag='[RESCHED_STEP_1]')

        # STEP R2: Pick new date
        if _step_tag(hist, '[RESCHED_STEP_1]') and not _step_tag(hist, '[RESCHED_STEP_2]'):
            appt = self._match_appointment(msg, upcoming)
            if not appt:
                qr = []
                for a in upcoming:
                    svc = a.service.name if a.service else 'Appointment'
                    qr.append(f"{svc} – {_fmt_date(a.date)}")
                return self._reply(
                    "I wasn't able to identify which appointment you meant. "
                    "Could you please select one from the options below?",
                    qr,
                    tag='[RESCHED_STEP_1]'
                )

            dentist = appt.dentist
            clinic = appt.clinic
            today = datetime.now().date()
            end = today + timedelta(days=30)

            avails = DentistAvailability.objects.filter(
                dentist=dentist, date__gte=today, date__lte=end, is_available=True,
            )
            if clinic:
                avails = avails.filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True))
            avails = avails.order_by('date')

            dates = []
            for av in avails:
                if _available_slots(dentist, av.date, clinic) and av.date != appt.date:
                    dates.append(av.date)
                if len(dates) >= 8:
                    break

            if not dates:
                return self._reply(
                    f"Dr. {dentist.get_full_name()} is fully booked for the next 30 days.\n\n"
                    "We recommend **cancelling** this appointment and creating a **new booking** "
                    "with a different dentist.",
                    ['Cancel Appointment', 'Keep Appointment'],
                )

            lines = [f"**Reschedule – Choose New Date**\n\nDr. {dentist.get_full_name()}:\n"]
            qr = []
            for d in dates:
                label = _fmt_date(d)
                lines.append(f"• {label}")
                qr.append(d.strftime('%B %d'))
            lines.append("\nSelect a new date:")
            return self._reply('\n'.join(lines), qr, tag='[RESCHED_STEP_2]')

        # STEP R3: Pick new time
        if _step_tag(hist, '[RESCHED_STEP_2]') and not _step_tag(hist, '[RESCHED_STEP_3]'):
            date = _parse_date(msg)
            if not date:
                # Re-show available dates instead of a dead-end error
                appt = self._find_resched_appointment(hist, upcoming)
                if appt:
                    dentist = appt.dentist
                    clinic = appt.clinic
                    _today = datetime.now().date()
                    _end = _today + timedelta(days=30)
                    avails = DentistAvailability.objects.filter(
                        dentist=dentist, date__gte=_today, date__lte=_end, is_available=True,
                    )
                    if clinic:
                        avails = avails.filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True))
                    dates = []
                    for av in avails.order_by('date'):
                        if _available_slots(dentist, av.date, clinic) and av.date != appt.date:
                            dates.append(av.date)
                        if len(dates) >= 8:
                            break
                    qr = [d.strftime('%B %d') for d in dates]
                    return self._reply(
                        "I wasn't able to read that date. Please select from the available dates below, "
                        "or type a date like **February 15** or **bukas** (tomorrow).",
                        qr,
                        tag='[RESCHED_STEP_2]'
                    )
                return self._reply(
                    "I wasn't able to read that date. Please type a date like **February 15** or **bukas** (tomorrow).",
                    tag='[RESCHED_STEP_2]'
                )

            appt = self._find_resched_appointment(hist, upcoming)
            if not appt:
                return self._reply("Something went wrong finding your appointment. Please start over by saying 'reschedule'.")

            slots = _available_slots(appt.dentist, date, appt.clinic)
            if not slots:
                return self._reply(
                    f"No open slots on {_fmt_date(date)}. Please pick a different date.",
                    tag='[RESCHED_STEP_2]'
                )
            lines = [f"**Reschedule – Choose New Time** ({_fmt_date(date)})\n"]
            qr = []
            for s in slots:
                label = _fmt_time(s)
                lines.append(f"• {label}")
                qr.append(label)
            lines.append("\nSelect a time:")
            return self._reply('\n'.join(lines), qr, tag='[RESCHED_STEP_3]')

        # STEP R4: Confirm
        if _step_tag(hist, '[RESCHED_STEP_3]'):
            time_val = _parse_time(msg)
            if not time_val:
                return self._reply(
                    "I wasn't able to read that time. Please select from the options above, "
                    "or type a time like **9:00 AM** or **2pm**.",
                    tag='[RESCHED_STEP_3]'
                )

            appt = self._find_resched_appointment(hist, upcoming)
            if not appt:
                return self._reply("Something went wrong. Please start over by saying 'reschedule'.")

            # Get date from previous step
            date = self._find_resched_date(hist)
            if not date:
                return self._reply("I lost track of the date. Please start over by saying 'reschedule'.")

            # Check conflict
            if Appointment.objects.filter(
                dentist=appt.dentist, date=date, time=time_val,
                status__in=['confirmed', 'pending'],
            ).exists():
                return self._reply("That slot was just taken! Please pick a different time.", tag='[RESCHED_STEP_3]')

            old_date, old_time = appt.date, appt.time
            appt.reschedule_date = date
            appt.reschedule_time = time_val
            appt.reschedule_notes = "Rescheduled via AI Sage"
            appt.status = 'reschedule_requested'
            appt.save()
            
            # Send notification to staff/owner
            create_appointment_notification(appt, 'reschedule_request')

            return self._reply(
                f"✅ **Reschedule Request Submitted!**\n\n"
                f"**Original:** {_fmt_date(old_date)} at {_fmt_time(old_time)}\n"
                f"**Requested:** {_fmt_date(date)} at {_fmt_time(time_val)}\n"
                f"**Dentist:** Dr. {appt.dentist.get_full_name()}\n"
                f"**Service:** {appt.service.name if appt.service else 'N/A'}\n\n"
                "Staff will review and confirm your reschedule request.",
                tag='[FLOW_COMPLETE]'
            )

        return self._reply("Let me help you reschedule. Please say 'reschedule' to start.")

    def _match_appointment(self, msg, qs):
        """Try to match user's message to an appointment in qs."""
        low = msg.lower()
        for a in qs:
            svc = (a.service.name if a.service else 'appointment').lower()
            dstr = a.date.strftime('%B %d').lower()
            if svc in low or dstr in low:
                return a
        # Fallback: if only 1 appointment, use it
        if qs.count() == 1:
            return qs.first()
        return None

    def _find_resched_appointment(self, hist, qs):
        """Walk history to find which appointment was selected in STEP_1."""
        for m in reversed(hist):
            if m['role'] == 'user':
                found = self._match_appointment(m['content'], qs)
                if found:
                    return found
        if qs.count() == 1:
            return qs.first()
        return None

    def _find_resched_date(self, hist):
        """Walk history to find the date picked in STEP_2."""
        for m in reversed(hist):
            if m['role'] == 'user':
                d = _parse_date(m['content'])
                if d:
                    return d
        return None

    # ══════════════════════════════════════════════════════════════════════
    # CANCELLATION FLOW  (soft – status change only)
    # ══════════════════════════════════════════════════════════════════════

    def _handle_cancel(self, msg, hist):
        if not self.is_authenticated:
            return self._reply("Please log in first to cancel an appointment.")

        # 🔒 PENDING REQUEST LOCK — Block cancellation if pending reschedule/cancellation exists
        pending_block = self._check_pending_requests()
        if pending_block:
            return pending_block

        upcoming = Appointment.objects.filter(
            patient=self.user,
            date__gte=datetime.now().date(),
            status__in=['confirmed', 'pending'],
        ).order_by('date', 'time')

        if not upcoming.exists():
            return self._reply("You have no upcoming appointments to cancel.")

        low = msg.lower()

        # Confirm / Keep — supports English + Tagalog
        if self._is_confirm_yes(low) and _step_tag(hist, '[CANCEL_STEP_'):
            appt = self._find_cancel_appointment(hist, upcoming)
            if not appt:
                qr = []
                for a in upcoming:
                    svc_n = a.service.name if a.service else 'Appointment'
                    qr.append(f"{svc_n} – {a.date.strftime('%B %d, %Y')}")
                return self._reply(
                    "I wasn't able to identify the appointment. Could you select one from the list?",
                    qr,
                    tag='[CANCEL_STEP_1]'
                )
            appt.status = 'cancel_requested'
            appt.cancel_reason = 'Cancellation requested via AI Sage'
            appt.cancel_requested_at = datetime.now()
            appt.save()
            
            # Send notification to staff/owner
            create_appointment_notification(appt, 'cancel_request')
            
            svc = appt.service.name if appt.service else 'Appointment'
            return self._reply(
                f"📋 **Cancellation Request Submitted**\n\n"
                f"**Service:** {svc}\n"
                f"**Date:** {_fmt_date_full(appt.date)}\n"
                f"**Time:** {_fmt_time(appt.time)}\n"
                f"**Dentist:** Dr. {appt.dentist.get_full_name()}\n\n"
                "Your request has been sent to the staff/owner for review. "
                "You will be notified once it is approved. Your appointment remains active until then.",
                tag='[FLOW_COMPLETE]'
            )

        if self._is_confirm_no(low) and _step_tag(hist, '[CANCEL_STEP_'):
            return self._reply(
                "No problem! Your appointment has been kept. Is there anything else I can help with?",
                tag='[FLOW_COMPLETE]'
            )

        # STEP C2: Confirmation prompt (after user selected an appointment)
        if _step_tag(hist, '[CANCEL_STEP_1]'):
            appt = self._match_appointment(msg, upcoming)
            if not appt:
                qr = []
                for a in upcoming:
                    svc = a.service.name if a.service else 'Appointment'
                    qr.append(f"{svc} – {a.date.strftime('%B %d, %Y')}")
                return self._reply(
                    "I wasn't able to identify which appointment you meant. "
                    "Could you please select one from the options below?",
                    qr,
                    tag='[CANCEL_STEP_1]'
                )
            svc = appt.service.name if appt.service else 'Appointment'
            return self._reply(
                f"**Request Cancellation**\n\n"
                f"You are about to request cancellation for:\n\n"
                f"**Service:** {svc}\n"
                f"**Date:** {_fmt_date_full(appt.date)}\n"
                f"**Time:** {_fmt_time(appt.time)}\n"
                f"**Dentist:** Dr. {appt.dentist.get_full_name()}\n\n"
                "This will send a cancellation request to the staff/owner for approval. "
                "Your appointment stays active until they approve it.\n\n"
                "Would you like to proceed?",
                ['Request Cancellation', 'Keep Appointment'],
                tag='[CANCEL_STEP_2]'
            )

        # STEP C1: List appointments
        lines = ["**Cancel – Select Appointment**\n"]
        qr = []
        for a in upcoming:
            svc = a.service.name if a.service else 'Appointment'
            label = f"{svc} – {a.date.strftime('%B %d, %Y')}"
            lines.append(f"• {label}")
            qr.append(label)
        lines.append("\nWhich appointment would you like to cancel?")
        return self._reply('\n'.join(lines), qr, tag='[CANCEL_STEP_1]')

    def _find_cancel_appointment(self, hist, qs):
        for m in reversed(hist):
            if m['role'] == 'user':
                found = self._match_appointment(m['content'], qs)
                if found:
                    return found
        if qs.count() == 1:
            return qs.first()
        return None

    # ══════════════════════════════════════════════════════════════════════
    # GEMINI Q&A  (general dental / clinic questions)
    # ══════════════════════════════════════════════════════════════════════

    def _direct_answer(self, msg):
        """Handle ONLY quick reply button questions with hardcoded answers."""
        # Only exact matches for quick reply buttons
        if msg.strip() == "What dental services do you offer?":
            svcs = Service.objects.all().order_by('name')
            if not svcs.exists():
                return self._reply("We currently don't have services listed. Please contact the clinic directly.")
            
            lines = ["🦷 **Our Dental Services:**\n"]
            for s in svcs:
                lines.append(f"• **{s.name}**\n")
            
            lines.append("💙 Would you like to book an appointment?")
            return self._reply('\n'.join(lines))
        
        if msg.strip() == "Who are the dentists?":
            dents = _dentists_qs().order_by('last_name')
            if not dents.exists():
                return self._reply("We currently don't have dentist information available. Please contact the clinic directly.")
            
            lines = ["👨‍⚕️ **Our Dental Team:**\n"]
            today = datetime.now().date()
            
            for d in dents:
                full_name = d.get_full_name().strip()
                if not full_name:
                    continue
                    
                is_available = DentistAvailability.objects.filter(
                    dentist=d, date=today, is_available=True
                ).exists()
                
                if is_available:
                    lines.append(f"✅ **Dr. {full_name}** - Available today\n")
                else:
                    lines.append(f"• **Dr. {full_name}**\n")
            
            lines.append("💙 Ready to book? Say 'Book Appointment' to schedule your visit!")
            return self._reply('\n'.join(lines))
        
        if msg.strip() == "What are your clinic hours?":
            clinics = ClinicLocation.objects.all().order_by('name')
            if not clinics.exists():
                return self._reply("We currently don't have clinic location information available.")
            
            lines = ["📍 **Clinic Locations & Hours**\n"]
            
            clinic_list = list(clinics)
            for i, c in enumerate(clinic_list):
                lines.append(f"**{c.name}**")
                lines.append(f"📍 {c.address}")
                lines.append(f"📞 {c.phone}")
                
                if i < len(clinic_list) - 1:
                    lines.append("\n")
            
            lines.append("\n🕒 **Operating Hours:**")
            lines.append("• **Monday - Friday:** 8:00 AM - 6:00 PM")
            lines.append("• **Saturday:** 9:00 AM - 3:00 PM")
            lines.append("• **Sunday:** Closed")
            
            lines.append("\n💙 Need to schedule an appointment? Just say 'Book Appointment'!")
            return self._reply('\n'.join(lines))
        
        return None  # Not a quick reply button - let Gemini handle it

    def _gemini_answer(self, msg, hist):
        # Try direct answer first (for common questions)
        direct = self._direct_answer(msg)
        if direct:
            return direct
        
        # Detect user's language for response matching
        low = msg.lower()
        tagalog_words = ['ano', 'sino', 'saan', 'kailan', 'paano', 'magkano', 'meron', 'ba', 'ko', 'mo', 'nga', 'po', 'yung', 'mga', 'sa', 'ng', 'na', 'naman', 'lang']
        tagalog_count = sum(1 for word in tagalog_words if word in low)
        is_tagalog = tagalog_count >= 2

        # ── RAG: Try to retrieve page-index context (optional enhancement) ──
        rag_context = None
        rag_sources = []
        try:
            from .rag.page_index_service import get_context_with_sources
            rag_context, rag_sources = get_context_with_sources(msg)
        except Exception as rag_err:
            # RAG failure must NEVER block the chatbot
            import logging
            logging.getLogger('rag.service').error(
                "RAG retrieval failed (continuing without): %s", rag_err
            )
        
        # Fallback to Gemini for complex questions
        try:
            system = self._system_prompt()
            context = self._build_context(msg)

            prompt = f"{system}\n\n"
            
            # Language instruction
            if is_tagalog:
                prompt += "LANGUAGE INSTRUCTION: The user is speaking Tagalog or Taglish. You MUST respond primarily in Tagalog/Taglish, not English.\n\n"
            else:
                prompt += "LANGUAGE INSTRUCTION: The user is speaking English. Respond in clear English.\n\n"
            
            # Emphasize context if available
            if context:
                prompt += "IMPORTANT - Use this real-time data from our database to answer:\n"
                prompt += f"{context}\n\n"
                prompt += "NOTE: Only use the information provided above. Do not make up services, dentists, or hours.\n\n"

            # ── RAG: Inject page-index context if available ──
            if rag_context:
                prompt += f"{rag_context}\n\n"
            
            if hist:
                prompt += "Conversation History:\n"
                for m in hist[-6:]:
                    role = "User" if m['role'] == 'user' else "Assistant"
                    prompt += f"{role}: {m['content']}\n"
                prompt += "\n"
            
            prompt += f"User: {msg}\n\nAssistant:"

            resp = self.model.generate_content(
                prompt,
                generation_config={"temperature": 0.2, "max_output_tokens": 600, "top_p": 0.9, "top_k": 40},
                safety_settings={
                    'HARM_CATEGORY_HARASSMENT': 'BLOCK_NONE',
                    'HARM_CATEGORY_HATE_SPEECH': 'BLOCK_NONE',
                    'HARM_CATEGORY_SEXUALLY_EXPLICIT': 'BLOCK_NONE',
                    'HARM_CATEGORY_DANGEROUS_CONTENT': 'BLOCK_NONE',
                },
            )
            text = self._sanitize(resp.text)

            # ── RAG: Attach optional sources to response ──
            result = self._reply(text)
            if rag_sources:
                result['sources'] = rag_sources
            return result
        except Exception as e:
            # Log the actual error for debugging (don't show to user)
            error_type = type(e).__name__
            
            # Check if it's a rate limit error
            is_rate_limit = 'quota' in str(e).lower() or '429' in str(e) or 'ResourceExhausted' in error_type
            
            # If Gemini fails, format the context nicely as fallback
            context = self._build_context(msg)
            if context:
                formatted = self._format_context_fallback(context, is_tagalog)
                return self._reply(formatted)
            
            # Generic fallback if no context available
            if is_tagalog:
                return self._reply(
                    "Pasensya na po, may konting problema ako sa pagsagot ngayon. "
                    "Maaari po ba kayong magtanong ulit tungkol sa aming mga serbisyo, dentista, o clinic hours?"
                )
            else:
                return self._reply(
                    "I'm having trouble processing your question right now. "
                    "Please try asking about our services, dentists, or clinic hours, "
                    "or contact the clinic directly for assistance."
                )

    # ── fallback formatter ────────────────────────────────────────────────

    @staticmethod
    def _format_context_fallback(context, is_tagalog):
        """Format raw database context into a nice user-friendly response."""
        lines = []
        
        # Split context by section headers
        if "=== AVAILABLE DENTAL SERVICES ===" in context:
            if is_tagalog:
                lines.append("🦷 **Mga Dental Services Namin:**\n")
            else:
                lines.append("🦷 **Our Dental Services:**\n")
            
            # Extract services section
            services_section = context.split("=== AVAILABLE DENTAL SERVICES ===")[1]
            if "===" in services_section:
                services_section = services_section.split("===")[0]
            
            # Parse service lines
            for line in services_section.strip().split('\n'):
                line = line.strip()
                if line.startswith('•'):
                    # Extract just the service name (before category)
                    service_name = line.split('(Category:')[0].strip()
                    lines.append(service_name)
            lines.append("")
        
        if "=== OUR DENTISTS ===" in context:
            if is_tagalog:
                lines.append("👨‍⚕️ **Mga Dentista Namin:**\n")
            else:
                lines.append("👨‍⚕️ **Our Dentists:**\n")
            
            # Extract dentists section
            dentists_section = context.split("=== OUR DENTISTS ===")[1]
            if "===" in dentists_section:
                dentists_section = dentists_section.split("===")[0]
            
            # Parse dentist lines
            for line in dentists_section.strip().split('\n'):
                line = line.strip()
                if line.startswith('•'):
                    lines.append(line)
            lines.append("")
        
        if "=== CLINIC LOCATIONS & HOURS ===" in context:
            if is_tagalog:
                lines.append("📍 **Mga Branch at Oras:**\n")
            else:
                lines.append("📍 **Clinic Locations & Hours:**\n")
            
            # Extract clinic section
            clinic_section = context.split("=== CLINIC LOCATIONS & HOURS ===")[1]
            if "===" in clinic_section:
                clinic_section = clinic_section.split("===")[0]
            
            # Add clinic info (already formatted)
            lines.append(clinic_section.strip())
            lines.append("")
        
        # Add call to action
        if is_tagalog:
            lines.append("💙 May gusto ka pa bang malaman o mag-book ng appointment?")
        else:
            lines.append("💙 Would you like to know more or book an appointment?")
        
        return '\n'.join(lines)

    # ── context builder ───────────────────────────────────────────────────

    def _build_context(self, msg):
        """Build comprehensive context from database for Gemini AI to answer intelligently."""
        low = msg.lower()
        parts = []
        today = datetime.now().date()
        
        # Check what user is actually asking about
        asking_about_dentist = any(w in low for w in ['dentist', 'doctor', 'dr', 'doktor', 'sino', 'who', 'whos', "who's", 'available'])
        asking_about_service = any(w in low for w in ['service', 'treatment', 'procedure', 'serbisyo', 'gawin', 'ginagawa', 'have', 'offer', 'do you', 'meron', 'may', 'cleaning', 'extraction', 'braces', 'checkup', 'filling', 'pasta', 'bunot', 'linis'])
        asking_about_clinic = any(w in low for w in ['clinic', 'location', 'branch', 'where', 'saan', 'hour', 'oras', 'open', 'hours', 'time', 'kailan'])
        
        # Only include services if specifically asking about services (not just because "available" or "what" appears)
        if asking_about_service or (not asking_about_dentist and not asking_about_clinic and any(w in low for w in ['what do you offer', 'anong serbisyo', 'what services'])):
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
        
        # Dentists with intelligent date/availability parsing (prioritize if asking about dentists)
        if asking_about_dentist or any(w in low for w in ['available', 'work', 'next week', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'ngayon', 'today', 'bukas']):
            dents = _dentists_qs().order_by('last_name')
            if dents.exists():
                lines = ["=== OUR DENTISTS ==="]
                
                # Parse date from question
                check_date = _parse_date(msg)
                
                # Determine date range for availability check
                if 'next week' in low or 'susunod na linggo' in low:
                    start_date = today + timedelta(days=(7 - today.weekday()))
                    end_date = start_date + timedelta(days=4)
                    date_context = "next week (Monday-Friday)"
                elif check_date and check_date != today:
                    start_date = check_date
                    end_date = check_date
                    date_context = _fmt_date(check_date)
                else:
                    start_date = today
                    end_date = today
                    date_context = "today"
                
                lines.append(f"\nAvailability for: {date_context}")
                
                for d in dents:
                    full_name = d.get_full_name().strip()
                    if not full_name:
                        continue
                    
                    # Check availability in the date range
                    availability = DentistAvailability.objects.filter(
                        dentist=d,
                        date__gte=start_date,
                        date__lte=end_date,
                        is_available=True
                    ).exists()
                    
                    status = "✅ AVAILABLE" if availability else "❌ Not available"
                    lines.append(f"• Dr. {full_name} - {status}")
                
                parts.append('\n'.join(lines))
        
        # Clinic info and hours (only if asking about clinic/location)
        if asking_about_clinic or any(w in low for w in ['address', 'contact', 'phone', 'schedule', 'time']):
            clinics = ClinicLocation.objects.all().order_by('name')
            if clinics.exists():
                lines = ["=== CLINIC LOCATIONS & HOURS ==="]
                for c in clinics:
                    lines.append(f"\n📍 {c.name}")
                    lines.append(f"   Address: {c.address}")
                    lines.append(f"   Phone: {c.phone}")
                lines.append("\n⏰ Operating Hours:")
                lines.append("   • Monday - Friday: 8:00 AM - 6:00 PM")
                lines.append("   • Saturday: 9:00 AM - 3:00 PM")
                lines.append("   • Sunday: Closed")
                parts.append('\n'.join(lines))
        
        # User's appointments
        if self.is_authenticated and any(w in low for w in ['my appointment', 'my booking', 'my schedule']):
            appts = Appointment.objects.filter(
                patient=self.user,
                status__in=['confirmed', 'pending', 'reschedule_requested'],
            ).order_by('date', 'time')[:5]
            if appts.exists():
                lines = ["=== YOUR UPCOMING APPOINTMENTS ==="]
                for a in appts:
                    svc = a.service.name if a.service else 'General'
                    lines.append(f"• {_fmt_date_full(a.date)} at {_fmt_time(a.time)}")
                    lines.append(f"  Service: {svc}")
                    lines.append(f"  Dentist: Dr. {a.dentist.get_full_name()}")
                    lines.append(f"  Clinic: {a.clinic.name if a.clinic else 'TBD'}")
                parts.append('\n'.join(lines))
        
        return '\n\n'.join(parts) if parts else ''

    # ── system prompt ─────────────────────────────────────────────────────

    @staticmethod
    def _system_prompt():
        return """You are "Sage", the AI concierge for Dorotheo Dental Clinic.

PERSONALITY: Professional, calming, efficient. Proactive — don't just say "No availability,"
suggest alternatives.

LANGUAGE MATCHING (CRITICAL - MOST IMPORTANT RULE):
- **MATCH THE USER'S LANGUAGE EXACTLY**
- If user speaks Tagalog/Taglish → Respond in Tagalog/Taglish
- If user speaks English → Respond in English
- Taglish examples: "Magbook ako tomorrow sa Bacoor", "Cancel ko yung Feb 5", "Sino available ngayon?"
- DO NOT mix languages - if they speak Tagalog, DON'T respond in English

FORMATTING (REQUIRED):
- Use emojis to make responses friendly: 🦷 (services), 👨‍⚕️ (dentists), 📍 (locations)
- Use **bold** for names and important info
- Use bullet points (•) for lists
- Keep responses conversational and warm
- Add line breaks between sections for readability

WHAT YOU CAN HELP WITH:
- Dental services and procedures information
- General dental health questions  
- Dentist availability (check the database context provided)
- Clinic hours, locations, and contact info
- Appointment booking guidance (tell them to say "Book Appointment")

RESTRICTIONS:
- NEVER share passwords, credentials, admin access, or private staff data
- NEVER provide specific pricing — say "Pricing varies. We recommend booking a consultation."
- ONLY answer questions related to Dorotheo Dental Clinic and dental care
- If asked about non-dental topics, politely decline

CLINIC INFO:
- Name: Dorotheo Dental and Diagnostic Center
- Founded: 2001 by Dr. Marvin F. Dorotheo
- Hours: Mon-Fri 8AM-6PM, Sat 9AM-3PM, Sun Closed
- Services: Preventive, restorative, orthodontics, oral surgery, cosmetic dentistry"""

    # ── safety ────────────────────────────────────────────────────────────

    def _is_safe(self, msg):
        low = msg.lower()
        return not any(kw in low for kw in self.RESTRICTED_KW)

    @staticmethod
    def _sanitize(text):
        for pat in ['password:', 'token:', 'secret:', 'credential:']:
            if pat in text.lower():
                return ("I can't provide that information. "
                        "Please contact the clinic directly for account-related matters.")
        return text

    # ── response builder ──────────────────────────────────────────────────

    @staticmethod
    def _reply(text, quick_replies=None, tag='', error=None):
        body = text or ''
        if tag:
            body += f'\n\n<!-- {tag} -->'
        return {
            'response': body,
            'quick_replies': quick_replies or [],
            'error': error,
        }
