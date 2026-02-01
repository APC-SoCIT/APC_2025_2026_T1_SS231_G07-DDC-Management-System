"use client"

import { useState, useEffect, Fragment } from "react"
import { X, Calendar as CalendarIcon, Clock, Ban, Building2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { useClinic, ClinicLocation } from "@/lib/clinic-context"

interface BlockTimeModalProps {
  isOpen: boolean
  onClose: () => void
  onBlock: (blockData: {
    date: string
    start_time: string
    end_time: string
    reason: string
    clinic_id?: number | null
    apply_to_all_clinics: boolean
  }) => void
}

export default function BlockTimeModal({
  isOpen,
  onClose,
  onBlock,
}: BlockTimeModalProps) {
  const { allClinics } = useClinic()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const [selectedClinicId, setSelectedClinicId] = useState<string>("")
  const [applyToAllClinics, setApplyToAllClinics] = useState(true)

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setSelectedDate(undefined)
      setStartTime("")
      setEndTime("")
      setReason("")
      setError("")
      setSelectedClinicId("")
      setApplyToAllClinics(true)
    }
  }, [isOpen])

  const generateTimeSlots = () => {
    const slots: string[] = []
    const startHour = 10 // 10:00 AM
    const endHour = 20 // 8:00 PM
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(timeStr)
      }
    }
    
    return slots
  }

  const formatTimeDisplay = (time: string) => {
    const [hour, minute] = time.split(':').map(Number)
    const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    const ampm = hour >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!selectedDate) {
      setError("Please select a date")
      return
    }

    if (!startTime || !endTime) {
      setError("Please select both start and end times")
      return
    }

    if (startTime >= endTime) {
      setError("End time must be after start time")
      return
    }
    
    if (!applyToAllClinics && !selectedClinicId) {
      setError("Please select a clinic or choose to apply to all clinics")
      return
    }

    const formattedDate = selectedDate.toISOString().split('T')[0]

    onBlock({
      date: formattedDate,
      start_time: startTime,
      end_time: endTime,
      reason: reason.trim(),
      clinic_id: applyToAllClinics ? null : parseInt(selectedClinicId),
      apply_to_all_clinics: applyToAllClinics,
    })

    onClose()
  }

  if (!isOpen) return null

  const timeSlots = generateTimeSlots()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Block Time Slot</h2>
              <p className="text-sm text-gray-600">Prevent patients from booking during this time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Clinic Selection */}
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Clinic Location
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="clinicScope"
                  checked={applyToAllClinics}
                  onChange={() => {
                    setApplyToAllClinics(true)
                    setSelectedClinicId("")
                  }}
                  className="w-4 h-4 text-teal-600"
                />
                <span className="text-gray-700">Apply to all clinics</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="clinicScope"
                  checked={!applyToAllClinics}
                  onChange={() => setApplyToAllClinics(false)}
                  className="w-4 h-4 text-teal-600"
                />
                <span className="text-gray-700">Apply to specific clinic</span>
              </label>
              {!applyToAllClinics && (
                <select
                  value={selectedClinicId}
                  onChange={(e) => setSelectedClinicId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                  required={!applyToAllClinics}
                >
                  <option value="">Select clinic...</option>
                  {allClinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Select Date *
            </label>
            <div className="flex justify-center border border-gray-200 rounded-lg p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md"
              />
            </div>
            {selectedDate && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Start Time *
              </label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                required
              >
                <option value="">Select start time</option>
                {timeSlots.map((time) => (
                  <option key={time} value={time}>
                    {formatTimeDisplay(time)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                End Time *
              </label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                required
              >
                <option value="">Select end time</option>
                {timeSlots.map((time) => (
                  <option key={time} value={time}>
                    {formatTimeDisplay(time)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Lunch break, Staff meeting, Clinic maintenance"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              maxLength={200}
            />
            <p className="mt-1 text-xs text-gray-500">Optional description for this blocked time</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Block Time Slot
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
