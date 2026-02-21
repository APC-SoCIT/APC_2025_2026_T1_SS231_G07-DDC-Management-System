"""
Semantic Cache Service
──────────────────────
Caches chatbot responses to avoid redundant LLM calls.

Features:
- In-memory cache (with optional Redis upgrade path)
- Cache key: hash of normalized question text
- Semantic similarity matching for FAQ variants
- High-frequency FAQ pre-cache
- TTL-based expiration
- Thread-safe implementation

Cached FAQ categories:
- Opening hours
- Insurance
- Services
- Locations
- Emergency policies
"""

import hashlib
import logging
import time
import threading
from typing import Optional, Dict, Any

logger = logging.getLogger('chatbot.cache')

# ── Configuration ──────────────────────────────────────────────────────────

CACHE_TTL = 3600           # 1 hour default TTL
CACHE_MAX_SIZE = 500       # Maximum cached entries
FAQ_CACHE_TTL = 7200       # 2 hours for FAQ responses


# ── Cache Store ────────────────────────────────────────────────────────────

class SemanticCache:
    """
    In-memory semantic cache for chatbot responses.

    Cache key strategy:
    - Normalize text (lowercase, strip whitespace, remove filler)
    - Hash the normalized text
    - Match exact hash first, then try FAQ patterns

    Thread-safe with a simple lock.
    """

    def __init__(self, max_size: int = CACHE_MAX_SIZE, default_ttl: int = CACHE_TTL):
        self._store: Dict[str, Dict[str, Any]] = {}
        self._max_size = max_size
        self._default_ttl = default_ttl
        self._lock = threading.Lock()
        self._hits = 0
        self._misses = 0

    def get(self, question: str) -> Optional[str]:
        """
        Look up a cached response for a question.

        Returns:
            Cached response text, or None if not found/expired.
        """
        key = self._make_key(question)

        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                # Try FAQ pattern matching
                faq_key = self._match_faq_pattern(question)
                if faq_key:
                    entry = self._store.get(faq_key)

            if entry is None:
                self._misses += 1
                return None

            # Check TTL
            if time.time() > entry['expires_at']:
                del self._store[key]
                self._misses += 1
                return None

            self._hits += 1
            entry['last_accessed'] = time.time()
            entry['access_count'] += 1
            logger.debug("Cache hit for key=%s (hits=%d)", key[:8], self._hits)
            return entry['response']

    def put(self, question: str, response: str, ttl: Optional[int] = None):
        """
        Cache a response for a question.

        Args:
            question: The user's question.
            response: The chatbot's response.
            ttl: Time-to-live in seconds (uses default if None).
        """
        key = self._make_key(question)
        actual_ttl = ttl or self._default_ttl

        with self._lock:
            # Evict if at capacity
            if len(self._store) >= self._max_size:
                self._evict_oldest()

            self._store[key] = {
                'response': response,
                'created_at': time.time(),
                'expires_at': time.time() + actual_ttl,
                'last_accessed': time.time(),
                'access_count': 1,
                'question': question[:200],
            }
            logger.debug("Cached response for key=%s (ttl=%ds)", key[:8], actual_ttl)

    def invalidate(self, question: str):
        """Remove a specific cached entry."""
        key = self._make_key(question)
        with self._lock:
            self._store.pop(key, None)

    def clear(self):
        """Clear entire cache."""
        with self._lock:
            self._store.clear()
            self._hits = 0
            self._misses = 0
        logger.info("Cache cleared")

    def get_stats(self) -> Dict[str, Any]:
        """Return cache statistics."""
        with self._lock:
            total = self._hits + self._misses
            hit_rate = (self._hits / total * 100) if total > 0 else 0
            return {
                'size': len(self._store),
                'max_size': self._max_size,
                'hits': self._hits,
                'misses': self._misses,
                'hit_rate': f"{hit_rate:.1f}%",
            }

    # ── Private Methods ──────────────────────────────────────────────────

    @staticmethod
    def _make_key(question: str) -> str:
        """Generate a cache key from a question by normalizing and hashing."""
        normalized = _normalize_for_cache(question)
        return hashlib.md5(normalized.encode('utf-8')).hexdigest()

    def _match_faq_pattern(self, question: str) -> Optional[str]:
        """Try to match a question to a cached FAQ pattern."""
        normalized = _normalize_for_cache(question)

        for pattern, key in FAQ_PATTERNS.items():
            if pattern in normalized:
                return key
        return None

    def _evict_oldest(self):
        """Evict the least recently accessed entries (25% of max)."""
        to_evict = self._max_size // 4
        sorted_keys = sorted(
            self._store.keys(),
            key=lambda k: self._store[k]['last_accessed'],
        )
        for key in sorted_keys[:to_evict]:
            del self._store[key]
        logger.debug("Evicted %d cache entries", to_evict)


# ── FAQ Pattern Matching ───────────────────────────────────────────────────

# Maps normalized question patterns to cache keys
FAQ_PATTERNS: Dict[str, str] = {
    'opening hours': 'faq_hours',
    'clinic hours': 'faq_hours',
    'operating hours': 'faq_hours',
    'business hours': 'faq_hours',
    'what time': 'faq_hours',
    'when open': 'faq_hours',
    'oras ng clinic': 'faq_hours',
    'anong oras': 'faq_hours',
    'bukas kayo': 'faq_hours',
    'insurance': 'faq_insurance',
    'accept insurance': 'faq_insurance',
    'hmo': 'faq_insurance',
    'services offered': 'faq_services',
    'dental services': 'faq_services',
    'what services': 'faq_services',
    'anong serbisyo': 'faq_services',
    'clinic location': 'faq_locations',
    'where located': 'faq_locations',
    'branches': 'faq_locations',
    'saan kayo': 'faq_locations',
    'address': 'faq_locations',
    'emergency': 'faq_emergency',
    'urgent': 'faq_emergency',
    'tooth pain': 'faq_emergency',
    'toothache': 'faq_emergency',
    'sakit ng ngipin': 'faq_emergency',
}


# ── Text Normalization ─────────────────────────────────────────────────────

def _normalize_for_cache(text: str) -> str:
    """Normalize text for cache key generation."""
    if not text:
        return ''
    normalized = text.lower().strip()
    # Remove common filler words
    filler = {'po', 'nga', 'naman', 'lang', 'the', 'a', 'an', 'is', 'are', 'do', 'does'}
    words = normalized.split()
    words = [w for w in words if w not in filler]
    return ' '.join(words)


# ── Module-level singleton ─────────────────────────────────────────────────

_cache_instance: Optional[SemanticCache] = None


def get_cache() -> SemanticCache:
    """Get the singleton cache instance."""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = SemanticCache()
    return _cache_instance
