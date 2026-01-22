"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, FileText, Upload, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import UnifiedDocumentUpload from "@/components/unified-document-upload"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
const BACKEND_URL = API_BASE_URL.replace('/api', '')

interface Patient {
  id: number
  first_name: string
  last_name: string
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

export default function PatientDocumentsPage() {
  const router = useRouter()
  const params = useParams()
  const patientId = params.id as string
  const { token } = useAuth()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [teethImages, setTeethImages] = useState<TeethImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)

  useEffect(() => {
    if (!token || !patientId) return
    fetchData()
  }, [token, patientId])

  const fetchData = async () => {
    if (!token) return

    try {
      setIsLoading(true)
      const [patientData, documentsData, teethImagesData] = await Promise.all([
        api.getPatientById(Number.parseInt(patientId), token),
        api.getDocuments(Number.parseInt(patientId), token),
        api.getPatientTeethImages(Number.parseInt(patientId), token),
      ])

      setPatient(patientData)
      const patientDocs = documentsData.filter(
        (doc: any) => doc.patient === Number.parseInt(patientId)
      )
      setDocuments(patientDocs)
      const patientImages = teethImagesData.filter(
        (img: any) => img.patient === Number.parseInt(patientId)
      )
      setTeethImages(patientImages)
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setIsLoading(false)
    }
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

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.push(`/owner/patients/${patientId}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to {patient.first_name} {patient.last_name} details</span>
      </button>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Documents & Images</h1>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      <div className="space-y-6">
        {/* Medical Certificates */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="font-medium text-gray-900 mb-4 text-lg">Medical Certificates</h3>
          {documents.filter((doc) => doc.document_type === "medical_certificate").length === 0 ? (
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="font-medium text-gray-900 mb-4 text-lg">Teeth Images & X-rays</h3>
          {teethImages.length === 0 ? (
            <p className="text-gray-500 text-sm">No teeth images or x-rays</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {teethImages.map((img) => {
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="font-medium text-gray-900 mb-4 text-lg">Other Documents</h3>
          {documents.filter((doc) => doc.document_type !== "medical_certificate").length === 0 ? (
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

      {/* Upload Modal */}
      {showUploadModal && patient && (
        <UnifiedDocumentUpload
          patientId={Number.parseInt(patientId)}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={() => {
            setShowUploadModal(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}
