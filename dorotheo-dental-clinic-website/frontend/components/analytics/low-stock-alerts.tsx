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
  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-primary)]">Low Stock Alerts</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Items below minimum stock level
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--color-text-muted)]">Total Inventory Value</p>
            <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(totalValue)}</p>
          </div>
        </div>
      </div>

      {!data || data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6">
          <div className="p-3 bg-green-100 rounded-full mb-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-lg font-medium text-green-700">All items well stocked</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">No items are below minimum stock level</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {data.map((item) => {
            const level = getStockLevel(item.quantity, item.min_stock)
            const isCritical = level === "critical"
            return (
              <div
                key={item.id}
                className={`px-6 py-4 flex items-center justify-between ${
                  isCritical ? "bg-red-50" : "bg-amber-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isCritical ? "bg-red-100" : "bg-amber-100"
                    }`}
                  >
                    {isCritical ? (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    ) : (
                      <Package className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{item.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {item.category} · {item.clinic}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${
                      isCritical ? "text-red-600" : "text-amber-600"
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
