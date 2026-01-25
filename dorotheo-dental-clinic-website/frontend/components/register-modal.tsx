"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { api } from "@/lib/api"

interface RegisterModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function RegisterModal({ isOpen, onClose }: RegisterModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birthday: "",
    email: "",
    phone: "",
    address: "",
    password: "",
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [emailError, setEmailError] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Reset form when modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      // Clear form data when modal closes
      setFormData({
        firstName: "",
        lastName: "",
        birthday: "",
        email: "",
        phone: "",
        address: "",
        password: "",
      })
      setError("")
      setEmailError(false)
      setShowSuccess(false)
    }
  }, [isOpen])

  // Handle Escape key press to close modal
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey)
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey)
    }
  }, [isOpen, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setEmailError(false)
    setIsLoading(true)

    try {
      const registrationData = {
        username: formData.email, // Use email as username for login
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        birthday: formData.birthday,
        address: formData.address,
        user_type: "patient",
      }

      const response = await api.register(registrationData)

      // Show success message
      setShowSuccess(true)
      
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        birthday: "",
        email: "",
        phone: "",
        address: "",
        password: "",
      })
      
      // Close modal after showing success for 2 seconds
      setTimeout(() => {
        onClose()
      }, 2000)
      
    } catch (err: any) {
      // Parse error message
      let errorMessage = "Registration failed. Please try again."
      
      // Check if error has data property (from api.ts)
      const errorData = err.data || {}
      
      // Check for email-related errors
      if (errorData.email || errorData.username) {
        errorMessage = "Email already registered. Please log in or use a different email."
        setEmailError(true)
      } else if (errorData.password) {
        errorMessage = errorData.password.join(", ")
      } else if (errorData.detail) {
        errorMessage = errorData.detail
      } else if (err.message && err.message !== "Registration failed") {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      {showSuccess ? (
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[var(--color-primary)] mb-2">Registration Successful!</h3>
          <p className="text-[var(--color-text)]">You may now log in.</p>
        </div>
      ) : (
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-serif font-bold text-[var(--color-primary)]">Register as Patient</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">First Name</label>
              <input
                type="text"
                required
                pattern="[A-Za-z\s]+"
                title="Please enter letters only"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Last Name</label>
              <input
                type="text"
                required
                pattern="[A-Za-z\s]+"
                title="Please enter letters only"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Birthday</label>
              <input
                type="date"
                required
                max={new Date().toISOString().split('T')[0]}
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  setEmailError(false)
                  setError("")
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                  emailError
                    ? "border-red-500 bg-red-50 focus:ring-red-500"
                    : "border-[var(--color-border)] focus:ring-[var(--color-primary)]"
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Contact Number</label>
              <input
                type="tel"
                required
                pattern="09[0-9]{9}"
                title="Invalid contact number. Please enter a valid 11-digit mobile number."
                maxLength={11}
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "")
                  setFormData({ ...formData, phone: value })
                }}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                placeholder="09XXXXXXXXX"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Address</label>
            <textarea
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium disabled:opacity-50"
            >
              {isLoading ? "Registering..." : "Register"}
            </button>
          </div>
        </form>
      </div>
      )}
    </div>
  )
}
