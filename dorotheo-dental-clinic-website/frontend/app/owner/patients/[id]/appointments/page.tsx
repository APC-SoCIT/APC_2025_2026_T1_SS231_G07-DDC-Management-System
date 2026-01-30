"use client"

import { useState, useEffect, Fragment, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Calendar, ChevronDown, ChevronUp, Clock, FileText, Calendar as CalendarIcon, Plus, X } from "lucide-react"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import AppointmentSuccessModal from "@/components/appointment-success-modal"

interface Patient {
  id: number
  first_name: string
  last_name: string
  email: string
}

interface Service {
  id: number
  name: string
  category: string
  description: string
  duration: number
  color: string
}

interface Staff {
  id: number
  first_name: string
  last_name: string
  user_type: string
  role?: string
}

interface Appointment {
  id: number
  patient: number
  patient_name: string
  patient_email: string
  dentist: number | null
  dentist_name: string | null
  service: number | null
  service_name: string | null
  service_color: string | null
  date: string
  time: string
  status: "confirmed" | "pending" | "cancelled" | "completed" | "missed"
  notes: string
  created_at: string
  updated_at: string
  completed_at: string | null
}

export default function PatientAppointmentsPage() {
  const router = useRouter()
  const params = useParams()
  const patientId = params.id as string
  const { token } = useAuth()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [newAppointment, setNewAppointment] = useState({
    date: "",
    time: "",
    dentist: "",
    service: "",
    notes: "",
  })
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set())
  const [bookedSlots, setBookedSlots] = useState<Array<{date: string, time: string, dentist_id: number, service_id?: number}>>([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successAppointmentDetails, setSuccessAppointmentDetails] = useState<any>(null)

  useEffect(() => {
    if (!token || !patientId) return
    fetchData()
    fetchServicesAndStaff()
  }, [token, patientId])

  useEffect(() => {
    if (!token || !newAppointment.dentist) return

    const fetchDentistAvailability = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/dentist-availability/?dentist_id=${newAppointment.dentist}`,
          {
            headers: {
              Authorization: `Token ${token}`,
            },
          }
        )
        if (response.ok) {
          const data = await response.json()
          const dates = new Set(data.map((slot: any) => slot.date))
          setAvailableDates(dates)
        }
      } catch (error) {
        console.error("Error fetching dentist availability:", error)
      }
    }

    fetchDentistAvailability()
  }, [newAppointment.dentist, token])

  useEffect(() => {
    if (selectedDate) {
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
      setNewAppointment({ ...newAppointment, date: dateStr })
    }
  }, [selectedDate])

  useEffect(() => {
    if (!token || !newAppointment.date) {
      setBookedSlots([])
      return
    }

    const fetchBookedSlots = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/booked-slots/?date=${newAppointment.date}`,
          {
            headers: {
              Authorization: `Token ${token}`,
            },
          }
        )
        if (response.ok) {
          const data = await response.json()
          setBookedSlots(data)
        }
      } catch (error) {
        console.error("Error fetching booked slots:", error)
      }
    }

    fetchBookedSlots()
  }, [newAppointment.date, token])

  const fetchServicesAndStaff = async () => {
    if (!token) return
    
    try {
      const [servicesData, staffData] = await Promise.all([
        api.getServices(token),
        api.getStaff(token),
      ])
      setServices(servicesData)
      setStaff(staffData.filter((s: any) => s.user_type === "dentist" || s.role === "dentist"))
    } catch (error) {
      console.error("Failed to fetch services and staff:", error)
    }
  }

  const fetchData = async () => {
    if (!token) return

    try {
      setIsLoading(true)
      const [patientData, appointmentsData] = await Promise.all([
        api.getPatientById(Number.parseInt(patientId), token),
        api.getAppointments(token),
      ])

      setPatient(patientData)
      const patientAppointments = appointmentsData.filter(
        (apt: any) => apt.patient?.id === Number.parseInt(patientId) || apt.patient === Number.parseInt(patientId)
      )
      setAppointments(patientAppointments)
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token || !patientId) {
      alert("Error: Missing patient information")
      return
    }

    const selectedService = services.find(s => s.id === Number(newAppointment.service))
    const duration = selectedService?.duration || 30

    const hasConflict = isTimeSlotBooked(newAppointment.date, newAppointment.time, duration)

    if (hasConflict) {
      alert("This time slot conflicts with an existing appointment. Please select a different time.")
      return
    }

    try {
      const appointmentData = {
        patient: Number.parseInt(patientId),
        date: newAppointment.date,
        time: newAppointment.time,
        dentist: newAppointment.dentist ? Number.parseInt(newAppointment.dentist) : null,
        service: newAppointment.service ? Number.parseInt(newAppointment.service) : null,
        notes: newAppointment.notes,
        status: "confirmed",
      }

      const createdAppointment = await api.createAppointment(appointmentData, token)
      
      const service = services.find(s => s.id === Number.parseInt(newAppointment.service))
      const dentist = staff.find(s => s.id === Number.parseInt(newAppointment.dentist))
      
      setSuccessAppointmentDetails({
        patientName: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient',
        date: newAppointment.date,
        time: newAppointment.time,
        service: service?.name,
        dentist: dentist ? `Dr. ${dentist.first_name} ${dentist.last_name}` : undefined
      })
      
      setShowAddModal(false)
      setShowSuccessModal(true)
      
      setNewAppointment({
        date: "",
        time: "",
        dentist: "",
        service: "",
        notes: "",
      })
      setSelectedDate(undefined)
      setBookedSlots([])
      
      fetchData()
    } catch (error: any) {
      console.error("Error creating appointment:", error)
      if (error.response?.data?.error === 'Time slot conflict') {
        alert(error.response.data.message || "This time slot is already booked. Please select a different time.")
      } else {
        alert("Failed to create appointment. Please try again.")
      }
    }
  }

  const generateTimeSlots = (durationMinutes: number = 30, selectedDate?: string) => {
    const slots: { value: string; display: string }[] = []
    const startHour = 10
    const endHour = 20
    const startMinutes = startHour * 60
    const endMinutes = endHour * 60
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const selectedDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : null
    const isToday = selectedDateObj?.getTime() === today.getTime()
    const currentTimeInMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0
    
    for (let totalMinutes = startMinutes; totalMinutes < endMinutes; totalMinutes += durationMinutes) {
      const hour = Math.floor(totalMinutes / 60)
      const minute = totalMinutes % 60
      
      if (isToday && totalMinutes <= currentTimeInMinutes) {
        continue
      }
      
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayStr = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`
      
      slots.push({ value: timeStr, display: displayStr })
    }
    return slots
  }

  const isTimeSlotBooked = (date: string, time: string, durationMinutes: number = 30) => {
    const [startHour, startMinute] = time.split(':').map(Number)
    const proposedStart = startHour * 60 + startMinute
    const proposedEnd = proposedStart + durationMinutes
    
    const isBooked = bookedSlots.some(slot => {
      if (slot.date !== date) return false
      
      const [bookedHour, bookedMinute] = slot.time.substring(0, 5).split(':').map(Number)
      const bookedStart = bookedHour * 60 + bookedMinute
      
      let bookedDuration = 30
      if (slot.service_id) {
        const bookedService = services.find(s => s.id === slot.service_id)
        if (bookedService && bookedService.duration) {
          bookedDuration = bookedService.duration
        }
      }
      const bookedEnd = bookedStart + bookedDuration
      
      return (proposedStart < bookedEnd && proposedEnd > bookedStart)
    })
    
    return isBooked
  }

  const formatDentistName = (dentist: Staff) => {
    return `Dr. ${dentist.first_name} ${dentist.last_name}`
  }

  const handleRowClick = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700"
      case "pending":
        return "bg-yellow-100 text-yellow-700"
      case "cancelled":
        return "bg-red-100 text-red-700"
      case "completed":
        return "bg-blue-100 text-blue-700"
      case "missed":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'N/A'
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const darkenColor = (color: string, percent: number) => {
    const num = parseInt(color.replace("#", ""), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) - amt
    const G = ((num >> 8) & 0x00ff) - amt
    const B = (num & 0x0000ff) - amt
    return `#${(
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-500 mb-4">Patient not found</p>
        <button
          onClick={() => router.push("/owner/patients")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Patients
        </button>
      </div>
    )
  }

  const upcomingAppointments = appointments.filter(
    (apt) => new Date(`${apt.date}T${apt.time || '00:00'}`) >= new Date() && apt.status !== "completed" && apt.status !== "cancelled" && apt.status !== "missed"
  )

  const pastAppointments = appointments.filter(
    (apt) => new Date(`${apt.date}T${apt.time || '00:00'}`) < new Date() || apt.status === "completed" || apt.status === "cancelled" || apt.status === "missed"
  )

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Success Modal */}
      {showSuccessModal && successAppointmentDetails && (
        <AppointmentSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          appointmentDetails={successAppointmentDetails}
        />
      )}

      {/* Header with Back Button and Book Button */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push(`/owner/patients/${patientId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to {patient?.first_name} {patient?.last_name} details</span>
        </button>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Book Appointment
        </button>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">All Appointments</h1>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden mb-6">
        <div className="px-6 py-4 bg-[var(--color-background)] border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Upcoming Appointments
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Treatment</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Time</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Dentist</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {upcomingAppointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No upcoming appointments
                  </td>
                </tr>
              ) : (
                upcomingAppointments.map((apt) => (
                  <Fragment key={apt.id}>
                    <tr
                      onClick={() => handleRowClick(apt.id)}
                      className="hover:bg-[var(--color-background)] transition-all duration-200 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {expandedRow === apt.id ? (
                            <ChevronUp className="w-4 h-4 text-[var(--color-primary)]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
                          )}
                          <span 
                            className="inline-block px-3 py-1 rounded-lg font-medium whitespace-nowrap"
                            style={{ 
                              color: darkenColor(apt.service_color || '#10b981', 40),
                              backgroundColor: `${apt.service_color || '#10b981'}15`,
                              border: `1px solid ${apt.service_color || '#10b981'}40`
                            }}
                          >
                            {apt.service_name || "General Consultation"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[var(--color-text-muted)]">{apt.date}</td>
                      <td className="px-6 py-4 text-[var(--color-text-muted)]">{formatTime(apt.time)}</td>
                      <td className="px-6 py-4 text-[var(--color-text-muted)]">{apt.dentist_name || "Not Assigned"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                          {formatStatus(apt.status)}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {expandedRow === apt.id && (
                      <tr>
                        <td colSpan={5} className="bg-gradient-to-br from-gray-50 to-teal-50">
                          <div className="px-6 py-6 animate-in slide-in-from-top-2 duration-300">
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-[var(--color-primary)]">
                                  Appointment Details
                                </h3>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Appointment Details Card */}
                                <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
                                  <h4 className="font-semibold text-[var(--color-primary)] mb-4 flex items-center gap-2">
                                    <CalendarIcon className="w-5 h-5" />
                                    Appointment Details
                                  </h4>
                                  <div className="space-y-3 text-sm">
                                    <div>
                                      <p className="text-[var(--color-text-muted)] mb-0.5">Service</p>
                                      <p className="font-medium">{apt.service_name || "General Consultation"}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <CalendarIcon className="w-4 h-4 text-[var(--color-text-muted)]" />
                                      <div>
                                        <p className="text-[var(--color-text-muted)] text-xs mb-0.5">Date</p>
                                        <p className="font-medium">{apt.date}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />
                                      <div>
                                        <p className="text-[var(--color-text-muted)] text-xs mb-0.5">Time</p>
                                        <p className="font-medium">{formatTime(apt.time)}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-[var(--color-text-muted)] mb-0.5">Assigned Dentist</p>
                                      <p className="font-medium">{apt.dentist_name || "Not Assigned"}</p>
                                    </div>
                                    <div>
                                      <p className="text-[var(--color-text-muted)] mb-0.5">Status</p>
                                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                                        {formatStatus(apt.status)}
                                      </span>
                                    </div>
                                    {apt.status === "completed" && apt.completed_at && (
                                      <div className="pt-3 border-t border-[var(--color-border)]">
                                        <p className="text-[var(--color-text-muted)] mb-0.5">Completed At</p>
                                        <p className="font-medium text-green-600">{new Date(apt.completed_at).toLocaleString()}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Additional Information Card */}
                                <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
                                  <h4 className="font-semibold text-[var(--color-primary)] mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Notes & Information
                                  </h4>
                                  <div className="space-y-4 text-sm">
                                    <div>
                                      <p className="text-[var(--color-text-muted)] mb-2 font-medium">Notes</p>
                                      <p className="text-sm leading-relaxed">{apt.notes || "No notes added"}</p>
                                    </div>
                                    <div className="pt-3 border-t border-[var(--color-border)]">
                                      <p className="text-[var(--color-text-muted)] text-xs mb-1">Created</p>
                                      <p className="text-sm">{new Date(apt.created_at).toLocaleString()}</p>
                                    </div>
                                    {apt.updated_at !== apt.created_at && (
                                      <div>
                                        <p className="text-[var(--color-text-muted)] text-xs mb-1">Last Updated</p>
                                        <p className="text-sm">{new Date(apt.updated_at).toLocaleString()}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Past Appointments */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-6 py-4 bg-[var(--color-background)] border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            Past Appointments
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Treatment</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Time</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Dentist</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {pastAppointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No past appointments
                  </td>
                </tr>
              ) : (
                pastAppointments.map((apt) => (
                  <Fragment key={apt.id}>
                    <tr
                      onClick={() => handleRowClick(apt.id)}
                      className="hover:bg-[var(--color-background)] transition-all duration-200 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {expandedRow === apt.id ? (
                            <ChevronUp className="w-4 h-4 text-[var(--color-primary)]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
                          )}
                          <span 
                            className="inline-block px-3 py-1 rounded-lg font-medium whitespace-nowrap"
                            style={{ 
                              color: darkenColor(apt.service_color || '#10b981', 40),
                              backgroundColor: `${apt.service_color || '#10b981'}15`,
                              border: `1px solid ${apt.service_color || '#10b981'}40`
                            }}
                          >
                            {apt.service_name || "General Consultation"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[var(--color-text-muted)]">{apt.date}</td>
                      <td className="px-6 py-4 text-[var(--color-text-muted)]">{formatTime(apt.time)}</td>
                      <td className="px-6 py-4 text-[var(--color-text-muted)]">{apt.dentist_name || "Not Assigned"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                          {formatStatus(apt.status)}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {expandedRow === apt.id && (
                      <tr>
                        <td colSpan={5} className="bg-gradient-to-br from-gray-50 to-teal-50">
                          <div className="px-6 py-6 animate-in slide-in-from-top-2 duration-300">
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-[var(--color-primary)]">
                                  Appointment Details
                                </h3>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Appointment Details Card */}
                                <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
                                  <h4 className="font-semibold text-[var(--color-primary)] mb-4 flex items-center gap-2">
                                    <CalendarIcon className="w-5 h-5" />
                                    Appointment Details
                                  </h4>
                                  <div className="space-y-3 text-sm">
                                    <div>
                                      <p className="text-[var(--color-text-muted)] mb-0.5">Service</p>
                                      <p className="font-medium">{apt.service_name || "General Consultation"}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <CalendarIcon className="w-4 h-4 text-[var(--color-text-muted)]" />
                                      <div>
                                        <p className="text-[var(--color-text-muted)] text-xs mb-0.5">Date</p>
                                        <p className="font-medium">{apt.date}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />
                                      <div>
                                        <p className="text-[var(--color-text-muted)] text-xs mb-0.5">Time</p>
                                        <p className="font-medium">{formatTime(apt.time)}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-[var(--color-text-muted)] mb-0.5">Assigned Dentist</p>
                                      <p className="font-medium">{apt.dentist_name || "Not Assigned"}</p>
                                    </div>
                                    <div>
                                      <p className="text-[var(--color-text-muted)] mb-0.5">Status</p>
                                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                                        {formatStatus(apt.status)}
                                      </span>
                                    </div>
                                    {apt.status === "completed" && apt.completed_at && (
                                      <div className="pt-3 border-t border-[var(--color-border)]">
                                        <p className="text-[var(--color-text-muted)] mb-0.5">Completed At</p>
                                        <p className="font-medium text-green-600">{new Date(apt.completed_at).toLocaleString()}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Additional Information Card */}
                                <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
                                  <h4 className="font-semibold text-[var(--color-primary)] mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Notes & Information
                                  </h4>
                                  <div className="space-y-4 text-sm">
                                    <div>
                                      <p className="text-[var(--color-text-muted)] mb-2 font-medium">Notes</p>
                                      <p className="text-sm leading-relaxed">{apt.notes || "No notes added"}</p>
                                    </div>
                                    <div className="pt-3 border-t border-[var(--color-border)]">
                                      <p className="text-[var(--color-text-muted)] text-xs mb-1">Created</p>
                                      <p className="text-sm">{new Date(apt.created_at).toLocaleString()}</p>
                                    </div>
                                    {apt.updated_at !== apt.created_at && (
                                      <div>
                                        <p className="text-[var(--color-text-muted)] text-xs mb-1">Last Updated</p>
                                        <p className="text-sm">{new Date(apt.updated_at).toLocaleString()}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Appointment Modal */}
      {showAddModal && patient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[var(--color-primary)]">
                Book Appointment for {patient.first_name} {patient.last_name}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewAppointment({ date: "", time: "", dentist: "", service: "", notes: "" })
                  setSelectedDate(undefined)
                }}
                className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAppointment} className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> The appointment will be confirmed immediately.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                      Patient
                    </label>
                    <input
                      type="text"
                      value={`${patient.first_name} ${patient.last_name} - ${patient.email}`}
                      readOnly
                      className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                      Preferred Dentist <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newAppointment.dentist}
                      onChange={(e) => {
                        setNewAppointment({ ...newAppointment, dentist: e.target.value, date: "", time: "" })
                        setSelectedDate(undefined)
                      }}
                      className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      required
                    >
                      <option value="">Select a dentist first...</option>
                      {staff.map((s) => (
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
                      placeholder="Any special requests or information..."
                      className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {newAppointment.dentist && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                        Select Date <span className="text-red-500">*</span>
                      </label>
                      <div className="border border-[var(--color-border)] rounded-lg p-4 bg-white">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => {
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            const checkDate = new Date(date)
                            checkDate.setHours(0, 0, 0, 0)
                            if (checkDate < today) return true
                            
                            const maxDate = new Date(today)
                            maxDate.setDate(today.getDate() + 90)
                            if (checkDate > maxDate) return true
                            
                            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                            return !availableDates.has(dateStr)
                          }}
                          modifiers={{
                            available: (date) => {
                              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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
                            ⚠️ This dentist has no available schedule set.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedDate && newAppointment.service && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                        Preferred Time <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newAppointment.time}
                        onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                        className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        required
                      >
                        <option value="">Select a time...</option>
                        {generateTimeSlots(
                          services.find(s => s.id === Number(newAppointment.service))?.duration || 30,
                          newAppointment.date
                        ).map((slot) => {
                          const selectedService = services.find(s => s.id === Number(newAppointment.service))
                          const isBooked = isTimeSlotBooked(
                            newAppointment.date,
                            slot.value,
                            selectedService?.duration || 30
                          )
                          
                          return (
                            <option key={slot.value} value={slot.value} disabled={isBooked}>
                              {slot.display} {isBooked ? '(Booked)' : ''}
                            </option>
                          )
                        })}
                      </select>
                      {newAppointment.time && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Time slot available
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewAppointment({ date: "", time: "", dentist: "", service: "", notes: "" })
                    setSelectedDate(undefined)
                  }}
                  className="px-6 py-2.5 border border-[var(--color-border)] rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium"
                  disabled={!newAppointment.dentist || !newAppointment.service || !newAppointment.date || !newAppointment.time}
                >
                  Book Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
