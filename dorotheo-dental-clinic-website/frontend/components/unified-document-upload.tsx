"use client"

import { useState, useEffect } from "react"
import { X, Upload, AlertCircle, Activity, Scan, FileText, FileHeart, StickyNote, Image } from "lucide-react"
import { api } from "@/lib/api"

interface Appointment {
  id: number
  date: string
  time: string
  service_name: string
  status: string
}

interface UnifiedDocumentUploadProps {
  patientId: number
  patientName: string
  onClose: () => void
  onUploadSuccess: () => void
}

type DocumentType = 'xray' | 'scan' | 'report' | 'medical_certificate' | 'note' | 'picture'

export default function UnifiedDocumentUpload({
  patientId,
  patientName,
  onClose,
  onUploadSuccess,
}: UnifiedDocumentUploadProps) {
  const [step, setStep] = useState<'appointment' | 'type' | 'upload'>('appointment')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState<number | null>(null)
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState<string | null>(null)

  // Get token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    setToken(storedToken)
  }, [])

  // Fetch completed appointments
  useEffect(() => {
    if (!token || !patientId) return

    const fetchAppointments = async () => {
      try {
        const allAppointments = await api.getAppointments(token)

        const completedAppointments = allAppointments.filter((apt: any) => {
          const patientIdFromApi = typeof apt.patient === 'object' ? apt.patient?.id : apt.patient
          const status = (apt.status || '').toLowerCase()
          return patientIdFromApi === patientId && status === 'completed'
        })

        setAppointments(completedAppointments)
      } catch (err) {
        console.error('Failed to fetch appointments:', err)
        setError('Failed to load appointments')
      }
    }

    fetchAppointments()
  }, [token, patientId])

  const documentTypeConfig = {
    xray: { label: 'X-Ray', color: 'bg-blue-100 text-blue-900', icon: Activity },
    scan: { label: 'Dental Scan', color: 'bg-green-100 text-green-900', icon: Scan },
    picture: { label: 'Dental Pictures', color: 'bg-teal-100 text-teal-900', icon: Image },
    report: { label: 'Report', color: 'bg-yellow-100 text-yellow-900', icon: FileText },
    medical_certificate: { label: 'Medical Certificate', color: 'bg-red-100 text-red-900', icon: FileHeart },
    note: { label: 'Notes (PDF)', color: 'bg-purple-100 text-purple-900', icon: StickyNote },
  }

  const handleAppointmentSelect = (appointmentId: number) => {
    setSelectedAppointment(appointmentId)
    setStep('type')
  }

  const handleTypeSelect = (type: DocumentType) => {
    setSelectedType(type)
    setStep('upload')
  }

  const handleBackStep = () => {
    if (step === 'type') {
      setSelectedAppointment(null)
      setStep('appointment')
    } else if (step === 'upload') {
      setSelectedType(null)
      setFile(null)
      setTitle('')
      setStep('type')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!file || !selectedType || !selectedAppointment || !token) {
      setError('Please fill in all required fields')
      return
    }

    if (selectedType !== 'xray' && selectedType !== 'scan' && selectedType !== 'picture' && !title) {
      setError('Please enter a title for this document')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      if (selectedType === 'xray' || selectedType === 'scan' || selectedType === 'picture') {
        // Upload as teeth image
        await api.uploadTeethImage(
          patientId,
          file,
          '', // notes
          token,
          selectedAppointment
        )
      } else {
        // Upload as document
        const documentType = selectedType === 'note' ? 'other' : selectedType
        await api.uploadDocument(
          patientId,
          file,
          documentType,
          title,
          '', // description
          token,
          selectedAppointment
        )
      }

      setFile(null)
      setTitle('')
      setSelectedAppointment(null)
      setSelectedType(null)
      setStep('appointment')
      onUploadSuccess()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b bg-white">
          <h2 className="text-2xl font-bold text-gray-900">
            {step === 'appointment' && 'Select Appointment'}
            {step === 'type' && 'Choose Document Type'}
            {step === 'upload' && 'Upload Document'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {step === 'appointment' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="appointment-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select a completed appointment to upload documents for:
                </label>
                {appointments.length === 0 ? (
                  <div className="p-6 bg-gray-50 rounded-lg text-center">
                    <p className="text-gray-500">
                      No completed appointments found for {patientName}
                    </p>
                  </div>
                ) : (
                  <select
                    id="appointment-select"
                    value={selectedAppointment || ''}
                    onChange={(e) => setSelectedAppointment(Number(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">-- Choose an appointment --</option>
                    {appointments.map((apt) => (
                      <option key={apt.id} value={apt.id}>
                        {new Date(apt.date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        at {apt.time} - {apt.service_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {step === 'type' && (
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">Select document type:</p>
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(documentTypeConfig) as Array<[DocumentType, any]>).map(
                  ([type, config]) => {
                    const Icon = config.icon
                    return (
                      <button
                        key={type}
                        onClick={() => handleTypeSelect(type)}
                        className={`p-4 rounded-lg border-2 hover:border-blue-500 transition-all ${config.color} flex flex-col items-center gap-2`}
                      >
                        <Icon className="w-8 h-8" />
                        <p className="font-medium">{config.label}</p>
                      </button>
                    )
                  }
                )}
              </div>
            </div>
          )}

          {step === 'upload' && selectedType && (
            <div className="space-y-6">
              {/* Appointment Summary */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 uppercase font-medium">Selected Appointment</p>
                {appointments.find((apt) => apt.id === selectedAppointment) && (
                  <p className="text-sm text-gray-900 mt-2">
                    {appointments
                      .find((apt) => apt.id === selectedAppointment)
                      ?.date.split('T')[0]}{' '}
                    at{' '}
                    {appointments.find((apt) => apt.id === selectedAppointment)?.time}{' '}
                    {appointments.find((apt) => apt.id === selectedAppointment)
                      ?.service_name && (
                      <>
                        -{' '}
                        {
                          appointments.find((apt) => apt.id === selectedAppointment)
                            ?.service_name
                        }
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Document Type Summary */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 uppercase font-medium">Document Type</p>
                <p className="text-sm text-gray-900 mt-2">
                  {documentTypeConfig[selectedType].label}
                </p>
              </div>

              {/* Title Field (for non-image types) */}
              {(selectedType === 'report' || selectedType === 'medical_certificate' || selectedType === 'note') && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter document title..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Select File <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept={
                      selectedType === 'xray' || selectedType === 'scan' || selectedType === 'picture'
                        ? 'image/*'
                        : '.pdf,application/pdf'
                    }
                    className="hidden"
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-900">
                      {file ? file.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedType === 'xray' || selectedType === 'scan' || selectedType === 'picture'
                        ? 'PNG, JPG, GIF, JPEG'
                        : 'PDF files only'}
                    </p>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-between p-6 border-t bg-white gap-3">
          <button
            onClick={step === 'appointment' ? onClose : handleBackStep}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            {step === 'appointment' ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={
              step === 'appointment' 
                ? () => selectedAppointment && setStep('type')
                : step === 'type' 
                ? undefined 
                : handleUpload
            }
            disabled={
              (step === 'appointment' && !selectedAppointment) ||
              (step === 'type' && !selectedType) ||
              (step === 'upload' && (!file || isUploading)) ||
              (step === 'upload' &&
                (selectedType === 'report' ||
                  selectedType === 'medical_certificate' ||
                  selectedType === 'note') &&
                !title)
            }
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              step === 'upload'
                ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
            }`}
          >
            {step === 'upload' && isUploading ? 'Uploading...' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
