import os
import google.generativeai as genai

api_key = os.environ.get('GEMINI_API_KEY', 'AIzaSyBTjKbPjdxrr3GdzWt5g7QzQ9s_dzC8-Ak')
print(f"API Key: {api_key[:20]}...")

try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-pro")
    
    response = model.generate_content("Say hello")
    print("SUCCESS! Gemini API is working.")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {str(e)}")
