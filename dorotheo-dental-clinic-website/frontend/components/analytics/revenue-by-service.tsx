"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts"
import type { ServiceRevenue } from "@/lib/types/analytics"

interface RevenueByServiceProps {
  data: ServiceRevenue[]
}

const CATEGORY_COLORS: Record<string, string> = {
  general: "#3b82f6",
  cosmetic: "#8b5cf6",
  orthodontic: "#ec4899",
  surgical: "#ef4444",
  preventive: "#22c55e",
  restorative: "#f59e0b",
  diagnostic: "#06b6d4",
  periodontic: "#14b8a6",
  endodontic: "#f97316",
  prosthodontic: "#6366f1",
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] || "#6b7280"
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
  const item = payload[0].payload as ServiceRevenue
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-[var(--color-text)] mb-1">{item.service}</p>
      <p className="text-sm text-[var(--color-text-muted)]">Category: {item.category}</p>
      <p className="text-sm text-green-600">Revenue: {formatCurrencyFull(item.revenue)}</p>
      <p className="text-sm text-[var(--color-text-muted)]">Appointments: {item.count}</p>
    </div>
  )
}

export default function RevenueByService({ data }: RevenueByServiceProps) {
  const top10 = [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 10)

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
          <h2 className="text-xl font-bold text-[var(--color-primary)]">Revenue by Service</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Top services by revenue</p>
        </div>
        <div className="flex items-center justify-center h-[300px] text-[var(--color-text-muted)]">
          No service data available
        </div>
      </div>
    )
  }

  const chartHeight = Math.max(300, top10.length * 40)

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <h2 className="text-xl font-bold text-[var(--color-primary)]">Revenue by Service</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Top services by revenue</p>
      </div>
      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
              dataKey="service"
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
              width={120}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
              {top10.map((entry, idx) => (
                <Cell key={idx} fill={getCategoryColor(entry.category)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
