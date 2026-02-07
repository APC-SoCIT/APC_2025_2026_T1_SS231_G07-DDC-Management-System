"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface InvoiceStep1ServiceProps {
  appointment: any
  serviceCharge: number
  onServiceChargeChange: (charge: number) => void
  onNext: () => void
  onCancel: () => void
}

export function InvoiceStep1Service({
  appointment,
  serviceCharge,
  onServiceChargeChange,
  onNext,
  onCancel,
}: InvoiceStep1ServiceProps) {
  const [charge, setCharge] = useState(serviceCharge.toString())
  const [error, setError] = useState("")

  const handleChargeChange = (value: string) => {
    setCharge(value)
    setError("")
  }

  const handleNext = () => {
    const chargeNum = parseFloat(charge)
    
    // Validation
    if (isNaN(chargeNum) || chargeNum <= 0) {
      setError("Service charge must be greater than 0")
      return
    }
    
    if (chargeNum > 100000) {
      setError("Service charge cannot exceed ₱100,000")
      return
    }

    onServiceChargeChange(chargeNum)
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Create Invoice - Service Details</h2>
        <p className="text-sm text-muted-foreground">
          Review the appointment information and service charge
        </p>
      </div>

      {/* Appointment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Information</CardTitle>
          <CardDescription>Read-only appointment details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Patient Name</Label>
              <p className="font-medium">
                {appointment.patient_name || `${appointment.patient?.first_name} ${appointment.patient?.last_name}`}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Appointment Date</Label>
              <p className="font-medium">
                {new Date(appointment.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Time</Label>
              <p className="font-medium">{appointment.time_slot}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Service</Label>
              <p className="font-medium">{appointment.service_name || appointment.service?.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Dentist</Label>
              <p className="font-medium">
                Dr. {appointment.dentist_name || `${appointment.dentist?.first_name} ${appointment.dentist?.last_name}`}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Clinic Location</Label>
              <p className="font-medium">{appointment.clinic_name || appointment.clinic?.name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Charge */}
      <Card>
        <CardHeader>
          <CardTitle>Service Charge</CardTitle>
          <CardDescription>Review and adjust the service amount if needed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service-charge">
              Service: {appointment.service_name || appointment.service?.name}
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">₱</span>
              <Input
                id="service-charge"
                type="number"
                min="0"
                max="100000"
                step="0.01"
                value={charge}
                onChange={(e) => handleChargeChange(e.target.value)}
                className="text-xl font-semibold"
                placeholder="0.00"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Currency: Philippine Peso (PHP)
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleNext}>
          Next: Add Items
        </Button>
      </div>
    </div>
  )
}
