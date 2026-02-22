// Analytics API Response Types
// Matches the backend response shape from the analytics endpoint

// =============================================================================
// Financial Sub-Types
// =============================================================================

export interface TimeSeriesPoint {
  date: string
  revenue: number
  expenses: number
}

export interface ServiceRevenue {
  service: string
  category: string
  revenue: number
  count: number
}

export interface DentistRevenue {
  dentist_id: number
  dentist_name: string
  revenue: number
  appointment_count: number
}

export interface ClinicRevenue {
  clinic_id: number
  clinic_name: string
  revenue: number
}

export interface StatusDistribution {
  status: string
  count: number
  total?: number
}

export interface PaymentMethodDistribution {
  method: string
  method_display: string
  count: number
  total: number
}

// =============================================================================
// Operational Sub-Types
// =============================================================================

export interface TopService {
  service: string
  category: string
  count: number
}

export interface ClinicCount {
  clinic_id: number
  clinic_name: string
  count: number
}

export interface DentistCount {
  dentist_id: number
  dentist_name: string
  count: number
}

export interface HourCount {
  hour: number
  count: number
}

export interface PatientVolumePoint {
  date: string
  appointments: number
  new_patients: number
}

// =============================================================================
// Inventory Sub-Types
// =============================================================================

export interface LowStockItem {
  id: number
  name: string
  category: string
  quantity: number
  min_stock: number
  clinic: string
  clinic_id: number | null
}

export interface ClinicValue {
  clinic_id: number
  clinic_name: string
  value: number
}

// =============================================================================
// Section Interfaces
// =============================================================================

export interface FinancialAnalytics {
  total_revenue: number
  total_invoiced: number
  outstanding_balance: number
  overdue_amount: number
  total_expenses: number
  profit: number
  average_revenue_per_patient: number
  revenue_time_series: TimeSeriesPoint[]
  revenue_by_service: ServiceRevenue[]
  revenue_by_dentist: DentistRevenue[]
  revenue_by_clinic: ClinicRevenue[]
  invoice_status_distribution: StatusDistribution[]
  payment_method_distribution: PaymentMethodDistribution[]
}

export interface OperationalAnalytics {
  total_appointments: number
  completed: number
  cancelled: number
  missed: number
  cancellation_rate: number
  no_show_rate: number
  new_patients: number
  returning_patients: number
  total_unique_patients: number
  appointment_status_distribution: StatusDistribution[]
  top_services: TopService[]
  appointments_by_clinic: ClinicCount[]
  appointments_by_dentist: DentistCount[]
  busiest_hours: HourCount[]
  patient_volume_time_series: PatientVolumePoint[]
}

export interface InventoryAnalytics {
  low_stock_count: number
  total_value: number
  low_stock_items: LowStockItem[]
  inventory_value_by_clinic: ClinicValue[]
}

// =============================================================================
// Top-Level Response
// =============================================================================

export interface AnalyticsResponse {
  period: string
  start_date: string
  end_date: string
  clinic_id: number | null
  clinic_name: string | null
  financial: FinancialAnalytics
  operational: OperationalAnalytics
  inventory: InventoryAnalytics
}
