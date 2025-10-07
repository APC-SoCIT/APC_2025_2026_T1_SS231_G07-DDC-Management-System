import { Search, Plus, Edit } from "lucide-react"

export default function PatientTable() {
  const patients = [
    {
      id: "DD - 00001",
      name: "Bary Reyes",
      email: "baryreyes@gmail.com",
      age: 100,
      contact: "(555) 123-4567",
      lastVisit: "2024-05-15",
    },
    {
      id: "DD - 00002",
      name: "Michael Orenze",
      email: "morenze@gmail.com",
      age: 28,
      contact: "(555) 234-5678",
      lastVisit: "2024-05-10",
    },
    {
      id: "DD - 00003",
      name: "Ezekiel Galauran",
      email: "egalauran@gmail.com",
      age: 20,
      contact: "(555) 345-6789",
      lastVisit: "2024-05-08",
    },
    {
      id: "DD - 00004",
      name: "Gabriel Villanueva",
      email: "gvillanueva@gmail.com",
      age: 52,
      contact: "(555) 456-7890",
      lastVisit: "2024-04-30",
    },
    {
      id: "DD - 00005",
      name: "Airo Ravinera",
      email: "aravinera@gmail.com",
      age: 29,
      contact: "(555) 567-8901",
      lastVisit: "2024-05-12",
    },
  ]

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Patient Directory</h2>
          <div className="flex space-x-2">
            <button className="bg-[#1a4d3a] text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-[#2a5d4a]">
              <Plus size={16} />
              <span>Add Patient</span>
            </button>
            <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-50">
              <Edit size={16} />
              <span>Edit Patient</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search patients..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d3a]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Visit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {patients.map((patient, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-green-800">{getInitials(patient.name)}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                      <div className="text-sm text-gray-500">{patient.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.age}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.contact}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.lastVisit}</td>
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
        <span className="text-sm text-gray-500">Showing 1 of 1 Patients</span>
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
