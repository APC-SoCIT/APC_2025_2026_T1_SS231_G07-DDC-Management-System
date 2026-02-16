import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.chatbot_service import DentalChatbotService

c = DentalChatbotService()

# Comprehensive test with various question types and languages
test_cases = [
    # LAZY TYPING / CASUAL ENGLISH
    ("what are the services ur clinic has", "LAZY ENGLISH - Services"),
    ("whos available 2day", "LAZY ENGLISH - Dentists today"),
    ("where r u located", "LAZY ENGLISH - Location"),
    ("can i book tmrw", "LAZY ENGLISH - Booking"),
    
    # PROPER ENGLISH
    ("What dental services do you offer?", "PROPER ENGLISH - Services (exact quick reply)"),
    ("Do you have teeth cleaning?", "PROPER ENGLISH - Specific service"),
    ("Is Dr. Marvin available next week?", "PROPER ENGLISH - Specific dentist"),
    ("What are your operating hours?", "PROPER ENGLISH - Hours"),
    ("Where is your clinic located?", "PROPER ENGLISH - Location"),
    
    # PURE TAGALOG
    ("ano ang mga serbisyo nyo", "PURE TAGALOG - Services"),
    ("sino ang available ngayon", "PURE TAGALOG - Available dentists"),
    ("saan kayo located", "PURE TAGALOG - Location"),
    ("bukas ba kayo bukas", "PURE TAGALOG - Tomorrow open"),
    ("anong oras kayo bukas", "PURE TAGALOG - Hours"),
    ("may cleaning ba kayo", "PURE TAGALOG - Cleaning service"),
    ("available ba si dr marvin", "PURE TAGALOG - Specific dentist"),
    
    # TAGLISH (MIXED)
    ("ano yung services nyo", "TAGLISH - Services"),
    ("sino available next week", "TAGLISH - Next week dentists"),
    ("saan yung clinic nyo", "TAGLISH - Location"),
    ("free ba si doc marvin bukas", "TAGLISH - Doctor tomorrow"),
    ("may braces ba kayo", "TAGLISH - Braces service"),
    ("available ba kayo saturday", "TAGLISH - Saturday hours"),
    
    # VARIATIONS & MISSPELLINGS
    ("servces", "TYPO - Services"),
    ("dentst", "TYPO - Dentist"),
    ("clinic hour", "SINGULAR - Hours"),
    ("wer is ur clnic", "MULTIPLE TYPOS - Location"),
    
    # SPECIFIC QUESTIONS
    ("is doctor george available next friday", "SPECIFIC - Dentist + Date"),
    ("do you do tooth extraction", "SPECIFIC - Service type"),
    ("available ba si dr carlo next monday", "SPECIFIC TAGLISH - Dentist + Date"),
    ("magkano cleaning", "TAGALOG - Price question"),
    ("how much for braces", "ENGLISH - Price question"),
]

print("=" * 100)
print("COMPREHENSIVE CHATBOT AI TEST - ALL QUESTION TYPES")
print("=" * 100)

for i, (question, label) in enumerate(test_cases, 1):
    print(f"\n{'='*100}")
    print(f"TEST {i}/{len(test_cases)}: {label}")
    print(f"{'='*100}")
    print(f"USER: '{question}'")
    print(f"SAGE:")
    print("-" * 100)
    
    try:
        resp = c.get_response(question)
        response_text = resp['response']
        
        # Check quality indicators
        has_emoji = any(char in response_text for char in ['🦷', '👨‍⚕️', '📍', '💙', '✅', '❌'])
        has_bold = '**' in response_text
        response_length = len(response_text)
        
        print(response_text[:500])
        if len(response_text) > 500:
            print(f"\n... (truncated, total {response_length} chars)")
        
        # Quality indicators
        print("\n" + "-" * 100)
        print(f"QUALITY: Emoji={has_emoji} | Bold={has_bold} | Length={response_length} chars")
        
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {str(e)[:200]}")

print("\n" + "=" * 100)
print("COMPREHENSIVE TEST COMPLETED")
print("=" * 100)
