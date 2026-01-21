"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Upload,
  FileText,
} from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import TeethImageUpload from "@/components/teeth-image-upload"
import DocumentUpload from "@/components/document-upload"

// Get the API base URL for constructing full image URLs
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
const BACKEND_URL = API_BASE_URL.replace('/api', '')

interface Appointment {
  id: number
  date: string
  time: string
  service: any
  dentist: any
  status: string
  notes: string
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
  file: string
  uploaded_at: string
}

interface TeethImage {
  id: number
  image: string
  image_type: string
  uploaded_at: string
  notes: string
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
  const [teethImages, setTeethImages] = useState<TeethImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [showDocumentUpload, setShowDocumentUpload] = useState(false)

  useEffect(() => {
    if (!token || !patientId) return
    fetchPatientData()
  }, [token, patientId])

  const fetchPatientData = async () => {
    if (!token) return

    try {
      setIsLoading(true)

      // Fetch patient details, appointments, dental records, documents, and teeth images
      const [
        patientData,
        appointmentsData,
        dentalRecordsData,
        documentsData,
        teethImagesData,
      ] = await Promise.all([
        api.getPatientById(Number.parseInt(patientId), token),
        api.getAppointments(token),
        api.getDentalRecords(Number.parseInt(patientId), token),
        api.getDocuments(Number.parseInt(patientId), token),
        api.getPatientTeethImages(Number.parseInt(patientId), token),
      ])

      console.log("Patient data from API:", patientData)
      setPatient(patientData)
      
      // Filter appointments for this patient
      const patientAppointments = appointmentsData.filter(
        (apt: any) => apt.patient?.id === Number.parseInt(patientId)
      )
      setAppointments(patientAppointments)

      // Filter dental records for this patient
      const patientRecords = dentalRecordsData.filter(
        (record: any) => record.patient?.id === Number.parseInt(patientId)
      )
      setDentalRecords(patientRecords)

      // Filter documents for this patient
      const patientDocs = documentsData.filter(
        (doc: any) => doc.patient === Number.parseInt(patientId)
      )
      setDocuments(patientDocs)

      // Filter teeth images for this patient
      const patientImages = teethImagesData.filter(
        (img: any) => img.patient === Number.parseInt(patientId)
      )
      setTeethImages(patientImages)
    } catch (error) {
      console.error("Error fetching patient data:", error)
    } finally {
      setIsLoading(false)
    }
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
            onClick={() => router.push("/owner/patients")}
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
          onClick={() => router.push("/owner/patients")}
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
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Upcoming Appointments
          </h2>
        </div>
        <div className="p-8">
          {appointments.filter(
            (apt) => new Date(`${apt.date}T${apt.time}`) >= new Date() && apt.status !== "completed" && apt.status !== "cancelled"
          ).length === 0 ? (
            <p className="text-gray-500 text-center py-8">No upcoming appointments</p>
          ) : (
            <div className="space-y-3">
              {appointments
                .filter(
                  (apt) => new Date(`${apt.date}T${apt.time}`) >= new Date() && apt.status !== "completed" && apt.status !== "cancelled"
                )
                .map((apt) => (
                  <div key={apt.id} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{apt.service?.name || "General Checkup"}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(apt.date).toLocaleDateString()} at {apt.time}
                        </p>
                        {apt.dentist && (
                          <p className="text-sm text-gray-600">
                            Dr. {apt.dentist.first_name} {apt.dentist.last_name}
                          </p>
                        )}
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Past Appointments Section */}
      <div className="mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              Past Appointments
            </h2>
          </div>
          <div className="p-8">
            {pastAppointments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No past appointments</p>
            ) : (
              <div className="space-y-3">
                {pastAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {apt.service?.name || "General Checkup"}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(apt.date).toLocaleDateString()} at {apt.time}
                        </p>
                        {apt.dentist && (
                          <p className="text-sm text-gray-600">
                            Dr. {apt.dentist.first_name} {apt.dentist.last_name}
                          </p>
                        )}
                        {apt.notes && (
                          <p className="text-sm text-gray-500 mt-2">{apt.notes}</p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          apt.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : apt.status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Treatment History Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            Treatment History
          </h2>
        </div>
        <div className="p-8">
          {dentalRecords.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No treatment history</p>
          ) : (
            <div className="space-y-4">
              {dentalRecords.map((record) => (
                <div
                  key={record.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Treatment</p>
                      <p className="font-medium text-gray-900">{record.treatment}</p>
                    </div>
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
                      <div>
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
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Documents & Images Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Documents & Images
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImageUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Upload className="w-4 h-4" />
              Upload Images
            </button>
            <button
              onClick={() => setShowDocumentUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
          </div>
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
                      <a
                        key={doc.id}
                        href={doc.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <FileText className="w-8 h-8 text-blue-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            Medical Certificate
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </a>
                    ))}
                </div>
              )}
            </div>

            {/* Teeth Images & X-rays */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Teeth Images & X-rays</h3>
              {teethImages.length === 0 ? (
                <p className="text-gray-500 text-sm">No teeth images or x-rays</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {teethImages.map((img) => {
                    // Construct full image URL
                    const imageUrl = img.image.startsWith('http') 
                      ? img.image 
                      : `${BACKEND_URL}${img.image}`
                    
                    return (
                      <a
                        key={img.id}
                        href={imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-gray-200 rounded-lg p-2 hover:bg-gray-50"
                      >
                        <img
                          src={imageUrl}
                          alt={img.image_type || 'Dental image'}
                          className="w-full h-32 object-cover rounded"
                          onError={(e) => {
                            console.error('Image failed to load:', imageUrl)
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E'
                          }}
                        />
                        <p className="text-xs text-gray-600 mt-2 capitalize">
                          {img.image_type ? img.image_type.replace("_", " ") : "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(img.uploaded_at).toLocaleDateString()}
                        </p>
                      </a>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Other Documents */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Other Documents</h3>
              {documents.filter((doc) => doc.document_type !== "medical_certificate")
                .length === 0 ? (
                <p className="text-gray-500 text-sm">No other documents</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {documents
                    .filter((doc) => doc.document_type !== "medical_certificate")
                    .map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <FileText className="w-8 h-8 text-gray-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate capitalize">
                            {doc.document_type.replace("_", " ")}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </a>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modals */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Upload Teeth Images & X-rays</h3>
                <button
                  onClick={() => setShowImageUpload(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <TeethImageUpload
                patientId={Number.parseInt(patientId)}
                patientName={`${patient.first_name} ${patient.last_name}`}
                onClose={() => setShowImageUpload(false)}
              />
            </div>
          </div>
        </div>
      )}

      {showDocumentUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Upload Documents</h3>
                <button
                  onClick={() => setShowDocumentUpload(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <DocumentUpload
                patientId={Number.parseInt(patientId)}
                patientName={`${patient.first_name} ${patient.last_name}`}
                onUploadSuccess={() => {
                  setShowDocumentUpload(false)
                  fetchPatientData()
                }}
                onClose={() => setShowDocumentUpload(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
