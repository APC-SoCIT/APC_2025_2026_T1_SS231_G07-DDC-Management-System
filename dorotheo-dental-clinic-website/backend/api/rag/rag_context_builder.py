"""
RAG context builder.

Takes vector search results and builds a formatted context string
to inject into the AI prompt. Handles token limiting and sanitization.
"""

import logging
import re
from typing import List, Tuple, Optional

from api.models import PageChunk

logger = logging.getLogger('rag.context_builder')

# ── Configuration ──────────────────────────────────────────────────────────

MAX_CONTEXT_TOKENS = 1500       # Max approximate tokens for injected context
CHARS_PER_TOKEN = 4             # Rough approximation: 1 token ≈ 4 chars


# ── Sanitization ───────────────────────────────────────────────────────────

def _sanitize_text(text: str) -> str:
    """Remove potentially harmful content from retrieved text before prompt injection."""
    if not text:
        return ''
    # Strip control characters
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    # Prevent prompt injection attempts
    injection_patterns = [
        r'ignore\s+previous\s+instructions',
        r'ignore\s+all\s+instructions',
        r'disregard\s+.*?instructions',
        r'you\s+are\s+now\s+',
        r'forget\s+everything',
        r'system\s*:\s*',
    ]
    for pat in injection_patterns:
        text = re.sub(pat, '[FILTERED]', text, flags=re.IGNORECASE)
    return text.strip()


def _estimate_tokens(text: str) -> int:
    """Rough token count estimation."""
    return len(text) // CHARS_PER_TOKEN


# ── Public API ─────────────────────────────────────────────────────────────

def build_rag_context(
    search_results: List[Tuple[PageChunk, float]],
    max_tokens: int = MAX_CONTEXT_TOKENS,
) -> Optional[str]:
    """
    Build a formatted context string from vector search results.

    Args:
        search_results: List of (PageChunk, score) from vector search.
        max_tokens: Maximum token budget for the context.

    Returns:
        A formatted context string, or None if no usable results.
    """
    if not search_results:
        return None

    try:
        context_parts = []
        sources = []
        token_budget = max_tokens
        seen_texts = set()  # Deduplicate

        for chunk, score in search_results:
            text = _sanitize_text(chunk.chunk_text)
            if not text:
                continue

            # Deduplicate near-identical chunks
            text_key = text[:200].lower()
            if text_key in seen_texts:
                continue
            seen_texts.add(text_key)

            # Check token budget
            chunk_tokens = _estimate_tokens(text)
            if chunk_tokens > token_budget:
                # Truncate to fit
                max_chars = token_budget * CHARS_PER_TOKEN
                text = text[:max_chars] + '...'
                chunk_tokens = token_budget

            # Build chunk entry
            header = ''
            if chunk.page_title:
                header += f"[{chunk.page_title}]"
            if chunk.section_title:
                header += f" > {chunk.section_title}"
            if header:
                entry = f"{header}\n{text}"
            else:
                entry = text

            context_parts.append(entry)
            token_budget -= chunk_tokens

            # Track sources for optional citation
            if chunk.page_title or chunk.source_url:
                sources.append({
                    'page_title': chunk.page_title or 'Untitled',
                    'url': chunk.source_url or '',
                    'score': round(score, 3),
                })

            if token_budget <= 0:
                break

        if not context_parts:
            return None

        # Assemble final context block
        context = "Additional Knowledge Context:\n"
        context += "\n---\n".join(context_parts)
        context += "\n\nUse this context if relevant to the user's question."

        logger.info(
            "Built RAG context: %d chunks, ~%d tokens, %d sources",
            len(context_parts),
            _estimate_tokens(context),
            len(sources),
        )

        return context

    except Exception as e:
        logger.error("Context building failed (safe fallback): %s", e)
        return None


def extract_sources(
    search_results: List[Tuple[PageChunk, float]],
) -> List[dict]:
    """
    Extract source citations from search results.
    Returns list of {"page_title": ..., "url": ...} dicts.
    """
    sources = []
    seen = set()
    for chunk, score in search_results:
        key = (chunk.page_title, chunk.source_url)
        if key not in seen and (chunk.page_title or chunk.source_url):
            seen.add(key)
            sources.append({
                'page_title': chunk.page_title or 'Untitled',
                'url': chunk.source_url or '',
            })
    return sources
