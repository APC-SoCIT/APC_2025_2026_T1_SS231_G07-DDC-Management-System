"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Upload, Download, Trash2, File, FileImage, FileText, X } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface FileAttachment {
  id: number
  patient: number
  patient_name: string
  file: string
  file_url: string
  file_extension: string
  file_type: "xray" | "photo" | "document" | "report" | "other"
  title: string
  description: string
  file_size: number
  uploaded_by: number
  uploaded_by_name: string
  uploaded_at: string
}

const FILE_TYPE_OPTIONS = [
  { value: "xray", label: "X-Ray", icon: "🦷" },
  { value: "photo", label: "Photo", icon: "📷" },
  { value: "document", label: "Document", icon: "📄" },
  { value: "report", label: "Report", icon: "📊" },
  { value: "other", label: "Other", icon: "📎" },
]

export default function StaffPatientFiles() {
  const params = useParams()
  const router = useRouter()
  const { token } = useAuth()
  const patientId = parseInt(params.id as string)

  const [files, setFiles] = useState<FileAttachment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadData, setUploadData] = useState({
    file_type: "document",
    title: "",
    description: "",
  })
  const [patientName, setPatientName] = useState("")
  const [filterType, setFilterType] = useState<string>("all")

  useEffect(() => {
    fetchFiles()
    fetchPatientInfo()
  }, [patientId, token])

  const fetchFiles = async () => {
    if (!token) return
    
    try {
      setIsLoading(true)
      const response = await api.getFilesByPatient(patientId, token)
      setFiles(response)
    } catch (error) {
      console.error("Error fetching files:", error)
      alert("Failed to load files")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPatientInfo = async () => {
    if (!token) return
    
    try {
      const response = await api.getPatients(token)
      const patient = response.find((p: any) => p.id === patientId)
      if (patient) {
        setPatientName(`${patient.first_name} ${patient.last_name}`)
      }
    } catch (error) {
      console.error("Error fetching patient info:", error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      if (!uploadData.title) {
        setUploadData({ ...uploadData, title: e.target.files[0].name })
      }
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !selectedFile) return

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("patient", patientId.toString())
      formData.append("file_type", uploadData.file_type)
      formData.append("title", uploadData.title)
      formData.append("description", uploadData.description)

      await api.uploadFile(formData, token)
      
      setShowUploadModal(false)
      setSelectedFile(null)
      setUploadData({ file_type: "document", title: "", description: "" })
      fetchFiles()
      alert("File uploaded successfully!")
    } catch (error) {
      console.error("Error uploading file:", error)
      alert("Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (fileId: number, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return
    if (!token) return

    try {
      await api.deleteFile(fileId, token)
      fetchFiles()
      alert("File deleted successfully!")
    } catch (error) {
      console.error("Error deleting file:", error)
      alert("Failed to delete file")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getFileIcon = (fileType: string, extension: string) => {
    if (fileType === "xray" || fileType === "photo" || extension.match(/\.(jpg|jpeg|png|gif|bmp)$/i)) {
      return <FileImage className="w-8 h-8 text-blue-500" />
    }
    if (extension.match(/\.(pdf)$/i)) {
      return <FileText className="w-8 h-8 text-red-500" />
    }
    return <File className="w-8 h-8 text-gray-500" />
  }

  const filteredFiles = filterType === "all" 
    ? files 
    : files.filter(f => f.file_type === filterType)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Patients
          </button>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-text)] mb-2">
                Patient Files
              </h1>
              <p className="text-[var(--color-text-muted)]">
                Patient: <span className="font-semibold text-[var(--color-primary)]">{patientName || "Loading..."}</span>
              </p>
            </div>
            
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              <Upload className="w-5 h-5" />
              Upload File
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilterType("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filterType === "all"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-white border border-[var(--color-border)] text-[var(--color-text)] hover:bg-gray-50"
              }`}
            >
              All Files ({files.length})
            </button>
            {FILE_TYPE_OPTIONS.map(type => {
              const count = files.filter(f => f.file_type === type.value).length
              return (
                <button
                  key={type.value}
                  onClick={() => setFilterType(type.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    filterType === type.value
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-white border border-[var(--color-border)] text-[var(--color-text)] hover:bg-gray-50"
                  }`}
                >
                  {type.icon} {type.label} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Files Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
              <p className="mt-4 text-[var(--color-text-muted)]">Loading files...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border border-[var(--color-border)] p-12 text-center">
              <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-[var(--color-text-muted)] mb-4">
                {filterType === "all" ? "No files uploaded yet" : `No ${filterType} files`}
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="text-[var(--color-primary)] hover:underline"
              >
                Upload your first file
              </button>
            </div>
          ) : (
            filteredFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white rounded-xl border border-[var(--color-border)] p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  {getFileIcon(file.file_type, file.file_extension)}
                  <div className="flex gap-2">
                    <a
                      href={file.file_url}
                      download
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-blue-600" />
                    </a>
                    <button
                      onClick={() => handleDelete(file.id, file.title)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-[var(--color-text)] mb-2 truncate">
                  {file.title}
                </h3>
                
                {file.description && (
                  <p className="text-sm text-[var(--color-text-muted)] mb-3 line-clamp-2">
                    {file.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-3 border-t border-[var(--color-border)]">
                  <span className="px-2 py-1 bg-gray-100 rounded">
                    {FILE_TYPE_OPTIONS.find(t => t.value === file.file_type)?.label || file.file_type}
                  </span>
                  <span>{formatFileSize(file.file_size)}</span>
                </div>

                <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                  <p>Uploaded by: {file.uploaded_by_name}</p>
                  <p>Date: {formatDate(file.uploaded_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[var(--color-text)]">Upload File</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setSelectedFile(null)
                  setUploadData({ file_type: "document", title: "", description: "" })
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  File *
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  required
                />
                {selectedFile && (
                  <p className="text-sm text-green-600 mt-2">
                    Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  File Type *
                </label>
                <select
                  value={uploadData.file_type}
                  onChange={(e) => setUploadData({ ...uploadData, file_type: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  required
                >
                  {FILE_TYPE_OPTIONS.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="Enter file title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-h-[100px]"
                  placeholder="Add any notes about this file..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload File"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false)
                    setSelectedFile(null)
                    setUploadData({ file_type: "document", title: "", description: "" })
                  }}
                  className="flex-1 px-6 py-3 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
