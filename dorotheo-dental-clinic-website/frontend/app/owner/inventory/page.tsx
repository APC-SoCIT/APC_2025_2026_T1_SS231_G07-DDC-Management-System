"use client"

import { useState, useEffect } from "react"
import { Plus, AlertTriangle } from "lucide-react"
import { api } from "@/lib/api"

export default function OwnerInventory() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    quantity: "",
    min_stock: "",
    supplier: "",
    cost: "",
  })

  // Fetch inventory items on component mount
  useEffect(() => {
    fetchInventory()
  }, [])

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // Convert numeric fields to numbers
      const itemData = {
        name: formData.name,
        category: formData.category,
        quantity: parseInt(formData.quantity),
        min_stock: parseInt(formData.min_stock),
        supplier: formData.supplier,
        cost: parseFloat(formData.cost),
      }

      await api.createInventoryItem(itemData, token)
      
      // Reset form
      setFormData({
        name: "",
        category: "",
        quantity: "",
        min_stock: "",
        supplier: "",
        cost: "",
      })
      
      // Close modal and refresh inventory
      setShowAddModal(false)
      await fetchInventory()
      
      alert("Inventory item added successfully!")
    } catch (error: any) {
      console.error("Failed to add inventory item:", error)
      alert(error.message || "Failed to add inventory item")
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
          <h1 className="text-3xl font-serif font-bold text-[var(--color-primary)] mb-2">Inventory</h1>
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
      {inventory.length > 0 && inventory.some((item: any) => item.quantity <= item.minStock) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Low Stock Alert</p>
            <p className="text-sm text-amber-700">
              {inventory.filter((item: any) => item.quantity <= item.minStock).length} item(s) below minimum stock level
            </p>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--color-background)] border-b border-[var(--color-border)]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Item Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Category</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Quantity</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Min Stock</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Supplier</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Cost (PHP)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text)]">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-lg font-medium text-[var(--color-text)]">Loading inventory...</p>
                  </td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-lg font-medium text-[var(--color-text)] mb-2">No Inventory Items</p>
                    <p className="text-sm text-[var(--color-text-muted)]">Click "Add Item" to start managing your inventory</p>
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--color-background)] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-[var(--color-text)]">{item.name}</p>
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
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{item.min_stock}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{item.supplier}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">₱{item.cost.toLocaleString()}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{formatDate(item.updated_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold text-[var(--color-primary)]">Add Inventory Item</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Cost (PHP)</label>
                  <input
                    type="number"
                    name="cost"
                    value={formData.cost}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
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
    </div>
  )
}
