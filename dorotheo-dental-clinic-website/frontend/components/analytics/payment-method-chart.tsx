"use client"

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts"
import type { PaymentMethodDistribution } from "@/lib/types/analytics"

interface PaymentMethodChartProps {
  data: PaymentMethodDistribution[]
}

const METHOD_COLORS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#14b8a6", // teal
]

function formatCurrencyFull(value: number): string {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const item = payload[0].payload as PaymentMethodDistribution
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-[var(--color-text)] mb-1">{item.method_display}</p>
      <p className="text-sm text-[var(--color-text-muted)]">Count: {item.count}</p>
      <p className="text-sm text-green-600">Total: {formatCurrencyFull(item.total)}</p>
    </div>
  )
}

export default function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
          <h2 className="text-xl font-bold text-[var(--color-primary)]">Payment Methods</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Distribution of payment methods</p>
        </div>
        <div className="flex items-center justify-center h-[300px] text-[var(--color-text-muted)]">
          No payment data available
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <h2 className="text-xl font-bold text-[var(--color-primary)]">Payment Methods</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Distribution of payment methods</p>
      </div>
      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={110}
              paddingAngle={3}
              dataKey="count"
              nameKey="method_display"
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={METHOD_COLORS[idx % METHOD_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {data.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: METHOD_COLORS[idx % METHOD_COLORS.length] }}
              />
              <span className="text-xs text-[var(--color-text-muted)]">
                {entry.method_display} ({entry.count})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
