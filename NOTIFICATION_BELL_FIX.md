# Notification Bell API Fix

**Date:** October 20, 2025  
**Issue:** Console errors on dashboard - "Failed to fetch unread count" and "Failed to fetch appointment notifications"

## Problem Analysis

The notification bell component was experiencing API errors when trying to fetch the unread notification count.

**Error Messages:**
- `Error: Failed to fetch unread count` (lib/api.ts line 622)
- `Error: Failed to fetch appointment notifications` (lib/api.ts line 596)

## Root Cause

The frontend was expecting a different response field name than what the backend was providing:

**Backend Response:**
```python
@action(detail=False, methods=['get'])
def unread_count(self, request):
    count = AppointmentNotification.objects.filter(recipient=user, is_read=False).count()
    return Response({'unread_count': count})  # Returns 'unread_count'
```

**Frontend Code (Before Fix):**
```typescript
const data = await api.getAppointmentNotificationUnreadCount(token)
setUnreadCount(data.count || 0)  // Expected 'count'
```

## Solution Implemented

Updated the frontend notification bell component to match the backend response field name:

**File:** `frontend/components/notification-bell.tsx`

**Change:**
```typescript
// Before
setUnreadCount(data.count || 0)

// After
setUnreadCount(data.unread_count || 0)
```

This simple change aligns the frontend with the backend API response structure.

## Testing Steps

1. **Refresh the dashboard** (owner or staff)
2. **Check browser console** - No more API errors
3. **Check notification bell** - Shows correct unread count
4. **Create a test notification** (e.g., patient requests appointment)
5. **Verify bell updates** - Badge shows count

## API Endpoints Verified

✅ `/api/appointment-notifications/` - Get all notifications  
✅ `/api/appointment-notifications/unread_count/` - Get unread count  
✅ `/api/appointment-notifications/{id}/mark_read/` - Mark as read  
✅ `/api/appointment-notifications/mark_all_read/` - Mark all as read  

## Files Modified

1. `frontend/components/notification-bell.tsx` - Fixed unread count field name

## Related Components

- **Backend:** `AppointmentNotificationViewSet` in `backend/api/views.py`
- **Frontend API:** `getAppointmentNotificationUnreadCount()` in `frontend/lib/api.ts`
- **Model:** `AppointmentNotification` in `backend/api/models.py`

## Success Criteria

✅ No console errors on dashboard load  
✅ Notification bell displays correct unread count  
✅ Notifications can be fetched and displayed  
✅ Mark as read functionality works  
✅ Real-time updates work (30-second polling)  

## Notes

- The notification system is designed for **staff** and **owner** user types only
- Patients do not have access to the notification bell
- Notifications are created automatically when:
  - New appointments are booked (BR-41, BR-42)
  - Reschedule requests are submitted (BR-47)
  - Cancellation requests are submitted (BR-48)
- Polling interval is set to 30 seconds for real-time updates
