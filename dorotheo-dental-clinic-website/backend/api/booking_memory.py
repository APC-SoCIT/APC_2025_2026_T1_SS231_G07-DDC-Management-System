"""
Booking Session Memory Module
─────────────────────────────
Provides in-memory session state for the chatbot booking flow.
Implements the RAG + Short Term Memory Hybrid Decision Layer.

Memory persists only during session (30-min TTL).
Updated every user message.  Never overrides backend truth.
"""

from __future__ import annotations

import time
import logging
from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from datetime import date, time as time_obj

from .language_detection import LanguageContext, detect_language

logger = logging.getLogger('chatbot.booking_memory')

# ── In-memory store (keyed by user_id) ─────────────────────────────────────

_session_store: Dict[int, 'BookingSessionMemory'] = {}
_SESSION_TTL = 1800  # 30 minutes


# ── Data classes ────────────────────────────────────────────────────────────

@dataclass
class BookingDraft:
    """Tracks the current booking draft state."""
    clinic: Any = None
    clinic_name: str = ''
    dentist: Any = None
    dentist_name: str = ''
    date: Optional[date] = None
    time: Optional[time_obj] = None
    service: Any = None
    service_name: str = ''


@dataclass
class ConfidenceScores:
    """Confidence score for each booking field (0.0 – 1.0)."""
    clinic: float = 0.0
    dentist: float = 0.0
    date: float = 0.0
    time: float = 0.0
    service: float = 0.0

    CONFIRMATION_THRESHOLD = 0.8

    def all_confident(self) -> bool:
        """True when every field confidence meets the threshold."""
        return all(s >= self.CONFIRMATION_THRESHOLD for s in [
            self.clinic, self.dentist, self.date, self.time, self.service
        ])

    def any_uncertain(self) -> bool:
        """True if at least one field has a score below threshold but above 0."""
        return any(
            0 < s < self.CONFIRMATION_THRESHOLD
            for s in [self.clinic, self.dentist, self.date, self.time, self.service]
        )


@dataclass
class ConversationFlags:
    """Tracks conversation flow state for safety gating."""
    asked_confirmation: bool = False
    pending_rule_warning: bool = False
    booking_locked: bool = False
    confirmation_shown: bool = False
    user_confirmed: bool = False


@dataclass
class BookingSessionMemory:
    """
    Complete session memory for a single booking conversation.

    Structure matches the spec:
        booking_draft → BookingDraft
        confidence_scores → ConfidenceScores
        conversation_flags → ConversationFlags
        last_updated_timestamp → last_updated
    """
    draft: BookingDraft = field(default_factory=BookingDraft)
    confidence: ConfidenceScores = field(default_factory=ConfidenceScores)
    flags: ConversationFlags = field(default_factory=ConversationFlags)
    language: LanguageContext = field(default_factory=LanguageContext)
    last_updated: float = field(default_factory=time.time)
    created_at: float = field(default_factory=time.time)

    # Smart recommendation data
    patient_last_clinic_id: Optional[int] = None
    patient_last_dentist_id: Optional[int] = None
    recommendation_reason: str = ''

    def is_expired(self) -> bool:
        return (time.time() - self.last_updated) > _SESSION_TTL

    def touch(self):
        self.last_updated = time.time()

    def is_draft_complete(self) -> bool:
        return all([
            self.draft.clinic,
            self.draft.dentist,
            self.draft.date,
            self.draft.time,
            self.draft.service,
        ])

    def needs_confirmation(self) -> bool:
        """True if draft is complete but hasn't been confirmed yet."""
        return self.is_draft_complete() and not self.flags.user_confirmed

    def reset(self):
        """Reset memory for a new booking attempt."""
        self.draft = BookingDraft()
        self.confidence = ConfidenceScores()
        self.flags = ConversationFlags()
        # Language context is NOT reset — it persists across booking attempts
        self.touch()
        logger.info("Session memory reset")

    def get_summary(self) -> dict:
        """Return human-readable summary of draft state (for logging)."""
        return {
            'clinic': self.draft.clinic_name or None,
            'dentist': self.draft.dentist_name or None,
            'date': str(self.draft.date) if self.draft.date else None,
            'time': str(self.draft.time) if self.draft.time else None,
            'service': self.draft.service_name or None,
            'complete': self.is_draft_complete(),
            'confirmed': self.flags.user_confirmed,
        }


# ── Public API ──────────────────────────────────────────────────────────────

def get_session(user_id: int) -> BookingSessionMemory:
    """Get or create session memory for a user."""
    if user_id in _session_store:
        session = _session_store[user_id]
        if session.is_expired():
            logger.info("Session expired for user %d — creating new", user_id)
            session = BookingSessionMemory()
            _session_store[user_id] = session
        else:
            session.touch()
        return session

    session = BookingSessionMemory()
    _session_store[user_id] = session
    logger.info("New booking session created for user %d", user_id)
    return session


def clear_session(user_id: int):
    """Clear session memory after flow completes or is cancelled."""
    _session_store.pop(user_id, None)
    logger.info("Session cleared for user %d", user_id)


def update_draft(session: BookingSessionMemory, **kwargs):
    """
    Update draft fields and set confidence to 1.0 for each supplied field.
    Also stores human-readable names for display.
    """
    for key, value in kwargs.items():
        if value is not None and hasattr(session.draft, key):
            old_val = getattr(session.draft, key)
            setattr(session.draft, key, value)

            # Direct user input → high confidence
            if hasattr(session.confidence, key):
                setattr(session.confidence, key, 1.0)

            # Track human-readable names
            if key == 'clinic' and value:
                session.draft.clinic_name = (
                    value.name if hasattr(value, 'name') else str(value)
                )
            elif key == 'dentist' and value:
                name = (
                    value.get_full_name()
                    if hasattr(value, 'get_full_name')
                    else str(value)
                )
                session.draft.dentist_name = f"Dr. {name}"
            elif key == 'service' and value:
                session.draft.service_name = (
                    value.name if hasattr(value, 'name') else str(value)
                )

            logger.debug("Draft updated: %s = %s (was %s)", key, value, old_val)

    session.touch()


def cleanup_expired():
    """Remove all expired sessions from the in-memory store."""
    expired = [uid for uid, s in _session_store.items() if s.is_expired()]
    for uid in expired:
        del _session_store[uid]
    if expired:
        logger.info("Cleaned up %d expired sessions", len(expired))
