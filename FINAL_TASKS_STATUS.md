# Remaining Implementation Tasks

## Task 8: Cancel Appointment Request (90% Complete)

### Backend ✅ COMPLETE
- Added `cancel_requested` status to Appointment model
- Added `cancel_reason` and `cancel_requested_at` fields
- Created migration 0005 (already applied)
- Added 3 API endpoints:
  - `POST /appointments/{id}/request_cancel/` - Patient requests cancellation
  - `POST /appointments/{id}/approve_cancel/` - Staff/Owner approves
  - `POST /appointments/{id}/reject_cancel/` - Staff/Owner rejects

### Frontend API ✅ COMPLETE
- Added `api.requestCancel(id, reason, token)`
- Added `api.approveCancel(id, token)`
- Added `api.rejectCancel(id, token)`

### Patient UI ⏳ IN PROGRESS
**What's Done:**
- Added XCircle icon import
- Added `cancel_requested` to status type
- Added state: `showCancelModal`, `cancelReason`

**What's Needed (COPY THIS CODE):**

1. Add handler function after `handleRequestReschedule`:
```typescript
  const handleRequestCancel = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setCancelReason("")
    setShowCancelModal(true)
  }

  const handleSubmitCancel = async () => {
    if (!token || !selectedAppointment || !cancelReason.trim()) return

    try {
      await api.requestCancel(selectedAppointment.id, cancelReason, token)
      setShowCancelModal(false)
      setSelectedAppointment(null)
      setCancelReason("")
      // Refresh appointments
      const appointments = await api.getAppointments(token)
      setAllAppointments(appointments)
    } catch (error) {
      console.error("Error requesting cancellation:", error)
      alert("Failed to request cancellation")
    }
  }
```

2. Add cancel button next to reschedule button (around line 340):
```typescript
                {/* Reschedule and Cancel buttons for confirmed appointments */}
                {appointment.status === "confirmed" && activeTab === "upcoming" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequestReschedule(appointment)}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Request Reschedule
                    </button>
                    <button
                      onClick={() => handleRequestCancel(appointment)}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Request Cancel
                    </button>
                  </div>
                )}
```

3. Add cancel modal after the reschedule modal (around line 590):
```typescript
      {/* Cancel Request Modal */}
      {showCancelModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[var(--color-primary)]">Request Cancellation</h2>
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setSelectedAppointment(null)
                  setCancelReason("")
                }}
                className="p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-[var(--color-text-muted)] mb-4">
                  You are requesting to cancel the following appointment:
                </p>
                <div className="bg-[var(--color-background)] rounded-lg p-4 space-y-2">
                  <p><strong>Service:</strong> {selectedAppointment.service_name}</p>
                  <p><strong>Date:</strong> {new Date(selectedAppointment.date).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> {selectedAppointment.time}</p>
                  <p><strong>Dentist:</strong> {selectedAppointment.dentist_name}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Reason for Cancellation *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason for cancellation..."
                  rows={4}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--color-border)]">
                <button
                  onClick={() => {
                    setShowCancelModal(false)
                    setSelectedAppointment(null)
                    setCancelReason("")
                  }}
                  className="flex-1 px-6 py-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitCancel}
                  disabled={!cancelReason.trim()}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
```

### Staff/Owner UI ⏳ TODO
Add approval buttons in `staff/appointments/page.tsx` and `owner/appointments/page.tsx`:
- Show cancel request status badge
- Add "Approve" and "Reject" buttons for `cancel_requested` appointments
- Similar to reschedule approval buttons

---

## Task 9: Auto-Create Dental Records on Completion

### Backend TODO
Add to `AppointmentViewSet` in `backend/api/views.py`:

```python
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark appointment as completed and auto-create dental record"""
        appointment = self.get_object()
        
        if appointment.status == 'completed':
            return Response(
                {'error': 'Appointment already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mark as completed
        appointment.status = 'completed'
        appointment.save()
        
        # Auto-create dental record
        dental_record = DentalRecord.objects.create(
            patient=appointment.patient,
            appointment=appointment,
            treatment=appointment.service.name if appointment.service else 'General Checkup',
            diagnosis=f'Completed: {appointment.service.name if appointment.service else "General Visit"}',
            notes=appointment.notes,
            created_by=request.user
        )
        
        serializer = self.get_serializer(appointment)
        return Response({
            'appointment': serializer.data,
            'dental_record_id': dental_record.id
        })
```

### Frontend API TODO
Add to `frontend/lib/api.ts`:

```typescript
  completeAppointment: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}/complete/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    })
    if (!response.ok) throw new Error("Failed to complete appointment")
    return response.json()
  },
```

### Frontend UI TODO
In staff/owner appointment pages:
- Change "Mark Complete" button to call `api.completeAppointment()`
- Show success message: "Appointment completed and dental record created"

---

## Task 10: Fix Dr. Dr. Duplication ✅ COMPLETE
- Updated both `staff/appointments/page.tsx` and `owner/appointments/page.tsx`
- Changed dropdown to check if name starts with "Dr." before adding prefix
- Code: `{s.first_name.startsWith('Dr.') ? '' : 'Dr. '}{s.first_name} {s.last_name}`

---

## Summary of All 10 Tasks

1. ✅ Service dropdown for staff/owner appointments
2. ✅ Fix appointment creation error
3. ✅ Verify calendar appointment details
4. ✅ Create dental records system
5. ✅ Add dental records backend models
6. ✅ Add X-ray documents viewing page (patient)
7. ✅ Add X-ray upload for staff/owner
8. 🔄 Cancel appointment request (90% - needs patient UI completion)
9. ⏳ Auto-create dental records on completion
10. ✅ Fix Dr. Dr. duplication

**8/10 Complete, 1 In Progress, 1 Remaining**
