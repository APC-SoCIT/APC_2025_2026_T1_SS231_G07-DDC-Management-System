"use client"

import { useState, useEffect } from "react"
import { Edit2, Download, CheckCircle } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"

export default function PatientProfile() {
  const { user, token, setUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthday: "",
    age: 0,
    address: "",
  })
  const [originalProfile, setOriginalProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthday: "",
    age: 0,
    address: "",
  })

  // Load real user data from auth context
  useEffect(() => {
    if (user) {
      const profileData = {
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        email: user.email || "",
        phone: (user as any).phone || "",
        birthday: (user as any).birthday || "",
        age: (user as any).age || 0,
        address: (user as any).address || "",
      }
      setProfile(profileData)
      setOriginalProfile(profileData)
    }
  }, [user])

  const documents: any[] = [
    // No sample documents - will be populated from real data
  ]

  const handleSave = async () => {
    if (!token) {
      alert("Please log in to update your profile")
      return
    }

    // Check if there are any changes
    const hasChanges = 
      profile.email !== originalProfile.email ||
      profile.phone !== originalProfile.phone ||
      profile.birthday !== originalProfile.birthday ||
      profile.address !== originalProfile.address

    if (!hasChanges) {
      setIsEditing(false)
      return
    }

    try {
      setIsSaving(true)
      const updateData = {
        first_name: profile.firstName,
        last_name: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        birthday: profile.birthday,
        address: profile.address,
      }

      const updatedUser = await api.updateProfile(token, updateData)
      
      // Update the user in auth context
      if (setUser) {
        setUser(updatedUser)
      }
      
      // Update original profile to reflect saved changes
      setOriginalProfile(profile)
      setIsEditing(false)
      setShowSuccessModal(true)
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Failed to update profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">Success!</h2>
              <p className="text-[var(--color-text-muted)] mb-6">Profile updated successfully.</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors w-full"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold text-[var(--color-primary)]">My Profile</h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>

        {/* Profile Information */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-6">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">First Name</label>
              <input
                type="text"
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                disabled={true}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Last Name</label>
              <input
                type="text"
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                disabled={true}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Phone</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Birthday</label>
              <input
                type="date"
                value={profile.birthday}
                onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}
                disabled={true}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Address</label>
              <textarea
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                disabled={!isEditing}
                rows={3}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50"
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="px-6 py-2.5 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        {/* Downloadable Documents */}
        {documents.length > 0 && (
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
            <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-6">Downloadable Documents</h2>
            <div className="space-y-3">
              {documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
                >
                  <div>
                    <h3 className="font-medium text-[var(--color-text)]">{doc.name}</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {doc.type} • {doc.date}
                    </p>
                  </div>
                  <button className="p-2 hover:bg-white rounded-lg transition-colors">
                    <Download className="w-5 h-5 text-[var(--color-primary)]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
