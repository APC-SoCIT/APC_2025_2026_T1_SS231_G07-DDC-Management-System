"""
fix_payment_clinics.py
Backfills / corrects the clinic field on Payment records by deriving it
from the first invoice the payment was allocated to (via PaymentSplit).

This is more reliable than the recording user's assigned_clinic because the
invoice is always scoped to the clinic where the service was rendered.

Run with:  python fix_payment_clinics.py
"""

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import Payment, PaymentSplit

fixed = 0
already_correct = 0
skipped = 0

for payment in Payment.objects.prefetch_related('splits__invoice__clinic'):
    # Find the clinic from the first allocated invoice
    first_split = payment.splits.select_related('invoice__clinic').order_by('id').first()
    if first_split and first_split.invoice and first_split.invoice.clinic:
        invoice_clinic = first_split.invoice.clinic
        if payment.clinic != invoice_clinic:
            old_clinic = payment.clinic.name if payment.clinic else 'None'
            payment.clinic = invoice_clinic
            payment.save(update_fields=['clinic'])
            print(f"  Fixed {payment.payment_number}: {old_clinic} -> {invoice_clinic.name}")
            fixed += 1
        else:
            already_correct += 1
    else:
        print(f"  Skipped {payment.payment_number} (no invoice clinic found – may be an unallocated payment)")
        skipped += 1

print(f"\nDone: {fixed} fixed, {already_correct} already correct, {skipped} skipped.")
