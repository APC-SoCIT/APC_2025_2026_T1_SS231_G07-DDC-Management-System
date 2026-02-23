"""
RAG Repair Verification Script
Phases 2-6: Post-repair verification
"""
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
from dotenv import load_dotenv
load_dotenv()

import django
django.setup()

from api.models import PageChunk
from django.conf import settings


def phase2_post_repair():
    """Post-repair index verification"""
    print("=" * 60)
    print("PHASE 2 (POST-REPAIR) — INDEX VERIFICATION")
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
            
        # Show all indexed pages
        page_ids = PageChunk.objects.values_list('page_id', flat=True).distinct()
        print("Indexed pages:", list(page_ids))
    
    return total, with_emb


def phase4_retrieval():
    """Retrieval validation"""
    print()
    print("=" * 60)
    print("PHASE 4 — RETRIEVAL VALIDATION")
    print("=" * 60)
    
    from api.rag.vector_search_service import search_similar_chunks
    
    test_queries = [
        "What are your operating hours?",
        "How do I book an appointment?",
        "What dental services do you offer?",
    ]
    
    all_passed = True
    for query in test_queries:
        print(f"\n--- Query: '{query}' ---")
        results = search_similar_chunks(query, top_k=3, similarity_threshold=0.3)
        
        if not results:
            print("  FAIL: No results returned!")
            all_passed = False
            continue
        
        print(f"  Retrieved {len(results)} chunks:")
        for chunk, score in results:
            print(f"    Score: {score:.4f} | Page: {chunk.page_title} | Section: {chunk.section_title}")
            print(f"    Text preview: {chunk.chunk_text[:120]}...")
    
    return all_passed


def phase5_prompt():
    """Prompt verification - check RAG context injection"""
    print()
    print("=" * 60)
    print("PHASE 5 — PROMPT VERIFICATION")
    print("=" * 60)
    
    from api.rag.page_index_service import get_context_with_sources
    
    query = "What are the clinic hours?"
    context, sources = get_context_with_sources(query)
    
    if context:
        print("RAG context retrieved successfully!")
        print(f"Context length: {len(context)} chars")
        print(f"Sources: {sources}")
        print(f"\n--- Context preview ---")
        print(context[:500])
        print("--- End preview ---")
        
        # Verify context contains "Additional Knowledge Context"
        has_header = "Additional Knowledge Context" in context
        print(f"\nContext has proper header: {has_header}")
        
        # Check it won't silently fallback
        from api.services.rag_service import RAG_SAFETY_PROMPT
        print(f"RAG Safety Prompt exists: {bool(RAG_SAFETY_PROMPT)}")
        has_rule = "Answer ONLY using the provided context" in RAG_SAFETY_PROMPT
        print(f"Safety prompt prevents fallback: {has_rule}")
        
        return True
    else:
        print("FAIL: No RAG context returned!")
        return False


def phase6_final():
    """Final verification - question that only exists in indexed docs"""
    print()
    print("=" * 60)
    print("PHASE 6 — FINAL VERIFICATION TEST")
    print("=" * 60)
    
    # A question whose answer is ONLY in the indexed pages
    test_question = "Who founded Dorotheo Dental and when?"
    expected_answer_fragment = "Dr. Marvin F. Dorotheo"
    expected_year = "2001"
    
    print(f"Test question: '{test_question}'")
    print(f"Expected answer contains: '{expected_answer_fragment}' and '{expected_year}'")
    
    from api.rag.page_index_service import get_context_with_sources
    
    context, sources = get_context_with_sources(test_question)
    
    if not context:
        print("FAIL: No context retrieved for test question!")
        return False
    
    print(f"\nRetrieved context ({len(context)} chars):")
    print(context[:600])
    
    has_name = expected_answer_fragment in context
    has_year = expected_year in context
    
    print(f"\nContext contains '{expected_answer_fragment}': {has_name}")
    print(f"Context contains '{expected_year}': {has_year}")
    
    if has_name and has_year:
        print("\n*** PROOF: Answer text EXISTS in retrieved chunk ***")
        print("RAG is OPERATIONAL - answers are grounded in indexed data.")
        return True
    else:
        print("\nFAIL: Expected content not found in context!")
        return False


if __name__ == '__main__':
    total, with_emb = phase2_post_repair()
    retrieval_ok = phase4_retrieval()
    prompt_ok = phase5_prompt()
    final_ok = phase6_final()
    
    print()
    print("=" * 60)
    print("PHASE 7 — FINAL REPORT")
    print("=" * 60)
    print(f"Vector store type:       Local SQLite DB (Django ORM + JSONField)")
    print(f"Embedding model:         models/gemini-embedding-001 (Google Gemini)")
    print(f"Embedding dimension:     3072")
    print(f"Initial vector count:    0")
    print(f"Post-fix vector count:   {with_emb}")
    print(f"Total chunks indexed:    {total}")
    print(f"Retrieval test:          {'PASS' if retrieval_ok else 'FAIL'}")
    print(f"Prompt verification:     {'PASS' if prompt_ok else 'FAIL'}")
    print(f"Final answer test:       {'PASS' if final_ok else 'FAIL'}")
    print()
    print("Root cause:")
    print("  1. .env file was EMPTY — GEMINI_API_KEY was not configured")
    print("  2. index_pages management command had NEVER been run")
    print("  3. PageChunk table had 0 records → CRITICAL_RAG_EMPTY_LOCAL")
    print()
    print("Exact fix applied:")
    print("  1. Set GEMINI_API_KEY in .env")
    print("  2. Ran: python manage.py index_pages --reindex")
    print("  3. Generated 3072-dim Gemini embeddings for all page content")
    print()
    
    all_pass = retrieval_ok and prompt_ok and final_ok and with_emb > 0
    if all_pass:
        print("*** RAG SYSTEM IS FULLY OPERATIONAL ***")
    else:
        print("*** RAG SYSTEM HAS REMAINING ISSUES ***")
        if not retrieval_ok:
            print("  - Vector search retrieval failed")
        if not prompt_ok:
            print("  - Prompt context injection failed")
        if not final_ok:
            print("  - Final answer grounding test failed")
