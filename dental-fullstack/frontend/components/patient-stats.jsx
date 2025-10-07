export default function PatientStats() {
  const stats = [
    { label: "Total Patients", value: "6", bgColor: "bg-green-100" },
    { label: "Active Patients", value: "5", bgColor: "bg-green-100" },
    { label: "Inactive Patients", value: "1", bgColor: "bg-green-100" },
    { label: "New this month", value: "4", bgColor: "bg-green-100" },
    { label: "Upcoming Visits", value: "3", bgColor: "bg-green-100" },
  ]

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div key={index} className={`${stat.bgColor} p-4 rounded-lg`}>
          <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
          <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
