"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import * as api from "@/lib/api"
import { Clock, Play, CheckCircle, XCircle, Calendar, User, FileText, Info } from "lucide-react"

interface Treatment {
  id: number
  patient: number
  treatment_name: string
  description: string
  status: string
  assigned_dentist: number | null
  dentist_name?: string
  date_assigned: string
  scheduled_date: string | null
  completed_date: string | null
}

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled", icon: Clock, color: "blue" },
  { value: "ongoing", label: "Ongoing", icon: Play, color: "yellow" },
  { value: "completed", label: "Completed", icon: CheckCircle, color: "green" },
  { value: "cancelled", label: "Cancelled", icon: XCircle, color: "red" },
]

export default function PatientTreatmentsPage() {
  const router = useRouter()
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("all")

  useEffect(() => {
    const token = localStorage.getItem("token")
    const user = JSON.parse(localStorage.getItem("user") || "{}")

    if (!token || user.role !== "patient") {
      router.push("/")
      return
    }

    fetchTreatments()
  }, [router])

  const fetchTreatments = async () => {
    try {
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      
      if (!token) return

      const data = await api.getAssignmentsByPatient(user.id, token)
      setTreatments(data)
    } catch (error) {
      console.error("Error fetching treatments:", error)
      alert("Failed to load treatments")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status)
    if (!statusOption) return null

    const Icon = statusOption.icon
    const colorClasses = {
      blue: "bg-blue-100 text-blue-800",
      yellow: "bg-yellow-100 text-yellow-800",
      green: "bg-green-100 text-green-800",
      red: "bg-red-100 text-red-800",
    }

    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
          colorClasses[statusOption.color as keyof typeof colorClasses]
        }`}
      >
        <Icon className="w-4 h-4" />
        {statusOption.label}
      </span>
    )
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A"
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const filteredTreatments = treatments.filter((treatment) => {
    if (activeTab === "all") return true
    return treatment.status === activeTab
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your treatments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Treatment Plan</h1>
          <p className="text-gray-600">View your assigned treatments and their progress</p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">About Your Treatments</h3>
            <p className="text-sm text-blue-800">
              This page shows all treatments assigned to you by your dentist. You can view the treatment details,
              status, scheduled dates, and assigned dentist. If you have questions about any treatment,
              please contact the clinic.
            </p>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {[
                { value: "all", label: "All Treatments", count: treatments.length },
                { value: "scheduled", label: "Scheduled", count: treatments.filter(t => t.status === "scheduled").length },
                { value: "ongoing", label: "Ongoing", count: treatments.filter(t => t.status === "ongoing").length },
                { value: "completed", label: "Completed", count: treatments.filter(t => t.status === "completed").length },
                { value: "cancelled", label: "Cancelled", count: treatments.filter(t => t.status === "cancelled").length },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.value
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Treatments Grid */}
        {filteredTreatments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Treatments Found</h3>
            <p className="text-gray-600">
              {activeTab === "all"
                ? "You don't have any assigned treatments yet."
                : `You don't have any ${activeTab} treatments.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredTreatments.map((treatment) => (
              <div
                key={treatment.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* Treatment Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {treatment.treatment_name}
                    </h3>
                    {getStatusBadge(treatment.status)}
                  </div>
                </div>

                {/* Description */}
                {treatment.description && (
                  <div className="mb-4">
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {treatment.description}
                    </p>
                  </div>
                )}

                {/* Treatment Details Grid */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  {/* Assigned Dentist */}
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-0.5">Assigned Dentist</p>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {treatment.dentist_name || "Not assigned"}
                      </p>
                    </div>
                  </div>

                  {/* Date Assigned */}
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-0.5">Date Assigned</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(treatment.date_assigned)}
                      </p>
                    </div>
                  </div>

                  {/* Scheduled Date */}
                  {treatment.scheduled_date && (
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-0.5">Scheduled For</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(treatment.scheduled_date)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Completed Date */}
                  {treatment.completed_date && (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-0.5">Completed On</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(treatment.completed_date)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {treatments.length > 0 && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATUS_OPTIONS.map((status) => {
              const count = treatments.filter((t) => t.status === status.value).length
              const Icon = status.icon
              const colorClasses = {
                blue: "bg-blue-50 text-blue-600 border-blue-200",
                yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
                green: "bg-green-50 text-green-600 border-green-200",
                red: "bg-red-50 text-red-600 border-red-200",
              }

              return (
                <div
                  key={status.value}
                  className={`p-4 rounded-lg border ${
                    colorClasses[status.color as keyof typeof colorClasses]
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{status.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
