"use client"

import { Calendar as CalendarIcon, Users, Clock, AlertTriangle, ChevronLeft, ChevronRight, Cake } from "lucide-react"
import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useClinic } from "@/lib/clinic-context"
import Link from "next/link"

interface Appointment {
  id: number
  date: string
  time: string
  patient_name: string
  dentist_name: string
  service_name: string | null
  service_color: string | null
  status: string
  patient_status?: 'waiting' | 'ongoing' | 'done'
}

export default function OwnerDashboard() {
  const { token, user } = useAuth()
  const { selectedClinic } = useClinic()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [totalPatients, setTotalPatients] = useState(0)
  const [activePatients, setActivePatients] = useState(0)
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([])
  const [lowStockCount, setLowStockCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch real data
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return
      
      try {
        setIsLoading(true)
        
        // Fetch patients
        const patientsResponse = await api.getPatients(token)
        // Handle both array and paginated response formats
        const patients = Array.isArray(patientsResponse) ? patientsResponse : (patientsResponse.results || [])
        setTotalPatients(patients.length)
        const active = patients.filter((p: any) => p.is_active_patient !== false).length
        setActivePatients(active)
        
        // Fetch appointments - filter by clinic if not "all"
        const clinicId = selectedClinic === "all" ? undefined : selectedClinic?.id
        const appointments = await api.getAppointments(token, clinicId)
        console.log('[Owner Dashboard] Fetched appointments:', appointments)
        console.log('[Owner Dashboard] Sample appointment dates:', appointments.slice(0, 3).map((a: any) => a.date))
        setAllAppointments(appointments)

        // Fetch low stock count
        const stockData = await api.getLowStockCount(token)
        setLowStockCount(stockData.count)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [token, selectedClinic])

  // No sample birthday data - will be filled with real data
  const birthdays: Array<{
    name: string
    date: string
    role: string
  }> = []

  // Get appointments for today (show all today's appointments)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const todayAppointments = allAppointments
    .filter(apt => apt.date === todayStr)
    .sort((a, b) => a.time.localeCompare(b.time))

  // Categorize appointments by patient status (default to pending if no status set)
  const pendingAppointments = todayAppointments.filter(apt => !apt.patient_status)
  const waitingAppointments = todayAppointments.filter(apt => apt.patient_status === 'waiting')
  const ongoingAppointments = todayAppointments.filter(apt => apt.patient_status === 'ongoing')
  const doneAppointments = todayAppointments.filter(apt => apt.patient_status === 'done')

  // Handle patient status change (waiting, ongoing, done)
  const handlePatientStatusChange = async (appointmentId: number, newPatientStatus: 'waiting' | 'ongoing' | 'done') => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      // Map patient_status to appointment status
      let appointmentStatus: string
      const updateData: any = { patient_status: newPatientStatus }
      
      if (newPatientStatus === 'waiting') {
        appointmentStatus = 'waiting'
        updateData.status = 'waiting'
      } else if (newPatientStatus === 'ongoing') {
        appointmentStatus = 'confirmed'
        updateData.status = 'confirmed'
      } else if (newPatientStatus === 'done') {
        appointmentStatus = 'completed'
        updateData.status = 'completed'
        updateData.completed_at = new Date().toISOString()
      }

      // Update backend
      await api.updateAppointment(appointmentId, updateData, token)

      // Update local state
      setAllAppointments(prevAppointments => 
        prevAppointments.map(apt => 
          apt.id === appointmentId ? { ...apt, patient_status: newPatientStatus, status: appointmentStatus } : apt
        )
      )
    } catch (error) {
      console.error('Error updating patient status:', error)
    }
  }

  // Get appointments for selected date
  const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
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
    const hasApt = allAppointments.some(apt => apt.date === dateStr)
    if (hasApt && day <= 15) { // Log only for first 15 days to avoid spam
      console.log(`[Owner Dashboard] Day ${day} (${dateStr}): Has appointment`)
    }
    return hasApt
  }

  const hasBirthday = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return birthdays.some(bd => bd.date === dateStr)
  }

  const getBirthdaysForDate = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return birthdays.filter(bd => bd.date === dateStr)
  }

  const isPastDate = (day: number) => {
    const today = new Date()
    const compareDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return compareDate < todayDate
  }

  const isToday = (day: number) => {
    const today = new Date()
    return day === today.getDate() && 
           currentMonth.getMonth() === today.getMonth() && 
           currentMonth.getFullYear() === today.getFullYear()
  }

  // Format time from HH:MM:SS or HH:MM to 12-hour format (e.g., "9:00 AM")
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
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
        <p className="text-[var(--color-text-muted)]">Welcome back, {user?.first_name || "Clinic Owner"}</p>
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
          <p className="text-2xl font-bold text-[var(--color-text)] mb-1">
            {isLoading ? "..." : lowStockCount}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">Stock Alerts</p>
        </div>
      </div>

      {/* Today's Appointments Section */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[var(--color-primary)]">Today's Appointments</h2>
          <Link href="/owner/appointments" className="text-sm text-[var(--color-primary)] hover:underline">
            View All
          </Link>
        </div>
        {isLoading ? (
          <p className="text-center py-8 text-[var(--color-text-muted)]">Loading appointments...</p>
        ) : todayAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pending Column */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Pending ({pendingAppointments.length})</h3>
              </div>
              <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {pendingAppointments.length > 0 ? (
                  pendingAppointments.map((apt) => (
                    <div key={apt.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-[var(--color-primary)]">{formatTime(apt.time)}</span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">{apt.status}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{apt.patient_name}</p>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: apt.service_color || '#6B7280' }}>
                          {apt.service_name || "Consultation"}
                        </span>
                        <div className="flex flex-col gap-1 pt-2">
                          <button onClick={() => handlePatientStatusChange(apt.id, 'waiting')} className="px-3 py-1 rounded text-[11px] font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors max-w-[120px]">Waiting</button>
                          <button onClick={() => handlePatientStatusChange(apt.id, 'ongoing')} className="px-3 py-1 rounded text-[11px] font-medium bg-yellow-50 hover:bg-yellow-100 text-yellow-700 transition-colors max-w-[120px]">Ongoing</button>
                          <button onClick={() => handlePatientStatusChange(apt.id, 'done')} className="px-3 py-1 rounded text-[11px] font-medium bg-green-50 hover:bg-green-100 text-green-700 transition-colors max-w-[120px]">Done</button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic py-4 px-4">No pending</p>
                )}
              </div>
            </div>

            {/* Waiting Column */}
            <div className="border border-yellow-200 rounded-lg overflow-hidden bg-yellow-50">
              <div className="bg-yellow-100 px-4 py-3 border-b border-yellow-200">
                <h3 className="text-sm font-semibold text-yellow-700 uppercase tracking-wide">Waiting ({waitingAppointments.length})</h3>
              </div>
              <div className="divide-y divide-yellow-200 max-h-[600px] overflow-y-auto">
                {waitingAppointments.length > 0 ? (
                  waitingAppointments.map((apt) => (
                    <div key={apt.id} className="p-4 bg-white hover:bg-yellow-50 transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-[var(--color-primary)]">{formatTime(apt.time)}</span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">{apt.status}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{apt.patient_name}</p>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: apt.service_color || '#6B7280' }}>
                          {apt.service_name || "Consultation"}
                        </span>
                        <div className="flex flex-col gap-1 pt-2">
                          <button onClick={() => handlePatientStatusChange(apt.id, 'ongoing')} className="px-3 py-1 rounded text-[11px] font-medium bg-yellow-50 hover:bg-yellow-100 text-yellow-700 transition-colors max-w-[120px]">Ongoing</button>
                          <button onClick={() => handlePatientStatusChange(apt.id, 'done')} className="px-3 py-1 rounded text-[11px] font-medium bg-green-50 hover:bg-green-100 text-green-700 transition-colors max-w-[120px]">Done</button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic py-4 px-4 bg-white">No waiting</p>
                )}
              </div>
            </div>

            {/* Ongoing Column */}
            <div className="border border-blue-200 rounded-lg overflow-hidden bg-blue-50">
              <div className="bg-blue-100 px-4 py-3 border-b border-blue-200">
                <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Ongoing ({ongoingAppointments.length})</h3>
              </div>
              <div className="divide-y divide-blue-200 max-h-[600px] overflow-y-auto">
                {ongoingAppointments.length > 0 ? (
                  ongoingAppointments.map((apt) => (
                    <div key={apt.id} className="p-4 bg-white hover:bg-blue-50 transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-[var(--color-primary)]">{formatTime(apt.time)}</span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">{apt.status}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{apt.patient_name}</p>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: apt.service_color || '#6B7280' }}>
                          {apt.service_name || "Consultation"}
                        </span>
                        <div className="flex flex-col gap-1 pt-2">
                          <button onClick={() => handlePatientStatusChange(apt.id, 'done')} className="px-3 py-1 rounded text-[11px] font-medium bg-green-50 hover:bg-green-100 text-green-700 transition-colors max-w-[120px]">Done</button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic py-4 px-4 bg-white">No ongoing</p>
                )}
              </div>
            </div>

            {/* Done Column */}
            <div className="border border-green-200 rounded-lg overflow-hidden bg-green-50">
              <div className="bg-green-100 px-4 py-3 border-b border-green-200">
                <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide">Done ({doneAppointments.length})</h3>
              </div>
              <div className="divide-y divide-green-200 max-h-[600px] overflow-y-auto">
                {doneAppointments.length > 0 ? (
                  doneAppointments.map((apt) => (
                    <div key={apt.id} className="p-4 bg-white hover:bg-green-50 transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-[var(--color-primary)]">{formatTime(apt.time)}</span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">{apt.status}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{apt.patient_name}</p>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: apt.service_color || '#6B7280' }}>
                          {apt.service_name || "Consultation"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic py-4 px-4 bg-white">No completed</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center py-8 text-[var(--color-text-muted)]">No appointments scheduled for today</p>
        )}
      </div>

      {/* Interactive Calendar - Full Width */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
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
                const isPast = isPastDate(day)
                const hasApt = !isPast && hasAppointment(day)
                const hasBd = !isPast && hasBirthday(day)
                const birthdayList = !isPast ? getBirthdaysForDate(day) : []
                
                return (
                  <button
                    key={day}
                    onClick={() => selectDate(day)}
                    className={`aspect-square p-2 rounded-lg text-sm font-medium transition-all relative ${
                      isSelectedDay(day)
                        ? "bg-[#0f766e] text-white shadow-lg"
                        : isToday(day)
                        ? "bg-green-100 text-green-700 ring-2 ring-green-500"
                        : isPast
                        ? "text-gray-400 cursor-default"
                        : hasApt || hasBd
                        ? "bg-green-50 text-[var(--color-text)] hover:bg-green-100"
                        : "text-[var(--color-text)] hover:bg-[var(--color-background)]"
                    }`}
                    title={birthdayList.length > 0 ? `Birthday: ${birthdayList.map(b => b.name).join(', ')}` : ''}
                    disabled={isPast}
                  >
                    {day}
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                      {hasApt && <div className="w-1 h-1 bg-green-700 rounded-full" />}
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
              <div className="w-3 h-3 bg-green-100 ring-2 ring-green-500 rounded" />
              <span>Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded flex items-center justify-center">
                <div className="w-1 h-1 bg-green-700 rounded-full" />
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
                        <p className="font-medium text-[var(--color-primary)]">{formatTime(apt.time)}</p>
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
    </div>
  )
}
