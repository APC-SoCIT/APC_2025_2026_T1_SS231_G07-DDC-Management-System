"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Search, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Trash2,
  Archive,
  ArchiveRestore,
  AlertTriangle,
  CheckCircle,
  X,
  Users,
} from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface Patient {
  id: number
  name: string
  email: string
  phone: string
  lastVisit: string
  status: "active" | "inactive" | "archived"
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
  const router = useRouter()
  const { token, user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive" | "new" | "archived">("all")
  const [showAddModal, setShowAddModal] = useState(false)
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
  const [sortColumn, setSortColumn] = useState<'name' | 'email' | 'phone' | 'lastVisit' | 'status' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalArchivedCount, setTotalArchivedCount] = useState(0)
  const [pageSize] = useState(20)

  // Confirm modal state
  type PatientActionType = 'archive' | 'restore' | 'delete' | null
  const [confirmModal, setConfirmModal] = useState<{ type: PatientActionType; patient: Patient | null }>({ type: null, patient: null })
  const [actionLoading, setActionLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [archiveError, setArchiveError] = useState<string | null>(null)

  // Fetch real patients and appointments from API
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return
      
      try {
        setIsLoading(true)
        
        // Fetch paginated patients and appointments in parallel
        const [patientsResponse, appointmentsResponse] = await Promise.all([
          api.getPatients(token, currentPage, pageSize),
          api.getAppointments(token)
        ])
        
        // Handle paginated response
        const paginatedData = patientsResponse as {
          count: number
          next: string | null
          previous: string | null
          results: any[]
        }
        
        // Set pagination metadata with defensive checks
        const patientResults = Array.isArray(paginatedData.results) ? paginatedData.results : (Array.isArray(patientsResponse) ? patientsResponse : [])
        setTotalCount(paginatedData.count || patientResults.length)
        setTotalPages(Math.ceil((paginatedData.count || patientResults.length) / pageSize))
        
        console.log("Fetched patients:", patientResults)
        console.log("Fetched appointments:", appointmentsResponse)
        console.log("Patient count:", patientResults.length)
        console.log("Appointments count:", Array.isArray(appointmentsResponse) ? appointmentsResponse.length : 'not an array')
        
        // Handle paginated appointments response with defensive array check
        const appointmentsArray = Array.isArray(appointmentsResponse) ? appointmentsResponse : (appointmentsResponse?.results || [])
        
        // Store appointments for later use
        setAppointments(appointmentsArray)
        
        // Get current date for comparison
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        // Transform API response to Patient interface - exclude archived patients
        const transformedPatients = patientResults
          .filter((user: any) => !user.is_archived)
          .map((user: any) => {
          // Filter appointments for this patient
          const patientAppointments = appointmentsArray.filter(
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
            lastVisit: user.last_appointment_date || user.created_at || "N/A",
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

        // Always fetch archived patients
        const archivedResponse = await api.getArchivedPatients(token)
        setTotalArchivedCount(archivedResponse.count)
        const transformedArchived = archivedResponse.results.map((user: any) => ({
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          phone: user.phone || "N/A",
          lastVisit: user.last_appointment_date || user.created_at || "N/A",
          status: "archived" as const,
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
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [token, activeTab, currentPage, pageSize])

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Handle archive patient
  const handleArchive = async () => {
    if (!confirmModal.patient || !token) return
    setActionLoading(true)
    setArchiveError(null)
    try {
      await api.archivePatient(confirmModal.patient.id, token)
      const archivedPatient = patients.find(p => p.id === confirmModal.patient!.id)
      if (archivedPatient) {
        setArchivedPatients([...archivedPatients, { ...archivedPatient, status: "archived" as const }])
      }
      setPatients(patients.filter(p => p.id !== confirmModal.patient!.id))
      setConfirmModal({ type: null, patient: null })
      showToast("Patient archived successfully.", "success")
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || "Failed to archive patient"
      setArchiveError(msg)
    } finally {
      setActionLoading(false)
    }
  }

  // Handle restore patient
  const handleRestore = async () => {
    if (!confirmModal.patient || !token) return
    setActionLoading(true)
    try {
      await api.restorePatient(confirmModal.patient.id, token)
      const restoredPatient = archivedPatients.find(p => p.id === confirmModal.patient!.id)
      if (restoredPatient) {
        setPatients([...patients, { ...restoredPatient, status: "active" as const }])
      }
      setArchivedPatients(archivedPatients.filter(p => p.id !== confirmModal.patient!.id))
      setConfirmModal({ type: null, patient: null })
      showToast("Patient restored successfully.", "success")
    } catch (error) {
      console.error("Error restoring patient:", error)
      showToast("Failed to restore patient.", "error")
    } finally {
      setActionLoading(false)
    }
  }

  // Handle delete patient
  const handleDelete = async () => {
    if (!confirmModal.patient || !token) return
    setActionLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/users/${confirmModal.patient.id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` },
      })
      if (!response.ok) throw new Error('Failed to delete patient')
      setPatients(patients.filter(p => p.id !== confirmModal.patient!.id))
      setArchivedPatients(archivedPatients.filter(p => p.id !== confirmModal.patient!.id))
      setConfirmModal({ type: null, patient: null })
      showToast("Patient deleted successfully.", "success")
    } catch (error: any) {
      console.error("Error deleting patient:", error)
      showToast(error?.message || "Failed to delete patient.", "error")
    } finally {
      setActionLoading(false)
    }
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

      // Refresh the patient list with full data including appointments
      const [patientsResponse, appointmentsResponse] = await Promise.all([
        api.getPatients(token!, currentPage, pageSize),
        api.getAppointments(token!)
      ])

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Handle paginated response
      const patientResults = (patientsResponse as any).results || patientsResponse

      const transformedPatients = patientResults
        .filter((user: any) => !user.is_archived)
        .map((user: any) => {
          const patientAppointments = appointmentsResponse.filter(
            (apt: any) => apt.patient === user.id
          )
          
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

          return {
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
            upcomingAppointments: upcomingAppts,
            pastAppointments: pastAppts.length,
            totalBilled: 0,
            balance: 0,
            notes: "",
          }
        })
      setPatients(transformedPatients)
      setAppointments(appointmentsResponse)

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
      showToast("Patient added successfully! They can now log in with their email and password.", "success")
    } catch (error: any) {
      console.error("Error adding patient:", error)
      showToast("Failed to add patient: " + (error.message || "Unknown error"), "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Remove mock patients - only use real patient data from API
  const displayPatients = activeTab === "archived" ? archivedPatients : activeTab === "all" ? [...patients, ...archivedPatients] : patients

  const handleSort = (column: 'name' | 'email' | 'phone' | 'lastVisit' | 'status') => {
    if (sortColumn === column) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new column and default to ascending
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getSortedPatients = (patientsToSort: Patient[]) => {
    if (!sortColumn) return patientsToSort

    return [...patientsToSort].sort((a, b) => {
      let aValue: string | number = ''
      let bValue: string | number = ''

      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'email':
          aValue = a.email.toLowerCase()
          bValue = b.email.toLowerCase()
          break
        case 'phone':
          aValue = a.phone.toLowerCase()
          bValue = b.phone.toLowerCase()
          break
        case 'lastVisit':
          // Handle "N/A" and datetime strings - ISO format strings sort correctly
          aValue = a.lastVisit === 'N/A' ? '0000-00-00' : a.lastVisit
          bValue = b.lastVisit === 'N/A' ? '0000-00-00' : b.lastVisit
          break
        case 'status':
          aValue = a.status.toLowerCase()
          bValue = b.status.toLowerCase()
          break
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  // Helper function to format datetime to date only for display
  const formatLastVisit = (lastVisit: string): string => {
    if (lastVisit === 'N/A') return 'N/A'
    // Extract just the date part from ISO datetime string
    return lastVisit.split('T')[0]
  }

  const filteredPatients = getSortedPatients(
    displayPatients.filter((patient) => {
      const matchesSearch =
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.phone.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "archived" && patient.status === "archived") ||
        (activeTab === "active" && patient.status === "active") ||
        (activeTab === "inactive" && patient.status === "inactive") ||
        (activeTab === "new" && patient.status !== "archived" && new Date(patient.lastVisit).getMonth() === new Date().getMonth())

      return matchesSearch && matchesTab
    })
  )

  const handleRowClick = (patientId: number) => {
    router.push(`/owner/patients/${patientId}`)
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl text-white text-sm font-medium transition-all duration-300 ${
          toastMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          {toastMessage.text}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-[var(--color-primary)] mb-2">Patients</h1>
          <p className="text-sm lg:text-base text-[var(--color-text-muted)]">Manage patient records and information</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors text-sm lg:text-base w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
          Add Patient
        </button>
      </div>

      {/* Patient Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[var(--color-border)] flex items-center gap-3">
          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-[var(--color-text)] leading-none">{isLoading ? "..." : totalCount}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Total Patients</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[var(--color-border)] flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-[var(--color-text)] leading-none">{isLoading ? "..." : Math.max(0, totalCount - totalArchivedCount)}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Active Patients</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 lg:p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search patients by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 lg:pl-10 pr-4 py-2 lg:py-2.5 text-sm lg:text-base border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        <div className="flex gap-1 lg:gap-2 mt-4 border-b border-[var(--color-border)] overflow-x-auto mobile-scroll-container">
          {[
            { id: "all", label: "All Patients" },
            { id: "active", label: "Active" },
            { id: "new", label: "New This Month" },
            { id: "archived", label: "Archived" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 lg:px-4 py-2 font-medium transition-colors whitespace-nowrap text-sm lg:text-base ${
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
        <div className="overflow-x-auto mobile-table-wrapper">
          <table className="w-full min-w-[640px]">
            <thead className="bg-[var(--color-background)] border-b border-[var(--color-border)]">
              <tr>
                <th 
                  className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-[var(--color-text)] cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Name
                    {sortColumn === 'name' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 lg:w-4 lg:h-4" /> : <ChevronDown className="w-3 h-3 lg:w-4 lg:h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-[var(--color-text)] cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-2">
                    Email
                    {sortColumn === 'email' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 lg:w-4 lg:h-4" /> : <ChevronDown className="w-3 h-3 lg:w-4 lg:h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-[var(--color-text)] cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('phone')}
                >
                  <div className="flex items-center gap-2">
                    Phone
                    {sortColumn === 'phone' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 lg:w-4 lg:h-4" /> : <ChevronDown className="w-3 h-3 lg:w-4 lg:h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-[var(--color-text)] cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('lastVisit')}
                >
                  <div className="flex items-center gap-2">
                    Last Visit
                    {sortColumn === 'lastVisit' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 lg:w-4 lg:h-4" /> : <ChevronDown className="w-3 h-3 lg:w-4 lg:h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-[var(--color-text)] cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {sortColumn === 'status' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 lg:w-4 lg:h-4" /> : <ChevronDown className="w-3 h-3 lg:w-4 lg:h-4" />
                    )}
                  </div>
                </th>
                <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-[var(--color-text)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-[var(--color-background)] transition-all duration-200">
                  <td className="px-3 lg:px-6 py-3 lg:py-4">
                    <button
                      onClick={() => handleRowClick(patient.id)}
                      className="font-medium text-xs lg:text-sm text-[var(--color-text)] hover:text-[var(--color-primary)] hover:underline hover:scale-105 transition-all duration-200 cursor-pointer text-left"
                    >
                      {patient.name}
                    </button>
                  </td>
                    <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm text-[var(--color-text-muted)]">{patient.email}</td>
                    <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm text-[var(--color-text-muted)]">{patient.phone}</td>
                    <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm text-[var(--color-text-muted)]">{formatLastVisit(patient.lastVisit)}</td>
                    <td className="px-3 lg:px-6 py-3 lg:py-4">
                      <span
                        className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${
                          patient.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {patient.status}
                      </span>
                    </td>
                  <td className="px-3 lg:px-6 py-3 lg:py-4">
                    <div className="flex items-center gap-1 lg:gap-2">
                      {activeTab !== "archived" ? (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setArchiveError(null); setConfirmModal({ type: 'archive', patient }) }}
                            className="p-1.5 lg:p-2 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Archive Patient"
                          >
                            <Archive className="w-3 h-3 lg:w-4 lg:h-4 text-orange-600" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmModal({ type: 'delete', patient }) }}
                            className="p-1.5 lg:p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3 lg:w-4 lg:h-4 text-red-600" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmModal({ type: 'restore', patient }) }}
                          className="p-1.5 lg:p-2 hover:bg-green-50 rounded-lg transition-colors"
                          title="Restore Patient"
                        >
                          <ArchiveRestore className="w-3 h-3 lg:w-4 lg:h-4 text-green-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {!isLoading && totalCount > 0 && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4 px-4">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, totalCount)}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
                  <span className="font-medium">{totalCount}</span> patients
                </p>
              </div>
              
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-[var(--color-primary)] text-sm font-medium text-white">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Last
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-white border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-display font-bold text-[var(--color-primary)]">Add New Patient</h2>
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

      {/* Confirm Modal (Archive / Restore / Delete) */}
      {confirmModal.type && confirmModal.patient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className={`px-6 py-5 flex items-center gap-4 ${
              confirmModal.type === 'delete' ? 'bg-red-50 border-b border-red-100' :
              confirmModal.type === 'archive' ? 'bg-orange-50 border-b border-orange-100' :
              'bg-green-50 border-b border-green-100'
            }`}>
              <div className={`p-3 rounded-full ${
                confirmModal.type === 'delete' ? 'bg-red-100' :
                confirmModal.type === 'archive' ? 'bg-orange-100' :
                'bg-green-100'
              }`}>
                {confirmModal.type === 'delete' ? (
                  <Trash2 className="w-6 h-6 text-red-600" />
                ) : confirmModal.type === 'archive' ? (
                  <Archive className="w-6 h-6 text-orange-600" />
                ) : (
                  <ArchiveRestore className="w-6 h-6 text-green-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold ${
                  confirmModal.type === 'delete' ? 'text-red-800' :
                  confirmModal.type === 'archive' ? 'text-orange-800' :
                  'text-green-800'
                }`}>
                  {confirmModal.type === 'delete' ? 'Delete Patient' :
                   confirmModal.type === 'archive' ? 'Archive Patient' :
                   'Restore Patient'}
                </h3>
              </div>
              <button
                onClick={() => { setConfirmModal({ type: null, patient: null }); setArchiveError(null) }}
                className="p-1.5 rounded-lg hover:bg-white/60 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-[var(--color-text)] mb-1">
                {confirmModal.type === 'delete' ? (
                  <>Are you sure you want to <span className="font-semibold text-red-600">permanently delete</span> the record for:</>
                ) : confirmModal.type === 'archive' ? (
                  <>Are you sure you want to <span className="font-semibold text-orange-600">archive</span> the record for:</>
                ) : (
                  <>Are you sure you want to <span className="font-semibold text-green-600">restore</span> the record for:</>
                )}
              </p>
              <p className="text-lg font-bold text-[var(--color-primary)] mb-4">
                {confirmModal.patient.name}
              </p>
              <p className="text-sm text-[var(--color-text-muted)] bg-gray-50 rounded-lg p-3 border border-gray-200">
                {confirmModal.type === 'delete'
                  ? 'This action is permanent and cannot be undone. The patient record and all associated data will be removed.'
                  : confirmModal.type === 'archive'
                  ? 'The patient will be moved to the Archived tab and hidden from normal views. If they log in again, their account will be automatically reactivated.'
                  : 'The patient will be restored to the active list and will show up normally again.'}
              </p>
              {/* Balance error */}
              {archiveError && confirmModal.type === 'archive' && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {archiveError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => { setConfirmModal({ type: null, patient: null }); setArchiveError(null) }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 border border-[var(--color-border)] rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={
                  confirmModal.type === 'delete' ? handleDelete :
                  confirmModal.type === 'archive' ? handleArchive :
                  handleRestore
                }
                disabled={actionLoading}
                className={`flex-1 px-4 py-2.5 rounded-lg transition-colors font-medium text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2 ${
                  confirmModal.type === 'delete' ? 'bg-red-600 hover:bg-red-700' :
                  confirmModal.type === 'archive' ? 'bg-orange-500 hover:bg-orange-600' :
                  'bg-green-600 hover:bg-green-700'
                }`}
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : null}
                {actionLoading ? 'Processing...' : (
                  confirmModal.type === 'delete' ? 'Yes, Delete' :
                  confirmModal.type === 'archive' ? 'Yes, Archive' :
                  'Yes, Restore'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
