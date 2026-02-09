"use client"

import { CheckCircle, Calendar, Clock, User, FileText, X, Sparkles, MapPin } from "lucide-react"

interface AppointmentSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  appointmentDetails: {
    patientName: string
    date: string
    time: string
    service?: string
    dentist?: string
    clinic?: string
    notes?: string
  }
  isConfirmed?: boolean
  bookedByStaff?: boolean // If true, show "You booked" message for staff/owner
}

export default function AppointmentSuccessModal({ 
  isOpen, 
  onClose, 
  appointmentDetails,
  isConfirmed = false,
  bookedByStaff = false
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-500 overflow-hidden">
        {/* Decorative header gradient */}
        <div className="h-1.5 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500"></div>
        
        {/* Header with close button */}
        <div className="relative p-4 pb-0">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Icon and Message */}
        <div className="flex flex-col items-center px-4 pt-1 pb-3">
          {/* Animated success icon with sparkles */}
          <div className="relative mb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center animate-in zoom-in duration-700 shadow-lg">
              <CheckCircle className="w-11 h-11 text-green-600 animate-in zoom-in duration-700 delay-200" strokeWidth={2.5} />
            </div>
            <Sparkles className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
            <Sparkles className="w-3 h-3 text-green-400 absolute top-1 -left-1 animate-pulse delay-75" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1 text-center">
            {bookedByStaff ? "Appointment Booked!" : "Congratulations!"}
          </h2>
          <p className="text-gray-600 text-center mb-2 text-sm">
            {bookedByStaff 
              ? `You successfully booked an appointment for ${appointmentDetails.patientName}`
              : "Your appointment has been successfully booked"
            }
          </p>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full mb-3 ${isConfirmed ? 'bg-green-50' : 'bg-blue-50'}`}>
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isConfirmed ? 'bg-green-500' : 'bg-blue-500'}`}></div>
            <p className={`text-xs font-medium ${isConfirmed ? 'text-green-700' : 'text-blue-700'}`}>
              {isConfirmed ? 'Appointment confirmed immediately' : 'Staff and owner have been notified'}
            </p>
          </div>

          {/* Appointment Details Card */}
          <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 space-y-2.5 border border-gray-200 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <User className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wide mb-0.5">Patient Name</p>
                <p className="text-sm font-bold text-gray-900 truncate">
                  {appointmentDetails.patientName}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wide mb-0.5">Date</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatDate(appointmentDetails.date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wide mb-0.5">Time</p>
                <p className="text-sm font-bold text-gray-900">
                  {appointmentDetails.time}
                </p>
              </div>
            </div>

            {appointmentDetails.service && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                  <FileText className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wide mb-0.5">Service</p>
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {appointmentDetails.service}
                  </p>
                </div>
              </div>
            )}

            {appointmentDetails.clinic && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                  <MapPin className="w-4 h-4 text-rose-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wide mb-0.5">Clinic Location</p>
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {appointmentDetails.clinic}
                  </p>
                </div>
              </div>
            )}

            {appointmentDetails.dentist && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                  <User className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wide mb-0.5">Dentist</p>
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {appointmentDetails.dentist}
                  </p>
                </div>
              </div>
            )}

            {appointmentDetails.notes && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                  <FileText className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wide mb-0.5">Notes</p>
                  <p className="text-xs text-gray-700 break-words">
                    {appointmentDetails.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Info message */}
          {!isConfirmed && (
            <div className="w-full mt-2.5 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-[10px] text-amber-800 text-center">
                <span className="font-semibold">Note:</span> Your appointment is pending confirmation. You'll be notified once it's confirmed by our staff.
              </p>
            </div>
          )}
          {isConfirmed && (
            <div className="w-full mt-2.5 p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-[10px] text-green-800 text-center">
                <span className="font-semibold">✓ Confirmed:</span> This appointment has been confirmed and added to the schedule.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 space-y-2">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Done
          </button>
          <p className="text-center text-[10px] text-gray-500">
            You can view your appointments in the Appointments section
          </p>
        </div>
      </div>
    </div>
  )
}
