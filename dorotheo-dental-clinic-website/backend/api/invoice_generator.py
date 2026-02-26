"""
Invoice PDF Generation Module
Generates professional PDF invoices using ReportLab (pure Python, no native deps).
"""
from django.conf import settings
import os
import logging
from datetime import datetime
from io import BytesIO
from decimal import Decimal

logger = logging.getLogger(__name__)

# ReportLab is a pure-Python PDF library — no GTK or system deps required
PDF_AVAILABLE = False
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm, cm
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
    from reportlab.platypus import (
        SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable,
    )
    PDF_AVAILABLE = True
    logger.info("ReportLab is available for PDF generation")
except ImportError as e:
    logger.error(f"ReportLab not available: {e}. Install with: pip install reportlab")


# ─── Brand colours ──────────────────────────────────────────────────────
BRAND_GREEN = colors.HexColor("#2d5a3f")
BRAND_GREEN_LIGHT = colors.HexColor("#f0f4f0")
LIGHT_GREY = colors.HexColor("#f9f9f9")
BORDER_GREY = colors.HexColor("#dddddd")
TEXT_DARK = colors.HexColor("#333333")
TEXT_MUTED = colors.HexColor("#666666")
PESO_SIGN = "\u20B1"  # ₱


# ─── Helpers ────────────────────────────────────────────────────────────

def _safe(value, fallback="N/A"):
    """Return *value* if truthy, else *fallback*."""
    return value if value else fallback


def _peso(amount):
    """Format a Decimal / float as ₱1,234.56"""
    try:
        return f"{PESO_SIGN}{amount:,.2f}"
    except (TypeError, ValueError):
        return f"{PESO_SIGN}0.00"


def _build_styles():
    """Return a dict of ParagraphStyles used throughout the invoice."""
    ss = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "InvTitle", parent=ss["Title"],
            fontSize=22, leading=26, textColor=BRAND_GREEN,
            spaceAfter=4, alignment=TA_CENTER,
        ),
        "heading": ParagraphStyle(
            "InvHeading", parent=ss["Heading2"],
            fontSize=12, leading=15, textColor=BRAND_GREEN,
            spaceBefore=14, spaceAfter=6,
        ),
        "normal": ParagraphStyle(
            "InvNormal", parent=ss["Normal"],
            fontSize=9, leading=13, textColor=TEXT_DARK,
        ),
        "normal_right": ParagraphStyle(
            "InvNormalRight", parent=ss["Normal"],
            fontSize=9, leading=13, textColor=TEXT_DARK, alignment=TA_RIGHT,
        ),
        "label": ParagraphStyle(
            "InvLabel", parent=ss["Normal"],
            fontSize=8, leading=11, textColor=TEXT_MUTED,
        ),
        "bold": ParagraphStyle(
            "InvBold", parent=ss["Normal"],
            fontSize=9, leading=13, textColor=TEXT_DARK,
            fontName="Helvetica-Bold",
        ),
        "bold_right": ParagraphStyle(
            "InvBoldRight", parent=ss["Normal"],
            fontSize=9, leading=13, textColor=TEXT_DARK,
            fontName="Helvetica-Bold", alignment=TA_RIGHT,
        ),
        "total": ParagraphStyle(
            "InvTotal", parent=ss["Normal"],
            fontSize=13, leading=17, textColor=BRAND_GREEN,
            fontName="Helvetica-Bold", alignment=TA_RIGHT,
        ),
        "small_italic": ParagraphStyle(
            "InvSmall", parent=ss["Normal"],
            fontSize=7.5, leading=10, textColor=TEXT_MUTED,
            fontName="Helvetica-Oblique",
        ),
        "footer": ParagraphStyle(
            "InvFooter", parent=ss["Normal"],
            fontSize=7, leading=9, textColor=TEXT_MUTED, alignment=TA_CENTER,
        ),
    }


# ─── Main Generator ────────────────────────────────────────────────────

def generate_invoice_pdf(invoice):
    """
    Build a professional PDF Statement of Account using ReportLab.

    Args:
        invoice: Invoice model instance (with related patient, appointment, clinic, items)

    Returns:
        tuple: (pdf_bytes, filename)

    Raises:
        RuntimeError: if ReportLab is not installed
    """
    if not PDF_AVAILABLE:
        raise RuntimeError(
            "PDF generation is not available. Install reportlab: pip install reportlab"
        )

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=1.5 * cm, bottomMargin=2 * cm,
        title=f"Invoice {invoice.invoice_number}",
        author="Dorotheo Dental Clinic",
    )

    S = _build_styles()
    elements = []
    page_width = A4[0] - 4 * cm  # usable width

    # ── Title ───────────────────────────────────────────────────────
    elements.append(Paragraph("STATEMENT OF ACCOUNT", S["title"]))
    elements.append(Spacer(1, 4 * mm))

    # ── Clinic / Patient header (two-column) ────────────────────────
    patient = invoice.patient
    clinic = invoice.clinic
    appointment = invoice.appointment

    patient_address_parts = filter(None, [
        getattr(patient, 'address_street', ''),
        getattr(patient, 'address_barangay', ''),
        getattr(patient, 'address_city', ''),
        getattr(patient, 'address_province', ''),
        getattr(patient, 'address_zip', ''),
    ])
    patient_address = ", ".join(patient_address_parts) or "N/A"

    left_col = (
        f"<b>Bill To:</b><br/>"
        f"{_safe(patient.get_full_name())}<br/>"
        f"{patient_address}<br/>"
        f"Email: {_safe(patient.email)}<br/>"
        f"Phone: {_safe(getattr(patient, 'phone', ''))}"
    )

    clinic_name = _safe(getattr(clinic, 'name', ''), 'Dorotheo Dental Clinic')
    clinic_address = _safe(getattr(clinic, 'address', ''))
    clinic_phone = _safe(getattr(clinic, 'phone', ''))

    right_col = (
        f"<b>{clinic_name}</b><br/>"
        f"{clinic_address}<br/>"
        f"Phone: {clinic_phone}"
    )

    header_table = Table(
        [[Paragraph(left_col, S["normal"]), Paragraph(right_col, S["normal_right"])]],
        colWidths=[page_width * 0.55, page_width * 0.45],
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 6 * mm))

    # ── Invoice meta (number, date, due date, reference) ────────────
    elements.append(HRFlowable(width="100%", thickness=2, color=BRAND_GREEN, spaceAfter=4 * mm))

    meta_data = [
        [
            Paragraph(f"<b>Invoice #:</b> {invoice.invoice_number}", S["normal"]),
            Paragraph(f"<b>Reference:</b> {invoice.reference_number}", S["normal_right"]),
        ],
        [
            Paragraph(f"<b>Date:</b> {invoice.invoice_date.strftime('%B %d, %Y')}", S["normal"]),
            Paragraph(f"<b>Due Date:</b> {invoice.due_date.strftime('%B %d, %Y')}", S["normal_right"]),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[page_width * 0.5, page_width * 0.5])
    meta_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(meta_table)
    elements.append(HRFlowable(width="100%", thickness=2, color=BRAND_GREEN, spaceBefore=4 * mm, spaceAfter=6 * mm))

    # ── Appointment details ─────────────────────────────────────────
    service_name = "N/A"
    dentist_name = "N/A"
    appt_date_str = "N/A"
    appt_time_str = ""

    if appointment:
        appt_date_str = appointment.date.strftime('%B %d, %Y') if appointment.date else "N/A"
        appt_time_str = appointment.time.strftime('%I:%M %p') if appointment.time else ""
        if appointment.service:
            service_name = appointment.service.name
        if appointment.dentist:
            dentist_name = appointment.dentist.get_full_name()

    elements.append(Paragraph("Appointment Details", S["heading"]))
    appt_info = [
        [Paragraph("<b>Date:</b>", S["normal"]), Paragraph(f"{appt_date_str}  {appt_time_str}", S["normal"])],
        [Paragraph("<b>Service:</b>", S["normal"]), Paragraph(service_name, S["normal"])],
        [Paragraph("<b>Dentist:</b>", S["normal"]), Paragraph(dentist_name, S["normal"])],
    ]
    appt_table = Table(appt_info, colWidths=[page_width * 0.2, page_width * 0.8])
    appt_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    elements.append(appt_table)
    elements.append(Spacer(1, 4 * mm))

    # ── Line-items table ────────────────────────────────────────────
    elements.append(Paragraph("Charges", S["heading"]))

    col_widths = [page_width * 0.12, page_width * 0.13, page_width * 0.40, page_width * 0.17, page_width * 0.18]

    table_header = [
        Paragraph("<b>Date</b>", S["bold"]),
        Paragraph("<b>Ref.</b>", S["bold"]),
        Paragraph("<b>Description</b>", S["bold"]),
        Paragraph("<b>Amount</b>", S["bold_right"]),
        Paragraph("<b>Payment</b>", S["bold_right"]),
    ]

    rows = [table_header]

    # Service row
    rows.append([
        Paragraph(appt_date_str, S["normal"]),
        Paragraph(invoice.invoice_number, S["normal"]),
        Paragraph(service_name, S["normal"]),
        Paragraph(_peso(invoice.service_charge), S["normal_right"]),
        Paragraph("", S["normal"]),
    ])

    # Invoice items
    invoice_items = list(invoice.items.all())
    for idx, item in enumerate(invoice_items, start=1):
        rows.append([
            Paragraph(appt_date_str, S["normal"]),
            Paragraph(f"ITEM-{idx}", S["normal"]),
            Paragraph(f"{item.item_name} (x{item.quantity})", S["normal"]),
            Paragraph(_peso(item.total_price), S["normal_right"]),
            Paragraph("", S["normal"]),
        ])

    items_table = Table(rows, colWidths=col_widths, repeatRows=1)

    # Build alternating-row style
    ts_cmds = [
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        # Grid
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_GREY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    for i in range(2, len(rows), 2):
        ts_cmds.append(("BACKGROUND", (0, i), (-1, i), LIGHT_GREY))

    items_table.setStyle(TableStyle(ts_cmds))
    elements.append(items_table)
    elements.append(Spacer(1, 4 * mm))

    # ── Totals ──────────────────────────────────────────────────────
    totals_rows = [
        [Paragraph("<b>Subtotal:</b>", S["bold_right"]), Paragraph(_peso(invoice.subtotal), S["normal_right"])],
    ]

    if invoice.interest_amount and invoice.interest_amount > 0:
        totals_rows.append([
            Paragraph("<b>Interest:</b>", S["bold_right"]),
            Paragraph(_peso(invoice.interest_amount), S["normal_right"]),
        ])

    totals_rows.append([
        Paragraph("<b>Total Due:</b>", S["bold_right"]),
        Paragraph(_peso(invoice.total_due), S["total"]),
    ])

    if invoice.amount_paid and invoice.amount_paid > 0:
        totals_rows.append([
            Paragraph("<b>Amount Paid:</b>", S["bold_right"]),
            Paragraph(_peso(invoice.amount_paid), S["normal_right"]),
        ])
        totals_rows.append([
            Paragraph("<b>Balance:</b>", S["bold_right"]),
            Paragraph(_peso(invoice.balance), S["total"]),
        ])

    totals_table = Table(
        totals_rows,
        colWidths=[page_width * 0.75, page_width * 0.25],
    )
    totals_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEABOVE", (0, -1), (-1, -1), 1.5, BRAND_GREEN),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 8 * mm))

    # ── Payment info box ────────────────────────────────────────────
    payment_instructions = getattr(invoice, 'payment_instructions', 'Please pay your overdue amount within 7 days')
    bank_account = getattr(invoice, 'bank_account', '12345678910')

    info_text = (
        f"<b>Thank you for your business!</b><br/><br/>"
        f"{payment_instructions}<br/>"
        f"<b>Payment due by:</b> {invoice.due_date.strftime('%B %d, %Y')}<br/>"
        f"<b>Bank Account No:</b> {bank_account}<br/><br/>"
        f"<i>Interest of 10% per annum may be charged on late payments</i>"
    )

    info_para = Paragraph(info_text, S["normal"])

    # Wrap in a coloured table cell to mimic the green-left-border box
    info_table = Table([[info_para]], colWidths=[page_width])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_GREEN_LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LINEBEFORE", (0, 0), (0, -1), 4, BRAND_GREEN),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 10 * mm))

    # ── Remittance slip ─────────────────────────────────────────────
    elements.append(HRFlowable(width="100%", thickness=1.5, color=BORDER_GREY, dash=[4, 4], spaceAfter=6 * mm))
    elements.append(Paragraph("Remittance", S["heading"]))

    remit_left = (
        f"<b>Customer:</b> {_safe(patient.get_full_name())}<br/><br/>"
        f"{clinic_name}<br/>"
        f"{clinic_address}"
    )
    remit_right = (
        f"<b>Invoice No:</b> {invoice.invoice_number}<br/>"
        f"<b>Amount Paid:</b> _______________<br/><br/>"
        f"<b>Total Paid:</b> _______________<br/><br/>"
        f"<b>Reference:</b> {invoice.reference_number}"
    )
    remit_table = Table(
        [[Paragraph(remit_left, S["normal"]), Paragraph(remit_right, S["normal_right"])]],
        colWidths=[page_width * 0.55, page_width * 0.45],
    )
    remit_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    elements.append(remit_table)
    elements.append(Spacer(1, 10 * mm))

    # ── Footer ──────────────────────────────────────────────────────
    generated_date = datetime.now().strftime('%B %d, %Y at %I:%M %p')
    elements.append(Paragraph(f"Generated on {generated_date}", S["footer"]))

    # ── Build ───────────────────────────────────────────────────────
    doc.build(elements)
    pdf_content = buf.getvalue()
    buf.close()

    filename = f"Invoice_{invoice.invoice_number.replace('/', '_')}.pdf"
    return pdf_content, filename


def save_invoice_pdf(invoice, save_path=None):
    """
    Generate and save invoice PDF to a file.

    Args:
        invoice: Invoice model instance
        save_path: Optional custom path to save the PDF. If None, saves to media/invoices/

    Returns:
        str: Path to the saved PDF file
    """
    pdf_content, filename = generate_invoice_pdf(invoice)

    if save_path is None:
        invoices_dir = os.path.join(settings.MEDIA_ROOT, 'invoices', str(invoice.invoice_date.year))
        os.makedirs(invoices_dir, exist_ok=True)
        save_path = os.path.join(invoices_dir, filename)

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
