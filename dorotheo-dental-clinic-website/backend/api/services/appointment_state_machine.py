"""
Centralized Appointment State Machine
──────────────────────────────────────
Enforces valid state transitions for appointments.

Valid States:
  pending         → Newly created, awaiting staff review
  confirmed       → Confirmed by staff
  waiting         → Patient checked in, waiting
  rejected        → Denied by staff
  reschedule_requested → Reschedule requested, awaiting approval
  cancel_requested     → Cancellation requested, awaiting approval
  cancelled       → Successfully cancelled
  completed       → Appointment finished
  missed          → Patient no-show

Transition Rules:
  - Only explicitly defined transitions are allowed
  - No illegal state jumps
  - All transitions are logged
"""

import logging
from typing import Optional, Tuple, List

logger = logging.getLogger('chatbot.state_machine')


# ══════════════════════════════════════════════════════════════════════════
# VALID STATES
# ══════════════════════════════════════════════════════════════════════════

VALID_STATES = {
    'pending',
    'confirmed',
    'waiting',
    'rejected',
    'reschedule_requested',
    'cancel_requested',
    'cancelled',
    'completed',
    'missed',
}


# ══════════════════════════════════════════════════════════════════════════
# TRANSITION MAP — {from_state: [to_state, ...]}
# ══════════════════════════════════════════════════════════════════════════

VALID_TRANSITIONS = {
    'pending': [
        'confirmed',           # Staff approves
        'rejected',            # Staff rejects
        'cancelled',           # Admin force-cancel
    ],
    'confirmed': [
        'waiting',             # Patient checks in
        'reschedule_requested',  # Patient requests reschedule
        'cancel_requested',    # Patient requests cancellation
        'completed',           # Appointment done
        'missed',              # Patient no-show
        'cancelled',           # Admin force-cancel
    ],
    'waiting': [
        'completed',           # Treatment done
        'cancelled',           # Patient left / admin cancel
        'missed',              # No-show after check-in
    ],
    'rejected': [
        # Terminal state — no further transitions
    ],
    'reschedule_requested': [
        'confirmed',           # Staff approves reschedule
        'rejected',            # Staff rejects reschedule
        'cancelled',           # Admin force-cancel
    ],
    'cancel_requested': [
        'cancelled',           # Staff approves cancellation
        'confirmed',           # Staff rejects cancellation (keeps appointment)
    ],
    'cancelled': [
        # Terminal state — no further transitions
    ],
    'completed': [
        # Terminal state — no further transitions
    ],
    'missed': [
        # Terminal state — no further transitions
    ],
}


# ══════════════════════════════════════════════════════════════════════════
# STATE VALIDATION
# ══════════════════════════════════════════════════════════════════════════

def is_valid_state(state: str) -> bool:
    """Check if a state is a recognized appointment state."""
    return state in VALID_STATES


def is_valid_transition(from_state: str, to_state: str) -> bool:
    """
    Check if transitioning from `from_state` to `to_state` is allowed.

    Returns True if the transition is valid, False otherwise.
    """
    if from_state not in VALID_STATES:
        logger.error("Invalid from_state: %s", from_state)
        return False
    if to_state not in VALID_STATES:
        logger.error("Invalid to_state: %s", to_state)
        return False

    allowed = VALID_TRANSITIONS.get(from_state, [])
    return to_state in allowed


def get_allowed_transitions(state: str) -> List[str]:
    """Return list of states that can be transitioned to from the given state."""
    if state not in VALID_STATES:
        return []
    return list(VALID_TRANSITIONS.get(state, []))


def is_terminal_state(state: str) -> bool:
    """Check if a state is terminal (no further transitions allowed)."""
    return state in VALID_STATES and len(VALID_TRANSITIONS.get(state, [])) == 0


# ══════════════════════════════════════════════════════════════════════════
# STATE TRANSITION (Atomic)
# ══════════════════════════════════════════════════════════════════════════

def transition_appointment(
    appointment,
    new_state: str,
    actor: Optional[str] = None,
    reason: Optional[str] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Attempt to transition an appointment to a new state.

    This validates the transition before performing it.
    Uses Django's save() — caller should wrap in transaction.atomic()
    if needed.

    Args:
        appointment: The Appointment model instance.
        new_state: Target state string.
        actor: Who initiated the transition (for logging).
        reason: Optional reason (for logging/audit).

    Returns:
        (True, None) on success.
        (False, error_message) if transition is invalid.
    """
    old_state = appointment.status

    if not is_valid_state(old_state):
        msg = f"Appointment {appointment.id} has invalid current state: '{old_state}'"
        logger.error(msg)
        return False, msg

    if not is_valid_state(new_state):
        msg = f"Invalid target state: '{new_state}'"
        logger.error(msg)
        return False, msg

    if not is_valid_transition(old_state, new_state):
        allowed = get_allowed_transitions(old_state)
        msg = (
            f"Cannot transition appointment #{appointment.id} from "
            f"'{old_state}' to '{new_state}'. "
            f"Allowed transitions from '{old_state}': {allowed}"
        )
        logger.warning(msg)
        return False, "This appointment is not eligible for that action at this time."

    # Perform the transition
    appointment.status = new_state
    appointment.save(update_fields=['status', 'updated_at'])

    logger.info(
        "State transition: appointment=%d '%s' → '%s' (actor=%s, reason=%s)",
        appointment.id, old_state, new_state,
        actor or 'system', reason or 'N/A',
    )

    return True, None


# ══════════════════════════════════════════════════════════════════════════
# CONVENIENCE HELPERS
# ══════════════════════════════════════════════════════════════════════════

def can_reschedule(appointment) -> bool:
    """Quick check: can this appointment be rescheduled?"""
    return is_valid_transition(appointment.status, 'reschedule_requested')


def can_cancel(appointment) -> bool:
    """Quick check: can this appointment be cancelled/cancel-requested?"""
    return (
        is_valid_transition(appointment.status, 'cancel_requested')
        or is_valid_transition(appointment.status, 'cancelled')
    )


def can_complete(appointment) -> bool:
    """Quick check: can this appointment be completed?"""
    return is_valid_transition(appointment.status, 'completed')
