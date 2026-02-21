DO NOT EXECUTE — this is just a prompt

We discovered a critical flaw in the chatbot system.

RAG logs show:
"No indexed page chunks found — skipping RAG"

This means:
- The RAG index is empty or not connected
- The chatbot is falling back to static templates
- QA falsely passes even when answers are wrong

We must FIX the architecture immediately.

The system must behave correctly in BOTH:

- Local Development → SQLite (db.sqlite3)
- Production → Supabase (Postgres + pgvector)

No silent degraded mode is allowed.

---------------------------------------------------
0️⃣ ENVIRONMENT DETECTION (MANDATORY)
---------------------------------------------------

Detect environment using ENV variable:

If ENV=local:
    Use SQLite (db.sqlite3)

If ENV=production:
    Use Supabase (Postgres + pgvector)

All validation logic must branch correctly.

---------------------------------------------------
1️⃣ RAG INDEX VALIDATION (MANDATORY)
---------------------------------------------------

Before serving traffic:

Add startup validation:
    system_validation.validate_environment()

---------------------------------------------------
FOR LOCAL (SQLite)
---------------------------------------------------

Validate:

- db.sqlite3 file exists
- Required tables exist:
    patients
    dentists
    services
    appointments
    embeddings
- embeddings table row count > 0
- dentists table not empty
- services table not empty

If any fail:
Raise RuntimeError:
"LOCAL DATABASE NOT INITIALIZED OR RAG EMPTY"

Log:
CRITICAL_RAG_EMPTY_LOCAL

Prevent chatbot from starting.

---------------------------------------------------
FOR PRODUCTION (Supabase)
---------------------------------------------------

Validate:

- Supabase connection successful
- pgvector extension enabled
- embeddings table exists
- embeddings row count > 0
- dentists table not empty
- services table not empty

If any fail:
Raise RuntimeError:
"PRODUCTION DATABASE OR VECTOR STORE NOT INITIALIZED"

Log:
CRITICAL_RAG_EMPTY_PRODUCTION

Prevent chatbot from starting.

---------------------------------------------------
RAG SERVICE VALIDATION
---------------------------------------------------

Implement:

rag_service.validate_index()

This function must:

- Count indexed chunks
- Verify embeddings table not empty
- Verify vector search operational

If embedding_count == 0:
System must NOT silently skip RAG.

Informational queries must return:
"I will connect you with our receptionist."

Never fallback to hardcoded text.

---------------------------------------------------
2️⃣ REMOVE STATIC FALLBACK TEMPLATES
---------------------------------------------------

Remove:
- Hardcoded service lists
- Hardcoded dentist lists
- Hardcoded availability responses

Delete any arrays like:
["Braces", "Cleaning", "Consultation", "pasta"]

ALL clinic data must come from:

LOCAL:
- Django ORM queries to SQLite

PRODUCTION:
- Supabase parameterized queries

If data missing:
Return safe message:
"I will connect you with our receptionist."

Never inject fake data.

---------------------------------------------------
3️⃣ STRICT INTENT ROUTING
---------------------------------------------------

Fix intent classifier so:

"Are you open on Sunday?"
→ clinic_hours_intent

NOT:
→ dentist_availability_intent

Implement:

- Regex-based classifier
- Language-aware (English + Tagalog + Taglish)
- Spell correction before intent detection

Add unit tests for:
- Sunday hours
- Weekend hours
- Availability questions
- Service questions
- Booking questions

---------------------------------------------------
4️⃣ OUT-OF-SCOPE FILTER
---------------------------------------------------

If question unrelated to clinic:

Examples:
- Weather
- Math
- Capital of France
- Programming help
- Jokes

Return:
"I'm here to assist with Dorotheo Dental Clinic services and appointments."

Never return dentist list for weather.

---------------------------------------------------
5️⃣ QA TEST IMPROVEMENT
---------------------------------------------------

QA must validate:

- Correct intent classification
- Response contains relevant keywords
- Response source (DB or RAG) logged
- rag_hit_count > 0 for clinic info queries
- No fabricated lists

Add:

assert rag_hit_count > 0 for informational queries

If rag_hit_count == 0:
Test FAIL.

If services returned but not from DB:
Test FAIL.

---------------------------------------------------
6️⃣ MULTILINGUAL SUPPORT FIX
---------------------------------------------------

Add:

- Lightweight language detection
- Proper routing for Tagalog
- Proper routing for Taglish
- Do not fallback to generic apology for greetings

---------------------------------------------------
7️⃣ FAIL LOUDLY, NOT SILENTLY
---------------------------------------------------

If:

- RAG empty (local or production)
- Gemini quota exceeded AND fallback unavailable
- DB missing required tables

System must log:

CRITICAL_SERVICE_DEGRADED

System must not silently return static template response.

---------------------------------------------------
8️⃣ REMOVE GLOBAL COOLDOWN BLOCK
---------------------------------------------------

Current behavior:
LLM entering 300s cooldown

Replace with:

Per-provider circuit breaker.

If Gemini quota exceeded:
Fallback to secondary model.
Do NOT disable booking flow.

Transactional flows must still work without LLM.

---------------------------------------------------
9️⃣ SQLITE SECURITY ENFORCEMENT (LOCAL)
---------------------------------------------------

In local mode:

- Use Django ORM only
- No raw SQL with string interpolation
- No cursor.execute(f"...{user_input}...")

All inputs must be:

- Type validated
- Sanitized
- Date validated
- Dentist existence validated
- Service existence validated

---------------------------------------------------
🔟 SUPABASE SECURITY ENFORCEMENT (PRODUCTION)
---------------------------------------------------

In production:

- Use parameterized Supabase queries
- Never interpolate user input
- Validate UUIDs
- Validate dates
- Validate status transitions

---------------------------------------------------
11️⃣ DELIVERABLES REQUIRED
---------------------------------------------------

1. Environment validation service
2. RAG validation service
3. SQLite table validation logic
4. Supabase vector validation logic
5. Removal of static fallback templates
6. Updated intent routing
7. Out-of-scope filter logic
8. Improved QA assertions
9. Circuit breaker implementation
10. Source attribution logging
11. Updated architecture diagram

System must not pass QA unless:

- RAG actually retrieves content
- SQLite or Supabase returns real DB data
- No fabricated responses
- No static fallback lists
- No silent RAG skipping
