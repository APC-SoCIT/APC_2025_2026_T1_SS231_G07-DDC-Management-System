"use client"

import { useState } from "react"
import { Search, ChevronDown, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const inventoryItems = [
  {
    id: 1,
    name: "Articaine",
    category: "Anesthetics",
    quantity: 45,
    minStock: 50,
    status: "In Stock",
    supplier: "MedSupply",
    lastUpdated: "2024-05-13",
  },
  {
    id: 2,
    name: "Dental cement",
    category: "Restorative Materials",
    quantity: 20,
    minStock: 50,
    status: "Low Stock",
    supplier: "SmileTech",
    lastUpdated: "2024-05-14",
  },
  {
    id: 3,
    name: "Amalgam",
    category: "Restorative Materials",
    quantity: 40,
    minStock: 50,
    status: "In Stock",
    supplier: "DentCorp",
    lastUpdated: "2024-05-15",
  },
  {
    id: 4,
    name: "Glove",
    category: "PPE",
    quantity: 39,
    minStock: 50,
    status: "In Stock",
    supplier: "SafeGuard",
    lastUpdated: "2024-05-11",
  },
  {
    id: 5,
    name: "Mask",
    category: "PPE",
    quantity: 9,
    minStock: 50,
    status: "Critical",
    supplier: "SafeGuard",
    lastUpdated: "2024-05-12",
  },
  {
    id: 6,
    name: "X-ray markers",
    category: "Imaging",
    quantity: 21,
    minStock: 50,
    status: "Low Stock",
    supplier: "ImagePro",
    lastUpdated: "2024-05-10",
  },
  {
    id: 7,
    name: "X-ray films",
    category: "Imaging",
    quantity: 23,
    minStock: 50,
    status: "Low Stock",
    supplier: "ImagePro",
    lastUpdated: "2024-05-10",
  },
  {
    id: 8,
    name: "Pad covers",
    category: "Imaging",
    quantity: 19,
    minStock: 50,
    status: "Low Stock",
    supplier: "ImagePro",
    lastUpdated: "2024-05-10",
  },
]

export default function InventoryContent() {
  const [items, setItems] = useState(inventoryItems)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)

  const updateQuantity = (id, delta) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const newQuantity = Math.max(0, item.quantity + delta)
          let newStatus = "In Stock"
          if (newQuantity < 10) newStatus = "Critical"
          else if (newQuantity < item.minStock) newStatus = "Low Stock"
          return { ...item, quantity: newQuantity, status: newStatus }
        }
        return item
      }),
    )
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
        <Select defaultValue="all">
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="anesthetics">Anesthetics</SelectItem>
            <SelectItem value="restorative">Restorative Materials</SelectItem>
            <SelectItem value="ppe">PPE</SelectItem>
            <SelectItem value="imaging">Imaging</SelectItem>
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
                  <Input id="itemName" placeholder="ex. Dental Floss" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anesthetics">Anesthetics</SelectItem>
                      <SelectItem value="restorative">Restorative Materials</SelectItem>
                      <SelectItem value="ppe">PPE</SelectItem>
                      <SelectItem value="imaging">Imaging</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" type="number" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select>
                    <SelectTrigger id="unit">
                      <SelectValue placeholder="Select Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="piece">Piece</SelectItem>
                      <SelectItem value="bottle">Bottle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStock">Min Stock Level</Label>
                  <Input id="minStock" type="number" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier/Brand</Label>
                  <Input id="supplier" placeholder="ex. Colgate" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost per Unit</Label>
                  <Input id="cost" type="number" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Dentist Notes</Label>
                <Textarea id="notes" placeholder="Additional details, storage requirements, etc." rows={4} />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setIsAddItemOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-[#a5d6a7] hover:bg-[#8bc98e] text-[#1a4d2e]">Upload</Button>
                <Button className="flex-1 bg-[#a5d6a7] hover:bg-[#8bc98e] text-[#1a4d2e]">Add Item</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg border overflow-x-auto">
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
              <th className="text-left p-4 font-medium text-sm"></th>
              <th className="text-left p-4 font-medium text-sm">
                <div className="flex items-center gap-1">
                  Supplier <ChevronDown className="w-4 h-4" />
                </div>
              </th>
              <th className="text-left p-4 font-medium text-sm">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-medium text-[#1a4d2e]">{item.name}</td>
                <td className="p-4 text-sm text-gray-600">{item.category}</td>
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
                <td className="p-4 text-sm text-gray-600">{item.minStock}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-600">{item.supplier}</td>
                <td className="p-4 text-sm text-gray-400">{item.lastUpdated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Showing 1 of 1 Items</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Previous
          </Button>
          <Button size="sm" className="bg-[#1a4d2e] text-white">
            1
          </Button>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
