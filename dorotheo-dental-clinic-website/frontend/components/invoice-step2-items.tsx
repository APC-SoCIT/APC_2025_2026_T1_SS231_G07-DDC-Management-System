"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Minus, Edit2, Trash2, Package } from "lucide-react"
import { getInventory } from "@/lib/api"
import { InvoiceItem, InventoryItem, InvoiceTotals } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface InvoiceStep2ItemsProps {
  items: InvoiceItem[]
  onItemsChange: (items: InvoiceItem[]) => void
  totals: InvoiceTotals
  onBack: () => void
  onNext: () => void
}

export function InvoiceStep2Items({
  items,
  onItemsChange,
  totals,
  onBack,
  onNext,
}: InvoiceStep2ItemsProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  
  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  
  // Selected item for dialogs
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null)
  const [selectedInvoiceItem, setSelectedInvoiceItem] = useState<InvoiceItem | null>(null)
  const [selectedInvoiceItemIndex, setSelectedInvoiceItemIndex] = useState<number>(-1)
  
  // Dialog form state
  const [dialogQuantity, setDialogQuantity] = useState(1)
  const [dialogUnitPrice, setDialogUnitPrice] = useState("0")

  // Fetch inventory
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) return
        
        const data = await getInventory(token)
        setInventoryItems(data)
        setFilteredItems(data)
      } catch (error) {
        console.error("Failed to fetch inventory:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchInventory()
  }, [])

  // Search and filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(inventoryItems)
      return
    }
    
    const query = searchQuery.toLowerCase()
    const filtered = inventoryItems.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    )
    setFilteredItems(filtered)
  }, [searchQuery, inventoryItems])

  // Add item handlers
  const handleAddClick = (inventoryItem: InventoryItem) => {
    setSelectedInventoryItem(inventoryItem)
    setDialogQuantity(1)
    setDialogUnitPrice(inventoryItem.unit_price || "0")
    setShowAddDialog(true)
  }

  const handleConfirmAdd = () => {
    if (!selectedInventoryItem) return
    
    const unitPrice = parseFloat(dialogUnitPrice)
    if (isNaN(unitPrice) || unitPrice <= 0) {
      alert("Please enter a valid price")
      return
    }
    
    if (dialogQuantity > selectedInventoryItem.quantity) {
      alert(`Cannot add more than available stock (${selectedInventoryItem.quantity} units)`)
      return
    }

    const newItem: InvoiceItem = {
      inventory_item_id: selectedInventoryItem.id,
      item_name: selectedInventoryItem.name,
      description: selectedInventoryItem.description || "",
      quantity: dialogQuantity,
      unit_price: unitPrice,
      total_price: dialogQuantity * unitPrice,
    }

    onItemsChange([...items, newItem])
    setShowAddDialog(false)
  }

  // Edit item handlers
  const handleEditClick = (item: InvoiceItem, index: number) => {
    setSelectedInvoiceItem(item)
    setSelectedInvoiceItemIndex(index)
    setDialogQuantity(item.quantity)
    setDialogUnitPrice(item.unit_price?.toString() || "0")
    setShowEditDialog(true)
  }

  const handleConfirmEdit = () => {
    if (selectedInvoiceItemIndex === -1) return
    
    const unitPrice = parseFloat(dialogUnitPrice)
    if (isNaN(unitPrice) || unitPrice <= 0) {
      alert("Please enter a valid price")
      return
    }

    const updatedItems = [...items]
    updatedItems[selectedInvoiceItemIndex] = {
      ...updatedItems[selectedInvoiceItemIndex],
      quantity: dialogQuantity,
      unit_price: unitPrice,
      total_price: dialogQuantity * unitPrice,
    }

    onItemsChange(updatedItems)
    setShowEditDialog(false)
  }

  // Remove item handlers
  const handleRemoveClick = (item: InvoiceItem, index: number) => {
    setSelectedInvoiceItem(item)
    setSelectedInvoiceItemIndex(index)
    setShowRemoveDialog(true)
  }

  const handleConfirmRemove = () => {
    if (selectedInvoiceItemIndex === -1) return
    
    const updatedItems = items.filter((_, index) => index !== selectedInvoiceItemIndex)
    onItemsChange(updatedItems)
    setShowRemoveDialog(false)
  }

  // Quantity controls for selected items
  const updateItemQuantity = (index: number, delta: number) => {
    const updatedItems = [...items]
    const newQuantity = updatedItems[index].quantity + delta
    
    if (newQuantity < 1) return
    
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQuantity,
      total_price: newQuantity * updatedItems[index].unit_price,
    }
    
    onItemsChange(updatedItems)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Add Treatment Items</h2>
        <p className="text-sm text-muted-foreground">
          Select inventory items used during the treatment
        </p>
      </div>

      {/* Current Total */}
      <Card className="bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Current Invoice Total:</span>
            <span className="text-2xl font-bold">₱{totals.total_due.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Available Items */}
      <Card>
        <CardHeader>
          <CardTitle>Available Inventory Items</CardTitle>
          <CardDescription>Search and select items to add to the invoice</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search items by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Items List */}
          <ScrollArea className="h-[300px] pr-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading inventory...</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No items found</div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{item.name}</h4>
                            <Badge variant="outline">{item.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Stock: {item.quantity} {item.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold">₱{parseFloat(item.unit_price).toFixed(2)}</span>
                          <Button
                            size="sm"
                            onClick={() => handleAddClick(item)}
                            disabled={item.quantity === 0}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Selected Items */}
      <Card>
        <CardHeader>
          <CardTitle>Selected Items ({items.length})</CardTitle>
          <CardDescription>
            {items.length === 0 ? "No items selected yet" : "Review and adjust quantities"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No items added to invoice</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{item.item_name}</h4>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(item, index)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveClick(item, index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">Qty:</span>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateItemQuantity(index, -1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-12 text-center font-semibold">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateItemQuantity(index, 1)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            × ₱{item.unit_price.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Total</div>
                          <div className="text-lg font-bold">₱{item.total_price.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Items Subtotal:</span>
                  <span className="text-xl font-bold">₱{totals.items_subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onNext}>
            Skip Items
          </Button>
          <Button onClick={onNext}>
            Continue to Review →
          </Button>
        </div>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item to Invoice</DialogTitle>
            <DialogDescription>Configure quantity and price</DialogDescription>
          </DialogHeader>
          
          {selectedInventoryItem && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Item</Label>
                <p className="font-semibold">{selectedInventoryItem.name}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add-quantity">Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setDialogQuantity(Math.max(1, dialogQuantity - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    id="add-quantity"
                    type="number"
                    min="1"
                    max={selectedInventoryItem.quantity}
                    value={dialogQuantity}
                    onChange={(e) => setDialogQuantity(parseInt(e.target.value) || 1)}
                    className="text-center"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setDialogQuantity(Math.min(selectedInventoryItem.quantity, dialogQuantity + 1))}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Available: {selectedInventoryItem.quantity} {selectedInventoryItem.unit}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-price">Unit Price</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xl">₱</span>
                  <Input
                    id="add-price"
                    type="number"
                    step="0.01"
                    value={dialogUnitPrice}
                    onChange={(e) => setDialogUnitPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total:</span>
                  <span className="text-2xl font-bold">
                    ₱{(dialogQuantity * parseFloat(dialogUnitPrice || "0")).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAdd}>
              Confirm Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Adjust quantity and price</DialogDescription>
          </DialogHeader>
          
          {selectedInvoiceItem && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Item</Label>
                <p className="font-semibold">{selectedInvoiceItem.item_name}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setDialogQuantity(Math.max(1, dialogQuantity - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    id="edit-quantity"
                    type="number"
                    min="1"
                    value={dialogQuantity}
                    onChange={(e) => setDialogQuantity(parseInt(e.target.value) || 1)}
                    className="text-center"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setDialogQuantity(dialogQuantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-price">Unit Price</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xl">₱</span>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    value={dialogUnitPrice}
                    onChange={(e) => setDialogUnitPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total:</span>
                  <span className="text-2xl font-bold">
                    ₱{(dialogQuantity * parseFloat(dialogUnitPrice || "0")).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Item Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Item from Invoice?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{selectedInvoiceItem?.item_name}" from this invoice?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
