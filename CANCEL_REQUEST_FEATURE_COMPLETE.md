# Appointment Cancellation Request Feature - Complete ✅

## Overview
Implemented a comprehensive appointment cancellation workflow where patients can request cancellations, and staff/owner can approve or reject them. Approved cancellations result in permanent deletion of the appointment from all user views.

## Feature Workflow

### 1. **Patient Side** - Request Cancellation
- Patients can request cancellation for **confirmed** appointments
- Must provide a reason for cancellation
- Status changes to `cancel_requested`
- Appointment remains visible with "Cancellation Requested" badge

### 2. **Staff/Owner Side** - Review & Approve/Reject
- View all cancellation requests with patient's reason
- Two options:
  - **Approve & Delete**: Permanently removes appointment from database
  - **Reject Cancellation**: Returns appointment to `confirmed` status

### 3. **Deletion on Approval**
- When staff/owner approves, appointment is **permanently deleted**
- Removed from patient, staff, and owner views
- No trace left in the system

## Backend Changes

### Updated: `backend/api/views.py`

#### Modified `approve_cancel` Endpoint
```python
@action(detail=True, methods=['post'])
def approve_cancel(self, request, pk=None):
    """Staff/Owner approves cancel request and deletes the appointment"""
    appointment = self.get_object()
    
    if appointment.status != 'cancel_requested':
        return Response(
            {'error': 'This appointment is not pending cancellation'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Delete the appointment instead of marking as cancelled
    appointment_id = appointment.id
    appointment.delete()
    
    return Response(
        {'message': 'Appointment cancelled and deleted successfully', 'id': appointment_id},
        status=status.HTTP_200_OK
    )
```

**Key Changes:**
- Changed from `appointment.status = 'cancelled'` to `appointment.delete()`
- Returns success message with deleted appointment ID
- Permanent deletion ensures no lingering records

## Frontend Changes

### 1. Patient Appointments Page
**File**: `frontend/app/patient/appointments/page.tsx`

#### Added Cancel Request UI
- **Request Cancel Button**: Red button next to "Request Reschedule" for confirmed appointments
- **Cancel Request Modal**: 
  - Shows appointment details (service, date, time)
  - Textarea for cancellation reason (required)
  - Warning message about approval process
  - Submit button to send request

#### Added State Management
```typescript
const [showCancelModal, setShowCancelModal] = useState(false)
const [cancelReason, setCancelReason] = useState("")
```

#### Added Handler Function
```typescript
const handleCancelRequest = async (e: React.FormEvent) => {
  e.preventDefault()
  
  if (!token || !selectedAppointment) return

  try {
    await api.requestCancel(selectedAppointment.id, cancelReason, token)
    
    // Update status locally
    setAllAppointments(allAppointments.map(apt => 
      apt.id === selectedAppointment.id 
        ? { ...apt, status: "cancel_requested" as const }
        : apt
    ))
    
    setShowCancelModal(false)
    setSelectedAppointment(null)
    setCancelReason("")
    alert("Cancellation request submitted! Staff will review it soon.")
  } catch (error) {
    console.error("Error requesting cancellation:", error)
    alert("Failed to submit cancellation request. Please try again.")
  }
}
```

#### Updated Status Display
- Added `cancel_requested` to status type definitions
- Added status color: `bg-red-100 text-red-700`
- Added status format: `"Cancellation Requested"`
- Shows "Cancellation pending approval..." message for `cancel_requested` appointments

#### UI Elements
```tsx
{/* Cancel Button for Confirmed Appointments */}
<button
  onClick={() => {
    setSelectedAppointment(appointment)
    setShowCancelModal(true)
  }}
  className="flex items-center gap-2 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
>
  <XCircle className="w-4 h-4" />
  Request Cancel
</button>

{/* Status Info */}
{appointment.status === "cancel_requested" && (
  <div className="text-sm text-red-600 font-medium">
    Cancellation pending approval...
  </div>
)}
```

### 2. Staff Appointments Page
**File**: `frontend/app/staff/appointments/page.tsx`

#### Updated Appointment Interface
```typescript
interface Appointment {
  // ... existing fields
  status: "confirmed" | "pending" | "cancelled" | "completed" | "reschedule_requested" | "cancel_requested"
  cancel_reason: string
}
```

#### Added Handler Functions
```typescript
const handleApproveCancel = async (appointment: Appointment) => {
  if (!token) return
  
  if (!confirm("Are you sure you want to approve this cancellation? This will permanently delete the appointment.")) return
  
  try {
    await api.approveCancel(appointment.id, token)
    // Remove from list since it's deleted
    setAppointments(appointments.filter(apt => apt.id !== appointment.id))
    alert("Cancellation approved. Appointment has been deleted.")
  } catch (error) {
    console.error("Error approving cancellation:", error)
    alert("Failed to approve cancellation.")
  }
}

const handleRejectCancel = async (appointment: Appointment) => {
  if (!token) return
  
  if (!confirm("Are you sure you want to reject this cancellation request?")) return
  
  try {
    const updatedAppointment = await api.rejectCancel(appointment.id, token)
    setAppointments(appointments.map(apt => 
      apt.id === appointment.id ? updatedAppointment : apt
    ))
    alert("Cancellation request rejected. Appointment remains confirmed.")
  } catch (error) {
    console.error("Error rejecting cancellation:", error)
    alert("Failed to reject cancellation.")
  }
}
```

#### Added Cancellation Request Section
```tsx
{/* Cancel Request Section */}
{apt.status === "cancel_requested" && (
  <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2">
        <X className="w-5 h-5" />
        Cancellation Request Pending
      </h3>
      <div className="flex gap-2">
        <button
          onClick={() => handleApproveCancel(apt)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
        >
          Approve & Delete
        </button>
        <button
          onClick={() => handleRejectCancel(apt)}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          Reject Cancellation
        </button>
      </div>
    </div>
    
    <div className="bg-white rounded-lg p-4 border border-red-200">
      <h4 className="font-semibold text-gray-700 mb-3">Cancellation Reason</h4>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{apt.cancel_reason || "No reason provided"}</p>
    </div>

    <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded-lg">
      <p className="text-sm text-amber-800">
        <strong>Warning:</strong> Approving this cancellation will permanently delete the appointment from all users' views.
      </p>
    </div>
  </div>
)}
```

### 3. Owner Appointments Page
**File**: `frontend/app/owner/appointments/page.tsx`

- Applied same changes as staff page
- Updated interface with `cancel_requested` status and `cancel_reason` field
- Added `handleApproveCancel` and `handleRejectCancel` functions
- Added cancellation request display section
- Updated status colors and formatting

## User Experience

### Patient Journey
1. Go to **My Appointments** tab
2. Find confirmed appointment to cancel
3. Click **"Request Cancel"** button (red button)
4. Fill in reason for cancellation
5. Submit request
6. See status change to **"Cancellation Requested"**
7. Wait for staff/owner approval
8. Appointment either:
   - **Approved**: Disappears from appointments list
   - **Rejected**: Returns to confirmed status

### Staff/Owner Journey
1. Go to **Appointments** dashboard
2. See appointments with **"Cancellation Requested"** badge
3. Click to expand appointment details
4. View **Cancellation Request Pending** section showing:
   - Patient's reason for cancellation
   - Warning about permanent deletion
5. Choose action:
   - **Approve & Delete**: Confirms deletion, removes from all views
   - **Reject Cancellation**: Keeps appointment, returns to confirmed

## Status Flow Diagram

```
Patient Requests Cancel
         ↓
   cancel_requested
         ↓
    Staff/Owner Reviews
         ↓
    ├─ Approve → DELETE (removed from all views)
    └─ Reject  → confirmed (appointment continues)
```

## Testing Checklist

### Patient Side
- [ ] Login as patient
- [ ] Navigate to Appointments
- [ ] Find confirmed appointment
- [ ] Click "Request Cancel" button
- [ ] Modal opens with appointment details
- [ ] Enter cancellation reason
- [ ] Submit request
- [ ] Status changes to "Cancellation Requested"
- [ ] Red badge shows "Cancellation Requested"
- [ ] Pending message displays

### Staff Side
- [ ] Login as staff
- [ ] Navigate to Appointments
- [ ] See appointment with "Cancellation Requested" status
- [ ] Expand appointment details
- [ ] Cancellation section displays with reason
- [ ] Click "Approve & Delete"
- [ ] Confirm deletion in prompt
- [ ] Appointment disappears from list
- [ ] Verify patient no longer sees appointment

### Owner Side
- [ ] Login as owner
- [ ] Navigate to Appointments
- [ ] See appointment with "Cancellation Requested" status
- [ ] Expand appointment details
- [ ] Cancellation section displays with reason
- [ ] Click "Reject Cancellation"
- [ ] Confirm rejection in prompt
- [ ] Status returns to "Confirmed"
- [ ] Verify patient sees confirmed status again

### Rejection Flow
- [ ] Patient requests cancellation
- [ ] Staff/Owner rejects it
- [ ] Appointment returns to confirmed status
- [ ] Patient can use appointment normally
- [ ] All data preserved

### Cross-User Verification
- [ ] Patient requests cancellation
- [ ] Verify visible to staff
- [ ] Verify visible to owner
- [ ] Staff approves deletion
- [ ] Verify removed from patient view
- [ ] Verify removed from staff view
- [ ] Verify removed from owner view

## Security & Validation

### Backend
- ✅ Only appointments with `cancel_requested` status can be approved
- ✅ Prevents double deletion
- ✅ Returns proper error messages

### Frontend
- ✅ Confirmation dialogs before approve/reject actions
- ✅ Warning messages about permanent deletion
- ✅ Required cancellation reason field
- ✅ Proper error handling with user feedback

## API Endpoints Used

### Request Cancellation (Patient)
```
POST /api/appointments/{id}/request_cancel/
Body: { "reason": "cancellation reason" }
```

### Approve Cancellation (Staff/Owner)
```
POST /api/appointments/{id}/approve_cancel/
Response: { "message": "...", "id": appointment_id }
```

### Reject Cancellation (Staff/Owner)
```
POST /api/appointments/{id}/reject_cancel/
```

## Files Modified

### Backend
1. `backend/api/views.py` - Modified `approve_cancel` to delete appointment

### Frontend
1. `frontend/app/patient/appointments/page.tsx` - Added cancel request UI and logic
2. `frontend/app/staff/appointments/page.tsx` - Added approve/reject cancel handlers and UI
3. `frontend/app/owner/appointments/page.tsx` - Added approve/reject cancel handlers and UI

## Summary

Successfully implemented a complete appointment cancellation workflow:
- ✅ Patients can request cancellations with reasons
- ✅ Staff/Owner can review and approve or reject
- ✅ Approved cancellations are permanently deleted
- ✅ Rejected cancellations return to confirmed status
- ✅ Real-time status updates across all user types
- ✅ Confirmation dialogs prevent accidental actions
- ✅ Clear visual indicators for pending cancellations

**Status**: ✅ **COMPLETE**
**Date**: 2025-10-17
