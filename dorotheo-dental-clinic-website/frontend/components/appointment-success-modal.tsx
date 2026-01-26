"use client"

import { CheckCircle, Calendar, Clock, User, FileText, X } from "lucide-react"

interface AppointmentSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  appointmentDetails: {
    patientName: string
    date: string
    time: string
    service?: string
    dentist?: string
  }
}

export default function AppointmentSuccessModal({ 
  isOpen, 
  onClose, 
  appointmentDetails 
}: AppointmentSuccessModalProps) {
  if (!isOpen) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* Header with close button */}
        <div className="relative p-6 pb-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Icon */}
        <div className="flex flex-col items-center px-6 pt-2 pb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-500 delay-150">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Appointment Created!
          </h2>
          <p className="text-gray-600 text-center mb-6">
            The appointment has been successfully scheduled
          </p>

          {/* Appointment Details */}
          <div className="w-full bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase font-medium">Patient</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {appointmentDetails.patientName}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase font-medium">Date</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDate(appointmentDetails.date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase font-medium">Time</p>
                <p className="text-sm font-semibold text-gray-900">
                  {appointmentDetails.time}
                </p>
              </div>
            </div>

            {appointmentDetails.service && (
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase font-medium">Service</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {appointmentDetails.service}
                  </p>
                </div>
              </div>
            )}

            {appointmentDetails.dentist && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase font-medium">Dentist</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {appointmentDetails.dentist}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full bg-[var(--color-primary)] text-white py-3 rounded-lg font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
