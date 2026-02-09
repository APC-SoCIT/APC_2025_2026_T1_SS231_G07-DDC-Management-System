"use client"

import { CheckCircle, Package, MapPin, Boxes, DollarSign, AlertTriangle } from "lucide-react"

interface InventorySuccessModalProps {
  isOpen: boolean
  onClose: () => void
  itemData: {
    name: string
    category: string
    quantity: number
    min_stock: number
    supplier: string
    unit_cost: number
    totalCost: number
    clinicName: string
  } | null
}

export function InventorySuccessModal({ isOpen, onClose, itemData }: InventorySuccessModalProps) {
  if (!isOpen || !itemData) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          {/* Success Icon */}
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 rounded-full p-3 animate-in zoom-in duration-300 delay-100">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-display font-bold text-center text-[var(--color-primary)] mb-2">
            Item Added Successfully!
          </h2>
          <p className="text-center text-[var(--color-text-muted)] mb-6">
            The inventory item has been added to the system.
          </p>

          {/* Item Details Box */}
          <div className="bg-[var(--color-background)] rounded-lg p-4 mb-6 border border-[var(--color-border)] space-y-3">
            {/* Item Name */}
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Item Name</p>
                <p className="font-semibold text-[var(--color-text)]">{itemData.name}</p>
              </div>
            </div>

            {/* Clinic */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Clinic Location</p>
                <p className="font-semibold text-[var(--color-text)]">{itemData.clinicName}</p>
              </div>
            </div>

            {/* Category */}
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-[var(--color-primary)] text-white rounded flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                C
              </div>
              <div className="flex-1">
                <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Category</p>
                <p className="font-semibold text-[var(--color-text)]">{itemData.category}</p>
              </div>
            </div>

            {/* Quantity and Min Stock */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border)]">
              <div className="flex items-start gap-2">
                <Boxes className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Quantity</p>
                  <p className="font-bold text-lg text-blue-600">{itemData.quantity}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Min Stock</p>
                  <p className="font-bold text-lg text-orange-600">{itemData.min_stock}</p>
                </div>
              </div>
            </div>

            {/* Supplier */}
            {itemData.supplier && (
              <div className="flex items-start gap-3 pt-2 border-t border-[var(--color-border)]">
                <div className="w-5 h-5 bg-purple-600 text-white rounded flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                  S
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Supplier</p>
                  <p className="font-semibold text-[var(--color-text)]">{itemData.supplier}</p>
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="pt-3 border-t border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[var(--color-text-muted)]" />
                  <span className="text-sm text-[var(--color-text-muted)]">Unit Cost</span>
                </div>
                <span className="font-semibold text-[var(--color-text)]">₱{itemData.unit_cost.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--color-text)]">Total Cost</span>
                <span className="text-xl font-bold text-[var(--color-primary)]">₱{itemData.totalCost.toFixed(2)}</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] text-right mt-1">
                {itemData.quantity} units × ₱{itemData.unit_cost.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
