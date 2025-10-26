"use client"

import { useState } from "react"
import { Upload, X, Camera } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface TeethImageUploadProps {
  patientId: number
  patientName: string
  onClose: () => void
  onSuccess?: () => void
}

export default function TeethImageUpload({ patientId, patientName, onClose, onSuccess }: TeethImageUploadProps) {
  const { token } = useAuth()
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string>("")

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB")
        return
      }
      
      setError("")
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    if (!selectedImage || !token) return

    setIsUploading(true)
    setError("")

    try {
      await api.uploadTeethImage(patientId, selectedImage, notes, token)
      onSuccess?.()
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to upload image")
    } finally {
      setIsUploading(false)
    }
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-2xl font-serif font-bold text-[var(--color-primary)]">
            Upload Teeth Image - {patientName}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Image Upload Area */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
              <Camera className="w-4 h-4 inline mr-1" />
              Teeth Image
            </label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full h-64 object-cover rounded-lg" />
                <button
                  onClick={() => {
                    setSelectedImage(null)
                    setImagePreview("")
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-12 text-center hover:border-[var(--color-primary)] transition-colors cursor-pointer block">
                <Upload className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
                <p className="text-sm text-[var(--color-text-muted)]">Click to upload teeth image</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">PNG, JPG up to 10MB</p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Treatment Notes */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Treatment Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add any relevant notes about this image..."
              className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedImage || isUploading}
              className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? "Uploading..." : "Upload Image"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
