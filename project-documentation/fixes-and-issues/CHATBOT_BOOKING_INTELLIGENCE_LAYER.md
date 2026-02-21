# Chatbot Booking Intelligence Layer — Implementation Prompt

> **Role:** Senior Backend AI Engineer  
> **Scope:** Improve and orchestrate the AI chatbot booking intelligence layer  
> **Approach:** Production-safe, non-hallucinating, RAG + Memory hybrid design

---

## System Context

The system is already production deployed and **STABLE**.

The system already has:

- Page Index RAG fully implemented
- Human-like receptionist conversation behavior
- Booking system fully implemented
- Business rules engine implemented
- Authentication implemented
- AI provider already integrated
- Database schema already exists
- Embedding + retrieval pipeline exists
- Logging system exists
- Booking APIs already exist
- Conversation pipeline already exists

---

## 🚨 PRIMARY MISSION

Improve and **ORCHESTRATE** the AI chatbot booking intelligence layer using:

- **PRODUCTION SAFE**
- **NON-HALLUCINATING**
- **RAG + MEMORY HYBRID DESIGN**

**DO NOT** rebuild anything.  
**DO NOT** refactor unrelated modules.  
**DO NOT** change architecture unless absolutely required.

You are extending intelligence **ONLY**.

---

## 🚨 HARD ARCHITECTURE RULES

You **MUST REUSE**:

- Existing RAG pipeline
- Existing booking services
- Existing AI service wrapper
- Existing embedding system
- Existing database models
- Existing authentication flow
- Existing logging
- Existing chatbot orchestration pipeline

You **MAY ONLY ADD** new modules IF missing.

---

## ❌ YOU ARE NOT ALLOWED TO

- Move logic to frontend
- Change authentication
- Break API contracts
- Replace RAG
- Replace chatbot pipeline
- Replace booking system
- Modify core database tables (optional support tables allowed)
- Let AI directly decide booking validity

---

## 🧠 TARGET ARCHITECTURE ADDITION

Implement:

**RAG + SHORT TERM MEMORY HYBRID DECISION LAYER**

This layer sits **BETWEEN**:

```
Intent Extraction → Booking Execution
```

---

## 🧠 MEMORY LAYER REQUIREMENT

If not existing, implement **Booking Session Memory**:

```python
booking_session_memory = {
    booking_draft: {
        location,
        dentist,
        date,
        time,
        service
    },
    confidence_scores: {
        location,
        dentist,
        date,
        time,
        service
    },
    conversation_flags: {
        asked_confirmation,
        pending_rule_warning,
        booking_locked
    },
    last_updated_timestamp
}
```

Memory must:

- Persist only during session OR short TTL cache
- Update every user message
- Never override backend truth

---

## 📘 RAG USAGE RULES (STRICT)

**RAG is ONLY allowed for:**

- Clinic recommendations
- Dentist availability info (knowledge)
- Service availability info (knowledge)
- Clinic info
- Policy explanation

**RAG is NEVER allowed for:**

- Booking validation
- Conflict detection
- Eligibility checking
- Rule enforcement

All rule checks **MUST** remain backend deterministic.

---

## 🧠 NEW FEATURE #1 — Booking Confidence + Confirmation Layer

Before auto booking when draft appears complete:

System must evaluate **confidence score**.

If ANY field confidence < threshold OR AI uncertain:  
→ **REQUIRE confirmation message**

Example:

> "Just to confirm, you want:  
> Service: Cleaning  
> Date: Tomorrow  
> Time: 3PM  
> Clinic: BGC  
> Dentist: Dr Smith  
> Is this correct?"

Only book **AFTER** explicit confirmation.

---

## 🧠 NEW FEATURE #2 — Human-Like Slot Filling

Instead of rigid field questions:

**MUST:**

- Ask conversationally
- Remember previously mentioned info
- Avoid repeating questions
- Support corrections naturally
- Maintain internal draft state

---

## 🧠 NEW FEATURE #3 — Smart Recommendation Priority

When recommending clinic/dentist:

**Priority Order:**

1. Patient history
2. Last booked clinic
3. Closest clinic
4. Highest availability clinic
5. RAG fallback recommendation

---

## 🧠 NEW FEATURE #4 — Failsafe Safety Net

If ANY of these fail:

- RAG retrieval fails
- Embedding timeout
- AI extraction uncertain
- Booking orchestration uncertain

System **MUST**:

→ Ask confirmation **OR**  
→ Fallback to safe chatbot mode

**NEVER AUTO BOOK** when uncertain.

---

## ⚡ PERFORMANCE REQUIREMENTS

Must include:

- Context size limits
- AI timeout guard
- RAG timeout fallback
- Booking decision logs
- Confirmation trigger logs
- Memory update logs

---

## 🔒 SECURITY REQUIREMENTS

Must ensure:

- AI calls server side only
- RAG retrieval server side only
- Auth validated before booking checks
- Prompt injection filtering on RAG context
- Context sanitization before AI calls

---

## 📈 OPTIONAL SAFE ENHANCEMENTS (IF EASY)

If trivial to add:

- Source citation in responses
- Recommendation explanation
- Tone matching (receptionist personality)
- Short-term conversational preference memory

---

## 🧪 IMPLEMENTATION ORDER

1. Inspect existing chatbot pipeline
2. Hook confidence decision layer
3. Implement booking session memory
4. Add confirmation before auto booking
5. Improve conversational slot filling logic
6. Connect RAG only when knowledge needed
7. Add failsafe + logging
8. Add timeout + safety guards

---

## ✅ DEFINITION OF DONE

Feature is complete when:

- Chatbot feels human receptionist-like
- Chatbot never auto books incorrectly
- Chatbot confirms when uncertain
- RAG only used for knowledge
- Booking rules remain deterministic backend
- No frontend changes required
- No architecture regression
- Production safe under load
