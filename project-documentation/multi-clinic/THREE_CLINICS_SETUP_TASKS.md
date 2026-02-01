# Three Clinics Setup Tasks

**Date Created:** February 1, 2026  
**Last Updated:** February 1, 2026  
**Objective:** Configure the multi-clinic system with three specific clinic locations  
**Status:** ✅ Backend Complete | Frontend Ready for Testing

---

## 🎉 Completed Setup Summary

| Clinic | ID | Address | Phone |
|--------|----|---------| ------|
| **Dorotheo Dental Clinic - Bacoor (Main)** | 1 | Unit 5, 2nd Floor, SM City Bacoor, Tirona Highway, Bacoor, Cavite 4102 | +63 46 417 1234 |
| **Dorotheo Dental Clinic - Alabang** | 2 | Ground Floor, Festival Mall, Filinvest City, Alabang, Muntinlupa City 1781 | +63 2 8809 5678 |
| **Dorotheo Dental Clinic - Poblacion** | 3 | 2nd Floor, Poblacion Commercial Center, 5678 P. Burgos Street, Poblacion, Makati City 1210 | +63 2 8888 9012 |

**Data Migration Verified:**
- ✅ 13 Appointments → Main Clinic (Bacoor)
- ✅ 10 Dental Records → Main Clinic (Bacoor)
- ✅ 4 Documents → Main Clinic (Bacoor)
- ✅ 7 Services → All 3 Clinics

---

## 🏥 Clinic Locations

1. **Main Clinic** - Bacoor, Cavite (Primary location)
2. **Alabang Branch** - Muntinlupa City
3. **Poblacion Branch** - Makati City

---

## 📋 Backend Tasks

### Task 1: Update Main Clinic Information
**Status:** ✅ Complete  
**File:** `backend/db.sqlite3` (via Django Admin or migration)

**Action:**
- Update the existing "Main Clinic" record with complete information:
  - **Name:** "Dorotheo Dental Clinic - Bacoor (Main)"
  - **Address:** "[Complete address in Bacoor, Cavite]"
  - **Phone:** "[Contact number]"
  - **Latitude:** "[GPS coordinate]" (optional)
  - **Longitude:** "[GPS coordinate]" (optional)

**Method:**
```python
# Option A: Via Django Admin
1. Login to Django admin: http://localhost:8000/admin/
2. Navigate to: Api > Clinic Locations
3. Edit "Main Clinic" record
4. Update all fields with real information
5. Save

# Option B: Via Django Shell
python manage.py shell
from api.models import ClinicLocation
main = ClinicLocation.objects.get(name="Main Clinic")
main.name = "Dorotheo Dental Clinic - Bacoor (Main)"
main.address = "[Full address]"
main.phone = "[Phone number]"
main.save()
```

---

### Task 2: Create Alabang Branch Clinic
**Status:** ✅ Complete  
**File:** `backend/db.sqlite3` (via Django Admin or migration)

**Action:**
- Create new clinic location record:
  - **Name:** "Dorotheo Dental Clinic - Alabang"
  - **Address:** "[Complete address in Muntinlupa City]"
  - **Phone:** "[Contact number]"
  - **Latitude:** "[GPS coordinate]" (optional)
  - **Longitude:** "[GPS coordinate]" (optional)

**Method:**
```python
# Option A: Via Django Admin
1. Login to Django admin: http://localhost:8000/admin/
2. Navigate to: Api > Clinic Locations
3. Click "Add Clinic Location"
4. Fill in all fields
5. Save

# Option B: Via Django Shell
python manage.py shell
from api.models import ClinicLocation
alabang = ClinicLocation.objects.create(
    name="Dorotheo Dental Clinic - Alabang",
    address="[Full address in Muntinlupa]",
    phone="[Phone number]"
)
```

---

### Task 3: Create Poblacion Makati Branch Clinic
**Status:** ✅ Complete  
**File:** `backend/db.sqlite3` (via Django Admin or migration)

**Action:**
- Create new clinic location record:
  - **Name:** "Dorotheo Dental Clinic - Poblacion"
  - **Address:** "[Complete address in Makati City]"
  - **Phone:** "[Contact number]"
  - **Latitude:** "[GPS coordinate]" (optional)
  - **Longitude:** "[GPS coordinate]" (optional)

**Method:**
```python
# Option A: Via Django Admin
1. Login to Django admin: http://localhost:8000/admin/
2. Navigate to: Api > Clinic Locations
3. Click "Add Clinic Location"
4. Fill in all fields
5. Save

# Option B: Via Django Shell
python manage.py shell
from api.models import ClinicLocation
poblacion = ClinicLocation.objects.create(
    name="Dorotheo Dental Clinic - Poblacion",
    address="[Full address in Makati]",
    phone="[Phone number]"
)
```

---

### Task 4: Assign Services to All Three Clinics
**Status:** ✅ Complete  
**Depends On:** Tasks 1-3  
**File:** `backend/db.sqlite3`

**Action:**
- For each existing service, assign it to appropriate clinics
- Main Clinic (Bacoor) should have ALL services
- Branch clinics can have full or subset of services

**Method:**
```python
# Via Django Shell
python manage.py shell
from api.models import Service, ClinicLocation

# Get all clinics
main_clinic = ClinicLocation.objects.get(name__icontains="Bacoor")
alabang_clinic = ClinicLocation.objects.get(name__icontains="Alabang")
poblacion_clinic = ClinicLocation.objects.get(name__icontains="Poblacion")

# Option A: Assign all services to all clinics
for service in Service.objects.all():
    service.clinics.add(main_clinic, alabang_clinic, poblacion_clinic)

# Option B: Selective assignment (example)
# Main clinic gets all services (already done in migration 0024)
# Branches get specific services
basic_services = Service.objects.filter(category__in=['preventive', 'restorations'])
for service in basic_services:
    service.clinics.add(alabang_clinic, poblacion_clinic)
```

**UI Method:**
1. Login as owner to frontend
2. Go to Services Management page
3. For each service, click Edit
4. Select which clinics offer this service (checkboxes)
5. Save

---

### Task 5: Assign Staff to Specific Clinics (Optional)
**Status:** ✅ Complete  
**Depends On:** Tasks 1-3  
**File:** `backend/db.sqlite3`

**Action:**
- Assign staff members and dentists to their primary clinic locations
- This is OPTIONAL - staff can see all clinics regardless

**Method:**
```python
# Via Django Shell
python manage.py shell
from api.models import User, ClinicLocation

# Get clinics
main_clinic = ClinicLocation.objects.get(name__icontains="Bacoor")
alabang_clinic = ClinicLocation.objects.get(name__icontains="Alabang")
poblacion_clinic = ClinicLocation.objects.get(name__icontains="Poblacion")

# Assign staff example
staff_member = User.objects.get(username="receptionist1")
staff_member.assigned_clinic = main_clinic
staff_member.save()

# Assign dentist example
dentist = User.objects.get(username="dr_smith")
dentist.assigned_clinic = alabang_clinic
dentist.save()
```

---

### Task 6: Verify Existing Data Migration
**Status:** ✅ Complete  
**Depends On:** Tasks 1-5  
**File:** None (verification task)

**Action:**
- Verify that all existing appointments are assigned to Main Clinic
- Verify that all existing dental records are assigned to Main Clinic
- Verify that all existing documents are assigned to Main Clinic
- Verify that all existing billing records are assigned to Main Clinic

**Method:**
```python
# Via Django Shell
python manage.py shell
from api.models import Appointment, DentalRecord, Document, Billing, ClinicLocation

main_clinic = ClinicLocation.objects.get(name__icontains="Bacoor")

# Check counts
print(f"Appointments at Main Clinic: {Appointment.objects.filter(clinic=main_clinic).count()}")
print(f"Appointments without clinic: {Appointment.objects.filter(clinic__isnull=True).count()}")

print(f"Dental Records at Main Clinic: {DentalRecord.objects.filter(clinic=main_clinic).count()}")
print(f"Dental Records without clinic: {DentalRecord.objects.filter(clinic__isnull=True).count()}")

print(f"Documents at Main Clinic: {Document.objects.filter(clinic=main_clinic).count()}")
print(f"Documents without clinic: {Document.objects.filter(clinic__isnull=True).count()}")

print(f"Billing at Main Clinic: {Billing.objects.filter(clinic=main_clinic).count()}")
print(f"Billing without clinic: {Billing.objects.filter(clinic__isnull=True).count()}")
```

**Expected Result:** All existing records should be assigned to Main Clinic, zero null clinics

---

## 🎨 Frontend Tasks

### Task 7: Verify Clinic Display in Frontend
**Status:** ✅ API Verified (Manual UI testing required)  
**Depends On:** Tasks 1-6  
**Files:** All frontend pages with ClinicContext

**Action:**
- Test that all three clinics appear in clinic selector dropdown
- Verify clinic names display correctly
- Check clinic badges show correct colors

**Method:**
1. Start frontend: `npm run dev`
2. Login as owner/staff
3. Check clinic selector (navbar) shows all 3 clinics
4. Navigate to each page and verify clinics appear:
   - Services page
   - Appointments page
   - Patient records page
   - Billing page

**Expected Result:**
- Clinic selector shows:
  - ✅ Dorotheo Dental Clinic - Bacoor (Main)
  - ✅ Dorotheo Dental Clinic - Alabang
  - ✅ Dorotheo Dental Clinic - Poblacion

---

### Task 8: Test Service Management with Three Clinics
**Status:** ⏳ Pending  
**Depends On:** Task 4, Task 7  
**File:** `frontend/app/owner/services/page.tsx`

**Action:**
- Test service creation with clinic assignment
- Test service editing with clinic changes
- Verify clinic badges display on service cards

**Method:**
1. Login as owner
2. Navigate to Services Management
3. Create new service and select all 3 clinics
4. Verify service card shows 3 clinic badges
5. Edit service and remove one clinic
6. Verify badge updates correctly
7. Create service with no clinics
8. Verify "No clinics assigned" warning appears

**Expected Result:**
- ✅ Can select multiple clinics in form
- ✅ Clinic badges display correctly
- ✅ Warning shows for unassigned services

---

### Task 9: Test Patient Appointment Booking Flow
**Status:** ⏳ Pending  
**Depends On:** Tasks 1-6  
**File:** `frontend/app/patient/*`

**Action:**
- Test clinic-first appointment booking
- Verify services filter by selected clinic
- Test appointments at different clinics

**Method:**
1. Login as patient
2. Navigate to Book Appointment
3. Select "Bacoor (Main)" clinic → verify services appear
4. Book appointment at Bacoor
5. Book another appointment at Alabang on different date
6. Check "My Appointments" → verify both show with clinic badges

**Expected Result:**
- ✅ Can select any of 3 clinics
- ✅ Services filter based on clinic
- ✅ Can book at multiple clinics
- ✅ Appointments table shows clinic badges

---

### Task 10: Test Owner/Staff Appointment Management
**Status:** ⏳ Pending  
**Depends On:** Task 9  
**File:** `frontend/app/owner/appointments/page.tsx`

**Action:**
- Test clinic filtering in appointments view
- Verify "All Clinics" option works
- Test appointment creation for each clinic

**Method:**
1. Login as owner
2. Navigate to Appointments Management
3. Select "All Clinics" → verify all appointments show
4. Select "Bacoor" → verify only Bacoor appointments show
5. Select "Alabang" → verify only Alabang appointments show
6. Create new appointment for patient at Poblacion clinic
7. Verify appointment appears with correct clinic badge

**Expected Result:**
- ✅ Clinic filtering works correctly
- ✅ Can create appointments at any clinic
- ✅ Clinic badges display correctly

---

### Task 11: Test Clinical Data with Three Clinics
**Status:** ⏳ Pending  
**Depends On:** Tasks 1-6  
**Files:** Patient records pages

**Action:**
- Test dental record creation at different clinics
- Test document upload with clinic association
- Test billing creation with clinic tracking
- Verify cross-clinic visibility

**Method:**
1. Login as staff/dentist
2. Navigate to Patient Records
3. Create dental record for appointment at Bacoor
4. Upload document for appointment at Alabang
5. Create billing for appointment at Poblacion
6. Verify all records show clinic badges
7. Filter by each clinic → verify filtering works
8. Check that records from all clinics are visible (cross-clinic)

**Expected Result:**
- ✅ Records show clinic badges
- ✅ Can filter by clinic
- ✅ Cross-clinic visibility maintained
- ✅ "Created at" clinic indicator shows

---

## 🧪 Testing Checklist

### Backend Verification
- [x] Three clinic records exist in database
- [x] Main Clinic has complete address information (Bacoor, Cavite)
- [x] Alabang clinic has complete address (Muntinlupa)
- [x] Poblacion clinic has complete address (Makati)
- [x] All services assigned to appropriate clinics
- [x] All existing appointments linked to Main Clinic
- [x] All existing records linked to Main Clinic
- [x] Database indexes working correctly
- [x] API returns all three clinics: `GET /api/locations/`
- [x] API filtering works: `GET /api/appointments/?clinic_id=1`

### Frontend Verification
- [ ] Clinic selector shows all 3 clinics
- [ ] Clinic badges display with correct colors:
  - Main (Bacoor) → Green
  - Alabang → Blue
  - Poblacion → Purple
- [ ] Service management multi-select works
- [ ] Service cards show clinic badges
- [ ] Patient booking shows 3 clinics
- [ ] Appointments filter by clinic
- [ ] Records filter by clinic
- [ ] Cross-clinic visibility works

### End-to-End Scenarios
- [ ] Patient can book at Bacoor
- [ ] Patient can book at Alabang
- [ ] Patient can book at Poblacion
- [ ] Staff can view appointments from all clinics
- [ ] Owner can switch between clinics
- [ ] Service available at multiple clinics works
- [ ] Clinic context persists across pages

---

## 📝 Implementation Steps (Recommended Order)

### Step 1: Backend Setup (30 minutes)
1. Update Main Clinic information (Task 1)
2. Create Alabang Branch (Task 2)
3. Create Poblacion Branch (Task 3)
4. Verify three clinics in database

### Step 2: Service Assignment (15 minutes)
1. Assign services to clinics (Task 4)
2. Verify via Django Admin or Shell

### Step 3: Frontend Verification (20 minutes)
1. Start frontend server
2. Check clinic selector (Task 7)
3. Test service management (Task 8)

### Step 4: Testing (30 minutes)
1. Test patient booking flow (Task 9)
2. Test owner appointment management (Task 10)
3. Test clinical data (Task 11)

### Step 5: Final Verification (15 minutes)
1. Run through testing checklist
2. Verify all data integrity (Task 6)
3. Document any issues

**Total Estimated Time:** ~2 hours

---

## 🚀 Quick Start Commands

### Create All Three Clinics (Django Shell Script)
```python
# Run: python manage.py shell
from api.models import ClinicLocation

# Update Main Clinic
main = ClinicLocation.objects.get(name="Main Clinic")
main.name = "Dorotheo Dental Clinic - Bacoor (Main)"
main.address = "123 General Aguinaldo Highway, Bacoor, Cavite"
main.phone = "+63 XX XXXX XXXX"
main.save()

# Create Alabang Branch
alabang = ClinicLocation.objects.create(
    name="Dorotheo Dental Clinic - Alabang",
    address="456 Alabang-Zapote Road, Alabang, Muntinlupa City",
    phone="+63 XX XXXX XXXX"
)

# Create Poblacion Branch
poblacion = ClinicLocation.objects.create(
    name="Dorotheo Dental Clinic - Poblacion",
    address="789 P. Burgos Street, Poblacion, Makati City",
    phone="+63 XX XXXX XXXX"
)

print(f"✓ Created {ClinicLocation.objects.count()} clinics")
```

### Assign All Services to All Clinics
```python
# Run: python manage.py shell
from api.models import Service, ClinicLocation

clinics = ClinicLocation.objects.all()
for service in Service.objects.all():
    service.clinics.set(clinics)
    print(f"✓ {service.name} → {clinics.count()} clinics")
```

---

## 📊 Expected Database State

After completion, your database should have:

```
ClinicLocation Table:
ID | Name                                    | Address                  | Phone
---|----------------------------------------|--------------------------|------------
1  | Dorotheo Dental Clinic - Bacoor (Main) | [Bacoor address]        | [Phone]
2  | Dorotheo Dental Clinic - Alabang       | [Muntinlupa address]    | [Phone]
3  | Dorotheo Dental Clinic - Poblacion     | [Makati address]        | [Phone]

Service-Clinic Relationships (ManyToMany):
Service ID | Clinic IDs
-----------|------------------
1          | [1, 2, 3]  (All clinics)
2          | [1, 2, 3]  (All clinics)
...        | ...

Existing Data Assignments:
- All Appointments → Clinic ID 1 (Main/Bacoor)
- All DentalRecords → Clinic ID 1 (Main/Bacoor)
- All Documents → Clinic ID 1 (Main/Bacoor)
- All Billing → Clinic ID 1 (Main/Bacoor)
```

---

## ✅ Success Criteria

The setup is complete when:

1. ✅ Three clinics exist with complete information
2. ✅ All services assigned to appropriate clinics
3. ✅ Frontend clinic selector shows all 3 clinics
4. ✅ Patients can book appointments at any of the 3 clinics
5. ✅ Staff/Owner can filter data by clinic
6. ✅ Clinic badges display correctly throughout the UI
7. ✅ All existing data remains associated with Main Clinic
8. ✅ Cross-clinic visibility works for patient records
9. ✅ No errors in Django system check
10. ✅ No TypeScript errors in frontend

---

## 🔄 Next Steps After Setup

Once the three clinics are set up and tested:

1. **Phase 3:** Implement availability scheduling per clinic
2. **Phase 5:** Build multi-clinic dashboards and reports
3. **Training:** Train staff on multi-clinic features
4. **Documentation:** Update user guides with multi-clinic workflows

---

## 📞 Support Information

If you encounter issues during setup:

1. Check Django system: `python manage.py check`
2. Verify migrations: `python manage.py showmigrations`
3. Check database: `python manage.py dbshell`
4. Review logs in terminal
5. Test API endpoints in browser or Postman

---

**Document Version:** 1.0  
**Last Updated:** February 1, 2026  
**Status:** Ready for Implementation
