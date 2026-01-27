"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, FileText, Calendar, User } from "lucide-react"
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
  service_name?: string
  dentist_name?: string
  status: string
  notes: string
}

interface DentalRecord {
  id: number
  treatment: string
  diagnosis: string
  notes: string
  created_at: string
  created_by: { first_name: string; last_name: string }
  appointment: { id: number } | null
}

export default function PatientTreatmentHistoryPage() {
  const router = useRouter()
  const params = useParams()
  const patientId = params.id as string
  const { token } = useAuth()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [dentalRecords, setDentalRecords] = useState<DentalRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!token || !patientId) return
    fetchData()
  }, [token, patientId])

  const fetchData = async () => {
    if (!token) return

    try {
      setIsLoading(true)
      const [patientData, appointmentsData, dentalRecordsData] = await Promise.all([
        api.getPatientById(Number.parseInt(patientId), token),
        api.getAppointments(token),
        api.getDentalRecords(Number.parseInt(patientId), token),
      ])

      setPatient(patientData)
      const patientAppointments = appointmentsData.filter(
        (apt: any) => apt.patient?.id === Number.parseInt(patientId)
      )
      setAppointments(patientAppointments)
      setDentalRecords(dentalRecordsData)
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

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Treatment History</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-8">
          {dentalRecords.length === 0 && appointments.filter(apt => 
            apt.status === 'completed' || apt.status === 'missed' || apt.status === 'cancelled'
          ).length === 0 ? (
            <p className="text-gray-500 text-center py-12">No treatment history</p>
          ) : (
            <div className="space-y-4">
              {/* Dental Records (Completed Treatments) */}
              {dentalRecords.map((record) => (
                <div
                  key={`record-${record.id}`}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{record.treatment}</h4>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-medium text-gray-900">
                        {new Date(record.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {record.created_by && (
                      <div>
                        <p className="text-sm text-gray-500">Dentist</p>
                        <p className="font-medium text-gray-900">
                          Dr. {record.created_by.first_name} {record.created_by.last_name}
                        </p>
                      </div>
                    )}
                    {record.diagnosis && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500">Diagnosis</p>
                        <p className="font-medium text-gray-900">{record.diagnosis}</p>
                      </div>
                    )}
                  </div>
                  {record.notes && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-500">Notes</p>
                      <p className="text-gray-700 mt-1">{record.notes}</p>
                    </div>
                  )}
                </div>
              ))}

              {/* Completed Appointments without dental records */}
              {appointments
                .filter(apt => apt.status === 'completed')
                .map((apt) => {
                  const hasDentalRecord = dentalRecords.some(record => 
                    record.appointment?.id === apt.id
                  )
                  if (hasDentalRecord) return null

                  return (
                    <div
                      key={`apt-${apt.id}`}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">
                          {apt.service_name || "Appointment"}
                        </h4>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Completed
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Date</p>
                          <p className="font-medium text-gray-900">
                            {new Date(apt.date).toLocaleDateString()} at {apt.time}
                          </p>
                        </div>
                        {apt.dentist_name && (
                          <div>
                            <p className="text-sm text-gray-500">Dentist</p>
                            <p className="font-medium text-gray-900">
                              {apt.dentist_name}
                            </p>
                          </div>
                        )}
                      </div>
                      {apt.notes && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-500">Notes</p>
                          <p className="text-gray-700 mt-1">{apt.notes}</p>
                        </div>
                      )}
                    </div>
                  )
                })}

              {/* Missed Appointments */}
              {appointments
                .filter(apt => apt.status === 'missed')
                .map((apt) => (
                  <div
                    key={`missed-${apt.id}`}
                    className="border border-yellow-200 bg-yellow-50 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">
                        {apt.service_name || "Appointment"}
                      </h4>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Missed
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Scheduled Date</p>
                        <p className="font-medium text-gray-900">
                          {new Date(apt.date).toLocaleDateString()} at {apt.time}
                        </p>
                      </div>
                      {apt.dentist_name && (
                        <div>
                          <p className="text-sm text-gray-500">Dentist</p>
                          <p className="font-medium text-gray-900">
                            {apt.dentist_name}
                          </p>
                        </div>
                      )}
                    </div>
                    {apt.notes && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-500">Notes</p>
                        <p className="text-gray-700 mt-1">{apt.notes}</p>
                      </div>
                    )}
                  </div>
                ))}

              {/* Cancelled Appointments */}
              {appointments
                .filter(apt => apt.status === 'cancelled')
                .map((apt) => (
                  <div
                    key={`cancelled-${apt.id}`}
                    className="border border-red-200 bg-red-50 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">
                        {apt.service_name || "Appointment"}
                      </h4>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Cancelled
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Scheduled Date</p>
                        <p className="font-medium text-gray-900">
                          {new Date(apt.date).toLocaleDateString()} at {apt.time}
                        </p>
                      </div>
                      {apt.dentist_name && (
                        <div>
                          <p className="text-sm text-gray-500">Dentist</p>
                          <p className="font-medium text-gray-900">
                            {apt.dentist_name}
                          </p>
                        </div>
                      )}
                    </div>
                    {apt.notes && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-500">Cancellation Reason</p>
                        <p className="text-gray-700 mt-1">{apt.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
