import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.chatbot_service import DentalChatbotService

c = DentalChatbotService()

# Test the fallback formatter directly
print("=" * 60)
print("TEST: Fallback Formatter (Tagalog)")
print("=" * 60)

raw_context = """=== AVAILABLE DENTAL SERVICES ===
• Braces (Category: all) - Aray qqq!!!
• Dental Implants (Category: oral_surgery) - An implant is a long-term solution
• Tooth Extraction (Category: oral_surgery) - This is the removal of a tooth
• Checkup (Category: preventive) - Routine checkup
• Cleaning (Category: preventive) - Professional dental cleaning

=== OUR DENTISTS ===

Availability for: today
• Dr. Dental Doctor - ✅ AVAILABLE
• Dr. Marvin Dorotheo - ✅ AVAILABLE
• Dr. George Ocampo - ✅ AVAILABLE

=== CLINIC LOCATIONS & HOURS ===

📍 Bacoor Branch
   Address: 123 Main St, Bacoor
   Phone: +63 2 8888 9012

⏰ Operating Hours:
   • Monday - Friday: 8:00 AM - 6:00 PM"""

formatted_tagalog = c._format_context_fallback(raw_context, is_tagalog=True)
print(formatted_tagalog)

print("\n" + "=" * 60)
print("TEST: Fallback Formatter (English)")
print("=" * 60)

formatted_english = c._format_context_fallback(raw_context, is_tagalog=False)
print(formatted_english)

print("\n" + "=" * 60)
print("Fallback formatter working!")
print("=" * 60)
