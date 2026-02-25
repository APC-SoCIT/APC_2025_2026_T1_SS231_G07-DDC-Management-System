"""
Reschedule Flow — Conversational, Fully Validated
===================================================
Dentist and service are LOCKED — only date/time can change.
Submits a reschedule REQUEST (staff must approve).

Architecture (NO wizard behaviour):
1. Check pending lock. STOP if blocked.
2. Show appointment list if user doesn't specify which one.
3. Extract new date + time from message + history at once.
4. Validate everything in one pass:
   - Appointment exists
   - New date valid & not in past
   - Slot exists & available
   - Weekly rule satisfied (max 1 booking per week)
5. If all valid → show confirmation.
   If invalid → explain ALL issues conversationally.
6. Never step-by-step. Never "Please select…".

State tags (hidden in comment blocks in assistant messages):
  [RESCHED_FLOW]    -- actively collecting reschedule information
  [RESCHED_CONFIRM] -- showed confirmation, awaiting yes/no
"""

import logging
from datetime import datetime, date as date_cls, timedelta
from typing import Optional, Tuple

from django.db.models import Q

from ..models import Appointment, DentistAvailability
from ..services import booking_service as bsvc
from ..services import intent_service as isvc
from ..services.llm_service import get_llm_service
from ..services.booking_validation_service import validate_one_booking_per_week
from .. import booking_memory as bmem
from .. import language_detection as lang
from ..views import create_appointment_notification
from . import build_reply

logger = logging.getLogger('chatbot.flow.reschedule')

_TAG_FLOW    = '[RESCHED_FLOW]'
_TAG_CONFIRM = '[RESCHED_CONFIRM]'
_HISTORY_SCAN = 8   # how many user messages back to search for entities

_AI_PROMPT = """You are Sage, the AI concierge for Dorotheo Dental Clinic.
You are helping a patient reschedule one of their appointments.

RULES:
- Use ONLY the data provided in CONTEXT -- never invent slots, dates, or dentists.
- Dentist and service are LOCKED: only the date and time can change.
- Never show step numbers, headers, or wizard-style formatting.
- Respond naturally and conversationally -- warm, concise, and helpful.
- Keep responses SHORT and mobile-friendly (2-4 sentences max unless listing options).
- Use **bold** for key data (service name, date, time, dentist name).
- When listing dates or times, use short markdown bullets (- ).
- Maximum 6 items per list.
- Match the patient's language (English or Filipino/Tagalog).
- If the patient gives a date/time that is not available, explain why and
  suggest what IS available from the list provided.

CONTEXT:
{context}

SITUATION:
{situation}

Respond naturally to help the patient complete their reschedule request."""


# ==========================================================================
# PUBLIC ENTRY POINT
# ==========================================================================

def handle_reschedule(user, msg: str, hist: list, detected_lang: str) -> dict:
    """
    AI-conversational reschedule flow.
    Identifies appointment, collects new date + time from conversation,
    shows confirmation, then submits on yes.
    """
    if not user:
        return build_reply(lang.login_required('reschedule', detected_lang))

    pending_msg = bsvc.check_pending_requests(user, detected_lang)
    if pending_msg:
        return build_reply(pending_msg, tag='[PENDING_BLOCK]')

    upcoming = Appointment.objects.filter(
        patient=user,
        date__gte=datetime.now().date(),
        status__in=['confirmed', 'pending'],
    ).order_by('date', 'time')

    if not upcoming.exists():
        return build_reply(lang.no_upcoming('reschedule', detected_lang))

    today = datetime.now().date()
    is_tl = detected_lang in (lang.LANG_TAGALOG, lang.LANG_TAGLISH)
    low = msg.lower().strip()

    # -------------------------------------------------------------------------
    # Confirmation gate
    # -------------------------------------------------------------------------
    if _is_awaiting_confirmation(hist):
        if isvc.is_confirm_yes(low):
            appt = _find_appointment(msg, hist, upcoming)
            if appt:
                new_date = _find_new_date(msg, hist, appt, today)
                new_time = _find_new_time(msg, hist)
                if new_date and new_time:
                    success, error_msg = bsvc.submit_reschedule_request(appt, new_date, new_time)
                    if not success:
                        return build_reply(error_msg or (
                            "Hindi po naisumite ang kahilingan. Subukang muli."
                            if is_tl else
                            "Could not submit the request. Please try again."
                        ), tag=_TAG_FLOW)
                    try:
                        create_appointment_notification(appt, 'reschedule_request')
                    except Exception:
                        logger.warning("Notification failed for reschedule appt=%s", appt.id)
                    bmem.clear_session(user.id)
                    old_date, old_time = appt.date, appt.time
                    svc_name = appt.service.name if appt.service else 'N/A'
                    if is_tl:
                        return build_reply(
                            f"\u2705 **Naisumite ang Kahilingang Mag-reschedule!**\n\n"
                            f"**Dati:** {bsvc.fmt_date(old_date)} alas {bsvc.fmt_time(old_time)}\n"
                            f"**Bagong Hiling:** {bsvc.fmt_date(new_date)} alas {bsvc.fmt_time(new_time)}\n"
                            f"**Dentista:** Dr. {appt.dentist.get_full_name()}\n"
                            f"**Serbisyo:** {svc_name}\n\n"
                            "Susuriin at ikukumpirma ng staff ang inyong kahilingan.",
                            tag='[FLOW_COMPLETE]',
                        )
                    return build_reply(
                        f"\u2705 **Reschedule Request Submitted!**\n\n"
                        f"**Original:** {bsvc.fmt_date(old_date)} at {bsvc.fmt_time(old_time)}\n"
                        f"**Requested:** {bsvc.fmt_date(new_date)} at {bsvc.fmt_time(new_time)}\n"
                        f"**Dentist:** Dr. {appt.dentist.get_full_name()}\n"
                        f"**Service:** {svc_name}\n\n"
                        "Staff will review and confirm your reschedule request.",
                        tag='[FLOW_COMPLETE]',
                    )
            # Could not recover all data -- fall through and re-collect
            logger.warning("Reschedule confirm: could not restore appt/date/time from history")

        if isvc.is_confirm_no(low):
            bmem.clear_session(user.id)
            if is_tl:
                return build_reply(
                    "Walang problema! Hindi pa na-reschedule ang appointment. "
                    "May iba pa po ba akong maitutulong?",
                    tag='[FLOW_COMPLETE]',
                )
            return build_reply(
                "No problem! Your appointment has not been rescheduled. "
                "Is there anything else I can help with?",
                tag='[FLOW_COMPLETE]',
            )
        # Not yes/no -- patient may be updating their choice; fall through

    # -------------------------------------------------------------------------
    # Collect entities from the current message + conversation history
    # -------------------------------------------------------------------------
    appt = _find_appointment(msg, hist, upcoming)

    if not appt:
        return _ask_which_appointment(msg, hist, upcoming, is_tl, detected_lang)

    # We have the appointment.  Now find new_date and new_time.
    new_date = _find_new_date(msg, hist, appt, today)
    new_time = _find_new_time(msg, hist) if new_date else None

    # -------------------------------------------------------------------------
    # Validate everything at once — collect ALL issues before responding
    # -------------------------------------------------------------------------
    issues = []   # list of (error_msg_en, error_msg_tl)

    if new_date:
        if new_date <= today:
            issues.append((
                "That date has already passed.",
                "Ang petsa na iyon ay nakalipas na.",
            ))
        elif new_date == appt.date:
            issues.append((
                "That's the same as your current appointment date.",
                "Iyon pa rin ang kasalukuyang petsa ng appointment ninyo.",
            ))
        else:
            # Check weekly rule (exclude the current appointment being rescheduled)
            week_ok, week_err = validate_one_booking_per_week(
                user, new_date, exclude_appointment_id=appt.id,
            )
            if not week_ok:
                week_start = new_date - timedelta(days=new_date.weekday())
                next_week = week_start + timedelta(days=7)
                issues.append((
                    "You already have an appointment scheduled that week. "
                    "We only allow one appointment per week. "
                    f"Your next available window starts **{bsvc.fmt_date(next_week)}**.",
                    "Mayroon ka nang appointment sa linggong iyon. "
                    "Isa lamang po ang pinapayagang appointment bawat linggo. "
                    f"Ang susunod na available na linggo ay nagsisimula sa **{bsvc.fmt_date(next_week)}**.",
                ))

            slots = bsvc.get_available_slots(appt.dentist, new_date, appt.clinic)
            if not slots and not issues:
                return _handle_no_slots(appt, new_date, today, is_tl, detected_lang)

            if new_time and slots and new_time not in slots:
                issues.append((
                    f"{bsvc.fmt_time(new_time)} is not available on {bsvc.fmt_date(new_date)}.",
                    f"{bsvc.fmt_time(new_time)} ay hindi available sa {bsvc.fmt_date(new_date)}.",
                ))

    # If there are issues, explain ALL at once conversationally
    if issues:
        combined_en = " ".join(e for e, _ in issues)
        combined_tl = " ".join(t for _, t in issues)
        override = combined_tl if is_tl else combined_en
        if is_tl:
            override += " Pumili na lang po tayo ng ibang petsa."
        else:
            override += " Let's find another date that works."
        return _ask_new_date(appt, today, is_tl, detected_lang, override_msg=override)

    # No issues with date validation — continue
    if new_date:
        slots = bsvc.get_available_slots(appt.dentist, new_date, appt.clinic)
        if not slots:
            return _handle_no_slots(appt, new_date, today, is_tl, detected_lang)

        if new_time and new_time in slots:
            # All validated — show confirmation
            return _build_confirmation(appt, new_date, new_time, is_tl)

        # Date valid but no time yet (or time not in slots already handled above)
        return _ask_new_time(appt, new_date, slots, is_tl, detected_lang)

    # -------------------------------------------------------------------------
    # No new date yet — ask for one
    # -------------------------------------------------------------------------
    return _ask_new_date(appt, today, is_tl, detected_lang)


# ==========================================================================
# ENTITY EXTRACTION
# ==========================================================================

def _find_appointment(msg: str, hist: list, qs) -> Optional[Appointment]:
    """Find appointment from current message, then history, then singleton."""
    found = bsvc.match_appointment(msg, qs)
    if found:
        return found
    for m in reversed(hist or []):
        if m.get('role') == 'user':
            found = bsvc.match_appointment(m['content'], qs)
            if found:
                return found
    if qs.count() == 1:
        return qs.first()
    return None


def _find_new_date(
    msg: str, hist: list, appt: Appointment, today: date_cls
) -> Optional[date_cls]:
    """
    Find the requested NEW date.
    Try current message first, then walk recent history.
    Excludes the appointment's original date (that's the OLD date).
    """
    user_messages = [msg]
    count = 0
    for m in reversed(hist or []):
        if m.get('role') == 'user' and count < _HISTORY_SCAN:
            user_messages.append(m['content'])
            count += 1

    for text in user_messages:
        d = bsvc.parse_date(text)
        if d and d != appt.date:
            return d
    return None


def _find_new_time(msg: str, hist: list):
    """
    Find the requested new time from current message.
    Fall back to the most recent user message that contains a parseable time
    (within the last few messages -- avoids pulling in stale time values).
    """
    t = bsvc.parse_time(msg)
    if t:
        return t
    count = 0
    for m in reversed(hist or []):
        if m.get('role') == 'user' and count < 3:
            t = bsvc.parse_time(m['content'])
            if t:
                return t
            count += 1
    return None


# ==========================================================================
# CONVERSATIONAL RESPONSE BUILDERS (use LLM where natural)
# ==========================================================================

def _ask_which_appointment(
    msg: str, hist: list, upcoming, is_tl: bool, detected_lang: str
) -> dict:
    """Ask the patient which appointment they want to reschedule."""
    appt_list = _format_appt_list(upcoming)
    qr = [_appt_label(a) for a in upcoming]

    mismatch = bsvc.get_appointment_mismatch_message(msg, upcoming, is_tl, action='reschedule')
    if mismatch:
        return build_reply(mismatch, qr, tag=_TAG_FLOW)

    count = upcoming.count()
    context_text = (
        "Patient upcoming appointments:\n" + appt_list
        + "\n\nNote: Only the date and time can be changed. Dentist and service stay the same."
    )
    if count == 1:
        situation = (
            "The patient wants to reschedule but did not specify which appointment. "
            "They only have one -- gently confirm that is the one they mean."
        )
    else:
        situation = (
            f"The patient wants to reschedule but did not clearly specify which of "
            f"their {count} appointments. Ask which one."
        )

    prompt = (
        _AI_PROMPT.format(context=context_text, situation=situation)
        + f"\n\nPatient said: \"{msg}\""
        + "\n\n" + lang.gemini_language_instruction(detected_lang)
    )
    text = _llm(prompt)
    if text:
        return build_reply(text, qr, tag=_TAG_FLOW)

    if is_tl:
        return build_reply(
            f"Alin pong appointment ang gusto ninyong i-reschedule?\n\n{appt_list}\n\n"
            "_Ang petsa at oras lang po ang mababago — mananatili ang dentista at serbisyo._",
            qr, tag=_TAG_FLOW,
        )
    return build_reply(
        f"Sure! Which appointment would you like to reschedule?\n\n{appt_list}\n\n"
        "_Note: Only the date and time can be changed — dentist and service stay the same._",
        qr, tag=_TAG_FLOW,
    )


def _ask_new_date(
    appt: Appointment, today: date_cls, is_tl: bool, detected_lang: str,
    override_msg: str = ''
) -> dict:
    """Ask the patient for a new date and show available options."""
    avail_dates = _get_available_dates(appt, today)
    qr = [d.strftime('%B %d') for d in avail_dates]

    if not avail_dates:
        if is_tl:
            return build_reply(
                f"Si Dr. {appt.dentist.get_full_name()} ay fully booked po para sa "
                f"susunod na 30 araw. Maaari po ninyong **kanselahin** ito at "
                "gumawa na lang ng bagong booking.",
                ['Cancel Appointment', 'Keep Appointment'],
            )
        return build_reply(
            f"Dr. {appt.dentist.get_full_name()} is fully booked for the next 30 days. "
            "You could cancel this appointment and create a new booking instead if you'd like.",
            ['Cancel Appointment', 'Keep Appointment'],
        )

    dates_text = '\n'.join(f"- **{bsvc.fmt_date(d)}**" for d in avail_dates)
    svc = appt.service.name if appt.service else 'Appointment'

    context_text = (
        f"Appointment being rescheduled:\n"
        f"  Service: {svc}\n"
        f"  Current date: {bsvc.fmt_date(appt.date)} at {bsvc.fmt_time(appt.time)}\n"
        f"  Dentist: Dr. {appt.dentist.get_full_name()}\n\n"
        f"Available dates (next 30 days):\n{dates_text}"
    )
    situation = override_msg if override_msg else (
        "Ask for the new date in a natural way and show the available options."
    )

    prompt = (
        _AI_PROMPT.format(context=context_text, situation=situation)
        + "\n\n" + lang.gemini_language_instruction(detected_lang)
    )
    text = _llm(prompt)
    if text:
        return build_reply(text, qr, tag=_TAG_FLOW)

    body = override_msg or (
        f"Kailan po ninyo gustong ilipat ang **{svc}** ninyo?"
        if is_tl else
        f"When would you like to move your **{svc}** to?"
    )
    return build_reply(f"{body}\n\n{dates_text}", qr, tag=_TAG_FLOW)


def _ask_new_time(
    appt: Appointment, new_date: date_cls, slots: list,
    is_tl: bool, detected_lang: str, override_msg: str = ''
) -> dict:
    """Ask the patient to pick a time slot for the selected new date."""
    qr = [bsvc.fmt_time(s) for s in slots]
    slots_text = '\n'.join(f"- **{bsvc.fmt_time(s)}**" for s in slots)
    svc = appt.service.name if appt.service else 'Appointment'

    context_text = (
        f"Appointment: {svc} with Dr. {appt.dentist.get_full_name()}\n"
        f"New date: {bsvc.fmt_date(new_date)}\n\n"
        f"Available time slots:\n{slots_text}"
    )
    situation = override_msg if override_msg else (
        "Ask the patient to pick a time from the available slots."
    )

    prompt = (
        _AI_PROMPT.format(context=context_text, situation=situation)
        + "\n\n" + lang.gemini_language_instruction(detected_lang)
    )
    text = _llm(prompt)
    if text:
        return build_reply(text, qr, tag=_TAG_FLOW)

    body = override_msg or (
        f"Anong oras po ang gusto ninyo sa **{bsvc.fmt_date(new_date)}**?"
        if is_tl else
        f"Great, **{bsvc.fmt_date(new_date)}** it is! What time works for you?"
    )
    return build_reply(f"{body}\n\n{slots_text}", qr, tag=_TAG_FLOW)


def _handle_no_slots(
    appt: Appointment, new_date: date_cls, today: date_cls,
    is_tl: bool, detected_lang: str
) -> dict:
    """Handle the case where the requested date has no available slots."""
    avail_dates = _get_available_dates(appt, today)
    qr = [d.strftime('%B %d') for d in avail_dates]
    dates_text = '\n'.join(f"- **{bsvc.fmt_date(d)}**" for d in avail_dates)

    context_text = (
        f"Dentist: Dr. {appt.dentist.get_full_name()}\n"
        f"Requested date: {bsvc.fmt_date(new_date)} -- FULLY BOOKED\n\n"
        "Available dates instead:\n" + (dates_text or "No availability in the next 30 days.")
    )
    situation = (
        f"The patient wants {bsvc.fmt_date(new_date)} but {appt.dentist.get_full_name()} "
        "is fully booked on that date. Apologize briefly and show the available alternatives."
    )

    prompt = (
        _AI_PROMPT.format(context=context_text, situation=situation)
        + "\n\n" + lang.gemini_language_instruction(detected_lang)
    )
    text = _llm(prompt)
    if text:
        return build_reply(text, qr, tag=_TAG_FLOW)

    body = (
        f"Puno po ang schedule ni Dr. {appt.dentist.get_full_name()} sa {bsvc.fmt_date(new_date)}. "
        "Narito po ang iba pang available na petsa:"
        if is_tl else
        f"Dr. {appt.dentist.get_full_name()} is all booked up on {bsvc.fmt_date(new_date)}. "
        "Here are some other dates that work:"
    )
    return build_reply(f"{body}\n\n{dates_text}", qr, tag=_TAG_FLOW)


def _build_confirmation(
    appt: Appointment, new_date: date_cls, new_time, is_tl: bool
) -> dict:
    """Deterministic confirmation prompt (no LLM -- safety-critical path)."""
    svc = appt.service.name if appt.service else 'Appointment'
    if is_tl:
        return build_reply(
            f"I-reschedule po ninyo ang:\n\n"
            f"**{svc}** kasama si Dr. {appt.dentist.get_full_name()}\n"
            f"**Dati:** {bsvc.fmt_date(appt.date)} alas {bsvc.fmt_time(appt.time)}\n"
            f"**Bagong Hiling:** {bsvc.fmt_date(new_date)} alas {bsvc.fmt_time(new_time)}\n\n"
            "Magpapadala ito ng kahilingang mag-reschedule sa staff para sa pag-apruba.\n\n"
            "Itutuloy po ba natin?",
            ['Confirm Reschedule', 'Keep Original'],
            tag=_TAG_CONFIRM,
        )
    return build_reply(
        f"You'd like to reschedule:\n\n"
        f"**{svc}** with Dr. {appt.dentist.get_full_name()}\n"
        f"**Current:** {bsvc.fmt_date(appt.date)} at {bsvc.fmt_time(appt.time)}\n"
        f"**Requested:** {bsvc.fmt_date(new_date)} at {bsvc.fmt_time(new_time)}\n\n"
        "This sends a reschedule request to staff for approval.\n\n"
        "Would you like to proceed?",
        ['Confirm Reschedule', 'Keep Original'],
        tag=_TAG_CONFIRM,
    )


# ==========================================================================
# INTERNAL HELPERS
# ==========================================================================

def _is_awaiting_confirmation(hist: list) -> bool:
    for m in reversed(hist or []):
        if m.get('role') == 'assistant':
            return _TAG_CONFIRM in m.get('content', '')
    return False


def _get_available_dates(appt: Appointment, today: date_cls) -> list:
    """Return up to 8 dates where the dentist has open slots (excl. original date)."""
    end = today + timedelta(days=30)
    avails = DentistAvailability.objects.filter(
        dentist=appt.dentist,
        date__gte=today,
        date__lte=end,
        is_available=True,
    )
    if appt.clinic:
        avails = avails.filter(
            Q(clinic=appt.clinic) | Q(apply_to_all_clinics=True)
        )
    dates = []
    for av in avails.order_by('date'):
        if av.date == appt.date:
            continue
        if bsvc.get_available_slots(appt.dentist, av.date, appt.clinic):
            dates.append(av.date)
        if len(dates) >= 8:
            break
    return dates


def _appt_label(a) -> str:
    svc = a.service.name if a.service else 'Appointment'
    return f"{svc} \u2013 {bsvc.fmt_date(a.date)} at {bsvc.fmt_time(a.time)}"


def _format_appt_list(qs) -> str:
    lines = []
    for a in qs:
        lines.append(f"- **{_appt_label(a)}** with Dr. {a.dentist.get_full_name()}")
    return '\n'.join(lines)


def _llm(prompt: str) -> str:
    try:
        result = get_llm_service().generate(prompt)
        return result or ''
    except Exception:
        return ''
