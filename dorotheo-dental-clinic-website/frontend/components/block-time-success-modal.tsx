"use client"

import { Shield, Calendar, Clock, User, X, Sparkles } from "lucide-react"

interface BlockTimeSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  blockDetails: {
    dentistName: string
    date: string
    startTime: string
    endTime: string
    reason?: string
  }
}

export default function BlockTimeSuccessModal({ 
  isOpen, 
  onClose, 
  blockDetails 
}: BlockTimeSuccessModalProps) {
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
        <div className="h-2 bg-gradient-to-r from-red-400 via-orange-500 to-yellow-500"></div>
        
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
            <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center animate-in zoom-in duration-700 shadow-lg">
              <Shield className="w-16 h-16 text-red-600 animate-in zoom-in duration-700 delay-200" strokeWidth={2.5} />
            </div>
            <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
            <Sparkles className="w-4 h-4 text-orange-400 absolute top-2 -left-2 animate-pulse delay-75" />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            Time Slot Blocked!
          </h2>
          <p className="text-gray-600 text-center mb-6 text-base">
            The time slot has been successfully blocked
          </p>

          {/* Block Details Card */}
          <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 space-y-4 border border-gray-200 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <User className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1">Dentist</p>
                <p className="text-base font-bold text-gray-900 truncate">
                  {blockDetails.dentistName}
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
                  {formatDate(blockDetails.date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1">Time Range</p>
                <p className="text-base font-bold text-gray-900">
                  {blockDetails.startTime} - {blockDetails.endTime}
                </p>
              </div>
            </div>

            {blockDetails.reason && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                  <Shield className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1">Reason</p>
                  <p className="text-sm text-gray-700 break-words">
                    {blockDetails.reason}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
