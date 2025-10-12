import Header from "@/components/header"
import AppointmentStats from "@/components/appointment-stats"
import AppointmentTable from "@/components/appointment-table"

export default function AppointmentContent() {
  return (
    <div className="p-6">
      <AppointmentStats />
      <AppointmentTable />
    </div>
  )
}
