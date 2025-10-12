"use client"

import { Users, Calendar, BarChart3, Package, DollarSign, LogOut } from "lucide-react"

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "patients", label: "Patients", icon: Users },
    { id: "appointments", label: "Appointment", icon: Calendar },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "billing", label: "Billing", icon: DollarSign },
  ]

  return (
    <div className="w-64 bg-[#1a4d3a] text-white flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <div className="w-12 h-12 bg-[#d4af37] rounded-full flex items-center justify-center overflow-hidden">
          <img src="/dental-clinic-logo.png" alt="Dental Clinic Logo" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 text-left transition-colors ${
                isActive ? "bg-[#d4af37] text-[#1a4d3a] font-medium" : "text-[#d4af37] hover:bg-[#2a5d4a]"
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4">
        <button className="w-full flex items-center space-x-3 px-4 py-3 text-[#d4af37] hover:bg-[#2a5d4a] rounded-lg transition-colors">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}
