# AUTH_IMPLEMENTATION_PLAN.md — Persistent Authentication with HttpOnly Cookies & JWT

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Phase 1 — Django Backend: JWT + HttpOnly Cookie Infrastructure](#2-phase-1--django-backend-jwt--httponly-cookie-infrastructure)
3. [Phase 2 — Django Auth Endpoints: Cookie-Based Token Lifecycle](#3-phase-2--django-auth-endpoints-cookie-based-token-lifecycle)
4. [Phase 3 — Next.js Frontend: Credential Transport & API Client](#4-phase-3--nextjs-frontend-credential-transport--api-client)
5. [Phase 4 — Next.js Session Management: Middleware & Auth Context](#5-phase-4--nextjs-session-management-middleware--auth-context)
6. [Phase 5 — Comprehensive Testing](#6-phase-5--comprehensive-testing)
7. [Migration & Rollback Strategy](#7-migration--rollback-strategy)
8. [Environment Variable Reference](#8-environment-variable-reference)

---

## 1. Architecture Overview

### Current State

| Layer | Implementation |
|---|---|
| Backend Auth | DRF `TokenAuthentication` — single non-expiring DB token per user |
| Token Storage | `localStorage` (keys: `"token"`, `"user"`) |
| Token Transport | `Authorization: Token <key>` header via `fetch()` |
| Token Refresh | None — tokens never expire |
| Route Protection | Client-side only via `AuthProvider` in `frontend/lib/auth.tsx` |
| CORS | Explicit origin whitelist with `CORS_ALLOW_CREDENTIALS = True` |

### Target State

| Layer | Implementation |
|---|---|
| Backend Auth | `djangorestframework-simplejwt` — short-lived access + long-lived refresh tokens |
| Access Token Storage | In-memory only (React state) — **never** in `localStorage` |
| Refresh Token Storage | `HttpOnly; Secure; SameSite=None; Path=/api/auth/` cookie |
| Access Token Transport | `Authorization: Bearer <jwt>` header via `fetch()` with `credentials: "include"` |
| Token Refresh | Silent refresh via `/api/auth/token/refresh/` reading the HttpOnly cookie |
| Route Protection | Next.js Edge Middleware (`middleware.ts`) + updated `AuthProvider` |
| CORS | Same whitelist, cookies require `SameSite=None; Secure` for cross-origin |

### Token Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  LOGIN FLOW                                                     │
│                                                                 │
│  Browser ──POST /api/auth/login/──▶ Django                      │
│           {username, password}       │                           │
│                                      ├─ Validates credentials   │
│                                      ├─ Generates access JWT    │
│                                      │   (15 min expiry)        │
│                                      ├─ Generates refresh JWT   │
│                                      │   (7 day expiry)         │
│                                      ▼                          │
│  Browser ◀── 200 JSON ──────────── Django                       │
│  {access: "<jwt>", user: {...}}      │                          │
│  + Set-Cookie: refresh_token=<jwt>;  │                          │
│    HttpOnly; Secure; SameSite=None;  │                          │
│    Path=/api/auth/; Max-Age=604800   │                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SILENT REFRESH FLOW (access token expired)                     │
│                                                                 │
│  Browser ──POST /api/auth/token/refresh/──▶ Django              │
│  Cookie: refresh_token=<jwt>                │                   │
│  (credentials: "include")                   │                   │
│                                             ├─ Reads cookie     │
│                                             ├─ Validates JWT    │
│                                             ├─ Rotates refresh  │
│                                             │   (blacklists old)│
│                                             ▼                   │
│  Browser ◀── 200 JSON ─────────────────── Django                │
│  {access: "<new_jwt>"}                      │                   │
│  + Set-Cookie: refresh_token=<new_jwt>      │                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  LOGOUT FLOW                                                    │
│                                                                 │
│  Browser ──POST /api/auth/logout/──▶ Django                     │
│  Cookie: refresh_token=<jwt>          │                         │
│                                       ├─ Blacklists refresh     │
│                                       ├─ Deletes DRF token (if  │
│                                       │   dual-auth period)     │
│                                       ▼                         │
│  Browser ◀── 200 ────────────────── Django                      │
│  + Set-Cookie: refresh_token="";      │                         │
│    Max-Age=0  (clears cookie)         │                         │
└─────────────────────────────────────────────────────────────────┘
```

### Security Properties

- **XSS-Resistant**: Refresh token is never accessible to JavaScript (`HttpOnly`).
- **CSRF-Resistant**: Refresh cookie is scoped to `Path=/api/auth/` (only sent to auth endpoints, not data endpoints). Additionally, each refresh request requires a valid refresh JWT in the cookie — an attacker cannot forge this.
- **Cross-Origin Safe**: `SameSite=None; Secure` allows the Vercel frontend to send cookies to the Azure backend over HTTPS.
- **Token Rotation**: Every refresh rotates the token and blacklists the old one, limiting replay attacks.

---

## 2. Phase 1 — Django Backend: JWT + HttpOnly Cookie Infrastructure

### 2.1 Install Dependencies

Add to `backend/requirements.txt`:

```
djangorestframework-simplejwt>=5.3.1
```

Run:

```bash
pip install djangorestframework-simplejwt>=5.3.1
```

### 2.2 Update `backend/dental_clinic/settings.py`

#### 2.2.1 Add to `INSTALLED_APPS`

Insert after `'rest_framework.authtoken'`:

```python
INSTALLED_APPS = [
    # ... existing apps ...
    'rest_framework',
    'rest_framework.authtoken',  # Keep for backward compatibility during migration
    'rest_framework_simplejwt',          # ← ADD
    'rest_framework_simplejwt.token_blacklist',  # ← ADD (for refresh rotation)
    'corsheaders',
    'api',
]
```

#### 2.2.2 Update `REST_FRAMEWORK` Authentication Classes

Replace the existing `REST_FRAMEWORK` block:

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',  # ← Primary
        'rest_framework.authentication.TokenAuthentication',  # ← Keep during migration
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}
```

> **Note**: `JWTAuthentication` is listed first so `Bearer` tokens are checked before `Token` headers. Both work simultaneously during the migration period. Once the frontend no longer sends `Token` headers, remove `TokenAuthentication`.

#### 2.2.3 Add `SIMPLE_JWT` Configuration

Add this new block after `REST_FRAMEWORK`:

```python
from datetime import timedelta

SIMPLE_JWT = {
    # Token lifetimes
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    
    # Rotation & blacklisting
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    # Algorithm
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    
    # Header config (Bearer prefix)
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    
    # Claims
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    
    # Token classes
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}
```

#### 2.2.4 Add Refresh Cookie Settings

Add this new block after `SIMPLE_JWT`:

```python
# --- HttpOnly Refresh Cookie Settings ---
REFRESH_COOKIE_NAME = 'refresh_token'
REFRESH_COOKIE_PATH = '/api/auth/'          # Only sent to auth endpoints
REFRESH_COOKIE_HTTPONLY = True               # Not accessible to JS
REFRESH_COOKIE_SAMESITE = 'None'            # Required for cross-origin (Vercel → Azure)
REFRESH_COOKIE_SECURE = not DEBUG           # True in production (HTTPS), False in dev
REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days (matches REFRESH_TOKEN_LIFETIME)
REFRESH_COOKIE_DOMAIN = os.environ.get('REFRESH_COOKIE_DOMAIN', None)  # None = auto
```

#### 2.2.5 Update Cookie Security for Cross-Origin

Modify the existing cookie settings section. The current code has:

```python
CSRF_COOKIE_SAMESITE = 'Lax'

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
```

This stays as-is. The refresh cookie settings above handle the new cookie independently.

#### 2.2.6 Ensure CORS Headers Expose Correctly

The existing CORS config already has `CORS_ALLOW_CREDENTIALS = True` — this is correct and must remain. No changes needed to existing CORS settings.

### 2.3 Run Migrations

The `token_blacklist` app requires database tables:

```bash
cd backend
python manage.py migrate
```

This creates the `token_blacklist_outstandingtoken` and `token_blacklist_blacklistedtoken` tables.

### 2.4 Environment Variables for Azure

Add to Azure App Service Configuration (or `.env`):

| Variable | Production Value | Purpose |
|---|---|---|
| `REFRESH_COOKIE_DOMAIN` | (leave unset or `None`) | Auto-detects; set only if you need a specific domain |

No additional env vars needed — the cookie settings derive from `DEBUG` and `SECRET_KEY` which already exist.

---

## 3. Phase 2 — Django Auth Endpoints: Cookie-Based Token Lifecycle

### 3.1 Create Auth Module

Create a new file: `backend/api/auth_views.py`

This file will contain four view functions:

#### 3.1.1 Helper: `set_refresh_cookie(response, refresh_token)`

A utility that sets the HttpOnly refresh cookie on a Django `Response` object:

```python
# Reads from settings: REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH,
# REFRESH_COOKIE_HTTPONLY, REFRESH_COOKIE_SAMESITE, REFRESH_COOKIE_SECURE,
# REFRESH_COOKIE_MAX_AGE, REFRESH_COOKIE_DOMAIN
```

It should call `response.set_cookie(...)` with all the secure flags.

#### 3.1.2 Helper: `clear_refresh_cookie(response)`

Clears the cookie by setting it with `max_age=0` and empty value, using the same `path` and `domain`.

#### 3.1.3 View: `jwt_login(request)` — `POST /api/auth/login/`

**Replaces** the current `login` view for JWT clients. Must:

1. Accept `{username, password}` in request body.
2. Support login by email (same logic as current `login` view — look up User by email if username auth fails).
3. Block archived staff (return 403).
4. Auto-unarchive patients on login.
5. Generate JWT tokens using `rest_framework_simplejwt.tokens.RefreshToken.for_user(user)`.
6. Return JSON: `{ "access": "<access_jwt>", "user": { ...serialized user... } }`.
7. Call `set_refresh_cookie(response, str(refresh))` to attach the refresh token as HttpOnly cookie.
8. **Do NOT return the refresh token in the JSON body.**
9. Also create/update the DRF `Token` for backward compatibility during migration: `Token.objects.get_or_create(user=user)`. Return it as `"legacy_token"` in the response.
10. Preserve all existing audit logging (`create_audit_log` calls).
11. Keep the `@ratelimit(key='ip', rate='5/m', block=True)` decorator.

#### 3.1.4 View: `jwt_register(request)` — `POST /api/auth/register/`

**Replaces** the current `register` view for JWT clients. Must:

1. Accept the same registration payload as current `register`.
2. Validate via `UserSerializer`.
3. Create user and set password.
4. Generate JWT tokens.
5. Return JSON: `{ "access": "<access_jwt>", "user": { ...serialized user... } }`.
6. Set refresh HttpOnly cookie.
7. Also create DRF `Token` as `"legacy_token"` for backward compat.

#### 3.1.5 View: `jwt_token_refresh(request)` — `POST /api/auth/token/refresh/`

Custom refresh view that reads the refresh token from the **cookie** (not request body). Must:

1. Read `request.COOKIES.get(settings.REFRESH_COOKIE_NAME)`.
2. If missing, return 401 `{"detail": "Refresh token not found"}`.
3. Use `RefreshToken(raw_token)` to validate.
4. If invalid/expired/blacklisted, clear the cookie and return 401.
5. Blacklist the old refresh token (automatic with `ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION`).
6. Generate new access + refresh tokens.
7. Return JSON: `{ "access": "<new_access_jwt>" }`.
8. Set new refresh token as HttpOnly cookie (rotation).

#### 3.1.6 View: `jwt_logout(request)` — `POST /api/auth/logout/`

Must:

1. Read the refresh token from the cookie.
2. If present, blacklist it using `RefreshToken(raw_token).blacklist()`.
3. Also delete the DRF `Token` if it exists (backward compat cleanup).
4. Clear the refresh cookie.
5. Return 200 `{"message": "Logged out successfully"}`.
6. Preserve existing audit logging.
7. Should not error if cookie is missing — just clear and return success.

#### 3.1.7 View: `jwt_verify(request)` — `GET /api/auth/verify/`

A lightweight endpoint for Next.js middleware to verify authentication server-side:

1. Requires `JWTAuthentication` — if the access token in `Authorization: Bearer <jwt>` is valid, DRF auto-authenticates `request.user`.
2. Return JSON: `{ "user": { ...serialized user... } }`.
3. If not authenticated, DRF returns 401 automatically.

### 3.2 Register New URL Patterns

Update `backend/api/urls.py` to add the new auth endpoints under `/api/auth/`:

```python
# New JWT auth endpoints (add to urlpatterns)
path('auth/login/', jwt_login, name='jwt_login'),
path('auth/register/', jwt_register, name='jwt_register'),
path('auth/token/refresh/', jwt_token_refresh, name='jwt_token_refresh'),
path('auth/logout/', jwt_logout, name='jwt_logout'),
path('auth/verify/', jwt_verify, name='jwt_verify'),
```

> **Critical**: The old `/api/login/`, `/api/register/`, `/api/logout/` endpoints MUST remain active during migration. They will be removed only after the frontend fully switches over.

### 3.3 CSRF Exemption

Since these cookie-based auth endpoints use JWT (not Django sessions), they should be CSRF-exempt. Apply `@csrf_exempt` to `jwt_login`, `jwt_register`, `jwt_token_refresh`, and `jwt_logout`. The refresh cookie's `SameSite=None` combined with JWT validation provides CSRF protection.

Alternatively, use `@api_view` with `@authentication_classes([])` and `@permission_classes([AllowAny])` for the public endpoints (login, register, refresh), which inherently skips CSRF for non-session auth.

---

## 4. Phase 3 — Next.js Frontend: Credential Transport & API Client

### 4.1 Update `frontend/lib/api.ts`

#### 4.1.1 Add `credentials: "include"` to Auth Endpoints

All `fetch()` calls to `/api/auth/*` endpoints must include `credentials: "include"` so the browser sends/receives cookies cross-origin.

**New auth functions to add** (alongside existing ones during migration):

```typescript
// New JWT-based auth functions
jwtLogin: async (username: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",  // ← Send/receive cookies
    body: JSON.stringify({ username, password }),
  })
  // ... error handling (same pattern as current login) ...
  return response.json()  // { access, user, legacy_token }
}

jwtRegister: async (data: any) => {
  const response = await fetch(`${API_BASE_URL}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  })
  // ... error handling ...
  return response.json()
}

jwtRefresh: async () => {
  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: "POST",
    credentials: "include",  // ← Sends refresh_token cookie
    headers: { "Content-Type": "application/json" },
  })
  if (!response.ok) return null
  return response.json()  // { access }
}

jwtLogout: async () => {
  const response = await fetch(`${API_BASE_URL}/auth/logout/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
  return response.json()
}

jwtVerify: async (accessToken: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/verify/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) return null
  return response.json()
}
```

#### 4.1.2 Create `authenticatedFetch` Wrapper

Create a new wrapper function that:

1. Accepts the same arguments as `fetch()` plus an `accessToken` parameter.
2. Injects `Authorization: Bearer ${accessToken}` header.
3. On 401 response, **attempts a silent refresh** by calling `jwtRefresh()`.
4. If refresh succeeds, retries the original request with the new access token.
5. If refresh fails, triggers logout (fires a custom event or calls a callback).
6. Returns the response.

```typescript
// Pseudocode structure
async function authenticatedFetch(
  url: string,
  accessToken: string,
  options?: RequestInit,
  onTokenRefreshed?: (newToken: string) => void,
  onAuthFailure?: () => void,
): Promise<Response> {
  // 1. Try request with current access token
  // 2. If 401, try refresh
  // 3. If refresh succeeds, retry with new token, notify via callback
  // 4. If refresh fails, call onAuthFailure
}
```

> **Important**: Every existing API function in `api.ts` that currently takes `token: string` and sends `Authorization: Token ${token}` must be updated to use `Bearer` prefix instead. During migration, the backend accepts both. The `authenticatedFetch` wrapper centralizes this.

#### 4.1.3 Migrate Existing API Functions

All ~80+ API functions in `api.ts` that accept `token: string` should be refactored to use `authenticatedFetch`. The signature change:

**Before:**
```typescript
getProfile: async (token: string) => {
  const response = await fetch(`${API_BASE_URL}/profile/`, {
    headers: { Authorization: `Token ${token}` },
  })
  ...
}
```

**After:**
```typescript
getProfile: async (token: string, onRefresh?: Function, onAuthFail?: Function) => {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/profile/`,
    token,
    {},
    onRefresh,
    onAuthFail,
  )
  ...
}
```

> **Strategy**: Rather than changing every function signature, create the `authenticatedFetch` wrapper and have the `AuthProvider` pass the access token + callbacks. A simpler approach is to store the access token + refresh callbacks in a module-level variable that `authenticatedFetch` reads.

### 4.2 Update `frontend/next.config.mjs`

Add security headers and ensure cookies work in the Vercel deployment:

```javascript
const nextConfig = {
  // ... existing config ...
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}
```

No proxy/rewrite is needed since we're using `SameSite=None` cookies directly to the Azure backend.

---

## 5. Phase 4 — Next.js Session Management: Middleware & Auth Context

### 5.1 Create `frontend/middleware.ts` — Edge Middleware for Route Protection

This file runs on Vercel's Edge Network **before** the page renders. It protects routes server-side.

**Logic:**

1. Define protected route prefixes: `/patient`, `/staff`, `/owner`.
2. Define public routes: `/`, `/login`, `/register`, `/forgot-password`, `/services`, etc.
3. For protected routes:
   a. Read the access token from... **Problem**: The access token is in-memory (React state), not in a cookie. Edge middleware can't read React state.
   
   **Solution**: Store a lightweight, non-sensitive **session indicator cookie** on the frontend. This cookie (`has_session=true`) is set by the `AuthProvider` after login. The middleware checks for this cookie. This is NOT a security gate — the real auth check happens when the page makes API calls. The middleware just prevents unnecessary client-side redirects and flash of content.

   Alternatively, **the middleware can call the `/api/auth/verify/` endpoint** if the refresh cookie is present. But the refresh cookie has `Path=/api/auth/` so it won't be sent to the Next.js middleware. 

   **Recommended approach**: Use a second non-HttpOnly cookie for the session indicator:
   
   ```
   Cookie: auth_status=1; Path=/; SameSite=Lax; Secure
   ```
   
   This cookie is set by JavaScript after login and cleared on logout. It contains no sensitive data. The middleware reads it to decide whether to redirect to `/login`.

4. For role-based protection:
   - `/patient/*` requires `user_type === "patient"`
   - `/staff/*` requires `user_type === "staff"` 
   - `/owner/*` requires `user_type === "owner"`
   
   Store `user_type` in the session indicator cookie: `auth_status=patient` or `auth_status=staff` or `auth_status=owner`.

5. If not authenticated (no `auth_status` cookie), redirect to `/login`.
6. If wrong role, redirect to the correct dashboard.

```typescript
// frontend/middleware.ts — pseudocode structure
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const authStatus = request.cookies.get('auth_status')?.value
  const path = request.nextUrl.pathname

  // Public routes — allow through
  if (isPublicRoute(path)) return NextResponse.next()

  // No auth — redirect to login
  if (!authStatus) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role-based routing
  if (path.startsWith('/patient') && authStatus !== 'patient') {
    return NextResponse.redirect(new URL(`/${authStatus}/dashboard`, request.url))
  }
  // ... same for /staff, /owner
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/patient/:path*', '/staff/:path*', '/owner/:path*'],
}
```

### 5.2 Update `frontend/lib/auth.tsx` — Auth Context Provider

Major rewrite of the `AuthProvider`. Changes:

#### 5.2.1 State Management

```typescript
// OLD: token from localStorage
const [token, setToken] = useState<string | null>(null)

// NEW: accessToken in memory (never persisted)
const [accessToken, setAccessToken] = useState<string | null>(null)
```

Remove all `localStorage.getItem("token")` / `localStorage.setItem("token")`.

#### 5.2.2 Login Function

```typescript
// OLD
const login = async (username: string, password: string) => {
  const response = await api.login(username, password)
  setToken(response.token)
  setUser(response.user)
  localStorage.setItem("token", response.token)
}

// NEW
const login = async (username: string, password: string) => {
  const response = await api.jwtLogin(username, password)
  setAccessToken(response.access)
  setUser(response.user)
  // Set session indicator cookie for middleware
  document.cookie = `auth_status=${response.user.user_type}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax${window.location.protocol === 'https:' ? '; secure' : ''}`
  // Optionally store user in localStorage for hydration (non-sensitive data)
  localStorage.setItem("user", JSON.stringify(response.user))
}
```

#### 5.2.3 Logout Function

```typescript
// NEW
const logout = async () => {
  await api.jwtLogout()  // Blacklists refresh token, clears HttpOnly cookie
  setAccessToken(null)
  setUser(null)
  // Clear session indicator cookie
  document.cookie = 'auth_status=; path=/; max-age=0'
  localStorage.removeItem("user")
  window.location.href = '/login'  // Full navigation to clear state
}
```

#### 5.2.4 Silent Refresh on Mount

```typescript
useEffect(() => {
  const initAuth = async () => {
    // Try to restore session via silent refresh
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      // Attempt silent refresh — the refresh_token cookie is sent automatically
      const refreshResult = await api.jwtRefresh()
      if (refreshResult?.access) {
        setAccessToken(refreshResult.access)
        setUserState(JSON.parse(storedUser))
        // Optionally re-fetch fresh user data from /api/auth/verify/
      } else {
        // Refresh failed — clear everything
        localStorage.removeItem("user")
        document.cookie = 'auth_status=; path=/; max-age=0'
      }
    }
    setIsLoading(false)
  }
  initAuth()
}, [])
```

#### 5.2.5 Access Token Refresh Callback

The `AuthProvider` should expose a `refreshAccessToken` function that `authenticatedFetch` can call:

```typescript
const refreshAccessToken = async (): Promise<string | null> => {
  const result = await api.jwtRefresh()
  if (result?.access) {
    setAccessToken(result.access)
    return result.access
  }
  // Refresh failed — session expired
  await logout()
  return null
}
```

#### 5.2.6 Updated Context Value

```typescript
interface AuthContextType {
  user: User | null
  accessToken: string | null         // renamed from 'token'
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>        // now async
  setUser: (user: User | null) => void
  isLoading: boolean
  refreshAccessToken: () => Promise<string | null>  // new
}
```

> **Breaking Change**: The context field `token` is renamed to `accessToken`. All 37+ consumer files that destructure `const { token } = useAuth()` must be updated to `const { accessToken } = useAuth()`. Alternatively, keep the name `token` to minimize changes, but it now holds a JWT access token, not a DRF token.

**Recommended**: Keep the field name `token` to minimize changes across 37 files. Just change the underlying value from DRF token to JWT access token.

### 5.3 Update Consumer Components

Every file that uses `const { token } = useAuth()` and passes it to an API function like `api.getProfile(token)` will continue to work IF:

1. The field name stays `token`.
2. The API functions send `Authorization: Bearer ${token}` instead of `Authorization: Token ${token}`.
3. The `authenticatedFetch` wrapper handles refresh transparently.

**Minimal changes needed in consumer files**: None, if the `token` name is preserved and `authenticatedFetch` is used inside the API functions.

### 5.4 Handle the `SessionTimeout` Component

The existing `<SessionTimeout />` component in `frontend/app/layout.tsx` should be updated to work with the JWT system:

- Instead of session cookie age, it should check when the last activity occurred.
- On timeout, call `logout()`.
- The 15-minute idle timeout can be maintained by tracking user activity events.

---

## 6. Phase 5 — Comprehensive Testing

### 6.1 Backend Unit Tests

Create `backend/api/tests/test_jwt_auth.py`:

#### Test Cases:

| # | Test Name | Description |
|---|---|---|
| 1 | `test_jwt_login_success` | POST `/api/auth/login/` with valid credentials → 200, response contains `access`, response has `Set-Cookie: refresh_token` with `HttpOnly`, `Secure` (in prod), `SameSite=None`, `Path=/api/auth/` |
| 2 | `test_jwt_login_email` | POST `/api/auth/login/` with email instead of username → 200 |
| 3 | `test_jwt_login_invalid` | POST `/api/auth/login/` with wrong password → 401, no `Set-Cookie` |
| 4 | `test_jwt_login_archived_staff` | Archived staff login → 403 |
| 5 | `test_jwt_login_patient_unarchive` | Archived patient login → 200, patient `is_archived` becomes `False` |
| 6 | `test_jwt_login_rate_limit` | 6 rapid login attempts → 429 on 6th |
| 7 | `test_jwt_register_success` | POST `/api/auth/register/` → 201, response contains `access`, `Set-Cookie: refresh_token` |
| 8 | `test_jwt_register_validation` | Invalid data → 400, no cookie set |
| 9 | `test_jwt_refresh_success` | POST `/api/auth/token/refresh/` with valid refresh cookie → 200, new `access` in JSON, new `refresh_token` cookie (rotation) |
| 10 | `test_jwt_refresh_no_cookie` | POST `/api/auth/token/refresh/` without cookie → 401 |
| 11 | `test_jwt_refresh_expired` | POST with expired refresh token → 401 |
| 12 | `test_jwt_refresh_blacklisted` | Use a refresh token that was already rotated → 401 |
| 13 | `test_jwt_logout_success` | POST `/api/auth/logout/` with refresh cookie → 200, cookie cleared, refresh token blacklisted |
| 14 | `test_jwt_logout_no_cookie` | POST `/api/auth/logout/` without cookie → 200 (graceful) |
| 15 | `test_jwt_verify_success` | GET `/api/auth/verify/` with valid `Bearer` token → 200, user data |
| 16 | `test_jwt_verify_expired` | GET `/api/auth/verify/` with expired token → 401 |
| 17 | `test_jwt_verify_no_token` | GET `/api/auth/verify/` with no auth header → 401 |
| 18 | `test_access_token_on_protected_endpoint` | Use JWT access token to call `/api/profile/` → 200 |
| 19 | `test_legacy_token_still_works` | Use DRF `Token` to call `/api/profile/` → 200 (backward compat) |
| 20 | `test_cookie_flags` | Verify `HttpOnly`, `SameSite=None`, `Secure`, `Path=/api/auth/` flags on the refresh cookie |

#### Test Implementation Approach:

Use Django's `TestCase` and DRF's `APIClient`:

```python
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from api.models import User

class JWTAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!',
            user_type='patient',
        )

    def test_jwt_login_success(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'TestPass123!',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertNotIn('refresh', response.data)  # Refresh must NOT be in body
        # Check cookie
        self.assertIn('refresh_token', response.cookies)
        cookie = response.cookies['refresh_token']
        self.assertTrue(cookie['httponly'])
        self.assertEqual(cookie['path'], '/api/auth/')
        self.assertEqual(cookie['samesite'], 'None')
```

### 6.2 Backend Integration Tests

Create `backend/api/tests/test_jwt_integration.py`:

| # | Test Name | Description |
|---|---|---|
| 1 | `test_full_login_refresh_logout_cycle` | Login → use access token → refresh → use new access token → logout → refresh fails |
| 2 | `test_concurrent_refresh_safety` | Simulate two near-simultaneous refresh requests → only one succeeds, other gets 401 |
| 3 | `test_cors_preflight_auth_endpoint` | OPTIONS request to `/api/auth/login/` from allowed origin → correct CORS headers |
| 4 | `test_cors_credentials_header` | Response includes `Access-Control-Allow-Credentials: true` |
| 5 | `test_old_endpoints_still_work` | `/api/login/` still works with DRF token auth |

### 6.3 Frontend Tests

Create `frontend/__tests__/auth/jwt-auth.test.ts`:

| # | Test Name | Description |
|---|---|---|
| 1 | `test_login_stores_access_token_in_memory` | After `jwtLogin`, access token is in state, NOT in localStorage |
| 2 | `test_login_sets_session_cookie` | After login, `document.cookie` contains `auth_status=<user_type>` |
| 3 | `test_logout_clears_state` | After logout, access token is null, session cookie is cleared |
| 4 | `test_silent_refresh_on_mount` | On mount with stored user, `jwtRefresh` is called |
| 5 | `test_401_triggers_refresh` | When API returns 401, `authenticatedFetch` calls `jwtRefresh` and retries |
| 6 | `test_refresh_failure_triggers_logout` | When refresh returns null, user is logged out |

### 6.4 Frontend Middleware Tests

Create `frontend/__tests__/middleware.test.ts`:

| # | Test Name | Description |
|---|---|---|
| 1 | `test_unauthenticated_redirects_to_login` | Request to `/patient/dashboard` without `auth_status` cookie → redirect to `/login` |
| 2 | `test_authenticated_allows_access` | Request with `auth_status=patient` to `/patient/dashboard` → allowed |
| 3 | `test_wrong_role_redirects` | Request with `auth_status=patient` to `/staff/dashboard` → redirect to `/patient/dashboard` |
| 4 | `test_public_routes_always_allowed` | Request to `/login`, `/`, `/services` → allowed regardless of cookie |

### 6.5 End-to-End Cross-Origin Test Checklist

Manual or Playwright/Cypress tests verifying the full cross-origin flow:

- [ ] Login from Vercel frontend → Azure backend sets `refresh_token` cookie with correct domain/flags
- [ ] Subsequent API calls include `Authorization: Bearer <jwt>` header
- [ ] After 15 minutes, access token expires → silent refresh succeeds → API call retries
- [ ] After 7 days, refresh token expires → user redirected to login
- [ ] Logout clears the HttpOnly cookie server-side
- [ ] Opening a new tab restores session via silent refresh (cookie still present)
- [ ] Closing all tabs and reopening restores session (cookie persists for 7 days)
- [ ] XSS simulation: `document.cookie` does NOT contain `refresh_token`
- [ ] CSRF simulation: POST to `/api/auth/token/refresh/` from unauthorized origin fails (CORS blocks it)

---

## 7. Migration & Rollback Strategy

### 7.1 Dual-Auth Migration Period

Both auth systems run simultaneously:

| Component | Old System | New System | Coexistence |
|---|---|---|---|
| Backend Auth Classes | `TokenAuthentication` | `JWTAuthentication` | Both in `DEFAULT_AUTHENTICATION_CLASSES` |
| Backend Login | `/api/login/` returns `{token}` | `/api/auth/login/` returns `{access}` + cookie | Both endpoints active |
| Frontend API Client | `Token ${token}` header | `Bearer ${accessToken}` header | New functions added, old preserved |
| Frontend Storage | `localStorage` | In-memory + HttpOnly cookie | New `AuthProvider` handles both |

### 7.2 Migration Steps

1. **Deploy backend** with Phase 1 + Phase 2 changes. Old endpoints still work.
2. **Deploy frontend** with Phase 3 + Phase 4 changes. Frontend uses new JWT endpoints.
3. **Monitor** for 1-2 weeks. Verify all auth flows work.
4. **Remove old endpoints**: Delete `/api/login/`, `/api/register/`, `/api/logout/` from `urls.py`.
5. **Remove `TokenAuthentication`** from `REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES']`.
6. **Remove `rest_framework.authtoken`** from `INSTALLED_APPS`.
7. **Remove `localStorage` token code** from frontend.

### 7.3 Rollback

If issues arise, revert the frontend to use old `/api/login/` + `localStorage`. The old endpoints remain active during the dual-auth period. No backend rollback needed since both systems coexist.

---

## 8. Environment Variable Reference

### Backend (Azure / `.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `SECRET_KEY` | Yes | (insecure dev key) | Used as JWT signing key |
| `DEBUG` | No | `False` | Controls `Secure` flag on cookies |
| `REFRESH_COOKIE_DOMAIN` | No | `None` (auto) | Override cookie domain if needed |
| `CORS_ALLOWED_ORIGINS` | No | (see settings) | Additional origins for CORS |
| `CSRF_TRUSTED_ORIGINS` | No | (see settings) | Additional trusted CSRF origins |

### Frontend (Vercel / `.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:8000/api` | Backend API base URL |

No new frontend env vars are needed for the JWT auth system.

---

## File Change Summary

| File | Action | Description |
|---|---|---|
| `backend/requirements.txt` | MODIFY | Add `djangorestframework-simplejwt>=5.3.1` |
| `backend/dental_clinic/settings.py` | MODIFY | Add `INSTALLED_APPS`, `SIMPLE_JWT` config, refresh cookie settings, update `REST_FRAMEWORK` |
| `backend/api/auth_views.py` | CREATE | New JWT auth views: login, register, refresh, logout, verify |
| `backend/api/urls.py` | MODIFY | Add `/api/auth/*` URL patterns |
| `backend/api/tests/test_jwt_auth.py` | CREATE | 20 unit tests for JWT auth |
| `backend/api/tests/test_jwt_integration.py` | CREATE | 5 integration tests |
| `frontend/lib/api.ts` | MODIFY | Add JWT functions, `authenticatedFetch` wrapper, update `Bearer` prefix |
| `frontend/lib/auth.tsx` | MODIFY | Rewrite to use JWT, in-memory token, silent refresh, session cookie |
| `frontend/middleware.ts` | CREATE | Edge middleware for route protection |
| `frontend/next.config.mjs` | MODIFY | Add security headers |
| `frontend/__tests__/auth/jwt-auth.test.ts` | CREATE | 6 frontend auth tests |
| `frontend/__tests__/middleware.test.ts` | CREATE | 4 middleware tests |
