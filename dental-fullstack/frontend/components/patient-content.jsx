import Header from "@/components/header"
import PatientStats from "@/components/patient-stats"
import PatientTable from "@/components/patient-table"

export default function PatientContent() {
  return (
    <div className="p-6">
      <PatientStats />
      <PatientTable />
    </div>
  )
}
