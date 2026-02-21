"""Trace the chatbot pipeline step by step to diagnose empty responses."""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
sys.path.insert(0, '.')
django.setup()

from api.services import rag_service
from api.services import intent_service as isvc
from api import flows

q = 'what time is doc marvin available'

out = []
out.append(f"QUERY: {q}")
out.append("")

# Step 1: Intent
intent = isvc.classify_intent(q)
out.append(f"INTENT: {intent.intent} (conf={intent.confidence:.2f})")

# Step 2: DB context
ctx = rag_service.build_db_context(q)
out.append(f"DB_CTX length: {len(ctx)}")
out.append(f"DB_CTX has surrogates: {any(0xD800 <= ord(c) <= 0xDFFF for c in ctx)}")
out.append("DB_CTX content:")
out.append(ctx)
out.append("")

# Step 3: Direct answer
da = rag_service.get_direct_answer(q)
out.append(f"DIRECT_ANSWER: {repr(da)}")
out.append("")

# Step 4: Format fallback
try:
    fb = rag_service.format_context_fallback(ctx, False)
    out.append(f"FORMAT_FALLBACK length: {len(fb)}")
    out.append(f"FORMAT_FALLBACK has surrogates: {any(0xD800 <= ord(c) <= 0xDFFF for c in fb)}")
    out.append("FORMAT_FALLBACK content:")
    out.append(fb)
    out.append("")
except Exception as e:
    out.append(f"FORMAT_FALLBACK ERROR: {e}")
    out.append("")

# Step 5: build_reply
try:
    r = flows.build_reply(fb)
    out.append(f"BUILD_REPLY result: {repr(r)}")
except Exception as e:
    out.append(f"BUILD_REPLY ERROR: {e}")

result = '\n'.join(out)
with open('qa_trace_out.txt', 'w', encoding='utf-8') as f:
    f.write(result)
print("Written to qa_trace_out.txt")
print(f"INTENT: {intent.intent}")
print(f"DB_CTX length: {len(ctx)}")
if 'fb' in dir():
    print(f"FALLBACK length: {len(fb)}")
if 'r' in dir():
    print(f"REPLY text length: {len(r.get('text',''))}")
