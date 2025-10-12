"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default function BillingReceiptModal({ isOpen, onClose, billingData }) {
  if (!billingData) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <div className="space-y-6">
          {/* Clinic Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#1a4d2e] text-white px-4 py-2 rounded-lg">
                <div className="text-lg font-bold">Dorotheo</div>
                <div className="text-xs">DENTAL CLINIC</div>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Dorotheo Dental Clinic</h2>
                <p className="text-sm text-gray-600">RFC, Molino 2, City of Bacoor, 1402 Cavite</p>
              </div>
            </div>
            <Button className="bg-[#1a4d2e] hover:bg-[#143d24] text-white">Print</Button>
          </div>

          {/* Receipt Title */}
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Dental Clinic Receipt</h1>
          </div>

          {/* Receipt Details */}
          <div className="border-y py-3">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Receipt Number:</span>
                <div>{billingData.receiptNumber || "451356"}</div>
              </div>
              <div>
                <span className="font-medium">Date Issued:</span>
                <div>{billingData.dateIssued || "05/02/2025"}</div>
              </div>
              <div>
                <span className="font-medium">Payment Method:</span>
                <div>{billingData.paymentMethod || "Gcash"}</div>
              </div>
            </div>
          </div>

          {/* Customer Info and Notes */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">CUSTOMER</h3>
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium">Customer Name:</span> {billingData.customerName || "Michael Orenze"}
                </div>
                <div>
                  <span className="font-medium">Address:</span>{" "}
                  {billingData.address || "26 Nimbus St., Moonwalk vil., Talon Singko, Las Pinas City"}
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Notes</h3>
              <div className="border rounded p-2 h-20"></div>
            </div>
          </div>

          {/* Services Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-semibold">DESCRIPTION</th>
                  <th className="text-left p-3 font-semibold">UNIT PRICE</th>
                  <th className="text-left p-3 font-semibold">QUANTITY</th>
                  <th className="text-left p-3 font-semibold">FULL PRICE</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3">Root Canal</td>
                  <td className="p-3">PHP 10,000.00</td>
                  <td className="p-3">3</td>
                  <td className="p-3">PHP 30,000.00</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                </tr>
                <tr className="border-b">
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                </tr>
                <tr className="border-b">
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Notes</td>
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                  <td className="p-3 font-semibold">TOTAL</td>
                  <td className="p-3 font-semibold">PHP 30,000.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Thank You Message */}
          <div className="text-center text-lg font-medium text-gray-900">Thank you for the payment!</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
