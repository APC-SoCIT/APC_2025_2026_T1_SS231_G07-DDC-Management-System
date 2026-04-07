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
      gradient: "from-emerald-50 via-green-50 to-white",
      border: "border-emerald-200",
      iconBg: "bg-emerald-600",
      chipBg: "bg-emerald-100",
      chipColor: "text-emerald-800",
      valueColor: "text-emerald-950",
      subtitleColor: "text-emerald-800",
      glow: "from-emerald-300/35",
    },
    {
      label: "Expenses",
      value: financial.total_expenses,
      subtitle: "Supply & invoice costs",
      icon: ShoppingCart,
      gradient: "from-rose-50 via-orange-50 to-white",
      border: "border-rose-200",
      iconBg: "bg-rose-600",
      chipBg: "bg-rose-100",
      chipColor: "text-rose-800",
      valueColor: "text-rose-900",
      subtitleColor: "text-rose-800",
      glow: "from-rose-300/30",
    },
    {
      label: "Profit",
      value: financial.profit,
      subtitle: "Revenue - Expenses",
      icon: DollarSign,
      gradient: "from-teal-50 via-emerald-50 to-white",
      border: "border-teal-200",
      iconBg: "bg-teal-600",
      chipBg: "bg-teal-100",
      chipColor: "text-teal-800",
      valueColor: financial.profit >= 0 ? "text-teal-950" : "text-red-700",
      subtitleColor: "text-teal-800",
      glow: "from-teal-300/30",
    },
    {
      label: "Outstanding",
      value: financial.outstanding_balance,
      subtitle: "Unpaid invoices",
      icon: AlertCircle,
      gradient: "from-amber-50 via-yellow-50 to-white",
      border: "border-amber-200",
      iconBg: "bg-amber-600",
      chipBg: "bg-amber-100",
      chipColor: "text-amber-800",
      valueColor: "text-amber-900",
      subtitleColor: "text-amber-800",
      glow: "from-amber-300/35",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className={`group relative overflow-hidden bg-gradient-to-br ${card.gradient} rounded-2xl p-4 sm:p-5 lg:p-6 border ${card.border} min-h-[152px] flex flex-col justify-between shadow-[0_10px_30px_-18px_rgba(15,76,58,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-20px_rgba(15,76,58,0.5)]`}
          >
            <div className={`pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-gradient-to-br ${card.glow} to-transparent blur-2xl`} />
            <div className="flex items-start justify-between gap-2 mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-2.5 sm:p-3 ${card.iconBg} rounded-xl shadow-sm ring-1 ring-white/80`}>
                  <Icon className="w-5 h-5 sm:w-[1.35rem] sm:h-[1.35rem] text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className={`text-sm sm:text-[0.95rem] font-semibold leading-tight ${card.chipColor} truncate`}>
                    {card.label}
                  </h3>
                </div>
              </div>
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${card.iconBg} opacity-60 mt-1`} aria-hidden="true" />
            </div>
            <div>
              <p className={`text-2xl sm:text-[1.68rem] leading-tight font-bold ${card.valueColor} mb-1`}>
                {formatCurrency(card.value)}
              </p>
              <p className={`text-xs sm:text-sm ${card.subtitleColor} opacity-90`}>{card.subtitle}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
