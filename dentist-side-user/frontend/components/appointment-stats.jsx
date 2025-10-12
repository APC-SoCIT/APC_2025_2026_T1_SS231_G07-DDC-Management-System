"use client"

import { useEffect, useState } from "react"
import { appointmentAPI } from "@/lib/api"

export default function AppointmentStats() {
  const [stats, setStats] = useState({
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    pending: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await appointmentAPI.getAll()
        const appointments = Array.isArray(response) ? response : response.results || []

        const total = appointments.length
        const scheduled = appointments.filter((a) => a.status === "scheduled").length
        const completed = appointments.filter((a) => a.status === "completed").length
        const cancelled = appointments.filter((a) => a.status === "cancelled").length
        const pending = appointments.filter((a) => a.status === "pending").length

        setStats({
          total,
          scheduled,
          completed,
          cancelled,
          pending,
        })
      } catch (error) {
        console.error("Failed to fetch appointment stats:", error)
        setStats({
          total: 0,
          scheduled: 0,
          completed: 0,
          cancelled: 0,
          pending: 0,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statItems = [
    { label: "Total Appointments", value: stats.total, bgColor: "bg-green-100" },
    { label: "Scheduled", value: stats.scheduled, bgColor: "bg-green-100" },
    { label: "Completed", value: stats.completed, bgColor: "bg-green-100" },
    { label: "Cancelled", value: stats.cancelled, bgColor: "bg-green-100" },
    { label: "Pending", value: stats.pending, bgColor: "bg-green-100" },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-green-100 p-4 rounded-lg animate-pulse">
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-8 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {statItems.map((stat, index) => (
        <div key={index} className={`${stat.bgColor} p-4 rounded-lg`}>
          <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
          <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
