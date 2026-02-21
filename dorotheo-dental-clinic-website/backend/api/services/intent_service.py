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
    'reserve a', 'reserve an appointment', 'reserve slot', 'reserve an appointment slot',
    'book a', 'schedule a', 'new appointment',
    'book for tomorrow', 'book for', 'book a cleaning', 'book cleaning',
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
    'cancel my booking', 'cancel booking', 'cancel the booking',
    'i want to cancel', 'want to cancel', 'cancel my', 'cancel the',
    'remove appointment', 'remove my appointment', 'remove the appointment',
    'cancel',
    # Tagalog
    'i-cancel', 'ikansel', 'i-cancel ko', 'cancel ko',
    'wag na', 'ayoko na',
    'gusto ko i-cancel', 'paki-cancel', 'pakicancel',
    # Taglish
    'cancel ko na', 'cancel na lang', 'i-cancel na',
    'wag na yung', 'ayoko na yung',
]

RESCHEDULE_KEYWORDS = [
    'reschedule', 'change appointment', 'move appointment',
    'change my appointment', 'reschedule my appointment',
    'move my appointment', 'move my appointment to',
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
    # Services — single word entries catch quick-reply taps and short messages
    'services', 'appointments', 'treatment', 'treatments',
    # Clinic hours standalone
    'hours',
    # Services phrasing
    'what dental services', 'what services', 'services do you offer',
    'services offered', 'what treatments', 'list of services',
    'what procedures', 'available services', 'anong serbisyo',
    'anong services', 'mga serbisyo', 'mga services',
    'dental services', 'services available',
    # Single dental terms (word-boundary matched)
    'braces', 'extraction', 'whitening', 'cleaning', 'implant', 'implants',
    'veneer', 'veneers', 'crown', 'crowns', 'filling', 'fillings',
    'retainer', 'orthodontic', 'denture', 'dentures', 'root canal',
    'oral surgery', 'gum surgery', 'periodontal',
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
    'pay in installments', 'installment', 'installments',
    'paano magbayad', 'paano po magbayad', 'bayaran',
    'price', 'cost', 'fee', 'magkano', 'presyo', 'bayad',
    # Clinic hours
    'clinic hours', 'your hours', 'what are your hours',
    'operating hours', 'business hours', 'opening hours',
    'what time', 'open hours', 'when are you open', 'when do you open',
    'do you close for lunch', 'close for lunch', 'lunch break', 'lunch hour',
    'anong oras', 'oras ng clinic', 'schedule ng clinic',
    'bukas kayo', 'bukas ba kayo', 'bukas ba', 'bukas sila',
    'open ba', 'open kayo', 'open sa', 'tanggap sa',
    'anong araw', 'anong oras kayo', 'kelan kayo bukas', 'kelan bukas', 'kelan po kayo bukas', 'oras nyo',
    'linggo', 'sabado', 'lunes', 'martes', 'miyerkules', 'huwebes', 'biyernes',
    # Location
    'where are you located', 'clinic location', 'where is your clinic',
    'where is the clinic', 'where is the bacoor', 'where is the alabang',
    'where is the poblacion', 'bacoor clinic', 'alabang clinic', 'poblacion clinic',
    'bacoor branch', 'alabang branch', 'poblacion branch',
    'branches', 'branch', 'clinic address', 'your locations',
    'saan kayo', 'saan po kayo', 'saan po kayo located',
    'address ng clinic', 'nasaan', 'klinika',
    'saan po kayo sa', 'saan po kami',  # Tagalog location + contact variants
    # Contact / Phone
    'phone', 'phone number', 'contact number', 'contact info',
    'number ng', 'number ni', 'number nyo', 'number po',
    'ano ang number', 'anong number', 'contact ng', 'contact nyo',
    'numero', 'telepono', 'cellphone', 'landline', 'tawag', 'tatawag',
    'how to contact', 'how do i contact', 'call you', 'how to call',
    'saan po kami tatawag', 'saan kami tatawag',  # Tagalog "where should we call"
    # Social Media
    'facebook', 'instagram', 'fb page', 'ig page', 'social media', 'social',
    'fb nyo', 'ig nyo', 'facebook nyo', 'instagram nyo', 'fb namin', 'ig namin',
    'makipag-ugnayan', 'saan kayo sa fb', 'saan kayo sa ig',
    'saan po kayo sa fb', 'saan po kayo sa ig',  # Tagalog with po
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
    # Informal greetings
    'sup', 'yo',
    # Farewells / thanks (same conversational register)
    'bye', 'goodbye', 'good bye', 'see you', 'take care',
    'thank you', 'thanks', 'thank you sage', 'thanks sage', 'tnx', 'ty',
    'salamat', 'maraming salamat',
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
    r'(chipped|broke|broken|cracked|knocked out).{0,20}(my|front|back|molar|tooth|teeth)',
    r'(i|my).{0,10}(chipped|broke|cracked).{0,20}(tooth|teeth|front tooth|molar)',
    # Sensitivity patterns
    r'(sensitive|sensitivity).{0,30}(tooth|teeth|cold|hot|sweet)',
    r'(tooth|teeth).{0,20}(sensitive|sensitivity)',
    r'(tooth|teeth).{0,20}hurt.{0,20}(cold|hot|drink|water|ice)',
    r'pain when (eating|drinking|chewing|biting)',
    r'hurts when (eating|drinking|chewing|biting|i bite|i chew)',
    r'it hurts when (i eat|i chew|eating|chewing|drinking|biting)',
    r'hurts? (to eat|to chew|to drink|to bite)',
    r'\b(extreme|terrible|severe|intense|unbearable)\s+(dental |tooth |teeth )?(pain|ache)\b',
    r'\b(dental|tooth)\s+(pain|emergency)\b',
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
    r'\b(namumugto|namamaga).{0,20}(gilagid|ngipin|mukha|panga)\b',
    r'\b(masakit po ang|sumasakit po ang).{0,20}(ngipin|gilagid|panga)\b',
    r'sobrang (sakit|masakit|sumasakit).{0,25}(ngipin|gilagid|panga|tooth|teeth)',
    r'(namamaga|namumugto).{0,20}(mukha|face|cheek|panga)',
    r'parang bulok.{0,20}(ngipin|tooth|teeth)',
    r'nasira.{0,20}(ngipin|tooth|teeth)',
    r'(nabasag|nabali).{0,20}(ngipin|tooth|teeth)',
    # Taglish symptom patterns
    r'(gums?|teeth?|tooth) (ko|niya|namin).{0,30}(bleed|hurt|ache|pain|sakit|mugto|maga|swell)',
    r'(sakit|masakit|sobrang sakit).{0,20}(ng|ng po)?.{0,10}(tooth|teeth|ngipin)',
    # Child dental emergency
    r'(child|kid|baby|anak).{0,30}(tooth|teeth|ngipin).{0,20}(knocked|fell|broken|hurt)',
    r'(tooth|teeth|ngipin).{0,20}(knocked out|fell out).{0,20}(child|kid|baby|anak|accident)',
]

DENTAL_SYMPTOM_KEYWORDS = [
    # Direct English symptom terms
    'toothache', 'tooth hurts', 'teeth hurt', 'tooth is hurting',
    'gum bleed', 'gums bleed', 'bleeding gums', 'bleeding gum',
    'gum pain', 'gums hurt', 'swollen gums', 'swollen gum',
    'sensitive teeth', 'sensitive tooth', 'tooth sensitivity',
    'bad breath', 'halitosis', 'jaw pain', 'jaw ache',
    'cracked tooth', 'broken tooth', 'chipped tooth', 'loose tooth',
    'chipped my tooth', 'chipped my front tooth', 'broke my tooth',
    'tooth infection', 'dental infection', 'tooth abscess', 'dental abscess',
    'tooth decay', 'cavities', 'wisdom tooth pain', 'wisdom teeth pain',
    'extreme dental pain', 'extreme tooth pain', 'severe tooth pain',
    'mouth is bleeding', 'bleeding badly', 'bleeding mouth',
    'tooth got knocked out', 'tooth was knocked out', 'knocked out tooth',
    'face is swelling', 'face swelling', 'swelling face', 'swelling jaw',
    # Tagalog
    'masakit ang ngipin', 'sumasakit ang ngipin', 'nananakit ang ngipin',
    'namumugto ang gilagid', 'namamaga ang gilagid', 'masakit ang gilagid',
    'bulok na ngipin', 'masakit ang panga', 'may cavity ang ngipin',
    'sobrang sakit ng ngipin', 'namamaga ang mukha', 'nasira ang ngipin',
    'nabasag ang ngipin', 'sobrang sakit po',
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
    # General knowledge (safe: require non-dental context)
    r'capital of', r'president of',
    r'what is the weather', r'\bweather\b',
    r'what is \d+\s*[+\-*/]', r'\d+\s*plus\s*\d+', r'\d+\s*minus\s*\d+',
    r'\d+\s*times\s*\d+', r'\d+\s*divided',
    # Math/science
    r'solve\b', r'calculate\b', r'\bequation\b',
    # Entertainment
    r'tell me a joke', r'\bjoke\b', r'\bsing\b', r'\bstory\b', r'\bpoem\b',
    r'play a game', r'\briddle\b',
    # Food/Cooking
    r'recipe for', r'how to cook', r'how do i cook', r'cook\b.*\b(adobo|sinigang|food|chicken|recipe)',
    # Programming
    r'write.*code', r'\bprogramming\b', r'\bpython\b', r'\bjavascript\b',
    r'how to code', r'\balgorithm\b',
    # Random trivia
    r'who invented', r'when was .* born', r'how tall is',
    r'what color is', r'how many .* in .* world',
    # Explicit off-topic
    r'\bbitcoin\b', r'\bcrypto\b', r'stock market', r'\blottery\b',
    # Geography/History
    r'mount everest', r'tallest mountain', r'deepest ocean',
]

OUT_OF_SCOPE_KEYWORDS = [
    'capital of france', 'capital of', 'who is the president',
    'weather today', 'weather tomorrow', 'what is the weather',
    'tell me a joke', 'tell a joke', 'make me laugh',
    '5 plus 5', 'what is 5', 'math problem',
    'write code', 'programming help', 'how to code',
    'write me a python', 'python script',
    'recipe', 'how to cook', 'cook adobo', 'how do i cook',
    'cryptocurrency', 'bitcoin', 'stock', 'lottery',
    'news today', 'sports', 'movie', 'music',
    'mount everest', 'sing me a song', 'sing a song',
    'invest in bitcoin', 'should i invest',
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
    # ── English ──────────────────────────────────────────────────────
    'yes', 'yep', 'yup', 'yeah', 'yea', 'yah', 'ya', 'yas', 'yass', 'yesss',
    'yes please', 'yes po', 'yes na', 'yes sir', 'yes mam',
    'confirm', 'confirmed', 'confirm na', 'confirm cancel',
    'proceed', 'proceed na', 'pls proceed', 'please proceed',
    'go ahead', 'go na', 'go go',
    'sure', 'sure na', 'sure po', 'sure thing',
    'ok', 'okay', 'ok po', 'okay po', 'okay na', 'ok na',
    'k', 'kk', 'kkk', 'k na', 'k po',
    'alright', 'alright po', 'alright na',
    'aight', 'ayt', 'ayt po', 'ight',
    'fine', 'fine na', 'fine po',
    'of course', 'ofcourse', 'ofc', 'definitely', 'absolutely', 'affirmative',
    'do it', 'just do it', 'let s go', "let's go",
    'request cancel', 'yes cancel', 'yes, cancel', 'yes, request',
    'request cancellation', 'request reschedule',
    # ── Tagalog ──────────────────────────────────────────────────────
    'oo', 'oo po', 'opo', 'oopo', 'oo na po',
    'sige', 'sige po', 'sige na', 'sige na po',
    'ituloy', 'ituloy na', 'ituloy po', 'ituloy na po', 'tuloy', 'tuloy na', 'tuloy na po',
    'tara', 'tara na', 'go na tayo',
    'gawin na', 'gawin', 'gawin na po',
    'oo sige', 'oo go', 'oo na', 'oo na po',
    'ayos lang', 'ayos', 'ayos na',
    'pwede', 'pwede na', 'sige pwede',
    'push', 'push na', 'push na po',
    'g', 'g na', 'g na po',
    # ── Broken / Informal spelling ────────────────────────────────────
    'cge', 'cge po', 'cgee', 'cge na', 'cge na po',   # sige
    'sge', 'sgee',                                      # sige
    'sigeh', 'siige',                                   # sige
    'yah po', 'yeap', 'ye', 'yi',                       # yes
    'opow', 'oopow', 'opo po',                          # opo
    'u',                                                # you = go ahead context
    'bet', 'bet po',                                    # slang yes
    'ight po',
]

CONFIRM_NO_KEYWORDS = [
    # ── English ──────────────────────────────────────────────────────
    'no', 'nope', 'nah', 'naw', 'nop', 'no po', 'no thanks', 'no thank you',
    'no thank you po', 'no ty',
    'cancel request',
    'keep', 'keep appointment', 'keep my appointment', 'keep it',
    'nevermind', 'never mind', 'nm', 'nvm',
    "don't cancel", 'dont cancel', "don't push", 'dont push',
    'stay', 'stay na lang', 'stay na',
    'stop', 'stop na', 'stop na po',
    'changed my mind', 'change of mind',
    'abort', 'back out',
    # ── Tagalog ──────────────────────────────────────────────────────
    'hindi', 'hindi po', 'hindi na', 'hnd', 'hnd po',
    'di', 'di po', 'di na', 'di na po',
    'huwag', 'huwag na', 'huwag po', 'huwag na po',
    'wag', 'wag na', 'wag po', 'wag na lang', 'wag na lang po', 'wag na po',
    'ayaw', 'ayaw ko', 'ayaw ko po', 'ayoko', 'ayoko po', 'ayaw na',
    'bawi', 'bawi na lang', 'bawi na', 'mag-bawi',
    'cancel na lang', 'keep na lang', 'huwag muna', 'wag muna',
    'hindi na nga', 'wag na nga',
    # ── Broken / Informal spelling ────────────────────────────────────
    'hwag', 'hwag na', 'hwag po',                       # huwag
    'ayw', 'aywaw',                                     # ayaw
    'nd', 'ndi', 'ndi po', 'ndhi',                     # hindi
    'noo', 'nooo', 'nope po',                           # no
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
        r'(when|anong araw|kailan|kelan|anong day|what day|what days).{0,40}(dr\.\s|\bdoc\b|\bdentist\b|\bdoctor\b)',
        r'(available|sched|kailan|anong araw).{0,40}(\bdr\.\b|\bdoc\b|\bdoctor\b)',
        r'(\bdr\.\s|\bdoc\b|\bdoctor\b).{0,40}(kailan|kelan|anong araw|when|what day|available|makita|konsulta)',
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


# ── Dental Hygiene / General Advice Patterns ──────────────────────────────
# These match general dental health questions (NOT symptoms, NOT clinic info).
# E.g. "how often should I brush?" → dental_advice, "do you offer cleaning?" → clinic_info

DENTAL_ADVICE_PATTERNS = [
    r'how often should (i|we|you).{0,20}(brush|floss|visit|go to|see.*dentist|get.*check|get.*clean)',
    r'should (i|we).{0,15}(floss|brush|use mouthwash|get.*checkup|see.*dentist|visit)',
    r'is (flossing|mouthwash|brushing).{0,20}(necessary|important|needed|required)',
    r'how (can|do) (i|we).{0,15}(prevent|avoid|stop).{0,20}(cavit|decay|plaque|gingivit|gum disease)',
    r'when should (i|we|my child|kids|children).{0,30}(first|dental|dentist|visit|checkup|check)',
    r'how (to|do i) (take care|maintain|keep).{0,20}(teeth|gums|oral|dental|mouth)',
    r'(tips|advice|recommend).{0,20}(dental|oral|teeth|gum|brush|floss)',
    r'(paano|pano).{0,15}(iwasan|maiwasan|alagan|alagaan|maintain).{0,20}(ngipin|gilagid|cavity|ipin)',
]

DENTAL_ADVICE_KEYWORDS = [
    'should i be flossing', 'should i floss', 'how often floss',
    'is mouthwash necessary', 'is flossing necessary', 'is brushing enough',
    'how often brush', 'how often should i brush',
    'how to prevent cavities', 'prevent cavities', 'prevent tooth decay',
    'first dental visit', 'first time dentist', 'bring my child',
    'dental check up how often', 'how often dental checkup',
    'dental hygiene tips', 'oral hygiene', 'take care of teeth',
    'paano iwasan ang cavity', 'paano alagaan ang ngipin',
]


def _is_dental_advice(text: str) -> bool:
    """Detect general dental health/hygiene advice questions.
    E.g. 'How often should I floss?' → True
    E.g. 'My gums bleed' → False (symptom, handled by _is_dental_symptom)
    """
    for pattern in DENTAL_ADVICE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return _matches_keywords(text, DENTAL_ADVICE_KEYWORDS)


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
    # Note: allow 'booking' in message (e.g. 'cancel my booking') but not bare 'book' (e.g. 'book and cancel')
    _has_bare_book = re.search(r'\bbook\b', low) and 'booking' not in low and 'book an' not in low
    if _matches_keywords(low, CANCEL_KEYWORDS) and not _has_bare_book and 'reschedule' not in low:
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
    # Also exclude informational 'how do i schedule' questions — those are clinic_info
    _is_how_do_schedule = re.search(r'how (do|can) (i|we).{0,20}(schedule|book|make.{0,10}appointment)', low)
    if _matches_keywords(low, BOOKING_KEYWORDS) and 'reschedule' not in low and 'cancel' not in low and 'i-cancel' not in low and not _is_how_do_schedule:
        # Final guard: don't classify hours questions as booking
        if not _is_clinic_hours_question(low):
            logger.info("Intent: SCHEDULE (rule-based)")
            return IntentResult(intent=INTENT_SCHEDULE, confidence=0.95, source='rule')

    # 5. Check dental health / symptom questions
    # Must be BEFORE clinic_info to avoid 'what should I do' or 'ngipin' matching clinic_info first
    if _is_dental_symptom(low):
        logger.info("Intent: DENTAL_ADVICE (symptom, rule-based)")
        return IntentResult(intent=INTENT_DENTAL_ADVICE, confidence=0.85, source='rule')

    # 5b. Check general dental hygiene / advice questions
    # E.g. "How often should I floss?", "Is mouthwash necessary?"
    if _is_dental_advice(low):
        logger.info("Intent: DENTAL_ADVICE (hygiene/advice, rule-based)")
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


def _normalize_confirm(text: str) -> str:
    """
    Normalize informal / broken-spelling confirmation messages before keyword matching.
    - Strips leading/trailing whitespace
    - Lowercases
    - Collapses runs of repeated characters down to at most 2
      (so "cgeeee" → "cgee", "ooooo" → "oo", "yessss" → "yess")
    - Removes trailing punctuation clutter (!!!, ???)
    """
    t = text.lower().strip()
    # Collapse 3+ repeated chars → 2 (preserves "oo" but squashes "ooooo")
    t = re.sub(r'(.)\1{2,}', r'\1\1', t)
    # Strip trailing punctuation noise
    t = t.strip('!?.,~')
    return t


def is_confirm_yes(message: str) -> bool:
    """Detect confirmation (English + Tagalog + Taglish + broken spelling)."""
    normalized = _normalize_confirm(message)
    return _matches_keywords(normalized, CONFIRM_YES_KEYWORDS)


def is_confirm_no(message: str) -> bool:
    """Detect rejection / keep appointment (English + Tagalog + Taglish + broken spelling)."""
    normalized = _normalize_confirm(message)
    return _matches_keywords(normalized, CONFIRM_NO_KEYWORDS)


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
    """True if any recent assistant message ended a flow.

    Checks ALL recent assistant messages (not just the very last one)
    because informational Q&A messages may appear after a flow ends,
    pushing the [FLOW_COMPLETE] tag out of the last-message position.
    """
    termination_tags = ('[FLOW_COMPLETE]', '[PENDING_BLOCK]', '[APPROVAL_WELCOME]')
    recent_msgs = _last_assistant(history, 6)
    if not recent_msgs:
        return False
    for msg_content in recent_msgs:
        if any(tag in msg_content for tag in termination_tags):
            # Check there's no NEW flow step tag AFTER the termination
            # (i.e., a new flow was started after the old one ended)
            for newer_msg in recent_msgs:
                if newer_msg == msg_content:
                    break  # reached the termination tag — no newer flow
                if any(t in newer_msg for t in ('[BOOK_STEP_', '[RESCHED_STEP_', '[CANCEL_STEP_')):
                    return False  # a new flow was started after termination
            return True
    return False
