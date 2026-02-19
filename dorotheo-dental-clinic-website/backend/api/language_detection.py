"""
Text-Only Multi-Language Detection & Normalization
───────────────────────────────────────────────────
Supports: English, Tagalog, Taglish (mixed).

All processing is local (no external APIs).
Optimized for typed dental-clinic messages.
"""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field
from typing import Optional, Dict, List, Tuple

logger = logging.getLogger('chatbot.language')

# ── Language constants ──────────────────────────────────────────────────────

LANG_ENGLISH = 'en'
LANG_TAGALOG = 'tl'
LANG_TAGLISH = 'tl_en'

# ── Vocabulary lists for detection ─────────────────────────────────────────

# High-signal Tagalog words (function words, question words, particles)
TAGALOG_MARKERS = {
    # Question words
    'ano', 'sino', 'saan', 'kailan', 'paano', 'magkano', 'bakit', 'gaano',
    # Particles / linkers
    'po', 'nga', 'naman', 'lang', 'din', 'rin', 'daw', 'raw', 'ba',
    'kasi', 'pala', 'talaga', 'sana', 'yata', 'muna',
    # Pronouns / determiners
    'ko', 'mo', 'niya', 'namin', 'natin', 'ninyo', 'nila',
    'ako', 'ikaw', 'siya', 'kami', 'tayo', 'kayo', 'sila',
    'akin', 'iyo', 'atin', 'amin',
    'yung', 'itong', 'iyon', 'ito', 'iyan', 'dito', 'diyan', 'doon',
    'mga',
    # Common verbs / prefixes
    'gusto', 'ayaw', 'kailangan', 'pwede', 'puwede', 'meron', 'wala',
    'mag', 'magpa', 'paki', 'pa',
    # Prepositions / connectors
    'sa', 'ng', 'na', 'at', 'o', 'pero', 'dahil', 'para', 'kung',
    # Time
    'bukas', 'ngayon', 'mamaya', 'kahapon', 'kanina',
    'umaga', 'hapon', 'gabi', 'tanghali',
    'lunes', 'martes', 'miyerkules', 'huwebes', 'biyernes', 'sabado', 'linggo',
    # Dental / booking
    'ngipin', 'dentista', 'serbisyo', 'konsulta',
    'bunot', 'linis', 'pasta', 'pustiso', 'pabunot', 'pacheck', 'papasta',
    'magbook', 'pabook', 'palitan', 'ilipat', 'ikansel',
    # Polite
    'opo', 'oho', 'salamat', 'pasensya', 'paumanhin',
    # Greetings
    'kamusta', 'kumusta', 'magandang',
    # Common Taglish markers
    'sige', 'tara', 'ayan', 'huwag', 'wag',
}

# English-only words that are NOT commonly used in Tagalog
ENGLISH_MARKERS = {
    'the', 'is', 'are', 'was', 'were', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'might', 'must', 'shall',
    'this', 'that', 'these', 'those',
    'not', 'but', 'or', 'and', 'if', 'then', 'because', 'while',
    'with', 'from', 'into', 'through', 'during', 'before', 'after',
    'about', 'between', 'under', 'above',
    'what', 'which', 'who', 'whom', 'where', 'when', 'why', 'how',
    'any', 'each', 'every', 'some', 'most', 'other',
    'please', 'thank', 'thanks', 'sorry',
    'appointment', 'available', 'schedule', 'booking', 'reschedule',
    'services', 'dentist', 'clinic', 'dental',
    'tomorrow', 'today', 'yesterday', 'morning', 'afternoon', 'evening',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
}

# Short words shared by both languages (excluded from scoring)
SHARED_WORDS = {'ok', 'okay', 'yes', 'no', 'hi', 'hello', 'hey', 'pm', 'am'}

# ── Tagalog-to-English normalization dictionary (for RAG queries) ──────────

TAGALOG_TO_ENGLISH: Dict[str, str] = {
    # Time
    'bukas': 'tomorrow',
    'ngayon': 'today',
    'mamaya': 'later today',
    'kahapon': 'yesterday',
    'kanina': 'earlier today',
    'umaga': 'morning',
    'hapon': 'afternoon',
    'gabi': 'evening',
    'tanghali': 'noon',
    # Days
    'lunes': 'Monday',
    'martes': 'Tuesday',
    'miyerkules': 'Wednesday',
    'huwebes': 'Thursday',
    'biyernes': 'Friday',
    'sabado': 'Saturday',
    'linggo': 'Sunday',
    'susunod na linggo': 'next week',
    # Dental terms
    'ngipin': 'tooth',
    'mga ngipin': 'teeth',
    'dentista': 'dentist',
    'serbisyo': 'services',
    'konsulta': 'consultation',
    'bunot': 'extraction',
    'pabunot': 'extraction',
    'linis': 'cleaning',
    'paglinis': 'cleaning',
    'pasta': 'filling',
    'papasta': 'filling',
    'pustiso': 'dentures',
    'pacheck': 'checkup',
    'paputi': 'whitening',
    'paputi ng ngipin': 'teeth whitening',
    # Booking actions
    'magbook': 'book',
    'pabook': 'book',
    'palitan': 'change',
    'ilipat': 'reschedule',
    'ikansel': 'cancel',
    'pa-schedule': 'schedule',
    'pa-resched': 'reschedule',
    # Question words
    'ano': 'what',
    'sino': 'who',
    'saan': 'where',
    'kailan': 'when',
    'paano': 'how',
    'magkano': 'how much',
    'meron': 'is there',
    'may': 'is there',
    # Common
    'available': 'available',  # pass-through
    'open': 'open',
    'bukas kayo': 'are you open',
    'oras': 'hours',
    'oras ng clinic': 'clinic hours',
    'address ng clinic': 'clinic address',
}

# ── Tagalog prompt injection patterns ──────────────────────────────────────

TAGALOG_INJECTION_PATTERNS = [
    r'kalimutan\s+.*?instruksyon',         # forget instructions
    r'balewalain\s+.*?instruksyon',        # ignore instructions
    r'huwag\s+sundin\s+.*?instruksyon',    # don't follow instructions
    r'ikaw\s+ay\s+isa\s+nang',            # "you are now a..."
    r'system\s*:\s*',                       # literal system: prompt
    r'bagong\s+instruksyon',               # new instructions
    r'palitan\s+.*?personality',           # change personality
    r'i-ignore\s+.*?rules',               # i-ignore rules
    r'wag\s+mong\s+sundin',               # don't follow
    r'admin\s*mode',                        # admin mode
]


# ── Language context dataclass ─────────────────────────────────────────────

@dataclass
class LanguageContext:
    """Session-level language tracking."""
    primary_language: str = LANG_ENGLISH
    last_message_language: str = LANG_ENGLISH
    language_style: str = 'formal'       # formal | casual | taglish_mix
    confidence_score: float = 0.5
    message_count: int = 0
    tagalog_message_count: int = 0
    english_message_count: int = 0
    taglish_message_count: int = 0

    def update(self, detected_lang: str, confidence: float, style: str):
        """Update language context after each message."""
        self.last_message_language = detected_lang
        self.confidence_score = confidence
        self.language_style = style
        self.message_count += 1

        if detected_lang == LANG_TAGALOG:
            self.tagalog_message_count += 1
        elif detected_lang == LANG_ENGLISH:
            self.english_message_count += 1
        else:
            self.taglish_message_count += 1

        # Primary language = whichever has more messages
        counts = {
            LANG_ENGLISH: self.english_message_count,
            LANG_TAGALOG: self.tagalog_message_count,
            LANG_TAGLISH: self.taglish_message_count,
        }
        self.primary_language = max(counts, key=counts.get)


# ── Core detection ─────────────────────────────────────────────────────────

def detect_language(text: str) -> Tuple[str, float, str]:
    """
    Detect language from typed text.

    Returns:
        (language_code, confidence_score, style)

        language_code: 'en' | 'tl' | 'tl_en'
        confidence_score: 0.0 – 1.0
        style: 'formal' | 'casual' | 'taglish_mix'
    """
    if not text or not text.strip():
        return LANG_ENGLISH, 0.5, 'formal'

    low = text.lower().strip()
    words = re.findall(r'[a-záéíóúñ]+', low)

    if not words:
        return LANG_ENGLISH, 0.5, 'formal'

    total = len(words)
    tl_count = 0
    en_count = 0

    for w in words:
        if w in SHARED_WORDS:
            continue
        if w in TAGALOG_MARKERS:
            tl_count += 1
        elif w in ENGLISH_MARKERS:
            en_count += 1

    # Ratio-based detection
    scored = tl_count + en_count
    if scored == 0:
        # No strong markers; check for Tagalog morphology
        if _has_tagalog_morphology(low):
            return LANG_TAGALOG, 0.6, _detect_style(low, LANG_TAGALOG)
        return LANG_ENGLISH, 0.5, 'formal'

    tl_ratio = tl_count / scored

    if tl_ratio >= 0.7:
        lang = LANG_TAGALOG
        conf = min(0.95, 0.6 + tl_ratio * 0.35)
    elif tl_ratio <= 0.2:
        lang = LANG_ENGLISH
        conf = min(0.95, 0.6 + (1 - tl_ratio) * 0.35)
    else:
        lang = LANG_TAGLISH
        conf = 0.7 + abs(tl_ratio - 0.5) * 0.3

    style = _detect_style(low, lang)

    logger.debug(
        "Language detected: %s (conf=%.2f style=%s) tl=%d en=%d total=%d",
        lang, conf, style, tl_count, en_count, total,
    )
    return lang, conf, style


def _has_tagalog_morphology(text: str) -> bool:
    """Check for Tagalog verb prefixes/infixes as a fallback signal."""
    patterns = [
        r'\bmag[a-z]+',      # mag- prefix
        r'\bmagpa[a-z]+',    # magpa- prefix
        r'\bpa[a-z]+in\b',   # pa-...-in circumfix
        r'\bi-[a-z]+',       # i- prefix
        r'\bum[a-z]+',       # -um- infix
        r'\bin[a-z]+',       # -in- infix
        r'\bna[a-z]+an\b',   # na-...-an circumfix
    ]
    return any(re.search(p, text) for p in patterns)


def _detect_style(text: str, lang: str) -> str:
    """Detect conversational style: formal, casual, or taglish_mix."""
    low = text.lower()

    if lang == LANG_TAGLISH:
        return 'taglish_mix'

    # Formal markers
    if any(m in low for m in ['po', 'opo', 'ho', 'oho']):
        return 'formal'

    # Casual markers
    casual_markers = ['haha', 'hehe', 'lol', 'omg', 'btw', 'tara', 'g', 'sige', 'gg']
    if any(m in low for m in casual_markers):
        return 'casual'

    if lang == LANG_TAGALOG:
        return 'casual'  # Tagalog without 'po' tends to be casual

    return 'formal'


# ── RAG Query Normalization ────────────────────────────────────────────────

def normalize_for_rag(text: str) -> str:
    """
    Normalize a user message into a canonical English query for RAG.

    Steps:
        1. Replace known Tagalog tokens with English equivalents
        2. Remove particles/filler words
        3. Keep English words as-is
        4. Collapse whitespace

    This NEVER modifies the user-facing response — only the RAG search query.
    """
    if not text or not text.strip():
        return text

    low = text.lower().strip()

    # Multi-word replacements first (longer patterns first)
    sorted_phrases = sorted(TAGALOG_TO_ENGLISH.keys(), key=len, reverse=True)
    for phrase in sorted_phrases:
        if ' ' in phrase and phrase in low:
            low = low.replace(phrase, TAGALOG_TO_ENGLISH[phrase])

    # Single-word replacements
    words = low.split()
    normalized = []
    filler = {'po', 'nga', 'naman', 'lang', 'din', 'rin', 'daw', 'raw',
              'ba', 'kasi', 'pala', 'talaga', 'sana', 'yata', 'muna',
              'na', 'pa', 'ko', 'mo', 'niya', 'yung', 'mga', 'sa', 'ng', 'at'}

    for w in words:
        if w in TAGALOG_TO_ENGLISH:
            normalized.append(TAGALOG_TO_ENGLISH[w])
        elif w in filler:
            continue  # Drop filler particles
        else:
            normalized.append(w)

    result = ' '.join(normalized).strip()
    result = re.sub(r'\s+', ' ', result)

    if result != text.strip().lower():
        logger.debug("RAG normalize: '%s' → '%s'", text.strip()[:60], result[:60])

    return result


# ── Prompt injection sanitization (multi-language) ─────────────────────────

def sanitize_multilang(text: str) -> str:
    """
    Sanitize user text for prompt injection in English, Tagalog, and Taglish.
    Returns cleaned text. Never allows user text to modify system instructions.
    """
    if not text:
        return text

    # English injection patterns (existing)
    english_patterns = [
        r'ignore\s+previous\s+instructions',
        r'ignore\s+all\s+instructions',
        r'disregard\s+.*?instructions',
        r'you\s+are\s+now\s+',
        r'forget\s+everything',
        r'system\s*:\s*',
    ]

    all_patterns = english_patterns + TAGALOG_INJECTION_PATTERNS

    for pat in all_patterns:
        text = re.sub(pat, '[FILTERED]', text, flags=re.IGNORECASE)

    return text


# ── Multi-language message templates ──────────────────────────────────────

def confirmation_header(lang: str) -> str:
    """Get the confirmation prompt header in the appropriate language."""
    if lang == LANG_TAGALOG:
        return "**Para makasigurado po, ito po ang booking details ninyo:**"
    elif lang == LANG_TAGLISH:
        return "**Just to confirm po, ito yung booking details:**"
    return "**Please confirm your booking:**"


def confirmation_yes_no(lang: str) -> str:
    """Get the yes/no instruction in the appropriate language."""
    if lang == LANG_TAGALOG:
        return "Tama po ba ito? Mag-reply po ng **Oo** para i-confirm o **Hindi** para i-cancel."
    elif lang == LANG_TAGLISH:
        return "Is this correct po? Reply **Yes** to confirm or **No** to cancel."
    return "Is this correct? Reply **Yes** to confirm or **No** to cancel."


def confirmation_buttons(lang: str) -> List[str]:
    """Get confirmation button labels in the appropriate language."""
    if lang == LANG_TAGALOG:
        return ['Oo, I-confirm', 'Hindi, Ulitin']
    elif lang == LANG_TAGLISH:
        return ['Yes, Confirm po', 'No, Start Over']
    return ['Yes, Confirm', 'No, Start Over']


def step_label(step_num: int, label: str, lang: str) -> str:
    """Get a step label like 'Step 1: Choose a Clinic' in the right language."""
    if lang == LANG_TAGALOG:
        labels = {
            'clinic': 'Pumili ng Clinic',
            'dentist': 'Pumili ng Dentista',
            'date': 'Pumili ng Petsa',
            'time': 'Pumili ng Oras',
            'service': 'Pumili ng Serbisyo',
        }
        tl_label = labels.get(label, label)
        return f"**Hakbang {step_num}: {tl_label}**"
    elif lang == LANG_TAGLISH:
        labels = {
            'clinic': 'Choose a Clinic',
            'dentist': 'Choose a Dentist',
            'date': 'Choose a Date',
            'time': 'Choose a Time',
            'service': 'Choose a Service',
        }
        return f"**Step {step_num}: {labels.get(label, label)}**"
    else:
        labels = {
            'clinic': 'Choose a Clinic',
            'dentist': 'Choose a Dentist',
            'date': 'Choose a Date',
            'time': 'Choose a Time',
            'service': 'Choose a Service',
        }
        return f"**Step {step_num}: {labels.get(label, label)}**"


def select_prompt(label: str, lang: str) -> str:
    """Get 'Please select a ...:' in the appropriate language."""
    if lang == LANG_TAGALOG:
        labels = {
            'clinic': 'Pumili po ng clinic:',
            'dentist': 'Pumili po ng dentista:',
            'date': 'Pumili po ng petsa:',
            'time': 'Pumili po ng oras:',
            'service': 'Pumili po ng serbisyo:',
        }
        return labels.get(label, f'Pumili po ng {label}:')
    elif lang == LANG_TAGLISH:
        return f'Please select a {label} po:'
    return f'Please select a {label}:'


def booking_success(lang: str) -> str:
    """Get success message header."""
    if lang == LANG_TAGALOG:
        return "✅ **Matagumpay na Na-book ang Appointment!**"
    elif lang == LANG_TAGLISH:
        return "✅ **Appointment Booked Successfully po!**"
    return "✅ **Appointment Booked Successfully!**"


def booking_success_footer(lang: str) -> str:
    """Get success message footer."""
    if lang == LANG_TAGALOG:
        return "Na-confirm na po ang inyong appointment! Hanggang sa muli!"
    elif lang == LANG_TAGLISH:
        return "Your appointment has been confirmed po! See you soon!"
    return "Your appointment has been confirmed! See you soon."


def booking_cancelled(lang: str) -> str:
    """Get booking cancellation by user message."""
    if lang == LANG_TAGALOG:
        return ("Walang problema po! Hindi na-book ang appointment ninyo. "
                "Pwede po kayong mag-book ulit sa pamamagitan ng pagsasabi ng **Book Appointment**.")
    elif lang == LANG_TAGLISH:
        return ("No problem po! Hindi na-book yung appointment. "
                "You can start a new booking anytime by saying **Book Appointment**.")
    return ("No problem! Your booking has not been placed. "
            "You can start a new booking anytime by saying **Book Appointment**.")


def reprompt_confirmation(lang: str) -> str:
    """Re-prompt when user gives unclear confirmation response."""
    if lang == LANG_TAGALOG:
        return ("Kailangan ko po ng kumpirmasyon ninyo para magpatuloy. "
                "Mag-reply po ng **Oo** para i-confirm o **Hindi** para i-cancel.")
    elif lang == LANG_TAGLISH:
        return ("I need your confirmation po to proceed. "
                "Please reply **Yes** to confirm or **No** to cancel.")
    return ("I need your confirmation to proceed. "
            "Please reply **Yes** to confirm or **No** to cancel.")


def smart_rec_clinic(clinic_name: str, lang: str) -> str:
    """Smart recommendation note for clinic."""
    if lang == LANG_TAGALOG:
        return f"💡 *Batay sa inyong dating bisita, inirerekomenda namin ang **{clinic_name}**.*"
    elif lang == LANG_TAGLISH:
        return f"💡 *Based on your visit history po, we recommend **{clinic_name}**.*"
    return f"💡 *Based on your visit history, we recommend **{clinic_name}**.*"


def smart_rec_dentist(dentist_name: str, lang: str) -> str:
    """Smart recommendation note for dentist."""
    if lang == LANG_TAGALOG:
        return f"💡 *Ang huling dentista ninyo dito ay si **Dr. {dentist_name}**.*"
    elif lang == LANG_TAGLISH:
        return f"💡 *You last visited **Dr. {dentist_name}** here po.*"
    return f"💡 *You last visited **Dr. {dentist_name}** here.*"


def security_block(lang: str) -> str:
    """Security block message."""
    if lang == LANG_TAGALOG:
        return ("Hindi ko po maibigay ang impormasyon tungkol sa system credentials "
                "o pribadong data. Nandito po ako para tumulong sa dental services at appointments. "
                "Paano ko pa po kayo matutulungan?")
    elif lang == LANG_TAGLISH:
        return ("I can't provide information po about system credentials or "
                "private data. I'm here to help with dental services and appointments. "
                "How else can I assist you po?")
    return ("I can't provide information about system credentials or "
            "private data. I'm here to help with dental services and "
            "appointments. How else can I assist you?")


def gemini_language_instruction(lang: str) -> str:
    """Get the language instruction block for the Gemini prompt."""
    if lang == LANG_TAGALOG:
        return ("LANGUAGE INSTRUCTION: The user is speaking Tagalog. "
                "You MUST respond primarily in Tagalog, not English. "
                "Use 'po' for politeness. Be warm and respectful.")
    elif lang == LANG_TAGLISH:
        return ("LANGUAGE INSTRUCTION: The user is speaking Taglish (mixed English + Tagalog). "
                "You MUST respond in natural Taglish. Mix both languages naturally. "
                "Use 'po' occasionally for politeness.")
    return "LANGUAGE INSTRUCTION: The user is speaking English. Respond in clear, professional English."


def login_required(action: str, lang: str) -> str:
    """Message shown when unauthenticated user tries to book/reschedule/cancel."""
    actions_tl = {'booking': 'mag-book', 'reschedule': 'mag-reschedule', 'cancel': 'mag-cancel'}
    actions_en = {'booking': 'book', 'reschedule': 'reschedule', 'cancel': 'cancel'}
    if lang == LANG_TAGALOG:
        a = actions_tl.get(action, 'gumawa ng aksyon')
        return (f"Kailangan po kayong mag-login bago kayo {a} ng appointment. "
                "Pakisubukan pong mag-login muli.")
    elif lang == LANG_TAGLISH:
        a = actions_en.get(action, 'do that')
        return (f"You need to be logged in po to {a} an appointment. "
                "Please log in first and try again.")
    a = actions_en.get(action, 'do that')
    return (f"You need to be logged in to {a} an appointment. "
            "Please log in first and try again.")


def no_upcoming(action: str, lang: str) -> str:
    """Message shown when authenticated user has no upcoming appointments."""
    actions_tl = {'reschedule': 'i-reschedule', 'cancel': 'i-cancel'}
    actions_en = {'reschedule': 'reschedule', 'cancel': 'cancel'}
    if lang == LANG_TAGALOG:
        a = actions_tl.get(action, 'baguhin')
        return f"Wala po kayong upcoming appointments na maaaring {a}."
    elif lang == LANG_TAGLISH:
        a = actions_en.get(action, 'change')
        return f"You have no upcoming appointments to {a} po."
    a = actions_en.get(action, 'change')
    return f"You have no upcoming appointments to {a}."
