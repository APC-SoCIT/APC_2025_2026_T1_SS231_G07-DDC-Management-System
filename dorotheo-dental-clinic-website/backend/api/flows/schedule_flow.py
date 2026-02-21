"""
Schedule (Booking) Flow — 5 Steps
──────────────────────────────────
Step 1: Select Clinic
Step 2: Select Dentist
Step 3: Select Date & Time
Step 4: Select Service
Step 5: Confirmation → Create Appointment

All database queries go through booking_service.
All responses are language-aware via the lang module.
No LLM calls — this is a pure deterministic flow.
"""

import logging
from datetime import datetime, timedelta

from django.db.models import Q

from ..models import (
    Appointment, DentistAvailability,
    ClinicLocation, Service,
)
from ..services import booking_service as bsvc
from ..services import intent_service as isvc
from .. import booking_memory as bmem
from .. import language_detection as lang
from ..views import create_appointment_notification, create_patient_notification
from . import build_reply

logger = logging.getLogger('chatbot.flow.schedule')


# ═══════════════════════════════════════════════════════════════════════════
# PUBLIC ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════

def handle_booking(user, msg: str, hist: list, detected_lang: str) -> dict:
    """
    Run the booking flow for an authenticated user.
    Returns a response dict with 'response', 'quick_replies', 'error'.
    """
    if not user:
        return build_reply(lang.login_required('booking', detected_lang))

    # 🔒 Pending request lock
    pending_msg = bsvc.check_pending_requests(user, detected_lang)
    if pending_msg:
        return build_reply(pending_msg, tag='[PENDING_BLOCK]')

    low = msg.lower()
    today = datetime.now().date()

    # Determine if this is a fresh booking or continuing
    explicit_new = isvc.classify_intent(msg).intent == isvc.INTENT_SCHEDULE
    is_fresh = explicit_new or not _in_booking_flow(hist)

    # Gather structured entities
    ctx = bsvc.gather_booking_context(msg, hist, is_fresh=is_fresh)
    clinic = ctx['clinic']
    dentist = ctx['dentist']
    date = ctx['date']
    time_val = ctx['time']
    service = ctx['service']

    # ── STEP 1: Clinic ────────────────────────────────────────────────
    if not clinic:
        clinics = ClinicLocation.objects.all()
        if not clinics.exists():
            return build_reply("No clinic locations are set up yet. Please contact the clinic directly.")

        # Smart recommendation: prioritize patient's last-visited clinic
        rec_clinic = None
        last_appt = Appointment.objects.filter(
            patient=user,
            status__in=['confirmed', 'completed'],
            clinic__isnull=False,
        ).order_by('-date', '-time').first()
        if last_appt:
            rec_clinic = last_appt.clinic
            logger.info("Smart rec: user %s last visited %s", user.id, rec_clinic.name)

        lines = [lang.step_label(1, 'clinic', detected_lang) + "\n"]
        if rec_clinic:
            lines.append(lang.smart_rec_clinic(rec_clinic.name, detected_lang) + "\n")
        qr = []
        for c in clinics:
            open_dentists = bsvc.get_dentists_with_openings(c, today)
            tag_text = (
                f" ({len(open_dentists)} dentist{'s' if len(open_dentists) != 1 else ''} available)"
                if open_dentists else " (no openings this period)"
            )
            rec_tag = " ⭐" if rec_clinic and c.id == rec_clinic.id else ""
            lines.append(f"- **{c.name}**{tag_text}{rec_tag}")
            qr.append(c.name)
        lines.append("\n" + lang.select_prompt('clinic', detected_lang))
        return build_reply('\n'.join(lines), qr, tag='[BOOK_STEP_1]')

    # ── STEP 2: Dentist ──────────────────────────────────────────────
    if not dentist:
        end_date = today + timedelta(days=30)

        dentist_ids_with_avail = DentistAvailability.objects.filter(
            Q(clinic=clinic) | Q(apply_to_all_clinics=True),
            date__gte=today,
            date__lte=end_date,
            is_available=True,
        ).values_list('dentist_id', flat=True).distinct()

        if not dentist_ids_with_avail:
            alt = bsvc.recommend_alt_clinic(clinic, today)
            if alt:
                return build_reply(
                    f"Unfortunately **{clinic.name}** has no dentists with openings right now.\n\n"
                    f"However, **{alt.name}** has availability! Would you like to book there instead?",
                    [alt.name, "No thanks"],
                    tag='[BOOK_STEP_1]',
                )
            return build_reply(
                f"No dentists have open slots at {clinic.name} in the next month. "
                "Please contact the clinic directly."
            )

        available_dentists = bsvc.get_dentists_qs().filter(id__in=dentist_ids_with_avail)

        # Smart recommendation: prioritize patient's last dentist at this clinic
        rec_dentist = None
        last_at_clinic = Appointment.objects.filter(
            patient=user, clinic=clinic,
            status__in=['confirmed', 'completed'],
            dentist__isnull=False,
        ).order_by('-date', '-time').first()
        if last_at_clinic and last_at_clinic.dentist in available_dentists:
            rec_dentist = last_at_clinic.dentist
            logger.info("Smart rec: user %s last saw Dr. %s at %s",
                        user.id, rec_dentist.get_full_name(), clinic.name)

        lines = [lang.step_label(2, 'dentist', detected_lang) + f" (at **{clinic.name}**)\n"]
        if rec_dentist:
            lines.append(lang.smart_rec_dentist(rec_dentist.get_full_name(), detected_lang) + "\n")
        qr = []
        for d in available_dentists:
            name = f"Dr. {d.get_full_name()}"
            rec_tag = " ⭐" if rec_dentist and d.id == rec_dentist.id else ""
            lines.append(f"- **{name}**{rec_tag}")
            qr.append(name)
        lines.append("\n" + lang.select_prompt('dentist', detected_lang))
        return build_reply('\n'.join(lines), qr, tag='[BOOK_STEP_2]')

    # ── STEP 3: Date & Time ───────────────────────────────────────────
    if not date:
        end = today + timedelta(days=30)
        avails = DentistAvailability.objects.filter(
            dentist=dentist, date__gte=today, date__lte=end,
            is_available=True,
        ).filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True)).order_by('date')

        dates_with_slots = []
        for av in avails:
            if bsvc.get_available_slots(dentist, av.date, clinic):
                dates_with_slots.append(av.date)
            if len(dates_with_slots) >= 8:
                break

        if not dates_with_slots:
            alt_dentists = [d for d in bsvc.get_dentists_with_openings(clinic, today)
                           if d.id != dentist.id]
            if alt_dentists:
                alt = alt_dentists[0]
                return build_reply(
                    f"Dr. {dentist.get_full_name()} is currently fully booked, "
                    f"but **Dr. {alt.get_full_name()}** is available at the same clinic. "
                    "Would you like to see them instead?",
                    [f"Dr. {alt.get_full_name()}", "No thanks"],
                    tag='[BOOK_STEP_2]',
                )
            return build_reply(
                f"Dr. {dentist.get_full_name()} has no openings in the next 30 days. "
                "Please try a different dentist or clinic."
            )

        lines = [
            lang.step_label(3, 'date', detected_lang)
            + f"\n\n**Dr. {dentist.get_full_name()}** at **{clinic.name}**:\n"
        ]
        qr = []
        for d in dates_with_slots:
            label = bsvc.fmt_date(d)
            lines.append(f"- **{label}**")
            qr.append(d.strftime('%B %d'))
        lines.append("\n" + lang.select_prompt('date', detected_lang))
        return build_reply('\n'.join(lines), qr, tag='[BOOK_STEP_3]')

    if not time_val:
        # If user typed a bare day-of-week (e.g. "monday") and multiple dates match that
        # weekday in the dentist's availability, re-show a filtered date picker.
        _weekday_num = bsvc.parse_weekday_name(msg)
        if _weekday_num is not None:
            end = today + timedelta(days=30)
            avails = DentistAvailability.objects.filter(
                dentist=dentist, date__gte=today, date__lte=end, is_available=True,
            ).filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True)).order_by('date')
            matching = [
                av.date for av in avails
                if av.date.weekday() == _weekday_num
                and bsvc.get_available_slots(dentist, av.date, clinic)
            ]
            if len(matching) > 1:
                is_tl_d = detected_lang in (lang.LANG_TAGALOG, lang.LANG_TAGLISH)
                day_name = msg.strip().title()
                hdr = (
                    f"#### Hakbang 3: Pumili ng Petsa\n\n"
                    f"May ilang **{day_name}** na available. Alin po ang gusto mo?\n"
                    if is_tl_d else
                    f"#### Step 3: Choose a Date\n\n"
                    f"Multiple **{day_name}s** are available. Which one would you like?\n"
                )
                lines = [hdr]
                qr = []
                for d in matching:
                    label = bsvc.fmt_date(d)
                    lines.append(f"- **{label}**")
                    qr.append(d.strftime('%B %d'))
                lines.append("\n" + lang.select_prompt('date', detected_lang))
                return build_reply('\n'.join(lines), qr, tag='[BOOK_STEP_3]')

        # "More slots" navigation — user already saw first 6 and wants to see all
        if isvc.step_tag_exists(hist, '[BOOK_STEP_3T]'):
            _more_patterns = [
                'more slot', 'mor slot', 'other time', 'next slot', 'show more',
                'iba pa', 'dagdag', 'more option', 'other slot', 'other option',
                'ano pa', 'pang slot', 'ibang slot', 'ibang oras',
            ]
            _low = low.strip()
            if any(p in _low for p in _more_patterns) or _low in ('more', 'mor'):
                slots = bsvc.get_available_slots(dentist, date, clinic)
                is_tl = detected_lang in (lang.LANG_TAGALOG, lang.LANG_TAGLISH)
                if slots and len(slots) > 6:
                    more_hdr = (
                        f"### Hakbang 3: Pumili ng Oras (**{bsvc.fmt_date(date)}**)"
                        if is_tl else
                        f"### Step 3: Choose a Time (**{bsvc.fmt_date(date)}**)"
                    )
                    more_intro = (
                        "\nNarito po ang lahat ng available na oras:"
                        if is_tl else
                        "\nHere are all the available time slots:"
                    )
                    lines = [more_hdr, more_intro]
                    qr = []
                    for s in slots:
                        label = bsvc.fmt_time(s)
                        lines.append(f"- **{label}**")
                        qr.append(label)
                    lines.append("\nPumili po ng oras:" if is_tl else "\nSelect a time:")
                    return build_reply('\n'.join(lines), qr, tag='[BOOK_STEP_3T]')
                elif slots:
                    all_hdr = (
                        f"### Hakbang 3: Pumili ng Oras (**{bsvc.fmt_date(date)}**)"
                        if is_tl else
                        f"### Step 3: Choose a Time (**{bsvc.fmt_date(date)}**)"
                    )
                    all_footer = (
                        "\nIto na po ang lahat ng available na slot. Pumili po ng oras:"
                        if is_tl else
                        "\nThese are all the available slots. Select a time:"
                    )
                    lines = [all_hdr]
                    qr = []
                    for s in slots:
                        label = bsvc.fmt_time(s)
                        lines.append(f"- **{label}**")
                        qr.append(label)
                    lines.append(all_footer)
                    return build_reply('\n'.join(lines), qr, tag='[BOOK_STEP_3T]')

        # Same-date conflict check
        same_day = Appointment.objects.filter(
            patient=user, date=date,
            status__in=['confirmed', 'pending'],
        ).first()
        if same_day:
            existing_dentist = same_day.dentist.get_full_name() if same_day.dentist else 'another dentist'
            existing_service = same_day.service.name if same_day.service else 'appointment'
            existing_time = bsvc.fmt_time(same_day.time)
            return build_reply(
                f"⚠️ You already have a **{existing_service}** appointment on "
                f"**{bsvc.fmt_date_full(date)}** at **{existing_time}** "
                f"with **Dr. {existing_dentist}**. "
                "Patients may only have one appointment per day. "
                "Please choose a different date.",
                tag='[BOOK_STEP_3]',
            )

        slots = bsvc.get_available_slots(dentist, date, clinic)
        if not slots:
            # Dentist is fully booked on this date — suggest other available dentists
            alt_dentists = bsvc.get_alt_dentists_on_date(clinic, date, exclude_dentist=dentist)
            is_tl = detected_lang in (lang.LANG_TAGALOG, lang.LANG_TAGLISH)
            if alt_dentists:
                alt_names = [f"Dr. {d.get_full_name()}" for d in alt_dentists]
                if is_tl:
                    msg_text = (
                        f"Puno na po ang schedule ni **Dr. {dentist.get_full_name()}** "
                        f"sa {bsvc.fmt_date(date)}.\n\n"
                        f"Ngunit may available na ibang dentist sa parehong araw:\n"
                        + '\n'.join(f'- **{n}**' for n in alt_names)
                        + "\n\nGusto mo bang pumili ng isa sa kanila, o pumili ng ibang petsa?"
                    )
                else:
                    msg_text = (
                        f"**Dr. {dentist.get_full_name()}** is fully booked on "
                        f"{bsvc.fmt_date(date)}.\n\n"
                        f"However, the following dentists are available on that same day:\n"
                        + '\n'.join(f'- **{n}**' for n in alt_names)
                        + "\n\nWould you like to book with one of them, or pick a different date?"
                    )
                qr = alt_names + (["Pumili ng ibang petsa"] if is_tl else ["Pick different date"])
                return build_reply(msg_text, qr, tag='[BOOK_STEP_2]')
            else:
                no_slots_msg = (
                    f"Puno na po ang lahat ng dentist sa {bsvc.fmt_date(date)} sa {clinic.name}. "
                    "Pumili po ng ibang petsa."
                    if is_tl else
                    f"All dentists at {clinic.name} are fully booked on {bsvc.fmt_date(date)}. "
                    "Please pick a different date."
                )
                return build_reply(no_slots_msg, tag='[BOOK_STEP_3]')
        lines = [lang.step_label(3, 'time', detected_lang) + f" (**{bsvc.fmt_date(date)}**)\n"]
        qr = []
        for s in slots:
            label = bsvc.fmt_time(s)
            lines.append(f"- **{label}**")
            qr.append(label)
        lines.append("\n" + lang.select_prompt('time', detected_lang))
        return build_reply('\n'.join(lines), qr, tag='[BOOK_STEP_3T]')

    # ── STEP 4: Service ───────────────────────────────────────────────
    if not service:
        allowed = Service.objects.filter(name__iregex=r'(clean|consult)')
        if not allowed.exists():
            allowed = Service.objects.all()

        lines = [lang.step_label(4, 'service', detected_lang) + "\n"]
        qr = []
        for s in allowed:
            lines.append(f"- **{s.name}**")
            qr.append(s.name)
        lines.append("\n" + lang.select_prompt('service', detected_lang))
        return build_reply('\n'.join(lines), qr, tag='[BOOK_STEP_4]')

    # ── STEP 5: Confirmation Gate ─────────────────────────────────────
    if not isvc.step_tag_exists(hist, '[BOOK_STEP_5]'):
        logger.info(
            "Booking confirmation requested: user=%s clinic=%s dentist=%s date=%s time=%s service=%s",
            user.id, clinic.name, dentist.get_full_name(), date, time_val, service.name,
        )
        # Update session memory
        session = bmem.get_session(user.id)
        bmem.update_draft(session, clinic=clinic, dentist=dentist,
                          date=date, time=time_val, service=service)
        session.flags.confirmation_shown = True

        return build_reply(
            f"{lang.confirmation_header(detected_lang)}\n\n"
            f"📍 **Clinic:** {clinic.name}\n"
            f"👨\u200d⚕️ **Dentist:** Dr. {dentist.get_full_name()}\n"
            f"📅 **Date:** {bsvc.fmt_date_full(date)}\n"
            f"🕐 **Time:** {bsvc.fmt_time(time_val)}\n"
            f"🦷 **Service:** {service.name}\n\n"
            f"{lang.confirmation_yes_no(detected_lang)}",
            lang.confirmation_buttons(detected_lang),
            tag='[BOOK_STEP_5]',
        )

    # Check confirmation response
    if not isvc.is_confirm_yes(low):
        if isvc.is_confirm_no(low):
            logger.info("Booking cancelled by user at confirmation: user=%s", user.id)
            bmem.clear_session(user.id)
            return build_reply(
                lang.booking_cancelled(detected_lang),
                tag='[FLOW_COMPLETE]',
            )
        # Neither yes nor no — re-prompt
        return build_reply(
            f"{lang.reprompt_confirmation(detected_lang)}\n\n"
            f"📍 **Clinic:** {clinic.name}\n"
            f"👨\u200d⚕️ **Dentist:** Dr. {dentist.get_full_name()}\n"
            f"📅 **Date:** {bsvc.fmt_date_full(date)}\n"
            f"🕐 **Time:** {bsvc.fmt_time(time_val)}\n"
            f"🦷 **Service:** {service.name}",
            lang.confirmation_buttons(detected_lang),
            tag='[BOOK_STEP_5]',
        )

    # ── STEP 6: Validate & Finalize ───────────────────────────────────
    logger.info("Booking confirmed by user, validating: user=%s", user.id)

    appt, error_msg = bsvc.create_appointment(
        patient=user,
        dentist=dentist,
        service=service,
        clinic=clinic,
        date=date,
        time_val=time_val,
    )

    if error_msg:
        # Determine which step to return to based on error type
        if 'per week' in error_msg:
            next_week = date + timedelta(days=(7 - date.weekday()))
            return build_reply(
                "⚠️ **You can only book one appointment per week.**\n\n"
                f"Your next available booking window starts **{bsvc.fmt_date(next_week)}**. "
                "Would you like to pick a date in that week instead?",
                [next_week.strftime('%B %d')],
                tag='[BOOK_STEP_3]',
            )
        if 'slot was just booked' in error_msg.lower():
            return build_reply(error_msg, tag='[BOOK_STEP_3T]')
        if 'overlapping' in error_msg.lower() or 'already have' in error_msg.lower():
            return build_reply(
                f"⚠️ {error_msg} Please pick a different time.",
                tag='[BOOK_STEP_3T]',
            )
        return build_reply(error_msg)

    # Send notifications
    create_appointment_notification(appt, 'new_appointment')
    create_patient_notification(appt, 'appointment_confirmed')

    # Clear session memory
    bmem.clear_session(user.id)

    return build_reply(
        f"{lang.booking_success(detected_lang)}\n\n"
        f"**Clinic:** {clinic.name}\n"
        f"**Dentist:** Dr. {dentist.get_full_name()}\n"
        f"**Date:** {bsvc.fmt_date_full(date)}\n"
        f"**Time:** {bsvc.fmt_time(time_val)}\n"
        f"**Service:** {service.name}\n"
        f"**Status:** Confirmed\n\n"
        f"{lang.booking_success_footer(detected_lang)}",
        tag='[FLOW_COMPLETE]',
    )


# ═══════════════════════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def _in_booking_flow(hist: list) -> bool:
    """True if currently in an active booking flow."""
    if isvc.flow_is_terminated(hist):
        return False
    return isvc.step_tag_exists(hist, '[BOOK_STEP_')
