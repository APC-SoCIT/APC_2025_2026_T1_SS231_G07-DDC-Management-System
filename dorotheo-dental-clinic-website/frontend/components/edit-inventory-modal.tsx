"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Package, DollarSign, Boxes, AlertTriangle } from "lucide-react"
import { api } from "@/lib/api"

interface EditInventoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  item: any
  clinics: any[]
  userType?: 'staff' | 'owner'
}

interface FormData {
  name: string
  category: string
  quantity: string
  min_stock: string
  supplier: string
  unit_cost: string
  clinic: string
}

const CATEGORIES = [
  "Tooth Paste",
  "Dental Tools",
  "Medicines",
  "Cleaning Supplies",
  "Office Supplies",
  "eze",
  "bees",
  "Other"
]

export function EditInventoryModal({
  isOpen,
  onClose,
  onSuccess,
  item,
  clinics,
  userType = 'staff'
}: EditInventoryModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    category: "",
    quantity: "",
    min_stock: "",
    supplier: "",
    unit_cost: "",
    clinic: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Initialize form with item data when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || "",
        category: item.category || "",
        quantity: item.quantity?.toString() || "",
        min_stock: item.min_stock?.toString() || "10",
        supplier: item.supplier || "",
        unit_cost: item.unit_cost?.toString() || "",
        clinic: item.clinic?.toString() || "",
      })
    }
  }, [item])

  // Calculate total cost
  const totalCost = formData.unit_cost && formData.quantity 
    ? (parseFloat(formData.unit_cost) * parseInt(formData.quantity)).toFixed(2)
    : "0.00"

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError("")
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError("Item name is required")
      return false
    }
    if (!formData.category) {
      setError("Please select a category")
      return false
    }
    if (!formData.quantity || parseInt(formData.quantity) < 0) {
      setError("Please enter a valid quantity")
      return false
    }
    if (!formData.min_stock || parseInt(formData.min_stock) < 0) {
      setError("Please enter a valid minimum stock level")
      return false
    }
    if (!formData.unit_cost || parseFloat(formData.unit_cost) <= 0) {
      setError("Please enter a valid unit cost")
      return false
    }
    if (!formData.clinic) {
      setError("Please select a clinic")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!validateForm() || !item) {
      return
    }
    
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Authentication required")
      }

      const itemData = {
        name: formData.name.trim(),
        category: formData.category,
        quantity: parseInt(formData.quantity),
        min_stock: parseInt(formData.min_stock),
        supplier: formData.supplier.trim(),
        unit_cost: parseFloat(formData.unit_cost),
        cost: parseFloat(totalCost),
        clinic: parseInt(formData.clinic),
      }

      await api.updateInventoryItem(item.id, itemData, token)
      
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Failed to update inventory item:", error)
      setError(error.message || "Failed to update inventory item")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError("")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Edit Inventory Item
          </DialogTitle>
          <DialogDescription>
            Update the item information. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Clinic Selection */}
          <div className="space-y-2">
            <Label htmlFor="clinic" className="flex items-center gap-1">
              Clinic <span className="text-destructive">*</span>
            </Label>
            <select
              id="clinic"
              name="clinic"
              value={formData.clinic}
              onChange={handleInputChange}
              disabled={loading || userType === 'staff'}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              required
            >
              <option value="">Select Clinic...</option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
            {userType === 'staff' && (
              <p className="text-xs text-muted-foreground">
                Staff cannot change the clinic of existing items
              </p>
            )}
          </div>

          {/* Item Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-1">
              Item Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Dental Floss, Toothpaste, Gloves..."
              disabled={loading}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="flex items-center gap-1">
              Category <span className="text-destructive">*</span>
            </Label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              disabled={loading}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              required
            >
              <option value="">Select Category...</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity and Min Stock Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="flex items-center gap-1">
                <Boxes className="w-4 h-4" />
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={handleInputChange}
                placeholder="0"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_stock" className="flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Min Stock Level <span className="text-destructive">*</span>
              </Label>
              <Input
                id="min_stock"
                name="min_stock"
                type="number"
                min="0"
                value={formData.min_stock}
                onChange={handleInputChange}
                placeholder="10"
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                Alert when stock falls below this level
              </p>
            </div>
          </div>

          {/* Supplier */}
          <div className="space-y-2">
            <Label htmlFor="supplier">
              Supplier (Optional)
            </Label>
            <Input
              id="supplier"
              name="supplier"
              value={formData.supplier}
              onChange={handleInputChange}
              placeholder="e.g., ABC Medical Supplies"
              disabled={loading}
            />
          </div>

          {/* Unit Cost */}
          <div className="space-y-2">
            <Label htmlFor="unit_cost" className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              Unit Cost (₱) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="unit_cost"
              name="unit_cost"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.unit_cost}
              onChange={handleInputChange}
              placeholder="0.00"
              disabled={loading}
              required
            />
          </div>

          {/* Total Cost Display */}
          <div className="p-4 bg-primary/5 rounded-lg border">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-xs text-muted-foreground">
                  {formData.quantity || 0} units × ₱{formData.unit_cost || "0.00"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">₱{totalCost}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Updating...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 mr-2" />
                  Update Item
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
