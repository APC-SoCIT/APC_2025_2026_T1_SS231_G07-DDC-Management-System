import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.chatbot_service import DentalChatbotService
import traceback

c = DentalChatbotService()

# Test the Filipino dentist question
msg = 'Sino available ngayon na dentist'
print(f"Question: {msg}")
print("=" * 60)

try:
    # Build context
    context = c._build_context(msg)
    print(f"Context built: {len(context)} chars")
    print(f"Context includes services: {'DENTAL SERVICES' in context}")
    print(f"Context includes dentists: {'DENTISTS' in context}")
    print()
    
    # Build full prompt
    system = c._system_prompt()
    prompt = f"{system}\n\n"
    if context:
        prompt += "IMPORTANT - Use this real-time data from our database to answer:\n"
        prompt += f"{context}\n\n"
        prompt += "NOTE: Only use the information provided above. Do not make up services, dentists, or hours.\n\n"
    prompt += f"User: {msg}\n\nAssistant:"
    
    print("Calling Gemini API...")
    resp = c.model.generate_content(
        prompt,
        generation_config={"temperature": 0.2, "max_output_tokens": 600, "top_p": 0.9, "top_k": 40},
        safety_settings={
            'HARM_CATEGORY_HARASSMENT': 'BLOCK_NONE',
            'HARM_CATEGORY_HATE_SPEECH': 'BLOCK_NONE',
            'HARM_CATEGORY_SEXUALLY_EXPLICIT': 'BLOCK_NONE',
            'HARM_CATEGORY_DANGEROUS_CONTENT': 'BLOCK_NONE',
        },
    )
    
    print("SUCCESS!")
    print("Response:", resp.text[:300])
except Exception as e:
    print(f"ERROR: {type(e).__name__}")
    print(f"Message: {str(e)}")
    print()
    print("Full traceback:")
    traceback.print_exc()
