# Reschedule and Cancel Features Implementation

## Overview
This document tracks the implementation of patient reschedule/cancel functionality and notification system for staff and owner.

## Requirements Summary

### 1. Patient Side - Reschedule and Cancel Options
- ✅ Add Reschedule button for patients
- ✅ Add Cancel button for patients  
- ✅ Reschedule creates a request (not auto-approved)
- ✅ Cancel creates a request (not auto-approved)
- ⏳ Display buttons based on appointment status

### 2. Appointment Status Logic
- ✅ Remove 'pending' status (default now 'confirmed')
- ✅ Add 'missed' status
- ✅ Add 'reschedule_requested' status
- ✅ Add 'cancel_requested' status
- ⏳ Show reschedule button only for missed appointments
- ⏳ Hide status display for new confirmed appointments

### 3. Notifications for Staff and Owner
- ✅ Notifications sent when appointment booked
- ✅ Notifications sent when reschedule requested
- ✅ Notifications sent when cancel requested
- ✅ Notification bell icon component exists
- ⏳ Integrate bell into staff/owner layouts
- ⏳ Add approve/reject actions in notifications

---

## Backend Changes Completed ✅

### 1. Models (`backend/api/models.py`)

**Appointment Model:**
```python
STATUS_CHOICES = (
    ('confirmed', 'Confirmed'),      # New default (was 'pending')
    ('cancelled', 'Cancelled'),
    ('completed', 'Completed'),
    ('missed', 'Missed'),            # NEW
    ('reschedule_requested', 'Reschedule Requested'),
    ('cancel_requested', 'Cancel Requested'),
)
status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='confirmed')
```

**New AppointmentNotification Model:**
```python
class AppointmentNotification(models.Model):
    recipient = ForeignKey(User)  # Staff or Owner
    appointment = ForeignKey(Appointment)
    notification_type = CharField(choices=[
        ('new_appointment', 'New Appointment'),
        ('reschedule_request', 'Reschedule Request'),
        ('cancel_request', 'Cancel Request'),
        ('appointment_cancelled', 'Appointment Cancelled'),
    ])
    message = TextField()
    is_read = BooleanField(default=False)
    created_at = DateTimeField(auto_now_add=True)
```

### 2. Views (`backend/api/views.py`)

**Helper Function:**
```python
def create_appointment_notification(appointment, notification_type, custom_message=None):
    """Creates notifications for all staff and owner users"""
    recipients = User.objects.filter(Q(user_type='staff') | Q(user_type='owner'))
    for recipient in recipients:
        AppointmentNotification.objects.create(...)
```

**New Endpoints:**
- `POST /api/appointments/{id}/request_reschedule/` - Patient requests reschedule
- `POST /api/appointments/{id}/approve_reschedule/` - Staff/Owner approves
- `POST /api/appointments/{id}/reject_reschedule/` - Staff/Owner rejects
- `POST /api/appointments/{id}/request_cancel/` - Patient requests cancel
- `POST /api/appointments/{id}/approve_cancel/` - Staff/Owner approves (deletes appointment)
- `POST /api/appointments/{id}/reject_cancel/` - Staff/Owner rejects

**AppointmentNotificationViewSet:**
- `GET /api/appointment-notifications/` - Get all notifications
- `POST /api/appointment-notifications/{id}/mark_read/` - Mark as read
- `POST /api/appointment-notifications/mark_all_read/` - Mark all as read
- `GET /api/appointment-notifications/unread_count/` - Get unread count

### 3. Serializers (`backend/api/serializers.py`)

**AppointmentNotificationSerializer:**
- Includes recipient name and detailed appointment info
- Returns reschedule details when applicable
- Returns cancel reason when applicable

### 4. URLs (`backend/api/urls.py`)
```python
router.register('appointment-notifications', AppointmentNotificationViewSet)
```

### 5. Admin (`backend/api/admin.py`)
```python
@admin.register(AppointmentNotification)
class AppointmentNotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'notification_type', 'is_read', 'created_at')
```

### 6. Migration
```
✅ Applied: 0009_alter_appointment_status_appointmentnotification
- Changed appointment.status default from 'pending' to 'confirmed'
- Added 'missed' status option
- Created AppointmentNotification table
```

---

## Frontend Changes Completed ✅

### 1. API Client (`frontend/lib/api.ts`)

**New Methods:**
```typescript
// Reschedule
requestReschedule(id, data: {date, time, service?, dentist?, notes?}, token)
approveReschedule(id, token)
rejectReschedule(id, token)

// Cancel
requestCancel(id, reason, token)
approveCancel(id, token)
rejectCancel(id, token)

// Appointment Notifications
getAppointmentNotifications(token)
markAppointmentNotificationRead(id, token)
markAllAppointmentNotificationsRead(token)
getAppointmentNotificationUnreadCount(token)
```

---

## Frontend Changes Needed ⏳

### 1. Patient Appointments Page (`frontend/app/patient/appointments/page.tsx`)

**Update Interface:**
```typescript
interface Appointment {
  // ... existing fields ...
  status: "confirmed" | "cancelled" | "completed" | "missed" | 
          "reschedule_requested" | "cancel_requested"  // Update this
}
```

**Add Reschedule Modal State:**
```typescript
const [showRescheduleModal, setShowRescheduleModal] = useState(false)
const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null)
const [rescheduleData, setRescheduleData] = useState({
  date: '',
  time: '',
  service: null as number | null,
  dentist: null as number | null,
  notes: ''
})
```

**Add Cancel Modal State:**
```typescript
const [showCancelModal, setShowCancelModal] = useState(false)
const [cancelAppointment, setCancelAppointment] = useState<Appointment | null>(null)
const [cancelReason, setCancelReason] = useState('')
```

**Add Request Handlers:**
```typescript
const handleRescheduleRequest = async () => {
  try {
    await api.requestReschedule(rescheduleAppointment!.id, rescheduleData, token!)
    toast.success("Reschedule request sent successfully")
    fetchAppointments() // Refresh
    setShowRescheduleModal(false)
  } catch (error) {
    toast.error("Failed to request reschedule")
  }
}

const handleCancelRequest = async () => {
  try {
    await api.requestCancel(cancelAppointment!.id, cancelReason, token!)
    toast.success("Cancel request sent successfully")
    fetchAppointments()
    setShowCancelModal(false)
  } catch (error) {
    toast.error("Failed to request cancellation")
  }
}
```

**Update Appointment Display:**
```tsx
{/* Show status only for special cases */}
{appointment.status !== 'confirmed' && (
  <Badge variant={
    appointment.status === 'completed' ? 'success' :
    appointment.status === 'missed' ? 'destructive' :
    appointment.status === 'reschedule_requested' ? 'warning' :
    appointment.status === 'cancel_requested' ? 'warning' :
    'default'
  }>
    {appointment.status.replace('_', ' ').toUpperCase()}
  </Badge>
)}

{/* Show action buttons based on status */}
{appointment.status === 'confirmed' && (
  <>
    <Button onClick={() => openRescheduleModal(appointment)}>
      Reschedule
    </Button>
    <Button variant="destructive" onClick={() => openCancelModal(appointment)}>
      Cancel
    </Button>
  </>
)}

{appointment.status === 'missed' && (
  <Button onClick={() => openRescheduleModal(appointment)}>
    Reschedule
  </Button>
)}

{appointment.status === 'reschedule_requested' && (
  <Badge variant="warning">Reschedule Pending Approval</Badge>
)}

{appointment.status === 'cancel_requested' && (
  <Badge variant="warning">Cancellation Pending Approval</Badge>
)}
```

### 2. Notification Bell Enhancement (`frontend/components/notification-bell.tsx`)

**Current State:**
- ✅ Component exists for dentists
- ✅ Shows unread count
- ✅ Mark as read functionality

**Needed Changes:**
```typescript
// Switch to use appointment-notifications endpoint for staff/owner
const fetchNotifications = async () => {
  if (user?.user_type === 'staff' || user?.user_type === 'owner') {
    const data = await api.getAppointmentNotifications(token!)
    setNotifications(data)
    const count = await api.getAppointmentNotificationUnreadCount(token!)
    setUnreadCount(count.unread_count)
  }
}

// Add approve/reject handlers
const handleApproveReschedule = async (appointmentId: number, notificationId: number) => {
  try {
    await api.approveReschedule(appointmentId, token!)
    await api.markAppointmentNotificationRead(notificationId, token!)
    toast.success("Reschedule approved")
    fetchNotifications()
  } catch (error) {
    toast.error("Failed to approve reschedule")
  }
}

const handleRejectReschedule = async (appointmentId: number, notificationId: number) => {
  try {
    await api.rejectReschedule(appointmentId, token!)
    await api.markAppointmentNotificationRead(notificationId, token!)
    toast.success("Reschedule rejected")
    fetchNotifications()
  } catch (error) {
    toast.error("Failed to reject reschedule")
  }
}

const handleApproveCancel = async (appointmentId: number, notificationId: number) => {
  try {
    await api.approveCancel(appointmentId, token!)
    await api.markAppointmentNotificationRead(notificationId, token!)
    toast.success("Cancellation approved")
    fetchNotifications()
  } catch (error) {
    toast.error("Failed to approve cancellation")
  }
}

const handleRejectCancel = async (appointmentId: number, notificationId: number) => {
  try {
    await api.rejectCancel(appointmentId, token!)
    await api.markAppointmentNotificationRead(notificationId, token!)
    toast.success("Cancellation rejected")
    fetchNotifications()
  } catch (error) {
    toast.error("Failed to reject cancellation")
  }
}
```

**Update Notification Display:**
```tsx
<Card key={notification.id}>
  <p>{notification.message}</p>
  <p className="text-sm text-muted-foreground">
    {new Date(notification.created_at).toLocaleString()}
  </p>
  
  {/* Show approve/reject buttons for requests */}
  {notification.notification_type === 'reschedule_request' && (
    <div className="flex gap-2 mt-2">
      <Button 
        size="sm" 
        onClick={() => handleApproveReschedule(
          notification.appointment_details.id,
          notification.id
        )}
      >
        Approve
      </Button>
      <Button 
        size="sm" 
        variant="destructive"
        onClick={() => handleRejectReschedule(
          notification.appointment_details.id,
          notification.id
        )}
      >
        Reject
      </Button>
    </div>
  )}
  
  {notification.notification_type === 'cancel_request' && (
    <div className="flex gap-2 mt-2">
      <Button 
        size="sm" 
        onClick={() => handleApproveCancel(
          notification.appointment_details.id,
          notification.id
        )}
      >
        Approve Cancellation
      </Button>
      <Button 
        size="sm" 
        variant="secondary"
        onClick={() => handleRejectCancel(
          notification.appointment_details.id,
          notification.id
        )}
      >
        Reject
      </Button>
    </div>
  )}
</Card>
```

### 3. Layout Integration

**Staff Layout (`frontend/app/staff/layout.tsx`):**
```tsx
import { NotificationBell } from "@/components/notification-bell"

// Add to navigation
<NotificationBell />
```

**Owner Layout (`frontend/app/owner/layout.tsx`):**
```tsx
import { NotificationBell } from "@/components/notification-bell"

// Add to navigation
<NotificationBell />
```

---

## Testing Checklist ⏳

### Patient Side:
- [ ] Book new appointment (should be 'confirmed' by default)
- [ ] Click 'Reschedule' on confirmed appointment
- [ ] Fill reschedule form and submit
- [ ] Verify status changes to 'reschedule_requested'
- [ ] Click 'Cancel' on confirmed appointment
- [ ] Enter cancel reason and submit
- [ ] Verify status changes to 'cancel_requested'
- [ ] Verify reschedule button appears only for missed appointments
- [ ] Verify confirmed appointments don't show status badge

### Staff/Owner Side:
- [ ] See notification bell with unread count
- [ ] Click bell to see notification list
- [ ] See new appointment notifications
- [ ] See reschedule request notifications
- [ ] See cancel request notifications
- [ ] Click 'Approve' on reschedule request
- [ ] Verify appointment updates to new date/time
- [ ] Click 'Reject' on reschedule request
- [ ] Verify appointment stays on original date/time
- [ ] Click 'Approve' on cancel request
- [ ] Verify appointment is deleted
- [ ] Click 'Reject' on cancel request
- [ ] Verify appointment status returns to 'confirmed'

### Cross-User Flow:
- [ ] Patient books appointment → Staff/Owner receives notification
- [ ] Patient requests reschedule → Staff/Owner receives notification
- [ ] Staff approves reschedule → Appointment updates
- [ ] Patient requests cancel → Staff/Owner receives notification
- [ ] Owner approves cancel → Appointment deleted
- [ ] Verify notifications mark as read

---

## Next Steps

1. ✅ Backend implementation complete
2. ✅ API client updated
3. ⏳ **Update patient appointments page with reschedule/cancel functionality**
4. ⏳ **Enhance notification bell with approve/reject actions**
5. ⏳ **Integrate notification bell into staff/owner layouts**
6. ⏳ **Full end-to-end testing**

## Files Modified

### Backend:
- `backend/api/models.py` - Added AppointmentNotification, updated Appointment status
- `backend/api/views.py` - Added notification helper, reschedule/cancel endpoints
- `backend/api/serializers.py` - Added AppointmentNotificationSerializer
- `backend/api/urls.py` - Added appointment-notifications route
- `backend/api/admin.py` - Added AppointmentNotificationAdmin
- `backend/api/migrations/0009_alter_appointment_status_appointmentnotification.py` - Migration

### Frontend:
- `frontend/lib/api.ts` - Added reschedule/cancel/notification API methods

### To Be Modified:
- `frontend/app/patient/appointments/page.tsx` - Add reschedule/cancel UI
- `frontend/components/notification-bell.tsx` - Add approve/reject actions
- `frontend/app/staff/layout.tsx` - Integrate notification bell
- `frontend/app/owner/layout.tsx` - Integrate notification bell

---

## Notes

- The system now defaults new appointments to 'confirmed' instead of 'pending'
- Notifications are sent to **all staff and owner users**, not just the assigned dentist
- Approving a cancellation **deletes** the appointment (as per original design)
- The old DentistNotification model is kept for backward compatibility
- Missed appointments allow reschedule but confirmed appointments can reschedule or cancel

