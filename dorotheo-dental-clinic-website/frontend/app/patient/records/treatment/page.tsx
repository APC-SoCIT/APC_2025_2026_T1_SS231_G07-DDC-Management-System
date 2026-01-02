"use client"

import { useState, useEffect } from "react"
import { FileText, Calendar, User } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

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
}

export default function TreatmentHistory() {
  const { user, token } = useAuth()
  const [dentalRecords, setDentalRecords] = useState<DentalRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !token) return

      try {
        setIsLoading(true)
        const records = await api.getDentalRecords(user.id, token)
        setDentalRecords(records)
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
        <h1 className="text-3xl font-serif font-bold text-[var(--color-primary)] mb-2">Treatment History</h1>
        <p className="text-[var(--color-text-muted)]">View all your past dental treatments and procedures</p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
            <p className="text-[var(--color-text-muted)]">Loading dental records...</p>
          </div>
        ) : dentalRecords.length > 0 ? (
          <div className="space-y-4">
            {dentalRecords.map((record) => (
              <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Treatment</p>
                    <p className="font-medium text-gray-900">
                      {record.treatment || "Dental Treatment"}
                    </p>
                  </div>
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
                    <div>
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
