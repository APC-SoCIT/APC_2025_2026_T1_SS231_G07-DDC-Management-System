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
  }, [token, period, clinicId])

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

  const operationalCards = [
    {
      label: "Total",
      value: data?.operational.total_appointments ?? 0,
      subtitle: "Appointments",
      icon: BarChart3,
      gradient: "from-slate-50 via-white to-emerald-50",
      border: "border-slate-200",
      iconWrap: "bg-slate-100",
      iconColor: "text-slate-700",
      labelColor: "text-slate-700",
      valueColor: "text-slate-900",
      subtitleColor: "text-slate-600",
      glow: "from-slate-300/25",
    },
    {
      label: "Completed",
      value: data?.operational.completed ?? 0,
      subtitle: "Appointments",
      icon: CheckCircle,
      gradient: "from-emerald-50 via-green-50 to-white",
      border: "border-emerald-200",
      iconWrap: "bg-emerald-100",
      iconColor: "text-emerald-700",
      labelColor: "text-emerald-800",
      valueColor: "text-emerald-900",
      subtitleColor: "text-emerald-700",
      glow: "from-emerald-300/30",
    },
    {
      label: "New",
      value: data?.operational.new_patients ?? 0,
      subtitle: "Patients",
      icon: UserPlus,
      gradient: "from-teal-50 via-emerald-50 to-white",
      border: "border-teal-200",
      iconWrap: "bg-teal-100",
      iconColor: "text-teal-700",
      labelColor: "text-teal-800",
      valueColor: "text-teal-900",
      subtitleColor: "text-teal-700",
      glow: "from-teal-300/30",
    },
    {
      label: "Returning",
      value: data?.operational.returning_patients ?? 0,
      subtitle: "Patients",
      icon: UserCheck,
      gradient: "from-sky-50 via-cyan-50 to-white",
      border: "border-sky-200",
      iconWrap: "bg-sky-100",
      iconColor: "text-sky-700",
      labelColor: "text-sky-800",
      valueColor: "text-sky-900",
      subtitleColor: "text-sky-700",
      glow: "from-sky-300/30",
    },
    {
      label: "Cancel Rate",
      value: `${data?.operational.cancellation_rate.toFixed(1) ?? "0.0"}%`,
      subtitle: `${data?.operational.cancelled ?? 0} cancelled`,
      icon: XCircle,
      gradient: "from-rose-50 via-red-50 to-white",
      border: "border-rose-200",
      iconWrap: "bg-rose-100",
      iconColor: "text-rose-700",
      labelColor: "text-rose-800",
      valueColor: "text-rose-900",
      subtitleColor: "text-rose-700",
      glow: "from-rose-300/30",
    },
    {
      label: "No-Show",
      value: `${data?.operational.no_show_rate.toFixed(1) ?? "0.0"}%`,
      subtitle: `${data?.operational.missed ?? 0} missed`,
      icon: Users,
      gradient: "from-amber-50 via-orange-50 to-white",
      border: "border-amber-200",
      iconWrap: "bg-amber-100",
      iconColor: "text-amber-700",
      labelColor: "text-amber-800",
      valueColor: "text-amber-900",
      subtitleColor: "text-amber-700",
      glow: "from-amber-300/30",
    },
  ]

  return (
    <div className="space-y-5 lg:space-y-6 pb-6">
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

        <div className="sticky top-2 z-20 rounded-xl border border-[var(--color-border)] bg-white/95 p-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                className={`min-w-24 flex-1 px-3 sm:px-4 py-2 rounded-md font-medium transition-all duration-150 whitespace-nowrap text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 ${
                  period === filter.id
                    ? "bg-[var(--color-primary)] text-white shadow-sm"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-background)] hover:text-[var(--color-text)]"
                }`}
                aria-pressed={period === filter.id}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date range indicator */}
      <div className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start sm:items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <Calendar className="w-4 h-4 mt-0.5 sm:mt-0 shrink-0" />
          <span>
            Showing data for:{" "}
            <strong className="text-[var(--color-text)]">
              {data ? getDateRangeLabel(data.start_date, data.end_date) : periodLabel}
            </strong>
            {data?.clinic_name && (
              <> · Clinic: <strong className="text-[var(--color-text)]">{data.clinic_name}</strong></>
            )}
          </span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="sticky top-[4.5rem] z-10 rounded-xl border border-[var(--color-border)] bg-white/95 p-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
              className={`min-w-28 flex-1 px-4 py-2 rounded-md font-medium transition-all duration-150 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 ${
                activeTab === tab.id
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-background)] hover:text-[var(--color-text)]"
              }`}
              aria-pressed={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
            <div className="space-y-5 lg:space-y-6">
              {/* Row 1: Summary cards */}
              <AnalyticsSummaryCards financial={data.financial} />

              {/* Row 2: Revenue chart (full width) */}
              <RevenueChart data={data.financial.revenue_time_series} period={data.period} />

              {/* Row 3: Revenue by Service + Revenue by Dentist */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
                <RevenueByService data={data.financial.revenue_by_service} />
                <RevenueByDentist data={data.financial.revenue_by_dentist} />
              </div>

              {/* Row 4: Invoice Status + Payment Methods */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
                <InvoiceStatusChart data={data.financial.invoice_status_distribution} />
                <PaymentMethodChart data={data.financial.payment_method_distribution} />
              </div>
            </div>
          )}

          {/* ============= OPERATIONAL TAB ============= */}
          {activeTab === "operational" && (
            <div className="space-y-5 lg:space-y-6">
              {/* Row 1: Stats cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 sm:gap-5">
                {operationalCards.map((card) => {
                  const Icon = card.icon
                  return (
                    <div
                      key={card.label}
                      className={`group relative overflow-hidden bg-gradient-to-br ${card.gradient} rounded-2xl p-4 sm:p-5 border ${card.border} min-h-[148px] flex flex-col justify-between shadow-[0_10px_30px_-18px_rgba(15,76,58,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-20px_rgba(15,76,58,0.5)]`}
                    >
                      <div className={`pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-gradient-to-br ${card.glow} to-transparent blur-2xl`} />
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-2 rounded-lg ${card.iconWrap} ring-1 ring-white/80 shadow-sm`}>
                            <Icon className={`w-4 h-4 ${card.iconColor}`} />
                          </div>
                          <div className="min-w-0">
                            <h3 className={`text-sm sm:text-[0.95rem] font-semibold leading-tight ${card.labelColor} truncate`}>
                              {card.label}
                            </h3>
                          </div>
                        </div>
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${card.iconWrap} opacity-60 mt-1`} aria-hidden="true" />
                      </div>
                      <div>
                        <p className={`text-2xl sm:text-[1.7rem] leading-none font-bold ${card.valueColor}`}>
                          {card.value}
                        </p>
                        <p className={`text-xs mt-2 ${card.subtitleColor}`}>{card.subtitle}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Row 2: Patient Volume (full width) */}
              <PatientVolumeChart data={data.operational.patient_volume_time_series} period={data.period} />

              {/* Row 3: Appointment Status + Top Services */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
                <AppointmentStatusChart data={data.operational.appointment_status_distribution} />
                <TopServicesTable data={data.operational.top_services} />
              </div>

              {/* Row 4: Busiest Hours (full width) */}
              <BusiestHoursChart data={data.operational.busiest_hours} />
            </div>
          )}

          {/* ============= INVENTORY TAB ============= */}
          {activeTab === "inventory" && (
            <div className="space-y-5 lg:space-y-6">
              {/* Row 1: Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 via-green-50 to-white rounded-2xl p-4 sm:p-6 border border-emerald-200 min-h-[154px] flex flex-col justify-between shadow-[0_10px_30px_-18px_rgba(15,76,58,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-20px_rgba(15,76,58,0.5)]">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-gradient-to-br from-emerald-300/35 to-transparent blur-2xl" />
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 sm:p-3 bg-emerald-600 rounded-xl ring-1 ring-white/80 shadow-sm">
                        <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-[0.95rem] font-semibold leading-tight text-emerald-900 truncate">Total Value</h3>
                      </div>
                    </div>
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600 opacity-60 mt-1" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-[1.7rem] font-bold text-emerald-950 mb-1">
                      {formatCurrency(data.inventory.total_value)}
                    </p>
                    <p className="text-xs sm:text-sm text-emerald-800">Current inventory value</p>
                  </div>
                </div>
                <div className={`group relative overflow-hidden bg-gradient-to-br ${data.inventory.low_stock_count > 0 ? "from-amber-50 via-yellow-50 to-white border-amber-200" : "from-emerald-50 via-green-50 to-white border-emerald-200"} rounded-2xl p-4 sm:p-6 border min-h-[154px] flex flex-col justify-between shadow-[0_10px_30px_-18px_rgba(15,76,58,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-20px_rgba(15,76,58,0.5)]`}>
                  <div className={`pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-gradient-to-br ${data.inventory.low_stock_count > 0 ? "from-amber-300/35" : "from-emerald-300/35"} to-transparent blur-2xl`} />
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 sm:p-3 rounded-xl ring-1 ring-white/80 shadow-sm ${data.inventory.low_stock_count > 0 ? "bg-amber-600" : "bg-emerald-600"}`}>
                        <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className={`text-sm sm:text-[0.95rem] font-semibold leading-tight truncate ${data.inventory.low_stock_count > 0 ? "text-amber-900" : "text-emerald-900"}`}>
                          Low Stock
                        </h3>
                      </div>
                    </div>
                    <span className={`inline-block h-2.5 w-2.5 rounded-full opacity-60 mt-1 ${data.inventory.low_stock_count > 0 ? "bg-amber-600" : "bg-emerald-600"}`} aria-hidden="true" />
                  </div>
                  <div>
                    <p className={`text-2xl sm:text-[1.7rem] font-bold mb-1 ${data.inventory.low_stock_count > 0 ? "text-amber-900" : "text-emerald-950"}`}>
                      {data.inventory.low_stock_count}
                    </p>
                    <p className={`text-xs sm:text-sm ${data.inventory.low_stock_count > 0 ? "text-amber-800" : "text-emerald-800"}`}>
                      {data.inventory.low_stock_count > 0 ? "Items need restocking" : "All items well stocked"}
                    </p>
                  </div>
                </div>
                {data.inventory.inventory_value_by_clinic.length > 0 && (
                  <div className="group relative overflow-hidden bg-gradient-to-br from-[var(--color-background)] via-white to-emerald-50 rounded-2xl p-4 sm:p-6 border border-[var(--color-border)] min-h-[154px] shadow-[0_10px_30px_-18px_rgba(15,76,58,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-20px_rgba(15,76,58,0.5)]">
                    <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-gradient-to-br from-emerald-300/30 to-transparent blur-2xl" />
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 sm:p-3 bg-[var(--color-primary)] rounded-xl ring-1 ring-white/80 shadow-sm">
                          <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-[0.95rem] font-semibold leading-tight text-[var(--color-primary)] truncate">By Clinic</h3>
                        </div>
                      </div>
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-primary)] opacity-60 mt-1" aria-hidden="true" />
                    </div>
                    <div className="space-y-2 pr-1">
                      {data.inventory.inventory_value_by_clinic.map((clinic) => (
                        <div key={clinic.clinic_id} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 bg-white/80 border border-emerald-100">
                          <span className="text-xs text-[var(--color-text)] truncate">{clinic.clinic_name}</span>
                          <span className="text-xs font-bold text-[var(--color-primary)]">{formatCurrency(clinic.value)}</span>
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
