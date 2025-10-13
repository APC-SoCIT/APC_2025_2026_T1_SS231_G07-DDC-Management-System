"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { useState } from "react"

const revenueData = [
  { month: "May", amount: 400000 },
  { month: "June", amount: 350000 },
  { month: "July", amount: 480000 },
  { month: "Aug", amount: 220000 },
  { month: "Sept", amount: 300000 },
  { month: "Oct", amount: 520000 },
  { month: "Nov", amount: 450000 },
]

const expensesData = [
  { month: "May", amount: 250000 },
  { month: "June", amount: 280000 },
  { month: "July", amount: 320000 },
  { month: "Aug", amount: 180000 },
  { month: "Sept", amount: 200000 },
  { month: "Oct", amount: 350000 },
  { month: "Nov", amount: 300000 },
]

export default function AnalyticsContent() {
  const [activeTab, setActiveTab] = useState("revenue")

  return (
    <div className="space-y-6">
      {/* Tab Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("revenue")}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "revenue"
              ? "bg-white text-[#1a4d2e] border-2 border-[#1a4d2e]"
              : "bg-gray-100 text-gray-600 border-2 border-transparent"
          }`}
        >
          Revenue
        </button>
        <button
          onClick={() => setActiveTab("expenses")}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "expenses"
              ? "bg-white text-[#1a4d2e] border-2 border-[#1a4d2e]"
              : "bg-gray-100 text-gray-600 border-2 border-transparent"
          }`}
        >
          Expenses
        </button>
      </div>

      {/* Chart Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{activeTab === "revenue" ? "Revenue Trend" : "Expenses Trend"}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={activeTab === "revenue" ? revenueData : expensesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#a5d6a7" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
