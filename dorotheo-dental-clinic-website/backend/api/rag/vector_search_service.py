"""
Vector search service for RAG.

Performs cosine-similarity search over PageChunk embeddings stored in the DB.
Uses pure Python math (no pgvector dependency) for maximum compatibility.
"""

import logging
import math
import time
from typing import List, Tuple, Optional

from api.models import PageChunk
from .embedding_service import generate_query_embedding

logger = logging.getLogger('rag.vector_search')

# ── Configuration ──────────────────────────────────────────────────────────

DEFAULT_TOP_K = 5
DEFAULT_SIMILARITY_THRESHOLD = 0.55   # Minimum cosine similarity to include
MAX_CHUNKS_TO_SCAN = 2000             # Safety cap on DB rows scanned


# ── Math helpers ───────────────────────────────────────────────────────────

def _cosine_similarity(a: List[float], b: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


# ── Public API ─────────────────────────────────────────────────────────────

def search_similar_chunks(
    query: str,
    top_k: int = DEFAULT_TOP_K,
    similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
) -> List[Tuple[PageChunk, float]]:
    """
    Search for page chunks similar to the query text.

    Args:
        query: The user's question / search text.
        top_k: Maximum number of results to return.
        similarity_threshold: Minimum cosine similarity score.

    Returns:
        List of (PageChunk, similarity_score) tuples, sorted by score descending.
        Returns empty list on any failure (safe fallback).
    """
    try:
        start = time.time()

        # 1. Generate query embedding
        query_embedding = generate_query_embedding(query)
        if not query_embedding:
            logger.warning("Could not generate query embedding – skipping RAG")
            return []

        # 2. Fetch all chunks that have embeddings
        chunks = PageChunk.objects.exclude(embedding=[]).order_by('page_id', 'chunk_index')[:MAX_CHUNKS_TO_SCAN]
        if not chunks.exists():
            logger.info("No indexed page chunks found – skipping RAG")
            return []

        # 3. Score each chunk
        scored: List[Tuple[PageChunk, float]] = []
        for chunk in chunks:
            if not chunk.embedding:
                continue
            try:
                score = _cosine_similarity(query_embedding, chunk.embedding)
                if score >= similarity_threshold:
                    scored.append((chunk, score))
            except Exception:
                continue

        # 4. Sort by score descending and take top_k
        scored.sort(key=lambda x: x[1], reverse=True)
        results = scored[:top_k]

        elapsed = time.time() - start
        logger.info(
            "RAG vector search: query=%r scanned=%d hits=%d top_score=%.3f elapsed=%.2fs",
            query[:60], len(chunks), len(results),
            results[0][1] if results else 0.0,
            elapsed,
        )
        return results

    except Exception as e:
        logger.error("Vector search failed (safe fallback): %s", e)
        return []
