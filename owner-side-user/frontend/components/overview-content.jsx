"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { patientAPI, appointmentAPI } from "@/lib/api"

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
function CustomCalendar() {
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
      })
    }

    // Next month days
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        isToday: false,
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
              className={`
                flex items-center justify-center rounded-lg text-base font-medium transition-all
                ${dateObj.isCurrentMonth ? "text-gray-900 hover:bg-gray-100" : "text-gray-500"}
                ${dateObj.isToday ? "bg-[#1a4d2e] text-white hover:bg-[#1a4d2e]" : ""}
              `}
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
  const [loading, setLoading] = useState(true)

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
      
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Section: Calendar and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Card */}
        <div className="lg:col-span-2">
          <Card className="bg-[#c8e6c9] border-none h-full">
            <CardContent className="p-6 h-full">
              <CustomCalendar />
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
            <div className="space-y-1">
              <p className="font-medium text-[#1a4d2e]">Root Canal</p>
              <p className="text-sm text-gray-600">Today 9:00 AM - 10:00 AM</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-[#1a4d2e]">Crown Prep</p>
              <p className="text-sm text-gray-600">May 24, 12:00 PM - 2:00 PM</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-[#1a4d2e]">Cleaning</p>
              <p className="text-sm text-gray-600">June 16, 12:00 PM - 2:00 PM</p>
            </div>
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#1a4d2e]">Dental Floss</p>
              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Low</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#1a4d2e]">Anesthetic</p>
              <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">Critical</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#1a4d2e]">Gloves</p>
              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Low</span>
            </div>
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
    </div>
  )
}
