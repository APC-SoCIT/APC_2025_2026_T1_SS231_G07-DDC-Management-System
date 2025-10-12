"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const billingPatients = [
  {
    id: 1,
    name: "Abrech Dela Cruz",
    email: "abdelacruz@gmail.com",
    initials: "AD",
    lastPayment: "06-28-2025",
    bgColor: "bg-green-200",
  },
  {
    id: 2,
    name: "Gabriel Villanueva",
    email: "gmvillanueva@gmail.com",
    initials: "GV",
    lastPayment: "05-05-2025",
    bgColor: "bg-green-200",
  },
  {
    id: 3,
    name: "Michael Orenze",
    email: "morenze29@gmail.com",
    initials: "MO",
    lastPayment: "06-05-2025",
    bgColor: "bg-green-200",
  },
  {
    id: 4,
    name: "Ezekiel Galauran",
    email: "ezgalauran@gmail.com",
    initials: "EG",
    lastPayment: "03-11-2025",
    bgColor: "bg-green-200",
  },
  {
    id: 5,
    name: "Airo Ravinera",
    email: "aravinera@gmail.com",
    initials: "AR",
    lastPayment: "05-15-2025",
    bgColor: "bg-green-200",
  },
  {
    id: 6,
    name: "Bary Reyes",
    email: "barsreyes@gmail.com",
    initials: "BR",
    lastPayment: "04-029-2025",
    bgColor: "bg-green-200",
  },
]

export default function BillingContent() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search Patient Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="bg-[#1a4d2e] hover:bg-[#143d24] text-white">+ Billing</Button>
      </div>

      {/* Patient Billing Cards */}
      <div className="space-y-4">
        {billingPatients.map((patient) => (
          <div
            key={patient.id}
            className="bg-white rounded-lg border p-6 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <Avatar className={`w-14 h-14 ${patient.bgColor}`}>
                <AvatarFallback className="text-[#1a4d2e] font-semibold text-lg">{patient.initials}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-[#1a4d2e] text-lg">{patient.name}</h3>
                <p className="text-sm text-gray-600">{patient.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-gray-600">Last Payment</p>
                <p className="font-medium text-[#1a4d2e]">{patient.lastPayment}</p>
              </div>
              <Button className="bg-[#1a4d2e] hover:bg-[#143d24] text-white">View Statement</Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Showing 1 of 1 Billing</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Previous
          </Button>
          <Button size="sm" className="bg-[#1a4d2e] text-white">
            1
          </Button>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
