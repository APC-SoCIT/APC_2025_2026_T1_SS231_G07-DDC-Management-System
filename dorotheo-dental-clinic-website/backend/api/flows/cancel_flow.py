"""
Cancel Flow — Conversational, Fully Validated
===============================================
Cancellation is a soft operation — status changes to 'cancel_requested'.
Staff must approve before the appointment is actually cancelled.

Architecture (NO wizard behaviour):
1. Check pending lock. STOP if blocked.
2. If user says "cancel my appointment" without specifying which → ALWAYS
   show the appointment list so they can pick.
3. If user specifies one → validate it exists.
4. Show confirmation → submit on yes → mark pending_cancel.
5. Pending lock blocks all further booking/reschedule/cancel until resolved.

No wizard steps, no numbered headers. Conversational tone always.
State tags (hidden in comment blocks in assistant messages):
  [CANCEL_FLOW]    -- actively in the cancel conversation
  [CANCEL_CONFIRM] -- showed confirmation prompt, awaiting yes/no
"""

import logging
from datetime import datetime

from ..models import Appointment
from ..services import booking_service as bsvc
from ..services import intent_service as isvc
from ..services.llm_service import get_llm_service
from .. import booking_memory as bmem
from .. import language_detection as lang
from ..views import create_appointment_notification
from . import build_reply

logger = logging.getLogger('chatbot.flow.cancel')

_TAG_FLOW    = '[CANCEL_FLOW]'
_TAG_CONFIRM = '[CANCEL_CONFIRM]'

_AI_PROMPT = """You are Sage, the AI concierge for Dorotheo Dental Clinic.
You are helping a patient request a cancellation of one of their appointments.

RULES:
- Use ONLY the appointment data listed in CONTEXT -- never invent appointments.
- Never show step numbers, headers, or form-like wizard formatting.
- Respond naturally and conversationally -- friendly, concise, and helpful.
- Keep responses SHORT and mobile-friendly (2-4 sentences max).
- Use **bold** for key data (service name, date, time, dentist).
- When listing appointments, use short markdown bullets (- ).
- Match the patient's language (English or Filipino/Tagalog).
- If the patient mentioned an appointment that does not exist (wrong date or
  service), gently correct them and show what is actually available.

CONTEXT:
{context}

SITUATION:
{situation}

Respond naturally to help the patient identify their appointment."""


def handle_cancel(user, msg: str, hist: list, detected_lang: str) -> dict:
    """
    AI-conversational cancel flow.
    Identifies the appointment from the message + history, shows a
    confirmation, then submits the cancel request on yes.
    """
    if not user:
        return build_reply(lang.login_required('cancel', detected_lang))

    pending_msg = bsvc.check_pending_requests(user, detected_lang)
    if pending_msg:
        return build_reply(pending_msg, tag='[PENDING_BLOCK]')

    upcoming = Appointment.objects.filter(
        patient=user,
        date__gte=datetime.now().date(),
        status__in=['confirmed', 'pending'],
    ).order_by('date', 'time')

    if not upcoming.exists():
        return build_reply(lang.no_upcoming('cancel', detected_lang))

    is_tl = detected_lang in (lang.LANG_TAGALOG, lang.LANG_TAGLISH)
    low = msg.lower().strip()

    # Confirmation gate: if last assistant message was a confirmation prompt,
    # handle yes / no. If neither, fall through to re-identification (patient
    # may be clarifying which appointment).
    if _is_awaiting_confirmation(hist):
        if isvc.is_confirm_yes(low):
            appt = _find_appointment(msg, hist, upcoming)
            if appt:
                ok = bsvc.submit_cancel_request(appt)
                if not ok:
                    err = (
                        "Hindi po naisumite ang kahilingan sa ngayon. "
                        "Puwede po ninyong subukan muli, o tawagan na lang ang clinic."
                        if is_tl else
                        "We couldn't submit the cancellation request right now. "
                        "You can try again, or give the clinic a call directly."
                    )
                    return build_reply(err, tag=_TAG_FLOW)
                try:
                    create_appointment_notification(appt, 'cancel_request')
                except Exception:
                    logger.warning("Notification failed for cancel appt=%s", appt.id)
                bmem.clear_session(user.id)
                svc = appt.service.name if appt.service else 'Appointment'
                if is_tl:
                    return build_reply(
                        f"\U0001f4cb **Naisumite ang Kahilingang Pangkansela**\n\n"
                        f"**Serbisyo:** {svc}\n"
                        f"**Petsa:** {bsvc.fmt_date_full(appt.date)}\n"
                        f"**Oras:** {bsvc.fmt_time(appt.time)}\n"
                        f"**Dentista:** Dr. {appt.dentist.get_full_name()}\n\n"
                        "Naipadala na po ang kahilingan sa staff para sa review. "
                        "Maaabisuhan po kayo kapag naaprubahan. "
                        "Aktibo pa rin ang appointment hanggang sa iyon.",
                        tag='[FLOW_COMPLETE]',
                    )
                return build_reply(
                    f"\U0001f4cb **Cancellation Request Submitted**\n\n"
                    f"**Service:** {svc}\n"
                    f"**Date:** {bsvc.fmt_date_full(appt.date)}\n"
                    f"**Time:** {bsvc.fmt_time(appt.time)}\n"
                    f"**Dentist:** Dr. {appt.dentist.get_full_name()}\n\n"
                    "Your request has been sent to staff for review. "
                    "You will be notified once it is approved. "
                    "Your appointment stays active until then.",
                    tag='[FLOW_COMPLETE]',
                )

        if isvc.is_confirm_no(low):
            bmem.clear_session(user.id)
            if is_tl:
                return build_reply(
                    "Walang problema! Nananatili ang inyong appointment. "
                    "May iba pa po ba akong maitutulong?",
                    tag='[FLOW_COMPLETE]',
                )
            return build_reply(
                "No problem! Your appointment has been kept. "
                "Is there anything else I can help with?",
                tag='[FLOW_COMPLETE]',
            )

    # Identify appointment from current message or history
    appt = _find_appointment(msg, hist, upcoming)
    if appt:
        return _build_confirmation(appt, is_tl)

    # No clear match -- ask patient to clarify
    qr = [_appt_label(a) for a in upcoming]
    appt_list = _format_list(upcoming)

    mismatch = bsvc.get_appointment_mismatch_message(msg, upcoming, is_tl, action='cancel')
    if mismatch:
        return build_reply(mismatch, qr, tag=_TAG_FLOW)

    count = upcoming.count()
    context_text = f"Patient upcoming appointments:\n{appt_list}"
    if count == 1:
        situation = (
            "The patient wants to cancel but did not clearly specify the appointment. "
            "They only have one -- gently confirm that is the one they mean."
        )
    else:
        situation = (
            f"The patient wants to cancel but their message does not clearly match any of "
            f"their {count} upcoming appointments. Ask which one they would like to cancel."
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
            f"Aling appointment po ang gusto ninyong kanselahin?\n\n{appt_list}",
            qr, tag=_TAG_FLOW,
        )
    return build_reply(
        f"Sure! Which appointment would you like to cancel?\n\n{appt_list}",
        qr, tag=_TAG_FLOW,
    )


# Internal helpers

def _is_awaiting_confirmation(hist: list) -> bool:
    for m in reversed(hist or []):
        if m.get('role') == 'assistant':
            return _TAG_CONFIRM in m.get('content', '')
    return False


def _find_appointment(msg: str, hist: list, qs):
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


def _appt_label(a) -> str:
    svc = a.service.name if a.service else 'Appointment'
    return f"{svc} \u2013 {bsvc.fmt_date_full(a.date)} at {bsvc.fmt_time(a.time)}"


def _format_list(qs) -> str:
    lines = []
    for a in qs:
        lines.append(f"- **{_appt_label(a)}** with Dr. {a.dentist.get_full_name()}")
    return '\n'.join(lines)


def _build_confirmation(appt, is_tl: bool) -> dict:
    svc = appt.service.name if appt.service else 'Appointment'
    if is_tl:
        return build_reply(
            f"Gusto po ninyong kanselahin ang:\n\n"
            f"**{svc}** \u2013 {bsvc.fmt_date_full(appt.date)} alas {bsvc.fmt_time(appt.time)}\n"
            f"**Dentista:** Dr. {appt.dentist.get_full_name()}\n\n"
            "Magpapadala ito ng kahilingang pangkansela sa staff para sa pag-apruba. "
            "Mananatiling aktibo ang appointment hanggang doon.\n\n"
            "Itutuloy po ba natin?",
            ['Request Cancellation', 'Keep Appointment'],
            tag=_TAG_CONFIRM,
        )
    return build_reply(
        f"You'd like to cancel:\n\n"
        f"**{svc}** \u2013 {bsvc.fmt_date_full(appt.date)} at {bsvc.fmt_time(appt.time)}\n"
        f"**Dentist:** Dr. {appt.dentist.get_full_name()}\n\n"
        "This sends a cancellation request to staff for approval. "
        "Your appointment stays active until they approve it.\n\n"
        "Would you like to proceed?",
        ['Request Cancellation', 'Keep Appointment'],
        tag=_TAG_CONFIRM,
    )


def _llm(prompt: str) -> str:
    try:
        result = get_llm_service().generate(prompt)
        return result or ''
    except Exception:
        return ''
