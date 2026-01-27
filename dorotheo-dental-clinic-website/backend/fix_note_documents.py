import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import Document

# Find all documents with type 'other' that have 'notes' or 'note' in their title
documents = Document.objects.filter(document_type='other')

updated_count = 0
for doc in documents:
    if doc.title and ('notes' in doc.title.lower() or 'note' in doc.title.lower()):
        doc.document_type = 'note'
        doc.save()
        updated_count += 1
        print(f"Updated: {doc.title} (ID: {doc.id}) from 'other' to 'note'")

print(f"\nTotal documents updated: {updated_count}")
