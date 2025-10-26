"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Search, Edit2 } from "lucide-react"
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
  user_type: string
  role: string
}

export default function OwnerStaff() {
  const { token } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newStaff, setNewStaff] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    birthdate: "",
    phone: "",
    address: "",
    role: "",
  })

  useEffect(() => {
    fetchStaff()
  }, [token])

  const fetchStaff = async () => {
    if (!token) return
    
    try {
      setIsLoading(true)
      const data = await api.getStaff(token)
      // Filter out owner accounts - only show staff
      const staffOnly = data.filter((member: StaffMember) => member.user_type === 'staff')
      setStaff(staffOnly)
    } catch (error) {
      console.error("Error fetching staff:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) return

    try {
      // Create login username from username + @dorotheo.com
      const loginUsername = `${newStaff.username}@dorotheo.com`
      
      const staffData = {
        username: loginUsername,  // Full email for login
        email: newStaff.email,    // Separate email field
        password: newStaff.password,
        first_name: newStaff.firstName,
        last_name: newStaff.lastName,
        phone: newStaff.phone,
        address: newStaff.address,
        user_type: 'staff',  // Always set as staff
        role: newStaff.role,  // receptionist or dentist
      }

      await api.createStaff(staffData, token)
      await fetchStaff()
      setShowAddModal(false)
      
      // Show success message with login instructions
      alert(`Staff member added successfully!\n\nLogin credentials:\nUsername: ${loginUsername}\nPassword: ${newStaff.password}\n\nThey can now log in using their username.`)
      
      setNewStaff({
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        password: "",
        birthdate: "",
        phone: "",
        address: "",
        role: "",
      })
    } catch (error) {
      console.error("Error adding staff:", error)
      alert("Failed to add staff member. Please try again.")
    }
  }

  const handleDeleteStaff = async (id: number) => {
    if (!token) return
    
    if (!confirm("Are you sure you want to delete this staff member?")) return

    try {
      await api.deleteStaff(id, token)
      await fetchStaff()
      alert("Staff member deleted successfully!")
    } catch (error) {
      console.error("Error deleting staff:", error)
      alert("Failed to delete staff member.")
    }
  }

  const handleEditClick = (member: StaffMember) => {
    setEditingStaff(member)
    setShowEditModal(true)
  }

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token || !editingStaff) return

    try {
      const updateData = {
        first_name: editingStaff.first_name,
        last_name: editingStaff.last_name,
        email: editingStaff.email,
        phone: editingStaff.phone,
        address: editingStaff.address,
        role: editingStaff.role,
      }

      await api.updateStaff(editingStaff.id, updateData, token)
      await fetchStaff()
      setShowEditModal(false)
      setEditingStaff(null)
      alert("Staff member updated successfully!")
    } catch (error) {
      console.error("Error updating staff:", error)
      alert("Failed to update staff member.")
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[var(--color-primary)] mb-2">Staff Accounts</h1>
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

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
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
              {searchQuery ? "No staff members found matching your search." : "No staff members yet. Add your first staff member!"}
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
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteStaff(member.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                          title="Delete Staff"
                        >
                          <Trash2 className="w-5 h-5" />
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold text-[var(--color-primary)]">Add Staff Member</h2>
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
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  placeholder="8 characters minimum"
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Birthdate <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={newStaff.birthdate}
                  onChange={(e) => setNewStaff({ ...newStaff, birthdate: e.target.value })}
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
              <h2 className="text-2xl font-serif font-bold text-[var(--color-primary)]">Edit Staff Member</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingStaff(null)
                }}
                className="p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="p-6 space-y-4">
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
    </div>
  )
}
