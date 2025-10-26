"use client"

import { useState, Fragment, useEffect } from "react"
import { 
  Search, 
  Plus, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  Edit2, 
  Save, 
  X, 
  Trash2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  DollarSign,
  Camera,
  Upload,
  Archive,
  ArchiveRestore
} from "lucide-react"
import TeethImageUpload from "@/components/teeth-image-upload"
import DocumentUpload from "@/components/document-upload"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface Patient {
  id: number
  name: string
  email: string
  phone: string
  lastVisit: string
  status: "active" | "inactive"
  address: string
  dateOfBirth: string
  age: number
  gender: string
  medicalHistory: string[]
  allergies: string[]
  upcomingAppointments: Array<{
    date: string
    time: string
    type: string
    doctor: string
  }>
  pastAppointments: number
  totalBilled: number
  balance: number
  notes: string
}

export default function OwnerPatients() {
  const { token } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive" | "new" | "archived">("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [editedData, setEditedData] = useState<Partial<Patient>>({})
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [showDocumentUpload, setShowDocumentUpload] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [archivedPatients, setArchivedPatients] = useState<Patient[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newPatient, setNewPatient] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    birthday: "",
    age: "",
    address: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch real patients and appointments from API
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return
      
      try {
        setIsLoading(true)
        
        // Fetch patients and appointments in parallel
        const [patientsResponse, appointmentsResponse] = await Promise.all([
          api.getPatients(token),
          api.getAppointments(token)
        ])
        
        console.log("Fetched patients:", patientsResponse)
        console.log("Fetched appointments:", appointmentsResponse)
        
        // Store appointments for later use
        setAppointments(appointmentsResponse)
        
        // Get current date for comparison
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        // Transform API response to Patient interface
        const transformedPatients = patientsResponse.map((user: any) => {
          // Filter appointments for this patient
          const patientAppointments = appointmentsResponse.filter(
            (apt: any) => apt.patient === user.id
          )
          
          // Separate upcoming and past appointments
          const upcomingAppts = patientAppointments
            .filter((apt: any) => {
              const aptDate = new Date(apt.date)
              return aptDate >= today && apt.status !== 'cancelled' && apt.status !== 'completed'
            })
            .map((apt: any) => ({
              date: apt.date,
              time: apt.time,
              type: apt.service_name || "General Consultation",
              doctor: apt.dentist_name || "Dr. Marvin Dorotheo"
            }))
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
          
          const pastAppts = patientAppointments.filter((apt: any) => {
            const aptDate = new Date(apt.date)
            return aptDate < today || apt.status === 'completed'
          })
          
          // Determine status based on last appointment date
          let status: "active" | "inactive" = user.is_active_patient ? "active" : "inactive"
          
          return {
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            phone: user.phone || "N/A",
            lastVisit: user.last_appointment_date || user.created_at?.split('T')[0] || "N/A",
            status: status,
            address: user.address || "N/A",
            dateOfBirth: user.birthday || "N/A",
            age: user.age || 0,
            gender: user.gender || "Not specified",
            medicalHistory: [],
            allergies: [],
            upcomingAppointments: upcomingAppts,
            pastAppointments: pastAppts.length,
            totalBilled: 0,
            balance: 0,
            notes: "",
          }
        })
        
        setPatients(transformedPatients)

        // Fetch archived patients
        if (activeTab === "archived") {
          const archivedResponse = await api.getArchivedPatients(token)
          const transformedArchived = archivedResponse.map((user: any) => ({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            phone: user.phone || "N/A",
            lastVisit: user.last_appointment_date || user.created_at?.split('T')[0] || "N/A",
            status: "inactive" as const,
            address: user.address || "N/A",
            dateOfBirth: user.birthday || "N/A",
            age: user.age || 0,
            gender: user.gender || "Not specified",
            medicalHistory: [],
            allergies: [],
            upcomingAppointments: [],
            pastAppointments: 0,
            totalBilled: 0,
            balance: 0,
            notes: "",
          }))
          setArchivedPatients(transformedArchived)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [token, activeTab])

  // Handle archive patient
  const handleArchive = async (patientId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to archive this patient? They will be moved to the Archived tab.")) return
    
    try {
      await api.archivePatient(patientId, token!)
      // Remove from current patients and refresh
      setPatients(patients.filter(p => p.id !== patientId))
      alert("Patient archived successfully!")
    } catch (error) {
      console.error("Error archiving patient:", error)
      alert("Failed to archive patient")
    }
  }

  // Handle restore patient
  const handleRestore = async (patientId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to restore this patient?")) return
    
    try {
      await api.restorePatient(patientId, token!)
      // Remove from archived and refresh
      setArchivedPatients(archivedPatients.filter(p => p.id !== patientId))
      // Refresh active patients list
      const response = await api.getPatients(token!)
      const transformedPatients = response.map((user: any) => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone || "N/A",
        lastVisit: user.last_appointment_date || user.created_at?.split('T')[0] || "N/A",
        status: user.is_active_patient ? "active" as const : "inactive" as const,
        address: user.address || "N/A",
        dateOfBirth: user.birthday || "N/A",
        age: user.age || 0,
        gender: user.gender || "Not specified",
        medicalHistory: [],
        allergies: [],
        upcomingAppointments: [],
        pastAppointments: 0,
        totalBilled: 0,
        balance: 0,
        notes: "",
      }))
      setPatients(transformedPatients)
      alert("Patient restored successfully!")
    } catch (error) {
      console.error("Error restoring patient:", error)
      alert("Failed to restore patient")
    }
  }

  // Remove mock patients - only use real patient data from API
  const displayPatients = activeTab === "archived" ? archivedPatients : patients
  const filteredPatients = displayPatients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phone.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTab =
      activeTab === "all" ||
      activeTab === "archived" ||
      (activeTab === "active" && patient.status === "active") ||
      (activeTab === "inactive" && patient.status === "inactive") ||
      (activeTab === "new" && new Date(patient.lastVisit).getMonth() === new Date().getMonth())

    return matchesSearch && matchesTab
  })

  const handleRowClick = (patientId: number) => {
    if (editingRow === patientId) return
    setExpandedRow(expandedRow === patientId ? null : patientId)
  }

  const handleEdit = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingRow(patient.id)
    setEditedData({ ...patient })
    setExpandedRow(patient.id)
  }

  const handleSave = (patientId: number) => {
    setPatients(patients.map((p) => (p.id === patientId ? { ...p, ...editedData } as Patient : p)))
    setEditingRow(null)
    setEditedData({})
  }

  const handleCancel = () => {
    setEditingRow(null)
    setEditedData({})
  }

  const handleDelete = (patientId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this patient?")) {
      setPatients(patients.filter((p) => p.id !== patientId))
      setExpandedRow(null)
    }
  }

  const handleUploadImage = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedPatient(patient)
    setShowImageUpload(true)
  }

  const handleUploadDocument = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedPatient(patient)
    setShowDocumentUpload(true)
  }

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Register the patient
      await api.register({
        username: newPatient.email,
        email: newPatient.email,
        password: newPatient.password,
        first_name: newPatient.firstName,
        last_name: newPatient.lastName,
        user_type: "patient",
        phone: newPatient.phone,
        birthday: newPatient.birthday || null,
        age: newPatient.age ? parseInt(newPatient.age) : null,
        address: newPatient.address || null,
      })

      // Refresh the patient list
      const response = await api.getPatients(token!)
      const transformedPatients = response.map((user: any) => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone || "N/A",
        lastVisit: user.last_appointment_date || user.created_at?.split('T')[0] || "N/A",
        status: user.is_active_patient ? "active" : "inactive",
        address: user.address || "N/A",
        dateOfBirth: user.birthday || "N/A",
        age: user.age || 0,
        gender: user.gender || "Not specified",
        medicalHistory: [],
        allergies: [],
        upcomingAppointments: [],
        pastAppointments: 0,
        totalBilled: 0,
        balance: 0,
        notes: "",
      }))
      setPatients(transformedPatients)

      // Reset form and close modal
      setNewPatient({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        birthday: "",
        age: "",
        address: "",
      })
      setShowAddModal(false)
      alert("Patient added successfully! They can now log in with their email and password.")
    } catch (error: any) {
      console.error("Error adding patient:", error)
      alert("Failed to add patient: " + (error.message || "Unknown error"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[var(--color-primary)] mb-2">Patients</h1>
          <p className="text-[var(--color-text-muted)]">Manage patient records and information</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Patient
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search patients by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4 border-b border-[var(--color-border)]">
          {[
            { id: "all", label: "All Patients" },
            { id: "active", label: "Active" },
            { id: "inactive", label: "Inactive" },
            { id: "new", label: "New This Month" },
            { id: "archived", label: "Archived" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--color-background)] border-b border-[var(--color-border)]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Phone</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Last Visit</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredPatients.map((patient) => (
                <Fragment key={patient.id}>
                  {/* Main Row - Clickable */}
                  <tr
                    onClick={() => handleRowClick(patient.id)}
                    className="hover:bg-[var(--color-background)] transition-all duration-200 cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {expandedRow === patient.id ? (
                          <ChevronUp className="w-4 h-4 text-[var(--color-primary)]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
                        )}
                        <p className="font-medium text-[var(--color-text)]">{patient.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{patient.email}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{patient.phone}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{patient.lastVisit}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          patient.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRowClick(patient.id)
                          }}
                          className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-[var(--color-primary)]" />
                        </button>
                        {activeTab !== "archived" ? (
                          <>
                            <button
                              onClick={(e) => handleEdit(patient, e)}
                              className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              onClick={(e) => handleArchive(patient.id, e)}
                              className="p-2 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Archive Patient"
                            >
                              <Archive className="w-4 h-4 text-orange-600" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(patient.id, e)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => handleRestore(patient.id, e)}
                            className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                            title="Restore Patient"
                          >
                            <ArchiveRestore className="w-4 h-4 text-green-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row */}
                  {expandedRow === patient.id && (
                    <tr>
                      <td colSpan={6} className="bg-gradient-to-br from-gray-50 to-blue-50">
                        <div
                          className="px-6 py-6 animate-in slide-in-from-top-2 duration-300"
                        >
                          {editingRow === patient.id ? (
                            // Edit Mode
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-[var(--color-primary)]">
                                  Edit Patient Information
                                </h3>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSave(patient.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
                                  >
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-white transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                    Cancel
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1.5">Full Name *</label>
                                  <input
                                    type="text"
                                    value={editedData.name || ""}
                                    onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1.5">Email (Read-only)</label>
                                  <input
                                    type="email"
                                    value={editedData.email || ""}
                                    readOnly
                                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                    title="Email cannot be edited"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1.5">Phone (Read-only)</label>
                                  <input
                                    type="tel"
                                    value={editedData.phone || ""}
                                    readOnly
                                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                    title="Phone cannot be edited"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1.5">Address (Read-only)</label>
                                  <input
                                    type="text"
                                    value={editedData.address || ""}
                                    readOnly
                                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                    title="Address cannot be edited"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1.5">Date of Birth (Read-only)</label>
                                  <input
                                    type="date"
                                    value={editedData.dateOfBirth || ""}
                                    readOnly
                                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                    title="Date of Birth cannot be edited"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1.5">Gender (Read-only)</label>
                                  <input
                                    type="text"
                                    value={editedData.gender || ""}
                                    readOnly
                                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                    title="Gender cannot be edited"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium mb-1.5">Notes *</label>
                                  <textarea
                                    value={editedData.notes || ""}
                                    onChange={(e) => setEditedData({ ...editedData, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                    placeholder="Add notes about this patient..."
                                  />
                                  <p className="text-xs text-gray-500 mt-1">* Only Name and Notes can be edited</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-[var(--color-primary)]">
                                  Patient Details
                                </h3>
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => handleUploadImage(patient, e)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                  >
                                    <Camera className="w-4 h-4" />
                                    Upload Teeth Image
                                  </button>
                                  <button
                                    onClick={(e) => handleUploadDocument(patient, e)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                  >
                                    <Upload className="w-4 h-4" />
                                    Upload X-Ray/Document
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Personal Information Card */}
                                <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
                                  <h4 className="font-semibold text-[var(--color-primary)] mb-4 flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Personal Information
                                  </h4>
                                  <div className="space-y-3 text-sm">
                                    <div>
                                      <p className="text-[var(--color-text-muted)] mb-0.5">Full Name</p>
                                      <p className="font-medium">{patient.name}</p>
                                    </div>
                                    <div>
                                      <p className="text-[var(--color-text-muted)] mb-0.5">Age / Gender</p>
                                      <p className="font-medium">{patient.age} years / {patient.gender}</p>
                                    </div>
                                    <div>
                                      <p className="text-[var(--color-text-muted)] mb-0.5">Date of Birth</p>
                                      <p className="font-medium">{patient.dateOfBirth}</p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <Mail className="w-4 h-4 text-[var(--color-text-muted)] mt-0.5" />
                                      <div>
                                        <p className="text-[var(--color-text-muted)] text-xs mb-0.5">Email</p>
                                        <p className="font-medium">{patient.email}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <Phone className="w-4 h-4 text-[var(--color-text-muted)] mt-0.5" />
                                      <div>
                                        <p className="text-[var(--color-text-muted)] text-xs mb-0.5">Phone</p>
                                        <p className="font-medium">{patient.phone}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <MapPin className="w-4 h-4 text-[var(--color-text-muted)] mt-0.5" />
                                      <div>
                                        <p className="text-[var(--color-text-muted)] text-xs mb-0.5">Address</p>
                                        <p className="font-medium">{patient.address}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Dental Records Card */}
                                <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
                                  <h4 className="font-semibold text-[var(--color-primary)] mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Dental Records
                                  </h4>
                                  <div className="space-y-4 text-sm">
                                    <div>
                                      <p className="text-[var(--color-text-muted)] mb-2 font-medium">Medical History</p>
                                      <ul className="space-y-1">
                                        {patient.medicalHistory.map((item, idx) => (
                                          <li key={idx} className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                            <span>{item}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div>
                                      <p className="text-[var(--color-text-muted)] mb-2 font-medium">Allergies</p>
                                      <ul className="space-y-1">
                                        {patient.allergies.map((item, idx) => (
                                          <li key={idx} className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                            <span>{item}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div className="pt-2 border-t border-[var(--color-border)]">
                                      <p className="text-[var(--color-text-muted)] mb-1 font-medium">Notes</p>
                                      <p className="text-sm">{patient.notes}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Appointments & Billing Card */}
                                <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
                                  <h4 className="font-semibold text-[var(--color-primary)] mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Appointments & Billing
                                  </h4>
                                  <div className="space-y-4 text-sm">
                                    <div>
                                      <p className="text-[var(--color-text-muted)] mb-2 font-medium">Upcoming Appointments</p>
                                      {patient.upcomingAppointments.length > 0 ? (
                                        <div className="space-y-2">
                                          {patient.upcomingAppointments.map((apt, idx) => (
                                            <div key={idx} className="bg-blue-50 rounded-lg p-3">
                                              <p className="font-medium text-blue-900">{apt.type}</p>
                                              <p className="text-xs text-blue-700 mt-1">
                                                {apt.date} at {apt.time}
                                              </p>
                                              <p className="text-xs text-blue-600 mt-0.5">with {apt.doctor}</p>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-[var(--color-text-muted)] italic">No upcoming appointments</p>
                                      )}
                                    </div>

                                    <div className="pt-3 border-t border-[var(--color-border)]">
                                      <div className="flex items-center gap-2 mb-3">
                                        <DollarSign className="w-4 h-4 text-[var(--color-text-muted)]" />
                                        <p className="font-medium">Financial Summary</p>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <span className="text-[var(--color-text-muted)]">Past Visits:</span>
                                          <span className="font-semibold">{patient.pastAppointments}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-[var(--color-text-muted)]">Total Billed:</span>
                                          <span className="font-semibold">₱{patient.totalBilled.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-[var(--color-text-muted)]">Balance:</span>
                                          <span className={`font-semibold ${patient.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            ₱{patient.balance.toLocaleString()}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-white border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-serif font-bold text-[var(--color-primary)]">Add New Patient</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddPatient} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newPatient.firstName}
                    onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })}
                    placeholder="Enter first name"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newPatient.lastName}
                    onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })}
                    placeholder="Enter last name"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Email *</label>
                  <input
                    type="email"
                    required
                    value={newPatient.email}
                    onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                    placeholder="patient@example.com"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Password *</label>
                  <input
                    type="password"
                    required
                    value={newPatient.password}
                    onChange={(e) => setNewPatient({ ...newPatient, password: e.target.value })}
                    placeholder="Enter password (min 6 characters)"
                    minLength={6}
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    placeholder="+63 912 345 6789"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    value={newPatient.birthday}
                    onChange={(e) => setNewPatient({ ...newPatient, birthday: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Age</label>
                  <input
                    type="number"
                    min="0"
                    max="150"
                    value={newPatient.age}
                    onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                    placeholder="Enter age"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Address</label>
                  <textarea
                    rows={2}
                    value={newPatient.address}
                    onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                    placeholder="Enter address"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium disabled:opacity-50"
                >
                  {isSubmitting ? "Adding..." : "Add Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teeth Image Upload Modal */}
      {showImageUpload && selectedPatient && (
        <TeethImageUpload
          patientId={selectedPatient.id}
          patientName={selectedPatient.name}
          onClose={() => {
            setShowImageUpload(false)
            setSelectedPatient(null)
          }}
          onSuccess={() => {
            // Refresh patient data or show success message
            setShowImageUpload(false)
            setSelectedPatient(null)
          }}
        />
      )}

      {/* Document Upload Modal */}
      {showDocumentUpload && selectedPatient && (
        <DocumentUpload
          patientId={selectedPatient.id}
          patientName={selectedPatient.name}
          onClose={() => {
            setShowDocumentUpload(false)
            setSelectedPatient(null)
          }}
          onUploadSuccess={() => {
            setShowDocumentUpload(false)
            setSelectedPatient(null)
          }}
        />
      )}
    </div>
  )
}
