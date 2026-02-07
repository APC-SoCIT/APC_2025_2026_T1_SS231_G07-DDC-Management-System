"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { InvoiceData, InvoiceTotals } from "@/lib/types"

interface InvoiceStep3ReviewProps {
  appointment: any
  invoiceData: InvoiceData
  totals: InvoiceTotals
  onBack: () => void
  onConfirm: () => void
  onNotesChange: (notes: string) => void
}

export function InvoiceStep3Review({
  appointment,
  invoiceData,
  totals,
  onBack,
  onConfirm,
  onNotesChange,
}: InvoiceStep3ReviewProps) {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + invoiceData.due_days)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Review Invoice Before Sending</h2>
        <p className="text-sm text-muted-foreground">
          Please verify all details before creating the invoice
        </p>
      </div>

      {/* Patient & Appointment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Preview</CardTitle>
          <CardDescription>Patient and appointment information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Patient</Label>
              <p className="font-semibold">
                {appointment.patient_name || `${appointment.patient?.first_name} ${appointment.patient?.last_name}`}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-semibold">
                {appointment.patient?.email || appointment.patient_email}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Appointment Date</Label>
              <p className="font-semibold">
                {new Date(appointment.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Service</Label>
              <p className="font-semibold">
                {appointment.service_name || appointment.service?.name}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Assigned Dentist</Label>
              <p className="font-semibold">
                Dr. {appointment.dentist_name || `${appointment.dentist?.first_name} ${appointment.dentist?.last_name}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items & Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
          <CardDescription>Services and inventory items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Service */}
            <div className="flex justify-between items-center py-2">
              <div>
                <p className="font-medium">{appointment.service_name || appointment.service?.name}</p>
                <p className="text-sm text-muted-foreground">Service Charge</p>
              </div>
              <p className="font-semibold">₱{invoiceData.service_charge.toFixed(2)}</p>
            </div>

            {/* Items */}
            {invoiceData.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2">
                <div>
                  <p className="font-medium">{item.item_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} × ₱{item.unit_price.toFixed(2)}
                  </p>
                </div>
                <p className="font-semibold">₱{item.total_price.toFixed(2)}</p>
              </div>
            ))}

            {invoiceData.items.length === 0 && (
              <p className="text-sm text-muted-foreground italic py-2">No items added</p>
            )}

            <Separator className="my-4" />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span>₱{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-sm">
                <span>Interest (10% p.a. for {invoiceData.due_days} days):</span>
                <span>₱{totals.interest_amount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xl font-bold">
                <span>Total Due:</span>
                <span className="text-primary">₱{totals.total_due.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>Due date and payment instructions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Invoice Date</Label>
              <p className="font-semibold">
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Due Date</Label>
              <p className="font-semibold">
                {dueDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} ({invoiceData.due_days} days from now)
              </p>
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground">Payment Instructions</Label>
            <p className="text-sm mt-1">
              Please pay within {invoiceData.due_days} days to Bank Account: <strong>12345678910</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Interest of 10% per annum will be charged on late payments
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
          <CardDescription>Optional notes for this invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter any additional notes or special instructions..."
            value={invoiceData.notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Email Options */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Choose who receives the invoice</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="send-patient" checked={invoiceData.send_email} disabled />
            <label
              htmlFor="send-patient"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Send invoice email to patient
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="send-staff" checked={invoiceData.send_email} disabled />
            <label
              htmlFor="send-staff"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Send invoice copy to clinic staff
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Both patient and staff will receive the invoice via email with PDF attachment
          </p>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          ← Back to Edit
        </Button>
        <Button onClick={onConfirm} size="lg" className="min-w-[200px]">
          Confirm & Send Invoice →
        </Button>
      </div>
    </div>
  )
}
