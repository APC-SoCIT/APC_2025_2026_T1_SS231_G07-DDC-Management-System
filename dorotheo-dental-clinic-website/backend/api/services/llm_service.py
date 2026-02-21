"""
Centralized LLM Service with Per-Provider Circuit Breaker
──────────────────────────────────────────────────────────
All LLM calls in the chatbot MUST go through this wrapper.
No direct Gemini calls anywhere else in the codebase.

Features:
- Primary LLM: Google Gemini
- Fallback: Context-based formatter (no second LLM API needed)
- Per-provider circuit breaker (NOT global 300s cooldown)
- Automatic fallback on QuotaExceeded, Timeout, RateLimit
- Structured logging of all failures
- Retry logic (max 2 retries with exponential backoff)
- Transactional flows (booking) remain operational even during LLM outage
"""

import logging
import os
import time
from typing import Optional, Dict, Any

import google.generativeai as genai
from dotenv import load_dotenv

logger = logging.getLogger('chatbot.llm')

# ── LLM Configuration ─────────────────────────────────────────────────────

PRIMARY_MODEL = "models/gemini-2.5-flash"
EMBEDDING_MODEL = "models/gemini-embedding-001"
MAX_RETRIES = 2
RETRY_BACKOFF_BASE = 1.5  # seconds
REQUEST_TIMEOUT = 30  # seconds
SLOW_RESPONSE_THRESHOLD = 10  # seconds

# Default generation config
DEFAULT_GEN_CONFIG = {
    "temperature": 0.2,
    "max_output_tokens": 900,
    "top_p": 0.9,
    "top_k": 40,
}

# Safety settings (permissive for dental context)
DEFAULT_SAFETY = {
    'HARM_CATEGORY_HARASSMENT': 'BLOCK_NONE',
    'HARM_CATEGORY_HATE_SPEECH': 'BLOCK_NONE',
    'HARM_CATEGORY_SEXUALLY_EXPLICIT': 'BLOCK_NONE',
    'HARM_CATEGORY_DANGEROUS_CONTENT': 'BLOCK_NONE',
}

# ── Error Classification ──────────────────────────────────────────────────

QUOTA_ERROR_SIGNALS = ['quota', '429', 'resourceexhausted', 'rate_limit', 'rate limit']
TIMEOUT_ERROR_SIGNALS = ['timeout', 'deadline', 'timed out']
NETWORK_ERROR_SIGNALS = ['connection', 'network', 'unavailable', '503', '500']


def _classify_error(error: Exception) -> str:
    """Classify an LLM error into a category for logging and fallback decisions."""
    err_str = str(error).lower()
    err_type = type(error).__name__.lower()

    if any(sig in err_str or sig in err_type for sig in QUOTA_ERROR_SIGNALS):
        return 'quota_exceeded'
    if any(sig in err_str or sig in err_type for sig in TIMEOUT_ERROR_SIGNALS):
        return 'timeout'
    if any(sig in err_str or sig in err_type for sig in NETWORK_ERROR_SIGNALS):
        return 'network_error'
    return 'unknown_error'


# ── LLM Service Class ─────────────────────────────────────────────────────

class LLMService:
    """
    Centralized LLM service with automatic fallback.

    Usage:
        llm = LLMService()
        response = llm.generate(prompt)
        # Returns text string or None on total failure

        embedding = llm.generate_embedding(text)
        # Returns list of floats or None
    """

    def __init__(self):
        self._configured = False
        self._model = None
        self._api_available = True
        self._last_error_time = 0
        self._consecutive_failures = 0
        self._cooldown_until = 0
        # Per-provider circuit breaker config
        self._circuit_state = 'closed'  # closed=normal, open=failing, half_open=testing
        self._circuit_failure_threshold = 3  # failures before opening circuit
        self._circuit_cooldown_seconds = 60  # 60s (NOT 300s) before half-open retry
        self._half_open_success_threshold = 1  # successes to close circuit

    def _ensure_configured(self):
        """Configure Gemini API if not already done."""
        if self._configured:
            return
        load_dotenv()
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            logger.error("GEMINI_API_KEY not set — LLM will use fallback only")
            self._api_available = False
            self._configured = True
            return
        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel(PRIMARY_MODEL)
        self._configured = True
        logger.info("LLM service configured with model: %s", PRIMARY_MODEL)

    def _is_in_cooldown(self) -> bool:
        """Check circuit breaker state. Uses per-provider circuit breaker, NOT global cooldown."""
        if self._circuit_state == 'closed':
            return False

        if self._circuit_state == 'open':
            if time.time() >= self._cooldown_until:
                # Move to half-open: allow one test request
                self._circuit_state = 'half_open'
                logger.info("LLM circuit breaker: OPEN → HALF_OPEN (testing primary LLM)")
                return False
            return True

        # half_open: allow through
        return False

    def _record_failure(self, error_category: str):
        """Record a failure using per-provider circuit breaker logic."""
        self._consecutive_failures += 1
        self._last_error_time = time.time()

        if self._circuit_state == 'half_open':
            # Half-open test failed → back to open
            self._circuit_state = 'open'
            self._cooldown_until = time.time() + self._circuit_cooldown_seconds
            logger.warning(
                "CRITICAL_SERVICE_DEGRADED: LLM circuit breaker HALF_OPEN → OPEN "
                "(cooldown=%ds, error=%s)",
                self._circuit_cooldown_seconds, error_category,
            )
        elif self._consecutive_failures >= self._circuit_failure_threshold:
            # Too many failures → open circuit
            self._circuit_state = 'open'
            self._cooldown_until = time.time() + self._circuit_cooldown_seconds
            logger.warning(
                "CRITICAL_SERVICE_DEGRADED: LLM circuit breaker CLOSED → OPEN "
                "after %d failures (cooldown=%ds, last_error=%s)",
                self._consecutive_failures, self._circuit_cooldown_seconds, error_category,
            )

    def _record_success(self):
        """Reset circuit breaker on success."""
        if self._circuit_state == 'half_open':
            logger.info("LLM circuit breaker: HALF_OPEN → CLOSED (primary LLM recovered)")
        self._circuit_state = 'closed'
        self._consecutive_failures = 0
        self._cooldown_until = 0

    # ── Primary LLM Call ──────────────────────────────────────────────────

    def generate(
        self,
        prompt: str,
        generation_config: Optional[Dict[str, Any]] = None,
        safety_settings: Optional[Dict] = None,
    ) -> Optional[str]:
        """
        Generate text using the primary LLM (Gemini) with automatic retry.

        Args:
            prompt: The full prompt string.
            generation_config: Optional override for generation parameters.
            safety_settings: Optional override for safety settings.

        Returns:
            Generated text string, or None if all attempts fail.
        """
        self._ensure_configured()

        if not self._api_available or self._is_in_cooldown():
            logger.info("LLM unavailable or in cooldown — skipping primary call")
            return None

        config = generation_config or DEFAULT_GEN_CONFIG
        safety = safety_settings or DEFAULT_SAFETY

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                start = time.time()
                resp = self._model.generate_content(
                    prompt,
                    generation_config=config,
                    safety_settings=safety,
                )
                elapsed = time.time() - start

                if elapsed > SLOW_RESPONSE_THRESHOLD:
                    logger.warning("LLM slow response: %.2fs (threshold: %ds)", elapsed, SLOW_RESPONSE_THRESHOLD)
                else:
                    logger.info("LLM response in %.2fs (attempt %d)", elapsed, attempt)

                self._record_success()
                return resp.text

            except Exception as e:
                error_cat = _classify_error(e)
                logger.error(
                    "LLM error (attempt %d/%d, category=%s): %s",
                    attempt, MAX_RETRIES, error_cat, str(e)[:200],
                )

                if error_cat == 'quota_exceeded':
                    # No point retrying quota errors
                    self._record_failure(error_cat)
                    return None

                if attempt < MAX_RETRIES:
                    backoff = RETRY_BACKOFF_BASE * attempt
                    logger.info("Retrying in %.1fs...", backoff)
                    time.sleep(backoff)
                else:
                    self._record_failure(error_cat)

        return None

    # ── Embedding Generation ──────────────────────────────────────────────

    def generate_embedding(
        self,
        text: str,
        task_type: str = "RETRIEVAL_QUERY",
    ) -> Optional[list]:
        """
        Generate an embedding vector using Gemini's embedding API.

        Args:
            text: Text to embed.
            task_type: Either 'RETRIEVAL_QUERY' or 'RETRIEVAL_DOCUMENT'.

        Returns:
            List of floats (embedding vector), or None on failure.
        """
        if not text or not text.strip():
            return None

        self._ensure_configured()

        if not self._api_available:
            return None

        try:
            start = time.time()
            result = genai.embed_content(
                model=EMBEDDING_MODEL,
                content=text.strip(),
                task_type=task_type,
            )
            elapsed = time.time() - start
            embedding = result['embedding']
            logger.debug("Embedding generated (dim=%d) in %.2fs", len(embedding), elapsed)
            return embedding

        except Exception as e:
            error_cat = _classify_error(e)
            logger.error("Embedding generation failed (%s): %s", error_cat, str(e)[:200])
            return None

    # ── Status ────────────────────────────────────────────────────────────

    @property
    def is_available(self) -> bool:
        """True if the primary LLM is currently available (not in cooldown)."""
        self._ensure_configured()
        return self._api_available and not self._is_in_cooldown()

    def get_status(self) -> Dict[str, Any]:
        """Return current LLM service status for monitoring."""
        return {
            'api_available': self._api_available,
            'in_cooldown': self._is_in_cooldown(),
            'circuit_state': self._circuit_state,
            'consecutive_failures': self._consecutive_failures,
            'cooldown_until': self._cooldown_until,
            'model': PRIMARY_MODEL,
        }


# ── Module-level singleton ─────────────────────────────────────────────────

_llm_instance: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get the singleton LLM service instance."""
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = LLMService()
    return _llm_instance
