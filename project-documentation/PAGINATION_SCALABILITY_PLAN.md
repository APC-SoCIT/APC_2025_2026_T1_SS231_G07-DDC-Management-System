# Pagination Scalability Improvement Plan

## System Context

| Layer | Technology | Host |
|-------|-----------|------|
| Backend | Django 4.x + Django REST Framework | Azure App Service |
| Frontend | Next.js 14 (App Router) | Vercel |
| Database | PostgreSQL | Supabase |

---

## Problem Statement

The patient list endpoint (`GET /api/users/patients/`) and several frontend pages have scalability defects that will cause performance degradation and incorrect behavior when the number of patients grows into the hundreds or thousands.

### Critical Issues Found

1. **Backend: Full-table iteration before pagination** — The `UserViewSet.patients()` action in `backend/api/views.py` (lines 625–700) iterates over the **entire** patient queryset with `for patient in patients:` to compute `is_active_patient` status, then applies pagination afterward. This forces Django ORM to load every patient row + prefetched appointments into memory on every single request, regardless of which page is requested.

2. **Frontend: Dashboard counts are wrong** — Both `frontend/app/staff/dashboard/page.tsx` (line 44) and `frontend/app/owner/dashboard/page.tsx` (line 44) call `api.getPatients(token)` without page/size args, receive only the first 20 patients, then use `patients.length` for `totalPatients` count instead of `paginatedData.count`. This means dashboards always show ≤20 total patients regardless of actual count.

3. **Frontend: Payment pages get only 20 patients** — All 4 payment pages (`staff/payments`, `owner/payments`, `staff/payments/history`, `owner/payments/history`) call `getPatients(token)` without pagination, meaning patient dropdown filters only show the first 20 patients.

4. **Frontend: Patient detail sub-pages fetch all patients to find one** — `staff/patients/[id]/treatments/page.tsx` (line 79), `staff/patients/[id]/notes/page.tsx` (line 63), and `owner/patients/[id]/notes/page.tsx` (line 63) all call `api.getPatients(token)` and then `.find()` a single patient by ID, instead of using the existing `api.getPatientById()` function.

5. **Dead code** — `getAllPatients` (line 379 of `frontend/lib/api.ts`) fetches with `page_size=10000` but is **never called and never exported**. It should be removed.

6. **Missing database index** — The `patients` queryset orders by `(date_joined, id)` but no composite index exists for `(user_type, date_joined, id)`. The current indexes are: `user_type_archived_idx (user_type, is_archived)`, `user_type_active_idx (user_type, is_active_patient)`, `user_created_at_idx (-created_at)`.

7. **Archived patients endpoint has no pagination** — `archived_patients` action (line 727) returns all archived patients without pagination.

8. **No tests exist** for patient listing or pagination behavior in either frontend or backend.

---

## Architecture Overview

### Current Data Flow (Patient List)

```
Frontend                         Backend                          Database
   |                                |                                |
   |-- GET /users/patients/         |                                |
   |   ?page=1&page_size=20 ------>|                                |
   |                                |-- SELECT * FROM user           |
   |                                |   WHERE user_type='patient'    |
   |                                |   ORDER BY date_joined, id --->|
   |                                |                                |
   |                                |<-- ALL patient rows -----------|
   |                                |                                |
   |                                |-- for patient in ALL patients: |
   |                                |     compute is_active_patient  |
   |                                |     (uses prefetched appts)    |
   |                                |                                |
   |                                |-- bulk_update changed patients |
   |                                |                                |
   |                                |-- NOW apply pagination         |
   |                                |   (slice page from memory)     |
   |                                |                                |
   |<-- { count, results[20] } ----|                                |
```

### Target Data Flow (After Fix)

```
Frontend                         Backend                          Database
   |                                |                                |
   |-- GET /users/patients/         |                                |
   |   ?page=1&page_size=20 ------>|                                |
   |                                |-- SELECT with Exists()         |
   |                                |   subquery for is_active,      |
   |                                |   LIMIT 20 OFFSET 0           |
   |                                |   ORDER BY date_joined, id --->|
   |                                |                                |
   |                                |<-- 20 patient rows ------------|
   |                                |                                |
   |<-- { count, results[20] } ----|                                |
   |                                |                                |
                                    
   Background Job (every 6 hours):
   |                                |-- UPDATE user SET               |
   |                                |   is_active_patient = EXISTS(   |
   |                                |   SELECT 1 FROM appointment     |
   |                                |   WHERE status='completed'      |
   |                                |   AND date >= NOW - 730 days)   |
   |                                |   WHERE user_type='patient' --->|
```

---

## Implementation Plan

### Phase 1: Backend — Fix Full-Table Iteration (Critical)

**Files to modify:**
- `backend/api/views.py` — `UserViewSet.patients()` method (lines 625–700)

**What to do:**

1. Remove the `for patient in patients:` loop that iterates over the entire queryset to update `is_active_patient`.

2. Move `is_active_patient` status computation to happen ONLY for the paginated page (not the full queryset). Use Django's `Exists()` subquery annotation so the database computes active status without loading all rows:

```python
from django.db.models import Exists, OuterRef

two_years_ago = timezone.now().date() - timedelta(days=730)

# Annotate each patient with computed active status directly in SQL
active_subquery = Appointment.objects.filter(
    patient=OuterRef('pk'),
    status='completed',
    date__gte=two_years_ago
)

patients = queryset.select_related(
    'assigned_clinic'
).prefetch_related(
    Prefetch(
        'appointments',
        queryset=Appointment.objects.filter(
            status='completed'
        ).select_related('service', 'dentist').order_by('-completed_at', '-date', '-time')[:1],
        to_attr='last_appointment_cache'
    )
).annotate(
    has_recent_appointment=Exists(active_subquery),
    last_completed_appointment=Max('appointments__completed_at')
)
```

3. Apply pagination FIRST, then do a small bulk update for only the page's patients whose `is_active_patient` differs from `has_recent_appointment`:

```python
# Apply pagination FIRST
paginator = PageNumberPagination()
paginator.page_size = int(request.query_params.get('page_size', 20))
page = paginator.paginate_queryset(patients, request)

if page is not None:
    # Update is_active_patient only for patients on this page where it differs
    patients_to_update = []
    for patient in page:
        new_status = patient.has_recent_appointment
        if patient.is_active_patient != new_status:
            patient.is_active_patient = new_status
            patients_to_update.append(patient)
    
    if patients_to_update:
        User.objects.bulk_update(patients_to_update, ['is_active_patient'])
    
    serializer = self.get_serializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)
```

4. Remove the old `for patient in patients:` loop and the old bulk update that operated on the full queryset.

**Validation criteria:**
- The endpoint returns identical JSON structure: `{ count, next, previous, results }`.
- `count` reflects the total number of patients (not just the page).
- Only the page's patients are loaded into Python memory.
- `is_active_patient` is correctly updated for patients that appear on the current page.

---

### Phase 2: Backend — Add Background Job for is_active_patient

**Files to create:**
- `backend/api/management/commands/update_patient_status.py`

**What to do:**

1. Create a Django management command that bulk-updates `is_active_patient` for ALL patients using a single SQL statement with `Exists()`:

```python
# backend/api/management/commands/update_patient_status.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.db.models import Exists, OuterRef
from api.models import User, Appointment

class Command(BaseCommand):
    help = 'Bulk-update is_active_patient for all patients based on 2-year appointment threshold'

    def handle(self, *args, **options):
        two_years_ago = timezone.now().date() - timedelta(days=730)
        
        active_subquery = Appointment.objects.filter(
            patient=OuterRef('pk'),
            status='completed',
            date__gte=two_years_ago
        )
        
        # Set active patients
        active_count = User.objects.filter(
            user_type='patient',
            is_active_patient=False
        ).filter(
            Exists(active_subquery)
        ).update(is_active_patient=True)
        
        # Set inactive patients
        inactive_count = User.objects.filter(
            user_type='patient',
            is_active_patient=True
        ).exclude(
            Exists(active_subquery)
        ).update(is_active_patient=False)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Updated {active_count} patients to active, '
                f'{inactive_count} patients to inactive'
            )
        )
```

2. Register this management command to run periodically. Since the backend is on Azure App Service, add a call in `backend/startup.sh` to run it on startup, and document that it should be scheduled as an Azure WebJob or cron job to run every 6 hours:

```bash
# In startup.sh, add after migrations:
python manage.py update_patient_status
```

**Files to modify:**
- `backend/startup.sh` — Add the management command call after migrations.

**Validation criteria:**
- Running `python manage.py update_patient_status` correctly updates all patient statuses in a single pass.
- No Python-level iteration over rows — the update happens entirely in SQL.
- The command is idempotent (safe to run multiple times).

---

### Phase 3: Backend — Add Missing Database Index

**What to do:**

1. Create a new Django migration that adds a composite index for the exact query pattern used by the `patients` endpoint:

```bash
# Run from the backend directory:
python manage.py makemigrations api --empty -n add_patient_pagination_indexes
```

2. Edit the generated migration to add the indexes:

```python
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('api', '<previous_migration>'),  # Replace with actual last migration name
    ]

    operations = [
        # Composite index for the patients list query:
        # WHERE user_type='patient' ORDER BY date_joined, id
        migrations.AddIndex(
            model_name='user',
            index=models.Index(
                fields=['user_type', 'date_joined', 'id'],
                name='user_type_joined_id_idx'
            ),
        ),
        # Composite index for clinic-filtered patient queries:
        # WHERE user_type='patient' AND assigned_clinic_id=X ORDER BY date_joined, id
        migrations.AddIndex(
            model_name='user',
            index=models.Index(
                fields=['user_type', 'assigned_clinic_id', 'date_joined'],
                name='user_type_clinic_joined_idx'
            ),
        ),
    ]
```

3. Also add these indexes to the `User` model's `Meta.indexes` list in `backend/api/models.py` so future `makemigrations` stays consistent:

```python
class Meta:
    indexes = [
        # ... existing indexes ...
        models.Index(fields=['user_type', 'date_joined', 'id'], name='user_type_joined_id_idx'),
        models.Index(fields=['user_type', 'assigned_clinic_id', 'date_joined'], name='user_type_clinic_joined_idx'),
    ]
```

4. Run the migration: `python manage.py migrate`

**Validation criteria:**
- `EXPLAIN ANALYZE` on the patient list query shows an index scan instead of a sequential scan.
- The migration applies cleanly on both local SQLite and production Supabase PostgreSQL.

---

### Phase 4: Backend — Add Patient Stats Endpoint

**Files to modify:**
- `backend/api/views.py` — Add a new `patient_stats` action on `UserViewSet`

**What to do:**

1. Add a lightweight endpoint that returns patient count stats without loading any patient data. This replaces the dashboard's need to fetch the patient list just for counts:

```python
@action(detail=False, methods=['get'])
def patient_stats(self, request):
    """Return patient count stats without loading patient data."""
    clinic_id = request.query_params.get('clinic')
    
    base_queryset = User.objects.filter(user_type='patient', is_archived=False)
    if clinic_id and request.user.user_type == 'owner':
        base_queryset = base_queryset.filter(assigned_clinic_id=clinic_id)
    
    total = base_queryset.count()
    active = base_queryset.filter(is_active_patient=True).count()
    
    return Response({
        'total_patients': total,
        'active_patients': active,
        'inactive_patients': total - active,
    })
```

2. Add the corresponding frontend API function in `frontend/lib/api.ts`:

```typescript
getPatientStats: async (token: string, clinicId?: number) => {
    const params = clinicId ? `?clinic=${clinicId}` : ''
    const response = await fetch(
        `${API_BASE_URL}/users/patient_stats/${params}`,
        { headers: { Authorization: `Token ${token}` } }
    )
    if (!response.ok) throw new Error('Failed to fetch patient stats')
    return response.json()
},
```

3. Export `getPatientStats` in the destructured exports at the bottom of `api.ts`.

**Validation criteria:**
- `GET /api/users/patient_stats/` returns `{ total_patients, active_patients, inactive_patients }`.
- The endpoint only executes COUNT queries, not SELECT with data.
- Optional `?clinic=ID` filter works for owner users.

---

### Phase 5: Backend — Paginate Archived Patients Endpoint

**Files to modify:**
- `backend/api/views.py` — `UserViewSet.archived_patients()` method (line 727)

**What to do:**

1. Add pagination to the `archived_patients` endpoint, which currently returns all archived patients without pagination:

```python
@action(detail=False, methods=['get'])
def archived_patients(self, request):
    """Get all archived patients with pagination."""
    archived = User.objects.filter(
        user_type='patient', is_archived=True
    ).select_related('assigned_clinic').order_by('date_joined', 'id')
    
    paginator = PageNumberPagination()
    paginator.page_size = int(request.query_params.get('page_size', 20))
    page = paginator.paginate_queryset(archived, request)
    
    if page is not None:
        serializer = self.get_serializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    serializer = self.get_serializer(archived, many=True)
    return Response(serializer.data)
```

**Validation criteria:**
- `GET /api/users/archived_patients/` returns `{ count, next, previous, results }` structure.
- Accepts `?page=N&page_size=M` parameters.

---

### Phase 6: Frontend — Fix Dashboard Patient Counts

**Files to modify:**
- `frontend/app/staff/dashboard/page.tsx` (line 44–50)
- `frontend/app/owner/dashboard/page.tsx` (line 44–50)

**What to do:**

1. Replace the `api.getPatients(token)` call with the new `api.getPatientStats(token, clinicId)` endpoint.

2. In `frontend/app/staff/dashboard/page.tsx`, change:

```typescript
// BEFORE (broken - only counts first 20):
const patientsResponse = await api.getPatients(token)
const patients = Array.isArray(patientsResponse) ? patientsResponse : (patientsResponse.results || [])
setTotalPatients(patients.length)
const active = patients.filter((p: any) => p.is_active_patient !== false).length
setActivePatients(active)

// AFTER (correct - uses count endpoint):
const clinicId = selectedClinic === "all" ? undefined : selectedClinic?.id
const stats = await api.getPatientStats(token, clinicId)
setTotalPatients(stats.total_patients)
setActivePatients(stats.active_patients)
```

3. Apply the identical change to `frontend/app/owner/dashboard/page.tsx`.

**Validation criteria:**
- Dashboard shows correct total and active patient counts even when there are >20 patients.
- No patient list data is fetched for the dashboard (only aggregate counts).
- Dashboard load time is faster due to lighter API call.

---

### Phase 7: Frontend — Fix Payment Pages Patient Dropdowns

**Files to modify:**
- `frontend/app/staff/payments/page.tsx`
- `frontend/app/owner/payments/page.tsx`
- `frontend/app/staff/payments/history/page.tsx`
- `frontend/app/owner/payments/history/page.tsx`

**What to do:**

1. These payment pages need a complete patient list for dropdown filters. Since loading thousands of patients at once is not scalable, implement a **search-as-you-type** approach:

   a. Add a new backend endpoint `patient_search` that returns lightweight patient records (id, name only) matching a search term, limited to 20 results:

   In `backend/api/views.py`, add to `UserViewSet`:
   ```python
   @action(detail=False, methods=['get'])
   def patient_search(self, request):
       """Lightweight patient search for dropdowns. Returns id and name only."""
       query = request.query_params.get('q', '').strip()
       if len(query) < 2:
           return Response([])
       
       patients = User.objects.filter(
           user_type='patient',
           is_archived=False
       ).filter(
           Q(first_name__icontains=query) |
           Q(last_name__icontains=query) |
           Q(email__icontains=query)
       ).values('id', 'first_name', 'last_name', 'email')[:20]
       
       return Response(list(patients))
   ```

   b. Add the corresponding frontend API function in `frontend/lib/api.ts`:
   ```typescript
   searchPatients: async (token: string, query: string) => {
       if (query.length < 2) return []
       const response = await fetch(
           `${API_BASE_URL}/users/patient_search/?q=${encodeURIComponent(query)}`,
           { headers: { Authorization: `Token ${token}` } }
       )
       if (!response.ok) throw new Error('Failed to search patients')
       return response.json()
   },
   ```

   c. Export `searchPatients` in the destructured exports at the bottom of `api.ts`.

2. Update each payment page to use the new search endpoint instead of loading all patients:

   a. Replace `getPatients(authToken)` call with an initial empty patient list.
   b. Add a search input that calls `api.searchPatients(token, query)` with debouncing (300ms).
   c. Display search results in the patient dropdown, with a "Type to search patients..." placeholder.
   d. When a patient is selected from search results, add them to a local state so they remain visible in the filter.

   The key pattern for each payment page is:
   ```typescript
   // Remove the getPatients call from initial data fetch
   // Add search state:
   const [patientSearchQuery, setPatientSearchQuery] = useState("")
   const [patientSearchResults, setPatientSearchResults] = useState<any[]>([])
   
   // Debounced search effect:
   useEffect(() => {
       const timer = setTimeout(async () => {
           if (patientSearchQuery.length >= 2 && token) {
               const results = await api.searchPatients(token, patientSearchQuery)
               setPatientSearchResults(results)
           } else {
               setPatientSearchResults([])
           }
       }, 300)
       return () => clearTimeout(timer)
   }, [patientSearchQuery, token])
   ```

**Validation criteria:**
- Payment pages no longer call `getPatients()` on initial load.
- Typing 2+ characters in the patient search shows matching results within 500ms.
- Selected patient filter correctly filters the invoice list.
- Works with 0, 1, 100, and 1000+ patients in the database.

---

### Phase 8: Frontend — Fix Patient Detail Sub-Pages

**Files to modify:**
- `frontend/app/staff/patients/[id]/treatments/page.tsx` (around line 76–88)
- `frontend/app/staff/patients/[id]/notes/page.tsx` (around line 63–75)
- `frontend/app/owner/patients/[id]/notes/page.tsx` (around line 63–75)

**What to do:**

1. Replace the `api.getPatients(token)` call that fetches the full patient list and uses `.find()` with a direct `api.getPatientById(patientId, token)` call.

2. In each file, change the `fetchPatientInfo` function from:

```typescript
// BEFORE (wasteful - fetches all patients to find one):
const fetchPatientInfo = async () => {
    if (!token) return
    try {
        const response = await api.getPatients(token)
        const patients = Array.isArray(response) ? response : (response.results || [])
        const patient = patients.find((p: any) => p.id === patientId)
        if (patient) {
            setPatientName(`${patient.first_name} ${patient.last_name}`)
        }
    } catch (error) {
        console.error("Error fetching patient info:", error)
    }
}
```

To:

```typescript
// AFTER (efficient - fetches single patient by ID):
const fetchPatientInfo = async () => {
    if (!token) return
    try {
        const patient = await api.getPatientById(patientId, token)
        if (patient) {
            setPatientName(`${patient.first_name} ${patient.last_name}`)
        }
    } catch (error) {
        console.error("Error fetching patient info:", error)
    }
}
```

**Validation criteria:**
- The patient name still displays correctly on treatments and notes pages.
- Only 1 API call is made to fetch the patient instead of fetching the entire list.
- Works for any patient ID, regardless of how many patients exist.

---

### Phase 9: Frontend — Remove Dead Code

**Files to modify:**
- `frontend/lib/api.ts` — Remove `getAllPatients` method (lines 379–388)

**What to do:**

1. Remove the `getAllPatients` method from the `api` object. It is never called, never exported, and encourages fetching all patients at once.

2. Verify that no file in the workspace references `getAllPatients` (it is currently dead code).

**Validation criteria:**
- The `getAllPatients` method no longer exists in `api.ts`.
- `grep -r "getAllPatients" frontend/` returns zero results.
- The TypeScript build succeeds without errors: `npx next build` or `npx tsc --noEmit`.

---

### Phase 10: Comprehensive Tests

#### 10A: Backend Tests

**File to create:** `backend/api/tests/test_patient_pagination.py`

```python
"""
Comprehensive tests for patient list pagination scalability.
Tests the /api/users/patients/ endpoint and related functionality.
"""
import pytest
from django.test import TestCase, override_settings
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from api.models import User, Appointment, Service, ClinicLocation


class PatientPaginationTestCase(TestCase):
    """Tests for patient list pagination behavior."""
    
    @classmethod
    def setUpTestData(cls):
        """Create test data once for all tests in this class."""
        # Create a clinic
        cls.clinic = ClinicLocation.objects.create(
            name='Test Clinic',
            address='123 Test St'
        )
        
        # Create staff user for authentication
        cls.staff_user = User.objects.create_user(
            username='teststaff',
            password='testpass123',
            email='staff@test.com',
            user_type='staff',
            role='receptionist'
        )
        
        # Create owner user
        cls.owner_user = User.objects.create_user(
            username='testowner',
            password='testpass123',
            email='owner@test.com',
            user_type='owner'
        )
        
        # Create a service for appointments
        cls.service = Service.objects.create(
            name='Cleaning',
            duration=30,
            price=100.00
        )
        
        # Create 50 patient users
        cls.patients = []
        for i in range(50):
            patient = User.objects.create_user(
                username=f'patient{i}',
                password='testpass123',
                email=f'patient{i}@test.com',
                user_type='patient',
                first_name=f'Patient',
                last_name=f'Number{i}',
                assigned_clinic=cls.clinic
            )
            cls.patients.append(patient)
        
        # Give first 25 patients a recent completed appointment (active)
        recent_date = timezone.now().date() - timedelta(days=30)
        for patient in cls.patients[:25]:
            Appointment.objects.create(
                patient=patient,
                dentist=cls.staff_user,
                service=cls.service,
                clinic=cls.clinic,
                date=recent_date,
                time='10:00',
                status='completed',
                completed_at=timezone.now() - timedelta(days=30)
            )
        
        # Give next 10 patients an old appointment (inactive - >2 years ago)
        old_date = timezone.now().date() - timedelta(days=800)
        for patient in cls.patients[25:35]:
            Appointment.objects.create(
                patient=patient,
                dentist=cls.staff_user,
                service=cls.service,
                clinic=cls.clinic,
                date=old_date,
                time='10:00',
                status='completed',
                completed_at=timezone.now() - timedelta(days=800)
            )
        
        # Remaining 15 patients have no appointments
    
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.staff_user)
    
    # --- Pagination Structure Tests ---
    
    def test_patients_returns_paginated_response(self):
        """Verify the response has the correct paginated structure."""
        response = self.client.get('/api/users/patients/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('count', data)
        self.assertIn('next', data)
        self.assertIn('previous', data)
        self.assertIn('results', data)
    
    def test_patients_count_reflects_total(self):
        """Verify count is the total number of patients, not just the page size."""
        response = self.client.get('/api/users/patients/')
        data = response.json()
        self.assertEqual(data['count'], 50)
    
    def test_patients_default_page_size(self):
        """Verify default page size is 20."""
        response = self.client.get('/api/users/patients/')
        data = response.json()
        self.assertEqual(len(data['results']), 20)
    
    def test_patients_custom_page_size(self):
        """Verify custom page_size parameter works."""
        response = self.client.get('/api/users/patients/?page_size=10')
        data = response.json()
        self.assertEqual(len(data['results']), 10)
        self.assertEqual(data['count'], 50)
    
    def test_patients_page_navigation(self):
        """Verify navigating through pages returns correct data."""
        # Page 1
        response1 = self.client.get('/api/users/patients/?page=1&page_size=20')
        data1 = response1.json()
        self.assertEqual(len(data1['results']), 20)
        self.assertIsNotNone(data1['next'])
        self.assertIsNone(data1['previous'])
        
        # Page 2
        response2 = self.client.get('/api/users/patients/?page=2&page_size=20')
        data2 = response2.json()
        self.assertEqual(len(data2['results']), 20)
        self.assertIsNotNone(data2['previous'])
        
        # Page 3 (last, 10 remaining)
        response3 = self.client.get('/api/users/patients/?page=3&page_size=20')
        data3 = response3.json()
        self.assertEqual(len(data3['results']), 10)
        self.assertIsNone(data3['next'])
        
        # Verify no duplicates across pages
        all_ids = (
            [p['id'] for p in data1['results']] +
            [p['id'] for p in data2['results']] +
            [p['id'] for p in data3['results']]
        )
        self.assertEqual(len(all_ids), len(set(all_ids)), "Duplicate patient IDs across pages")
        self.assertEqual(len(all_ids), 50)
    
    def test_patients_invalid_page_returns_404(self):
        """Verify requesting a page beyond the last returns 404."""
        response = self.client.get('/api/users/patients/?page=999&page_size=20')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    # --- is_active_patient Status Tests ---
    
    def test_active_patient_status_correct(self):
        """Verify patients with recent appointments are marked active."""
        response = self.client.get('/api/users/patients/?page_size=50')
        data = response.json()
        
        active_patients = [p for p in data['results'] if p['is_active_patient']]
        # 25 with recent appointments + 15 with no appointments (default active)
        self.assertGreaterEqual(len(active_patients), 25)
    
    def test_inactive_patient_status_correct(self):
        """Verify patients with only old appointments are marked inactive."""
        response = self.client.get('/api/users/patients/?page_size=50')
        data = response.json()
        
        # Find the patients with old-only appointments (indices 25-34)
        old_patient_ids = {p.id for p in self.patients[25:35]}
        old_patients_in_response = [
            p for p in data['results'] if p['id'] in old_patient_ids
        ]
        
        for patient in old_patients_in_response:
            self.assertFalse(
                patient['is_active_patient'],
                f"Patient {patient['id']} should be inactive (last appointment >2 years ago)"
            )
    
    # --- Clinic Filter Tests ---
    
    def test_patients_clinic_filter(self):
        """Verify clinic filter works for owner users."""
        self.client.force_authenticate(user=self.owner_user)
        
        response = self.client.get(f'/api/users/patients/?clinic={self.clinic.id}')
        data = response.json()
        self.assertEqual(data['count'], 50)  # All patients assigned to this clinic
    
    def test_patients_clinic_filter_empty(self):
        """Verify clinic filter returns empty for non-existent clinic."""
        self.client.force_authenticate(user=self.owner_user)
        
        response = self.client.get('/api/users/patients/?clinic=99999')
        data = response.json()
        self.assertEqual(data['count'], 0)
    
    # --- Patient Stats Endpoint Tests ---
    
    def test_patient_stats_returns_counts(self):
        """Verify patient_stats endpoint returns correct count structure."""
        response = self.client.get('/api/users/patient_stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('total_patients', data)
        self.assertIn('active_patients', data)
        self.assertIn('inactive_patients', data)
        self.assertEqual(
            data['total_patients'],
            data['active_patients'] + data['inactive_patients']
        )
    
    def test_patient_stats_total_count(self):
        """Verify total count is correct."""
        response = self.client.get('/api/users/patient_stats/')
        data = response.json()
        self.assertEqual(data['total_patients'], 50)
    
    # --- Patient Search Endpoint Tests ---
    
    def test_patient_search_returns_results(self):
        """Verify patient_search endpoint returns matching patients."""
        response = self.client.get('/api/users/patient_search/?q=Number1')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        # Check that results contain the expected fields
        for patient in data:
            self.assertIn('id', patient)
            self.assertIn('first_name', patient)
            self.assertIn('last_name', patient)
    
    def test_patient_search_short_query_returns_empty(self):
        """Verify search with <2 characters returns empty."""
        response = self.client.get('/api/users/patient_search/?q=a')
        data = response.json()
        self.assertEqual(data, [])
    
    def test_patient_search_no_query_returns_empty(self):
        """Verify search with no query returns empty."""
        response = self.client.get('/api/users/patient_search/')
        data = response.json()
        self.assertEqual(data, [])
    
    def test_patient_search_limited_to_20(self):
        """Verify search returns max 20 results."""
        response = self.client.get('/api/users/patient_search/?q=Patient')
        data = response.json()
        self.assertLessEqual(len(data), 20)
    
    # --- Archived Patients Pagination Tests ---
    
    def test_archived_patients_paginated(self):
        """Verify archived patients endpoint returns paginated response."""
        # Archive some patients
        for patient in self.patients[:5]:
            patient.is_archived = True
            patient.save(update_fields=['is_archived'])
        
        response = self.client.get('/api/users/archived_patients/')
        data = response.json()
        self.assertIn('count', data)
        self.assertIn('results', data)
        self.assertEqual(data['count'], 5)
    
    # --- Performance / Query Count Tests ---
    
    def test_patients_query_count_reasonable(self):
        """Verify the patients endpoint doesn't execute excessive queries."""
        from django.test.utils import override_settings
        from django.db import connection, reset_queries
        
        with override_settings(DEBUG=True):
            reset_queries()
            response = self.client.get('/api/users/patients/?page_size=20')
            query_count = len(connection.queries)
            
            # Should be well under 20 queries:
            # 1 for auth, 1 for count, 1 for patients, 1 for prefetch, ~1 for bulk_update
            self.assertLess(
                query_count, 15,
                f"Too many queries ({query_count}) for patient list endpoint. "
                f"Possible N+1 issue."
            )
    
    # --- Ordering Tests ---
    
    def test_patients_ordered_by_date_joined(self):
        """Verify patients are returned in date_joined, id order."""
        response = self.client.get('/api/users/patients/?page_size=50')
        data = response.json()
        
        ids = [p['id'] for p in data['results']]
        # Since all test patients were created sequentially, IDs should be ascending
        self.assertEqual(ids, sorted(ids))


class UpdatePatientStatusCommandTestCase(TestCase):
    """Tests for the update_patient_status management command."""
    
    @classmethod
    def setUpTestData(cls):
        cls.clinic = ClinicLocation.objects.create(name='Test Clinic', address='123 Test St')
        cls.staff = User.objects.create_user(
            username='staff', password='pass', email='s@t.com', user_type='staff', role='dentist'
        )
        cls.service = Service.objects.create(name='Filling', duration=30, price=150)
        
        # Patient with recent appointment
        cls.active_patient = User.objects.create_user(
            username='active_p', password='pass', email='ap@t.com',
            user_type='patient', is_active_patient=False  # Start wrong
        )
        Appointment.objects.create(
            patient=cls.active_patient, dentist=cls.staff, service=cls.service,
            clinic=cls.clinic, date=timezone.now().date() - timedelta(days=30),
            time='10:00', status='completed',
            completed_at=timezone.now() - timedelta(days=30)
        )
        
        # Patient with old appointment
        cls.inactive_patient = User.objects.create_user(
            username='inactive_p', password='pass', email='ip@t.com',
            user_type='patient', is_active_patient=True  # Start wrong
        )
        Appointment.objects.create(
            patient=cls.inactive_patient, dentist=cls.staff, service=cls.service,
            clinic=cls.clinic, date=timezone.now().date() - timedelta(days=800),
            time='10:00', status='completed',
            completed_at=timezone.now() - timedelta(days=800)
        )
        
        # Patient with no appointments
        cls.new_patient = User.objects.create_user(
            username='new_p', password='pass', email='np@t.com',
            user_type='patient', is_active_patient=True
        )
    
    def test_command_corrects_active_status(self):
        """Verify the command sets active patients correctly."""
        from django.core.management import call_command
        call_command('update_patient_status')
        
        self.active_patient.refresh_from_db()
        self.assertTrue(self.active_patient.is_active_patient)
    
    def test_command_corrects_inactive_status(self):
        """Verify the command sets inactive patients correctly."""
        from django.core.management import call_command
        call_command('update_patient_status')
        
        self.inactive_patient.refresh_from_db()
        self.assertFalse(self.inactive_patient.is_active_patient)
    
    def test_command_new_patient_becomes_inactive(self):
        """Verify patients with no appointments become inactive."""
        from django.core.management import call_command
        call_command('update_patient_status')
        
        self.new_patient.refresh_from_db()
        # No completed appointments means no recent appointment, so inactive
        self.assertFalse(self.new_patient.is_active_patient)
    
    def test_command_is_idempotent(self):
        """Verify running the command twice produces the same result."""
        from django.core.management import call_command
        call_command('update_patient_status')
        call_command('update_patient_status')
        
        self.active_patient.refresh_from_db()
        self.assertTrue(self.active_patient.is_active_patient)
        self.inactive_patient.refresh_from_db()
        self.assertFalse(self.inactive_patient.is_active_patient)
```

#### 10B: Frontend Tests

**File to create:** `frontend/__tests__/pagination/patient-pagination.test.tsx`

```typescript
/**
 * Tests for patient pagination behavior in frontend API calls.
 * Validates that the correct API parameters are sent and responses are handled properly.
 */

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock environment
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000/api'

import { api } from '@/lib/api'

describe('Patient Pagination API', () => {
    const mockToken = 'test-token-123'
    
    beforeEach(() => {
        mockFetch.mockClear()
    })
    
    describe('getPatients', () => {
        it('sends correct pagination params with defaults', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ count: 50, next: null, previous: null, results: [] })
            })
            
            await api.getPatients(mockToken)
            
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('page=1&page_size=20'),
                expect.objectContaining({
                    headers: { Authorization: 'Token test-token-123' }
                })
            )
        })
        
        it('sends custom page and pageSize', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ count: 50, next: null, previous: null, results: [] })
            })
            
            await api.getPatients(mockToken, 3, 10)
            
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('page=3&page_size=10'),
                expect.any(Object)
            )
        })
        
        it('returns paginated response structure', async () => {
            const mockResponse = {
                count: 50,
                next: 'http://localhost:8000/api/users/patients/?page=2',
                previous: null,
                results: [{ id: 1, first_name: 'Test', last_name: 'Patient' }]
            }
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            })
            
            const result = await api.getPatients(mockToken)
            
            expect(result).toHaveProperty('count', 50)
            expect(result).toHaveProperty('next')
            expect(result).toHaveProperty('previous')
            expect(result).toHaveProperty('results')
            expect(result.results).toHaveLength(1)
        })
        
        it('handles empty results gracefully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ count: 0, next: null, previous: null, results: [] })
            })
            
            const result = await api.getPatients(mockToken)
            
            expect(result.count).toBe(0)
            expect(result.results).toEqual([])
        })
        
        it('throws error on failed request', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            })
            
            await expect(api.getPatients(mockToken)).rejects.toThrow('Failed to fetch patients')
        })
    })
    
    describe('getPatientStats', () => {
        it('calls the patient_stats endpoint', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ total_patients: 100, active_patients: 80, inactive_patients: 20 })
            })
            
            await api.getPatientStats(mockToken)
            
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/users/patient_stats/'),
                expect.any(Object)
            )
        })
        
        it('passes clinic filter when provided', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ total_patients: 50, active_patients: 40, inactive_patients: 10 })
            })
            
            await api.getPatientStats(mockToken, 5)
            
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('clinic=5'),
                expect.any(Object)
            )
        })
        
        it('returns correct count structure', async () => {
            const mockStats = { total_patients: 100, active_patients: 80, inactive_patients: 20 }
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockStats
            })
            
            const result = await api.getPatientStats(mockToken)
            
            expect(result.total_patients).toBe(100)
            expect(result.active_patients).toBe(80)
            expect(result.inactive_patients).toBe(20)
        })
    })
    
    describe('searchPatients', () => {
        it('returns empty array for short queries', async () => {
            const result = await api.searchPatients(mockToken, 'a')
            expect(result).toEqual([])
            expect(mockFetch).not.toHaveBeenCalled()
        })
        
        it('calls patient_search endpoint for valid queries', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [{ id: 1, first_name: 'John', last_name: 'Doe', email: 'j@d.com' }]
            })
            
            await api.searchPatients(mockToken, 'John')
            
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/users/patient_search/?q=John'),
                expect.any(Object)
            )
        })
        
        it('returns lightweight patient objects', async () => {
            const mockResults = [
                { id: 1, first_name: 'John', last_name: 'Doe', email: 'j@d.com' },
                { id: 2, first_name: 'Jane', last_name: 'Doe', email: 'jane@d.com' }
            ]
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResults
            })
            
            const result = await api.searchPatients(mockToken, 'Doe')
            
            expect(result).toHaveLength(2)
            expect(result[0]).toHaveProperty('id')
            expect(result[0]).toHaveProperty('first_name')
        })
    })
    
    describe('getPatientById', () => {
        it('fetches a single patient by ID', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: 42, first_name: 'Test', last_name: 'Patient' })
            })
            
            const result = await api.getPatientById(42, mockToken)
            
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/users/42/'),
                expect.any(Object)
            )
            expect(result.id).toBe(42)
        })
    })
    
    describe('getAllPatients removal', () => {
        it('should not have getAllPatients as a function', () => {
            // After Phase 9, getAllPatients should be removed
            expect((api as any).getAllPatients).toBeUndefined()
        })
    })
})
```

**Validation criteria for all tests:**
- Backend tests: `python manage.py test api.tests.test_patient_pagination` passes with all green.
- Frontend tests: `npx jest __tests__/pagination/patient-pagination.test.tsx` passes all assertions.
- No regressions in existing functionality.

---

## Execution Order Summary

| Phase | Description | Risk | Dependencies |
|-------|------------|------|-------------|
| 1 | Fix backend full-table iteration | **Critical** | None |
| 2 | Add background management command | Medium | Phase 1 |
| 3 | Add database indexes | Low | None (can run in parallel with Phase 1) |
| 4 | Add patient_stats endpoint | Low | None |
| 5 | Paginate archived patients endpoint | Low | None |
| 6 | Fix dashboard counts | Medium | Phase 4 |
| 7 | Fix payment page patient dropdowns | Medium | Phase 7 adds patient_search |
| 8 | Fix patient detail sub-pages | Low | None |
| 9 | Remove dead code | Low | Phase 8 (verify no usage first) |
| 10 | Add comprehensive tests | Low | All previous phases |

---

## Rollback Plan

If any phase causes issues in production:

1. **Backend changes**: Revert the specific commit and redeploy to Azure. The management command is additive and can be safely removed.
2. **Migration changes**: Indexes are additive — removing them doesn't break data. Run `python manage.py migrate api <previous_migration>` to reverse.
3. **Frontend changes**: Revert the commit and Vercel will auto-redeploy.

---

## Monitoring After Deployment

1. Check Azure App Service logs for the patients endpoint response times.
2. Run `EXPLAIN ANALYZE` on Supabase SQL editor for the patients query to verify index usage.
3. Monitor Supabase dashboard for query performance metrics.
4. Verify dashboard patient counts match actual totals in the admin panel.
