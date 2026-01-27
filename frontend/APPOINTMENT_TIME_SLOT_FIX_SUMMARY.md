# Appointment Time Slot Filtering Fix (2026-01-27)

## Summary
This update fixes the issue where past time slots (e.g., 10:00 AM) were still available for booking on the owner and staff appointment portals, even after the time had already passed for the current day. The root cause was incorrect date parsing and comparison logic, especially with how JavaScript's `Date` object handles `YYYY-MM-DD` strings (UTC vs. local time).

## Key Changes

### 1. Owner Portal
- **File:** `frontend/app/owner/appointments/page.tsx`
- **Fix:**
  - Added a `parseDateOnly` helper to parse `YYYY-MM-DD` as a local date.
  - Updated the `generateTimeSlots` function to use this helper and correctly detect if the selected date is today.
  - Now, any time slot whose start time has already passed (for today) is hidden from the booking UI.

### 2. Staff Portal
- **File:** `frontend/app/staff/appointments/page.tsx`
- **Fix:**
  - Same `parseDateOnly` helper and logic as above.
  - Ensures staff cannot book appointments for time slots that have already started today.

## Technical Details
- The previous logic used `new Date(selectedDate)` which parses as UTC, causing the `isToday` check to fail in some time zones.
- The new logic splits the date string and constructs a local `Date` object for accurate comparison.
- The time slot filtering now uses: `if (isToday && totalMinutes <= currentTimeInMinutes) continue;` to hide any slot that has already started.

## User Impact
- Users can no longer book appointments for time slots that have already started today.
- The UI will only show valid, future time slots for the current day.

---

**Commit message used:**

```
Fix: Hide past time slots for today in appointment booking (owner/staff portals)

- Parse selected date as local date to avoid UTC bug
- Only show time slots whose start time is in the future for today
- Affects both owner and staff appointment creation UIs
```
