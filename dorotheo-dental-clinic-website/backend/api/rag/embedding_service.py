"""
Embedding service for RAG.

Uses Google Gemini's embedding API (already available in the project)
to generate embeddings for text chunks and user queries.
Includes caching to avoid redundant API calls.
"""

import logging
import time
import hashlib
from functools import lru_cache
from typing import List, Optional

import google.generativeai as genai
import os
from dotenv import load_dotenv

logger = logging.getLogger('rag.embedding')

# In-memory embedding cache (query → embedding)
_embedding_cache: dict = {}
_CACHE_MAX_SIZE = 500


def _ensure_configured():
    """Ensure Gemini API is configured. Reuses existing project setup."""
    load_dotenv()
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")
    genai.configure(api_key=api_key)


def _cache_key(text: str) -> str:
    """Generate a cache key from text."""
    return hashlib.md5(text.strip().lower().encode('utf-8')).hexdigest()


def generate_embedding(text: str, use_cache: bool = True) -> Optional[List[float]]:
    """
    Generate an embedding vector for the given text using Gemini.

    Args:
        text: The text to embed.
        use_cache: Whether to check/store in the in-memory cache.

    Returns:
        A list of floats (the embedding vector), or None on failure.
    """
    if not text or not text.strip():
        return None

    text = text.strip()

    # Check cache
    if use_cache:
        key = _cache_key(text)
        if key in _embedding_cache:
            logger.debug("Embedding cache hit for key=%s", key[:8])
            return _embedding_cache[key]

    try:
        _ensure_configured()
        start = time.time()

        result = genai.embed_content(
            model="models/gemini-embedding-001",
            content=text,
            task_type="RETRIEVAL_DOCUMENT",
        )
        embedding = result['embedding']
        elapsed = time.time() - start
        logger.info("Generated embedding (dim=%d) in %.2fs", len(embedding), elapsed)

        # Store in cache
        if use_cache:
            if len(_embedding_cache) >= _CACHE_MAX_SIZE:
                # Evict oldest quarter
                keys = list(_embedding_cache.keys())
                for k in keys[:_CACHE_MAX_SIZE // 4]:
                    _embedding_cache.pop(k, None)
            _embedding_cache[key] = embedding

        return embedding

    except Exception as e:
        logger.error("Embedding generation failed: %s", e)
        return None


def generate_query_embedding(text: str) -> Optional[List[float]]:
    """
    Generate an embedding for a search query (uses retrieval_query task type).
    """
    if not text or not text.strip():
        return None

    text = text.strip()
    key = _cache_key(f"__query__{text}")

    if key in _embedding_cache:
        return _embedding_cache[key]

    try:
        _ensure_configured()
        start = time.time()

        result = genai.embed_content(
            model="models/gemini-embedding-001",
            content=text,
            task_type="RETRIEVAL_QUERY",
        )
        embedding = result['embedding']
        elapsed = time.time() - start
        logger.info("Generated query embedding (dim=%d) in %.2fs", len(embedding), elapsed)

        if len(_embedding_cache) >= _CACHE_MAX_SIZE:
            keys = list(_embedding_cache.keys())
            for k in keys[:_CACHE_MAX_SIZE // 4]:
                _embedding_cache.pop(k, None)
        _embedding_cache[key] = embedding

        return embedding

    except Exception as e:
        logger.error("Query embedding generation failed: %s", e)
        return None


def generate_embeddings_batch(texts: List[str]) -> List[Optional[List[float]]]:
    """
    Generate embeddings for multiple texts.
    Falls back to one-by-one if batch API is unavailable.
    """
    results = []
    for text in texts:
        results.append(generate_embedding(text, use_cache=True))
    return results
