"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Mail, DollarSign, FileText, Eye, AlertTriangle } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"

interface InvoiceSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceNumber?: string
  totalAmount?: number
  patientEmail?: string
  staffEmail?: string
  newBalance?: number
  emailSent?: boolean
}

export function InvoiceSuccessModal({
  isOpen,
  onClose,
  invoiceNumber,
  totalAmount,
  patientEmail,
  staffEmail,
  newBalance,
  emailSent = false,
}: InvoiceSuccessModalProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  // Determine billing page based on current role
  const getBillingPath = () => {
    if (pathname?.includes('/owner/')) return '/owner/billing'
    if (pathname?.includes('/staff/')) return '/staff/billing'
    return '/patient/billing'
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="sr-only">
          Invoice Created Successfully
        </DialogTitle>
        
        <div className="flex flex-col items-center text-center space-y-6 py-6">
          {/* Success Icon */}
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              Invoice Created Successfully!
            </h2>
            <p className="text-muted-foreground">
              The invoice has been generated and sent to the patient
            </p>
          </div>

          {/* Invoice Details */}
          <div className="w-full space-y-4">
            {invoiceNumber && (
              <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">Invoice Number</p>
                    <p className="font-bold">{invoiceNumber}</p>
                  </div>
                </div>
              </div>
            )}

            {totalAmount !== undefined && (
              <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-bold text-lg">₱{totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Email Status */}
            {emailSent ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="text-left flex-1">
                    <p className="font-semibold text-green-900 mb-2">
                      ✓ Emails sent successfully
                    </p>
                    <ul className="space-y-1 text-sm text-green-700">
                      {patientEmail && (
                        <li>• Patient: {patientEmail}</li>
                      )}
                      {staffEmail && (
                        <li>• Staff: {staffEmail}</li>
                      )}
                      {!patientEmail && !staffEmail && (
                        <li>• Sent to patient and clinic staff</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="text-left flex-1">
                    <p className="font-semibold text-amber-900 mb-1">
                      Email Not Sent
                    </p>
                    <p className="text-sm text-amber-700">
                      The invoice was created successfully, but email notification failed. 
                      The patient can view the invoice in their billing page.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Patient Balance Update */}
            {newBalance !== undefined && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-left flex-1">
                    <p className="font-semibold text-blue-900 mb-1">
                      ✓ Patient balance updated
                    </p>
                    <p className="text-sm text-blue-700">
                      New Balance: <span className="font-bold">₱{newBalance.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            <Button 
              onClick={() => {
                onClose()
                router.push(getBillingPath())
              }} 
              className="flex-1 gap-2"
            >
              <Eye className="w-4 h-4" />
              View Invoices
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {emailSent 
              ? "Invoice details have been sent via email (PDF generation may not be available on Windows)" 
              : "You can view and download the invoice from the billing page"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
