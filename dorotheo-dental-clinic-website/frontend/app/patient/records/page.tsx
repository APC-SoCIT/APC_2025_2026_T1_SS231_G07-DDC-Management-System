"use client"

import { useState, useEffect } from "react"
import { FileText, Calendar, User, Camera, Download, Eye, X } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface TeethImage {
  id: number
  image: string
  image_url: string
  uploaded_at: string
  uploaded_by: number
  uploaded_by_name?: string
  notes: string
  is_latest: boolean
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
}

interface DentalRecord {
  id: number
  patient: number
  appointment: number | null
  treatment: string
  diagnosis: string
  notes: string
  created_by: number
  created_by_name?: string
  created_at: string
}

export default function PatientRecords() {
  const { user, token } = useAuth()
  const [latestImage, setLatestImage] = useState<TeethImage | null>(null)
  const [previousImages, setPreviousImages] = useState<TeethImage[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [dentalRecords, setDentalRecords] = useState<DentalRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<DentalRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !token) return

      try {
        setIsLoading(true)
        
        // Fetch latest teeth image
        const latest = await api.getLatestTeethImage(user.id, token)
        setLatestImage(latest)

        // Fetch all patient teeth images
        const allImages = await api.getPatientTeethImages(user.id, token)
        setPreviousImages(allImages.filter((img: TeethImage) => !img.is_latest))

        // Fetch dental records
        const records = await api.getDentalRecords(user.id, token)
        setDentalRecords(records)

        // Fetch documents (X-rays, scans, reports)
        const docs = await api.getDocuments(user.id, token)
        setDocuments(docs)
      } catch (error) {
        console.error("Error fetching data:", error)
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
      default:
        return 'Document'
    }
  }

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'xray':
        return 'bg-blue-100 text-blue-700'
      case 'scan':
        return 'bg-purple-100 text-purple-700'
      case 'report':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const handleDownloadImage = (imageUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[var(--color-primary)] mb-2">Dental Records</h1>
        <p className="text-[var(--color-text-muted)]">Your complete dental treatment history</p>
      </div>

      {/* Treatment History - Moved to top */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-[var(--color-primary)] mb-4">Treatment History</h2>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--color-text-muted)]">Loading dental records...</p>
        </div>
      ) : dentalRecords.length > 0 ? (
        <div className="space-y-4">
          {dentalRecords.map((record) => (
            <div key={record.id} className="bg-white rounded-xl border border-[var(--color-border)] p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text)]">{record.treatment}</h3>
                    {record.diagnosis && (
                      <p className="text-sm text-[var(--color-text-muted)]">{record.diagnosis}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRecord(record)}
                  className="px-4 py-2 text-sm text-[var(--color-primary)] hover:bg-[var(--color-background)] rounded-lg transition-colors"
                >
                  View Details
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{new Date(record.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                  <User className="w-4 h-4" />
                  <span className="text-sm">Dr. {record.created_by_name || `ID ${record.created_by}`}</span>
                </div>
              </div>

              {record.notes && (
                <div className="mt-4 bg-[var(--color-background)] rounded-lg p-4">
                  <h4 className="text-sm font-medium text-[var(--color-text)] mb-2">Treatment Notes</h4>
                  <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{record.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)] opacity-30" />
          <p className="text-lg font-medium text-[var(--color-text)] mb-2">No Treatment History</p>
          <p className="text-sm text-[var(--color-text-muted)]">Your treatment records will appear here after visits</p>
        </div>
      )}

      {/* X-Rays and Documents Section */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        <h2 className="text-2xl font-serif font-bold text-[var(--color-primary)] mb-6">X-Rays & Documents</h2>
        
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto"></div>
          </div>
        ) : documents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="border border-[var(--color-border)] rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Document Type Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDocumentTypeColor(doc.document_type)}`}>
                    {getDocumentTypeLabel(doc.document_type)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSelectedDocument(doc)}
                      className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4 text-[var(--color-text-muted)]" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc.file_url || doc.file, `${doc.title}.${doc.file.split('.').pop()}`)}
                      className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-[var(--color-text-muted)]" />
                    </button>
                  </div>
                </div>

                {/* Document Preview */}
                <div className="mb-3 h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {(doc.document_type === 'xray' || doc.document_type === 'scan') ? (
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

                {/* Document Info */}
                <h3 className="font-semibold text-[var(--color-text)] mb-1 line-clamp-2">
                  {doc.title}
                </h3>
                {doc.description && (
                  <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mb-2">
                    {doc.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border)]">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)] opacity-30" />
            <p className="text-lg font-medium text-[var(--color-text)] mb-2">No Documents Yet</p>
            <p className="text-sm text-[var(--color-text-muted)]">X-rays and documents will appear here after they are uploaded</p>
          </div>
        )}
      </div>

      {/* Latest Teeth Image */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-serif font-bold text-[var(--color-primary)]">Current Teeth Image</h2>
          {latestImage && (
            <button 
              onClick={() => handleDownloadImage(latestImage.image_url, `teeth-${latestImage.uploaded_at}.jpg`)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          )}
        </div>
        
        {isLoading ? (
          <div className="text-center py-16 text-[var(--color-text-muted)]">
            <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Loading teeth images...</p>
          </div>
        ) : latestImage ? (
          <div>
            <div className="relative rounded-lg overflow-hidden mb-4 bg-gray-100">
              <img 
                src={latestImage.image_url} 
                alt="Current teeth condition" 
                className="w-full h-auto object-contain"
                onError={(e) => {
                  // Fallback for missing image
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%23999'%3ENo image available%3C/text%3E%3C/svg%3E"
                }}
              />
            </div>
            <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)] mb-2">
              <span>Uploaded: {new Date(latestImage.uploaded_at).toLocaleDateString()}</span>
              <span>ID: {latestImage.uploaded_by}</span>
            </div>
            {latestImage.notes && (
              <div className="mt-4 p-4 bg-[var(--color-background)] rounded-lg">
                <h4 className="text-sm font-medium text-[var(--color-text)] mb-2">Notes</h4>
                <p className="text-sm text-[var(--color-text-muted)]">{latestImage.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-[var(--color-text-muted)]">
            <Camera className="w-20 h-20 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No teeth images uploaded yet</p>
            <p className="text-sm mt-2">Your dentist will upload images during your visits</p>
          </div>
        )}
      </div>

      {/* Previous Images */}
      {previousImages.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <h3 className="text-xl font-serif font-bold text-[var(--color-primary)] mb-4">Previous Images</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {previousImages.map((image) => (
              <div key={image.id} className="border border-[var(--color-border)] rounded-lg p-3 hover:shadow-md transition-shadow">
                <div className="relative rounded overflow-hidden mb-2 bg-gray-100">
                  <img 
                    src={image.image_url} 
                    alt={`Teeth from ${new Date(image.uploaded_at).toLocaleDateString()}`} 
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='128'%3E%3Crect width='200' height='128' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%23999'%3ENo image%3C/text%3E%3C/svg%3E"
                    }}
                  />
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mb-1">
                  {new Date(image.uploaded_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mb-2">ID: {image.uploaded_by}</p>
                {image.notes && (
                  <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mb-2">{image.notes}</p>
                )}
                <button 
                  onClick={() => handleDownloadImage(image.image_url, `teeth-${image.uploaded_at}.jpg`)}
                  className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dental Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-serif font-bold text-[var(--color-primary)]">Dental Record Details</h2>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-[var(--color-text)] mb-2">{selectedRecord.treatment}</h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Date: {new Date(selectedRecord.created_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              {selectedRecord.diagnosis && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Diagnosis</h4>
                  <p className="text-sm text-blue-800">{selectedRecord.diagnosis}</p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-[var(--color-text)] mb-2">Dentist</h4>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[var(--color-text-muted)]" />
                  <span className="text-sm text-[var(--color-text)]">
                    Dr. {selectedRecord.created_by_name || `ID ${selectedRecord.created_by}`}
                  </span>
                </div>
              </div>

              {selectedRecord.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-text)] mb-2">Treatment Notes</h4>
                  <div className="bg-[var(--color-background)] rounded-lg p-4">
                    <p className="text-sm text-[var(--color-text-muted)] leading-relaxed whitespace-pre-wrap">
                      {selectedRecord.notes}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-[var(--color-border)]">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="w-full px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-serif font-bold text-[var(--color-primary)]">Document Details</h2>
              <button
                onClick={() => setSelectedDocument(null)}
                className="p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Document Type Badge */}
              <div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDocumentTypeColor(selectedDocument.document_type)}`}>
                  {getDocumentTypeLabel(selectedDocument.document_type)}
                </span>
              </div>

              {/* Document Title */}
              <div>
                <h3 className="text-2xl font-semibold text-[var(--color-text)] mb-2">{selectedDocument.title}</h3>
                {selectedDocument.description && (
                  <p className="text-sm text-[var(--color-text-muted)]">{selectedDocument.description}</p>
                )}
              </div>

              {/* Document Preview */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
                {(selectedDocument.document_type === 'xray' || selectedDocument.document_type === 'scan') ? (
                  <img
                    src={selectedDocument.file_url || selectedDocument.file}
                    alt={selectedDocument.title}
                    className="max-w-full max-h-[500px] object-contain rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.parentElement!.innerHTML = '<div class="text-center"><svg class="w-24 h-24 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><p class="text-gray-500">Preview not available</p></div>'
                    }}
                  />
                ) : (
                  <div className="text-center">
                    <FileText className="w-24 h-24 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">Preview not available for this file type</p>
                  </div>
                )}
              </div>

              {/* Document Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--color-border)]">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-[var(--color-text-muted)]" />
                  <span className="text-[var(--color-text-muted)]">Uploaded:</span>
                  <span className="text-[var(--color-text)] font-medium">
                    {new Date(selectedDocument.uploaded_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                {selectedDocument.uploaded_by_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <span className="text-[var(--color-text-muted)]">Uploaded by:</span>
                    <span className="text-[var(--color-text)] font-medium">{selectedDocument.uploaded_by_name}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleDownload(
                    selectedDocument.file_url || selectedDocument.file,
                    `${selectedDocument.title}.${selectedDocument.file.split('.').pop()}`
                  )}
                  className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Document
                </button>
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="px-6 py-3 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-background)] transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

