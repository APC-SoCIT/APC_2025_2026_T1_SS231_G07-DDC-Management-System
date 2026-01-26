"use client"

import { useState, useEffect } from "react"
import { FileText, Calendar, Eye, Download, X } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

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
}

export default function Documents() {
  const { user, token } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !token) return

      try {
        setIsLoading(true)
        const docs = await api.getDocuments(user.id, token)
        setDocuments(docs)
      } catch (error) {
        console.error("Error fetching documents:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user?.id, token])

  const handleDownload = (fileUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    link.remove()
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[var(--color-primary)] mb-2">Documents</h1>
        <p className="text-[var(--color-text-muted)]">View your medical certificates, notes, and other documents</p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto"></div>
          </div>
        ) : documents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDocumentTypeColor(doc.document_type)}`}>
                    {getDocumentTypeLabel(doc.document_type)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSelectedDocument(doc)}
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

                <div className="mb-3 h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {(doc.document_type === 'xray' || doc.document_type === 'scan' || doc.document_type === 'medical_certificate' || doc.document_type === 'dental_image') ? (
                    <img
                      src={doc.file_url || doc.file}
                      alt={doc.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.parentElement!.innerHTML = '<svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>'
                      }}
                    />
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
                <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-200">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-30" />
            <p className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</p>
            <p className="text-sm text-gray-600">Medical certificates and notes will appear here</p>
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedDocument(null)}>
          <div className="relative bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedDocument.title}</h3>
                {selectedDocument.description && (
                  <p className="text-sm text-gray-600">{selectedDocument.description}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedDocument(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {(selectedDocument.document_type === 'xray' || selectedDocument.document_type === 'scan' || selectedDocument.document_type === 'medical_certificate' || selectedDocument.document_type === 'dental_image') ? (
                <img
                  src={selectedDocument.file_url || selectedDocument.file}
                  alt={selectedDocument.title}
                  className="w-full h-auto"
                />
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                  <button
                    onClick={() => handleDownload(selectedDocument.file_url || selectedDocument.file, `${selectedDocument.title}.${selectedDocument.file.split('.').pop()}`)}
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
                  >
                    Download File
                  </button>
                </div>
              )}
              <div className="mt-4 space-y-2 text-sm text-gray-700">
                {selectedDocument.document_type_display && (
                  <p><span className="font-semibold">Type:</span> {selectedDocument.document_type_display}</p>
                )}
                {selectedDocument.service_name && (
                  <p><span className="font-semibold">Service:</span> {selectedDocument.service_name}</p>
                )}
                {selectedDocument.dentist_name && (
                  <p><span className="font-semibold">Dentist:</span> {selectedDocument.dentist_name}</p>
                )}
                {formatAppointmentDateTime(selectedDocument.appointment_date, selectedDocument.appointment_time) && (
                  <p><span className="font-semibold">Appointment:</span> {formatAppointmentDateTime(selectedDocument.appointment_date, selectedDocument.appointment_time)}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
