"use client"

import { useState, useEffect, Fragment } from "react"
import { Calendar as CalendarIcon, Clock, User, Plus, X, Edit, XCircle, ChevronDown, ChevronUp, FileText, Camera, Download, Search } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useClinic } from "@/lib/clinic-context"
import { getReadableColor, getServiceBadgeStyle } from "@/lib/utils"
import { ClinicBadge } from "@/components/clinic-badge"
import AppointmentSuccessModal from "@/components/appointment-success-modal"
import AlertModal from "@/components/alert-modal"

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
  clinic: number | null
  clinic_data: {
    id: number
    name: string
    address: string
    phone: string
  } | null
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
  completed_at: string | null
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
  clinic_ids?: number[]
}

export default function PatientAppointments() {
  const { token, user } = useAuth()
  const { allClinics } = useClinic()
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "waiting" | "pending" | "past" | "completed" | "missed" | "cancelled">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successAppointmentDetails, setSuccessAppointmentDetails] = useState<any>(null)
  const [appointmentError, setAppointmentError] = useState("")
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean
    type: "success" | "error" | "warning" | "info"
    title: string
    message: string
  }>({ isOpen: false, type: "info", title: "", message: "" })
  const [cancelReason, setCancelReason] = useState("")
  const [staff, setStaff] = useState<Staff[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<number | null>(null)
  const [appointmentDocuments, setAppointmentDocuments] = useState<Record<number, Document[]>>({})
  const [appointmentImages, setAppointmentImages] = useState<Record<number, TeethImage[]>>({})
  const [loadingFiles, setLoadingFiles] = useState<Record<number, boolean>>({})
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [selectedImage, setSelectedImage] = useState<TeethImage | null>(null)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [newAppointment, setNewAppointment] = useState({
    clinic: "",
    date: "",
    time: "",
    dentist: "",
    service: "",
    notes: "",
  })
  const [rescheduleData, setRescheduleData] = useState({
    clinic: "",
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

  // Fetch PDF as blob when document is selected
  useEffect(() => {
    if (selectedDocument) {
      fetch(selectedDocument.file_url)
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob)
          setPdfBlobUrl(url)
        })
        .catch(err => {
          console.error('Failed to load document:', err)
          setPdfBlobUrl(null)
        })
    } else {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl)
        setPdfBlobUrl(null)
      }
    }

    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl)
      }
    }
  }, [selectedDocument])

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
        console.log('[SERVICES] Raw services data:', servicesData)
        const patientAllowedServices = servicesData.filter(
          (service: Service) => service.name === 'Cleaning' || service.name === 'Consultation'
        )
        console.log('[SERVICES] Filtered patient services:', patientAllowedServices)
        setServices(patientAllowedServices)

        // Fetch blocked time slots
        const blockedResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/blocked-time-slots/`, {
          headers: {
            'Authorization': `Token ${token}`,
          },
        })
        if (blockedResponse.ok) {
          const blockedData = await blockedResponse.json()
          // Handle both paginated (object with results) and non-paginated (array) responses
          const blockedSlotsArray = Array.isArray(blockedData) ? blockedData : (blockedData?.results || [])
          setBlockedTimeSlots(blockedSlotsArray)
          console.log("Fetched blocked time slots:", blockedSlotsArray)
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
        
        // Handle both paginated (object with results) and non-paginated (array) responses
        const availabilityData = Array.isArray(availability) ? availability : (availability?.results || [])
        setDentistAvailability(availabilityData)
        
        // Extract available dates from the date-specific availability
        const dates = new Set<string>()
        availabilityData.forEach((item: any) => {
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
      if (!token || !selectedAppointment?.dentist || !showRescheduleModal) {
        setRescheduleDentistAvailability([])
        setRescheduleAvailableDates(new Set())
        return
      }

      console.log('[RESCHEDULE] Fetching availability for dentist:', selectedAppointment.dentist)

      try {
        // Get date-specific availability for the next 90 days
        const today = new Date()
        const endDate = new Date(today)
        endDate.setDate(today.getDate() + 90)
        
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
        
        const availability = await api.getDentistAvailability(
          Number(selectedAppointment.dentist),
          todayStr,
          endDateStr,
          token
        )
        
        console.log('[RESCHEDULE] Availability received:', availability)
        
        // Handle both paginated (object with results) and non-paginated (array) responses
        const availabilityData = Array.isArray(availability) ? availability : (availability?.results || [])
        setRescheduleDentistAvailability(availabilityData)
        
        // Extract available dates from the date-specific availability
        const dates = new Set<string>()
        availabilityData.forEach((item: any) => {
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
  }, [selectedAppointment?.dentist, showRescheduleModal, token])

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
    setAppointmentError("") // Clear previous errors
    
    if (!token || !user) {
      setAppointmentError("Please log in to create an appointment")
      return
    }

    // Get the selected service duration
    const selectedService = services.find(s => s.id === Number(newAppointment.service))
    const duration = selectedService?.duration || 30

    // Check for time slot conflicts using the booked slots data with overlap detection
    const hasConflict = isTimeSlotBooked(newAppointment.date, newAppointment.time, duration)

    if (hasConflict) {
      setAppointmentError("This time slot conflicts with an existing appointment. Please select a different time.")
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
      setAppointmentError("You already have this appointment booked for this time. Please select a different time or service.")
      return
    }

    try {
      // Get the selected service to check if it's auto-confirmed
      const selectedService = services.find(s => s.id === Number(newAppointment.service))
      const serviceName = selectedService?.name?.toLowerCase() || ""
      
      // Auto-confirm for Cleaning and Consultation services, pending for others
      const appointmentStatus = 
        serviceName === "cleaning" || serviceName === "consultation" 
          ? "confirmed" 
          : "pending"
      
      const appointmentData = {
        patient: user.id,
        dentist: newAppointment.dentist ? Number.parseInt(newAppointment.dentist) : null,
        clinic: newAppointment.clinic ? Number.parseInt(newAppointment.clinic) : null,
        date: newAppointment.date,
        time: newAppointment.time,
        service: newAppointment.service ? Number.parseInt(newAppointment.service) : null,
        notes: newAppointment.notes || "",
        status: appointmentStatus,
      }

      console.log("[APPOINTMENT] Creating appointment with data:", appointmentData)
      console.log("[APPOINTMENT] Token:", token ? "Present" : "Missing")
      console.log("[APPOINTMENT] User:", user)
      
      const createdAppointment = await api.createAppointment(appointmentData, token)
      console.log("[APPOINTMENT] Appointment created successfully:", createdAppointment)
      setAllAppointments([createdAppointment, ...allAppointments])
      
      // Close the add modal first
      console.log("[APPOINTMENT] Closing add modal")
      setShowAddModal(false)
      
      // Reset form
      setNewAppointment({
        clinic: "",
        date: "",
        time: "",
        dentist: "",
        service: "",
        notes: "",
      })
      setSelectedDate(undefined)
      setBookedSlots([])
      
      // Show success modal with appointment details after a brief delay
      const successDetails = {
        patientName: `${user.first_name} ${user.last_name}`,
        date: createdAppointment.date,
        time: createdAppointment.time,
        service: createdAppointment.service_name || "N/A",
        dentist: createdAppointment.dentist_name || "Any Available Dentist",
        notes: createdAppointment.notes || ""
      }
      console.log("[APPOINTMENT] Setting success modal details:", successDetails)
      
      // Use setTimeout to ensure add modal is fully closed before showing success modal
      setTimeout(() => {
        setSuccessAppointmentDetails(successDetails)
        console.log("[APPOINTMENT] Showing success modal")
        setShowSuccessModal(true)
      }, 100)
    } catch (error: any) {
      // Extract the error message from the backend response
      let errorMessage = "Failed to create appointment. Please try again."
      
      if (error?.response?.data) {
        const errorData = error.response.data
        
        // Check for specific validation errors
        if (errorData.error === 'Weekly limit exceeded') {
          errorMessage = errorData.message || "You already have an appointment this week. Patients can only book one appointment per week."
        } else if (errorData.error === 'Duplicate booking') {
          errorMessage = errorData.message || "You already have an appointment for this service at this time."
        } else if (errorData.error === 'Dentist conflict') {
          errorMessage = errorData.message || "This dentist already has an appointment at another location at this time."
        } else if (errorData.error === 'Time slot conflict') {
          errorMessage = errorData.message || "This time slot is already booked. Please select a different time."
        } else if (errorData.message) {
          errorMessage = errorData.message
        } else if (typeof errorData === 'string') {
          errorMessage = errorData
        }
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      setAppointmentError(errorMessage)
    }
  }

  const handleRequestReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    const dentistId = appointment.dentist?.toString() || ""
    setRescheduleData({
      clinic: appointment.clinic?.toString() || "",
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
      setAlertModal({
        isOpen: true,
        type: "warning",
        title: "Validation Error",
        message: "Please select a date"
      })
      return
    }
    if (!rescheduleData.time) {
      setAlertModal({
        isOpen: true,
        type: "warning",
        title: "Validation Error",
        message: "Please select a time"
      })
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
        clinic: "",
        date: "",
        time: "",
        dentist: "",
        service: "",
        notes: "",
      })
      setRescheduleSelectedDate(undefined)
      setRescheduleBookedSlots([])
      setAlertModal({
        isOpen: true,
        type: "success",
        title: "Request Submitted",
        message: "Reschedule request submitted! Staff will review it soon."
      })
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
      
      setAlertModal({
        isOpen: true,
        type: "error",
        title: "Failed to Submit",
        message: `Failed to submit reschedule request: ${errorMsg}`
      })
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
      setAlertModal({
        isOpen: true,
        type: "success",
        title: "Request Submitted",
        message: "Cancellation request submitted! Staff will review it soon."
      })
    } catch (error: any) {
      console.error("Error requesting cancellation:", error)
      const errorMessage = error.message || "Failed to submit cancellation request. Please try again."
      setAlertModal({
        isOpen: true,
        type: "error",
        title: "Failed",
        message: errorMessage
      })
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
  
  // Upcoming: PENDING, CONFIRMED, and pending requests (reschedule/cancel) in the future
  const upcomingAppointments = allAppointments.filter((apt) => {
    const aptDate = new Date(apt.date + 'T' + apt.time)
    const isUpcomingStatus = apt.status === 'pending' || apt.status === 'confirmed' || apt.status === 'reschedule_requested' || apt.status === 'cancel_requested'
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

  // Filter appointments based on status filter and search query
  const appointments = allAppointments.filter((apt) => {
    // Filter by search query
    const matchesSearch = searchQuery === "" || 
      apt.service_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.dentist_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.status?.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Filter by status
    let matchesStatus = false
    if (statusFilter === "all") {
      matchesStatus = true
    } else if (statusFilter === "upcoming") {
      matchesStatus = apt.status === "confirmed"
    } else if (statusFilter === "past") {
      matchesStatus = apt.status === "completed" || apt.status === "missed" || apt.status === "cancelled"
    } else {
      matchesStatus = apt.status === statusFilter
    }
    
    return matchesSearch && matchesStatus
  })

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
          <h1 className="text-3xl font-display font-bold text-[var(--color-primary)] mb-2">My Appointments</h1>
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

      {/* Search */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search by treatment, dentist, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      </div>

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
            All Appointments
          </button>
          <button
            onClick={() => setStatusFilter("upcoming")}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === "upcoming"
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Upcoming
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
            onClick={() => setStatusFilter("past")}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === "past"
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Treatment History
          </button>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">{isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
              <p className="text-[var(--color-text-muted)]">Loading appointments...</p>
            </div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)] opacity-30" />
            <p className="text-lg font-medium text-[var(--color-text)] mb-2">
              {statusFilter === "all" && "No Appointments"}
              {statusFilter === "upcoming" && "No Confirmed Appointments"}
              {statusFilter === "waiting" && "No Waiting Appointments"}
              {statusFilter === "pending" && "No Pending Appointments"}
              {statusFilter === "past" && "No Treatment History"}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {statusFilter === "all" && "You don't have any appointments yet"}
              {statusFilter === "upcoming" && "You don't have any confirmed appointments scheduled"}
              {statusFilter === "waiting" && "No appointments are currently in waiting status"}
              {statusFilter === "pending" && "No appointments are currently pending approval"}
              {statusFilter === "past" && "No completed, missed, or cancelled appointments found"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-background)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Patient</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Treatment</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Dentist</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Clinic</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {appointments.map((apt) => (
                  <Fragment key={apt.id}>
                    <tr 
                      onClick={() => toggleAppointmentExpansion(apt.id)}
                      className="hover:bg-[var(--color-background)] cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <button className="flex items-center gap-2 text-[var(--color-primary)] hover:underline">
                          {expandedAppointmentId === apt.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          <div className="text-left">
                            <p className="font-medium text-[var(--color-text)]">{apt.patient_name}</p>
                            <p className="text-xs text-[var(--color-text-muted)]">{apt.patient_email}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className="inline-block px-3 py-1 rounded-lg font-medium whitespace-nowrap"
                          style={{ 
                            ...getServiceBadgeStyle(apt.service_color || '#10b981'),
                            border: `1px solid ${getServiceBadgeStyle(apt.service_color || '#10b981').borderColor}`
                          }}
                        >
                          {apt.service_name || "General Consultation"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--color-text-muted)]">{apt.date}</td>
                      <td className="px-6 py-4 text-[var(--color-text-muted)]">{formatTime(apt.time)}</td>
                      <td className="px-6 py-4 text-[var(--color-text-muted)]">{apt.dentist_name || "Not Assigned"}</td>
                      <td className="px-6 py-4">
                        {apt.clinic_data ? (
                          <ClinicBadge clinic={apt.clinic_data} size="sm" />
                        ) : (
                          <span className="text-xs text-gray-500 italic">No clinic</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                          {formatStatus(apt.status)}
                        </span>
                      </td>
                    </tr>
                    {/* Expanded Row */}
                    {expandedAppointmentId === apt.id && (
                      <tr>
                        <td colSpan={7} className="bg-gradient-to-br from-gray-50 to-teal-50">
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
                                      <p className="text-[var(--color-text-muted)] mb-0.5">Patient</p>
                                      <p className="font-medium text-lg">{apt.patient_name}</p>
                                      <p className="text-xs text-[var(--color-text-muted)]">{apt.patient_email}</p>
                                    </div>
                                    <div>
                                      <p className="text-[var(--color-text-muted)] mb-0.5">Service</p>
                                      <p className="font-medium">{apt.service_name || "General Consultation"}</p>
                                    </div>
                                    <div>
                                      <p className="text-[var(--color-text-muted)] mb-0.5">Clinic Location</p>
                                      {apt.clinic_data ? (
                                        <div className="space-y-1">
                                          <ClinicBadge clinic={apt.clinic_data} size="md" />
                                          <p className="text-xs text-[var(--color-text-muted)]">
                                            📍 {apt.clinic_data.address}
                                          </p>
                                          <p className="text-xs text-[var(--color-text-muted)]">
                                            📞 {apt.clinic_data.phone}
                                          </p>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-gray-500 italic">No clinic assigned</p>
                                      )}
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

                                {/* Documents & Images Card */}
                                <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
                                  <h4 className="font-semibold text-[var(--color-primary)] mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Uploaded Files
                                  </h4>
                                  {loadingFiles[apt.id] ? (
                                    <p className="text-sm text-[var(--color-text-muted)]">Loading files...</p>
                                  ) : (
                                    <div className="space-y-4">
                                      {/* Documents Section */}
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <FileText className="w-4 h-4 text-[var(--color-primary)]" />
                                          <h5 className="font-medium text-sm">Documents</h5>
                                        </div>
                                        {appointmentDocuments[apt.id]?.length > 0 ? (
                                          <div className="space-y-2">
                                            {appointmentDocuments[apt.id].map((doc) => (
                                              <div
                                                key={doc.id}
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setSelectedDocument(doc)
                                                }}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-[var(--color-border)] hover:bg-gray-100 cursor-pointer transition-colors group"
                                              >
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-medium text-[var(--color-text)] truncate">{doc.title}</p>
                                                  <p className="text-xs text-[var(--color-text-muted)]">
                                                    {new Date(doc.uploaded_at).toLocaleDateString()}
                                                  </p>
                                                </div>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDownloadFile(doc.file_url, doc.title)
                                                  }}
                                                  className="ml-2 p-2 hover:bg-white rounded-lg transition-colors flex-shrink-0"
                                                  title="Download document"
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

                                      {/* Images Section */}
                                      <div className="pt-4 border-t border-[var(--color-border)]">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Camera className="w-4 h-4 text-[var(--color-primary)]" />
                                          <h5 className="font-medium text-sm">Images</h5>
                                        </div>
                                        {appointmentImages[apt.id]?.length > 0 ? (
                                          <div className="space-y-2">
                                            {appointmentImages[apt.id].map((img) => (
                                              <div
                                                key={img.id}
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setSelectedImage(img)
                                                }}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-[var(--color-border)] hover:bg-gray-100 cursor-pointer transition-colors group"
                                              >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                  <img 
                                                    src={img.image_url} 
                                                    alt="Dental" 
                                                    className="w-12 h-12 object-cover rounded flex-shrink-0"
                                                  />
                                                  <div className="min-w-0">
                                                    <p className="text-sm font-medium text-[var(--color-text)]">Dental Image</p>
                                                    <p className="text-xs text-[var(--color-text-muted)]">
                                                      {new Date(img.uploaded_at).toLocaleDateString()}
                                                    </p>
                                                  </div>
                                                </div>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDownloadFile(img.image_url, `dental-image-${img.id}.jpg`)
                                                  }}
                                                  className="ml-2 p-2 hover:bg-white rounded-lg transition-colors flex-shrink-0"
                                                  title="Download image"
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

                              {/* Action Buttons */}
                              {apt.status === "confirmed" && (
                                <div className="flex gap-3 pt-4 border-t border-[var(--color-border)]">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRequestReschedule(apt)
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Request Reschedule
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedAppointment(apt)
                                      setShowCancelModal(true)
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Request Cancel
                                  </button>
                                </div>
                              )}

                              {/* Reschedule button for missed appointments */}
                              {apt.status === "missed" && (
                                <div className="flex gap-3 pt-4 border-t border-[var(--color-border)]">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRequestReschedule(apt)
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Request Reschedule
                                  </button>
                                </div>
                              )}

                              {/* Reschedule/Cancel Request Info */}
                              {apt.status === "reschedule_requested" && apt.reschedule_date && (
                                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                  <p className="text-sm font-semibold text-orange-800 mb-2">📅 Requested Reschedule:</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="text-orange-600 font-medium">New Date:</span>
                                      <p className="text-orange-800">{apt.reschedule_date}</p>
                                    </div>
                                    <div>
                                      <span className="text-orange-600 font-medium">New Time:</span>
                                      <p className="text-orange-800">{formatTime(apt.reschedule_time || '')}</p>
                                    </div>
                                  </div>
                                  {apt.reschedule_notes && (
                                    <div className="mt-3">
                                      <span className="text-orange-600 font-medium text-sm">Notes:</span>
                                      <p className="text-orange-800 text-sm">{apt.reschedule_notes}</p>
                                    </div>
                                  )}
                                  <p className="text-xs text-orange-700 mt-2">Waiting for staff approval...</p>
                                </div>
                              )}

                              {apt.status === "cancel_requested" && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                  <p className="text-sm font-semibold text-red-800 mb-2">❌ Cancellation Requested</p>
                                  <p className="text-xs text-red-700">Waiting for staff approval...</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
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
                  setNewAppointment({ clinic: "", date: "", time: "", dentist: "", service: "", notes: "" })
                  setSelectedDate(undefined)
                  setAvailableDates(new Set())
                  setAppointmentError("") // Clear error when closing modal
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

              {/* Error Message Display */}
              {appointmentError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{appointmentError}</p>
                </div>
              )}

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
                  📍 Choose the clinic location where you want your appointment
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
                      className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-100 disabled:cursor-not-allowed"
                      required
                      disabled={!newAppointment.clinic}
                    >
                      <option value="">{newAppointment.clinic ? "Select a dentist..." : "Select clinic first"}</option>
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
                    {!newAppointment.clinic && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ Select a clinic first to see available dentists
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
                      {services.map((service) => (
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
                    setNewAppointment({ clinic: "", date: "", time: "", dentist: "", service: "", notes: "" })
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

      {/* Success Modal */}
      {showSuccessModal && successAppointmentDetails && (
        <AppointmentSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false)
            setSuccessAppointmentDetails(null)
          }}
          appointmentDetails={successAppointmentDetails}
        />
      )}

      {/* Document Preview Modal */}
      {selectedDocument && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedDocument(null)
            setPdfBlobUrl(null)
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[var(--color-primary)]">{selectedDocument.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedDocument.document_type}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedDocument.file_url}
                  download={selectedDocument.title}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </a>
                <button
                  onClick={() => {
                    setSelectedDocument(null)
                    setPdfBlobUrl(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {selectedDocument.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img
                  src={selectedDocument.file_url}
                  alt={selectedDocument.title}
                  className="w-full h-full object-contain"
                />
              ) : pdfBlobUrl ? (
                <iframe src={pdfBlobUrl} className="w-full h-full border-0" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[var(--color-primary)]">Dental Image</h2>
                {selectedImage.notes && (
                  <p className="text-sm text-gray-500 mt-1">{selectedImage.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedImage.image_url}
                  download={`dental-image-${selectedImage.id}.jpg`}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </a>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <img
                src={selectedImage.image_url}
                alt="Dental image"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    
    {/* Alert Modal */}
    <AlertModal
      isOpen={alertModal.isOpen}
      onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
      type={alertModal.type}
      title={alertModal.title}
      message={alertModal.message}
    />
    </div>
  )
}
