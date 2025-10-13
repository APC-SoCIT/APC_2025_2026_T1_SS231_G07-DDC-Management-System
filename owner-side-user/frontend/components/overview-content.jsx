"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { patientAPI, appointmentAPI, inventoryAPI } from "@/lib/api"

const patientTrendsData = [
  { day: "D1", patients: 10 },
  { day: "D2", patients: 15 },
  { day: "D3", patients: 20 },
  { day: "D4", patients: 9 },
  { day: "D5", patients: 5 },
  { day: "D6", patients: 14 },
  { day: "D7", patients: 18 },
]

// Custom calendar component with proper design and sizing
function CustomCalendar({ onDateClick }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const days = []

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: false,
        date: new Date(year, month - 1, daysInPrevMonth - i),
      })
    }

    // Current month days
    const today = new Date()
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear()

      days.push({
        day: i,
        isCurrentMonth: true,
        isToday,
        date: new Date(year, month, i),
      })
    }

    // Next month days
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        isToday: false,
        date: new Date(year, month + 1, i),
      })
    }

    return days
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const days = getDaysInMonth(currentDate)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-[#1a4d2e]">Today</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={previousMonth}
            className="h-9 w-9 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-[#1a4d2e]" />
          </button>
          <span className="text-lg font-semibold text-[#1a4d2e] min-w-[160px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button
            onClick={nextMonth}
            className="h-9 w-9 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-[#1a4d2e]" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col">
        {/* Day names */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-gray-700 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-7 gap-2 flex-1">
          {days.map((dateObj, index) => (
            <button
              key={index}
              onClick={() => dateObj.isCurrentMonth && onDateClick && onDateClick(dateObj.date)}
              className={`
                flex items-center justify-center rounded-lg text-base font-medium transition-all
                ${dateObj.isCurrentMonth ? "text-gray-900 hover:bg-gray-100 cursor-pointer" : "text-gray-500 cursor-default"}
                ${dateObj.isToday ? "bg-[#1a4d2e] text-white hover:bg-[#1a4d2e]/90" : ""}
              `}
              disabled={!dateObj.isCurrentMonth}
            >
              {dateObj.day}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OverviewContent({ setActiveTab }) {
  const [trendView, setTrendView] = useState("weekly")
  const [patientStats, setPatientStats] = useState({
    thisWeek: 0,
    thisMonth: 0,
    total: 0
  })
  const [appointmentCounts, setAppointmentCounts] = useState({
    today: 0,
    patientsToday: 0,
    walkIns: 0
  })
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [stockAlerts, setStockAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modal state for calendar date clicks
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedDateAppointments, setSelectedDateAppointments] = useState([])
  const [loadingAppointments, setLoadingAppointments] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch patient statistics
      const patientStatsResponse = await patientAPI.getStatistics()
      setPatientStats({
        thisWeek: patientStatsResponse.this_week || 0,
        thisMonth: patientStatsResponse.this_month || 0,
        total: patientStatsResponse.total || 0
      })

      // Fetch appointment statistics
      const appointmentStatsResponse = await appointmentAPI.getStatistics()
      setAppointmentCounts({
        today: appointmentStatsResponse.today || 0,
        patientsToday: appointmentStatsResponse.today || 0, // Can be refined if you have separate patient count
        walkIns: 0 // You can calculate this if you have a status field for walk-ins
      })

      // Fetch upcoming appointments
      const upcomingResponse = await appointmentAPI.getUpcoming()
      setUpcomingAppointments(upcomingResponse.slice(0, 3)) // Get first 3
      
      // Fetch stock alerts (low stock items)
      const stockAlertsResponse = await inventoryAPI.getLowStock()
      setStockAlerts(stockAlertsResponse.slice(0, 3)) // Get first 3 alerts
      
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Handle calendar date click
  const handleDateClick = async (date) => {
    setSelectedDate(date)
    setIsModalOpen(true)
    setLoadingAppointments(true)
    
    try {
      // Fetch all appointments
      const allAppointments = await appointmentAPI.getAll()
      
      // Filter appointments for the selected date (timezone-safe)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`
      
      const filteredAppointments = allAppointments.filter(apt => {
        return apt.date === dateString
      })
      
      setSelectedDateAppointments(filteredAppointments)
    } catch (error) {
      console.error("Failed to fetch appointments for date:", error)
      setSelectedDateAppointments([])
    } finally {
      setLoadingAppointments(false)
    }
  }

  const formatSelectedDate = (date) => {
    if (!date) return ""
    
    // Format without timezone conversion
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    
    const dayName = days[date.getDay()]
    const monthName = months[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()
    
    return `${dayName}, ${monthName} ${day}, ${year}`
  }

  return (
    <div className="space-y-6">
      {/* Top Section: Calendar and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Card */}
        <div className="lg:col-span-2">
          <Card className="bg-[#c8e6c9] border-none h-full">
            <CardContent className="p-6 h-full">
              <CustomCalendar onDateClick={handleDateClick} />
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="space-y-4">
          <Card className="bg-[#c8e6c9] border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-[#1a4d2e]">Appointments Today</p>
                <button 
                  onClick={() => setActiveTab("appointments")}
                  className="text-xs text-[#1a4d2e] hover:underline"
                >
                  View all
                </button>
              </div>
              <p className="text-4xl font-bold text-[#1a4d2e]">
                {loading ? "..." : appointmentCounts.today}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#c8e6c9] border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-[#1a4d2e]">Patients Today</p>
                <button 
                  onClick={() => setActiveTab("patients")}
                  className="text-xs text-[#1a4d2e] hover:underline"
                >
                  View all
                </button>
              </div>
              <p className="text-4xl font-bold text-[#1a4d2e]">
                {loading ? "..." : patientStats.total}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#c8e6c9] border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-[#1a4d2e]">Walk-ins</p>
                <button 
                  onClick={() => setActiveTab("appointments")}
                  className="text-xs text-[#1a4d2e] hover:underline"
                >
                  View all
                </button>
              </div>
              <p className="text-4xl font-bold text-[#1a4d2e]">
                {loading ? "..." : appointmentCounts.walkIns}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Middle Section: Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Patient Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Patient Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-[#1a4d2e]">
                {loading ? "..." : patientStats.thisWeek}
              </p>
              <p className="text-sm text-gray-600">This Week</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#1a4d2e]">
                {loading ? "..." : patientStats.thisMonth}
              </p>
              <p className="text-sm text-gray-600">This Month</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#1a4d2e]">
                {loading ? "..." : patientStats.total}
              </p>
              <p className="text-sm text-gray-600">All Time</p>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-gray-600">Loading...</p>
            ) : upcomingAppointments.length === 0 ? (
              <p className="text-sm text-gray-600">No upcoming appointments</p>
            ) : (
              upcomingAppointments.map((appointment) => {
                const formatDateTime = (dateStr, timeStr) => {
                  if (!dateStr || !timeStr) return "N/A"
                  
                  const date = new Date(dateStr)
                  const today = new Date()
                  const isToday = date.toDateString() === today.toDateString()
                  
                  const dateFormat = isToday 
                    ? "Today" 
                    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  
                  return `${dateFormat} ${timeStr}`
                }

                return (
                  <div key={appointment.id} className="space-y-1">
                    <p className="font-medium text-[#1a4d2e]">
                      {appointment.reason_for_visit || appointment.treatment || "Appointment"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {appointment.patient_name || `Patient ID: ${appointment.patient}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(appointment.date, appointment.time)}
                      {appointment.end_time && ` - ${appointment.end_time}`}
                    </p>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-gray-600">Loading...</p>
            ) : stockAlerts.length === 0 ? (
              <p className="text-sm text-gray-600">No stock alerts</p>
            ) : (
              stockAlerts.map((item) => {
                const getStatusBadge = (status) => {
                  if (status === 'Critical') {
                    return (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                        Critical
                      </span>
                    )
                  } else if (status === 'Low Stock' || status === 'Low') {
                    return (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                        Low
                      </span>
                    )
                  }
                  return (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
                      {status}
                    </span>
                  )
                }

                // Capitalize first letter of each word for better formatting
                const formatItemName = (name) => {
                  if (!name) return ''
                  return name
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ')
                }

                return (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#1a4d2e] font-medium">
                        {formatItemName(item.name)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} {item.unit} remaining
                      </p>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Patient Trends Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Patient Trends</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Sunday - Saturday</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTrendView("daily")}
                className={`px-3 py-1 text-sm rounded ${
                  trendView === "daily" ? "bg-[#1a4d2e] text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setTrendView("weekly")}
                className={`px-3 py-1 text-sm rounded ${
                  trendView === "weekly" ? "bg-[#1a4d2e] text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setTrendView("monthly")}
                className={`px-3 py-1 text-sm rounded ${
                  trendView === "monthly" ? "bg-[#1a4d2e] text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={patientTrendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Bar dataKey="patients" fill="#a5d6a7" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Appointment Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#1a4d2e]">
              Appointments for {formatSelectedDate(selectedDate)}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {loadingAppointments ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-gray-600">Loading appointments...</p>
              </div>
            ) : selectedDateAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-gray-600 mb-4">No appointments scheduled for this date</p>
                <button
                  onClick={() => {
                    setIsModalOpen(false)
                    setActiveTab && setActiveTab("appointments")
                  }}
                  className="px-4 py-2 bg-[#1a4d2e] text-white rounded-lg hover:bg-[#1a4d2e]/90 transition-colors"
                >
                  Schedule an Appointment
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateAppointments.map((appointment) => (
                  <Card key={appointment.id} className="border-l-4 border-l-[#1a4d2e]">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-lg text-[#1a4d2e]">
                            {appointment.reason_for_visit || appointment.treatment || "Appointment"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Patient: {appointment.patient_name || `ID: ${appointment.patient}`}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          appointment.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                          appointment.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          appointment.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {appointment.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-gray-500">Time</p>
                          <p className="font-medium">
                            {appointment.time || "Not set"}
                            {appointment.end_time && ` - ${appointment.end_time}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Staff</p>
                          <p className="font-medium">
                            {appointment.staff_name || "Not assigned"}
                          </p>
                        </div>
                      </div>
                      
                      {appointment.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <p className="text-xs text-gray-500 mb-1">Notes</p>
                          <p className="text-sm">{appointment.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
