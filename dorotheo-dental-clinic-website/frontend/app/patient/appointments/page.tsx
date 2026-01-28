"use client"

import { useState, useEffect } from "react"
import { Calendar as CalendarIcon, Clock, User, Plus, X, Edit, XCircle, ChevronDown, ChevronUp, FileText, Camera, Download } from "lucide-react"
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
  service_color: string | null
  date: string
  time: string
  status: "confirmed" | "pending" | "waiting" | "cancelled" | "completed" | "missed" | "reschedule_requested" | "cancel_requested"
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

interface Document {
  id: number
  title: string
  document_type: string
  file_url: string
  uploaded_at: string
}

interface TeethImage {
  id: number
  image_url: string
  uploaded_at: string
  notes: string
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
  duration: number
  color: string
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
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<number | null>(null)
  const [appointmentDocuments, setAppointmentDocuments] = useState<Record<number, Document[]>>({})
  const [appointmentImages, setAppointmentImages] = useState<Record<number, TeethImage[]>>({})
  const [loadingFiles, setLoadingFiles] = useState<Record<number, boolean>>({})
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
  const [bookedSlots, setBookedSlots] = useState<Array<{date: string, time: string, dentist_id: number, service_id?: number}>>([])
  const [rescheduleBookedSlots, setRescheduleBookedSlots] = useState<Array<{date: string, time: string, dentist_id: number, service_id?: number}>>([])
  const [blockedTimeSlots, setBlockedTimeSlots] = useState<Array<{
    id: number
    date: string
    start_time: string
    end_time: string
    reason: string
  }>>([])

  // Generate time slots based on dentist's availability and service duration
  const generateTimeSlots = (durationMinutes: number = 30) => {
    console.log('[TIMESLOTS] Generating time slots with duration:', durationMinutes)
    console.log('[TIMESLOTS] newAppointment.date:', newAppointment.date)
    
    if (!newAppointment.date || !dentistAvailability || dentistAvailability.length === 0) {
      console.log('[TIMESLOTS] Missing required data - returning empty array')
      return []
    }

    // Find the availability for the selected date
    const dateAvailability = dentistAvailability.find((item: any) => item.date === newAppointment.date)
    
    console.log('[TIMESLOTS] Found availability for date:', dateAvailability)
    
    if (!dateAvailability) {
      console.log('[TIMESLOTS] No availability found for date:', newAppointment.date)
      return []
    }

    // Generate slots based on start_time and end_time with custom duration intervals
    const slots: { value: string; display: string }[] = []
    const [startHour, startMinute] = dateAvailability.start_time.split(':').map(Number)
    const [endHour, endMinute] = dateAvailability.end_time.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute

    // Check if selected date is today
    const today = new Date()
    const isToday = newAppointment.date === today.toISOString().split('T')[0]
    const currentMinutes = isToday ? today.getHours() * 60 + today.getMinutes() : -1

    // Generate slots with the specified duration interval
    for (let totalMinutes = startMinutes; totalMinutes < endMinutes; totalMinutes += durationMinutes) {
      const hour = Math.floor(totalMinutes / 60)
      const minute = totalMinutes % 60
      
      // Skip lunch break (11:30 AM - 12:30 PM)
      if ((hour === 11 && minute === 30) || (hour === 12 && minute === 0)) {
        continue
      }

      // Skip time slots that have already passed today
      if (isToday && totalMinutes <= currentMinutes) {
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

  // Check if a time slot overlaps with any existing appointments OR blocked time slots
  const isTimeSlotBooked = (date: string, time: string, durationMinutes: number = 30) => {
    // Parse the proposed start time
    const [startHour, startMinute] = time.split(':').map(Number)
    const proposedStart = startHour * 60 + startMinute
    const proposedEnd = proposedStart + durationMinutes
    
    // Check for overlap with existing appointments
    const isBooked = bookedSlots.some(slot => {
      // Only check appointments on the same date
      if (slot.date !== date) return false
      
      // Get the booked appointment's time range
      const [bookedHour, bookedMinute] = slot.time.substring(0, 5).split(':').map(Number)
      const bookedStart = bookedHour * 60 + bookedMinute
      
      // Get duration of the booked appointment
      let bookedDuration = 30
      if (slot.service_id) {
        const bookedService = services.find(s => s.id === slot.service_id)
        if (bookedService && bookedService.duration) {
          bookedDuration = bookedService.duration
        }
      }
      const bookedEnd = bookedStart + bookedDuration
      
      // Check for overlap
      const overlaps = (proposedStart < bookedEnd) && (proposedEnd > bookedStart)
      
      if (overlaps) {
        console.log(`[PATIENT] Time slot ${time} (${proposedStart}-${proposedEnd}) overlaps with booked slot ${slot.time} (${bookedStart}-${bookedEnd})`)
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
        console.log(`[PATIENT] Time slot ${time} (${proposedStart}-${proposedEnd}) is blocked (${blockStart}-${blockEnd})`)
      }
      
      return overlaps
    })
    
    return isBooked || isBlocked
  }

  // Generate time slots for reschedule modal based on dentist's availability for selected date
  const generateRescheduleTimeSlots = () => {
    if (!rescheduleData.date || !rescheduleDentistAvailability || rescheduleDentistAvailability.length === 0) {
      return []
    }

    // Find the availability for the selected date
    const dateAvailability = rescheduleDentistAvailability.find((item: any) => item.date === rescheduleData.date)
    
    if (!dateAvailability) {
      return [] // No availability for this date
    }

    // Generate slots based on start_time and end_time with 30-minute intervals
    const slots: { value: string; display: string }[] = []
    const startHour = parseInt(dateAvailability.start_time.split(':')[0])
    const startMinute = parseInt(dateAvailability.start_time.split(':')[1])
    const endHour = parseInt(dateAvailability.end_time.split(':')[0])
    const endMinute = parseInt(dateAvailability.end_time.split(':')[1])

    let currentHour = startHour
    let currentMinute = startMinute

    // Add first time slot
    // Check if selected date is today
    const today = new Date()
    const isToday = rescheduleData.date === today.toISOString().split('T')[0]
    const currentMinutes = isToday ? today.getHours() * 60 + today.getMinutes() : -1

    const firstTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
    const firstHour12 = currentHour > 12 ? currentHour - 12 : currentHour === 0 ? 12 : currentHour
    const firstAmpm = currentHour >= 12 ? 'PM' : 'AM'
    const firstDisplayStr = `${firstHour12}:${currentMinute.toString().padStart(2, '0')} ${firstAmpm}`
    
    const firstTotalMinutes = currentHour * 60 + currentMinute
    if (!isToday || firstTotalMinutes > currentMinutes) {
      slots.push({ value: firstTimeStr, display: firstDisplayStr })
    }

    // Generate 30-minute interval slots, skipping 11:30 AM - 12:30 PM (lunch)
    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      // Increment by 30 minutes
      currentMinute += 30
      if (currentMinute >= 60) {
        currentMinute = 0
        currentHour += 1
      }

      // Skip 11:30 AM - 12:30 PM (lunch break)
      if ((currentHour === 11 && currentMinute === 30) || (currentHour === 12 && currentMinute === 0)) {
        continue
      }

      // Don't go beyond end time
      if (currentHour > endHour || (currentHour === endHour && currentMinute > endMinute)) {
        break
      }

      // Skip time slots that have already passed today
      const totalMinutes = currentHour * 60 + currentMinute
      if (isToday && totalMinutes <= currentMinutes) {
        continue
      }

      const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
      const hour12 = currentHour > 12 ? currentHour - 12 : currentHour === 0 ? 12 : currentHour
      const ampm = currentHour >= 12 ? 'PM' : 'AM'
      const displayStr = `${hour12}:${currentMinute.toString().padStart(2, '0')} ${ampm}`
      slots.push({ value: timeStr, display: displayStr })
    }

    // Add end time if not already included
    const lastSlot = slots[slots.length - 1]
    const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
    if (lastSlot && lastSlot.value !== endTimeStr) {
      const endHour12 = endHour > 12 ? endHour - 12 : endHour === 0 ? 12 : endHour
      const endAmpm = endHour >= 12 ? 'PM' : 'AM'
      const endDisplayStr = `${endHour12}:${endMinute.toString().padStart(2, '0')} ${endAmpm}`
      slots.push({ value: endTimeStr, display: endDisplayStr })
    }

    return slots
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
        
        // Fetch services - filter to only show Cleaning and Consultation for patients
        const servicesData = await api.getServices()
        const patientAllowedServices = servicesData.filter(
          (service: Service) => service.name === 'Cleaning' || service.name === 'Consultation'
        )
        setServices(patientAllowedServices)

        // Fetch blocked time slots
        const blockedResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/blocked-time-slots/`, {
          headers: {
            'Authorization': `Token ${token}`,
          },
        })
        if (blockedResponse.ok) {
          const blockedData = await blockedResponse.json()
          setBlockedTimeSlots(blockedData)
          console.log("Fetched blocked time slots:", blockedData)
        }
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
        // Get date-specific availability for the next 90 days
        const today = new Date()
        const endDate = new Date(today)
        endDate.setDate(today.getDate() + 90)
        
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
        
        const availability = await api.getDentistAvailability(
          Number(newAppointment.dentist),
          todayStr,
          endDateStr,
          token
        )
        
        console.log('[BOOKING] Dentist availability received:', availability)
        setDentistAvailability(availability)
        
        // Extract available dates from the date-specific availability
        const dates = new Set<string>()
        availability.forEach((item: any) => {
          if (item.is_available) {
            dates.add(item.date)
            console.log('[BOOKING] Adding available date:', item.date)
          }
        })
        
        console.log('[BOOKING] Total available dates:', Array.from(dates))
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
      if (!token || !rescheduleData.dentist || !showRescheduleModal) {
        setRescheduleDentistAvailability([])
        setRescheduleAvailableDates(new Set())
        return
      }

      console.log('[RESCHEDULE] Fetching availability for dentist:', rescheduleData.dentist)

      try {
        // Get date-specific availability for the next 90 days
        const today = new Date()
        const endDate = new Date(today)
        endDate.setDate(today.getDate() + 90)
        
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
        
        const availability = await api.getDentistAvailability(
          Number(rescheduleData.dentist),
          todayStr,
          endDateStr,
          token
        )
        
        console.log('[RESCHEDULE] Availability received:', availability)
        setRescheduleDentistAvailability(availability)
        
        // Extract available dates from the date-specific availability
        const dates = new Set<string>()
        availability.forEach((item: any) => {
          if (item.is_available) {
            dates.add(item.date)
          }
        })
        
        setRescheduleAvailableDates(dates)
        console.log('[RESCHEDULE] Available dates:', Array.from(dates))
      } catch (error) {
        console.error("Error fetching dentist availability for reschedule:", error)
      }
    }

    fetchRescheduleDentistAvailability()
  }, [rescheduleData.dentist, showRescheduleModal, token])

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

  // Fetch booked slots for reschedule date
  useEffect(() => {
    const fetchRescheduleBookedSlots = async () => {
      if (!token) return

      try {
        const date = rescheduleData.date || undefined
        console.log('[PATIENT RESCHEDULE] Fetching booked slots for date:', date)
        const slots = await api.getBookedSlots(undefined, date, token)
        console.log('[PATIENT RESCHEDULE] Booked slots received:', slots)
        setRescheduleBookedSlots(slots)
      } catch (error) {
        console.error("Error fetching reschedule booked slots:", error)
      }
    }

    if (rescheduleData.date) {
      fetchRescheduleBookedSlots()
    }
  }, [rescheduleData.date, token])

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token || !user) {
      alert("Please log in to create an appointment")
      return
    }

    // Get the selected service duration
    const selectedService = services.find(s => s.id === Number(newAppointment.service))
    const duration = selectedService?.duration || 30

    // Check for time slot conflicts using the booked slots data with overlap detection
    const hasConflict = isTimeSlotBooked(newAppointment.date, newAppointment.time, duration)

    if (hasConflict) {
      alert("This time slot conflicts with an existing appointment. Please select a different time.")
      return
    }

    // Check if patient already has an appointment with same service on same day at same time
    const hasDuplicate = allAppointments.some(apt => 
      apt.patient === user.id &&
      apt.date === newAppointment.date &&
      apt.time === newAppointment.time &&
      apt.service === Number(newAppointment.service) &&
      (apt.status === 'pending' || apt.status === 'confirmed')
    )

    if (hasDuplicate) {
      alert("You already have this appointment booked for this time. Please select a different time or service.")
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

      console.log("[APPOINTMENT] Creating appointment with data:", appointmentData)
      console.log("[APPOINTMENT] Token:", token ? "Present" : "Missing")
      console.log("[APPOINTMENT] User:", user)
      
      const createdAppointment = await api.createAppointment(appointmentData, token)
      console.log("[APPOINTMENT] Appointment created successfully:", createdAppointment)
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
      console.error("[APPOINTMENT] Error creating appointment:", error)
      console.error("[APPOINTMENT] Error details:", {
        message: error.message,
        response: error.response,
        stack: error.stack
      })
      
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
    const dentistId = appointment.dentist?.toString() || ""
    setRescheduleData({
      date: appointment.date,
      time: appointment.time,
      dentist: dentistId,
      service: appointment.service?.toString() || "",
      notes: appointment.notes || "",
    })
    setRescheduleSelectedDate(undefined)
    setShowRescheduleModal(true)
  }

  const handleSubmitReschedule = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token || !selectedAppointment) return

    // Validation
    if (!rescheduleData.date) {
      alert("Please select a date")
      return
    }
    if (!rescheduleData.time) {
      alert("Please select a time")
      return
    }

    try {
      const rescheduleRequestData: any = {
        date: rescheduleData.date,
        time: rescheduleData.time,
        notes: rescheduleData.notes || "",
      }

      // Only include dentist if changed (though we keep it the same)
      if (rescheduleData.dentist) {
        rescheduleRequestData.dentist = parseInt(rescheduleData.dentist)
      }

      // Only include service if changed
      if (rescheduleData.service) {
        rescheduleRequestData.service = parseInt(rescheduleData.service)
      }

      console.log('[RESCHEDULE] Submitting data:', rescheduleRequestData)

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
      setRescheduleSelectedDate(undefined)
      setRescheduleBookedSlots([])
      alert("Reschedule request submitted! Staff will review it soon.")
    } catch (error: any) {
      console.error("Error requesting reschedule:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      
      // Better error message extraction
      let errorMsg = "Failed to submit reschedule request. Please try again."
      
      if (error?.response?.data) {
        const errorData = error.response.data
        if (typeof errorData === 'string') {
          errorMsg = errorData
        } else if (errorData.error) {
          errorMsg = errorData.error
        } else if (errorData.message) {
          errorMsg = errorData.message
        } else {
          errorMsg = JSON.stringify(errorData, null, 2)
        }
      } else if (error?.message) {
        errorMsg = error.message
      }
      
      alert(`Failed to submit reschedule request:\n${errorMsg}`)
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

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'N/A'
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  // Function to toggle appointment expansion and load files
  const toggleAppointmentExpansion = async (appointmentId: number) => {
    if (expandedAppointmentId === appointmentId) {
      setExpandedAppointmentId(null)
      return
    }

    setExpandedAppointmentId(appointmentId)
    setLoadingFiles({ ...loadingFiles, [appointmentId]: true })

    try {
      if (!user?.id || !token) return

      // Always fetch fresh data when expanding
      const allDocs = await api.getDocuments(user.id, token)
      console.log('[APPOINTMENT FILES] All documents:', allDocs)
      console.log('[APPOINTMENT FILES] Looking for appointment ID:', appointmentId)
      
      const aptDocs = allDocs.filter((doc: any) => {
        console.log('[APPOINTMENT FILES] Document appointment:', doc.appointment, 'Target:', appointmentId)
        return doc.appointment === appointmentId
      })
      console.log('[APPOINTMENT FILES] Filtered documents for appointment:', aptDocs)
      
      // Fetch images for this appointment
      const allImages = await api.getPatientTeethImages(user.id, token)
      console.log('[APPOINTMENT FILES] All images:', allImages)
      
      const aptImages = allImages.filter((img: any) => {
        console.log('[APPOINTMENT FILES] Image appointment:', img.appointment, 'Target:', appointmentId)
        return img.appointment === appointmentId
      })
      console.log('[APPOINTMENT FILES] Filtered images for appointment:', aptImages)

      setAppointmentDocuments({ ...appointmentDocuments, [appointmentId]: aptDocs })
      setAppointmentImages({ ...appointmentImages, [appointmentId]: aptImages })
    } catch (error) {
      console.error("Error loading appointment files:", error)
    } finally {
      setLoadingFiles({ ...loadingFiles, [appointmentId]: false })
    }
  }

  const handleDownloadFile = (fileUrl: string, filename: string) => {
    fetch(fileUrl)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      })
      .catch(error => {
        console.error('Download failed:', error)
        const link = document.createElement('a')
        link.href = fileUrl
        link.download = filename
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      })
  }

  // Separate appointments into upcoming and past
  const now = new Date()
  console.log("Current time:", now)
  console.log("All appointments for filtering:", allAppointments)
  
  // Upcoming: Only PENDING and CONFIRMED appointments in the future
  const upcomingAppointments = allAppointments.filter((apt) => {
    const aptDate = new Date(apt.date + 'T' + apt.time)
    const isUpcomingStatus = apt.status === 'pending' || apt.status === 'confirmed'
    return aptDate >= now && isUpcomingStatus
  })

  // Past: Completed, Missed, Cancelled, or appointments that have passed
  const pastAppointments = allAppointments.filter((apt) => {
    const aptDate = new Date(apt.date + 'T' + apt.time)
    const isPastStatus = apt.status === 'completed' || apt.status === 'cancelled' || apt.status === 'missed'
    const isPast = aptDate < now || isPastStatus
    console.log(`Appointment ${apt.id} - Date: ${apt.date} ${apt.time}, Status: ${apt.status}, isPast: ${isPast}`)
    return isPast
  })
  
  console.log("Upcoming appointments:", upcomingAppointments)
  console.log("Past appointments:", pastAppointments)

  const appointments = activeTab === "upcoming" ? upcomingAppointments : pastAppointments

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700"
      case "waiting":
        return "bg-purple-100 text-purple-700"
      case "completed":
        return "bg-green-100 text-green-700"
      case "missed":
        return "bg-yellow-100 text-yellow-700"
      case "pending":
        return "bg-yellow-100 text-yellow-700"
      case "reschedule_requested":
        return "bg-orange-100 text-orange-700"
      case "cancel_requested":
        return "bg-red-100 text-red-700"
      case "cancelled":
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
      case "waiting":
        return "Waiting"
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
            <div key={appointment.id} className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
              {/* Main appointment card - clickable */}
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleAppointmentExpansion(appointment.id)}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold">
                        <span 
                          className="px-3 py-1 rounded-lg"
                          style={{ 
                            backgroundColor: appointment.service_color || '#10b981',
                            color: '#ffffff'
                          }}
                        >
                          {appointment.service_name || "General Consultation"}
                        </span>
                      </h3>
                      {/* Only show status badge for non-confirmed appointments */}
                      {appointment.status !== "confirmed" && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {formatStatus(appointment.status)}
                        </span>
                      )}
                      <button className="ml-auto text-gray-500">
                        {expandedAppointmentId === appointment.id ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                      <CalendarIcon className="w-4 h-4" />
                      <span className="text-sm">{appointment.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{formatTime(appointment.time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                      <User className="w-4 h-4" />
                      <span className="text-sm">{appointment.dentist_name || "To be assigned"}</span>
                    </div>
                  </div>

                  {appointment.status === "reschedule_requested" && appointment.reschedule_date && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm font-semibold text-orange-800 mb-2">📅 Requested Reschedule:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-orange-600 font-medium">New Date:</span>
                          <p className="text-orange-800">{appointment.reschedule_date}</p>
                        </div>
                        <div>
                          <span className="text-orange-600 font-medium">New Time:</span>
                          <p className="text-orange-800">{formatTime(appointment.reschedule_time || '')}</p>
                        </div>
                      </div>
                      {appointment.reschedule_notes && (
                        <div className="mt-3">
                          <span className="text-orange-600 font-medium text-sm">Notes:</span>
                          <p className="text-orange-800 text-sm">{appointment.reschedule_notes}</p>
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
                
                {/* Action buttons for confirmed and missed appointments - prevent click propagation */}
                {appointment.status === "confirmed" && activeTab === "upcoming" && (
                  <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
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
                  <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
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
              </div>
              </div>

              {/* Expanded section with documents and images */}
              {expandedAppointmentId === appointment.id && (
                <div className="px-6 pb-6 border-t border-[var(--color-border)] bg-gray-50">
                  <div className="pt-4 space-y-4">
                    <h4 className="font-semibold text-[var(--color-text)] mb-3">Appointment Records</h4>
                    
                    {loadingFiles[appointment.id] ? (
                      <p className="text-sm text-[var(--color-text-muted)]">Loading files...</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Documents */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-[var(--color-primary)]" />
                            <h5 className="font-medium text-sm">Documents</h5>
                          </div>
                          {appointmentDocuments[appointment.id]?.length > 0 ? (
                            <div className="space-y-2">
                              {appointmentDocuments[appointment.id].map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-[var(--color-border)]">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-[var(--color-text)]">{doc.title}</p>
                                    <p className="text-xs text-[var(--color-text-muted)]">
                                      {new Date(doc.uploaded_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleDownloadFile(doc.file_url, doc.title)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                  >
                                    <Download className="w-4 h-4 text-[var(--color-primary)]" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-[var(--color-text-muted)] italic">No documents uploaded</p>
                          )}
                        </div>

                        {/* Images */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Camera className="w-4 h-4 text-[var(--color-primary)]" />
                            <h5 className="font-medium text-sm">Images</h5>
                          </div>
                          {appointmentImages[appointment.id]?.length > 0 ? (
                            <div className="space-y-2">
                              {appointmentImages[appointment.id].map((img) => (
                                <div key={img.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-[var(--color-border)]">
                                  <div className="flex items-center gap-3 flex-1">
                                    <img 
                                      src={img.image_url} 
                                      alt="Dental" 
                                      className="w-12 h-12 object-cover rounded"
                                    />
                                    <div>
                                      <p className="text-sm font-medium text-[var(--color-text)]">Dental Image</p>
                                      <p className="text-xs text-[var(--color-text-muted)]">
                                        {new Date(img.uploaded_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDownloadFile(img.image_url, `dental-image-${img.id}.jpg`)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                  >
                                    <Download className="w-4 h-4 text-[var(--color-primary)]" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-[var(--color-text-muted)] italic">No images uploaded</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
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
                  setNewAppointment({ date: "", time: "", dentist: "", service: "", notes: "" })
                  setSelectedDate(undefined)
                  setAvailableDates(new Set())
                }}
                className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAppointment} className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Your appointment will be booked immediately and staff/owner will be notified.
                </p>
              </div>

              {/* Two-column grid for better layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
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
                      rows={6}
                      placeholder="Any special requests or information our staff should know..."
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
                        
                        // Disable dates when dentist is not available (use local date, not UTC)
                        const year = date.getFullYear()
                        const month = String(date.getMonth() + 1).padStart(2, '0')
                        const day = String(date.getDate()).padStart(2, '0')
                        const dateStr = `${year}-${month}-${day}`
                        const isAvailable = availableDates.has(dateStr)
                        console.log('[CALENDAR] Checking date:', dateStr, 'Available?', isAvailable, 'Available dates:', Array.from(availableDates))
                        return !isAvailable
                      }}
                      modifiers={{
                        available: (date) => {
                          const year = date.getFullYear()
                          const month = String(date.getMonth() + 1).padStart(2, '0')
                          const day = String(date.getDate()).padStart(2, '0')
                          const dateStr = `${year}-${month}-${day}`
                          const isAvailable = availableDates.has(dateStr)
                          console.log('[CALENDAR MODIFIER] Date:', dateStr, 'Available?', isAvailable)
                          return isAvailable
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
                      return generateTimeSlots(duration).map((slot) => {
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
                  Dentist
                </label>
                <input
                  type="text"
                  value={selectedAppointment.dentist_name || "Not Assigned"}
                  disabled
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Dentist cannot be changed when rescheduling</p>
              </div>

              {/* Calendar for selecting date */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Select Date <span className="text-red-500">*</span>
                </label>
                <div className="border border-[var(--color-border)] rounded-lg p-4 bg-white">
                    <Calendar
                      mode="single"
                      selected={rescheduleSelectedDate}
                      onSelect={setRescheduleSelectedDate}
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
                        
                        // Disable dates when dentist is not available (use local date, not UTC)
                        const year = date.getFullYear()
                        const month = String(date.getMonth() + 1).padStart(2, '0')
                        const day = String(date.getDate()).padStart(2, '0')
                        const dateStr = `${year}-${month}-${day}`
                        return !rescheduleAvailableDates.has(dateStr)
                      }}
                      modifiers={{
                        available: (date) => {
                          const year = date.getFullYear()
                          const month = String(date.getMonth() + 1).padStart(2, '0')
                          const day = String(date.getDate()).padStart(2, '0')
                          const dateStr = `${year}-${month}-${day}`
                          return rescheduleAvailableDates.has(dateStr)
                        }
                      }}
                      modifiersClassNames={{
                        available: "bg-green-100 text-green-900 font-semibold hover:bg-green-200"
                      }}
                      className="mx-auto"
                    />
                    {rescheduleAvailableDates.size === 0 && (
                      <p className="text-sm text-amber-600 mt-2 text-center">
                        ⚠️ Loading dentist availability...
                      </p>
                    )}
                  </div>
                </div>

              {/* Time selection - only show if date is selected */}
              {rescheduleSelectedDate && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                    Preferred Time <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-600 mb-2">
                    Select a 30-minute time slot (10:00 AM - 8:00 PM). Grayed out times are already booked.
                  </p>
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2 border border-[var(--color-border)] rounded-lg">
                    {generateRescheduleTimeSlots().map((slot) => {
                      const isBooked = rescheduleBookedSlots.some(bookedSlot => {
                        const slotTime = bookedSlot.time.substring(0, 5)
                        return bookedSlot.date === rescheduleData.date && slotTime === slot.value
                      })
                      const isSelected = rescheduleData.time === slot.value
                      return (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => !isBooked && setRescheduleData({ ...rescheduleData, time: slot.value })}
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
                  {!rescheduleData.time && (
                    <p className="text-xs text-red-600 mt-1">* Please select a time slot</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Treatment
                </label>
                <input
                  type="text"
                  value={selectedAppointment.service_name || "General Consultation"}
                  disabled
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Treatment cannot be changed when rescheduling</p>
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
                      <CalendarIcon className="w-3 h-3" />
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
