"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calendar, User, FileText } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface ClinicalNote {
  id: number
  patient: number
  patient_name: string
  content: string
  author: number
  author_name: string
  appointment?: number
  appointment_date?: string
  created_at: string
  updated_at: string
}

export default function PatientNotes() {
  const router = useRouter()
  const { token, user } = useAuth()

  const [notes, setNotes] = useState<ClinicalNote[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchNotes()
  }, [token, user])

  const fetchNotes = async () => {
    if (!token || !user) return
    
    try {
      setIsLoading(true)
      // Patient can only see their own notes
      const response = await api.getNotesByPatient(user.id, token)
      setNotes(response)
    } catch (error) {
      console.error("Error fetching notes:", error)
      alert("Failed to load clinical notes")
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/patient")}
            className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-text)]">
                My Clinical Notes
              </h1>
              <p className="text-[var(--color-text-muted)]">
                View clinical notes and observations from your healthcare providers
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> These are read-only clinical notes created by your healthcare providers. 
              If you have questions about any note, please contact your dentist.
            </p>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
              <p className="mt-4 text-[var(--color-text-muted)]">Loading notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-[var(--color-text-muted)] mb-2 text-lg font-semibold">No clinical notes yet</p>
              <p className="text-[var(--color-text-muted)] text-sm">
                Your healthcare providers will add clinical notes after your appointments
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-xl border border-[var(--color-border)] p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{note.author_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(note.created_at)}</span>
                    </div>
                  </div>
                  
                  {note.appointment_date && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      Appointment: {new Date(note.appointment_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <div className="prose max-w-none">
                  <p className="text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </p>
                </div>
                
                {note.updated_at !== note.created_at && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-4 italic">
                    Last updated: {formatDate(note.updated_at)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Info Card */}
        {notes.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">Understanding Your Clinical Notes</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Clinical notes contain observations, diagnosis, and treatment plans from your dentist</li>
              <li>• These notes help track your dental health progress over time</li>
              <li>• You can view all your notes anytime in your patient portal</li>
              <li>• For questions about any note, contact your healthcare provider</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
