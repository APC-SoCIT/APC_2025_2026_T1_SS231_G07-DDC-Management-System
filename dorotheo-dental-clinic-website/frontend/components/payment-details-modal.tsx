"use client"

import { useState, useEffect } from "react"
import { X, DollarSign, Calendar, CreditCard, User, FileText, AlertTriangle, Check } from "lucide-react"
import { getPayment, voidPayment } from "@/lib/api"
import { Payment } from "@/lib/types"

interface PaymentDetailsModalProps {
  payment: Payment
  token: string
  onClose: () => void
  onPaymentUpdated: () => void
}

export default function PaymentDetailsModal({ payment: initialPayment, token, onClose, onPaymentUpdated }: PaymentDetailsModalProps) {
  const [payment, setPayment] = useState<Payment>(initialPayment)
  const [loading, setLoading] = useState(false)
  const [showVoidConfirm, setShowVoidConfirm] = useState(false)
  const [voidReason, setVoidReason] = useState("")
  const [voidError, setVoidError] = useState("")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    refreshPaymentDetails()
  }, [])

  const refreshPaymentDetails = async () => {
    setRefreshing(true)
    try {
      const updatedPayment = await getPayment(payment.id, token)
      setPayment(updatedPayment)
    } catch (error) {
      console.error("Failed to refresh payment details:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleVoidPayment = async () => {
    if (!voidReason.trim()) {
      setVoidError("Please provide a reason for voiding this payment")
      return
    }

    setLoading(true)
    setVoidError("")

    try {
      await voidPayment(payment.id, voidReason, token)
      onPaymentUpdated()
      onClose()
    } catch (error: any) {
      setVoidError(error.message || "Failed to void payment")
    } finally {
      setLoading(false)
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      cash: "Cash",
      check: "Check",
      bank_transfer: "Bank Transfer",
      credit_card: "Credit Card",
      debit_card: "Debit Card",
      gcash: "GCash",
      paymaya: "PayMaya",
      other: "Other",
    }
    return methods[method] || method
  }

  const totalAllocated = payment.splits?.reduce((sum, split) => {
    const amount = typeof split.amount === 'string' ? parseFloat(split.amount) : split.amount
    return sum + amount
  }, 0) || 0
  const unallocated = parseFloat(payment.amount) - totalAllocated

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text)]">Payment Details</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">{payment.payment_number}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {refreshing && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-700">Refreshing payment details...</span>
            </div>
          )}

          {/* Voided Status */}
          {payment.voided && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900">This payment has been voided</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Voided on {new Date(payment.voided_at!).toLocaleString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {payment.void_reason && (
                    <p className="text-sm text-red-700 mt-2">
                      <strong>Reason:</strong> {payment.void_reason}
                    </p>
                  )}
                  {payment.voided_by_name && (
                    <p className="text-sm text-red-700 mt-1">
                      <strong>Voided by:</strong> {payment.voided_by_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Payment Information */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Payment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-[var(--color-background)] rounded-lg">
                  <DollarSign className="w-5 h-5 text-[var(--color-text-muted)] mt-0.5" />
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Payment Amount</p>
                    <p className="text-lg font-semibold text-[var(--color-text)] mt-1">
                      ₱{parseFloat(payment.amount).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-[var(--color-background)] rounded-lg">
                  <Calendar className="w-5 h-5 text-[var(--color-text-muted)] mt-0.5" />
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Payment Date</p>
                    <p className="text-lg font-semibold text-[var(--color-text)] mt-1">
                      {new Date(payment.payment_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-[var(--color-background)] rounded-lg">
                  <CreditCard className="w-5 h-5 text-[var(--color-text-muted)] mt-0.5" />
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Payment Method</p>
                    <p className="text-lg font-semibold text-[var(--color-text)] mt-1">
                      {getPaymentMethodLabel(payment.payment_method)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-[var(--color-background)] rounded-lg">
                  <User className="w-5 h-5 text-[var(--color-text-muted)] mt-0.5" />
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Patient</p>
                    <p className="text-lg font-semibold text-[var(--color-text)] mt-1">{payment.patient_name}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Payment Details */}
            {(payment.check_number || payment.bank_name || payment.reference_number) && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Additional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {payment.check_number && (
                    <div className="p-4 bg-[var(--color-background)] rounded-lg">
                      <p className="text-sm text-[var(--color-text-muted)]">Check Number</p>
                      <p className="font-medium text-[var(--color-text)] mt-1">{payment.check_number}</p>
                    </div>
                  )}
                  {payment.bank_name && (
                    <div className="p-4 bg-[var(--color-background)] rounded-lg">
                      <p className="text-sm text-[var(--color-text-muted)]">Bank Name</p>
                      <p className="font-medium text-[var(--color-text)] mt-1">{payment.bank_name}</p>
                    </div>
                  )}
                  {payment.reference_number && (
                    <div className="p-4 bg-[var(--color-background)] rounded-lg">
                      <p className="text-sm text-[var(--color-text-muted)]">Reference Number</p>
                      <p className="font-medium text-[var(--color-text)] mt-1">{payment.reference_number}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {payment.notes && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Notes</h3>
                <div className="p-4 bg-[var(--color-background)] rounded-lg">
                  <p className="text-[var(--color-text)]">{payment.notes}</p>
                </div>
              </div>
            )}

            {/* Payment Allocation */}
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Payment Allocation</h3>
              
              {/* Allocation Summary */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">Total Payment</p>
                  <p className="text-xl font-bold text-blue-900 mt-1">
                    ₱{parseFloat(payment.amount).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">Allocated</p>
                  <p className="text-xl font-bold text-green-900 mt-1">
                    ₱{totalAllocated.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-700 font-medium">Unallocated</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    ₱{unallocated.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>

              {/* Splits Table */}
              {payment.splits && payment.splits.length > 0 ? (
                <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[var(--color-background)]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                          Invoice
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {payment.splits.map((split) => (
                        <tr key={split.id}>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-[var(--color-text)]">{split.invoice_number}</p>
                              {split.invoice_description && (
                                <p className="text-sm text-[var(--color-text-muted)] mt-1">{split.invoice_description}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-[var(--color-text)]">
                            ₱{(typeof split.amount === 'string' ? parseFloat(split.amount) : split.amount).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-[var(--color-text-muted)] bg-[var(--color-background)] rounded-lg">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No invoice allocations for this payment</p>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[var(--color-background)] rounded-lg">
                  <p className="text-sm text-[var(--color-text-muted)]">Recorded By</p>
                  <p className="font-medium text-[var(--color-text)] mt-1">{payment.recorded_by_name || "Unknown"}</p>
                </div>
                <div className="p-4 bg-[var(--color-background)] rounded-lg">
                  <p className="text-sm text-[var(--color-text-muted)]">Recorded At</p>
                  <p className="font-medium text-[var(--color-text)] mt-1">
                    {new Date(payment.created_at).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {payment.clinic_name && (
                  <div className="p-4 bg-[var(--color-background)] rounded-lg">
                    <p className="text-sm text-[var(--color-text-muted)]">Clinic Location</p>
                    <p className="font-medium text-[var(--color-text)] mt-1">{payment.clinic_name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Void Payment Section */}
            {!payment.voided && !showVoidConfirm && (
              <div className="pt-4 border-t border-[var(--color-border)]">
                <button
                  onClick={() => setShowVoidConfirm(true)}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Void This Payment
                </button>
              </div>
            )}

            {/* Void Confirmation */}
            {showVoidConfirm && !payment.voided && (
              <div className="pt-4 border-t border-[var(--color-border)]">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-red-900">Void Payment Confirmation</h4>
                      <p className="text-sm text-red-700 mt-1">
                        Voiding this payment will reverse all invoice allocations and update patient balances. This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-red-900 mb-2">
                      Reason for voiding <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      value={voidReason}
                      onChange={(e) => {
                        setVoidReason(e.target.value)
                        setVoidError("")
                      }}
                      placeholder="Enter the reason why this payment is being voided..."
                      className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                      rows={3}
                    />
                  </div>

                  {voidError && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                      <p className="text-sm text-red-800">{voidError}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleVoidPayment}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Voiding...
                        </span>
                      ) : (
                        "Confirm Void Payment"
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowVoidConfirm(false)
                        setVoidReason("")
                        setVoidError("")
                      }}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--color-border)] bg-[var(--color-background)]">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-white transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
