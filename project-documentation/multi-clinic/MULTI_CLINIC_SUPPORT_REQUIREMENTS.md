# Multi-Clinic Support Requirements & Implementation Plan

**Document Created:** January 31, 2026  
**Status:** Requirements Gathering Phase  
**Implementation Approach:** Phased (NOT all at once)

---

## Table of Contents
1. [Overview](#overview)
2. [User-Clinic Relationships](#user-clinic-relationships)
3. [Data Sharing & Isolation Strategy](#data-sharing--isolation-strategy)
4. [Appointment Booking Flow](#appointment-booking-flow)
5. [Permissions & Access Control](#permissions--access-control)
6. [Data Migration Strategy](#data-migration-strategy)
7. [Implementation Phases](#implementation-phases)
8. [UI/UX Behavior](#uiux-behavior)
9. [Business Rules (Pending)](#business-rules-pending)
10. [Technical Implementation Checklist](#technical-implementation-checklist)

---

## Overview

### Goal
Transform the Dorotheo Dental Clinic Management System from a single-clinic system to a multi-clinic system where:
- Clinic staff can manage multiple locations from one centralized system
- Patients can book appointments at any clinic location
- Owner has global visibility and control across all clinics
- Data is properly isolated or shared based on business requirements

### Current State
- ✅ `ClinicLocation` model exists but is **NOT linked to any other models**
- ❌ No foreign key relationships to Appointment, User, Services, etc.
- ❌ No clinic filtering in API endpoints
- ❌ No clinic selector in frontend UI
- ❌ No clinic-specific dashboards or reports

---

## User-Clinic Relationships

### Staff & Dentists

#### Assignment Model
- **One clinic at a time**: Each staff member is assigned to ONE clinic at any given time
- **Reassignment capability**: Staff can be reassigned to different clinics over time
- **Assignment history**: Track when staff was assigned to which clinic

#### Data Visibility
- ✅ **See ALL appointments from ALL clinics** (centralized view)
- ✅ Staff can see appointments even if they're not assigned to that clinic
- ✅ Combined data AND clinic-specific data views available
- **Rationale**: Clinic staff/owner need to see all clinic data from one centralized system

#### Availability Schedules
Staff should have **flexible availability options**:
1. ✅ Set separate availability for **one specific clinic**
2. ✅ Set separate availability for **all three clinics** (different schedules per clinic)
3. ✅ Set **same availability for all clinics** (one schedule applies everywhere)
4. ✅ Set **same availability for selected clinics** (e.g., Clinic A & B share schedule, Clinic C is different)

**Implementation Note**: This requires a many-to-many relationship between staff availability and clinics, or a clinic field with "apply to all" flag.

### Patients

#### Clinic Registration
- ❌ **NOT registered to a single primary clinic**
- ✅ **Can visit ANY clinic** (no restrictions)
- ❌ **No clinic selection during registration** (don't lock patients to one clinic)

#### Appointment Booking
- ✅ Patients can book at **Clinic A** on one date
- ✅ Then book at **Clinic B** on another date
- ✅ **Convenience-based selection**: Patient chooses clinic based on location/timing preferences
- ✅ **No clinic locking**: Complete freedom to choose any clinic per appointment

#### Record Visibility
- ✅ **Patient records visible across ALL clinics**
- ✅ Complete patient history accessible from any clinic location
- ✅ **Not limited** to the clinic where the record was created

**Example Scenario:**
- Patient has dental records from Clinic A
- Patient books appointment at Clinic B
- Dentist at Clinic B can see complete history from Clinic A

---

## Data Sharing & Isolation Strategy

### Services

#### Configuration
- ✅ **Per-clinic services** (not global)
- ✅ **Main clinic** offers ALL services
- ✅ Other clinics may offer **subset of services**

**Example:**
```
Main Clinic (Clinic A):
- Teeth Cleaning
- Teeth Whitening
- Root Canal
- Orthodontics
- Oral Surgery

Branch Clinic (Clinic B):
- Teeth Cleaning
- Teeth Whitening
- Orthodontics

Branch Clinic (Clinic C):
- Teeth Cleaning
- Teeth Whitening
```

**Implementation:**
- Add `clinic` foreign key to `Service` model (allow multiple clinics per service via ManyToMany)
- OR add `ManyToMany` relationship: `Service.clinics`
- Appointment booking filters services by selected clinic

### Inventory

#### Status
- ⏸️ **DO NOT FOCUS ON INVENTORY YET**
- ⏸️ **Skip inventory implementation** in initial phases
- 📝 Will be addressed in Phase 4

### Appointments

#### Clinic Association
- ✅ Every appointment **MUST be linked to a clinic**
- ✅ Clinic where the appointment occurs is recorded
- ✅ Links: Patient + Dentist + Service + **Clinic** + Date/Time

### Clinical Data (DentalRecord, Document, Billing)

#### Visibility
- ✅ **Visible across all clinics**
- ✅ Records show which clinic they were created at
- ✅ Accessible from any clinic portal

#### Storage
- ✅ Each record stores `clinic` foreign key (where it was created)
- ✅ Filtering by clinic available but not enforced

---

## Appointment Booking Flow

### Patient Booking Sequence

```
Step 1: Patient selects CLINIC
   ↓
Step 2: System shows available DENTISTS at that clinic
   ↓
Step 3: System shows available SERVICES at that clinic
   ↓
Step 4: Patient selects DATE & TIME
   ↓
Step 5: System checks availability for that dentist at that clinic
   ↓
Step 6: Appointment created with clinic association
```

**NOT this flow:**
```
❌ Step 1: Select dentist
❌ Step 2: System shows clinics where dentist works
```

### Key Points
- ✅ **Clinic-first selection**
- ✅ Dentist list filtered by clinic
- ✅ Service list filtered by clinic
- ✅ Availability checked per clinic

---

## Permissions & Access Control

### Owner Role

#### Access Rights
- ✅ **All clinics (global view)** - see everything
- ✅ **Switch between clinics** - change context easily
- ✅ **Cross-clinic reports and comparisons** - analytics across locations
- ✅ **"All Clinics" option** in clinic selector

#### Admin Structure
- ✅ **Only ONE owner** for entire system
- ❌ **No clinic-specific admins/owners**

### Staff Role (Receptionist)

#### Access Rights
- ✅ See appointments from **all clinics** (not just their assigned clinic)
- ✅ View **combined data** (all clinics together)
- ✅ View **clinic-specific data** (filtered by clinic)
- ✅ Create appointments at any clinic

### Dentist Role

#### Access Rights
- ✅ See appointments at **clinics where they're assigned**
- ✅ See patient records from **all clinics** (full patient history)
- ✅ Can work at different clinics (sequential assignment)

---

## Data Migration Strategy

### Current Status
- ⚠️ **DECISION PENDING** - User needs guidance

### Options to Present

#### Option 1: Default "Main Clinic" Assignment
```python
# All existing data → "Main Clinic" (ID=1)
- Appointments → Main Clinic
- DentalRecords → Main Clinic  
- Documents → Main Clinic
- Billing → Main Clinic
- Inventory → Main Clinic
- Staff assigned to → Main Clinic
```

**Pros:**
- ✅ Simple, automated migration
- ✅ No data loss
- ✅ Can manually reassign later

**Cons:**
- ❌ Requires manual cleanup if data belongs to different clinics

#### Option 2: Manual Assignment During Migration
```python
# Script asks for each record:
"Assign this appointment to which clinic?"
```

**Pros:**
- ✅ Accurate from the start

**Cons:**
- ❌ Time-consuming
- ❌ Requires knowledge of historical data

#### Option 3: Hybrid Approach
```python
# Default assignment + flagging
- All data → Main Clinic
- Add flag: needs_clinic_review = True
- Admin portal shows flagged records for review
```

**Pros:**
- ✅ System functional immediately
- ✅ Allows gradual cleanup

**Cons:**
- ❌ Extra work to build review interface

### Recommendation
**Use Option 3 (Hybrid Approach)** for safety and flexibility.

### Migration Steps (When Ready)
1. ✅ Create "Main Clinic" location in database
2. ✅ Run migration to add `clinic` foreign key to all models
3. ✅ Set `null=True, blank=True` initially (allow existing records)
4. ✅ Data migration: Assign all existing records to Main Clinic
5. ✅ Add validation: New records MUST have clinic
6. ✅ Create admin interface for reviewing/reassigning records

---

## Implementation Phases

### ⚠️ IMPORTANT: Phased Approach Required
**DO NOT implement everything at once!**

---

### 📋 Phase 1: Core Models & Associations
**Priority:** HIGH  
**Status:** Not Started

#### Backend Tasks
1. ✅ Add `clinic` ForeignKey to core models:
   - [ ] `Appointment` → `clinic` (required)
   - [ ] `User` → `assigned_clinic` (for staff/dentist, nullable)
   - [ ] `Service` → `clinics` (ManyToMany or ForeignKey)

2. ✅ Create data migration:
   - [ ] Create "Main Clinic" if none exists
   - [ ] Assign all existing appointments to Main Clinic
   - [ ] Assign all existing staff to Main Clinic
   - [ ] Assign all existing services to Main Clinic

3. ✅ Update API endpoints:
   - [ ] `GET /api/clinics/` - list all clinics
   - [ ] `GET /api/appointments/?clinic_id=1` - filter by clinic
   - [ ] `POST /api/appointments/` - require clinic in payload
   - [ ] Update serializers to include clinic data

4. ✅ Add database indexes:
   - [ ] Index on `appointment.clinic_id`
   - [ ] Index on `user.assigned_clinic_id`
   - [ ] Index on `service.clinic_id`

#### Frontend Tasks
1. ✅ Create `ClinicContext` provider
2. ✅ Create `ClinicSelector` component (basic version)
3. ✅ Update appointment booking flow to include clinic selection
4. ✅ Add clinic display to appointment list
5. ✅ Integrate ClinicSelector into owner/staff layouts
6. ✅ Filter dashboards by selected clinic
7. ✅ Add clinic badge column to appointments tables

#### Testing Checklist
- [x] Clinic selector visible in owner and staff portals
- [x] Clinic selection persists and filters data
- [ ] Can create appointments with clinic association
- [ ] Can filter appointments by clinic
- [ ] Existing data migrated successfully
- [ ] Clinic selector changes context correctly

---

### 📋 Phase 2: Clinical Data & Records
**Priority:** HIGH  
**Status:** Not Started  
**Depends On:** Phase 1 completion

#### Backend Tasks
1. ✅ Add `clinic` ForeignKey to:
   - [ ] `DentalRecord` → `clinic`
   - [ ] `Document` → `clinic`
   - [ ] `Billing` → `clinic`

2. ✅ Data migration:
   - [ ] Assign existing dental records to Main Clinic
   - [ ] Assign existing documents to Main Clinic
   - [ ] Assign existing billing to Main Clinic

3. ✅ Update API endpoints:
   - [ ] Filter dental records by clinic (optional)
   - [ ] Filter documents by clinic (optional)
   - [ ] Filter billing by clinic (optional)
   - [ ] Show clinic information in responses

4. ✅ Cross-clinic visibility:
   - [ ] Ensure patient records visible from all clinics
   - [ ] Add "Created at Clinic" indicator

#### Frontend Tasks
1. ✅ Add clinic badges to records table
2. ✅ Add clinic filter to records pages
3. ✅ Display "Created at: Clinic Name" on record details
4. ✅ Update billing page to show clinic

#### Testing Checklist
- [ ] Patient records visible across all clinics
- [ ] Clinic indicator shows on all records
- [ ] Filtering by clinic works correctly
- [ ] Billing tracks clinic correctly

---

### 📋 Phase 3: Availability & Scheduling
**Priority:** MEDIUM  
**Status:** Not Started  
**Depends On:** Phase 1 completion

#### Backend Tasks
1. ✅ Add `clinic` relationship to:
   - [ ] `StaffAvailability` → ManyToMany `clinics` OR single `clinic` + `apply_to_all` flag
   - [ ] `DentistAvailability` → `clinic`
   - [ ] `BlockedTimeSlot` → `clinic`

2. ✅ Implement flexible availability:
   - [ ] Option 1: Set availability for one specific clinic
   - [ ] Option 2: Set different availability per clinic
   - [ ] Option 3: Set same availability for all clinics
   - [ ] Option 4: Set same availability for selected clinics

3. ✅ Update availability endpoints:
   - [ ] `GET /api/availability/?clinic_id=1` - filter by clinic
   - [ ] `POST /api/availability/` - support multiple clinics
   - [ ] Show dentist availability per clinic

4. ✅ Scheduling logic:
   - [ ] Check availability for specific clinic
   - [ ] Prevent double-booking (pending business rules)
   - [ ] Block time slots per clinic

#### Frontend Tasks
1. ✅ Update availability calendar with clinic selector
2. ✅ Show dentist availability per clinic
3. ✅ Add clinic selector to block time modal
4. ✅ Add multi-clinic availability setting UI

#### Design Decision Needed
**How to store availability for multiple clinics?**

**Option A: ManyToMany Relationship**
```python
class StaffAvailability(models.Model):
    staff = models.ForeignKey(User, ...)
    day_of_week = models.IntegerField(...)
    clinics = models.ManyToManyField(ClinicLocation)  # Can apply to multiple
    start_time = models.TimeField(...)
    end_time = models.TimeField(...)
```

**Option B: Single Clinic + Apply All Flag**
```python
class StaffAvailability(models.Model):
    staff = models.ForeignKey(User, ...)
    day_of_week = models.IntegerField(...)
    clinic = models.ForeignKey(ClinicLocation, null=True, blank=True)
    apply_to_all_clinics = models.BooleanField(default=False)
    start_time = models.TimeField(...)
    end_time = models.TimeField(...)
```

**Recommendation:** Option A (ManyToMany) for maximum flexibility.

#### Testing Checklist
- [ ] Can set availability for one clinic
- [ ] Can set different availability per clinic
- [ ] Can set same availability for all clinics
- [ ] Can set same availability for selected clinics
- [ ] Blocked time slots work per clinic

---

### 📋 Phase 4: Inventory & Reports
**Priority:** LOW (DEFERRED)  
**Status:** Not Started  
**Depends On:** Phase 1-3 completion

#### Status
⏸️ **Skip for now** - per user request

#### Future Tasks (Placeholder)
1. ⏸️ Add `clinic` to `InventoryItem`
2. ⏸️ Implement per-clinic inventory
3. ⏸️ Implement inventory transfer tracking (if needed)
4. ⏸️ Implement low stock alerts per clinic

---

### 📋 Phase 5: Frontend UI & Dashboards
**Priority:** MEDIUM  
**Status:** Not Started  
**Depends On:** Phase 1-2 completion

#### Global UI Components
1. ✅ **Clinic Selector (Navbar)**
   - [ ] Sticky/persistent throughout session
   - [ ] Shows all clinics
   - [ ] Owner sees "All Clinics" option
   - [ ] Staff sees all clinics (but can filter)
   - [ ] Selected clinic persists across pages

2. ✅ **Clinic Badges**
   - [ ] Color-coded badges for each clinic
   - [ ] Show on appointments table
   - [ ] Show on records table
   - [ ] Show on documents list
   - [ ] Show on billing table

3. ✅ **Clinic Filters**
   - [ ] Add to all list pages (appointments, patients, records)
   - [ ] "All Clinics" option for owner
   - [ ] Clinic-specific filtering for staff

#### Dashboard Modifications

**Owner Dashboard:**
1. ✅ Clinic-specific metrics:
   - [ ] Total patients per clinic
   - [ ] Appointments per clinic
   - [ ] Revenue per clinic

2. ✅ Multi-clinic comparison view:
   - [ ] Side-by-side clinic performance
   - [ ] Revenue comparison chart
   - [ ] Patient count comparison
   - [ ] Appointment count comparison

3. ✅ Global view:
   - [ ] Combined metrics across all clinics
   - [ ] Switch between "All Clinics" and specific clinic

**Staff Dashboard:**
1. ✅ See combined data by default
2. ✅ Filter to specific clinic when needed
3. ✅ Show assigned clinic prominently

**Patient Portal:**
1. ✅ Show appointment history with clinic names
2. ✅ Clinic selector during booking
3. ✅ Display clinic location/contact info

#### UI/UX Specifications

**Clinic Selector Component:**
```typescript
// Location: Navbar (top-right or near user profile)
// Type: Dropdown or segmented control

<ClinicSelector
  clinics={allClinics}
  selectedClinic={currentClinic}
  onClinicChange={handleClinicChange}
  showAllOption={isOwner}  // Only for owner
  persistent={true}  // Persists across navigation
/>
```

**Clinic Badge Component:**
```typescript
// Color-coded, consistent across app

<ClinicBadge
  clinic={appointment.clinic}
  variant="solid"  // or "outline"
  size="sm"
/>

// Examples:
// Main Clinic - Green badge
// Branch A - Blue badge
// Branch B - Purple badge
```

#### Testing Checklist
- [ ] Clinic selector works in navbar
- [ ] Selection persists across pages
- [ ] Owner sees "All Clinics" option
- [ ] Staff can filter by clinic
- [ ] Badges display correctly
- [ ] Dashboards show correct data per clinic
- [ ] Multi-clinic comparison works for owner

---

## UI/UX Behavior

### Clinic Selection Persistence

#### Requirements
- ✅ **Persistent throughout session**: Clinic selection should remain active across all pages
- ✅ **Context awareness**: User always knows which clinic they're viewing
- ✅ **Easy switching**: Clinic selector always accessible

#### Implementation
```typescript
// Use React Context + localStorage
const ClinicContext = {
  selectedClinic: Clinic | "all",
  setSelectedClinic: (clinic) => {
    // Update context
    // Save to localStorage
    // Refresh data
  }
}
```

### Data Views

#### Owner View
- ✅ **Default**: "All Clinics" combined view
- ✅ **Can switch to**: Individual clinic view
- ✅ **Navigation**: Clinic selector always visible in navbar

#### Staff View (Working at Multiple Clinics)
- ✅ **See combined data** (all clinics together)
- ✅ **See clinic-specific data** (filter by clinic)
- ✅ **Toggle between views** easily

**Example Staff UI:**
```
[Appointments Page]
┌────────────────────────────────────┐
│ Clinic: [All Clinics ▼]           │ ← Dropdown selector
│ Show: [Combined View] [Per Clinic]│ ← View toggle
└────────────────────────────────────┘

Table View:
Patient    | Date  | Service | Clinic      | Status
-----------|-------|---------|-------------|--------
John Doe   | 02/01 | Cleaning| Main Clinic | ✓
Jane Smith | 02/01 | Whitening| Branch A   | ⏱️
Bob Wilson | 02/02 | Root Canal| Branch B  | ⏱️
```

### Clinic Indicator Standards

#### Always Show Clinic Context
Every data view must clearly indicate which clinic(s) are being displayed:

1. ✅ **Page header**: "Appointments - Main Clinic" or "Appointments - All Clinics"
2. ✅ **Badges on list items**: Color-coded clinic badges
3. ✅ **Filters**: Active clinic filter visible
4. ✅ **Breadcrumbs**: Include clinic context

#### Clinic Badge Colors (Recommendation)
```
Main Clinic → Green (#10b981)
Branch A    → Blue (#3b82f6)
Branch B    → Purple (#8b5cf6)
Branch C    → Orange (#f97316)
```

---

## Business Rules (Pending)

### ⚠️ DECISIONS NEEDED

The following business rules need clarification before implementation:

#### 1. Multiple Appointments Same Day
**Question:** Can a patient have appointments at multiple clinics on the same day?

**Example Scenario:**
- Patient books teeth cleaning at Main Clinic at 9:00 AM
- Patient tries to book teeth whitening at Branch A at 2:00 PM (same day)

**Options:**
- [ ] **Allow**: Patient can book at multiple clinics same day
- [ ] **Prevent**: System blocks same-day appointments at different clinics
- [ ] **Warn**: Show warning but allow if confirmed

**Decision:** _PENDING_

---

#### 2. Dentist Double-Booking Across Clinics
**Question:** Can a dentist be double-booked across different clinics?

**Example Scenario:**
- Dr. Smith has appointment at Main Clinic at 10:00 AM
- Patient tries to book Dr. Smith at Branch A at 10:00 AM (same time, different clinic)

**Options:**
- [ ] **Prevent**: System prevents cross-clinic double booking (recommended)
- [ ] **Allow**: Dentist can be booked at multiple clinics same time (not realistic)
- [ ] **Conditional**: Allow if dentist's availability set for both clinics

**Decision:** _PENDING_  
**Recommendation:** Implement cross-clinic conflict checking to prevent double-booking

**Implementation Impact:** Requires modification to appointment validation logic:
```python
# Check availability across ALL clinics, not just selected clinic
def check_dentist_availability(dentist, date, time):
    conflicts = Appointment.objects.filter(
        dentist=dentist,
        date=date,
        time=time,
        # Check ALL clinics, not just clinic=selected_clinic
    )
    return conflicts.exists()
```

---

#### 3. Billing Consolidation
**Question:** Should billing be consolidated or per-clinic?

**Options:**
- [ ] **Per-clinic**: Each clinic has separate billing/accounting (most common)
- [ ] **Consolidated**: All clinics share one billing system
- [ ] **Hybrid**: Per-clinic billing with consolidated reporting for owner

**Decision:** _PENDING_  
**Recommendation:** Per-clinic billing (separate accounting per location)

**Implementation Impact:**
- If per-clinic: Add clinic filter to billing reports, separate revenue tracking
- If consolidated: One billing system, clinic shown as metadata only

---

### Next Steps for Business Rules
1. Review scenarios with stakeholders
2. Make decisions on above questions
3. Document decisions in this file
4. Update implementation phases accordingly

---

## Technical Implementation Checklist

### Database Changes

#### New Foreign Keys to Add
```python
# Phase 1
Appointment.clinic = ForeignKey(ClinicLocation, null=False)
User.assigned_clinic = ForeignKey(ClinicLocation, null=True, blank=True)
Service.clinics = ManyToManyField(ClinicLocation)  # or ForeignKey

# Phase 2
DentalRecord.clinic = ForeignKey(ClinicLocation, null=False)
Document.clinic = ForeignKey(ClinicLocation, null=False)
Billing.clinic = ForeignKey(ClinicLocation, null=False)

# Phase 3
StaffAvailability.clinics = ManyToManyField(ClinicLocation)
DentistAvailability.clinic = ForeignKey(ClinicLocation, null=False)
BlockedTimeSlot.clinic = ForeignKey(ClinicLocation, null=False)

# Phase 4 (Deferred)
InventoryItem.clinic = ForeignKey(ClinicLocation, null=False)
TreatmentPlan.clinic = ForeignKey(ClinicLocation, null=False)
```

#### Database Indexes
```python
# Add to models.py Meta class
class Meta:
    indexes = [
        models.Index(fields=['clinic', 'date']),
        models.Index(fields=['clinic', 'status']),
        models.Index(fields=['assigned_clinic']),
    ]
```

### Backend API Changes

#### New Endpoints
```python
# Clinic management
GET    /api/clinics/                 # List all clinics
GET    /api/clinics/{id}/            # Get clinic details
POST   /api/clinics/                 # Create clinic (owner only)
PUT    /api/clinics/{id}/            # Update clinic (owner only)
DELETE /api/clinics/{id}/            # Delete clinic (owner only)

# Filtered endpoints (add ?clinic_id= parameter to existing)
GET /api/appointments/?clinic_id=1
GET /api/patients/?clinic_id=1
GET /api/dental-records/?clinic_id=1
GET /api/documents/?clinic_id=1
GET /api/billing/?clinic_id=1
GET /api/availability/?clinic_id=1

# Multi-clinic reports (owner only)
GET /api/reports/multi-clinic/       # Cross-clinic comparison
GET /api/reports/clinic/{id}/        # Specific clinic report
```

#### Serializer Updates
```python
# Add clinic data to all serializers
class AppointmentSerializer(serializers.ModelSerializer):
    clinic = ClinicLocationSerializer(read_only=True)
    clinic_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Appointment
        fields = [..., 'clinic', 'clinic_id']
```

### Frontend Changes

#### New Context Providers
```typescript
// contexts/ClinicContext.tsx
interface ClinicContextType {
  selectedClinic: ClinicLocation | "all";
  allClinics: ClinicLocation[];
  setSelectedClinic: (clinic: ClinicLocation | "all") => void;
  isLoading: boolean;
}

export const ClinicProvider: React.FC = ({ children }) => {
  // Implementation
}
```

#### New Components
```typescript
// components/clinic-selector.tsx
export function ClinicSelector({ showAllOption }: Props) {}

// components/clinic-badge.tsx
export function ClinicBadge({ clinic }: Props) {}

// components/clinic-filter.tsx
export function ClinicFilter({ onFilterChange }: Props) {}

// components/multi-clinic-dashboard.tsx (owner only)
export function MultiClinicDashboard() {}
```

#### API Client Updates
```typescript
// lib/api.ts - Add clinic parameter to all fetches
export const getAppointments = async (clinicId?: number) => {
  const params = clinicId ? `?clinic_id=${clinicId}` : '';
  return fetch(`/api/appointments/${params}`);
}
```

### Migration Scripts

#### Phase 1 Migration
```python
# migrations/00XX_add_clinic_to_core_models.py
def forwards(apps, schema_editor):
    ClinicLocation = apps.get_model('api', 'ClinicLocation')
    Appointment = apps.get_model('api', 'Appointment')
    User = apps.get_model('api', 'User')
    Service = apps.get_model('api', 'Service')
    
    # Create Main Clinic if doesn't exist
    main_clinic, created = ClinicLocation.objects.get_or_create(
        name="Main Clinic",
        defaults={
            'address': "To be updated",
            'phone': "To be updated"
        }
    )
    
    # Assign all existing appointments to Main Clinic
    Appointment.objects.all().update(clinic=main_clinic)
    
    # Assign all staff to Main Clinic
    User.objects.filter(user_type__in=['staff', 'owner']).update(
        assigned_clinic=main_clinic
    )
    
    # Assign all services to Main Clinic
    for service in Service.objects.all():
        service.clinics.add(main_clinic)
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema changes
- [ ] Data migration
- [ ] Basic API endpoints
- [ ] Basic clinic selector UI

### Phase 2: Clinical Data (Week 3)
- [ ] Add clinic to records
- [ ] Update record views
- [ ] Clinic badges

### Phase 3: Scheduling (Week 4-5)
- [ ] Availability per clinic
- [ ] Scheduling logic updates
- [ ] Conflict checking

### Phase 4: Deferred
- [ ] Inventory (TBD)

### Phase 5: Advanced UI (Week 6)
- [ ] Multi-clinic dashboards
- [ ] Cross-clinic reports
- [ ] Performance comparison

---

## Testing Strategy

### Unit Tests
- [ ] Model validation with clinic foreign keys
- [ ] API filtering by clinic
- [ ] Permissions (owner vs staff access)

### Integration Tests
- [ ] Appointment booking with clinic
- [ ] Cross-clinic record visibility
- [ ] Staff assignment and reassignment

### User Acceptance Tests
- [ ] Owner can view all clinics
- [ ] Owner can switch between clinics
- [ ] Owner can see cross-clinic reports
- [ ] Staff can see appointments from all clinics
- [ ] Patient can book at any clinic
- [ ] Patient records visible across clinics
- [ ] Clinic selector persists across pages

---

## Open Questions & Decisions Log

| # | Question | Status | Decision | Date |
|---|----------|--------|----------|------|
| 1 | Data migration strategy | ⚠️ PENDING | TBD | - |
| 2 | Patient multiple appointments same day | ⚠️ PENDING | TBD | - |
| 3 | Dentist double-booking prevention | ⚠️ PENDING | Recommend: Prevent | - |
| 4 | Billing consolidation vs per-clinic | ⚠️ PENDING | Recommend: Per-clinic | - |
| 5 | Availability storage (ManyToMany vs Flag) | ⚠️ PENDING | Recommend: ManyToMany | - |

---

## Success Criteria

### Phase 1 Complete When:
- [ ] All appointments have clinic association
- [ ] Clinic selector works in frontend
- [ ] Can filter appointments by clinic
- [ ] No broken functionality from existing system

### Phase 2 Complete When:
- [ ] All clinical records have clinic association
- [ ] Clinic badges display everywhere
- [ ] Cross-clinic record visibility works

### Phase 3 Complete When:
- [ ] Staff can set availability per clinic
- [ ] Appointment booking respects clinic-specific availability
- [ ] Blocked time slots work per clinic

### Phase 5 Complete When:
- [ ] Owner has multi-clinic dashboard
- [ ] Cross-clinic reports functional
- [ ] Clinic selection persistent
- [ ] All UI shows clinic context

### System Complete When:
- [ ] All phases complete
- [ ] All tests passing
- [ ] User acceptance testing passed
- [ ] Documentation complete
- [ ] Training materials ready

---

## Risk Assessment

### High Risk Items
1. ⚠️ **Data migration** - Existing data must be preserved
2. ⚠️ **Breaking changes** - API changes may break frontend
3. ⚠️ **Performance** - Additional joins may slow queries

### Mitigation Strategies
1. ✅ **Phased approach** - Small, testable increments
2. ✅ **Backward compatibility** - Keep old API during transition
3. ✅ **Database indexes** - Optimize queries with proper indexes
4. ✅ **Testing** - Comprehensive testing at each phase
5. ✅ **Rollback plan** - Database backups before each phase

---

## Notes & Considerations

### Database Performance
- Adding `clinic_id` to queries adds JOIN operations
- Mitigate with proper indexes
- Consider query optimization for dashboard aggregations

### Code Maintainability
- Centralize clinic filtering logic
- Create reusable filter mixins for ViewSets
- Consistent naming conventions

### User Experience
- Clinic selector should be prominent but not intrusive
- Clear visual indicators of current clinic context
- Fast switching between clinics (no page reload)

### Future Enhancements
- Clinic-to-clinic appointment transfers
- Staff scheduling across multiple clinics
- Patient referrals between clinics
- Inter-clinic messaging
- Centralized patient waitlist

---

## Document Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-31 | Initial requirements document | Ezekiel |

---

**Next Steps:**
1. ✅ Review and approve this requirements document
2. ⏳ Make decisions on pending business rules
3. ⏳ Approve data migration strategy
4. ⏳ Begin Phase 1 implementation

**Questions?** Refer to [Open Questions](#open-questions--decisions-log) section.
