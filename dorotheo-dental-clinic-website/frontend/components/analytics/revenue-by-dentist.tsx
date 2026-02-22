"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import type { DentistRevenue } from "@/lib/types/analytics"

interface RevenueByDentistProps {
  data: DentistRevenue[]
}

function formatCurrencyFull(value: number): string {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `₱${(value / 1_000).toFixed(0)}K`
  return `₱${value.toFixed(0)}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const item = payload[0].payload as DentistRevenue
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-[var(--color-text)] mb-1">{item.dentist_name}</p>
      <p className="text-sm text-green-600">Revenue: {formatCurrencyFull(item.revenue)}</p>
      <p className="text-sm text-[var(--color-text-muted)]">Appointments: {item.appointment_count}</p>
    </div>
  )
}

export default function RevenueByDentist({ data }: RevenueByDentistProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
          <h2 className="text-xl font-bold text-[var(--color-primary)]">Revenue by Dentist</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Revenue generated per dentist</p>
        </div>
        <div className="flex items-center justify-center h-[300px] text-[var(--color-text-muted)]">
          No dentist data available
        </div>
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.revenue - a.revenue)
  const chartHeight = Math.max(300, sorted.length * 45)

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <h2 className="text-xl font-bold text-[var(--color-primary)]">Revenue by Dentist</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Revenue generated per dentist</p>
      </div>
      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={formatCurrencyShort}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              type="category"
              dataKey="dentist_name"
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
              width={120}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
