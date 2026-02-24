# Copilot Instructions — Dorotheo Dental Clinic Management System

## Architecture Overview

Full-stack dental clinic management system: **Django 4.2 REST API** backend + **Next.js 15 (App Router)** frontend. Multi-clinic, role-based (patient/staff/owner) with AI chatbot.

- **Backend**: `dorotheo-dental-clinic-website/backend/` — single Django app `api/` under project `dental_clinic/`
- **Frontend**: `dorotheo-dental-clinic-website/frontend/` — Next.js with TypeScript, Tailwind v4, shadcn/ui
- **Docs**: `project-documentation/`

Production stack: Supabase PostgreSQL (pgvector), Azure Blob Storage (media), Azure App Service (backend), Vercel (frontend), Resend (email), Google Gemini (LLM + embeddings).

## Backend Patterns

### Models & Data
All models in `api/models.py` (~1100 lines). `User` extends `AbstractUser` with `user_type` (patient/staff/owner) and `role` (receptionist/dentist). Most models FK to `ClinicLocation` for multi-clinic filtering. Currency is PHP (Philippine Peso).

### API Structure
DRF `DefaultRouter` registers all ViewSets at `/api/`. Auth endpoints at `/api/auth/` (JWT with HttpOnly refresh cookies). All ViewSets live in `api/views.py` (~3700 lines). Serializers in `api/serializers.py`.

### Service Layer (`api/services/`)
Business logic is NOT in views — extracted into services:
- `booking_service.py` — deterministic appointment booking (NO LLM), regex entity extraction, `transaction.atomic()`
- `appointment_state_machine.py` — enforces valid status transitions (9 states)
- `llm_service.py` — ALL Gemini calls go through here; circuit breaker + auto-fallback
- `intent_service.py` — rule-based bilingual intent classification (English + Tagalog)
- `rag_service.py` — hybrid retrieval: pgvector search + DB context; never hardcode clinic data

### Chatbot Pipeline (`api/flows/`, `api/rag/`)
1. Security keyword filter → 2. Rule-based intent classification → 3. Transactional intents → `booking_service` (deterministic) → 4. Informational intents → RAG (pgvector) + DB context → Gemini formatting → 5. Fallback on LLM failure (no crash)

### Audit-First Design (HIPAA)
Every data access is logged — this is a core architectural constraint:
- **Signals** (`api/signals.py`) log CREATE/UPDATE/DELETE via `post_save`/`post_delete`
- **Decorators** (`api/decorators.py`) — `@log_patient_access`, `@log_export`, `@log_search` for READ operations
- **`AuditContextMixin`** on all ViewSets injects `_audit_actor`, `_audit_ip` before `save()`
- **`AuditMiddleware`** as safety net for uncaught GETs
- `AuditLog` model is append-only — never update or delete audit records

### Key Conventions
- Service files: `*_service.py`; flow files under `flows/`
- Loggers: `chatbot.*` prefix (e.g., `chatbot.booking`), `rag.*` for RAG modules
- `on_delete=PROTECT` for audit FKs, `SET_NULL` for most others
- Pagination: `PageNumberPagination`, `PAGE_SIZE=20`
- Rate limiting: `django-ratelimit` on login (`5/m`)

## Frontend Patterns

### Routing & Layouts
Role-based routing: `/staff/*`, `/owner/*`, `/patient/*`. Each role has its own layout with sidebar, header, notification bell. Root layout (server component) wraps `AuthProvider` → `SessionTimeout` → `ClinicProvider`.

### Authentication (`lib/auth.tsx`)
JWT with HttpOnly refresh cookie. Access token stored **in-memory only** (React state, never localStorage). `auth_status` cookie set for Edge Middleware to read. `authenticatedFetch()` in `api.ts` handles 401 → silent refresh → retry.

### API Client (`lib/api.ts`, ~1700 lines)
Single `api` object with ~80+ methods. Pattern: `methodName: async (params, token?) => fetch(...)`. Token passed explicitly to legacy methods; `authenticatedFetch()` for auto-injection. Base URL from `NEXT_PUBLIC_API_URL`.

### Multi-Clinic Context (`lib/clinic-context.tsx`)
`useClinic()` returns `selectedClinic` (a `ClinicLocation` object or `"all"`). Most data-fetching passes `clinicId` to API calls for filtering. Persisted in localStorage.

### Styling
- Tailwind v4 + CSS custom properties in `globals.css`
- Brand tokens: `--color-primary: #0f4c3a` (dark green), `--color-accent: #d4af37` (gold)
- Use `var(--color-*)` in Tailwind: `bg-[var(--color-primary)]`, `text-[var(--color-text-muted)]`
- `cn()` utility from `lib/utils.ts` = `twMerge(clsx(...))`
- shadcn/ui components in `components/ui/` (59 components, Radix primitives)
- Icons: `lucide-react`

### TypeScript Conventions
- `interface` for object shapes, `type` for unions/literals
- Path alias: `@/*` maps to `./*`
- Shared types in `lib/types.ts`; inline interfaces in page components for local data shapes

## Development Workflow

### Backend
```bash
cd dorotheo-dental-clinic-website/backend
python -m venv venv && venv\Scripts\activate  # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver  # http://localhost:8000
```

### Frontend
```bash
cd dorotheo-dental-clinic-website/frontend
pnpm install
pnpm dev  # http://localhost:3000
```
Env: `NEXT_PUBLIC_API_URL=http://localhost:8000/api`

### Testing
- **Frontend**: `pnpm test` (Jest 30 + Testing Library), tests in `__tests__/`
- **Backend**: standalone test scripts (`test_*.py`) in backend root — run with `python test_*.py`

### Key Environment Variables
Backend: `DATABASE_URL`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `AZURE_ACCOUNT_NAME/KEY/CONTAINER`, `FRONTEND_URL`, `SECRET_KEY`
Frontend: `NEXT_PUBLIC_API_URL`

## Common Pitfalls
- **Never skip audit logging** — all new ViewSets must use `AuditContextMixin`
- **Never call Gemini directly** — always go through `llm_service.py` (circuit breaker)
- **Never hardcode clinic data** in chatbot — always query DB via `rag_service.py`
- **Access token is in-memory** — don't put it in localStorage or cookies
- **Multi-clinic filtering** — most list endpoints accept optional `clinic` query param; always pass `clinicId` from `useClinic()`
- **Appointment status transitions** — use `appointment_state_machine.py`, don't set status directly
