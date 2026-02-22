"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { getPayments, searchPatients } from "@/lib/api"
import { Payment, Patient } from "@/lib/types"
import { Calendar, DollarSign, Search, Filter, X, Eye, Plus } from "lucide-react"
import PaymentDetailsModal from "@/components/payment-details-modal"
import { useClinic } from "@/lib/clinic-context"

export default function PaymentHistoryPage() {
  const { token } = useAuth()
  const { selectedClinic } = useClinic()
  const [payments, setPayments] = useState<Payment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [includeVoided, setIncludeVoided] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [patientSearchQuery, setPatientSearchQuery] = useState("")
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const patientDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [token, selectedClinic, selectedPatient, selectedMethod, startDate, endDate, includeVoided])

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

  // Debounced patient search
  useEffect(() => {
    if (patientSearchQuery.length < 2) {
      setPatients([])
      return
    }
    const timer = setTimeout(async () => {
      if (!token) return
      try {
        const results = await searchPatients(token, patientSearchQuery)
        setPatients(results.map((p: any) => ({ ...p } as Patient)))
      } catch (err) {
        console.error("Error searching patients:", err)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [patientSearchQuery, token])

  const fetchData = async () => {
    if (!token) return
    
    setLoading(true)
    try {
      const clinicId = selectedClinic && selectedClinic !== "all" ? selectedClinic.id : undefined
      const paymentsData = await getPayments(token, {
          patient_id: selectedPatient || undefined,
          clinic_id: clinicId,
          payment_method: selectedMethod || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          include_voided: includeVoided,
        })
      
      setPayments(paymentsData)
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment)
    setShowDetailsModal(true)
  }

  const handlePaymentUpdated = () => {
    fetchData()
  }

  const clearFilters = () => {
    setSelectedPatient(null)
    setPatientSearchQuery("")
    setSelectedMethod("")
    setStartDate("")
    setEndDate("")
    setIncludeVoided(false)
  }

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.patient_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const totalAmount = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
  const activePayments = filteredPayments.filter((p) => !p.voided)
  const voidedPayments = filteredPayments.filter((p) => p.voided)

  const paymentMethods = [
    { value: "cash", label: "Cash" },
    { value: "check", label: "Check" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "credit_card", label: "Credit Card" },
    { value: "debit_card", label: "Debit Card" },
    { value: "gcash", label: "GCash" },
    { value: "paymaya", label: "PayMaya" },
    { value: "other", label: "Other" },
  ]

  const getPaymentMethodLabel = (method: string) => {
    const found = paymentMethods.find((m) => m.value === method)
    return found?.label || method
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">Payment History</h1>
          <p className="text-[var(--color-text-muted)] mt-1">View and manage all payment records</p>
        </div>
        <Link
          href="/staff/payments"
          className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Record Payment
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Total Payments</p>
              <p className="text-2xl font-bold text-[var(--color-text)] mt-1">{filteredPayments.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Active Payments</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{activePayments.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Voided Payments</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{voidedPayments.length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <X className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Total Amount</p>
              <p className="text-2xl font-bold text-[var(--color-text)] mt-1">
                ₱{totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search by payment number or patient name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              showFilters
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-background)] text-[var(--color-text)] hover:bg-gray-200"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="space-y-4 pt-4 border-t border-[var(--color-border)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div ref={patientDropdownRef}>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Patient</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search patients..."
                    value={patientSearchQuery}
                    onChange={(e) => {
                      setPatientSearchQuery(e.target.value)
                      setShowPatientDropdown(true)
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    role="combobox"
                    aria-expanded={showPatientDropdown}
                    aria-haspopup="listbox"
                    aria-autocomplete="list"
                    aria-controls="staff-patient-listbox"
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  {showPatientDropdown && (
                    <div
                      id="staff-patient-listbox"
                      role="listbox"
                      className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                    >
                      <div
                        role="option"
                        aria-selected={selectedPatient === null}
                        onClick={() => {
                          setSelectedPatient(null)
                          setPatientSearchQuery("")
                          setShowPatientDropdown(false)
                        }}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-200 font-medium text-blue-600 text-sm"
                      >
                        All Patients (Clear)
                      </div>
                      {patientSearchQuery.length < 2 && (
                        <div className="px-3 py-2 text-gray-500 text-sm">Type at least 2 characters...</div>
                      )}
                      {patientSearchQuery.length >= 2 && patients.length > 0 && (
                        <select
                          className="w-full px-3 py-2 border-0 focus:outline-none focus:ring-0 text-sm"
                          size={Math.min(6, patients.length)}
                          value={selectedPatient ?? ""}
                          onChange={(e) => {
                            const value = e.target.value
                            const selected = patients.find((p: any) => String(p.id) === value)
                            if (selected) {
                              setSelectedPatient(selected.id)
                              setPatientSearchQuery(`${selected.first_name} ${selected.last_name}`)
                            }
                            setShowPatientDropdown(false)
                          }}
                        >
                          {patients.map((patient: any) => (
                            <option key={patient.id} value={patient.id}>
                              {patient.first_name} {patient.last_name}
                            </option>
                          ))}
                        </select>
                      )}
                      {patients.length === 0 && patientSearchQuery.length >= 2 && (
                        <div className="px-3 py-2 text-gray-500 text-sm">No patients found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Payment Method</label>
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="">All Methods</option>
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeVoided}
                  onChange={(e) => setIncludeVoided(e.target.checked)}
                  className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-border)] rounded focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <span className="text-sm text-[var(--color-text)]">Include voided payments</span>
              </label>

              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--color-background)] border-b border-[var(--color-border)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Payment Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-[var(--color-text-muted)]">
                      <DollarSign className="w-12 h-12 mb-2 opacity-50" />
                      <p className="font-medium">No payments found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-[var(--color-background)] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[var(--color-text)]">{payment.payment_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[var(--color-text)]">{payment.patient_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                        <Calendar className="w-4 h-4 text-[var(--color-text-muted)]" />
                        {new Date(payment.payment_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[var(--color-text)]">
                        ₱{parseFloat(payment.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[var(--color-text)]">{getPaymentMethodLabel(payment.payment_method)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.voided ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Voided
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleViewDetails(payment)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm text-[var(--color-primary)] hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Details Modal */}
      {showDetailsModal && selectedPayment && (
        <PaymentDetailsModal
          payment={selectedPayment}
          token={token!}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedPayment(null)
          }}
          onPaymentUpdated={handlePaymentUpdated}
        />
      )}
    </div>
  )
}
