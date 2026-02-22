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

export default function StaffPatients() {
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
        
        // Set pagination metadata
        const patientResults = paginatedData.results || patientsResponse
        setTotalCount(paginatedData.count || patientResults.length)
        setTotalPages(Math.ceil((paginatedData.count || patientResults.length) / pageSize))
        
        console.log("Fetched patients:", patientResults)
        console.log("Fetched appointments:", appointmentsResponse)
        
        // Handle paginated appointments response
        const appointmentsArray = Array.isArray(appointmentsResponse) ? appointmentsResponse : (appointmentsResponse.results || [])
        
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

  // Handle archive patient
  const handleArchive = async (patientId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to archive this patient? They will be moved to the Archived tab.")) return
    
    try {
      await api.archivePatient(patientId, token!)
      // Find the archived patient
      const archivedPatient = patients.find(p => p.id === patientId)
      if (archivedPatient) {
        // Update status and add to archived list
        const updatedPatient = { ...archivedPatient, status: "archived" as const }
        setArchivedPatients([...archivedPatients, updatedPatient])
      }
      // Remove from current patients
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
      // Find the restored patient
      const restoredPatient = archivedPatients.find(p => p.id === patientId)
      if (restoredPatient) {
        // Update status and add to patients list
        const updatedPatient = { ...restoredPatient, status: "active" as const }
        setPatients([...patients, updatedPatient])
      }
      // Remove from archived
      setArchivedPatients(archivedPatients.filter(p => p.id !== patientId))
      alert("Patient restored successfully!")
    } catch (error) {
      console.error("Error restoring patient:", error)
      alert("Failed to restore patient")
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
    router.push(`/staff/patients/${patientId}`)
  }

  const handleDelete = async (patientId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Check if user is receptionist
    if (user?.role !== 'receptionist') {
      alert("Only Receptionists can delete patient accounts")
      return
    }
    
    if (!confirm("Are you sure you want to delete this patient? This action cannot be undone.")) {
      return
    }
    
    try {
      // Use the API's delete endpoint for patients (users with user_type='patient')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/users/${patientId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete patient')
      }
      
      // Remove from both patients and archived patients lists
      setPatients(patients.filter((p) => p.id !== patientId))
      setArchivedPatients(archivedPatients.filter((p) => p.id !== patientId))
      alert("Patient deleted successfully")
    } catch (error: any) {
      console.error("Error deleting patient:", error)
      const errorMessage = error?.message || "Failed to delete patient"
      alert(errorMessage)
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
      const appointmentsArray = Array.isArray(appointmentsResponse) ? appointmentsResponse : (appointmentsResponse.results || [])

      const transformedPatients = patientResults
        .filter((user: any) => !user.is_archived)
        .map((user: any) => {
          const patientAppointments = appointmentsArray.filter(
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
          <h1 className="text-3xl font-display font-bold text-[var(--color-primary)] mb-2">Patients</h1>
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
                <th 
                  className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)] cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Name
                    {sortColumn === 'name' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)] cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-2">
                    Email
                    {sortColumn === 'email' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)] cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('phone')}
                >
                  <div className="flex items-center gap-2">
                    Phone
                    {sortColumn === 'phone' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)] cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('lastVisit')}
                >
                  <div className="flex items-center gap-2">
                    Last Visit
                    {sortColumn === 'lastVisit' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)] cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {sortColumn === 'status' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredPatients.map((patient) => (
                <tr key={patient.id}>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleRowClick(patient.id)}
                      className="font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] hover:underline hover:scale-105 transition-all duration-200 cursor-pointer text-left"
                    >
                      {patient.name}
                    </button>
                  </td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{patient.email}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{patient.phone}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{formatLastVisit(patient.lastVisit)}</td>
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
                    <div className="flex items-center gap-2">
                      {activeTab !== "archived" ? (
                        <>
                          <button
                            onClick={(e) => handleArchive(patient.id, e)}
                            className="p-2 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Archive Patient"
                          >
                            <Archive className="w-4 h-4 text-orange-600" />
                          </button>
                          {user?.role === 'receptionist' && (
                            <button
                              onClick={(e) => handleDelete(patient.id, e)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          )}
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
                <X className="w-5 h-5" />
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

    </div>
  )
}
