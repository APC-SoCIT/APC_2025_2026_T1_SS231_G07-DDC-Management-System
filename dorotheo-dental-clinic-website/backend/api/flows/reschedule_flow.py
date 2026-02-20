"""
Reschedule Flow — 4 Steps
──────────────────────────
Step R1: Select appointment to reschedule
Step R2: Select new date
Step R3: Select new time
Step R4: Confirm → Submit reschedule request

Dentist and service are LOCKED — only date/time can change.
Submits a reschedule REQUEST (staff must approve).
"""

import logging
from datetime import datetime, timedelta

from django.db.models import Q

from ..models import Appointment, DentistAvailability
from ..services import booking_service as bsvc
from ..services import intent_service as isvc
from .. import language_detection as lang
from ..views import create_appointment_notification
from . import build_reply

logger = logging.getLogger('chatbot.flow.reschedule')


# ═══════════════════════════════════════════════════════════════════════════
# PUBLIC ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════

def handle_reschedule(user, msg: str, hist: list, detected_lang: str) -> dict:
    """
    Run the reschedule flow for an authenticated user.
    Returns a response dict.
    """
    if not user:
        return build_reply(lang.login_required('reschedule', detected_lang))

    # 🔒 Pending request lock
    pending_msg = bsvc.check_pending_requests(user)
    if pending_msg:
        return build_reply(pending_msg, tag='[PENDING_BLOCK]')

    # Only show confirmed/pending appointments
    upcoming = Appointment.objects.filter(
        patient=user,
        date__gte=datetime.now().date(),
        status__in=['confirmed', 'pending'],
    ).order_by('date', 'time')

    if not upcoming.exists():
        return build_reply(lang.no_upcoming('reschedule', detected_lang))

    today = datetime.now().date()

    # ── STEP R1: Pick appointment ─────────────────────────────────────
    if not isvc.step_tag_exists(hist, '[RESCHED_STEP_'):
        lines = ["**Reschedule – Select Appointment**\n"]
        qr = []
        for a in upcoming:
            svc = a.service.name if a.service else 'Appointment'
            label = f"{svc} – {bsvc.fmt_date(a.date)}"
            lines.append(f"• {label}")
            qr.append(label)
        lines.append("\nSelect the appointment you'd like to reschedule:")
        lines.append("\n*Note: You can only change the date/time. Dentist and service stay the same.*")
        return build_reply('\n'.join(lines), qr, tag='[RESCHED_STEP_1]')

    # ── STEP R2: Pick new date ────────────────────────────────────────
    if (isvc.step_tag_exists(hist, '[RESCHED_STEP_1]')
            and not isvc.step_tag_exists(hist, '[RESCHED_STEP_2]')):

        appt = bsvc.match_appointment(msg, upcoming)
        if not appt:
            qr = []
            for a in upcoming:
                svc = a.service.name if a.service else 'Appointment'
                qr.append(f"{svc} – {bsvc.fmt_date(a.date)}")
            return build_reply(
                "I wasn't able to identify which appointment you meant. "
                "Could you please select one from the options below?",
                qr,
                tag='[RESCHED_STEP_1]',
            )

        dentist = appt.dentist
        clinic = appt.clinic
        end = today + timedelta(days=30)

        avails = DentistAvailability.objects.filter(
            dentist=dentist, date__gte=today, date__lte=end, is_available=True,
        )
        if clinic:
            avails = avails.filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True))
        avails = avails.order_by('date')

        dates = []
        for av in avails:
            if bsvc.get_available_slots(dentist, av.date, clinic) and av.date != appt.date:
                dates.append(av.date)
            if len(dates) >= 8:
                break

        if not dates:
            return build_reply(
                f"Dr. {dentist.get_full_name()} is fully booked for the next 30 days.\n\n"
                "We recommend **cancelling** this appointment and creating a **new booking** "
                "with a different dentist.",
                ['Cancel Appointment', 'Keep Appointment'],
            )

        lines = [f"**Reschedule – Choose New Date**\n\nDr. {dentist.get_full_name()}:\n"]
        qr = []
        for d in dates:
            label = bsvc.fmt_date(d)
            lines.append(f"• {label}")
            qr.append(d.strftime('%B %d'))
        lines.append("\nSelect a new date:")
        return build_reply('\n'.join(lines), qr, tag='[RESCHED_STEP_2]')

    # ── STEP R3: Pick new time ────────────────────────────────────────
    if (isvc.step_tag_exists(hist, '[RESCHED_STEP_2]')
            and not isvc.step_tag_exists(hist, '[RESCHED_STEP_3]')):

        date = bsvc.parse_date(msg)
        if not date:
            # Re-show available dates
            appt = _find_resched_appointment(hist, upcoming)
            if appt:
                dentist = appt.dentist
                clinic = appt.clinic
                end = today + timedelta(days=30)
                avails = DentistAvailability.objects.filter(
                    dentist=dentist, date__gte=today, date__lte=end, is_available=True,
                )
                if clinic:
                    avails = avails.filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True))
                dates = []
                for av in avails.order_by('date'):
                    if bsvc.get_available_slots(dentist, av.date, clinic) and av.date != appt.date:
                        dates.append(av.date)
                    if len(dates) >= 8:
                        break
                qr = [d.strftime('%B %d') for d in dates]
                return build_reply(
                    "I wasn't able to read that date. Please select from the available dates below, "
                    "or type a date like **February 15** or **bukas** (tomorrow).",
                    qr,
                    tag='[RESCHED_STEP_2]',
                )
            return build_reply(
                "I wasn't able to read that date. Please type a date like **February 15** or **bukas** (tomorrow).",
                tag='[RESCHED_STEP_2]',
            )

        appt = _find_resched_appointment(hist, upcoming)
        if not appt:
            return build_reply("Something went wrong finding your appointment. Please start over by saying 'reschedule'.")

        slots = bsvc.get_available_slots(appt.dentist, date, appt.clinic)
        if not slots:
            return build_reply(
                f"No open slots on {bsvc.fmt_date(date)}. Please pick a different date.",
                tag='[RESCHED_STEP_2]',
            )
        lines = [f"**Reschedule – Choose New Time** ({bsvc.fmt_date(date)})\n"]
        qr = []
        # Mobile-first: show max 6 individual slots
        shown_slots = slots[:6]
        for s in shown_slots:
            label = bsvc.fmt_time(s)
            lines.append(f"• {label}")
            qr.append(label)
        if len(slots) > 6:
            remaining = len(slots) - 6
            lines.append(f"\n_{remaining} more time slots available._")
            for s in slots[6:]:
                qr.append(bsvc.fmt_time(s))
        lines.append("\nSelect a time:")
        return build_reply('\n'.join(lines), qr, tag='[RESCHED_STEP_3]')

    # ── STEP R4: Confirm reschedule ───────────────────────────────────
    if isvc.step_tag_exists(hist, '[RESCHED_STEP_3]'):
        time_val = bsvc.parse_time(msg)
        if not time_val:
            return build_reply(
                "I wasn't able to read that time. Please select from the options above, "
                "or type a time like **9:00 AM** or **2pm**.",
                tag='[RESCHED_STEP_3]',
            )

        appt = _find_resched_appointment(hist, upcoming)
        if not appt:
            return build_reply("Something went wrong. Please start over by saying 'reschedule'.")

        # Get date from previous step
        date = _find_resched_date(hist)
        if not date:
            return build_reply("I lost track of the date. Please start over by saying 'reschedule'.")

        # Submit via atomic transaction
        old_date, old_time = appt.date, appt.time
        success, error_msg = bsvc.submit_reschedule_request(appt, date, time_val)

        if not success:
            return build_reply(error_msg, tag='[RESCHED_STEP_3]')

        # Send notification to staff/owner
        create_appointment_notification(appt, 'reschedule_request')

        return build_reply(
            f"✅ **Reschedule Request Submitted!**\n\n"
            f"**Original:** {bsvc.fmt_date(old_date)} at {bsvc.fmt_time(old_time)}\n"
            f"**Requested:** {bsvc.fmt_date(date)} at {bsvc.fmt_time(time_val)}\n"
            f"**Dentist:** Dr. {appt.dentist.get_full_name()}\n"
            f"**Service:** {appt.service.name if appt.service else 'N/A'}\n\n"
            "Staff will review and confirm your reschedule request.",
            tag='[FLOW_COMPLETE]',
        )

    return build_reply("Let me help you reschedule. Please say 'reschedule' to start.")


# ═══════════════════════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def _find_resched_appointment(hist: list, qs) -> Appointment:
    """Walk history to find which appointment was selected in STEP R1."""
    for m in reversed(hist or []):
        if m.get('role') == 'user':
            found = bsvc.match_appointment(m['content'], qs)
            if found:
                return found
    if qs.count() == 1:
        return qs.first()
    return None


def _find_resched_date(hist: list):
    """Walk history to find the date picked in STEP R2."""
    for m in reversed(hist or []):
        if m.get('role') == 'user':
            d = bsvc.parse_date(m['content'])
            if d:
                return d
    return None
