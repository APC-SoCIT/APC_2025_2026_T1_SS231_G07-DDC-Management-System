"""
QA: Full flow test — Booking, Reschedule, Cancel
Tests English, Tagalog, and Taglish via sb@gmail.com patient account.
Simulates multi-turn conversation by building history between turns.

Run from backend directory:
    .venv\Scripts\python.exe qa_flows.py
"""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
sys.path.insert(0, '.')
django.setup()

from api.chatbot_service import DentalChatbotService
from django.contrib.auth import get_user_model
from api.models import Appointment, DentistAvailability, ClinicLocation
from datetime import datetime

User = get_user_model()

# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────

def bot(svc, msg, hist):
    """Send a message, append to history, return (response_text, updated_hist)."""
    resp = svc.get_response(msg, conversation_history=hist)
    text = resp.get('response') or resp.get('text') or '(EMPTY)'
    qr   = resp.get('quick_replies', [])
    hist = hist + [
        {'role': 'user',      'content': msg},
        {'role': 'assistant', 'content': text},
    ]
    return text, qr, hist


def section(title):
    line = '═' * 60
    print(f'\n{line}')
    print(f'  {title}')
    print(f'{line}')


def step(label, msg):
    print(f'\n  ▶ [{label}]  "{msg}"')


def show(text, qr):
    for ln in text.strip().split('\n'):
        print(f'     {ln}')
    if qr:
        print(f'     QR → {qr[:5]}')


def divider():
    print('  ' + '─' * 56)


# ─────────────────────────────────────────────────────────────────
# Setup: load user + probe DB for real values
# ─────────────────────────────────────────────────────────────────

print('\n⚙  Loading user sb@gmail.com ...')
try:
    user = User.objects.get(email='sb@gmail.com')
    print(f'   ✅  Found: {user.get_full_name()} (id={user.id})')
except User.DoesNotExist:
    print('   ❌  User not found. Exiting.')
    sys.exit(1)

# ── Pre-run cleanup: clear any pending/blocked state left by previous QA runs ──
import contextlib
reset_blocked = 0
for a in Appointment.objects.filter(patient=user, status__in=['cancel_requested', 'reschedule_requested']):
    a.status = 'confirmed'
    with contextlib.suppress(Exception):
        a.cancel_requested_at = None
    with contextlib.suppress(Exception):
        a.reschedule_requested_at = None
    a.save()
    reset_blocked += 1
if reset_blocked:
    print(f'   🧹  Reset {reset_blocked} blocked appointment(s) → confirmed')

svc = DentalChatbotService(user=user)

# Probe real DB values for smart responses
clinics = list(ClinicLocation.objects.values_list('name', flat=True).order_by('name'))
print(f'   Clinics  : {clinics}')

today = datetime.now().date()
avail = DentistAvailability.objects.filter(
    date__gte=today, is_available=True
).select_related('dentist', 'clinic').order_by('date')[:3]
first_avail = avail.first()
avail_dentist = first_avail.dentist.get_full_name() if first_avail else None
avail_date    = first_avail.date.strftime('%B %d') if first_avail else None
avail_clinic  = first_avail.clinic.name if (first_avail and first_avail.clinic) else (clinics[0] if clinics else 'Bacoor')
print(f'   First available: Dr. {avail_dentist}  on {avail_date}  at {avail_clinic}')

upcoming = Appointment.objects.filter(
    patient=user,
    date__gte=today,
    status__in=['confirmed', 'pending'],
).order_by('date')
print(f'   Upcoming appointments: {upcoming.count()}')
for a in upcoming[:3]:
    svc_name = a.service.name if a.service else 'Appointment'
    print(f'      • {svc_name} — {a.date} {a.time} (status={a.status})')

# ─────────────────────────────────────────────────────────────────
# BOOKING FLOWS
# ─────────────────────────────────────────────────────────────────

section('BOOKING — ENGLISH')
hist = []

step('B-EN-1', 'I want to book an appointment')
t, qr, hist = bot(svc, 'I want to book an appointment', hist)
show(t, qr)

if clinics:
    cli = clinics[0]
    step('B-EN-2', cli)
    t, qr, hist = bot(svc, cli, hist)
    show(t, qr)

    # Pick first quick-reply dentist if available
    dentist_pick = qr[0] if qr else (f'Dr. {avail_dentist}' if avail_dentist else 'Dr. Marvin Dorotheo')
    step('B-EN-3', dentist_pick)
    t, qr, hist = bot(svc, dentist_pick, hist)
    show(t, qr)

    # Pick first date from quick replies
    date_pick = qr[0] if qr else (avail_date or 'next available')
    step('B-EN-4', date_pick)
    t, qr, hist = bot(svc, date_pick, hist)
    show(t, qr)

    # Pick first time
    time_pick = qr[0] if qr else '9:00 AM'
    step('B-EN-5', time_pick)
    t, qr, hist = bot(svc, time_pick, hist)
    show(t, qr)

    # Pick first service
    service_pick = qr[0] if qr else 'Checkup'
    step('B-EN-6', service_pick)
    t, qr, hist = bot(svc, service_pick, hist)
    show(t, qr)

    # Confirm
    step('B-EN-7', 'Yes, confirm')
    t, qr, hist = bot(svc, 'Yes, confirm', hist)
    show(t, qr)

divider()

section('BOOKING — TAGALOG')
hist = []

step('B-TL-1', 'Gusto ko mag-book ng appointment')
t, qr, hist = bot(svc, 'Gusto ko mag-book ng appointment', hist)
show(t, qr)

if clinics:
    cli = clinics[0]
    step('B-TL-2', cli)
    t, qr, hist = bot(svc, cli, hist)
    show(t, qr)

    dentist_pick = qr[0] if qr else (f'Dr. {avail_dentist}' if avail_dentist else 'Dr. Marvin Dorotheo')
    step('B-TL-3', dentist_pick)
    t, qr, hist = bot(svc, dentist_pick, hist)
    show(t, qr)

    date_pick = qr[0] if qr else (avail_date or 'susunod na araw')
    step('B-TL-4', date_pick)
    t, qr, hist = bot(svc, date_pick, hist)
    show(t, qr)

    time_pick = qr[0] if qr else '9:00 AM'
    step('B-TL-5', time_pick)
    t, qr, hist = bot(svc, time_pick, hist)
    show(t, qr)

    service_pick = qr[0] if qr else 'Checkup'
    step('B-TL-6', service_pick)
    t, qr, hist = bot(svc, service_pick, hist)
    show(t, qr)

    step('B-TL-7', 'Oo, kumpirmahin')
    t, qr, hist = bot(svc, 'Oo, kumpirmahin', hist)
    show(t, qr)

divider()

section('BOOKING — TAGLISH')
hist = []

step('B-MIX-1', 'Pwede ba mag-book ng appointment?')
t, qr, hist = bot(svc, 'Pwede ba mag-book ng appointment?', hist)
show(t, qr)

if clinics:
    cli = clinics[-1] if len(clinics) > 1 else clinics[0]
    step('B-MIX-2', cli)
    t, qr, hist = bot(svc, cli, hist)
    show(t, qr)

    dentist_pick = qr[0] if qr else (f'Dr. {avail_dentist}' if avail_dentist else 'Dr. Marvin Dorotheo')
    step('B-MIX-3', dentist_pick)
    t, qr, hist = bot(svc, dentist_pick, hist)
    show(t, qr)

    date_pick = qr[0] if qr else (avail_date or 'next week')
    step('B-MIX-4', date_pick)
    t, qr, hist = bot(svc, date_pick, hist)
    show(t, qr)

    time_pick = qr[0] if qr else '9:00 AM'
    step('B-MIX-5', time_pick)
    t, qr, hist = bot(svc, time_pick, hist)
    show(t, qr)

    service_pick = qr[0] if qr else 'Checkup'
    step('B-MIX-6', service_pick)
    t, qr, hist = bot(svc, service_pick, hist)
    show(t, qr)

    step('B-MIX-7', 'Yes please, i-confirm na')
    t, qr, hist = bot(svc, 'Yes please, i-confirm na', hist)
    show(t, qr)

divider()

# ─────────────────────────────────────────────────────────────────
# RESCHEDULE FLOWS
# ─────────────────────────────────────────────────────────────────

# Re-query appointments (booking may have added one)
upcoming2 = Appointment.objects.filter(
    patient=user,
    date__gte=today,
    status__in=['confirmed', 'pending'],
).order_by('date')
has_appt = upcoming2.exists()
print(f'\n   Post-booking appointments count: {upcoming2.count()}')

section('RESCHEDULE — ENGLISH')
hist = []

step('R-EN-1', 'I want to reschedule my appointment')
t, qr, hist = bot(svc, 'I want to reschedule my appointment', hist)
show(t, qr)

if has_appt and qr:
    appt_pick = qr[0]
    step('R-EN-2', appt_pick)
    t, qr, hist = bot(svc, appt_pick, hist)
    show(t, qr)

    date_pick = qr[0] if qr else (avail_date or 'next Monday')
    step('R-EN-3', date_pick)
    t, qr, hist = bot(svc, date_pick, hist)
    show(t, qr)

    time_pick = qr[0] if qr else '10:00 AM'
    step('R-EN-4', time_pick)
    t, qr, hist = bot(svc, time_pick, hist)
    show(t, qr)

    step('R-EN-5', 'Yes, reschedule')
    t, qr, hist = bot(svc, 'Yes, reschedule', hist)
    show(t, qr)
elif not has_appt:
    print('     (No upcoming appointments — skipping reschedule sub-steps)')

divider()

section('RESCHEDULE — TAGALOG')
hist = []

step('R-TL-1', 'Gusto ko i-reschedule ang appointment ko')
t, qr, hist = bot(svc, 'Gusto ko i-reschedule ang appointment ko', hist)
show(t, qr)

upcoming3 = Appointment.objects.filter(
    patient=user, date__gte=today, status__in=['confirmed', 'pending'],
).order_by('date')
if upcoming3.exists() and qr:
    appt_pick = qr[0]
    step('R-TL-2', appt_pick)
    t, qr, hist = bot(svc, appt_pick, hist)
    show(t, qr)

    date_pick = qr[0] if qr else (avail_date or 'bukas')
    step('R-TL-3', date_pick)
    t, qr, hist = bot(svc, date_pick, hist)
    show(t, qr)

    time_pick = qr[0] if qr else '10:00 AM'
    step('R-TL-4', time_pick)
    t, qr, hist = bot(svc, time_pick, hist)
    show(t, qr)

    step('R-TL-5', 'Oo, i-reschedule na')
    t, qr, hist = bot(svc, 'Oo, i-reschedule na', hist)
    show(t, qr)
else:
    print('     (No upcoming appointments — skipping reschedule sub-steps)')

divider()

section('RESCHEDULE — TAGLISH')
hist = []

step('R-MIX-1', 'Pwede ko bang i-reschedule yung appointment ko?')
t, qr, hist = bot(svc, 'Pwede ko bang i-reschedule yung appointment ko?', hist)
show(t, qr)

upcoming4 = Appointment.objects.filter(
    patient=user, date__gte=today, status__in=['confirmed', 'pending'],
).order_by('date')
if upcoming4.exists() and qr:
    appt_pick = qr[0]
    step('R-MIX-2', appt_pick)
    t, qr, hist = bot(svc, appt_pick, hist)
    show(t, qr)

    date_pick = qr[0] if qr else (avail_date or 'next week')
    step('R-MIX-3', date_pick)
    t, qr, hist = bot(svc, date_pick, hist)
    show(t, qr)

    time_pick = qr[0] if qr else '10:00 AM'
    step('R-MIX-4', time_pick)
    t, qr, hist = bot(svc, time_pick, hist)
    show(t, qr)

    step('R-MIX-5', 'Yes, okay na yun')
    t, qr, hist = bot(svc, 'Yes, okay na yun', hist)
    show(t, qr)
else:
    print('     (No upcoming appointments — skipping reschedule sub-steps)')

divider()

# ─────────────────────────────────────────────────────────────────
# CANCEL FLOWS
# ─────────────────────────────────────────────────────────────────

upcoming5 = Appointment.objects.filter(
    patient=user, date__gte=today, status__in=['confirmed', 'pending'],
).order_by('date')
print(f'\n   Appointments for cancel test: {upcoming5.count()}')

section('CANCEL — ENGLISH')
hist = []

step('C-EN-1', 'I want to cancel my appointment')
t, qr, hist = bot(svc, 'I want to cancel my appointment', hist)
show(t, qr)

if upcoming5.exists() and qr:
    appt_pick = qr[0]
    step('C-EN-2', appt_pick)
    t, qr, hist = bot(svc, appt_pick, hist)
    show(t, qr)

    step('C-EN-3', 'Yes, cancel it')
    t, qr, hist = bot(svc, 'Yes, cancel it', hist)
    show(t, qr)
elif not upcoming5.exists():
    print('     (No upcoming appointments for cancel)')

divider()

section('CANCEL — TAGALOG')
hist = []

step('C-TL-1', 'Gusto ko i-cancel ang appointment ko')
t, qr, hist = bot(svc, 'Gusto ko i-cancel ang appointment ko', hist)
show(t, qr)

upcoming6 = Appointment.objects.filter(
    patient=user, date__gte=today, status__in=['confirmed', 'pending'],
).order_by('date')
if upcoming6.exists() and qr:
    appt_pick = qr[0]
    step('C-TL-2', appt_pick)
    t, qr, hist = bot(svc, appt_pick, hist)
    show(t, qr)

    step('C-TL-3', 'Oo, i-cancel na')
    t, qr, hist = bot(svc, 'Oo, i-cancel na', hist)
    show(t, qr)
else:
    print('     (No upcoming appointments for cancel)')

divider()

section('CANCEL — TAGLISH')
hist = []

step('C-MIX-1', 'Cancel na lang yung appointment ko')
t, qr, hist = bot(svc, 'Cancel na lang yung appointment ko', hist)
show(t, qr)

upcoming7 = Appointment.objects.filter(
    patient=user, date__gte=today, status__in=['confirmed', 'pending'],
).order_by('date')
if upcoming7.exists() and qr:
    appt_pick = qr[0]
    step('C-MIX-2', appt_pick)
    t, qr, hist = bot(svc, appt_pick, hist)
    show(t, qr)

    step('C-MIX-3', 'Yes, cancel na')
    t, qr, hist = bot(svc, 'Yes, cancel na', hist)
    show(t, qr)
else:
    print('     (No upcoming appointments for cancel)')

divider()

# ─────────────────────────────────────────────────────────────────
# EDGE CASES
# ─────────────────────────────────────────────────────────────────

section('EDGE CASES')

# Book → abort midway (no)
hist = []
step('EDGE-1', 'Book appointment (then abort at confirm)')
t, qr, hist = bot(svc, 'book an appointment', hist)
show(t, qr)
if clinics and qr:
    t, qr, hist = bot(svc, clinics[0], hist)
    show(t, qr)
    if qr:
        t, qr, hist = bot(svc, qr[0], hist)
        show(t, qr)
        if qr:
            t, qr, hist = bot(svc, qr[0], hist)
            show(t, qr)
            if qr:
                t, qr, hist = bot(svc, qr[0], hist)
                show(t, qr)
                if qr:
                    t, qr, hist = bot(svc, qr[0], hist)
                    show(t, qr)
                    # Now at confirm — say NO
                    step('EDGE-1-NO', 'No, cancel')
                    t, qr, hist = bot(svc, 'No, cancel', hist)
                    show(t, qr)

# Cancel with no appointments
divider()
hist = []
step('EDGE-2', 'Cancel flow with no appointments check')
# Use a fresh user (unauthenticated)
anon_svc = DentalChatbotService()
t, qr, hist2 = bot(anon_svc, 'I want to cancel my appointment', [])
show(t, qr)

divider()

section('QA COMPLETE')
print('  All flow tests finished. Review output above for:\n'
      '  • ❌ grammar errors\n'
      '  • ❌ missing/empty responses\n'
      '  • ❌ wrong language used\n'
      '  • ❌ wrong step tag progression\n'
      '  • ✅ success confirmations show correct data\n')
