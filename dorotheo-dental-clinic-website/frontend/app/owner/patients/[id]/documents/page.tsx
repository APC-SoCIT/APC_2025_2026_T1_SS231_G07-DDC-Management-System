"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, FileText, Upload, Download, X, Activity, Scan, Image as ImageIcon, FileHeart, StickyNote } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import UnifiedDocumentUpload from "@/components/unified-document-upload"
import { ClinicBadge } from "@/components/clinic-badge"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
const BACKEND_URL = API_BASE_URL.replace('/api', '')

interface Patient {
  id: number
  first_name: string
  last_name: string
}

interface ClinicLocation {
  id: number
  name: string
  address: string
  city: string
  state: string
  zipcode: string
  phone: string
  email: string
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
  clinic?: number | null
  clinic_data?: ClinicLocation | null
}

type TabType = 'all' | 'xray' | 'dental_image' | 'scan' | 'medical_certificate' | 'note' | 'report'

export default function PatientDocumentsPage() {
  const router = useRouter()
  const params = useParams()
  const patientId = params.id as string
  const { token } = useAuth()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('all')

  useEffect(() => {
    if (!token || !patientId) return
    fetchData()
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
      const fileUrl = selectedDocument.file_url || selectedDocument.file
      // Fetch file as blob and create object URL
      fetch(fileUrl)
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob)
          setPdfBlobUrl(url)
        })
        .catch(err => {
          console.error('Failed to load file:', err)
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
      const [patientData, documentsData] = await Promise.all([
        api.getPatientById(Number.parseInt(patientId), token),
        api.getDocuments(Number.parseInt(patientId), token),
      ])

      setPatient(patientData)
      // Filter documents for this patient - ensure documentsData is an array
      const safeDocumentsData = Array.isArray(documentsData) ? documentsData : []
      const patientDocs = safeDocumentsData.filter(
        (doc: any) => doc.patient === Number.parseInt(patientId)
      )
      setDocuments(patientDocs)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      setDocuments([])
    } finally {
      setIsLoading(false)
    }
  }

  // Filter documents by active tab
  const getFilteredDocuments = () => {
    // Ensure documents is always an array
    const safeDocuments = Array.isArray(documents) ? documents : []
    
    if (activeTab === 'all') {
      // Sort by upload date, newest first
      return [...safeDocuments].sort((a, b) => 
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      )
    }
    return safeDocuments.filter(doc => doc.document_type === activeTab)
  }

  const filteredDocuments = getFilteredDocuments()

  // Count documents by type - with defensive checks
  const safeDocuments = Array.isArray(documents) ? documents : []
  const xrayCount = safeDocuments.filter(d => d.document_type === 'xray').length
  const dentalImageCount = safeDocuments.filter(d => d.document_type === 'dental_image').length
  const scanCount = safeDocuments.filter(d => d.document_type === 'scan').length
  const medCertCount = safeDocuments.filter(d => d.document_type === 'medical_certificate').length
  const noteCount = safeDocuments.filter(d => d.document_type === 'note').length
  const reportCount = safeDocuments.filter(d => d.document_type === 'report').length

  const handleDownloadImage = (fileUrl: string, filename: string) => {
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
        // Fallback to direct link
        const link = document.createElement('a')
        link.href = fileUrl
        link.download = filename
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      })
  }

  const renderDocumentCard = (doc: Document) => {
    const fileUrl = doc.file_url || doc.file
    const isImage = doc.document_type === 'xray' || doc.document_type === 'dental_image' || doc.document_type === 'scan'

    if (isImage) {
      return (
        <div
          key={doc.id}
          onClick={() => setSelectedDocument(doc)}
          className="border border-gray-200 rounded-lg p-3 hover:shadow-md cursor-pointer transition-all group"
        >
          {doc.clinic_data && (
            <div className="mb-2">
              <ClinicBadge clinic={doc.clinic_data} size="sm" />
            </div>
          )}
          <div className="relative rounded overflow-hidden mb-2 bg-gray-100">
            <img
              src={fileUrl}
              alt={doc.title}
              className="w-full h-40 object-cover"
              onError={(e) => {
                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='160'%3E%3Crect width='200' height='160' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%23999'%3ENo image%3C/text%3E%3C/svg%3E"
              }}
            />
          </div>
          {doc.title && (
            <h4 className="font-medium text-sm text-gray-900 mb-1 line-clamp-1 group-hover:text-blue-600">{doc.title}</h4>
          )}
          <p className="text-xs text-gray-500">
            {new Date(doc.uploaded_at).toLocaleDateString()}
          </p>
          {doc.description && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{doc.description}</p>
          )}
        </div>
      )
    }

    return (
      <div
        key={doc.id}
        onClick={() => setSelectedDocument(doc)}
        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
      >
        {doc.clinic_data && (
          <div className="mb-2">
            <ClinicBadge clinic={doc.clinic_data} size="sm" />
          </div>
        )}
        <div className="flex items-start gap-3">
          <FileText className="w-8 h-8 text-gray-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600">
                {doc.title || "Document"}
              </p>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded whitespace-nowrap">
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
    )
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
        <h1 className="text-3xl font-bold text-gray-900">Patient Files</h1>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Upload className="w-4 h-4" />
          Upload File
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex flex-wrap gap-2 -mb-px">
          <button
            onClick={() => setActiveTab('all')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Activity className="w-4 h-4" />
            All Files
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
              {filteredDocuments.length}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('xray')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'xray'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Scan className="w-4 h-4" />
            X-Ray
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
              {xrayCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('dental_image')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'dental_image'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Dental Pictures
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
              {dentalImageCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('scan')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'scan'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileHeart className="w-4 h-4" />
            Dental Scan
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
              {scanCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('medical_certificate')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'medical_certificate'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Medical Cert
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
              {medCertCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('note')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'note'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <StickyNote className="w-4 h-4" />
            Notes
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
              {noteCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'report'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Reports
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
              {reportCount}
            </span>
          </button>
        </div>
      </div>

      {/* Document Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {activeTab === 'all' 
              ? 'No files uploaded yet'
              : `No ${activeTab.replace('_', ' ')} files found`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map(doc => renderDocumentCard(doc))}
        </div>
      )}

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

      {/* Document Preview Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {selectedDocument.title || "Document"}
                </h3>
                {selectedDocument.description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedDocument.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                    {selectedDocument.document_type_display}
                  </span>
                  {selectedDocument.clinic_data && (
                    <ClinicBadge clinic={selectedDocument.clinic_data} size="sm" />
                  )}
                </div>
                {selectedDocument.appointment_date && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-1">Linked Appointment:</p>
                    <p className="text-xs text-gray-600">
                      {new Date(selectedDocument.appointment_date).toLocaleDateString()} at {selectedDocument.appointment_time}
                    </p>
                    {selectedDocument.service_name && (
                      <p className="text-xs text-gray-600">Service: {selectedDocument.service_name}</p>
                    )}
                    {selectedDocument.dentist_name && (
                      <p className="text-xs text-gray-600">Dentist: {selectedDocument.dentist_name}</p>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedDocument(null)}
                className="ml-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              {(selectedDocument.document_type === 'xray' || 
                selectedDocument.document_type === 'dental_image' || 
                selectedDocument.document_type === 'scan') ? (
                <img
                  src={selectedDocument.file_url || selectedDocument.file}
                  alt={selectedDocument.title}
                  className="max-w-full h-auto mx-auto"
                />
              ) : pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  className="w-full h-full min-h-[500px]"
                  title={selectedDocument.title}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Loading document...</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  const fileUrl = selectedDocument.file_url || selectedDocument.file
                  handleDownloadImage(fileUrl, selectedDocument.title || 'document')
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => setSelectedDocument(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
