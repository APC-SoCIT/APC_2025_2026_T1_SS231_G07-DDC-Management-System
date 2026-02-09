"use client"

import { CheckCircle, AlertCircle, XCircle, Info, X } from "lucide-react"

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  type: "success" | "error" | "warning" | "info"
  title: string
  message: string
}

export default function AlertModal({ isOpen, onClose, type, title, message }: AlertModalProps) {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-12 h-12 text-green-500" />
      case "error":
        return <XCircle className="w-12 h-12 text-red-500" />
      case "warning":
        return <AlertCircle className="w-12 h-12 text-amber-500" />
      case "info":
        return <Info className="w-12 h-12 text-blue-500" />
    }
  }

  const getColors = () => {
    switch (type) {
      case "success":
        return {
          gradient: "from-green-400 via-emerald-500 to-teal-500",
          button: "bg-green-600 hover:bg-green-700",
        }
      case "error":
        return {
          gradient: "from-red-400 via-rose-500 to-pink-500",
          button: "bg-red-600 hover:bg-red-700",
        }
      case "warning":
        return {
          gradient: "from-amber-400 via-yellow-500 to-orange-500",
          button: "bg-amber-600 hover:bg-amber-700",
        }
      case "info":
        return {
          gradient: "from-blue-400 via-cyan-500 to-teal-500",
          button: "bg-blue-600 hover:bg-blue-700",
        }
    }
  }

  const colors = getColors()

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-500 overflow-hidden">
        {/* Decorative header gradient */}
        <div className={`h-1.5 bg-gradient-to-r ${colors.gradient}`}></div>

        {/* Header with close button */}
        <div className="relative p-4 pb-0">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 pt-4">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              {getIcon()}
              <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 bg-gradient-to-r ${colors.gradient}`}></div>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-center text-gray-800 mb-3">
            {title}
          </h3>

          {/* Message */}
          <p className="text-gray-600 text-center leading-relaxed whitespace-pre-line">
            {message}
          </p>

          {/* Action button */}
          <div className="mt-6">
            <button
              onClick={onClose}
              className={`w-full ${colors.button} text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 hover:shadow-lg active:scale-95`}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
