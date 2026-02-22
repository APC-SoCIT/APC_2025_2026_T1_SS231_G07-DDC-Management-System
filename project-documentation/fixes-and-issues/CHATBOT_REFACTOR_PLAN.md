# Chatbot Refactor & Cleanup Plan

## Overview
We are building a production-grade AI chatbot for a dental clinic.

**Current stack:**
- Backend: Django (Python)
- Database: Supabase (PostgreSQL)
- Platform: Web
- LLM: Gemini API
- RAG: Page Index RAG already implemented

---

## PROBLEM
When Gemini API quota is exceeded, chatbot quality degrades or fails.
We need a robust architecture with fallback support and deterministic booking logic.

**Additionally, we want to CLEAN the codebase by removing:**
- Unused functions
- Dead code
- Redundant API calls
- Unused imports
- Duplicate logic
- Obsolete RAG components
- Invalid fallback logic
- Commented-out legacy code
- Any unused models, serializers, services, or utilities related to the chatbot

The final output must be clean, modular, and production-ready.

---

## GOAL

Refactor the chatbot architecture to ensure:

1. No degradation when Gemini quota is exceeded
2. Appointment flows do NOT depend on LLM reasoning
3. Proper slot-filling booking system
4. Hybrid RAG retrieval
5. Semantic caching
6. Graceful fallback handling
7. Remove all unused and invalid code
8. Improve maintainability and scalability

---

## ARCHITECTURE REQUIREMENTS

### 1️⃣ LLM WRAPPER WITH FALLBACK

Create a centralized LLM service layer:

```python
class LLMService:
    def call_primary_llm(self, prompt):  # Gemini
        ...
    def call_fallback_llm(self, prompt):  # OpenAI or local model
        ...
    # automatic fallback on QuotaExceeded, Timeout, RateLimit
    # structured logging of failures
    # retry logic (max 2 retries)
```

**IMPORTANT:**
- No direct Gemini calls anywhere else in the codebase.
- All LLM calls must go through this wrapper.

**Example structure:**

```python
try:
    return gemini.generate(prompt)
except QuotaError:
    log_error()
    return fallback_llm.generate(prompt)
```

---

### 2️⃣ INTENT CLASSIFICATION LAYER (BEFORE RAG)

Implement an intent classifier BEFORE RAG.

**Possible intents:**
- schedule_appointment
- reschedule_appointment
- cancel_appointment
- clinic_information
- greeting
- fallback

**Implementation:**
- Rule-based detection first
- Optional lightweight LLM classification only if ambiguous

**NEVER call RAG before detecting intent.**

**Flow:**

User message → Intent classifier →
- If transactional intent → Deterministic engine
- Else → RAG pipeline

---

### 3️⃣ DETERMINISTIC APPOINTMENT ENGINE (CRITICAL)

Appointment booking must NOT depend on LLM reasoning.

Implement slot-filling logic with structured entity extraction.

User may provide:
- clinic location
- dentist
- date
- time
- service

In ANY ORDER.

**The system must:**

**Step 1:** Extract structured entities using:
- Regex
- Date parsing
- Supabase dentist/service tables
- Known clinic locations

**Step 2:** Store partial booking session in DB or Redis:

```python
booking_session = {
    'clinic_location': ...,
    'dentist': ...,
    'date': ...,
    'time': ...,
    'service': ...
}
```

**Step 3:** If missing fields: Ask ONLY for missing fields.

**Step 4:** Smart recommendation rules:

- If dentist missing AND date provided: Query Supabase for available dentists on that date. Suggest alternatives if none.
- If dentist provided BUT unavailable on chosen date: Suggest next available date or different dentist.
- If time missing: Query real-time available time slots.

**IMPORTANT:**
- All availability MUST come from Supabase queries.
- NO hallucinated availability.
- Wrap booking confirmation inside Django atomic transaction.
- Only confirm after DB validation.

---

### 4️⃣ RESCHEDULE FLOW
- Retrieve appointment
- Ask for new date/time
- Validate availability
- Update inside atomic transaction
- Confirm response

---

### 5️⃣ CANCEL FLOW
- Confirm appointment identity
- Mark as cancelled (soft delete preferred)
- Return confirmation

---

### 6️⃣ RAG PIPELINE IMPROVEMENT

For clinic information:

- Use hybrid retrieval: Vector search + PostgreSQL full-text search + Metadata filtering
- Chunk size: 300–500 tokens
- If Gemini unavailable: Use fallback LLM
- If ALL LLMs unavailable: Return safe message: "Our receptionist will assist you shortly."

**RAG prompt:**

> You are a dental clinic assistant. Answer ONLY using the provided context. If answer is not in context, say: 'I will connect you with our receptionist.' Be concise and professional.

---

### 7️⃣ SEMANTIC CACHE

- Implement Redis or in-memory cache.
- Cache key: hash(embedding(user_question))
- If similar question exists: Return cached answer without LLM call.
- Cache high-frequency FAQs: Opening hours, Insurance, Services, Locations, Emergency policies

---

### 8️⃣ GRACEFUL DEGRADATION

If:
- Gemini quota exceeded
- Fallback LLM fails
- RAG fails

System must:
- Continue appointment flows normally
- Return safe fallback message for info queries
- Never crash
- Always return structured JSON response

---

### 9️⃣ DJANGO STRUCTURE

Refactor chatbot into:

```
apps/
    chatbot/
        services/
            llm_service.py
            intent_service.py
            rag_service.py
            booking_service.py
        flows/
            schedule_flow.py
            reschedule_flow.py
            cancel_flow.py
        models.py
        views.py
```

**Ensure:**
- No business logic inside views
- No duplicated logic across flows
- No direct Gemini calls outside llm_service.py

---

### 🔟 CODEBASE CLEANUP REQUIREMENTS (VERY IMPORTANT)

Perform a full cleanup and refactor:

- Remove unused imports
- Remove unused functions
- Remove deprecated RAG logic
- Remove duplicate LLM calls
- Remove commented-out legacy code
- Remove unused models or serializers
- Remove unreachable code blocks
- Remove redundant database queries
- Consolidate duplicate utilities
- Ensure PEP8 compliance
- Ensure clear separation of concerns
- Add docstrings to all services

**After refactoring:**
- Provide a summary of removed components
- Provide a summary of architectural improvements

---

## SECURITY & RELIABILITY

- API timeout handling
- Retry logic (max 2)
- Structured error logging
- Supabase parameterized queries
- Django transaction.atomic() for booking
- Rate limiting support

---

## DELIVERABLES REQUIRED

1. Updated architecture diagram
2. Clean Django folder structure
3. LLM fallback wrapper implementation
4. Intent classifier implementation
5. Deterministic booking engine
6. Supabase availability query examples
7. Error handling patterns
8. RAG improvements
9. Code cleanup summary
10. Final optimized prompts used

---

**The result must be:**
- Production-ready
- Fault-tolerant
- Modular
- Clean
- Scalable
- And resilient to Gemini quota failure.
