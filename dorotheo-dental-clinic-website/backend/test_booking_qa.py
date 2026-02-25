"""
Booking QA — Live AI End-to-End Validation
===========================================
Tests every invalid-booking edge case with the real Gemini AI.
Checks both WHAT the bot says and HOW it says it (no robotic language).

Run from backend/:
    python test_booking_qa.py

Requires a running DB with at least one patient user.
Set GEMINI_API_KEY in .env before running.

Gemini free-tier rate limit: ~15 RPM.
THROTTLE_SECONDS controls the delay between AI-backed calls.
"""

import os, sys, django, time
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from datetime import date, timedelta
from api.chatbot_service import DentalChatbotService
from api.models import User, ClinicLocation, Service
from api.services import booking_service as bsvc
from api.services.llm_service import get_llm_service

# ── Colour helpers ────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"
PASS   = f"{GREEN}✅ PASS{RESET}"
FAIL   = f"{RED}❌ FAIL{RESET}"
WARN   = f"{YELLOW}⚠️  WARN{RESET}"
SEP    = "─" * 76

passed = failed = warned = 0

# Delay between chatbot calls — keeps us under Gemini free-tier RPM (15/min).
# Set to 0 to disable throttling (e.g. when using a paid key).
THROTTLE_SECONDS = 0

# ── Forbidden wizard phrases (must NEVER appear) ──────────────────────────
FORBIDDEN = [
    "please select",
    "please select a",
    "step 1", "step 2", "step 3",
    "cannot book an appointment",       # old robotic phrasing
    "booking beyond our allowed",       # old far-future msg
    "is not permitted",                 # old policy language
    "appointments can only be booked",  # old window msg
]


def _llm_alive() -> bool:
    """Quick check that Gemini AI is responding."""
    try:
        result = get_llm_service().generate("Say 'AI OK' and nothing else.")
        return bool(result and "ok" in result.lower())
    except Exception:
        return False


def _get_patient():
    """Return the first patient user in the DB, or None."""
    return User.objects.filter(user_type='patient', is_active=True).first()


def _bot(user):
    return DentalChatbotService(user=user)


def run(label: str, msg: str, user=None, history=None,
        must_contain=None, must_not_contain=None, must_contain_any=None,
        no_forbidden=True, show_response=True):
    """
    Run a single message through the chatbot and evaluate the result.

    must_contain     : list[str] — ALL must appear in response (case-insensitive)
    must_contain_any : list[str] — AT LEAST ONE must appear (bilingual check)
    must_not_contain : list[str] — none must appear in response
    no_forbidden     : bool — check FORBIDDEN wizard phrases list
    """
    global passed, failed, warned

    bot = _bot(user)
    result = bot.get_response(msg, history or [])
    resp = (result.get("response") or "").strip()
    qr   = result.get("quick_replies") or []
    err  = result.get("error")

    problems = []

    if err:
        problems.append(f"error flag set: {err}")

    if not resp:
        problems.append("empty response")

    # Wizard language check
    if no_forbidden:
        for phrase in FORBIDDEN:
            if phrase in resp.lower():
                problems.append(f'contains forbidden phrase: "{phrase}"')

    # Must-contain check (ALL required)
    if must_contain:
        for term in (must_contain if isinstance(must_contain, list) else [must_contain]):
            if term.lower() not in resp.lower():
                problems.append(f'missing expected term: "{term}"')

    # Must-contain-any check (AT LEAST ONE required — bilingual)
    if must_contain_any:
        terms = must_contain_any if isinstance(must_contain_any, list) else [must_contain_any]
        if not any(t.lower() in resp.lower() for t in terms):
            problems.append(f'missing any of: {terms}')

    # Must-not-contain check
    if must_not_contain:
        for term in (must_not_contain if isinstance(must_not_contain, list) else [must_not_contain]):
            if term.lower() in resp.lower():
                problems.append(f'should not contain: "{term}"')

    ok = len(problems) == 0

    if ok:
        passed += 1
        icon = PASS
    else:
        failed += 1
        icon = FAIL

    print(f"\n{icon}  {BOLD}{label}{RESET}")

    if show_response:
        # Show response in a box, truncated to 400 chars
        display = resp[:400] + ("…" if len(resp) > 400 else "")
        for line in display.split("\n"):
            print(f"       {CYAN}{line}{RESET}")
        if qr:
            print(f"       {YELLOW}[Quick replies: {', '.join(qr[:6])}]{RESET}")

    if problems:
        for p in problems:
            print(f"       {RED}⚠ {p}{RESET}")

    if THROTTLE_SECONDS > 0:
        time.sleep(THROTTLE_SECONDS)

    return resp


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    global passed, failed, warned

    print(f"\n{BOLD}{SEP}")
    print("  BOOKING QA — AI End-to-End Validation  (10 tests)")
    print(f"  Date: {date.today().strftime('%B %d, %Y')}")
    print(f"{SEP}{RESET}\n")

    # ── Pre-flight ────────────────────────────────────────────────────────
    print(f"{BOLD}[PRE-FLIGHT]{RESET}")

    patient = _get_patient()
    if not patient:
        print(f"  {RED}✗ No patient user found in DB. Create one first.{RESET}")
        sys.exit(1)
    print(f"  {GREEN}✓ Patient: {patient.get_full_name()} ({patient.email}){RESET}")

    ai_alive = _llm_alive()
    if ai_alive:
        print(f"  {GREEN}✓ Gemini AI is responding.{RESET}")
    else:
        print(f"  {YELLOW}⚠ Gemini AI did not respond — fallback mode active.{RESET}")
        print(f"    Responses will use deterministic fallback, not LLM.")

    if THROTTLE_SECONDS > 0:
        time.sleep(THROTTLE_SECONDS)

    today = date.today()
    past_date  = (today - timedelta(days=3)).strftime("%B %d, %Y")
    far_future = (today + timedelta(days=100)).strftime("%B %d %Y")
    next_week  = (today + timedelta(days=8)).strftime("%B %d")

    print(f"\n{SEP}\n")

    # ── 1 ─────────────────────────────────────────────────────────────────
    run(
        label="1 · Impossible date: January 39",
        msg="book an appointment at bacoor for january 39 at 10am for cleaning",
        user=patient,
        must_contain=["31"],   # bot should say January only has 31 days
    )

    # ── 2 ─────────────────────────────────────────────────────────────────
    run(
        label="2 · Past date (3 days ago)",
        msg=f"book at bacoor on {past_date} at 10am for cleaning",
        user=patient,
        # bot should mention the date has passed — works in English ("already") and
        # Tagalog/Taglish ("nakalipas").
        must_contain_any=["already", "nakalipas", "passed"],
        must_not_contain=["cannot book an appointment in the past"],
    )

    # ── 3 ─────────────────────────────────────────────────────────────────
    run(
        label="3 · Far future date (100+ days out)",
        msg=f"book a consultation for {far_future}",
        user=patient,
        must_not_contain=["is not permitted", "booking beyond"],
    )

    # ── 4 ─────────────────────────────────────────────────────────────────
    run(
        label="4 · Past time today: 1am",
        msg="book at bacoor today at 1am with dr carlo salvador for cleaning",
        user=patient,
        # bot should indicate 1 AM has passed — works in English and Tagalog/Taglish.
        must_contain_any=["passed", "already", "nakalipas", "1:00"],
        must_not_contain=["please select"],
    )

    # ── 5 ─────────────────────────────────────────────────────────────────
    run(
        label="5 · Non-existent doctor: doc gabriel",
        msg="book at bacoor for cleaning with doc gabriel",
        user=patient,
        must_contain=["gabriel"],
        must_not_contain=["please select a dentist"],
    )

    # ── 6 ─────────────────────────────────────────────────────────────────
    run(
        label="6 · Non-bookable service: tooth extraction",
        msg="I need to book a tooth extraction at bacoor",
        user=patient,
        must_contain=["extraction", "online"],
        must_not_contain=["please select"],
    )

    # ── 7 ─────────────────────────────────────────────────────────────────
    run(
        label="7 · Multiple errors: bad doctor + past date",
        msg=f"book with doc gabriel at bacoor on {past_date} at 10am for cleaning",
        user=patient,
        must_contain=["already"],
        must_not_contain=["please select"],
    )

    # ── 8 ─────────────────────────────────────────────────────────────────
    run(
        label="8 · No booking info — should ask naturally",
        msg="book an appointment",
        user=patient,
        must_not_contain=["please select"],
    )

    # ── 9 ─────────────────────────────────────────────────────────────────
    run(
        label="9 · Full valid message (clinic + dentist + date + service)",
        msg=f"book at bacoor with dr carlo salvador on {next_week} at 2pm for cleaning",
        user=patient,
        must_not_contain=["please select"],
    )

    # ── 10 ────────────────────────────────────────────────────────────────
    run(
        label="10 · Tone check: no wizard phrases",
        msg="book at bacoor for cleaning",
        user=patient,
        must_not_contain=["please select a", "step 1", "step 2"],
    )

    # ── Summary ───────────────────────────────────────────────────────────
    total = passed + failed
    print(f"\n{SEP}")
    print(f"{BOLD}  RESULTS: {passed}/{total} passed", end="")
    if failed:
        print(f"  |  {RED}{failed} failed{RESET}", end="")
    print(f"{RESET}\n")

    if not ai_alive:
        print(f"  {YELLOW}Note: Gemini was offline — responses used deterministic fallback.{RESET}\n")

    if failed == 0:
        print(f"  {GREEN}{BOLD}All checks passed! ✅{RESET}\n")
    else:
        print(f"  {RED}Some checks failed. Review the responses above.{RESET}\n")


if __name__ == "__main__":
    main()

