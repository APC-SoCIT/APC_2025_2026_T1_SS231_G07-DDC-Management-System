"use client"

import { useState, useEffect } from "react"
import { Search, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { appointmentAPI, patientAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function AppointmentTable() {
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false)
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const { toast } = useToast()

  // Form state for adding appointment
  const [newAppointment, setNewAppointment] = useState({
    patient: "",
    staff: "", // NEW: staff field for new schema
    date: "",
    time: "",
    doctor: "", // Keep for backward compatibility
    treatment: "",
    reason_for_visit: "", // NEW: reason_for_visit field
    notes: "",
    status: "Scheduled", // Updated to match new enum values
    appointment_start_time: "", // NEW: combined datetime field
    appointment_end_time: "", // NEW: end time field
  })

  // Form state for editing appointment
  const [editAppointment, setEditAppointment] = useState({
    patient: "",
    staff: "", // NEW: staff field for new schema
    date: "",
    time: "",
    doctor: "", // Keep for backward compatibility
    treatment: "",
    reason_for_visit: "", // NEW: reason_for_visit field
    notes: "",
    status: "Scheduled", // Updated to match new enum values
    appointment_start_time: "", // NEW: combined datetime field
    appointment_end_time: "", // NEW: end time field
  })

  useEffect(() => {
    fetchAppointments()
    fetchPatients()
  }, [])

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      const response = await appointmentAPI.getAll()
      setAppointments(response.results || response)
    } catch (error) {
      console.error("Failed to fetch appointments:", error)
      toast({
        title: "Error",
        description: "Failed to load appointments. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPatients = async () => {
    try {
      const response = await patientAPI.getAll()
      setPatients(response.results || response)
    } catch (error) {
      console.error("Failed to fetch patients:", error)
    }
  }

  const handleAddAppointment = async () => {
    try {
      await appointmentAPI.create(newAppointment)
      toast({
        title: "Success",
        description: "Appointment added successfully!",
      })
      setIsAddAppointmentOpen(false)
      setNewAppointment({
        patient: "",
        date: "",
        time: "",
        doctor: "",
        treatment: "",
        notes: "",
        status: "scheduled",
      })
      fetchAppointments()
    } catch (error) {
      console.error("Failed to add appointment:", error)
      toast({
        title: "Error",
        description: "Failed to add appointment. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment)
    setEditAppointment({
      patient: appointment.patient || "",
      date: appointment.date || "",
      time: appointment.time || "",
      doctor: appointment.doctor || "",
      treatment: appointment.treatment || "",
      notes: appointment.notes || "",
      status: appointment.status || "Scheduled",
    })
    setIsEditAppointmentOpen(true)
  }

  const handleUpdateAppointment = async () => {
    try {
      await appointmentAPI.update(selectedAppointment.id, editAppointment)
      toast({
        title: "Success",
        description: "Appointment updated successfully!",
      })
      setIsEditAppointmentOpen(false)
      setSelectedAppointment(null)
      fetchAppointments()
    } catch (error) {
      console.error("Failed to update appointment:", error)
      toast({
        title: "Error",
        description: "Failed to update appointment. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAppointment = async (id) => {
    if (!confirm("Are you sure you want to delete this appointment?")) return

    try {
      await appointmentAPI.delete(id)
      toast({
        title: "Success",
        description: "Appointment deleted successfully!",
      })
      fetchAppointments()
    } catch (error) {
      console.error("Failed to delete appointment:", error)
      toast({
        title: "Error",
        description: "Failed to delete appointment. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredAppointments = appointments.filter(
    (appointment) =>
      appointment.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.appointment_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.doctor?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Appointment Directory</h2>
          <div className="flex space-x-2">
            <Dialog open={isAddAppointmentOpen} onOpenChange={setIsAddAppointmentOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#1a4d3a] text-white hover:bg-[#2a5d4a]">
                  <Plus size={16} className="mr-2" />
                  Add Appointment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-[#1a4d2e]">Add New Appointment</DialogTitle>
                  <p className="text-sm text-gray-600">Enter the appointment details below. All fields are required.</p>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="patient">Patient</Label>
                    <Select
                      value={newAppointment.patient}
                      onValueChange={(value) => setNewAppointment({ ...newAppointment, patient: value })}
                    >
                      <SelectTrigger id="patient">
                        <SelectValue placeholder="Select Patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id.toString()}>
                            {patient.name} ({patient.patient_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="treatment">Treatment</Label>
                    <Input
                      id="treatment"
                      placeholder="e.g., Cleaning, Filling, Root Canal"
                      value={newAppointment.treatment}
                      onChange={(e) => setNewAppointment({ ...newAppointment, treatment: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newAppointment.date}
                        onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={newAppointment.time}
                        onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doctor">Doctor</Label>
                    <Input
                      id="doctor"
                      placeholder="e.g., Dr. Smith"
                      value={newAppointment.doctor}
                      onChange={(e) => setNewAppointment({ ...newAppointment, doctor: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dentistNotes">Dentist Notes</Label>
                    <Textarea
                      id="dentistNotes"
                      placeholder="Enter notes for patient instruction or information about the upcoming appointment."
                      rows={4}
                      value={newAppointment.notes}
                      onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1 bg-transparent"
                      onClick={() => setIsAddAppointmentOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-[#a5d6a7] hover:bg-[#8bc98e] text-[#1a4d2e]"
                      onClick={handleAddAppointment}
                    >
                      Set Appointment
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search appointments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d3a]"
          />
        </div>
      </div>

      {/* Edit Appointment Dialog */}
      <Dialog open={isEditAppointmentOpen} onOpenChange={setIsEditAppointmentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#1a4d2e]">Update Appointment</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="editPatient">Patient</Label>
                <Select
                  value={editAppointment.patient.toString()}
                  onValueChange={(value) => setEditAppointment({ ...editAppointment, patient: value })}
                >
                  <SelectTrigger id="editPatient">
                    <SelectValue placeholder="Select Patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {patient.name} ({patient.patient_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editTreatment">Treatment</Label>
                <Input
                  id="editTreatment"
                  value={editAppointment.treatment}
                  onChange={(e) => setEditAppointment({ ...editAppointment, treatment: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editDate">Date</Label>
                  <Input
                    id="editDate"
                    type="date"
                    value={editAppointment.date}
                    onChange={(e) => setEditAppointment({ ...editAppointment, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editTime">Time</Label>
                  <Input
                    id="editTime"
                    type="time"
                    value={editAppointment.time}
                    onChange={(e) => setEditAppointment({ ...editAppointment, time: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDoctor">Doctor</Label>
                <Input
                  id="editDoctor"
                  value={editAppointment.doctor}
                  onChange={(e) => setEditAppointment({ ...editAppointment, doctor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editStatus">Status</Label>
                <Select
                  value={editAppointment.status}
                  onValueChange={(value) => setEditAppointment({ ...editAppointment, status: value })}
                >
                  <SelectTrigger id="editStatus">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editNotes">Notes</Label>
                <Textarea
                  id="editNotes"
                  rows={4}
                  value={editAppointment.notes}
                  onChange={(e) => setEditAppointment({ ...editAppointment, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => setIsEditAppointmentOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#a5d6a7] hover:bg-[#8bc98e] text-[#1a4d2e]"
                  onClick={handleUpdateAppointment}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a4d3a]"></div>
            <p className="mt-2 text-gray-600">Loading appointments...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery
              ? "No appointments found matching your search."
              : "No appointments yet. Add your first appointment!"}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAppointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-green-800">
                          {getInitials(appointment.patient_name || "N/A")}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{appointment.patient_name || "N/A"}</div>
                        <div className="text-sm text-gray-500">{appointment.patient_email || "N/A"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.appointment_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.doctor}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}
                    >
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleEditAppointment(appointment)}
                      className="text-[#1a4d3a] hover:text-[#2a5d4a] font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAppointment(appointment.id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredAppointments.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
          <span className="text-sm text-gray-500">Showing {filteredAppointments.length} appointments</span>
        </div>
      )}
    </div>
  )
}
