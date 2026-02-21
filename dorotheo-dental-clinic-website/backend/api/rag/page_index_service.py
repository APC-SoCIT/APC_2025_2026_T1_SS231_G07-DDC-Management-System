"""
Page Index RAG service – the main entry point.

Provides a single `get_context()` method that the chatbot calls.
Internally orchestrates: query embedding → vector search → context building.
All failures are caught and return None (safe fallback).
"""

import logging
import time
from typing import Optional, Tuple, List

from django.conf import settings

from .vector_search_service import search_similar_chunks
from .rag_context_builder import build_rag_context, extract_sources

logger = logging.getLogger('rag.service')


# ── Configuration (from Django settings, with defaults) ────────────────────

def _top_k():
    return getattr(settings, 'RAG_TOP_K', 5)

def _threshold():
    return getattr(settings, 'RAG_SIMILARITY_THRESHOLD', 0.45)

def _max_tokens():
    return getattr(settings, 'RAG_MAX_CONTEXT_TOKENS', 1500)

def _is_enabled():
    return getattr(settings, 'RAG_ENABLED', True)


# ── Public API ─────────────────────────────────────────────────────────────

def get_context(user_message: str) -> Optional[str]:
    """
    Attempt to retrieve RAG context for a user message.

    Returns:
        A formatted context string to inject into the AI prompt,
        or None if RAG retrieval fails / returns nothing / is disabled.
    """
    if not _is_enabled():
        return None

    try:
        start = time.time()

        # 1. Vector search
        results = search_similar_chunks(
            query=user_message,
            top_k=_top_k(),
            similarity_threshold=_threshold(),
        )

        if not results:
            logger.debug("RAG: no relevant chunks found for: %s", user_message[:80])
            return None

        # 2. Build context
        context = build_rag_context(
            search_results=results,
            max_tokens=_max_tokens(),
        )

        elapsed = time.time() - start
        if context:
            logger.info("RAG context retrieved in %.2fs (%d results)", elapsed, len(results))
        else:
            logger.debug("RAG: context builder returned None in %.2fs", elapsed)

        return context

    except Exception as e:
        logger.error("RAG service error (safe fallback): %s", e)
        return None


def get_context_with_sources(
    user_message: str,
) -> Tuple[Optional[str], List[dict]]:
    """
    Like get_context(), but also returns source citations.

    Returns:
        (context_string_or_None, [{"page_title": ..., "url": ...}, ...])
    """
    if not _is_enabled():
        return None, []

    try:
        results = search_similar_chunks(
            query=user_message,
            top_k=_top_k(),
            similarity_threshold=_threshold(),
        )

        if not results:
            return None, []

        context = build_rag_context(
            search_results=results,
            max_tokens=_max_tokens(),
        )
        sources = extract_sources(results) if context else []

        return context, sources

    except Exception as e:
        logger.error("RAG service (with sources) error: %s", e)
        return None, []
