"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download, File, FileImage, FileText, FolderOpen } from "lucide-react"
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

export default function PatientFiles() {
  const router = useRouter()
  const { token, user } = useAuth()

  const [files, setFiles] = useState<FileAttachment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>("all")

  useEffect(() => {
    fetchFiles()
  }, [token, user])

  const fetchFiles = async () => {
    if (!token || !user) return
    
    try {
      setIsLoading(true)
      // Patient can only see their own files
      const response = await api.getFilesByPatient(user.id, token)
      setFiles(response)
    } catch (error) {
      console.error("Error fetching files:", error)
      alert("Failed to load files")
    } finally {
      setIsLoading(false)
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
            onClick={() => router.push("/patient")}
            className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FolderOpen className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-text)]">
                My Files
              </h1>
              <p className="text-[var(--color-text-muted)]">
                View and download your dental records and documents
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> These files were uploaded by your healthcare providers. 
              You can download any file for your personal records.
            </p>
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
              <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-[var(--color-text-muted)] mb-2 text-lg font-semibold">
                {filterType === "all" ? "No files yet" : `No ${filterType} files`}
              </p>
              <p className="text-[var(--color-text-muted)] text-sm">
                Your healthcare providers will upload files like X-rays, reports, and documents here
              </p>
            </div>
          ) : (
            filteredFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white rounded-xl border border-[var(--color-border)] p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  {getFileIcon(file.file_type, file.file_extension)}
                  <a
                    href={file.file_url}
                    download
                    className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download className="w-5 h-5 text-blue-600" />
                  </a>
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
                  <span className="px-2 py-1 bg-gray-100 rounded font-medium">
                    {FILE_TYPE_OPTIONS.find(t => t.value === file.file_type)?.label || file.file_type}
                  </span>
                  <span className="font-medium">{formatFileSize(file.file_size)}</span>
                </div>

                <div className="mt-3 text-xs text-[var(--color-text-muted)] bg-gray-50 rounded p-2">
                  <p className="font-medium">Uploaded by: {file.uploaded_by_name}</p>
                  <p>Date: {formatDate(file.uploaded_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info Card */}
        {files.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              About Your Files
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Click the download button to save any file to your device</li>
              <li>• Files include X-rays, treatment photos, reports, and documents</li>
              <li>• Keep these files for your personal dental health records</li>
              <li>• Contact your dentist if you need additional copies or have questions</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
