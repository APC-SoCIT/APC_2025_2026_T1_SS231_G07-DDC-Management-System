"use client"

import { useState } from "react"
import { Plus, Upload, Edit2, Search } from "lucide-react"

interface Billing {
  id: number
  patient: string
  amount: number
  date: string
  status: "pending" | "paid" | "cancelled"
}

// Mock patient data
const mockPatients = [
  { id: 1, name: "John Doe", email: "john@email.com" },
  { id: 2, name: "Jane Smith", email: "jane@email.com" },
  { id: 3, name: "Mike Johnson", email: "mike@email.com" },
  { id: 4, name: "Sarah Williams", email: "sarah@email.com" },
  { id: 5, name: "Robert Brown", email: "robert@email.com" },
]

export default function OwnerBilling() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingBilling, setEditingBilling] = useState<Billing | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "cancelled">("all")
  const [newBillingStatus, setNewBillingStatus] = useState<"pending" | "paid" | "cancelled">("pending")
  const [searchQuery, setSearchQuery] = useState("")
  const [patientSearch, setPatientSearch] = useState("")
  const [selectedPatient, setSelectedPatient] = useState("")

  // Remove sample data - ready for testing
  const [billings, setBillings] = useState<Billing[]>([])

  const filteredBillings = statusFilter === "all" 
    ? billings 
    : billings.filter(b => b.status === statusFilter)

  // Filter by search query
  const searchedBillings = filteredBillings.filter(b => 
    b.patient.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter patients for search
  const filteredPatients = mockPatients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.email.toLowerCase().includes(patientSearch.toLowerCase())
  )

  // Calculate total pending amount
  const pendingTotal = billings
    .filter(b => b.status === "pending")
    .reduce((sum, b) => sum + b.amount, 0)

  const handleEdit = (billing: Billing) => {
    setEditingBilling(billing)
    setShowEditModal(true)
  }

  const handleSaveEdit = () => {
    if (editingBilling) {
      setBillings(billings.map(b => 
        b.id === editingBilling.id ? editingBilling : b
      ))
      setShowEditModal(false)
      setEditingBilling(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[var(--color-primary)] mb-2">Billing</h1>
          <p className="text-[var(--color-text-muted)]">Manage patient billing and statements of account</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add SOA
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)]">
        <div className="flex gap-2">
          {[
            { id: "all", label: "All" },
            { id: "pending", label: "Pending" },
            { id: "paid", label: "Paid" },
            { id: "cancelled", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-4 py-2 font-medium transition-colors ${
                statusFilter === tab.id
                  ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Pending Total */}
        <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700 font-medium">
            Total Pending: <span className="text-lg font-bold">₱{pendingTotal.toLocaleString()}</span>
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)] w-5 h-5" />
        <input
          type="text"
          placeholder="Search by patient name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </div>

      {/* Billing Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--color-background)] border-b border-[var(--color-border)]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Patient</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Amount (PHP)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {searchedBillings.map((billing) => (
                <tr key={billing.id} className="hover:bg-[var(--color-background)] transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-[var(--color-text)]">{billing.patient}</p>
                  </td>
                  <td className="px-6 py-4 text-[var(--color-text-muted)]">₱{billing.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-[var(--color-text-muted)]">{billing.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      billing.status === 'paid' ? 'bg-green-100 text-green-700' :
                      billing.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {billing.status.charAt(0).toUpperCase() + billing.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleEdit(billing)}
                      className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add SOA Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold text-[var(--color-primary)]">Add Statement of Account</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                ×
              </button>
            </div>

            <form className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Patient</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search patient by name or email..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  {patientSearch && filteredPatients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredPatients.map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          onClick={() => {
                            setSelectedPatient(patient.name)
                            setPatientSearch(patient.name)
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-[var(--color-background)] transition-colors"
                        >
                          <p className="font-medium">{patient.name}</p>
                          <p className="text-sm text-[var(--color-text-muted)]">{patient.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Amount (PHP)</label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Status</label>
                <select
                  value={newBillingStatus}
                  onChange={(e) => setNewBillingStatus(e.target.value as "pending" | "paid" | "cancelled")}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
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
                  Add SOA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Billing Modal */}
      {showEditModal && editingBilling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold text-[var(--color-primary)]">Edit Billing</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingBilling(null)
                }}
                className="p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                ×
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Patient</label>
                <input
                  type="text"
                  value={editingBilling.patient}
                  onChange={(e) => setEditingBilling({ ...editingBilling, patient: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Amount (PHP)</label>
                <input
                  type="number"
                  value={editingBilling.amount}
                  onChange={(e) => setEditingBilling({ ...editingBilling, amount: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Date</label>
                <input
                  type="date"
                  value={editingBilling.date}
                  onChange={(e) => setEditingBilling({ ...editingBilling, date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Status</label>
                <select
                  value={editingBilling.status}
                  onChange={(e) => setEditingBilling({ ...editingBilling, status: e.target.value as "pending" | "paid" | "cancelled" })}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingBilling(null)
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
