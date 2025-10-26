"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Calendar, User, CheckCircle, Clock, Play, XCircle } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface TreatmentAssignment {
  id: number
  patient: number
  patient_name: string
  treatment_name: string
  description: string
  status: "scheduled" | "ongoing" | "completed" | "cancelled"
  assigned_by: number
  assigned_by_name: string
  assigned_dentist?: number
  assigned_dentist_name?: string
  date_assigned: string
  scheduled_date?: string
  completed_date?: string
}

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled", icon: Clock, color: "blue" },
  { value: "ongoing", label: "Ongoing", icon: Play, color: "yellow" },
  { value: "completed", label: "Completed", icon: CheckCircle, color: "green" },
  { value: "cancelled", label: "Cancelled", icon: XCircle, color: "red" },
]

export default function StaffPatientTreatments() {
  const params = useParams()
  const router = useRouter()
  const { token, user } = useAuth()
  const patientId = parseInt(params.id as string)

  const [treatments, setTreatments] = useState<TreatmentAssignment[]>([])
  const [dentists, setDentists] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTreatment, setEditingTreatment] = useState<number | null>(null)
  const [newTreatment, setNewTreatment] = useState({
    treatment_name: "",
    description: "",
    status: "scheduled",
    assigned_dentist: "",
    scheduled_date: "",
  })
  const [editedData, setEditedData] = useState<any>({})
  const [patientName, setPatientName] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  useEffect(() => {
    fetchTreatments()
    fetchPatientInfo()
    fetchDentists()
  }, [patientId, token])

  const fetchTreatments = async () => {
    if (!token) return
    
    try {
      setIsLoading(true)
      const response = await api.getAssignmentsByPatient(patientId, token)
      setTreatments(response)
    } catch (error) {
      console.error("Error fetching treatments:", error)
      alert("Failed to load treatments")
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

  const fetchDentists = async () => {
    if (!token) return
    
    try {
      const response = await api.getStaff(token)
      setDentists(response)
    } catch (error) {
      console.error("Error fetching dentists:", error)
    }
  }

  const handleAddTreatment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    try {
      await api.createTreatmentAssignment({
        patient: patientId,
        treatment_name: newTreatment.treatment_name,
        description: newTreatment.description,
        status: newTreatment.status,
        assigned_dentist: newTreatment.assigned_dentist || null,
        scheduled_date: newTreatment.scheduled_date || null,
      }, token)
      
      setNewTreatment({
        treatment_name: "",
        description: "",
        status: "scheduled",
        assigned_dentist: "",
        scheduled_date: "",
      })
      setShowAddModal(false)
      fetchTreatments()
      alert("Treatment assigned successfully!")
    } catch (error) {
      console.error("Error adding treatment:", error)
      alert("Failed to assign treatment")
    }
  }

  const handleEditTreatment = (treatment: TreatmentAssignment) => {
    setEditingTreatment(treatment.id)
    setEditedData({
      treatment_name: treatment.treatment_name,
      description: treatment.description,
      status: treatment.status,
      assigned_dentist: treatment.assigned_dentist || "",
      scheduled_date: treatment.scheduled_date || "",
    })
  }

  const handleSaveEdit = async (treatmentId: number) => {
    if (!token) return

    try {
      await api.updateTreatmentAssignment(treatmentId, editedData, token)
      
      setEditingTreatment(null)
      setEditedData({})
      fetchTreatments()
      alert("Treatment updated successfully!")
    } catch (error) {
      console.error("Error updating treatment:", error)
      alert("Failed to update treatment")
    }
  }

  const handleStatusChange = async (treatmentId: number, newStatus: string) => {
    if (!token) return

    try {
      await api.updateTreatmentStatus(treatmentId, newStatus, token)
      fetchTreatments()
      alert("Status updated successfully!")
    } catch (error) {
      console.error("Error updating status:", error)
      alert("Failed to update status")
    }
  }

  const handleDeleteTreatment = async (treatmentId: number, treatmentName: string) => {
    if (!confirm(`Are you sure you want to delete "${treatmentName}"?`)) return
    if (!token) return

    try {
      await api.deleteTreatmentAssignment(treatmentId, token)
      fetchTreatments()
      alert("Treatment deleted successfully!")
    } catch (error) {
      console.error("Error deleting treatment:", error)
      alert("Failed to delete treatment")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status)
    if (!statusOption) return null

    const Icon = statusOption.icon
    const colorClasses = {
      blue: "bg-blue-100 text-blue-700",
      yellow: "bg-yellow-100 text-yellow-700",
      green: "bg-green-100 text-green-700",
      red: "bg-red-100 text-red-700",
    }

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${colorClasses[statusOption.color as keyof typeof colorClasses]}`}>
        <Icon className="w-4 h-4" />
        {statusOption.label}
      </span>
    )
  }

  const filteredTreatments = filterStatus === "all" 
    ? treatments 
    : treatments.filter(t => t.status === filterStatus)

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
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-text)] mb-2">
                Treatment Assignments
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
              Assign Treatment
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filterStatus === "all"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-white border border-[var(--color-border)] text-[var(--color-text)] hover:bg-gray-50"
              }`}
            >
              All ({treatments.length})
            </button>
            {STATUS_OPTIONS.map(status => {
              const count = treatments.filter(t => t.status === status.value).length
              const Icon = status.icon
              return (
                <button
                  key={status.value}
                  onClick={() => setFilterStatus(status.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    filterStatus === status.value
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-white border border-[var(--color-border)] text-[var(--color-text)] hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {status.label} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Treatments List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
              <p className="mt-4 text-[var(--color-text-muted)]">Loading treatments...</p>
            </div>
          ) : filteredTreatments.length === 0 ? (
            <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center">
              <p className="text-[var(--color-text-muted)] mb-4">
                {filterStatus === "all" ? "No treatments assigned yet" : `No ${filterStatus} treatments`}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-[var(--color-primary)] hover:underline"
              >
                Assign first treatment
              </button>
            </div>
          ) : (
            filteredTreatments.map((treatment) => (
              <div
                key={treatment.id}
                className="bg-white rounded-xl border border-[var(--color-border)] p-6 hover:shadow-lg transition-shadow"
              >
                {editingTreatment === treatment.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Treatment Name</label>
                        <input
                          type="text"
                          value={editedData.treatment_name}
                          onChange={(e) => setEditedData({ ...editedData, treatment_name: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Status</label>
                        <select
                          value={editedData.status}
                          onChange={(e) => setEditedData({ ...editedData, status: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Assigned Dentist</label>
                        <select
                          value={editedData.assigned_dentist}
                          onChange={(e) => setEditedData({ ...editedData, assigned_dentist: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        >
                          <option value="">Select Dentist</option>
                          {dentists.map(d => (
                            <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Scheduled Date</label>
                        <input
                          type="date"
                          value={editedData.scheduled_date}
                          onChange={(e) => setEditedData({ ...editedData, scheduled_date: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <textarea
                        value={editedData.description}
                        onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                        className="w-full px-4 py-3 border rounded-lg min-h-[100px]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(treatment.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingTreatment(null)
                          setEditedData({})
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
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-[var(--color-text)]">
                            {treatment.treatment_name}
                          </h3>
                          {getStatusBadge(treatment.status)}
                        </div>
                        <p className="text-[var(--color-text-muted)] mb-3">{treatment.description}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditTreatment(treatment)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteTreatment(treatment.id, treatment.treatment_name)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-[var(--color-text-muted)] mb-1">Assigned By</p>
                        <p className="font-medium flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {treatment.assigned_by_name}
                        </p>
                      </div>
                      {treatment.assigned_dentist_name && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-[var(--color-text-muted)] mb-1">Dentist</p>
                          <p className="font-medium flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {treatment.assigned_dentist_name}
                          </p>
                        </div>
                      )}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-[var(--color-text-muted)] mb-1">Date Assigned</p>
                        <p className="font-medium flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(treatment.date_assigned)}
                        </p>
                      </div>
                      {treatment.scheduled_date && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-[var(--color-text-muted)] mb-1">Scheduled For</p>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(treatment.scheduled_date)}
                          </p>
                        </div>
                      )}
                      {treatment.completed_date && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-[var(--color-text-muted)] mb-1">Completed On</p>
                          <p className="font-medium flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            {formatDate(treatment.completed_date)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Quick Status Update */}
                    <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                      <p className="text-sm font-medium mb-2">Quick Status Update:</p>
                      <div className="flex gap-2 flex-wrap">
                        {STATUS_OPTIONS.map(status => {
                          const Icon = status.icon
                          return (
                            <button
                              key={status.value}
                              onClick={() => handleStatusChange(treatment.id, status.value)}
                              disabled={treatment.status === status.value}
                              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                treatment.status === status.value
                                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              {status.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Treatment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--color-border)]">
              <h2 className="text-2xl font-bold text-[var(--color-text)]">Assign Treatment</h2>
            </div>
            
            <form onSubmit={handleAddTreatment} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Treatment Name *
                  </label>
                  <input
                    type="text"
                    value={newTreatment.treatment_name}
                    onChange={(e) => setNewTreatment({ ...newTreatment, treatment_name: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    placeholder="e.g., Root Canal, Teeth Whitening"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Status *
                  </label>
                  <select
                    value={newTreatment.status}
                    onChange={(e) => setNewTreatment({ ...newTreatment, status: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    required
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Assigned Dentist (Optional)
                  </label>
                  <select
                    value={newTreatment.assigned_dentist}
                    onChange={(e) => setNewTreatment({ ...newTreatment, assigned_dentist: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option value="">Select Dentist</option>
                    {dentists.map(dentist => (
                      <option key={dentist.id} value={dentist.id}>
                        {dentist.first_name} {dentist.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Scheduled Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newTreatment.scheduled_date}
                    onChange={(e) => setNewTreatment({ ...newTreatment, scheduled_date: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Description *
                </label>
                <textarea
                  value={newTreatment.description}
                  onChange={(e) => setNewTreatment({ ...newTreatment, description: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-h-[120px]"
                  placeholder="Enter treatment details, procedure, expected outcomes, etc..."
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                  Assign Treatment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewTreatment({
                      treatment_name: "",
                      description: "",
                      status: "scheduled",
                      assigned_dentist: "",
                      scheduled_date: "",
                    })
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
