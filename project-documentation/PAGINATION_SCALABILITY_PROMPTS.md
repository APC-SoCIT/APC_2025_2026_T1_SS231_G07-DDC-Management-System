# Pagination Scalability — Step-by-Step Agent Prompts

> **Instructions**: Give each prompt below to your coding agent one at a time, in order. Wait for each step to complete and verify before moving to the next. Each prompt is self-contained and references the plan file for detailed context.

---

## Prompt 1: Fix Backend Full-Table Iteration (Phase 1 — Critical)

```
Read the plan at project-documentation/PAGINATION_SCALABILITY_PLAN.md, specifically Phase 1.

Fix the `UserViewSet.patients()` method in `backend/api/views.py` (around lines 625–700). The current code iterates over the ENTIRE patient queryset with `for patient in patients:` to compute `is_active_patient`, then applies pagination afterward. This loads all patients into memory on every request.

Changes needed:
1. Add `from django.db.models import Exists, OuterRef` to the imports at the top of views.py (if not already present).
2. Add an `Exists()` subquery annotation called `has_recent_appointment` that checks if the patient has any completed appointment with `date >= (now - 730 days)`.
3. Move the `PageNumberPagination` call BEFORE the is_active_patient update loop.
4. Update `is_active_patient` only for patients on the current page (not the full queryset).
5. Keep the `select_related('assigned_clinic')`, `prefetch_related` for `last_appointment_cache`, and the `Max('appointments__completed_at')` annotation — those are still needed by the serializer.
6. Keep the response format identical: `{ count, next, previous, results }`.

After making changes, verify there are no Python syntax errors in the file.
```

---

## Prompt 2: Add Background Management Command (Phase 2)

```
Read the plan at project-documentation/PAGINATION_SCALABILITY_PLAN.md, specifically Phase 2.

Create a Django management command at `backend/api/management/commands/update_patient_status.py` (you'll need to create the `management/` and `commands/` directories with `__init__.py` files).

The command should:
1. Bulk-update `is_active_patient` for ALL patients using a single SQL `Exists()` subquery — no Python loops.
2. Set `is_active_patient=True` for patients that have at least one completed appointment within the last 730 days.
3. Set `is_active_patient=False` for patients that do NOT have any such appointment.
4. Print a summary of how many patients were updated.

Also update `backend/startup.sh` to run `python manage.py update_patient_status` after the existing migration step, so patient statuses are refreshed on each deployment.

Verify the command file has no syntax errors by checking imports.
```

---

## Prompt 3: Add Database Indexes (Phase 3)

```
Read the plan at project-documentation/PAGINATION_SCALABILITY_PLAN.md, specifically Phase 3.

1. First, find the latest migration file in `backend/api/migrations/` to determine the dependency name.

2. Create a new migration file `backend/api/migrations/XXXX_add_patient_pagination_indexes.py` (replace XXXX with the next sequential number) that adds two composite indexes:
   - `user_type_joined_id_idx` on fields `['user_type', 'date_joined', 'id']` — supports the patients list query ORDER BY.
   - `user_type_clinic_joined_idx` on fields `['user_type', 'assigned_clinic_id', 'date_joined']` — supports clinic-filtered patient queries.

3. Also add these same indexes to the `User` model's `Meta.indexes` list in `backend/api/models.py` (after the existing indexes) so the model stays in sync with migrations.

Make sure the migration has the correct `dependencies` pointing to the last existing migration.
```

---

## Prompt 4: Add Patient Stats Endpoint (Phase 4)

```
Read the plan at project-documentation/PAGINATION_SCALABILITY_PLAN.md, specifically Phase 4.

1. In `backend/api/views.py`, add a new `patient_stats` action to the `UserViewSet` class. Place it after the existing `patients` action. It should:
   - Accept GET requests only
   - Filter `User.objects.filter(user_type='patient', is_archived=False)`
   - Accept an optional `?clinic=ID` parameter (only applied for owner users)
   - Return `{ total_patients, active_patients, inactive_patients }` using only COUNT queries
   - NOT load any patient data

2. In `frontend/lib/api.ts`, add a `getPatientStats` method to the `api` object (place it after the `getPatientById` method around line 398). It should:
   - Accept `token: string` and optional `clinicId?: number`
   - Call `${API_BASE_URL}/users/patient_stats/` with the clinic param if provided
   - Return the JSON response

3. Export `getPatientStats` in the destructured exports at the bottom of `frontend/lib/api.ts` (around line 1277, after `getPatientById`).
```

---

## Prompt 5: Paginate Archived Patients Endpoint (Phase 5)

```
Read the plan at project-documentation/PAGINATION_SCALABILITY_PLAN.md, specifically Phase 5.

In `backend/api/views.py`, update the `archived_patients` action in `UserViewSet` (around line 727). Currently it returns all archived patients without pagination:

Current code returns: `Response(serializer.data)`

Change it to:
1. Add `select_related('assigned_clinic')` and `.order_by('date_joined', 'id')` to the queryset.
2. Create a `PageNumberPagination()` instance.
3. Read `page_size` from `request.query_params.get('page_size', 20)`.
4. Call `paginator.paginate_queryset()` and return `paginator.get_paginated_response()`.
5. Keep the fallback for unpaginated requests.

The response should change from a flat array to `{ count, next, previous, results }`.
```

---

## Prompt 6: Fix Dashboard Patient Counts (Phase 6)

```
Read the plan at project-documentation/PAGINATION_SCALABILITY_PLAN.md, specifically Phase 6.

Fix BOTH dashboard pages that incorrectly count patients:

1. `frontend/app/staff/dashboard/page.tsx` — In the `useEffect` `fetchData` function (around lines 44-50), replace:
   ```
   const patientsResponse = await api.getPatients(token)
   const patients = Array.isArray(patientsResponse) ? patientsResponse : (patientsResponse.results || [])
   setTotalPatients(patients.length)
   const active = patients.filter((p: any) => p.is_active_patient !== false).length
   setActivePatients(active)
   ```
   With a call to `api.getPatientStats(token, clinicId)` that uses the count from the stats endpoint. Note: `clinicId` should come from `selectedClinic` — use `selectedClinic === "all" ? undefined : selectedClinic?.id` (this variable/logic likely already exists nearby for the appointments fetch).

2. Apply the IDENTICAL fix to `frontend/app/owner/dashboard/page.tsx`.

Make sure `totalPatients` and `activePatients` state variables still exist and are set correctly.
```

---

## Prompt 7: Add Patient Search Endpoint & Fix Payment Pages (Phase 7)

```
Read the plan at project-documentation/PAGINATION_SCALABILITY_PLAN.md, specifically Phase 7.

This is a larger change with two parts:

**Part A — Backend search endpoint:**

1. In `backend/api/views.py`, add a `patient_search` action to `UserViewSet`. Place it after `patient_stats`. It should:
   - Accept GET requests
   - Read a `?q=` query parameter
   - Return empty array if query is less than 2 characters
   - Filter patients by first_name, last_name, or email (case-insensitive contains)
   - Return ONLY `id`, `first_name`, `last_name`, `email` fields using `.values()` — no serializer needed
   - Limit to 20 results with `[:20]`
   - Exclude archived patients

2. In `frontend/lib/api.ts`, add a `searchPatients` method to the `api` object:
   - Accept `token: string` and `query: string`
   - Return `[]` immediately if `query.length < 2` (don't make a fetch call)
   - Otherwise call `${API_BASE_URL}/users/patient_search/?q=${encodeURIComponent(query)}`
   - Return the JSON response (array of lightweight patient objects)

3. Export `searchPatients` in the destructured exports at the bottom of `api.ts`.

**Part B — Update payment pages:**

Update all 4 payment pages to use search instead of loading all patients:
- `frontend/app/staff/payments/page.tsx`
- `frontend/app/owner/payments/page.tsx`
- `frontend/app/staff/payments/history/page.tsx`
- `frontend/app/owner/payments/history/page.tsx`

For each page:
1. Remove the `getPatients(authToken)` call from the initial data fetch.
2. Add state for search: `patientSearchQuery`, `patientSearchResults`.
3. Add a `useEffect` with a 300ms debounce that calls `api.searchPatients(token, query)` when query >= 2 chars.
4. Replace the patient dropdown/filter list with the search results.
5. Keep the existing patient filter logic (selected patient ID) but populate options from search results instead of a pre-loaded full list.

Be careful to maintain existing functionality — the payment recording flow should still work. If a patient dropdown is used for non-filter purposes (e.g., "Record Payment" modal), those should still work with the search-based approach.
```

---

## Prompt 8: Fix Patient Detail Sub-Pages (Phase 8)

```
Read the plan at project-documentation/PAGINATION_SCALABILITY_PLAN.md, specifically Phase 8.

Fix 3 files that wastefully fetch the entire patient list just to find one patient's name:

1. `frontend/app/staff/patients/[id]/treatments/page.tsx` — Find the `fetchPatientInfo` function (around line 76). Replace the `api.getPatients(token)` call + `.find()` with a direct `api.getPatientById(patientId, token)` call. The function should:
   - Call `const patient = await api.getPatientById(patientId, token)`
   - Set `setPatientName(\`${patient.first_name} ${patient.last_name}\`)`
   - Keep the try/catch error handling

2. Apply the IDENTICAL change to `frontend/app/staff/patients/[id]/notes/page.tsx` (around line 63).

3. Apply the IDENTICAL change to `frontend/app/owner/patients/[id]/notes/page.tsx` (around line 63).

Verify that `api.getPatientById` is already defined in `frontend/lib/api.ts` (it should be — check around line 392).
```

---

## Prompt 9: Remove Dead Code (Phase 9)

```
Read the plan at project-documentation/PAGINATION_SCALABILITY_PLAN.md, specifically Phase 9.

1. In `frontend/lib/api.ts`, remove the `getAllPatients` method from the `api` object (around lines 379-388). It is dead code — never called or exported.

2. Verify by searching the entire frontend directory for "getAllPatients" — there should be zero references after removal.

3. Run `npx tsc --noEmit` from the `frontend/` directory to verify no TypeScript compilation errors.
```

---

## Prompt 10: Add Comprehensive Tests (Phase 10)

```
Read the plan at project-documentation/PAGINATION_SCALABILITY_PLAN.md, specifically Phase 10.

Create TWO test files:

**Backend tests:** Create `backend/api/tests/test_patient_pagination.py`
- First create the `backend/api/tests/` directory with an `__init__.py` file if it doesn't exist.
- Create `PatientPaginationTestCase` with tests for:
  - Paginated response structure (count, next, previous, results)
  - count reflects total patients not just page size
  - Default page size is 20
  - Custom page_size parameter
  - Page navigation (page 1, 2, 3 — correct counts, no duplicates)
  - Invalid page returns 404
  - is_active_patient status is correct for active and inactive patients
  - Clinic filter works
  - patient_stats endpoint returns correct counts
  - patient_search returns results, handles short queries, limits to 20
  - archived_patients returns paginated response
  - Query count is reasonable (<15 queries per request)
  - Ordering is correct
- Create `UpdatePatientStatusCommandTestCase` with tests for:
  - Command corrects active status
  - Command corrects inactive status
  - Command handles patients with no appointments
  - Command is idempotent

Use the test data setup pattern from the plan: 50 patients, first 25 with recent appointments, next 10 with old appointments, remaining 15 with none.

**Frontend tests:** Create `frontend/__tests__/pagination/patient-pagination.test.tsx`
- Mock `global.fetch`
- Test `api.getPatients` — default params, custom params, response structure, empty results, error handling
- Test `api.getPatientStats` — endpoint URL, clinic filter, response structure
- Test `api.searchPatients` — short query returns empty without fetch, valid query hits endpoint, returns lightweight objects
- Test `api.getPatientById` — fetches single patient by ID
- Test that `getAllPatients` no longer exists on the api object

After creating both test files, run:
- Backend: `cd backend && python manage.py test api.tests.test_patient_pagination --verbosity=2`
- Frontend: `cd frontend && npx jest __tests__/pagination/patient-pagination.test.tsx --verbose`

Report any test failures.
```

---

## Post-Implementation Verification Prompt

```
All pagination scalability improvements have been implemented. Please do a final verification:

1. Check for any TypeScript errors: `cd frontend && npx tsc --noEmit`
2. Check for Python syntax errors: `cd backend && python -c "import api.views; import api.models; print('OK')"`
3. Verify no references to `getAllPatients` remain: search the entire frontend for "getAllPatients"
4. Verify the management command exists: `ls backend/api/management/commands/update_patient_status.py`
5. Verify the migration file exists and has correct dependencies
6. Run backend tests: `cd backend && python manage.py test api.tests.test_patient_pagination --verbosity=2`
7. Run frontend tests: `cd frontend && npx jest __tests__/pagination/patient-pagination.test.tsx --verbose`

Report any issues found.
```
