"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Clock, Save } from "lucide-react"
import { useAuth } from "@/lib/auth"

interface DentistAvailabilityProps {
  dentistId: number | undefined
}

interface SelectedDate {
  date: string
  startTime: string
  endTime: string
}

export default function DentistCalendarAvailability({ dentistId }: DentistAvailabilityProps) {
  const { token } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDates, setSelectedDates] = useState<Record<string, SelectedDate>>({})
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [tempStartTime, setTempStartTime] = useState("09:00")
  const [tempEndTime, setTempEndTime] = useState("17:00")
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (dentistId) {
      console.log('[CALENDAR] Loading availability for dentist ID:', dentistId)
      loadAvailability()
    }
  }, [dentistId, currentDate])

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
      const response = await fetch(
        `http://127.0.0.1:8000/api/dentist-availability/?dentist_id=${dentistId}&start_date=${firstDayStr}&end_date=${lastDayStr}`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        console.log('[CALENDAR] Loaded availability:', data)
        const availabilityMap: Record<string, SelectedDate> = {}
        
        // Get today's date for comparison
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        data.forEach((item: any) => {
          const itemDate = new Date(item.date)
          // Only include dates that are today or in the future
          if (itemDate >= today) {
            availabilityMap[item.date] = {
              date: item.date,
              startTime: item.start_time.substring(0, 5), // Convert "09:00:00" to "09:00"
              endTime: item.end_time.substring(0, 5),
            }
          }
        })
        
        setSelectedDates(availabilityMap)
        console.log('[CALENDAR] Selected dates updated (past dates filtered):', availabilityMap)
      } else if (response.status === 401) {
        // Silently ignore 401 errors (authentication issues)
        setSelectedDates({})
      } else {
        // Only log non-auth errors
        console.log('[CALENDAR] Failed to load availability:', response.status)
      }
    } catch (error) {
      // Silently handle errors to avoid annoying popups
      setSelectedDates({})
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
    
    if (selectedDates[dateStr]) {
      // Edit existing - load the current times
      setTempStartTime(selectedDates[dateStr].startTime)
      setTempEndTime(selectedDates[dateStr].endTime)
    } else {
      // New selection - default times
      setTempStartTime("09:00")
      setTempEndTime("17:00")
    }
    
    setShowTimeModal(true)
  }

  const handleSaveTime = () => {
    if (!activeDate) return

    console.log('[CALENDAR] Saving time for date:', activeDate)

    setSelectedDates(prev => {
      const updated = {
        ...prev,
        [activeDate]: {
          date: activeDate,
          startTime: tempStartTime,
          endTime: tempEndTime,
        }
      }
      console.log('[CALENDAR] Updated selected dates:', updated)
      return updated
    })

    setShowTimeModal(false)
    setActiveDate(null)
  }

  const handleRemoveDate = () => {
    if (!activeDate) return

    console.log('[CALENDAR] Removing date:', activeDate)

    setSelectedDates(prev => {
      const newDates = { ...prev }
      delete newDates[activeDate]
      console.log('[CALENDAR] After removal:', newDates)
      return newDates
    })

    setShowTimeModal(false)
    setActiveDate(null)
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
      const deleteResponse = await fetch(
        `http://127.0.0.1:8000/api/dentist-availability/?dentist_id=${dentistId}&start_date=${firstDayStr}&end_date=${lastDayStr}`,
        {
          headers: { Authorization: `Token ${token}` },
        }
      )

      if (deleteResponse.ok) {
        const existingDates = await deleteResponse.json()
        console.log('[CALENDAR] Existing dates to delete:', existingDates)
        
        if (existingDates.length > 0) {
          // Delete existing dates for this month
          const datesToDelete = existingDates.map((item: any) => item.date)
          console.log('[CALENDAR] Deleting dates:', datesToDelete)
          
          const bulkDeleteResponse = await fetch(
            "http://127.0.0.1:8000/api/dentist-availability/bulk_delete/",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Token ${token}`,
              },
              body: JSON.stringify({
                dentist_id: dentistId,
                dates: datesToDelete,
              }),
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
        const response = await fetch(
          "http://127.0.0.1:8000/api/dentist-availability/bulk_create/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${token}`,
            },
            body: JSON.stringify({
              dentist_id: dentistId,
              dates: dates,
            }),
          }
        )

        if (response.ok) {
          const result = await response.json()
          console.log('[CALENDAR] Successfully saved:', result)
          alert("Availability saved successfully!")
          await loadAvailability() // Reload to verify
        } else {
          const error = await response.json()
          console.error('[CALENDAR] Save failed:', error)
          alert(`Error: ${JSON.stringify(error)}`)
        }
      } else {
        // If no dates selected, just show success (we already deleted the old ones)
        console.log('[CALENDAR] No dates to save (cleared month)')
        alert("Availability cleared for this month!")
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
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-[var(--color-text)]">
          Select Your Available Dates
        </h3>
        <button
          onClick={handleSaveAvailability}
          disabled={isSaving || isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Availability"}
        </button>
      </div>

      {isLoading && (
        <div className="text-center text-gray-500 py-4">
          Loading availability...
        </div>
      )}

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={previousMonth}
          disabled={isLoading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h4 className="text-lg font-semibold">{monthName}</h4>
        <button
          onClick={nextMonth}
          disabled={isLoading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => (
          <div key={index}>
            {day ? (
              <button
                onClick={() => handleDateClick(day)}
                disabled={isDateInPast(day) || isLoading}
                className={`
                  w-full aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all
                  ${isDateSelected(day)
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : isDateInPast(day)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-200'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {day}
              </button>
            ) : (
              <div className="w-full aspect-square" />
            )}
          </div>
        ))}
      </div>

      {/* Selected Dates Summary */}
      {Object.keys(selectedDates).length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Selected Dates ({Object.keys(selectedDates).length})
          </h4>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {Object.values(selectedDates).sort((a, b) => a.date.localeCompare(b.date)).map(item => (
              <div key={item.date} className="text-xs bg-green-50 border border-green-200 rounded-lg p-2">
                <div className="font-medium text-green-900">
                  {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="text-green-700 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {item.startTime} - {item.endTime}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Selection Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">
              Set Time for {activeDate && new Date(activeDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={tempStartTime}
                  onChange={(e) => setTempStartTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={tempEndTime}
                  onChange={(e) => setTempEndTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {selectedDates[activeDate || ''] && (
                <button
                  onClick={handleRemoveDate}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              )}
              <button
                onClick={() => setShowTimeModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTime}
                disabled={tempEndTime <= tempStartTime}
                className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
