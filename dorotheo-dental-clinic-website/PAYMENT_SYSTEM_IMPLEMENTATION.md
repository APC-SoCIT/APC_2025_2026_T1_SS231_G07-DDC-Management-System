# Payment Recording System - Implementation Guide

## Overview

This document describes the **manual payment recording system** implemented for Dorotheo Dental Clinic. This system allows staff to record payments received outside the system (cash, check, bank transfer) and track patient balances.

## Important: This is NOT Online Payment Processing

❌ **This system does NOT:**
- Process credit card payments online
- Integrate with payment gateways (PayMongo, PayPal, etc.)
- Accept patient payments through the website

✅ **This system DOES:**
- Record payments received in person (cash, check, bank transfer)
- Allocate payments to specific invoices
- Track patient balances automatically
- Provide payment history and analytics
- Support multiple payment methods (manual recording)

## Architecture

### Database Models

#### 1. **Payment** (Main payment record)
- `payment_number`: Unique identifier (PAY-YYYY-MM-NNNN)
- `patient`: Who made the payment
- `clinic`: Where payment was received
- `amount`: Total payment amount
- `payment_date`: When payment was received
- `payment_method`: Cash, Check, Bank Transfer, Credit Card (manual), etc.
- `check_number`, `bank_name`, `reference_number`: Optional details
- `notes`: Additional information
- `recorded_by`: Staff member who recorded the payment
- `is_voided`: Flag for cancelled payments

#### 2. **PaymentSplit** (Allocation to invoices)
- `payment`: Which payment this allocation belongs to
- `invoice`: Which invoice receives this payment
- `amount`: How much of the payment goes to this invoice
- `provider`: Dentist who provided the service (for revenue tracking)

### Key Features

#### Auto-Update Invoice Status
When a payment is recorded:
1. PaymentSplits are created linking payment to invoices
2. Each invoice's `amount_paid` is recalculated from splits
3. Invoice status automatically updates:
   - `paid` if amount_paid >= total_due
   - `sent` if partially paid
4. PatientBalance is updated

#### Payment Validation
- Total allocations cannot exceed payment amount
- Cannot allocate more than invoice balance
- All invoices must belong to the same patient
- Voiding a payment reverses all effects

## API Endpoints

### 1. Record Payment
```http
POST /api/payments/record_payment/
```

**Request Body:**
```json
{
  "patient_id": 123,
  "clinic_id": 1,
  "amount": 1500.00,
  "payment_date": "2026-02-08",
  "payment_method": "cash",
  "check_number": "",
  "bank_name": "",
  "reference_number": "",
  "notes": "Payment for dental cleaning and filling",
  "allocations": [
    {
      "invoice_id": 45,
      "amount": 1000.00,
      "provider_id": 5
    },
    {
      "invoice_id": 46,
      "amount": 500.00,
      "provider_id": 5
    }
  ]
}
```

**Response:**
```json
{
  "payment": {
    "id": 789,
    "payment_number": "PAY-2026-02-0001",
    "patient_name": "John Doe",
    "amount": "1500.00",
    "payment_date": "2026-02-08",
    "payment_method": "cash",
    "allocated_amount": 1500.00,
    "unallocated_amount": 0.00,
    "splits": [...]
  },
  "message": "Payment recorded successfully"
}
```

### 2. List Payments
```http
GET /api/payments/
GET /api/payments/?patient_id=123
GET /api/payments/?clinic_id=1
GET /api/payments/?start_date=2026-01-01&end_date=2026-02-08
GET /api/payments/?payment_method=cash
GET /api/payments/?include_voided=true
```

### 3. Get Payment Details
```http
GET /api/payments/{id}/
```

### 4. Get Patient Payments
```http
GET /api/payments/patient_payments/{patient_id}/
```

**Response:**
```json
{
  "patient_id": 123,
  "patient_name": "John Doe",
  "patient_email": "john@example.com",
  "total_paid": 15000.00,
  "payment_count": 5,
  "payments": [...]
}
```

### 5. Void Payment
```http
POST /api/payments/{id}/void/
```

**Request Body:**
```json
{
  "reason": "Payment was entered in error"
}
```

## Workflow Examples

### Scenario 1: Patient Pays Full Invoice
**Situation:** Patient John owes ₱2,000 for Invoice #INV-2026-02-0045 and pays in cash.

**Steps:**
1. Staff opens patient's invoice list
2. Sees Invoice #INV-2026-02-0045 with balance ₱2,000
3. Clicks "Record Payment"
4. Fills in:
   - Payment amount: ₱2,000
   - Payment method: Cash
   - Date: Today
   - Select invoice: INV-2026-02-0045
   - Allocate: ₱2,000
5. Submits

**System Response:**
- Creates Payment #PAY-2026-02-0001
- Creates PaymentSplit: PAY-0001 → INV-0045 (₱2,000)
- Updates Invoice #INV-0045:
  - amount_paid: ₱2,000
  - balance: ₱0
  - status: 'paid'
- Updates PatientBalance for John

### Scenario 2: Patient Pays Multiple Invoices
**Situation:** Patient Mary owes ₱1,500 on Invoice #1 and ₱800 on Invoice #2. She pays ₱2,300 cash.

**Steps:**
1. Staff records payment of ₱2,300
2. Allocates:
   - Invoice #1: ₱1,500
   - Invoice #2: ₱800
3. Submits

**System Response:**
- Creates 1 Payment with 2 PaymentSplits
- Both invoices marked as 'paid'
- Patient balance updated

### Scenario 3: Partial Payment
**Situation:** Patient owes ₱3,000 but only pays ₱1,500 now.

**Steps:**
1. Staff records payment of ₱1,500
2. Allocates ₱1,500 to the invoice

**System Response:**
- Invoice balance: ₱3,000 - ₱1,500 = ₱1,500 remaining
- Invoice status remains 'sent' (not fully paid)
- Patient can pay the remaining ₱1,500 later

### Scenario 4: Payment Entered by Mistake
**Situation:** Staff accidentally recorded a ₱2,000 payment that wasn't actually received.

**Steps:**
1. Staff finds the payment in payment history
2. Clicks "Void Payment"
3. Enters reason: "Payment was entered in error"
4. Confirms

**System Response:**
- Payment marked as voided
- All PaymentSplits marked as voided
- Invoice balances restored to original amounts
- Patient balance updated (payment removed)

## Payment Methods Supported

```python
PAYMENT_METHOD_CHOICES = (
    ('cash', 'Cash'),
    ('check', 'Check'),
    ('bank_transfer', 'Bank Transfer'),
    ('credit_card', 'Credit Card (Manual)'),
    ('debit_card', 'Debit Card (Manual)'),
    ('gcash', 'GCash'),
    ('paymaya', 'PayMaya'),
    ('other', 'Other'),
)
```

**Note:** "Credit Card (Manual)" means staff manually records that patient paid by card. The system does NOT process the card transaction.

## Security & Permissions

### Who Can Record Payments?
- **Staff (Receptionist)**: Yes ✅
- **Staff (Dentist)**: Yes ✅
- **Owner**: Yes ✅
- **Patient**: No ❌

### Why Patients Cannot Record Their Own Payments:
1. **Fraud Prevention**: Patients could mark unpaid invoices as "paid
2. **No Verification**: No way to confirm payment was actually received
3. **Staff Responsibility**: Only staff who physically receive payment should record it

## Revenue Analytics

### For Owners
The payment system tracks:
- Total revenue by clinic
- Total revenue by payment method
- Total revenue by date range
- Total revenue by provider (dentist)
- Outstanding balances
- Overdue amounts

### Example Analytics Queries

**Total Revenue This Month (By Clinic):**
```python
Payment.objects.filter(
    payment_date__gte=first_day_of_month,
    payment_date__lte=last_day_of_month,
    is_voided=False
).values('clinic').annotate(total=Sum('amount'))
```

**Revenue by Payment Method:**
```python
Payment.objects.filter(
    is_voided=False
).values('payment_method').annotate(total=Sum('amount'))
```

**Revenue by Provider:**
```python
PaymentSplit.objects.filter(
    is_voided=False,
    payment__is_voided=False
).values('provider').annotate(total=Sum('amount'))
```

## Migration Instructions

### 1. Create Database Migrations
```bash
# Navigate to backend directory
cd dorotheo-dental-clinic-website/backend

# Activate virtual environment
.\venv\Scripts\activate  # Windows
source venv/bin/activate # Mac/Linux

# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate
```

### 2. Verify Models
```bash
# Test in Django shell
python manage.py shell
```

```python
from api.models import Payment, PaymentSplit
print(Payment.objects.all())
print(PaymentSplit.objects.all())
```

## Testing the System

### 1. Create Test Data
```bash
python manage.py shell
```

```python
from api.models import User, Invoice, Payment, PaymentSplit
from datetime import date

# Get a patient and invoice
patient = User.objects.filter(user_type='patient').first()
invoice = Invoice.objects.filter(patient=patient, status='sent').first()

print(f"Patient: {patient.get_full_name()}")
print(f"Invoice: {invoice.invoice_number}, Balance: {invoice.balance}")

# Create a payment
payment = Payment.objects.create(
    payment_number="PAY-2026-02-0001",
    patient=patient,
    amount=500.00,
    payment_date=date.today(),
    payment_method='cash',
    notes='Test payment'
)

# Allocate to invoice
split = PaymentSplit.objects.create(
    payment=payment,
    invoice=invoice,
    amount=500.00
)

# Update invoice
invoice.update_payment_status()

print(f"Updated Invoice Balance: {invoice.balance}")
print(f"Invoice Status: {invoice.status}")
```

### 2. Test API Endpoints
Use Postman or curl:

```bash
# Get authentication token
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "staff", "password": "password"}'

# Record payment
curl -X POST http://localhost:8000/api/payments/record_payment/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 1,
    "amount": 1500.00,
    "payment_date": "2026-02-08",
    "payment_method": "cash",
    "allocations": [{"invoice_id": 1, "amount": 1500.00}]
  }'
```

## Frontend Implementation (Next Steps)

See separate documentation for:
1. Payment recording UI for staff
2. Payment history view for patients
3. Revenue analytics dashboard for owners

## Future Enhancements

### Phase 2 (Optional):
- Email receipts after payment recording
- SMS notifications
- Recurring payment plans
- Partial payment schedules
- Payment reminders

### Phase 3 (Optional):
- Online payment gateway integration (PayMongo)
- Online patient payment portal
- Automatic payment processing

## Troubleshooting

### Issue: "Total payment splits cannot exceed payment amount"
**Cause:** You're trying to allocate more money than the payment amount.
**Solution:** Check that sum of allocations ≤ payment amount.

### Issue: "Allocation amount exceeds invoice balance"
**Cause:** Trying to pay more than what's owed on an invoice.
**Solution:** Check invoice balance first.

### Issue: "All invoices must belong to the same patient"
**Cause:** Trying to allocate one payment to multiple patients' invoices.
**Solution:** Create separate payments for each patient.

### Issue: Payment recorded but invoice status not updating
**Cause:** `update_payment_status()` not called.
**Solution:** System should call this automatically, but you can manually trigger:
```python
invoice.update_payment_status()
```

## Support

For questions or issues:
1. Check this documentation
2. Review API endpoint responses for error messages
3. Check Django logs: `backend/logs/`
4. Test with Django admin: http://localhost:8000/admin/

---

**Document Version**: 1.0  
**Last Updated**: February 8, 2026  
**Author**: System Implementation Documentation
