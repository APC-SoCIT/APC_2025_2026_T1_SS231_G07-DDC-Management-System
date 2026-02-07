"""
Invoice Generation Utility Functions
Handles invoice number generation, calculations, and inventory updates
"""
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone


def generate_invoice_number():
    """
    Generate unique invoice number in format: INV-YYYY-MM-NNNN
    Example: INV-2026-02-0001
    
    Returns:
        str: Unique invoice number
    """
    from api.models import Invoice
    
    today = date.today()
    prefix = f"INV-{today.year}-{today.month:02d}"
    
    # Get last invoice for this month
    last_invoice = Invoice.objects.filter(
        invoice_number__startswith=prefix
    ).order_by('-invoice_number').first()
    
    if last_invoice:
        # Extract the last number and increment
        last_num = int(last_invoice.invoice_number.split('-')[-1])
        new_num = last_num + 1
    else:
        # First invoice of the month
        new_num = 1
    
    return f"{prefix}-{new_num:04d}"


def generate_reference_number():
    """
    Generate unique reference number in format: REF-NNNN
    Example: REF-0816
    
    Returns:
        str: Unique reference number
    """
    from api.models import Invoice
    
    # Get last reference number across all invoices
    last_invoice = Invoice.objects.order_by('-reference_number').first()
    
    if last_invoice and last_invoice.reference_number:
        try:
            # Extract the last number and increment
            last_num = int(last_invoice.reference_number.split('-')[-1])
            new_num = last_num + 1
        except (ValueError, IndexError):
            # If parsing fails, start from 1
            new_num = 1
    else:
        # First invoice ever
        new_num = 1
    
    return f"REF-{new_num:04d}"


def calculate_invoice_totals(service_charge, items):
    """
    Calculate all invoice financial amounts
    
    Note: Interest is NOT charged on initial invoice creation.
    Interest may be applied later for overdue payments as a penalty.
    
    Args:
        service_charge (Decimal): Charge for the service performed
        items (list): List of dicts with 'quantity' and 'unit_price' keys
    
    Returns:
        dict: Dictionary containing all calculated amounts
            {
                "service_charge": Decimal,
                "items_subtotal": Decimal,
                "subtotal": Decimal,
                "total_due": Decimal,
                "balance": Decimal (initially equals total_due)
            }
    """
    # Calculate items subtotal
    items_subtotal = Decimal('0.00')
    for item in items:
        quantity = Decimal(str(item.get('quantity', 1)))
        unit_price = Decimal(str(item.get('unit_price', 0)))
        items_subtotal += quantity * unit_price
    
    # Calculate total (service + items)
    # No interest charged on initial invoice - interest only applies to overdue payments
    total_due = Decimal(str(service_charge)) + items_subtotal
    
    return {
        "service_charge": Decimal(str(service_charge)),
        "items_subtotal": items_subtotal,
        "subtotal": total_due,  # For consistency with model field
        "total_due": total_due,
        "balance": total_due,  # Initially, balance equals total_due
    }


def update_patient_balance(patient_id, invoice_amount, operation='add'):
    """
    Update or create patient balance record
    
    Args:
        patient_id (int): ID of the patient
        invoice_amount (Decimal): Amount to add or subtract
        operation (str): 'add' to add invoice, 'subtract' to remove invoice
    
    Returns:
        PatientBalance: Updated or created patient balance instance
    """
    from api.models import PatientBalance, User
    
    patient = User.objects.get(id=patient_id)
    
    # Get or create patient balance record
    balance, created = PatientBalance.objects.get_or_create(
        patient=patient,
        defaults={
            'total_invoiced': Decimal('0.00'),
            'total_paid': Decimal('0.00'),
            'current_balance': Decimal('0.00'),
        }
    )
    
    invoice_amount = Decimal(str(invoice_amount))
    
    if operation == 'add':
        # Adding a new invoice
        balance.total_invoiced += invoice_amount
        balance.current_balance += invoice_amount
        balance.last_invoice_date = date.today()
    elif operation == 'subtract':
        # Removing/cancelling an invoice
        balance.total_invoiced -= invoice_amount
        balance.current_balance -= invoice_amount
        # Note: We don't update last_invoice_date when removing
    
    balance.save()
    return balance


def record_payment(patient_id, payment_amount):
    """
    Record a payment from patient and update their balance
    
    Args:
        patient_id (int): ID of the patient
        payment_amount (Decimal): Amount paid by patient
    
    Returns:
        PatientBalance: Updated patient balance instance
    """
    from api.models import PatientBalance, User
    
    patient = User.objects.get(id=patient_id)
    
    # Get or create patient balance record
    balance, created = PatientBalance.objects.get_or_create(
        patient=patient,
        defaults={
            'total_invoiced': Decimal('0.00'),
            'total_paid': Decimal('0.00'),
            'current_balance': Decimal('0.00'),
        }
    )
    
    payment_amount = Decimal(str(payment_amount))
    
    # Update paid amount and balance
    balance.total_paid += payment_amount
    balance.current_balance -= payment_amount
    balance.last_payment_date = date.today()
    
    balance.save()
    return balance


def deduct_inventory_items(invoice_items_data):
    """
    Deduct quantities from inventory after invoice confirmation
    
    Args:
        invoice_items_data (list): List of dicts with 'inventory_item_id' and 'quantity'
    
    Raises:
        ValueError: If inventory item not found or insufficient stock
    
    Returns:
        list: List of updated InventoryItem instances
    """
    from api.models import InventoryItem
    
    updated_items = []
    
    for item_data in invoice_items_data:
        inventory_item_id = item_data.get('inventory_item_id')
        quantity = item_data.get('quantity', 1)
        
        if not inventory_item_id:
            continue  # Skip if no inventory item reference
        
        try:
            inventory_item = InventoryItem.objects.get(id=inventory_item_id)
        except InventoryItem.DoesNotExist:
            raise ValueError(f"Inventory item with ID {inventory_item_id} not found")
        
        # Check if sufficient stock
        if inventory_item.quantity < quantity:
            raise ValueError(
                f"Insufficient stock for {inventory_item.name}. "
                f"Available: {inventory_item.quantity}, Required: {quantity}"
            )
        
        # Deduct quantity
        inventory_item.quantity -= quantity
        inventory_item.save()
        
        updated_items.append(inventory_item)
    
    return updated_items


def calculate_due_date(invoice_date=None, days_until_due=7):
    """
    Calculate due date for an invoice
    
    Args:
        invoice_date (date): Invoice date (defaults to today)
        days_until_due (int): Number of days until payment due (default 7)
    
    Returns:
        date: Due date
    """
    if invoice_date is None:
        invoice_date = date.today()
    
    due_date = invoice_date + timedelta(days=days_until_due)
    return due_date


def check_overdue_invoices():
    """
    Check for overdue invoices and update their status
    
    Returns:
        int: Number of invoices marked as overdue
    """
    from api.models import Invoice
    
    today = date.today()
    
    # Find sent invoices that are past due date
    overdue_invoices = Invoice.objects.filter(
        status='sent',
        due_date__lt=today
    )
    
    count = overdue_invoices.update(status='overdue')
    return count


def calculate_late_payment_interest(invoice_amount, days_overdue, annual_rate=Decimal('10.00')):
    """
    Calculate interest for overdue invoices (for future implementation)
    
    This function is NOT used for initial invoice creation.
    It's for calculating penalties on overdue payments.
    
    Args:
        invoice_amount (Decimal): Original invoice amount
        days_overdue (int): Number of days past due date
        annual_rate (Decimal): Annual interest rate percentage (default 10%)
    
    Returns:
        Decimal: Interest amount to be charged
    
    Example:
        >>> calculate_late_payment_interest(Decimal('1000.00'), 30, Decimal('10.00'))
        Decimal('8.22')  # approximately ₱1000 * 10% * 30/365
    """
    if days_overdue <= 0:
        return Decimal('0.00')
    
    interest_rate_decimal = Decimal(str(annual_rate)) / Decimal('100')
    interest_amount = (
        Decimal(str(invoice_amount)) * 
        interest_rate_decimal * 
        Decimal(str(days_overdue))
    ) / Decimal('365')
    
    return interest_amount.quantize(Decimal('0.01'))
