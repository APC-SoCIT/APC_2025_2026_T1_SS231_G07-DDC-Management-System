# Payment System - Quick Start Guide

## ✅ What Was Just Implemented

### Backend (Complete)
- ✅ **Payment Model** - Records payments received from patients
- ✅ **PaymentSplit Model** - Allocates payments to specific invoices
- ✅ **API Endpoints** - Record payments, view history, void payments
- ✅ **Auto-Update Logic** - Invoice balances update automatically
- ✅ **Validation** - Payment split validation, overpayment prevention
- ✅ **Database Migrations** - Applied successfully

### Database Tables Created
```
✅ api_payment (Payments table)
✅ api_paymentsplit (Payment allocations table)
```

## 🚀 Testing the System

### Method 1: Django Admin (Easiest)
1. Start your backend server:
   ```bash
   cd dorotheo-dental-clinic-website/backend
   .\venv\Scripts\activate
   python manage.py runserver
   ```

2. Go to: http://localhost:8000/admin/
3. Login with your admin account
4. You'll see new sections:
   - **Payments** - Record and view payments
   - **Payment Splits** - See payment allocations

### Method 2: API Testing with Postman
1. **Get auth token:**
   ```http
   POST http://localhost:8000/api/login/
   Body: {"username": "staff_user", "password": "password"}
   ```

2. **Record a payment:**
   ```http
   POST http://localhost:8000/api/payments/record_payment/
   Headers: Authorization: Token YOUR_TOKEN
   Body:
   {
     "patient_id": 1,
     "amount": 1500.00,
     "payment_date": "2026-02-08",
     "payment_method": "cash",
     "notes": "Payment for dental cleaning",
     "allocations": [
       {
         "invoice_id": 1,
         "amount": 1500.00
       }
     ]
   }
   ```

3. **View payments:**
   ```http
   GET http://localhost:8000/api/payments/
   GET http://localhost:8000/api/payments/patient_payments/1/
   ```

### Method 3: Python Shell
```bash
python manage.py shell
```

```python
from api.models import User, Invoice, Payment, PaymentSplit, ClinicLocation
from datetime import date

# Find a patient with invoices
patient = User.objects.filter(user_type='patient').first()
invoices = Invoice.objects.filter(patient=patient, status='sent')
print(f"Patient: {patient.get_full_name()}")
print(f"Unpaid Invoices: {invoices.count()}")

# Get first unpaid invoice
invoice = invoices.first()
print(f"Invoice: {invoice.invoice_number}, Balance: ₱{invoice.balance}")

# Record a payment
payment = Payment.objects.create(
    payment_number=f"PAY-2026-02-{Payment.objects.count() + 1:04d}",
    patient=patient,
    clinic=ClinicLocation.objects.first(),
    amount=500.00,
    payment_date=date.today(),
    payment_method='cash',
    notes='Test payment via shell'
)

# Allocate to invoice
split = PaymentSplit.objects.create(
    payment=payment,
    invoice=invoice,
    amount=500.00
)

# Update invoice - THIS IS KEY!
invoice.update_payment_status()

# Check results
invoice.refresh_from_db()
print(f"\n✅ Payment Recorded!")
print(f"Payment #: {payment.payment_number}")
print(f"Invoice Balance Updated: ₱{invoice.balance}")
print(f"Invoice Status: {invoice.status}")
```

## 📋 Next Steps: Frontend Implementation

### What You Need to Build:

#### 1. **Payment Recording Modal** (For Staff)
Location: `frontend/components/record-payment-modal.tsx`

Features needed:
- Patient selector
- Payment amount input
- Payment date picker
- Payment method dropdown (cash, check, bank transfer, etc.)
- Optional fields: check number, bank name, reference number, notes
- **Invoice selector** with checkboxes - show:
  - Invoice number
  - Invoice date
  - Original amount
  - Current balance
  - Amount to pay (input field)
- Validation: Total allocation = Payment amount
- Submit button

#### 2. **Payment History View** (For Staff & Patients)
Location: `frontend/app/staff/payments/page.tsx`

Display:
- Payment table with columns:
  - Payment Number
  - Date
  - Patient Name (staff view only)
  - Amount
  - Payment Method
  - Status (Active/Voided)
  - Actions (View Details, Void)
- Filters:
  - Date range
  - Patient (staff only)
  - Payment method
  - Clinic
- Search by payment number or patient name

#### 3. **Payment Details Modal**
Features:
- Payment information
- List of invoices paid
- Payment splits breakdown
- Void button (if not already voided)

#### 4. **Enhanced Invoice View**
Add to existing invoice views:
- "Record Payment" button next to each unpaid invoice
- Payment history section showing:
  - Date payment received
  - Payment number
  - Amount paid
  - Remaining balance

#### 5. **Revenue Analytics Dashboard** (For Owner)
Location: `frontend/app/owner/analytics/page.tsx`

Charts needed:
- Total revenue by month (line chart)
- Revenue by clinic (bar chart)
- Revenue by payment method (pie chart)
- Revenue by provider/dentist (bar chart)
- Outstanding balances summary
- Recent payments table

## 🎯 Recommended Implementation Order

### Week 1: Payment Recording
1. ✅ Backend models (DONE)
2. ✅ Backend API (DONE)
3. ⏳ Payment recording modal UI
4. ⏳ Test payment recording flow

### Week 2: Payment History & Viewing
5. ⏳ Payment history table
6. ⏳ Payment details modal
7. ⏳ Add payment history to invoice views
8. ⏳ Test viewing payments

### Week 3: Analytics & Reports
9. ⏳ Revenue analytics dashboard
10. ⏳ Payment method breakdown
11. ⏳ Provider revenue tracking
12. ⏳ Export reports (optional)

## 🔑 Key Concepts for Frontend

### 1. Who Can Record Payments?
```typescript
// Only staff and owner can record payments
const canRecordPayment = user.user_type === 'staff' || user.user_type === 'owner'
```

### 2. Payment Allocation Logic
```typescript
// When recording payment:
const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.amount, 0)
if (totalAllocated > paymentAmount) {
  // Error: Can't allocate more than payment amount
}
if (totalAllocated < paymentAmount) {
  // Warning: There's unallocated money
}
```

### 3. Invoice Status Display
```typescript
const getInvoiceStatusBadge = (invoice) => {
  if (invoice.status === 'paid') return 'bg-green-100 text-green-700'
  if (invoice.balance < invoice.total_due && invoice.balance > 0) {
    return 'bg-yellow-100 text-yellow-700' // Partially paid
  }
  if (invoice.status === 'overdue') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-700' // Sent/unpaid
}
```

## 📚 TypeScript Types Needed

Create `frontend/lib/payment-types.ts`:

```typescript
export interface Payment {
  id: number
  payment_number: string
  patient: number
  patient_name: string
  patient_email: string
  clinic: number
  clinic_name: string
  amount: string
  payment_date: string
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'gcash' | 'paymaya' | 'other'
  payment_method_display: string
  check_number?: string
  bank_name?: string
  reference_number?: string
  notes?: string
  recorded_by: number
  recorded_by_name: string
  is_voided: boolean
  voided_at?: string
  voided_by?: number
  voided_by_name?: string
  void_reason?: string
  created_at: string
  updated_at: string
  splits: PaymentSplit[]
  allocated_amount: number
  unallocated_amount: number
}

export interface PaymentSplit {
  id: number
  payment: number
  invoice: number
  invoice_number: string
  invoice_balance: string
  amount: string
  provider?: number
  provider_name?: string
  is_voided: boolean
  created_at: string
}

export interface PaymentRecordData {
  patient_id: number
  clinic_id?: number
  amount: number
  payment_date: string
  payment_method: string
  check_number?: string
  bank_name?: string
  reference_number?: string
  notes?: string
  allocations: PaymentAllocation[]
}

export interface PaymentAllocation {
  invoice_id: number
  amount: number
  provider_id?: number
}
```

## 🧪 Testing Checklist

Before deploying:
- [ ] Staff can record a cash payment
- [ ] Payment allocates to correct invoice
- [ ] Invoice balance updates automatically
- [ ] Invoice status changes to "paid" when fully paid
- [ ] Patient balance updates correctly
- [ ] Payment appears in payment history
- [ ] Payment details show correct information
- [ ] Can void a payment (reverses everything)
- [ ] Cannot overpay an invoice
- [ ] Cannot allocate more than payment amount
- [ ] Partial payments work correctly
- [ ] Multiple invoice payment works
- [ ] Analytics show correct revenue data

## ❓ FAQs

### Q: Can patients record their own payments?
**A:** No. Only staff and owners can record payments to prevent fraud.

### Q: What if a patient pays online outside the system?
**A:** Staff manually records the payment and marks payment method as "bank_transfer" with the reference number.

### Q: Can we delete a payment?
**A:** No, payments should be voided (not deleted) to maintain audit trail.

### Q: What happens if we void a payment?
**A:** All invoice balances are restored, patient balance is updated, but the payment record remains (marked as voided).

### Q: Can we edit a payment after recording?
**A:** No. If incorrect, void it and record a new one.

### Q: How do we handle refunds?
**A:** Create a negative payment or use a separate refund tracking system (future enhancement).

## 🆘 Troubleshooting

### Issue: "Module named 'api.models' has no attribute 'Payment'"
**Solution:** Run `python manage.py migrate` to apply migrations.

### Issue: Payments not showing in API
**Solution:** Check authentication token is valid.

### Issue: Invoice balance not updating
**Solution:** Make sure `invoice.update_payment_status()` is called after creating PaymentSplit.

### Issue: "Total payment splits cannot exceed payment amount"
**Solution:** Check your allocation amounts add up correctly.

## 📞 Support

See full documentation: `PAYMENT_SYSTEM_IMPLEMENTATION.md`

---

**System Status**: ✅ Backend Complete | ⏳ Frontend Pending  
**Last Updated**: February 8, 2026
