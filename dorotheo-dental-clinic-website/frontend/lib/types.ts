// Invoice-related types for the Invoice Generation System

export interface InvoiceItem {
  id?: number
  inventory_item_id: number
  item_name: string
  description?: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface InvoiceData {
  appointment_id: number
  service_charge: number
  items: InvoiceItem[]
  due_days: number
  notes: string
  send_email: boolean
  staff_emails?: string[]
}

export interface Invoice {
  id: number
  invoice_number: string
  reference_number: string
  appointment: number
  patient: number
  clinic: number
  created_by: number
  service_charge: string
  items_subtotal: string
  subtotal: string
  interest_rate: string
  interest_amount: string
  total_due: string
  total_paid: string
  balance: string
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'
  invoice_date: string
  due_date: string
  created_at: string
  updated_at: string
  sent_at?: string
  paid_at?: string
  notes: string
  payment_instructions: string
  bank_account: string
  items: InvoiceItem[]
}

export interface PatientBalance {
  patient_id: number
  patient_name: string
  total_invoiced: string
  total_paid: string
  total_balance: string
  overdue_amount: string
  last_invoice_date?: string
  invoices: Invoice[]
}

export interface InvoiceTotals {
  service_charge: number
  items_subtotal: number
  subtotal: number
  interest_amount: number
  total_due: number
}

export interface InventoryItem {
  id: number
  name: string
  category: string
  quantity: number
  unit: string
  unit_price: string
  description?: string
  clinic?: number
}
