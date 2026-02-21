"""QA script for extended availability queries."""
import os, sys, django
sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.services import rag_service, intent_service as isvc
from api.services.rag_service import _parse_month_only
from api.services.booking_service import parse_date

queries = [
    # Today
    'is doc marvin available',
    'available ba si doc marvin',
    # Next / this week
    'when is dr marvin available this week',
    'kelan available si doc marvin next week',
    # Next month
    'available dentists next month',
    'who is available next month',
    'kelan available si doc marvin next month',
    'anong araw available next month',
    # Specific future months
    'anong araw available si doc marvin sa march',
    'when is doc marvin available in april',
    'available si doc marvin sa march',
    # Next year
    'available in january next year',
    'who is available in january next year',
    'available si doc marvin sa january next year',
    'kelan available si doc marvin next year',
    # Year-qualified
    'who is available in january 2027',
    'anong araw available si doc marvin sa march 2027',
    # Time slot queries
    'what time is doc marvin available',
    'anong oras available si doc marvin',
    'what time can i see doc marvin',
    'what date and time is doc marvin available',
    'what are the available time slots for doc marvin',
    'anong available na schedule ni doc marvin',
    'what are doc marvin available slots',
    'what time slots are available for doc marvin this week',
]

print('=' * 80)
for q in queries:
    intent = isvc.classify_intent(q)
    pdate = parse_date(q)
    mrange = _parse_month_only(q)
    ctx = rag_service.build_db_context(q)
    lines = (ctx or '').splitlines()
    relevant = [l for l in lines if 'Availability for' in l or 'Available on' in l or
                'No available' in l or 'AVAILABLE' in l or 'Not available' in l or
                'Book a 30-min' in l or 'time slot' in l.lower()]
    print(f"Q: {q}")
    print(f"   intent={intent.intent}  parse_date={pdate}  month_range={mrange}")
    for l in relevant[:4]:
        print(f"   > {l[:120]}")
    print()
