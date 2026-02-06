"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Upload,
  FileText,
  Download,
  X,
  Clock,
  MapPin,
  User,
} from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import UnifiedDocumentUpload from "@/components/unified-document-upload"
import { ClinicBadge } from "@/components/clinic-badge"

// Get the API base URL for constructing full image URLs
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
const BACKEND_URL = API_BASE_URL.replace('/api', '')

interface Appointment {
  id: number
  date: string
  time: string
  service: any
  service_name?: string
  service_color?: string
  dentist: any
  dentist_name?: string
  status: string
  notes: string
  clinic?: number
  clinic_name?: string
  clinic_data?: {
    id: number
    name: string
    address: string
    phone: string
    color: string
  }
}

interface DentalRecord {
  id: number
  treatment: string
  diagnosis: string
  notes: string
  created_at: string
  created_by: any
  appointment: any
}

interface Document {
  id: number
  document_type: string
  document_type_display: string
  file: string
  file_url?: string
  title: string
  description?: string
  uploaded_at: string
  appointment?: number
  appointment_date?: string
  appointment_time?: string
  service_name?: string
  dentist_name?: string
}

interface TeethImage {
  id: number
  image: string
  image_type: string
  image_type_display: string
  uploaded_at: string
  notes: string
  appointment?: number
  appointment_date?: string
  appointment_time?: string
  service_name?: string
  dentist_name?: string
}

export default function PatientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const patientId = params.id as string
  const { token } = useAuth()

  const [patient, setPatient] = useState<any>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [dentalRecords, setDentalRecords] = useState<DentalRecord[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !patientId) return
    fetchPatientData()
  }, [token, patientId])

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedDocument) {
          setSelectedDocument(null)
        } else if (showUploadModal) {
          setShowUploadModal(false)
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedDocument, showUploadModal])

  useEffect(() => {
    if (selectedDocument) {
      // Fetch PDF as blob and create object URL
      fetch(selectedDocument.file)
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob)
          setPdfBlobUrl(url)
        })
        .catch(err => {
          console.error('Failed to load PDF:', err)
          setPdfBlobUrl(null)
        })
    } else {
      // Clean up blob URL when modal closes
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl)
        setPdfBlobUrl(null)
      }
    }
  }, [selectedDocument])

  const fetchPatientData = async () => {
    if (!token) return

    try {
      setIsLoading(true)

      // Fetch patient details, appointments, dental records, and documents
      const [
        patientData,
        appointmentsData,
        dentalRecordsData,
        documentsData,
      ] = await Promise.all([
        api.getPatientById(Number.parseInt(patientId), token),
        api.getAppointments(token),
        api.getDentalRecords(Number.parseInt(patientId), token),
        api.getDocuments(Number.parseInt(patientId), token),
      ])

      console.log("Patient data from API:", patientData)
      console.log("Dental records from API:", dentalRecordsData)
      setPatient(patientData)
      
      // Filter appointments for this patient
      // Note: apt.patient can be either a number (ID) or an object with an id property
      const patientAppointments = appointmentsData.filter(
        (apt: any) => {
          const aptPatientId = typeof apt.patient === 'number' ? apt.patient : apt.patient?.id
          return aptPatientId === Number.parseInt(patientId)
        }
      )
      console.log("All appointments:", appointmentsData)
      console.log("Patient ID:", Number.parseInt(patientId))
      console.log("Filtered patient appointments:", patientAppointments)
      setAppointments(patientAppointments)

      // getDentalRecords and getDocuments already filter by patient ID on the backend
      setDentalRecords(dentalRecordsData)
      setDocuments(documentsData)
    } catch (error) {
      console.error("Error fetching patient data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadImage = (imageUrl: string, filename: string) => {
    fetch(imageUrl)
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
        // Fallback to direct link
        const link = document.createElement('a')
        link.href = imageUrl
        link.download = filename
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      })
  }

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
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
    const G = (num >> 8 & 0x00FF) - amt
    const B = (num & 0x0000FF) - amt
    return "#" + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading patient data...</p>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Patient not found</p>
          <button
            onClick={() => router.push("/staff/patients")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Patients
          </button>
        </div>
      </div>
    )
  }

  const pastAppointments = appointments.filter(
    (apt) => new Date(`${apt.date}T${apt.time}`) < new Date() || apt.status === "completed"
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with Back Button */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/staff/patients")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Patient List</span>
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8">
            <div className="flex items-start gap-8">
              {/* Patient Avatar/Image */}
              <div className="relative">
                <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold flex-shrink-0 shadow-lg">
                  {patient.first_name?.[0]}{patient.last_name?.[0]}
                </div>
              </div>

              {/* Patient Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">
                  {patient.first_name} {patient.last_name}
                </h1>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email</p>
                    <p className="text-sm text-gray-900 font-medium">{patient.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Phone</p>
                    <p className="text-sm text-gray-900 font-medium">{patient.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Age</p>
                    <p className="text-sm text-gray-900 font-medium">
                      {patient.birthday ? `${calculateAge(patient.birthday)} years` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Birthday</p>
                    <p className="text-sm text-gray-900 font-medium">
                      {patient.birthday ? new Date(patient.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "N/A"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Address</p>
                    <p className="text-sm text-gray-900 font-medium">{patient.address || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Appointments Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="px-8 py-6 border-b border-gray-100">
          <button
            onClick={() => router.push(`/staff/patients/${patientId}/appointments`)}
            className="text-lg font-semibold text-gray-900 flex items-center gap-2 hover:text-blue-600 transition-colors"
          >
            <Calendar className="w-5 h-5 text-blue-600" />
            Appointments
            <span className="text-sm text-gray-500 ml-2">View all</span>
          </button>
        </div>
        <div className="p-8">
          {(() => {
            // Only show PENDING and CONFIRMED appointments that are in the future
            const upcoming = appointments.filter((apt) => {
              const appointmentDateTime = new Date(`${apt.date}T${apt.time || '00:00'}`)
              const now = new Date()
              const isAfterNow = appointmentDateTime > now
              const isUpcomingStatus = apt.status === "pending" || apt.status === "confirmed"
              
              return isAfterNow && isUpcomingStatus
            })
            
            return upcoming.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No upcoming appointments</p>
            ) : (
              <div className="space-y-4">
                {upcoming
                  .slice(0, 3)
                .map((apt) => (
                  <div 
                    key={apt.id} 
                    className="border border-gray-200 hover:border-blue-300 rounded-xl p-5 transition-all duration-200 hover:shadow-md bg-white"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        {/* Service Name Badge */}
                        <div className="mb-3">
                          <span 
                            className="inline-block px-4 py-1.5 rounded-lg font-semibold text-sm"
                            style={{ 
                              color: darkenColor(apt.service_color || '#10b981', 40),
                              backgroundColor: `${apt.service_color || '#10b981'}15`,
                              border: `1.5px solid ${apt.service_color || '#10b981'}40`
                            }}
                          >
                            {apt.service_name || apt.service?.name || "General Checkup"}
                          </span>
                        </div>

                        {/* Appointment Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Date and Time */}
                          <div className="flex items-center gap-2 text-gray-700">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium">
                              {new Date(apt.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-gray-700">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium">{formatTime(apt.time)}</span>
                          </div>

                          {/* Dentist */}
                          {(apt.dentist_name || apt.dentist) && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium">
                                {apt.dentist_name || `Dr. ${apt.dentist.first_name} ${apt.dentist.last_name}`}
                              </span>
                            </div>
                          )}

                          {/* Clinic */}
                          {apt.clinic_data && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <ClinicBadge clinic={apt.clinic_data} size="sm" />
                            </div>
                          )}
                        </div>

                        {/* Notes if available */}
                        {apt.notes && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Notes:</p>
                            <p className="text-sm text-gray-700">{apt.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ml-4 ${
                        apt.status === 'confirmed' ? 'bg-green-100 text-green-700 border border-green-200' :
                        apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                        'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Treatment History Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="px-8 py-6 border-b border-gray-100">
          <button
            onClick={() => router.push(`/staff/patients/${patientId}/treatments`)}
            className="text-lg font-semibold text-gray-900 flex items-center gap-2 hover:text-blue-600 transition-colors"
          >
            <FileText className="w-5 h-5 text-green-600" />
            Treatment History
            <span className="text-sm text-gray-500 ml-2">View all</span>
          </button>
        </div>
        <div className="p-8">
          {dentalRecords.length === 0 && appointments.filter(apt => 
            apt.status === 'completed' || apt.status === 'missed' || apt.status === 'cancelled'
          ).length === 0 ? (
            <p className="text-gray-500 text-center py-8">No treatment history</p>
          ) : (
            <div className="space-y-4">
              {/* Combine all past appointments (completed, missed, cancelled) */}
              {[...dentalRecords.map(record => ({ 
                  type: 'record' as const, 
                  data: record,
                  date: new Date(record.created_at)
                })),
                ...appointments
                  .filter(apt => apt.status === 'completed' || apt.status === 'missed' || apt.status === 'cancelled')
                  .map(apt => ({
                    type: 'appointment' as const,
                    data: apt,
                    date: new Date(apt.date)
                  }))
              ]
                .sort((a, b) => b.date.getTime() - a.date.getTime()) // Sort by date descending
                .slice(0, 3) // Show only first 3
                .map((item, index) => {
                  if (item.type === 'record') {
                    const record = item.data
                    return (
                      <div
                        key={`record-${record.id}`}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">{record.treatment}</h4>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Completed
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Date</p>
                            <p className="font-medium text-gray-900">
                              {new Date(record.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {record.created_by && (
                            <div>
                              <p className="text-sm text-gray-500">Dentist</p>
                              <p className="font-medium text-gray-900">
                                Dr. {record.created_by.first_name} {record.created_by.last_name}
                              </p>
                            </div>
                          )}
                          {record.diagnosis && (
                            <div className="col-span-2">
                              <p className="text-sm text-gray-500">Diagnosis</p>
                              <p className="font-medium text-gray-900">{record.diagnosis}</p>
                            </div>
                          )}
                        </div>
                        {record.notes && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-500">Notes</p>
                            <p className="text-gray-700 mt-1">{record.notes}</p>
                          </div>
                        )}
                      </div>
                    )
                  } else {
                    const apt = item.data
                    // Determine status color
                    const statusBadge = apt.status === 'completed' 
                      ? 'bg-green-100 text-green-800'
                      : apt.status === 'missed'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                    
                    return (
                      <div
                        key={`apt-${apt.id}`}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">
                            {(apt as any).service_name || apt.service?.name || "Appointment"}
                          </h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge}`}>
                            {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Date</p>
                            <p className="font-medium text-gray-900">
                              {new Date(apt.date).toLocaleDateString()} at {formatTime(apt.time)}
                            </p>
                          </div>
                          {(((apt as any).dentist_name && (apt as any).dentist_name.trim()) || apt.dentist) && (
                            <div>
                              <p className="text-sm text-gray-500">Dentist</p>
                              <p className="font-medium text-gray-900">
                                {((apt as any).dentist_name && (apt as any).dentist_name.trim()) || 
                                  (apt.dentist?.first_name && apt.dentist?.last_name 
                                    ? `Dr. ${apt.dentist.first_name} ${apt.dentist.last_name}` 
                                    : apt.dentist?.username || 'Dr. N/A')}
                              </p>
                            </div>
                          )}
                        </div>
                        {apt.notes && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-500">Notes</p>
                            <p className="text-gray-700 mt-1">{apt.notes}</p>
                          </div>
                        )}
                      </div>
                    )
                  }
                })
              }
            </div>
          )}
        </div>
      </div>

      {/* Documents & Images Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <button
            onClick={() => router.push(`/staff/patients/${patientId}/files`)}
            className="text-lg font-semibold text-gray-900 flex items-center gap-2 hover:text-blue-600 transition-colors"
          >
            <FileText className="w-5 h-5 text-purple-600" />
            Documents & Images
            <span className="text-sm text-gray-500 ml-2">View all</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>
        <div className="p-8">
          <div className="space-y-6">
            {/* Medical Certificates */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Medical Certificates</h3>
              {documents.filter((doc) => doc.document_type === "medical_certificate")
                .length === 0 ? (
                <p className="text-gray-500 text-sm">No medical certificates</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {documents
                    .filter((doc) => doc.document_type === "medical_certificate")
                    .map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocument(doc)}
                        className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-blue-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                              {doc.title || "Medical Certificate"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Teeth Images & X-rays */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Teeth Images & X-rays</h3>
              {documents.filter((doc) => doc.document_type === 'xray' || doc.document_type === 'dental_image' || doc.document_type === 'scan').length === 0 ? (
                <p className="text-gray-500 text-sm">No teeth images or x-rays</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {documents
                    .filter((doc) => doc.document_type === 'xray' || doc.document_type === 'dental_image' || doc.document_type === 'scan')
                    .map((doc) => {
                      // Use file_url if available, otherwise construct from file
                      const fileUrl = doc.file_url || doc.file
                      const imageUrl = fileUrl.startsWith('http') 
                        ? fileUrl 
                        : `${BACKEND_URL}${fileUrl}`
                      
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDocument(doc)}
                          className="border border-gray-200 rounded-lg p-2 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <img
                            src={imageUrl}
                            alt={doc.title || 'Dental image'}
                            className="w-full h-32 object-cover rounded"
                            onError={(e) => {
                              console.error('Image failed to load:', imageUrl)
                              // Hide the entire card if image fails to load
                              const card = e.currentTarget.closest('div.border')
                              if (card) (card as HTMLElement).style.display = 'none'
                            }}
                          />
                          <p className="text-xs text-gray-600 mt-2">
                            {doc.document_type_display || "Dental Image"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Other Documents */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Other Documents</h3>
              {documents.filter((doc) => 
                doc.document_type !== "medical_certificate" && 
                doc.document_type !== "xray" && 
                doc.document_type !== "dental_image" && 
                doc.document_type !== "scan"
              ).length === 0 ? (
                <p className="text-gray-500 text-sm">No other documents</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {documents
                    .filter((doc) => 
                      doc.document_type !== "medical_certificate" && 
                      doc.document_type !== "xray" && 
                      doc.document_type !== "dental_image" && 
                      doc.document_type !== "scan"
                    )
                    .map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocument(doc)}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="w-8 h-8 text-gray-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600">
                                {doc.title || "Document"}
                              </p>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                {doc.document_type_display}
                              </span>
                            </div>
                            {doc.appointment_date ? (
                              <div className="mt-1">
                                <p className="text-xs text-gray-600">
                                  {new Date(doc.appointment_date).toLocaleDateString()} at {doc.appointment_time}
                                </p>
                                {doc.service_name && (
                                  <p className="text-xs text-gray-600 font-medium">
                                    {doc.service_name}
                                  </p>
                                )}
                                {doc.dentist_name && (
                                  <p className="text-xs text-gray-500">
                                    {doc.dentist_name}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 mt-1">
                                Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && patient && (
        <UnifiedDocumentUpload
          patientId={Number.parseInt(patientId)}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={() => {
            setShowUploadModal(false)
            fetchPatientData()
          }}
        />
      )}

      {/* Document Preview Modal */}
      {selectedDocument && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDocument(null)}
        >
          <div 
            className="relative w-full max-w-6xl h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedDocument.title || "Document"}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDocument(null)}
                className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Document Info */}
            {selectedDocument.appointment_date && (
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                <p className="text-sm font-medium text-gray-700 mb-1">Linked Appointment:</p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span>
                    <strong>Date:</strong> {new Date(selectedDocument.appointment_date).toLocaleDateString()} at {selectedDocument.appointment_time}
                  </span>
                  {selectedDocument.service_name && (
                    <span>
                      <strong>Service:</strong> {selectedDocument.service_name}
                    </span>
                  )}
                  {selectedDocument.dentist_name && (
                    <span>
                      <strong>Dentist:</strong> {selectedDocument.dentist_name}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* PDF Viewer */}
            <div className="flex-1 overflow-auto bg-gray-100">
              {pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  className="w-full h-full border-0"
                  title={selectedDocument.title || "Document Preview"}
                  style={{ minHeight: '600px' }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">Loading PDF...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
