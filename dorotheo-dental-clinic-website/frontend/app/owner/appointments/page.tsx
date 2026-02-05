"use client"

import { useState, Fragment, useEffect, useRef } from "react"
import { 
  Plus, 
  Eye, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Edit2, 
  Save, 
  X, 
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  FileText,
  Ban,
  Hourglass
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useClinic } from "@/lib/clinic-context"
import ConfirmationModal from "@/components/confirmation-modal"
import AppointmentSuccessModal from "@/components/appointment-success-modal"
import BlockTimeModal from "@/components/block-time-modal"
import BlockTimeSuccessModal from "@/components/block-time-success-modal"
import { ClinicBadge } from "@/components/clinic-badge"

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
  clinic?: number
  clinic_name?: string
  clinic_data?: {
    id: number
    name: string
    address: string
  }
  date: string
  time: string
  status: "confirmed" | "pending" | "cancelled" | "completed" | "missed" | "reschedule_requested" | "cancel_requested" | "waiting"
  patient_status?: 'waiting' | 'ongoing' | 'done'
  notes: string
  created_at: string
  updated_at: string
  completed_at: string | null
  reschedule_date: string | null
  reschedule_time: string | null
  reschedule_service: number | null
  reschedule_service_name: string | null
  reschedule_dentist: number | null
  reschedule_dentist_name: string | null
  reschedule_notes: string
  cancel_reason: string
}

interface Patient {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
}

interface Service {
  id: number
  name: string
  category: string
  description: string
  duration: number
  color: string
  clinics_data?: { id: number; name: string }[]
}

interface Staff {
  id: number
  first_name: string
  last_name: string
  user_name?: string
  user_type: string
  role?: string
}

export default function OwnerAppointments() {
  const { token } = useAuth()
  const { selectedClinic, allClinics } = useClinic()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "waiting" | "pending" | "completed" | "missed" | "cancelled" | "confirmed">("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [editedData, setEditedData] = useState<Partial<Appointment>>({})
  const [patients, setPatients] = useState<Patient[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isBookingAppointment, setIsBookingAppointment] = useState(false)
  const [newAppointment, setNewAppointment] = useState({
    patient: "",
    clinic: "",
    date: "",
    time: "",
    dentist: "",
    service: "",
    notes: "",
  })
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [dentistAvailability, setDentistAvailability] = useState<any[]>([])
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set())
  const [bookedSlots, setBookedSlots] = useState<Array<{date: string, time: string, dentist_id: number, service_id?: number}>>([]) 
  const [patientSearchQuery, setPatientSearchQuery] = useState("")
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const patientDropdownRef = useRef<HTMLDivElement>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string
    message: string
    onConfirm: () => void
    variant?: "danger" | "warning" | "info" | "success"
  } | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successAppointmentDetails, setSuccessAppointmentDetails] = useState<any>(null)
  const [showBlockTimeModal, setShowBlockTimeModal] = useState(false)
  const [showBlockTimeSuccessModal, setShowBlockTimeSuccessModal] = useState(false)
  const [blockTimeSuccessDetails, setBlockTimeSuccessDetails] = useState<any>(null)
  const [blockedTimeSlots, setBlockedTimeSlots] = useState<Array<{
    id: number
    date: string
    start_time: string
    end_time: string
    reason: string
    created_by: number
    created_by_name: string
  }>>([])
  const [sortColumn, setSortColumn] = useState<'patient' | 'treatment' | 'date' | 'time' | 'dentist' | 'status' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const parseDateOnly = (dateStr?: string) => {
    if (!dateStr) return null
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const generateTimeSlots = (durationMinutes: number = 30, selectedDate?: string) => {
    const slots: { value: string; display: string }[] = []
    const startHour = 10 // 10:00 AM
    const endHour = 20 // 8:00 PM
    const startMinutes = startHour * 60 // Convert to minutes
    const endMinutes = endHour * 60
    
    // Check if selected date is today
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const selectedDateObj = parseDateOnly(selectedDate)
    const isToday = selectedDateObj?.getTime() === today.getTime()
    const currentTimeInMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0
    
    for (let totalMinutes = startMinutes; totalMinutes < endMinutes; totalMinutes += durationMinutes) {
      const hour = Math.floor(totalMinutes / 60)
      const minute = totalMinutes % 60
      
      // Skip past times if selected date is today (hide any slot that has already started)
      if (isToday && totalMinutes <= currentTimeInMinutes) {
        continue
      }
      
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      
      // Convert to 12-hour format for display
      const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayStr = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`
      
      slots.push({ value: timeStr, display: displayStr })
    }
    return slots
  }

  // Check if a time slot overlaps with any existing appointments
  // This considers the duration of the service being booked
  const isTimeSlotBooked = (date: string, time: string, durationMinutes: number = 30) => {
    // Parse the proposed start time
    const [startHour, startMinute] = time.split(':').map(Number)
    const proposedStart = startHour * 60 + startMinute // in minutes from midnight
    const proposedEnd = proposedStart + durationMinutes
    
    const isBooked = bookedSlots.some(slot => {
      // Only check appointments on the same date
      if (slot.date !== date) return false
      
      // Get the booked appointment's time range
      const [bookedHour, bookedMinute] = slot.time.substring(0, 5).split(':').map(Number)
      const bookedStart = bookedHour * 60 + bookedMinute
      
      // Get duration of the booked appointment
      // If we don't have service info, assume 30 minutes
      let bookedDuration = 30
      if (slot.service_id) {
        const bookedService = services.find(s => s.id === slot.service_id)
        if (bookedService && bookedService.duration) {
          bookedDuration = bookedService.duration
        }
      }
      const bookedEnd = bookedStart + bookedDuration
      
      // Check for overlap: appointments overlap if one starts before the other ends
      // Overlap occurs if: (proposedStart < bookedEnd) AND (proposedEnd > bookedStart)
      const overlaps = (proposedStart < bookedEnd) && (proposedEnd > bookedStart)
      
      if (overlaps) {
        console.log(`[OWNER] Time slot ${time} (${proposedStart}-${proposedEnd}) overlaps with booked slot ${slot.time} (${bookedStart}-${bookedEnd})`)
      }
      
      return overlaps
    })
    
    // Check for overlap with blocked time slots
    const isBlocked = blockedTimeSlots.some(blockedSlot => {
      // Only check blocked slots on the same date
      if (blockedSlot.date !== date) return false
      
      // Get the blocked time range
      const [blockStartHour, blockStartMinute] = blockedSlot.start_time.split(':').map(Number)
      const [blockEndHour, blockEndMinute] = blockedSlot.end_time.split(':').map(Number)
      const blockStart = blockStartHour * 60 + blockStartMinute
      const blockEnd = blockEndHour * 60 + blockEndMinute
      
      // Check for overlap
      const overlaps = (proposedStart < blockEnd) && (proposedEnd > blockStart)
      
      if (overlaps) {
        console.log(`[OWNER] Time slot ${time} (${proposedStart}-${proposedEnd}) overlaps with blocked slot (${blockStart}-${blockEnd})`)
      }
      
      return overlaps
    })
    
    return isBooked || isBlocked
  }

  // Format dentist name with Dr. prefix
  const formatDentistName = (dentist: Staff) => {
    const prefix = dentist.first_name.startsWith('Dr.') ? '' : 'Dr. '
    return `${prefix}${dentist.first_name} ${dentist.last_name}`
  }

  // Format time from HH:MM:SS or HH:MM to 12-hour format (e.g., "1:00 PM")
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  // Fetch patients, services, and staff for the appointment dropdown
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return
      
      try {
        const [patientsData, servicesData, staffData] = await Promise.all([
          api.getPatients(token),
          api.getServices(),
          api.getStaff(token)
        ])
        setPatients(patientsData)
        setServices(servicesData)
        // Show all dentists and owners - check both user_type and role fields
        setStaff(staffData.filter((s: Staff) => 
          s.user_type === 'dentist' || 
          s.user_type === 'owner' || 
          s.role === 'dentist' || 
          s.role === 'owner'
        ))
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    fetchData()
  }, [token])

  // Fetch appointments from API
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!token) return
      
      try {
        setIsLoading(true)
        // Fetch all appointments once (without clinic filter)
        const allResponse = await api.getAppointments(token, undefined)
        setAllAppointments(allResponse)
        
        // Filter appointments locally based on selected clinic
        if (selectedClinic === "all") {
          setAppointments(allResponse)
        } else {
          const clinicId = selectedClinic?.id
          const filtered = allResponse.filter((apt: Appointment) => 
            apt.clinic === clinicId || apt.clinic_data?.id === clinicId
          )
          setAppointments(filtered)
        }
      } catch (error) {
        console.error("Error fetching appointments:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointments()
  }, [token, selectedClinic])

  // Handle clicking outside patient dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(event.target as Node)) {
        setShowPatientDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch blocked time slots
  useEffect(() => {
    const fetchBlockedTimeSlots = async () => {
      if (!token) return
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/blocked-time-slots/`, {
          headers: {
            'Authorization': `Token ${token}`,
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          setBlockedTimeSlots(data)
          console.log("Fetched blocked time slots:", data)
        }
      } catch (error) {
        console.error("Error fetching blocked time slots:", error)
      }
    }

    fetchBlockedTimeSlots()
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
        // Fetch date-specific availability (calendar-based) instead of day-of-week
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const endDate = new Date(today)
        endDate.setDate(today.getDate() + 90)
        
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
        
        const availability = await api.getDentistAvailability(Number(newAppointment.dentist), todayStr, endDateStr, token)
        console.log('[OWNER] Dentist date-specific availability:', availability)
        
        // Create set of available dates directly from the calendar availability
        const dates = new Set<string>()
        availability.forEach((item: any) => {
          if (item.is_available) {
            dates.add(item.date)
          }
        })
        
        setAvailableDates(dates)
        console.log('[OWNER] Available dates:', Array.from(dates))
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

  // Fetch booked slots when date changes (get ALL slots, not filtered by dentist)
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!token) return

      try {
        // Fetch ALL booked slots (no dentist filter) to prevent double booking across all dentists
        const date = newAppointment.date || undefined
        
        console.log('[OWNER] Fetching booked slots for date:', date)
        const slots = await api.getBookedSlots(undefined, date, token)
        console.log('[OWNER] Booked slots received:', slots)
        setBookedSlots(slots)
      } catch (error) {
        console.error("Error fetching booked slots:", error)
      }
    }

    fetchBookedSlots()
  }, [newAppointment.date, token])

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token || !selectedPatientId) {
      alert("Please select a patient")
      return
    }

    if (isBookingAppointment) {
      return // Prevent double submission
    }

    setIsBookingAppointment(true)

    // Get the selected service duration
    const selectedService = services.find(s => s.id === Number(newAppointment.service))
    const duration = selectedService?.duration || 30

    // Check for time slot conflicts using booked slots with overlap detection
    const hasConflict = isTimeSlotBooked(newAppointment.date, newAppointment.time, duration)

    if (hasConflict) {
      alert("This time slot conflicts with an existing appointment. Please select a different time.")
      return
    }

    // Check if patient already has an appointment with same service on same day at same time
    const hasDuplicate = appointments.some(apt => 
      apt.patient === selectedPatientId &&
      apt.date === newAppointment.date &&
      apt.time === newAppointment.time &&
      apt.service === Number(newAppointment.service) &&
      (apt.status === 'pending' || apt.status === 'confirmed')
    )

    if (hasDuplicate) {
      alert("This patient already has this appointment booked for this time. Please select a different time or service.")
      return
    }

    try {
      const appointmentData = {
        patient: selectedPatientId,
        clinic: newAppointment.clinic ? Number.parseInt(newAppointment.clinic) : null,
        date: newAppointment.date,
        time: newAppointment.time,
        dentist: newAppointment.dentist ? Number.parseInt(newAppointment.dentist) : null,
        service: newAppointment.service ? Number.parseInt(newAppointment.service) : null,
        notes: newAppointment.notes,
        status: "confirmed", // Owner/Staff create confirmed appointments
      }

      const createdAppointment = await api.createAppointment(appointmentData, token)
      setAppointments([createdAppointment, ...appointments])
      
      // Prepare success modal details
      const patient = patients.find(p => p.id === selectedPatientId)
      const service = services.find(s => s.id === Number.parseInt(newAppointment.service))
      const dentist = staff.find(s => s.id === Number.parseInt(newAppointment.dentist))
      const clinic = allClinics.find(c => c.id === Number.parseInt(newAppointment.clinic))
      
      setSuccessAppointmentDetails({
        patientName: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient',
        date: newAppointment.date,
        time: newAppointment.time,
        service: service?.name,
        dentist: dentist ? `Dr. ${dentist.first_name} ${dentist.last_name}` : undefined,
        clinic: clinic?.name
      })
      
      setShowAddModal(false)
      setShowSuccessModal(true)
      
      // Clear all form data including selected patient
      setSelectedPatientId(null)
      setPatientSearchQuery("")
      setNewAppointment({
        patient: "",
        clinic: "",
        date: "",
        time: "",
        dentist: "",
        service: "",
        notes: "",
      })
      setSelectedDate(undefined)
      setBookedSlots([])
      setAvailableDates(new Set())
    } catch (error: any) {
      console.error("Error creating appointment:", error)
      // Check if it's a double booking error from backend
      if (error.response?.data?.error === 'Time slot conflict') {
        alert(error.response.data.message || "This time slot is already booked. Please select a different time.")
      } else {
        alert("Failed to create appointment. Please try again.")
      }
    } finally {
      setIsBookingAppointment(false)
    }
  }

  const handleBlockTimeSlot = async (blockData: {
    date: string
    start_time: string
    end_time: string
    reason: string
  }) => {
    if (!token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/blocked-time-slots/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify(blockData),
      })

      if (response.ok) {
        const newBlockedSlot = await response.json()
        setBlockedTimeSlots([...blockedTimeSlots, newBlockedSlot])
        
        // Get dentist name
        const dentist = staff.find(s => s.id === newBlockedSlot.created_by)
        
        // Set block time success details
        setBlockTimeSuccessDetails({
          dentistName: dentist?.user_name || 'Dentist',
          date: newBlockedSlot.date,
          startTime: newBlockedSlot.start_time,
          endTime: newBlockedSlot.end_time,
          reason: newBlockedSlot.reason
        })
        
        setShowBlockTimeModal(false)
        setTimeout(() => {
          setShowBlockTimeSuccessModal(true)
        }, 100)
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Failed to block time slot. Please try again.")
      }
    } catch (error) {
      console.error("Error blocking time slot:", error)
      alert("Failed to block time slot. Please try again.")
    }
  }

  const handleUnblockTimeSlot = async (blockId: number) => {
    if (!token) return

    setConfirmModalConfig({
      title: "Unblock Time Slot",
      message: "Are you sure you want to unblock this time slot? Patients will be able to book appointments during this time.",
      variant: "warning",
      onConfirm: async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/blocked-time-slots/${blockId}/`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Token ${token}`,
            },
          })

          if (response.ok) {
            setBlockedTimeSlots(blockedTimeSlots.filter(slot => slot.id !== blockId))
            alert("Time slot unblocked successfully!")
          } else {
            const errorData = await response.json()
            alert(errorData.error || "Failed to unblock time slot. Please try again.")
          }
        } catch (error) {
          console.error("Error unblocking time slot:", error)
          alert("Failed to unblock time slot. Please try again.")
        } finally {
          setShowConfirmModal(false)
          setConfirmModalConfig(null)
        }
      }
    })
    setShowConfirmModal(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700"
      case "waiting":
        return "bg-purple-100 text-purple-700"
      case "pending":
        return "bg-yellow-100 text-yellow-700"
      case "cancelled":
        return "bg-red-100 text-red-700"
      case "completed":
        return "bg-blue-100 text-blue-700"
      case "missed":
        return "bg-yellow-100 text-yellow-800"
      case "reschedule_requested":
        return "bg-orange-100 text-orange-700"
      case "cancel_requested":
        return "bg-red-100 text-red-700"
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
      case "confirmed":
        return "Confirmed"
      case "waiting":
        return "Waiting"
      case "pending":
        return "Pending"
      case "cancelled":
        return "Cancelled"
      case "completed":
        return "Completed"
      case "missed":
        return "Missed"
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const handleApproveReschedule = async (appointment: Appointment) => {
    try {
      const updatedAppointment = await api.approveReschedule(appointment.id, token!)
      setAppointments(appointments.map(apt => apt.id === appointment.id ? updatedAppointment : apt))
      alert("Reschedule request approved successfully!")
    } catch (error) {
      console.error("Error approving reschedule:", error)
      alert("Failed to approve reschedule request.")
    }
  }

  const handleRejectReschedule = async (appointment: Appointment) => {
    if (!confirm("Are you sure you want to reject this reschedule request?")) {
      return
    }
    try {
      const updatedAppointment = await api.rejectReschedule(appointment.id, token!)
      setAppointments(appointments.map(apt => apt.id === appointment.id ? updatedAppointment : apt))
      alert("Reschedule request rejected.")
    } catch (error) {
      console.error("Error rejecting reschedule:", error)
      alert("Failed to reject reschedule request.")
    }
  }

  const handleApproveCancel = async (appointment: Appointment) => {
    if (!confirm("Are you sure you want to approve this cancellation?")) {
      return
    }
    try {
      const response = await api.approveCancel(appointment.id, token!)
      // Update the appointment status to cancelled
      setAppointments(appointments.map(apt => 
        apt.id === appointment.id ? { ...apt, status: "cancelled" as const } : apt
      ))
      alert("Cancellation approved. Appointment marked as cancelled.")
    } catch (error) {
      console.error("Error approving cancellation:", error)
      alert("Failed to approve cancellation.")
    }
  }

  const handleRejectCancel = async (appointment: Appointment) => {
    if (!confirm("Are you sure you want to reject this cancellation request?")) {
      return
    }
    try {
      const updatedAppointment = await api.rejectCancel(appointment.id, token!)
      setAppointments(appointments.map(apt => apt.id === appointment.id ? updatedAppointment : apt))
      alert("Cancellation request rejected. Appointment remains confirmed.")
    } catch (error) {
      console.error("Error rejecting cancellation:", error)
      alert("Failed to reject cancellation.")
    }
  }

  const handleMarkComplete = async (appointment: Appointment) => {
    if (!token) return
    
    setConfirmModalConfig({
      title: "Mark as Completed?",
      message: "Are you sure you want to mark this appointment as completed?",
      variant: "success",
      onConfirm: async () => {
        try {
          await api.updateAppointment(appointment.id, { status: "completed" }, token)
          setAppointments(appointments.map(apt => 
            apt.id === appointment.id ? { ...apt, status: "completed" as const } : apt
          ))
        } catch (error) {
          console.error("Error marking appointment as complete:", error)
          alert("Failed to mark appointment as complete.")
        }
      }
    })
    setShowConfirmModal(true)
  }

  const handleMarkMissed = async (appointment: Appointment) => {
    if (!token) return
    
    setConfirmModalConfig({
      title: "Mark as Missed?",
      message: "Are you sure you want to mark this appointment as missed?",
      variant: "warning",
      onConfirm: async () => {
        try {
          await api.markAppointmentMissed(appointment.id, token)
          setAppointments(appointments.map(apt => 
            apt.id === appointment.id ? { ...apt, status: "missed" as const } : apt
          ))
        } catch (error) {
          console.error("Error marking appointment as missed:", error)
          alert("Failed to mark appointment as missed.")
        }
      }
    })
    setShowConfirmModal(true)
  }

  const handleCancelAppointment = async (appointment: Appointment) => {
    if (!token) return
    
    setConfirmModalConfig({
      title: "Cancel Appointment?",
      message: "Are you sure you want to cancel this appointment?",
      variant: "danger",
      onConfirm: async () => {
        try {
          await api.updateAppointment(appointment.id, { status: "cancelled" }, token)
          setAppointments(appointments.map(apt => 
            apt.id === appointment.id ? { ...apt, status: "cancelled" as const } : apt
          ))
        } catch (error) {
          console.error("Error cancelling appointment:", error)
          alert("Failed to cancel appointment.")
        }
      }
    })
    setShowConfirmModal(true)
  }

  const handleApprove = async (appointmentId: number) => {
    if (!token) return
    
    setConfirmModalConfig({
      title: "Complete Appointment?",
      message: "Are you sure you want to complete this appointment?",
      variant: "success",
      onConfirm: async () => {
        try {
          await api.updateAppointment(appointmentId, { status: "completed" }, token)
          const completedAt = new Date().toISOString()
          setAppointments(appointments.map(apt => 
            apt.id === appointmentId ? { ...apt, status: "completed" as const, completed_at: completedAt } : apt
          ))
          setAllAppointments(allAppointments.map(apt => 
            apt.id === appointmentId ? { ...apt, status: "completed" as const, completed_at: completedAt } : apt
          ))
        } catch (error) {
          console.error("Error completing appointment:", error)
          alert("Failed to complete appointment.")
        }
      }
    })
    setShowConfirmModal(true)
  }

  const handleRowClick = (appointmentId: number) => {
    if (editingRow === appointmentId) return
    setExpandedRow(expandedRow === appointmentId ? null : appointmentId)
  }

  const handleEdit = (appointment: Appointment, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingRow(appointment.id)
    setEditedData({ ...appointment })
    setExpandedRow(appointment.id)
  }

  const handleSave = async (appointmentId: number) => {
    if (!token) return

    try {
      // Only send the editable fields to the API
      const updateData = {
        status: editedData.status,
        notes: editedData.notes,
        date: editedData.date,
        time: editedData.time,
      }

      await api.updateAppointment(appointmentId, updateData, token)
      
      // Update local state
      setAppointments(
        appointments.map((apt) =>
          apt.id === appointmentId ? { ...apt, ...editedData } as Appointment : apt
        )
      )
      setEditingRow(null)
      setEditedData({})
      alert("Appointment updated successfully!")
    } catch (error) {
      console.error("Error updating appointment:", error)
      alert("Failed to update appointment. Please try again.")
    }
  }

  const handleCancel = () => {
    setEditingRow(null)
    setEditedData({})
  }

  // Helper function to darken a hex color for better text readability
  const darkenColor = (hex: string, percent: number = 40): string => {
    // Remove the hash if present
    const color = hex.replace('#', '')
    
    // Parse RGB values
    const r = parseInt(color.substring(0, 2), 16)
    const g = parseInt(color.substring(2, 4), 16)
    const b = parseInt(color.substring(4, 6), 16)
    
    // Darken by reducing each component
    const darkenAmount = 1 - (percent / 100)
    const newR = Math.round(r * darkenAmount)
    const newG = Math.round(g * darkenAmount)
    const newB = Math.round(b * darkenAmount)
    
    // Convert back to hex
    const toHex = (n: number) => {
      const hex = n.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }
    
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`
  }

  const handleDelete = async (appointmentId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this appointment?")) return

    if (!token) return

    try {
      await api.deleteAppointment(appointmentId, token)
      setAppointments(appointments.filter((apt) => apt.id !== appointmentId))
      setExpandedRow(null)
      alert("Appointment deleted successfully!")
    } catch (error) {
      console.error("Error deleting appointment:", error)
      alert("Failed to delete appointment. Please try again.")
    }
  }

  const handleStatusChange = (appointmentId: number, newStatus: Appointment["status"]) => {
    setAppointments(
      appointments.map((apt) =>
        apt.id === appointmentId ? { ...apt, status: newStatus } : apt
      )
    )
  }

  const handleSort = (column: 'patient' | 'treatment' | 'date' | 'time' | 'dentist' | 'status') => {
    if (sortColumn === column) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new column and default to ascending
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getSortedAppointments = (appointmentsToSort: Appointment[]) => {
    // If no sort column is selected, default to sorting by updated_at (most recent first)
    if (!sortColumn) {
      return [...appointmentsToSort].sort((a, b) => {
        const aDate = new Date(a.updated_at || a.created_at).getTime()
        const bDate = new Date(b.updated_at || b.created_at).getTime()
        return bDate - aDate // Descending order (most recent first)
      })
    }

    return [...appointmentsToSort].sort((a, b) => {
      let aValue: string | number = ''
      let bValue: string | number = ''

      switch (sortColumn) {
        case 'patient':
          aValue = (a.patient_name || '').toLowerCase()
          bValue = (b.patient_name || '').toLowerCase()
          break
        case 'treatment':
          aValue = (a.service_name || '').toLowerCase()
          bValue = (b.service_name || '').toLowerCase()
          break
        case 'date':
          aValue = a.date || '0000-00-00'
          bValue = b.date || '0000-00-00'
          break
        case 'time':
          aValue = a.time || '00:00'
          bValue = b.time || '00:00'
          break
        case 'dentist':
          aValue = (a.dentist_name || '').toLowerCase()
          bValue = (b.dentist_name || '').toLowerCase()
          break
        case 'status':
          aValue = (a.status || '').toLowerCase()
          bValue = (b.status || '').toLowerCase()
          break
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  const filteredAppointments = getSortedAppointments(
    appointments.filter((apt) => {
      // Filter by search query
      const matchesSearch = apt.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.service_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.dentist_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.status?.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Filter by status
      const matchesStatus = statusFilter === "all" || apt.status === statusFilter
      
      // Filter by clinic
      const matchesClinic = selectedClinic === "all" || 
        (apt.clinic === selectedClinic?.id) ||
        (apt.clinic_data?.id === selectedClinic?.id)
      
      return matchesSearch && matchesStatus && matchesClinic
    })
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[var(--color-primary)] mb-2">Appointments</h1>
          <p className="text-[var(--color-text-muted)]">Manage patient appointments and schedules</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBlockTimeModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Ban className="w-5 h-5" />
            Block Time
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Appointment
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search by patient, treatment, or dentist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      </div>

      {/* Blocked Time Slots Section */}
      {blockedTimeSlots.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-red-200 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200">
            <h2 className="text-xl font-bold text-red-700 flex items-center gap-2">
              <Ban className="w-5 h-5" />
              Blocked Time Slots ({blockedTimeSlots.length})
            </h2>
            <p className="text-sm text-red-600 mt-1">
              Manage blocked time frames to prevent patient bookings
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-red-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Time Range</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Reason</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Blocked By</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {blockedTimeSlots.map((slot) => (
                  <tr key={slot.id} className="hover:bg-red-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-red-500" />
                        <span className="font-medium text-gray-900">
                          {new Date(slot.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <span className="font-medium text-gray-700">
                          {slot.start_time} - {slot.end_time}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700">
                        {slot.reason || 'No reason provided'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700">
                        {slot.created_by_name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleUnblockTimeSlot(slot.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-2">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === "all"
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            All Patients
          </button>
          <button
            onClick={() => setStatusFilter("waiting")}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === "waiting"
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Waiting
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === "pending"
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter("missed")}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === "missed"
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Missed
          </button>
          <button
            onClick={() => setStatusFilter("cancelled")}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === "cancelled"
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Cancelled
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === "completed"
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px]">
            <thead className="bg-[var(--color-background)] border-b border-[var(--color-border)]">
              <tr>
                <th 
                  onClick={() => handleSort('patient')}
                  className="px-3 py-3 text-left text-xs font-semibold text-[var(--color-text)] cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Patient
                    {sortColumn === 'patient' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('treatment')}
                  className="px-3 py-3 text-left text-xs font-semibold text-[var(--color-text)] cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Treatment
                    {sortColumn === 'treatment' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('date')}
                  className="px-3 py-3 text-left text-xs font-semibold text-[var(--color-text)] cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Date
                    {sortColumn === 'date' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--color-text)]">
                  Time
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--color-text)]">
                  Clinic
                </th>
                <th 
                  onClick={() => handleSort('dentist')}
                  className="px-3 py-3 text-left text-xs font-semibold text-[var(--color-text)] cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Dentist
                    {sortColumn === 'dentist' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('status')}
                  className="px-3 py-3 text-left text-xs font-semibold text-[var(--color-text)] cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortColumn === 'status' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--color-text)] min-w-[400px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredAppointments.map((apt) => (
                <Fragment key={apt.id}>
                  {/* Main Row - Clickable */}
                  <tr
                    onClick={() => handleRowClick(apt.id)}
                    className="hover:bg-[var(--color-background)] transition-all duration-200 cursor-pointer"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        {expandedRow === apt.id ? (
                          <ChevronUp className="w-3 h-3 text-[var(--color-primary)]" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)]" />
                        )}
                        <div>
                          <p className="font-medium text-sm text-[var(--color-text)]">{apt.patient_name || "Unknown"}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">{apt.patient_email || "N/A"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span 
                        className="inline-block px-2 py-0.5 rounded-lg font-medium text-xs whitespace-nowrap"
                        style={{ 
                          color: darkenColor(apt.service_color || '#10b981', 40),
                          backgroundColor: `${apt.service_color || '#10b981'}15`,
                          border: `1px solid ${apt.service_color || '#10b981'}40`
                        }}
                      >
                        {apt.service_name || "General Consultation"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--color-text-muted)]">{apt.date}</td>
                    <td className="px-3 py-3 text-xs text-[var(--color-text-muted)]">{formatTime(apt.time)}</td>
                    <td className="px-3 py-3">
                      {apt.clinic_data ? (
                        <ClinicBadge clinic={apt.clinic_data} size="sm" />
                      ) : (
                        <span className="text-[var(--color-text-muted)] text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--color-text-muted)]">{apt.dentist_name || "Not Assigned"}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                        {formatStatus(apt.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {/* Mark as Waiting Button - Only for appointments that aren't already waiting, pending, or done */}
                        {apt.status !== "waiting" && apt.status !== "pending" && apt.status !== "completed" && apt.status !== "missed" && apt.status !== "cancelled" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStatusChange(apt.id, "waiting")
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors font-medium text-xs"
                            title="Mark as Waiting"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Wait</span>
                          </button>
                        )}
                        {/* Mark as Ongoing Button - Only for appointments in waiting status */}
                        {apt.status === "waiting" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStatusChange(apt.id, "confirmed")
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded transition-colors font-medium text-xs"
                            title="Mark as Ongoing"
                          >
                            <Hourglass className="w-3 h-3" />
                            <span>Ongoing</span>
                          </button>
                        )}
                        {/* Complete Button - Only for confirmed appointments */}
                        {apt.status === "confirmed" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkComplete(apt)
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors font-medium text-xs"
                            title="Mark as Complete"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Done</span>
                          </button>
                        )}
                        {/* Mark as Missed Button - Only for confirmed appointments */}
                        {apt.status === "confirmed" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkMissed(apt)
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded transition-colors font-medium text-xs"
                            title="Mark as Missed"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Miss</span>
                          </button>
                        )}
                        {/* Cancel Button - Only for pending and confirmed appointments */}
                        {(apt.status === "pending" || apt.status === "confirmed") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancelAppointment(apt)
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors font-medium text-xs"
                            title="Cancel Appointment"
                          >
                            <X className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        )}
                        {/* Edit Button - Only for pending and confirmed appointments (for rescheduling) */}
                        {(apt.status === "pending" || apt.status === "confirmed") && (
                          <button
                            onClick={(e) => handleEdit(apt, e)}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors font-medium text-xs"
                            title="Reschedule"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(apt.id, e)}
                          className="flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors font-medium text-xs"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Del</span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row */}
                  {expandedRow === apt.id && (
                    <tr>
                      <td colSpan={8} className="bg-gradient-to-br from-gray-50 to-teal-50">
                        <div className="px-6 py-6 animate-in slide-in-from-top-2 duration-300">
                          {editingRow === apt.id ? (
                            // Edit Mode
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-[var(--color-primary)]">
                                  Edit Appointment
                                </h3>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSave(apt.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
                                  >
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-white transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                    Cancel
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1.5">Patient Name</label>
                                  <input
                                    type="text"
                                    value={apt.patient_name || ""}
                                    readOnly
                                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1.5">Dentist *</label>
                                  <select
                                    value={editedData.dentist !== undefined ? editedData.dentist || "" : apt.dentist || ""}
                                    onChange={(e) => setEditedData({ ...editedData, dentist: e.target.value ? Number(e.target.value) : null })}
                                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                  >
                                    <option value="">Select Dentist</option>
                                    {staff
                                      .filter((s) => s.user_type === "dentist" || s.role === "dentist")
                                      .map((dentist) => (
                                        <option key={dentist.id} value={dentist.id}>
                                          Dr. {dentist.first_name} {dentist.last_name}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1.5">Status *</label>
                                  <select
                                    value={editedData.status || apt.status}
                                    onChange={(e) => setEditedData({ ...editedData, status: e.target.value as Appointment["status"] })}
                                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                  </select>
                                  <p className="text-xs text-gray-500 mt-1">Use action buttons for Complete, Missed, or Cancelled status</p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1.5">Date *</label>
                                  <input
                                    type="date"
                                    value={editedData.date || apt.date}
                                    onChange={(e) => setEditedData({ ...editedData, date: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1.5">Time *</label>
                                  <input
                                    type="time"
                                    value={editedData.time || apt.time}
                                    onChange={(e) => setEditedData({ ...editedData, time: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium mb-1.5">Notes</label>
                                  <textarea
                                    value={editedData.notes !== undefined ? editedData.notes : apt.notes}
                                    onChange={(e) => setEditedData({ ...editedData, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-[var(--color-primary)]">
                                  Appointment Details
                                </h3>
                              </div>

                              {/* Reschedule Request Section */}
                              {apt.status === "reschedule_requested" && (
                                <div className="mb-6 bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
                                  <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-orange-800 flex items-center gap-2">
                                      <Clock className="w-5 h-5" />
                                      Reschedule Request Pending
                                    </h3>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleApproveReschedule(apt)}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                      >
                                        Approve Reschedule
                                      </button>
                                      <button
                                        onClick={() => handleRejectReschedule(apt)}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                                      >
                                        Reject Reschedule
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Current Appointment Details */}
                                    <div className="bg-white rounded-lg p-4 border border-orange-200">
                                      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4" />
                                        Current Appointment
                                      </h4>
                                      <div className="space-y-2 text-sm">
                                        <div>
                                          <span className="text-gray-500">Date:</span>
                                          <span className="ml-2 font-medium">{apt.date}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Time:</span>
                                          <span className="ml-2 font-medium">{apt.time}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Service:</span>
                                          <span className="ml-2 font-medium">{apt.service_name || "N/A"}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Dentist:</span>
                                          <span className="ml-2 font-medium">{apt.dentist_name || "N/A"}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Requested New Appointment Details */}
                                    <div className="bg-orange-100 rounded-lg p-4 border border-orange-300">
                                      <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Requested Changes
                                      </h4>
                                      <div className="space-y-2 text-sm">
                                        <div>
                                          <span className="text-orange-700">New Date:</span>
                                          <span className="ml-2 font-medium text-orange-900">{apt.reschedule_date || apt.date}</span>
                                        </div>
                                        <div>
                                          <span className="text-orange-700">New Time:</span>
                                          <span className="ml-2 font-medium text-orange-900">{apt.reschedule_time || apt.time}</span>
                                        </div>
                                        <div>
                                          <span className="text-orange-700">New Service:</span>
                                          <span className="ml-2 font-medium text-orange-900">{apt.reschedule_service_name || apt.service_name || "N/A"}</span>
                                        </div>
                                        <div>
                                          <span className="text-orange-700">New Dentist:</span>
                                          <span className="ml-2 font-medium text-orange-900">{apt.reschedule_dentist_name || apt.dentist_name || "N/A"}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {apt.reschedule_notes && (
                                    <div className="mt-4 bg-white rounded-lg p-4 border border-orange-200">
                                      <p className="text-sm text-gray-500 mb-1">Patient's Note:</p>
                                      <p className="text-sm text-gray-800">{apt.reschedule_notes}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Cancel Request Section */}
                              {apt.status === "cancel_requested" && (
                                <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-6">
                                  <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2">
                                      <X className="w-5 h-5" />
                                      Cancellation Request Pending
                                    </h3>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleApproveCancel(apt)}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                                      >
                                        Approve & Cancel
                                      </button>
                                      <button
                                        onClick={() => handleRejectCancel(apt)}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                                      >
                                        Reject Cancellation
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-white rounded-lg p-4 border border-red-200">
                                    <h4 className="font-semibold text-gray-700 mb-3">Cancellation Reason</h4>
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{apt.cancel_reason || "No reason provided"}</p>
                                  </div>

                                  <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                                    <p className="text-sm text-amber-800">
                                      <strong>Note:</strong> Approving this cancellation will mark the appointment as cancelled. It will appear in the Cancelled section.
                                    </p>
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Appointment Details Card */}
                                <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
                                  <h4 className="font-semibold text-[var(--color-primary)] mb-4 flex items-center gap-2">
                                    <CalendarIcon className="w-5 h-5" />
                                    Appointment Details
                                  </h4>
                                  <div className="space-y-3 text-sm">
                                    <div>
                                      <p className="text-[var(--color-text-muted)] mb-0.5">Patient</p>
                                      <p className="font-medium text-lg">{apt.patient_name}</p>
                                      <p className="text-xs text-[var(--color-text-muted)]">{apt.patient_email}</p>
                                    </div>
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
                                    {apt.status === "completed" && (
                                      <div className="pt-3 border-t border-[var(--color-border)]">
                                        <button
                                          onClick={() => {
                                            // Placeholder - functionality to be implemented
                                            alert("Invoice creation feature coming soon!")
                                          }}
                                          className="w-full px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium flex items-center justify-center gap-2"
                                        >
                                          <FileText className="w-4 h-4" />
                                          Create Invoice
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[var(--color-primary)]">Book Appointment</h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewAppointment({ patient: "", clinic: "", date: "", time: "", dentist: "", service: "", notes: "" })
                  setSelectedPatientId(null)
                  setSelectedDate(undefined)
                  setAvailableDates(new Set())
                  setPatientSearchQuery("")
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

              {/* Step 1: Clinic Selection - MUST BE FIRST */}
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <h3 className="text-lg font-semibold text-teal-900">Select Clinic Location</h3>
                </div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Choose Clinic <span className="text-red-500">*</span>
                </label>
                <select
                  value={newAppointment.clinic}
                  onChange={(e) => {
                    setNewAppointment({ 
                      ...newAppointment, 
                      clinic: e.target.value,
                      dentist: "",
                      service: "",
                      date: "",
                      time: ""
                    })
                    setSelectedDate(undefined)
                  }}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                  required
                >
                  <option value="">Select clinic location first...</option>
                  {allClinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name} - {clinic.address}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-teal-700 mt-2">
                  📍 Choose the clinic location where you want the appointment
                </p>
              </div>

              {/* Two-column grid for better layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Patient Search/Select */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                      Patient <span className="text-red-500">*</span>
                    </label>
                    <div className="relative" ref={patientDropdownRef}>
                      <input
                        type="text"
                        placeholder="Search patient by name or email..."
                        value={patientSearchQuery}
                        onChange={(e) => {
                          setPatientSearchQuery(e.target.value)
                          setShowPatientDropdown(true)
                        }}
                        onFocus={() => setShowPatientDropdown(true)}
                        className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                      {showPatientDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {patients
                            .filter((patient) => {
                              if (!patientSearchQuery) return true
                              const query = patientSearchQuery.toLowerCase()
                              return (
                                patient.first_name.toLowerCase().includes(query) ||
                                patient.last_name.toLowerCase().includes(query) ||
                                patient.email.toLowerCase().includes(query)
                              )
                            })
                            .sort((a, b) => {
                              // Get most recent completed appointment for each patient (across all clinics)
                              const getLastCompletedDate = (patientId: number) => {
                                const completedApts = allAppointments
                                  .filter(apt => apt.patient === patientId && apt.status === 'completed' && apt.completed_at)
                                  .sort((apt1, apt2) => {
                                    const date1 = new Date(apt1.completed_at!).getTime()
                                    const date2 = new Date(apt2.completed_at!).getTime()
                                    return date2 - date1 // Most recent first
                                  })
                                return completedApts.length > 0 ? new Date(completedApts[0].completed_at!) : null
                              }

                              const aLastCompleted = getLastCompletedDate(a.id)
                              const bLastCompleted = getLastCompletedDate(b.id)

                              // Patients with recent completed appointments come first
                              // Sort by most recent completion date (descending)
                              if (aLastCompleted && bLastCompleted) {
                                return bLastCompleted.getTime() - aLastCompleted.getTime()
                              }
                              // Patients with completed appointments come before those without
                              if (aLastCompleted && !bLastCompleted) return -1
                              if (!aLastCompleted && bLastCompleted) return 1

                              // If neither has completed appointments, sort alphabetically by name
                              return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
                            })
                            .map((patient) => (
                              <div
                                key={patient.id}
                                onClick={() => {
                                  setSelectedPatientId(patient.id)
                                  setPatientSearchQuery(`${patient.first_name} ${patient.last_name} - ${patient.email}`)
                                  setShowPatientDropdown(false)
                                }}
                                className={`px-4 py-2.5 cursor-pointer hover:bg-gray-100 ${
                                  selectedPatientId === patient.id ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="font-medium">{patient.first_name} {patient.last_name}</div>
                                <div className="text-sm text-gray-500">{patient.email}</div>
                              </div>
                            ))}
                          {patients.filter((patient) => {
                            if (!patientSearchQuery) return true
                            const query = patientSearchQuery.toLowerCase()
                            return (
                              patient.first_name.toLowerCase().includes(query) ||
                              patient.last_name.toLowerCase().includes(query) ||
                              patient.email.toLowerCase().includes(query)
                            )
                          }).length === 0 && (
                            <div className="px-4 py-2.5 text-gray-500 text-center">
                              No patients found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {patients.length === 0 && (
                      <p className="text-sm text-amber-600 mt-1">No patients registered yet.</p>
                    )}
                    <input
                      type="hidden"
                      value={selectedPatientId || ""}
                      required
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
                      className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-100 disabled:cursor-not-allowed"
                      required
                      disabled={!newAppointment.clinic}
                    >
                      <option value="">{newAppointment.clinic ? "Select a dentist..." : "Select clinic first"}</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {formatDentistName(s)}
                        </option>
                      ))}
                    </select>
                    {!newAppointment.clinic && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ Select a clinic first to see available dentists
                      </p>
                    )}
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
                      className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-100 disabled:cursor-not-allowed"
                      required
                      disabled={!newAppointment.clinic}
                    >
                      <option value="">{newAppointment.clinic ? "Select a treatment..." : "Select clinic first"}</option>
                      {services
                        .filter((service) => {
                          // Filter services by selected clinic if clinic_ids are available
                          if (!newAppointment.clinic || !service.clinics_data) return true
                          return service.clinics_data.some((c: any) => c.id === parseInt(newAppointment.clinic))
                        })
                        .map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                    </select>
                    {!newAppointment.clinic && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ Select a clinic first to see available services
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                      Additional Notes
                    </label>
                    <textarea
                      value={newAppointment.notes}
                      onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                      rows={6}
                      placeholder="Any special requests or information..."
                      className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
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
                            // Disable past dates (but allow today)
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            const checkDate = new Date(date)
                            checkDate.setHours(0, 0, 0, 0)
                            if (checkDate < today) return true
                            
                            // Disable dates beyond 90 days
                            const maxDate = new Date(today)
                            maxDate.setDate(today.getDate() + 90)
                            if (checkDate > maxDate) return true
                            
                            // Disable dates when dentist is not available (use local date formatting)
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
                            ⚠️ This dentist has no available schedule set. Please contact admin.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Time selection - only show if date AND service are selected */}
                  {selectedDate && newAppointment.service && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                        Preferred Time <span className="text-red-500">*</span>
                      </label>
                      <p className="text-xs text-gray-600 mb-2">
                        {(() => {
                          const selectedService = services.find(s => s.id === Number(newAppointment.service))
                          const duration = selectedService?.duration || 30
                          return `Select a ${duration}-minute time slot (10:00 AM - 8:00 PM). Grayed out times conflict with existing appointments.`
                        })()}
                      </p>
                      <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto p-2 border border-[var(--color-border)] rounded-lg">
                        {(() => {
                          const selectedService = services.find(s => s.id === Number(newAppointment.service))
                          const duration = selectedService?.duration || 30
                          return generateTimeSlots(duration, newAppointment.date).map((slot) => {
                            const isBooked = isTimeSlotBooked(newAppointment.date, slot.value, duration)
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
                          })
                        })()}
                      </div>
                      {!newAppointment.time && (
                        <p className="text-xs text-red-600 mt-1">* Please select a time slot</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewAppointment({ patient: "", clinic: "", date: "", time: "", dentist: "", service: "", notes: "" })
                    setSelectedPatientId(null)
                    setSelectedDate(undefined)
                    setAvailableDates(new Set())
                    setPatientSearchQuery("")
                  }}
                  className="flex-1 px-6 py-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedPatientId || !newAppointment.date || !newAppointment.time || !newAppointment.dentist || isBookingAppointment}
                  className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isBookingAppointment ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Booking...
                    </>
                  ) : (
                    'Book Appointment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalConfig && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false)
            setConfirmModalConfig(null)
          }}
          onConfirm={confirmModalConfig.onConfirm}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          variant={confirmModalConfig.variant}
        />
      )}

      {/* Block Time Modal */}
      <BlockTimeModal
        isOpen={showBlockTimeModal}
        onClose={() => setShowBlockTimeModal(false)}
        onBlock={handleBlockTimeSlot}
      />

      {/* Success Modal */}
      {successAppointmentDetails && (
        <AppointmentSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          appointmentDetails={successAppointmentDetails}
          isConfirmed={true}
        />
      )}

      {/* Block Time Success Modal */}
      {blockTimeSuccessDetails && (
        <BlockTimeSuccessModal
          isOpen={showBlockTimeSuccessModal}
          onClose={() => setShowBlockTimeSuccessModal(false)}
          blockDetails={blockTimeSuccessDetails}
        />
      )}
    </div>
  )
}
