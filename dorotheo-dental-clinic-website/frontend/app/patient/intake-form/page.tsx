"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import * as api from "@/lib/api"
import { Heart, Phone, Shield, Stethoscope, Info, FileText } from "lucide-react"

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
  preferred_dentist_name?: string
}

export default function PatientIntakeFormPage() {
  const router = useRouter()
  const [intakeForm, setIntakeForm] = useState<IntakeForm | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const user = JSON.parse(localStorage.getItem("user") || "{}")

    if (!token || user.role !== "patient") {
      router.push("/")
      return
    }

    fetchIntakeForm()
  }, [router])

  const fetchIntakeForm = async () => {
    try {
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      
      if (!token) return

      const forms = await api.getIntakeFormByPatient(user.id, token)
      if (forms && forms.length > 0) {
        setIntakeForm(forms[0])
      }
    } catch (error) {
      console.error("Error fetching intake form:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your intake form...</p>
        </div>
      </div>
    )
  }

  if (!intakeForm) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">My Intake Form</h1>
          
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Intake Form Found</h3>
            <p className="text-gray-600 mb-6">
              You don't have an intake form on file yet. Please contact the clinic to complete your intake form.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <Info className="w-5 h-5 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-blue-800">
                The intake form helps us understand your medical history and dental needs. 
                The clinic staff will assist you in completing it during your first visit.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Intake Form</h1>
          <p className="text-gray-600">View your medical and dental information on file</p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">Read-Only View</h3>
            <p className="text-sm text-blue-800">
              This is a read-only view of your intake form. If you need to update any information,
              please contact the clinic staff who will assist you.
            </p>
          </div>
        </div>

        {/* Medical History Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900">Medical History</h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">
                Medical History
              </p>
              <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                <p className="text-gray-900 whitespace-pre-wrap">
                  {intakeForm.medical_history || "Not provided"}
                </p>
              </div>
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">
                Allergies
              </p>
              <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                <p className="text-gray-900">
                  {intakeForm.allergies || "None reported"}
                </p>
              </div>
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">
                Current Medications
              </p>
              <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                <p className="text-gray-900 whitespace-pre-wrap">
                  {intakeForm.current_medications || "None"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-semibold text-gray-900">Emergency Contact</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">
                Contact Name
              </p>
              <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                <p className="text-gray-900">{intakeForm.emergency_contact_name}</p>
              </div>
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone
              </p>
              <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                <p className="text-gray-900">{intakeForm.emergency_contact_phone}</p>
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="block text-sm font-medium text-gray-700 mb-2">
                Relationship
              </p>
              <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                <p className="text-gray-900">{intakeForm.emergency_contact_relationship}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Insurance Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">Insurance Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">
                Insurance Provider
              </p>
              <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                <p className="text-gray-900">
                  {intakeForm.insurance_provider || "Not provided"}
                </p>
              </div>
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">
                Policy Number
              </p>
              <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                <p className="text-gray-900">
                  {intakeForm.insurance_policy_number || "Not provided"}
                </p>
              </div>
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
              <p className="block text-sm font-medium text-gray-700 mb-2">
                Dental Concerns
              </p>
              <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                <p className="text-gray-900 whitespace-pre-wrap">
                  {intakeForm.dental_concerns || "No concerns noted"}
                </p>
              </div>
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Dentist
              </p>
              <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                <p className="text-gray-900">
                  {intakeForm.preferred_dentist_name || "No preference"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Notice */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Need to update your information?</strong> Please contact the clinic at your earliest
            convenience. Keeping your medical and contact information up to date helps us provide you
            with the best care possible.
          </p>
        </div>
      </div>
    </div>
  )
}
