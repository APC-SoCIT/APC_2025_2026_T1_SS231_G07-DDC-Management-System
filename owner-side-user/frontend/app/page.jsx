"use client"

import { useState } from "react"
import Sidebar from "@/components/sidebar"
import OverviewContent from "@/components/overview-content"
import AppointmentContent from "@/components/appointment-content"
import PatientContent from "@/components/patient-content"
import AnalyticsContent from "@/components/analytics-content"
import InventoryContent from "@/components/inventory-content"
import BillingContent from "@/components/billing-content"
import Header from "@/components/header"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  const getPageTitle = () => {
    switch (activeTab) {
      case "overview":
        return "Dental Clinic Overview"
      case "appointments":
        return "Appointment Management"
      case "patients":
        return "Patient Management"
      case "analytics":
        return "Financial Insights"
      case "inventory":
        return "Inventory Management"
      case "billing":
        return "Billing Management"
      default:
        return "Dental Clinic Overview"
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewContent setActiveTab={setActiveTab} />
      case "appointments":
        return <AppointmentContent />
      case "patients":
        return <PatientContent />
      case "analytics":
        return <AnalyticsContent />
      case "inventory":
        return <InventoryContent />
      case "billing":
        return <BillingContent />
      default:
        return <OverviewContent setActiveTab={setActiveTab} />
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 overflow-auto px-8 pt-6">
        <Header title={getPageTitle()} />
        <div className="pb-8">{renderContent()}</div>
      </div>
    </div>
  )
}
