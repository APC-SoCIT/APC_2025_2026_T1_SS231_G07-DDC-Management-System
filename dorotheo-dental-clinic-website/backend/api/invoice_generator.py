"""
Invoice PDF Generation Module
Handles the creation of PDF invoices from HTML templates.
Supports WeasyPrint (preferred) with xhtml2pdf as fallback.
"""
from django.template.loader import render_to_string
from django.conf import settings
import os
import logging
from datetime import datetime
from io import BytesIO

logger = logging.getLogger(__name__)

# Try to import WeasyPrint first (preferred, but requires GTK)
WEASYPRINT_AVAILABLE = False
try:
    from weasyprint import HTML as WeasyHTML
    WEASYPRINT_AVAILABLE = True
    logger.info("WeasyPrint is available for PDF generation")
except Exception as e:
    logger.warning(f"WeasyPrint not available: {str(e)}. Will try xhtml2pdf fallback.")

# Try xhtml2pdf as fallback (pure Python, no native deps)
XHTML2PDF_AVAILABLE = False
try:
    from xhtml2pdf import pisa
    XHTML2PDF_AVAILABLE = True
    logger.info("xhtml2pdf is available as PDF fallback")
except Exception as e:
    logger.warning(f"xhtml2pdf not available: {str(e)}.")

# At least one PDF engine must be available
PDF_AVAILABLE = WEASYPRINT_AVAILABLE or XHTML2PDF_AVAILABLE
if not PDF_AVAILABLE:
    print("WARNING: No PDF generation library available. Neither WeasyPrint nor xhtml2pdf could be imported.")


def _generate_pdf_weasyprint(html_string):
    """Generate PDF using WeasyPrint."""
    html_document = WeasyHTML(string=html_string)
    return html_document.write_pdf()


def _generate_pdf_xhtml2pdf(html_string):
    """Generate PDF using xhtml2pdf (fallback)."""
    result_buffer = BytesIO()
    pisa_status = pisa.CreatePDF(html_string, dest=result_buffer)
    if pisa_status.err:
        raise RuntimeError(f"xhtml2pdf encountered {pisa_status.err} errors during PDF generation")
    return result_buffer.getvalue()


def generate_invoice_pdf(invoice):
    """
    Generate a PDF invoice from the invoice object.
    Uses WeasyPrint if available, falls back to xhtml2pdf.
    
    Args:
        invoice: Invoice model instance
        
    Returns:
        tuple: (pdf_content, filename) where pdf_content is bytes and filename is str
        
    Raises:
        RuntimeError: If no PDF generation library is available
    """
    if not PDF_AVAILABLE:
        raise RuntimeError(
            "PDF generation is not available. Neither WeasyPrint nor xhtml2pdf could be imported. "
            "Install xhtml2pdf (pip install xhtml2pdf) for a pure-Python fallback."
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
    
    # Generate PDF from HTML string using available engine
    pdf_file = None
    try:
        if WEASYPRINT_AVAILABLE:
            logger.info("Generating PDF with WeasyPrint")
            pdf_file = _generate_pdf_weasyprint(html_string)
        elif XHTML2PDF_AVAILABLE:
            logger.info("Generating PDF with xhtml2pdf (fallback)")
            pdf_file = _generate_pdf_xhtml2pdf(html_string)
    except Exception as e:
        # If WeasyPrint fails at runtime, try xhtml2pdf fallback
        if WEASYPRINT_AVAILABLE and XHTML2PDF_AVAILABLE:
            logger.warning(f"WeasyPrint failed ({type(e).__name__}: {str(e)}), falling back to xhtml2pdf")
            try:
                pdf_file = _generate_pdf_xhtml2pdf(html_string)
            except Exception as e2:
                logger.error(f"Both PDF engines failed. xhtml2pdf error: {type(e2).__name__}: {str(e2)}")
                import traceback
                logger.error(f"Full traceback: {traceback.format_exc()}")
                raise
        else:
            logger.error(f"PDF generation failed: {type(e).__name__}: {str(e)}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            raise
    
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
