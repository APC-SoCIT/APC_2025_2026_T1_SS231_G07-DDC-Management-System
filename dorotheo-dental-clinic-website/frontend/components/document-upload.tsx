"use client"

import { useState } from "react"
import { X, Upload, FileText } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface DocumentUploadProps {
  patientId: number
  patientName: string
  onClose: () => void
  onUploadSuccess: () => void
}

export default function DocumentUpload({ patientId, patientName, onClose, onUploadSuccess }: DocumentUploadProps) {
  const { token } = useAuth()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<'xray' | 'scan' | 'report' | 'other'>('xray')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError('')
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setPreviewUrl(null)
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !token) return

    if (!title.trim()) {
      setError('Please enter a title for the document')
      return
    }

    try {
      setIsUploading(true)
      setError('')

      await api.uploadDocument(patientId, selectedFile, documentType, title, description, token)

      onUploadSuccess()
      onClose()
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload document. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-serif font-bold text-[var(--color-primary)]">
              Upload Document
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              For patient: {patientName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <div className="text-red-600 font-medium text-sm">{error}</div>
            </div>
          )}

          {/* Document Type */}
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
              Document Type *
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as any)}
              className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="xray">X-Ray</option>
              <option value="scan">Tooth Scan</option>
              <option value="report">Report</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Upper Right Molar X-Ray"
              className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any relevant notes or observations..."
              rows={4}
              className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
              Select File *
            </label>
            <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-6 text-center">
              {previewUrl ? (
                <div className="space-y-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setSelectedFile(null)
                      setPreviewUrl(null)
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : selectedFile ? (
                <div className="space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-[var(--color-primary)]" />
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
                  <p className="text-sm font-medium text-[var(--color-text)] mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    PNG, JPG, PDF up to 10MB
                  </p>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[var(--color-border)]">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || !title.trim() || isUploading}
              className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload Document
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-6 py-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
