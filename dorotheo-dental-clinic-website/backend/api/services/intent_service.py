"""
Intent Classification Service
──────────────────────────────
Classifies user messages into intents BEFORE any RAG or LLM calls.
Rule-based first, with spell correction and language-aware matching.

Intents:
- schedule_appointment
- reschedule_appointment
- cancel_appointment
- clinic_information
- greeting
- out_of_scope
- fallback

NEVER call RAG before detecting intent.
"""

import logging
import re
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger('chatbot.intent')

# ── Intent Constants ───────────────────────────────────────────────────────

INTENT_SCHEDULE = 'schedule_appointment'
INTENT_RESCHEDULE = 'reschedule_appointment'
INTENT_CANCEL = 'cancel_appointment'
INTENT_CLINIC_INFO = 'clinic_information'
INTENT_GREETING = 'greeting'
INTENT_OUT_OF_SCOPE = 'out_of_scope'
INTENT_DENTAL_ADVICE = 'dental_advice'  # General dental health / symptom questions
INTENT_FALLBACK = 'fallback'

# All transactional intents (booking engine, no RAG needed)
TRANSACTIONAL_INTENTS = {INTENT_SCHEDULE, INTENT_RESCHEDULE, INTENT_CANCEL}

# Informational intents (RAG pipeline or LLM knowledge)
INFORMATIONAL_INTENTS = {INTENT_CLINIC_INFO, INTENT_GREETING, INTENT_FALLBACK, INTENT_DENTAL_ADVICE}


@dataclass
class IntentResult:
    """Result of intent classification."""
    intent: str
    confidence: float
    source: str  # 'rule' or 'llm'

    @property
    def is_transactional(self) -> bool:
        return self.intent in TRANSACTIONAL_INTENTS

    @property
    def is_informational(self) -> bool:
        return self.intent in INFORMATIONAL_INTENTS


# ── Keyword Sets ───────────────────────────────────────────────────────────

BOOKING_KEYWORDS = [
    'book appointment', 'book an appointment', 'schedule appointment',
    'make an appointment', 'make appointment', 'set an appointment',
    'i want to book', 'want to book', 'want to schedule', 'reserve appointment',
    'book a', 'schedule a', 'new appointment',
    'book', 'schedule',
    # Tagalog
    'mag-book', 'magbook', 'pa-book', 'pabook', 'pa-schedule', 'paschedule',
    'magpa-appointment', 'magpa appointment', 'gusto ko mag-book',
    'gusto ko magbook', 'magpa-set', 'set appointment',
    'paki-book', 'pakibook',
    # Taglish
    'book ko', 'schedule ko', 'mag-book ako', 'magbook ako',
    'gusto ko book', 'book na', 'schedule na',
]

CANCEL_KEYWORDS = [
    'cancel appointment', 'cancel my appointment', 'cancel an appointment',
    'i want to cancel', 'want to cancel', 'cancel my', 'cancel the',
    'cancel',
    # Tagalog
    'i-cancel', 'ikansel', 'i-cancel ko', 'cancel ko',
    'wag na', 'ayoko na', 'remove appointment',
    'gusto ko i-cancel', 'paki-cancel', 'pakicancel',
    # Taglish
    'cancel ko na', 'cancel na lang', 'i-cancel na',
    'wag na yung', 'ayoko na yung',
]

RESCHEDULE_KEYWORDS = [
    'reschedule', 'change appointment', 'move appointment',
    'change my appointment', 'reschedule my appointment',
    'want to reschedule', 'i want to change', 'need to reschedule',
    'reschedule appointment',
    # Tagalog
    'palitan ang schedule', 'palitan schedule', 'palit schedule',
    'palithin ang', 'palitan ang', 'palit ng appointment', 'palitan yung',
    'baguhin ang appointment', 'baguhin yung', 'bago ang schedule',
    'ilipat ang appointment', 'ilipat appointment', 'lipat schedule',
    'ilipat yung', 'ibago ang', 'ibago yung',
    'resched', 'pa-resched', 'paresched',
    'gusto ko i-reschedule', 'gusto ko mag-resched',
    'paki-resched', 'pakiresched',
    # Taglish
    'resched ko', 'resched na', 'change ko', 'palitan ko',
    'resched ko yung', 'lipat ko', 'change ko yung', 'i-reschedule',
    'mag-resched', 'pag-reschedule',
]

CLINIC_INFO_KEYWORDS = [
    # Services
    'what dental services', 'what services', 'services do you offer',
    'services offered', 'what treatments', 'list of services',
    'what procedures', 'available services', 'anong serbisyo',
    'anong services', 'mga serbisyo', 'mga services',
    'dental services', 'services available',
    # Single dental terms (word-boundary matched)
    'braces', 'extraction', 'whitening', 'cleaning', 'implant', 'implants',
    'veneer', 'veneers', 'crown', 'crowns', 'filling', 'fillings',
    'retainer', 'orthodontic', 'denture', 'dentures', 'root canal',
    'xray', 'x-ray', 'checkup', 'consultation',
    # Dentist availability queries (word-boundary matched)
    'when is', 'when are', 'what days', 'what day',
    'available si', 'available ang', 'available na dentist',
    'kailan available', 'anong araw available', 'kelan available',
    'sino available', 'sino ang available',
    'is dr', 'is doc', 'any available',
    # Dentists / staff
    'who are the dentists', 'who are your dentists', 'list of dentists',
    'your dentists', 'available dentists', 'sino ang dentist',
    'sino ang mga dentist', 'mga dentista', 'who is the dentist',
    'dentist', 'dentists', 'doctor', 'doctors', 'dentista',
    # Question patterns
    'do you offer', 'do you have', 'do you accept', 'do you provide',
    'do u have', 'do u offer',
    'is that available', 'is it available',
    'meron ba', 'meron po', 'mayroon ba', 'mayroon po',
    'available ba', 'available po', 'available kayo',
    # Payment / Insurance
    'insurance', 'health insurance', 'hmo', 'philhealth',
    'payment', 'payment method', 'payment methods', 'how to pay',
    'price', 'cost', 'fee', 'magkano', 'presyo', 'bayad',
    # Clinic hours
    'clinic hours', 'your hours', 'what are your hours',
    'operating hours', 'business hours', 'opening hours',
    'what time', 'open hours', 'when are you open', 'when do you open',
    'anong oras', 'oras ng clinic', 'schedule ng clinic',
    'bukas kayo', 'bukas ba kayo', 'bukas ba', 'bukas sila',
    'open ba', 'open kayo', 'open sa', 'tanggap sa',
    'anong araw', 'anong oras kayo', 'kelan kayo bukas', 'oras nyo',
    'linggo', 'sabado', 'lunes', 'martes', 'miyerkules', 'huwebes', 'biyernes',
    # Location
    'where are you located', 'clinic location', 'where is your clinic',
    'branches', 'clinic address', 'your locations',
    'saan kayo', 'address ng clinic', 'nasaan', 'klinika',
    # Tagalog dental terms
    'ngipin', 'pabunot', 'bunot', 'pustiso', 'linis',
    # Appointment status
    'status ng', 'status ng appointment', 'ano na ang status', 'ano na yung',
    'check my appointment', 'check appointment', 'my booking status',
    'anong status', 'what is the status', 'check status',
    # General info
    'how much', 'what is', 'what are', 'can you explain',
    'tell me about', 'what does', 'how do',
    'when should', 'why does', 'is it normal', 'is it okay',
]

GREETING_KEYWORDS = [
    'hello', 'hi', 'hey', 'good morning', 'good afternoon',
    'good evening', 'how are you', 'kamusta', 'kumusta',
    'magandang umaga', 'magandang hapon', 'magandang gabi',
    # Farewells / thanks (same conversational register)
    'bye', 'goodbye', 'good bye', 'see you', 'take care',
    'thank you', 'thanks', 'thank you sage', 'salamat', 'maraming salamat',
    'salamat po', 'paalam', 'ingat', 'ingat ka', 'ok bye', 'sige bye',
]

# ── Dental Symptom / Health Concern Patterns ─────────────────────────────
# These match first-person symptom language — NOT clinic info requests.
# E.g. "my gums bleed" → dental_advice, "do you offer extraction?" → clinic_info

DENTAL_SYMPTOM_PATTERNS = [
    # First-person body-part reference
    r'my (tooth|teeth|gum|gums|mouth|jaw|bite|molar|incisor)\b',
    # Body-part + symptom verb
    r'(tooth|teeth|gum|gums|mouth|jaw)\s+(hurt|hurts|ache|aches|pain|bleed|bleeds|swell|swells|is sore|is swollen|is bleeding|is infected|fell out)',
    # Direct symptom nouns
    r'\b(toothache|tooth ache|bad breath|halitosis|tooth decay|tooth infection|dental infection|dental emergency|abscessed tooth|dental abscess)\b',
    # Structural damage
    r'\b(broken|cracked|chipped|loose|knocked.out|fell.out|missing)\s+(tooth|teeth|molar)\b',
    # Sensitivity patterns
    r'(sensitive|sensitivity).{0,30}(tooth|teeth|cold|hot|sweet)',
    r'(tooth|teeth).{0,20}(sensitive|sensitivity)',
    r'pain when (eating|drinking|chewing|biting)',
    r'hurts when (eating|drinking|chewing|biting|i bite|i chew)',
    # Gum conditions
    r'\b(bleeding gum|swollen gum|inflamed gum|receding gum|gum disease|gingivitis|periodontitis)\b',
    # Wisdom teeth
    r'wisdom (tooth|teeth)',
    # Jaw / TMJ
    r'jaw (pain|hurts|ache|clicking|popping|locked)',
    r'clicking (jaw|teeth)',
    # Cavity
    r'\b(cavity|cavities|tooth rot|rotting tooth)\b',
    # Tagalog symptoms
    r'(masakit|sumasakit|nananakit).{0,25}(ngipin|gilagid|panga|bibig)',
    r'(ngipin|gilagid|panga).{0,25}(masakit|sumasakit|nananakit|namumugto|namamaga|bulok|may cavity|nasira)',
    r'\b(namumugto|namamaga).{0,20}(gilagid|ngipin)\b',
    r'\b(masakit po ang|sumasakit po ang).{0,20}(ngipin|gilagid|panga)\b',
]

DENTAL_SYMPTOM_KEYWORDS = [
    # Direct English symptom terms
    'toothache', 'tooth hurts', 'teeth hurt', 'tooth is hurting',
    'gum bleed', 'gums bleed', 'bleeding gums', 'bleeding gum',
    'gum pain', 'gums hurt', 'swollen gums', 'swollen gum',
    'sensitive teeth', 'sensitive tooth', 'tooth sensitivity',
    'bad breath', 'halitosis', 'jaw pain', 'jaw ache',
    'cracked tooth', 'broken tooth', 'chipped tooth', 'loose tooth',
    'tooth infection', 'dental infection', 'tooth abscess', 'dental abscess',
    'tooth decay', 'cavities', 'wisdom tooth pain', 'wisdom teeth pain',
    # Tagalog
    'masakit ang ngipin', 'sumasakit ang ngipin', 'nananakit ang ngipin',
    'namumugto ang gilagid', 'namamaga ang gilagid', 'masakit ang gilagid',
    'bulok na ngipin', 'masakit ang panga', 'may cavity ang ngipin',
]

# ── Clinic Hours / Day-of-Week Keywords (must match BEFORE general clinic info) ──

CLINIC_HOURS_KEYWORDS = [
    'open on sunday', 'open on saturday', 'open on monday', 'open on tuesday',
    'open on wednesday', 'open on thursday', 'open on friday',
    'open sunday', 'open saturday', 'open monday',
    'are you open', 'you open on', 'do you open',
    'clinic hours', 'operating hours', 'business hours', 'opening hours',
    'what time do you', 'what are your hours', 'your hours',
    'when are you open', 'when do you open', 'what time',
    'open ba kayo', 'bukas ba kayo', 'bukas ba', 'bukas kayo',
    'anong oras', 'oras ng clinic', 'kelan kayo bukas',
    'open sa sunday', 'open sa saturday', 'open sa sabado', 'open sa linggo',
    'bukas sa linggo', 'bukas sa sabado',
    'open weekends', 'open weekend', 'weekend hours',
    'saturday hours', 'sunday hours',
    'nagtatrabaho tuwing linggo', 'nagtatrabaho sa linggo',
    'closed on sunday', 'closed sunday',
]

# ── Out-of-Scope Keywords (non-dental topics) ─────────────────────────────

OUT_OF_SCOPE_PATTERNS = [
    # General knowledge
    r'capital of', r'president of', r'weather', r'temperature',
    r'what is \d+\s*[+\-*/]', r'\d+\s*plus\s*\d+', r'\d+\s*minus\s*\d+',
    r'\d+\s*times\s*\d+', r'\d+\s*divided',
    # Math/science
    r'solve\b', r'calculate\b', r'equation',
    # Entertainment
    r'tell me a joke', r'joke', r'sing', r'story', r'poem',
    r'play a game', r'riddle',
    # Programming
    r'write.*code', r'programming', r'python', r'javascript',
    r'how to code', r'algorithm',
    # Random trivia
    r'who invented', r'when was .* born', r'how tall is',
    r'what color is', r'how many .* in .* world',
    r'recipe for', r'how to cook',
    # Explicit off-topic
    r'bitcoin', r'crypto', r'stock market', r'lottery',
]

OUT_OF_SCOPE_KEYWORDS = [
    'capital of france', 'capital of', 'who is the president',
    'weather today', 'weather tomorrow', 'what is the weather',
    'tell me a joke', 'tell a joke', 'make me laugh',
    '5 plus 5', 'what is 5', 'math problem',
    'write code', 'programming help', 'how to code',
    'recipe', 'how to cook', 'game', 'play',
    'cryptocurrency', 'bitcoin', 'stock', 'lottery',
    'news today', 'sports', 'movie', 'music',
]

# ── Common Misspelling Corrections ────────────────────────────────────────

SPELL_CORRECTIONS = {
    'apointment': 'appointment', 'apointmnt': 'appointment',
    'appointmnt': 'appointment', 'appoinment': 'appointment',
    'dentall': 'dental', 'dentel': 'dental', 'dentol': 'dental',
    'srvices': 'services', 'servisyo': 'serbisyo', 'servises': 'services',
    'shedule': 'schedule', 'scedule': 'schedule', 'schedual': 'schedule',
    'wannt': 'want', 'wnat': 'want',
    'teth': 'teeth', 'teths': 'teeth', 'theeth': 'teeth',
    'whitning': 'whitening', 'whitneing': 'whitening',
    'availabel': 'available', 'avialable': 'available', 'avaialble': 'available',
    'doktors': 'doctors', 'doktor': 'doctor', 'doctrs': 'doctors',
    'dentesta': 'dentista', 'dentist': 'dentist',
    'buk': 'book', 'boook': 'book', 'mag-buk': 'mag-book',
    'opn': 'open', 'oepn': 'open',
    'saterday': 'saturday', 'satureday': 'saturday',
    'sundey': 'sunday', 'sundy': 'sunday',
    'ours': 'hours', 'hors': 'hours', 'housr': 'hours',
    'clining': 'cleaning', 'cleening': 'cleaning',
    'extration': 'extraction', 'extrction': 'extraction',
    'consltation': 'consultation', 'consultatoin': 'consultation',
}

CONFIRM_YES_KEYWORDS = [
    'yes', 'confirm', 'proceed', 'yeah', 'yep', 'sure', 'go ahead',
    'request cancel', 'yes cancel', 'yes, cancel', 'confirm cancel', 'yes, request',
    # Tagalog
    'oo', 'oo po', 'yes po', 'sige', 'sige po', 'okay', 'okay po',
    'opo', 'g', 'go', 'tara', 'ok',
    # Taglish
    'okay na', 'sige na', 'go na', 'yes na', 'confirm na',
]

CONFIRM_NO_KEYWORDS = [
    'no', 'nope', 'keep appointment', 'keep my appointment', 'nevermind',
    'never mind', "don't cancel", 'dont cancel', 'stay',
    # Tagalog
    'hindi', 'hindi po', 'huwag', 'wag', 'wag na lang',
    'ayaw', 'ayaw ko', 'wag na po', 'cancel request',
    # Taglish
    'keep na lang', 'wag muna', 'stay na lang', 'huwag muna',
]


# ── Intent Classification ─────────────────────────────────────────────────

def correct_spelling(message: str) -> str:
    """
    Apply common dental/booking misspelling corrections.
    Preserves original case pattern where possible.
    """
    words = message.split()
    corrected = []
    for word in words:
        low_word = word.lower().strip('.,!?;:')
        if low_word in SPELL_CORRECTIONS:
            corrected.append(SPELL_CORRECTIONS[low_word])
        else:
            corrected.append(word)
    return ' '.join(corrected)


def _is_dentist_availability_query(text: str) -> bool:
    """Detect questions asking when a specific dentist is available.
    E.g. 'When is Dr. Marvin available?', 'Anong araw available si Doc George ngayong Feb?'
    Must be checked BEFORE _is_clinic_hours_question to avoid misroute.
    """
    # Regex: (Dr.|Doc|Doctor) + name + available/schedule/visit patterns
    dr_avail_patterns = [
        r'(dr\.?|doc|doctor)\s+\w+.{0,50}(available|sched|schedule|open|makita|konsulta|pwede|ngayong)',
        r'(when|anong araw|kailan|kelan|anong day|what day|what days).{0,40}(dr\.?|doc|dentist|doctor)',
        r'(available|sched|kailan|anong araw).{0,40}(dr\.?|doc|doctor)',
        r'(dr\.?|doc|doctor).{0,40}(kailan|kelan|anong araw|when|what day|available|makita|konsulta)',
        r'sino.{0,20}(available|available na).{0,20}(dentist|doctor|ngayon|bukas|this|tomorrow)',
        r'may available.{0,20}(dentist|doctor|ba)',
        # "who is available today/tomorrow/this week/next month/next year"
        r'who (is|are).{0,30}(available|on duty|dentist|doctor)',
        r'who.s available',
        # Next month / next year availability queries
        r'available.{0,40}(next month|next year|susunod na buwan|susunod na taon)',
        r'(next month|next year|susunod na buwan|susunod na taon).{0,40}available',
        r'available.{0,10}(in|sa|ngayong|this).{0,10}(january|february|march|april|may|june|july|august|september|october|november|december)',
        r'(january|february|march|april|may|june|july|august|september|october|november|december).{0,30}(available|sched)',
        # Time slot queries
        r'(what time|anong oras|time slot|time slots|available time|available slot)',
        r'(what are|anong).{0,20}(available|open).{0,20}(slot|time|schedule)',
        # "Pwede ba makita si Doc X" / "Pwede pa makita si Dr. X"
        r'(pwede|puwede|can i|can we).{0,30}(makita|konsulta|magpa|visit|see).{0,20}(si\s)?(dr\.?|doc)',
        r'(makita|makonsulta|magpa-consult).{0,30}(si\s)?(dr\.?|doc)',
    ]
    for pattern in dr_avail_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def _is_clinic_hours_question(text: str) -> bool:
    """Check if the message is specifically about clinic hours/open days.
    Must be detected BEFORE dentist availability to avoid misrouting.
    
    'Are you open on Sunday?' → clinic_hours (NOT dentist_availability)
    'Is the dentist available on Monday?' → dentist_availability
    """
    # Day-of-week patterns asking about clinic open/closed
    day_pattern = r'(sunday|saturday|monday|tuesday|wednesday|thursday|friday|weekend|weekday|linggo|sabado|lunes|martes|miyerkules|huwebes|biyernes)'
    hours_pattern = r'(open|close|hour|oras|bukas|sarado|closed|operating|business)'

    has_day = bool(re.search(day_pattern, text, re.IGNORECASE))
    has_hours = bool(re.search(hours_pattern, text, re.IGNORECASE))

    # If asking about a day AND clinic open/closed (no dentist mention) → clinic hours
    if has_day and has_hours:
        # Only if NOT specifically asking about a dentist
        dentist_pattern = r'(dentist|doctor|dr\.|doktor)'
        if not re.search(dentist_pattern, text, re.IGNORECASE):
            return True

    # Direct clinic hours keywords
    return _matches_keywords(text.lower(), CLINIC_HOURS_KEYWORDS)


def _is_out_of_scope(text: str) -> bool:
    """Check if the message is unrelated to dental clinic topics."""
    low = text.lower()

    # Check keyword matches
    if _matches_keywords(low, OUT_OF_SCOPE_KEYWORDS):
        return True

    # Check regex patterns
    for pattern in OUT_OF_SCOPE_PATTERNS:
        if re.search(pattern, low, re.IGNORECASE):
            # But exclude dental-related false positives
            dental_words = ['tooth', 'teeth', 'dental', 'dentist', 'clinic',
                           'appointment', 'braces', 'ngipin', 'dentista', 'service']
            if any(dw in low for dw in dental_words):
                return False
            return True

    return False


def _is_dental_symptom(text: str) -> bool:
    """Detect first-person dental health concerns or symptoms.
    E.g. 'my gums bleed', 'toothache', 'my jaw hurts' → True
    E.g. 'do you offer tooth extraction' → False (clinic info, not a symptom)
    """
    # Check regex patterns (most precise)
    for pattern in DENTAL_SYMPTOM_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    # Check direct symptom keyword list
    return _matches_keywords(text, DENTAL_SYMPTOM_KEYWORDS)


def classify_intent(message: str) -> IntentResult:
    """
    Classify the user's message into an intent using rule-based detection.
    Applies spell correction before classification.

    This is called BEFORE any RAG or LLM calls. The flow is:
        User message → correct_spelling() → classify_intent() →
            If transactional → Deterministic booking engine
            If out_of_scope → Reject politely
            Else → RAG pipeline

    Args:
        message: The user's raw message text.

    Returns:
        IntentResult with intent, confidence, and source.
    """
    # Apply spell correction first
    corrected = correct_spelling(message)
    low = corrected.lower().strip()

    # Priority order: OutOfScope > Cancel > Reschedule > Book > ClinicHours > Info > Greeting > Fallback

    # 0. Check out-of-scope FIRST (weather, math, jokes, etc.)
    if _is_out_of_scope(low):
        logger.info("Intent: OUT_OF_SCOPE (rule-based)")
        return IntentResult(intent=INTENT_OUT_OF_SCOPE, confidence=0.90, source='rule')

    # 1. Check cancel (exclude booking/reschedule crossover)
    if _matches_keywords(low, CANCEL_KEYWORDS) and 'book' not in low and 'reschedule' not in low:
        logger.info("Intent: CANCEL (rule-based)")
        return IntentResult(intent=INTENT_CANCEL, confidence=0.95, source='rule')

    # 2. Check reschedule (exclude cancel/booking crossover)
    if _matches_keywords(low, RESCHEDULE_KEYWORDS) and 'cancel' not in low and 'i-cancel' not in low:
        logger.info("Intent: RESCHEDULE (rule-based)")
        return IntentResult(intent=INTENT_RESCHEDULE, confidence=0.95, source='rule')

    # 3. Check clinic hours BEFORE booking ("open on Sunday" is NOT a booking)
    if _is_clinic_hours_question(low):
        logger.info("Intent: CLINIC_INFO (clinic_hours, rule-based)")
        return IntentResult(intent=INTENT_CLINIC_INFO, confidence=0.95, source='rule')

    # 3b. Check dentist availability date queries
    if _is_dentist_availability_query(low):
        logger.info("Intent: CLINIC_INFO (dentist_availability, rule-based)")
        return IntentResult(intent=INTENT_CLINIC_INFO, confidence=0.90, source='rule')

    # 4. Check booking (exclude reschedule/cancel/hours crossover)
    if _matches_keywords(low, BOOKING_KEYWORDS) and 'reschedule' not in low and 'cancel' not in low and 'i-cancel' not in low:
        # Final guard: don't classify hours questions as booking
        if not _is_clinic_hours_question(low):
            logger.info("Intent: SCHEDULE (rule-based)")
            return IntentResult(intent=INTENT_SCHEDULE, confidence=0.95, source='rule')

    # 5. Check dental health / symptom questions
    # Must be BEFORE clinic_info to avoid 'what should I do' or 'ngipin' matching clinic_info first
    if _is_dental_symptom(low):
        logger.info("Intent: DENTAL_ADVICE (rule-based)")
        return IntentResult(intent=INTENT_DENTAL_ADVICE, confidence=0.85, source='rule')

    # 6. Check clinic information
    if _matches_keywords(low, CLINIC_INFO_KEYWORDS):
        logger.info("Intent: CLINIC_INFO (rule-based)")
        return IntentResult(intent=INTENT_CLINIC_INFO, confidence=0.85, source='rule')

    # 7. Check greeting
    if _matches_keywords(low, GREETING_KEYWORDS):
        logger.info("Intent: GREETING (rule-based)")
        return IntentResult(intent=INTENT_GREETING, confidence=0.90, source='rule')

    # 8. Fallback
    logger.info("Intent: FALLBACK (no rule matched)")
    return IntentResult(intent=INTENT_FALLBACK, confidence=0.5, source='rule')


def is_confirm_yes(message: str) -> bool:
    """Detect confirmation (English + Tagalog + Taglish)."""
    return _matches_keywords(message.lower().strip(), CONFIRM_YES_KEYWORDS)


def is_confirm_no(message: str) -> bool:
    """Detect rejection / keep appointment (English + Tagalog + Taglish)."""
    return _matches_keywords(message.lower().strip(), CONFIRM_NO_KEYWORDS)


# ── Flow State Detection ──────────────────────────────────────────────────

def detect_active_flow(history: list) -> Optional[str]:
    """
    Find which flow was MOST RECENTLY active by scanning assistant
    messages from newest to oldest.

    Returns:
        'booking', 'reschedule', 'cancel', or None.
    """
    if _flow_is_terminated(history):
        return None

    for m in reversed(history or []):
        if m.get('role') != 'assistant':
            continue
        content = m.get('content', '')
        if '[CANCEL_STEP_' in content:
            return 'cancel'
        if '[RESCHED_STEP_' in content:
            return 'reschedule'
        if '[BOOK_STEP_' in content:
            return 'booking'
    return None


def flow_is_terminated(history: list) -> bool:
    """Public wrapper for flow termination check."""
    return _flow_is_terminated(history)


def step_tag_exists(history: list, tag: str) -> bool:
    """True if any recent assistant message contains the given step tag."""
    msgs = _last_assistant(history, 6)
    return any(tag in m for m in msgs)


# ── Helper Functions ──────────────────────────────────────────────────────

def _matches_keywords(text: str, keywords: list) -> bool:
    """Check if text matches any keyword in the list.
    Multi-word keywords use substring matching.
    Single-word keywords use word-boundary matching to avoid
    false positives (e.g., 'hi' matching 'whitening').
    """
    for kw in keywords:
        if ' ' in kw:
            # Multi-word phrase: substring match
            if kw in text:
                return True
        else:
            # Single word: word boundary to prevent partial matches
            if re.search(r'\b' + re.escape(kw) + r'\b', text):
                return True
    return False


def _last_assistant(history: list, n: int = 3) -> list:
    """Return last n assistant messages (most-recent first)."""
    return [m['content'] for m in reversed(history or []) if m.get('role') == 'assistant'][:n]


def _flow_is_terminated(history: list) -> bool:
    """True if the last assistant message ended a flow."""
    last_msg = _last_assistant(history, 1)
    if not last_msg:
        return False
    return any(tag in last_msg[0] for tag in (
        '[FLOW_COMPLETE]', '[PENDING_BLOCK]', '[APPROVAL_WELCOME]',
    ))
