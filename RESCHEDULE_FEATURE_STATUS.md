# Reschedule & Service Dropdown Feature Status

## ✅ Completed Features

### 1. Backend Implementation
- ✅ Added reschedule fields to Appointment model:
  - `reschedule_date`
  - `reschedule_time`
  - `reschedule_service`
  - `reschedule_dentist`
  - `reschedule_notes`
- ✅ Added `reschedule_requested` status to appointment choices
- ✅ Created migration and applied to database
- ✅ Updated AppointmentSerializer with reschedule fields
- ✅ Added API endpoints:
  - `POST /api/appointments/{id}/approve_reschedule/`
  - `POST /api/appointments/{id}/reject_reschedule/`

### 2. Frontend API Client
- ✅ Added `approveReschedule()` function
- ✅ Added `rejectReschedule()` function

### 3. Patient Appointments Page (`patient/appointments/page.tsx`)
- ✅ Added Service interface and state
- ✅ Fetch services from API
- ✅ **Service Dropdown**: Patients select from available services (not text input)
- ✅ **Dentist Name Format**: Shows only "Dr. First Last" (no role label)
- ✅ **Reschedule Request**: Added "Request Reschedule" button for confirmed appointments
- ✅ **Reschedule Modal**: Complete form to request new date/time/service/dentist
- ✅ **Reschedule Status Display**: Shows orange badge and requested changes
- ✅ Added `reschedule_requested` status color (orange)
- ✅ All fields required in both create and reschedule forms

## 🔄 In Progress

### Staff & Owner Appointments Pages
Need to add:
1. Show reschedule requests with badge/indicator
2. Add "Approve" and "Reject" buttons for reschedule requests
3. Update appointment interface to include reschedule fields
4. Handle approve/reject actions with API calls

## 📋 Implementation Details

### Patient Flow:
1. Patient views confirmed appointment
2. Clicks "Request Reschedule" button
3. Modal shows current appointment details
4. Patient selects new date, time, dentist, and service
5. Submits request → Status changes to "reschedule_requested"
6. Orange badge shows "Reschedule Requested"
7. Card displays requested changes in orange box
8. Patient waits for staff approval

### Staff/Owner Flow (TO IMPLEMENT):
1. View appointments list
2. See "Reschedule Requested" status (orange)
3. View both current and requested details
4. Click "Approve" → New details become active, status → "confirmed"
5. Click "Reject" → Request cleared, status → "confirmed", original appointment stays

## 🎨 UI Changes

### Service Selection:
**Before**: Text input field
```tsx
<input type="text" placeholder="e.g., Teeth Cleaning" />
```

**After**: Dropdown menu
```tsx
<select>
  <option>Teeth Cleaning</option>
  <option>Root Canal</option>
  <option>Dental Filling</option>
  ...
</select>
```

### Dentist Display:
**Before**: `Dr. Marvin Dorotheo (Owner/Dentist)`
**After**: `Dr. Marvin Dorotheo`

### Appointment Card (Patient View):
When reschedule requested:
```
┌──────────────────────────────────────┐
│ Root Canal      [Reschedule Requested]│
│ 2024-12-20 14:00                     │
│ Dr. Marvin Dorotheo                  │
│                                      │
│ 📅 Requested Reschedule:             │
│ ├─ New Date: 2024-12-22              │
│ ├─ New Time: 10:00                   │
│ ├─ New Dentist: Dr. Sarah Lee        │
│ └─ New Treatment: Teeth Cleaning     │
│ Waiting for staff approval...        │
└──────────────────────────────────────┘
```

## 🗄️ Database Schema

```sql
-- Appointment model fields
id                 INTEGER PRIMARY KEY
patient_id         INTEGER FK
dentist_id         INTEGER FK (nullable)
service_id         INTEGER FK (nullable)
date               DATE
time               TIME
status             VARCHAR (pending|confirmed|cancelled|completed|reschedule_requested)
notes              TEXT

-- Reschedule fields (NEW)
reschedule_date     DATE (nullable)
reschedule_time     TIME (nullable)  
reschedule_service_id INTEGER FK (nullable)
reschedule_dentist_id INTEGER FK (nullable)
reschedule_notes    TEXT

created_at         DATETIME
updated_at         DATETIME
```

## 🔐 Permission Logic

### Patients CAN:
- Create new appointment requests (status: pending)
- Request reschedule for confirmed appointments
- View their own appointments only

### Staff/Owner CAN:
- View all appointments
- Approve/reject pending appointments
- Approve/reject reschedule requests
- Edit any appointment
- Cancel appointments

## 📝 Status Workflow

```
Patient Creates → pending
         ↓
Staff Confirms → confirmed
         ↓
Patient Requests Reschedule → reschedule_requested
         ↓
    ┌────┴────┐
    ↓         ↓
Approve    Reject
    ↓         ↓
confirmed  confirmed
(new data) (old data)
```

## ✅ Testing Checklist

### Patient Side:
- ✅ Can create appointment with service dropdown
- ✅ Service field is required
- ✅ Dentist shows as "Dr. [Name]" only
- ✅ Can request reschedule for confirmed appointments
- ✅ Reschedule modal shows current appointment
- ✅ All reschedule fields required
- ✅ Reschedule request shows orange badge
- ✅ Requested changes displayed in orange box

### Staff/Owner Side (TO TEST):
- ⏳ Can see reschedule requests
- ⏳ Can approve reschedule
- ⏳ Can reject reschedule
- ⏳ Approved changes update appointment
- ⏳ Rejected request clears reschedule data

## 🚀 Next Steps

1. Update `staff/appointments/page.tsx`:
   - Add reschedule fields to Appointment interface
   - Show reschedule status indicator
   - Add Approve/Reject buttons
   - Implement approve/reject handlers

2. Update `owner/appointments/page.tsx`:
   - Same changes as staff page

3. Update staff/owner dashboards:
   - Show reschedule requests in today's appointments
   - Add quick approve action

## 📦 Files Modified

### Backend:
1. ✅ `backend/api/models.py` - Added reschedule fields
2. ✅ `backend/api/serializers.py` - Added reschedule serializer fields
3. ✅ `backend/api/views.py` - Added approve/reject actions
4. ✅ `backend/api/migrations/0004_*.py` - Database migration

### Frontend:
1. ✅ `frontend/lib/api.ts` - Added approve/reject functions
2. ✅ `frontend/app/patient/appointments/page.tsx` - Complete reschedule UI
3. ⏳ `frontend/app/staff/appointments/page.tsx` - Needs approve/reject
4. ⏳ `frontend/app/owner/appointments/page.tsx` - Needs approve/reject

---

**Status**: Patient side complete, staff/owner approval UI pending
**Last Updated**: December 2024
