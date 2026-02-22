"use client"

import type { TopService } from "@/lib/types/analytics"

interface TopServicesTableProps {
  data: TopService[]
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  general: { bg: "bg-blue-100", text: "text-blue-700" },
  cosmetic: { bg: "bg-purple-100", text: "text-purple-700" },
  orthodontic: { bg: "bg-pink-100", text: "text-pink-700" },
  surgical: { bg: "bg-red-100", text: "text-red-700" },
  preventive: { bg: "bg-green-100", text: "text-green-700" },
  restorative: { bg: "bg-amber-100", text: "text-amber-700" },
  diagnostic: { bg: "bg-cyan-100", text: "text-cyan-700" },
  periodontic: { bg: "bg-teal-100", text: "text-teal-700" },
  endodontic: { bg: "bg-orange-100", text: "text-orange-700" },
  prosthodontic: { bg: "bg-indigo-100", text: "text-indigo-700" },
}

function getCategoryBadge(category: string) {
  const colors = CATEGORY_COLORS[category.toLowerCase()] || { bg: "bg-gray-100", text: "text-gray-700" }
  return colors
}

export default function TopServicesTable({ data }: TopServicesTableProps) {
  const top10 = data.slice(0, 10)

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
          <h2 className="text-xl font-bold text-[var(--color-primary)]">Top Services</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Most popular services by appointment count</p>
        </div>
        <div className="flex items-center justify-center h-[300px] text-[var(--color-text-muted)]">
          No service data available
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <h2 className="text-xl font-bold text-[var(--color-primary)]">Top Services</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Most popular services by appointment count</p>
      </div>
      <div className="overflow-x-auto max-h-96">
        <table className="w-full">
          <thead className="bg-[var(--color-background)] border-b border-[var(--color-border)] sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)] w-12">#</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">Service</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">Category</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--color-text)]">Appointments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {top10.map((service, idx) => {
              const badge = getCategoryBadge(service.category)
              return (
                <tr key={idx} className="hover:bg-[var(--color-background)] transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--color-text)]">{service.service}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${badge.bg} ${badge.text}`}>
                      {service.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right text-[var(--color-primary)]">{service.count}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
