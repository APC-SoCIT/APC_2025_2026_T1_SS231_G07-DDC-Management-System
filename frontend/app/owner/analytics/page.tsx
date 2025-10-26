"use client"

import { useState } from "react"
import { TrendingUp, DollarSign, ShoppingCart, Calendar } from "lucide-react"

interface Billing {
  id: number
  patient: string
  amount: number
  date: string
  status: "pending" | "paid" | "cancelled"
}

interface InventoryItem {
  id: number
  name: string
  quantity: number
  cost: number
  dateAdded: string
}

export default function OwnerAnalytics() {
  const [timeFilter, setTimeFilter] = useState<"daily" | "weekly" | "monthly" | "annual">("monthly")

  // Remove sample data - will fetch from API
  const billings: Billing[] = []

  const inventory: InventoryItem[] = []

  const getDateRange = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (timeFilter) {
      case "daily":
        return { start: today, label: "Today" }
      case "weekly": {
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - 7)
        return { start: weekStart, label: "Last 7 Days" }
      }
      case "monthly": {
        const monthStart = new Date(today)
        monthStart.setDate(today.getDate() - 30)
        return { start: monthStart, label: "Last 30 Days" }
      }
      case "annual": {
        const yearStart = new Date(today)
        yearStart.setFullYear(today.getFullYear() - 1)
        return { start: yearStart, label: "Last 12 Months" }
      }
    }
  }

  const dateRange = getDateRange()

  const filteredBillings = billings.filter(b => {
    const billDate = new Date(b.date)
    return billDate >= dateRange.start && b.status === "paid"
  })

  const totalRevenue = filteredBillings.reduce((sum, b) => sum + b.amount, 0)
  const pendingRevenue = billings.filter(b => b.status === "pending").reduce((sum, b) => sum + b.amount, 0)

  const filteredInventory = inventory.filter(item => {
    const itemDate = new Date(item.dateAdded)
    return itemDate >= dateRange.start
  })

  const totalExpenses = filteredInventory.reduce((sum, item) => sum + item.cost, 0)
  const profit = totalRevenue - totalExpenses

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[var(--color-primary)] mb-2">Analytics Dashboard</h1>
          <p className="text-[var(--color-text-muted)]">Revenue and expenses overview</p>
        </div>

        <div className="flex gap-2 bg-white border border-[var(--color-border)] rounded-lg p-1">
          {[
            { id: "daily", label: "Daily" },
            { id: "weekly", label: "Weekly" },
            { id: "monthly", label: "Monthly" },
            { id: "annual", label: "Annual" },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setTimeFilter(filter.id as any)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                timeFilter === filter.id
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Calendar className="w-4 h-4" />
        <span>Showing data for: <strong>{dateRange.label}</strong></span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-green-700">Revenue</span>
          </div>
          <h3 className="text-3xl font-bold text-green-900 mb-1">{totalRevenue.toLocaleString()}</h3>
          <p className="text-sm text-green-700">From {filteredBillings.length} paid transactions</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-xl p-6 border border-red-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-500 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-red-700">Expenses</span>
          </div>
          <h3 className="text-3xl font-bold text-red-900 mb-1">{totalExpenses.toLocaleString()}</h3>
          <p className="text-sm text-red-700">From {filteredInventory.length} inventory items</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-blue-700">Profit</span>
          </div>
          <h3 className={`text-3xl font-bold mb-1 ${profit >= 0 ? "text-blue-900" : "text-red-900"}`}>
            {profit.toLocaleString()}
          </h3>
          <p className="text-sm text-blue-700">Revenue - Expenses</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-500 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-amber-700">Pending</span>
          </div>
          <h3 className="text-3xl font-bold text-amber-900 mb-1">{pendingRevenue.toLocaleString()}</h3>
          <p className="text-sm text-amber-700">Awaiting payment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
            <h2 className="text-xl font-bold text-[var(--color-primary)]">Revenue Breakdown</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Paid transactions in selected period</p>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full">
              <thead className="bg-[var(--color-background)] border-b border-[var(--color-border)] sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">Patient</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredBillings.length > 0 ? (
                  filteredBillings.map((billing) => (
                    <tr key={billing.id} className="hover:bg-[var(--color-background)] transition-colors">
                      <td className="px-4 py-3 text-sm text-[var(--color-text)]">{billing.patient}</td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600">{billing.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">{billing.date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                      No revenue data for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
            <h2 className="text-xl font-bold text-[var(--color-primary)]">Expenses Breakdown</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Inventory purchases in selected period</p>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full">
              <thead className="bg-[var(--color-background)] border-b border-[var(--color-border)] sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">Item</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">Cost</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredInventory.length > 0 ? (
                  filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--color-background)] transition-colors">
                      <td className="px-4 py-3 text-sm text-[var(--color-text)]">{item.name}</td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600">{item.cost.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">{item.dateAdded}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                      No expense data for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
