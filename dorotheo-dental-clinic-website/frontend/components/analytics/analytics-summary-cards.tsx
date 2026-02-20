"use client"

import { TrendingUp, ShoppingCart, DollarSign, AlertCircle } from "lucide-react"
import type { FinancialAnalytics } from "@/lib/types/analytics"

interface AnalyticsSummaryCardsProps {
  financial: FinancialAnalytics
}

function formatCurrency(value: number): string {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function AnalyticsSummaryCards({ financial }: AnalyticsSummaryCardsProps) {
  const cards = [
    {
      label: "Revenue",
      value: financial.total_revenue,
      subtitle: "Total collected payments",
      icon: TrendingUp,
      gradient: "from-green-50 to-emerald-100",
      border: "border-green-200",
      iconBg: "bg-green-500",
      labelColor: "text-green-700",
      valueColor: "text-green-900",
    },
    {
      label: "Expenses",
      value: financial.total_expenses,
      subtitle: "Supply & invoice costs",
      icon: ShoppingCart,
      gradient: "from-red-50 to-rose-100",
      border: "border-red-200",
      iconBg: "bg-red-500",
      labelColor: "text-red-700",
      valueColor: "text-red-900",
    },
    {
      label: "Profit",
      value: financial.profit,
      subtitle: "Revenue - Expenses",
      icon: DollarSign,
      gradient: "from-blue-50 to-cyan-100",
      border: "border-blue-200",
      iconBg: "bg-blue-500",
      labelColor: "text-blue-700",
      valueColor: financial.profit >= 0 ? "text-blue-900" : "text-red-600",
    },
    {
      label: "Outstanding",
      value: financial.outstanding_balance,
      subtitle: "Unpaid invoices",
      icon: AlertCircle,
      gradient: "from-amber-50 to-yellow-100",
      border: "border-amber-200",
      iconBg: "bg-amber-500",
      labelColor: "text-amber-700",
      valueColor: "text-amber-900",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className={`bg-gradient-to-br ${card.gradient} rounded-xl p-4 sm:p-6 border ${card.border} min-h-[140px] flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className={`p-2 sm:p-3 ${card.iconBg} rounded-lg`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className={`text-xs sm:text-sm font-medium ${card.labelColor}`}>{card.label}</span>
            </div>
            <div>
              <h3 className={`text-2xl sm:text-3xl font-bold ${card.valueColor} mb-1`}>
                {formatCurrency(card.value)}
              </h3>
              <p className={`text-xs sm:text-sm ${card.labelColor}`}>{card.subtitle}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
