"""
Vector search service for RAG.

Uses pgvector's native cosine-distance operator (<=>)  via Django ORM.
This replaces the old pure-Python loop which loaded all chunks into memory.

Benefits over the old approach:
  - Postgres does the similarity computation — no Python loop
  - ivfflat index makes it sub-linear at scale
  - Only top_k rows are fetched (not all 2000+)
  - Works with Supabase's managed Postgres out of the box
"""

import logging
import time
from typing import List, Tuple, Optional

from pgvector.django import CosineDistance

from api.models import PageChunk
from .embedding_service import generate_query_embedding

logger = logging.getLogger('rag.vector_search')

# ── Configuration ──────────────────────────────────────────────────────────

DEFAULT_TOP_K = 5
DEFAULT_SIMILARITY_THRESHOLD = 0.55   # Minimum cosine similarity to include


# ── Public API ─────────────────────────────────────────────────────────────

def search_similar_chunks(
    query: str,
    top_k: int = DEFAULT_TOP_K,
    similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
) -> List[Tuple[PageChunk, float]]:
    """
    Search for page chunks similar to the query text using pgvector.

    Uses Postgres's native <=> cosine-distance operator with an ivfflat index
    for fast approximate nearest-neighbour search.

    Args:
        query: The user's question / search text.
        top_k: Maximum number of results to return.
        similarity_threshold: Minimum cosine similarity score (0–1).

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

        # 2. pgvector query — runs entirely in Postgres
        #    CosineDistance returns distance (0=identical, 2=opposite).
        #    similarity = 1 - distance  →  higher is better.
        qs = (
            PageChunk.objects
            .filter(embedding__isnull=False)
            .annotate(distance=CosineDistance('embedding', query_embedding))
            .filter(distance__lte=1.0 - similarity_threshold)   # distance threshold
            .order_by('distance')
            [:top_k]
        )

        results: List[Tuple[PageChunk, float]] = [
            (chunk, 1.0 - chunk.distance)
            for chunk in qs
        ]

        elapsed = time.time() - start
        logger.info(
            "RAG pgvector search: query=%r hits=%d top_score=%.3f elapsed=%.2fs",
            query[:60], len(results),
            results[0][1] if results else 0.0,
            elapsed,
        )
        return results

    except Exception as e:
        logger.error("Vector search failed (safe fallback): %s", e)
        return []
