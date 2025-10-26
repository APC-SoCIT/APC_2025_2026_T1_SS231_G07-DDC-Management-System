# Dental Clinic System - Comprehensive Updates Plan

## Completed ✅

### 1. Service Dropdown for Staff/Owner Appointment Creation
- ✅ Added Service and Staff interfaces
- ✅ Fetch services and staff on component mount
- ✅ Replace service text input with dropdown
- ✅ Added dentist dropdown (optional)
- ✅ Updated appointment creation to send service/dentist IDs
- ✅ Applied to both staff and owner appointments pages

## In Progress 🔄

### 2. Backend Dental Records System
**Status**: Starting implementation

**Backend Changes Needed**:
1. Create `DentalRecord` model:
   - Links to Appointment (OneToOne or ForeignKey)
   - Patient reference
   - Date of service
   - Treatment performed
   - Dentist who performed
   - Diagnosis
   - Notes
   - Status (from completed appointment)

2. Create `XRayImage` model:
   - Patient reference
   - Image file (ImageField)
   - Date uploaded
   - Description/notes
   - Uploaded by (staff/owner)
   - Related appointment (optional)

3. Update Appointment model:
   - Add automatic dental record creation when status → 'completed'
   - Or create signal to auto-generate dental records

4. Add API endpoints:
   - `/api/dental-records/` - List patient's dental records
   - `/api/dental-records/<id>/` - Get specific record details
   - `/api/xray-images/` - Upload/list X-ray images
   - `/api/xray-images/<id>/` - Download specific X-ray image

**Files to Modify**:
- `backend/api/models.py` - Add DentalRecord and XRayImage models
- `backend/api/serializers.py` - Add serializers for new models
- `backend/api/views.py` - Add viewsets and endpoints
- `backend/api/urls.py` - Register new routes
- Create migration for new models

### 3. Frontend Dental Records UI
**Patient Side**:
- Replace "Medical History" with "Dental Records"
- Show list of past completed appointments
- Click to view overlay/modal with:
  - Date of appointment
  - Treatment performed
  - Dentist name
  - Diagnosis
  - Notes
  - Associated X-rays (if any)

- Add "Dental Documents" section:
  - List of X-ray images with dates
  - Download button for each image
  - Preview thumbnail (optional)

**Staff/Owner Side**:
- In Patient tab/details:
  - "Dental Records" section showing all past appointments
  - Click to view full details overlay
  - Add X-ray upload button next to "Upload Teeth Image"
  - X-ray management (view, download, delete)

**Files to Create/Modify**:
- `frontend/app/patient/records/page.tsx` - Rename/redesign as Dental Records
- `frontend/app/patient/documents/page.tsx` - NEW: X-ray documents page
- `frontend/app/staff/patients/[id]/page.tsx` - Add dental records view
- `frontend/app/owner/patients/[id]/page.tsx` - Add dental records view
- `frontend/lib/api.ts` - Add dental records and X-ray API functions

### 4. Cancel Appointment Request (Patient Side)
**Similar to Reschedule Feature**:
- Add "Request Cancellation" button for confirmed appointments
- Modal explaining cancellation request
- Patient can add reason/notes
- Status changes to 'cancel_requested'
- Orange badge for cancel requests
- Staff/Owner can approve (cancel) or reject (keep confirmed)

**Backend Changes**:
- Add `cancel_requested` to status choices
- Add fields: `cancel_reason`, `cancel_requested_at`
- Add actions: `approve_cancel`, `reject_cancel`

**Frontend Changes**:
- Add cancel request UI in patient appointments
- Add approve/reject UI in staff/owner appointments

### 5. Calendar Appointment Details Fix
**Current Issue**: Clicking dates with appointments doesn't show details

**Solution**:
- Update calendar click handler to show appointment details
- Display overlay/popover with:
  - Patient name
  - Time
  - Treatment/Service
  - Dentist
  - Status
- Apply to both owner and staff dashboards

**Files to Modify**:
- `frontend/app/owner/dashboard/page.tsx`
- `frontend/app/staff/dashboard/page.tsx`

### 6. Treatment Plans Integration
**Goal**: When staff/owner creates appointment, it should:
1. Use services from owner's service management
2. Show up in upcoming appointments
3. On appointment day → show in "Appointments Today"
4. When completed → automatically create dental record
5. Dental record visible in patient's records

**This is mostly done with the changes above**:
- ✅ Services from owner's service management (dropdown)
- ✅ Shows in upcoming appointments
- ✅ Shows in today's appointments (already implemented)
- 🔄 Need: Auto-create dental record on completion
- 🔄 Need: Display in patient records

### 7. Dr. Dr. Duplication Check
**Investigation Needed**:
- Check if old data has "Dr." prefix in database
- The current code shows: `Dr. {first_name} {last_name}`
- If database has first_name = "Dr. Marvin", it shows "Dr. Dr. Marvin"

**Solution**:
- Check database data
- Remove "Dr." prefix from existing data if present
- Or: Add conditional rendering to strip "Dr." if already present

## Priority Implementation Order

1. **High Priority** (Immediate):
   - [ ] Backend: Create DentalRecord and XRayImage models
   - [ ] Backend: Add dental records API endpoints
   - [ ] Frontend: Fix calendar appointment details display
   - [ ] Fix Dr. Dr. duplication if database issue

2. **Medium Priority** (Next):
   - [ ] Frontend: Replace Medical History with Dental Records
   - [ ] Frontend: Add X-ray upload/download functionality
   - [ ] Add cancel request feature (backend + frontend)

3. **Low Priority** (Polish):
   - [ ] Auto-create dental records from completed appointments
   - [ ] Email notifications for dental records
   - [ ] Enhanced dental record details

## Implementation Steps - Phase 1 (Backend)

### Step 1: Create Models
```python
# backend/api/models.py

class DentalRecord(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dental_records')
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='dental_record', null=True)
    date = models.DateField()
    treatment = models.CharField(max_length=255)
    dentist = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='performed_treatments')
    diagnosis = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
class XRayImage(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='xray_images')
    image = models.ImageField(upload_to='xray_images/')
    description = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_xrays')
    dental_record = models.ForeignKey(DentalRecord, on_delete=models.SET_NULL, null=True, related_name='xrays')
    created_at = models.DateTimeField(auto_now_add=True)
```

### Step 2: Create Serializers
### Step 3: Create ViewSets
### Step 4: Register URLs
### Step 5: Create Migration
### Step 6: Test API endpoints

## Implementation Steps - Phase 2 (Frontend)

### Step 1: Update API client
### Step 2: Create Dental Records page
### Step 3: Create X-ray upload component
### Step 4: Update patient records page
### Step 5: Add dental records view to staff/owner

## Testing Checklist

- [ ] Service dropdown works in staff/owner appointment creation
- [ ] Appointments created with correct service IDs
- [ ] Calendar shows appointment details on click
- [ ] Completed appointments create dental records
- [ ] Dental records visible to patient
- [ ] Staff/owner can view patient dental records
- [ ] X-ray images can be uploaded
- [ ] X-ray images can be downloaded
- [ ] Cancel request workflow works
- [ ] No "Dr. Dr." duplication

## Notes

- Dental records should be read-only for patients
- Staff/owner can edit/add notes to dental records
- X-ray images should be secure (only patient and staff can view)
- Consider HIPAA compliance for medical images
- Add image size/format validation for X-rays

