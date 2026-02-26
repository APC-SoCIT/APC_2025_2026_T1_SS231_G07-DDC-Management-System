"""
Schedule (Booking) Flow — Conversational, Fully Validated
=========================================================
Architecture (NO wizard behaviour):
1. Extract ALL entities from the user message + history at once.
2. Validate ALL fields against the database in a single pass.
3. Classify issues into invalid_fields / missing_fields.
4. Respond ONCE:
   a. If any field is invalid → explain ALL invalid issues conversationally.
   b. If no invalid but some missing → ask naturally for missing info.
   c. If everything valid → show deterministic confirmation summary.
5. Pending-request lock and one-booking-per-week rule are checked
   BEFORE any other validation.

No step-by-step prompts. No wizard cards. No "Please select…" language.
Session state tracked via booking_memory.ConversationState.

Dependency chain: clinic → dentist → date → time  (service independent)
All DB queries go through booking_service.
All LLM calls go through llm_service (circuit breaker).
"""

import re
import logging
from dataclasses import dataclass, field as dc_field
from datetime import timedelta
from typing import List, Optional, Any

from django.db.models import Q
from django.utils import timezone as tz

from ..models import (
    Appointment, DentistAvailability,
    ClinicLocation, Service,
)
from ..services import booking_service as bsvc
from ..services import intent_service as isvc
from ..services.llm_service import get_llm_service
from ..services.booking_validation_service import validate_one_booking_per_week
from .. import booking_memory as bmem
from .. import language_detection as lang
from ..views import create_appointment_notification, create_patient_notification
from . import build_reply

logger = logging.getLogger("chatbot.flow.schedule")


# ======================================================================
# BOOKING AI SYSTEM PROMPT
# ======================================================================

BOOKING_AI_PROMPT = """You are Sage, the AI concierge for Dorotheo Dental Clinic.
You are helping a patient book an appointment through natural conversation.

CRITICAL DATE RULE:
- TODAY IS injected into every BOOKING CONTEXT below — trust it absolutely.
- "tomorrow", "today", "next week" are RESOLVED by the system BEFORE you see the context.
  The resolved date appears as "OK Date: [date]". NEVER ask the patient to re-specify it.
- If BOOKING CONTEXT shows "OK Date: ...", that date IS valid — do NOT add any warnings
  about it being "too far out", "too soon", or anything else.
- NEVER invent date-range errors. Only mention a date problem if BOOKING CONTEXT says
  "INVALID Date: ..." or "NEEDED Date: not yet selected".

CRITICAL FIELD STATUS RULES:
- OK [Field]: value       — validated and confirmed. Do NOT ask for it.
- NOTED [Field]: value    — patient already provided this value earlier in the conversation.
                            It is waiting for another field to be confirmed first.
                            Do NOT ask the patient for it again. Treat it as given.
- INVALID [Field]: error  — patient provided an invalid value. Explain the issue.
- NEEDED [Field]: ...     — patient has NOT provided this yet. Ask for it naturally.
- BLOCKED [Field]: error  — a system constraint prevents this field. Explain it.

CRITICAL RULES:
- Use ONLY the data provided in the BOOKING CONTEXT below.
- NEVER invent clinics, dentists, time slots, services, or availability.
- NEVER show step numbers, wizard headers, or form-like formatting.
- NEVER say "Please select…" — always speak naturally and conversationally.
- You must explain ALL issues at once, not one at a time.
  For example if the clinic is invalid AND the date is in the past, mention BOTH.
- Respond naturally as if having a friendly conversation.
- Be concise: 2-4 sentences max unless listing options.
- If the patient provided invalid data, explain why and suggest alternatives.
- Match the patient's language (English or Filipino/Tagalog).

RESPONSE PRIORITY (MANDATORY):
1. If ANY fields are INVALID → explain ALL invalid issues conversationally.
   Do NOT continue booking until resolved.
2. If NO invalid fields but some are MISSING → ask naturally for missing info.
   You may group the ask: "Which clinic and date work for you?"
3. If EVERYTHING is valid → the system handles confirmation (you won't be called).

FORMATTING:
- Keep responses SHORT and mobile-friendly.
- Use **bold** for key data (names, dates, times).
- When listing options (clinics, dentists, dates, times), use markdown bullets (-).
- Do NOT use section headers (### ) or wizard-style titles.
- For time slots, list ALL available slots — NEVER truncate or say "more available". Show the complete list.
- For other lists (clinics, dentists, dates) keep to a reasonable length.
- Do NOT repeat information the patient already provided.

SERVICES (IMPORTANT):
- Online self-booking is restricted by the clinic owner to **Cleaning** and **Consultation** only.
- The clinic DOES perform other DENTAL services (Tooth Extraction, Whitening, Braces, Filling, Veneers,
  Crowns, Fluoride Treatment, Dental Implants, Adjustment Visits, etc.),
  but those CANNOT be booked online by patients.
- If a patient requests a dental service not in the bookable list, explain this owner restriction clearly:
  say something like "That service is available at our clinic, but it can't be booked online —
  you'd need to call or visit us in person to schedule it. For online booking I can only
  set you up for a **Cleaning** or **Consultation**."
- If a patient requests a NON-DENTAL service (e.g., physical exam, nail polish, massage, haircut,
  eye exam, vaccination, blood test), say clearly that this is a dental clinic and we do NOT offer
  that service. Be friendly: "We're a dental clinic, so we don't offer physical exams — but I can
  help you book a **Cleaning** or **Consultation** for your dental needs!"
- ONLY use 'we don't offer that service' for genuinely non-dental services.
  For dental services that exist but aren't bookable online, say it's available at the clinic.

EXAMPLE GOOD RESPONSES:
- "Great choice! Dr. Cruz is available at Bacoor. When would you like to come in?"
- "It looks like we don't have a Magallanes branch. We currently have **Bacoor**, **Alabang**, and **Poblacion**."
- "That time is taken, but here are the open times on March 15:\n- **9:00 AM**\n- **10:00 AM**\n- **2:00 PM**"
- "Tooth extractions are done at our clinic, but online booking is only available for
  **Cleaning** and **Consultation**. Would you like to book one of those instead,
  or give us a call to set up an extraction appointment?"
"""


# ======================================================================
# VALIDATION DATA STRUCTURES
# ======================================================================

@dataclass
class FieldValidation:
    """Validation result for a single booking field."""
    status: str          # 'valid', 'invalid', 'missing', 'blocked'
    value: Any = None
    display_name: str = ""
    error: str = ""
    options: List[str] = dc_field(default_factory=list)
    recommendation: str = ""


@dataclass
class BookingValidation:
    """Complete validation result for all booking fields."""
    all_valid: bool = False
    clinic: FieldValidation = dc_field(default_factory=lambda: FieldValidation("missing"))
    dentist: FieldValidation = dc_field(default_factory=lambda: FieldValidation("missing"))
    date: FieldValidation = dc_field(default_factory=lambda: FieldValidation("missing"))
    time: FieldValidation = dc_field(default_factory=lambda: FieldValidation("missing"))
    service: FieldValidation = dc_field(default_factory=lambda: FieldValidation("missing"))
    weekly_rule: FieldValidation = dc_field(default_factory=lambda: FieldValidation("valid"))


# ======================================================================
# PUBLIC ENTRY POINT
# ======================================================================

def handle_booking(user, msg: str, hist: list, detected_lang: str) -> dict:
    """
    Entry point for the booking flow.
    Returns a response dict: {"response", "quick_replies", "error"}.

    Every message:
    1. Passes through entity extraction
    2. Passes through full validation
    3. Gets an AI-generated conversational reply (or deterministic confirmation)
    """
    if not user:
        return build_reply(lang.login_required("booking", detected_lang))

    pending_msg = bsvc.check_pending_requests(user, detected_lang)
    if pending_msg:
        return build_reply(pending_msg, tag="[PENDING_BLOCK]")

    session = bmem.get_session(user.id)
    low = msg.lower()
    # Use Philippines local time so "today" matches the clinic's operating timezone
    today = tz.localtime(tz.now()).date()

    # -- Confirmation gate (session-state based, no step tags) --
    if session.state == bmem.ConversationState.BOOKING_CONFIRMING:
        # If the user is neither confirming nor cancelling, check whether
        # they are trying to correct a specific field (e.g. "actually, make
        # it Cleaning" or "i said nail polish for the service"). If so,
        # reset to COLLECTING so the normal validation loop re-runs with
        # the corrected value instead of blindly re-showing the old draft.
        if not isvc.is_confirm_yes(low) and not isvc.is_confirm_no(low):
            has_correction = any([
                bsvc.find_service(msg) is not None,
                bsvc.find_service(msg, patient_only=False) is not None,
                bsvc._has_unmatched_service_mention(msg) is not None,
                bsvc.find_clinic(msg) is not None,
                bsvc.find_dentist(msg) is not None,
                bsvc.parse_time(msg) is not None,
                bsvc.parse_date(msg) is not None,
            ])
            if has_correction:
                session.state = bmem.ConversationState.BOOKING_COLLECTING
                # Fall through to normal booking flow below
            else:
                return _handle_confirmation(user, low, session, detected_lang)
        else:
            return _handle_confirmation(user, low, session, detected_lang)

    # -- Extract ALL entities from message + history --
    explicit_new = isvc.classify_intent(msg).intent == isvc.INTENT_SCHEDULE
    is_fresh = explicit_new or session.state == bmem.ConversationState.IDLE
    ctx = bsvc.gather_booking_context(msg, hist, is_fresh=is_fresh)

    clinic                = ctx["clinic"]
    dentist               = ctx["dentist"]
    date_val              = ctx["date"]
    time_val              = ctx["time"]
    service               = ctx["service"]
    invalid_date          = ctx.get("invalid_date_msg")
    invalid_service_name  = ctx.get("invalid_service_name")

    # -- Bare weekday disambiguation --
    # If the user said a bare day name (e.g. "monday") and the dentist's
    # available dates contain multiple occurrences of that weekday, we must
    # ask which specific date they mean instead of silently picking the
    # nearest one and confusing them.
    weekday_num = bsvc.parse_weekday_name(msg)
    if weekday_num is not None and clinic and dentist:
        end_wk = today + timedelta(days=30)
        avails_wk = DentistAvailability.objects.filter(
            dentist=dentist, date__gte=today, date__lte=end_wk, is_available=True,
        ).filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True)).order_by("date")
        matching_dates = []
        for av in avails_wk:
            if av.date.weekday() == weekday_num and bsvc.get_available_slots(dentist, av.date, clinic):
                matching_dates.append(av.date)
        if len(matching_dates) > 1:
            day_name = msg.strip().capitalize()
            options = [bsvc.fmt_date(d) for d in matching_dates[:6]]
            is_tl = detected_lang in (lang.LANG_TAGALOG, lang.LANG_TAGLISH)
            date_list = "\n".join(f"- **{bsvc.fmt_date(d)}**" for d in matching_dates[:6])
            if is_tl:
                text = f"May ilang {day_name} na available — alin po ang ibig ninyong sabihin?\n\n{date_list}"
            else:
                text = f"Just to clarify — there are a few {day_name}s coming up. Which one did you have in mind?\n\n{date_list}"
            return build_reply(text, options, tag="[BOOKING_FLOW]")

    # -- Validate ALL fields against DB --
    validation = _validate_booking(
        user=user, msg=msg,
        clinic=clinic, dentist=dentist,
        invalid_service_name=invalid_service_name,
        date_val=date_val, time_val=time_val,
        service=service, invalid_date_msg=invalid_date,
        today=today,
    )

    # -- All valid -> deterministic confirmation (safety-critical) --
    if validation.all_valid:
        session.state = bmem.ConversationState.BOOKING_CONFIRMING
        return _show_confirmation(
            user, clinic, dentist, date_val, time_val, service, detected_lang,
        )

    # -- Not all valid -> AI conversational response --
    session.state = bmem.ConversationState.BOOKING_COLLECTING
    return _generate_ai_booking_response(
        msg, hist, validation, detected_lang,
    )


# ======================================================================
# FIELD VALIDATION - ALL FIELDS IN ONE PASS
# ======================================================================

def _validate_booking(
    *, user, msg, clinic, dentist, date_val, time_val, service,
    invalid_date_msg, today, invalid_service_name=None,
) -> BookingValidation:
    """
    Validate every booking field against the database.
    Returns structured validation data (NO formatted messages).

    Dependency chain: clinic -> dentist -> date -> time (service independent)
    """
    result = BookingValidation()

    result.clinic = _check_clinic_field(user, clinic, msg, today)
    clinic_ok = result.clinic.status == "valid"

    result.dentist = _check_dentist_field(user, clinic, clinic_ok, dentist, today, msg=msg, requested_date=date_val)
    dentist_ok = result.dentist.status == "valid"

    result.date = _check_date_field(
        user, clinic, clinic_ok, dentist, dentist_ok,
        date_val, invalid_date_msg, today,
    )
    date_ok = result.date.status == "valid"

    result.time = _check_time_field(
        clinic, clinic_ok, dentist, dentist_ok,
        date_val, date_ok, time_val,
    )

    result.service = _check_service_field(service, unmatched_name=invalid_service_name)

    # -- Weekly rule: one confirmed appointment per calendar week --
    result.weekly_rule = _check_weekly_rule(user, date_val, date_ok)

    result.all_valid = all(
        f.status == "valid"
        for f in [result.clinic, result.dentist, result.date,
                  result.time, result.service, result.weekly_rule]
    )
    return result


# -- Clinic --

def _check_clinic_field(user, clinic, msg, today) -> FieldValidation:
    """Validate clinic. Returns structured FieldValidation."""
    if clinic:
        return FieldValidation("valid", value=clinic, display_name=clinic.name)

    clinics = ClinicLocation.objects.all()
    if not clinics.exists():
        return FieldValidation("blocked", error="It looks like our clinic locations aren't set up at the moment. Please try again later.")

    options = []
    for c in clinics:
        open_d = bsvc.get_dentists_with_openings(c, today)
        avail = f"({len(open_d)} dentist{'s' if len(open_d) != 1 else ''} available)" if open_d else "(no openings)"
        options.append(f"{c.name} {avail}")

    # Smart recommendation
    rec = ""
    last_appt = Appointment.objects.filter(
        patient=user, status__in=["confirmed", "completed"], clinic__isnull=False,
    ).order_by("-date", "-time").first()
    if last_appt:
        rec = f"Previously visited: {last_appt.clinic.name}"

    if bsvc._has_unmatched_location_hint(msg):
        return FieldValidation(
            "invalid", error="I couldn't find that clinic location in our system.",
            options=options, recommendation=rec,
        )
    return FieldValidation("missing", options=options, recommendation=rec)


# -- Dentist --

def _check_dentist_field(user, clinic, clinic_ok, dentist, today, msg="", requested_date=None) -> FieldValidation:
    """
    Validate dentist. Returns structured FieldValidation.

    When dentist is None but the message contains a doctor keyword (dr/doc/doctor)
    followed by a name not found in the DB, returns 'invalid' with a clear error
    instead of silently showing the 'missing' option list.

    If requested_date is provided and no dentist was specified, filters the
    suggested dentist list to those who actually have availability on that
    specific date, making the suggestions more relevant.
    """
    if dentist is None:
        # Check if user explicitly named a non-existent doctor
        if msg:
            unmatched = bsvc._has_unmatched_doctor_hint(msg)
            if unmatched:
                if clinic_ok:
                    alt = bsvc.get_dentists_with_openings(clinic, today)
                    options = [f"Dr. {d.get_full_name()}" for d in alt]
                else:
                    options = [f"Dr. {d.get_full_name()}"
                               for d in bsvc.get_dentists_qs()[:6]]
                return FieldValidation(
                    "invalid",
                    error=f"We don't have a Dr. {unmatched.title()} in our system.",
                    options=options,
                )

        if not clinic_ok:
            return FieldValidation("missing")

    if not clinic_ok:
        if dentist:
            return FieldValidation("missing", value=dentist,
                                   display_name=f"Dr. {dentist.get_full_name()}")
        return FieldValidation("missing")

    end_date = today + timedelta(days=30)

    if dentist:
        has_avail = DentistAvailability.objects.filter(
            dentist=dentist, date__gte=today, date__lte=end_date, is_available=True,
        ).filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True)).exists()
        if has_avail:
            return FieldValidation("valid", value=dentist,
                                   display_name=f"Dr. {dentist.get_full_name()}")

        # Dentist doesn't practice at this clinic
        alt = bsvc.get_dentists_with_openings(clinic, today)
        options = [f"Dr. {d.get_full_name()}" for d in alt]
        return FieldValidation(
            "invalid", value=dentist,
            display_name=f"Dr. {dentist.get_full_name()}",
            error=f"Unfortunately, Dr. {dentist.get_full_name()} doesn't have any availability at {clinic.name} right now.",
            options=options,
        )

    # Missing - build options
    # If the patient already mentioned a specific date, narrow suggestions
    # to dentists who actually have openings on THAT date.
    if requested_date is not None:
        date_dentists = bsvc.get_alt_dentists_on_date(clinic, requested_date)
        if date_dentists:
            # AUTO-SELECT when only one dentist is available — don't force
            # the patient to confirm the obvious. This prevents endless
            # "yes/ok/sure" loops where the system asks to pick a dentist
            # but the user's affirmative doesn't contain the dentist's name.
            if len(date_dentists) == 1:
                sole = date_dentists[0]
                return FieldValidation("valid", value=sole,
                                       display_name=f"Dr. {sole.get_full_name()}")
            options = [f"Dr. {d.get_full_name()}" for d in date_dentists]
            # Smart recommendation
            rec = ""
            last_at = Appointment.objects.filter(
                patient=user, clinic=clinic,
                status__in=["confirmed", "completed"], dentist__isnull=False,
            ).order_by("-date", "-time").first()
            if last_at and last_at.dentist in date_dentists:
                rec = f"Previously saw: Dr. {last_at.dentist.get_full_name()}"
            elif date_dentists:
                rec = f"Dr. {date_dentists[0].get_full_name()} has availability on that date!"
            return FieldValidation("missing", options=options, recommendation=rec)

    dentist_ids = DentistAvailability.objects.filter(
        Q(clinic=clinic) | Q(apply_to_all_clinics=True),
        date__gte=today, date__lte=end_date, is_available=True,
    ).values_list("dentist_id", flat=True).distinct()

    if not dentist_ids:
        alt_clinic = bsvc.recommend_alt_clinic(clinic, today)
        if alt_clinic:
            return FieldValidation(
                "blocked",
                error=f"There aren't any dentists with openings at {clinic.name} right now.",
                options=[alt_clinic.name],
                recommendation=f"{alt_clinic.name} has availability though!",
            )
        return FieldValidation("blocked",
                               error=f"None of our dentists have openings at {clinic.name} right now.")

    available_dentists = list(bsvc.get_dentists_qs().filter(id__in=dentist_ids))

    # AUTO-SELECT single dentist — see date branch above for rationale.
    if len(available_dentists) == 1:
        sole = available_dentists[0]
        return FieldValidation("valid", value=sole,
                               display_name=f"Dr. {sole.get_full_name()}")

    options = [f"Dr. {d.get_full_name()}" for d in available_dentists]

    # Smart recommendation
    rec = ""
    last_at = Appointment.objects.filter(
        patient=user, clinic=clinic,
        status__in=["confirmed", "completed"], dentist__isnull=False,
    ).order_by("-date", "-time").first()
    if last_at and last_at.dentist in available_dentists:
        rec = f"Previously saw: Dr. {last_at.dentist.get_full_name()}"
    elif available_dentists:
        rec = f"Dr. {available_dentists[0].get_full_name()} has the most availability!"

    return FieldValidation("missing", options=options, recommendation=rec)


# -- Date --

def _check_date_field(user, clinic, clinic_ok, dentist, dentist_ok,
                      date_val, invalid_date_msg, today) -> FieldValidation:
    """Validate date. Returns structured FieldValidation."""
    if invalid_date_msg:
        return FieldValidation("invalid", error=invalid_date_msg)

    if not (clinic_ok and dentist_ok):
        if date_val:
            return FieldValidation("missing", value=date_val,
                                   display_name=bsvc.fmt_date(date_val))
        return FieldValidation("missing")

    if date_val:
        # Same-date conflict
        same = Appointment.objects.filter(
            patient=user, date=date_val, status__in=["confirmed", "pending"],
        ).first()
        if same:
            d_name = same.dentist.get_full_name() if same.dentist else "another dentist"
            s_name = same.service.name if same.service else "appointment"
            return FieldValidation(
                "invalid", value=date_val,
                error=(f"You've already got a {s_name} on "
                       f"{bsvc.fmt_date_full(date_val)} with Dr. {d_name} "
                       "— we only allow one appointment per day."),
            )

        slots = bsvc.get_available_slots(dentist, date_val, clinic)
        if slots:
            return FieldValidation("valid", value=date_val,
                                   display_name=bsvc.fmt_date_full(date_val))

        # No slots on this date — distinguish "no availability set" from "fully booked"
        has_record = bsvc.has_availability_record(dentist, date_val, clinic)
        alt = bsvc.get_alt_dentists_on_date(clinic, date_val, exclude_dentist=dentist)
        alt_names = [f"Dr. {d.get_full_name()}" for d in alt] if alt else []
        if has_record:
            error_msg = f"Dr. {dentist.get_full_name()} is fully booked on {bsvc.fmt_date(date_val)}."
        else:
            # Check if the dentist is available at a DIFFERENT clinic on this date.
            # This handles the case where the clinic was wrongly inferred (e.g. the
            # dentist has no Alabang schedule on that date but does have Poblacion).
            alt_clinic_av = DentistAvailability.objects.filter(
                dentist=dentist, date=date_val, is_available=True,
                clinic__isnull=False,
            ).exclude(clinic=clinic).select_related('clinic').first()
            if alt_clinic_av:
                alt_clinic_name = alt_clinic_av.clinic.name
                error_msg = (
                    f"Dr. {dentist.get_full_name()} doesn't have availability at "
                    f"{clinic.name} on {bsvc.fmt_date(date_val)}, but they're "
                    f"available at {alt_clinic_name} on that date!"
                )
                return FieldValidation(
                    "invalid", value=date_val,
                    error=error_msg,
                    options=[alt_clinic_name],
                    recommendation=f"Would you like to book at {alt_clinic_name} instead?",
                )
            error_msg = (
                f"Dr. {dentist.get_full_name()} doesn't have availability set for "
                f"{bsvc.fmt_date(date_val)} yet."
            )
        return FieldValidation(
            "invalid", value=date_val,
            error=error_msg,
            options=alt_names,
            recommendation="Other dentists are available on that date though!" if alt_names else "How about trying a different date?",
        )

    # Missing - show available dates
    end = today + timedelta(days=30)
    avails = DentistAvailability.objects.filter(
        dentist=dentist, date__gte=today, date__lte=end, is_available=True,
    ).filter(Q(clinic=clinic) | Q(apply_to_all_clinics=True)).order_by("date")

    dates_with_slots = []
    for av in avails:
        if bsvc.get_available_slots(dentist, av.date, clinic):
            dates_with_slots.append(av.date)
        if len(dates_with_slots) >= 8:
            break

    if not dates_with_slots:
        alt_dentists = [
            d for d in bsvc.get_dentists_with_openings(clinic, today)
            if d.id != dentist.id
        ]
        if alt_dentists:
            return FieldValidation(
                "blocked",
                error=f"Dr. {dentist.get_full_name()} is fully booked for the next 30 days.",
                options=[f"Dr. {d.get_full_name()}" for d in alt_dentists[:3]],
                recommendation="Other dentists at this clinic do have openings though!",
            )
        return FieldValidation(
            "blocked",
            error=f"Dr. {dentist.get_full_name()} doesn't have any openings in the next 30 days.",
        )

    options = [bsvc.fmt_date(d) for d in dates_with_slots]
    return FieldValidation("missing", options=options)


# -- Time --

def _check_time_field(clinic, clinic_ok, dentist, dentist_ok,
                      date_val, date_ok, time_val) -> FieldValidation:
    """Validate time. Returns structured FieldValidation."""
    if not (clinic_ok and dentist_ok and date_ok):
        if time_val:
            # Eagerly catch past times for today even before clinic/dentist are
            # confirmed — this prevents the AI from echoing a stale time as if
            # it were valid and asking the patient to confirm it.
            if date_val is not None:
                now_local = tz.localtime(tz.now())
                if date_val == now_local.date() and time_val <= now_local.time():
                    return FieldValidation(
                        "invalid", value=time_val,
                        display_name=bsvc.fmt_time(time_val),
                        error=f"{bsvc.fmt_time(time_val)} has already passed for today. Please choose a later time.",
                    )
            return FieldValidation("missing", value=time_val,
                                   display_name=bsvc.fmt_time(time_val))
        return FieldValidation("missing")

    if time_val:
        # Defense-in-depth: explicitly reject past times using Philippines local time
        now_local = tz.localtime(tz.now())
        if date_val == now_local.date() and time_val <= now_local.time():
            available_slots = bsvc.get_available_slots(dentist, date_val, clinic)
            options = [bsvc.fmt_time(s) for s in available_slots]
            return FieldValidation(
                "invalid", value=time_val,
                display_name=bsvc.fmt_time(time_val),
                error=f"{bsvc.fmt_time(time_val)} has already passed for today.",
                options=options,
            )

        available_slots = bsvc.get_available_slots(dentist, date_val, clinic)
        if time_val in available_slots:
            return FieldValidation("valid", value=time_val,
                                   display_name=bsvc.fmt_time(time_val))

        options = [bsvc.fmt_time(s) for s in available_slots]
        return FieldValidation(
            "invalid", value=time_val,
            display_name=bsvc.fmt_time(time_val),
            error=f"{bsvc.fmt_time(time_val)} isn't available on that day.",
            options=options,
        )

    # Missing
    slots = bsvc.get_available_slots(dentist, date_val, clinic)
    if not slots:
        return FieldValidation(
            "blocked",
            error="Looks like all the time slots just got booked for that date — how about trying a different day?",
        )

    options = [bsvc.fmt_time(s) for s in slots]
    return FieldValidation("missing", options=options)


# -- Service --

def _check_service_field(service, unmatched_name: str = None) -> FieldValidation:
    """Validate service. Returns structured FieldValidation."""
    allowed = Service.objects.filter(patient_bookable=True)
    if not allowed.exists():
        allowed = Service.objects.filter(name__iregex=r"(clean|consult)")

    bookable_names = [s.name for s in allowed]

    # The user explicitly named a service we don't recognise at all (e.g. "nail
    # polish", "physical exam"). Show a clear, friendly error instead of
    # silently asking what service they want.
    #
    # Distinguish between:
    #  (a) Non-dental services (physical exam, nail polish) → "we don't offer that"
    #  (b) Unknown but possibly dental → generic "not available for online booking"
    if unmatched_name:
        _NON_DENTAL_KEYWORDS = (
            'physical exam', 'physical', 'nail polish', 'nail', 'manicure',
            'pedicure', 'haircut', 'hair', 'massage', 'spa', 'facial',
            'eye exam', 'eye', 'skin care', 'derma', 'blood test', 'lab test',
            'x-ray', 'xray', 'vaccine', 'vaccination', 'immunization',
            'body check', 'medical exam', 'general checkup',
        )
        is_non_dental = any(kw in unmatched_name.lower() for kw in _NON_DENTAL_KEYWORDS)
        if is_non_dental:
            return FieldValidation(
                "invalid",
                error=(
                    f"We're a dental clinic, so we don't offer **{unmatched_name}**. "
                    "I can help you with dental services though! For online booking, "
                    "I can set you up for a **Cleaning** or **Consultation**."
                ),
                options=bookable_names,
            )
        return FieldValidation(
            "invalid",
            error=(
                f"We don't offer **{unmatched_name}** as an online booking service. "
                "Online booking is only available for **Cleaning** and **Consultation**. "
                "For other services, please call or visit the clinic directly."
            ),
            options=bookable_names,
        )

    if service:
        if service.patient_bookable:
            return FieldValidation("valid", value=service, display_name=service.name)
        # Service exists but is not available for online booking (owner restriction)
        return FieldValidation(
            "invalid",
            value=service,
            display_name=service.name,
            error=(
                f"{service.name} is offered at our clinic but cannot be booked online. "
                "Online booking is restricted to Cleaning and Consultation only. "
                "Please call or visit the clinic to schedule this service."
            ),
            options=bookable_names,
        )

    return FieldValidation("missing", options=bookable_names)


# -- Weekly Rule --

def _check_weekly_rule(user, date_val, date_ok) -> FieldValidation:
    """
    Check the one-booking-per-week rule EARLY so the patient gets
    feedback before reaching the confirmation/finalize step.
    Only checked when the date is already valid.
    """
    if not date_ok or not date_val:
        # Can't check without a valid date — passes by default.
        return FieldValidation("valid")

    is_valid, error_msg = validate_one_booking_per_week(user, date_val)
    if is_valid:
        return FieldValidation("valid")

    # Build a conversational message instead of the raw validation error.
    week_start = date_val - timedelta(days=date_val.weekday())
    next_week = week_start + timedelta(days=7)
    return FieldValidation(
        "invalid",
        value=date_val,
        error=(
            "You already have an appointment scheduled this week. "
            "We only allow one appointment per week. "
            f"Your next available window starts **{bsvc.fmt_date(next_week)}**."
        ),
        options=[bsvc.fmt_date(next_week)],
        recommendation="Would you like to pick a date that week instead?",
    )


# ======================================================================
# AI RESPONSE GENERATION
# ======================================================================

def _generate_ai_booking_response(
    msg: str, hist: list,
    validation: BookingValidation,
    detected_lang: str,
) -> dict:
    """
    Generate a conversational AI response based on validation results.
    Falls back to simple text if LLM is unavailable.
    """
    context = _build_ai_context(validation)
    llm = get_llm_service()

    prompt = (
        BOOKING_AI_PROMPT + "\n\n"
        + lang.gemini_language_instruction(detected_lang) + "\n\n"
        + context + "\n\n"
        + f"Patient's message: {msg}\n\n"
        + "Respond naturally. Help them with the next thing they need."
    )

    # Add recent conversation history — keep last 10 turns for full context
    if hist:
        prompt += "\nRecent conversation:\n"
        for m in hist[-10:]:
            role = "Patient" if m["role"] == "user" else "Sage"
            content = re.sub(r"<!--.*?-->", "", m.get("content", "")).strip()
            if content:
                prompt += f"{role}: {content}\n"

    text = llm.generate(prompt)
    if text:
        text = _sanitize_booking_response(text)
        qr = _get_quick_replies(validation)
        return build_reply(text, qr, tag="[BOOKING_FLOW]")

    # Fallback: simple text response (no LLM)
    return _build_fallback_response(validation, detected_lang)


def _build_ai_context(validation: BookingValidation) -> str:
    """Build the context string for the LLM prompt from validation data."""
    from django.utils import timezone as _tz
    from datetime import timedelta as _td
    _today = _tz.localtime(_tz.now()).date()
    _tomorrow = _today + _td(days=1)
    lines = [
        "BOOKING CONTEXT:",
        f"TODAY (Philippines time): {_today.strftime('%A, %B %d, %Y')}",
        f"TOMORROW: {_tomorrow.strftime('%A, %B %d, %Y')}",
    ]

    lines.append("\nCurrent selections:")
    for name, field in [
        ("Clinic", validation.clinic),
        ("Dentist", validation.dentist),
        ("Date", validation.date),
        ("Time", validation.time),
        ("Service", validation.service),
        ("Weekly Rule", validation.weekly_rule),
    ]:
        if field.status == "valid":
            lines.append(f"  OK {name}: {field.display_name}")
        elif field.status == "invalid":
            lines.append(f"  INVALID {name}: {field.error}")
        elif field.status == "blocked":
            lines.append(f"  BLOCKED {name}: {field.error}")
        elif field.status == "missing" and field.display_name:
            # Patient provided this value but it can't be fully validated yet
            # because an upstream field (clinic/dentist) is still missing.
            # Show as NOTED so the AI does NOT ask for it again.
            lines.append(f"  NOTED {name}: {field.display_name} (patient already specified this — do NOT ask for it again)")
        else:
            lines.append(f"  NEEDED {name}: not yet selected")

    lines.append("\nAvailable options (use ONLY these):")
    for name, field in [
        ("Clinics", validation.clinic),
        ("Dentists", validation.dentist),
        ("Dates", validation.date),
        ("Time slots", validation.time),
        ("Services", validation.service),
        ("Weekly", validation.weekly_rule),
    ]:
        # Don't list options for NOTED fields — the patient already provided
        # the value and we shouldn't suggest alternatives to something they
        # already specified.
        if field.options and not (field.status == "missing" and field.display_name):
            # For time slots, pass every option so the AI can show the full list.
            # For other fields (clinics, dentists, dates) a reasonable cap is fine.
            cap = None if name == "Time slots" else 8
            opts = field.options if cap is None else field.options[:cap]
            lines.append(f"  {name}: {', '.join(opts)}")
            if field.recommendation:
                lines.append(f"    Tip: {field.recommendation}")

    return "\n".join(lines)


def _get_quick_replies(validation: BookingValidation) -> List[str]:
    """Get quick_replies from the highest-priority field needing input."""
    for field in [validation.clinic, validation.dentist, validation.date,
                  validation.time, validation.service, validation.weekly_rule]:
        if field.status in ("missing", "invalid") and field.options:
            # Skip fields the patient already provided — they are NOTED (pending
            # upstream validation) and don't need quick-reply options shown.
            if field.status == "missing" and field.value is not None:
                continue
            # Return clean option names (strip availability annotations).
            # For time slots show all of them; for other fields cap at 6 to
            # keep the quick-reply bar usable.
            is_time_field = (field is validation.time)
            cap = None if is_time_field else 6
            raw = field.options if cap is None else field.options[:cap]
            clean = []
            for opt in raw:
                # Remove things like " (2 dentists available)" annotations
                cleaned = re.sub(r"\s*\(.*?\)\s*$", "", opt).strip()
                if cleaned:
                    clean.append(cleaned)
            return clean
    return []


def _build_fallback_response(
    validation: BookingValidation, detected_lang: str,
) -> dict:
    """
    Deterministic conversational fallback when the LLM is unavailable.

    Design principles (per FALLBACK SYSTEM ARCHITECTURE spec):
    - NO wizard logic.  No "Please select…".  No field-by-field early return.
    - Acknowledge what the patient already provided (valid fields).
    - Report ALL invalid/blocked issues at once, conversationally.
    - Then ask for the FIRST missing field naturally.
    - Match English / Tagalog.
    """
    is_tl = detected_lang in (lang.LANG_TAGALOG, lang.LANG_TAGLISH)

    fields_ordered = [
        ("clinic",       validation.clinic),
        ("dentist",      validation.dentist),
        ("date",         validation.date),
        ("time",         validation.time),
        ("service",      validation.service),
        ("weekly limit", validation.weekly_rule),
    ]

    # ── Natural "ask" phrases ─────────────────────────────────────────────
    _ask_en = {
        "clinic":       "Which clinic works best for you?",
        "dentist":      "Which dentist would you like to see?",
        "date":         "When would you like to come in?",
        "time":         "What time works best for you?",
        "service":      "Is this for a cleaning or a consultation?",
        "weekly limit": "When else would you like to schedule?",
    }
    _ask_tl = {
        "clinic":       "Saang clinic po kayo nais pumunta?",
        "dentist":      "Sinong dentist po ang gusto ninyo?",
        "date":         "Kailan po kayo nais pumunta?",
        "time":         "Anong oras po ang maginhawa para sa inyo?",
        "service":      "Ito po ba ay para sa cleaning o consultation?",
        "weekly limit": "Kailan pa po kayo nais mag-schedule?",
    }

    # ── Friendly option-list intros (so options don't feel like raw lists) ─
    _option_intro_en = {
        "clinic":   "Here are our locations:",
        "dentist":  "Here are the available dentists:",
        "date":     "Here are some open dates:",
        "time":     "Here are the available time slots:",
        "service":  "We offer these for online booking:",
    }
    _option_intro_tl = {
        "clinic":   "Narito po ang aming mga lokasyon:",
        "dentist":  "Narito po ang mga available na dentist:",
        "date":     "Narito po ang mga bukas na petsa:",
        "time":     "Narito po ang mga bukas na oras:",
        "service":  "Ito po ang maaaring i-book online:",
    }

    # ── Step 1: classify every field ──────────────────────────────────────
    valid_fields: List[tuple] = []     # (name, FieldValidation)
    error_fields: List[tuple] = []     # (name, FieldValidation)
    first_missing_name: Optional[str] = None
    first_missing_field: Optional[FieldValidation] = None

    for name, field in fields_ordered:
        if field.status == "valid":
            valid_fields.append((name, field))
        elif field.status in ("invalid", "blocked"):
            error_fields.append((name, field))
        elif field.status == "missing":
            if field.value is not None:
                # NOTED field: patient already provided this value; treat it
                # like a valid field for acknowledgment purposes so we don't
                # ask for something we already know.
                valid_fields.append((name, field))
            elif first_missing_name is None:
                first_missing_name = name
                first_missing_field = field

    # ── Step 2: build the response parts ──────────────────────────────────
    parts: List[str] = []

    # -- Acknowledgment: briefly echo what's already good --
    if valid_fields and (error_fields or first_missing_name):
        ack = _build_acknowledgment(valid_fields, is_tl)
        if ack:
            parts.append(ack)

    # -- Report ALL errors at once --
    if error_fields:
        for _name, field in error_fields:
            parts.append(field.error)
            # Show alternatives inline when they exist
            if field.options:
                intro = (_option_intro_tl if is_tl else _option_intro_en).get(_name, "")
                if intro:
                    parts.append(intro)
                # Show all time slots; cap other lists at 8
                cap = None if _name == "time" else 8
                opts = field.options if cap is None else field.options[:cap]
                parts.append("\n".join(f"- **{o}**" for o in opts))
            if field.recommendation:
                parts.append(f"_{field.recommendation}_")

    # -- Ask for first missing field --
    if first_missing_name and first_missing_field:
        ask = (_ask_tl if is_tl else _ask_en)[first_missing_name]
        parts.append(ask)
        if first_missing_field.options:
            intro = (_option_intro_tl if is_tl else _option_intro_en).get(first_missing_name, "")
            if intro and not error_fields:
                # Only add intro if we didn't already show a list above
                parts.append(intro)
            # Show all time slots; cap other lists at 8
            cap = None if first_missing_name == "time" else 8
            opts = first_missing_field.options if cap is None else first_missing_field.options[:cap]
            parts.append("\n".join(f"- **{o}**" for o in opts))
        if first_missing_field.recommendation:
            parts.append(f"_{first_missing_field.recommendation}_")

    if not parts:
        fallback = ("Paano ko po kayo matutulungan sa booking?"
                    if is_tl else "How can I help you with your booking?")
        return build_reply(fallback, tag="[BOOKING_FLOW]")

    return build_reply("\n\n".join(parts), _get_quick_replies(validation), tag="[BOOKING_FLOW]")


def _build_acknowledgment(valid_fields: List[tuple], is_tl: bool) -> str:
    """
    Return a short, natural opener that echoes what the patient already provided.
    Examples:
      - "Great, Bacoor with Dr. Cruz!"
      - "Got it — Bacoor!"
      - "Sige, Bacoor po!"
    """
    snippets = []
    for name, field in valid_fields:
        if name == "clinic":
            snippets.append(field.display_name)
        elif name == "dentist":
            snippets.append(field.display_name)
        elif name == "date":
            snippets.append(f"on {field.display_name}")
        elif name == "time":
            snippets.append(f"at {field.display_name}")
        elif name == "service":
            snippets.append(f"for a {field.display_name}")

    if not snippets:
        return ""

    joined = ", ".join(snippets[:3])
    if is_tl:
        return f"Sige po, {joined}!"
    return f"Got it — {joined}!"


def _sanitize_booking_response(text: str) -> str:
    """Remove leaked sensitive data or step tags from LLM response."""
    text = re.sub(r"<!--.*?-->", "", text).strip()
    leak_patterns = ["password:", "token:", "api_key", "database:", "postgres://",
                     "secret:", "credential:", "supabase", "gemini"]
    for pat in leak_patterns:
        if pat in text.lower():
            return "I'd love to help you book an appointment! Which clinic works best for you?"
    return text


# ======================================================================
# CONFIRMATION & FINALIZATION (DETERMINISTIC - NO LLM)
# ======================================================================

def _show_confirmation(user, clinic, dentist, date_val, time_val, service,
                       detected_lang) -> dict:
    """Show confirmation summary when all fields are valid. Deterministic."""
    logger.info(
        "Booking confirmation: user=%s clinic=%s dentist=%s date=%s time=%s service=%s",
        user.id, clinic.name, dentist.get_full_name(),
        date_val, time_val, service.name,
    )
    session = bmem.get_session(user.id)
    bmem.update_draft(session, clinic=clinic, dentist=dentist,
                      date=date_val, time=time_val, service=service)
    session.flags.confirmation_shown = True
    session.state = bmem.ConversationState.BOOKING_CONFIRMING

    return build_reply(
        f"{lang.confirmation_header(detected_lang)}\n\n"
        f"\U0001f4cd **Clinic:** {clinic.name}\n"
        f"\U0001f468\u200d\u2695\ufe0f **Dentist:** Dr. {dentist.get_full_name()}\n"
        f"\U0001f4c5 **Date:** {bsvc.fmt_date_full(date_val)}\n"
        f"\U0001f550 **Time:** {bsvc.fmt_time(time_val)}\n"
        f"\U0001f9b7 **Service:** {service.name}\n\n"
        f"{lang.confirmation_yes_no(detected_lang)}",
        lang.confirmation_buttons(detected_lang),
        tag="[BOOKING_CONFIRM]",
    )


def _handle_confirmation(user, low, session, detected_lang) -> dict:
    """Handle yes/no response during the confirmation gate. Deterministic."""
    draft = session.draft

    # Read booking details from the session draft
    clinic = draft.clinic
    dentist = draft.dentist
    date_val = draft.date
    time_val = draft.time
    service = draft.service

    if not all([clinic, dentist, date_val, time_val, service]):
        # Draft incomplete (shouldn't happen) - reset
        logger.warning("Confirmation with incomplete draft for user=%s", user.id)
        session.state = bmem.ConversationState.IDLE
        bmem.clear_session(user.id)
        is_tl = detected_lang in (lang.LANG_TAGALOG, lang.LANG_TAGLISH)
        if is_tl:
            return build_reply(
                "Pasensya po, may problema. Pakisabi ulit ng 'book' para magsimula.",
                tag="[FLOW_COMPLETE]",
            )
        return build_reply(
            "Sorry, something went wrong. Please say 'book' to start again.",
            tag="[FLOW_COMPLETE]",
        )

    if isvc.is_confirm_yes(low):
        return _finalize_booking(
            user, clinic, dentist, date_val, time_val, service, detected_lang,
        )

    if isvc.is_confirm_no(low):
        logger.info("Booking cancelled by user at confirmation: user=%s", user.id)
        session.state = bmem.ConversationState.IDLE
        bmem.clear_session(user.id)
        return build_reply(
            lang.booking_cancelled(detected_lang),
            tag="[FLOW_COMPLETE]",
        )

    # Neither yes nor no - re-prompt
    return build_reply(
        f"{lang.reprompt_confirmation(detected_lang)}\n\n"
        f"\U0001f4cd **Clinic:** {clinic.name}\n"
        f"\U0001f468\u200d\u2695\ufe0f **Dentist:** Dr. {dentist.get_full_name()}\n"
        f"\U0001f4c5 **Date:** {bsvc.fmt_date_full(date_val)}\n"
        f"\U0001f550 **Time:** {bsvc.fmt_time(time_val)}\n"
        f"\U0001f9b7 **Service:** {service.name}",
        lang.confirmation_buttons(detected_lang),
    )


def _finalize_booking(user, clinic, dentist, date_val, time_val, service,
                      detected_lang) -> dict:
    """Validate and create the appointment. Deterministic."""
    logger.info("Booking confirmed by user, finalizing: user=%s", user.id)

    appt, error_msg = bsvc.create_appointment(
        patient=user,
        dentist=dentist,
        service=service,
        clinic=clinic,
        date=date_val,
        time_val=time_val,
    )

    if error_msg:
        if "per week" in error_msg:
            next_week = date_val + timedelta(days=(7 - date_val.weekday()))
            session = bmem.get_session(user.id)
            session.state = bmem.ConversationState.BOOKING_COLLECTING
            return build_reply(
                f"You already have an appointment this week — we only allow one per week. "
                f"Your next available window starts **{bsvc.fmt_date(next_week)}**. "
                f"Would you like to pick a date that week instead?",
                [next_week.strftime("%B %d")],
            )
        if "slot was just booked" in error_msg.lower():
            session = bmem.get_session(user.id)
            session.state = bmem.ConversationState.BOOKING_COLLECTING
            return build_reply(error_msg)
        if "overlapping" in error_msg.lower() or "already have" in error_msg.lower():
            session = bmem.get_session(user.id)
            session.state = bmem.ConversationState.BOOKING_COLLECTING
            return build_reply(f"{error_msg} How about a different time?")
        return build_reply(error_msg)

    # Success - notifications
    create_appointment_notification(appt, "new_appointment")
    create_patient_notification(appt, "appointment_confirmed")

    # Clear session
    session = bmem.get_session(user.id)
    session.state = bmem.ConversationState.IDLE
    bmem.clear_session(user.id)

    return build_reply(
        f"{lang.booking_success(detected_lang)}\n\n"
        f"**Clinic:** {clinic.name}\n"
        f"**Dentist:** Dr. {dentist.get_full_name()}\n"
        f"**Date:** {bsvc.fmt_date_full(date_val)}\n"
        f"**Time:** {bsvc.fmt_time(time_val)}\n"
        f"**Service:** {service.name}\n"
        f"**Status:** Confirmed\n\n"
        f"{lang.booking_success_footer(detected_lang)}",
        tag="[FLOW_COMPLETE]",
    )
