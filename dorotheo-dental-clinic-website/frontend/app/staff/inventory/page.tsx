"use client"

import { useState } from "react"
import { Plus, AlertTriangle } from "lucide-react"

export default function StaffInventory() {
  const [showAddModal, setShowAddModal] = useState(false)

  const inventory: any[] = []  // Empty - will be populated from API

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

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        {inventory.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--color-text-muted)]">No inventory items yet. Add your first item to get started!</p>
          </div>
        ) : (
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
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--color-background)] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-[var(--color-text)]">{item.name}</p>
                    </td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{item.category}</td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          item.quantity <= item.minStock ? "text-red-600 font-medium" : "text-[var(--color-text-muted)]"
                        }
                      >
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{item.minStock}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{item.supplier}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{item.cost.toLocaleString()}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{item.lastUpdated}</td>
                  </tr>
                ))}
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
              <h2 className="text-2xl font-serif font-bold text-[var(--color-primary)]">Add Inventory Item</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                ×
              </button>
            </div>

            <form className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Item Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Category</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Quantity</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Min Stock</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Supplier</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Cost (PHP)</label>
                  <input
                    type="number"
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
