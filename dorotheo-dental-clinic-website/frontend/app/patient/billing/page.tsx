"use client"

import { useState, useEffect } from "react"
import { Download, CreditCard, CheckCircle, Clock, FileText } from "lucide-react"
import { api, downloadInvoicePDF } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { ClinicBadge } from "@/components/clinic-badge"

interface ClinicLocation {
  id: number
  name: string
  address: string
  city: string
  state: string
  zipcode: string
  phone: string
  email: string
}

interface Invoice {
  id: number
  invoice_number: string
  reference_number: string
  appointment: number
  patient: number
  clinic: number
  clinic_data?: ClinicLocation
  created_by: number
  service_charge: string
  items_subtotal: string
  subtotal: string
  interest_rate: string
  interest_amount: string
  total_due: string
  amount_paid: string
  balance: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  invoice_date: string
  due_date: string
  created_at: string
  updated_at: string
  sent_at?: string
  paid_at?: string
  notes: string
}

export default function PatientBilling() {
  const { token, user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!token || !user) return

      try {
        setIsLoading(true)
        const data = await api.getInvoices(token, user.id)
        setInvoices(data)
      } catch (error) {
        console.error("Error fetching invoices:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvoices()
  }, [token, user])

  const totalBalance = invoices.reduce((sum, inv) => sum + parseFloat(inv.balance || '0'), 0)
  const totalPaid = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount_paid || '0'), 0)

  const handleDownloadPDF = async (invoiceId: number) => {
    if (!token) return
    
    try {
      await downloadInvoicePDF(invoiceId, token)
    } catch (error) {
      console.error("Error downloading invoice PDF:", error)
      alert("Failed to download invoice PDF. Please try again.")
    }
  }

  return (
    <div className="space-y-6">
      <div>
  <h1 className="text-3xl font-sans font-bold text-[var(--color-primary)] mb-2">Billing & Payments</h1>
        <p className="text-[var(--color-text-muted)]">View your statement of accounts and payment history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Outstanding Balance</p>
              <p className="text-2xl font-bold text-[var(--color-text)]">₱{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Total Paid</p>
              <p className="text-2xl font-bold text-[var(--color-text)]">₱{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-xl border border-[var(--color-border)]">
        <div className="p-6 border-b border-[var(--color-border)]">
          <h2 className="text-xl font-semibold text-[var(--color-primary)]">Invoices</h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-[var(--color-text-muted)]">
            <p>Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)] opacity-30" />
            <p className="text-lg font-medium text-[var(--color-text)] mb-2">No Invoices Yet</p>
            <p className="text-sm text-[var(--color-text-muted)]">Your invoices will appear here after appointments</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[var(--color-primary)] rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--color-text)] mb-1">{invoice.invoice_number}</h3>
                      <p className="text-xs text-[var(--color-text-muted)] mb-1">Ref: {invoice.reference_number}</p>
                      <p className="text-sm text-[var(--color-text-muted)] mb-2">
                        Issued: {new Date(invoice.invoice_date).toLocaleDateString()} | 
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                      {invoice.clinic_data && <ClinicBadge clinic={invoice.clinic_data} size="sm" />}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-[var(--color-text-muted)]">Balance</p>
                      <p className="text-xl font-bold text-[var(--color-text)]">₱{parseFloat(invoice.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">Total: ₱{parseFloat(invoice.total_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${
                          invoice.status === 'paid' ? "bg-green-100 text-green-700" : 
                          invoice.status === 'overdue' ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </div>

                    <button 
                      onClick={() => handleDownloadPDF(invoice.id)}
                      className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
                      title="Download Invoice PDF"
                    >
                      <Download className="w-5 h-5 text-[var(--color-primary)]" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
