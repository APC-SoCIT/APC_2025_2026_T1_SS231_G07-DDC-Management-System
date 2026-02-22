"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Search, Edit2, CheckCircle, Copy, Archive, ArchiveRestore, AlertTriangle, X, UserX } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface StaffMember {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string
  address: string
  birthday?: string
  user_type: string
  role: string
  is_archived?: boolean
}

type ModalType = 'archive' | 'unarchive' | 'delete' | null

interface ConfirmModal {
  type: ModalType
  staff: StaffMember | null
}

export default function OwnerStaff() {
  const { token } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [archivedStaff, setArchivedStaff] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [addStaffError, setAddStaffError] = useState("")
  const [editStaffError, setEditStaffError] = useState("")
  const [editStaffSuccess, setEditStaffSuccess] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successCredentials, setSuccessCredentials] = useState({ username: "", password: "" })
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>({ type: null, staff: null })
  const [actionLoading, setActionLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [newStaff, setNewStaff] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    birthdate: "",
    phone: "",
    address: "",
    role: "",
  })

  useEffect(() => {
    fetchStaff()
  }, [token])

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  const fetchStaff = async () => {
    if (!token) return
    
    try {
      setIsLoading(true)
      const [activeData, archivedData] = await Promise.all([
        api.getStaff(token),
        api.getArchivedStaff(token),
      ])
      // Filter out owner accounts from active list
      const staffOnly = activeData.filter((member: StaffMember) => member.user_type === 'staff')
      setStaff(staffOnly)
      setArchivedStaff(Array.isArray(archivedData) ? archivedData : [])
    } catch (error) {
      console.error("Error fetching staff:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) return

    // Check if passwords match
    if (newStaff.password !== newStaff.confirmPassword) {
      setAddStaffError("Passwords do not match")
      return
    }

    try {
      // Create login username from username + @dorotheo.com
      const loginUsername = `${newStaff.username}@dorotheo.com`
      
      const staffData = {
        username: loginUsername,  // Full email for login
        email: newStaff.email,    // Separate email field
        password: newStaff.password,
        confirm_password: newStaff.confirmPassword,
        first_name: newStaff.firstName,
        last_name: newStaff.lastName,
        birthday: newStaff.birthdate,
        phone: newStaff.phone,
        address: newStaff.address,
        user_type: 'staff',  // Always set as staff
        role: newStaff.role,  // receptionist or dentist
      }

      await api.createStaff(staffData, token)
      await fetchStaff()
      setShowAddModal(false)
      setAddStaffError("")
      
      // Show success modal with login credentials
      setSuccessCredentials({ username: loginUsername, password: newStaff.password })
      setShowSuccessModal(true)
      
      setNewStaff({
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        password: "",
        confirmPassword: "",
        birthdate: "",
        phone: "",
        address: "",
        role: "",
      })
    } catch (error: any) {
      const data = error.response?.data
      if (data) {
        if (data.birthday) {
          const msg = Array.isArray(data.birthday) ? data.birthday[0] : data.birthday
          setAddStaffError(typeof msg === 'string' ? msg : "Staff must be 18 years old and above.")
        } else if (data.username) {
          const msg = Array.isArray(data.username) ? data.username[0] : data.username
          setAddStaffError(`Username: ${typeof msg === 'string' ? msg : 'already taken or invalid'}`)
        } else if (data.email) {
          const msg = Array.isArray(data.email) ? data.email[0] : data.email
          setAddStaffError(`Email: ${typeof msg === 'string' ? msg : 'invalid'}`)
        } else if (data.password) {
          const msg = Array.isArray(data.password) ? data.password[0] : data.password
          setAddStaffError(`Password: ${typeof msg === 'string' ? msg : 'invalid'}`)
        } else if (data.non_field_errors) {
          const msg = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors
          setAddStaffError(typeof msg === 'string' ? msg : "Failed to add staff member.")
        } else {
          const messages: string[] = []
          for (const [, errors] of Object.entries(data)) {
            if (Array.isArray(errors)) messages.push(...(errors as string[]).map(String))
            else if (typeof errors === 'string') messages.push(errors)
          }
          setAddStaffError(messages.join(' ') || "Failed to add staff member. Please try again.")
        }
      } else {
        setAddStaffError("Failed to add staff member. Please try again.")
      }
    }
  }

  const handleDeleteStaff = async () => {
    if (!token || !confirmModal.staff) return
    setActionLoading(true)
    try {
      await api.deleteStaff(confirmModal.staff.id, token)
      await fetchStaff()
      setConfirmModal({ type: null, staff: null })
      showToast("Staff member deleted successfully.", "success")
    } catch (error) {
      console.error("Error deleting staff:", error)
      showToast("Failed to delete staff member.", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleArchiveStaff = async () => {
    if (!token || !confirmModal.staff) return
    setActionLoading(true)
    try {
      await api.archiveStaff(confirmModal.staff.id, token)
      await fetchStaff()
      setConfirmModal({ type: null, staff: null })
      showToast("Staff member archived. They can no longer log in.", "success")
    } catch (error: any) {
      console.error("Error archiving staff:", error)
      showToast(error?.message || "Failed to archive staff member.", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnarchiveStaff = async () => {
    if (!token || !confirmModal.staff) return
    setActionLoading(true)
    try {
      await api.unarchiveStaff(confirmModal.staff.id, token)
      await fetchStaff()
      setConfirmModal({ type: null, staff: null })
      showToast("Staff member unarchived. They can now log in again.", "success")
    } catch (error) {
      console.error("Error unarchiving staff:", error)
      showToast("Failed to unarchive staff member.", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleEditClick = (member: StaffMember) => {
    setEditingStaff(member)
    setEditStaffError("")
    setEditStaffSuccess(false)
    setShowEditModal(true)
  }

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token || !editingStaff) return

    // Validate birthday: staff must be 18+
    if (editingStaff.birthday) {
      const today = new Date()
      const bday = new Date(editingStaff.birthday)
      const eighteenth = new Date(bday.getFullYear() + 18, bday.getMonth(), bday.getDate())
      if (today < eighteenth) {
        setEditStaffError("Staff member must be at least 18 years old")
        return
      }
    }

    try {
      const updateData = {
        first_name: editingStaff.first_name,
        last_name: editingStaff.last_name,
        email: editingStaff.email,
        phone: editingStaff.phone,
        birthday: editingStaff.birthday,
        address: editingStaff.address,
        role: editingStaff.role,
      }

      await api.updateStaff(editingStaff.id, updateData, token)
      await fetchStaff()
      setEditStaffError("")
      setEditStaffSuccess(true)
      setTimeout(() => {
        setShowEditModal(false)
        setEditingStaff(null)
        setEditStaffSuccess(false)
      }, 1500)
    } catch (error: any) {
      console.error("Error updating staff:", error)
      const data = error.response?.data
      if (data) {
        const messages: string[] = []
        for (const [, errors] of Object.entries(data)) {
          if (Array.isArray(errors)) messages.push(...(errors as string[]).map(String))
          else if (typeof errors === 'string') messages.push(errors)
        }
        setEditStaffError(messages.join(' ') || "Failed to update staff member. Please try again.")
      } else {
        setEditStaffError("Failed to update staff member. Please try again.")
      }
    }
  }

  const filteredStaff = staff.filter((member) => {
    const fullName = `${member.first_name} ${member.last_name}`.toLowerCase()
    const search = searchQuery.toLowerCase()
    return (
      fullName.includes(search) ||
      member.email.toLowerCase().includes(search) ||
      member.role.toLowerCase().includes(search)
    )
  })

  const filteredArchivedStaff = archivedStaff.filter((member) => {
    const fullName = `${member.first_name} ${member.last_name}`.toLowerCase()
    const search = searchQuery.toLowerCase()
    return (
      fullName.includes(search) ||
      member.email.toLowerCase().includes(search) ||
      member.role.toLowerCase().includes(search)
    )
  })

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'receptionist':
        return 'Receptionist'
      case 'dentist':
        return 'Dentist'
      default:
        return 'Not Assigned'
    }
  }

  return (
    <div className="space-y-6">
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
          <h1 className="text-3xl font-display font-bold text-[var(--color-primary)] mb-2">Staff Accounts</h1>
          <p className="text-[var(--color-text-muted)]">Manage staff members and their access</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Staff
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      </div>

      {/* Active Staff Section */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Active Staff</h2>
          <span className="ml-auto text-sm text-[var(--color-text-muted)] bg-gray-100 px-3 py-1 rounded-full">{filteredStaff.length} member{filteredStaff.length !== 1 ? 's' : ''}</span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
              <p className="text-[var(--color-text-muted)]">Loading staff...</p>
            </div>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--color-text-muted)]">
              {searchQuery ? "No active staff members found matching your search." : "No active staff members yet. Add your first staff member!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-background)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Phone</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Birthdate</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Address</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-[var(--color-background)] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-[var(--color-text)]">{member.first_name} {member.last_name}</p>
                    </td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{member.email}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{member.phone}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">
                      {member.birthday ? new Date(member.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{member.address}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        member.role === 'dentist' ? 'bg-blue-100 text-blue-700' : 
                        member.role === 'receptionist' ? 'bg-purple-100 text-purple-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {getRoleLabel(member.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditClick(member)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                          title="Edit Staff"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setConfirmModal({ type: 'archive', staff: member })}
                          className="p-2 hover:bg-orange-50 rounded-lg transition-colors text-orange-500"
                          title="Archive Staff"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Archived Staff Section */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Archived Staff</h2>
          <span className="ml-auto text-sm text-[var(--color-text-muted)] bg-gray-100 px-3 py-1 rounded-full">{filteredArchivedStaff.length} member{filteredArchivedStaff.length !== 1 ? 's' : ''}</span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
          </div>
        ) : filteredArchivedStaff.length === 0 ? (
          <div className="text-center py-10">
            <UserX className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-[var(--color-text-muted)] text-sm">
              {searchQuery ? "No archived staff members found matching your search." : "No archived staff members."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Phone</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Birthdate</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Address</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredArchivedStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors opacity-70">
                    <td className="px-6 py-4">
                      <p className="font-medium text-[var(--color-text)]">{member.first_name} {member.last_name}</p>
                    </td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{member.email}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{member.phone}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">
                      {member.birthday ? new Date(member.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{member.address}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        member.role === 'dentist' ? 'bg-blue-100 text-blue-700' : 
                        member.role === 'receptionist' ? 'bg-purple-100 text-purple-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {getRoleLabel(member.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setConfirmModal({ type: 'unarchive', staff: member })}
                          className="p-2 hover:bg-green-50 rounded-lg transition-colors text-green-600"
                          title="Unarchive Staff"
                        >
                          <ArchiveRestore className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setConfirmModal({ type: 'delete', staff: member })}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                          title="Delete Staff"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-display font-bold text-[var(--color-primary)]">Add Staff Member</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newStaff.firstName}
                    onChange={(e) => setNewStaff({ ...newStaff, firstName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newStaff.lastName}
                    onChange={(e) => setNewStaff({ ...newStaff, lastName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  placeholder="john.doe@example.com"
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={newStaff.username}
                    onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                    placeholder="john.doe"
                    className="flex-1 px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <span className="text-[var(--color-text-muted)] font-medium">@dorotheo.com</span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  This will be used for login
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newStaff.password}
                  onChange={(e) => {
                    setNewStaff({ ...newStaff, password: e.target.value })
                    setAddStaffError("") // Clear error when user changes password
                  }}
                  placeholder="8 characters minimum"
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newStaff.confirmPassword}
                  onChange={(e) => {
                    setNewStaff({ ...newStaff, confirmPassword: e.target.value })
                    setAddStaffError("") // Clear error when user changes confirm password
                  }}
                  placeholder="Re-enter password"
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {addStaffError && addStaffError.includes("match") && (
                  <p className="text-red-500 text-sm mt-1 font-medium">{addStaffError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Birthdate <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={newStaff.birthdate}
                  onChange={(e) => {
                    setNewStaff({ ...newStaff, birthdate: e.target.value })
                    setAddStaffError("") // Clear error when user changes birthdate
                  }}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {addStaffError && (addStaffError.toLowerCase().includes('18') || addStaffError.toLowerCase().includes('birth') || addStaffError.toLowerCase().includes('age') || addStaffError.toLowerCase().includes('old')) && (
                  <p className="text-red-500 text-sm mt-1 font-medium">{addStaffError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newStaff.address}
                  onChange={(e) => setNewStaff({ ...newStaff, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="">Select a role...</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="dentist">Dentist</option>
                </select>
              </div>

              {addStaffError && !addStaffError.includes('match') && !(addStaffError.toLowerCase().includes('18') || addStaffError.toLowerCase().includes('birth') || addStaffError.toLowerCase().includes('age') || addStaffError.toLowerCase().includes('old')) && (
                <p className="text-red-500 text-sm font-medium bg-red-50 border border-red-200 rounded-lg px-4 py-3">{addStaffError}</p>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium"
                >
                  Add Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-display font-bold text-[var(--color-primary)]">Edit Staff Member</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingStaff(null)
                  setEditStaffError("")
                  setEditStaffSuccess(false)
                }}
                className="p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="p-6 space-y-4">
              {editStaffSuccess && (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  Staff member updated successfully!
                </div>
              )}
              {editStaffError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {editStaffError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStaff.first_name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, first_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStaff.last_name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, last_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editingStaff.email}
                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={editingStaff.phone}
                  onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Birthdate
                </label>
                <input
                  type="date"
                  value={editingStaff.birthday || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, birthday: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={editingStaff.address}
                  onChange={(e) => setEditingStaff({ ...editingStaff, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={editingStaff.role}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="">Select a role...</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="dentist">Dentist</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingStaff(null)
                    setEditStaffError("")
                    setEditStaffSuccess(false)
                  }}
                  className="flex-1 px-6 py-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              {/* Success Icon */}
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 rounded-full p-3">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-display font-bold text-center text-[var(--color-primary)] mb-2">
                Staff Member Added Successfully!
              </h2>
              <p className="text-center text-[var(--color-text-muted)] mb-6">
                The new staff member can now log in using the credentials below.
              </p>

              {/* Credentials Box */}
              <div className="bg-[var(--color-background)] rounded-lg p-4 mb-6 border border-[var(--color-border)]">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                    Username
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={successCredentials.username}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-[var(--color-text)] font-medium"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(successCredentials.username)}
                      className="p-2 hover:bg-white rounded-lg transition-colors"
                      title="Copy username"
                    >
                      <Copy className="w-4 h-4 text-[var(--color-text-muted)]" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                    Password
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={successCredentials.password}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-[var(--color-text)] font-medium"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(successCredentials.password)}
                      className="p-2 hover:bg-white rounded-lg transition-colors"
                      title="Copy password"
                    >
                      <Copy className="w-4 h-4 text-[var(--color-text-muted)]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Note */}
              <p className="text-xs text-center text-[var(--color-text-muted)] mb-6">
                Make sure to save these credentials securely. They can be used to log in immediately.
              </p>

              {/* Close Button */}
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal (Archive / Unarchive / Delete) */}
      {confirmModal.type && confirmModal.staff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
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
                  {confirmModal.type === 'delete' ? 'Delete Staff Member' :
                   confirmModal.type === 'archive' ? 'Archive Staff Member' :
                   'Unarchive Staff Member'}
                </h3>
              </div>
              <button
                onClick={() => setConfirmModal({ type: null, staff: null })}
                className="p-1.5 rounded-lg hover:bg-white/60 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-[var(--color-text)] mb-1">
                {confirmModal.type === 'delete' ? (
                  <>Are you sure you want to <span className="font-semibold text-red-600">permanently delete</span> the account of:</>
                ) : confirmModal.type === 'archive' ? (
                  <>Are you sure you want to <span className="font-semibold text-orange-600">archive</span> the account of:</>
                ) : (
                  <>Are you sure you want to <span className="font-semibold text-green-600">unarchive</span> the account of:</>
                )}
              </p>
              <p className="text-lg font-bold text-[var(--color-primary)] mb-4">
                {confirmModal.staff.first_name} {confirmModal.staff.last_name}
              </p>
              <p className="text-sm text-[var(--color-text-muted)] bg-gray-50 rounded-lg p-3 border border-gray-200">
                {confirmModal.type === 'delete'
                  ? 'This action is permanent and cannot be undone. All associated data will be removed.'
                  : confirmModal.type === 'archive'
                  ? 'The staff member will be moved to the Archived section and will no longer be able to log in until unarchived by an owner.'
                  : 'The staff member will be restored to Active Staff and will be able to log in to the system again.'}
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setConfirmModal({ type: null, staff: null })}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 border border-[var(--color-border)] rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={
                  confirmModal.type === 'delete' ? handleDeleteStaff :
                  confirmModal.type === 'archive' ? handleArchiveStaff :
                  handleUnarchiveStaff
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
                  'Yes, Unarchive'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
