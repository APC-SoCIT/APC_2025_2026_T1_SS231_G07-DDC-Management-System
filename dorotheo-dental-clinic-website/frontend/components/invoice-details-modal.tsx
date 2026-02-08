"use client"

import { useState } from "react"
import { X, FileText, Calendar, DollarSign, User, Building2 } from "lucide-react"
import { Invoice, Payment } from "@/lib/types"
import InvoicePaymentHistory from "@/components/invoice-payment-history"

interface InvoiceDetailsModalProps {
  invoice: Invoice
  token: string
  payments?: Payment[]
  onClose: () => void
  onUpdate?: () => void
}

export default function InvoiceDetailsModal({
  invoice,
  token,
  payments,
  onClose,
  onUpdate,
}: InvoiceDetailsModalProps) {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700"
      case "overdue":
        return "bg-red-100 text-red-700"
      case "sent":
        return "bg-amber-100 text-amber-700"
      case "draft":
        return "bg-gray-100 text-gray-700"
      case "partially_paid":
        return "bg-blue-100 text-blue-700"
      case "cancelled":
        return "bg-gray-100 text-gray-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text)]">Invoice Details</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">{invoice.invoice_number}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {/* Invoice Status */}
          <div className="flex items-center justify-between p-4 bg-[var(--color-background)] rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[var(--color-text-muted)]" />
              <div>
                <p className="text-sm font-medium text-[var(--color-text-muted)]">Status</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(invoice.status)}`}>
                  {formatStatus(invoice.status)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--color-text-muted)]">Reference Number</p>
              <p className="font-semibold text-[var(--color-text)]">{invoice.reference_number}</p>
            </div>
          </div>

          {/* Invoice Information */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Invoice Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-[var(--color-background)] rounded-lg">
                <Calendar className="w-5 h-5 text-[var(--color-text-muted)] mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">Invoice Date</p>
                  <p className="font-medium text-[var(--color-text)] mt-1">
                    {new Date(invoice.invoice_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-[var(--color-background)] rounded-lg">
                <Calendar className="w-5 h-5 text-[var(--color-text-muted)] mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">Due Date</p>
                  <p className="font-medium text-[var(--color-text)] mt-1">
                    {new Date(invoice.due_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Financial Summary</h3>
            <div className="space-y-3 p-4 bg-[var(--color-background)] rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">Service Charge</span>
                <span className="font-medium text-[var(--color-text)]">
                  ₱{parseFloat(invoice.service_charge).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">Items Subtotal</span>
                <span className="font-medium text-[var(--color-text)]">
                  ₱{parseFloat(invoice.items_subtotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {parseFloat(invoice.interest_amount) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-muted)]">
                    Interest ({invoice.interest_rate}%)
                  </span>
                  <span className="font-medium text-[var(--color-text)]">
                    ₱{parseFloat(invoice.interest_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                <span className="font-semibold text-[var(--color-text)]">Total Due</span>
                <span className="text-xl font-bold text-[var(--color-text)]">
                  ₱{parseFloat(invoice.total_due).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-green-700">Total Paid</span>
                <span className="text-xl font-bold text-green-700">
                  ₱{parseFloat(invoice.total_paid || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                <span className="font-semibold text-[var(--color-text)]">Balance</span>
                <span className={`text-xl font-bold ${parseFloat(invoice.balance) > 0 ? "text-red-600" : "text-green-600"}`}>
                  ₱{parseFloat(invoice.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          {invoice.items && invoice.items.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Invoice Items</h3>
              <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[var(--color-background)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                        Item
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {invoice.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-[var(--color-text)]">{item.item_name}</p>
                            {item.description && (
                              <p className="text-sm text-[var(--color-text-muted)]">{item.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-[var(--color-text)]">
                          {item.quantity} {item.unit || 'unit'}
                        </td>
                        <td className="px-4 py-3 text-right text-[var(--color-text)]">
                          ₱{(typeof item.unit_price === 'number' ? item.unit_price : parseFloat(item.unit_price || '0')).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[var(--color-text)]">
                          ₱{(typeof item.total_price === 'number' ? item.total_price : parseFloat(item.total_price || '0')).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Notes</h3>
              <div className="p-4 bg-[var(--color-background)] rounded-lg">
                <p className="text-[var(--color-text)] whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            </div>
          )}

          {/* Payment History */}
          <div className="pt-6 border-t border-[var(--color-border)]">
            <InvoicePaymentHistory
              invoiceId={invoice.id}
              invoiceNumber={invoice.invoice_number}
              token={token}
              payments={payments}
              onPaymentUpdate={onUpdate}
            />
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
