"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, X, AlertCircle } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import { useClinic, type ClinicLocation } from "@/lib/clinic-context"
import { ClinicBadge } from "@/components/clinic-badge"

interface Service {
  id: number
  name: string
  description: string
  category: string
  duration: number
  color: string
  image: string
  created_at: string
  clinics_data?: ClinicLocation[]
  clinic_ids?: number[]
}

export default function ServicesPage() {
  const { token } = useAuth()
  const { allClinics } = useClinic()
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [tempColor, setTempColor] = useState("#10b981")
  const [showColorPicker, setShowColorPicker] = useState(false)

  // Format duration to show hours and minutes
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} mins`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) {
      return `${hours}hr${hours > 1 ? 's' : ''}`
    }
    return `${hours}hr${hours > 1 ? 's' : ''} ${mins}mins`
  }
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "all",
    duration: 30,
    color: "#10b981",
    image: null as File | null,
    selectedClinics: [] as number[],
  })
  const [imagePreview, setImagePreview] = useState("")

  // Fetch services on load
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setIsLoading(true)
        const data = await api.getServices()
        setServices(data)
      } catch (error) {
        console.error("Failed to fetch services:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchServices()
  }, [])

  const categories = [
    { value: "all", label: "All Services" },
    { value: "orthodontics", label: "Orthodontics" },
    { value: "restorations", label: "Restorations" },
    { value: "xrays", label: "X-Rays" },
    { value: "oral_surgery", label: "Oral Surgery" },
    { value: "preventive", label: "Preventive" },
  ]

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, image: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) return

    try {
      const data = new FormData()
      data.append("name", formData.name)
      data.append("description", formData.description)
      data.append("category", formData.category)
      data.append("duration", formData.duration.toString())
      data.append("color", formData.color)
      if (formData.image) {
        data.append("image", formData.image)
      }
      // Append clinic_ids array
      formData.selectedClinics.forEach(clinicId => {
        data.append("clinic_ids", clinicId.toString())
      })

      if (editingService) {
        // Update existing service
        const updatedService = await api.updateService(editingService.id, data, token)
        setServices(services.map((s) => (s.id === editingService.id ? updatedService : s)))
      } else {
        // Create new service
        const newService = await api.createService(data, token)
        setServices([...services, newService])
      }

      // Reset form
      setFormData({ name: "", description: "", category: "all", duration: 30, color: "#10b981", image: null, selectedClinics: [] })
      setImagePreview("")
      setEditingService(null)
      setIsModalOpen(false)
    } catch (error) {
      console.error("Failed to save service:", error)
      alert("Failed to save service. Please try again.")
    }
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    const serviceColor = service.color || "#10b981"
    setFormData({
      name: service.name,
      description: service.description,
      category: service.category,
      duration: service.duration || 30,
      color: serviceColor,
      image: null,
      selectedClinics: service.clinics_data?.map(c => c.id) || [],
    })
    setTempColor(serviceColor)
    setImagePreview(service.image)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!token) return

    if (confirm("Are you sure you want to delete this service?")) {
      try {
        await api.deleteService(id, token)
        setServices(services.filter((s) => s.id !== id))
      } catch (error) {
        console.error("Failed to delete service:", error)
      }
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingService(null)
    setFormData({ name: "", description: "", category: "all", duration: 30, color: "#10b981", image: null, selectedClinics: [] })
    setImagePreview("")
    setShowColorPicker(false)
    setTempColor("#10b981")
  }

  const handleColorConfirm = () => {
    setFormData({ ...formData, color: tempColor })
    setShowColorPicker(false)
  }

  const handleColorCancel = () => {
    setTempColor(formData.color)
    setShowColorPicker(false)
  }

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        if (showColorPicker) {
          handleColorCancel()
        } else {
          closeModal()
        }
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isModalOpen, showColorPicker, formData.color])

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-[var(--color-primary)] mb-2">Services Management</h1>
          <p className="text-[var(--color-text-muted)]">Add, edit, or remove dental services</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-[var(--color-border)]">
          <p className="text-[var(--color-text-muted)] text-lg mb-4">No services yet</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Add Your First Service
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{services.map((service) => (
          <div
            key={service.id}
            className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden"
          >
            <img src={service.image || "/placeholder.svg"} alt={service.name} className="w-full h-48 object-cover" />
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-semibold mb-1">
                    <span 
                      className="px-3 py-1 rounded-lg"
                      style={{ backgroundColor: service.color, color: '#ffffff' }}
                    >
                      {service.name}
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <span className="inline-block px-3 py-1 bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs rounded-full">
                      {categories.find((c) => c.value === service.category)?.label}
                    </span>
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                      {formatDuration(service.duration)}
                    </span>
                  </div>
                  {/* Show clinic badges */}
                  {service.clinics_data && service.clinics_data.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs text-[var(--color-text-muted)] mb-1">Available at:</p>
                      <div className="flex flex-wrap gap-1">
                        {service.clinics_data.map((clinic) => (
                          <ClinicBadge key={clinic.id} clinic={clinic} size="sm" showIcon={false} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs">
                      <AlertCircle className="w-3 h-3" />
                      <span>No clinics assigned</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[var(--color-text-muted)] text-sm mb-4">{service.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(service)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/5 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Add/Edit Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] p-6 flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-[var(--color-primary)]">
                {editingService ? "Edit Service" : "Add New Service"}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Service Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="e.g., Teeth Whitening"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  required
                  min="5"
                  step="5"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })}
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="e.g., 30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Color</label>
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTempColor(formData.color)
                        setShowColorPicker(true)
                      }}
                      className="w-16 h-12 border border-[var(--color-border)] rounded-lg cursor-pointer"
                      style={{ backgroundColor: formData.color }}
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                      placeholder="#10b981"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>

                  {/* Color Picker Modal */}
                  {showColorPicker && (
                    <div className="absolute top-0 left-0 z-10 bg-white border border-[var(--color-border)] rounded-lg shadow-lg p-4">
                      <div className="flex flex-col gap-3">
                        <input
                          type="color"
                          value={tempColor}
                          onChange={(e) => setTempColor(e.target.value)}
                          className="w-48 h-32 border border-[var(--color-border)] rounded-lg cursor-pointer"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-[var(--color-text-muted)]">{tempColor}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleColorCancel}
                            className="flex-1 px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-gray-50 transition-colors text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleColorConfirm}
                            className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors text-sm"
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Description</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="Describe the service..."
                />
              </div>

              {/* Clinic Assignment */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Available at Clinics {formData.selectedClinics.length === 0 && (
                    <span className="text-amber-600 text-xs ml-2">(⚠️ Select at least one clinic)</span>
                  )}
                </label>
                <div className="space-y-2 p-4 border border-[var(--color-border)] rounded-lg">
                  {allClinics.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)]">No clinics available</p>
                  ) : (
                    allClinics.map((clinic) => (
                      <label key={clinic.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={formData.selectedClinics.includes(clinic.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selectedClinics: [...formData.selectedClinics, clinic.id],
                              })
                            } else {
                              setFormData({
                                ...formData,
                                selectedClinics: formData.selectedClinics.filter((id) => id !== clinic.id),
                              })
                            }
                          }}
                          className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-border)] rounded focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{clinic.name}</span>
                            <ClinicBadge clinic={clinic} size="sm" showIcon={false} />
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)]">{clinic.address}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Service Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {imagePreview && (
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Preview"
                    className="mt-4 w-full h-48 object-cover rounded-lg"
                  />
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                  {editingService ? "Update Service" : "Add Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
