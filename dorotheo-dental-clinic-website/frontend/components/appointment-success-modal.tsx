"use client"

import { CheckCircle, Calendar, Clock, User, FileText, X, Sparkles } from "lucide-react"

interface AppointmentSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  appointmentDetails: {
    patientName: string
    date: string
    time: string
    service?: string
    dentist?: string
    notes?: string
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-500 overflow-hidden">
        {/* Decorative header gradient */}
        <div className="h-2 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500"></div>
        
        {/* Header with close button */}
        <div className="relative p-6 pb-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Icon and Message */}
        <div className="flex flex-col items-center px-6 pt-2 pb-6">
          {/* Animated success icon with sparkles */}
          <div className="relative mb-4">
            <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center animate-in zoom-in duration-700 shadow-lg">
              <CheckCircle className="w-16 h-16 text-green-600 animate-in zoom-in duration-700 delay-200" strokeWidth={2.5} />
            </div>
            <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
            <Sparkles className="w-4 h-4 text-green-400 absolute top-2 -left-2 animate-pulse delay-75" />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            Congratulations!
          </h2>
          <p className="text-gray-600 text-center mb-2 text-base">
            Your appointment has been successfully booked
          </p>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-6">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-blue-700 font-medium">
              Staff and owner have been notified
            </p>
          </div>

          {/* Appointment Details Card */}
          <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 space-y-4 border border-gray-200 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1">Patient Name</p>
                <p className="text-base font-bold text-gray-900 truncate">
                  {appointmentDetails.patientName}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1">Date</p>
                <p className="text-base font-bold text-gray-900">
                  {formatDate(appointmentDetails.date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1">Time</p>
                <p className="text-base font-bold text-gray-900">
                  {appointmentDetails.time}
                </p>
              </div>
            </div>

            {appointmentDetails.service && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                  <FileText className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1">Service</p>
                  <p className="text-base font-bold text-gray-900 truncate">
                    {appointmentDetails.service}
                  </p>
                </div>
              </div>
            )}

            {appointmentDetails.dentist && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1">Dentist</p>
                  <p className="text-base font-bold text-gray-900 truncate">
                    {appointmentDetails.dentist}
                  </p>
                </div>
              </div>
            )}

            {appointmentDetails.notes && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-gray-700 break-words">
                    {appointmentDetails.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Info message */}
          <div className="w-full mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800 text-center">
              <span className="font-semibold">Note:</span> Your appointment is pending confirmation. You'll be notified once it's confirmed by our staff.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3.5 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Done
          </button>
          <p className="text-center text-xs text-gray-500">
            You can view your appointments in the Appointments section
          </p>
        </div>
      </div>
    </div>
  )
}
