import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.chatbot_service import DentalChatbotService

c = DentalChatbotService()

print("╔" + "═" * 78 + "╗")
print("║" + " " * 20 + "CHATBOT AI IMPROVEMENTS - FINAL TEST" + " " * 22 + "║")
print("╚" + "═" * 78 + "╝")

# Test 1: Tagalog service question (from your screenshot)
print("\n📱 USER: 'ano yung mga service na meron kayo'")
print("🤖 SAGE (AI):")
print("-" * 80)
resp = c.get_response('ano yung mga service na meron kayo')
print(resp['response'])

# Test 2: Tagalog dentist question (from your screenshot)
print("\n" + "=" * 80)
print("\n📱 USER: 'sino available na dentist ngayon'")
print("🤖 SAGE (AI):")
print("-" * 80)
resp = c.get_response('sino available na dentist ngayon')
print(resp['response'])

# Test 3: English question
print("\n" + "=" * 80)
print("\n📱 USER: 'do you have teeth cleaning services?'")
print("🤖 SAGE (AI):")
print("-" * 80)
resp = c.get_response('do you have teeth cleaning services?')
print(resp['response'])

# Test 4: Taglish mixed
print("\n" + "=" * 80)
print("\n📱 USER: 'available ba si dr marvin next friday?'")
print("🤖 SAGE (AI):")
print("-" * 80)
resp = c.get_response('available ba si dr marvin next friday?')
print(resp['response'])

print("\n" + "╔" + "═" * 78 + "╗")
print("║" + " " * 25 + "✅ ALL TESTS COMPLETED" + " " * 30 + "║")
print("╚" + "═" * 78 + "╝")
