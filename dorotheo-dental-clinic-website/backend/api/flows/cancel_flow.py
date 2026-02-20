"""
Cancel Flow — 2 Steps
──────────────────────
Step C1: Select appointment to cancel
Step C2: Confirm → Submit cancellation request

Cancellation is a soft operation — status changes to 'cancel_requested'.
Staff must approve the request before the appointment is actually cancelled.
"""

import logging
from datetime import datetime

from ..models import Appointment
from ..services import booking_service as bsvc
from ..services import intent_service as isvc
from .. import language_detection as lang
from ..views import create_appointment_notification
from . import build_reply

logger = logging.getLogger('chatbot.flow.cancel')


# ═══════════════════════════════════════════════════════════════════════════
# PUBLIC ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════

def handle_cancel(user, msg: str, hist: list, detected_lang: str) -> dict:
    """
    Run the cancel flow for an authenticated user.
    Returns a response dict.
    """
    if not user:
        return build_reply(lang.login_required('cancel', detected_lang))

    # 🔒 Pending request lock
    pending_msg = bsvc.check_pending_requests(user)
    if pending_msg:
        return build_reply(pending_msg, tag='[PENDING_BLOCK]')

    upcoming = Appointment.objects.filter(
        patient=user,
        date__gte=datetime.now().date(),
        status__in=['confirmed', 'pending'],
    ).order_by('date', 'time')

    if not upcoming.exists():
        return build_reply(lang.no_upcoming('cancel', detected_lang))

    low = msg.lower()

    # ── Confirm / Keep (for active cancel flow) ──────────────────────
    if isvc.step_tag_exists(hist, '[CANCEL_STEP_'):
        if isvc.is_confirm_yes(low):
            appt = _find_cancel_appointment(hist, upcoming)
            if not appt:
                qr = []
                for a in upcoming:
                    svc_n = a.service.name if a.service else 'Appointment'
                    qr.append(f"{svc_n} – {a.date.strftime('%B %d, %Y')}")
                return build_reply(
                    "I wasn't able to identify the appointment. Could you select one from the list?",
                    qr,
                    tag='[CANCEL_STEP_1]',
                )

            bsvc.submit_cancel_request(appt)

            # Send notification to staff/owner
            create_appointment_notification(appt, 'cancel_request')

            svc = appt.service.name if appt.service else 'Appointment'
            return build_reply(
                f"📋 **Cancellation Request Submitted**\n\n"
                f"**Service:** {svc}\n"
                f"**Date:** {bsvc.fmt_date_full(appt.date)}\n"
                f"**Time:** {bsvc.fmt_time(appt.time)}\n"
                f"**Dentist:** Dr. {appt.dentist.get_full_name()}\n\n"
                "Your request has been sent to the staff/owner for review. "
                "You will be notified once it is approved. Your appointment remains active until then.",
                tag='[FLOW_COMPLETE]',
            )

        if isvc.is_confirm_no(low):
            return build_reply(
                "No problem! Your appointment has been kept. Is there anything else I can help with?",
                tag='[FLOW_COMPLETE]',
            )

    # ── STEP C2: Confirmation prompt (after user selected an appointment) ──
    if isvc.step_tag_exists(hist, '[CANCEL_STEP_1]'):
        appt = bsvc.match_appointment(msg, upcoming)
        if not appt:
            qr = []
            for a in upcoming:
                svc = a.service.name if a.service else 'Appointment'
                qr.append(f"{svc} – {a.date.strftime('%B %d, %Y')}")
            return build_reply(
                "I wasn't able to identify which appointment you meant. "
                "Could you please select one from the options below?",
                qr,
                tag='[CANCEL_STEP_1]',
            )
        svc = appt.service.name if appt.service else 'Appointment'
        return build_reply(
            f"**Request Cancellation**\n\n"
            f"You are about to request cancellation for:\n\n"
            f"**Service:** {svc}\n"
            f"**Date:** {bsvc.fmt_date_full(appt.date)}\n"
            f"**Time:** {bsvc.fmt_time(appt.time)}\n"
            f"**Dentist:** Dr. {appt.dentist.get_full_name()}\n\n"
            "This will send a cancellation request to the staff/owner for approval. "
            "Your appointment stays active until they approve it.\n\n"
            "Would you like to proceed?",
            ['Request Cancellation', 'Keep Appointment'],
            tag='[CANCEL_STEP_2]',
        )

    # ── STEP C1: List appointments ────────────────────────────────────
    lines = ["**Cancel – Select Appointment**\n"]
    qr = []
    for a in upcoming:
        svc = a.service.name if a.service else 'Appointment'
        label = f"{svc} – {a.date.strftime('%B %d, %Y')}"
        lines.append(f"• {label}")
        qr.append(label)
    lines.append("\nWhich appointment would you like to cancel?")
    return build_reply('\n'.join(lines), qr, tag='[CANCEL_STEP_1]')


# ═══════════════════════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def _find_cancel_appointment(hist: list, qs):
    """Walk history to find which appointment was selected."""
    for m in reversed(hist or []):
        if m.get('role') == 'user':
            found = bsvc.match_appointment(m['content'], qs)
            if found:
                return found
    if qs.count() == 1:
        return qs.first()
    return None
