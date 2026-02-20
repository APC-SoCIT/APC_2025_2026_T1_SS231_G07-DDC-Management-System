"use client"

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts"
import type { StatusDistribution } from "@/lib/types/analytics"

interface AppointmentStatusChartProps {
  data: StatusDistribution[]
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#22c55e",
  confirmed: "#3b82f6",
  pending: "#eab308",
  cancelled: "#ef4444",
  missed: "#f97316",
  waiting: "#06b6d4",
  no_show: "#f97316",
}

function getStatusColor(status: string): string {
  return STATUS_COLORS[status.toLowerCase()] || "#6b7280"
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const item = payload[0].payload as StatusDistribution
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-[var(--color-text)] mb-1 capitalize">{item.status.replace(/_/g, " ")}</p>
      <p className="text-sm text-[var(--color-text-muted)]">Count: {item.count}</p>
    </div>
  )
}

export default function AppointmentStatusChart({ data }: AppointmentStatusChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
          <h2 className="text-xl font-bold text-[var(--color-primary)]">Appointment Status</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Distribution of appointment statuses</p>
        </div>
        <div className="flex items-center justify-center h-[300px] text-[var(--color-text-muted)]">
          No appointment data available
        </div>
      </div>
    )
  }

  const totalCount = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <h2 className="text-xl font-bold text-[var(--color-primary)]">Appointment Status</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Distribution of appointment statuses</p>
      </div>
      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={3}
              dataKey="count"
              nameKey="status"
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={getStatusColor(entry.status)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {/* Center label */}
            <text
              x="50%"
              y="47%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-[var(--color-text)]"
              style={{ fontSize: 28, fontWeight: 700 }}
            >
              {totalCount}
            </text>
            <text
              x="50%"
              y="57%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-[var(--color-text-muted)]"
              style={{ fontSize: 12 }}
            >
              Appointments
            </text>
          </PieChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {data.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getStatusColor(entry.status) }}
              />
              <span className="text-xs text-[var(--color-text-muted)] capitalize">
                {entry.status.replace(/_/g, " ")} ({entry.count})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
