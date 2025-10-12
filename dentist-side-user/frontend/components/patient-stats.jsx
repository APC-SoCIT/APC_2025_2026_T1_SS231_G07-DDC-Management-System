"use client"

import { useEffect, useState } from "react"
import { patientAPI } from "@/lib/api"

export default function PatientStats() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    newThisMonth: 0,
    upcomingVisits: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // ✅ Call the backend statistics endpoint instead of fetching all patients
        const response = await patientAPI.getStatistics()

        // Map backend fields to your frontend state
        const total = response.total || 0
        const newThisMonth = response.this_month || 0
        const active = response.this_week || 0 // you can redefine "active" however you want
        const inactive = total - active

        setStats({
          total,
          active,
          inactive,
          newThisMonth,
          upcomingVisits: 0, // could be filled from appointments API if needed
        })
      } catch (error) {
        console.error("Failed to fetch patient stats:", error)
        setStats({
          total: 0,
          active: 0,
          inactive: 0,
          newThisMonth: 0,
          upcomingVisits: 0,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statItems = [
    { label: "Total Patients", value: stats.total, bgColor: "bg-green-100" },
    { label: "Active Patients", value: stats.active, bgColor: "bg-green-100" },
    { label: "Inactive Patients", value: stats.inactive, bgColor: "bg-green-100" },
    { label: "New this month", value: stats.newThisMonth, bgColor: "bg-green-100" },
    { label: "Upcoming Visits", value: stats.upcomingVisits, bgColor: "bg-green-100" },
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
