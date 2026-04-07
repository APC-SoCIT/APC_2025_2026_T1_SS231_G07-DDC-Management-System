"use client"

import { useEffect, useRef, useCallback } from "react"
import { CheckCircle, X, Sparkles } from "lucide-react"

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message?: string
  buttonText?: string
  /** Optional key-value details to display in a card */
  details?: { label: string; value: string }[]
  /** Optional callback fired when the primary button is clicked (before onClose) */
  onConfirm?: () => void
}

export default function SuccessModal({
  isOpen,
  onClose,
  title = "Success!",
  message = "Operation completed successfully.",
  buttonText = "Ok",
  details,
  onConfirm,
}: SuccessModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap and keyboard dismiss
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
        return
      }
      // Simple focus trap — keep focus within the modal
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      // Focus the primary button on open
      setTimeout(() => closeButtonRef.current?.focus(), 100)
      // Prevent body scroll
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm?.()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-modal-title"
      aria-describedby="success-modal-message"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-500 overflow-hidden"
      >
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
        <div className="flex flex-col items-center px-6 pt-1 pb-4">
          {/* Animated success icon with sparkles */}
          <div className="relative mb-3">
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center animate-in zoom-in duration-700 shadow-lg">
              <CheckCircle
                className="w-12 h-12 text-green-600 animate-in zoom-in duration-700 delay-200"
                strokeWidth={2.5}
              />
            </div>
            <Sparkles className="w-5 h-5 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
            <Sparkles className="w-3 h-3 text-green-400 absolute top-1 -left-1 animate-pulse delay-75" />
          </div>

          <h2
            id="success-modal-title"
            className="text-2xl font-bold text-gray-900 mb-1 text-center"
          >
            {title}
          </h2>
          <p
            id="success-modal-message"
            className="text-gray-600 text-center mb-3 text-sm"
          >
            {message}
          </p>

          {/* Optional Details Card */}
          {details && details.length > 0 && (
            <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 space-y-3 border border-gray-200 shadow-sm mb-2">
              {details.map((detail, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wide mb-0.5">
                      {detail.label}
                    </p>
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {detail.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            ref={closeButtonRef}
            onClick={handleConfirm}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}
