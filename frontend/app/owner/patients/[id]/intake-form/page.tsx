"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import * as api from "@/lib/api"
import { Save, ArrowLeft, Heart, Phone, Shield, Stethoscope, AlertCircle } from "lucide-react"

interface IntakeForm {
  id?: number
  patient: number
  medical_history: string
  allergies: string
  current_medications: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relationship: string
  insurance_provider: string
  insurance_policy_number: string
  dental_concerns: string
  preferred_dentist: number | null
}

interface Patient {
  id: number
  first_name: string
  last_name: string
  email: string
}

export default function OwnerPatientIntakeFormPage() {
  const router = useRouter()
  const params = useParams()
  const patientId = Number.parseInt(params.id as string, 10)

  const [patient, setPatient] = useState<Patient | null>(null)
  const [dentists, setDentists] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [existingForm, setExistingForm] = useState<IntakeForm | null>(null)

  const [formData, setFormData] = useState<IntakeForm>({
    patient: patientId,
    medical_history: "",
    allergies: "",
    current_medications: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    insurance_provider: "",
    insurance_policy_number: "",
    dental_concerns: "",
    preferred_dentist: null,
  })

  useEffect(() => {
    const token = localStorage.getItem("token")
    const user = JSON.parse(localStorage.getItem("user") || "{}")

    if (!token || user.role !== "owner") {
      router.push("/")
      return
    }

    fetchData()
  }, [router, patientId])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      // Fetch patient info
      const patientData = await api.getPatientById(patientId, token)
      setPatient(patientData)

      // Fetch dentists
      const staffData = await api.getStaff(token)
      setDentists(staffData.filter((s: any) => s.role === "staff" || s.role === "owner"))

      // Fetch existing intake form
      try {
        const forms = await api.getIntakeFormByPatient(patientId, token)
        if (forms && forms.length > 0) {
          setExistingForm(forms[0])
          setFormData(forms[0])
        }
      } catch (error) {
        // No existing form, that's okay
        console.log("No existing intake form found")
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      alert("Failed to load patient data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    let processedValue: string | number | null = value
    
    if (name === "preferred_dentist") {
      processedValue = value ? Number.parseInt(value, 10) : null
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const token = localStorage.getItem("token")
      if (!token) return

      if (existingForm) {
        await api.updateIntakeForm(existingForm.id!, formData, token)
        alert("Intake form updated successfully!")
      } else {
        await api.createIntakeForm(formData, token)
        alert("Intake form created successfully!")
      }

      fetchData()
    } catch (error) {
      console.error("Error saving intake form:", error)
      alert("Failed to save intake form")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading intake form...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Intake Form</h1>
          {patient && (
            <p className="text-gray-600">
              {patient.first_name} {patient.last_name} - {patient.email}
            </p>
          )}
        </div>

        {/* Alert if form exists */}
        {existingForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-800">
                This patient already has an intake form. You are editing the existing form.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Medical History Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-semibold text-gray-900">Medical History</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="medical_history" className="block text-sm font-medium text-gray-700 mb-2">
                  Medical History
                </label>
                <textarea
                  id="medical_history"
                  name="medical_history"
                  value={formData.medical_history}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Previous medical conditions, surgeries, etc."
                />
              </div>

              <div>
                <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 mb-2">
                  Allergies
                </label>
                <input
                  id="allergies"
                  type="text"
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Food, medication, or other allergies"
                />
              </div>

              <div>
                <label htmlFor="current_medications" className="block text-sm font-medium text-gray-700 mb-2">
                  Current Medications
                </label>
                <textarea
                  id="current_medications"
                  name="current_medications"
                  value={formData.current_medications}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="List all medications you are currently taking"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-semibold text-gray-900">Emergency Contact</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="emergency_contact_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="emergency_contact_name"
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Full name"
                />
              </div>

              <div>
                <label htmlFor="emergency_contact_phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone <span className="text-red-500">*</span>
                </label>
                <input
                  id="emergency_contact_phone"
                  type="tel"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label htmlFor="emergency_contact_relationship" className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship <span className="text-red-500">*</span>
                </label>
                <input
                  id="emergency_contact_relationship"
                  type="text"
                  name="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Spouse, Parent, Sibling"
                />
              </div>
            </div>
          </div>

          {/* Insurance Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-900">Insurance Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="insurance_provider" className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance Provider
                </label>
                <input
                  id="insurance_provider"
                  type="text"
                  name="insurance_provider"
                  value={formData.insurance_provider}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Insurance company name"
                />
              </div>

              <div>
                <label htmlFor="insurance_policy_number" className="block text-sm font-medium text-gray-700 mb-2">
                  Policy Number
                </label>
                <input
                  id="insurance_policy_number"
                  type="text"
                  name="insurance_policy_number"
                  value={formData.insurance_policy_number}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Policy/Member ID"
                />
              </div>
            </div>
          </div>

          {/* Dental Information Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-semibold text-gray-900">Dental Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="dental_concerns" className="block text-sm font-medium text-gray-700 mb-2">
                  Dental Concerns
                </label>
                <textarea
                  id="dental_concerns"
                  name="dental_concerns"
                  value={formData.dental_concerns}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe any current dental issues or concerns"
                />
              </div>

              <div>
                <label htmlFor="preferred_dentist" className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Dentist
                </label>
                <select
                  id="preferred_dentist"
                  name="preferred_dentist"
                  value={formData.preferred_dentist || ""}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No preference</option>
                  {dentists.map((dentist) => (
                    <option key={dentist.id} value={dentist.id}>
                      Dr. {dentist.first_name} {dentist.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : (existingForm ? "Update Form" : "Save Form")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
