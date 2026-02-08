"use client"

import { useState, useEffect } from "react"
import { X, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react"
import { InvoiceWithPatient, PaymentMethod, PaymentRecordData } from "@/lib/types"
import { recordPayment, getInvoices } from "@/lib/api"

interface RecordPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: number
  patientName: string
  token: string
  onSuccess?: () => void
}

interface InvoiceAllocation {
  invoice: InvoiceWithPatient
  amount: number
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  token,
  onSuccess
}: RecordPaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  
  // Payment details
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [checkNumber, setCheckNumber] = useState("")
  const [bankName, setBankName] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [notes, setNotes] = useState("")
  
  // Invoices and allocations
  const [unpaidInvoices, setUnpaidInvoices] = useState<InvoiceWithPatient[]>([])
  const [allocations, setAllocations] = useState<{ [key: number]: string }>({})
  
  // Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Fetch unpaid invoices when modal opens
  useEffect(() => {
    if (isOpen && patientId) {
      fetchUnpaidInvoices()
    }
  }, [isOpen, patientId])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  const fetchUnpaidInvoices = async () => {
    try {
      setLoadingInvoices(true)
      setError("")
      const invoices = await getInvoices(token, patientId)
      
      // Filter to only unpaid/partially paid invoices with balance > 0
      const unpaid = invoices.filter((inv: InvoiceWithPatient) => 
        parseFloat(inv.balance) > 0 && 
        inv.status !== 'cancelled'
      )
      
      setUnpaidInvoices(unpaid)
      
      if (unpaid.length === 0) {
        setError("This patient has no unpaid invoices.")
      }
    } catch (err: any) {
      console.error("Error fetching invoices:", err)
      setError(err.message || "Failed to load invoices")
    } finally {
      setLoadingInvoices(false)
    }
  }

  const resetForm = () => {
    setPaymentAmount("")
    setPaymentDate(new Date().toISOString().split('T')[0])
    setPaymentMethod("cash")
    setCheckNumber("")
    setBankName("")
    setReferenceNumber("")
    setNotes("")
    setAllocations({})
    setError("")
    setSuccess(false)
    setValidationErrors([])
  }

  const handleAllocationChange = (invoiceId: number, value: string) => {
    setAllocations(prev => ({
      ...prev,
      [invoiceId]: value
    }))
    setValidationErrors([]) // Clear validation errors when user changes values
  }

  const calculateTotalAllocated = () => {
    return Object.values(allocations).reduce((sum, val) => {
      const num = parseFloat(val) || 0
      return sum + num
    }, 0)
  }

  const validatePayment = (): boolean => {
    const errors: string[] = []
    
    // Check payment amount
    const amount = parseFloat(paymentAmount)
    if (!paymentAmount || isNaN(amount) || amount <= 0) {
      errors.push("Payment amount must be greater than 0")
    }
    
    // Check allocations
    const totalAllocated = calculateTotalAllocated()
    const allocationEntries = Object.entries(allocations).filter(([_, val]) => 
      parseFloat(val) > 0
    )
    
    if (allocationEntries.length === 0) {
      errors.push("You must allocate payment to at least one invoice")
    }
    
    if (totalAllocated > amount) {
      errors.push(`Total allocated (₱${totalAllocated.toFixed(2)}) exceeds payment amount (₱${amount.toFixed(2)})`)
    }
    
    if (totalAllocated < amount) {
      errors.push(`Total allocated (₱${totalAllocated.toFixed(2)}) is less than payment amount (₱${amount.toFixed(2)}). All payment must be allocated.`)
    }
    
    // Check each allocation doesn't exceed invoice balance
    for (const [invoiceIdStr, amountStr] of allocationEntries) {
      const allocAmount = parseFloat(amountStr)
      const invoice = unpaidInvoices.find(inv => inv.id === parseInt(invoiceIdStr))
      
      if (invoice) {
        const invoiceBalance = parseFloat(invoice.balance)
        if (allocAmount > invoiceBalance) {
          errors.push(`Allocation for ${invoice.invoice_number} (₱${allocAmount.toFixed(2)}) exceeds invoice balance (₱${invoiceBalance.toFixed(2)})`)
        }
      }
    }
    
    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validatePayment()) {
      return
    }
    
    setLoading(true)
    setError("")
    
    try {
      // Build allocations array
      const allocationsList = Object.entries(allocations)
        .filter(([_, val]) => parseFloat(val) > 0)
        .map(([invoiceIdStr, amountStr]) => ({
          invoice_id: parseInt(invoiceIdStr),
          amount: parseFloat(amountStr),
        }))
      
      const paymentData: PaymentRecordData = {
        patient_id: patientId,
        amount: parseFloat(paymentAmount),
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes: notes,
        allocations: allocationsList,
      }
      
      // Add optional fields
      if (checkNumber) paymentData.check_number = checkNumber
      if (bankName) paymentData.bank_name = bankName
      if (referenceNumber) paymentData.reference_number = referenceNumber
      
      await recordPayment(paymentData, token)
      
      setSuccess(true)
      
      // Wait a moment then close and notify parent
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
      
    } catch (err: any) {
      console.error("Error recording payment:", err)
      setError(err.message || "Failed to record payment")
    } finally {
      setLoading(false)
    }
  }

  const handleAutoAllocate = () => {
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0 || unpaidInvoices.length === 0) {
      return
    }
    
    // Sort invoices by date (oldest first)
    const sortedInvoices = [...unpaidInvoices].sort((a, b) => 
      new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime()
    )
    
    const newAllocations: { [key: number]: string } = {}
    let remaining = amount
    
    for (const invoice of sortedInvoices) {
      if (remaining <= 0) break
      
      const balance = parseFloat(invoice.balance)
      const allocate = Math.min(remaining, balance)
      
      if (allocate > 0) {
        newAllocations[invoice.id] = allocate.toFixed(2)
        remaining -= allocate
      }
    }
    
    setAllocations(newAllocations)
    setValidationErrors([])
  }

  if (!isOpen) return null

  const totalAllocated = calculateTotalAllocated()
  const paymentAmountNum = parseFloat(paymentAmount) || 0
  const unallocated = paymentAmountNum - totalAllocated

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-display font-bold text-[var(--color-primary)]">
              Record Payment
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              For: <span className="font-semibold">{patientName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">Payment recorded successfully!</p>
          </div>
        )}

        {/* Error Messages */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-800 font-semibold mb-2">Please fix the following:</p>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((err, idx) => (
                    <li key={idx} className="text-amber-700 text-sm">{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Payment Details Section */}
            <div className="bg-gray-50 rounded-lg p-5 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payment Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Payment Amount (₱) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card (Manual)</option>
                    <option value="debit_card">Debit Card (Manual)</option>
                    <option value="gcash">GCash</option>
                    <option value="paymaya">PayMaya</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {paymentMethod === "check" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Check Number
                    </label>
                    <input
                      type="text"
                      value={checkNumber}
                      onChange={(e) => setCheckNumber(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter check number"
                    />
                  </div>
                )}

                {(paymentMethod === "check" || paymentMethod === "bank_transfer") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter bank name"
                    />
                  </div>
                )}

                {(paymentMethod === "bank_transfer" || paymentMethod === "gcash" || paymentMethod === "paymaya") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter reference number"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any additional notes about this payment..."
                />
              </div>
            </div>

            {/* Payment Allocation Section */}
            <div className="bg-blue-50 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Allocate Payment to Invoices
                </h3>
                {paymentAmountNum > 0 && unpaidInvoices.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoAllocate}
                    className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Auto-Allocate (Oldest First)
                  </button>
                )}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Payment Amount</p>
                  <p className="text-lg font-bold text-gray-900">₱{paymentAmountNum.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Total Allocated</p>
                  <p className="text-lg font-bold text-blue-600">₱{totalAllocated.toFixed(2)}</p>
                </div>
                <div className={`bg-white rounded-lg p-3 border ${unallocated === 0 ? 'border-green-200' : 'border-amber-200'}`}>
                  <p className="text-xs text-gray-600 mb-1">Unallocated</p>
                  <p className={`text-lg font-bold ${unallocated === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                    ₱{unallocated.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Invoice List */}
              {loadingInvoices ? (
                <div className="text-center py-8 text-gray-500">
                  Loading invoices...
                </div>
              ) : unpaidInvoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No unpaid invoices found for this patient.
                </div>
              ) : (
                <div className="space-y-3">
                  {unpaidInvoices.map((invoice) => (
                    <div key={invoice.id} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{invoice.invoice_number}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              invoice.status === 'overdue' ? 'bg-red-100 text-red-700' :
                              invoice.status === 'sent' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {invoice.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-0.5">
                            <p>Date: {new Date(invoice.invoice_date).toLocaleDateString()}</p>
                            <p>Service: {invoice.service_name || 'N/A'}</p>
                            <div className="flex gap-4 mt-2">
                              <span>Total: <span className="font-medium">₱{parseFloat(invoice.total_due).toFixed(2)}</span></span>
                              <span>Balance: <span className="font-bold text-red-600">₱{parseFloat(invoice.balance).toFixed(2)}</span></span>
                            </div>
                          </div>
                        </div>
                        <div className="w-32">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Pay Amount
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={invoice.balance}
                            value={allocations[invoice.id] || ""}
                            onChange={(e) => handleAllocationChange(invoice.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer with Actions */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || loadingInvoices || unpaidInvoices.length === 0}
            >
              {loading ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
