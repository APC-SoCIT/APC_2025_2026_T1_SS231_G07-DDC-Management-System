import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.chatbot_service import DentalChatbotService

# Test 1: Exact quick reply (should be hardcoded)
print("=" * 60)
print("TEST 1: Exact quick reply")
print("=" * 60)
c = DentalChatbotService()
resp = c.get_response('What dental services do you offer?')
print(resp['response'][:300])
print("\n")

# Test 2: Variation (should use Gemini AI)
print("=" * 60)
print("TEST 2: Variation - should use AI")
print("=" * 60)
try:
    import traceback
    print("Calling _gemini_answer...")
    resp = c._gemini_answer('what services do you have?', [])
    print("✅ AI RESPONSE:")
    print(resp['response'][:400])
except Exception as e:
    print("❌ ERROR in _gemini_answer:")
    print(f"{type(e).__name__}: {str(e)}")
    traceback.print_exc()
print("\n")

# Test 3: Smart dentist availability question - check actual Gemini call
print("=" * 60)
print("TEST 3: Is Dr. Marvin available next week? (Direct Gemini call)")
print("=" * 60)
try:
    # Build context
    context = c._build_context('is doctor marvin available next week?')
    print("CONTEXT BUILT:")
    print(context[:400], "...\n")
    
    # Try calling Gemini model directly
    system = c._system_prompt()
    prompt = f"{system}\n\n"
    if context:
        prompt += "IMPORTANT - Use this real-time data from our database to answer:\n"
        prompt += f"{context}\n\n"
    prompt += "User: is doctor marvin available next week?\n\nAssistant:"
    
    print("CALLING GEMINI...")
    resp = c.model.generate_content(
        prompt,
        generation_config={"temperature": 0.2, "max_output_tokens": 600},
    )
    print("✅ GEMINI SUCCESS:")
    print(resp.text[:400])
except Exception as e:
    print("❌ GEMINI ERROR:")
    print(f"{type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
