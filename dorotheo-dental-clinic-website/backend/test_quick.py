import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.chatbot_service import DentalChatbotService

c = DentalChatbotService()

# Quick test with various question types
test_cases = [
    ("what are the services ur clinic has", "LAZY ENGLISH - Services"),
    ("whos available 2day", "LAZY ENGLISH - Dentists today"),
    ("ano ang mga serbisyo nyo", "PURE TAGALOG - Services"),
    ("sino available next week", "TAGLISH - Next week dentists"),
    ("do you have teeth cleaning", "PROPER ENGLISH - Specific service"),
    ("available ba si dr marvin", "PURE TAGALOG - Specific dentist"),
]

print("="  *80)
print("QUICK CHATBOT AI TEST - SAMPLE QUESTIONS")
print("=" * 80)

for i, (question, label) in enumerate(test_cases, 1):
    print(f"\nTEST {i}: {label}")
    print("=" * 80)
    print(f"Q: {question}")
    print("-" * 80)
    
    try:
        resp = c.get_response(question)
        response_text = resp['response']
        
        # Print first 400 chars
        print(response_text[:400])
        if len(response_text) > 400:
            print(f"... ({len(response_text)} total chars)")
        
    except Exception as e:
        print(f"ERROR: {str(e)[:200]}")

print("\n" + "=" * 80)
print("TEST COMPLETED")
print("=" * 80)
