"use client"

import { useEffect, useState } from "react"
import { patientAPI } from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Search } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export default function PatientTable() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false)
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [newPatient, setNewPatient] = useState({
    f_name: "",
    l_name: "",
    name: "", // Keep for backward compatibility
    date_of_birth: "",
    age: "",
    email: "",
    contact: "",
    address: "",
  })
  const [editPatient, setEditPatient] = useState({
    f_name: "",
    l_name: "",
    name: "", // Keep for backward compatibility
    date_of_birth: "",
    age: "",
    email: "",
    contact: "",
    address: "",
  })

  // Fetch patients
  const fetchPatients = async () => {
    setLoading(true)
    try {
      const response = await patientAPI.getAll()
      const data = Array.isArray(response) ? response : response.results || []
      setPatients(data)
    } catch (error) {
      console.error("Failed to fetch patients:", error)
      toast({
        title: "Error",
        description: "Failed to load patients. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatients()
  }, [])

  // ✅ Add Patient
  const handleAddPatient = async (e) => {
    e.preventDefault()
    try {
      // Prepare data for new backend structure
      const patientData = {
        ...newPatient,
        // Support both old and new field names
        f_name: newPatient.f_name || newPatient.name?.split(' ')[0] || '',
        l_name: newPatient.l_name || newPatient.name?.split(' ').slice(1).join(' ') || '',
      }
      
      await patientAPI.create(patientData)
      toast({
        title: "Success",
        description: "Patient added successfully!",
      })
      setIsAddPatientOpen(false)
      setNewPatient({
        f_name: "",
        l_name: "",
        name: "",
        date_of_birth: "",
        age: "",
        email: "",
        contact: "",
        address: "",
      })
      fetchPatients()
    } catch (error) {
      console.error("Failed to add patient:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add patient. Please try again.",
        variant: "destructive",
      })
    }
  }

  // ✅ Edit Patient
  const handleEditPatient = (patient) => {
    setSelectedPatient(patient)
    setEditPatient({
      f_name: patient.f_name || patient.name?.split(' ')[0] || '',
      l_name: patient.l_name || patient.name?.split(' ').slice(1).join(' ') || '',
      name: patient.name || patient.full_name || '', // Backward compatibility
      email: patient.email || '',
      date_of_birth: patient.date_of_birth || "",
      age: patient.age || '',
      contact: patient.contact || '',
      address: patient.address || "",
    })
    setIsEditPatientOpen(true)
  }

  const handleUpdatePatient = async () => {
    try {
      // Validate required fields
      if (!editPatient.email) {
        toast({
          title: "Validation Error",
          description: "Email is required.",
          variant: "destructive",
        })
        return
      }
      
      console.log("Updating patient with data:", editPatient)
      await patientAPI.update(selectedPatient.id, editPatient)
      toast({
        title: "Success",
        description: "Patient updated successfully!",
      })
      setIsEditPatientOpen(false)
      setSelectedPatient(null)
      fetchPatients()
    } catch (error) {
      console.error("Failed to update patient:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update patient. Please try again.",
        variant: "destructive",
      })
    }
  }

  // ✅ Delete Patient
  const handleDeletePatient = async (id) => {
    if (!confirm("Are you sure you want to delete this patient?")) return
    try {
      await patientAPI.delete(id)
      toast({
        title: "Success",
        description: "Patient deleted successfully!",
      })
      fetchPatients()
    } catch (error) {
      console.error("Failed to delete patient:", error)
      toast({
        title: "Error",
        description: "Failed to delete patient. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getInitials = (name) => {
    if (!name) return "?"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.patient_id?.toString().toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Patient Directory</h2>
          <div className="flex space-x-2">
            <Dialog open={isAddPatientOpen} onOpenChange={setIsAddPatientOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#1a4d3a] text-white hover:bg-[#2a5d4a]">
                  <Plus size={16} className="mr-2" />
                  Add Patient
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-[#1a4d2e]">Add New Patient</DialogTitle>
                  <p className="text-sm text-gray-600">
                    Enter the patient's information below. All fields are required.
                  </p>
                </DialogHeader>
                <form onSubmit={handleAddPatient} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="Ex. Michael"
                        value={newPatient.f_name}
                        onChange={(e) => {
                          setNewPatient({ 
                            ...newPatient, 
                            f_name: e.target.value,
                            name: `${e.target.value} ${newPatient.l_name}`.trim() // Update full name for backward compatibility
                          })
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Ex. Orenze"
                        value={newPatient.l_name}
                        onChange={(e) => {
                          setNewPatient({ 
                            ...newPatient, 
                            l_name: e.target.value,
                            name: `${newPatient.f_name} ${e.target.value}`.trim() // Update full name for backward compatibility
                          })
                        }}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={newPatient.date_of_birth}
                      onChange={(e) => setNewPatient({ ...newPatient, date_of_birth: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="Ex. 25"
                      value={newPatient.age}
                      onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Ex. morenze29@gmail.com"
                      value={newPatient.email}
                      onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactNumber">Contact Number</Label>
                    <Input
                      id="contactNumber"
                      type="tel"
                      placeholder="(+63) 000-000-0000"
                      value={newPatient.contact}
                      onChange={(e) => setNewPatient({ ...newPatient, contact: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="Complete Address"
                      value={newPatient.address}
                      onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 bg-transparent"
                      onClick={() => setIsAddPatientOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-[#a5d6a7] hover:bg-[#8bc98e] text-[#1a4d2e]"
                    >
                      Add Patient
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d3a]"
          />
        </div>
      </div>

      {/* Edit Patient Dialog */}
      <Dialog open={isEditPatientOpen} onOpenChange={setIsEditPatientOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#1a4d2e]">Update Patient Info</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Personal Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-600">Personal Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editFirstName">First Name</Label>
                      <Input
                        id="editFirstName"
                        value={editPatient.f_name}
                        onChange={(e) => {
                          setEditPatient({ 
                            ...editPatient, 
                            f_name: e.target.value,
                            name: `${e.target.value} ${editPatient.l_name}`.trim()
                          })
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editLastName">Last Name</Label>
                      <Input
                        id="editLastName"
                        value={editPatient.l_name}
                        onChange={(e) => {
                          setEditPatient({ 
                            ...editPatient, 
                            l_name: e.target.value,
                            name: `${editPatient.f_name} ${e.target.value}`.trim()
                          })
                        }}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editFullName">Full Name (Display)</Label>
                    <Input
                      id="editName"
                      value={editPatient.name}
                      onChange={(e) => setEditPatient({ ...editPatient, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editDob">Date of Birth</Label>
                    <Input
                      id="editDob"
                      type="date"
                      value={editPatient.date_of_birth}
                      onChange={(e) => setEditPatient({ ...editPatient, date_of_birth: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editAge">Age</Label>
                    <Input
                      id="editAge"
                      type="number"
                      value={editPatient.age}
                      onChange={(e) => setEditPatient({ ...editPatient, age: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editId">ID</Label>
                    <Input id="editId" value={selectedPatient.patient_id} disabled />
                  </div>
                </div>

                {/* Contact Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-600">Contact Details</h3>
                  <div className="space-y-2">
                    <Label htmlFor="editContact">Number</Label>
                    <Input
                      id="editContact"
                      value={editPatient.contact}
                      onChange={(e) => setEditPatient({ ...editPatient, contact: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editEmail">Email</Label>
                    <Input
                      id="editEmail"
                      value={editPatient.email}
                      onChange={(e) => setEditPatient({ ...editPatient, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editAddress">Address</Label>
                    <Input
                      id="editAddress"
                      value={editPatient.address}
                      onChange={(e) => setEditPatient({ ...editPatient, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => setIsEditPatientOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#a5d6a7] hover:bg-[#8bc98e] text-[#1a4d2e]"
                  onClick={handleUpdatePatient}
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
            <p className="mt-2 text-gray-600">Loading patients...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? "No patients found matching your search." : "No patients yet. Add your first patient!"}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Visit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.patient_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.age}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.contact}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.last_visit || "N/A"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleEditPatient(patient)}
                      className="text-[#1a4d3a] hover:text-[#2a5d4a] font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePatient(patient.id)}
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
      {!loading && filteredPatients.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
          <span className="text-sm text-gray-500">Showing {filteredPatients.length} patients</span>
        </div>
      )}
    </div>
  )
}
