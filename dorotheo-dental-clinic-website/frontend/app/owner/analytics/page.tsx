"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar, Users, CheckCircle, XCircle, UserPlus, UserCheck, BarChart3, AlertTriangle, Package, DollarSign } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { useClinic } from "@/lib/clinic-context"
import { getAnalytics } from "@/lib/api"
import { useInventoryAnalytics } from "@/lib/inventory-analytics-context"
import type { AnalyticsResponse } from "@/lib/types/analytics"

// Analytics chart components
import AnalyticsLoading from "@/components/analytics/analytics-loading"
import AnalyticsSummaryCards from "@/components/analytics/analytics-summary-cards"
import RevenueChart from "@/components/analytics/revenue-chart"
import RevenueByService from "@/components/analytics/revenue-by-service"
import RevenueByDentist from "@/components/analytics/revenue-by-dentist"
import InvoiceStatusChart from "@/components/analytics/invoice-status-chart"
import PaymentMethodChart from "@/components/analytics/payment-method-chart"
import PatientVolumeChart from "@/components/analytics/patient-volume-chart"
import AppointmentStatusChart from "@/components/analytics/appointment-status-chart"
import TopServicesTable from "@/components/analytics/top-services-table"
import BusiestHoursChart from "@/components/analytics/busiest-hours-chart"
import LowStockAlerts from "@/components/analytics/low-stock-alerts"

type Period = "daily" | "weekly" | "monthly" | "annual"
type Tab = "financial" | "operational" | "inventory"

function formatCurrency(value: number): string {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getDateRangeLabel(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }
  return `${start.toLocaleDateString("en-PH", opts)} — ${end.toLocaleDateString("en-PH", opts)}`
}

export default function OwnerAnalytics() {
  const { token } = useAuth()
  const { selectedClinic } = useClinic()
  const { inventoryVersion } = useInventoryAnalytics()
  const [period, setPeriod] = useState<Period>("monthly")
  const [activeTab, setActiveTab] = useState<Tab>("financial")
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const clinicId = selectedClinic === "all" ? undefined : selectedClinic?.id

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const response = await getAnalytics(token, {
        period,
        clinic_id: clinicId ?? null,
      })
      setData(response as AnalyticsResponse)
    } catch (err) {
      console.error("Analytics fetch error:", err)
      setError(err instanceof Error ? err.message : "Failed to load analytics data")
    } finally {
      setLoading(false)
    }
  }, [token, period, clinicId, inventoryVersion])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const periodLabel = (() => {
    switch (period) {
      case "daily": return "Today"
      case "weekly": return "Last 7 Days"
      case "monthly": return "Last 30 Days"
      case "annual": return "Last 12 Months"
    }
  })()

  return (
    <div className="space-y-6">
      {/* Header + Period Selector */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--color-primary)] mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-text-muted)]">
            Revenue and expenses overview
          </p>
        </div>

        <div className="flex gap-1 sm:gap-2 bg-white border border-[var(--color-border)] rounded-lg p-1 flex-wrap sm:flex-nowrap">
          {(
            [
              { id: "daily", label: "Daily" },
              { id: "weekly", label: "Weekly" },
              { id: "monthly", label: "Monthly" },
              { id: "annual", label: "Annual" },
            ] as { id: Period; label: string }[]
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setPeriod(filter.id)}
              className={`flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0 px-2 sm:px-4 py-2 sm:py-2 rounded-md font-medium transition-colors whitespace-nowrap text-xs sm:text-base ${
                period === filter.id
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date range indicator */}
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Calendar className="w-4 h-4" />
        <span>
          Showing data for:{" "}
          <strong>
            {data ? getDateRangeLabel(data.start_date, data.end_date) : periodLabel}
          </strong>
          {data?.clinic_name && (
            <> · Clinic: <strong>{data.clinic_name}</strong></>
          )}
        </span>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 bg-white border border-[var(--color-border)] rounded-lg p-1 w-fit">
        {(
          [
            { id: "financial", label: "Financial" },
            { id: "operational", label: "Operational" },
            { id: "inventory", label: "Inventory" },
          ] as { id: Tab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md font-medium transition-colors text-sm ${
              activeTab === tab.id
                ? "bg-[var(--color-primary)] text-white"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <AnalyticsLoading />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-red-800 mb-1">Failed to load analytics</h3>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : data ? (
        <>
          {/* ============= FINANCIAL TAB ============= */}
          {activeTab === "financial" && (
            <div className="space-y-6">
              {/* Row 1: Summary cards */}
              <AnalyticsSummaryCards financial={data.financial} />

              {/* Row 2: Revenue chart (full width) */}
              <RevenueChart data={data.financial.revenue_time_series} period={data.period} />

              {/* Row 3: Revenue by Service + Revenue by Dentist */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RevenueByService data={data.financial.revenue_by_service} />
                <RevenueByDentist data={data.financial.revenue_by_dentist} />
              </div>

              {/* Row 4: Invoice Status + Payment Methods */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <InvoiceStatusChart data={data.financial.invoice_status_distribution} />
                <PaymentMethodChart data={data.financial.payment_method_distribution} />
              </div>
            </div>
          )}

          {/* ============= OPERATIONAL TAB ============= */}
          {activeTab === "operational" && (
            <div className="space-y-6">
              {/* Row 1: Stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">Total</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{data.operational.total_appointments}</p>
                  <p className="text-xs text-blue-600">Appointments</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700">Completed</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{data.operational.completed}</p>
                  <p className="text-xs text-green-600">Appointments</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-700">New</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-900">{data.operational.new_patients}</p>
                  <p className="text-xs text-emerald-600">Patients</p>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 border border-cyan-200">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="w-4 h-4 text-cyan-600" />
                    <span className="text-xs font-medium text-cyan-700">Returning</span>
                  </div>
                  <p className="text-2xl font-bold text-cyan-900">{data.operational.returning_patients}</p>
                  <p className="text-xs text-cyan-600">Patients</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-medium text-red-700">Cancel Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900">{data.operational.cancellation_rate.toFixed(1)}%</p>
                  <p className="text-xs text-red-600">{data.operational.cancelled} cancelled</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-medium text-orange-700">No-Show</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900">{data.operational.no_show_rate.toFixed(1)}%</p>
                  <p className="text-xs text-orange-600">{data.operational.missed} missed</p>
                </div>
              </div>

              {/* Row 2: Patient Volume (full width) */}
              <PatientVolumeChart data={data.operational.patient_volume_time_series} period={data.period} />

              {/* Row 3: Appointment Status + Top Services */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AppointmentStatusChart data={data.operational.appointment_status_distribution} />
                <TopServicesTable data={data.operational.top_services} />
              </div>

              {/* Row 4: Busiest Hours (full width) */}
              <BusiestHoursChart data={data.operational.busiest_hours} />
            </div>
          )}

          {/* ============= INVENTORY TAB ============= */}
          {activeTab === "inventory" && (
            <div className="space-y-6">
              {/* Row 1: Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-xl p-4 sm:p-6 border border-blue-200 min-h-[140px] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="p-2 sm:p-3 bg-blue-500 rounded-lg">
                      <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-blue-700">Total Value</span>
                  </div>
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-blue-900 mb-1">
                      {formatCurrency(data.inventory.total_value)}
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-700">Current inventory value</p>
                  </div>
                </div>
                <div className={`bg-gradient-to-br ${data.inventory.low_stock_count > 0 ? "from-amber-50 to-yellow-100 border-amber-200" : "from-green-50 to-emerald-100 border-green-200"} rounded-xl p-4 sm:p-6 border min-h-[140px] flex flex-col justify-between`}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className={`p-2 sm:p-3 rounded-lg ${data.inventory.low_stock_count > 0 ? "bg-amber-500" : "bg-green-500"}`}>
                      <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <span className={`text-xs sm:text-sm font-medium ${data.inventory.low_stock_count > 0 ? "text-amber-700" : "text-green-700"}`}>
                      Low Stock
                    </span>
                  </div>
                  <div>
                    <h3 className={`text-2xl sm:text-3xl font-bold mb-1 ${data.inventory.low_stock_count > 0 ? "text-amber-900" : "text-green-900"}`}>
                      {data.inventory.low_stock_count}
                    </h3>
                    <p className={`text-xs sm:text-sm ${data.inventory.low_stock_count > 0 ? "text-amber-700" : "text-green-700"}`}>
                      {data.inventory.low_stock_count > 0 ? "Items need restocking" : "All items well stocked"}
                    </p>
                  </div>
                </div>
                {data.inventory.inventory_value_by_clinic.length > 0 && (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 sm:p-6 border border-purple-200 min-h-[140px]">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="p-2 sm:p-3 bg-purple-500 rounded-lg">
                        <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-purple-700">By Clinic</span>
                    </div>
                    <div className="space-y-2">
                      {data.inventory.inventory_value_by_clinic.map((clinic) => (
                        <div key={clinic.clinic_id} className="flex items-center justify-between">
                          <span className="text-xs text-purple-700 truncate">{clinic.clinic_name}</span>
                          <span className="text-xs font-bold text-purple-900">{formatCurrency(clinic.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 2: Low Stock Alerts */}
              <LowStockAlerts data={data.inventory.low_stock_items} totalValue={data.inventory.total_value} />
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
