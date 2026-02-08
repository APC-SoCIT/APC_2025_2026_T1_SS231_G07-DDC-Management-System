"""
Google Gemini AI Chatbot Service for Dorotheo Dental Clinic
AI Sage – Dental Scheduling Master with Smart Routing
"""

import google.generativeai as genai
import os
import re
from datetime import datetime, timedelta, time as time_obj
from django.db.models import Q
from .models import (
    Service, Appointment, User, DentistAvailability,
    ClinicLocation, BlockedTimeSlot,
)
from .views import create_appointment_notification

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
}


def _parse_date(msg):
    today = datetime.now().date()
    low = msg.lower()
    if 'today' in low:
        return today
    if 'tomorrow' in low:
        return today + timedelta(days=1)
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
    return None


def _find_dentist(msg):
    """Only match dentist if message explicitly contains 'Dr.' prefix or exact full name match."""
    low = msg.lower()
    
    # Only match if message contains "dr" or "doctor" prefix
    if 'dr.' not in low and 'dr ' not in low and 'doctor ' not in low:
        return None
    
    for d in _dentists_qs():
        full = d.get_full_name().lower()
        # Match "Dr. FirstName LastName" or "Dr FirstName LastName" or "Doctor FirstName LastName"
        patterns = [
            f'dr. {full}',
            f'dr {full}',
            f'doctor {full}',
        ]
        if any(p in low for p in patterns):
            return d
    
    return None


def _find_clinic(msg):
    low = msg.lower()
    for c in ClinicLocation.objects.all():
        if c.name.lower() in low:
            return c
    return None


def _find_service(msg):
    low = msg.lower()
    for s in Service.objects.all():
        if s.name.lower() in low:
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

    MODEL_NAME = "gemini-2.5-flash"

    RESTRICTED_KW = [
        'password', 'admin', 'database', 'secret', 'token', 'credential',
        'api key', 'private key', 'connection string', 'sql', 'delete',
        'drop table', 'django admin', 'superuser', 'staff password',
    ]

    # ── init ──────────────────────────────────────────────────────────────

    def __init__(self, user=None):
        self.user = user
        self.is_authenticated = user is not None
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(self.MODEL_NAME)

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

            # ── Detect ongoing flow first (assistant step tags) ──
            if self._in_cancel_flow(hist):
                return self._handle_cancel(user_message, hist)

            if self._in_reschedule_flow(hist):
                return self._handle_reschedule(user_message, hist)

            if self._in_booking_flow(hist):
                return self._handle_booking(user_message, hist)

            # ── Detect NEW intent from user message ──
            if self._wants_cancel(low):
                return self._handle_cancel(user_message, hist)

            if self._wants_reschedule(low):
                return self._handle_reschedule(user_message, hist)

            if self._wants_booking(low):
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
              'i want to book', 'want to schedule', 'reserve appointment',
              'book a', 'schedule a', 'new appointment']
        return any(k in low for k in kw)

    @staticmethod
    def _wants_cancel(low):
        kw = ['cancel appointment', 'cancel my appointment', 'cancel an appointment',
              'i want to cancel']
        return any(k in low for k in kw) and 'book' not in low

    @staticmethod
    def _wants_reschedule(low):
        kw = ['reschedule', 'change appointment', 'move appointment',
              'change my appointment', 'reschedule my appointment']
        return any(k in low for k in kw)

    def _in_booking_flow(self, hist):
        return _step_tag(hist, '[BOOK_STEP_')

    def _in_cancel_flow(self, hist):
        return _step_tag(hist, '[CANCEL_STEP_')

    def _in_reschedule_flow(self, hist):
        return _step_tag(hist, '[RESCHED_STEP_')

    # ══════════════════════════════════════════════════════════════════════
    # BOOKING FLOW  (5 steps)
    # ══════════════════════════════════════════════════════════════════════

    def _handle_booking(self, msg, hist):
        if not self.is_authenticated:
            return self._reply(
                "You need to be logged in to book an appointment. "
                "Please log in first and try again."
            )

        # Gather what we already know from history + current message
        ctx = self._gather_booking_ctx(msg, hist)
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
        # Weekly limit
        if _patient_has_appointment_this_week(self.user, date):
            iso = date.isocalendar()
            next_week = date + timedelta(days=(7 - date.weekday()))
            return self._reply(
                "To ensure all patients receive care, we limit bookings to **once per week**.\n\n"
                f"Your next available window starts **{_fmt_date(next_week)}**. "
                "Would you like to pick a date in that week instead?",
                [next_week.strftime('%B %d')],
                tag='[BOOK_STEP_3]'
            )

        # Double-booking guard
        conflict = Appointment.objects.filter(
            dentist=dentist, date=date, time=time_val,
            status__in=['confirmed', 'pending'],
        ).exists()
        if conflict:
            return self._reply(
                "That slot was just booked! Please pick a different time.",
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

        return self._reply(
            f"✅ **Appointment Booked Successfully!**\n\n"
            f"**Clinic:** {clinic.name}\n"
            f"**Dentist:** Dr. {dentist.get_full_name()}\n"
            f"**Date:** {_fmt_date_full(date)}\n"
            f"**Time:** {_fmt_time(time_val)}\n"
            f"**Service:** {service.name}\n"
            f"**Status:** Confirmed\n\n"
            "Your appointment has been confirmed! See you soon."
        )

    # ── gather accumulated booking context ────────────────────────────

    def _gather_booking_ctx(self, msg, hist):
        """Scan history + current message for clinic/dentist/date/time/service."""
        combined_user = ' '.join(
            [m['content'] for m in (hist or []) if m['role'] == 'user'] + [msg]
        )
        combined_all = ' '.join(
            [m['content'] for m in (hist or [])] + [msg]
        )

        clinic = _find_clinic(msg) or _find_clinic(combined_user)
        
        # Dentist search: Only search current message if we're at Step 2 or earlier
        # Once past Step 2, search history to preserve the selected dentist
        dentist = _find_dentist(msg)
        if not dentist and _step_tag(hist, '[BOOK_STEP_3'):
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
                return self._reply(
                    "I couldn't match that appointment. Please select one from the list above.",
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
                return self._reply("I couldn't understand that date. Please try again (e.g. 'February 10').", tag='[RESCHED_STEP_2]')

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
                return self._reply("I couldn't understand that time. Please try again (e.g. '9:00 AM').", tag='[RESCHED_STEP_3]')

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
                "Staff will review and confirm your reschedule request."
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

        upcoming = Appointment.objects.filter(
            patient=self.user,
            date__gte=datetime.now().date(),
            status__in=['confirmed', 'pending'],
        ).order_by('date', 'time')

        if not upcoming.exists():
            return self._reply("You have no upcoming appointments to cancel.")

        low = msg.lower()

        # Confirm / Keep
        if 'request cancel' in low or 'yes cancel' in low or 'yes, cancel' in low or 'confirm cancel' in low or 'yes, request' in low:
            appt = self._find_cancel_appointment(hist, upcoming)
            if not appt:
                return self._reply("I couldn't find which appointment to cancel. Please select one.", tag='[CANCEL_STEP_1]')
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
                "You will be notified once it is approved. Your appointment remains active until then."
            )

        if 'keep appointment' in low or 'keep my appointment' in low:
            return self._reply("No problem! Your appointment has been kept. Is there anything else I can help with?")

        # STEP C2: Confirmation prompt (after user selected an appointment)
        if _step_tag(hist, '[CANCEL_STEP_1]'):
            appt = self._match_appointment(msg, upcoming)
            if not appt:
                return self._reply("I couldn't match that appointment. Please select from the list.", tag='[CANCEL_STEP_1]')
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

    def _gemini_answer(self, msg, hist):
        system = self._system_prompt()
        context = self._build_context(msg)

        prompt = f"{system}\n\n"
        if context:
            prompt += f"{context}\n\n"
        if hist:
            prompt += "Conversation History:\n"
            for m in hist[-6:]:
                role = "User" if m['role'] == 'user' else "Assistant"
                prompt += f"{role}: {m['content']}\n"
            prompt += "\n"
        prompt += f"User: {msg}\n\nAssistant:"

        resp = self.model.generate_content(
            prompt,
            generation_config={"temperature": 0.3, "max_output_tokens": 500, "top_p": 0.8, "top_k": 40},
            safety_settings={
                'HARASSMENT': 'BLOCK_NONE', 'HATE_SPEECH': 'BLOCK_NONE',
                'SEXUALLY_EXPLICIT': 'BLOCK_NONE', 'DANGEROUS_CONTENT': 'BLOCK_NONE',
            },
        )
        text = self._sanitize(resp.text)
        return self._reply(text)

    # ── context builder ───────────────────────────────────────────────────

    def _build_context(self, msg):
        low = msg.lower()
        parts = []
        if any(w in low for w in ['service', 'treatment', 'procedure', 'offer']):
            svcs = Service.objects.all()
            if svcs:
                lines = ["Our Dental Services:"]
                for s in svcs:
                    lines.append(f"- {s.name} ({s.category}): {s.description}")
                parts.append('\n'.join(lines))
        if any(w in low for w in ['dentist', 'doctor', 'dr', 'staff', 'who']):
            dents = _dentists_qs()
            if dents:
                lines = ["Our Dentists:"]
                for d in dents:
                    lines.append(f"- Dr. {d.get_full_name()}")
                parts.append('\n'.join(lines))
        if any(w in low for w in ['clinic', 'location', 'branch', 'where']):
            clinics = ClinicLocation.objects.all()
            if clinics:
                lines = ["Our Clinic Locations:"]
                for c in clinics:
                    lines.append(f"- {c.name}: {c.address} | Phone: {c.phone}")
                parts.append('\n'.join(lines))
        if self.is_authenticated and any(w in low for w in ['my appointment', 'my booking']):
            appts = Appointment.objects.filter(
                patient=self.user,
                status__in=['confirmed', 'pending', 'reschedule_requested'],
            ).order_by('date', 'time')[:5]
            if appts:
                lines = ["Your Upcoming Appointments:"]
                for a in appts:
                    svc = a.service.name if a.service else 'General'
                    lines.append(f"- {_fmt_date_full(a.date)} at {_fmt_time(a.time)} – {svc} with Dr. {a.dentist.get_full_name()}")
                parts.append('\n'.join(lines))
        return '\n\n'.join(parts) if parts else ''

    # ── system prompt ─────────────────────────────────────────────────────

    @staticmethod
    def _system_prompt():
        return """You are "Sage", the AI concierge for Dorotheo Dental Clinic.

PERSONALITY: Professional, calming, efficient. Proactive — don't just say "No availability," 
suggest alternatives.

WHAT YOU CAN HELP WITH:
- Dental services and procedures information
- General dental health questions
- Clinic hours, locations, and contact info
- Appointment booking, rescheduling, and cancellation (handled by structured flows)

RESTRICTIONS:
- NEVER share passwords, credentials, admin access, or private staff data
- NEVER provide specific pricing — say "Pricing varies. We recommend booking a consultation."
- ONLY answer questions related to Dorotheo Dental Clinic and dental care
- If asked about non-dental topics, politely decline

CLINIC INFO:
- Name: Dorotheo Dental and Diagnostic Center
- Founded: 2001 by Dr. Marvin F. Dorotheo
- Hours: Mon-Fri 8AM-6PM, Sat 9AM-3PM, Sun Closed
- Services: Preventive, restorative, orthodontics, oral surgery, cosmetic dentistry

FORMATTING:
- Use **bold** only for headings and numbered items
- Keep responses concise and helpful
- Use bullet points (•) for lists"""

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
