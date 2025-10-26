"use client"

import { Calendar as CalendarIcon, Users, Clock, AlertTriangle, ChevronLeft, ChevronRight, Cake } from "lucide-react"
import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import Link from "next/link"

interface Appointment {
  id: number
  date: string
  time: string
  patient_name: string
  dentist_name: string
  service_name: string | null
  status: string
}

export default function OwnerDashboard() {
  const { token } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [totalPatients, setTotalPatients] = useState(0)
  const [activePatients, setActivePatients] = useState(0)
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch real data
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return
      
      try {
        setIsLoading(true)
        
        // Fetch patients
        const patients = await api.getPatients(token)
        setTotalPatients(patients.length)
        const active = patients.filter((p: any) => p.is_active_patient !== false).length
        setActivePatients(active)
        
        // Fetch appointments
        const appointments = await api.getAppointments(token)
        setAllAppointments(appointments)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [token])

  // No sample birthday data - will be filled with real data
  const birthdays: Array<{
    name: string
    date: string
    role: string
  }> = []

  // Get appointments for today (filter out completed and missed)
  const todayStr = new Date().toISOString().split('T')[0]
  const todayAppointments = allAppointments
    .filter(apt => 
      apt.date === todayStr && 
      apt.status !== 'completed' && 
      apt.status !== 'missed'
    )
    .sort((a, b) => a.time.localeCompare(b.time))

  // Get appointments for selected date
  const selectedDateStr = selectedDate.toISOString().split('T')[0]
  const selectedDayAppointments = allAppointments.filter(apt => apt.date === selectedDateStr).sort((a, b) => a.time.localeCompare(b.time))

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const hasAppointment = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return allAppointments.some(apt => apt.date === dateStr)
  }

  const hasBirthday = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return birthdays.some(bd => bd.date === dateStr)
  }

  const getBirthdaysForDate = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return birthdays.filter(bd => bd.date === dateStr)
  }

  const isToday = (day: number) => {
    const today = new Date()
    return day === today.getDate() && 
           currentMonth.getMonth() === today.getMonth() && 
           currentMonth.getFullYear() === today.getFullYear()
  }

  const isSelectedDay = (day: number) => {
    return day === selectedDate.getDate() && 
           currentMonth.getMonth() === selectedDate.getMonth() && 
           currentMonth.getFullYear() === selectedDate.getFullYear()
  }

  const selectDate = (day: number) => {
    setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))
  }

  const daysInMonth = getDaysInMonth(currentMonth)
  const firstDay = getFirstDayOfMonth(currentMonth)
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[var(--color-primary)] mb-2">Dashboard Overview</h1>
        <p className="text-[var(--color-text-muted)]">Welcome back, Clinic Owner</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)] mb-1">{todayAppointments.length}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Appointments Today</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)] mb-1">
            {isLoading ? "..." : totalPatients}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">Total Patients</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)] mb-1">
            {isLoading ? "..." : activePatients}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">Active Patients</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)] mb-1">0</p>
          <p className="text-sm text-[var(--color-text-muted)]">Stock Alerts</p>
        </div>
      </div>

      {/* Today's Appointments Section */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--color-primary)]">Today's Appointments</h2>
          <Link href="/owner/appointments" className="text-sm text-[var(--color-primary)] hover:underline">
            View All
          </Link>
        </div>
        {isLoading ? (
          <p className="text-center py-8 text-[var(--color-text-muted)]">Loading appointments...</p>
        ) : todayAppointments.length > 0 ? (
          <div className="space-y-3">
            {todayAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[60px]">
                    <p className="text-lg font-bold text-[var(--color-primary)]">{apt.time}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--color-text)]">{apt.patient_name}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {apt.service_name || "General Consultation"}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    apt.status === "confirmed"
                      ? "bg-green-100 text-green-700"
                      : apt.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : apt.status === "completed"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {apt.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-[var(--color-text-muted)]">No appointments scheduled for today</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[var(--color-border)] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[var(--color-primary)]">Appointment Calendar</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={previousMonth}
                className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold text-[var(--color-text)] min-w-[180px] text-center">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <button 
                onClick={nextMonth}
                className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="mb-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-sm font-medium text-[var(--color-text-muted)] py-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const hasApt = hasAppointment(day)
                const hasBd = hasBirthday(day)
                const birthdayList = getBirthdaysForDate(day)
                
                return (
                  <button
                    key={day}
                    onClick={() => selectDate(day)}
                    className={`aspect-square p-2 rounded-lg text-sm font-medium transition-all relative ${
                      isSelectedDay(day)
                        ? "bg-[#0f766e] text-white shadow-lg"
                        : isToday(day)
                        ? "bg-blue-100 text-blue-700 ring-2 ring-blue-500"
                        : hasApt || hasBd
                        ? "bg-green-50 text-[var(--color-text)] hover:bg-green-100"
                        : "text-[var(--color-text)] hover:bg-[var(--color-background)]"
                    }`}
                    title={birthdayList.length > 0 ? `Birthday: ${birthdayList.map(b => b.name).join(', ')}` : ''}
                  >
                    {day}
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                      {hasApt && <div className="w-1 h-1 bg-blue-500 rounded-full" />}
                      {hasBd && <div className="w-1 h-1 bg-pink-500 rounded-full" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-100 ring-2 ring-blue-500 rounded" />
              <span>Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded flex items-center justify-center">
                <div className="w-1 h-1 bg-blue-500 rounded-full" />
              </div>
              <span>Has Appointments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded flex items-center justify-center">
                <div className="w-1 h-1 bg-pink-500 rounded-full" />
              </div>
              <span>Birthday</span>
            </div>
          </div>

          {/* Selected Date Info */}
          <div className="mt-6 border-t border-[var(--color-border)] pt-6">
            <h3 className="font-semibold text-[var(--color-text)] mb-4">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
            
            {/* Birthdays for selected date */}
            {getBirthdaysForDate(selectedDate.getDate()).length > 0 && (
              <div className="mb-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Cake className="w-4 h-4 text-pink-600" />
                  <span className="font-medium text-pink-900">Birthdays Today</span>
                </div>
                {getBirthdaysForDate(selectedDate.getDate()).map((birthday, idx) => (
                  <div key={idx} className="text-sm text-pink-800">
                    🎉 {birthday.name} ({birthday.role})
                  </div>
                ))}
              </div>
            )}

            {selectedDayAppointments.length > 0 ? (
              <div className="space-y-3">
                {selectedDayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-[var(--color-text-muted)] mb-1">Patient</p>
                        <p className="font-semibold text-[var(--color-text)]">{apt.patient_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-muted)] mb-1">Time</p>
                        <p className="font-medium text-[var(--color-primary)]">{apt.time}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-muted)] mb-1">Treatment</p>
                        <p className="text-sm text-[var(--color-text)]">
                          {apt.service_name || "General Consultation"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-muted)] mb-1">Dentist</p>
                        <p className="text-sm text-[var(--color-text)]">{apt.dentist_name}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[var(--color-text-muted)] py-8">No appointments for this date</p>
            )}
          </div>
        </div>

        {/* Patient Summary */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-6">Patient Summary</h2>
          <div className="space-y-4">
            <div className="p-4 bg-[var(--color-background)] rounded-lg">
              <p className="text-sm text-[var(--color-text-muted)] mb-1">Active Patients</p>
              <p className="text-2xl font-bold text-[var(--color-text)]">0</p>
            </div>
            <div className="p-4 bg-[var(--color-background)] rounded-lg">
              <p className="text-sm text-[var(--color-text-muted)] mb-1">Inactive Patients</p>
              <p className="text-2xl font-bold text-[var(--color-text)]">0</p>
            </div>
            <div className="p-4 bg-[var(--color-background)] rounded-lg">
              <p className="text-sm text-[var(--color-text-muted)] mb-1">New This Month</p>
              <p className="text-2xl font-bold text-[var(--color-text)]">0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
