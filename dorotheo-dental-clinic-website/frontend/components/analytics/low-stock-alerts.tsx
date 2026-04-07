"use client"

import { AlertTriangle, CheckCircle, Package } from "lucide-react"
import type { LowStockItem } from "@/lib/types/analytics"

interface LowStockAlertsProps {
  data: LowStockItem[]
  totalValue: number
}

function formatCurrency(value: number): string {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getStockLevel(quantity: number, minStock: number): "critical" | "low" | "ok" {
  if (quantity === 0) return "critical"
  if (quantity <= minStock * 0.5) return "critical"
  return "low"
}

export default function LowStockAlerts({ data, totalValue }: LowStockAlertsProps) {
  const criticalCount = data?.filter((item) => getStockLevel(item.quantity, item.min_stock) === "critical").length ?? 0

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-[0_12px_35px_-22px_rgba(15,76,58,0.5)]">
      <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-background)]/90 via-white to-emerald-50/70">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[var(--color-primary)]">Low Stock Alerts</h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
              Items below minimum stock level
            </p>
          </div>
          <div className="text-left sm:text-right space-y-1">
            {data?.length > 0 && (
              <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2.5 py-1 inline-block">
                {criticalCount} critical
              </p>
            )}
            <p className="text-xs text-[var(--color-text-muted)]">Total Inventory Value</p>
            <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(totalValue)}</p>
          </div>
        </div>
      </div>

      {!data || data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 bg-gradient-to-b from-white to-emerald-50/40">
          <div className="p-3 bg-emerald-100 rounded-full mb-3 ring-1 ring-emerald-200">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-lg font-medium text-emerald-800">All items well stocked</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">No items are below minimum stock level</p>
        </div>
      ) : (
        <div className="p-2 sm:p-3 space-y-2 bg-[var(--color-background)]/25">
          {data.map((item) => {
            const level = getStockLevel(item.quantity, item.min_stock)
            const isCritical = level === "critical"
            return (
              <div
                key={item.id}
                className={`px-4 sm:px-5 py-3.5 rounded-xl border flex items-center justify-between ${
                  isCritical
                    ? "bg-gradient-to-r from-rose-50 to-white border-rose-200"
                    : "bg-gradient-to-r from-amber-50 to-white border-amber-200"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-lg ring-1 ${
                      isCritical ? "bg-rose-100 ring-rose-200" : "bg-amber-100 ring-amber-200"
                    }`}
                  >
                    {isCritical ? (
                      <AlertTriangle className="w-5 h-5 text-rose-700" />
                    ) : (
                      <Package className="w-5 h-5 text-amber-700" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">{item.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">
                      {item.category} · {item.clinic}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-3">
                  <p
                    className={`text-sm font-bold ${
                      isCritical ? "text-rose-700" : "text-amber-700"
                    }`}
                  >
                    {item.quantity} / {item.min_stock}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">current / min</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
