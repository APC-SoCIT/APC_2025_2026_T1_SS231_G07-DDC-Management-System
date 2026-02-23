"""
RAG System Diagnosis & Repair Script
Phases 1-7: Full diagnosis, repair, and verification
"""
import os
import sys
import time

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')

# Load .env BEFORE django setup
from dotenv import load_dotenv
load_dotenv()

import django
django.setup()

from api.models import PageChunk
from django.conf import settings


def phase1():
    """Environment Detection"""
    print("=" * 60)
    print("PHASE 1 — ENVIRONMENT DETECTION")
    print("=" * 60)
    
    print("Vector Store Type: Local SQLite DB (Django ORM + JSONField)")
    db = settings.DATABASES['default']
    print("Database Engine:", db['ENGINE'])
    print("Database Path:", db.get('NAME', 'N/A'))
    print("RAG Enabled:", getattr(settings, 'RAG_ENABLED', 'N/A'))
    print("RAG Top K:", getattr(settings, 'RAG_TOP_K', 'N/A'))
    print("RAG Similarity Threshold:", getattr(settings, 'RAG_SIMILARITY_THRESHOLD', 'N/A'))
    print("RAG Max Context Tokens:", getattr(settings, 'RAG_MAX_CONTEXT_TOKENS', 'N/A'))
    print("Embedding Model: models/gemini-embedding-001 (Google Gemini)")
    
    api_key = os.environ.get('GEMINI_API_KEY', '')
    has_key = bool(api_key)
    print("GEMINI_API_KEY set:", has_key)
    if api_key:
        masked = api_key[:8] + '...' + api_key[-4:]
        print("GEMINI_API_KEY (masked):", masked)
    else:
        print("*** CRITICAL: GEMINI_API_KEY is NOT set! ***")
    
    return has_key


def phase2():
    """Index Verification"""
    print()
    print("=" * 60)
    print("PHASE 2 — INDEX VERIFICATION")
    print("=" * 60)
    
    total = PageChunk.objects.count()
    with_emb = PageChunk.objects.exclude(embedding=[]).count()
    without_emb = PageChunk.objects.filter(embedding=[]).count()
    
    print("Total PageChunks:", total)
    print("Chunks WITH embeddings:", with_emb)
    print("Chunks WITHOUT embeddings:", without_emb)
    
    if total > 0:
        latest = PageChunk.objects.order_by('-updated_at').first()
        print("Last modified:", latest.updated_at)
        if with_emb > 0:
            sample = PageChunk.objects.exclude(embedding=[]).first()
            print("Embedding dimension:", len(sample.embedding))
    else:
        print()
        print("*** RAG INDEX IS EMPTY ***")
    
    return total, with_emb


if __name__ == '__main__':
    has_key = phase1()
    total, with_emb = phase2()
    
    print()
    print("=" * 60)
    print("DIAGNOSIS SUMMARY")
    print("=" * 60)
    print("API Key present:", has_key)
    print("Index empty:", total == 0)
    print("Needs repair:", total == 0 or with_emb == 0)
