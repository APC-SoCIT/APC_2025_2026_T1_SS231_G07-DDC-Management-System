"use client"

import { useState, useEffect } from "react"
import { Search, ChevronDown, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { inventoryAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function InventoryContent() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)
  const [isEditItemOpen, setIsEditItemOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const { toast } = useToast()

  // Form state for adding item
  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    quantity: "",
    min_stock: "",
    unit: "piece",
    supplier: "",
    cost_per_unit: "",
    notes: "",
  })

  // Form state for editing item
  const [editItem, setEditItem] = useState({
    name: "",
    category: "",
    quantity: "",
    min_stock: "",
    unit: "piece",
    supplier: "",
    cost_per_unit: "",
    notes: "",
  })

  useEffect(() => {
    fetchItems()
  }, [categoryFilter])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const response = await inventoryAPI.getAll()
      let fetchedItems = Array.isArray(response) ? response : response.results || []

      if (categoryFilter !== "all") {
        fetchedItems = fetchedItems.filter((item) => item.category === categoryFilter)
      }

      setItems(fetchedItems)
    } catch (error) {
      console.error("Failed to fetch inventory items:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load inventory items. Please check if the backend is running.",
        variant: "destructive",
      })
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category || !newItem.quantity || !newItem.min_stock) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      await inventoryAPI.create(newItem)
      toast({
        title: "Success",
        description: "Item added successfully!",
      })
      setIsAddItemOpen(false)
      setNewItem({
        name: "",
        category: "",
        quantity: "",
        min_stock: "",
        unit: "piece",
        supplier: "",
        cost_per_unit: "",
        notes: "",
      })
      fetchItems()
    } catch (error) {
      console.error("Failed to add item:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add item. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEditItem = (item) => {
    setSelectedItem(item)
    setEditItem({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      min_stock: item.min_stock,
      unit: item.unit,
      supplier: item.supplier,
      cost_per_unit: item.cost_per_unit,
      notes: item.notes || "",
    })
    setIsEditItemOpen(true)
  }

  const handleUpdateItem = async () => {
    try {
      await inventoryAPI.update(selectedItem.id, editItem)
      toast({
        title: "Success",
        description: "Item updated successfully!",
      })
      setIsEditItemOpen(false)
      setSelectedItem(null)
      fetchItems()
    } catch (error) {
      console.error("Failed to update item:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update item. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteItem = async (id) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      await inventoryAPI.delete(id)
      toast({
        title: "Success",
        description: "Item deleted successfully!",
      })
      fetchItems()
    } catch (error) {
      console.error("Failed to delete item:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete item. Please try again.",
        variant: "destructive",
      })
    }
  }

  const updateQuantity = async (id, delta) => {
    const item = items.find((i) => i.id === id)
    if (!item) return

    const newQuantity = Math.max(0, item.quantity + delta)

    try {
      await inventoryAPI.update(id, { ...item, quantity: newQuantity })
      fetchItems()
    } catch (error) {
      console.error("Failed to update quantity:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update quantity. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "In Stock":
        return "bg-green-100 text-green-800"
      case "Low Stock":
        return "bg-yellow-100 text-yellow-800"
      case "Critical":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredItems = items.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplier?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search items, categories, or suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="anesthetics">Anesthetics</SelectItem>
            <SelectItem value="restorative">Restorative Materials</SelectItem>
            <SelectItem value="ppe">PPE</SelectItem>
            <SelectItem value="imaging">Imaging</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1a4d2e] hover:bg-[#143d24] text-white">Add New Item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl text-[#1a4d2e]">Add New Item</DialogTitle>
              <p className="text-sm text-gray-600">Enter the details for the new dental supply or equipment item.</p>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itemName">Item Name</Label>
                  <Input
                    id="itemName"
                    placeholder="ex. Dental Floss"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newItem.category}
                    onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anesthetics">Anesthetics</SelectItem>
                      <SelectItem value="restorative">Restorative Materials</SelectItem>
                      <SelectItem value="ppe">PPE</SelectItem>
                      <SelectItem value="imaging">Imaging</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="0"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={newItem.unit} onValueChange={(value) => setNewItem({ ...newItem, unit: value })}>
                    <SelectTrigger id="unit">
                      <SelectValue placeholder="Select Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="piece">Piece</SelectItem>
                      <SelectItem value="bottle">Bottle</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStock">Min Stock Level</Label>
                  <Input
                    id="minStock"
                    type="number"
                    placeholder="0"
                    value={newItem.min_stock}
                    onChange={(e) => setNewItem({ ...newItem, min_stock: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier/Brand</Label>
                  <Input
                    id="supplier"
                    placeholder="ex. Colgate"
                    value={newItem.supplier}
                    onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost per Unit</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newItem.cost_per_unit}
                    onChange={(e) => setNewItem({ ...newItem, cost_per_unit: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Dentist Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional details, storage requirements, etc."
                  rows={4}
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setIsAddItemOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-[#a5d6a7] hover:bg-[#8bc98e] text-[#1a4d2e]" onClick={handleAddItem}>
                  Add Item
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#1a4d2e]">Edit Item</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editItemName">Item Name</Label>
                  <Input
                    id="editItemName"
                    value={editItem.name}
                    onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editCategory">Category</Label>
                  <Select
                    value={editItem.category}
                    onValueChange={(value) => setEditItem({ ...editItem, category: value })}
                  >
                    <SelectTrigger id="editCategory">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anesthetics">Anesthetics</SelectItem>
                      <SelectItem value="restorative">Restorative Materials</SelectItem>
                      <SelectItem value="ppe">PPE</SelectItem>
                      <SelectItem value="imaging">Imaging</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editQuantity">Quantity</Label>
                  <Input
                    id="editQuantity"
                    type="number"
                    value={editItem.quantity}
                    onChange={(e) => setEditItem({ ...editItem, quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editUnit">Unit</Label>
                  <Select value={editItem.unit} onValueChange={(value) => setEditItem({ ...editItem, unit: value })}>
                    <SelectTrigger id="editUnit">
                      <SelectValue placeholder="Select Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="piece">Piece</SelectItem>
                      <SelectItem value="bottle">Bottle</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editMinStock">Min Stock Level</Label>
                  <Input
                    id="editMinStock"
                    type="number"
                    value={editItem.min_stock}
                    onChange={(e) => setEditItem({ ...editItem, min_stock: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editSupplier">Supplier/Brand</Label>
                  <Input
                    id="editSupplier"
                    value={editItem.supplier}
                    onChange={(e) => setEditItem({ ...editItem, supplier: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editCost">Cost per Unit</Label>
                  <Input
                    id="editCost"
                    type="number"
                    step="0.01"
                    value={editItem.cost_per_unit}
                    onChange={(e) => setEditItem({ ...editItem, cost_per_unit: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editNotes">Dentist Notes</Label>
                <Textarea
                  id="editNotes"
                  rows={4}
                  value={editItem.notes}
                  onChange={(e) => setEditItem({ ...editItem, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setIsEditItemOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-[#a5d6a7] hover:bg-[#8bc98e] text-[#1a4d2e]" onClick={handleUpdateItem}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg border overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a4d3a]"></div>
            <p className="mt-2 text-gray-600">Loading inventory...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery || categoryFilter !== "all"
              ? "No items found matching your filters."
              : "No inventory items yet. Add your first item!"}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-sm">Inventory Items</th>
                <th className="text-left p-4 font-medium text-sm">
                  <div className="flex items-center gap-1">
                    Category <ChevronDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-sm">Quantity</th>
                <th className="text-left p-4 font-medium text-sm">Min Stock</th>
                <th className="text-left p-4 font-medium text-sm">Status</th>
                <th className="text-left p-4 font-medium text-sm">
                  <div className="flex items-center gap-1">
                    Supplier <ChevronDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-sm">Last Updated</th>
                <th className="text-left p-4 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium text-[#1a4d2e]">{item.name}</td>
                  <td className="p-4 text-sm text-gray-600 capitalize">{item.category}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center border rounded hover:bg-gray-100"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-medium w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center border rounded hover:bg-gray-100"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{item.min_stock}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{item.supplier}</td>
                  <td className="p-4 text-sm text-gray-400">{item.last_updated}</td>
                  <td className="p-4 text-sm space-x-2">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="text-[#1a4d3a] hover:text-[#2a5d4a] font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredItems.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">Showing {filteredItems.length} items</p>
        </div>
      )}
    </div>
  )
}
