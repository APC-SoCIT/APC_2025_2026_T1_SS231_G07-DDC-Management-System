"""
Chatbot conversation flows.

Each flow manages a multi-step conversation (booking, reschedule, cancel).
Flows are deterministic — they use booking_service for all database operations
and never make LLM calls. Language-aware responses use the lang module.

Flow functions return a standard response dict:
  {'response': str, 'quick_replies': list, 'error': str|None}

Mobile-first formatting is enforced via the build_reply post-processor.
"""

import re
from datetime import time as time_obj, datetime, timedelta
from typing import Optional, List

# ── Mobile-First Constants ─────────────────────────────────────────────────

MAX_RESPONSE_LINES = 50
MAX_SECTION_LINES = 6
MAX_LIST_ITEMS = 30
MAX_TIME_SLOTS_SHOWN = 30


# ── Time Slot Grouping Utility ─────────────────────────────────────────────

def group_time_slots(slots: List[time_obj], fmt_func=None) -> List[str]:
    """
    Group continuous 30-min time slots into ranges.

    Example:
        [9:00, 9:30, 10:00, 10:30, 13:00, 13:30, 14:00]
        → ['9:00 AM – 10:30 AM', '1:00 PM – 2:00 PM']

    If fmt_func is None, uses default formatting.
    """
    if not slots:
        return []

    if fmt_func is None:
        def fmt_func(t):
            return t.strftime('%I:%M %p').lstrip('0')

    sorted_slots = sorted(slots)
    ranges = []
    range_start = sorted_slots[0]
    prev = sorted_slots[0]

    for slot in sorted_slots[1:]:
        # Check if this slot is 30 minutes after previous (continuous)
        prev_dt = datetime.combine(datetime.today(), prev)
        slot_dt = datetime.combine(datetime.today(), slot)
        if (slot_dt - prev_dt) == timedelta(minutes=30):
            prev = slot
        else:
            # Close current range — end is 30 min after last slot
            range_end_dt = datetime.combine(datetime.today(), prev) + timedelta(minutes=30)
            ranges.append(f"{fmt_func(range_start)} – {fmt_func(range_end_dt.time())}")
            range_start = slot
            prev = slot

    # Close final range
    range_end_dt = datetime.combine(datetime.today(), prev) + timedelta(minutes=30)
    ranges.append(f"{fmt_func(range_start)} – {fmt_func(range_end_dt.time())}")

    return ranges


def format_slots_mobile(slots: List[time_obj], fmt_func=None) -> str:
    """
    Format time slots for mobile display.
    Groups continuous slots into ranges.
    If too many individual ranges, shows first few + summary.
    """
    if not slots:
        return "No available time slots"

    ranges = group_time_slots(slots, fmt_func)

    if len(ranges) <= 3:
        return '\n'.join(f"• {r}" for r in ranges)

    # Show first 3 ranges + summary
    lines = [f"• {r}" for r in ranges[:3]]
    lines.append(f"_{len(slots)} total slots available upon booking._")
    return '\n'.join(lines)


# ── Mobile-First Post-Processor ────────────────────────────────────────────

def _enforce_mobile_format(text: str) -> str:
    """
    Post-process response text to enforce mobile-first formatting rules:
    - Max 22 lines total
    - Max 6 lines per section
    - Max 8 items in any list
    - No dense text blocks
    - Clean spacing between sections
    """
    if not text:
        return text

    # Don't process HTML tags (like <!-- [BOOK_STEP_X] -->)
    tag_match = re.search(r'\n\n<!-- \[.*?\] -->\s*$', text)
    tag_suffix = tag_match.group(0) if tag_match else ''
    if tag_suffix:
        text = text[:tag_match.start()]

    lines = text.split('\n')

    # ── Trim long bullet lists to MAX_LIST_ITEMS ──
    result_lines = []
    consecutive_bullets = 0
    bullet_section_start = -1

    for i, line in enumerate(lines):
        stripped = line.strip()
        is_bullet = stripped.startswith('•') or stripped.startswith('- ') or stripped.startswith('* ')

        if is_bullet:
            consecutive_bullets += 1
            if consecutive_bullets == 1:
                bullet_section_start = len(result_lines)
            if consecutive_bullets <= MAX_LIST_ITEMS:
                result_lines.append(line)
            elif consecutive_bullets == MAX_LIST_ITEMS + 1:
                result_lines.append("_...and more options available._")
        else:
            consecutive_bullets = 0
            result_lines.append(line)

    # ── Ensure clean spacing (one blank line between sections) ──
    cleaned = []
    prev_blank = False
    for line in result_lines:
        is_blank = not line.strip()
        if is_blank and prev_blank:
            continue  # Skip consecutive blank lines
        cleaned.append(line)
        prev_blank = is_blank

    # ── Smart compress if over MAX_RESPONSE_LINES ──
    if len(cleaned) > MAX_RESPONSE_LINES:
        # Keep first 18 lines + ellipsis
        cleaned = cleaned[:MAX_RESPONSE_LINES - 2]
        # Remove trailing blank line if present
        while cleaned and not cleaned[-1].strip():
            cleaned.pop()
        cleaned.append('')
        cleaned.append('_More details available — just ask!_')

    final = '\n'.join(cleaned)
    if tag_suffix:
        final += tag_suffix
    return final


def build_reply(
    text: str,
    quick_replies: Optional[List[str]] = None,
    tag: str = '',
    error: Optional[str] = None,
) -> dict:
    """Build a standardized chatbot response dict with mobile-first formatting."""
    body = text or ''
    if tag:
        body += f'\n\n<!-- {tag} -->'

    # Enforce mobile-first formatting rules
    body = _enforce_mobile_format(body)

    return {
        'response': body,
        'quick_replies': quick_replies or [],
        'error': error,
    }
