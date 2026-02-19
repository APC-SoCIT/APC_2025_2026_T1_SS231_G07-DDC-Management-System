"""
Management command to index page content for RAG.

Reads page/content data, splits into chunks, generates embeddings,
and stores in the PageChunk table. Supports re-indexing.

Usage:
    python manage.py index_pages               # Index all pages
    python manage.py index_pages --reindex      # Clear and re-index everything
    python manage.py index_pages --page=about   # Index a specific page only
    python manage.py index_pages --dry-run      # Preview without saving
"""

import time
import logging
from django.core.management.base import BaseCommand
from api.models import PageChunk, Service, ClinicLocation, User
from api.rag.embedding_service import generate_embedding
from django.db.models import Q

logger = logging.getLogger('rag.indexer')


# ── Chunk splitting ────────────────────────────────────────────────────────

def _estimate_tokens(text: str) -> int:
    return len(text) // 4


def _split_into_chunks(text: str, min_tokens=300, max_tokens=800):
    """
    Split text into chunks of min_tokens-max_tokens size.
    Tries to split on paragraph boundaries, then sentence boundaries.
    """
    if not text or not text.strip():
        return []

    text = text.strip()
    total_tokens = _estimate_tokens(text)

    # If text is already small enough, return as single chunk
    if total_tokens <= max_tokens:
        return [text]

    chunks = []
    paragraphs = text.split('\n\n')
    current_chunk = ''

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        candidate = f"{current_chunk}\n\n{para}" if current_chunk else para

        if _estimate_tokens(candidate) <= max_tokens:
            current_chunk = candidate
        else:
            # Current chunk is full, save it
            if current_chunk and _estimate_tokens(current_chunk) >= min_tokens:
                chunks.append(current_chunk.strip())
                current_chunk = para
            elif current_chunk:
                # Chunk too small, try to merge with next
                current_chunk = candidate
                if _estimate_tokens(current_chunk) >= max_tokens:
                    chunks.append(current_chunk.strip())
                    current_chunk = ''
            else:
                # Single paragraph is too large, split by sentences
                sentences = para.replace('. ', '.\n').split('\n')
                for sent in sentences:
                    sent = sent.strip()
                    if not sent:
                        continue
                    candidate = f"{current_chunk} {sent}" if current_chunk else sent
                    if _estimate_tokens(candidate) <= max_tokens:
                        current_chunk = candidate
                    else:
                        if current_chunk:
                            chunks.append(current_chunk.strip())
                        current_chunk = sent

    if current_chunk and current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


# ── Page content definitions ──────────────────────────────────────────────

def _get_static_pages():
    """
    Define static page content to index.
    These represent the website's public pages/sections.
    """
    pages = []

    # ── About Page ──
    pages.append({
        'page_id': 'about',
        'page_title': 'About Dorotheo Dental Clinic',
        'source_url': '/',
        'sections': [
            {
                'title': 'About Us',
                'text': (
                    "Dorotheo Dental and Diagnostic Center was founded in 2001 by "
                    "Dr. Marvin F. Dorotheo. We are a full-service dental clinic "
                    "committed to providing comprehensive dental care with a focus "
                    "on patient comfort and modern technology. Our team of experienced "
                    "dentists and staff are dedicated to making your dental experience "
                    "as pleasant as possible. We believe in preventive care and "
                    "patient education to maintain optimal oral health."
                ),
            },
            {
                'title': 'Our Mission',
                'text': (
                    "Our mission at Dorotheo Dental and Diagnostic Center is to provide "
                    "high-quality, affordable dental care to every patient. We strive to "
                    "create a welcoming environment where patients feel comfortable and "
                    "confident in their dental care. We are committed to using the latest "
                    "dental technology and techniques to deliver the best possible outcomes."
                ),
            },
        ],
    })

    # ── Operating Hours ──
    pages.append({
        'page_id': 'hours',
        'page_title': 'Clinic Hours & Schedule',
        'source_url': '/',
        'sections': [
            {
                'title': 'Operating Hours',
                'text': (
                    "Dorotheo Dental and Diagnostic Center Operating Hours:\n"
                    "Monday to Friday: 8:00 AM - 6:00 PM\n"
                    "Saturday: 9:00 AM - 3:00 PM\n"
                    "Sunday: Closed\n\n"
                    "We are open six days a week to accommodate your schedule. "
                    "Walk-ins are welcome but appointments are recommended to "
                    "ensure availability. For emergencies outside of operating hours, "
                    "please contact the clinic via phone."
                ),
            },
        ],
    })

    # ── Appointment Booking Guide ──
    pages.append({
        'page_id': 'booking-guide',
        'page_title': 'How to Book an Appointment',
        'source_url': '/patient/appointments',
        'sections': [
            {
                'title': 'Booking Process',
                'text': (
                    "To book an appointment at Dorotheo Dental Clinic, you can:\n"
                    "1. Use our AI chatbot by saying 'Book Appointment' or 'Schedule Appointment'\n"
                    "2. The chatbot will guide you through selecting a clinic location, "
                    "dentist, date, time, and service\n"
                    "3. You can also call the clinic directly to schedule\n\n"
                    "Requirements for booking:\n"
                    "- You must have a registered patient account\n"
                    "- Select your preferred clinic location\n"
                    "- Choose an available dentist and time slot\n"
                    "- Select the dental service you need\n\n"
                    "After booking, you will receive a confirmation. The clinic staff "
                    "will confirm your appointment. You can view, reschedule, or cancel "
                    "your appointments from your patient dashboard."
                ),
            },
            {
                'title': 'Rescheduling and Cancellation',
                'text': (
                    "To reschedule an appointment, tell the chatbot 'Reschedule Appointment' "
                    "or go to your appointments page. You can also cancel an appointment by "
                    "saying 'Cancel Appointment'. Please note that reschedule and cancellation "
                    "requests need to be approved by the clinic staff. You cannot book a new "
                    "appointment while you have a pending reschedule or cancellation request."
                ),
            },
        ],
    })

    # ── General Dental Knowledge ──
    pages.append({
        'page_id': 'dental-knowledge',
        'page_title': 'Dental Health Information',
        'source_url': '/',
        'sections': [
            {
                'title': 'Preventive Dental Care',
                'text': (
                    "Preventive dental care is the key to maintaining a healthy smile. "
                    "We recommend:\n"
                    "- Brushing teeth twice daily with fluoride toothpaste\n"
                    "- Flossing daily to remove plaque between teeth\n"
                    "- Regular dental check-ups every 6 months\n"
                    "- Professional dental cleaning to remove tartar buildup\n"
                    "- Dental sealants for children to prevent cavities\n"
                    "- Fluoride treatments for cavity prevention\n\n"
                    "Prevention is always better and more affordable than treatment. "
                    "Regular visits help detect problems early."
                ),
            },
            {
                'title': 'Common Dental Procedures',
                'text': (
                    "Common dental procedures we offer include:\n"
                    "- Dental Cleaning (Prophylaxis): Removal of plaque and tartar, "
                    "recommended every 6 months\n"
                    "- Tooth Filling: Repair of cavities using composite or amalgam materials\n"
                    "- Tooth Extraction: Removal of damaged or impacted teeth\n"
                    "- Root Canal Treatment: Treatment for infected tooth pulp\n"
                    "- Dental Crown: Cap placed over a damaged tooth for protection\n"
                    "- Dental Bridge: Replacement for missing teeth anchored to adjacent teeth\n"
                    "- Teeth Whitening: Cosmetic procedure to brighten tooth color\n"
                    "- Orthodontics/Braces: Correction of misaligned teeth\n"
                    "- Dental Implants: Permanent replacement for missing teeth\n"
                    "- Oral Surgery: Surgical procedures including wisdom tooth removal"
                ),
            },
            {
                'title': 'When to See a Dentist',
                'text': (
                    "You should see a dentist if you experience:\n"
                    "- Persistent toothache or tooth sensitivity\n"
                    "- Bleeding or swollen gums\n"
                    "- Bad breath that doesn't go away\n"
                    "- Loose teeth or changes in bite alignment\n"
                    "- Mouth sores that don't heal within two weeks\n"
                    "- Pain when chewing or jaw clicking\n"
                    "- Dry mouth or difficulty swallowing\n\n"
                    "Don't wait for pain to visit the dentist. Regular check-ups can "
                    "catch problems before they become serious and costly."
                ),
            },
        ],
    })

    return pages


def _get_dynamic_pages():
    """
    Generate page content from database models (services, clinics, dentists).
    """
    pages = []

    # ── Services ──
    services = Service.objects.all().order_by('category', 'name')
    if services.exists():
        sections = []
        by_category = {}
        for svc in services:
            cat = svc.category or 'General'
            by_category.setdefault(cat, []).append(svc)

        for cat, svcs in by_category.items():
            lines = [f"Category: {cat}\n"]
            for s in svcs:
                line = f"- {s.name}"
                if s.description:
                    line += f": {s.description}"
                lines.append(line)
            sections.append({
                'title': f'{cat} Services',
                'text': '\n'.join(lines),
            })

        pages.append({
            'page_id': 'services',
            'page_title': 'Dental Services',
            'source_url': '/',
            'sections': sections,
        })

    # ── Clinics ──
    clinics = ClinicLocation.objects.all().order_by('name')
    if clinics.exists():
        sections = []
        for clinic in clinics:
            text = f"Clinic: {clinic.name}\nAddress: {clinic.address}\nPhone: {clinic.phone}"
            if hasattr(clinic, 'email') and clinic.email:
                text += f"\nEmail: {clinic.email}"
            sections.append({
                'title': clinic.name,
                'text': text,
            })
        pages.append({
            'page_id': 'clinics',
            'page_title': 'Clinic Locations',
            'source_url': '/',
            'sections': sections,
        })

    # ── Dentists ──
    dentists = User.objects.filter(
        Q(user_type='staff', role='dentist') | Q(user_type='owner')
    ).order_by('last_name')
    if dentists.exists():
        lines = ["Our team of dentists:\n"]
        for d in dentists:
            name = d.get_full_name().strip()
            if name:
                line = f"- Dr. {name}"
                if d.assigned_clinic:
                    line += f" (assigned to {d.assigned_clinic.name})"
                lines.append(line)
        pages.append({
            'page_id': 'dentists',
            'page_title': 'Our Dentists',
            'source_url': '/',
            'sections': [{
                'title': 'Dental Team',
                'text': '\n'.join(lines),
            }],
        })

    return pages


# ── Command ────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = 'Index page content for RAG (Retrieval Augmented Generation)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reindex', action='store_true',
            help='Clear all existing chunks and re-index everything',
        )
        parser.add_argument(
            '--page', type=str, default=None,
            help='Index a specific page_id only (e.g., about, services)',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Preview chunks without saving to database',
        )

    def handle(self, *args, **options):
        reindex = options['reindex']
        page_filter = options.get('page')
        dry_run = options['dry_run']

        self.stdout.write(self.style.NOTICE('Starting page indexing for RAG...'))
        start = time.time()

        # Gather all pages
        all_pages = _get_static_pages() + _get_dynamic_pages()

        if page_filter:
            all_pages = [p for p in all_pages if p['page_id'] == page_filter]
            if not all_pages:
                self.stdout.write(self.style.ERROR(f"No page found with id: {page_filter}"))
                return

        # Clear existing chunks if reindexing
        if reindex and not dry_run:
            if page_filter:
                deleted, _ = PageChunk.objects.filter(page_id=page_filter).delete()
            else:
                deleted, _ = PageChunk.objects.all().delete()
            self.stdout.write(f"  Cleared {deleted} existing chunks")

        total_chunks = 0
        total_embedded = 0
        errors = 0

        for page in all_pages:
            page_id = page['page_id']
            page_title = page['page_title']
            source_url = page.get('source_url', '')

            self.stdout.write(f"\n  Indexing page: {page_title} ({page_id})")

            # Delete existing chunks for this page (if not already reindexed)
            if not reindex and not dry_run:
                PageChunk.objects.filter(page_id=page_id).delete()

            chunk_index = 0
            for section in page.get('sections', []):
                section_title = section.get('title', '')
                text = section.get('text', '')

                if not text.strip():
                    continue

                # Split into chunks
                chunks = _split_into_chunks(text)

                for chunk_text in chunks:
                    token_count = _estimate_tokens(chunk_text)

                    if dry_run:
                        self.stdout.write(
                            f"    [DRY-RUN] Chunk {chunk_index}: "
                            f"section='{section_title}' "
                            f"tokens={token_count} "
                            f"text='{chunk_text[:80]}...'"
                        )
                        chunk_index += 1
                        total_chunks += 1
                        continue

                    # Generate embedding
                    embedding = generate_embedding(chunk_text)
                    if embedding:
                        total_embedded += 1
                    else:
                        errors += 1
                        self.stdout.write(
                            self.style.WARNING(
                                f"    ⚠ Failed to generate embedding for chunk {chunk_index}"
                            )
                        )

                    # Save chunk
                    PageChunk.objects.create(
                        page_id=page_id,
                        chunk_text=chunk_text,
                        embedding=embedding or [],
                        page_title=page_title,
                        section_title=section_title,
                        source_url=source_url,
                        chunk_index=chunk_index,
                        token_count=token_count,
                    )

                    chunk_index += 1
                    total_chunks += 1

            self.stdout.write(f"    → {chunk_index} chunks indexed")

        elapsed = time.time() - start
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f"Indexing complete: {total_chunks} chunks, "
            f"{total_embedded} embedded, {errors} errors, "
            f"{elapsed:.1f}s elapsed"
        ))

        if dry_run:
            self.stdout.write(self.style.NOTICE("(Dry run – nothing was saved)"))
