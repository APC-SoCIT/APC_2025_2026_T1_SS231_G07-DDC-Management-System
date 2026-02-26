"use client"

import { useState, useEffect, useMemo } from "react"
import { Edit2, Download, CheckCircle } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import { usePhLocations } from "@/hooks/use-ph-locations"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
    addressStreet: "",
    addressProvince: "",
    addressProvinceCode: "",
    addressCity: "",
    addressCityCode: "",
    addressBarangay: "",
    addressZip: "",
  })
  const [originalProfile, setOriginalProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthday: "",
    age: 0,
    addressStreet: "",
    addressProvince: "",
    addressProvinceCode: "",
    addressCity: "",
    addressCityCode: "",
    addressBarangay: "",
    addressZip: "",
  })

  const { provinces, getCities, getBarangays } = usePhLocations()
  const cities = useMemo(
    () => getCities(profile.addressProvinceCode),
    [profile.addressProvinceCode, getCities]
  )
  const barangays = useMemo(
    () => getBarangays(profile.addressCityCode),
    [profile.addressCityCode, getBarangays]
  )

  // Load real user data from auth context
  useEffect(() => {
    if (user) {
      const savedProvince = (user as any).address_province || ""
      const savedCity = (user as any).address_city || ""

      // Resolve province code from name
      const matchedProvince = provinces.find(
        (p) => p.name.toLowerCase() === savedProvince.toLowerCase()
      )
      const provinceCode = matchedProvince?.code ?? ""

      // Resolve city code from name (needs province code first)
      let cityCode = ""
      if (provinceCode) {
        const cityList = getCities(provinceCode)
        const matchedCity = cityList.find(
          (c) => c.name.toLowerCase() === savedCity.toLowerCase()
        )
        cityCode = matchedCity?.code ?? ""
      }

      const profileData = {
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        email: user.email || "",
        phone: (user as any).phone || "",
        birthday: (user as any).birthday || "",
        age: (user as any).age || 0,
        addressStreet: (user as any).address_street || "",
        addressProvince: savedProvince,
        addressProvinceCode: provinceCode,
        addressCity: savedCity,
        addressCityCode: cityCode,
        addressBarangay: (user as any).address_barangay || "",
        addressZip: (user as any).address_zip || "",
      }
      setProfile(profileData)
      setOriginalProfile(profileData)
    }
  }, [user, provinces, getCities])

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
      profile.addressStreet !== originalProfile.addressStreet ||
      profile.addressProvince !== originalProfile.addressProvince ||
      profile.addressCity !== originalProfile.addressCity ||
      profile.addressBarangay !== originalProfile.addressBarangay ||
      profile.addressZip !== originalProfile.addressZip

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
        address_street: profile.addressStreet,
        address_province: profile.addressProvince,
        address_city: profile.addressCity,
        address_barangay: profile.addressBarangay,
        address_zip: profile.addressZip,
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
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Street Address</label>
              <input
                type="text"
                value={profile.addressStreet}
                onChange={(e) => setProfile({ ...profile, addressStreet: e.target.value })}
                disabled={!isEditing}
                placeholder="House/Unit No., Street, Subdivision"
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Province</label>
              {isEditing ? (
                <Select
                  value={profile.addressProvinceCode}
                  onValueChange={(code) => {
                    const prov = provinces.find((p) => p.code === code)
                    setProfile({
                      ...profile,
                      addressProvinceCode: code,
                      addressProvince: prov?.name ?? "",
                      addressCityCode: "",
                      addressCity: "",
                      addressBarangay: "",
                    })
                  }}
                >
                  <SelectTrigger className="w-full px-4 py-2.5 h-auto border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {provinces.map((p) => (
                      <SelectItem key={p.code} value={p.code}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <input
                  type="text"
                  value={profile.addressProvince}
                  disabled
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg bg-gray-50"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">City / Municipality</label>
              {isEditing ? (
                <Select
                  value={profile.addressCityCode}
                  onValueChange={(code) => {
                    const city = cities.find((c) => c.code === code)
                    setProfile({
                      ...profile,
                      addressCityCode: code,
                      addressCity: city?.name ?? "",
                      addressBarangay: "",
                    })
                  }}
                  disabled={!profile.addressProvinceCode}
                >
                  <SelectTrigger
                    className={`w-full px-4 py-2.5 h-auto border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                      !profile.addressProvinceCode ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <SelectValue placeholder="Select city / municipality" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {cities.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <input
                  type="text"
                  value={profile.addressCity}
                  disabled
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg bg-gray-50"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Barangay</label>
              {isEditing ? (
                <Select
                  value={profile.addressBarangay}
                  onValueChange={(name) => setProfile({ ...profile, addressBarangay: name })}
                  disabled={!profile.addressCityCode}
                >
                  <SelectTrigger
                    className={`w-full px-4 py-2.5 h-auto border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                      !profile.addressCityCode ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <SelectValue placeholder="Select barangay" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {barangays.map((b) => (
                      <SelectItem key={b.code} value={b.name}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <input
                  type="text"
                  value={profile.addressBarangay}
                  disabled
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg bg-gray-50"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Zip Code</label>
              <input
                type="text"
                value={profile.addressZip}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "")
                  setProfile({ ...profile, addressZip: value })
                }}
                disabled={!isEditing}
                maxLength={4}
                placeholder="e.g. 1234"
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50"
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setProfile(originalProfile); setIsEditing(false) }}
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
