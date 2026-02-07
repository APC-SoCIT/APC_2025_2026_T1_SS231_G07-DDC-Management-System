"use client"

import { useState, useEffect } from "react"
import { Plus, AlertTriangle, Edit2, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { useClinic } from "@/lib/clinic-context"

export default function StaffInventory() {
  const { selectedClinic, allClinics } = useClinic()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    quantity: "",
    min_stock: "",
    supplier: "",
    unit_cost: "",
    clinic: "",
  })

  // Calculate total cost
  const totalCost = formData.unit_cost && formData.quantity 
    ? (parseFloat(formData.unit_cost) * parseInt(formData.quantity)).toFixed(2)
    : "0.00"

  // Fetch inventory items on component mount
  useEffect(() => {
    fetchInventory()
  }, [])

  // Filter inventory based on selected clinic
  const filteredInventory = inventory.filter((item) => {
    if (selectedClinic === "all") {
      return true
    }
    return item.clinic === selectedClinic?.id
  })

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return
      
      const data = await api.getInventory(token)
      setInventory(data)
    } catch (error) {
      console.error("Failed to fetch inventory:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        alert("Please login to add inventory items")
        return
      }

      const itemData = {
        name: formData.name,
        category: formData.category,
        quantity: parseInt(formData.quantity),
        min_stock: parseInt(formData.min_stock),
        supplier: formData.supplier,
        unit_cost: parseFloat(formData.unit_cost),
        cost: parseFloat(totalCost),
        clinic: parseInt(formData.clinic),
      }

      await api.createInventoryItem(itemData, token)
      
      setFormData({
        name: "",
        category: "",
        quantity: "",
        min_stock: "",
        supplier: "",
        unit_cost: "",
        clinic: "",
      })
      
      setShowAddModal(false)
      await fetchInventory()
      
      alert("Inventory item added successfully!")
    } catch (error: any) {
      console.error("Failed to add inventory item:", error)
      alert(error.message || "Failed to add inventory item")
    }
  }

  const handleEdit = (item: any) => {
    setSelectedItem(item)
    setFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity.toString(),
      min_stock: item.min_stock.toString(),
      supplier: item.supplier,
      unit_cost: item.unit_cost?.toString() || "0",
      clinic: item.clinic?.toString() || "",
    })
    setShowEditModal(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem("token")
      if (!token || !selectedItem) return

      const itemData = {
        name: formData.name,
        category: formData.category,
        quantity: parseInt(formData.quantity),
        min_stock: parseInt(formData.min_stock),
        supplier: formData.supplier,
        unit_cost: parseFloat(formData.unit_cost),
        cost: parseFloat(totalCost),
        clinic: parseInt(formData.clinic),
      }

      await api.updateInventoryItem(selectedItem.id, itemData, token)
      
      setFormData({
        name: "",
        category: "",
        quantity: "",
        min_stock: "",
        supplier: "",
        unit_cost: "",
        clinic: "",
      })
      
      setShowEditModal(false)
      setSelectedItem(null)
      await fetchInventory()
      
      alert("Inventory item updated successfully!")
    } catch (error: any) {
      console.error("Failed to update inventory item:", error)
      alert(error.message || "Failed to update inventory item")
    }
  }

  const handleDeleteClick = (item: any) => {
    setSelectedItem(item)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token || !selectedItem) return

      await api.deleteInventoryItem(selectedItem.id, token)
      
      setShowDeleteModal(false)
      setSelectedItem(null)
      await fetchInventory()
      
      alert("Inventory item deleted successfully!")
    } catch (error: any) {
      console.error("Failed to delete inventory item:", error)
      alert(error.message || "Failed to delete inventory item")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-[var(--color-primary)] mb-2">Inventory</h1>
          <p className="text-[var(--color-text-muted)]">Manage clinic supplies and equipment</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      {/* Low Stock Alert */}
      {filteredInventory.length > 0 && filteredInventory.some((item: any) => item.quantity <= item.min_stock) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Low Stock Alert</p>
            <p className="text-sm text-amber-700">
              {filteredInventory.filter((item: any) => item.quantity <= item.min_stock).length} item(s) below minimum stock level
            </p>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        {filteredInventory.length === 0 && !loading ? (
          <div className="text-center py-12">
            <p className="text-[var(--color-text-muted)]">No inventory items yet. Add your first item to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-background)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Item Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Clinic</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Quantity</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Unit Cost</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Total Cost</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Last Updated</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <p className="text-lg font-medium text-[var(--color-text)]">Loading inventory...</p>
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--color-background)] transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-[var(--color-text)]">{item.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {item.clinic_name || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--color-text-muted)]">{item.category}</td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            item.quantity <= item.min_stock ? "text-red-600 font-medium" : "text-[var(--color-text-muted)]"
                          }
                        >
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--color-text-muted)]">₱{item.unit_cost?.toLocaleString() || "0.00"}</td>
                      <td className="px-6 py-4 font-medium text-[var(--color-text)]">₱{item.cost?.toLocaleString() || "0.00"}</td>
                      <td className="px-6 py-4 text-[var(--color-text-muted)]">{formatDate(item.updated_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit item"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-[var(--color-primary)]">Add Inventory Item</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Clinic</label>
                  <select
                    name="clinic"
                    value={formData.clinic}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option value="">Select Clinic</option>
                    {allClinics.map((clinic) => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Item Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Min Stock</label>
                  <input
                    type="number"
                    name="min_stock"
                    value={formData.min_stock}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Supplier</label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Unit Cost (PHP)</label>
                  <input
                    type="number"
                    name="unit_cost"
                    value={formData.unit_cost}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div className="col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total Cost:</span>
                    <span className="text-xl font-bold text-[var(--color-primary)]">₱{totalCost}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formData.quantity || 0} × ₱{formData.unit_cost || 0}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-[var(--color-primary)]">Edit Inventory Item</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedItem(null)
                  setFormData({
                    name: "",
                    category: "",
                    quantity: "",
                    min_stock: "",
                    supplier: "",
                    unit_cost: "",
                    clinic: "",
                  })
                }}
                className="p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Clinic</label>
                  <select
                    name="clinic"
                    value={formData.clinic}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option value="">Select Clinic</option>
                    {allClinics.map((clinic) => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Item Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Min Stock</label>
                  <input
                    type="number"
                    name="min_stock"
                    value={formData.min_stock}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Supplier</label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Unit Cost (PHP)</label>
                  <input
                    type="number"
                    name="unit_cost"
                    value={formData.unit_cost}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div className="col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total Cost:</span>
                    <span className="text-xl font-bold text-[var(--color-primary)]">₱{totalCost}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formData.quantity || 0} × ₱{formData.unit_cost || 0}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedItem(null)
                    setFormData({
                      name: "",
                      category: "",
                      quantity: "",
                      min_stock: "",
                      supplier: "",
                      unit_cost: "",
                      clinic: "",
                    })
                  }}
                  className="flex-1 px-6 py-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium"
                >
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="border-b border-[var(--color-border)] px-6 py-4">
              <h2 className="text-2xl font-display font-bold text-[var(--color-primary)]">Confirm Delete</h2>
            </div>

            <div className="p-6">
              <p className="text-[var(--color-text)] mb-4">
                Are you sure you want to delete <strong>{selectedItem.name}</strong>? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedItem(null)
                  }}
                  className="flex-1 px-6 py-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
