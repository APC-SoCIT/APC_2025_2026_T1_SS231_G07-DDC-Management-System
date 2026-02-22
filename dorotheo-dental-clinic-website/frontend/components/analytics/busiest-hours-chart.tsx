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
import type { HourCount } from "@/lib/types/analytics"

interface BusiestHoursChartProps {
  data: HourCount[]
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM"
  if (hour === 12) return "12 PM"
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const item = payload[0].payload as HourCount
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-[var(--color-text)] mb-1">{formatHour(item.hour)}</p>
      <p className="text-sm text-[var(--color-primary)]">Appointments: {item.count}</p>
    </div>
  )
}

export default function BusiestHoursChart({ data }: BusiestHoursChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
          <h2 className="text-xl font-bold text-[var(--color-primary)]">Busiest Hours</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Appointment distribution throughout the day</p>
        </div>
        <div className="flex items-center justify-center h-[300px] text-[var(--color-text-muted)]">
          No hourly data available
        </div>
      </div>
    )
  }

  // Find the busiest hour
  const maxCount = Math.max(...data.map((d) => d.count))

  const chartData = data.map((point) => ({
    ...point,
    hourLabel: formatHour(point.hour),
  }))

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <h2 className="text-xl font-bold text-[var(--color-primary)]">Busiest Hours</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Appointment distribution throughout the day</p>
      </div>
      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="hourLabel"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" name="Appointments" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.count === maxCount ? "#f59e0b" : "#22c55e"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-[var(--color-text-muted)]">Regular hours</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs text-[var(--color-text-muted)]">Busiest hour</span>
          </div>
        </div>
      </div>
    </div>
  )
}
