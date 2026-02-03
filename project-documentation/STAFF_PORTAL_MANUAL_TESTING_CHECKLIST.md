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
