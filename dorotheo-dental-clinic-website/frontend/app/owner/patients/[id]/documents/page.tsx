"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, FileText, Upload, Trash2, Download, X } from "lucide-react"
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
  document_type_display: string
  file: string
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
  const [selectedImage, setSelectedImage] = useState<TeethImage | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !patientId) return
    fetchData()
  }, [token, patientId])

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedImage) {
          setSelectedImage(null)
        } else if (selectedDocument) {
          setSelectedDocument(null)
        } else if (showUploadModal) {
          setShowUploadModal(false)
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedImage, selectedDocument, showUploadModal])

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
                  <div
                    key={img.id}
                    onClick={() => setSelectedImage(img)}
                    className="border border-gray-200 rounded-lg p-2 hover:bg-gray-50 cursor-pointer transition-colors"
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
                    <p className="text-xs text-gray-600 mt-2">
                      {img.image_type_display || "Dental Image"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(img.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
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

      {/* Image Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-5xl w-full bg-white rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>

            <div className="p-6">
              <div className="mb-4">
                <img 
                  src={selectedImage.image.startsWith('http') ? selectedImage.image : `${BACKEND_URL}${selectedImage.image}`}
                  alt={selectedImage.image_type || 'Dental image'}
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">
                      <strong>Uploaded:</strong> {new Date(selectedImage.uploaded_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      <strong>Type:</strong> {selectedImage.image_type_display || "Dental Image"}
                    </p>
                    {selectedImage.appointment_date && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-1">Linked Appointment:</p>
                        <p className="text-sm text-gray-600">
                          <strong>Date:</strong> {new Date(selectedImage.appointment_date).toLocaleDateString()} at {selectedImage.appointment_time}
                        </p>
                        {selectedImage.service_name && (
                          <p className="text-sm text-gray-600">
                            <strong>Service:</strong> {selectedImage.service_name}
                          </p>
                        )}
                        {selectedImage.dentist_name && (
                          <p className="text-sm text-gray-600">
                            <strong>Dentist:</strong> {selectedImage.dentist_name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDownloadImage(
                      selectedImage.image.startsWith('http') ? selectedImage.image : `${BACKEND_URL}${selectedImage.image}`,
                      `dental-image-${selectedImage.uploaded_at}.jpg`
                    )}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>

                {selectedImage.notes && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                    <p className="text-sm text-gray-600">{selectedImage.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
