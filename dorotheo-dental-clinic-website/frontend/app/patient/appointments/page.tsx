"use client"

import { useState, useEffect } from "react"
import { Calendar as CalendarIcon, Clock, User, Plus, X, Edit, XCircle } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface Appointment {
  id: number
  patient: number
  patient_name: string
  patient_email: string
  dentist: number | null
  dentist_name: string | null
  service: number | null
  service_name: string | null
  date: string
  time: string
  status: "confirmed" | "cancelled" | "completed" | "missed" | "reschedule_requested" | "cancel_requested"
  notes: string
  reschedule_date: string | null
  reschedule_time: string | null
  reschedule_service: number | null
  reschedule_service_name: string | null
  reschedule_dentist: number | null
  reschedule_dentist_name: string | null
  reschedule_notes: string
  cancel_reason: string
  created_at: string
  updated_at: string
}

interface Staff {
  id: number
  first_name: string
  last_name: string
  user_type: string
  role: string
}

interface Service {
  id: number
  name: string
  category: string
  description: string
}

export default function PatientAppointments() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming")
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [staff, setStaff] = useState<Staff[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [newAppointment, setNewAppointment] = useState({
    date: "",
    time: "",
    dentist: "",
    service: "",
    notes: "",
  })
  const [rescheduleData, setRescheduleData] = useState({
    date: "",
    time: "",
    dentist: "",
    service: "",
    notes: "",
  })
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [rescheduleSelectedDate, setRescheduleSelectedDate] = useState<Date | undefined>(undefined)
  const [dentistAvailability, setDentistAvailability] = useState<any[]>([])
  const [rescheduleDentistAvailability, setRescheduleDentistAvailability] = useState<any[]>([])
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set())
  const [rescheduleAvailableDates, setRescheduleAvailableDates] = useState<Set<string>>(new Set())
  const [bookedSlots, setBookedSlots] = useState<Array<{date: string, time: string, dentist_id: number}>>([])

  // Generate 30-minute time slots from 10:00 AM to 8:00 PM
  const generateTimeSlots = () => {
    const slots: { value: string; display: string }[] = []
    for (let hour = 10; hour <= 20; hour++) {
      for (let minute of [0, 30]) {
        if (hour === 20 && minute === 30) break // Stop at 8:00 PM
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        // Convert to 12-hour format for display
        const hour12 = hour > 12 ? hour - 12 : hour
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const displayStr = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`
        slots.push({ value: timeStr, display: displayStr })
      }
    }
    return slots
  }

  // Check if a time slot is already booked
  // BLOCKING RULE: Same date + time = BLOCKED (regardless of dentist)
  const isTimeSlotBooked = (date: string, time: string) => {
    // Normalize time format: remove seconds if present (10:00:00 -> 10:00)
    const normalizedTime = time.substring(0, 5)
    
    const isBooked = bookedSlots.some(slot => {
      const slotTime = slot.time.substring(0, 5) // Normalize slot time too
      
      // Only check if same date AND same time
      return slot.date === date && slotTime === normalizedTime
    })
    
    console.log(`[PATIENT] Checking ${time} on ${date}:`, isBooked ? 'BLOCKED' : 'Available')
    return isBooked
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return

      try {
        setIsLoading(true)
        // Fetch appointments
        const appointmentsData = await api.getAppointments(token)
        setAllAppointments(appointmentsData)
        
        // Fetch staff (dentists)
        const staffData = await api.getStaff(token)
        setStaff(staffData)
        
        // Fetch services
        const servicesData = await api.getServices()
        setServices(servicesData)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [token])

  // Fetch dentist availability when dentist is selected
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

  // Update date when calendar date is selected
  useEffect(() => {
    if (selectedDate) {
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      setNewAppointment(prev => ({ ...prev, date: `${year}-${month}-${day}` }))
    }
  }, [selectedDate])

  // Fetch dentist availability for reschedule modal
  useEffect(() => {
    const fetchRescheduleDentistAvailability = async () => {
      if (!token || !rescheduleData.dentist) {
        setRescheduleDentistAvailability([])
        setRescheduleAvailableDates(new Set())
        return
      }

      try {
        const availability = await api.getStaffAvailability(Number(rescheduleData.dentist), token)
        setRescheduleDentistAvailability(availability)
        
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
        
        setRescheduleAvailableDates(dates)
      } catch (error) {
        console.error("Error fetching reschedule dentist availability:", error)
      }
    }

    fetchRescheduleDentistAvailability()
  }, [rescheduleData.dentist, token])

  // Fetch booked slots when date changes (get ALL slots, not filtered by dentist)
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!token) return

      try {
        // Fetch ALL booked slots (no dentist filter) to prevent double booking across all dentists
        const date = newAppointment.date || undefined
        
        console.log('[PATIENT] Fetching booked slots for date:', date)
        const slots = await api.getBookedSlots(undefined, date, token)
        console.log('[PATIENT] Booked slots received:', slots)
        setBookedSlots(slots)
      } catch (error) {
        console.error("Error fetching booked slots:", error)
      }
    }

    if (newAppointment.date) {
      fetchBookedSlots()
    }
  }, [newAppointment.date, token])

  // Update reschedule date when calendar date is selected
  useEffect(() => {
    if (rescheduleSelectedDate) {
      const year = rescheduleSelectedDate.getFullYear()
      const month = String(rescheduleSelectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(rescheduleSelectedDate.getDate()).padStart(2, '0')
      setRescheduleData(prev => ({ ...prev, date: `${year}-${month}-${day}` }))
    }
  }, [rescheduleSelectedDate])

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token || !user) {
      alert("Please log in to create an appointment")
      return
    }

    // Check for time slot conflicts using the booked slots data
    const hasConflict = isTimeSlotBooked(newAppointment.date, newAppointment.time)

    if (hasConflict) {
      alert("This time slot is already booked. Please select a different time.")
      return
    }

    try {
      const appointmentData = {
        patient: user.id,
        dentist: newAppointment.dentist ? Number.parseInt(newAppointment.dentist) : null,
        date: newAppointment.date,
        time: newAppointment.time,
        service: newAppointment.service ? Number.parseInt(newAppointment.service) : null,
        notes: newAppointment.notes || "",
        status: "pending", // Patients create pending appointments - staff/owner must approve
      }

      console.log("Creating appointment:", appointmentData)
      const createdAppointment = await api.createAppointment(appointmentData, token)
      console.log("Appointment created:", createdAppointment)
      setAllAppointments([createdAppointment, ...allAppointments])
      setShowAddModal(false)
      setNewAppointment({
        date: "",
        time: "",
        dentist: "",
        service: "",
        notes: "",
      })
      setSelectedDate(undefined)
      setBookedSlots([])
      alert("Appointment booked successfully! Staff and owner have been notified.")
    } catch (error: any) {
      console.error("Error creating appointment:", error)
      // Check if it's a double booking error from backend
      if (error?.response?.data?.error === 'Time slot conflict') {
        alert(error.response.data.message || "This time slot is already booked. Please select a different time.")
      } else {
        const errorMsg = error?.response?.data ? 
          (typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data, null, 2)) :
          error?.message || "Failed to create appointment. Please try again."
        alert(`Failed to create appointment:\n${errorMsg}`)
      }
    }
  }

  const handleRequestReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setRescheduleData({
      date: appointment.date,
      time: appointment.time,
      dentist: appointment.dentist?.toString() || "",
      service: appointment.service?.toString() || "",
      notes: appointment.notes || "",
    })
    setRescheduleSelectedDate(undefined)
    setRescheduleDentistAvailability([])
    setRescheduleAvailableDates(new Set())
    setShowRescheduleModal(true)
  }

  const handleSubmitReschedule = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token || !selectedAppointment) return

    try {
      const rescheduleRequestData = {
        date: rescheduleData.date,
        time: rescheduleData.time,
        dentist: rescheduleData.dentist ? parseInt(rescheduleData.dentist) : undefined,
        service: rescheduleData.service ? parseInt(rescheduleData.service) : undefined,
        notes: rescheduleData.notes || "",
      }

      const updatedAppointment = await api.requestReschedule(
        selectedAppointment.id, 
        rescheduleRequestData, 
        token
      )
      
      setAllAppointments(allAppointments.map(apt => 
        apt.id === selectedAppointment.id ? updatedAppointment : apt
      ))
      setShowRescheduleModal(false)
      setSelectedAppointment(null)
      setRescheduleData({
        date: "",
        time: "",
        dentist: "",
        service: "",
        notes: "",
      })
      alert("Reschedule request submitted! Staff will review it soon.")
    } catch (error) {
      console.error("Error requesting reschedule:", error)
      alert("Failed to submit reschedule request. Please try again.")
    }
  }

  const handleCancelRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token || !selectedAppointment) return

    try {
      await api.requestCancel(selectedAppointment.id, cancelReason, token)
      
      // Update the appointment status locally
      setAllAppointments(allAppointments.map(apt => 
        apt.id === selectedAppointment.id 
          ? { ...apt, status: "cancel_requested" as const }
          : apt
      ))
      
      setShowCancelModal(false)
      setSelectedAppointment(null)
      setCancelReason("")
      alert("Cancellation request submitted! Staff will review it soon.")
    } catch (error: any) {
      console.error("Error requesting cancellation:", error)
      const errorMessage = error.message || "Failed to submit cancellation request. Please try again."
      alert(errorMessage)
    }
  }

  // Helper function to format dentist name with "Dr." prefix
  const formatDentistName = (staff: Staff) => {
    const fullName = `${staff.first_name} ${staff.last_name}`.trim()
    // Only add "Dr." if it's not already in the name
    if (fullName.toLowerCase().startsWith('dr.') || fullName.toLowerCase().startsWith('dr ')) {
      return fullName
    }
    return `Dr. ${fullName}`
  }

  // Separate appointments into upcoming and past
  const now = new Date()
  const upcomingAppointments = allAppointments.filter((apt) => {
    const aptDate = new Date(apt.date + 'T' + apt.time)
    return aptDate >= now && apt.status !== 'completed' && apt.status !== 'cancelled'
  })

  const pastAppointments = allAppointments.filter((apt) => {
    const aptDate = new Date(apt.date + 'T' + apt.time)
    return aptDate < now || apt.status === 'completed' || apt.status === 'cancelled'
  })

  const appointments = activeTab === "upcoming" ? upcomingAppointments : pastAppointments

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700"
      case "missed":
        return "bg-red-100 text-red-700"
      case "reschedule_requested":
        return "bg-orange-100 text-orange-700"
      case "cancel_requested":
        return "bg-red-100 text-red-700"
      case "completed":
        return "bg-blue-100 text-blue-700"
      case "cancelled":
        return "bg-gray-100 text-gray-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const formatStatus = (status: string) => {
    switch (status) {
      case "reschedule_requested":
        return "Reschedule Requested"
      case "cancel_requested":
        return "Cancellation Requested"
      case "missed":
        return "Missed"
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[var(--color-primary)] mb-2">My Appointments</h1>
          <p className="text-[var(--color-text-muted)]">View and manage your dental appointments</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Appointment
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "upcoming"
              ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "past"
              ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          Past
        </button>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
              <p className="text-[var(--color-text-muted)]">Loading appointments...</p>
            </div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center">
            <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)] opacity-30" />
            <p className="text-lg font-medium text-[var(--color-text)] mb-2">
              {activeTab === "upcoming" ? "No Upcoming Appointments" : "No Past Appointments"}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {activeTab === "upcoming" 
                ? "You don't have any scheduled appointments yet" 
                : "You haven't had any appointments yet"}
            </p>
          </div>
        ) : (
          appointments.map((appointment) => (
            <div key={appointment.id} className="bg-white rounded-xl border border-[var(--color-border)] p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-semibold text-[var(--color-text)]">
                      {appointment.service_name || "General Consultation"}
                    </h3>
                    {/* Only show status badge for non-confirmed appointments */}
                    {appointment.status !== "confirmed" && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {formatStatus(appointment.status)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                      <CalendarIcon className="w-4 h-4" />
                      <span className="text-sm">{appointment.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{appointment.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                      <User className="w-4 h-4" />
                      <span className="text-sm">{appointment.dentist_name || "To be assigned"}</span>
                    </div>
                  </div>

                  {appointment.status === "reschedule_requested" && appointment.reschedule_date && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm font-semibold text-orange-800 mb-2">📅 Requested Reschedule:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-orange-600 font-medium">New Date:</span>
                          <p className="text-orange-800">{appointment.reschedule_date}</p>
                        </div>
                        <div>
                          <span className="text-orange-600 font-medium">New Time:</span>
                          <p className="text-orange-800">{appointment.reschedule_time}</p>
                        </div>
                        <div>
                          <span className="text-orange-600 font-medium">New Dentist:</span>
                          <p className="text-orange-800">{appointment.reschedule_dentist_name || "To be assigned"}</p>
                        </div>
                      </div>
                      {appointment.reschedule_service_name && (
                        <div className="mt-2">
                          <span className="text-orange-600 font-medium text-sm">New Treatment:</span>
                          <p className="text-orange-800 text-sm">{appointment.reschedule_service_name}</p>
                        </div>
                      )}
                      <p className="text-xs text-orange-700 mt-2">Waiting for staff approval...</p>
                    </div>
                  )}

                  {appointment.notes && (
                    <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                      <p className="text-sm text-[var(--color-text-muted)]">
                        <span className="font-medium">Notes:</span> {appointment.notes}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Action buttons for confirmed and missed appointments */}
                {appointment.status === "confirmed" && activeTab === "upcoming" && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleRequestReschedule(appointment)}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Request Reschedule
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAppointment(appointment)
                        setShowCancelModal(true)
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Request Cancel
                    </button>
                  </div>
                )}

                {/* Reschedule button for missed appointments */}
                {appointment.status === "missed" && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleRequestReschedule(appointment)}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Request Reschedule
                    </button>
                  </div>
                )}

                {/* Info for reschedule requested appointments */}
                {appointment.status === "reschedule_requested" && (
                  <div className="text-sm text-orange-600 font-medium">
                    Reschedule pending approval...
                  </div>
                )}

                {/* Info for cancel requested appointments */}
                {appointment.status === "cancel_requested" && (
                  <div className="text-sm text-red-600 font-medium">
                    Cancellation pending approval...
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[var(--color-primary)]">Book Appointment</h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewAppointment({ date: "", time: "", dentist: "", service: "", notes: "" })
                  setSelectedDate(undefined)
                  setAvailableDates(new Set())
                }}
                className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAppointment} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Your appointment will be booked immediately and staff/owner will be notified.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Preferred Dentist <span className="text-red-500">*</span>
                </label>
                <select
                  value={newAppointment.dentist}
                  onChange={(e) => {
                    setNewAppointment({ ...newAppointment, dentist: e.target.value, date: "" })
                    setSelectedDate(undefined)
                  }}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  required
                >
                  <option value="">Select a dentist first...</option>
                  {staff.filter((s) => s.role === 'dentist' || s.user_type === 'owner').map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatDentistName(s)}
                    </option>
                  ))}
                </select>
                {newAppointment.dentist && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Available dates are highlighted in the calendar below
                  </p>
                )}
              </div>

              {/* Calendar for date selection */}
              {newAppointment.dentist && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                    Select Date <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-[var(--color-border)] rounded-lg p-4 bg-white">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => {
                        // Disable past dates
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        if (date < today) return true
                        
                        // Disable dates beyond 90 days
                        const maxDate = new Date(today)
                        maxDate.setDate(today.getDate() + 90)
                        if (date > maxDate) return true
                        
                        // Disable dates when dentist is not available
                        const dateStr = date.toISOString().split('T')[0]
                        return !availableDates.has(dateStr)
                      }}
                      modifiers={{
                        available: (date) => {
                          const dateStr = date.toISOString().split('T')[0]
                          return availableDates.has(dateStr)
                        }
                      }}
                      modifiersClassNames={{
                        available: "bg-green-100 text-green-900 font-semibold hover:bg-green-200"
                      }}
                      className="mx-auto"
                    />
                    {availableDates.size === 0 && (
                      <p className="text-sm text-amber-600 mt-2 text-center">
                        ⚠️ This dentist has no available schedule set. Please contact the clinic.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Time selection - only show if date is selected */}
              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                    Preferred Time <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-600 mb-2">
                    Select a 30-minute time slot (10:00 AM - 8:00 PM). Grayed out times are already booked.
                  </p>
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2 border border-[var(--color-border)] rounded-lg">
                    {generateTimeSlots().map((slot) => {
                      const isBooked = isTimeSlotBooked(newAppointment.date, slot.value)
                      const isSelected = newAppointment.time === slot.value
                      return (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => !isBooked && setNewAppointment({ ...newAppointment, time: slot.value })}
                          disabled={isBooked}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-[var(--color-primary)] text-white'
                              : isBooked
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                              : 'bg-white border border-[var(--color-border)] hover:bg-[var(--color-background)] text-[var(--color-text)]'
                          }`}
                        >
                          {slot.display}
                        </button>
                      )
                    })}
                  </div>
                  {!newAppointment.time && (
                    <p className="text-xs text-red-600 mt-1">* Please select a time slot</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Treatment/Service <span className="text-red-500">*</span>
                </label>
                <select
                  value={newAppointment.service}
                  onChange={(e) => setNewAppointment({ ...newAppointment, service: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  required
                >
                  <option value="">Select a treatment...</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Additional Notes
                </label>
                <textarea
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                  rows={4}
                  placeholder="Any special requests or information our staff should know..."
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewAppointment({ date: "", time: "", dentist: "", service: "", notes: "" })
                    setSelectedDate(undefined)
                    setAvailableDates(new Set())
                  }}
                  className="flex-1 px-6 py-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium"
                >
                  Book Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[var(--color-primary)]">Request Reschedule</h2>
              <button
                onClick={() => {
                  setShowRescheduleModal(false)
                  setSelectedAppointment(null)
                  setRescheduleSelectedDate(undefined)
                  setRescheduleAvailableDates(new Set())
                }}
                className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReschedule} className="p-6 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-orange-800">
                  <strong>Note:</strong> Your reschedule request will need staff approval. Your current appointment will remain active until approved.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Current Appointment:</p>
                <p className="text-sm text-gray-600">
                  {selectedAppointment.date} at {selectedAppointment.time}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedAppointment.service_name || "General Consultation"}
                </p>
                <p className="text-sm text-gray-600">
                  with {selectedAppointment.dentist_name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Dentist <span className="text-red-500">*</span>
                </label>
                <select
                  value={rescheduleData.dentist}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, dentist: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  required
                >
                  <option value="">Select Dentist</option>
                  {staff
                    .filter((member) => member.role === "dentist")
                    .map((dentist) => (
                      <option key={dentist.id} value={dentist.id}>
                        Dr. {dentist.first_name} {dentist.last_name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Calendar for selecting date */}
              {rescheduleData.dentist && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                    Select Date <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-[var(--color-border)] rounded-lg p-4">
                    <Calendar
                      mode="single"
                      selected={rescheduleSelectedDate}
                      onSelect={setRescheduleSelectedDate}
                      className="rounded-md"
                      disabled={(date) => {
                        const dateStr = date.toISOString().split('T')[0]
                        return !rescheduleAvailableDates.has(dateStr)
                      }}
                      modifiers={{
                        available: (date) => {
                          const dateStr = date.toISOString().split('T')[0]
                          return rescheduleAvailableDates.has(dateStr)
                        }
                      }}
                      modifiersStyles={{
                        available: {
                          backgroundColor: '#10b981',
                          color: 'white',
                          fontWeight: 'bold'
                        }
                      }}
                    />
                    {rescheduleDentistAvailability.length > 0 && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm font-semibold text-green-800 mb-2">Available Times:</p>
                        {rescheduleDentistAvailability
                          .filter((a: any) => a.is_available)
                          .map((availability: any, idx: number) => (
                            <p key={idx} className="text-sm text-green-700">
                              {availability.day_name}: {availability.start_time} - {availability.end_time}
                            </p>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  New Time <span className="text-red-500">*</span>
                </label>
                  <input
                    type="time"
                    value={rescheduleData.time}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })}
                    min="10:00"
                    max="20:30"
                    step="600"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Clinic hours: 10:00 AM - 8:30 PM (10-minute intervals)
                  </p>
                </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Treatment/Service
                </label>
                <select
                  value={rescheduleData.service}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, service: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="">Keep current service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Additional Notes
                </label>
                <textarea
                  value={rescheduleData.notes}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, notes: e.target.value })}
                  rows={4}
                  placeholder="Reason for rescheduling or any special requests..."
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRescheduleModal(false)
                    setSelectedAppointment(null)
                    setRescheduleSelectedDate(undefined)
                    setRescheduleAvailableDates(new Set())
                  }}
                  className="flex-1 px-6 py-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium"
                >
                  Submit Reschedule Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Request Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="text-2xl font-bold text-red-600">Request Cancellation</h2>
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setSelectedAppointment(null)
                  setCancelReason("")
                }}
                className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCancelRequest} className="p-6 space-y-4">
              {selectedAppointment && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-[var(--color-text-muted)] mb-2">Appointment to cancel:</p>
                  <p className="font-semibold text-[var(--color-text)]">
                    {selectedAppointment.service_name || "General Consultation"}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-[var(--color-text-muted)]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {selectedAppointment.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedAppointment.time}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Reason for Cancellation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={4}
                  placeholder="Please provide a reason for cancelling this appointment..."
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Your cancellation request will be reviewed by our staff. 
                  The appointment will remain active until it's approved.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelModal(false)
                    setSelectedAppointment(null)
                    setCancelReason("")
                  }}
                  className="flex-1 px-6 py-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors font-medium"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  Submit Cancellation Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
