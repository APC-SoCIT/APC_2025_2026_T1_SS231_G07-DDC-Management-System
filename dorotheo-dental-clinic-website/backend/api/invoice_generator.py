"""
Invoice PDF Generation Module
Handles the creation of PDF invoices from HTML templates.
"""
from django.template.loader import render_to_string
from django.conf import settings
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Try to import WeasyPrint, but don't fail if it's not available (e.g., on Windows without GTK)
try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except Exception as e:
    WEASYPRINT_AVAILABLE = False
    print(f"WeasyPrint not available: {str(e)}. PDF generation will be disabled.")


def generate_invoice_pdf(invoice):
    """
    Generate a PDF invoice from the invoice object.
    
    Args:
        invoice: Invoice model instance
        
    Returns:
        tuple: (pdf_content, filename) where pdf_content is bytes and filename is str
        
    Raises:
        RuntimeError: If WeasyPrint is not available
    """
    if not WEASYPRINT_AVAILABLE:
        raise RuntimeError(
            "PDF generation is not available. WeasyPrint requires GTK libraries which are not installed. "
            "On Windows, you need to install GTK for Windows. See: https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#windows"
        )
    
    # Prepare items data for the template
    invoice_items = []
    for item in invoice.items.all():
        invoice_items.append({
            'item_name': item.item_name,
            'quantity': item.quantity,
            'unit_price': f"{item.unit_price:,.2f}",
            'total_price': f"{item.total_price:,.2f}"
        })
    
    # Get patient balance
    patient_balance = 0
    if hasattr(invoice.patient, 'balance_record'):
        patient_balance = invoice.patient.balance_record.current_balance
    
    # Prepare context for template
    context = {
        'invoice_number': invoice.invoice_number,
        'reference_number': invoice.reference_number,
        'invoice_date': invoice.invoice_date.strftime('%B %d, %Y'),
        'due_date': invoice.due_date.strftime('%B %d, %Y'),
        
        # Patient information
        'patient_name': f"{invoice.patient.first_name} {invoice.patient.last_name}",
        'patient_email': invoice.patient.email,
        'patient_phone': getattr(invoice.patient, 'phone', 'N/A'),
        
        # Appointment information
        'appointment_date': invoice.appointment.date.strftime('%B %d, %Y'),
        'appointment_time': invoice.appointment.time.strftime('%I:%M %p'),
        'service_name': invoice.appointment.service.name,
        'dentist_name': f"{invoice.appointment.dentist.first_name} {invoice.appointment.dentist.last_name}",
        
        # Financial information
        'service_charge': f"{invoice.service_charge:,.2f}",
        'items_subtotal': f"{invoice.items_subtotal:,.2f}",
        'subtotal': f"{invoice.subtotal:,.2f}",
        'discount_amount': "0.00",
        'interest_amount': f"{invoice.interest_amount:,.2f}",
        'total_due': f"{invoice.total_due:,.2f}",
        'total_paid': f"{invoice.amount_paid:,.2f}",
        'balance': f"{invoice.balance:,.2f}",
        'patient_balance': f"{patient_balance:,.2f}",
        
        # Items
        'invoice_items': invoice_items,
        'has_items': len(invoice_items) > 0,
        
        # Clinic information
        'clinic_name': invoice.clinic.name,
        'clinic_address': invoice.clinic.address,
        'clinic_email': getattr(invoice.clinic, 'email', 'N/A'),
        'clinic_phone': invoice.clinic.phone,
        
        # Notes
        'notes': invoice.notes or '',
        
        # Current date for generation timestamp
        'generated_date': datetime.now().strftime('%B %d, %Y at %I:%M %p'),
    }
    
    # Render HTML template
    html_string = render_to_string('invoice_template.html', context)
    
    # Generate PDF from HTML string
    # Note: WeasyPrint will render the HTML without external resources
    pdf_file = HTML(string=html_string).write_pdf()
    
    # Create filename
    filename = f"Invoice_{invoice.invoice_number.replace('/', '_')}.pdf"
    
    return pdf_file, filename


def save_invoice_pdf(invoice, save_path=None):
    """
    Generate and save invoice PDF to a file.
    
    Args:
        invoice: Invoice model instance
        save_path: Optional custom path to save the PDF. If None, saves to media/invoices/
        
    Returns:
        str: Path to the saved PDF file
    """
    # Generate PDF
    pdf_content, filename = generate_invoice_pdf(invoice)
    
    # Determine save path
    if save_path is None:
        # Use media directory
        invoices_dir = os.path.join(settings.MEDIA_ROOT, 'invoices', str(invoice.invoice_date.year))
        os.makedirs(invoices_dir, exist_ok=True)
        save_path = os.path.join(invoices_dir, filename)
    
    # Write PDF to file
    with open(save_path, 'wb') as f:
        f.write(pdf_content)
    
    return save_path


def get_invoice_pdf_path(invoice):
    """
    Get the expected path for an invoice PDF.
    
    Args:
        invoice: Invoice model instance
        
    Returns:
        str: Expected file path for the invoice PDF
    """
    filename = f"Invoice_{invoice.invoice_number.replace('/', '_')}.pdf"
    return os.path.join(settings.MEDIA_ROOT, 'invoices', str(invoice.invoice_date.year), filename)
