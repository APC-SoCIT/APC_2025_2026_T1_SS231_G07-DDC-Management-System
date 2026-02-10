# Invoice Generation System - Implementation Plan

## Executive Summary
Create a comprehensive invoice generation system that allows clinic staff to create itemized invoices for completed appointments, automatically calculating costs from services and inventory items used, with email notifications sent to patients and staff including PDF invoices.

---

## 1. Feature Overview

### Purpose
Generate professional invoices for completed appointments that include service charges and inventory items used during treatment, maintain running patient balances, and automatically notify relevant parties via email.

### Key Capabilities
- Create invoices linked to specific completed appointments
- Select and customize inventory items used in treatment
- Automatically calculate totals (service + inventory items)
- Track cumulative patient balance across all invoices
- Generate PDF invoices from template
- Send email notifications with invoice attachments
- Review and confirm before finalization

---

## 2. Data Model Requirements

### Invoice Model
```python
# Backend: api/models.py
class Invoice(models.Model):
    # Core Fields
    invoice_number = CharField(max_length=20, unique=True)  # Format: INV-YYYY-MM-NNNN
    reference_number = CharField(max_length=20, unique=True)  # Format: REF-NNNN
    
    # Relationships
    appointment = ForeignKey(Appointment, on_delete=CASCADE)
    patient = ForeignKey(User, on_delete=CASCADE, related_name='invoices')
    clinic = ForeignKey(ClinicLocation, on_delete=SET_NULL, null=True)
    created_by = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='created_invoices')
    
    # Financial Details
    service_charge = DecimalField(max_digits=10, decimal_places=2)  # From appointment service
    items_subtotal = DecimalField(max_digits=10, decimal_places=2, default=0)
    subtotal = DecimalField(max_digits=10, decimal_places=2)  # service + items
    interest_rate = DecimalField(max_digits=5, decimal_places=2, default=10.00)  # 10% per annum
    interest_amount = DecimalField(max_digits=10, decimal_places=2, default=0)
    total_due = DecimalField(max_digits=10, decimal_places=2)
    amount_paid = DecimalField(max_digits=10, decimal_places=2, default=0)
    balance = DecimalField(max_digits=10, decimal_places=2)
    
    # Status
    status = CharField(choices=[
        ('draft', 'Draft'),
        ('pending', 'Pending'),
        ('partially_paid', 'Partially Paid'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled')
    ])
    
    # Dates
    invoice_date = DateField()
    due_date = DateField()
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    sent_at = DateTimeField(null=True, blank=True)
    paid_at = DateTimeField(null=True, blank=True)
    
    # Notes
    notes = TextField(blank=True)
    payment_instructions = TextField(default="Please pay your overdue amount within 7 days")
    bank_account = CharField(max_length=50, default="12345678910")
```

### InvoiceItem Model
```python
class InvoiceItem(models.Model):
    # Relationships
    invoice = ForeignKey(Invoice, on_delete=CASCADE, related_name='items')
    inventory_item = ForeignKey(InventoryItem, on_delete=SET_NULL, null=True)
    
    # Item Details
    item_name = CharField(max_length=200)  # Copied from inventory for historical record
    description = TextField(blank=True)
    quantity = PositiveIntegerField(default=1)
    unit_price = DecimalField(max_digits=10, decimal_places=2)
    total_price = DecimalField(max_digits=10, decimal_places=2)  # quantity * unit_price
    
    # Metadata
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

### Patient Balance Tracking
```python
# Add to User model or create PatientBalance model
class PatientBalance(models.Model):
    patient = OneToOneField(User, on_delete=CASCADE, related_name='balance_record')
    total_invoiced = DecimalField(max_digits=10, decimal_places=2, default=0)
    total_paid = DecimalField(max_digits=10, decimal_places=2, default=0)
    current_balance = DecimalField(max_digits=10, decimal_places=2, default=0)
    updated_at = DateTimeField(auto_now=True)
```

---

## 3. Invoice Template Structure

### Template Design (Based on Statement of Account)
```
┌─────────────────────────────────────────────────────────────┐
│                     Statement of Account                     │
├─────────────────────────────────────────────────────────────┤
│ To:                                    [Clinic Name/Logo]    │
│ [Patient Name]                         [Clinic Address]      │
│ [Patient Address]                      [Clinic City]         │
│ [Patient City]                         [Clinic Area Code]    │
│ [Patient Area Code]                                          │
│                                                               │
│ Date: [Invoice Date]                   Reference: [REF-###]  │
│                                        Opening Balance: $0    │
├─────────────────────────────────────────────────────────────┤
│ Date     │ Ref.    │ Description      │ Amount   │ Payment  │
├─────────────────────────────────────────────────────────────┤
│ MM/DD/YY │ INV#### │ [Service Name]   │ $###.##  │          │
│ MM/DD/YY │ ITEM### │ [Inventory Item] │ $###.##  │          │
│ MM/DD/YY │ ITEM### │ [Inventory Item] │ $###.##  │          │
├─────────────────────────────────────────────────────────────┤
│                                        Subtotal:   $###.##   │
│                                        Interest:   $##.##    │
│ Thank you for your business!           Total Due: $###.##   │
│                                                               │
│ Please pay your overdue amount of $###.## within 7 days      │
│                                                               │
│ Payment due by: [Due Date]                                   │
│ Please make payment into Bank Account No: 12345678910        │
│ Interest of 10% per annum will be charged on late payments   │
├─────────────────────────────────────────────────────────────┤
│ Remittance                                                    │
│ My Customer: [Patient Name]                                  │
│                                                               │
│ [Clinic Name]                          Invoice No: [INV-###] │
│ [Clinic Address]                       Amount Paid: $_____   │
│ [Clinic City]                                                │
│ [Clinic Area Code]                     Total Paid: $_____    │
│                                                               │
│                                        Reference: [REF-###]  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. User Flow & Modal Specifications

### Phase 1: Invoice Creation Trigger
**Location**: Owner/Staff Appointments Page → Appointment Details → "Create Invoice" button

**Preconditions**:
- Appointment status must be "completed"
- User must have staff/owner role
- Appointment must not already have an invoice

**Button Display**:
```tsx
{appointment.status === 'completed' && !appointment.invoice_id && (
  <button onClick={() => openInvoiceModal(appointment)}>
    <FileText className="w-4 h-4" />
    Create Invoice
  </button>
)}
```

### Phase 2: Invoice Creation Modal - Step 1 (Service Review)
**Title**: "Create Invoice - Service Details"

**Display Elements**:
1. **Appointment Information Panel** (Read-only)
   - Patient Name
   - Appointment Date & Time
   - Service Performed
   - Assigned Dentist
   - Clinic Location

2. **Service Charge Section**
   - Service Name (from appointment)
   - Service Cost (auto-filled from service pricing)
   - Editable amount field with validation
   - Currency format: PHP or $

3. **Navigation**
   - "Next: Add Items" button (proceeds to item selection)
   - "Cancel" button

**Validation Rules**:
- Service charge must be > 0
- Service charge cannot exceed ₱100,000

### Phase 3: Invoice Creation Modal - Step 2 (Inventory Item Selection)
**Title**: "Create Invoice - Add Treatment Items"

**Layout Structure**:
```
┌────────────────────────────────────────────────────┐
│ Current Invoice Total: ₱[calculated total]         │
├────────────────────────────────────────────────────┤
│ Available Inventory Items                          │
│ ┌──────────────────────────────────────────────┐  │
│ │ Search: [_________________________] 🔍        │  │
│ │ Filter by: [All Categories ▼]                │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ ┌─────────────────────────────────────────┐      │
│ │ [Item 1 Name]              ₱50.00       │      │
│ │ Stock: 100 units                        │      │
│ │ Category: Dental Supplies    [+ Add]    │      │
│ ├─────────────────────────────────────────┤      │
│ │ [Item 2 Name]              ₱120.00      │      │
│ │ Stock: 50 units                         │      │
│ │ Category: Materials          [+ Add]    │      │
│ └─────────────────────────────────────────┘      │
├────────────────────────────────────────────────────┤
│ Selected Items (0)                                 │
│ ┌──────────────────────────────────────────────┐  │
│ │ No items selected yet                        │  │
│ └──────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────┤
│ [← Back]  [Skip Items]  [Continue to Review →]    │
└────────────────────────────────────────────────────┘
```

**Add Item Confirmation Dialog**:
```
┌─────────────────────────────────────────┐
│ Add Item to Invoice?                    │
├─────────────────────────────────────────┤
│ Item: [Dental Crown]                    │
│ Unit Price: ₱500.00                     │
│                                         │
│ Quantity: [- 1 +]                       │
│                                         │
│ Total: ₱500.00                          │
│                                         │
│ [Cancel]  [Confirm Add]                 │
└─────────────────────────────────────────┘
```

**Selected Items Panel** (Once items are added):
```
┌───────────────────────────────────────────────────┐
│ Selected Items (3)                                │
├───────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────┐│
│ │ Dental Crown                                  ││
│ │ Qty: [- 1 +]  Unit: ₱500.00  Total: ₱500.00  ││
│ │ [✎ Edit] [🗑 Remove]                          ││
│ ├───────────────────────────────────────────────┤│
│ │ Composite Filling                             ││
│ │ Qty: [- 2 +]  Unit: ₱300.00  Total: ₱600.00  ││
│ │ [✎ Edit] [🗑 Remove]                          ││
│ ├───────────────────────────────────────────────┤│
│ │ Anesthetic                                    ││
│ │ Qty: [- 1 +]  Unit: ₱150.00  Total: ₱150.00  ││
│ │ [✎ Edit] [🗑 Remove]                          ││
│ └───────────────────────────────────────────────┘│
│                                                   │
│ Items Subtotal: ₱1,250.00                        │
└───────────────────────────────────────────────────┘
```

**Edit Item Dialog**:
```
┌─────────────────────────────────────────┐
│ Edit Item                               │
├─────────────────────────────────────────┤
│ Item: Dental Crown                      │
│                                         │
│ Quantity: [- 2 +]                       │
│ Unit Price: ₱[500.00]  (editable)       │
│                                         │
│ Total: ₱1,000.00 (auto-calculated)      │
│                                         │
│ [Cancel]  [Save Changes]                │
└─────────────────────────────────────────┘
```

**Remove Item Confirmation**:
```
┌──────────────────────────────────────┐
│ Remove Item from Invoice?            │
├──────────────────────────────────────┤
│ Are you sure you want to remove      │
│ "Dental Crown" from this invoice?    │
│                                      │
│ [Cancel]  [Remove]                   │
└──────────────────────────────────────┘
```

**Interaction Rules**:
- Minimum quantity: 1
- Maximum quantity: Current stock level
- Real-time total calculation
- Items can be added multiple times (creates separate line items)
- Search filters by item name and category
- Category filter shows item categories from inventory

### Phase 4: Invoice Creation Modal - Step 3 (Review & Confirm)
**Title**: "Review Invoice Before Sending"

**Layout**:
```
┌────────────────────────────────────────────────────┐
│ Invoice Preview                                    │
├────────────────────────────────────────────────────┤
│ Patient: [Gabriel Villanueva]                      │
│ Email: [gvillanueva@student.apc.edu.ph]           │
│ Appointment Date: [2026-02-07]                     │
│ Service: [Cleaning]                                │
│ Assigned Dentist: [Marvin Dorotheo]                │
│                                                    │
│ ┌──────────────────────────────────────────────┐  │
│ │ Line Items:                                  │  │
│ │ ────────────────────────────────────────────│  │
│ │ Cleaning Service             ₱1,500.00      │  │
│ │ Dental Crown (x1)              ₱500.00      │  │
│ │ Composite Filling (x2)         ₱600.00      │  │
│ │ Anesthetic (x1)                ₱150.00      │  │
│ │                                              │  │
│ │                        Subtotal: ₱2,750.00  │  │
│ │                        Interest:    ₱27.50  │  │
│ │                      Total Due: ₱2,777.50  │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ Invoice Date: [2026-02-07]                         │
│ Due Date: [2026-02-14] (7 days from now)           │
│ Payment Instructions:                              │
│ [Please pay within 7 days to Bank Account: ####]  │
│                                                    │
│ Additional Notes: (optional)                       │
│ ┌──────────────────────────────────────────────┐  │
│ │ [                                           ] │  │
│ │ [                                           ] │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ ☑ Send invoice email to patient                   │
│ ☑ Send invoice copy to clinic staff               │
│                                                    │
│ [← Back to Edit]  [Cancel]  [Confirm & Send →]    │
└────────────────────────────────────────────────────┘
```

**Final Confirmation Dialog**:
```
┌───────────────────────────────────────────┐
│ Confirm Invoice Creation?                 │
├───────────────────────────────────────────┤
│ This action will:                         │
│ ✓ Create invoice INV-2026-02-001          │
│ ✓ Update patient balance (+₱2,777.50)    │
│ ✓ Send email to patient                   │
│ ✓ Send email to clinic staff              │
│ ✓ Mark appointment as invoiced            │
│                                           │
│ Total Amount: ₱2,777.50                   │
│                                           │
│ This action cannot be undone.             │
│                                           │
│ [Cancel]  [Yes, Create Invoice]           │
└───────────────────────────────────────────┘
```

### Phase 5: Success Confirmation
**Success Modal**:
```
┌─────────────────────────────────────────┐
│           ✓ Invoice Created!            │
├─────────────────────────────────────────┤
│ Invoice Number: INV-2026-02-001         │
│ Total Amount: ₱2,777.50                 │
│                                         │
│ ✓ Emails sent successfully              │
│   • Patient: gvillanueva@student...     │
│   • Staff: marvin@clinic.com            │
│                                         │
│ ✓ Patient balance updated               │
│   New Balance: ₱2,777.50                │
│                                         │
│ [View Invoice PDF]  [Close]             │
└─────────────────────────────────────────┘
```

---

## 5. Backend Implementation

### API Endpoints

#### 5.1 Create Invoice
```python
# POST /api/invoices/create/
@action(detail=False, methods=['post'])
def create(self, request):
    """
    Create invoice for a completed appointment
    
    Payload:
    {
        "appointment_id": 123,
        "service_charge": 1500.00,
        "items": [
            {
                "inventory_item_id": 45,
                "quantity": 1,
                "unit_price": 500.00
            },
            {
                "inventory_item_id": 67,
                "quantity": 2,
                "unit_price": 300.00
            }
        ],
        "due_days": 7,
        "notes": "Optional notes",
        "send_email": true
    }
    
    Returns:
    {
        "invoice": {...},
        "pdf_url": "/media/invoices/INV-2026-02-001.pdf",
        "email_sent": true
    }
    """
```

#### 5.2 Get Invoice
```python
# GET /api/invoices/{id}/
def retrieve(self, request, pk=None):
    """Get single invoice with all details"""
```

#### 5.3 List Patient Invoices
```python
# GET /api/invoices/?patient_id={id}
def list(self, request):
    """List all invoices with filters"""
```

#### 5.4 Get Patient Balance
```python
# GET /api/invoices/patient_balance/{patient_id}/
@action(detail=False, methods=['get'])
def patient_balance(self, request, patient_id):
    """
    Get cumulative patient balance
    
    Returns:
    {
        "patient_id": 123,
        "patient_name": "Gabriel Villanueva",
        "total_invoiced": 5500.00,
        "total_paid": 2000.00,
        "current_balance": 3500.00,
        "overdue_amount": 1500.00,
        "invoices": [...]
    }
    """
```

#### 5.5 Generate Invoice PDF
```python
# POST /api/invoices/{id}/generate_pdf/
@action(detail=True, methods=['post'])
def generate_pdf(self, request, pk=None):
    """
    Generate PDF from invoice template
    Uses library: reportlab or weasyprint
    
    Returns:
    {
        "pdf_url": "/media/invoices/INV-2026-02-001.pdf"
    }
    """
```

### Backend Logic

#### Invoice Number Generation
```python
def generate_invoice_number():
    """
    Format: INV-YYYY-MM-NNNN
    Example: INV-2026-02-0001
    """
    today = date.today()
    prefix = f"INV-{today.year}-{today.month:02d}"
    
    # Get last invoice for this month
    last_invoice = Invoice.objects.filter(
        invoice_number__startswith=prefix
    ).order_by('-invoice_number').first()
    
    if last_invoice:
        last_num = int(last_invoice.invoice_number.split('-')[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}-{new_num:04d}"
```

#### Reference Number Generation
```python
def generate_reference_number():
    """
    Format: REF-NNNN
    Example: REF-0816
    """
    last_ref = Invoice.objects.order_by('-reference_number').first()
    if last_ref:
        last_num = int(last_ref.reference_number.split('-')[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"REF-{new_num:04d}"
```

#### Calculate Invoice Totals
```python
def calculate_invoice_totals(service_charge, items, due_days=7):
    """
    Calculate all invoice amounts
    
    Returns:
    {
        "service_charge": Decimal,
        "items_subtotal": Decimal,
        "subtotal": Decimal,
        "interest_amount": Decimal,
        "total_due": Decimal
    }
    """
    items_subtotal = sum(item['quantity'] * item['unit_price'] for item in items)
    subtotal = service_charge + items_subtotal
    
    # Interest calculation (10% per annum, prorated for due_days)
    interest_rate = Decimal('0.10')  # 10%
    interest_amount = (subtotal * interest_rate * due_days) / 365
    
    total_due = subtotal + interest_amount
    
    return {
        "service_charge": service_charge,
        "items_subtotal": items_subtotal,
        "subtotal": subtotal,
        "interest_amount": round(interest_amount, 2),
        "total_due": round(total_due, 2)
    }
```

#### Update Patient Balance
```python
def update_patient_balance(patient_id, invoice_amount):
    """Update or create patient balance record"""
    balance, created = PatientBalance.objects.get_or_create(
        patient_id=patient_id,
        defaults={
            'total_invoiced': 0,
            'total_paid': 0,
            'current_balance': 0
        }
    )
    
    balance.total_invoiced += invoice_amount
    balance.current_balance += invoice_amount
    balance.save()
    
    return balance
```

#### Deduct Inventory Stock
```python
def deduct_inventory_items(invoice_items):
    """
    Deduct quantities from inventory after invoice confirmation
    """
    for item_data in invoice_items:
        inventory_item = InventoryItem.objects.get(id=item_data['inventory_item_id'])
        
        if inventory_item.quantity < item_data['quantity']:
            raise ValueError(f"Insufficient stock for {inventory_item.name}")
        
        inventory_item.quantity -= item_data['quantity']
        inventory_item.save()
```

---

## 6. PDF Generation

### Library Choice
**Recommended**: `weasyprint` (HTML to PDF) or `reportlab` (programmatic PDF)

### Installation
```bash
# Add to requirements.txt
weasyprint==60.1
```

### PDF Template (HTML)
```html
<!-- templates/invoice_template.html -->
<!DOCTYPE html>
<html>
<head>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        body {
            font-family: Arial, sans-serif;
            color: #333;
        }
        .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .company-info {
            text-align: right;
        }
        .title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .totals {
            text-align: right;
            margin-top: 20px;
        }
        .totals div {
            margin: 5px 0;
        }
        .payment-info {
            margin-top: 30px;
            padding: 15px;
            background-color: #f8f9fa;
            border-left: 4px solid #2d5a3f;
        }
    </style>
</head>
<body>
    <div class="title">Statement of Account</div>
    
    <div class="header">
        <div class="customer-info">
            <strong>To:</strong><br>
            {{ patient_name }}<br>
            {{ patient_address }}<br>
            {{ patient_city }}<br>
            {{ patient_area_code }}
        </div>
        <div class="company-info">
            <strong>{{ clinic_name }}</strong><br>
            {{ clinic_address }}<br>
            {{ clinic_city }}<br>
            {{ clinic_area_code }}
        </div>
    </div>
    
    <div class="info-section">
        <div>
            <strong>Date:</strong> {{ invoice_date }}<br>
            <strong>Due Date:</strong> {{ due_date }}
        </div>
        <div style="text-align: right;">
            <strong>Reference:</strong> {{ reference_number }}<br>
            <strong>Opening Balance:</strong> ₱{{ opening_balance }}
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Ref.</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Payment</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>{{ appointment_date }}</td>
                <td>{{ invoice_number }}</td>
                <td>{{ service_name }}</td>
                <td>₱{{ service_charge }}</td>
                <td></td>
            </tr>
            {% for item in invoice_items %}
            <tr>
                <td>{{ appointment_date }}</td>
                <td>ITEM{{ item.id }}</td>
                <td>{{ item.name }} (x{{ item.quantity }})</td>
                <td>₱{{ item.total_price }}</td>
                <td></td>
            </tr>
            {% endfor %}
        </tbody>
    </table>
    
    <div class="totals">
        <div><strong>Subtotal:</strong> ₱{{ subtotal }}</div>
        <div><strong>Interest:</strong> ₱{{ interest_amount }}</div>
        <div style="font-size: 18px; font-weight: bold; color: #2d5a3f;">
            <strong>Total Due:</strong> ₱{{ total_due }}
        </div>
    </div>
    
    <div class="payment-info">
        <p><strong>Thank you for your business!</strong></p>
        <p>{{ payment_instructions }}</p>
        <p><strong>Payment due by:</strong> {{ due_date }}</p>
        <p><strong>Bank Account No:</strong> {{ bank_account }}</p>
        <p><em>Interest of 10% per annum will be charged on late payments</em></p>
    </div>
    
    <div style="margin-top: 40px; border-top: 2px dashed #ccc; padding-top: 20px;">
        <h3>Remittance</h3>
        <div class="info-section">
            <div>
                <strong>My Customer:</strong> {{ patient_name }}<br><br>
                {{ clinic_name }}<br>
                {{ clinic_address }}<br>
                {{ clinic_city }}<br>
                {{ clinic_area_code }}
            </div>
            <div style="text-align: right;">
                <strong>Invoice No:</strong> {{ invoice_number }}<br>
                <strong>Amount Paid:</strong> $_______<br><br>
                <strong>Total Paid:</strong> $_______<br><br>
                <strong>Reference:</strong> {{ reference_number }}
            </div>
        </div>
    </div>
</body>
</html>
```

### PDF Generation Function
```python
# api/invoice_generator.py
from weasyprint import HTML, CSS
from django.template.loader import render_to_string
from django.conf import settings
import os

def generate_invoice_pdf(invoice):
    """
    Generate PDF from invoice data
    
    Returns: file path to generated PDF
    """
    # Prepare context data
    context = {
        'invoice_number': invoice.invoice_number,
        'reference_number': invoice.reference_number,
        'invoice_date': invoice.invoice_date.strftime('%B %d, %Y'),
        'due_date': invoice.due_date.strftime('%B %d, %Y'),
        'appointment_date': invoice.appointment.date,
        
        # Patient info
        'patient_name': f"{invoice.patient.first_name} {invoice.patient.last_name}",
        'patient_address': invoice.patient.address or "At this address",
        'patient_city': invoice.patient.city or "In this city",
        'patient_area_code': invoice.patient.zipcode or "At this area code",
        
        # Clinic info
        'clinic_name': invoice.clinic.name if invoice.clinic else "Dorotheo Dental Clinic",
        'clinic_address': invoice.clinic.address if invoice.clinic else "",
        'clinic_city': invoice.clinic.city if invoice.clinic else "",
        'clinic_area_code': invoice.clinic.zipcode if invoice.clinic else "",
        
        # Service details
        'service_name': invoice.appointment.service.name if invoice.appointment.service else "Dental Service",
        'service_charge': f"{invoice.service_charge:.2f}",
        
        # Invoice items
        'invoice_items': invoice.items.all(),
        
        # Totals
        'opening_balance': "0.00",
        'subtotal': f"{invoice.subtotal:.2f}",
        'interest_amount': f"{invoice.interest_amount:.2f}",
        'total_due': f"{invoice.total_due:.2f}",
        
        # Payment info
        'payment_instructions': invoice.payment_instructions,
        'bank_account': invoice.bank_account,
    }
    
    # Render HTML template
    html_string = render_to_string('invoice_template.html', context)
    
    # Generate PDF
    pdf_filename = f"{invoice.invoice_number}.pdf"
    pdf_path = os.path.join(settings.MEDIA_ROOT, 'invoices', pdf_filename)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
    
    # Convert HTML to PDF
    HTML(string=html_string).write_pdf(pdf_path)
    
    return pdf_path
```

---

## 7. Email Notification System

### Email Templates

#### Patient Email
```html
<!-- templates/emails/invoice_patient.html -->
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #2d5a3f;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .content {
            padding: 20px;
            background-color: #f9f9f9;
        }
        .invoice-summary {
            background-color: white;
            padding: 15px;
            margin: 20px 0;
            border-left: 4px solid #2d5a3f;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2d5a3f;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 0;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Invoice for Your Recent Appointment</h1>
        </div>
        
        <div class="content">
            <h2>Dear {{ patient_name }},</h2>
            
            <p>Thank you for choosing {{ clinic_name }} for your dental care. Please find attached your invoice for the recent appointment.</p>
            
            <div class="invoice-summary">
                <h3>Invoice Summary</h3>
                <p><strong>Invoice Number:</strong> {{ invoice_number }}</p>
                <p><strong>Reference:</strong> {{ reference_number }}</p>
                <p><strong>Date:</strong> {{ invoice_date }}</p>
                <p><strong>Service:</strong> {{ service_name }}</p>
                <p><strong>Amount Due:</strong> ₱{{ total_due }}</p>
                <p><strong>Due Date:</strong> {{ due_date }}</p>
            </div>
            
            <h3>Payment Instructions</h3>
            <p>{{ payment_instructions }}</p>
            <p><strong>Bank Account:</strong> {{ bank_account }}</p>
            
            <p style="margin-top: 20px;">
                <em>Please note: Interest of 10% per annum will be charged on late payments.</em>
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ portal_url }}" class="button">View in Patient Portal</a>
            </div>
            
            <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>
            {{ clinic_name }}<br>
            {{ clinic_phone }}<br>
            {{ clinic_email }}</p>
        </div>
        
        <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>{{ clinic_name }} | {{ clinic_address }}</p>
        </div>
    </div>
</body>
</html>
```

#### Staff Email
```html
<!-- templates/emails/invoice_staff.html -->
<!DOCTYPE html>
<html>
<head>
    <style>
        /* Same styling as patient email */
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Invoice Created</h1>
        </div>
        
        <div class="content">
            <h2>Invoice Notification</h2>
            
            <p>A new invoice has been created by {{ created_by_name }}.</p>
            
            <div class="invoice-summary">
                <h3>Invoice Details</h3>
                <p><strong>Invoice Number:</strong> {{ invoice_number }}</p>
                <p><strong>Patient:</strong> {{ patient_name }}</p>
                <p><strong>Appointment Date:</strong> {{ appointment_date }}</p>
                <p><strong>Service:</strong> {{ service_name }}</p>
                <p><strong>Dentist:</strong> {{ dentist_name }}</p>
                <p><strong>Amount:</strong> ₱{{ total_due }}</p>
                <p><strong>Due Date:</strong> {{ due_date }}</p>
            </div>
            
            <h3>Invoice Items</h3>
            <ul>
                <li>{{ service_name }}: ₱{{ service_charge }}</li>
                {% for item in invoice_items %}
                <li>{{ item.name }} (x{{ item.quantity }}): ₱{{ item.total_price }}</li>
                {% endfor %}
            </ul>
            
            <p><strong>Patient Balance:</strong> ₱{{ patient_balance }}</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ staff_portal_url }}" class="button">View in Staff Portal</a>
            </div>
        </div>
        
        <div class="footer">
            <p>{{ clinic_name }} Internal Notification</p>
        </div>
    </div>
</body>
</html>
```

### Email Sending Function
```python
# api/email_service.py
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.conf import settings

def send_invoice_emails(invoice):
    """
    Send invoice emails to patient and staff
    
    Returns: dict with email send status
    """
    results = {
        'patient_sent': False,
        'staff_sent': False,
        'errors': []
    }
    
    # Generate PDF first
    pdf_path = generate_invoice_pdf(invoice)
    
    # Prepare common context
    context = {
        'invoice_number': invoice.invoice_number,
        'reference_number': invoice.reference_number,
        'invoice_date': invoice.invoice_date.strftime('%B %d, %Y'),
        'due_date': invoice.due_date.strftime('%B %d, %Y'),
        'appointment_date': invoice.appointment.date.strftime('%B %d, %Y'),
        'patient_name': f"{invoice.patient.first_name} {invoice.patient.last_name}",
        'service_name': invoice.appointment.service.name if invoice.appointment.service else "Dental Service",
        'service_charge': f"{invoice.service_charge:.2f}",
        'total_due': f"{invoice.total_due:.2f}",
        'payment_instructions': invoice.payment_instructions,
        'bank_account': invoice.bank_account,
        'clinic_name': invoice.clinic.name if invoice.clinic else "Dorotheo Dental Clinic",
        'clinic_phone': invoice.clinic.phone if invoice.clinic else "",
        'clinic_email': invoice.clinic.email if invoice.clinic else "",
        'clinic_address': invoice.clinic.address if invoice.clinic else "",
    }
    
    # Send to Patient
    try:
        patient_context = context.copy()
        patient_context['portal_url'] = f"{settings.FRONTEND_URL}/patient/billing"
        
        patient_html = render_to_string('emails/invoice_patient.html', patient_context)
        
        patient_email = EmailMessage(
            subject=f"Invoice {invoice.invoice_number} - {context['clinic_name']}",
            body=patient_html,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[invoice.patient.email],
        )
        patient_email.content_subtype = 'html'
        patient_email.attach_file(pdf_path, mimetype='application/pdf')
        patient_email.send()
        
        results['patient_sent'] = True
    except Exception as e:
        results['errors'].append(f"Patient email failed: {str(e)}")
    
    # Send to Staff
    try:
        staff_context = context.copy()
        staff_context['created_by_name'] = f"{invoice.created_by.first_name} {invoice.created_by.last_name}"
        staff_context['dentist_name'] = invoice.appointment.dentist_name or "N/A"
        staff_context['invoice_items'] = invoice.items.all()
        staff_context['patient_balance'] = f"{invoice.patient.balance_record.current_balance:.2f}"
        staff_context['staff_portal_url'] = f"{settings.FRONTEND_URL}/staff/appointments"
        
        staff_html = render_to_string('emails/invoice_staff.html', staff_context)
        
        # Get clinic staff emails
        clinic_staff = invoice.clinic.staff.filter(
            user_type__in=['staff', 'owner']
        ) if invoice.clinic else []
        
        staff_emails = [staff.email for staff in clinic_staff if staff.email]
        
        if staff_emails:
            staff_email = EmailMessage(
                subject=f"New Invoice Created - {invoice.invoice_number}",
                body=staff_html,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=staff_emails,
            )
            staff_email.content_subtype = 'html'
            staff_email.attach_file(pdf_path, mimetype='application/pdf')
            staff_email.send()
            
            results['staff_sent'] = True
    except Exception as e:
        results['errors'].append(f"Staff email failed: {str(e)}")
    
    # Update invoice sent_at timestamp
    if results['patient_sent']:
        invoice.sent_at = timezone.now()
        invoice.save()
    
    return results
```

---

## 8. Frontend Implementation

### Component Structure
```
frontend/
├── app/
│   ├── owner/
│   │   └── appointments/
│   │       └── page.tsx (Add create invoice button)
│   ├── staff/
│   │   └── appointments/
│   │       └── page.tsx (Add create invoice button)
│   └── patient/
│       └── billing/
│           └── page.tsx (Display invoices and balance)
├── components/
│   ├── create-invoice-modal.tsx (Main modal component)
│   ├── invoice-step1-service.tsx
│   ├── invoice-step2-items.tsx
│   ├── invoice-step3-review.tsx
│   ├── invoice-success-modal.tsx
│   ├── invoice-item-selector.tsx
│   ├── invoice-item-card.tsx
│   └── invoice-pdf-viewer.tsx
└── lib/
    └── invoice-utils.ts (Utility functions)
```

### Main Invoice Modal Component
```tsx
// components/create-invoice-modal.tsx
interface CreateInvoiceModalProps {
  appointment: Appointment
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateInvoiceModal({ 
  appointment, 
  isOpen, 
  onClose, 
  onSuccess 
}: CreateInvoiceModalProps) {
  const [step, setStep] = useState(1)
  const [invoiceData, setInvoiceData] = useState({
    appointment_id: appointment.id,
    service_charge: appointment.service?.price || 0,
    items: [],
    due_days: 7,
    notes: '',
    send_email: true
  })
  
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Step navigation functions
  const goToStep2 = () => setStep(2)
  const goToStep3 = () => setStep(3)
  const goBackToStep1 = () => setStep(1)
  const goBackToStep2 = () => setStep(2)
  
  // Calculate totals
  const calculateTotals = () => {
    const itemsSubtotal = invoiceData.items.reduce(
      (sum, item) => sum + (item.quantity * item.unit_price), 
      0
    )
    const subtotal = invoiceData.service_charge + itemsSubtotal
    const interestAmount = (subtotal * 0.10 * invoiceData.due_days) / 365
    const totalDue = subtotal + interestAmount
    
    return {
      itemsSubtotal,
      subtotal,
      interestAmount,
      totalDue
    }
  }
  
  // Submit invoice
  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const response = await api.createInvoice(invoiceData, token)
      
      setShowConfirmation(false)
      setShowSuccess(true)
      
      // Auto-close success modal after 5 seconds
      setTimeout(() => {
        setShowSuccess(false)
        onSuccess()
        onClose()
      }, 5000)
      
    } catch (error) {
      console.error('Failed to create invoice:', error)
      alert('Failed to create invoice. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <>
      {/* Main Modal */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>1</div>
              <div className="w-16 h-1 bg-gray-200">
                <div className={`h-full transition-all ${step >= 2 ? 'bg-green-600' : 'bg-gray-200'}`} />
              </div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>2</div>
              <div className="w-16 h-1 bg-gray-200">
                <div className={`h-full transition-all ${step >= 3 ? 'bg-green-600' : 'bg-gray-200'}`} />
              </div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>3</div>
            </div>
          </div>
          
          {/* Step Content */}
          {step === 1 && (
            <InvoiceStep1Service
              appointment={appointment}
              serviceCharge={invoiceData.service_charge}
              onServiceChargeChange={(charge) => 
                setInvoiceData({ ...invoiceData, service_charge: charge })
              }
              onNext={goToStep2}
              onCancel={onClose}
            />
          )}
          
          {step === 2 && (
            <InvoiceStep2Items
              items={invoiceData.items}
              onItemsChange={(items) => 
                setInvoiceData({ ...invoiceData, items })
              }
              totals={calculateTotals()}
              onBack={goBackToStep1}
              onNext={goToStep3}
            />
          )}
          
          {step === 3 && (
            <InvoiceStep3Review
              appointment={appointment}
              invoiceData={invoiceData}
              totals={calculateTotals()}
              onBack={goBackToStep2}
              onConfirm={() => setShowConfirmation(true)}
              onNotesChange={(notes) => 
                setInvoiceData({ ...invoiceData, notes })
              }
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleSubmit}
        isSubmitting={isSubmitting}
        totals={calculateTotals()}
      />
      
      {/* Success Modal */}
      <InvoiceSuccessModal
        isOpen={showSuccess}
        onClose={() => {
          setShowSuccess(false)
          onSuccess()
          onClose()
        }}
      />
    </>
  )
}
```

### API Integration
```typescript
// lib/api.ts - Add invoice endpoints

export const api = {
  // ... existing endpoints
  
  // Create invoice
  createInvoice: async (data: InvoiceCreateData, token: string) => {
    const response = await fetch(`${API_BASE_URL}/invoices/create/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create invoice')
    return response.json()
  },
  
  // Get patient invoices
  getPatientInvoices: async (patientId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/invoices/?patient_id=${patientId}`, {
      headers: { 'Authorization': `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch invoices')
    const data = await response.json()
    return Array.isArray(data) ? data : (data?.results || [])
  },
  
  // Get patient balance
  getPatientBalance: async (patientId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/invoices/patient_balance/${patientId}/`, {
      headers: { 'Authorization': `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch patient balance')
    return response.json()
  },
  
  // Download invoice PDF
  downloadInvoicePDF: async (invoiceId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/generate_pdf/`, {
      method: 'POST',
      headers: { 'Authorization': `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to generate PDF')
    return response.json()
  },
}
```

---

## 9. Testing Checklist

### Frontend Testing
- [ ] Modal opens correctly from appointment details
- [ ] Step 1: Service charge is pre-filled from appointment
- [ ] Step 1: Service charge can be edited
- [ ] Step 1: Validation prevents negative or extremely high amounts
- [ ] Step 2: Inventory items load correctly
- [ ] Step 2: Search and filter work
- [ ] Step 2: Can add items with confirmation
- [ ] Step 2: Quantity controls work (increase/decrease)
- [ ] Step 2: Cannot exceed available stock
- [ ] Step 2: Can edit item quantity and price
- [ ] Step 2: Can remove items with confirmation
- [ ] Step 2: Real-time total calculation works
- [ ] Step 3: All details display correctly
- [ ] Step 3: Can add optional notes
- [ ] Step 3: Email checkboxes toggle correctly
- [ ] Final confirmation shows correct amounts
- [ ] Success modal displays after creation
- [ ] Can close modal at any step

### Backend Testing
- [ ] Invoice numbers generate sequentially
- [ ] Reference numbers are unique
- [ ] Interest calculation is correct
- [ ] Inventory stock is deducted after invoice creation
- [ ] Patient balance updates correctly
- [ ] Cannot create duplicate invoices for same appointment
- [ ] PDF generates correctly with all data
- [ ] PDF file is saved to media directory
- [ ] Email sends to patient
- [ ] Email sends to staff
- [ ] Email attachments work
- [ ] API returns proper error messages

### Integration Testing
- [ ] Complete end-to-end invoice creation flow
- [ ] Patient receives email with correct PDF
- [ ] Staff receives email with correct PDF
- [ ] Patient balance reflects in patient portal
- [ ] Appointment shows as "invoiced"
- [ ] PDF can be downloaded from success modal
- [ ] Multiple invoices can be created for different appointments
- [ ] System handles network errors gracefully

### Edge Cases
- [ ] Creating invoice with zero items
- [ ] Creating invoice with very high quantities
- [ ] Creating invoice when inventory is low
- [ ] Creating invoice with special characters in notes
- [ ] Email failure doesn't prevent invoice creation
- [ ] PDF generation failure shows error message
- [ ] Multiple users creating invoices simultaneously

---

## 10. Implementation Timeline

### Phase 1: Backend Foundation (Week 1)
- Day 1-2: Create Invoice and InvoiceItem models
- Day 3: Create API endpoints (create, list, retrieve)
- Day 4: Implement invoice number generation
- Day 5: Implement calculation logic
- Day 6-7: Write unit tests

### Phase 2: PDF Generation (Week 2)
- Day 1-2: Set up weasyprint/reportlab
- Day 3-4: Create HTML template
- Day 5: Implement PDF generation function
- Day 6-7: Test various invoice scenarios

### Phase 3: Email System (Week 2)
- Day 1-2: Create email templates
- Day 3: Implement email sending function
- Day 4: Test email delivery
- Day 5: Handle email failures gracefully

### Phase 4: Frontend UI (Week 3)
- Day 1-2: Create modal component structure
- Day 3: Implement Step 1 (Service Review)
- Day 4-5: Implement Step 2 (Item Selection)
- Day 6-7: Implement Step 3 (Review & Confirm)

### Phase 5: Integration & Testing (Week 4)
- Day 1-2: Integrate frontend with backend
- Day 3-4: End-to-end testing
- Day 5: Fix bugs and edge cases
- Day 6-7: User acceptance testing

---

## 11. Future Enhancements

### Phase 2 Features
1. **Payment Recording**
   - Add payment recording modal
   - Track partial payments
   - Update invoice status automatically
   - Payment history

2. **Invoice Editing**
   - Allow editing draft invoices
   - Void/cancel invoices
   - Issue credit notes

3. **Automated Reminders**
   - Send reminder emails before due date
   - Send overdue notices
   - Escalation for long-overdue invoices

4. **Reporting**
   - Revenue reports by service
   - Outstanding balance reports
   - Payment collection rates
   - Aging reports

5. **Patient Portal Enhancements**
   - Online payment integration (PayMongo)
   - View invoice history
   - Download PDF copies
   - Print invoices

6. **Multi-Currency Support**
   - Support PHP, USD, etc.
   - Exchange rate conversion
   - Currency display preferences

---

## 12. Security Considerations

### Access Control
- Only staff and owner roles can create invoices
- Patients can only view their own invoices
- Invoice editing requires owner permission
- Audit log for all invoice modifications

### Data Validation
- Validate all monetary amounts
- Prevent SQL injection in notes field
- Sanitize PDF generation inputs
- Validate email addresses before sending

### File Security
- Store PDFs in protected media directory
- Generate unique filenames
- Set proper file permissions
- Implement PDF download authentication

---

## 13. Success Metrics

### Key Performance Indicators
1. **Efficiency**
   - Average time to create invoice: < 2 minutes
   - PDF generation time: < 5 seconds
   - Email delivery rate: > 95%

2. **Accuracy**
   - Calculation errors: 0%
   - Duplicate invoices: 0%
   - Stock discrepancies: 0%

3. **User Satisfaction**
   - Staff adoption rate: > 90%
   - Patient portal usage: > 70%
   - Error reports: < 5 per month

---

## IMPLEMENTATION PROMPT FOR LLM

When implementing this invoice generation system, follow these guidelines:

### For Backend Development:
1. Create models first, then run migrations
2. Implement business logic functions separately from API views
3. Use Django's built-in decimal handling for financial calculations
4. Test calculation logic with unit tests before integration
5. Handle all exceptions gracefully with meaningful error messages
6. Log all invoice creation events for audit trail

### For PDF Generation:
1. Start with HTML template, ensure it renders correctly in browser
2. Test with sample data before connecting to real data
3. Handle missing data with sensible defaults
4. Optimize for A4 page size with proper margins
5. Test printing from PDF viewers

### For Email System:
1. Use Django's email backend abstraction
2. Create plain text fallback for HTML emails
3. Test with real email addresses in development
4. Handle bounce-backs and delivery failures
5. Never expose email addresses in logs

### For Frontend Components:
1. Build components in isolation first (Storybook recommended)
2. Implement state management clearly
3. Add loading states for all async operations
4. Provide clear error messages to users
5. Make forms keyboard-accessible
6. Add confirmation dialogs for destructive actions

### Error Handling Priorities:
1. Network failures: Show retry option
2. Validation errors: Highlight fields clearly
3. Stock shortages: Suggest alternatives
4. Email failures: Still create invoice, show warning
5. PDF failures: Allow manual download attempt

### Testing Strategy:
1. Write backend tests first (models, calculations)
2. Test API endpoints with various payloads
3. Test frontend components with mock data
4. End-to-end test full user journey
5. Test email delivery in staging environment

This plan provides a comprehensive, structured approach to implementing the invoice generation feature following LLM best practices for clarity, specificity, and actionability.
