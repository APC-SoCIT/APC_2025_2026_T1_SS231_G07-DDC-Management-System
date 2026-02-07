"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, Eye, EyeOff } from "lucide-react"
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
    confirmPassword: "",
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [emailError, setEmailError] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [invalidFields, setInvalidFields] = useState<string[]>([])
  const [phoneError, setPhoneError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // State for numeric month input
  const [monthInput, setMonthInput] = useState("")
  const [monthInputTimer, setMonthInputTimer] = useState<NodeJS.Timeout | null>(null)
  
  // State for numeric year input
  const [yearInput, setYearInput] = useState("")
  const [yearInputTimer, setYearInputTimer] = useState<NodeJS.Timeout | null>(null)

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
        confirmPassword: "",
      })
      setError("")
      setEmailError(false)
      setPhoneError(false)
      setShowPassword(false)
      setShowConfirmPassword(false)
      setShowSuccess(false)
      setMissingFields([])
      setInvalidFields([])
      setMonthInput("")
      setYearInput("")
      if (monthInputTimer) {
        clearTimeout(monthInputTimer)
      }
      if (yearInputTimer) {
        clearTimeout(yearInputTimer)
      }
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
    setPhoneError(false)
    setMissingFields([])
    setInvalidFields([])
    setIsLoading(true)

    // Collect all validation errors
    const missing: string[] = []
    const invalid: string[] = []
    const errors: string[] = []

    // Check for required fields
    if (!formData.firstName) missing.push('firstName')
    if (!formData.lastName) missing.push('lastName')
    if (!formData.birthday) missing.push('birthday')
    if (!formData.email) missing.push('email')
    if (!formData.phone) missing.push('phone')
    if (!formData.address) missing.push('address')
    if (!formData.password) missing.push('password')
    if (!formData.confirmPassword) missing.push('confirmPassword')

    // Validate filled fields
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    const phoneRegex = /^09[0-9]{9}$/
    const nameRegex = /^[A-Za-z\s]+$/

    // Validate first name if provided
    if (formData.firstName && !nameRegex.test(formData.firstName)) {
      invalid.push('firstName')
      errors.push('First name should only contain letters')
    }

    // Validate last name if provided
    if (formData.lastName && !nameRegex.test(formData.lastName)) {
      invalid.push('lastName')
      errors.push('Last name should only contain letters')
    }

    // Validate email if provided
    if (formData.email) {
      let emailValid = true
      
      if (!emailRegex.test(formData.email)) {
        emailValid = false
      } else {
        const emailParts = formData.email.split('@')
        if (emailParts.length !== 2) {
          emailValid = false
        } else {
          const [localPart, domainPart] = emailParts
          
          if (!localPart || !domainPart) {
            emailValid = false
          } else {
            const domainParts = domainPart.split('.')
            if (domainParts.length < 2) {
              emailValid = false
            } else {
              const tld = domainParts[domainParts.length - 1]
              if (tld.length < 2) {
                emailValid = false
              }
              if (formData.email.includes('..')) {
                emailValid = false
              }
              if (localPart.startsWith('.') || localPart.endsWith('.') || 
                  domainPart.startsWith('.') || domainPart.endsWith('.')) {
                emailValid = false
              }
            }
          }
        }
      }
      
      if (!emailValid) {
        invalid.push('email')
        setEmailError(true)
        errors.push('Invalid email address format (e.g., example@email.com)')
      }
    }

    // Validate phone if provided
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      invalid.push('phone')
      setPhoneError(true)
      errors.push('Contact number must be exactly 11 digits and start with 09')
    }

    // Validate password length if provided
    if (formData.password && formData.password.length < 8) {
      invalid.push('password')
      errors.push('Password must be at least 8 characters')
    }

    // Validate password match
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      invalid.push('confirmPassword')
      errors.push('Passwords do not match')
    }

    // Validate birthday (must be more than 6 months old and younger than 100 years)
    if (formData.birthday) {
      const birthDate = new Date(formData.birthday)
      const today = new Date()
      const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())
      const hundredYearsAgo = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate())
      
      if (birthDate > today) {
        invalid.push('birthday')
        errors.push('Birthday cannot be in the future')
      } else if (birthDate > sixMonthsAgo) {
        invalid.push('birthday')
        errors.push('Patient must be at least 6 months old to register')
      } else if (birthDate <= hundredYearsAgo) {
        invalid.push('birthday')
        errors.push('Patient must be younger than 100 years old')
      }
    }

    // If there are any missing or invalid fields, show error
    if (missing.length > 0 || invalid.length > 0) {
      setMissingFields(missing)
      setInvalidFields(invalid)
      
      let errorMessage = ''
      if (missing.length > 0 && invalid.length > 0) {
        errorMessage = 'Please fill in all required fields and fix invalid entries'
      } else if (missing.length > 0) {
        errorMessage = 'Please fill in all required fields'
      } else {
        // Show all error messages or a generic one
        if (errors.length === 1) {
          errorMessage = errors[0]
        } else if (errors.length > 1) {
          errorMessage = 'Please fix the following: ' + errors.join(', ')
        } else {
          errorMessage = 'Please fix invalid entries'
        }
      }
      
      setError(errorMessage)
      setIsLoading(false)
      return
    }

    // Validate password length (should be caught above, but double-check)
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long")
      setIsLoading(false)
      return
    }

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
        confirmPassword: "",
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
      
      // Check for specific field errors
      if (errorData.email) {
        // Check if it's a duplicate email error
        const emailErrors = Array.isArray(errorData.email) ? errorData.email : [errorData.email]
        if (emailErrors.some((msg: string) => msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists'))) {
          errorMessage = "Email already registered. Please log in or use a different email."
        } else {
          errorMessage = emailErrors.join(", ")
        }
        setEmailError(true)
      } else if (errorData.username) {
        const usernameErrors = Array.isArray(errorData.username) ? errorData.username : [errorData.username]
        if (usernameErrors.some((msg: string) => msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists'))) {
          errorMessage = "Email already registered. Please log in or use a different email."
        } else {
          errorMessage = usernameErrors.join(", ")
        }
        setEmailError(true)
      } else if (errorData.password) {
        const passwordErrors = Array.isArray(errorData.password) ? errorData.password : [errorData.password]
        errorMessage = passwordErrors.join(", ")
      } else if (errorData.phone) {
        const phoneErrors = Array.isArray(errorData.phone) ? errorData.phone : [errorData.phone]
        errorMessage = "Phone: " + phoneErrors.join(", ")
      } else if (errorData.birthday) {
        const birthdayErrors = Array.isArray(errorData.birthday) ? errorData.birthday : [errorData.birthday]
        errorMessage = "Birthday: " + birthdayErrors.join(", ")
      } else if (errorData.first_name) {
        const nameErrors = Array.isArray(errorData.first_name) ? errorData.first_name : [errorData.first_name]
        errorMessage = "First name: " + nameErrors.join(", ")
      } else if (errorData.last_name) {
        const nameErrors = Array.isArray(errorData.last_name) ? errorData.last_name : [errorData.last_name]
        errorMessage = "Last name: " + nameErrors.join(", ")
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
          <h2 className="text-2xl font-display font-bold text-[var(--color-primary)]">Register as Patient</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
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
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                  missingFields.includes('firstName') || invalidFields.includes('firstName') ? 'border-red-500 bg-red-50' : 'border-[var(--color-border)]'
                }`}
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
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                  missingFields.includes('lastName') || invalidFields.includes('lastName') ? 'border-red-500 bg-red-50' : 'border-[var(--color-border)]'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Birthday</label>
              <div className={`grid grid-cols-3 gap-2 p-2 rounded-lg ${
                missingFields.includes('birthday') || invalidFields.includes('birthday') ? 'border-2 border-red-500 bg-red-50' : ''
              }`}>
                <select
                  required
                  value={formData.birthday ? new Date(formData.birthday).getMonth() + 1 : ''}
                  onChange={(e) => {
                    const month = e.target.value
                    if (month && formData.birthday) {
                      const date = new Date(formData.birthday)
                      date.setMonth(parseInt(month) - 1)
                      setFormData({ ...formData, birthday: date.toISOString().split('T')[0] })
                    } else if (month) {
                      const year = new Date().getFullYear() - 20
                      const day = 1
                      setFormData({ ...formData, birthday: `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}` })
                    }
                  }}
                  onKeyDown={(e) => {
                    // Handle numeric input for month selection
                    if (e.key >= '0' && e.key <= '9') {
                      e.preventDefault()
                      
                      // Clear any existing timer
                      if (monthInputTimer) {
                        clearTimeout(monthInputTimer)
                      }
                      
                      const newInput = monthInput + e.key
                      const monthNum = parseInt(newInput)
                      
                      // If it's a valid month (1-12), select it
                      if (monthNum >= 1 && monthNum <= 12) {
                        setMonthInput(newInput)
                        
                        // Set a timer to clear the input after 1 second
                        const timer = setTimeout(() => {
                          setMonthInput("")
                        }, 1000)
                        setMonthInputTimer(timer)
                        
                        // Select the month
                        const month = monthNum.toString()
                        if (formData.birthday) {
                          const date = new Date(formData.birthday)
                          date.setMonth(parseInt(month) - 1)
                          setFormData({ ...formData, birthday: date.toISOString().split('T')[0] })
                        } else {
                          const year = new Date().getFullYear() - 20
                          const day = 1
                          setFormData({ ...formData, birthday: `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}` })
                        }
                      } else if (newInput.length === 1 && monthNum >= 1 && monthNum <= 9) {
                        // Single digit 1-9, wait for potential second digit
                        setMonthInput(newInput)
                        
                        // Set a timer to apply single digit month after 1 second
                        const timer = setTimeout(() => {
                          const month = monthNum.toString()
                          if (formData.birthday) {
                            const date = new Date(formData.birthday)
                            date.setMonth(parseInt(month) - 1)
                            setFormData({ ...formData, birthday: date.toISOString().split('T')[0] })
                          } else {
                            const year = new Date().getFullYear() - 20
                            const day = 1
                            setFormData({ ...formData, birthday: `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}` })
                          }
                          setMonthInput("")
                        }, 1000)
                        setMonthInputTimer(timer)
                      } else {
                        // Invalid input, reset
                        setMonthInput("")
                      }
                    } else if (e.key === 'Backspace' || e.key === 'Delete') {
                      // Allow backspace/delete to clear input
                      setMonthInput("")
                      if (monthInputTimer) {
                        clearTimeout(monthInputTimer)
                      }
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="">Month</option>
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
                <select
                  required
                  value={formData.birthday ? new Date(formData.birthday).getDate() : ''}
                  onChange={(e) => {
                    const day = e.target.value
                    if (day && formData.birthday) {
                      const date = new Date(formData.birthday)
                      date.setDate(parseInt(day))
                      setFormData({ ...formData, birthday: date.toISOString().split('T')[0] })
                    } else if (day) {
                      const year = new Date().getFullYear() - 20
                      const month = 1
                      setFormData({ ...formData, birthday: `${year}-${month.toString().padStart(2, '0')}-${day.padStart(2, '0')}` })
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                <select
                  required
                  value={formData.birthday ? new Date(formData.birthday).getFullYear() : ''}
                  onChange={(e) => {
                    const year = e.target.value
                    if (year && formData.birthday) {
                      const date = new Date(formData.birthday)
                      date.setFullYear(parseInt(year))
                      setFormData({ ...formData, birthday: date.toISOString().split('T')[0] })
                    } else if (year) {
                      const month = 1
                      const day = 1
                      setFormData({ ...formData, birthday: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` })
                    }
                  }}
                  onKeyDown={(e) => {
                    // Handle numeric input for year selection
                    if (e.key >= '0' && e.key <= '9') {
                      e.preventDefault()
                      
                      // Clear any existing timer
                      if (yearInputTimer) {
                        clearTimeout(yearInputTimer)
                      }
                      
                      const newInput = yearInput + e.key
                      
                      // Limit to 4 digits for year
                      if (newInput.length <= 4) {
                        setYearInput(newInput)
                        
                        // If we have 4 digits, immediately apply the year
                        if (newInput.length === 4) {
                          const yearNum = parseInt(newInput)
                          const currentYear = new Date().getFullYear()
                          const minYear = currentYear - 100
                          
                          // Validate year is within reasonable range
                          if (yearNum >= minYear && yearNum <= currentYear) {
                            const year = yearNum.toString()
                            if (formData.birthday) {
                              const date = new Date(formData.birthday)
                              date.setFullYear(parseInt(year))
                              setFormData({ ...formData, birthday: date.toISOString().split('T')[0] })
                            } else {
                              const month = 1
                              const day = 1
                              setFormData({ ...formData, birthday: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` })
                            }
                          }
                          setYearInput("")
                        } else {
                          // Set a timer to clear the input after 2 seconds if not completed
                          const timer = setTimeout(() => {
                            setYearInput("")
                          }, 2000)
                          setYearInputTimer(timer)
                        }
                      }
                    } else if (e.key === 'Backspace' || e.key === 'Delete') {
                      // Allow backspace/delete to clear input
                      e.preventDefault()
                      setYearInput("")
                      if (yearInputTimer) {
                        clearTimeout(yearInputTimer)
                      }
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="">Year</option>
                  {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
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
                  emailError || missingFields.includes('email') || invalidFields.includes('email')
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
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                  phoneError || missingFields.includes('phone') || invalidFields.includes('phone')
                    ? 'border-red-500 bg-red-50 focus:ring-red-500'
                    : 'border-[var(--color-border)] focus:ring-[var(--color-primary)]'
                }`}
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
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                missingFields.includes('address') || invalidFields.includes('address') ? 'border-red-500 bg-red-50' : 'border-[var(--color-border)]'
              }`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                    missingFields.includes('password') || invalidFields.includes('password') ? 'border-red-500 bg-red-50' : 'border-[var(--color-border)]'
                  }`}
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                    missingFields.includes('confirmPassword') || invalidFields.includes('confirmPassword') ? 'border-red-500 bg-red-50' : 'border-[var(--color-border)]'
                  }`}
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
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
