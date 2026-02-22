# AUTH_EXECUTION_PROMPTS.md — Step-by-Step Agent Prompts

Use these prompts sequentially. Each prompt implements one phase of `AUTH_IMPLEMENTATION_PLAN.md`. Feed them to your coding agent one at a time — **wait for each phase to complete and pass tests before moving to the next**.

---

## Prompt 1 of 5 — Django JWT Infrastructure (Phase 1)

```
Read AUTH_IMPLEMENTATION_PLAN.md, specifically "Phase 1 — Django Backend: JWT + HttpOnly Cookie Infrastructure" (Section 2).

Implement the following changes in the backend:

1. Add `djangorestframework-simplejwt>=5.3.1` to `backend/requirements.txt` and install it.

2. Update `backend/dental_clinic/settings.py`:
   - Add `'rest_framework_simplejwt'` and `'rest_framework_simplejwt.token_blacklist'` to INSTALLED_APPS (after `rest_framework.authtoken`).
   - Add `'rest_framework_simplejwt.authentication.JWTAuthentication'` as the FIRST item in REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES']. Keep the existing TokenAuthentication and SessionAuthentication entries.
   - Add the SIMPLE_JWT configuration block exactly as specified in Section 2.2.3 of the plan (15-min access, 7-day refresh, rotation + blacklist enabled, HS256, Bearer prefix).
   - Add the refresh cookie settings block exactly as specified in Section 2.2.4 (REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH, REFRESH_COOKIE_HTTPONLY, REFRESH_COOKIE_SAMESITE, REFRESH_COOKIE_SECURE, REFRESH_COOKIE_MAX_AGE, REFRESH_COOKIE_DOMAIN).

3. Run `python manage.py migrate` to create the token_blacklist tables.

After completing the changes, verify by running:
- `python manage.py check` (should report no issues)
- `python manage.py showmigrations rest_framework_simplejwt` (should show applied migrations)
- `python -c "from rest_framework_simplejwt.tokens import RefreshToken; print('JWT import OK')"` in the backend directory

Do NOT modify any views, URLs, or frontend files in this step.
```

---

## Prompt 2 of 5 — Django JWT Auth Endpoints (Phase 2)

```
Read AUTH_IMPLEMENTATION_PLAN.md, specifically "Phase 2 — Django Auth Endpoints: Cookie-Based Token Lifecycle" (Section 3).

Implement the following:

1. Create `backend/api/auth_views.py` with these components:
   - `set_refresh_cookie(response, refresh_token)` helper — sets the HttpOnly refresh cookie using all settings from `django.conf.settings` (REFRESH_COOKIE_NAME, PATH, HTTPONLY, SAMESITE, SECURE, MAX_AGE, DOMAIN).
   - `clear_refresh_cookie(response)` helper — clears the cookie with max_age=0 using the same path and domain.
   - `jwt_login(request)` view — POST, AllowAny, rate-limited 5/m. Authenticates with username or email (same logic as existing login view in views.py). Blocks archived staff (403), auto-unarchives patients. Generates JWT via RefreshToken.for_user(user). Returns JSON {access, user, legacy_token} where legacy_token is the DRF Token. Sets refresh cookie via helper. Does NOT return refresh token in JSON body. Includes all audit logging (create_audit_log calls matching the existing login view).
   - `jwt_register(request)` view — POST, AllowAny. Same validation as existing register view. Creates user, generates JWT, returns {access, user, legacy_token}, sets refresh cookie.
   - `jwt_token_refresh(request)` view — POST, AllowAny. Reads refresh token from request.COOKIES (not body). Validates, rotates, returns {access}. Sets new refresh cookie. Returns 401 if cookie missing/invalid/expired/blacklisted.
   - `jwt_logout(request)` view — POST. Reads refresh token from cookie, blacklists it. Also deletes DRF Token if exists. Clears cookie. Returns 200. Includes audit logging matching existing logout view. Handles missing cookie gracefully.
   - `jwt_verify(request)` view — GET, requires JWTAuthentication. Returns {user: serialized user data} if access token is valid.

2. Update `backend/api/urls.py` — add these URL patterns (keep ALL existing patterns unchanged):
   - path('auth/login/', jwt_login, name='jwt_login')
   - path('auth/register/', jwt_register, name='jwt_register')
   - path('auth/token/refresh/', jwt_token_refresh, name='jwt_token_refresh')
   - path('auth/logout/', jwt_logout, name='jwt_logout')
   - path('auth/verify/', jwt_verify, name='jwt_verify')
   Import the views from api.auth_views.

3. Apply @csrf_exempt to jwt_login, jwt_register, jwt_token_refresh, and jwt_logout since they use JWT auth (not session-based).

After implementing, create and run the backend tests. Create `backend/api/tests/test_jwt_auth.py` with all 20 unit tests from Section 6.1 of the plan:
- test_jwt_login_success (verify 200, access in body, refresh NOT in body, Set-Cookie present with HttpOnly + Path + SameSite flags)
- test_jwt_login_email
- test_jwt_login_invalid (401, no cookie)
- test_jwt_login_archived_staff (403)
- test_jwt_login_patient_unarchive
- test_jwt_login_rate_limit (6 rapid attempts → 429)
- test_jwt_register_success
- test_jwt_register_validation
- test_jwt_refresh_success
- test_jwt_refresh_no_cookie (401)
- test_jwt_refresh_expired
- test_jwt_refresh_blacklisted
- test_jwt_logout_success
- test_jwt_logout_no_cookie (200 graceful)
- test_jwt_verify_success
- test_jwt_verify_expired
- test_jwt_verify_no_token
- test_access_token_on_protected_endpoint (Bearer token on /api/profile/)
- test_legacy_token_still_works (DRF Token on /api/profile/)
- test_cookie_flags

Run: `python manage.py test api.tests.test_jwt_auth -v2`

All 20 tests must pass before this phase is complete. Fix any failures.
```

---

## Prompt 3 of 5 — Django Integration Tests (Phase 2 continued)

```
Read AUTH_IMPLEMENTATION_PLAN.md, specifically Section 6.2 "Backend Integration Tests".

Create `backend/api/tests/test_jwt_integration.py` with these integration tests:

1. `test_full_login_refresh_logout_cycle` — Login via /api/auth/login/, extract access token and refresh cookie, use access token on a protected endpoint (GET /api/profile/), call /api/auth/token/refresh/ with the refresh cookie, verify new access token works, call /api/auth/logout/ with the refresh cookie, verify refresh with the old cookie now fails (401).

2. `test_concurrent_refresh_safety` — Login, get refresh cookie, call /api/auth/token/refresh/ once (succeeds, get new cookie), call /api/auth/token/refresh/ again with the ORIGINAL cookie (should fail with 401 since it was blacklisted after rotation).

3. `test_cors_preflight_auth_endpoint` — Send an OPTIONS request to /api/auth/login/ with Origin header set to 'https://apc-2025-2026-t1-ss-231-g07-ddc-man-xi.vercel.app'. Verify response includes Access-Control-Allow-Origin matching the origin, Access-Control-Allow-Credentials: true, and appropriate Access-Control-Allow-Methods.

4. `test_cors_credentials_header` — POST to /api/auth/login/ with valid credentials and Origin header from Vercel. Verify Access-Control-Allow-Credentials: true in response.

5. `test_old_endpoints_still_work` — POST to /api/login/ (old endpoint) with valid credentials, verify it still returns {token, user} with DRF Token. Confirm backward compatibility is intact.

Run: `python manage.py test api.tests.test_jwt_integration -v2`

All 5 tests must pass. Then run the full backend test suite to ensure nothing is broken:
`python manage.py test api -v2`
```

---

## Prompt 4 of 5 — Next.js Frontend Auth Client & Context (Phases 3 + 4)

```
Read AUTH_IMPLEMENTATION_PLAN.md, specifically "Phase 3 — Next.js Frontend: Credential Transport & API Client" (Section 4) and "Phase 4 — Next.js Session Management: Middleware & Auth Context" (Section 5).

Implement all frontend changes:

1. Update `frontend/lib/api.ts`:
   - Add new JWT auth functions to the `api` object: jwtLogin, jwtRegister, jwtRefresh, jwtLogout, jwtVerify — exactly as described in Section 4.1.1. All auth endpoint calls must include `credentials: "include"`.
   - Create an `authenticatedFetch` wrapper function (Section 4.1.2) that: takes url, accessToken, options, onTokenRefreshed callback, onAuthFailure callback; injects `Authorization: Bearer ${accessToken}` header; on 401 response calls jwtRefresh(); on refresh success retries the original request with new token and calls onTokenRefreshed; on refresh failure calls onAuthFailure.
   - Create a module-level token store (let _accessToken, let _onRefresh, let _onAuthFail) that authenticatedFetch reads from, so existing API functions don't need signature changes. Add `setAuthInterceptor(token, onRefresh, onAuthFail)` and `clearAuthInterceptor()` functions.
   - Update ALL existing API functions that send `Authorization: Token ${token}` to instead use authenticatedFetch. The function signatures keep `token: string` for now but internally use `authenticatedFetch`. Change the header prefix from `Token` to `Bearer`.
   - Keep the old login/register/logout functions for backward compat but mark them with // @deprecated comments.
   - Export the new JWT functions.

2. Rewrite `frontend/lib/auth.tsx`:
   - Replace `token` state with in-memory `accessToken` state (never stored in localStorage).
   - The `login` function calls `api.jwtLogin()`, stores access token in state, sets `auth_status=${user_type}` cookie for middleware, stores user in localStorage (non-sensitive hydration data).
   - The `logout` function calls `api.jwtLogout()`, clears access token, clears auth_status cookie, removes user from localStorage, redirects to /login.
   - Add `useEffect` on mount that attempts silent refresh: reads stored user from localStorage, calls `api.jwtRefresh()`, if success sets access token + user state, if fail clears everything.
   - Add `refreshAccessToken()` function that calls jwtRefresh and updates state.
   - Call `setAuthInterceptor(accessToken, refreshCallback, logoutCallback)` whenever accessToken changes (via useEffect).
   - The context type keeps the field name `token` (maps to accessToken internally) to minimize breaking changes across 37 consumer files. Add `refreshAccessToken` to the context type.

3. Create `frontend/middleware.ts`:
   - Edge middleware that protects /patient/*, /staff/*, /owner/* routes.
   - Reads `auth_status` cookie from the request.
   - If no auth_status cookie on a protected route → redirect to /login.
   - If auth_status doesn't match the route prefix (e.g., auth_status=patient on /staff/*) → redirect to /{auth_status}/dashboard.
   - Public routes (/, /login, /register, /forgot-password, /reset-password, /services) always pass through.
   - Export a `config.matcher` that only runs on protected route prefixes.

4. Update `frontend/next.config.mjs`:
   - Add the `headers()` function returning security headers (X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin) as described in Section 4.2.

After implementing, verify there are no TypeScript compilation errors:
`cd frontend && npx tsc --noEmit`

Do NOT modify any backend files in this step.
```

---

## Prompt 5 of 5 — Frontend Tests & Full Validation (Phase 5)

```
Read AUTH_IMPLEMENTATION_PLAN.md, specifically "Phase 5 — Comprehensive Testing" Sections 6.3 and 6.4.

Create and run frontend tests:

1. Create `frontend/__tests__/auth/jwt-auth.test.ts` with these tests (use Jest + React Testing Library as the project already has them configured):
   - test_login_stores_access_token_in_memory: Render AuthProvider, call login, verify the context's `token` is set but localStorage does NOT contain "token".
   - test_login_sets_session_cookie: After login, verify document.cookie contains `auth_status=patient` (or appropriate user_type).
   - test_logout_clears_state: After logout, verify context token is null, auth_status cookie is cleared, localStorage has no "user" key.
   - test_silent_refresh_on_mount: Mock jwtRefresh to return {access: "new_token"}, set stored user in localStorage, render AuthProvider, verify jwtRefresh was called and context token is set.
   - test_401_triggers_refresh: Mock a fetch that returns 401 first, then 200 after refresh. Call an API function. Verify jwtRefresh was called and the request was retried.
   - test_refresh_failure_triggers_logout: Mock jwtRefresh to return null. Trigger a 401 on an API call. Verify the user is logged out.

   Mock `fetch` using jest.fn() and mock the api module functions as needed.

2. Create `frontend/__tests__/middleware.test.ts` with these tests:
   - test_unauthenticated_redirects_to_login: Import the middleware function, create a mock NextRequest for /patient/dashboard with no cookies, verify the response is a redirect to /login.
   - test_authenticated_allows_access: Mock NextRequest for /patient/dashboard with auth_status=patient cookie, verify NextResponse.next() is returned.
   - test_wrong_role_redirects: Mock NextRequest for /staff/dashboard with auth_status=patient cookie, verify redirect to /patient/dashboard.
   - test_public_routes_always_allowed: Mock NextRequest for /login with no cookies, verify NextResponse.next() is returned.

   Use @edge-runtime/jest or mock NextRequest/NextResponse manually.

3. Run all frontend tests:
   `cd frontend && npx jest --verbose`

4. Then run the full backend test suite one final time to confirm everything still works:
   `cd backend && python manage.py test api -v2`

All tests must pass. Fix any failures before declaring this phase complete.

After all tests pass, provide a summary of:
- Total backend tests added and passing
- Total frontend tests added and passing
- Any warnings or known limitations
- Confirmation that old auth endpoints still work (backward compatibility)
```

---

## Post-Implementation Checklist

After all 5 prompts are complete, verify these manually:

- [ ] `POST /api/auth/login/` returns `access` in JSON and `refresh_token` in `Set-Cookie`
- [ ] `POST /api/auth/token/refresh/` reads cookie and returns new `access`
- [ ] `POST /api/auth/logout/` clears the cookie
- [ ] `GET /api/auth/verify/` returns user data with valid Bearer token
- [ ] Old `POST /api/login/` still returns DRF `{token, user}` 
- [ ] Frontend login stores access token in memory only (check DevTools → Application → Local Storage has no "token" key)
- [ ] Frontend refresh cookie is visible in DevTools → Application → Cookies as `HttpOnly`
- [ ] Opening a new tab restores session (silent refresh works)
- [ ] Protected routes redirect to `/login` when not authenticated
- [ ] Wrong role gets redirected to correct dashboard
