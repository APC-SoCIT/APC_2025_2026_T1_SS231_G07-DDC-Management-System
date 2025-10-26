"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { api } from "@/lib/api"

interface PasswordResetModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PasswordResetModal({ isOpen, onClose }: PasswordResetModalProps) {
  const [step, setStep] = useState<"request" | "reset">("request")
  const [email, setEmail] = useState("")
  const [token, setToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await api.requestPasswordReset(email)
      setMessage(response.message)
      // In development, the token is returned in response
      if (response.token) {
        setToken(response.token)
        setStep("reset")
        setMessage("Token generated! You can now reset your password.")
      }
    } catch (err: any) {
      setError(err.message || "Failed to request password reset")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    try {
      const response = await api.resetPassword(token, newPassword)
      setMessage(response.message)
      setTimeout(() => {
        onClose()
        // Reset form
        setStep("request")
        setEmail("")
        setToken("")
        setNewPassword("")
        setConfirmPassword("")
        setMessage("")
        setError("")
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text)]">
          {step === "request" ? "Reset Password" : "Set New Password"}
        </h2>

        {message && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {step === "request" ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
              <p className="mt-1 text-xs text-gray-500">
                We'll send you instructions to reset your password
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2 font-medium text-white hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Instructions"}
            </button>

            <button
              type="button"
              onClick={() => setStep("reset")}
              className="w-full text-sm text-[var(--color-primary)] hover:underline"
            >
              Already have a reset token?
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                Reset Token
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter reset token"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2 font-medium text-white hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <button
              type="button"
              onClick={() => setStep("request")}
              className="w-full text-sm text-[var(--color-primary)] hover:underline"
            >
              Back to request reset
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
