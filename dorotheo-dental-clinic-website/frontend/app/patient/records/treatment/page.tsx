"use client"

import { useState, useEffect } from "react"
import { FileText, Calendar, User } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { ClinicBadge } from "@/components/clinic-badge"

interface ClinicLocation {
  id: number
  name: string
  address: string
  city: string
  state: string
  zipcode: string
  phone: string
  email: string
}

interface DentalRecord {
  id: number
  patient: number
  appointment: number | null
  treatment: string
  diagnosis: string
  notes: string
  created_by: number
  created_by_name?: string
  created_at: string
  status?: string
  clinic?: number | null
  clinic_data?: ClinicLocation | null
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

export default function TreatmentHistory() {
  const { user, token } = useAuth()
  const [dentalRecords, setDentalRecords] = useState<DentalRecord[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !token) return

      try {
        setIsLoading(true)
        const [records, allAppointments] = await Promise.all([
          api.getDentalRecords(user.id, token),
          api.getAppointments(token)
        ])
        console.log("Patient ID:", user.id)
        console.log("Dental records fetched:", records)
        console.log("All appointments fetched:", allAppointments)
        setDentalRecords(records)
        // Filter appointments for current user
        const userAppointments = allAppointments.filter(
          (apt: any) => apt.patient?.id === user.id
        )
        console.log("Filtered user appointments:", userAppointments)
        console.log("Completed appointments:", userAppointments.filter((apt: any) => apt.status === 'completed'))
        console.log("Missed appointments:", userAppointments.filter((apt: any) => apt.status === 'missed'))
        console.log("Cancelled appointments:", userAppointments.filter((apt: any) => apt.status === 'cancelled'))
        setAppointments(userAppointments)
      } catch (error) {
        console.error("Error fetching dental records:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user?.id, token])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-[var(--color-primary)] mb-2">Treatment History</h1>
        <p className="text-[var(--color-text-muted)]">View all your past dental treatments and procedures</p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
            <p className="text-[var(--color-text-muted)]">Loading dental records...</p>
          </div>
        ) : dentalRecords.length > 0 || appointments.filter(apt => apt.status === 'completed' || apt.status === 'missed' || apt.status === 'cancelled').length > 0 ? (
          <div className="space-y-4">
            {/* Dental Records (Completed Treatments) */}
            {dentalRecords.map((record) => (
              <div key={`record-${record.id}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col gap-2">
                    <h4 className="font-semibold text-gray-900">{record.treatment || "Dental Treatment"}</h4>
                    {record.clinic_data && <ClinicBadge clinic={record.clinic_data} size="sm" />}
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Completed
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(record.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {record.created_by_name && (
                    <div>
                      <p className="text-sm text-gray-500">Dentist</p>
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Dr. {record.created_by_name}
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
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="text-gray-700 mt-1">{record.notes}</p>
                  </div>
                )}
              </div>
            ))}

            {/* Completed Appointments */}
            {appointments
              .filter(apt => apt.status === 'completed')
              .map((apt) => {
                const hasDentalRecord = dentalRecords.some(record => 
                  record.appointment === apt.id
                )
                if (hasDentalRecord) return null

                return (
                  <div key={`apt-${apt.id}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{apt.service?.name || "Appointment"}</h4>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-medium text-gray-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(apt.date).toLocaleDateString()} at {apt.time}
                        </p>
                      </div>
                      {apt.dentist && (
                        <div>
                          <p className="text-sm text-gray-500">Dentist</p>
                          <p className="font-medium text-gray-900 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Dr. {apt.dentist.first_name} {apt.dentist.last_name}
                          </p>
                        </div>
                      )}
                    </div>
                    {apt.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
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
                <div key={`missed-${apt.id}`} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{apt.service?.name || "Appointment"}</h4>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Missed
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Scheduled Date</p>
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(apt.date).toLocaleDateString()} at {apt.time}
                      </p>
                    </div>
                    {apt.dentist && (
                      <div>
                        <p className="text-sm text-gray-500">Dentist</p>
                        <p className="font-medium text-gray-900 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Dr. {apt.dentist.first_name} {apt.dentist.last_name}
                        </p>
                      </div>
                    )}
                  </div>
                  {apt.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
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
                <div key={`cancelled-${apt.id}`} className="border border-red-200 bg-red-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{apt.service?.name || "Appointment"}</h4>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Cancelled
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Scheduled Date</p>
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(apt.date).toLocaleDateString()} at {apt.time}
                      </p>
                    </div>
                    {apt.dentist && (
                      <div>
                        <p className="text-sm text-gray-500">Dentist</p>
                        <p className="font-medium text-gray-900 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Dr. {apt.dentist.first_name} {apt.dentist.last_name}
                        </p>
                      </div>
                    )}
                  </div>
                  {apt.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-500">Cancellation Reason</p>
                      <p className="text-gray-700 mt-1">{apt.notes}</p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-30" />
            <p className="text-lg font-medium text-gray-900 mb-2">No Treatment History</p>
            <p className="text-sm text-gray-600">Your treatment records will appear here after your dental visits</p>
          </div>
        )}
      </div>
    </div>
  )
}
