"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Minus, Edit2, Trash2, Package, X } from "lucide-react"
import { getInventory } from "@/lib/api"
import { InvoiceItem, InventoryItem, InvoiceTotals } from "@/lib/types"

interface InvoiceStep2ItemsProps {
  appointment: any
  items: InvoiceItem[]
  onItemsChange: (items: InvoiceItem[]) => void
  totals: InvoiceTotals
  onBack: () => void
  onNext: () => void
}

// Panel mode: null = normal list view, "add" = confirm add, "edit" = edit item, "remove" = confirm remove
type PanelMode = null | "add" | "edit" | "remove"

export function InvoiceStep2Items({
  appointment,
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

  // Inline panel state (replaces nested Dialogs)
  const [panelMode, setPanelMode] = useState<PanelMode>(null)
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null)
  const [selectedInvoiceItem, setSelectedInvoiceItem] = useState<InvoiceItem | null>(null)
  const [selectedInvoiceItemIndex, setSelectedInvoiceItemIndex] = useState<number>(-1)
  const [dialogQuantity, setDialogQuantity] = useState(1)

  const closePanel = () => {
    setPanelMode(null)
    setSelectedInventoryItem(null)
    setSelectedInvoiceItem(null)
    setSelectedInvoiceItemIndex(-1)
    setDialogQuantity(1)
  }

  // Fetch inventory
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) return
        
        // Get clinic ID from appointment
        const clinicId = appointment?.clinic?.id || appointment?.clinic
        
        // Fetch inventory filtered by clinic
        const data = await getInventory(token, clinicId)
        setInventoryItems(data)
        setFilteredItems(data)
      } catch (error) {
        console.error("Failed to fetch inventory:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchInventory()
  }, [appointment])

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
    setPanelMode("add")
  }

  const handleConfirmAdd = () => {
    if (!selectedInventoryItem) return
    
    const unitPrice = parseFloat(selectedInventoryItem.unit_cost || "0")
    if (isNaN(unitPrice) || unitPrice <= 0) {
      alert("This inventory item has no valid price set")
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

    closePanel()
    onItemsChange([...items, newItem])
  }

  // Edit item handlers
  const handleEditClick = (item: InvoiceItem, index: number) => {
    setSelectedInvoiceItem(item)
    setSelectedInvoiceItemIndex(index)
    setDialogQuantity(item.quantity)
    setPanelMode("edit")
  }

  const handleConfirmEdit = () => {
    if (selectedInvoiceItemIndex === -1 || !selectedInvoiceItem) return

    const inventoryItem = inventoryItems.find(inv => inv.id === selectedInvoiceItem.inventory_item_id)
    if (inventoryItem && dialogQuantity > inventoryItem.quantity) {
      alert(`Cannot exceed available stock (${inventoryItem.quantity} units)`)
      return
    }

    const updatedItems = [...items]
    updatedItems[selectedInvoiceItemIndex] = {
      ...updatedItems[selectedInvoiceItemIndex],
      quantity: dialogQuantity,
      total_price: dialogQuantity * selectedInvoiceItem.unit_price,
    }

    closePanel()
    onItemsChange(updatedItems)
  }

  // Remove item handlers
  const handleRemoveClick = (item: InvoiceItem, index: number) => {
    setSelectedInvoiceItem(item)
    setSelectedInvoiceItemIndex(index)
    setPanelMode("remove")
  }

  const handleConfirmRemove = () => {
    if (selectedInvoiceItemIndex === -1) return
    const updatedItems = items.filter((_, index) => index !== selectedInvoiceItemIndex)
    closePanel()
    onItemsChange(updatedItems)
  }

  // Quantity controls for selected items
  const updateItemQuantity = (index: number, delta: number) => {
    const updatedItems = [...items]
    const currentItem = updatedItems[index]
    const newQuantity = currentItem.quantity + delta
    
    if (newQuantity < 1) return
    
    // Check if increasing quantity - validate against stock
    if (delta > 0) {
      const inventoryItem = inventoryItems.find(inv => inv.id === currentItem.inventory_item_id)
      if (inventoryItem && newQuantity > inventoryItem.quantity) {
        alert(`Cannot exceed available stock (${inventoryItem.quantity} units)`)
        return
      }
    }
    
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQuantity,
      total_price: newQuantity * updatedItems[index].unit_price,
    }
    
    onItemsChange(updatedItems)
  }

  return (
    <div className="space-y-6">
      {/* Current Total */}
      <Card className="bg-[var(--color-primary)]/10">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Current Invoice Total:</span>
            <span className="text-2xl font-bold">₱{totals.total_due.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Available Inventory Items — or inline Add confirmation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {panelMode === "add" ? "Add Item to Invoice" : "Available Inventory Items"}
              </CardTitle>
              <CardDescription>
                {panelMode === "add"
                  ? "Configure quantity and confirm"
                  : "Search and select items to add to the invoice"}
              </CardDescription>
            </div>
            {panelMode === "add" && (
              <Button size="icon" variant="ghost" onClick={closePanel}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {panelMode === "add" && selectedInventoryItem ? (
            /* ── Inline Add Panel ── */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-semibold">{selectedInventoryItem.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedInventoryItem.category}</p>
                </div>
                <Badge variant="outline">Stock: {selectedInventoryItem.quantity} units</Badge>
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setDialogQuantity(Math.max(1, dialogQuantity - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    max={selectedInventoryItem.quantity}
                    value={dialogQuantity}
                    onChange={(e) => setDialogQuantity(Math.min(selectedInventoryItem.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="text-center w-24"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setDialogQuantity(Math.min(selectedInventoryItem.quantity, dialogQuantity + 1))}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground ml-2">
                    × ₱{parseFloat(selectedInventoryItem.unit_cost || "0").toFixed(2)} per unit
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                <span className="font-medium">Total:</span>
                <span className="text-xl font-bold">
                  ₱{(dialogQuantity * parseFloat(selectedInventoryItem.unit_cost || "0")).toFixed(2)}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={closePanel}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white" onClick={handleConfirmAdd}>
                  Confirm Add
                </Button>
              </div>
            </div>
          ) : (
            /* ── Inventory List ── */
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search items by name or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

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
                                Stock: {item.quantity} units
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold">₱{parseFloat(item.unit_cost).toFixed(2)}</span>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Selected Items — or inline Edit/Remove panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {panelMode === "edit"
                  ? "Edit Item"
                  : panelMode === "remove"
                  ? "Remove Item?"
                  : `Selected Items (${items.length})`}
              </CardTitle>
              <CardDescription>
                {panelMode === "edit"
                  ? "Adjust quantity"
                  : panelMode === "remove"
                  ? `Remove "${selectedInvoiceItem?.item_name}" from this invoice?`
                  : items.length === 0
                  ? "No items selected yet"
                  : "Review and adjust quantities"}
              </CardDescription>
            </div>
            {(panelMode === "edit" || panelMode === "remove") && (
              <Button size="icon" variant="ghost" onClick={closePanel}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {panelMode === "edit" && selectedInvoiceItem ? (
            /* ── Inline Edit Panel ── */
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-semibold">{selectedInvoiceItem.item_name}</p>
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setDialogQuantity(Math.max(1, dialogQuantity - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    max={inventoryItems.find(inv => inv.id === selectedInvoiceItem.inventory_item_id)?.quantity}
                    value={dialogQuantity}
                    onChange={(e) => {
                      const inv = inventoryItems.find(i => i.id === selectedInvoiceItem.inventory_item_id)
                      const val = Math.max(1, parseInt(e.target.value) || 1)
                      setDialogQuantity(inv ? Math.min(val, inv.quantity) : val)
                    }}
                    className="text-center w-24"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      const inv = inventoryItems.find(i => i.id === selectedInvoiceItem.inventory_item_id)
                      setDialogQuantity(inv ? Math.min(inv.quantity, dialogQuantity + 1) : dialogQuantity + 1)
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground ml-2">
                    × ₱{selectedInvoiceItem.unit_price.toFixed(2)} per unit
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Available: {inventoryItems.find(inv => inv.id === selectedInvoiceItem.inventory_item_id)?.quantity ?? 0} units
                </p>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                <span className="font-medium">Total:</span>
                <span className="text-xl font-bold">
                  ₱{(dialogQuantity * selectedInvoiceItem.unit_price).toFixed(2)}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={closePanel}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white" onClick={handleConfirmEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          ) : panelMode === "remove" ? (
            /* ── Inline Remove Panel ── */
            <div className="space-y-4">
              <div className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  This will remove <span className="font-semibold text-foreground">{selectedInvoiceItem?.item_name}</span> from the invoice.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={closePanel}>
                  Cancel
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleConfirmRemove}>
                  Remove
                </Button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No items added to invoice</p>
            </div>
          ) : (
            /* ── Items List ── */
            <div className="space-y-3">
              {items.map((item, index) => (
                <Card key={`item-${item.inventory_item_id}-${index}`} className="bg-white">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{item.item_name}</h4>
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
          <Button onClick={onNext} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white">
            Continue to Review →
          </Button>
        </div>
      </div>
    </div>
  )
}
