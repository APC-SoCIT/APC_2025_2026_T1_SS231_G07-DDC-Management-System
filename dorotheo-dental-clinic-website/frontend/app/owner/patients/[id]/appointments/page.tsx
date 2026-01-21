"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Calendar } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface Patient {
  id: number
  first_name: string
  last_name: string
}

interface Appointment {
  id: number
  date: string
  time: string
  service: { name: string }
  dentist: { first_name: string; last_name: string }
  status: string
  notes: string
}

export default function PatientAppointmentsPage() {
  const router = useRouter()
  const params = useParams()
  const patientId = params.id as string
  const { token } = useAuth()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!token || !patientId) return
    fetchData()
  }, [token, patientId])

  const fetchData = async () => {
    if (!token) return

    try {
      setIsLoading(true)
      const [patientData, appointmentsData] = await Promise.all([
        api.getPatientById(Number.parseInt(patientId), token),
        api.getAppointments(token),
      ])

      setPatient(patientData)
      const patientAppointments = appointmentsData.filter(
        (apt: any) => apt.patient?.id === Number.parseInt(patientId)
      )
      setAppointments(patientAppointments)
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-500 mb-4">Patient not found</p>
        <button
          onClick={() => router.push("/owner/patients")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Patients
        </button>
      </div>
    )
  }

  const upcomingAppointments = appointments.filter(
    (apt) => new Date(`${apt.date}T${apt.time}`) >= new Date() && apt.status !== "completed" && apt.status !== "cancelled"
  )

  const pastAppointments = appointments.filter(
    (apt) => new Date(`${apt.date}T${apt.time}`) < new Date() || apt.status === "completed" || apt.status === "cancelled" || apt.status === "missed"
  )

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.push(`/owner/patients/${patientId}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to {patient.first_name} {patient.last_name} details</span>
      </button>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">All Appointments</h1>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Upcoming Appointments
          </h2>
        </div>
        <div className="p-8">
          {upcomingAppointments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No upcoming appointments</p>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">{apt.service?.name || "General Checkup"}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(apt.date).toLocaleDateString()} at {apt.time}
                      </p>
                      {apt.dentist && (
                        <p className="text-sm text-gray-600">
                          Dr. {apt.dentist.first_name} {apt.dentist.last_name}
                        </p>
                      )}
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {apt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Past Appointments */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            Past Appointments
          </h2>
        </div>
        <div className="p-8">
          {pastAppointments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No past appointments</p>
          ) : (
            <div className="space-y-3">
              {pastAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {apt.service?.name || "General Checkup"}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(apt.date).toLocaleDateString()} at {apt.time}
                      </p>
                      {apt.dentist && (
                        <p className="text-sm text-gray-600">
                          Dr. {apt.dentist.first_name} {apt.dentist.last_name}
                        </p>
                      )}
                      {apt.notes && (
                        <p className="text-sm text-gray-500 mt-2">{apt.notes}</p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        apt.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : apt.status === "missed"
                            ? "bg-yellow-100 text-yellow-800"
                            : apt.status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
