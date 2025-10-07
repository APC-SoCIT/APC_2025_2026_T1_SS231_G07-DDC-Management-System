export default function AppointmentStats() {
  const stats = [
    { label: "Total Appointments", value: "40", bgColor: "bg-green-100" },
    { label: "Scheduled", value: "24", bgColor: "bg-green-100" },
    { label: "Completed", value: "12", bgColor: "bg-green-100" },
    { label: "Cancelled", value: "4", bgColor: "bg-green-100" },
    { label: "Pending", value: "8", bgColor: "bg-green-100" },
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
