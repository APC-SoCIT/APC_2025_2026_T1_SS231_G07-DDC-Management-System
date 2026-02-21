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
    pending_msg = bsvc.check_pending_requests(user, detected_lang)
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
    is_tl = detected_lang in (lang.LANG_TAGALOG, lang.LANG_TAGLISH)

    # ── STEP R1: Pick appointment ─────────────────────────────────────
    if not isvc.step_tag_exists(hist, '[RESCHED_STEP_'):
        # Try to auto-match from the initial message so that when the user says
        # "reschedule my march 16 appointment" we jump straight to date picking.
        auto_match = bsvc.match_appointment(msg, upcoming)
        if auto_match:
            return _build_date_picker(auto_match, today, is_tl)

        if is_tl:
            header = "### I-reschedule \u2013 Pumili ng Appointment\n"
            footer = "\nAlin pong appointment ang gusto ninyong i-reschedule?"
            note = "\n*Ang maaari lamang baguhin ay ang petsa/oras. Ang dentista at serbisyo ay mananatiling pareho.*"
        else:
            header = "### Reschedule \u2013 Select Appointment\n"
            footer = "\nSelect the appointment you'd like to reschedule:"
            note = "\n*Note: You can only change the date/time. Dentist and service stay the same.*"
        lines = [header]
        qr = []
        for a in upcoming:
            svc = a.service.name if a.service else 'Appointment'
            label = f"{svc} \u2013 {bsvc.fmt_date(a.date)}"
            lines.append(f"- **{label}**")
            qr.append(label)
        lines.append(footer)
        lines.append(note)
        return build_reply('\n'.join(lines), qr, tag='[RESCHED_STEP_1]')

    # ── STEP R2: Pick new date ────────────────────────────────────────
    if (isvc.step_tag_exists(hist, '[RESCHED_STEP_1]')
            and not isvc.step_tag_exists(hist, '[RESCHED_STEP_2]')):

        appt = bsvc.match_appointment(msg, upcoming)
        if not appt:
            qr = []
            for a in upcoming:
                svc = a.service.name if a.service else 'Appointment'
                qr.append(f"{svc} \u2013 {bsvc.fmt_date(a.date)}")
            err = (
                "Hindi ko po ma-identify kung aling appointment ang tinutukoy ninyo. "
                "Puwede po bang pumili mula sa mga opsyon sa ibaba?"
                if is_tl else
                "I wasn't able to identify which appointment you meant. "
                "Could you please select one from the options below?"
            )
            return build_reply(err, qr, tag='[RESCHED_STEP_1]')

        return _build_date_picker(appt, today, is_tl)

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
                err2 = (
                    "Hindi ko po nabasa ang petsang iyon. Pumili po mula sa mga available na petsa sa ibaba, "
                    "o mag-type ng petsa tulad ng **Pebrero 15** o **bukas**."
                    if is_tl else
                    "I wasn't able to read that date. Please select from the available dates below, "
                    "or type a date like **February 15** or **bukas** (tomorrow)."
                )
                return build_reply(err2, qr, tag='[RESCHED_STEP_2]')
            err3 = (
                "Hindi ko po nabasa ang petsang iyon. Mag-type po ng petsa tulad ng **Pebrero 15** o **bukas**."
                if is_tl else
                "I wasn't able to read that date. Please type a date like **February 15** or **bukas** (tomorrow)."
            )
            return build_reply(err3, tag='[RESCHED_STEP_2]')

        appt = _find_resched_appointment(hist, upcoming)
        if not appt:
            err4 = (
                "May problema po sa paghahanap ng appointment. Pakisabi ulit ng 'reschedule' para magsimula."
                if is_tl else
                "Something went wrong finding your appointment. Please start over by saying 'reschedule'."
            )
            return build_reply(err4)

        # If user typed a bare day-of-week and multiple dates share that weekday, re-show date picker
        _weekday_num = bsvc.parse_weekday_name(msg)
        if _weekday_num is not None:
            end = today + timedelta(days=30)
            avails = DentistAvailability.objects.filter(
                dentist=appt.dentist, date__gte=today, date__lte=end, is_available=True,
            )
            if appt.clinic:
                avails = avails.filter(Q(clinic=appt.clinic) | Q(apply_to_all_clinics=True))
            matching = [
                av.date for av in avails.order_by('date')
                if av.date.weekday() == _weekday_num
                and av.date != appt.date
                and bsvc.get_available_slots(appt.dentist, av.date, appt.clinic)
            ]
            if len(matching) > 1:
                day_name = msg.strip().title()
                hdr = (
                    f"May ilang **{day_name}** na available. Alin po ang gusto mo?\n"
                    if is_tl else
                    f"Multiple **{day_name}s** are available. Which one would you like?\n"
                )
                lines = [hdr]
                qr = []
                for d in matching:
                    lines.append(f"- **{bsvc.fmt_date(d)}**")
                    qr.append(d.strftime('%B %d'))
                lines.append("\nPumili po ng petsa:" if is_tl else "\nSelect a date:")
                return build_reply('\n'.join(lines), qr, tag='[RESCHED_STEP_2]')

        slots = bsvc.get_available_slots(appt.dentist, date, appt.clinic)
        if not slots:
            # Dentist is fully booked on this date — suggest other available dentists
            alt_dentists = bsvc.get_alt_dentists_on_date(appt.clinic, date, exclude_dentist=appt.dentist)
            if alt_dentists:
                alt_names = [f"Dr. {d.get_full_name()}" for d in alt_dentists]
                if is_tl:
                    err5 = (
                        f"Puno na po ang schedule ni **Dr. {appt.dentist.get_full_name()}** "
                        f"sa {bsvc.fmt_date(date)}.\n\n"
                        "Ngunit may available na ibang dentist sa parehong araw:\n"
                        + '\n'.join(f'- **{n}**' for n in alt_names)
                        + "\n\nGusto mo bang pumili ng isa sa kanila, o pumili ng ibang petsa?"
                    )
                else:
                    err5 = (
                        f"**Dr. {appt.dentist.get_full_name()}** is fully booked on "
                        f"{bsvc.fmt_date(date)}.\n\n"
                        "However, the following dentists are available on that same day:\n"
                        + '\n'.join(f'- **{n}**' for n in alt_names)
                        + "\n\nWould you like to reschedule with one of them, or pick a different date?"
                    )
                qr = alt_names + (["Pumili ng ibang petsa"] if is_tl else ["Pick different date"])
                return build_reply(err5, qr, tag='[RESCHED_STEP_2]')
            else:
                err5 = (
                    f"Puno na po ang lahat ng dentist sa {bsvc.fmt_date(date)}. Pumili po ng ibang petsa."
                    if is_tl else
                    f"All dentists are fully booked on {bsvc.fmt_date(date)}. Please pick a different date."
                )
                return build_reply(err5, tag='[RESCHED_STEP_2]')
        if is_tl:
            time_hdr = f"### I-reschedule \u2013 Pumili ng Bagong Oras\n\n(**{bsvc.fmt_date(date)}**)\n"
            time_footer = "\nPumili po ng oras:"
            more_label = "pang available na slot."
        else:
            time_hdr = f"### Reschedule \u2013 Choose New Time\n\n(**{bsvc.fmt_date(date)}**)\n"
            time_footer = "\nSelect a time:"
            more_label = "more time slots available."
        lines = [time_hdr]
        qr = []
        for s in slots:
            label = bsvc.fmt_time(s)
            lines.append(f"- **{label}**")
            qr.append(label)
        lines.append(time_footer)
        return build_reply('\n'.join(lines), qr, tag='[RESCHED_STEP_3]')

    # ── STEP R4: Confirm reschedule ───────────────────────────────────
    if isvc.step_tag_exists(hist, '[RESCHED_STEP_3]'):
        # ── "More slots" / "other times" navigation ──
        _low_msg = msg.lower().strip()
        _more_patterns = ['more slot', 'mor slot', 'more time', 'other time',
                          'next slot', 'show more', 'iba pa', 'dagdag',
                          'more option', 'other slot', 'other option']
        if any(p in _low_msg for p in _more_patterns) or _low_msg in ('more', 'mor'):
            appt = _find_resched_appointment(hist, upcoming)
            date = _find_resched_date(hist)
            if appt and date:
                slots = bsvc.get_available_slots(appt.dentist, date, appt.clinic)
                if slots and len(slots) > 6:
                    more_hdr = (
                        f"### I-reschedule \u2013 Mga Karagdagang Slot\n\n(**{bsvc.fmt_date(date)}**)\n"
                        if is_tl else
                        f"### Reschedule \u2013 More Time Slots\n\n(**{bsvc.fmt_date(date)}**)\n"
                    )
                    lines = [more_hdr]
                    qr = []
                    for s in slots:
                        label = bsvc.fmt_time(s)
                        lines.append(f"- **{label}**")
                        qr.append(label)
                    lines.append("\nPumili po ng oras:" if is_tl else "\nSelect a time:")
                    return build_reply('\n'.join(lines), qr, tag='[RESCHED_STEP_3]')
                elif slots:
                    all_hdr = (
                        f"### I-reschedule \u2013 Lahat ng Available na Oras\n\n(**{bsvc.fmt_date(date)}**)\n"
                        if is_tl else
                        f"### Reschedule \u2013 All Available Times\n\n(**{bsvc.fmt_date(date)}**)\n"
                    )
                    lines = [all_hdr]
                    qr = []
                    for s in slots:
                        label = bsvc.fmt_time(s)
                        lines.append(f"- **{label}**")
                        qr.append(label)
                    all_footer = (
                        "\nIto na po ang lahat ng available na slot. Pumili po ng oras:"
                        if is_tl else
                        "\nThese are all the available slots. Select a time:"
                    )
                    lines.append(all_footer)
                    return build_reply('\n'.join(lines), qr, tag='[RESCHED_STEP_3]')

        time_val = bsvc.parse_time(msg)
        if not time_val:
            time_err = (
                "Hindi ko po nabasa ang oras na iyon. Pumili po mula sa mga opsyon sa itaas, "
                "o mag-type ng oras tulad ng **9:00 AM** o **2pm**."
                if is_tl else
                "I wasn't able to read that time. Please select from the options above, "
                "or type a time like **9:00 AM** or **2pm**."
            )
            return build_reply(time_err, tag='[RESCHED_STEP_3]')

        appt = _find_resched_appointment(hist, upcoming)
        if not appt:
            appt_err = (
                "May pagkakamali po. Pakisabi ulit ng 'reschedule' para magsimula."
                if is_tl else
                "Something went wrong. Please start over by saying 'reschedule'."
            )
            return build_reply(appt_err)

        date = _find_resched_date(hist)
        if not date:
            date_err = (
                "Nawala ko po ang petsa. Pakisabi ulit ng 'reschedule' para magsimula."
                if is_tl else
                "I lost track of the date. Please start over by saying 'reschedule'."
            )
            return build_reply(date_err)

        old_date, old_time = appt.date, appt.time
        success, error_msg = bsvc.submit_reschedule_request(appt, date, time_val)

        if not success:
            return build_reply(error_msg, tag='[RESCHED_STEP_3]')

        create_appointment_notification(appt, 'reschedule_request')

        if is_tl:
            return build_reply(
                f"\u2705 **Naisumite ang Kahilingang Mag-reschedule!**\n\n"
                f"**Dati:** {bsvc.fmt_date(old_date)} alas {bsvc.fmt_time(old_time)}\n"
                f"**Bagong Hiling:** {bsvc.fmt_date(date)} alas {bsvc.fmt_time(time_val)}\n"
                f"**Dentista:** Dr. {appt.dentist.get_full_name()}\n"
                f"**Serbisyo:** {appt.service.name if appt.service else 'N/A'}\n\n"
                "Susuriin at ikukumpirma ng staff ang inyong kahilingang mag-reschedule.",
                tag='[FLOW_COMPLETE]',
            )
        return build_reply(
            f"\u2705 **Reschedule Request Submitted!**\n\n"
            f"**Original:** {bsvc.fmt_date(old_date)} at {bsvc.fmt_time(old_time)}\n"
            f"**Requested:** {bsvc.fmt_date(date)} at {bsvc.fmt_time(time_val)}\n"
            f"**Dentist:** Dr. {appt.dentist.get_full_name()}\n"
            f"**Service:** {appt.service.name if appt.service else 'N/A'}\n\n"
            "Staff will review and confirm your reschedule request.",
            tag='[FLOW_COMPLETE]',
        )

    fallback = (
        "Tulungan ko po kayong mag-reschedule. Pakisabi ng 'reschedule' para magsimula."
        if is_tl else
        "Let me help you reschedule. Please say 'reschedule' to start."
    )
    return build_reply(fallback)


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


def _build_date_picker(appt: Appointment, today, is_tl: bool) -> dict:
    """Build the STEP R2 date-picker response for a given appointment."""
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
        if is_tl:
            return build_reply(
                f"Si Dr. {dentist.get_full_name()} ay fully booked po para sa susunod na 30 araw.\n\n"
                "Inirerekomenda namin na **kanselahin** ang appointment na ito at gumawa ng **bagong booking** "
                "sa ibang dentista.",
                ['Cancel Appointment', 'Keep Appointment'],
            )
        return build_reply(
            f"Dr. {dentist.get_full_name()} is fully booked for the next 30 days.\n\n"
            "We recommend **cancelling** this appointment and creating a **new booking** "
            "with a different dentist.",
            ['Cancel Appointment', 'Keep Appointment'],
        )

    if is_tl:
        header = f"### I-reschedule \u2013 Pumili ng Bagong Petsa\n\n**Dr. {dentist.get_full_name()}**:\n"
        footer = "\nPumili po ng bagong petsa:"
    else:
        header = f"### Reschedule \u2013 Choose New Date\n\n**Dr. {dentist.get_full_name()}**:\n"
        footer = "\nSelect a new date:"

    lines = [header]
    qr = []
    for d in dates:
        label = bsvc.fmt_date(d)
        lines.append(f"- **{label}**")
        qr.append(d.strftime('%B %d'))
    lines.append(footer)
    return build_reply('\n'.join(lines), qr, tag='[RESCHED_STEP_2]')
