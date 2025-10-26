# Visual Flow Diagram - Calendar Appointment Booking

## 📅 PATIENT VIEW - Booking Flow

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Open "New Appointment" Modal                       │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Request Appointment                              [X]  │ │
│  │                                                        │ │
│  │  ℹ Note: Your appointment request will be pending     │ │
│  │  until confirmed by our staff                         │ │
│  │                                                        │ │
│  │  Preferred Dentist *                                  │ │
│  │  ┌──────────────────────────────────────────────┐    │ │
│  │  │ Select a dentist first...              [▼]  │    │ │
│  │  └──────────────────────────────────────────────┘    │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

                          ⬇ User selects dentist

┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Dentist Selected - Calendar Appears                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Preferred Dentist *                                  │ │
│  │  ┌──────────────────────────────────────────────┐    │ │
│  │  │ Dr. Ezekiel Galauran              [▼]       │    │ │
│  │  └──────────────────────────────────────────────┘    │ │
│  │  ✓ Available dates are highlighted in calendar below │ │
│  │                                                        │ │
│  │  Select Date *                                        │ │
│  │  ┌──────────────────────────────────────────────┐    │ │
│  │  │          October 2025                        │    │ │
│  │  │  Su  Mo  Tu  We  Th  Fr  Sa                 │    │ │
│  │  │      🟢  🟢  🟢  🟢  🟢  ⚫                   │    │ │
│  │  │  ⚫  🟢  🟢  🟢  🟢  🟢  ⚫                   │    │ │
│  │  │  ⚫  🟢  🟢  🟢  🟢  🟢  ⚫                   │    │ │
│  │  │                                               │    │ │
│  │  │  🟢 = Available  ⚫ = Not Available          │    │ │
│  │  └──────────────────────────────────────────────┘    │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

                    ⬇ User clicks green date (e.g., Tuesday)

┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Date Selected - Time Input Appears                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Select Date *                                        │ │
│  │  ┌──────────────────────────────────────────────┐    │ │
│  │  │          October 2025                        │    │ │
│  │  │  Su  Mo  Tu  We  Th  Fr  Sa                 │    │ │
│  │  │      🟢  🔵  🟢  🟢  🟢  ⚫                   │    │ │
│  │  │                 ↑ Selected                    │    │ │
│  │  └──────────────────────────────────────────────┘    │ │
│  │                                                        │ │
│  │  Preferred Time *                                     │ │
│  │  ┌──────────────────────────────────────────────┐    │ │
│  │  │ 14:00                                        │    │ │
│  │  └──────────────────────────────────────────────┘    │ │
│  │  Available hours: 09:00 - 17:00                      │ │
│  │                                                        │ │
│  │  Treatment/Service *                                  │ │
│  │  ┌──────────────────────────────────────────────┐    │ │
│  │  │ General Checkup                     [▼]     │    │ │
│  │  └──────────────────────────────────────────────┘    │ │
│  │                                                        │ │
│  │  [ Cancel ]  [ Submit Request ]                      │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏥 DENTIST VIEW - Setting Schedule

```
┌─────────────────────────────────────────────────────────────┐
│  Profile Page → "My Schedule" Section                        │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  🕐 Weekly Availability                               │ │
│  │                                                        │ │
│  │  Sunday                                               │ │
│  │  ☐ Available  [Not available]                        │ │
│  │  ────────────────────────────────────────────────     │ │
│  │  Monday                                               │ │
│  │  ☑ Available  [09:00] to [17:00]                     │ │
│  │  ────────────────────────────────────────────────     │ │
│  │  Tuesday                                              │ │
│  │  ☑ Available  [09:00] to [17:00]                     │ │
│  │  ────────────────────────────────────────────────     │ │
│  │  Wednesday                                            │ │
│  │  ☑ Available  [09:00] to [17:00]                     │ │
│  │  ────────────────────────────────────────────────     │ │
│  │  Thursday                                             │ │
│  │  ☑ Available  [09:00] to [17:00]                     │ │
│  │  ────────────────────────────────────────────────     │ │
│  │  Friday                                               │ │
│  │  ☑ Available  [09:00] to [17:00]                     │ │
│  │  ────────────────────────────────────────────────     │ │
│  │  Saturday                                             │ │
│  │  ☐ Available  [Not available]                        │ │
│  │  ────────────────────────────────────────────────     │ │
│  │                                                        │ │
│  │                           [ Save Availability ]       │ │
│  │                                                        │ │
│  │  ✅ Availability updated successfully!                │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

                          ⬇ Saved to database

┌─────────────────────────────────────────────────────────────┐
│  Backend: StaffAvailability Table                           │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ staff_id | day_of_week | is_available | start | end  │ │
│  ├──────────┼─────────────┼──────────────┼───────┼──────┤ │
│  │    5     |      0      |    False     |   -   |  -   │ │
│  │    5     |      1      |    True      | 09:00 | 17:00│ │
│  │    5     |      2      |    True      | 09:00 | 17:00│ │
│  │    5     |      3      |    True      | 09:00 | 17:00│ │
│  │    5     |      4      |    True      | 09:00 | 17:00│ │
│  │    5     |      5      |    True      | 09:00 | 17:00│ │
│  │    5     |      6      |    False     |   -   |  -   │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

                          ⬇ Used by patient booking

┌─────────────────────────────────────────────────────────────┐
│  Calendar Highlights Only Mon-Fri (day_of_week 1-5)         │
│                                                               │
│     October 2025 Calendar                                    │
│   Su  Mo  Tu  We  Th  Fr  Sa                                │
│   ⚫  🟢  🟢  🟢  🟢  🟢  ⚫    ← Week 1                      │
│   ⚫  🟢  🟢  🟢  🟢  🟢  ⚫    ← Week 2                      │
│   ⚫  🟢  🟢  🟢  🟢  🟢  ⚫    ← Week 3                      │
│   ⚫  🟢  🟢  🟢  🟢  🟢  ⚫    ← Week 4                      │
│                                                               │
│   Only Monday-Friday are bookable!                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Architecture

```
┌──────────────┐
│   PATIENT    │
│   Browser    │
└──────┬───────┘
       │ 1. Selects dentist
       ↓
┌──────────────────────────────────────────┐
│   Frontend: appointments/page.tsx        │
│   ─────────────────────────────────      │
│   useEffect(() => {                      │
│     fetchDentistAvailability()           │
│   }, [dentist])                          │
└──────┬───────────────────────────────────┘
       │ 2. API call
       ↓
┌──────────────────────────────────────────┐
│   API: GET /staff-availability/          │
│   ?staff_id={dentistId}                  │
└──────┬───────────────────────────────────┘
       │ 3. Query database
       ↓
┌──────────────────────────────────────────┐
│   Django Backend                         │
│   StaffAvailability.objects.filter(      │
│     staff_id=dentistId                   │
│   )                                      │
└──────┬───────────────────────────────────┘
       │ 4. Returns JSON
       ↓
┌──────────────────────────────────────────┐
│   Response:                              │
│   [                                      │
│     {                                    │
│       day_of_week: 1,                    │
│       is_available: true,                │
│       start_time: "09:00",               │
│       end_time: "17:00"                  │
│     },                                   │
│     ...                                  │
│   ]                                      │
└──────┬───────────────────────────────────┘
       │ 5. Calculate dates
       ↓
┌──────────────────────────────────────────┐
│   Frontend: Date Calculation             │
│   ─────────────────────────────────      │
│   for (i = 0; i < 90; i++) {             │
│     date = today + i days                │
│     dayOfWeek = date.getDay()            │
│                                          │
│     if (availability[dayOfWeek]          │
│         .is_available) {                 │
│       availableDates.add(date)           │
│     }                                    │
│   }                                      │
└──────┬───────────────────────────────────┘
       │ 6. Update UI
       ↓
┌──────────────────────────────────────────┐
│   Calendar Component                     │
│   ────────────────────────               │
│   <Calendar                              │
│     disabled={(date) => {                │
│       return !availableDates             │
│              .has(date)                  │
│     }}                                   │
│     modifiers={{                         │
│       available: (date) =>               │
│         availableDates.has(date)         │
│     }}                                   │
│   />                                     │
└──────┬───────────────────────────────────┘
       │ 7. Visual feedback
       ↓
┌──────────────────────────────────────────┐
│   🟢 Green = Available                   │
│   ⚫ Gray = Not Available                │
│   🔵 Blue = Selected                     │
└──────────────────────────────────────────┘
```

---

## 🎨 Color Legend

```
Calendar Date States:
─────────────────────

🟢  GREEN (Available)
    ↓
    • Dentist has set availability for this day
    • Matches a day_of_week where is_available = true
    • Within 90-day booking window
    • Not in the past
    • Clickable and selectable

⚫  GRAY (Unavailable/Disabled)
    ↓
    • Dentist is not available on this day
    • Past date
    • Beyond 90-day booking window
    • Sunday (if dentist doesn't work Sundays)
    • Not clickable

🔵  BLUE (Selected)
    ↓
    • Currently selected date
    • User clicked on this date
    • Form will use this date for booking
    • Can be changed by clicking another date
```

---

## 📊 Example Scenario

```
Dentist: Dr. Ezekiel Galauran
Schedule Set: Mon-Fri, 9 AM - 5 PM
Today: October 20, 2025 (Monday)

┌────────────────────────────────────────────────┐
│  October 2025 - Patient's View                 │
├────────────────────────────────────────────────┤
│  Week 1 (Oct 20-26)                            │
│  Su  Mo  Tu  We  Th  Fr  Sa                    │
│  ⚫  🟢  🟢  🟢  🟢  🟢  ⚫                     │
│      ↑   Available starting today              │
│                                                 │
│  Week 2 (Oct 27-Nov 2)                         │
│  Su  Mo  Tu  We  Th  Fr  Sa                    │
│  ⚫  🟢  🟢  🟢  🟢  🟢  ⚫                     │
│                                                 │
│  Week 3 (Nov 3-9)                              │
│  Su  Mo  Tu  We  Th  Fr  Sa                    │
│  ⚫  🟢  🟢  🟢  🟢  🟢  ⚫                     │
│                                                 │
│  ... continues for 90 days ...                 │
└────────────────────────────────────────────────┘

If patient clicks Tuesday, Oct 22:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date becomes: 2025-10-22
Time range shows: "Available hours: 09:00 - 17:00"
Patient can then select time and complete booking
```

---

## 🚀 Quick Reference

### Patient Booking Steps
1. Click "New Appointment"
2. Select Dentist → Calendar appears
3. Click green date → Time input shows
4. Choose time → Shows available hours
5. Select service → Add notes (optional)
6. Submit → Appointment created

### Dentist Schedule Steps
1. Go to Profile
2. Scroll to "My Schedule"
3. Check days you work
4. Set hours for each day
5. Save → Patients can now book

### Visual Indicators
- 🟢 = Available (can book)
- ⚫ = Unavailable (can't book)
- 🔵 = Selected (currently chosen)
- ✓ = Confirmation message
- ⚠️ = Warning (no schedule)

---

## 💡 Tips for Testing

1. **Set different schedules** for different dentists
2. **Try selecting each day** of the week
3. **Check weekends** (should be gray if not set)
4. **Try past dates** (should be disabled)
5. **Change dentists** (calendar should update)
6. **Close and reopen modal** (should reset)
7. **Check time ranges** (should match schedule)

---

## 🎯 Success Indicators

✅ Calendar shows immediately after dentist selection  
✅ Green dates match dentist's schedule days  
✅ Gray dates include weekends (if dentist doesn't work)  
✅ Past dates are disabled  
✅ Clicking green date shows time input  
✅ Time range shows dentist's hours  
✅ Can complete booking successfully  
✅ Modal resets when closed  

**Feature is working perfectly when all indicators are met!** ✨
