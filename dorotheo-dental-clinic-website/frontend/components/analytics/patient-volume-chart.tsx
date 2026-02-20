"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import type { PatientVolumePoint } from "@/lib/types/analytics"

interface PatientVolumeChartProps {
  data: PatientVolumePoint[]
  period: string
}

function formatDateLabel(dateStr: string, period: string): string {
  const date = new Date(dateStr)
  switch (period) {
    case "daily":
      return date.toLocaleDateString("en-PH", { hour: "numeric" })
    case "weekly":
      return date.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })
    case "monthly":
      return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" })
    case "annual":
      return date.toLocaleDateString("en-PH", { month: "short", year: "2-digit" })
    default:
      return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-[var(--color-text)] mb-1">{label}</p>
      {payload.map((entry: { color: string; name: string; value: number }, idx: number) => (
        <p key={idx} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

export default function PatientVolumeChart({ data, period }: PatientVolumeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
          <h2 className="text-xl font-bold text-[var(--color-primary)]">Patient Volume</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Appointments and new patient trends</p>
        </div>
        <div className="flex items-center justify-center h-[300px] text-[var(--color-text-muted)]">
          No data available for this period
        </div>
      </div>
    )
  }

  const chartData = data.map((point) => ({
    ...point,
    dateLabel: formatDateLabel(point.date, period),
  }))

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <h2 className="text-xl font-bold text-[var(--color-primary)]">Patient Volume</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Appointments and new patient trends</p>
      </div>
      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="appointments" name="Appointments" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="new_patients" name="New Patients" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
