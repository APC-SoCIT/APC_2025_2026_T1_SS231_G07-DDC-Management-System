"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog"
import { InvoiceStep1Service } from "./invoice-step1-service"
import { InvoiceStep2Items } from "./invoice-step2-items"
import { InvoiceStep3Review } from "./invoice-step3-review"
import { InvoiceSuccessModal } from "./invoice-success-modal"
import {
Dialog as ConfirmDialog,
  DialogContent as ConfirmDialogContent,
  DialogDescription as ConfirmDialogDescription,
  DialogFooter,
  DialogHeader as ConfirmDialogHeader,
  DialogTitle as ConfirmDialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2, FileText, ClipboardList, Package, Eye } from "lucide-react"
import { createInvoice } from "@/lib/api"
import { InvoiceData, InvoiceItem, InvoiceTotals } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CreateInvoiceModalProps {
  appointment: any
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateInvoiceModal({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}: CreateInvoiceModalProps) {
  const [step, setStep] = useState(1)
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    appointment_id: appointment?.id || 0,
    service_charge: parseFloat(appointment?.service?.price || appointment?.service_price || "0"),
    items: [],
    due_days: 7,
    notes: "",
    send_email: true,
  })

  // Modal states
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Success data
  const [createdInvoice, setCreatedInvoice] = useState<any>(null)
  const [emailSent, setEmailSent] = useState(false)

  // Check if invoice already exists when modal opens
  const appointmentHasInvoice = (appointment as any)?.has_invoice === true

  // Calculate totals
  const calculateTotals = (): InvoiceTotals => {
    const items_subtotal = invoiceData.items.reduce(
      (sum, item) => sum + item.total_price,
      0
    )
    const subtotal = invoiceData.service_charge + items_subtotal
    
    // Interest calculation (10% per annum, prorated for due_days)
    const interest_rate = 0.10
    const interest_amount = (subtotal * interest_rate * invoiceData.due_days) / 365
    
    const total_due = subtotal + interest_amount

    return {
      service_charge: invoiceData.service_charge,
      items_subtotal,
      subtotal,
      interest_amount,
      total_due,
    }
  }

  // Step navigation
  const goToStep = (newStep: number) => {
    setStep(newStep)
    setError("")
  }

  // Handle invoice submission
  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError("")

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Authentication required")
      }

      console.log('Creating invoice with data:', invoiceData)
      const response = await createInvoice(invoiceData, token)
      console.log('Invoice created successfully:', response)
      
      setCreatedInvoice(response.invoice)
      setEmailSent(response.email_sent || false)
      setShowConfirmation(false)
      setShowSuccess(true)

      // Auto-close and refresh after 10 seconds
      setTimeout(() => {
        handleClose()
        onSuccess()
      }, 10000)

    } catch (err: any) {
      console.error("Failed to create invoice:", err)
      setError(err.message || "Failed to create invoice. Please try again.")
      setShowConfirmation(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle modal close
  const handleClose = () => {
    setShowSuccess(false)
    setShowConfirmation(false)
    setStep(1)
    setError("")
    setEmailSent(false)
    setCreatedInvoice(null)
    setInvoiceData({
      appointment_id: appointment?.id || 0,
      service_charge: parseFloat(appointment?.service?.price || appointment?.service_price || "0"),
      items: [],
      due_days: 7,
      notes: "",
      send_email: true,
    })
    onClose()
  }

  const totals = calculateTotals()

  return (
    <>
      {/* Main Modal */}
      <Dialog open={isOpen && !showSuccess} onOpenChange={handleClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
          {/* Green Header */}
          <DialogHeader className="bg-[var(--color-primary)] text-white -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
            <DialogTitle className="flex items-center gap-2 text-2xl font-display text-white">
              <FileText className="w-6 h-6" />
              Create Invoice
            </DialogTitle>
            <DialogDescription className="text-white/80">
              {step === 1 && "Review the appointment information and service charge"}
              {step === 2 && "Add additional items to the invoice"}
              {step === 3 && "Review and confirm invoice details"}
            </DialogDescription>
          </DialogHeader>
          
          {/* Check if invoice already exists */}
          {appointmentHasInvoice ? (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  An invoice has already been created for this appointment. 
                  Please refresh the page or close this modal.
                </AlertDescription>
              </Alert>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleClose}>Close</Button>
              </div>
            </div>
          ) : (
            <>
              {/* Progress Indicator */}
              <div className="flex items-center justify-center mt-6 pb-6 border-b">
                <div className="flex items-center gap-4">
                  {/* Step 1 */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full font-semibold transition-colors ${
                      step >= 1 ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-medium ${step >= 1 ? 'text-[var(--color-primary)]' : 'text-gray-400'}`}>
                      Service Details
                    </span>
                  </div>
                  
                  <div className="w-16 h-1 bg-gray-200">
                    <div 
                      className={`h-full transition-all duration-300 ${step >= 2 ? 'bg-[var(--color-primary)] w-full' : 'w-0'}`} 
                    />
                  </div>

                  {/* Step 2 */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full font-semibold transition-colors ${
                      step >= 2 ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      <Package className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-medium ${step >= 2 ? 'text-[var(--color-primary)]' : 'text-gray-400'}`}>
                      Add Items
                    </span>
                  </div>
                  
                  <div className="w-16 h-1 bg-gray-200">
                    <div 
                      className={`h-full transition-all duration-300 ${step >= 3 ? 'bg-[var(--color-primary)] w-full' : 'w-0'}`} 
                    />
                  </div>

                  {/* Step 3 */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full font-semibold transition-colors ${
                      step >= 3 ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      <Eye className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-medium ${step >= 3 ? 'text-[var(--color-primary)]' : 'text-gray-400'}`}>
                      Review
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Step Content */}
              {step === 1 && (
                <InvoiceStep1Service
                  appointment={appointment}
                  serviceCharge={invoiceData.service_charge}
                  onServiceChargeChange={(charge) =>
                    setInvoiceData({ ...invoiceData, service_charge: charge })
                  }
                  onNext={() => goToStep(2)}
                  onCancel={handleClose}
                />
              )}

              {step === 2 && (
                <InvoiceStep2Items
                  appointment={appointment}
                  items={invoiceData.items}
                  onItemsChange={(items) =>
                    setInvoiceData({ ...invoiceData, items })
                  }
                  totals={totals}
                  onBack={() => goToStep(1)}
                  onNext={() => goToStep(3)}
                />
              )}

              {step === 3 && (
                <InvoiceStep3Review
                  appointment={appointment}
                  invoiceData={invoiceData}
                  totals={totals}
                  onBack={() => goToStep(2)}
                  onConfirm={() => setShowConfirmation(true)}
                  onNotesChange={(notes) =>
                    setInvoiceData({ ...invoiceData, notes })
                  }
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <ConfirmDialogContent className="bg-white dark:bg-gray-900">
          <ConfirmDialogHeader className="bg-[var(--color-primary)] text-white -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
            <ConfirmDialogTitle className="flex items-center gap-2 text-xl text-white">
              <AlertCircle className="w-5 h-5" />
              Confirm Invoice Creation?
            </ConfirmDialogTitle>
            <ConfirmDialogDescription className="text-white/80">
              This action will create and send the invoice. Please review the details below.
            </ConfirmDialogDescription>
          </ConfirmDialogHeader>

          <div className="space-y-3 py-4 mt-4">
            <div className="space-y-2 text-sm">
              <p className="font-medium">This action will:</p>
              <ul className="space-y-1 ml-4">
                <li>✓ Create invoice for appointment #{appointment?.id}</li>
                <li>✓ Update patient balance (+₱{totals.total_due.toFixed(2)})</li>
                <li>✓ Send email to patient ({appointment?.patient?.email || appointment?.patient_email})</li>
                <li>✓ Send email to clinic staff</li>
                <li>✓ Mark appointment as invoiced</li>
              </ul>
            </div>

            <div className="p-4 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Amount:</span>
                <span className="text-2xl font-bold text-[var(--color-primary)]">
                  ₱{totals.total_due.toFixed(2)}
                </span>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This action cannot be undone. The invoice will be recorded in the system.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="min-w-[150px] bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Yes, Create Invoice"
              )}
            </Button>
          </DialogFooter>
        </ConfirmDialogContent>
      </ConfirmDialog>

      {/* Success Modal */}
      <InvoiceSuccessModal
        isOpen={showSuccess}
        onClose={handleClose}
        invoiceNumber={createdInvoice?.invoice_number}
        totalAmount={createdInvoice?.total_due ? parseFloat(createdInvoice.total_due) : totals.total_due}
        patientEmail={appointment?.patient?.email || appointment?.patient_email}
        emailSent={emailSent}
        newBalance={createdInvoice?.balance ? parseFloat(createdInvoice.balance) : totals.total_due}
      />
    </>
  )
}
