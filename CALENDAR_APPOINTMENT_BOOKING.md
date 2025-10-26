# Calendar-Based Appointment Booking with Dentist Availability

## Feature Overview

The patient appointment booking system now includes a **visual calendar** that automatically highlights available dates based on the selected dentist's weekly schedule.

---

## How It Works

### For Patients (Booking Appointments)

1. **Select a Dentist First**
   - Open the "New Appointment" modal
   - Choose a dentist from the dropdown
   - The system fetches that dentist's weekly availability schedule

2. **Calendar Shows Available Dates**
   - A visual calendar appears after selecting a dentist
   - **Green highlighted dates** = Dentist is available
   - **Grayed out dates** = Dentist is not available or unavailable days
   - Only shows dates for the next 90 days
   - Past dates are automatically disabled

3. **Select Date & Time**
   - Click any green-highlighted date to select it
   - Time input appears with available hours shown below
   - Available hours are based on the dentist's schedule for that day

4. **Complete Booking**
   - Choose service/treatment
   - Add optional notes
   - Submit appointment request

### For Dentists (Setting Availability)

1. **Go to Profile Page**
   - Staff: `/staff/profile`
   - Owner: `/owner/profile`

2. **Scroll to "My Schedule" Section**
   - See weekly calendar (Sunday - Saturday)
   - Toggle availability for each day
   - Set time ranges (e.g., 9:00 AM - 5:00 PM)

3. **Save Availability**
   - Changes reflect immediately in patient booking calendar
   - Patients can only book on days/times marked as available

---

## User Experience Flow

### Patient Booking Flow

```
1. Click "New Appointment" button
   ↓
2. Select Dentist from dropdown
   ↓ (System fetches dentist availability)
3. Calendar appears with available dates highlighted in green
   ↓
4. Click a green date to select
   ↓
5. Time input appears with suggested hours
   ↓
6. Select service and add notes
   ↓
7. Submit appointment request
```

### Visual Indicators

**Calendar Colors:**
- 🟢 **Green (Available)**: Dentist has set availability for this day
- ⚫ **Gray (Unavailable)**: Dentist is not available or past date
- 🔵 **Blue (Selected)**: Currently selected date

**Messages:**
- ✓ "Available dates are highlighted in the calendar below" (after selecting dentist)
- ⚠️ "This dentist has no available schedule set" (if dentist hasn't set schedule)
- "Available hours: 09:00 - 17:00" (shows time range for selected date)

---

## Technical Implementation

### Frontend Components

**File**: `app/patient/appointments/page.tsx`

**New State Variables:**
```typescript
const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
const [dentistAvailability, setDentistAvailability] = useState<any[]>([])
const [availableDates, setAvailableDates] = useState<Set<string>>(new Set())
```

**Calendar Component:**
```typescript
import { Calendar } from "@/components/ui/calendar"
```

**Key Features:**
1. **Availability Fetching**: When dentist is selected, fetches their weekly schedule
2. **Date Calculation**: Calculates next 90 days and checks which days match dentist's available days
3. **Calendar Modifiers**: Highlights available dates in green
4. **Disabled Dates**: Automatically disables past dates and unavailable dates
5. **Time Range Display**: Shows dentist's available hours for selected date

### API Integration

**Endpoint Used:**
```typescript
api.getStaffAvailability(dentistId, token)
```

**Response Format:**
```json
[
  {
    "id": 1,
    "day_of_week": 1,  // 0=Sunday, 1=Monday, etc.
    "day_name": "Monday",
    "is_available": true,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "staff_name": "Dr. John Smith"
  },
  // ... more days
]
```

### Availability Logic

```typescript
// For each day in next 90 days
for (let i = 0; i < 90; i++) {
  const checkDate = new Date(today)
  checkDate.setDate(today.getDate() + i)
  const dayOfWeek = checkDate.getDay() // 0-6
  
  // Find if dentist has availability for this day of week
  const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek)
  
  // If available, add to available dates set
  if (dayAvailability && dayAvailability.is_available) {
    dates.add(checkDate.toISOString().split('T')[0])
  }
}
```

---

## Benefits

### For Patients
✅ Visual representation of available dates  
✅ No need to guess which dates are available  
✅ Prevents booking on dentist's off days  
✅ See available time ranges upfront  
✅ Better booking experience  

### For Staff/Dentists
✅ Control over schedule visibility  
✅ Patients can only book on available days  
✅ Reduces invalid appointment requests  
✅ Less back-and-forth communication  

### For Clinic
✅ More efficient appointment scheduling  
✅ Reduced appointment conflicts  
✅ Better resource management  
✅ Improved patient satisfaction  

---

## Testing Guide

### Test Scenario 1: Dentist with Full Schedule

1. **Setup:**
   - Login as staff/owner
   - Go to profile page
   - Set availability: Mon-Fri (9 AM - 5 PM), Sat (9 AM - 1 PM)
   - Save schedule

2. **Test:**
   - Login as patient
   - Create new appointment
   - Select that dentist
   - **Expected**: Calendar shows Mon-Sat highlighted in green, Sunday grayed out

### Test Scenario 2: Dentist with Limited Schedule

1. **Setup:**
   - Login as staff/owner
   - Go to profile
   - Set availability: Only Tuesday and Thursday (10 AM - 4 PM)
   - Save schedule

2. **Test:**
   - Login as patient
   - Select that dentist
   - **Expected**: Only Tuesdays and Thursdays highlighted, all other days grayed out

### Test Scenario 3: No Schedule Set

1. **Setup:**
   - Login as staff/owner
   - Go to profile
   - Leave all days unchecked (not available)
   - Save

2. **Test:**
   - Login as patient
   - Select that dentist
   - **Expected**: Warning message "This dentist has no available schedule set"
   - All calendar dates grayed out

### Test Scenario 4: Date Selection

1. Select dentist
2. Click a green-highlighted date
3. **Expected**:
   - Date becomes selected (blue border)
   - Time input appears
   - Available hours shown below time input
   - Form allows submission

### Test Scenario 5: Past Dates

1. Select dentist
2. Look at calendar
3. **Expected**: Today and future dates selectable, past dates grayed out

---

## Edge Cases Handled

✅ **No dentist selected**: Calendar doesn't appear until dentist is chosen  
✅ **Change dentist**: Calendar resets and fetches new availability  
✅ **Past dates**: Automatically disabled regardless of dentist availability  
✅ **Future limit**: Only shows 90 days ahead  
✅ **No schedule set**: Shows warning message  
✅ **Modal close**: Resets all selections  
✅ **Cancel button**: Clears form data  

---

## Code Locations

### Modified Files

**Frontend:**
- `app/patient/appointments/page.tsx` - Main appointment booking page
  - Added Calendar import
  - Added state for date selection and availability
  - Added useEffect to fetch dentist availability
  - Replaced date input with Calendar component
  - Added availability filtering logic

### Dependencies

**Components:**
- `@/components/ui/calendar` - Shadcn Calendar component
- `react-day-picker` - Underlying calendar library

**API:**
- `api.getStaffAvailability()` - Fetches dentist weekly schedule

---

## Future Enhancements

### Potential Improvements

1. **Real-time Updates**
   - WebSocket connection to update calendar when dentist changes schedule
   - Show "This date just became unavailable" message

2. **Time Slot Selection**
   - Show available time slots as buttons (9:00 AM, 10:00 AM, etc.)
   - Disable fully booked time slots
   - Show "X appointments remaining" per slot

3. **Multi-dentist View**
   - "Show me all available dentists on [date]"
   - Calendar shows dates available for ANY dentist

4. **Smart Suggestions**
   - "Next available appointment: Tuesday, Oct 24 at 10:00 AM"
   - Quick-select buttons for "Tomorrow", "This Week", "Next Week"

5. **Recurring Appointments**
   - "Book every Tuesday at 2 PM for next 4 weeks"
   - Batch appointment creation

6. **Mobile Optimization**
   - Swipe gestures for month navigation
   - Larger touch targets for dates
   - Responsive calendar size

---

## Known Limitations

1. **90-Day Window**: Only shows 90 days ahead (design decision to keep data manageable)
2. **Day-Level Granularity**: Highlights entire days, not specific time slots
3. **No Booking Conflicts**: Doesn't check if time slot is already fully booked
4. **Client-Side Calculation**: Availability calculated on frontend (fast but could be server-side)

---

## Troubleshooting

### Issue: Calendar not showing available dates

**Check:**
1. Is dentist selected?
2. Has dentist set their availability in profile?
3. Check browser console for API errors
4. Verify `api.getStaffAvailability()` returns data

**Solution:**
- Ask dentist to set their schedule
- Check network tab for failed API calls
- Verify token is valid

### Issue: All dates grayed out

**Possible Causes:**
1. Dentist hasn't set any availability
2. All days marked as "not available"
3. API error fetching availability

**Solution:**
- Show warning message to user
- Contact clinic to set schedule
- Check backend for schedule data

### Issue: Wrong dates highlighted

**Check:**
1. Dentist's schedule saved correctly?
2. Timezone issues?
3. Day of week calculation correct?

**Debug:**
```typescript
console.log('Availability:', dentistAvailability)
console.log('Available dates:', Array.from(availableDates))
```

---

## Summary

✅ **Implemented**: Visual calendar with dentist availability highlighting  
✅ **User-Friendly**: Green dates = available, gray = unavailable  
✅ **Integrated**: Works with existing appointment booking flow  
✅ **Dynamic**: Updates when dentist changes schedule  
✅ **Validated**: Prevents booking on unavailable dates  

**Next Steps**: Test with real users and gather feedback for improvements!
