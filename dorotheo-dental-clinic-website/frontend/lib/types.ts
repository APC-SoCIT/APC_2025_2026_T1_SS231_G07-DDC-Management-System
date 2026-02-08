// Invoice-related types for the Invoice Generation System

export interface InvoiceItem {
  id?: number
  inventory_item_id: number
  item_name: string
  description?: string
  quantity: number
  unit?: string
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

// Payment-related types for the Payment Recording System

export type PaymentMethod = 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'gcash' | 'paymaya' | 'other'

export interface PaymentSplit {
  id?: number
  payment?: number
  invoice: number
  invoice_number?: string
  invoice_description?: string
  invoice_balance?: string
  amount: string
  provider?: number
  provider_name?: string
  is_voided?: boolean
  created_at?: string
}

export interface Payment {
  id: number
  payment_number: string
  patient: number
  patient_name: string
  patient_email: string
  clinic: number | null
  clinic_name?: string
  amount: string
  payment_date: string
  payment_method: PaymentMethod
  payment_method_display: string
  check_number?: string
  bank_name?: string
  reference_number?: string
  notes?: string
  recorded_by: number
  recorded_by_name: string
  voided: boolean
  is_voided?: boolean
  voided_at?: string
  voided_by?: number
  voided_by_name?: string
  void_reason?: string
  created_at: string
  updated_at: string
  splits?: PaymentSplit[]
  allocated_amount?: string
  unallocated_amount?: string
}

export interface PaymentAllocation {
  invoice_id: number
  amount: number
  provider_id?: number
}

export interface PaymentRecordData {
  patient_id: number
  clinic_id?: number
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  check_number?: string
  bank_name?: string
  reference_number?: string
  notes?: string
  allocations: PaymentAllocation[]
}

export interface InvoiceWithPatient extends Invoice {
  patient_name?: string
  patient_email?: string
  appointment_date?: string
  service_name?: string
  dentist_name?: string
}

export interface Patient {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  date_of_birth?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipcode?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  medical_history?: any
  is_active?: boolean
  created_at?: string
  updated_at?: string
}
