# Staff Portal Manual Testing Checklist

**Purpose**: This document tracks manual testing requirements for the Staff Portal standardization project. Tests are added incrementally as each phase of the [STAFF_OWNER_CONSISTENCY_PLAN.md](../STAFF_OWNER_CONSISTENCY_PLAN.md) is implemented.

**Last Updated**: February 3, 2026

---

## 📋 Testing Instructions

### Prerequisites
1. Backend server running at `http://localhost:8000`
2. Frontend dev server running at `http://localhost:3000`
3. Test staff account credentials available
4. Test database populated with sample patients, appointments, documents

### How to Use This Document
- Each phase has its own section below
- Check off items as you complete them: `- [ ]` → `- [x]`
- Record any issues found in the "Issues Found" subsection
- Add screenshots to `project-documentation/testing-screenshots/` folder
- Update "Testing Date" and "Tester Name" fields

---

## 🧪 PHASE 1: Patients Module Testing

**Implementation Date**: February 3, 2026  
**Testing Date**: _____________  
**Tester Name**: _____________  
**Status**: 🔄 Pending Testing

### Setup Instructions

1. **Start Backend**:
   ```bash
   cd dorotheo-dental-clinic-website/backend
   python manage.py runserver
   ```

2. **Start Frontend**:
   ```bash
   cd dorotheo-dental-clinic-website/frontend
   pnpm dev
   ```

3. **Login as Staff**:
   - Navigate to http://localhost:3000/login
   - Enter staff credentials
   - Verify redirect to staff dashboard

---

### Task 1.1: Patients List Page Sorting

**Test File**: `frontend/app/staff/patients/page.tsx`  
**Test URL**: http://localhost:3000/staff/patients

#### Test Cases

- [ ] **TC-1.1.1: Page Load**
  - Navigate to staff patients page
  - Verify patients list loads without errors
  - Check browser console (F12) - should be 0 errors
  
- [ ] **TC-1.1.2: Sort by Patient Name**
  - Click "Patient Name" column header
  - Verify patients sort alphabetically (A-Z)
  - Click again - verify reverse sort (Z-A)
  - Verify ChevronUp or ChevronDown icon appears on column header
  
- [ ] **TC-1.1.3: Sort by Email**
  - Click "Email" column header
  - Verify emails sort alphabetically
  - Click again - verify reverse sort
  - Verify sort icon appears
  
- [ ] **TC-1.1.4: Sort by Phone**
  - Click "Phone" column header
  - Verify phone numbers sort numerically
  - Click again - verify reverse sort
  - Verify sort icon appears
  
- [ ] **TC-1.1.5: Sort by Last Visit**
  - Click "Last Visit" column header
  - Verify dates sort chronologically (oldest to newest)
  - Click again - verify reverse sort (newest to oldest)
  - Verify "No visits" appears for patients without appointments
  - Verify sort icon appears
  
- [ ] **TC-1.1.6: Sort by Status**
  - Click "Status" column header
  - Verify status values sort alphabetically (Active, Archived, Inactive)
  - Click again - verify reverse sort
  - Verify sort icon appears
  
- [ ] **TC-1.1.7: Header Hover Effects**
  - Hover over each column header
  - Verify background color changes (hover effect)
  - Verify cursor changes to pointer
  
- [ ] **TC-1.1.8: Sort Icon Display**
  - When a column is active, verify only that column shows sort icon
  - Verify ChevronUp shows for ascending sort
  - Verify ChevronDown shows for descending sort
  
- [ ] **TC-1.1.9: Performance**
  - Sort large patient list (50+ patients)
  - Verify sorting completes in < 1 second
  - No UI lag or freezing

#### Issues Found (Task 1.1)
```
Issue #: 
Description: 
Steps to Reproduce: 
Expected: 
Actual: 
Severity: [Critical/High/Medium/Low]
Screenshot: 
```

---

### Task 1.2: Patient Detail Page Enhancements

**Test File**: `frontend/app/staff/patients/[id]/page.tsx`  
**Test URL**: http://localhost:3000/staff/patients/[patient-id]

#### Critical Tests

##### 1. Patient Information Display

- [ ] **TC-1.2.1: Patient Header**
  - Patient name displays at top of page
  - Name is properly formatted (First Last)
  - No "undefined" or "null" text
  
- [ ] **TC-1.2.2: Age Calculation**
  - Age calculation shows correctly next to birthday field
  - Format: "Birthday: MM/DD/YYYY (XX years old)"
  - Age is accurate based on current date
  - No "NaN" values
  
- [ ] **TC-1.2.3: Contact Information**
  - Email displays correctly
  - Phone number displays correctly
  - Address displays (if provided)
  - All fields properly formatted
  - No "undefined" text in any field

##### 2. Appointments Section

- [ ] **TC-1.2.4: Appointments Grid Layout**
  - Appointments display in grid format
  - Responsive layout (adjusts to screen size)
  - No overlapping elements
  
- [ ] **TC-1.2.5: Service Badges**
  - Service name badges appear for each appointment
  - Service colors display correctly
  - Service abbreviations show if name is long
  
- [ ] **TC-1.2.6: Clinic Badge** (Multi-clinic setup only)
  - ClinicBadge component appears
  - Clinic name displays correctly
  - Badge styling is consistent
  - Skip if single-clinic setup
  
- [ ] **TC-1.2.7: Date/Time Formatting**
  - Appointment dates formatted as MM/DD/YYYY
  - Times formatted as HH:MM AM/PM
  - Timezone handled correctly
  
- [ ] **TC-1.2.8: Dentist Information**
  - Dentist names display for each appointment
  - Format: "Dr. [First] [Last]" or "[Full Name]"
  - No "undefined" dentist values
  
- [ ] **TC-1.2.9: Status Badge Colors**
  - Scheduled appointments → Blue badge
  - Completed appointments → Green badge
  - Cancelled appointments → Red badge
  - No Show appointments → Gray badge
  - All status badges clearly visible

##### 3. Documents & Images Section

- [ ] **TC-1.2.10: Documents Section Visibility**
  - "Medical Certificates" section displays
  - "Other Documents" section displays
  - Both sections visible even if empty
  
- [ ] **TC-1.2.11: Images Section**
  - "Teeth Images" section displays
  - Images show in grid layout
  - Thumbnails load correctly
  
- [ ] **TC-1.2.12: View All Links**
  - "View all" link visible for documents
  - "View all" link visible for images
  - Links are clickable
  - Links have hover effect
  
- [ ] **TC-1.2.13: Upload Button**
  - "Upload Document" button present
  - Button styled correctly
  - Button has hover effect

##### 4. Image Preview Modal

- [ ] **TC-1.2.14: Open Image Modal**
  - Click any teeth image
  - Modal opens immediately (< 0.5 seconds)
  - Image displays full-size
  - Modal overlay darkens background
  
- [ ] **TC-1.2.15: Close Methods**
  - Click X button → modal closes
  - Press Escape key → modal closes
  - Click outside modal (on dark overlay) → modal closes
  - All methods work consistently
  
- [ ] **TC-1.2.16: Download Functionality**
  - Download button appears in modal
  - Icon is visible (Download icon from lucide-react)
  - Click download button
  - Image file downloads to computer
  - Filename is meaningful (includes patient/date info)
  
- [ ] **TC-1.2.17: Image Metadata**
  - Upload date displays correctly
  - Image type shows (e.g., "X-ray", "Photo")
  - Format: "Uploaded on MM/DD/YYYY"
  
- [ ] **TC-1.2.18: Linked Appointment Info**
  - If image linked to appointment, appointment info displays
  - Shows: Date, Service, Dentist
  - Info formatted clearly
  - If not linked, section doesn't appear

##### 5. Document Preview Modal

- [ ] **TC-1.2.19: Open Document Modal**
  - Click any document (PDF/medical certificate)
  - Modal opens within 1 second
  - Document begins loading
  
- [ ] **TC-1.2.20: PDF Display**
  - PDF loads and displays in iframe
  - PDF is readable (not blurry)
  - PDF is scrollable within modal
  - Zoom controls work (if available)
  
- [ ] **TC-1.2.21: Document Header**
  - Document title shows in modal header
  - Title is clear and descriptive
  - Close button (X) visible in header
  
- [ ] **TC-1.2.22: Close Methods**
  - Click X button → modal closes
  - Press Escape key → modal closes
  - Click outside modal → modal closes
  - All methods work consistently
  
- [ ] **TC-1.2.23: Linked Appointment Info**
  - If document linked to appointment, info displays
  - Shows: Date, Service, Dentist
  - Info formatted clearly
  - If not linked, section doesn't appear

##### 6. Upload Modal (UnifiedDocumentUpload)

- [ ] **TC-1.2.24: Open Upload Modal**
  - Click "Upload Document" button
  - UnifiedDocumentUpload modal opens
  - Modal displays within 0.5 seconds
  
- [ ] **TC-1.2.25: Document Type Selection**
  - Dropdown/select for document type visible
  - Options include: Medical Certificate, Other, Teeth Image
  - Can select each option
  - Selection persists when changing
  
- [ ] **TC-1.2.26: File Selection**
  - "Choose file" or file input visible
  - Click to open file browser
  - Can select PDF file
  - Can select image file (JPG, PNG)
  - Selected filename displays
  
- [ ] **TC-1.2.27: Upload Process**
  - Fill out all required fields
  - Click "Upload" button
  - Loading indicator appears
  - Success message displays after upload
  - Success message clearly states upload succeeded
  
- [ ] **TC-1.2.28: Post-Upload Behavior**
  - Modal closes automatically after success
  - Page refreshes or data reloads
  - New document/image appears in appropriate section
  - No need to manually refresh page

##### 7. Performance Testing

- [ ] **TC-1.2.29: Initial Page Load**
  - Patient detail page loads in < 2 seconds
  - All sections visible within load time
  - No long white screen or blank sections
  
- [ ] **TC-1.2.30: Image Click Response**
  - Clicking image opens modal in < 0.5 seconds
  - No lag or delay
  - Image renders immediately
  
- [ ] **TC-1.2.31: Document Click Response**
  - Clicking document opens modal within 1 second
  - PDF begins loading immediately
  - Loading state visible if PDF is large
  
- [ ] **TC-1.2.32: Modal Transitions**
  - Opening modals is smooth (no janky animation)
  - Closing modals is smooth
  - No screen flicker
  
- [ ] **TC-1.2.33: Console Performance**
  - Open browser DevTools (F12)
  - Check Console tab during all operations
  - No console errors during:
    - Page load
    - Clicking images
    - Clicking documents
    - Opening/closing modals
    - Uploading files

##### 8. Error Handling

- [ ] **TC-1.2.34: Missing Image Fallback**
  - Find a broken image link (or simulate)
  - Verify fallback image or placeholder shows
  - Page doesn't crash
  - Error is logged to console (acceptable)
  
- [ ] **TC-1.2.35: PDF Load Failure**
  - Test with corrupted PDF or broken link
  - Error message displays in modal
  - Error message is user-friendly
  - Modal can still be closed
  
- [ ] **TC-1.2.36: Missing Data Handling**
  - Test patient with no appointments
  - Verify "No appointments" message shows
  - Test patient with no documents
  - Verify appropriate empty state message
  - Page doesn't crash with missing data
  
- [ ] **TC-1.2.37: API Failure Handling**
  - Stop backend server
  - Try to load patient detail page
  - Verify error message displays
  - Error is user-friendly (not raw error stack)
  - Can return to patients list

#### Issues Found (Task 1.2)
```
Issue #: 
Description: 
Steps to Reproduce: 
Expected: 
Actual: 
Severity: [Critical/High/Medium/Low]
Screenshot: 
```

---

## 🧪 PHASE 2: Appointments Module Testing

**Implementation Date**: February 3, 2026  
**Testing Date**: _____________  
**Tester Name**: _____________  
**Status**: 🔄 Pending Testing

### Setup Instructions

Same as Phase 1 - ensure both backend and frontend servers are running.

---

### Task 2.1: Appointments List Sorting

**Test File**: `frontend/app/staff/appointments/page.tsx`  
**Test URL**: http://localhost:3000/staff/appointments

#### Test Cases

- [ ] **TC-2.1.1: Page Load**
  - Navigate to staff appointments page
  - Verify appointments list loads without errors
  - Check browser console (F12) - should be 0 errors
  
- [ ] **TC-2.1.2: Sort by Patient Name**
  - Click "Patient" column header
  - Verify appointments sort by patient name alphabetically (A-Z)
  - Click again - verify reverse sort (Z-A)
  - Verify ChevronUp or ChevronDown icon appears on column header
  
- [ ] **TC-2.1.3: Sort by Treatment**
  - Click "Treatment" column header
  - Verify appointments sort by service/treatment name
  - Click again - verify reverse sort
  - Verify sort icon appears
  
- [ ] **TC-2.1.4: Sort by Date**
  - Click "Date" column header
  - Verify appointments sort chronologically (oldest to newest)
  - Click again - verify reverse sort (newest to oldest)
  - Verify sort icon appears
  
- [ ] **TC-2.1.5: Sort by Dentist**
  - Click "Dentist" column header
  - Verify appointments sort by dentist name
  - Click again - verify reverse sort
  - Verify sort icon appears
  
- [ ] **TC-2.1.6: Sort by Status**
  - Click "Status" column header
  - Verify appointments sort by status (alphabetically)
  - Click again - verify reverse sort
  - Verify sort icon appears
  
- [ ] **TC-2.1.7: Header Hover Effects**
  - Hover over sortable column headers (Patient, Treatment, Date, Dentist, Status)
  - Verify background color changes (hover effect)
  - Verify cursor changes to pointer
  - Time and Clinic columns should NOT be sortable
  
- [ ] **TC-2.1.8: Sort Icon Display**
  - When a column is active, verify only that column shows sort icon
  - Verify ChevronUp shows for ascending sort
  - Verify ChevronDown shows for descending sort
  - Other columns should not show sort icons
  
- [ ] **TC-2.1.9: Default Sorting**
  - Refresh page (no column sorted manually)
  - Verify appointments display in order of most recently updated first
  - Check that newest appointments appear at top
  
- [ ] **TC-2.1.10: Performance**
  - Sort large appointment list (50+ appointments)
  - Verify sorting completes in < 1 second
  - No UI lag or freezing

#### Issues Found (Task 2.1)
```
Issue #: 
Description: 
Steps to Reproduce: 
Expected: 
Actual: 
Severity: [Critical/High/Medium/Low]
Screenshot: 
```

---

### Task 2.2: Enhanced Patient Search Dropdown

**Test File**: `frontend/app/staff/appointments/page.tsx`  
**Test URL**: http://localhost:3000/staff/appointments

#### Test Cases

##### 1. Dropdown Behavior

- [ ] **TC-2.2.1: Open Add Appointment Modal**
  - Click "Book Appointment" button
  - Modal opens successfully
  - Patient search input is visible
  
- [ ] **TC-2.2.2: Focus Opens Dropdown**
  - Click into patient search input field
  - Dropdown appears below input
  - Shows list of all patients
  
- [ ] **TC-2.2.3: Typing Opens Dropdown**
  - Type any character in search field
  - Dropdown appears if closed
  - Dropdown remains open if already open
  
- [ ] **TC-2.2.4: Click Outside Closes Dropdown**
  - Open dropdown by clicking search field
  - Click anywhere outside the dropdown (but inside modal)
  - Dropdown closes
  - Search text remains in input
  
- [ ] **TC-2.2.5: Escape Key Doesn't Close Dropdown**
  - Open dropdown
  - Press Escape key
  - Dropdown should remain open (modal might close instead)
  - Test that Escape behavior is consistent

##### 2. Search Functionality

- [ ] **TC-2.2.6: Search by First Name**
  - Type part of a patient's first name (e.g., "John")
  - Verify only matching patients appear
  - Partial matches work (e.g., "Jo" matches "John")
  - Case insensitive search works
  
- [ ] **TC-2.2.7: Search by Last Name**
  - Type part of a patient's last name
  - Verify only matching patients appear
  - Partial matches work
  
- [ ] **TC-2.2.8: Search by Email**
  - Type part of a patient's email
  - Verify only matching patients appear
  - Partial matches work
  
- [ ] **TC-2.2.9: No Results Message**
  - Type text that matches no patients (e.g., "zzzzz")
  - Verify "No patients found" message displays
  - Message is centered and clearly visible
  
- [ ] **TC-2.2.10: Clear Search**
  - Type search text to filter patients
  - Clear the search input (delete all text)
  - Verify all patients reappear in dropdown

##### 3. Patient Selection

- [ ] **TC-2.2.11: Select Patient from Dropdown**
  - Click any patient in dropdown
  - Dropdown closes automatically
  - Patient name and email appear in search field
  - Format: "FirstName LastName - email@example.com"
  
- [ ] **TC-2.2.12: Selected Patient Highlight**
  - Select a patient
  - Reopen dropdown
  - Selected patient has blue background (bg-blue-50)
  - Other patients have white background
  
- [ ] **TC-2.2.13: Change Selection**
  - Select one patient
  - Reopen dropdown
  - Select a different patient
  - New patient name/email replaces old in search field
  - New patient highlighted in dropdown on reopen
  
- [ ] **TC-2.2.14: Patient Display Format**
  - Open dropdown
  - Each patient shows:
    - Full name in bold/medium weight (first line)
    - Email in smaller gray text (second line)
  - Layout is clear and readable

##### 4. Patient Sorting in Dropdown

- [ ] **TC-2.2.15: Recent Patients First**
  - Open dropdown without typing
  - Verify patients with recent completed appointments appear first
  - Most recently completed appointments at the top
  
- [ ] **TC-2.2.16: Alphabetical Fallback**
  - Check patients at bottom of list (no recent appointments)
  - Verify they are sorted alphabetically by full name
  - A-Z order
  
- [ ] **TC-2.2.17: Sorting Persists with Search**
  - Type search query
  - Filtered results maintain same sorting logic
  - Recent patients still appear before others

##### 5. Loading State & Performance

- [ ] **TC-2.2.18: Dropdown Renders Quickly**
  - Open dropdown with many patients (50+)
  - Dropdown appears within 0.5 seconds
  - Scrollbar appears if list is long
  
- [ ] **TC-2.2.19: Search is Responsive**
  - Type quickly in search field
  - Results update in real-time
  - No noticeable lag
  
- [ ] **TC-2.2.20: Scroll Behavior**
  - Open dropdown with many patients
  - Scroll down the list
  - Scrolling is smooth
  - Can reach all patients
  - Max height is 60vh (doesn't cover entire screen)

##### 6. Integration with Appointment Creation

- [ ] **TC-2.2.21: Patient Required Validation**
  - Open add appointment modal
  - Leave patient field empty (don't select anyone)
  - Try to submit form
  - Verify error message or validation prevents submission
  
- [ ] **TC-2.2.22: Patient Selection Persists**
  - Select a patient
  - Fill out other fields (date, time, service)
  - Verify selected patient remains in field
  
- [ ] **TC-2.2.23: Clear on Success**
  - Create appointment successfully
  - Modal closes and success modal appears
  - Reopen add appointment modal
  - Patient field should be empty/cleared
  
- [ ] **TC-2.2.24: Clear on Cancel**
  - Select a patient
  - Close modal without submitting
  - Reopen add appointment modal
  - Patient field should be cleared

##### 7. Double Submission Prevention

- [ ] **TC-2.2.25: Booking State Indicator**
  - Fill out appointment form completely
  - Click "Book Appointment" submit button
  - Loading state should appear (button disabled or loading spinner)
  
- [ ] **TC-2.2.26: Prevent Double Click**
  - Fill out appointment form
  - Quickly double-click submit button
  - Only ONE appointment should be created
  - Check appointments list after success
  
- [ ] **TC-2.2.27: Prevent Multiple Submissions**
  - Fill out appointment form
  - Click submit button
  - Before success modal appears, try clicking submit again
  - Second click should have no effect
  - Only ONE appointment created
  
- [ ] **TC-2.2.28: Re-enable After Error**
  - Try to create conflicting appointment (time slot taken)
  - Error message appears
  - Submit button should be re-enabled
  - Can try again with different time

##### 8. Edge Cases

- [ ] **TC-2.2.29: Empty Patient List**
  - Test with database that has no patients
  - Dropdown shows "No patients found" message
  - No JavaScript errors in console
  
- [ ] **TC-2.2.30: Single Patient**
  - Test with only 1 patient in database
  - Dropdown shows single patient
  - Can select that patient
  
- [ ] **TC-2.2.31: Special Characters in Names**
  - Test patients with special characters (O'Brien, José, etc.)
  - Search works correctly
  - Display shows characters properly
  
- [ ] **TC-2.2.32: Long Names/Emails**
  - Test with very long patient names or emails
  - Dropdown text wraps or truncates gracefully
  - No layout breaking

#### Issues Found (Task 2.2)
```
Issue #: 
Description: 
Steps to Reproduce: 
Expected: 
Actual: 
Severity: [Critical/High/Medium/Low]
Screenshot: 
```

---

## 🧪 PHASE 3: Inventory Module Testing

**Implementation Date**: _____________  
**Testing Date**: _____________  
**Tester Name**: _____________  
**Status**: ⏳ Not Yet Implemented

_Tests will be added here after Phase 3 implementation_

---

## 🧪 PHASE 4: Billing Module Testing

**Implementation Date**: _____________  
**Testing Date**: _____________  
**Tester Name**: _____________  
**Status**: ⏳ Not Yet Implemented

_Tests will be added here after Phase 4 implementation_

---

## 🧪 PHASE 5: Dashboard Testing

**Implementation Date**: _____________  
**Testing Date**: _____________  
**Tester Name**: _____________  
**Status**: ⏳ Not Yet Implemented

_Tests will be added here after Phase 5 implementation_

---

## 📊 Testing Summary

### Overall Progress

| Phase | Implementation | Testing | Pass Rate | Status |
|-------|---------------|---------|-----------|--------|
| Phase 1 - Task 1.1 | ✅ Complete | ⏳ Pending | 0/9 | 🔄 Awaiting Test |
| Phase 1 - Task 1.2 | ✅ Complete | ⏳ Pending | 0/37 | 🔄 Awaiting Test |
| Phase 2 - Task 2.1 | ✅ Complete | ⏳ Pending | 0/10 | 🔄 Awaiting Test |
| Phase 2 - Task 2.2 | ✅ Complete | ⏳ Pending | 0/32 | 🔄 Awaiting Test |
| Phase 3 | ⏳ Pending | ⏳ Pending | 0/0 | ⏳ Not Started |
| Phase 4 | ⏳ Pending | ⏳ Pending | 0/0 | ⏳ Not Started |
| Phase 5 | ⏳ Pending | ⏳ Pending | 0/0 | ⏳ Not Started |

### Test Results Log

#### Test Session 1
- **Date**: _____________
- **Tester**: _____________
- **Phase Tested**: Phase 1
- **Tests Passed**: _____ / _____
- **Tests Failed**: _____
- **Critical Issues**: _____
- **Notes**: 

---

## 🐛 Known Issues

### Critical Issues
_None yet_

### High Priority Issues
_None yet_

### Medium Priority Issues
_None yet_

### Low Priority Issues
_None yet_

---

## 🧪 PHASE 2: Patient Appointments Page Testing

**Implementation Date**: February 3, 2026  
**Testing Date**: _____________  
**Tester Name**: _____________  
**Status**: 🔄 Pending Testing

### Overview

Phase 2 adds a dedicated patient appointments page to the Staff portal, matching the functionality available in the Owner portal. Staff can now view and manage all appointments for a specific patient from a dedicated page.

**Implementation Summary**: [STAFF_PATIENT_APPOINTMENTS_PAGE_2026-02-03.md](./fixes-and-issues/STAFF_PATIENT_APPOINTMENTS_PAGE_2026-02-03.md)

---

### Task 2.1: Patient Appointments Page Navigation

**Test File**: `frontend/app/staff/patients/[id]/page.tsx`, `frontend/app/staff/patients/[id]/appointments/page.tsx`  
**Test URLs**: 
- Patient Details: http://localhost:3000/staff/patients/[patient-id]
- Patient Appointments: http://localhost:3000/staff/patients/[patient-id]/appointments

#### Test Cases

- [ ] **TC-2.1.1: Navigation from Patient Details**
  - Navigate to any patient details page
  - Locate the "Appointments" section
  - Click "View all" button/link
  - Verify redirect to `/staff/patients/[patient-id]/appointments`
  - Verify URL contains correct patient ID
  - Check browser console (F12) - should be 0 errors

- [ ] **TC-2.1.2: Back Navigation**
  - From patient appointments page, click "Back to [Patient Name] details" button
  - Verify redirect back to patient details page
  - Verify patient ID in URL remains correct

- [ ] **TC-2.1.3: Direct URL Access**
  - Copy a patient appointments URL (e.g., `/staff/patients/5/appointments`)
  - Open in new browser tab
  - Verify page loads correctly
  - Verify appointments display for correct patient

---

### Task 2.2: Appointments Display

#### Test Cases

- [ ] **TC-2.2.1: Page Load and Layout**
  - Navigate to patient appointments page
  - Verify page title shows "All Appointments"
  - Verify "Book Appointment" button appears in top-right
  - Verify two sections: "Upcoming Appointments" and "Past Appointments"
  - Verify back button shows patient name

- [ ] **TC-2.2.2: Upcoming Appointments Section**
  - Verify section header displays "Upcoming Appointments" with calendar icon
  - Verify table headers: Treatment, Date, Time, Clinic, Dentist, Status
  - Verify only future appointments with active statuses appear
  - Verify appointments are displayed in chronological order
  - If no upcoming appointments, verify "No upcoming appointments" message

- [ ] **TC-2.2.3: Past Appointments Section**
  - Verify section header displays "Past Appointments" with calendar icon
  - Verify table headers match upcoming section
  - Verify only past appointments appear (completed, cancelled, missed, or past dates)
  - Verify appointments are displayed in reverse chronological order
  - If no past appointments, verify "No past appointments" message

- [ ] **TC-2.2.4: Appointment Row Display**
  - Verify service name appears as colored badge
  - Verify date format is correct (YYYY-MM-DD or localized)
  - Verify time format is 12-hour with AM/PM
  - Verify clinic badge displays with correct color
  - Verify dentist name displays or "Not Assigned"
  - Verify status badge has correct color coding:
    - Confirmed: Green
    - Pending: Yellow
    - Cancelled: Red
    - Completed: Blue
    - Missed: Yellow-orange

- [ ] **TC-2.2.5: Clinic Filtering**
  - Select a specific clinic from clinic selector (if multi-clinic enabled)
  - Verify only appointments for selected clinic are displayed
  - Switch to "All Clinics"
  - Verify all appointments appear regardless of clinic
  - Verify filtering works for both upcoming and past sections

---

### Task 2.3: Expandable Appointment Details

#### Test Cases

- [ ] **TC-2.3.1: Expand Appointment**
  - Click anywhere on an appointment row
  - Verify row expands with smooth animation
  - Verify chevron icon changes from down to up
  - Verify expanded content displays below the row
  - Verify background gradient appears (gray-50 to teal-50)

- [ ] **TC-2.3.2: Collapse Appointment**
  - Click the same appointment row again
  - Verify row collapses with smooth animation
  - Verify chevron icon changes from up to down
  - Verify expanded content disappears

- [ ] **TC-2.3.3: Expand Different Appointment**
  - Expand one appointment
  - Click a different appointment row
  - Verify first appointment collapses
  - Verify second appointment expands
  - Verify only one appointment is expanded at a time

- [ ] **TC-2.3.4: Appointment Details Card**
  - Expand an appointment
  - Verify "Appointment Details" card displays on the left
  - Verify card shows:
    - Service name
    - Date with calendar icon
    - Time with clock icon
    - Clinic with map pin icon
    - Dentist name
    - Status badge
    - Completed timestamp (if status is completed)

- [ ] **TC-2.3.5: Uploaded Files Card**
  - Expand an appointment
  - Verify "Uploaded Files" card displays on the right
  - Verify "Upload" button appears in card header
  - Verify two subsections: "Documents" and "Dental Images"
  - Verify document count displays (e.g., "Documents (3)")
  - Verify image count displays (e.g., "Dental Images (2)")

---

### Task 2.4: Document Management

#### Test Cases

- [ ] **TC-2.4.1: Document Display**
  - Expand an appointment with documents
  - Verify documents appear in the "Documents" section
  - Verify each document shows:
    - File icon (red for PDF, blue for others)
    - Document title
    - Document type label
    - Eye icon for preview
  - Verify hover effect on document items

- [ ] **TC-2.4.2: Document Preview (PDF)**
  - Click a PDF document
  - Verify preview modal opens
  - Verify modal shows:
    - Document title
    - Document type
    - PDF viewer with content
    - Download button
    - Close (X) button
  - Verify PDF content is readable
  - Click outside modal - verify it closes
  - Click X button - verify modal closes

- [ ] **TC-2.4.3: Document Preview (Image)**
  - Click an image document (JPG, PNG)
  - Verify preview modal opens
  - Verify image displays correctly
  - Verify download button works
  - Test closing modal (outside click and X button)

- [ ] **TC-2.4.4: Document Download**
  - Open document preview
  - Click download button
  - Verify file downloads to browser's download folder
  - Verify filename is correct

- [ ] **TC-2.4.5: No Documents Display**
  - Expand an appointment without documents
  - Verify "No documents uploaded" message appears
  - Verify message is clear and well-styled

---

### Task 2.5: Image Management

#### Test Cases

- [ ] **TC-2.5.1: Dental Image Display**
  - Expand an appointment with dental images
  - Verify images appear in "Dental Images" section
  - Verify each image shows:
    - Thumbnail preview (12x12 or similar)
    - "Dental Image" label
    - Upload date
    - Eye icon for preview
  - Verify hover effect changes eye icon color

- [ ] **TC-2.5.2: Image Preview**
  - Click a dental image
  - Verify preview modal opens full-screen
  - Verify modal shows:
    - "Dental Image" title
    - Image notes (if any)
    - Full-size image
    - Download button
    - Close button
  - Verify image is high quality and zoomable (if implemented)

- [ ] **TC-2.5.3: Image Download**
  - Open image preview
  - Click download button
  - Verify image downloads correctly
  - Verify filename includes "dental-image" and ID

- [ ] **TC-2.5.4: No Images Display**
  - Expand an appointment without dental images
  - Verify "No dental images uploaded" message appears

---

### Task 2.6: File Upload Functionality

#### Test Cases

- [ ] **TC-2.6.1: Open Upload Modal**
  - Expand an appointment
  - Click "Upload" button in Uploaded Files card
  - Verify unified document upload modal opens
  - Verify modal shows patient name
  - Verify appointment is pre-selected
  - Verify file type options (document or teeth image)

- [ ] **TC-2.6.2: Upload Document**
  - Open upload modal
  - Select "Document" type
  - Choose document type from dropdown
  - Enter title and description
  - Select a PDF file
  - Click upload
  - Verify success message
  - Verify modal closes
  - Verify document appears in appointment's documents list

- [ ] **TC-2.6.3: Upload Dental Image**
  - Open upload modal
  - Select "Teeth Image" type
  - Enter notes
  - Select an image file (JPG, PNG)
  - Click upload
  - Verify success message
  - Verify modal closes
  - Verify image appears in appointment's images list

- [ ] **TC-2.6.4: Upload Validation**
  - Try uploading without selecting file
  - Verify error message
  - Try uploading wrong file type
  - Verify error message
  - Try uploading file too large (if limit exists)
  - Verify error message

- [ ] **TC-2.6.5: Cancel Upload**
  - Open upload modal
  - Fill in some fields
  - Click "Cancel" or X button
  - Verify modal closes without uploading
  - Verify no new files appear

---

### Task 2.7: Book Appointment Functionality

#### Test Cases

- [ ] **TC-2.7.1: Open Book Appointment Modal**
  - Click "Book Appointment" button in page header
  - Verify modal opens
  - Verify modal title shows "Book Appointment for [Patient Name]"
  - Verify patient field is pre-filled and read-only
  - Verify form has: Dentist, Service, Date, Time, Notes fields

- [ ] **TC-2.7.2: Select Dentist**
  - Open book appointment modal
  - Click dentist dropdown
  - Verify list of dentists appears
  - Select a dentist
  - Verify green checkmark message appears
  - Verify calendar section appears on right

- [ ] **TC-2.7.3: View Available Dates**
  - After selecting dentist, view calendar
  - Verify available dates are highlighted in green
  - Verify past dates are disabled (grayed out)
  - Verify dates beyond 90 days are disabled
  - If dentist has no availability, verify warning message

- [ ] **TC-2.7.4: Select Date**
  - Click an available date on calendar
  - Verify date is selected (visual feedback)
  - Verify time slot dropdown appears below

- [ ] **TC-2.7.5: Select Service**
  - Select a service from dropdown
  - Verify service is selected
  - Note the service duration for time slot testing

- [ ] **TC-2.7.6: View Time Slots**
  - After selecting date and service
  - View time slot dropdown
  - Verify slots are generated based on service duration
  - Verify past time slots are hidden (if today is selected)
  - Verify booked slots are marked as "(Booked)" and disabled
  - Verify available slots are enabled

- [ ] **TC-2.7.7: Select Time Slot**
  - Select an available time slot
  - Verify green checkmark message appears
  - Verify "Book Appointment" button becomes enabled

- [ ] **TC-2.7.8: Add Notes**
  - Enter text in "Additional Notes" field
  - Verify text is accepted and displayed correctly
  - Test with long text (should not break layout)

- [ ] **TC-2.7.9: Submit Appointment**
  - Fill all required fields (dentist, service, date, time)
  - Click "Book Appointment" button
  - Verify loading state (if implemented)
  - Verify success modal appears
  - Verify success modal shows:
    - Patient name
    - Date, time, service, dentist
    - Confirmation message
  - Click close or outside modal
  - Verify success modal closes
  - Verify appointment page refreshes
  - Verify new appointment appears in upcoming appointments

- [ ] **TC-2.7.10: Booking Validation**
  - Try booking without selecting dentist
  - Verify form validation prevents submission
  - Try booking without service
  - Verify validation error
  - Try booking without date/time
  - Verify validation error

- [ ] **TC-2.7.11: Conflict Detection**
  - Select a time slot that's already booked
  - Try to submit
  - Verify error message about time slot conflict
  - Verify appointment is not created

- [ ] **TC-2.7.12: Cancel Booking**
  - Open book appointment modal
  - Fill in some fields
  - Click "Cancel" button
  - Verify modal closes
  - Verify no appointment is created
  - Verify form is reset

---

### Task 2.8: Responsive Design

#### Test Cases

- [ ] **TC-2.8.1: Desktop View (1920x1080)**
  - View patient appointments page on desktop
  - Verify layout is not stretched or cramped
  - Verify tables display all columns
  - Verify modals are centered and appropriately sized
  - Verify expanded appointment details show in 2-column grid

- [ ] **TC-2.8.2: Laptop View (1366x768)**
  - Resize browser to 1366x768
  - Verify page remains functional
  - Verify no horizontal scrolling
  - Verify tables adapt appropriately

- [ ] **TC-2.8.3: Tablet View (768x1024)**
  - Test on tablet or resize browser
  - Verify appointment cards stack vertically
  - Verify modals are full-width or responsive
  - Verify expanded details change to single column
  - Verify book appointment form adapts

- [ ] **TC-2.8.4: Mobile View (375x667)**
  - Test on mobile device or resize browser
  - Verify tables show all critical information
  - Verify horizontal scroll works for wide content
  - Verify buttons are touch-friendly (min 44x44px)
  - Verify modals take full screen
  - Verify calendar is usable on small screen

---

### Task 2.9: Error Handling and Edge Cases

#### Test Cases

- [ ] **TC-2.9.1: Patient Not Found**
  - Navigate to invalid patient ID (e.g., `/staff/patients/999999/appointments`)
  - Verify "Patient not found" message displays
  - Verify "Back to Patients" button works

- [ ] **TC-2.9.2: No Appointments**
  - Navigate to patient with zero appointments
  - Verify "No upcoming appointments" message in upcoming section
  - Verify "No past appointments" message in past section
  - Verify messages are clear and helpful

- [ ] **TC-2.9.3: Network Error During Load**
  - Disable network or throttle to slow 3G
  - Navigate to patient appointments page
  - Verify loading indicator appears
  - Re-enable network
  - Verify data loads after network recovery

- [ ] **TC-2.9.4: Network Error During File Upload**
  - Start uploading a file
  - Disable network mid-upload
  - Verify error message appears
  - Verify user can retry

- [ ] **TC-2.9.5: Network Error During Booking**
  - Fill book appointment form
  - Disable network
  - Click "Book Appointment"
  - Verify error message
  - Re-enable network
  - Verify user can retry without losing form data

---

### Issues Found During Phase 2 Testing

#### Critical Issues
_None yet_

#### High Priority Issues
_None yet_

### Medium Priority Issues
_None yet_

### Low Priority Issues
_None yet_

---

## 📝 Testing Notes & Observations

### General Notes
- Add any observations about UX/UI improvements
- Note any inconsistencies between Staff and Owner portals
- Suggest enhancements or refinements

### Browser Compatibility
Test on the following browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Safari (latest) - if Mac available

### Device Testing
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

---

## 📚 Reference Documents

- [STAFF_OWNER_CONSISTENCY_PLAN.md](../STAFF_OWNER_CONSISTENCY_PLAN.md) - Implementation plan
- [DASHBOARD_PATIENTS_FILTER_FIX_2026-02-03.md](./fixes-and-issues/DASHBOARD_PATIENTS_FILTER_FIX_2026-02-03.md) - Recent fix
- [USER_GUIDE.md](../docs/USER_GUIDE.md) - End-user documentation

---

## 📧 Contact

**For Questions About Testing**:
- Developer: [Your Name]
- Project Manager: [PM Name]
- Testing Issues: Create GitHub issue with label `testing`

---

**Testing Status Legend**:
- ✅ Complete
- 🔄 In Progress
- ⏳ Pending
- ❌ Failed
- ⚠️ Blocked
