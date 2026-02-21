"""
Chatbot Security Monitor & Logging Service
────────────────────────────────────────────
Logs security-relevant events from the chatbot:

  - Invalid booking attempts
  - Repeated booking attempts
  - SQL injection attempts
  - Prompt injection attempts
  - Abnormal input patterns
  - Sensitive-info probing

IMPORTANT: Logs are NEVER exposed to the user.
"""

import re
import logging
import time
from collections import defaultdict
from typing import Optional

logger = logging.getLogger('chatbot.security')


# ── Threat Pattern Definitions ─────────────────────────────────────────────

SQL_INJECTION_PATTERNS = [
    r"(?:--|;)\s*(DROP|DELETE|ALTER|INSERT|UPDATE|SELECT|UNION)\b",
    r"'\s*(OR|AND)\s+'",
    r"'\s*(OR|AND)\s+\d+\s*=\s*\d+",
    r"(?:UNION\s+SELECT)",
    r"(?:1\s*=\s*1)",
    r"(?:admin'\s*--)",
    r"(?:'\s*;\s*--)",
    r"(?:EXEC\s+\w+)",
    r"(?:xp_cmdshell)",
    r"(?:INFORMATION_SCHEMA)",
    r"(?:sys\.tables)",
    r"(?:LOAD_FILE)",
    r"(?:INTO\s+OUTFILE)",
]

PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(?:all\s+)?(?:previous|above|prior)\s+instructions",
    r"disregard\s+(?:all\s+)?(?:previous|above|prior)\s+instructions",
    r"forget\s+(?:all\s+)?(?:previous|above|prior)\s+instructions",
    r"you\s+are\s+now\s+(?:a|an)\s+\w+",
    r"pretend\s+(?:to\s+be|you\s+are)",
    r"system\s*:\s*",
    r"(?:reveal|show|display|print|give)\s+(?:me\s+)?(?:your|the)\s+(?:system|initial|original)\s+prompt",
    r"(?:reveal|show|display|print|give)\s+(?:me\s+)?(?:your|the)\s+(?:instructions|config)",
    r"what\s+(?:is|are)\s+your\s+(?:system|initial)\s+(?:prompt|instructions)",
    r"act\s+as\s+(?:if\s+you\s+(?:are|were))",
    r"\[SYSTEM\]",
    r"\[INST\]",
    r"<\|system\|>",
    r"<\|user\|>",
]

SENSITIVE_INFO_PATTERNS = [
    r"(?:api|secret|private)\s*key",
    r"(?:database|db)\s*(?:schema|structure|table|credential|password)",
    r"(?:supabase|postgres|mysql|redis)\s*(?:url|credential|password|connection)",
    r"(?:environment|env)\s*variable",
    r"(?:admin|staff|owner)\s*(?:password|credential|login)",
    r"(?:model|llm|ai)\s*(?:you\s+(?:use|are|using)|configuration|prompt)",
    r"what\s+model\s+(?:are\s+you|do\s+you)\s+(?:use|using)",
    r"(?:show|give|reveal|tell)\s+(?:me\s+)?(?:your|the)\s+(?:source|code|backend|architecture)",
    r"(?:internal|hidden)\s+(?:endpoint|api|route|url)",
    r"(?:error|stack)\s*trace",
    r"(?:log|debug)\s*(?:file|output|message)",
    r"(?:connection|conn)\s*string",
    r"(?:rate\s+limit|throttle)\s+(?:logic|config|setting)",
    r"(?:fallback|failover)\s+(?:logic|model|strategy)",
]

ABNORMAL_INPUT_PATTERNS = [
    r".{500,}",                     # Excessively long messages
    r"[^\x00-\x7F]{50,}",         # Large blocks of non-ASCII
    r"(.)\1{20,}",                  # Char repetition (e.g., "aaaa...")
    r"[\x00-\x08\x0e-\x1f]",      # Control characters
]


# ── Compiled Patterns ──────────────────────────────────────────────────────

_sql_re = [re.compile(p, re.IGNORECASE) for p in SQL_INJECTION_PATTERNS]
_prompt_re = [re.compile(p, re.IGNORECASE) for p in PROMPT_INJECTION_PATTERNS]
_sensitive_re = [re.compile(p, re.IGNORECASE) for p in SENSITIVE_INFO_PATTERNS]
_abnormal_re = [re.compile(p) for p in ABNORMAL_INPUT_PATTERNS]


# ── Rate Tracking (in-memory, per-user) ────────────────────────────────────

_booking_attempt_tracker = defaultdict(list)  # user_id → [timestamp, ...]
MAX_BOOKING_ATTEMPTS_PER_HOUR = 15


# ══════════════════════════════════════════════════════════════════════════
# DETECTION FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════

def detect_sql_injection(message: str) -> bool:
    """Check for SQL injection patterns in user message."""
    for pattern in _sql_re:
        if pattern.search(message):
            logger.warning(
                "SQL injection attempt detected: pattern=%s input=%.100s",
                pattern.pattern, message,
            )
            return True
    return False


def detect_prompt_injection(message: str) -> bool:
    """Check for prompt injection/jailbreak patterns."""
    for pattern in _prompt_re:
        if pattern.search(message):
            logger.warning(
                "Prompt injection attempt detected: pattern=%s input=%.100s",
                pattern.pattern, message,
            )
            return True
    return False


def detect_sensitive_info_probe(message: str) -> bool:
    """Check if user is probing for sensitive system information."""
    for pattern in _sensitive_re:
        if pattern.search(message):
            logger.info(
                "Sensitive info probe detected: pattern=%s input=%.100s",
                pattern.pattern, message,
            )
            return True
    return False


def detect_abnormal_input(message: str) -> bool:
    """Check for abnormal input patterns (excessive length, control chars, etc.)."""
    for pattern in _abnormal_re:
        if pattern.search(message):
            logger.warning(
                "Abnormal input detected: pattern=%s length=%d",
                pattern.pattern, len(message),
            )
            return True
    return False


# ══════════════════════════════════════════════════════════════════════════
# COMPOSITE SECURITY CHECK
# ══════════════════════════════════════════════════════════════════════════

def check_message_security(
    message: str,
    user_id: Optional[int] = None,
) -> tuple:
    """
    Run all security checks on a user message.

    Args:
        message: The raw user message.
        user_id: Optional user ID for rate tracking.

    Returns:
        (is_safe: bool, threat_type: str | None, safe_response: str | None)

        If is_safe=True, proceed normally.
        If is_safe=False, return safe_response instead of processing the message.
    """
    safe_response = (
        "I'm here to assist you with clinic-related questions. "
        "Let me know how I can help."
    )

    # Check SQL injection
    if detect_sql_injection(message):
        _log_security_event('sql_injection', message, user_id)
        return False, 'sql_injection', safe_response

    # Check prompt injection
    if detect_prompt_injection(message):
        _log_security_event('prompt_injection', message, user_id)
        return False, 'prompt_injection', safe_response

    # Check sensitive info probing
    if detect_sensitive_info_probe(message):
        _log_security_event('sensitive_probe', message, user_id)
        return False, 'sensitive_probe', safe_response

    # Check abnormal input
    if detect_abnormal_input(message):
        _log_security_event('abnormal_input', message, user_id)
        return False, 'abnormal_input', (
            "I wasn't able to process that message. "
            "Could you please rephrase your question?"
        )

    return True, None, None


# ══════════════════════════════════════════════════════════════════════════
# BOOKING RATE LIMITER
# ══════════════════════════════════════════════════════════════════════════

def check_booking_rate(user_id: int) -> bool:
    """
    Check if user is making too many booking attempts per hour.
    Returns True if under limit, False if exceeded.
    """
    now = time.time()
    one_hour_ago = now - 3600

    # Clean old entries
    _booking_attempt_tracker[user_id] = [
        t for t in _booking_attempt_tracker[user_id] if t > one_hour_ago
    ]

    if len(_booking_attempt_tracker[user_id]) >= MAX_BOOKING_ATTEMPTS_PER_HOUR:
        logger.warning(
            "Booking rate limit exceeded: user=%s attempts=%d/hr",
            user_id, len(_booking_attempt_tracker[user_id]),
        )
        return False

    _booking_attempt_tracker[user_id].append(now)
    return True


def record_booking_attempt(user_id: int):
    """Record a booking attempt for rate limiting."""
    _booking_attempt_tracker[user_id].append(time.time())


# ══════════════════════════════════════════════════════════════════════════
# INTERNAL LOGGING
# ══════════════════════════════════════════════════════════════════════════

def _log_security_event(
    event_type: str,
    message: str,
    user_id: Optional[int] = None,
):
    """
    Log a security event. NEVER expose logs to the user.
    """
    logger.warning(
        "SECURITY_EVENT type=%s user=%s message_length=%d preview=%.80s",
        event_type,
        user_id or 'anonymous',
        len(message),
        message[:80].replace('\n', ' '),
    )


def log_invalid_booking_attempt(
    user_id: int,
    reason: str,
    details: Optional[str] = None,
):
    """Log an invalid booking attempt (e.g. rule violation)."""
    logger.info(
        "BOOKING_REJECTED user=%s reason=%s details=%s",
        user_id, reason, details or 'N/A',
    )


def log_repeated_booking_attempt(user_id: int, count: int):
    """Log repeated booking attempts from same user."""
    logger.warning(
        "REPEATED_BOOKING_ATTEMPTS user=%s count=%d",
        user_id, count,
    )
