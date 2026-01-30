"use client"

import { CheckCircle, Calendar, Clock, X, Sparkles } from "lucide-react"

interface AvailabilitySuccessModalProps {
  isOpen: boolean
  onClose: () => void
  monthYear: string
  totalDays: number
}

export default function AvailabilitySuccessModal({ 
  isOpen, 
  onClose, 
  monthYear,
  totalDays
}: AvailabilitySuccessModalProps) {
  if (!isOpen) return null

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
            Success!
          </h2>
          <p className="text-gray-600 text-center mb-2 text-base">
            Your availability has been saved successfully
          </p>

          {/* Availability Details Card */}
          <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 space-y-4 border border-gray-200 shadow-sm mt-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1">Month</p>
                <p className="text-base font-bold text-gray-900">
                  {monthYear}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1">Available Days</p>
                <p className="text-base font-bold text-gray-900">
                  {totalDays} {totalDays === 1 ? 'day' : 'days'} scheduled
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
