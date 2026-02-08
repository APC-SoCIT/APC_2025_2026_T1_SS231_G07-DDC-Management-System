"use client"

import { useState, useEffect } from "react"
import { getPayment } from "@/lib/api"
import { Payment } from "@/lib/types"
import { DollarSign, Calendar, CreditCard, FileText, AlertTriangle, Eye } from "lucide-react"
import PaymentDetailsModal from "@/components/payment-details-modal"

interface InvoicePaymentHistoryProps {
  invoiceId: number
  invoiceNumber: string
  token: string
  payments?: Payment[] // Optional: pass pre-fetched payments
  onPaymentUpdate?: () => void // Optional callback when payment is voided
}

export default function InvoicePaymentHistory({
  invoiceId,
  invoiceNumber,
  token,
  payments: propPayments,
  onPaymentUpdate,
}: InvoicePaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>(propPayments || [])
  const [loading, setLoading] = useState(!propPayments)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  useEffect(() => {
    if (!propPayments) {
      fetchPayments()
    }
  }, [invoiceId, propPayments])

  useEffect(() => {
    if (propPayments) {
      setPayments(propPayments)
    }
  }, [propPayments])

  const fetchPayments = async () => {
    // Note: This requires a backend endpoint to get payments for a specific invoice
    // For now, we'll rely on propPayments being passed from parent component
    setLoading(false)
  }

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment)
    setShowDetailsModal(true)
  }

  const handlePaymentUpdated = () => {
    if (onPaymentUpdate) {
      onPaymentUpdate()
    }
    fetchPayments()
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

  // Filter payments that have splits for this invoice
  const invoicePayments = payments.filter((payment) =>
    payment.splits?.some((split) => split.invoice === invoiceId)
  )

  const totalPaid = invoicePayments.reduce((sum, payment) => {
    if (payment.voided) return sum
    const invoiceSplit = payment.splits?.find((split) => split.invoice === invoiceId)
    return sum + (invoiceSplit ? (typeof invoiceSplit.amount === 'string' ? parseFloat(invoiceSplit.amount) : invoiceSplit.amount) : 0)
  }, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">Payment History</h3>
        {invoicePayments.length > 0 && (
          <div className="text-sm text-[var(--color-text-muted)]">
            Total Paid:{" "}
            <span className="font-semibold text-green-600">
              ₱{totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {invoicePayments.length === 0 ? (
        <div className="p-8 text-center bg-[var(--color-background)] rounded-lg border-2 border-dashed border-[var(--color-border)]">
          <DollarSign className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-muted)] opacity-50" />
          <p className="text-[var(--color-text-muted)] font-medium">No payments recorded yet</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Payments for this invoice will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoicePayments.map((payment) => {
            const invoiceSplit = payment.splits?.find((split) => split.invoice === invoiceId)
            const allocatedAmount = invoiceSplit ? (typeof invoiceSplit.amount === 'string' ? parseFloat(invoiceSplit.amount) : invoiceSplit.amount) : 0

            return (
              <div
                key={payment.id}
                className={`p-4 rounded-lg border ${
                  payment.voided
                    ? "bg-red-50 border-red-200"
                    : "bg-white border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-sm"
                } transition-all`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`p-2 rounded-lg ${
                          payment.voided ? "bg-red-100" : "bg-green-100"
                        }`}
                      >
                        <DollarSign
                          className={`w-4 h-4 ${
                            payment.voided ? "text-red-600" : "text-green-600"
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-[var(--color-text)]">
                            {payment.payment_number}
                          </h4>
                          {payment.voided && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Voided
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          {new Date(payment.payment_date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 ml-0 sm:ml-12">
                      <div>
                        <p className="text-xs text-[var(--color-text-muted)]">Amount Allocated</p>
                        <p className={`font-semibold ${payment.voided ? "text-red-600 line-through" : "text-green-600"}`}>
                          ₱{allocatedAmount.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-muted)]">Payment Method</p>
                        <p className="font-medium text-[var(--color-text)]">
                          {getPaymentMethodLabel(payment.payment_method)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-muted)]">Total Payment</p>
                        <p className="font-medium text-[var(--color-text)]">
                          ₱{parseFloat(payment.amount).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>

                    {payment.voided && payment.void_reason && (
                      <div className="mt-3 p-2 bg-red-100 rounded border border-red-200 ml-0 sm:ml-12">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-red-900">Void Reason:</p>
                            <p className="text-xs text-red-800">{payment.void_reason}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleViewDetails(payment)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-[var(--color-primary)] hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Eye className="w-4 h-4" />
                    Details
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Payment Details Modal */}
      {showDetailsModal && selectedPayment && (
        <PaymentDetailsModal
          payment={selectedPayment}
          token={token}
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
