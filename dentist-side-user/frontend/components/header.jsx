import { Bell } from "lucide-react"

export default function Header({ title }) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center space-x-4">
        <Bell className="w-6 h-6 text-gray-600" />
        <div className="flex items-center space-x-2">
          <img src="/caring-doctor.png" alt="Marvin Dorotheo" className="w-8 h-8 rounded-full object-cover" />
          <span className="text-gray-700 font-medium">Marvin Dorotheo</span>
        </div>
      </div>
    </div>
  )
}
