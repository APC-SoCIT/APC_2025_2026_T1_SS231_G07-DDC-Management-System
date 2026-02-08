"use client"

import { useState, useEffect } from "react"
import { FileText, Calendar, Eye, Download, X } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { ClinicBadge } from "@/components/clinic-badge"

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
  patient: number
  document_type: string
  file: string
  file_url?: string
  title: string
  description: string
  uploaded_by: number
  uploaded_by_name?: string
  uploaded_at: string
  appointment?: number | null
  appointment_date?: string | null
  appointment_time?: string | null
  service_name?: string | null
  dentist_name?: string | null
  document_type_display?: string
  clinic?: number | null
  clinic_data?: ClinicLocation | null
}

export default function Documents() {
  const { user, token } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !token) return

      try {
        setIsLoading(true)
        const docs = await api.getDocuments(user.id, token)
        // Ensure docs is always an array
        setDocuments(Array.isArray(docs) ? docs : [])
      } catch (error) {
        console.error("Error fetching documents:", error)
        setDocuments([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user?.id, token])

  // Fetch PDF as blob when document is selected
  useEffect(() => {
    if (selectedDocument) {
      // Fetch PDF as blob and create object URL
      fetch(selectedDocument.file_url || selectedDocument.file)
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
      // Clean up blob URL when modal closes
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

  const handleDownload = (fileUrl: string, filename: string) => {
    // Try to fetch and download the file
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
        // Fallback: open in new tab
        const link = document.createElement('a')
        link.href = fileUrl
        link.download = filename
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      })
  }

  const handleView = (doc: Document) => {
    console.log('Viewing document:', doc)
    console.log('File URL:', doc.file_url || doc.file)
    setSelectedDocument(doc)
  }

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'xray':
        return 'X-Ray'
      case 'scan':
        return 'Scan'
      case 'report':
        return 'Report'
      case 'medical_certificate':
        return 'Medical Certificate'
      case 'dental_image':
        return 'Dental Image'
      case 'note':
        return 'Note'
      default:
        return 'Document'
    }
  }

  const formatAppointmentDateTime = (date?: string | null, time?: string | null) => {
    if (!date) return null
    const dtString = time ? `${date}T${time}` : date
    const dt = new Date(dtString)
    if (Number.isNaN(dt.getTime())) return null
    return dt.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'xray':
        return 'bg-blue-100 text-blue-700'
      case 'scan':
        return 'bg-purple-100 text-purple-700'
      case 'report':
        return 'bg-green-100 text-green-700'
      case 'medical_certificate':
        return 'bg-orange-100 text-orange-700'
      case 'dental_image':
        return 'bg-teal-100 text-teal-700'
      case 'note':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // Filter documents by type - ensure documents is an array
  const safeDocuments = Array.isArray(documents) ? documents : []
  const medicalCertificates = safeDocuments.filter(doc => doc.document_type === 'medical_certificate')
  const reports = safeDocuments.filter(doc => doc.document_type === 'report')
  const notes = safeDocuments.filter(doc => doc.document_type === 'note')

  const renderDocumentCard = (doc: Document) => (
    <div
      key={doc.id}
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDocumentTypeColor(doc.document_type)} w-fit`}>
            {getDocumentTypeLabel(doc.document_type)}
          </span>
          {doc.clinic_data && <ClinicBadge clinic={doc.clinic_data} size="sm" />}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => handleView(doc)}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
            title="View"
          >
            <Eye className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => handleDownload(doc.file_url || doc.file, `${doc.title}.${doc.file.split('.').pop()}`)}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div 
        className="mb-3 h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity" 
        onClick={() => handleView(doc)}
      >
        {(doc.file_url || doc.file).match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
          <img
            src={doc.file_url || doc.file}
            alt={doc.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.currentTarget
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent) {
                const icon = document.createElement('div')
                icon.className = 'flex items-center justify-center'
                icon.innerHTML = '<svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>'
                parent.appendChild(icon)
              }
            }}
          />
        ) : (doc.file_url || doc.file).match(/\.pdf$/i) ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium text-gray-600">PDF</span>
          </div>
        ) : (
          <FileText className="w-12 h-12 text-gray-400" />
        )}
      </div>

      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
        {doc.title}
      </h3>
      {doc.description && (
        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
          {doc.description}
        </p>
      )}
      <div className="space-y-1 text-xs text-gray-600">
        {doc.service_name && (
          <p><span className="font-semibold text-gray-700">Service:</span> {doc.service_name}</p>
        )}
        {doc.dentist_name && (
          <p><span className="font-semibold text-gray-700">Dentist:</span> {doc.dentist_name}</p>
        )}
        {formatAppointmentDateTime(doc.appointment_date, doc.appointment_time) && (
          <p><span className="font-semibold text-gray-700">Appointment:</span> {formatAppointmentDateTime(doc.appointment_date, doc.appointment_time)}</p>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 mt-2 border-t border-gray-200">
        <Calendar className="w-3 h-3" />
        <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-[var(--color-primary)] mb-2">Documents</h1>
        <p className="text-[var(--color-text-muted)]">View your medical certificates, notes, and other documents</p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Medical Certificates Section */}
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Medical Certificates</h2>
                <p className="text-sm text-gray-600">Official medical documentation</p>
              </div>
            </div>
            {medicalCertificates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {medicalCertificates.map((doc) => renderDocumentCard(doc))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm py-4">No medical certificates</p>
            )}
          </div>

          {/* Reports Section */}
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Reports</h2>
                <p className="text-sm text-gray-600">Treatment and examination reports</p>
              </div>
            </div>
            {reports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {reports.map((doc) => renderDocumentCard(doc))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm py-4">No reports</p>
            )}
          </div>

          {/* Notes Section */}
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Notes (PDF)</h2>
                <p className="text-sm text-gray-600">Additional notes and documentation</p>
              </div>
            </div>
            {notes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {notes.map((doc) => renderDocumentCard(doc))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm py-4">No notes</p>
            )}
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDocument && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" 
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
                {selectedDocument.description && (
                  <p className="text-sm text-gray-600">{selectedDocument.description}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedDocument(null)}
                className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Document Info */}
            {formatAppointmentDateTime(selectedDocument.appointment_date, selectedDocument.appointment_time) && (
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                <p className="text-sm font-medium text-gray-700 mb-1">Linked Appointment:</p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span>
                    <strong>Date:</strong> {formatAppointmentDateTime(selectedDocument.appointment_date, selectedDocument.appointment_time)}
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

            {/* Document Viewer */}
            <div className="flex-1 overflow-auto bg-gray-100">
              {(selectedDocument.file_url || selectedDocument.file).match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <div className="flex items-center justify-center p-4 h-full">
                  <img
                    src={selectedDocument.file_url || selectedDocument.file}
                    alt={selectedDocument.title}
                    className="max-w-full max-h-full h-auto object-contain"
                    onError={(e) => {
                      console.error('Image failed to load:', selectedDocument.file_url || selectedDocument.file)
                      const target = e.currentTarget
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = `
                          <div class="text-center py-12">
                            <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <p class="text-gray-600 mb-4">Unable to load image</p>
                            <button class="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors" onclick="window.open('${selectedDocument.file_url || selectedDocument.file}', '_blank')">
                              Open in New Tab
                            </button>
                          </div>
                        `
                      }
                    }}
                  />
                </div>
              ) : pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  className="w-full h-full border-0"
                  title={selectedDocument.title || "Document Preview"}
                  style={{ minHeight: '600px' }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-4">Loading document...</p>
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
