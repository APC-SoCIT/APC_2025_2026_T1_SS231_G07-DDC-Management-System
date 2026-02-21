"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { DollarSign, Search, CreditCard, FileText, AlertCircle, History } from "lucide-react"
import { RecordPaymentModal } from "@/components/record-payment-modal"
import { InvoiceWithPatient, Patient } from "@/lib/types"
import { getInvoices, getPatients } from "@/lib/api"
import { useClinic } from "@/lib/clinic-context"

export default function OwnerBillingPage() {
  const { selectedClinic } = useClinic()
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const patientDropdownRef = useRef<HTMLDivElement>(null)

  // Data
  const [invoices, setInvoices] = useState<InvoiceWithPatient[]>([])
  const [paidInvoices, setPaidInvoices] = useState<InvoiceWithPatient[]>([])
  const [patients, setPatients] = useState<Patient[]>([])

  // Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<number>(0)
  const [selectedPatientName, setSelectedPatientName] = useState("")

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "overdue" | "paid">("all")
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<number | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    if (storedToken) {
      setToken(storedToken)
      fetchData(storedToken)
    } else {
      setLoading(false)
      setError("Not authenticated")
    }
  }, [])

  // Re-fetch when selected clinic changes
  useEffect(() => {
    if (token) {
      fetchData(token)
    }
  }, [selectedClinic])

  // Close patient dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(event.target as Node)) {
        setShowPatientDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchData = async (authToken: string) => {
    try {
      setLoading(true)
      setError("")

      const clinicId = selectedClinic && selectedClinic !== "all" ? selectedClinic.id : undefined

      const [invoicesData, patientsData] = await Promise.all([
        getInvoices(authToken, clinicId ? { clinic_id: clinicId } : undefined),
        getPatients(authToken)
      ])

      // Only show unpaid invoices (with balance > 0)
      const unpaidInvoices = invoicesData.filter((inv: InvoiceWithPatient) =>
        parseFloat(inv.balance) > 0 && inv.status !== 'cancelled'
      )

      // Paid invoices
      const paid = invoicesData.filter(
        (inv: InvoiceWithPatient) => inv.status === "paid"
      )

      setInvoices(unpaidInvoices)
      setPaidInvoices(paid)
      setPatients(Array.isArray(patientsData) ? patientsData : (patientsData.results || []))
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError(err.message || "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const handleRecordPayment = (patientId: number, patientName: string) => {
    setSelectedPatientId(patientId)
    setSelectedPatientName(patientName)
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = () => {
    // Refresh invoices after payment is recorded
    if (token) {
      fetchData(token)
    }
  }

  // Filter invoices
  const baseList = statusFilter === "paid" ? paidInvoices : invoices
  const filteredInvoices = baseList.filter((invoice) => {
    // Status filter
    if (statusFilter !== "all" && statusFilter !== "paid" && invoice.status !== statusFilter) {
      return false
    }

    // Selected patient filter
    if (selectedPatientFilter && invoice.patient !== selectedPatientFilter) {
      return false
    }

    return true
  })

  // Calculate totals from filtered invoices
  const totalUnpaid = filteredInvoices.reduce(
    (sum, inv) => sum + parseFloat(inv.balance),
    0
  )
  const overdueCount = filteredInvoices.filter((inv) => inv.status === "overdue").length

  const totalSettled = statusFilter === "paid"
    ? filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_due), 0)
    : 0

  const lastPaidDate = statusFilter === "paid" && filteredInvoices.length > 0
    ? new Date(Math.max(...filteredInvoices.map(i => new Date((i as any).paid_at || i.updated_at).getTime()))).toLocaleDateString()
    : null

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700'
      case 'overdue':
        return 'bg-red-100 text-red-700'
      case 'sent':
        return 'bg-amber-100 text-amber-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-sans font-bold text-[var(--color-primary)] mb-2">
            Billing
          </h1>
          <p className="text-[var(--color-text-muted)]">
            Manage patient billing and statements of account
          </p>
        </div>
        <Link
          href="/owner/payments/history"
          className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <History className="w-5 h-5" />
          View Payment History
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{statusFilter === "paid" ? "Total Settled" : "Total Pending"}</p>
              <p className="text-2xl font-bold text-gray-900">
                ₱{(statusFilter === "paid" ? totalSettled : totalUnpaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${statusFilter === "paid" ? "bg-green-50" : "bg-red-50"}`}>
              <DollarSign className={`w-6 h-6 ${statusFilter === "paid" ? "text-green-600" : "text-red-600"}`} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{statusFilter === "paid" ? "Paid Invoices" : "Unpaid Invoices"}</p>
              <p className="text-2xl font-bold text-gray-900">{filteredInvoices.length}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <FileText className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{statusFilter === "paid" ? "Last Paid" : "Overdue"}</p>
              <p className="text-2xl font-bold text-gray-900">
                {statusFilter === "paid" ? (lastPaidDate ?? "—") : overdueCount}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${statusFilter === "paid" ? "bg-green-50" : "bg-red-50"}`}>
              <AlertCircle className={`w-6 h-6 ${statusFilter === "paid" ? "text-green-600" : "text-red-600"}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {/* Patient Search/Select */}
          <div className="relative" ref={patientDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Select Patient to View Invoices
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by patient name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowPatientDropdown(true)
                }}
                onFocus={() => setShowPatientDropdown(true)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {showPatientDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {/* Clear selection option */}
                <div
                  onClick={() => {
                    setSelectedPatientFilter(null)
                    setSearchQuery("")
                    setShowPatientDropdown(false)
                  }}
                  className="px-4 py-2.5 cursor-pointer hover:bg-gray-100 border-b border-gray-200 font-medium text-blue-600"
                >
                  All Patients (Clear Selection)
                </div>
                {patients
                  .filter((patient) => {
                    if (!searchQuery) return true
                    const query = searchQuery.toLowerCase()
                    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase()
                    return (
                      fullName.includes(query) ||
                      patient.email.toLowerCase().includes(query)
                    )
                  })
                  .map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => {
                        setSelectedPatientFilter(patient.id)
                        setSearchQuery(`${patient.first_name} ${patient.last_name} - ${patient.email}`)
                        setShowPatientDropdown(false)
                      }}
                      className={`px-4 py-2.5 cursor-pointer hover:bg-gray-100 ${
                        selectedPatientFilter === patient.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{patient.first_name} {patient.last_name}</div>
                      <div className="text-sm text-gray-500">{patient.email}</div>
                    </div>
                  ))}
                {patients.filter((patient) => {
                  if (!searchQuery) return false
                  const query = searchQuery.toLowerCase()
                  const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase()
                  return (
                    fullName.includes(query) ||
                    patient.email.toLowerCase().includes(query)
                  )
                }).length === 0 && searchQuery && (
                  <div className="px-4 py-2.5 text-gray-500 text-sm">
                    No patients found matching "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {[
            { id: "all", label: "All" },
            { id: "sent", label: "Pending" },
            { id: "overdue", label: "Overdue" },
            { id: "paid", label: "Paid" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-4 py-2 font-medium transition-colors ${
                statusFilter === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {statusFilter === "paid"
                ? "No paid invoices found."
                : "No billing records yet. Add your first statement of account to get started!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Invoice #
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Patient
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Service
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Balance
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{invoice.patient_name}</p>
                      <p className="text-sm text-gray-600">{invoice.patient_email}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {invoice.service_name || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      ₱{parseFloat(invoice.total_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${statusFilter === "paid" ? "text-green-600" : "text-red-600"}`}>
                        ₱{parseFloat(invoice.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                          invoice.status
                        )}`}
                      >
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {statusFilter !== "paid" && (
                        <button
                          onClick={() =>
                            handleRecordPayment(invoice.patient, invoice.patient_name || "Patient")
                          }
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <CreditCard className="w-4 h-4" />
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        patientId={selectedPatientId}
        patientName={selectedPatientName}
        token={token}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  )
}
