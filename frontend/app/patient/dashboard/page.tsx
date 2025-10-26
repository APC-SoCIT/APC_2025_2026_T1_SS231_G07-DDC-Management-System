"use client"

import { useState, useEffect } from "react"
import { Calendar, FileText, Clock, AlertCircle } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import Link from "next/link"

interface Appointment {
  id: number
  date: string
  time: string
  dentist_name: string
  service_name: string | null
  status: string
}

export default function PatientDashboard() {
  const { user, token } = useAuth()
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!token) return
      
      try {
        setIsLoading(true)
        const data = await api.getAppointments(token)
        
        // Filter upcoming appointments (today or future, not cancelled)
        const today = new Date().toISOString().split('T')[0]
        const upcoming = data
          .filter((apt: Appointment) => apt.date >= today && apt.status !== 'cancelled')
          .sort((a: Appointment, b: Appointment) => {
            const dateCompare = a.date.localeCompare(b.date)
            if (dateCompare !== 0) return dateCompare
            return a.time.localeCompare(b.time)
          })
          .slice(0, 5) // Show next 5 appointments
        
        setUpcomingAppointments(upcoming)
      } catch (error) {
        console.error("Error fetching appointments:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchAppointments()
  }, [token])

  const treatmentPlans: Array<{
    id: number
    title: string
    status: string
    progress: number
  }> = []

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[var(--color-primary)] mb-2">
          Welcome Back, {user?.first_name || "Patient"}
        </h1>
        <p className="text-[var(--color-text-muted)]">Here's an overview of your dental health</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)] mb-1">{upcomingAppointments.length}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Upcoming Appointments</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)] mb-1">0</p>
          <p className="text-sm text-[var(--color-text-muted)]">Total Records</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)] mb-1">0</p>
          <p className="text-sm text-[var(--color-text-muted)]">Active Treatment Plans</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)] mb-1">PHP 0</p>
          <p className="text-sm text-[var(--color-text-muted)]">Pending Balance</p>
        </div>
      </div>

      {/* Treatment Plans */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-4">Treatment Plans</h2>
        {treatmentPlans.length > 0 ? (
          <div className="space-y-4">
            {treatmentPlans.map((plan) => (
              <div key={plan.id} className="border border-[var(--color-border)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-[var(--color-text)]">{plan.title}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      plan.status === "ongoing" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {plan.status}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-[var(--color-primary)] h-2 rounded-full" style={{ width: `${plan.progress}%` }} />
                </div>
                <p className="text-sm text-[var(--color-text-muted)] mt-2">{plan.progress}% Complete</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-[var(--color-text-muted)]">No active treatment plans</p>
        )}
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--color-primary)]">Upcoming Appointments</h2>
          <Link href="/patient/appointments" className="text-sm text-[var(--color-primary)] hover:underline">
            View All
          </Link>
        </div>
        {isLoading ? (
          <p className="text-center py-8 text-[var(--color-text-muted)]">Loading appointments...</p>
        ) : upcomingAppointments.length > 0 ? (
          <div className="space-y-4">
            {upcomingAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--color-text)]">
                      {appointment.service_name || "General Consultation"}
                    </h3>
                    <p className="text-sm text-[var(--color-text-muted)]">{appointment.dentist_name}</p>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        appointment.status === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : appointment.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : appointment.status === "completed"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {appointment.status}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-[var(--color-text)]">{formatDate(appointment.date)}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{formatTime(appointment.time)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-[var(--color-text-muted)]">No upcoming appointments</p>
        )}
      </div>
    </div>
  )
}
