"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Calendar, User } from "lucide-react"
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

export default function StaffPatientNotes() {
  const params = useParams()
  const router = useRouter()
  const { token, user } = useAuth()
  const patientId = parseInt(params.id as string)

  const [notes, setNotes] = useState<ClinicalNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingNote, setEditingNote] = useState<number | null>(null)
  const [newNote, setNewNote] = useState({
    content: "",
    appointment: "",
  })
  const [editedContent, setEditedContent] = useState("")
  const [patientName, setPatientName] = useState("")

  useEffect(() => {
    fetchNotes()
    fetchPatientInfo()
  }, [patientId, token])

  const fetchNotes = async () => {
    if (!token) return
    
    try {
      setIsLoading(true)
      const response = await api.getNotesByPatient(patientId, token)
      setNotes(response)
    } catch (error) {
      console.error("Error fetching notes:", error)
      alert("Failed to load clinical notes")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPatientInfo = async () => {
    if (!token) return
    
    try {
      const response = await api.getPatients(token)
      const patient = response.find((p: any) => p.id === patientId)
      if (patient) {
        setPatientName(`${patient.first_name} ${patient.last_name}`)
      }
    } catch (error) {
      console.error("Error fetching patient info:", error)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !newNote.content.trim()) return

    try {
      await api.createClinicalNote({
        patient: patientId,
        content: newNote.content,
        appointment: newNote.appointment || null,
      }, token)
      
      setNewNote({ content: "", appointment: "" })
      setShowAddModal(false)
      fetchNotes()
      alert("Clinical note added successfully!")
    } catch (error) {
      console.error("Error adding note:", error)
      alert("Failed to add clinical note")
    }
  }

  const handleEditNote = (note: ClinicalNote) => {
    setEditingNote(note.id)
    setEditedContent(note.content)
  }

  const handleSaveEdit = async (noteId: number) => {
    if (!token || !editedContent.trim()) return

    try {
      await api.updateClinicalNote(noteId, {
        content: editedContent,
      }, token)
      
      setEditingNote(null)
      setEditedContent("")
      fetchNotes()
      alert("Note updated successfully!")
    } catch (error) {
      console.error("Error updating note:", error)
      alert("Failed to update note")
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm("Are you sure you want to delete this clinical note?")) return
    if (!token) return

    try {
      await api.deleteClinicalNote(noteId, token)
      fetchNotes()
      alert("Note deleted successfully!")
    } catch (error) {
      console.error("Error deleting note:", error)
      alert("Failed to delete note")
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
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Patients
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-text)] mb-2">
                Clinical Notes
              </h1>
              <p className="text-[var(--color-text-muted)]">
                Patient: <span className="font-semibold text-[var(--color-primary)]">{patientName || "Loading..."}</span>
              </p>
            </div>
            
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Clinical Note
            </button>
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
              <p className="text-[var(--color-text-muted)] mb-4">No clinical notes yet</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-[var(--color-primary)] hover:underline"
              >
                Add your first note
              </button>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-xl border border-[var(--color-border)] p-6 hover:shadow-lg transition-shadow"
              >
                {editingNote === note.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-h-[150px]"
                      placeholder="Enter clinical note content..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(note.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingNote(null)
                          setEditedContent("")
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{note.author_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(note.created_at)}</span>
                        </div>
                        {note.appointment_date && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            Appointment: {new Date(note.appointment_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditNote(note)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Note"
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Note"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="prose max-w-none">
                      <p className="text-[var(--color-text)] whitespace-pre-wrap">{note.content}</p>
                    </div>
                    
                    {note.updated_at !== note.created_at && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-4">
                        Last edited: {formatDate(note.updated_at)}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--color-border)]">
              <h2 className="text-2xl font-bold text-[var(--color-text)]">Add Clinical Note</h2>
            </div>
            
            <form onSubmit={handleAddNote} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Clinical Note Content *
                </label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-h-[200px]"
                  placeholder="Enter detailed clinical observations, diagnosis, treatment notes, etc..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Link to Appointment (Optional)
                </label>
                <input
                  type="number"
                  value={newNote.appointment}
                  onChange={(e) => setNewNote({ ...newNote, appointment: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="Appointment ID (if applicable)"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Optional: Enter appointment ID to link this note to a specific appointment
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                  Add Note
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewNote({ content: "", appointment: "" })
                  }}
                  className="flex-1 px-6 py-3 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
