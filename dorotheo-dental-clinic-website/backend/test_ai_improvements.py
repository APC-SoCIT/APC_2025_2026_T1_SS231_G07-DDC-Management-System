import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.chatbot_service import DentalChatbotService

c = DentalChatbotService()

print("=" * 60)
print("TEST 1: Tagalog question about services")
print("=" * 60)
resp = c.get_response('ano yung mga service na meron kayo')
print(resp['response'])

print("\n" + "=" * 60)
print("TEST 2: English question about dentists")
print("=" * 60)
resp = c.get_response('who are the available dentists today')
print(resp['response'])

print("\n" + "=" * 60)
print("TEST 3: Taglish question")
print("=" * 60)
resp = c.get_response('sino yung mga dentist na available next week?')
print(resp['response'])

print("\n" + "=" * 60)
print("All tests completed!")
print("=" * 60)
