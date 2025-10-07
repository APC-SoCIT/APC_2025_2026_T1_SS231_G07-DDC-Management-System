import { Search, Plus, Edit } from "lucide-react"

export default function AppointmentTable() {
  const appointments = [
    {
      id: "DD - 00001",
      patient: "Bary Reyes",
      email: "baryreyes@gmail.com",
      date: "2024-05-15",
      time: "10:00 AM",
      doctor: "Dr. Smith",
      status: "Scheduled",
    },
    {
      id: "DD - 00002",
      patient: "Michael Orenze",
      email: "morenze@gmail.com",
      date: "2024-05-10",
      time: "2:00 PM",
      doctor: "Dr. Johnson",
      status: "Completed",
    },
    {
      id: "DD - 00003",
      patient: "Ezekiel Galauran",
      email: "egalauran@gmail.com",
      date: "2024-05-08",
      time: "9:00 AM",
      doctor: "Dr. Brown",
      status: "Cancelled",
    },
    {
      id: "DD - 00004",
      patient: "Gabriel Villanueva",
      email: "gvillanueva@gmail.com",
      date: "2024-04-30",
      time: "11:00 AM",
      doctor: "Dr. Davis",
      status: "Completed",
    },
    {
      id: "DD - 00005",
      patient: "Airo Ravinera",
      email: "aravinera@gmail.com",
      date: "2024-05-12",
      time: "3:00 PM",
      doctor: "Dr. Wilson",
      status: "Scheduled",
    },
  ]

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Scheduled":
        return "bg-blue-100 text-blue-800"
      case "Completed":
        return "bg-green-100 text-green-800"
      case "Cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Appointment Directory</h2>
          <div className="flex space-x-2">
            <button className="bg-[#1a4d3a] text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-[#2a5d4a]">
              <Plus size={16} />
              <span>Add Appointment</span>
            </button>
            <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-50">
              <Edit size={16} />
              <span>Edit Appointment</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search appointments..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d3a]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {appointments.map((appointment, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-green-800">{getInitials(appointment.patient)}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{appointment.patient}</div>
                      <div className="text-sm text-gray-500">{appointment.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.time}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.doctor}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                    {appointment.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="text-[#1a4d3a] hover:text-[#2a5d4a] font-medium">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
        <span className="text-sm text-gray-500">Showing 1 of 1 Appointments</span>
        <div className="flex space-x-1">
          <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">Previous</button>
          <button className="px-3 py-1 text-sm bg-[#1a4d3a] text-white rounded">1</button>
          <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">2</button>
          <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">Next</button>
        </div>
      </div>
    </div>
  )
}
