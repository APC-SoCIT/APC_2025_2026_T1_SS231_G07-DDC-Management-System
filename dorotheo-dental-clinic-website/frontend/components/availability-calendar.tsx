"use client"

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { api } from '@/lib/api'

interface AvailabilityData {
  day_of_week: number
  is_available: boolean
  start_time: string
  end_time: string
}

interface AvailabilityCalendarProps {
  staffId?: number
  initialData?: AvailabilityData[]
  onSave?: (data: AvailabilityData[]) => void
  readOnly?: boolean
}

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export default function AvailabilityCalendar({ 
  staffId, 
  initialData, 
  onSave, 
  readOnly = false 
}: AvailabilityCalendarProps) {
  const [availability, setAvailability] = useState<AvailabilityData[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (initialData) {
      setAvailability(initialData)
    } else if (staffId) {
      fetchAvailability()
    } else {
      // Initialize with default availability (all days available 9AM-5PM)
      setAvailability(
        DAYS.map(day => ({
          day_of_week: day.value,
          is_available: true,
          start_time: '09:00',
          end_time: '17:00',
        }))
      )
    }
  }, [staffId, initialData])

  const fetchAvailability = async () => {
    if (!staffId) return
    
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      setLoading(true)
      const data = await api.getStaffAvailability(staffId, token)
      
      if (data.length > 0) {
        setAvailability(data)
      } else {
        // No data yet, initialize defaults
        setAvailability(
          DAYS.map(day => ({
            day_of_week: day.value,
            is_available: true,
            start_time: '09:00',
            end_time: '17:00',
          }))
        )
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error)
      setMessage({ type: 'error', text: 'Failed to load availability' })
    } finally {
      setLoading(false)
    }
  }

  const handleAvailabilityChange = (dayValue: number, field: string, value: any) => {
    setAvailability(prev => {
      const existing = prev.find(a => a.day_of_week === dayValue)
      
      if (existing) {
        // Update existing
        return prev.map(a => 
          a.day_of_week === dayValue 
            ? { ...a, [field]: value }
            : a
        )
      } else {
        // Add new
        return [
          ...prev,
          {
            day_of_week: dayValue,
            is_available: field === 'is_available' ? value : true,
            start_time: field === 'start_time' ? value : '09:00',
            end_time: field === 'end_time' ? value : '17:00',
          }
        ]
      }
    })
  }

  const handleSave = async () => {
    if (readOnly) return
    
    try {
      setLoading(true)
      setMessage(null)
      
      if (onSave) {
        // Use custom save handler if provided
        await onSave(availability)
      } else if (staffId) {
        // Use API directly
        const token = localStorage.getItem('token')
        if (!token) throw new Error('Not authenticated')
        
        await api.updateStaffAvailability(staffId, availability, token)
      }
      
      setMessage({ type: 'success', text: 'Availability updated successfully!' })
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      console.error('Failed to save availability:', error)
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to save availability' 
      })
    } finally {
      setLoading(false)
    }
  }

  const getDayAvailability = (dayValue: number): AvailabilityData => {
    return availability.find(a => a.day_of_week === dayValue) || {
      day_of_week: dayValue,
      is_available: true,
      start_time: '09:00',
      end_time: '17:00',
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Weekly Availability</h3>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {DAYS.map(day => {
          const dayData = getDayAvailability(day.value)
          
          return (
            <div key={day.value} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              {/* Day Name */}
              <div className="w-28 font-medium text-gray-900">
                {day.label}
              </div>

              {/* Available Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dayData.is_available}
                  onChange={(e) => handleAvailabilityChange(day.value, 'is_available', e.target.checked)}
                  disabled={readOnly}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">Available</span>
              </label>

              {/* Time Range */}
              {dayData.is_available && (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={dayData.start_time}
                    onChange={(e) => handleAvailabilityChange(day.value, 'start_time', e.target.value)}
                    disabled={readOnly}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:opacity-50"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={dayData.end_time}
                    onChange={(e) => handleAvailabilityChange(day.value, 'end_time', e.target.value)}
                    disabled={readOnly}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:opacity-50"
                  />
                </div>
              )}

              {!dayData.is_available && (
                <div className="flex-1 text-sm text-gray-500 italic">
                  Not available
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!readOnly && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      )}
    </div>
  )
}
