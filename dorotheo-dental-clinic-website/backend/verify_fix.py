"""Verify the two bug fixes."""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.services.rag_service import build_db_context

print("=" * 60)
print("FIX 1: 'dr' substring in asking_about_dentist")
print("=" * 60)

# Test 1a: "address" query must NOT trigger dentist block
ctx = build_db_context('ano ang address ng bacoor clinic')
has_dentist = '=== OUR DENTISTS ===' in ctx
has_clinic  = 'CLINIC LOCATIONS' in ctx
ok1 = 'PASS' if (not has_dentist and has_clinic) else 'FAIL'
print(f'[{ok1}] "ano ang address ng bacoor clinic"')
print(f'       dentist block={has_dentist} (want False), clinic block={has_clinic} (want True)')

# Test 1b: English address query
ctx2 = build_db_context('what is the address of the bacoor clinic')
has_dentist2 = '=== OUR DENTISTS ===' in ctx2
has_clinic2  = 'CLINIC LOCATIONS' in ctx2
ok2 = 'PASS' if (not has_dentist2 and has_clinic2) else 'FAIL'
print(f'[{ok2}] "what is the address of the bacoor clinic"')
print(f'       dentist block={has_dentist2} (want False), clinic block={has_clinic2} (want True)')

# Test 1c: "dr." queries must STILL trigger dentist block
ctx3 = build_db_context('is dr. marvin available today?')
has_dentist3 = '=== OUR DENTISTS ===' in ctx3
ok3 = 'PASS' if has_dentist3 else 'FAIL'
print(f'[{ok3}] "is dr. marvin available today?"')
print(f'       dentist block={has_dentist3} (want True)')

# Test 1d: "dr " (no dot)
ctx4 = build_db_context('when is dr marvin available')
has_dentist4 = '=== OUR DENTISTS ===' in ctx4
ok4 = 'PASS' if has_dentist4 else 'FAIL'
print(f'[{ok4}] "when is dr marvin available"')
print(f'       dentist block={has_dentist4} (want True)')

print()
print("=" * 60)
print("FIX 2: 'ano pa' / more-slots phrases in booking flow")
print("=" * 60)

# Simulate the _more_options_phrases check from chatbot_service
_more_options_phrases = (
    'ano pa', 'ibang slot', 'ibang oras', 'ibang araw',
    'iba pang slot', 'iba pang oras', 'iba pang araw',
    'other slot', 'more slot', 'show more', 'see more',
    'other time', 'more time', 'more option', 'other option',
    'next slot', 'next time', 'different slot', 'different time',
)

test_cases = [
    ('ano pa ang mga available slots', True),    # should be more-options
    ('ibang slots po',                 True),    # should be more-options
    ('other slots please',             True),    # should be more-options
    ('show more times',                True),    # should be more-options
    ('ano ang address ng clinic',      False),   # should be a real question
    ('saan po kayo located',           False),   # should be a real question
    ('ano ang ibig sabihin ng',        False),   # real question, not more-options
]

for msg, expected_more_options in test_cases:
    low = msg.lower()
    is_more = any(p in low for p in _more_options_phrases)
    ok = 'PASS' if is_more == expected_more_options else 'FAIL'
    print(f'[{ok}] "{msg}"')
    print(f'       is_more_options={is_more} (want {expected_more_options})')
