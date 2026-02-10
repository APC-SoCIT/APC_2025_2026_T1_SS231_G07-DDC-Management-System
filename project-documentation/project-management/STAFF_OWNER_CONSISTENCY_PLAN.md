# Staff-Owner Components Consistency Implementation Plan

## 🎯 LLM Implementation Guide

**Document Purpose**: This is a comprehensive, step-by-step implementation plan for an LLM code generator to standardize components between Staff and Owner accounts in the Dorotheo Dental Clinic Management System.

**Reading Instructions for LLM**:
1. Each phase contains **Implementation Tasks** followed by **Verification Tasks**
2. Implementation tasks include exact code snippets with line number context
3. Verification tasks must be completed immediately after implementation
4. Use `replace_string_in_file` tool with the provided old/new code blocks
5. After each phase, run `get_errors` tool to check for TypeScript errors
6. Test user flows manually or suggest test commands

## Overview
This document provides an LLM-friendly plan to standardize components, layouts, logic, and features between Staff and Owner accounts in the Dorotheo Dental Clinic Management System. The goal is to ensure that shared functionalities (Patients, Appointments, Inventory, Billing) are consistent across both roles.

**Critical Rules**:
- ❌ Do NOT add owner-exclusive features to staff accounts (Analytics, Services, Staff management)
- ✅ DO standardize components/logic for features that exist in BOTH roles
- ✅ DO verify each change immediately after implementation
- ✅ DO preserve existing functionality while adding new features

---

## 📋 Quick Reference: Implementation Priority

### Phase Priority Order
1. **Phase 3** - Inventory Module (HIGHEST - Staff completely non-functional)
2. **Phase 1** - Patients Module (HIGH - Major feature gaps)
3. **Phase 2** - Appointments Module (MEDIUM - Missing critical features)
4. **Phase 4** - Billing Module (LOW - Type safety improvements only)
5. **Phase 5** - Dashboard (LOWEST - Minor comment updates)

### Estimated Implementation Time
- Phase 1: 45-60 minutes (Complex refactor with modals)
- Phase 2: 30-45 minutes (Sorting and state management)
- Phase 3: 30-40 minutes (Complete API integration)
- Phase 4: 10-15 minutes (Type definitions only)
- Phase 5: 5 minutes (Comments only)

---

## 📁 Directory Structure Reference

#### Owner Account Structure
```
app/owner/
├── analytics/          (OWNER-ONLY - DO NOT ADD TO STAFF)
├── appointments/
├── billing/
├── dashboard/
├── inventory/
├── patients/
│   └── [id]/
│       ├── appointments/
│       ├── documents/
│       ├── intake-form/
│       ├── notes/
│       ├── page.tsx
│       └── treatment-history/
├── profile/
├── services/           (OWNER-ONLY - DO NOT ADD TO STAFF)
└── staff/              (OWNER-ONLY - DO NOT ADD TO STAFF)
```

#### Staff Account Structure
```
app/staff/
├── appointments/
├── billing/
├── dashboard/
├── inventory/
├── patients/
│   └── [id]/
│       ├── files/
│       ├── intake-form/
│       ├── notes/
│       ├── page.tsx
│       └── treatments/
└── profile/
```

---

## 🔍 Identified Inconsistencies - Detailed Analysis

### 1. Patients List Page (`patients/page.tsx`)

#### Differences Found:
- **Owner**: Has `appointments` state variable fetched alongside patients (line 100)
- **Staff**: Does NOT fetch appointments data
- **Owner**: Has sorting functionality (`sortColumn`, `sortDirection` state)
- **Staff**: Missing sorting functionality
- **Owner**: Fetches both patients and appointments in parallel using `Promise.all`
- **Staff**: Only fetches patients

#### Required Changes:
1. Add sorting functionality to Staff patients page
2. Add appointments fetching to Staff patients page (if needed for functionality)
3. Ensure both use identical state management patterns

---

### 2. Appointments Page (`appointments/page.tsx`)

#### Differences Found:
- **Owner**: Has `patientDropdownRef` for managing patient dropdown
- **Staff**: Missing `patientDropdownRef` 
- **Owner**: Has `isBookingAppointment` state for form submission
- **Staff**: Missing `isBookingAppointment` state
- **Owner**: Implements more sophisticated patient search dropdown logic
- **Staff**: Has simpler patient search implementation
- **Owner**: Has sorting functionality (`sortColumn`, `sortDirection`)
- **Staff**: Missing sorting functionality

#### Required Changes:
1. Add `patientDropdownRef` to Staff for consistent dropdown behavior
2. Add `isBookingAppointment` loading state to Staff
3. Implement identical patient search dropdown logic in both
4. Add sorting functionality to Staff appointments page
5. Ensure modal logic is identical for both roles

---

### 3. Patient Detail Page (`patients/[id]/page.tsx`)

#### Major Differences Found:

**Owner Version**:
- Uses `UnifiedDocumentUpload` component
- Has `selectedImage` and `selectedDocument` states for viewing
- Implements full image/document viewing with modal
- Uses `BACKEND_URL` constant for full URLs
- Has clinic badge integration
- More detailed appointment interface with clinic data

**Staff Version**:
- Uses separate `TeethImageUpload` and `DocumentUpload` components
- Has `showImageUpload` and `showDocumentUpload` boolean states
- Missing image/document viewing functionality
- Simpler implementation without URL constants
- Missing clinic badge integration
- Less detailed appointment/document interfaces

#### Required Changes:
1. **Replace Staff's separate upload components with UnifiedDocumentUpload**
2. **Add viewing states**: `selectedImage`, `selectedDocument`
3. **Add constants**: `API_BASE_URL`, `BACKEND_URL`
4. **Enhance interfaces**: Add clinic data fields to Appointment, Document, TeethImage
5. **Add ClinicBadge component** to Staff patient detail
6. **Implement image/document viewing modals** in Staff version
7. **Standardize folder names**: 
   - Owner: `appointments/`, `documents/`, `treatment-history/`
   - Staff: `treatments/`, `files/`
   - Decision: Use Owner naming convention

---

### 4. Inventory Page (`inventory/page.tsx`)

#### Major Differences Found:

**Owner Version**:
- Fully functional with API integration
- Has complete state management: `inventory`, `loading`, `formData`
- Implements `fetchInventory()`, `handleInputChange()`, `handleSubmit()`
- Has form validation and error handling
- Complete modal with form fields

**Staff Version**:
- Hardcoded empty inventory array
- No state management for form data
- No API integration
- No form submission handlers
- Incomplete modal implementation (form fields exist but no handlers)

#### Required Changes:
1. **Add complete API integration** to Staff inventory
2. **Add state management**: `inventory`, `loading`, `formData`
3. **Implement handlers**: `fetchInventory`, `handleInputChange`, `handleSubmit`
4. **Add useEffect** for data fetching on mount
5. **Add error handling** and validation
6. **Complete modal functionality** with working form

---

### 5. Billing Page (`billing/page.tsx`)

#### Differences Found:

**Owner Version**:
- Uses inline patient data array
- Standard implementation

**Staff Version**:
- Has TypeScript types for better type safety (`BillingStatus`, `StatusFilter`)
- Uses state for `mockPatients` array
- Has `getStatusBadgeClass()` helper function
- Better typed implementation

#### Required Changes:
1. **Adopt Staff's TypeScript types** in Owner version for consistency
2. **Add `getStatusBadgeClass()` helper** to Owner version
3. **Ensure identical modal logic** in both versions
4. **Prepare for API integration** (both currently use mock data)

---

### 6. Dashboard Page (`dashboard/page.tsx`)

#### Differences Found:
- Both implementations are nearly identical
- Only difference: Minor comment variations
- Owner: Comment says "filter out completed and missed"
- Staff: Comment says "using local date to avoid timezone issues"

#### Required Changes:
1. **Standardize comments** for clarity
2. **Ensure identical appointment filtering logic**

---

## 🚀 PHASE 1: Patients Module Consistency

**Implementation Goal**: Make staff patients list and patient detail pages match owner's functionality exactly, including sorting, document viewing, and unified uploads.

---

### 📝 TASK 1.1: Standardize Patients List Page

**Target File**: `frontend/app/staff/patients/page.tsx`  
**Reference File**: `frontend/app/owner/patients/page.tsx`  
**Complexity**: Medium  
**Estimated Time**: 15 minutes

#### Implementation Steps:

**STEP 1.1.1: Add Sorting State Variables**

Location: After existing useState declarations (around line 30)

```typescript
// ADD THESE LINES:
const [sortColumn, setSortColumn] = useState<'name' | 'email' | 'phone' | 'lastVisit' | 'status' | null>(null)
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
const [appointments, setAppointments] = useState<any[]>([])
```

**STEP 1.1.2: Update useEffect to Fetch Appointments**

Location: Replace the existing `fetchPatients` useEffect (around line 40-60)

OLD CODE:
```typescript
useEffect(() => {
  const fetchPatients = async () => {
    if (!token) return
    
    try {
      setIsLoading(true)
      const data = await api.getPatients(token)
      setPatients(data)
    } catch (error) {
      console.error("Error fetching patients:", error)
    } finally {
      setIsLoading(false)
    }
  }

  fetchPatients()
}, [token])
```

NEW CODE:
```typescript
useEffect(() => {
  const fetchData = async () => {
    if (!token) return
    
    try {
      setIsLoading(true)
      
      // Fetch patients and appointments in parallel
      const [patientsResponse, appointmentsResponse] = await Promise.all([
        api.getPatients(token),
        api.getAppointments(token)
      ])
      
      setPatients(patientsResponse)
      setAppointments(appointmentsResponse)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  fetchData()
}, [token])
```

**STEP 1.1.3: Add Sorting Handler Function**

Location: After useEffect, before the return statement (around line 65)

```typescript
// ADD THIS FUNCTION:
const handleSort = (column: 'name' | 'email' | 'phone' | 'lastVisit' | 'status') => {
  if (sortColumn === column) {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
  } else {
    setSortColumn(column)
    setSortDirection('asc')
  }
}
```

**STEP 1.1.4: Add Sorted Patients Logic**

Location: After handleSort function

```typescript
// ADD THIS FUNCTION:
const getSortedPatients = () => {
  if (!sortColumn) return filteredPatients

  return [...filteredPatients].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortColumn) {
      case 'name':
        aValue = `${a.first_name} ${a.last_name}`.toLowerCase()
        bValue = `${b.first_name} ${b.last_name}`.toLowerCase()
        break
      case 'email':
        aValue = a.email.toLowerCase()
        bValue = b.email.toLowerCase()
        break
      case 'phone':
        aValue = a.phone_number || ''
        bValue = b.phone_number || ''
        break
      case 'lastVisit':
        // Get most recent appointment for each patient
        const aAppointments = appointments.filter(apt => apt.patient === a.id)
        const bAppointments = appointments.filter(apt => apt.patient === b.id)
        aValue = aAppointments.length > 0 ? new Date(Math.max(...aAppointments.map(apt => new Date(apt.date).getTime()))) : new Date(0)
        bValue = bAppointments.length > 0 ? new Date(Math.max(...bAppointments.map(apt => new Date(apt.date).getTime()))) : new Date(0)
        break
      case 'status':
        aValue = a.is_active ? 'active' : 'inactive'
        bValue = b.is_active ? 'active' : 'inactive'
        break
      default:
        return 0
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })
}

// ADD THIS HELPER FUNCTION:
const formatLastVisit = (patientId: number) => {
  const patientAppointments = appointments.filter(apt => apt.patient === patientId)
  if (patientAppointments.length === 0) return 'No visits'
  
  const mostRecent = patientAppointments.reduce((latest, current) => {
    return new Date(current.date) > new Date(latest.date) ? current : latest
  })
  
  return new Date(mostRecent.date).toLocaleDateString()
}
```

**STEP 1.1.5: Update Table Headers to be Sortable**

Location: In the table <thead> section (around line 150-180)

Find each `<th>` and replace with sortable version. Example for "Patient Name":

OLD CODE:
```typescript
<th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  Patient Name
</th>
```

NEW CODE:
```typescript
<th 
  className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors"
  onClick={() => handleSort('name')}
>
  <div className="flex items-center gap-2">
    Patient Name
    {sortColumn === 'name' && (
      sortDirection === 'asc' ? 
        <ChevronUp className="w-4 h-4" /> : 
        <ChevronDown className="w-4 h-4" />
    )}
  </div>
</th>
```

Repeat for: `email`, `phone`, `lastVisit`, `status` columns.

**STEP 1.1.6: Add Import for Icons**

Location: Top of file, in the imports section

```typescript
// ADD TO EXISTING lucide-react IMPORT:
import { Search, Plus, ChevronUp, ChevronDown } from "lucide-react"
```

**STEP 1.1.7: Update Patients Rendering**

Location: In the map function rendering patients (around line 200)

OLD CODE:
```typescript
{filteredPatients.map((patient) => (
```

NEW CODE:
```typescript
{getSortedPatients().map((patient) => (
```

Also ADD this in the table row to display last visit:

```typescript
<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  {formatLastVisit(patient.id)}
</td>
```

---

### ✅ VERIFICATION TASK 1.1: Test Patients List Sorting

**Execute immediately after implementing Task 1.1**

#### Verification Steps:

1. **Check for TypeScript Errors**
```
Run: get_errors tool on frontend/app/staff/patients/page.tsx
Expected: No errors
```

2. **Start Development Server** (if not running)
```bash
cd frontend
pnpm dev
```

3. **Manual Testing Checklist**:
- [ ] Navigate to Staff Login → Patients page
- [ ] Verify patients list loads without errors
- [ ] Click "Patient Name" header → verify sorting toggles asc/desc
- [ ] Click "Email" header → verify email sorting works
- [ ] Click "Phone" header → verify phone sorting works
- [ ] Click "Last Visit" header → verify date sorting works
- [ ] Click "Status" header → verify status sorting works
- [ ] Verify sort icons (ChevronUp/ChevronDown) appear on active column
- [ ] Verify "Last Visit" column displays dates or "No visits"
- [ ] Check browser console for errors → should be none

4. **Expected Outcomes**:
- All columns are clickable and show hover effect
- Sorting icons appear on the active column
- Data sorts correctly in ascending/descending order
- No console errors
- Page performance is smooth

5. **Troubleshooting**:
- If "appointments is undefined" error: Check that appointments state was added and Promise.all syntax is correct
- If sorting doesn't work: Verify handleSort function is defined and called in onClick
- If icons don't show: Check ChevronUp/ChevronDown import from lucide-react

**STOP HERE** - Do not proceed to Task 1.2 until all verification checks pass.

---

### 📝 TASK 1.2: Standardize Patient Detail Page

**Target File**: `frontend/app/staff/patients/[id]/page.tsx`  
**Reference File**: `frontend/app/owner/patients/[id]/page.tsx`  
**Complexity**: High (Major refactor with modals)  
**Estimated Time**: 30-45 minutes

#### Implementation Steps:

**STEP 1.2.1: Update Imports Section**

Location: Top of file (lines 1-20)

FIND the existing imports and ADD/MODIFY:

```typescript
// ADD these imports:
import { Download, X, Clock, MapPin, User } from "lucide-react"

// REMOVE these imports if present:
// import { Image, Mail, Phone, Cake, ChevronDown, ChevronRight } from "lucide-react"

// ADD these component imports:
import UnifiedDocumentUpload from "@/components/unified-document-upload"
import { ClinicBadge } from "@/components/clinic-badge"
```

**STEP 1.2.2: Add Constants**

Location: After imports, before the component function (around line 25)

```typescript
// ADD THESE CONSTANTS:
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
const BACKEND_URL = API_BASE_URL.replace('/api', '')
```

**STEP 1.2.3: Enhance TypeScript Interfaces**

Location: After constants, replace existing interfaces (around line 30-70)

OLD CODE (partial):
```typescript
interface Appointment {
  id: number
  date: string
  time: string
  service: any
  dentist: any
  status: string
  notes: string
}
```

NEW CODE (complete enhanced interfaces):
```typescript
interface Appointment {
  id: number
  date: string
  time: string
  service: any
  service_name?: string
  service_color?: string
  dentist: any
  dentist_name?: string
  status: string
  notes: string
  clinic?: number
  clinic_name?: string
  clinic_data?: {
    id: number
    name: string
    address: string
    phone: string
    color: string
  }
}

interface Document {
  id: number
  document_type: string
  document_type_display: string
  file: string
  title: string
  description?: string
  uploaded_at: string
  appointment?: number
  appointment_date?: string
  appointment_time?: string
  service_name?: string
  dentist_name?: string
}

interface TeethImage {
  id: number
  image: string
  image_type: string
  image_type_display: string
  uploaded_at: string
  notes: string
  appointment?: number
  appointment_date?: string
  appointment_time?: string
  service_name?: string
  dentist_name?: string
}

interface Treatment {
  id: number
  treatment_date: string
  procedure: string
  tooth_number?: string
  notes?: string
  cost?: number
  dentist_name?: string
  service_name?: string
  status?: string
}
```

**STEP 1.2.4: Update State Variables**

Location: Inside component function, after router declarations (around line 80-100)

REMOVE these old states:
```typescript
const [showImageUpload, setShowImageUpload] = useState(false)
const [showDocumentUpload, setShowDocumentUpload] = useState(false)
```

ADD these new states:
```typescript
const [showUploadModal, setShowUploadModal] = useState(false)
const [selectedImage, setSelectedImage] = useState<TeethImage | null>(null)
const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
```

**STEP 1.2.5: Add useEffect for Escape Key and PDF Cleanup**

Location: After fetchPatientData function (around line 200)

```typescript
// ADD THESE useEffect HOOKS:

// Handle Escape key to close modals
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelectedImage(null)
      setSelectedDocument(null)
      setShowUploadModal(false)
    }
  }
  
  window.addEventListener('keydown', handleEscape)
  return () => window.removeEventListener('keydown', handleEscape)
}, [])

// Load PDF when document is selected
useEffect(() => {
  if (selectedDocument?.file) {
    const loadPdf = async () => {
      try {
        const response = await fetch(selectedDocument.file)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setPdfBlobUrl(url)
      } catch (error) {
        console.error('Failed to load PDF:', error)
      }
    }
    loadPdf()
  } else {
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl)
    }
    setPdfBlobUrl(null)
  }
  
  return () => {
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl)
    }
  }
}, [selectedDocument])
```

**STEP 1.2.6: Add Helper Functions**

Location: After useEffect hooks, before return statement (around line 220)

```typescript
// ADD THESE HELPER FUNCTIONS:

const handleDownloadImage = async (imageUrl: string, filename: string) => {
  try {
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Download failed:', error)
    alert('Failed to download image')
  }
}

const calculateAge = (birthDate: string): number => {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}

const darkenColor = (color: string, percent: number): string => {
  const num = parseInt(color.replace("#", ""), 16)
  const amt = Math.round(2.55 * percent)
  const R = (num >> 16) - amt
  const G = (num >> 8 & 0x00FF) - amt
  const B = (num & 0x0000FF) - amt
  
  return "#" + (
    0x1000000 +
    (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 0 ? 0 : B) : 255)
  ).toString(16).slice(1)
}
```

**STEP 1.2.7: Update Patient Info Section**

Location: In the JSX, patient info card (around line 250)

FIND the birthday display and UPDATE:

OLD CODE:
```typescript
<p className="text-sm text-gray-500">
  {new Date(patient.birthday).toLocaleDateString()}
</p>
```

NEW CODE:
```typescript
<p className="text-sm text-gray-500">
  {new Date(patient.birthday).toLocaleDateString()} ({calculateAge(patient.birthday)} years old)
</p>
```

**STEP 1.2.8: Replace Appointments Section**

Location: Find the Appointments section (around line 300-400)

REPLACE the entire Appointments section with this enhanced version:

```typescript
{/* Appointments Section - Enhanced */}
<div className="bg-white rounded-2xl shadow-sm border border-gray-100">
  <div className="px-8 py-6 border-b border-gray-100">
    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
      <Calendar className="w-5 h-5 text-blue-600" />
      Appointments
    </h2>
  </div>
  <div className="p-8">
    {appointments.length === 0 ? (
      <p className="text-gray-500 text-center py-8">No appointments found</p>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {appointments.map((appointment) => {
          const serviceColor = appointment.service_color || appointment.service?.color || "#3B82F6"
          const darkerColor = darkenColor(serviceColor, 20)
          
          return (
            <div
              key={appointment.id}
              className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 relative overflow-hidden"
              style={{
                borderLeftWidth: '4px',
                borderLeftColor: serviceColor
              }}
            >
              {/* Clinic Badge */}
              {appointment.clinic_data && (
                <div className="mb-3">
                  <ClinicBadge clinic={appointment.clinic_data} size="sm" />
                </div>
              )}

              {/* Service Badge */}
              <div className="mb-3">
                <span 
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white"
                  style={{
                    backgroundColor: serviceColor,
                    boxShadow: `0 2px 4px ${serviceColor}40`
                  }}
                >
                  {appointment.service_name || appointment.service?.name || "Service"}
                </span>
              </div>

              {/* Date and Time */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {new Date(appointment.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{appointment.time}</span>
                </div>
              </div>

              {/* Dentist */}
              {(appointment.dentist_name || appointment.dentist?.name) && (
                <div className="flex items-center gap-2 text-sm mb-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    Dr. {appointment.dentist_name || appointment.dentist?.name}
                  </span>
                </div>
              )}

              {/* Status Badge */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                  appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  appointment.status === 'no_show' ? 'bg-gray-100 text-gray-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {appointment.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {/* Notes */}
              {appointment.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-600 line-clamp-2">{appointment.notes}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )}
  </div>
</div>
```

**STEP 1.2.9: Replace Treatment History Section**

Location: After Appointments section (around line 500-600)

REPLACE with enhanced combined view:

```typescript
{/* Treatment History - Combined View */}
<div className="bg-white rounded-2xl shadow-sm border border-gray-100">
  <div className="px-8 py-6 border-b border-gray-100">
    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
      <FileText className="w-5 h-5 text-green-600" />
      Treatment History
    </h2>
  </div>
  <div className="p-8">
    {treatments.length === 0 && appointments.filter(a => a.status === 'completed').length === 0 ? (
      <p className="text-gray-500 text-center py-8">No treatment history found</p>
    ) : (
      <div className="space-y-4">
        {/* Combine treatments and completed appointments */}
        {[
          ...treatments.map(t => ({
            type: 'treatment',
            date: t.treatment_date,
            title: t.procedure,
            details: t.notes,
            cost: t.cost,
            dentist: t.dentist_name,
            tooth: t.tooth_number
          })),
          ...appointments
            .filter(a => a.status === 'completed')
            .map(a => ({
              type: 'appointment',
              date: a.date,
              title: a.service_name || a.service?.name,
              details: a.notes,
              dentist: a.dentist_name || a.dentist?.name,
              clinic: a.clinic_data
            }))
        ]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((record, index) => (
            <div
              key={`${record.type}-${index}`}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{record.title}</h3>
                    {record.type === 'treatment' && record.tooth && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        Tooth #{record.tooth}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(record.date).toLocaleDateString()}
                    </span>
                    {record.dentist && (
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Dr. {record.dentist}
                      </span>
                    )}
                  </div>

                  {record.clinic && (
                    <div className="mb-2">
                      <ClinicBadge clinic={record.clinic} size="sm" />
                    </div>
                  )}

                  {record.details && (
                    <p className="text-sm text-gray-600 mt-2">{record.details}</p>
                  )}
                </div>

                {record.cost && (
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      ₱{record.cost.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>
    )}
  </div>
</div>
```

**STEP 1.2.10: Replace Documents & Images Section**

Location: After Treatment History (around line 700-800)

REPLACE the entire section with click-to-view version:

```typescript
{/* Documents & Images Section - Enhanced */}
<div className="bg-white rounded-2xl shadow-sm border border-gray-100">
  <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
    <button
      onClick={() => router.push(`/staff/patients/${patientId}/files`)}
      className="text-lg font-semibold text-gray-900 flex items-center gap-2 hover:text-blue-600 transition-colors"
    >
      <FileText className="w-5 h-5 text-purple-600" />
      Documents & Images
      <span className="text-sm text-gray-500 ml-2">View all</span>
    </button>
    <button
      onClick={() => setShowUploadModal(true)}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      <Upload className="w-4 h-4" />
      Upload Document
    </button>
  </div>
  <div className="p-8">
    <div className="space-y-6">
      {/* Medical Certificates */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Medical Certificates</h3>
        {documents.filter((doc) => doc.document_type === "medical_certificate").length === 0 ? (
          <p className="text-gray-500 text-sm">No medical certificates</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {documents
              .filter((doc) => doc.document_type === "medical_certificate")
              .map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocument(doc)}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                        {doc.title || "Medical Certificate"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Teeth Images & X-rays */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Teeth Images & X-rays</h3>
        {teethImages.length === 0 ? (
          <p className="text-gray-500 text-sm">No teeth images or x-rays</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {teethImages.map((img) => {
              const imageUrl = img.image.startsWith('http') ? img.image : `${BACKEND_URL}${img.image}`
              
              return (
                <div
                  key={img.id}
                  onClick={() => setSelectedImage(img)}
                  className="border border-gray-200 rounded-lg p-2 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <img
                    src={imageUrl}
                    alt={img.image_type || 'Dental image'}
                    className="w-full h-32 object-cover rounded"
                    onError={(e) => {
                      console.error('Image failed to load:', imageUrl)
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E'
                    }}
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    {img.image_type_display || "Dental Image"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(img.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Other Documents */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Other Documents</h3>
        {documents.filter((doc) => doc.document_type !== "medical_certificate").length === 0 ? (
          <p className="text-gray-500 text-sm">No other documents</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {documents
              .filter((doc) => doc.document_type !== "medical_certificate")
              .map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocument(doc)}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-8 h-8 text-gray-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600">
                          {doc.title || "Document"}
                        </p>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          {doc.document_type_display}
                        </span>
                      </div>
                      {doc.appointment_date ? (
                        <div className="mt-1">
                          <p className="text-xs text-gray-600">
                            {new Date(doc.appointment_date).toLocaleDateString()} at {doc.appointment_time}
                          </p>
                          {doc.service_name && (
                            <p className="text-xs text-gray-600 font-medium">
                              {doc.service_name}
                            </p>
                          )}
                          {doc.dentist_name && (
                            <p className="text-xs text-gray-500">
                              {doc.dentist_name}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">
                          Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  </div>
</div>
```

**STEP 1.2.11: Replace Upload Modals**

Location: After the Documents section, before closing </div> (around line 900)

REMOVE old modal code for TeethImageUpload and DocumentUpload.

ADD this unified modal:

```typescript
{/* Upload Modal - Unified */}
{showUploadModal && patient && (
  <UnifiedDocumentUpload
    patientId={Number.parseInt(patientId)}
    patientName={`${patient.first_name} ${patient.last_name}`}
    onClose={() => setShowUploadModal(false)}
    onUploadSuccess={() => {
      setShowUploadModal(false)
      fetchPatientData()
    }}
  />
)}
```

**STEP 1.2.12: Add Image Preview Modal**

Location: After upload modal

```typescript
{/* Image Preview Modal */}
{selectedImage && (
  <div 
    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={() => setSelectedImage(null)}
  >
    <div 
      className="relative max-w-5xl w-full bg-white rounded-xl overflow-hidden shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => setSelectedImage(null)}
        className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
      >
        <X className="w-6 h-6 text-gray-700" />
      </button>

      <div className="p-6">
        <div className="mb-4">
          <img 
            src={selectedImage.image.startsWith('http') ? selectedImage.image : `${BACKEND_URL}${selectedImage.image}`}
            alt={selectedImage.image_type || 'Dental image'}
            className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">
                <strong>Uploaded:</strong> {new Date(selectedImage.uploaded_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-500">
                <strong>Type:</strong> {selectedImage.image_type_display || "Dental Image"}
              </p>
              {selectedImage.appointment_date && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-1">Linked Appointment:</p>
                  <p className="text-sm text-gray-600">
                    <strong>Date:</strong> {new Date(selectedImage.appointment_date).toLocaleDateString()} at {selectedImage.appointment_time}
                  </p>
                  {selectedImage.service_name && (
                    <p className="text-sm text-gray-600">
                      <strong>Service:</strong> {selectedImage.service_name}
                    </p>
                  )}
                  {selectedImage.dentist_name && (
                    <p className="text-sm text-gray-600">
                      <strong>Dentist:</strong> {selectedImage.dentist_name}
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => handleDownloadImage(
                selectedImage.image.startsWith('http') ? selectedImage.image : `${BACKEND_URL}${selectedImage.image}`,
                `dental-image-${selectedImage.uploaded_at}.jpg`
              )}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>

          {selectedImage.notes && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
              <p className="text-sm text-gray-600">{selectedImage.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
)}
```

**STEP 1.2.13: Add Document Preview Modal**

Location: After image modal

```typescript
{/* Document Preview Modal */}
{selectedDocument && (
  <div 
    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={() => setSelectedDocument(null)}
  >
    <div 
      className="relative w-full max-w-6xl h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedDocument.title || "Document"}
          </h3>
        </div>
        <button
          onClick={() => setSelectedDocument(null)}
          className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Document Info */}
      {selectedDocument.appointment_date && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <p className="text-sm font-medium text-gray-700 mb-1">Linked Appointment:</p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>
              <strong>Date:</strong> {new Date(selectedDocument.appointment_date).toLocaleDateString()} at {selectedDocument.appointment_time}
            </span>
            {selectedDocument.service_name && (
              <span>
                <strong>Service:</strong> {selectedDocument.service_name}
              </span>
            )}
            {selectedDocument.dentist_name && (
              <span>
                <strong>Dentist:</strong> {selectedDocument.dentist_name}
              </span>
            )}
          </div>
        </div>
      )}

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-100">
        {pdfBlobUrl ? (
          <iframe
            src={pdfBlobUrl}
            className="w-full h-full border-0"
            title={selectedDocument.title || "Document Preview"}
            style={{ minHeight: '600px' }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Loading PDF...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)}
```

---

### ✅ VERIFICATION TASK 1.2: Test Patient Detail Page Enhancements

**Execute immediately after implementing Task 1.2**

#### Verification Steps:

1. **Check for TypeScript Errors**
```
Run: get_errors tool on frontend/app/staff/patients/[id]/page.tsx
Expected: No errors
```

2. **Browser Console Check**
- Open browser DevTools (F12)
- Navigate to Staff → Patients → Click any patient
- Console should have no errors (ignore warnings)

3. **Manual Testing Checklist - Patient Info**:
- [ ] Patient age displays correctly next to birthday
- [ ] All patient info fields render properly
- [ ] No missing data or undefined values

4. **Manual Testing Checklist - Appointments Section**:
- [ ] Appointments display in grid layout
- [ ] Service badges show with colors
- [ ] Clinic badges appear (if multi-clinic enabled)
- [ ] Date/time formatted correctly
- [ ] Dentist names show properly
- [ ] Status badges display with correct colors
- [ ] Notes appear if present

5. **Manual Testing Checklist - Treatment History**:
- [ ] Combines treatments and completed appointments
- [ ] Sorted by date (newest first)
- [ ] Clinic badges appear for appointments
- [ ] Tooth numbers show for treatments
- [ ] Costs display correctly
- [ ] Dentist names appear

6. **Manual Testing Checklist - Documents & Images**:
- [ ] "View all" link works
- [ ] "Upload Document" button opens UnifiedDocumentUpload modal
- [ ] Medical certificates section displays docs
- [ ] Clicking document opens preview modal
- [ ] Teeth images display in grid
- [ ] Clicking image opens image preview modal
- [ ] Other documents section shows documents

7. **Manual Testing Checklist - Image Preview Modal**:
- [ ] Image displays correctly
- [ ] Close button (X) works
- [ ] Escape key closes modal
- [ ] Click outside closes modal
- [ ] Download button works
- [ ] Uploaded date shows
- [ ] Image type displays
- [ ] Linked appointment info shows (if linked)
- [ ] Notes appear if present

8. **Manual Testing Checklist - Document Preview Modal**:
- [ ] PDF loads and displays
- [ ] Close button works
- [ ] Escape key closes modal
- [ ] Click outside closes modal
- [ ] Document title shows in header
- [ ] Linked appointment info displays
- [ ] PDF is scrollable
- [ ] No loading errors

9. **Manual Testing Checklist - Upload Modal**:
- [ ] UnifiedDocumentUpload modal opens
- [ ] Can select document type
- [ ] Can upload files
- [ ] Success message appears
- [ ] Modal closes after upload
- [ ] Page refreshes to show new document
- [ ] No console errors during upload

10. **Performance Testing**:
- [ ] Page loads in under 2 seconds
- [ ] No lag when clicking images/documents
- [ ] Modals open/close smoothly
- [ ] No memory leaks (check DevTools Performance tab)

11. **Cross-Browser Testing** (if possible):
- [ ] Chrome: All features work
- [ ] Edge: All features work
- [ ] Firefox: All features work (optional)

12. **Error Handling**:
- [ ] Broken image URLs show fallback
- [ ] Failed PDF loads show error message
- [ ] Missing data doesn't crash page
- [ ] API errors are caught and logged

13. **Compare with Owner Page**:
- [ ] Open `/owner/patients/[id]/page.tsx` side-by-side
- [ ] Visual layout matches
- [ ] All sections present in both
- [ ] Functionality identical
- [ ] No missing features in Staff version

#### Expected Outcomes:
- ✅ All sections render without errors
- ✅ Modals open/close properly with Escape key support
- ✅ Images and documents are viewable
- ✅ Upload functionality works end-to-end
- ✅ Page matches owner's design and functionality
- ✅ No TypeScript or console errors

#### Troubleshooting Common Issues:

**Issue**: Images don't load
- **Fix**: Check BACKEND_URL constant is correct
- **Fix**: Verify image URLs in browser Network tab
- **Fix**: Check image.startsWith('http') logic

**Issue**: PDF doesn't display
- **Fix**: Check pdfBlobUrl state is set correctly
- **Fix**: Verify fetch() in useEffect works
- **Fix**: Check browser console for CORS errors

**Issue**: Modals don't close
- **Fix**: Verify Escape key useEffect is added
- **Fix**: Check onClick handlers on backdrop
- **Fix**: Verify state setters are called correctly

**Issue**: UnifiedDocumentUpload not found
- **Fix**: Check import path is correct: `@/components/unified-document-upload`
- **Fix**: Verify component file exists
- **Fix**: Check for typos in component name

**Issue**: ClinicBadge not found
- **Fix**: Check import: `import { ClinicBadge } from "@/components/clinic-badge"`
- **Fix**: Verify component exists
- **Fix**: Check if it's a default or named export

**STOP HERE** - Do not proceed to Phase 2 until all Task 1.2 verifications pass.

---

## 🚀 PHASE 2: Appointments Module Consistency

**Implementation Status**: ✅ **COMPLETE** (February 3, 2026)  
**Testing Status**: ⏳ **PENDING MANUAL VERIFICATION**  
**Implementation Goal**: Make staff appointments page match owner's functionality exactly, including sorting, enhanced patient dropdown, and loading states.

**Implementation Summary**:
- ✅ Added table column sorting (5 sortable columns)
- ✅ Replaced patient select with search dropdown
- ✅ Added double submission prevention
- ✅ Added click-outside handler for dropdown
- ✅ 0 TypeScript errors
- ⏳ 42 manual test cases pending execution

**Documentation**: [APPOINTMENTS_MODULE_STANDARDIZATION_2026-02-03.md](project-documentation/fixes-and-issues/APPOINTMENTS_MODULE_STANDARDIZATION_2026-02-03.md)

---

#### Task 2.1: Standardize Appointments Page ✅ COMPLETE
**File**: `frontend/app/staff/appointments/page.tsx`

**Changes Required**:

```typescript
// 1. Add missing imports
import { useRef } from "react"
import { Hourglass } from "lucide-react"

// 2. Add missing state variables
const [isBookingAppointment, setIsBookingAppointment] = useState(false)
const [showPatientDropdown, setShowPatientDropdown] = useState(false)
const patientDropdownRef = useRef<HTMLDivElement>(null)

// 3. Add sorting functionality
const [sortColumn, setSortColumn] = useState<'patient' | 'treatment' | 'date' | 'time' | 'dentist' | 'status' | null>(null)
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

// 4. Add handleSort function
const handleSort = (column: 'patient' | 'treatment' | 'date' | 'time' | 'dentist' | 'status') => {
  if (sortColumn === column) {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
  } else {
    setSortColumn(column)
    setSortDirection('asc')
  }
}

// 5. Add sorted appointments logic
const sortedAppointments = [...displayedAppointments].sort((a, b) => {
  if (!sortColumn) return 0
  // Implement sorting logic
})

// 6. Update form submission to use isBookingAppointment
const handleSubmit = async () => {
  setIsBookingAppointment(true)
  try {
    // Booking logic
  } catch (error) {
    // Error handling
  } finally {
    setIsBookingAppointment(false)
  }
}

// 7. Add patient dropdown ref logic
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (patientDropdownRef.current && !patientDropdownRef.current.contains(event.target as Node)) {
      setShowPatientDropdown(false)
    }
  }
  
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [])

// 8. Update table headers to be sortable
<th 
  className="px-6 py-4 text-left cursor-pointer hover:bg-gray-50"
  onClick={() => handleSort('patient')}
>
  <div className="flex items-center gap-2">
    Patient
    {sortColumn === 'patient' && (
      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
    )}
  </div>
</th>
```

**Files to modify**:
- `frontend/app/staff/appointments/page.tsx`

**Files to reference**:
- `frontend/app/owner/appointments/page.tsx`

---

### Phase 3: Inventory Module Consistency

---

### 📝 TASK 3.1: Complete Staff Inventory Implementation

**Target File**: `frontend/app/staff/inventory/page.tsx`  
**Reference File**: `frontend/app/owner/inventory/page.tsx`  
**Complexity**: Medium  
**Estimated Time**: 30-40 minutes  
**WARNING**: This page is currently non-functional - handle with care

#### Implementation Steps:

**STEP 3.1.1: Add Missing Imports**

Location: Top of file

```typescript
// ADD these imports:
import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
```

**STEP 3.1.2: Add State Management**

Location: After component declaration (around line 20)

REMOVE:
```typescript
const inventory: any[] = [] // Empty hardcoded array
```

ADD:
```typescript
const { token } = useAuth()
const [inventory, setInventory] = useState<any[]>([])
const [loading, setLoading] = useState(true)
const [submitting, setSubmitting] = useState(false)
const [formData, setFormData] = useState({
  name: "",
  category: "",
  quantity: "",
  min_stock: "",
  supplier: "",
  cost: "",
})
```

**STEP 3.1.3: Add Data Fetching useEffect**

Location: After state declarations (around line 35)

```typescript
// ADD THIS useEffect:
useEffect(() => {
  fetchInventory()
}, [token])
```

**STEP 3.1.4: Add fetchInventory Function**

Location: After useEffect

```typescript
// ADD THIS FUNCTION:
const fetchInventory = async () => {
  if (!token) {
    setLoading(false)
    return
  }
  
  try {
    setLoading(true)
    const data = await api.getInventory(token)
    setInventory(data)
  } catch (error) {
    console.error("Failed to fetch inventory:", error)
    alert("Failed to load inventory. Please try again.")
  } finally {
    setLoading(false)
  }
}
```

**STEP 3.1.5: Add Form Handler Functions**

Location: After fetchInventory

```typescript
// ADD THESE FUNCTIONS:

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const { name, value } = e.target
  setFormData(prev => ({ ...prev, [name]: value }))
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  // Validation
  if (!formData.name.trim()) {
    alert("Please enter item name")
    return
  }
  if (!formData.category.trim()) {
    alert("Please select a category")
    return
  }
  if (!formData.quantity || parseInt(formData.quantity) < 0) {
    alert("Please enter valid quantity")
    return
  }
  if (!formData.min_stock || parseInt(formData.min_stock) < 0) {
    alert("Please enter valid minimum stock")
    return
  }
  if (!formData.cost || parseFloat(formData.cost) < 0) {
    alert("Please enter valid cost")
    return
  }
  
  if (!token) {
    alert("Please login to add inventory items")
    return
  }

  setSubmitting(true)
  
  try {
    // Convert string fields to numbers
    const itemData = {
      name: formData.name.trim(),
      category: formData.category,
      quantity: parseInt(formData.quantity),
      min_stock: parseInt(formData.min_stock),
      supplier: formData.supplier.trim() || "N/A",
      cost: parseFloat(formData.cost),
    }

    await api.createInventoryItem(itemData, token)
    
    // Reset form
    setFormData({
      name: "",
      category: "",
      quantity: "",
      min_stock: "",
      supplier: "",
      cost: "",
    })
    
    // Close modal and refresh inventory
    setShowAddModal(false)
    await fetchInventory()
    
    alert("Inventory item added successfully!")
  } catch (error: any) {
    console.error("Failed to add inventory item:", error)
    alert(error.message || "Failed to add inventory item. Please try again.")
  } finally {
    setSubmitting(false)
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
```

**STEP 3.1.6: Update Loading State in JSX**

Location: In return statement, before table (around line 100)

ADD loading indicator:

```typescript
{loading ? (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading inventory...</p>
    </div>
  </div>
) : inventory.length === 0 ? (
  <div className="text-center py-12">
    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
    <p className="text-gray-600 mb-4">No inventory items yet</p>
    <button
      onClick={() => setShowAddModal(true)}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Add First Item
    </button>
  </div>
) : (
  <table className="w-full">
    {/* Existing table content */}
  </table>
)}
```

**STEP 3.1.7: Update Form in Modal**

Location: In add modal form (around line 200-300)

UPDATE form tag:
```typescript
<form onSubmit={handleSubmit} className="p-6 space-y-4">
```

UPDATE each input field. Example for name:

OLD CODE:
```typescript
<input
  type="text"
  placeholder="Item Name"
  className="w-full px-4 py-2.5 border rounded-lg"
/>
```

NEW CODE:
```typescript
<input
  type="text"
  name="name"
  value={formData.name}
  onChange={handleInputChange}
  placeholder="Item Name"
  required
  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```

Repeat for ALL form fields: `category` (select), `quantity`, `min_stock`, `supplier`, `cost`

**STEP 3.1.8: Update Category Select Field**

Location: In modal form

OLD CODE:
```typescript
<input type="text" placeholder="Category" />
```

NEW CODE:
```typescript
<select
  name="category"
  value={formData.category}
  onChange={handleInputChange}
  required
  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <option value="">Select Category</option>
  <option value="dental_supplies">Dental Supplies</option>
  <option value="equipment">Equipment</option>
  <option value="medications">Medications</option>
  <option value="office_supplies">Office Supplies</option>
  <option value="cleaning">Cleaning Supplies</option>
  <option value="other">Other</option>
</select>
```

**STEP 3.1.9: Update Submit Button**

Location: In modal form, at bottom

OLD CODE:
```typescript
<button
  type="submit"
  className="w-full bg-blue-600 text-white py-3 rounded-lg"
>
  Add Item
</button>
```

NEW CODE:
```typescript
<button
  type="submit"
  disabled={submitting}
  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
>
  {submitting ? (
    <>
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      Adding...
    </>
  ) : (
    'Add Item'
  )}
</button>
```

**STEP 3.1.10: Update Inventory Table Rendering**

Location: In table body (around line 150)

ENSURE table uses `inventory` state:

```typescript
<tbody className="bg-white divide-y divide-gray-200">
  {inventory.map((item) => (
    <tr key={item.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {item.name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {item.category.replace('_', ' ').toUpperCase()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {item.quantity}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          item.quantity <= item.min_stock 
            ? 'bg-red-100 text-red-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {item.quantity <= item.min_stock ? 'Low Stock' : 'In Stock'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {item.supplier || 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ₱{item.cost.toFixed(2)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDate(item.created_at)}
      </td>
    </tr>
  ))}
</tbody>
```

---

### ✅ VERIFICATION TASK 3.1: Test Inventory Functionality

**Execute immediately after implementing Task 3.1**  
**CRITICAL**: This page was previously non-functional - thorough testing required

#### Verification Steps:

1. **Check TypeScript Errors**
```
Run: get_errors tool on frontend/app/staff/inventory/page.tsx
Expected: No errors
```

2. **Backend Verification** (IMPORTANT):
- [ ] Verify backend server is running on port 8000
- [ ] Test API endpoint manually:
  ```bash
  curl http://localhost:8000/api/inventory/ -H "Authorization: Token YOUR_TOKEN"
  ```
- [ ] Should return JSON array (may be empty)

3. **Manual Testing Checklist - Data Loading**:
- [ ] Navigate to Staff → Inventory
- [ ] Verify loading spinner appears initially
- [ ] Verify inventory loads (or shows "No items" message)
- [ ] Check browser console for errors → should be none
- [ ] Check Network tab → API call should succeed (200 OK)

4. **Manual Testing Checklist - Add Item Form**:
- [ ] Click "Add Item" button
- [ ] Verify modal opens
- [ ] Fill in all fields:
  - Name: "Test Item"
  - Category: "Dental Supplies"
  - Quantity: 50
  - Min Stock: 10
  - Supplier: "Test Supplier"
  - Cost: 100.00
- [ ] Click "Add Item" button
- [ ] Verify "Adding..." state shows
- [ ] Verify success alert appears
- [ ] Verify modal closes
- [ ] Verify new item appears in table
- [ ] Verify form resets if modal reopened

5. **Manual Testing Checklist - Form Validation**:
- [ ] Open add modal
- [ ] Try submitting with empty name → should show alert
- [ ] Try submitting with no category → should show alert
- [ ] Try negative quantity → should show alert
- [ ] Try negative min_stock → should show alert
- [ ] Try negative cost → should show alert
- [ ] Try valid data → should succeed

6. **Manual Testing Checklist - Display Logic**:
- [ ] Add item with quantity > min_stock
- [ ] Verify "In Stock" badge shows (green)
- [ ] Add item with quantity <= min_stock
- [ ] Verify "Low Stock" badge shows (red)
- [ ] Verify category displays with proper formatting
- [ ] Verify cost shows with ₱ symbol and 2 decimals
- [ ] Verify date formatting is correct

7. **Manual Testing Checklist - Compare with Owner**:
- [ ] Open `/owner/inventory` side-by-side
- [ ] Verify same items appear in both
- [ ] Verify add functionality works identically
- [ ] Verify visual layout matches
- [ ] Verify form fields are identical

8. **Error Handling Testing**:
- [ ] Stop backend server
- [ ] Reload inventory page
- [ ] Verify graceful error handling (alert or message)
- [ ] Restart backend
- [ ] Refresh page
- [ ] Verify data loads correctly

9. **Performance Testing**:
- [ ] Add 10+ items
- [ ] Verify table renders without lag
- [ ] Verify no memory leaks (DevTools Memory tab)

#### Expected Outcomes:
- ✅ Inventory loads from API successfully
- ✅ Add item form works end-to-end
- ✅ Validation prevents invalid submissions
- ✅ Loading states show during async operations
- ✅ Error handling is graceful
- ✅ Data displays correctly with proper formatting
- ✅ Low stock warnings work
- ✅ No TypeScript or console errors
- ✅ Matches owner page functionality

#### Troubleshooting:

**Issue**: API call fails with 401 Unauthorized
- **Fix**: Check token is stored in localStorage
- **Fix**: Verify useAuth hook returns valid token
- **Fix**: Check backend authentication middleware

**Issue**: API call fails with 404
- **Fix**: Verify backend URL is correct (check .env)
- **Fix**: Check api.getInventory() function exists in lib/api.ts
- **Fix**: Verify backend route is /api/inventory/

**Issue**: Form doesn't submit
- **Fix**: Check handleSubmit is called in form onSubmit
- **Fix**: Verify all required fields have values
- **Fix**: Check browser console for validation errors

**Issue**: Items don't appear after adding
- **Fix**: Verify fetchInventory() is called after success
- **Fix**: Check API returns new item or fetchInventory refetches
- **Fix**: Verify inventory state is being updated

**Issue**: Infinite loading spinner
- **Fix**: Check finally block sets loading to false
- **Fix**: Verify try-catch handles errors properly
- **Fix**: Check network tab for failed requests

**CRITICAL**: Do not proceed to Phase 4 until inventory is fully functional and all tests pass.

---

## 🚀 PHASE 4: Billing Module Consistency (Low Priority)

**Implementation Goal**: Add TypeScript type definitions for better type safety in both staff and owner billing pages.

---

### 📝 TASK 4.1: Standardize Billing Type Definitions

**Target Files**: 
- `frontend/app/owner/billing/page.tsx`
- `frontend/app/staff/billing/page.tsx`

**Complexity**: Low  
**Estimated Time**: 10-15 minutes  
**Note**: Changes to BOTH files to achieve consistency

#### Implementation Steps:

**STEP 4.1.1: Add TypeScript Types to Owner File**

Location: Top of `frontend/app/owner/billing/page.tsx`, after imports (around line 10)

```typescript
// ADD THESE TYPE DEFINITIONS:
type BillingStatus = "pending" | "paid" | "cancelled"
type StatusFilter = "all" | BillingStatus

interface Billing {
  id: number
  patient: string
  amount: number
  date: string
  status: BillingStatus
}

interface Patient {
  id: number
  name: string
  email: string
}
```

**STEP 4.1.2: Add Helper Function to Owner File**

Location: After type definitions, before component function

```typescript
// ADD THIS HELPER FUNCTION:
const getStatusBadgeClass = (status: BillingStatus): string => {
  if (status === 'paid') return 'bg-green-100 text-green-700'
  if (status === 'cancelled') return 'bg-gray-100 text-gray-700'
  return 'bg-amber-100 text-amber-700'
}
```

**STEP 4.1.3: Update Status Badge Rendering in Owner File**

Location: In JSX where status is displayed (around line 200)

OLD CODE:
```typescript
<span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
  billing.status === 'paid' ? 'bg-green-100 text-green-700' :
  billing.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
  'bg-amber-100 text-amber-700'
}`}>
  {billing.status}
</span>
```

NEW CODE:
```typescript
<span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(billing.status)}`}>
  {billing.status}
</span>
```

**STEP 4.1.4: Update Mock Data Type in Owner File**

Location: Where mock data is defined (around line 50)

OLD CODE:
```typescript
const mockPatients = [
```

NEW CODE:
```typescript
const mockPatients: Billing[] = [
```

**STEP 4.1.5: Verify Staff File Has Same Changes**

Location: `frontend/app/staff/billing/page.tsx`

VERIFY these exist (Staff file should already have them):
- TypeScript type definitions (BillingStatus, StatusFilter, Billing, Patient)
- getStatusBadgeClass helper function
- Properly typed mock data: `const mockPatients: Billing[] = []`
- Usage of helper function in JSX

If missing, ADD them following steps 4.1.1-4.1.4 above.

---

### ✅ VERIFICATION TASK 4.1: Test Billing Type Consistency

**Execute immediately after implementing Task 4.1**

#### Verification Steps:

1. **Check TypeScript Errors**
```
Run: get_errors tool on:
- frontend/app/owner/billing/page.tsx
- frontend/app/staff/billing/page.tsx
Expected: No errors in either file
```

2. **Code Comparison Check**:
- [ ] Open both files side-by-side
- [ ] Verify type definitions are identical
- [ ] Verify getStatusBadgeClass function is identical
- [ ] Verify both use same status badge rendering
- [ ] Verify both have typed mock data

3. **Manual Testing Checklist - Owner Billing**:
- [ ] Navigate to Owner → Billing
- [ ] Verify page loads without errors
- [ ] Verify status badges display with correct colors:
  - Paid → Green background
  - Cancelled → Gray background
  - Pending → Amber/Yellow background
- [ ] Verify no console errors
- [ ] Verify filtering by status works

4. **Manual Testing Checklist - Staff Billing**:
- [ ] Navigate to Staff → Billing
- [ ] Verify page loads without errors
- [ ] Verify status badges match owner's colors exactly
- [ ] Verify filtering works identically to owner
- [ ] Verify layout and styling match

5. **TypeScript IntelliSense Check**:
- [ ] In VSCode, hover over `billing.status` in owner file
- [ ] Verify type shows as `BillingStatus`
- [ ] Verify autocomplete suggests "pending" | "paid" | "cancelled"
- [ ] Repeat for staff file - should be identical

#### Expected Outcomes:
- ✅ No TypeScript errors in either file
- ✅ Type definitions are identical
- ✅ Status badges render identically
- ✅ IntelliSense works for status types
- ✅ Code is more maintainable with explicit types

#### Troubleshooting:

**Issue**: TypeScript errors about status types
- **Fix**: Ensure BillingStatus type is defined before use
- **Fix**: Verify mock data uses valid status values only
- **Fix**: Check function return type is explicit

**Issue**: Colors don't match between pages
- **Fix**: Verify getStatusBadgeClass returns exact same classes
- **Fix**: Check Tailwind classes are spelled correctly
- **Fix**: Ensure function is being called in both files

**STOP HERE** - Verify all checks pass before proceeding to Phase 5.

---

## 🚀 PHASE 5: Dashboard Consistency (Lowest Priority)

**Implementation Goal**: Standardize comments and ensure appointment filtering logic is identical.

---

### 📝 TASK 5.1: Standardize Dashboard Comments and Logic

**Target Files**: 
- `frontend/app/owner/dashboard/page.tsx`
- `frontend/app/staff/dashboard/page.tsx`

**Complexity**: Very Low  
**Estimated Time**: 5 minutes  
**Note**: Minor consistency improvements only

#### Implementation Steps:

**STEP 5.1.1: Review Current State**

Action: Open both dashboard files side-by-side

VERIFY the following are IDENTICAL:
- Appointment filtering logic (filtering out completed/missed)
- Date calculation methods
- Calendar functionality
- State management

**STEP 5.1.2: Standardize Comment About Filtering**

Location: Where appointments are filtered (around line 100-150 in both files)

FIND similar comment about filtering and MAKE IDENTICAL in both files:

STANDARDIZED COMMENT:
```typescript
// Filter upcoming appointments - exclude completed and missed
// Using local date comparison to avoid timezone issues
const upcomingAppointments = appointments.filter(apt => {
  const appointmentDate = new Date(apt.date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return appointmentDate >= today && 
         apt.status !== 'completed' && 
         apt.status !== 'cancelled' &&
         apt.status !== 'no_show'
})
```

**STEP 5.1.3: Verify Identical Logic**

ENSURE both files have EXACTLY the same:
1. Filter conditions
2. Status exclusions
3. Date comparison logic
4. Variable names

If different, UPDATE to match owner's implementation.

**STEP 5.1.4: Standardize Other Comments**

Location: Throughout both dashboard files

STANDARDIZE these common sections:
- Stats calculation comments
- Calendar rendering comments
- Appointment list rendering comments

Make wording identical for clarity.

---

### ✅ VERIFICATION TASK 5.1: Test Dashboard Consistency

**Execute immediately after implementing Task 5.1**

#### Verification Steps:

1. **Check TypeScript Errors**
```
Run: get_errors tool on:
- frontend/app/owner/dashboard/page.tsx
- frontend/app/staff/dashboard/page.tsx
Expected: No errors
```

2. **Code Comparison**:
- [ ] Use diff tool or side-by-side view
- [ ] Verify appointment filtering logic is byte-for-byte identical
- [ ] Verify comments are identical
- [ ] Verify no functional differences

3. **Manual Testing Checklist - Owner Dashboard**:
- [ ] Navigate to Owner → Dashboard
- [ ] Note count of "Today's Appointments"
- [ ] Note count of "Upcoming Appointments"
- [ ] Note count of "Total Patients"
- [ ] Verify calendar shows appointments
- [ ] Check appointment list displays correctly

4. **Manual Testing Checklist - Staff Dashboard**:
- [ ] Navigate to Staff → Dashboard
- [ ] Verify counts match owner dashboard
- [ ] Verify calendar displays identically
- [ ] Verify appointment list matches
- [ ] Verify no visual differences

5. **Functional Testing**:
- [ ] Create test appointment with today's date
- [ ] Verify it appears on both dashboards
- [ ] Mark appointment as completed
- [ ] Verify it disappears from upcoming lists on both dashboards
- [ ] Verify counts update correctly

#### Expected Outcomes:
- ✅ No TypeScript errors
- ✅ Filtering logic is identical
- ✅ Comments are standardized
- ✅ Both dashboards display same data
- ✅ Both dashboards have same functionality

#### Troubleshooting:

**Issue**: Different appointment counts between dashboards
- **Fix**: Verify filter logic is identical
- **Fix**: Check status exclusions match
- **Fix**: Verify date comparison uses same method

**Issue**: Comments don't match
- **Fix**: Copy exact comment text from one file to other
- **Fix**: Verify no extra spaces or formatting differences

**This completes Phase 5** - All phases are now finished!

---

## 📊 Final Verification Checklist

**Execute after ALL phases are complete**

### Complete System Test

#### 1. TypeScript Compilation Check
```bash
cd frontend
pnpm run build
```
Expected: Build succeeds with no errors

#### 2. Full Module Testing Matrix

| Module | Owner Tests | Staff Tests | Consistency Check |
|--------|------------|-------------|-------------------|
| **Patients List** | ✅ Loads<br>✅ Sorts<br>✅ Searches | ✅ Loads<br>✅ Sorts<br>✅ Searches | ✅ Visual match<br>✅ Same functionality |
| **Patient Detail** | ✅ Info displays<br>✅ Appointments<br>✅ Treatments<br>✅ Documents<br>✅ Upload works<br>✅ View modals | ✅ Info displays<br>✅ Appointments<br>✅ Treatments<br>✅ Documents<br>✅ Upload works<br>✅ View modals | ✅ Same layout<br>✅ Same modals<br>✅ Same components |
| **Appointments** | ✅ Loads<br>✅ Sorts<br>✅ Books<br>✅ Loading state | ✅ Loads<br>✅ Sorts<br>✅ Books<br>✅ Loading state | ✅ Same form<br>✅ Same dropdown<br>✅ Same sorting |
| **Inventory** | ✅ Loads from API<br>✅ Adds items<br>✅ Validates | ✅ Loads from API<br>✅ Adds items<br>✅ Validates | ✅ Same functionality<br>✅ Same form fields |
| **Billing** | ✅ Types defined<br>✅ Status badges | ✅ Types defined<br>✅ Status badges | ✅ Same types<br>✅ Same colors |
| **Dashboard** | ✅ Displays data<br>✅ Calendar<br>✅ Filters | ✅ Displays data<br>✅ Calendar<br>✅ Filters | ✅ Same logic<br>✅ Same comments |

#### 3. Cross-User Journey Test

**Test Scenario**: Complete Patient Workflow

1. **As Owner**:
   - [ ] Add new patient from Patients page
   - [ ] View patient detail page
   - [ ] Upload document via UnifiedDocumentUpload
   - [ ] View uploaded document in modal
   - [ ] Book appointment for patient
   - [ ] Note appointment ID

2. **As Staff** (using same patient):
   - [ ] Find patient in Patients list using search
   - [ ] Sort by patient name - verify patient appears
   - [ ] Click patient to view detail page
   - [ ] Verify appointment booked by owner appears
   - [ ] Verify document uploaded by owner appears
   - [ ] Click document to view in modal
   - [ ] Upload new document via UnifiedDocumentUpload
   - [ ] Verify both documents now visible

3. **Verify Consistency**:
   - [ ] Both users see same patient data
   - [ ] Both users see both uploaded documents
   - [ ] Both users see same appointment
   - [ ] Both interfaces look identical
   - [ ] Both work without errors

#### 4. Performance Checks

- [ ] All pages load in < 2 seconds
- [ ] Sorting is instant (< 100ms)
- [ ] Modals open/close smoothly
- [ ] No memory leaks after 5 minutes of use
- [ ] API calls complete in < 1 second

#### 5. Error Handling Checks

Test each scenario:
- [ ] Network failure during API call → Shows error message
- [ ] Invalid form submission → Shows validation error
- [ ] Broken image URL → Shows fallback
- [ ] PDF load failure → Shows error message
- [ ] Unauthorized access → Redirects to login

#### 6. Browser Compatibility

Test in:
- [ ] Chrome/Edge (primary)
- [ ] Firefox (if required)
- [ ] Safari (if on Mac)

#### 7. Regression Testing

Verify nothing broke:
- [ ] Login still works for both roles
- [ ] Logout works
- [ ] Profile page accessible
- [ ] Navigation between pages works
- [ ] Back button works correctly

---

## 🎯 Success Criteria

All phases are successfully completed when:

1. ✅ **No TypeScript Errors**: All files compile without errors
2. ✅ **Functional Parity**: Staff and Owner have identical functionality for shared features
3. ✅ **Visual Consistency**: UIs look the same between roles (excluding owner-only sections)
4. ✅ **No Regressions**: Existing functionality still works
5. ✅ **Tests Pass**: All verification tasks completed successfully
6. ✅ **Documentation Updated**: Any changes documented
7. ✅ **Code Review Ready**: Code is clean and follows best practices

---

## 📝 Implementation Notes for Future Maintenance

### Adding New Features

When adding new features that should appear in both Staff and Owner:

1. **Plan First**: Decide if feature is shared or role-specific
2. **Implement in Owner First**: Get it working in owner account
3. **Copy to Staff**: Use this plan as template to copy to staff
4. **Test Both**: Verify functionality matches exactly
5. **Document**: Update this plan if process differs

### Common Pitfalls to Avoid

1. ❌ **Don't** copy owner-only features to staff (Analytics, Services, Staff Management)
2. ❌ **Don't** implement features differently in each role
3. ❌ **Don't** skip verification steps
4. ❌ **Don't** forget to update imports when copying components
5. ❌ **Don't** hardcode values - use constants and env variables

### Recommended Tools

- **VS Code Extensions**:
  - ES7+ React/Redux/React-Native snippets
  - TypeScript Error Translator
  - Tailwind CSS IntelliSense
  - Pretty TypeScript Errors

- **Testing Tools**:
  - React DevTools (Chrome Extension)
  - Redux DevTools (if using Redux)
  - Network tab in browser DevTools

---

## 🔧 Troubleshooting Common Issues

### Issue: "Module not found" errors

**Cause**: Import paths incorrect after copying code  
**Fix**:
1. Check if path uses `/owner/` instead of `/staff/`
2. Verify component exists at import path
3. Check for typos in import statements
4. Restart TypeScript server in VSCode (`Ctrl+Shift+P` → "TypeScript: Restart TS Server")

### Issue: Infinite render loop

**Cause**: useEffect dependency array incorrect  
**Fix**:
1. Check useEffect dependency arrays
2. Ensure state setters aren't called unconditionally in render
3. Use `useCallback` for function dependencies
4. Add ESLint exhaustive-deps rule

### Issue: Stale data after mutations

**Cause**: Not refetching data after changes  
**Fix**:
1. Call `fetchData()` after successful mutations
2. Invalidate cache if using React Query
3. Update local state optimistically
4. Check API returns updated data

### Issue: TypeScript errors about types

**Cause**: Interfaces not matching API responses  
**Fix**:
1. Check API response structure in Network tab
2. Update interfaces to match actual data
3. Use optional chaining (`?.`) for optional fields
4. Add proper null checks

### Issue: Modal doesn't close

**Cause**: State not being updated correctly  
**Fix**:
1. Verify state setter is called: `setShowModal(false)`
2. Check click handlers on backdrop/close button
3. Ensure Escape key handler is added
4. Verify no errors preventing state update

---

## 📚 Additional Resources

### Documentation Links

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Hooks Reference](https://react.dev/reference/react)

### Project-Specific Docs

- Backend API: `backend/api/views.py`
- API Client: `frontend/lib/api.ts`
- Auth System: `frontend/lib/auth.tsx`
- Shared Components: `frontend/components/`

---

## ✅ Completion Checklist

Before marking this plan as complete:

- [ ] All 5 phases implemented
- [ ] All verification tasks completed
- [ ] No TypeScript errors
- [ ] All manual tests passed
- [ ] Performance acceptable
- [ ] Error handling tested
- [ ] Browser compatibility confirmed
- [ ] Regression tests passed
- [ ] Code reviewed (if applicable)
- [ ] Documentation updated
- [ ] Success criteria met
- [ ] Git commits made with clear messages

---

## 🎉 End of Comprehensive Implementation Plan

This plan provides step-by-step instructions with immediate verification for achieving complete consistency between Staff and Owner accounts. Follow phases in priority order, verify each step, and ensure thorough testing.

**Questions or Issues?**
- Check Troubleshooting section above
- Review verification tasks for specific phase
- Examine reference files (owner versions)
- Test in isolation before integration

**Good luck with implementation!** 🚀

### Files to Modify (Staff Account)
1. `frontend/app/staff/patients/page.tsx` - Add sorting, appointments fetching
2. `frontend/app/staff/patients/[id]/page.tsx` - Major refactor to use UnifiedDocumentUpload, add viewing
3. `frontend/app/staff/appointments/page.tsx` - Add sorting, refs, loading states
4. `frontend/app/staff/inventory/page.tsx` - Complete API integration
5. `frontend/app/staff/billing/page.tsx` - Minor type updates
6. `frontend/app/staff/dashboard/page.tsx` - Comment standardization

### Files to Modify (Owner Account)
1. `frontend/app/owner/billing/page.tsx` - Add TypeScript types, helper function
2. `frontend/app/owner/dashboard/page.tsx` - Comment standardization

### Files to Reference (Do Not Modify)
- `frontend/app/owner/patients/page.tsx`
- `frontend/app/owner/patients/[id]/page.tsx`
- `frontend/app/owner/appointments/page.tsx`
- `frontend/app/owner/inventory/page.tsx`

### Shared Components (Already Exist)
- `frontend/components/unified-document-upload.tsx`
- `frontend/components/clinic-badge.tsx`
- `frontend/components/appointment-success-modal.tsx`
- `frontend/components/confirmation-modal.tsx`
- `frontend/components/block-time-modal.tsx`
- `frontend/components/block-time-success-modal.tsx`

---

## Implementation Priority

### High Priority (Core Functionality)
1. **Phase 3**: Inventory Module - Staff currently non-functional
2. **Phase 1.2**: Patient Detail Page - Major feature gaps
3. **Phase 2.1**: Appointments Page - Missing critical features

### Medium Priority (Improvements)
4. **Phase 1.1**: Patients List Page - Missing sorting
5. **Phase 4.1**: Billing Module - Type safety improvements

### Low Priority (Polish)
6. **Phase 5.1**: Dashboard - Minor comment updates

---

## Notes for LLM Implementation

### General Guidelines
1. **Copy, don't recreate**: When standardizing, copy working code from Owner to Staff
2. **Preserve user experience**: Ensure no functionality is lost during refactoring
3. **Test incrementally**: Test each phase before moving to next
4. **Maintain type safety**: Use TypeScript types consistently
5. **Keep API calls identical**: Both roles should call same endpoints with same parameters

### Error Prevention
1. Always check if states/refs exist before using them
2. Add proper TypeScript types to prevent runtime errors
3. Use optional chaining (`?.`) when accessing nested properties
4. Add loading states for all async operations
5. Include try-catch blocks for all API calls

### Code Style
1. Use identical component structure in both files
2. Keep same variable naming conventions
3. Maintain consistent indentation and formatting
4. Use same comment style and detail level
5. Order imports alphabetically

---

## Expected Outcomes

After completing this plan:

1. ✅ Staff and Owner accounts will have **identical** component structures for shared features
2. ✅ All table sorting will work consistently across both roles
3. ✅ Patient detail pages will use the same upload/viewing components
4. ✅ Staff inventory will be fully functional with API integration
5. ✅ TypeScript types will be consistent and comprehensive
6. ✅ Code will be maintainable with less duplication of effort
7. ✅ Testing will be easier with predictable, consistent behavior

---

## Appendix: Key Differences Summary Table

| Feature | Owner Implementation | Staff Implementation | Action Required |
|---------|---------------------|---------------------|-----------------|
| Patients List - Sorting | ✅ Implemented | ❌ Missing | Add to Staff |
| Patients List - Appointments Fetch | ✅ Fetches | ❌ Doesn't fetch | Add to Staff |
| Patient Detail - Upload Component | UnifiedDocumentUpload | Separate components | Change Staff to Unified |
| Patient Detail - Viewing | ✅ Full modals | ❌ No viewing | Add to Staff |
| Patient Detail - Clinic Badges | ✅ Shows badges | ❌ No badges | Add to Staff |
| Appointments - Sorting | ✅ Implemented | ❌ Missing | Add to Staff |
| Appointments - Patient Dropdown Ref | ✅ Has ref | ❌ No ref | Add to Staff |
| Appointments - Loading State | ✅ isBookingAppointment | ❌ Missing | Add to Staff |
| Inventory - API Integration | ✅ Full integration | ❌ Empty/mock | Implement in Staff |
| Inventory - Form Handlers | ✅ All handlers | ❌ Missing | Add to Staff |
| Billing - TypeScript Types | ⚠️ Basic | ✅ Better typed | Update Owner |
| Billing - Helper Functions | ❌ Missing | ✅ Has helper | Add to Owner |
| Dashboard | ✅ Complete | ✅ Complete | Minor comments |

---

## End of Plan

This plan provides complete, actionable steps to achieve consistency between Staff and Owner accounts. Implement phases in order for best results.
