"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Clock, Save, MapPin, Calendar } from "lucide-react"
import { useAuth } from "@/lib/auth"
import AvailabilitySuccessModal from "@/components/availability-success-modal"

const rawBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const trimmedBase = rawBase.replace(/\/+$/, "")
const API_BASE_URL = trimmedBase.endsWith("/api") ? trimmedBase : `${trimmedBase}/api`

interface DentistAvailabilityProps {
  dentistId: number | undefined
  selectedClinicId?: number | null // null means "All Clinics"
}

interface SelectedDate {
  date: string
  startTime: string
  endTime: string
  clinicId?: number | null
  clinicName?: string
  applyToAllClinics?: boolean
}

export default function DentistCalendarAvailability({ dentistId, selectedClinicId }: DentistAvailabilityProps) {
  const { token } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDates, setSelectedDates] = useState<Record<string, SelectedDate>>({})
  const [allAvailability, setAllAvailability] = useState<SelectedDate[]>([]) // Store all availability for table view
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [tempStartTime, setTempStartTime] = useState("09:00")
  const [tempEndTime, setTempEndTime] = useState("17:00")
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  
  // Custom time picker state
  const [startHour, setStartHour] = useState("09")
  const [startMinute, setStartMinute] = useState("00")
  const [startPeriod, setStartPeriod] = useState("AM")
  const [endHour, setEndHour] = useState("05")
  const [endMinute, setEndMinute] = useState("00")
  const [endPeriod, setEndPeriod] = useState("PM")
  
  // Repeat schedule feature
  const [repeatMode, setRepeatMode] = useState(false)
  const [selectedRepeatDays, setSelectedRepeatDays] = useState<string[]>([])
  const [setAsRecurring, setSetAsRecurring] = useState(false)

  // Helper function to convert 12-hour time to 24-hour format
  const convertTo24Hour = (hour: string, minute: string, period: string) => {
    let hour24 = parseInt(hour)
    if (period === "PM" && hour24 !== 12) hour24 += 12
    if (period === "AM" && hour24 === 12) hour24 = 0
    return `${String(hour24).padStart(2, '0')}:${minute}`
  }

  // Helper function to convert 24-hour time to 12-hour format
  const convertTo12Hour = (time24: string) => {
    const [hourStr, minute] = time24.split(':')
    let hour = parseInt(hourStr)
    const period = hour >= 12 ? 'PM' : 'AM'
    if (hour > 12) hour -= 12
    if (hour === 0) hour = 12
    return { hour: String(hour).padStart(2, '0'), minute, period }
  }

  // Update 24-hour time when custom picker values change
  useEffect(() => {
    setTempStartTime(convertTo24Hour(startHour, startMinute, startPeriod))
  }, [startHour, startMinute, startPeriod])

  useEffect(() => {
    setTempEndTime(convertTo24Hour(endHour, endMinute, endPeriod))
  }, [endHour, endMinute, endPeriod])

  useEffect(() => {
    console.log('[CALENDAR] useEffect triggered with:', { dentistId, token: !!token, selectedClinicId, currentDate: currentDate.toISOString() })
    if (dentistId && token) {
      console.log('[CALENDAR] Loading availability for dentist ID:', dentistId, 'clinic:', selectedClinicId)
      loadAvailability()
    } else {
      console.log('[CALENDAR] Not loading - missing dentistId or token:', { dentistId, hasToken: !!token })
    }
  }, [dentistId, currentDate, selectedClinicId, token])

  const loadAvailability = async () => {
    if (!dentistId) return

    if (!token) return

    setIsLoading(true)

    // Get first and last day of current month
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    
    // Format dates using local timezone to avoid date shifting
    const firstDayStr = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`
    const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

    try {
      // Build URL with optional clinic filter
      let url = `${API_BASE_URL}/dentist-availability/?dentist_id=${dentistId}&start_date=${firstDayStr}&end_date=${lastDayStr}`
      if (selectedClinicId) {
        url += `&clinic_id=${selectedClinicId}`
      }
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Token ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('[CALENDAR] Loaded availability:', url)
        console.log('[CALENDAR] URL used:', url)
        console.log('[CALENDAR] Response status:', response.status)
        console.log('[CALENDAR] Raw API response:', data)
        console.log('[CALENDAR] Data type:', typeof data)
        console.log('[CALENDAR] Data length:', data?.length)
        console.log('[CALENDAR] Is Array?:', Array.isArray(data))
        console.log('[CALENDAR] Object keys:', data ? Object.keys(data) : 'no data')
        
        // Handle both direct array and paginated response formats
        const availabilityData = Array.isArray(data) ? data : (data?.results || [])
        console.log('[CALENDAR] Processed data array:', availabilityData)
        console.log('[CALENDAR] Processed data length:', availabilityData.length)
        
        const availabilityMap: Record<string, SelectedDate> = {}
        const allAvail: SelectedDate[] = []
        
        // Get today's date string for comparison (YYYY-MM-DD format)
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        console.log('[CALENDAR] Today string for filtering:', todayStr)
        
        availabilityData.forEach((item: any, index: number) => {
          console.log(`[CALENDAR] Processing item ${index}:`, item)
          // Compare date strings directly to avoid timezone issues
          // item.date is already in YYYY-MM-DD format
          if (item.date >= todayStr) {
            // Filter based on selectedClinicId
            // If selectedClinicId is null (All Clinics), show:
            //   - Items with apply_to_all_clinics = true
            //   - All items (to show everything)
            // If selectedClinicId is set, show:
            //   - Items that match that clinic
            //   - Items with apply_to_all_clinics = true
            
            const shouldInclude = selectedClinicId === null || selectedClinicId === undefined
              ? true // Show all when "All Clinics" is selected
              : (item.apply_to_all_clinics || item.clinic === selectedClinicId)
            
            console.log(`[CALENDAR] Item ${index} shouldInclude:`, shouldInclude, 'selectedClinicId:', selectedClinicId, 'item.apply_to_all_clinics:', item.apply_to_all_clinics, 'item.clinic:', item.clinic)
            
            if (shouldInclude) {
              // Determine clinic name with better fallback logic
              let clinicName = 'Unknown'
              if (item.apply_to_all_clinics) {
                clinicName = 'All Clinics'
              } else if (item.clinic_data?.name) {
                clinicName = item.clinic_data.name
              } else if (item.clinic) {
                // Clinic ID exists but no expanded data - shouldn't happen but handle gracefully
                clinicName = `Clinic ID ${item.clinic}`
              }
              
              const availItem: SelectedDate = {
                date: item.date,
                startTime: item.start_time.substring(0, 5), // Convert "09:00:00" to "09:00"
                endTime: item.end_time.substring(0, 5),
                clinicId: item.clinic,
                clinicName: clinicName,
                applyToAllClinics: item.apply_to_all_clinics,
              }
              availabilityMap[item.date] = availItem
              allAvail.push(availItem)
              console.log(`[CALENDAR] Added item to map:`, availItem)
            }
          } else {
            console.log(`[CALENDAR] Item ${index} filtered out - date ${item.date} is before today ${todayStr}`)
          }
        })
        
        console.log('[CALENDAR] Final availabilityMap:', availabilityMap)
        console.log('[CALENDAR] Final allAvail:', allAvail)
        setSelectedDates(availabilityMap)
        setAllAvailability(allAvail.sort((a, b) => a.date.localeCompare(b.date)))
        console.log('[CALENDAR] Selected dates updated (past dates filtered):', availabilityMap)
      } else if (response.status === 401) {
        // Silently ignore 401 errors (authentication issues)
        console.log('[CALENDAR] 401 authentication error - clearing data')
        setSelectedDates({})
        setAllAvailability([])
      } else {
        // Only log non-auth errors
        console.log('[CALENDAR] Failed to load availability - status:', response.status)
        console.log('[CALENDAR] Response:', await response.text())
        setSelectedDates({})
        setAllAvailability([])
      }
    } catch (error) {
      // Silently handle errors to avoid annoying popups
      console.log('[CALENDAR] Network/fetch error:', error)
      setSelectedDates({})
      setAllAvailability([])
    } finally {
      setIsLoading(false)
    }
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }

  const handleDateClick = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    // Check if date is in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const clickedDate = new Date(dateStr)
    
    if (clickedDate < today) {
      return // Don't allow selecting past dates
    }

    setActiveDate(dateStr)
    setRepeatMode(false)
    setSelectedRepeatDays([])
    
    if (selectedDates[dateStr]) {
      // Edit existing - load the current times
      const start = convertTo12Hour(selectedDates[dateStr].startTime)
      const end = convertTo12Hour(selectedDates[dateStr].endTime)
      setStartHour(start.hour)
      setStartMinute(start.minute)
      setStartPeriod(start.period)
      setEndHour(end.hour)
      setEndMinute(end.minute)
      setEndPeriod(end.period)
      setTempStartTime(selectedDates[dateStr].startTime)
      setTempEndTime(selectedDates[dateStr].endTime)
    } else {
      // New selection - default times (9:00 AM to 5:00 PM)
      setStartHour("09")
      setStartMinute("00")
      setStartPeriod("AM")
      setEndHour("05")
      setEndMinute("00")
      setEndPeriod("PM")
      setTempStartTime("09:00")
      setTempEndTime("17:00")
    }
    
    setShowTimeModal(true)
  }

  const handleSaveTime = async () => {
    if (!activeDate || !dentistId || !token) return

    console.log('[CALENDAR] Saving time for date:', activeDate)

    const datesToUpdate = repeatMode ? [activeDate, ...selectedRepeatDays] : [activeDate]

    // Update local state
    setSelectedDates(prev => {
      const updated = { ...prev }
      
      datesToUpdate.forEach(dateStr => {
        updated[dateStr] = {
          date: dateStr,
          startTime: tempStartTime,
          endTime: tempEndTime,
        }
      })
      
      console.log('[CALENDAR] Updated selected dates:', updated)
      return updated
    })

    setShowTimeModal(false)
    setActiveDate(null)
    setRepeatMode(false)
    setSelectedRepeatDays([])

    // Persist to API immediately
    try {
      const dates = datesToUpdate.map(dateStr => ({
        date: dateStr,
        start_time: `${tempStartTime}:00`,
        end_time: `${tempEndTime}:00`,
        is_available: true,
      }))

      // Build request body with clinic awareness
      const requestBody: any = {
        dentist_id: dentistId,
        dates: dates,
      }
      
      if (selectedClinicId) {
        // Saving for a specific clinic
        requestBody.clinic_id = selectedClinicId
        requestBody.apply_to_all_clinics = false
      } else {
        // Saving for "All Clinics"
        requestBody.apply_to_all_clinics = true
      }

      const response = await fetch(
        `${API_BASE_URL}/dentist-availability/bulk_create/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      )

      if (response.ok) {
        console.log('[CALENDAR] Successfully saved to API')
        await loadAvailability()
      } else {
        const error = await response.json()
        console.error('[CALENDAR] API save failed:', error)
        alert(`Error saving availability: ${JSON.stringify(error)}`)
      }
    } catch (error) {
      console.error('[CALENDAR] Error saving to API:', error)
      alert('Failed to save availability. Please try again.')
    }
  }

  const handleRemoveDate = async () => {
    if (!activeDate || !dentistId || !token) return

    console.log('[CALENDAR] Removing date:', activeDate)

    setSelectedDates(prev => {
      const newDates = { ...prev }
      delete newDates[activeDate]
      console.log('[CALENDAR] After removal:', newDates)
      return newDates
    })

    setShowTimeModal(false)
    setActiveDate(null)
    setRepeatMode(false)
    setSelectedRepeatDays([])

    // Delete from API immediately
    try {
      // Build delete request - clinic-aware
      const deleteBody: any = {
        dentist_id: dentistId,
        dates: [activeDate],
      }
      
      // If viewing "All Clinics" (selectedClinicId is null/undefined), delete ALL records for this date
      // If viewing a specific clinic, only delete records for that clinic
      if (selectedClinicId) {
        deleteBody.clinic_id = selectedClinicId
      }
      // When selectedClinicId is null (All Clinics), no clinic_id is sent = deletes ALL records for that date
      
      console.log('[CALENDAR] Delete request body:', deleteBody)

      const response = await fetch(
        `${API_BASE_URL}/dentist-availability/bulk_delete/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify(deleteBody),
        }
      )

      if (response.ok) {
        console.log('[CALENDAR] Successfully deleted from API')
        await loadAvailability()
      } else {
        console.error('[CALENDAR] API delete failed')
      }
    } catch (error) {
      console.error('[CALENDAR] Error deleting from API:', error)
    }
  }

  // Get available dates in current month for repeat scheduling
  const getAvailableDatesForRepeat = () => {
    const availableDates: { date: string; display: string; dayOfWeek: string }[] = []
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const date = new Date(year, month, day)
      
      // Skip past dates and the currently active date
      if (date >= today && dateStr !== activeDate) {
        availableDates.push({
          date: dateStr,
          display: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' })
        })
      }
    }

    return availableDates
  }

  const toggleRepeatDay = (dateStr: string) => {
    setSelectedRepeatDays(prev => 
      prev.includes(dateStr) 
        ? prev.filter(d => d !== dateStr)
        : [...prev, dateStr]
    )
  }

  const handleSaveAvailability = async () => {
    if (!dentistId) {
      alert('Dentist ID is required')
      return
    }

    if (!token) {
      alert('You must be logged in to save availability')
      return
    }

    setIsSaving(true)

    try {
      console.log('[CALENDAR] Starting save process...')
      
      // Step 1: Delete all existing dates for the current month first
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      
      const firstDayStr = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`
      const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
      // Get all dates in the current month to delete
      let fetchUrl = `${API_BASE_URL}/dentist-availability/?dentist_id=${dentistId}&start_date=${firstDayStr}&end_date=${lastDayStr}`
      if (selectedClinicId) {
        fetchUrl += `&clinic_id=${selectedClinicId}`
      }
      const deleteResponse = await fetch(fetchUrl, {
        headers: { Authorization: `Token ${token}` },
      })

      if (deleteResponse.ok) {
        const rawData = await deleteResponse.json()
        // Handle both direct array and paginated response formats
        const existingDates = Array.isArray(rawData) ? rawData : (rawData?.results || [])
        console.log('[CALENDAR] Existing dates to delete:', existingDates)
        
        if (existingDates.length > 0) {
          // Get unique dates to delete
          const datesToDelete = [...new Set(existingDates.map((item: any) => item.date))]
          console.log('[CALENDAR] Deleting dates:', datesToDelete)
          
          // Build delete body - clinic aware
          const deleteBody: any = {
            dentist_id: dentistId,
            dates: datesToDelete,
          }
          if (selectedClinicId) {
            deleteBody.clinic_id = selectedClinicId
          }
          
          const bulkDeleteResponse = await fetch(
            `${API_BASE_URL}/dentist-availability/bulk_delete/`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Token ${token}`,
              },
              body: JSON.stringify(deleteBody),
            }
          )
          
          if (!bulkDeleteResponse.ok) {
            const error = await bulkDeleteResponse.json()
            console.error('[CALENDAR] Bulk delete failed:', error)
            throw new Error(`Failed to delete old dates: ${JSON.stringify(error)}`)
          }
          
          console.log('[CALENDAR] Successfully deleted old dates')
        }
      }

      // Step 2: Save the new selected dates
      const dates = Object.values(selectedDates).map(item => ({
        date: item.date,
        start_time: `${item.startTime}:00`,
        end_time: `${item.endTime}:00`,
        is_available: true,
      }))

      console.log('[CALENDAR] Creating new dates:', dates)

      if (dates.length > 0) {
        // Build request body with clinic awareness
        const saveBody: any = {
          dentist_id: dentistId,
          dates: dates,
        }
        
        if (selectedClinicId) {
          saveBody.clinic_id = selectedClinicId
          saveBody.apply_to_all_clinics = false
        } else {
          saveBody.apply_to_all_clinics = true
        }

        const response = await fetch(
          `${API_BASE_URL}/dentist-availability/bulk_create/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${token}`,
            },
            body: JSON.stringify(saveBody),
          }
        )

        if (response.ok) {
          const result = await response.json()
          console.log('[CALENDAR] Successfully saved:', result)
          setShowSuccessModal(true)
          await loadAvailability() // Reload to verify
        } else {
          const error = await response.json()
          console.error('[CALENDAR] Save failed:', error)
          alert(`Error: ${JSON.stringify(error)}`)
        }
      } else {
        // If no dates selected, just show success (we already deleted the old ones)
        console.log('[CALENDAR] No dates to save (cleared month)')
        setShowSuccessModal(true)
        await loadAvailability()
      }
    } catch (error) {
      console.error("[CALENDAR] Error saving availability:", error)
      alert("Failed to save availability: " + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsSaving(false)
    }
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const isDateSelected = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return selectedDates[dateStr] !== undefined
  }

  const isDateInPast = (day: number) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return checkDate < today
  }

  const days = getDaysInMonth()
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-gray-200 shadow-sm p-4">
      <div className="mb-3">
        <h3 className="text-xl font-bold text-gray-800 mb-1">
          Select Your Available Dates
        </h3>
        <p className="text-xs text-gray-500">Click on dates to set your working hours. Use the "+ Set Availability" button above for bulk scheduling.</p>
      </div>

      {/* Current Status Banner */}
      {allAvailability.length > 0 ? (
        <div className="mb-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">Availability Set</p>
            <p className="text-xs text-green-600">You have {allAvailability.length} available {allAvailability.length === 1 ? 'date' : 'dates'} in {monthName}</p>
          </div>
        </div>
      ) : (
        <div className="mb-3 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">No Availability Set</p>
            <p className="text-xs text-amber-600">Click on dates below or use the "+ Set Availability" button to set your schedule</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center text-gray-500 text-sm py-4 bg-blue-50 rounded-lg">
          Loading availability...
        </div>
      )}

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-3 bg-white rounded-lg p-2 shadow-sm">
        <button
          onClick={previousMonth}
          disabled={isLoading}
          className="p-2 hover:bg-gray-100 rounded-full transition-all disabled:opacity-50 hover:scale-110"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h4 className="text-base font-bold text-gray-800">{monthName}</h4>
        <button
          onClick={nextMonth}
          disabled={isLoading}
          className="p-2 hover:bg-gray-100 rounded-full transition-all disabled:opacity-50 hover:scale-110"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-bold text-gray-700 py-1.5 bg-gray-100 rounded-md">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, index) => {
          const dateStr = day ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null
          return (
            <div key={index}>
              {day ? (
                <button
                  onClick={() => handleDateClick(day)}
                  disabled={isDateInPast(day) || isLoading}
                  data-date={dateStr}
                  className={`
                    w-full h-10 rounded-lg flex items-center justify-center text-sm font-semibold transition-all duration-200
                    ${isDateSelected(day)
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md hover:shadow-lg hover:scale-105 ring-2 ring-green-300'
                      : isDateInPast(day)
                      ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-blue-50 hover:scale-105 hover:shadow-md border border-gray-200 hover:border-blue-300'
                    }
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {day}
                </button>
              ) : (
                <div className="w-full h-10" />
              )}
            </div>
          )
        })}
      </div>

      {/* Calendar Legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-green-500 to-emerald-600 shadow-sm"></div>
          <span className="text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-white border border-gray-200"></div>
          <span className="text-gray-600">Not Set</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-gray-50"></div>
          <span className="text-gray-600">Past Date</span>
        </div>
      </div>

      {/* Selected Dates Summary - Table View */}
      {allAvailability.length > 0 && (
        <div className="mt-4 bg-white rounded-xl border border-green-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <h4 className="text-sm font-bold text-green-800">
                  Your Available Dates ({allAvailability.length})
                </h4>
              </div>
              <span className="text-xs text-green-600">Patients can book during these times</span>
            </div>
          </div>
          
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Date
                    </div>
                  </th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">Day</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Time
                    </div>
                  </th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      Clinic
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allAvailability.map((item, index) => {
                  const dateObj = new Date(item.date + 'T00:00:00')
                  const formatTime = (time: string) => {
                    const [h, m] = time.split(':')
                    const hour = parseInt(h)
                    const ampm = hour >= 12 ? 'PM' : 'AM'
                    const displayHour = hour % 12 || 12
                    return `${displayHour}:${m} ${ampm}`
                  }
                  return (
                    <tr key={`${item.date}-${index}`} className="hover:bg-green-50/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-gray-900">
                          {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          {formatTime(item.startTime)} - {formatTime(item.endTime)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {item.applyToAllClinics ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                            All Clinics
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            {item.clinicName || 'Unknown'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Time Selection Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
              <h3 className="text-base font-semibold text-gray-900">
                Set Working Hours
              </h3>
              <button
                onClick={() => {
                  setShowTimeModal(false)
                  setRepeatMode(false)
                  setSelectedRepeatDays([])
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              {activeDate && new Date(activeDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            {/* Time Selectors - Side by Side */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Start Time */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <div className="flex gap-2">
                  <select
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const h = String(i + 1).padStart(2, '0')
                      return <option key={h} value={h}>{h}</option>
                    })}
                  </select>
                  <select
                    value={startMinute}
                    onChange={(e) => setStartMinute(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  >
                    {['00', '15', '30', '45'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={startPeriod}
                    onChange={(e) => setStartPeriod(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              {/* End Time */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <div className="flex gap-2">
                  <select
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const h = String(i + 1).padStart(2, '0')
                      return <option key={h} value={h}>{h}</option>
                    })}
                  </select>
                  <select
                    value={endMinute}
                    onChange={(e) => setEndMinute(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                  >
                    {['00', '15', '30', '45'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={endPeriod}
                    onChange={(e) => setEndPeriod(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Duration Display */}
            {tempStartTime && tempEndTime && tempEndTime > tempStartTime && (
              <div className="bg-blue-50 rounded p-2 mb-3">
                <p className="text-xs text-center text-blue-900">
                  Duration: {(() => {
                    const [startHour, startMin] = tempStartTime.split(':').map(Number);
                    const [endHour, endMin] = tempEndTime.split(':').map(Number);
                    const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    return `${hours}h ${minutes}m`;
                  })()}
                </p>
              </div>
            )}

            {/* Error Message */}
            {tempEndTime <= tempStartTime && (
              <div className="bg-red-50 rounded p-2 mb-3">
                <p className="text-xs text-center text-red-700">
                  End time must be after start time
                </p>
              </div>
            )}
              <div className="pt-3 mt-3 border-t">
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repeatMode}
                    onChange={(e) => setRepeatMode(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Apply to multiple dates</span>
                </label>

                {repeatMode && (
                  <div>
                    <p className="text-xs text-gray-600 mb-2">
                      Select additional dates to apply this schedule:
                    </p>
                    <div className="grid grid-cols-7 gap-1.5 p-2 bg-gray-50 rounded">
                      {getAvailableDatesForRepeat().map(({ date, display, dayOfWeek }) => (
                        <button
                          key={date}
                          onClick={() => toggleRepeatDay(date)}
                          className={`px-2 py-1.5 rounded text-xs transition-colors ${
                            selectedRepeatDays.includes(date)
                              ? 'bg-green-600 text-white font-medium'
                              : 'bg-white text-gray-700 border border-gray-200 hover:border-green-500 hover:bg-green-50'
                          }`}
                        >
                          <div className="text-[9px] opacity-70">{dayOfWeek}</div>
                          <div className="text-[10px] font-medium">{display.split(' ')[1]}</div>
                        </button>
                      ))}
                    </div>
                    {selectedRepeatDays.length > 0 && (
                      <p className="text-xs text-center text-gray-600 mt-2">
                        {selectedRepeatDays.length + 1} {selectedRepeatDays.length + 1 === 1 ? 'date' : 'dates'} will be updated
                      </p>
                    )}
                  </div>
                )}
              </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              {selectedDates[activeDate || ''] && (
                <button
                  onClick={handleRemoveDate}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded hover:bg-red-50"
                >
                  Remove
                </button>
              )}
              <button
                onClick={() => {
                  setShowTimeModal(false)
                  setRepeatMode(false)
                  setSelectedRepeatDays([])
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTime}
                disabled={tempEndTime <= tempStartTime}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <AvailabilitySuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        monthYear={currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        totalDays={Object.keys(selectedDates).length}
      />
    </div>
  )
}
