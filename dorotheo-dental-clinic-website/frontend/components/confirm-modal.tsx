"use client"

import { AlertTriangle, X } from "lucide-react"

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning"
  isLoading?: boolean
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null

  const colors = variant === "danger"
    ? {
        gradient: "from-red-400 via-rose-500 to-pink-500",
        icon: "text-red-500",
        confirmBtn: "bg-red-600 hover:bg-red-700",
        glow: "from-red-400 via-rose-500 to-pink-500",
      }
    : {
        gradient: "from-amber-400 via-yellow-500 to-orange-500",
        icon: "text-amber-500",
        confirmBtn: "bg-amber-600 hover:bg-amber-700",
        glow: "from-amber-400 via-yellow-500 to-orange-500",
      }

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
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 pt-4">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <AlertTriangle className={`w-12 h-12 ${colors.icon}`} />
              <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 bg-gradient-to-r ${colors.glow}`}></div>
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

          {/* Action buttons */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 ${colors.confirmBtn} text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 hover:shadow-lg active:scale-95 disabled:opacity-50`}
            >
              {isLoading ? "Deleting..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
