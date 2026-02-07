"use client"

import type React from "react"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth"
import RegisterModal from "@/components/register-modal"
import PasswordResetModal from "@/components/password-reset-modal"
import { Eye, EyeOff } from "lucide-react"

// Separate component for handling search params to satisfy Next.js 15 Suspense requirement
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false)
  const [resetTokenFromLink, setResetTokenFromLink] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Open reset modal automatically when a reset token is present in the URL (e.g., from email link)
  useEffect(() => {
    const token = searchParams.get("reset_token")
    if (token) {
      setResetTokenFromLink(token)
      setIsPasswordResetOpen(true)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await login(formData.username, formData.password)

      // Get user type from localStorage to redirect appropriately
      const userStr = localStorage.getItem("user")
      if (userStr) {
        const user = JSON.parse(userStr)
        // Redirect based on user type
        if (user.user_type === "patient") {
          router.push("/patient/dashboard")
        } else if (user.user_type === "staff") {
          router.push("/staff/dashboard")
        } else if (user.user_type === "owner") {
          router.push("/owner/dashboard")
        }
      }
    } catch (err) {
      setError("Invalid username or password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-background)]">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-4 mb-8">
            <div className="px-8 py-4 bg-[var(--color-primary)] rounded-xl">
              <img src="/logo.png" alt="Dorotheo Dental Clinic" className="h-16 w-auto object-contain" />
            </div>
          </Link>
          <h1 className="text-3xl font-display font-bold text-[var(--color-primary)] mb-2">Welcome Back</h1>
          <p className="text-[var(--color-text-muted)]">Sign in to access your account</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-lg border border-[var(--color-border)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Email</label>
              <input
                type="email"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => setIsPasswordResetOpen(true)}
                  className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              Don't have an account?{" "}
              <button 
                onClick={() => setIsRegisterOpen(true)}
                className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] font-medium"
              >
                Register as Patient
              </button>
            </p>
          </div>
        </div>
      </div>

      <RegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
      <PasswordResetModal
        isOpen={isPasswordResetOpen}
        onClose={() => setIsPasswordResetOpen(false)}
        initialToken={resetTokenFromLink}
      />
    </div>
  )
}

// Main page component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-background)]">
        <div className="text-[var(--color-text-muted)]">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
