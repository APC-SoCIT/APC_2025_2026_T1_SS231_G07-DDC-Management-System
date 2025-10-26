# Staff and Owner Booking Modal Update

## Overview
The staff and owner appointment booking modals now use the EXACT same functionality as the patient side, with the addition of a patient search/select field at the top.

## Key Features Added

### 1. **Calendar-Based Date Selection**
- Visual calendar with green highlighting for available dates
- Dentist must be selected first before calendar shows
- Only shows dates within 90 days where dentist is available
- Automatically disables past dates

### 2. **Dentist Availability Integration**
- Fetches dentist's weekly schedule
- Shows only dates when dentist is marked as available
- Warning message if dentist has no schedule set

### 3. **Real-Time Booked Slots Checking**
- Fetches ALL booked appointments from the system
- Grays out time slots that are already booked
- Prevents double booking automatically
- Updates when dentist or date changes

### 4. **Patient Search Functionality**
- Search input field to filter patients by name or email
- Dropdown below shows filtered results
- Makes it easy to find patients in large databases

## Files Modified

### `frontend/app/staff/appointments/page.tsx`
### `frontend/app/owner/appointments/page.tsx`

## Changes Required

### 1. Add New State Variables
```typescript
const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
const [dentistAvailability, setDentistAvailability] = useState<any[]>([])
const [availableDates, setAvailableDates] = useState<Set<string>>(new Set())
const [bookedSlots, setBookedSlots] = useState<Array<{date: string, time: string, dentist_id: number}>>([])
const [patientSearchQuery, setPatientSearchQuery] = useState("")
```

### 2. Add Calendar Import
```typescript
import { Calendar } from "@/components/ui/calendar"
import { Calendar as CalendarIcon } from "lucide-react" // Rename icon to avoid conflict
```

### 3. Update isTimeSlotBooked Function
```typescript
const isTimeSlotBooked = (date: string, time: string, dentistId?: string) => {
  if (!dentistId) return false
  
  return bookedSlots.some(
    slot => slot.date === date && 
            slot.time === time && 
            slot.dentist_id === Number(dentistId)
  )
}
```

### 4. Add formatDentistName Function
```typescript
const formatDentistName = (dentist: Staff) => {
  const role = dentist.user_type === 'owner' ? 'Owner' : 'Dentist'
  return `${dentist.first_name} ${dentist.last_name} (${role})`
}
```

### 5. Add New useEffects

#### Fetch Dentist Availability
```typescript
useEffect(() => {
  const fetchDentistAvailability = async () => {
    if (!token || !newAppointment.dentist) {
      setDentistAvailability([])
      setAvailableDates(new Set())
      return
    }

    try {
      const availability = await api.getStaffAvailability(Number(newAppointment.dentist), token)
      setDentistAvailability(availability)
      
      // Calculate available dates for the next 90 days
      const dates = new Set<string>()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      for (let i = 0; i < 90; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(today.getDate() + i)
        const dayOfWeek = checkDate.getDay()
        
        // Check if dentist is available on this day of week
        const dayAvailability = availability.find((a: any) => a.day_of_week === dayOfWeek)
        if (dayAvailability && dayAvailability.is_available) {
          dates.add(checkDate.toISOString().split('T')[0])
        }
      }
      
      setAvailableDates(dates)
    } catch (error) {
      console.error("Error fetching dentist availability:", error)
    }
  }

  fetchDentistAvailability()
}, [newAppointment.dentist, token])
```

#### Update Date When Calendar Selection Changes
```typescript
useEffect(() => {
  if (selectedDate) {
    const year = selectedDate.getFullYear()
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const day = String(selectedDate.getDate()).padStart(2, '0')
    setNewAppointment(prev => ({ ...prev, date: `${year}-${month}-${day}` }))
  }
}, [selectedDate])
```

#### Fetch Booked Slots
```typescript
useEffect(() => {
  const fetchBookedSlots = async () => {
    if (!token) return

    try {
      const dentistId = newAppointment.dentist ? Number(newAppointment.dentist) : undefined
      const date = newAppointment.date || undefined
      
      const slots = await api.getBookedSlots(dentistId, date, token)
      setBookedSlots(slots)
    } catch (error) {
      console.error("Error fetching booked slots:", error)
    }
  }

  fetchBookedSlots()
}, [newAppointment.dentist, newAppointment.date, token])
```

### 6. Update Modal Form Structure

The booking modal should have this order:
1. **Patient Search** (text input for filtering)
2. **Patient Select** (dropdown with filtered results)
3. **Preferred Dentist** (dropdown - must select first)
4. **Calendar** (visual date picker - appears after dentist selected)
5. **Time Slots** (3-column grid - appears after date selected)
6. **Service** (dropdown)
7. **Notes** (textarea)

### 7. Update Calendar Icon References
Replace all `<Calendar` icon components with `<CalendarIcon` to avoid conflict with the Calendar component.

### 8. Update Modal Close Handler
```typescript
onClick={() => {
  setShowAddModal(false)
  setNewAppointment({ patient: "", date: "", time: "", dentist: "", service: "", notes: "" })
  setSelectedPatientId(null)
  setSelectedDate(undefined)
  setAvailableDates(new Set())
  setPatientSearchQuery("")
}}
```

### 9. Update Form Submit Validation
```typescript
disabled={!selectedPatientId || !newAppointment.date || !newAppointment.time || !newAppointment.dentist}
```

### 10. Update handleAddAppointment
Replace the conflict check with:
```typescript
const hasConflict = isTimeSlotBooked(newAppointment.date, newAppointment.time, newAppointment.dentist)
```

## Result

Staff and owner will now have:
- ✅ Patient search functionality
- ✅ Visual calendar with availability highlighting
- ✅ Real-time double booking prevention
- ✅ Same user experience as patients
- ✅ Dentist availability integration
- ✅ System-wide booking validation

## Testing Checklist

- [ ] Open staff appointments page
- [ ] Click "Add Appointment"
- [ ] Search for a patient by name
- [ ] Select a dentist
- [ ] Verify calendar shows with green dates
- [ ] Select a date
- [ ] Verify time slots appear
- [ ] Verify already-booked slots are grayed out
- [ ] Complete booking
- [ ] Repeat for owner side

