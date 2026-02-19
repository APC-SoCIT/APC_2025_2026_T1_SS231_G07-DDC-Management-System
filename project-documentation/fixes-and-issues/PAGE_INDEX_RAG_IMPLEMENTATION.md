# Page Index RAG Implementation Guide

> **Status:** Implemented  
> **Date Created:** February 19, 2026  
> **Date Completed:** February 19, 2026  
> **Author:** AI Engineering Team  
> **Scope:** AI Chatbot Enhancement Only — No architecture changes

---

## Overview

Enhance the existing AI chatbot with **Page Index Retrieval Augmented Generation (RAG)** so that user queries are answered with grounded, context-aware responses sourced from indexed page content.

---

## Constraints

- The overall system architecture is **FIXED** and already working.
- Only the **AI chatbot portion** may be modified or extended.
- **Reuse** existing modules wherever possible.
- **Do not** refactor unrelated systems.
- **Do not** break existing chatbot behavior.
- **Keep** existing API contracts unless absolutely necessary.
- **Maintain** production stability at all times.

---

## Current System State (Assumed Existing)

| Layer       | Technology / Status                                      |
|-------------|----------------------------------------------------------|
| Frontend    | Next.js UI, already connected to chatbot backend         |
| Backend     | Django, chatbot exists and works, Gemini AI integrated   |
| Auth        | Supabase JWT verified in backend                         |
| Database    | Postgres (Supabase)                                      |
| Deployment  | Production environment already deployed                  |

---

## Goal

Before sending the user's message to the AI:

1. Search indexed page content
2. Retrieve relevant chunks
3. Inject chunks into the AI prompt
4. Generate a grounded AI answer

**If retrieval fails or returns nothing** → use existing chatbot behavior unchanged.

---

## Mandatory Design Rules

1. **DO NOT** rewrite the existing chatbot pipeline
2. **DO NOT** move AI logic to the frontend
3. **DO NOT** expose API keys
4. **DO NOT** change the authentication flow
5. **DO NOT** break existing API responses
6. RAG must act as an **OPTIONAL enhancement layer**

---

## Target Chat Flow

### Current Flow

```
User → Chat Endpoint → AI → Response
```

### New Flow

```
User → Chat Endpoint
              ↓
        Try RAG Retrieval
              ↓
 If context found → AI with context
 If no context   → Existing AI call (unchanged)
              ↓
           Response
```

---

## Module Reuse Rule (Critical)

Before creating anything new, check if the system already has:

| Functionality          | Action            |
|------------------------|-------------------|
| Embedding generator    | **USE IT**        |
| AI service wrapper     | **EXTEND IT**     |
| Database access layer  | **USE IT**        |
| Logging system         | **USE IT**        |

**Only create new modules if the functionality does not exist.**

---

## New Modules (Only If Needed)

If RAG-related functionality does not exist, create these minimal modules:

```
rag/
├── page_index_service.py       # Page chunk retrieval
├── vector_search_service.py    # Embedding similarity search
└── rag_context_builder.py      # Builds final context string
```

> If embeddings already exist elsewhere → **DO NOT duplicate.**

---

## Database Requirement

**Only add this table if it does not already exist:**

### `page_chunks` Table

| Column         | Type      | Description                    |
|----------------|-----------|--------------------------------|
| `id`           | PK        | Primary key                    |
| `page_id`      | String    | Identifier for the source page |
| `chunk_text`   | Text      | The text chunk content         |
| `embedding`    | Vector    | Embedding vector               |
| `page_title`   | String    | Title of the source page       |
| `section_title`| String    | Section within the page        |
| `source_url`   | URL       | URL of the source page         |
| `created_at`   | DateTime  | Timestamp of creation          |

> **DO NOT** modify existing tables.

---

## Indexing Requirement

Implement page indexing **only if the system does not already index content.**

Indexing must:

- Read existing page/content data
- Split content into chunks (**300–800 tokens**)
- Generate embeddings per chunk
- Store in `page_chunks` table

Must support **re-indexing** (update/replace existing chunks).

---

## Chatbot Integration Logic

Inside the existing chatbot flow, **before the AI call**:

```python
# Pseudo Logic
context = rag_service.get_context(user_message)

if context:
    # Inject context into AI prompt
    prompt = existing_prompt + context
else:
    # Continue existing AI call unchanged
    prompt = existing_prompt
```

---

## Prompt Injection Format

Append context to the prompt like this:

```
Additional Knowledge Context:
{retrieved_chunks}

Use this context if relevant to the user question.
```

> **DO NOT** remove existing system prompts. Only append.

---

## Retrieval Requirements

Must support:

| Parameter                | Default | Description                        |
|--------------------------|---------|------------------------------------|
| `top_k`                  | 5       | Number of top results to retrieve  |
| Similarity threshold     | Config  | Minimum similarity score           |
| Context token size limit | Config  | Max tokens injected into prompt    |

---

## Fallback Requirement (Critical)

If **any** of the following occur:

- Embedding generation fails
- Vector search fails
- No results found
- RAG service is unavailable

The system **MUST**:

- ✅ Continue using existing chatbot logic
- ✅ Produce no user-visible errors
- ✅ Log the failure internally for debugging

---

## Performance Requirements

Must include:

- **Embedding caching** (if possible)
- **Context size limiting** (prevent prompt overflow)
- **AI timeout protection**
- **Retrieval performance logging** (latency, hit/miss)

---

## Security Requirements

- Keep embeddings **server-side only**
- Keep AI calls **server-side only**
- **Verify auth** before RAG search
- **Sanitize** retrieved text before prompt injection

---

## API Response Rule

**Do NOT change existing response format.**

### Optional Addition

If easy and non-breaking, add an optional field to responses:

```json
{
  "sources": [
    { "page_title": "...", "url": "..." }
  ]
}
```

> Only if it does not break the frontend.

---

## Implementation Priority Order

| Step | Task                                          |
|------|-----------------------------------------------|
| 1    | Check if embedding + search already exists    |
| 2    | Add `page_chunks` storage if missing          |
| 3    | Implement retrieval service                   |
| 4    | Implement context builder                     |
| 5    | Inject into existing chatbot flow             |
| 6    | Add fallback safety                           |
| 7    | Add logging + limits                          |

---

## Definition of Done

Implementation is complete when:

- [x] Existing chatbot works unchanged when RAG is not triggered
- [x] RAG automatically improves answers when indexed data exists
- [x] No frontend changes required
- [x] No secrets exposed
- [x] No architecture refactor required
- [x] Production safe and stable

---

## Optional Improvements (Only If Easy)

- Source citations in responses
- Query rewriting before retrieval
- Background indexing queue
- Retrieval result caching

---

## File Locations Reference

| Item                    | Expected Path                                |
|-------------------------|----------------------------------------------|
| Backend root            | `dorotheo-dental-clinic-website/backend/`    |
| API module              | `dorotheo-dental-clinic-website/backend/api/`|
| RAG module              | `dorotheo-dental-clinic-website/backend/api/rag/` |
| Embedding service       | `dorotheo-dental-clinic-website/backend/api/rag/embedding_service.py` |
| Vector search service   | `dorotheo-dental-clinic-website/backend/api/rag/vector_search_service.py` |
| Context builder         | `dorotheo-dental-clinic-website/backend/api/rag/rag_context_builder.py` |
| Page index service      | `dorotheo-dental-clinic-website/backend/api/rag/page_index_service.py` |
| Indexing command         | `dorotheo-dental-clinic-website/backend/api/management/commands/index_pages.py` |
| PageChunk model         | `dorotheo-dental-clinic-website/backend/api/models.py` (appended) |
| Chatbot integration     | `dorotheo-dental-clinic-website/backend/api/chatbot_service.py` (_gemini_answer) |
| RAG settings            | `dorotheo-dental-clinic-website/backend/dental_clinic/settings.py` |
| Migration               | `dorotheo-dental-clinic-website/backend/api/migrations/0037_pagechunk.py` |
| Frontend root           | `dorotheo-dental-clinic-website/frontend/`   |
| This document           | `project-documentation/fixes-and-issues/PAGE_INDEX_RAG_IMPLEMENTATION.md` |

---

## Usage

### Index pages (must run before RAG works):
```bash
python manage.py index_pages --reindex
```

### Re-index a specific page:
```bash
python manage.py index_pages --page=services
```

### Dry-run (preview without saving):
```bash
python manage.py index_pages --dry-run
```

### Disable RAG (via environment variable):
```
RAG_ENABLED=False
```

---

*End of implementation guide.*
