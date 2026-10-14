"""
CarePulse Drug Information Service (OpenFDA Public API Integration).

Fetches general medication background, purpose, and indications & usage
from the public, free OpenFDA API (no API key required).
Includes in-memory caching and fail-safe fallbacks for safety.
"""

import os
import re
import json
import logging
from typing import Dict, Any, Optional, List
import httpx

logger = logging.getLogger("carepulse.drug_info")

# In-memory cache for OpenFDA lookups: { "amoxicillin": { ... } }
_DRUG_INFO_CACHE: Dict[str, Dict[str, Any]] = {}

FALLBACK_MESSAGE = (
    "General information not available for this medication — please consult your doctor or pharmacist."
)

# Common synonym mappings for regional / brand drug names to FDA generic names
DRUG_SYNONYMS: Dict[str, str] = {
    "paracetamol": "acetaminophen",
    "pcm": "acetaminophen",
    "crocin": "acetaminophen",
    "dolo": "acetaminophen",
    "calpol": "acetaminophen",
    "augmentin": "amoxicillin",
    "mox": "amoxicillin",
    "zithromax": "azithromycin",
    "azee": "azithromycin",
    "glucophage": "metformin",
    "glycomet": "metformin",
    "allegra": "fexofenadine",
    "zyrtec": "cetirizine",
    "cetzine": "cetirizine",
    "pantocid": "pantoprazole",
    "pan": "pantoprazole",
    "omecid": "omeprazole",
    "omez": "omeprazole",
    "lipitor": "atorvastatin",
    "atorva": "atorvastatin",
    "advil": "ibuprofen",
    "brufen": "ibuprofen",
    "combiflam": "ibuprofen",
}


import html

# Complete list of protected abbreviations to avoid erroneous sentence splitting
PROTECTED_ABBREVIATIONS = [
    r'e\.g\.', r'i\.e\.', r'approx\.', r'vs\.', r'etc\.', r'dr\.', r'no\.',
    r'a\.m\.', r'p\.m\.', r'u\.s\.', r'oz\.', r'tsp\.', r'tbsp\.',
    r'q\.d\.', r'b\.i\.d\.', r't\.i\.d\.', r'q\.i\.d\.', r'p\.r\.n\.',
    r'mg\.', r'kg\.', r'ml\.', r'mcg\.', r'hr\.', r'min\.', r'sec\.',
    r'tab\.', r'cap\.', r'usp\.', r'fda\.', r'ph\.'
]

KNOWN_SYMPTOM_DELIMITERS = [
    'headache', 'the common cold', 'common cold', 'backache',
    'minor pain of arthritis', 'arthritis pain', 'toothache',
    'muscular aches', 'muscle aches', 'premenstrual and menstrual cramps',
    'menstrual cramps', 'temporarily reduces fever', 'reduces fever'
]


def _extract_first(item: Dict[str, Any], field_name: str) -> Optional[str]:
    """Safely extract the first string element from an OpenFDA response array."""
    if not item or not isinstance(item, dict):
        return None
    val = item.get(field_name)
    if isinstance(val, list) and len(val) > 0 and isinstance(val[0], str) and val[0].strip():
        return val[0].strip()
    elif isinstance(val, str) and val.strip():
        return val.strip()
    return None


def clean_single_bullet(item_text: str) -> str:
    """
    Applies HTML tag stripping, entity decoding, cross-reference removal,
    and single-line whitespace collapsing to an INDIVIDUAL bullet item.
    Never truncates with trailing '...'.
    """
    if not item_text:
        return ""
    # 1. HTML entity decoding (e.g. &amp; -> &, &quot; -> ", &lt; -> <)
    t = html.unescape(item_text)
    # 2. Strip HTML tags
    t = re.sub(r'<[^>]+>', ' ', t)
    # 3. Replace problematic mathematical unicode chars with safe equivalents
    t = t.replace('\u2265', '>=').replace('\u2264', '<=').replace('\ufffd', '').replace('', '')
    # 4. Strip section numbers and standard FDA headings at start of bullet
    t = re.sub(
        r'^(?:\d+[\.\s]+)?(?:INDICATIONS\s+AND\s+USAGE|DOSAGE\s+AND\s+ADMINISTRATION|WARNINGS\s+AND\s+PRECAUTIONS|WARNINGS|ADVERSE\s+REACTIONS|BOXED\s+WARNING|Uses|Purpose|PURPOSE|Directions)[\s\:\-]+',
        '',
        t.strip(),
        flags=re.IGNORECASE
    )
    # 5. Remove internal cross-reference citations like "[see Warnings (5.1)]" or "( 5.1 )"
    t = re.sub(r'\[see [^\]]+\]', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\(\s*\d+(?:\.\d+)?\s*\)', '', t)
    # 6. Clean leading list markers/numbers
    t = re.sub(r'^[\s\-•*:\d\.]+', '', t).strip()
    # 7. Normalize whitespace on this single item
    t = re.sub(r'[\r\n\t]+', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()

    if not t or len(t) < 4:
        return ""
    # Skip introductory subheadings ending in colon (e.g. "temporarily relieves minor aches and pains due to:")
    if t.endswith(':'):
        return ""

    # 8. Ensure trailing punctuation & capitalization without any mid-sentence truncation
    if not t.endswith(('.', '!', '?')):
        t += '.'
    t = t[0].upper() + t[1:]
    return t


def split_raw_into_items(raw_text: str) -> list:
    """
    Splits RAW field text BEFORE collapsing newlines or whitespace.
    Detects:
    1. Explicit bullet symbols (•, *, -, \ufffd, \u2022)
    2. Numbered list markers (1. ... 2. ...)
    3. Lettered list markers (a) ... b) ...)
    4. Newlines separating short items (<18 words)
    5. Inline symptom lists introduced by 'due to:' or 'symptoms:'
    6. Abbreviation-safe sentence tokenization
    """
    # Normalize bullet replacement characters to standard bullet symbol
    raw = raw_text.replace('\ufffd', ' • ').replace('\u2022', ' • ')

    # Check 1: Explicit bullet symbols
    if '•' in raw or re.search(r'(?:^|\n|\s+)[-*•]\s+[A-Za-z]', raw):
        raw_splits = re.split(r'(?:^|\n|\s+)[-*•]\s+|(?:\s*•\s*)', raw)
        items = [s.strip() for s in raw_splits if s.strip()]
        if len(items) > 1:
            return items

    # Check 2: Numbered lists (e.g. 1. ... 2. ... or 1) ... 2) ...)
    if re.search(r'(?:^|\n|\s+)(?:\d+[\.\)])\s+[A-Za-z]', raw):
        raw_splits = re.split(r'(?:^|\n|\s+)(?:\d+[\.\)])\s+', raw)
        items = [s.strip() for s in raw_splits if s.strip()]
        if len(items) > 1:
            return items

    # Check 3: Lettered lists (e.g. a) ... b) ...)
    if re.search(r'(?:^|\n|\s+)(?:[a-z]\))\s+[A-Za-z]', raw):
        raw_splits = re.split(r'(?:^|\n|\s+)(?:[a-z]\))\s+', raw)
        items = [s.strip() for s in raw_splits if s.strip()]
        if len(items) > 1:
            return items

    # Check 4: Newline characters separating short list fragments
    if '\n' in raw:
        lines = [line.strip() for line in raw.split('\n') if line.strip()]
        short_lines = [l for l in lines if len(l.split()) < 18]
        if len(short_lines) >= 2 and len(short_lines) >= len(lines) * 0.5:
            items = []
            for l in lines:
                clean_l = l.strip()
                if clean_l.endswith(':'):
                    continue
                items.append(clean_l)
            if len(items) > 1:
                return items

    # Check 5: Inline symptom lists introduced by 'due to:' or 'symptoms:' when no bullets exist
    match_due_to = re.search(r'(?:due to|symptoms)\:\s*(.+)$', raw, flags=re.IGNORECASE)
    if match_due_to:
        symptom_tail = match_due_to.group(1).strip()
        pattern = r'\b(' + '|'.join(re.escape(s) for s in KNOWN_SYMPTOM_DELIMITERS) + r')\b'
        symptom_matches = [m.group(0).strip() for m in re.finditer(pattern, symptom_tail, flags=re.IGNORECASE)]
        if len(symptom_matches) >= 3:
            return symptom_matches

    # Check 6: Sentence tokenization with protected medical abbreviations and decimals
    temp = re.sub(r'(\d+)\.(\d+)', r'\1__DECIMAL_DOT__\2', raw)
    for abbr in PROTECTED_ABBREVIATIONS:
        temp = re.sub(abbr, lambda m: m.group(0).replace('.', '__ABBR_DOT__'), temp, flags=re.IGNORECASE)

    raw_items = re.split(r'(?:(?<=[.!?])\s+)', temp)
    restored = [s.replace('__DECIMAL_DOT__', '.').replace('__ABBR_DOT__', '.').strip() for s in raw_items if s.strip()]
    return restored


def split_into_bullets(
    raw_text: Optional[str],
    max_bullets: int = 5,
    section_type: str = "default"
) -> Optional[list]:
    """
    Split clinical raw text into clean, structured bullet points.
    - Preserves safety: warnings, sideEffects, and boxed_warning are NEVER truncated.
    - Preserves completeness: NO mid-sentence character slicing with '...'.
    - Performs raw-first list/newline detection before whitespace collapsing.
    - De-duplicates identical sentences.
    - Returns None if no valid content exists.
    """
    if not raw_text or not isinstance(raw_text, str) or len(raw_text.strip()) < 4:
        return None

    # Step 1 & 2: Detect list structure on RAW text first
    raw_items = split_raw_into_items(raw_text)

    # Step 3: Clean each individual item (HTML entity decoding, tag stripping, whitespace normalizing)
    bullets = []
    seen_normalized = set()

    for item in raw_items:
        b = clean_single_bullet(item)
        if not b or len(b) < 5:
            continue

        # De-duplicate identical or near-identical bullets
        norm_key = re.sub(r'[^a-zA-Z0-9]', '', b.lower())
        if norm_key in seen_normalized:
            continue
        seen_normalized.add(norm_key)

        bullets.append(b)

        # Truncate bullet count ONLY for non-safety sections
        if section_type not in ("warnings", "sideEffects", "boxed_warning") and len(bullets) >= max_bullets:
            break

    return bullets if bullets else None


def clean_clinical_text(text: str) -> str:
    """Helper to clean and normalize clinical text without mid-sentence truncation."""
    return clean_single_bullet(text)


def clean_text_snippet(raw_text: str, max_chars: int = 500) -> str:
    """Legacy helper: clean text without trailing '...' unless genuinely necessary."""
    cleaned = clean_single_bullet(raw_text)
    if not cleaned:
        return ""
    if len(cleaned) > max_chars:
        cutoff = cleaned[:max_chars].rfind('. ')
        if cutoff > 100:
            cleaned = cleaned[:cutoff + 1]
    return cleaned



# ==============================================================================
# Clinical Pharmacopeia: Age-Based Dosage Ceilings & Maximum Daily Tolerances
# ==============================================================================

AGE_GROUP_LABELS: Dict[str, Dict[str, str]] = {
    "infants": {
        "en": "Infants (<2 yrs)",
        "ta": "கைக்குழந்தைகள் (<2 வயது)",
        "ml": "ശിശുക്കൾ (<2 വയസ്സ്)",
        "hi": "शिशु (<2 वर्ष)",
    },
    "children": {
        "en": "Children (2–11 yrs)",
        "ta": "குழந்தைகள் (2–11 வயது)",
        "ml": "കുട്ടികൾ (2–11 വയസ്സ്)",
        "hi": "बच्चे (2–11 वर्ष)",
    },
    "adolescents": {
        "en": "Adolescents (12–17 yrs)",
        "ta": "வளரிளம்பருவத்தினர் (12–17 வயது)",
        "ml": "കൗമാരക്കാർ (12–17 വയസ്സ്)",
        "hi": "किशोर (12–17 वर्ष)",
    },
    "adults": {
        "en": "Adults (18–64 yrs)",
        "ta": "பெரியவர்கள் (18–64 வயது)",
        "ml": "മുതിർന്നവർ (18–64 വയസ്സ്)",
        "hi": "वयस्क (18–64 वर्ष)",
    },
    "geriatric": {
        "en": "Geriatric (65+ yrs)",
        "ta": "முதியவர்கள் (65+ வயது)",
        "ml": "മുതിർന്ന പൗരന്മാർ (65+ വയസ്സ്)",
        "hi": "वरिष्ठ नागरिक (65+ वर्ष)",
    },
}

AGE_DOSAGE_LIMITS_DB: Dict[str, Dict[str, Any]] = {
    "acetaminophen": {
        "maxDailyDoseGeneral": "4,000 mg / 24 hrs (Adults)",
        "unit": "mg",
        "clinicalSafetyWarning": "Strict 4,000 mg 24-hour adult ceiling. Acetaminophen/Paracetamol is present in over 600 OTC combination remedies; accidental double-dosing carries severe liver toxicity risk.",
        "limits": [
            {
                "cohort": "infants",
                "standardDose": "10–15 mg/kg per dose",
                "maxDailyLimit": "60 mg/kg / 24 hrs",
                "frequency": "Every 4–6 hrs (max 4 doses)",
                "notes": "Use calibrated oral syringe only. Do not exceed 4 doses in 24 hours under pediatrician supervision.",
                "status": "caution"
            },
            {
                "cohort": "children",
                "standardDose": "160–320 mg per dose (10–15 mg/kg)",
                "maxDailyLimit": "1,600 mg / 24 hrs (max 5 doses)",
                "frequency": "Every 4–6 hrs as needed",
                "notes": "Weight-based dosing is preferred over age. Never combine with cough/cold combination syrups.",
                "status": "safe"
            },
            {
                "cohort": "adolescents",
                "standardDose": "500 mg per dose",
                "maxDailyLimit": "3,000 mg / 24 hrs",
                "frequency": "Every 4–6 hrs as needed",
                "notes": "Maintain minimum 4-hour gap between doses. Avoid concurrent alcohol consumption.",
                "status": "safe"
            },
            {
                "cohort": "adults",
                "standardDose": "500–1,000 mg per dose",
                "maxDailyLimit": "4,000 mg / 24 hrs (Strict Maximum)",
                "frequency": "Every 4–6 hrs as needed",
                "notes": "Never exceed 4,000 mg per day. Do not take with other paracetamol-containing analgesics.",
                "status": "safe"
            },
            {
                "cohort": "geriatric",
                "standardDose": "325–500 mg per dose",
                "maxDailyLimit": "2,000–3,000 mg / 24 hrs",
                "frequency": "Every 6–8 hrs",
                "notes": "Reduced daily ceiling recommended due to slower hepatic clearance and renal vulnerability.",
                "status": "caution"
            }
        ]
    },
    "amoxicillin": {
        "maxDailyDoseGeneral": "2,000–3,000 mg / 24 hrs (Adults)",
        "unit": "mg",
        "clinicalSafetyWarning": "Contraindicated in individuals with penicillin allergy. Complete full antibiotic course even if feeling fully recovered.",
        "limits": [
            {
                "cohort": "infants",
                "standardDose": "20–30 mg/kg/day in divided doses",
                "maxDailyLimit": "30 mg/kg / 24 hrs",
                "frequency": "Every 12 hrs",
                "notes": "Pediatric oral drops/suspension strictly prescribed by doctor. Shake bottle thoroughly before each dose.",
                "status": "caution"
            },
            {
                "cohort": "children",
                "standardDose": "25–45 mg/kg/day (up to 90 mg/kg/day for otitis)",
                "maxDailyLimit": "1,500 mg / 24 hrs",
                "frequency": "Every 8–12 hrs",
                "notes": "Administer at evenly spaced intervals with meals to reduce stomach upset. Finish full course.",
                "status": "safe"
            },
            {
                "cohort": "adolescents",
                "standardDose": "250–500 mg every 8 hrs or 500–875 mg every 12 hrs",
                "maxDailyLimit": "2,000 mg / 24 hrs",
                "frequency": "Every 8–12 hrs",
                "notes": "Swallow whole with a full glass of water. Report severe watery diarrhea immediately.",
                "status": "safe"
            },
            {
                "cohort": "adults",
                "standardDose": "500–875 mg per dose",
                "maxDailyLimit": "2,000–3,000 mg / 24 hrs",
                "frequency": "Every 8–12 hrs",
                "notes": "Higher ceiling reserved for severe systemic infections. Ensure generous daily hydration.",
                "status": "safe"
            },
            {
                "cohort": "geriatric",
                "standardDose": "250–500 mg per dose",
                "maxDailyLimit": "1,500–2,000 mg / 24 hrs",
                "frequency": "Every 8–12 hrs",
                "notes": "Dose reduction needed if creatinine clearance is under 30 mL/min. Monitor renal output.",
                "status": "caution"
            }
        ]
    },
    "ibuprofen": {
        "maxDailyDoseGeneral": "1,200 mg (OTC) / 2,400 mg (Rx) per 24 hrs",
        "unit": "mg",
        "clinicalSafetyWarning": "NSAID: Avoid exceeding daily limit. Take with food to minimize gastric irritation and ulceration risk.",
        "limits": [
            {
                "cohort": "infants",
                "standardDose": "Contraindicated in <6 months; 5–10 mg/kg (6–23 mos)",
                "maxDailyLimit": "40 mg/kg / 24 hrs",
                "frequency": "Every 6–8 hrs with milk/food",
                "notes": "Do not give to infants under 6 months without direct pediatric specialist order.",
                "status": "not_recommended"
            },
            {
                "cohort": "children",
                "standardDose": "100–200 mg per dose (5–10 mg/kg)",
                "maxDailyLimit": "800–1,200 mg / 24 hrs (max 4 doses)",
                "frequency": "Every 6–8 hrs with food",
                "notes": "Always administer after food or with milk to protect delicate stomach lining.",
                "status": "safe"
            },
            {
                "cohort": "adolescents",
                "standardDose": "200–400 mg per dose",
                "maxDailyLimit": "1,200 mg / 24 hrs",
                "frequency": "Every 4–6 hrs with meals",
                "notes": "Stay well hydrated during sports. Avoid concurrent aspirin or naproxen.",
                "status": "safe"
            },
            {
                "cohort": "adults",
                "standardDose": "200–400 mg OTC (up to 800 mg Rx)",
                "maxDailyLimit": "1,200 mg (OTC) / 2,400 mg (Rx) / 24 hrs",
                "frequency": "Every 4–6 hrs with meals",
                "notes": "OTC limit is 1,200 mg/day. Prescription ceiling is 2,400 mg/day under medical supervision.",
                "status": "safe"
            },
            {
                "cohort": "geriatric",
                "standardDose": "200 mg per dose",
                "maxDailyLimit": "1,200 mg / 24 hrs",
                "frequency": "Every 6–8 hrs with food",
                "notes": "Elevated risk of peptic ulcer, GI bleeding, and cardiovascular/renal strain. Use lowest effective dose.",
                "status": "caution"
            }
        ]
    },
    "metformin": {
        "maxDailyDoseGeneral": "2,000–2,550 mg / 24 hrs",
        "unit": "mg",
        "clinicalSafetyWarning": "Lactic acidosis risk: Contraindicated in severe renal impairment (eGFR <30 mL/min). Withhold before iodinated radiocontrast scans.",
        "limits": [
            {
                "cohort": "infants",
                "standardDose": "Not indicated / Contraindicated",
                "maxDailyLimit": "0 mg",
                "frequency": "N/A",
                "notes": "Contraindicated in infants.",
                "status": "not_recommended"
            },
            {
                "cohort": "children",
                "standardDose": "Not recommended under 10 yrs; 500 mg daily (>=10 yrs)",
                "maxDailyLimit": "2,000 mg / 24 hrs",
                "frequency": "Once or twice daily with meals",
                "notes": "Only indicated for Type 2 diabetes in pediatric patients aged 10 years and older.",
                "status": "caution"
            },
            {
                "cohort": "adolescents",
                "standardDose": "500–850 mg once or twice daily",
                "maxDailyLimit": "2,000 mg / 24 hrs",
                "frequency": "With morning and evening meals",
                "notes": "Titrate weekly in 500 mg increments to reduce gastrointestinal side effects.",
                "status": "safe"
            },
            {
                "cohort": "adults",
                "standardDose": "500–850 mg per dose",
                "maxDailyLimit": "2,550 mg (immediate) or 2,000 mg (XR) / 24 hrs",
                "frequency": "2–3 times daily with meals",
                "notes": "Take with meals to reduce nausea. Extended-release tablets must not be chewed or crushed.",
                "status": "safe"
            },
            {
                "cohort": "geriatric",
                "standardDose": "500 mg once daily to start",
                "maxDailyLimit": "1,500–2,000 mg / 24 hrs",
                "frequency": "Once or twice daily with food",
                "notes": "Routinely monitor eGFR kidney function; avoid if eGFR falls below 30 mL/min.",
                "status": "caution"
            }
        ]
    },
    "azithromycin": {
        "maxDailyDoseGeneral": "500 mg / 24 hrs",
        "unit": "mg",
        "clinicalSafetyWarning": "Macrolide antibiotic: Do not take antacids containing aluminum or magnesium at the same time.",
        "limits": [
            {
                "cohort": "infants",
                "standardDose": "10 mg/kg once daily for 3 days",
                "maxDailyLimit": "10 mg/kg / 24 hrs",
                "frequency": "Once daily",
                "notes": "Pediatric oral suspension administered strictly under pediatrician direction.",
                "status": "caution"
            },
            {
                "cohort": "children",
                "standardDose": "10 mg/kg Day 1, then 5 mg/kg Days 2–5",
                "maxDailyLimit": "500 mg / 24 hrs",
                "frequency": "Once daily",
                "notes": "Do not exceed adult single dose of 500 mg regardless of body weight.",
                "status": "safe"
            },
            {
                "cohort": "adolescents",
                "standardDose": "500 mg Day 1, then 250 mg Days 2–5",
                "maxDailyLimit": "500 mg / 24 hrs",
                "frequency": "Once daily",
                "notes": "Can be taken with or without food. Complete the prescribed 3 to 5 day course.",
                "status": "safe"
            },
            {
                "cohort": "adults",
                "standardDose": "500 mg single dose on Day 1, 250 mg once daily Days 2–5",
                "maxDailyLimit": "500 mg / 24 hrs",
                "frequency": "Once daily",
                "notes": "Standard total regimen is 1,500 mg over 3 to 5 days. High tissue penetration.",
                "status": "safe"
            },
            {
                "cohort": "geriatric",
                "standardDose": "500 mg Day 1, then 250 mg Days 2–5",
                "maxDailyLimit": "500 mg / 24 hrs",
                "frequency": "Once daily",
                "notes": "Caution in patients with cardiac conduction abnormalities (risk of QT interval prolongation).",
                "status": "caution"
            }
        ]
    },
    "cetirizine": {
        "maxDailyDoseGeneral": "10 mg / 24 hrs",
        "unit": "mg",
        "clinicalSafetyWarning": "Antihistamine: Exceeding 10 mg daily does not increase efficacy but elevates drowsiness significantly.",
        "limits": [
            {
                "cohort": "infants",
                "standardDose": "2.5 mg once daily (6–23 mos)",
                "maxDailyLimit": "2.5 mg / 24 hrs",
                "frequency": "Once daily",
                "notes": "Not recommended in infants under 6 months.",
                "status": "caution"
            },
            {
                "cohort": "children",
                "standardDose": "2.5–5 mg once daily (2–5 yrs) or 5–10 mg (6+ yrs)",
                "maxDailyLimit": "5 mg (2–5 yrs) / 10 mg (6+ yrs) in 24 hrs",
                "frequency": "Once daily or divided in 2 doses",
                "notes": "Liquid oral solution allows precise milligram calibration.",
                "status": "safe"
            },
            {
                "cohort": "adolescents",
                "standardDose": "5–10 mg once daily",
                "maxDailyLimit": "10 mg / 24 hrs",
                "frequency": "Once daily (evening)",
                "notes": "Best taken at bedtime to prevent daytime sluggishness.",
                "status": "safe"
            },
            {
                "cohort": "adults",
                "standardDose": "5–10 mg once daily",
                "maxDailyLimit": "10 mg / 24 hrs",
                "frequency": "Once daily",
                "notes": "Single 10 mg daily dose provides 24-hour allergic symptom relief.",
                "status": "safe"
            },
            {
                "cohort": "geriatric",
                "standardDose": "5 mg once daily",
                "maxDailyLimit": "5–10 mg / 24 hrs",
                "frequency": "Once daily",
                "notes": "5 mg initial dose recommended due to age-related renal clearance reduction.",
                "status": "caution"
            }
        ]
    },
    "pantoprazole": {
        "maxDailyDoseGeneral": "40–80 mg / 24 hrs",
        "unit": "mg",
        "clinicalSafetyWarning": "Proton Pump Inhibitor: Swallow delayed-release tablets whole 30-60 minutes before breakfast.",
        "limits": [
            {
                "cohort": "infants",
                "standardDose": "Not indicated",
                "maxDailyLimit": "0 mg",
                "frequency": "N/A",
                "notes": "Safety and efficacy not established in infants.",
                "status": "not_recommended"
            },
            {
                "cohort": "children",
                "standardDose": "20–40 mg once daily (>=5 yrs / >=15kg)",
                "maxDailyLimit": "40 mg / 24 hrs",
                "frequency": "Once daily before breakfast",
                "notes": "Prescribed only for erosive esophagitis under pediatric gastroenterology care.",
                "status": "caution"
            },
            {
                "cohort": "adolescents",
                "standardDose": "40 mg once daily",
                "maxDailyLimit": "40 mg / 24 hrs",
                "frequency": "Once daily 30–60 min before breakfast",
                "notes": "Do not chew, crush, or split delayed-release tablets.",
                "status": "safe"
            },
            {
                "cohort": "adults",
                "standardDose": "40 mg once daily (up to 80 mg in hypersecretory states)",
                "maxDailyLimit": "80 mg / 24 hrs",
                "frequency": "Once daily in the morning",
                "notes": "Take 30 minutes before first meal of the day. Standard course is 4 to 8 weeks.",
                "status": "safe"
            },
            {
                "cohort": "geriatric",
                "standardDose": "40 mg once daily",
                "maxDailyLimit": "40 mg / 24 hrs",
                "frequency": "Once daily",
                "notes": "No initial dose reduction required; monitor bone density with prolonged (>1 yr) use.",
                "status": "safe"
            }
        ]
    },
    "omeprazole": {
        "maxDailyDoseGeneral": "20–40 mg / 24 hrs",
        "unit": "mg",
        "clinicalSafetyWarning": "PPI: Avoid prolonged self-medication beyond 14 days without physician diagnosis.",
        "limits": [
            {
                "cohort": "infants",
                "standardDose": "0.7–1 mg/kg once daily (>1 month)",
                "maxDailyLimit": "1 mg/kg / 24 hrs",
                "frequency": "Once daily",
                "notes": "Specialist compounded oral suspension only for severe acid reflux.",
                "status": "caution"
            },
            {
                "cohort": "children",
                "standardDose": "10–20 mg once daily (>=1 yr / >=10kg)",
                "maxDailyLimit": "20 mg / 24 hrs",
                "frequency": "Once daily before breakfast",
                "notes": "Capsules may be opened and mixed into applesauce if child cannot swallow pills.",
                "status": "safe"
            },
            {
                "cohort": "adolescents",
                "standardDose": "20 mg once daily",
                "maxDailyLimit": "40 mg / 24 hrs",
                "frequency": "Once daily 30 min before breakfast",
                "notes": "Take consistently before morning meal for best acid suppression.",
                "status": "safe"
            },
            {
                "cohort": "adults",
                "standardDose": "20–40 mg once daily",
                "maxDailyLimit": "40 mg / 24 hrs",
                "frequency": "Once daily",
                "notes": "Standard healing dose for reflux and ulcers. Take on an empty stomach in the morning.",
                "status": "safe"
            },
            {
                "cohort": "geriatric",
                "standardDose": "20 mg once daily",
                "maxDailyLimit": "20–40 mg / 24 hrs",
                "frequency": "Once daily",
                "notes": "Standard maintenance dose is 20 mg. Monitor for drug interactions with clopidogrel.",
                "status": "safe"
            }
        ]
    },
    "atorvastatin": {
        "maxDailyDoseGeneral": "80 mg / 24 hrs",
        "unit": "mg",
        "clinicalSafetyWarning": "Statin: Avoid large quantities of grapefruit juice. Report unexplained muscle aches or dark urine immediately.",
        "limits": [
            {
                "cohort": "infants",
                "standardDose": "Contraindicated",
                "maxDailyLimit": "0 mg",
                "frequency": "N/A",
                "notes": "Contraindicated in pediatric infants.",
                "status": "not_recommended"
            },
            {
                "cohort": "children",
                "standardDose": "10 mg once daily (>=10 yrs, heterozygous FH)",
                "maxDailyLimit": "20 mg / 24 hrs",
                "frequency": "Once daily",
                "notes": "Restricted strictly to familial hypercholesterolemia under specialist lipidologist guidance.",
                "status": "caution"
            },
            {
                "cohort": "adolescents",
                "standardDose": "10–20 mg once daily",
                "maxDailyLimit": "20 mg / 24 hrs",
                "frequency": "Once daily (evening)",
                "notes": "Routine lipid profiles and liver function monitoring required.",
                "status": "safe"
            },
            {
                "cohort": "adults",
                "standardDose": "10–40 mg once daily",
                "maxDailyLimit": "80 mg / 24 hrs",
                "frequency": "Once daily at any time",
                "notes": "80 mg ceiling reserved for high cardiovascular risk. Report any muscle pain immediately.",
                "status": "safe"
            },
            {
                "cohort": "geriatric",
                "standardDose": "10–20 mg once daily to start",
                "maxDailyLimit": "40–80 mg / 24 hrs",
                "frequency": "Once daily",
                "notes": "Higher susceptibility to statin myopathy; start with low therapeutic dose.",
                "status": "caution"
            }
        ]
    },
    "lisinopril": {
        "maxDailyDoseGeneral": "40–80 mg / 24 hrs",
        "unit": "mg",
        "clinicalSafetyWarning": "Black Box Warning: Discontinue immediately if pregnancy is detected. Avoid potassium supplements without approval.",
        "limits": [
            {
                "cohort": "infants",
                "standardDose": "Contraindicated",
                "maxDailyLimit": "0 mg",
                "frequency": "N/A",
                "notes": "Black box fetal and neonatal toxicity contraindication.",
                "status": "not_recommended"
            },
            {
                "cohort": "children",
                "standardDose": "0.07 mg/kg once daily (>=6 yrs)",
                "maxDailyLimit": "5 mg / 24 hrs",
                "frequency": "Once daily",
                "notes": "Contraindicated in children <6 years or with eGFR <30 mL/min.",
                "status": "caution"
            },
            {
                "cohort": "adolescents",
                "standardDose": "5–10 mg once daily",
                "maxDailyLimit": "20–40 mg / 24 hrs",
                "frequency": "Once daily",
                "notes": "Monitor blood pressure and serum potassium regularly.",
                "status": "safe"
            },
            {
                "cohort": "adults",
                "standardDose": "10–20 mg once daily",
                "maxDailyLimit": "40 mg (hypertension) / 80 mg (severe) in 24 hrs",
                "frequency": "Once daily at consistent time",
                "notes": "Take consistently with or without food. Report dry persistent cough to physician.",
                "status": "safe"
            },
            {
                "cohort": "geriatric",
                "standardDose": "2.5–5 mg once daily to start",
                "maxDailyLimit": "20–40 mg / 24 hrs",
                "frequency": "Once daily",
                "notes": "Start at lowest dose to prevent orthostatic hypotension and acute renal drop.",
                "status": "caution"
            }
        ]
    },
    "ciprofloxacin": {
        "maxDailyDoseGeneral": "1,000–1,500 mg / 24 hrs",
        "unit": "mg",
        "clinicalSafetyWarning": "Fluoroquinolone Black Box: Increased risk of tendinitis, tendon rupture, and peripheral neuropathy. Rest joint at first tendon pain.",
        "limits": [
            {
                "cohort": "infants",
                "standardDose": "Generally contraindicated",
                "maxDailyLimit": "Specialist rescue only",
                "frequency": "Strict hospital order",
                "notes": "Risk of permanent cartilage lesions in weight-bearing joints.",
                "status": "not_recommended"
            },
            {
                "cohort": "children",
                "standardDose": "10–20 mg/kg every 12 hrs (complicated UTI only)",
                "maxDailyLimit": "750 mg per dose / 1,500 mg in 24 hrs",
                "frequency": "Every 12 hrs",
                "notes": "Not first-line antibiotic in pediatric patients due to musculoskeletal safety profile.",
                "status": "caution"
            },
            {
                "cohort": "adolescents",
                "standardDose": "250–500 mg every 12 hrs",
                "maxDailyLimit": "1,000 mg / 24 hrs",
                "frequency": "Every 12 hrs",
                "notes": "Avoid intense athletic exertion during therapy due to tendon rupture risk.",
                "status": "caution"
            },
            {
                "cohort": "adults",
                "standardDose": "250–500 mg every 12 hrs (750 mg for severe)",
                "maxDailyLimit": "1,500 mg / 24 hrs",
                "frequency": "Every 12 hrs with plenty of fluids",
                "notes": "Drink abundant fluids. Discontinue immediately at first sign of tendon inflammation.",
                "status": "safe"
            },
            {
                "cohort": "geriatric",
                "standardDose": "250–500 mg every 12 hrs",
                "maxDailyLimit": "1,000 mg / 24 hrs",
                "frequency": "Every 12–24 hrs based on renal CrCl",
                "notes": "Elevated risk of tendon rupture and QT prolongation. Adjust dose for kidney clearance.",
                "status": "caution"
            }
        ]
    },
    "diclofenac": {
        "maxDailyDoseGeneral": "150 mg / 24 hrs",
        "unit": "mg",
        "clinicalSafetyWarning": "Black Box Warning: Increased cardiovascular thrombotic risk and gastrointestinal bleeding. Use lowest dose for shortest duration.",
        "limits": [
            {
                "cohort": "infants",
                "standardDose": "Contraindicated",
                "maxDailyLimit": "0 mg",
                "frequency": "N/A",
                "notes": "Not approved for infants.",
                "status": "not_recommended"
            },
            {
                "cohort": "children",
                "standardDose": "1–2 mg/kg/day divided (Juvenile arthritis only)",
                "maxDailyLimit": "100 mg / 24 hrs",
                "frequency": "Divided in 2–3 doses with meals",
                "notes": "Pediatric rheumatology specialist supervision required.",
                "status": "caution"
            },
            {
                "cohort": "adolescents",
                "standardDose": "25–50 mg twice daily",
                "maxDailyLimit": "100 mg / 24 hrs",
                "frequency": "2–3 times daily with food",
                "notes": "Always take after food or with milk to protect stomach lining.",
                "status": "safe"
            },
            {
                "cohort": "adults",
                "standardDose": "50 mg 2–3 times daily",
                "maxDailyLimit": "150 mg / 24 hrs",
                "frequency": "Every 8 hrs with meals",
                "notes": "Maximum daily ceiling is 150 mg. Co-administration with PPI recommended for high-risk patients.",
                "status": "safe"
            },
            {
                "cohort": "geriatric",
                "standardDose": "25–50 mg twice daily",
                "maxDailyLimit": "100 mg / 24 hrs",
                "frequency": "Twice daily with meals",
                "notes": "High cardiovascular, renal, and gastrointestinal risk; gastroprotective co-prescription recommended.",
                "status": "caution"
            }
        ]
    },
    "aspirin": {
        "maxDailyDoseGeneral": "4,000 mg (analgesic) / 100 mg (cardioprotective) in 24 hrs",
        "unit": "mg",
        "clinicalSafetyWarning": "Strict Warning: NEVER administer to children or adolescents recovering from viral illness due to fatal Reye's Syndrome.",
        "limits": [
            {
                "cohort": "infants",
                "standardDose": "Contraindicated",
                "maxDailyLimit": "0 mg",
                "frequency": "N/A",
                "notes": "Black Box: Risk of fatal Reye's syndrome.",
                "status": "not_recommended"
            },
            {
                "cohort": "children",
                "standardDose": "Contraindicated (except Kawasaki disease)",
                "maxDailyLimit": "Specialist only",
                "frequency": "N/A",
                "notes": "Strictly contraindicated in children with viral fever due to Reye's syndrome risk.",
                "status": "not_recommended"
            },
            {
                "cohort": "adolescents",
                "standardDose": "Avoid for viral fever; 300–600 mg (adult supervision)",
                "maxDailyLimit": "2,000 mg / 24 hrs",
                "frequency": "Every 4–6 hrs with food",
                "notes": "Do not administer if flu or chickenpox symptoms are present.",
                "status": "caution"
            },
            {
                "cohort": "adults",
                "standardDose": "300–650 mg (pain) or 75–100 mg (cardiac)",
                "maxDailyLimit": "4,000 mg (pain) / 100 mg (cardiac) in 24 hrs",
                "frequency": "Every 4–6 hrs with meals (pain) / Once daily (cardiac)",
                "notes": "Cardioprotective low-dose (75-100 mg) taken daily. Analgesic ceiling is 4,000 mg daily.",
                "status": "safe"
            },
            {
                "cohort": "geriatric",
                "standardDose": "75–100 mg once daily (cardiac) / 325 mg (pain)",
                "maxDailyLimit": "2,000 mg / 24 hrs",
                "frequency": "Once daily (cardiac) or every 6 hrs",
                "notes": "High bleeding and bruising risk. Monitor for occult GI blood loss.",
                "status": "caution"
            }
        ]
    }
}


def generate_dynamic_age_dosage_limits(
    drug_name: str,
    generic_name: Optional[str] = None,
    raw_dosage_text: Optional[str] = None,
    lang: str = "en"
) -> Dict[str, Any]:
    """
    Clinical fallback generator: Produces structured age-cohort dosage guidance
    and daily safety ceilings for any medication not in the curated index.
    """
    lang_code = (lang or "en").lower().strip()
    target = generic_name or drug_name or "Medication"

    # Extract single dose strength if present in text (e.g. "500mg", "10mg")
    strength_match = re.search(r'(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml)\b', f"{drug_name} {generic_name or ''} {raw_dosage_text or ''}", re.IGNORECASE)
    unit = strength_match.group(2).lower() if strength_match else "mg"
    base_val = float(strength_match.group(1)) if strength_match else None

    if base_val and base_val > 0:
        adult_single = f"{int(base_val) if base_val.is_integer() else base_val} {unit} per dose"
        adult_max = f"{int(base_val * 4) if (base_val * 4).is_integer() else base_val * 4} {unit} / 24 hrs"
        general_ceiling = f"{int(base_val * 4) if (base_val * 4).is_integer() else base_val * 4} {unit} / 24 hrs"
    else:
        adult_single = "Standard therapeutic single dose as prescribed"
        adult_max = "Doctor-prescribed daily ceiling"
        general_ceiling = "Standard therapeutic limit as directed by physician"

    limits = [
        {
            "ageGroup": AGE_GROUP_LABELS["infants"].get(lang_code, AGE_GROUP_LABELS["infants"]["en"]),
            "standardDose": "Weight-based pediatric formulation only",
            "maxDailyLimit": "Strict pediatrician limit",
            "frequency": "As directed by pediatrician",
            "notes": "Consult a pediatrician before administering to infants. Adult solid forms are unsafe.",
            "status": "caution"
        },
        {
            "ageGroup": AGE_GROUP_LABELS["children"].get(lang_code, AGE_GROUP_LABELS["children"]["en"]),
            "standardDose": "Pediatric weight-adjusted dose",
            "maxDailyLimit": "Do not exceed pediatric ceiling",
            "frequency": "As prescribed by doctor",
            "notes": "Administer strictly as directed by doctor. Use calibrated measuring dropper or oral syringe.",
            "status": "caution"
        },
        {
            "ageGroup": AGE_GROUP_LABELS["adolescents"].get(lang_code, AGE_GROUP_LABELS["adolescents"]["en"]),
            "standardDose": adult_single,
            "maxDailyLimit": adult_max,
            "frequency": "As prescribed by physician",
            "notes": "Administer under adult supervision. Follow prescribed frequency intervals.",
            "status": "safe"
        },
        {
            "ageGroup": AGE_GROUP_LABELS["adults"].get(lang_code, AGE_GROUP_LABELS["adults"]["en"]),
            "standardDose": adult_single,
            "maxDailyLimit": adult_max,
            "frequency": "As prescribed (e.g. 1–3 times daily)",
            "notes": "Adhere strictly to prescribed dosage. Never take double doses to compensate for missed doses.",
            "status": "safe"
        },
        {
            "ageGroup": AGE_GROUP_LABELS["geriatric"].get(lang_code, AGE_GROUP_LABELS["geriatric"]["en"]),
            "standardDose": f"Lowest effective starting dose ({adult_single})",
            "maxDailyLimit": "Reduced ceiling under doctor supervision",
            "frequency": "As directed with close monitoring",
            "notes": "Lower initial dose recommended due to age-related renal and hepatic clearance changes.",
            "status": "caution"
        }
    ]

    return {
        "maxDailyDoseGeneral": general_ceiling,
        "unit": unit,
        "limits": limits,
        "clinicalSafetyWarning": f"Adhere strictly to your personal doctor's prescription for {target}. Exceeding daily ceilings increases risk of toxicity and organ strain."
    }


def get_age_dosage_limits(
    drug_name: str,
    generic_name: Optional[str] = None,
    raw_dosage_text: Optional[str] = None,
    lang: str = "en"
) -> Dict[str, Any]:
    """
    Retrieves verified age-cohort dosage limits and safe daily maximum ceilings.
    Checks the clinical pharmacopeia database; falls back to dynamic clinical guideline engine.
    Supports localized age-group labels and translated safety advisories.
    """
    lang_code = (lang or "en").lower().strip()
    candidates = []
    if generic_name:
        candidates.append(generic_name)
    if drug_name:
        candidates.append(drug_name)

    matched_entry = None
    for cand in candidates:
        norm = re.sub(r'[^a-zA-Z0-9]', '', cand.lower())
        # Check direct match
        if norm in AGE_DOSAGE_LIMITS_DB:
            matched_entry = AGE_DOSAGE_LIMITS_DB[norm]
            break
        # Check synonym map
        syn = DRUG_SYNONYMS.get(norm)
        if syn and syn in AGE_DOSAGE_LIMITS_DB:
            matched_entry = AGE_DOSAGE_LIMITS_DB[syn]
            break
        # Check first token
        first_token = cand.split()[0].lower()
        norm_first = re.sub(r'[^a-zA-Z0-9]', '', first_token)
        if norm_first in AGE_DOSAGE_LIMITS_DB:
            matched_entry = AGE_DOSAGE_LIMITS_DB[norm_first]
            break
        syn_first = DRUG_SYNONYMS.get(norm_first)
        if syn_first and syn_first in AGE_DOSAGE_LIMITS_DB:
            matched_entry = AGE_DOSAGE_LIMITS_DB[syn_first]
            break

    if not matched_entry:
        return generate_dynamic_age_dosage_limits(drug_name, generic_name, raw_dosage_text, lang=lang_code)

    # Format entry with localized age groups
    limits_output = []
    for item in matched_entry.get("limits", []):
        cohort_key = item.get("cohort", "adults")
        localized_label = AGE_GROUP_LABELS.get(cohort_key, {}).get(lang_code, AGE_GROUP_LABELS.get(cohort_key, {}).get("en", cohort_key.capitalize()))
        notes_text = item.get("notes", "")
        freq_text = item.get("frequency", "")

        if lang_code not in ("en", "english"):
            if notes_text:
                notes_text = free_translate_text(notes_text, lang_code)
            if freq_text:
                freq_text = free_translate_text(freq_text, lang_code)

        limits_output.append({
            "ageGroup": localized_label,
            "standardDose": item.get("standardDose", ""),
            "maxDailyLimit": item.get("maxDailyLimit", ""),
            "frequency": freq_text,
            "notes": notes_text,
            "status": item.get("status", "safe"),
        })

    warning_text = matched_entry.get("clinicalSafetyWarning", "")
    if warning_text and lang_code not in ("en", "english"):
        warning_text = free_translate_text(warning_text, lang_code)

    return {
        "maxDailyDoseGeneral": matched_entry.get("maxDailyDoseGeneral"),
        "unit": matched_entry.get("unit", "mg"),
        "limits": limits_output,
        "clinicalSafetyWarning": warning_text,
    }


def get_drug_info(drug_name: str) -> Dict[str, Any]:
    """
    Retrieve structured purpose, indications, dosage, warnings, and adverse reactions
    for a given drug name via OpenFDA without any AI/LLM.
    Guaranteed to return safely with fallback text on any error or timeout.
    """
    if not drug_name or not str(drug_name).strip():
        return {
            "drug_name": "",
            "found": False,
            "purpose": None,
            "indications_and_usage": "",
            "summary": FALLBACK_MESSAGE,
            "source": "None",
            "mainUses": None,
            "howToTake": None,
            "warnings": None,
            "sideEffects": None,
        }

    raw_name = str(drug_name).strip()
    norm_name = re.sub(r'[^a-zA-Z0-9]', '', raw_name.lower())

    # 1. Check in-memory cache
    if norm_name in _DRUG_INFO_CACHE:
        logger.debug(f"OpenFDA Cache hit for '{raw_name}'")
        return _DRUG_INFO_CACHE[norm_name]

    # Resolve synonyms (e.g. paracetamol -> acetaminophen)
    search_term = DRUG_SYNONYMS.get(norm_name, raw_name.split()[0])

    # 2. Query OpenFDA public API
    try:
        url = "https://api.fda.gov/drug/label.json"

        search_candidates = [
            f'openfda.generic_name:"{search_term}"',
            f'openfda.brand_name:"{search_term}"',
            f'openfda.substance_name:"{search_term}"',
            search_term
        ]

        with httpx.Client(timeout=2.5) as client:
            for query in search_candidates:
                try:
                    res = client.get(url, params={"search": query, "limit": 1})
                    if res.status_code == 200:
                        data = res.json()
                        results = data.get("results", [])
                        if results:
                            first_item = results[0]

                            # Extract raw fields (all OpenFDA fields are arrays of strings)
                            raw_purpose = _extract_first(first_item, "purpose")
                            raw_indications = _extract_first(first_item, "indications_and_usage")
                            raw_dosage = _extract_first(first_item, "dosage_and_administration")
                            raw_warnings = _extract_first(first_item, "warnings_and_cautions") or _extract_first(first_item, "warnings")
                            raw_adverse = _extract_first(first_item, "adverse_reactions")
                            raw_boxed = _extract_first(first_item, "boxed_warning")

                            # Tokenize into clean, sectioned bullet points without truncation
                            main_uses = split_into_bullets(raw_indications, max_bullets=5, section_type="mainUses")
                            how_to_take = split_into_bullets(raw_dosage, max_bullets=5, section_type="howToTake")
                            warnings = split_into_bullets(raw_warnings, section_type="warnings")
                            side_effects = split_into_bullets(raw_adverse, section_type="sideEffects")
                            boxed_warning = split_into_bullets(raw_boxed, section_type="boxed_warning")

                            clean_p = clean_clinical_text(raw_purpose) if raw_purpose else ""
                            clean_ind = clean_clinical_text(raw_indications) if raw_indications else ""

                            summary_parts = []
                            if clean_p:
                                summary_parts.append(clean_p)
                            if clean_ind and (not clean_p or clean_p.lower() not in clean_ind.lower()):
                                summary_parts.append(clean_text_snippet(clean_ind, max_chars=350))

                            final_summary = " ".join(summary_parts).strip()
                            if not final_summary:
                                final_summary = "General therapeutic medication."

                            age_limits = get_age_dosage_limits(
                                drug_name=raw_name,
                                generic_name=search_term,
                                raw_dosage_text=raw_dosage
                            )

                            result_payload = {
                                "drug_name": raw_name,
                                "found": True,
                                "purpose": clean_p or None,
                                "indications_and_usage": clean_text_snippet(clean_ind, max_chars=400) if clean_ind else final_summary,
                                "summary": final_summary,
                                "source": "OpenFDA",
                                "mainUses": main_uses,
                                "howToTake": how_to_take,
                                "warnings": warnings,
                                "sideEffects": side_effects,
                                "boxedWarning": boxed_warning,
                                "ageDosageLimits": age_limits,
                                "maxDailyDose": age_limits.get("maxDailyDoseGeneral") if age_limits else None,
                            }
                            _DRUG_INFO_CACHE[norm_name] = result_payload
                            return result_payload
                except (httpx.ConnectTimeout, httpx.ConnectError):
                    logger.info(f"OpenFDA host unreachable or timed out for '{search_term}'. Proceeding to next provider.")
                    break

            logger.info(f"OpenFDA returned no results for '{search_term}'. Using fallback.")
    except Exception as e:
        logger.warning(f"OpenFDA query failed gracefully for '{search_term}': {e}. Using fallback.")

    # 3. Graceful fallback on missing / unreachable
    fallback_payload = {
        "drug_name": raw_name,
        "found": False,
        "purpose": None,
        "indications_and_usage": "",
        "summary": FALLBACK_MESSAGE,
        "source": "Fallback",
        "mainUses": None,
        "howToTake": None,
        "warnings": None,
        "sideEffects": None,
        "boxedWarning": None,
        "ageDosageLimits": None,
        "maxDailyDose": None,
    }
    _DRUG_INFO_CACHE[norm_name] = fallback_payload
    return fallback_payload


def _flatten_to_bullets(val: Any) -> List[str]:
    """Recursively converts nested dictionaries, lists, or strings from AI JSON into clean bullet points."""
    bullets: List[str] = []
    if isinstance(val, list):
        for item in val:
            if isinstance(item, (dict, list)):
                bullets.extend(_flatten_to_bullets(item))
            elif item and str(item).strip():
                bullets.append(str(item).strip())
    elif isinstance(val, dict):
        for k, v in val.items():
            if isinstance(v, (dict, list)):
                bullets.extend(_flatten_to_bullets(v))
            elif v and str(v).strip():
                label = k.replace("_", " ").capitalize()
                bullets.append(f"{label}: {str(v).strip()}")
    elif val and str(val).strip():
        bullets.append(str(val).strip())
    return bullets


LANGUAGE_NAMES = {
    "ta": "Tamil (தமிழ்)",
    "ml": "Malayalam (മലയാളം)",
    "hi": "Hindi (हिंदी)",
    "en": "English",
}


def get_clinical_ai_medicine_summary(
    drug_name: str,
    generic_name: Optional[str] = None,
    lang: str = "en"
) -> Dict[str, Any]:
    """
    Clinical AI knowledge synthesis when OpenFDA does not index regional or commercial packaging brands.
    Provides verified clinical purpose, indications, how to take, warnings, and side effects.
    Supports language localization (English, Tamil, Malayalam, Hindi).
    """
    if not drug_name or not str(drug_name).strip():
        return {"found": False}

    raw_drug = str(drug_name).strip()
    raw_gen = str(generic_name or "").strip()
    target_name = f"{raw_drug} ({raw_gen})" if raw_gen and raw_gen.lower() != raw_drug.lower() else raw_drug
    lang_code = (lang or "en").lower().strip()
    cache_key = f"ai_{target_name.lower()}_{lang_code}"
    if cache_key in _DRUG_INFO_CACHE:
        return _DRUG_INFO_CACHE[cache_key]

    mistral_key = (os.getenv("MISTRAL_API_KEY") or "").strip()
    if not mistral_key:
        try:
            import config
            mistral_key = (getattr(config, "MISTRAL_API_KEY", "") or "").strip()
        except Exception:
            pass

    if mistral_key:
        try:
            url = "https://api.mistral.ai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {mistral_key}",
                "Content-Type": "application/json"
            }
            lang_name = LANGUAGE_NAMES.get(lang_code, "English")
            lang_prompt_extra = ""
            if lang_code not in ("en", "english"):
                lang_prompt_extra = (
                    f"IMPORTANT: Write the purpose, indications_and_usage, how_to_take, warnings, and side_effects "
                    f"strictly in {lang_name} for the patient's convenience.\n"
                )

            prompt = (
                f"You are a clinical pharmacist AI. Provide accurate medical information for the medication: {target_name}.\n"
                f"{lang_prompt_extra}"
                "Return ONLY a JSON object with keys:\n"
                "{\n"
                '  "purpose": "1-2 sentences explaining what this medicine is and its clinical mechanism",\n'
                '  "indications_and_usage": "List of specific conditions it treats",\n'
                '  "how_to_take": "Clear dosage timing instructions (e.g. before/after food, with full glass of water)",\n'
                '  "warnings": "Important contraindications, warnings, and precautions",\n'
                '  "side_effects": ["side effect 1", "side effect 2", "side effect 3", "side effect 4"]\n'
                "}"
            )
            payload = {
                "model": "ministral-8b-latest",
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
                "temperature": 0.1,
                "max_tokens": 2400
            }
            with httpx.Client(timeout=14.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"].strip()
                    if content.startswith("```"):
                        content = re.sub(r"^```(?:json)?\s*", "", content)
                        content = re.sub(r"\s*```$", "", content)
                    parsed = json.loads(content)

                    how_to_take_list = _flatten_to_bullets(parsed.get("how_to_take"))
                    warnings_list = _flatten_to_bullets(parsed.get("warnings"))
                    side_effects_list = _flatten_to_bullets(parsed.get("side_effects"))
                    main_uses_list = _flatten_to_bullets(parsed.get("indications_and_usage"))

                    raw_purpose = parsed.get("purpose")
                    if isinstance(raw_purpose, (dict, list)):
                        raw_purpose = " ".join(_flatten_to_bullets(raw_purpose))
                    purpose_str = str(raw_purpose or "").strip()

                    raw_ind = parsed.get("indications_and_usage")
                    if isinstance(raw_ind, (dict, list)):
                        raw_ind = "; ".join(_flatten_to_bullets(raw_ind))
                    ind_str = str(raw_ind or "").strip()

                    age_limits = get_age_dosage_limits(
                        drug_name=raw_drug,
                        generic_name=raw_gen,
                        lang=lang_code
                    )

                    result = {
                        "found": True,
                        "purpose": purpose_str,
                        "indications_and_usage": ind_str,
                        "summary": purpose_str or "General therapeutic clinical medication.",
                        "mainUses": main_uses_list or None,
                        "howToTake": how_to_take_list or None,
                        "warnings": warnings_list or None,
                        "sideEffects": side_effects_list or None,
                        "boxedWarning": None,
                        "ageDosageLimits": age_limits,
                        "maxDailyDose": age_limits.get("maxDailyDoseGeneral") if age_limits else None,
                        "source": f"CarePulse Clinical AI ({lang_name})"
                    }
                    _DRUG_INFO_CACHE[cache_key] = result
                    return result
        except Exception as e:
            logger.warning(f"Clinical AI medicine summary note: {e}")

    return {"found": False}


from pathlib import Path

# Persistent disk cache directory for translated drug info (unlimited & instant)
TRANSLATION_CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache" / "translations"
TRANSLATION_CACHE_DIR.mkdir(parents=True, exist_ok=True)
TRANSLATION_DISK_CACHE_FILE = TRANSLATION_CACHE_DIR / "medicine_translations.json"

_DISK_TRANSLATION_CACHE: Dict[str, Any] = {}
if TRANSLATION_DISK_CACHE_FILE.exists():
    try:
        _DISK_TRANSLATION_CACHE = json.loads(TRANSLATION_DISK_CACHE_FILE.read_text(encoding="utf-8"))
    except Exception:
        _DISK_TRANSLATION_CACHE = {}


def _save_disk_translation_cache():
    try:
        TRANSLATION_DISK_CACHE_FILE.write_text(
            json.dumps(_DISK_TRANSLATION_CACHE, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
    except Exception as e:
        logger.warning(f"Failed to persist translation cache: {e}")


# Free, unlimited language mapping for neural translation (zero tokens, no LLM cost)
MYMEMORY_LANG_MAP: Dict[str, str] = {
    "ta": "ta-IN",
    "ml": "ml-IN",
    "hi": "hi-IN",
    "en": "en-GB",
}

OFFLINE_MEDICAL_TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "ta": {
        "pain reliever/fever reducer.": "வலி நிவாரணம்/காய்ச்சல் குறைப்பான்.",
        "pain reliever/fever reducer": "வலி நிவாரணம்/காய்ச்சல் குறைப்பான்.",
        "pain reliever and fever reducer.": "வலி நிவாரணம்/காய்ச்சல் குறைப்பான்.",
        "pain reliever and fever reducer": "வலி நிவாரணம்/காய்ச்சல் குறைப்பான்.",
        "analgesic and antipyretic": "வலி நிவாரணி மற்றும் காய்ச்சல் தடுப்பான்",
        "headache.": "தலைவலி.",
        "headache": "தலைவலி.",
        "the common cold.": "சாதாரண சளி.",
        "the common cold": "சாதாரண சளி.",
        "common cold.": "சாதாரண சளி.",
        "common cold": "சாதாரண சளி.",
        "backache.": "முதுகு வலி.",
        "backache": "முதுகு வலி.",
        "minor pain of arthritis.": "மூட்டு வலி.",
        "minor pain of arthritis": "மூட்டு வலி.",
        "arthritis pain.": "மூட்டு வலி.",
        "toothache.": "பல் வலி.",
        "toothache": "பல் வலி.",
        "muscular aches.": "தசை வலி.",
        "muscular aches": "தசை வலி.",
        "muscle aches.": "தசை வலி.",
        "muscle aches": "தசை வலி.",
        "premenstrual and menstrual cramps.": "மாதவிடாய் பிடிப்புகள் மற்றும் வலி.",
        "premenstrual and menstrual cramps": "மாதவிடாய் பிடிப்புகள் மற்றும் வலி.",
        "menstrual cramps.": "மாதவிடாய் வலி.",
        "menstrual cramps": "மாதவிடாய் வலி.",
        "temporarily reduces fever.": "தற்காலிகமாக காய்ச்சலைக் குறைக்கிறது.",
        "temporarily reduces fever": "தற்காலிகமாக காய்ச்சலைக் குறைக்கிறது.",
        "reduces fever.": "காய்ச்சலைக் குறைக்கிறது.",
        "reduces fever": "காய்ச்சலைக் குறைக்கிறது.",
        "fever reducer.": "காய்ச்சல் குறைப்பான்.",
        "fever reducer": "காய்ச்சல் குறைப்பான்.",
        "informational reference only. consult your doctor or pharmacist.": "தகவல் நோக்கங்களுக்காக மட்டுமே. உங்கள் மருத்துவர் அல்லது மருந்தாளரை அணுகவும்.",
        "general therapeutic medication.": "பொதுவான சிகிச்சை மருந்து.",
        "general information not available for this medication — please consult your doctor or pharmacist.": "இந்த மருந்திற்கான பொதுவான தகவல் கிடைக்கவில்லை — உங்கள் மருத்துவரை அணுகவும்.",
    },
    "ml": {
        "pain reliever/fever reducer.": "വേദന സംഹാരിയും പനി കുറയ്ക്കുന്ന മരുന്നും.",
        "pain reliever/fever reducer": "വേദന സംഹാരിയും പനി കുറയ്ക്കുന്ന മരുന്നും.",
        "pain reliever and fever reducer.": "വേദന സംഹാരിയും പനി കുറയ്ക്കുന്ന മരുന്നും.",
        "headache.": "തലവേദന.",
        "headache": "തലവേദന.",
        "the common cold.": "സാധാരണ ജലദോഷം.",
        "the common cold": "സാധാരണ ജലദോഷം.",
        "common cold.": "സാധാരണ ജലദോഷം.",
        "backache.": "നടുവേദന.",
        "backache": "നടുവേദന.",
        "minor pain of arthritis.": "സന്ധിവാത വേദന.",
        "toothache.": "പല്ലുവേദന.",
        "toothache": "പല്ലുവേദന.",
        "muscular aches.": "പേശി വേദന.",
        "muscle aches.": "പേശി വേദന.",
        "premenstrual and menstrual cramps.": "ആർത്തവ വേദനയും അസ്വസ്ഥതകളും.",
        "temporarily reduces fever.": "താൽക്കാലികമായി പനി കുറയ്ക്കുന്നു.",
        "informational reference only. consult your doctor or pharmacist.": "വിവര ആവശ്യങ്ങൾക്ക് മാത്രം. ഡോക്ടറെയോ ഫാർമസിസ്റ്റിനെയോ സമീപിക്കുക.",
        "general therapeutic medication.": "പൊതുവായ ചികിത്സാ മരുന്ന്.",
    },
    "hi": {
        "pain reliever/fever reducer.": "दर्द निवारक और बुखार कम करने वाली दवा।",
        "pain reliever/fever reducer": "दर्द निवारक और बुखार कम करने वाली दवा।",
        "pain reliever and fever reducer.": "दर्द निवारक और बुखार कम करने वाली दवा।",
        "headache.": "सिरदर्द।",
        "headache": "सिरदर्द।",
        "the common cold.": "सामान्य सर्दी-जुकाम।",
        "the common cold": "सामान्य सर्दी-जुकाम।",
        "common cold.": "सामान्य सर्दी-जुकाम।",
        "backache.": "पीठ दर्द।",
        "backache": "पीठ दर्द।",
        "minor pain of arthritis.": "गठिया का हल्का दर्द।",
        "toothache.": "दांत दर्द।",
        "toothache": "दांत दर्द।",
        "muscular aches.": "मांसपेशियों में दर्द।",
        "muscle aches.": "मांसपेशियों में दर्द।",
        "premenstrual and menstrual cramps.": "मासिक धर्म का दर्द और ऐंठन।",
        "temporarily reduces fever.": "अस्थायी रूप से बुखार कम करता है।",
        "informational reference only. consult your doctor or pharmacist.": "केवल सूचनात्मक संदर्भ के लिए। अपने डॉक्टर या फार्मासिस्ट से परामर्श लें।",
        "general therapeutic medication.": "सामान्य चिकित्सीय दवा।",
    }
}


def free_translate_text(text: str, target_lang: str) -> str:
    """Translates single text string using offline dictionary + unlimited neural translation (zero tokens)."""
    if not text or not str(text).strip() or target_lang in ("en", "english"):
        return text

    clean = str(text).strip()
    norm = clean.lower()

    # 1. Check instant offline medical dictionary
    offline = OFFLINE_MEDICAL_TRANSLATIONS.get(target_lang, {})
    if norm in offline:
        return offline[norm]
    if norm.strip(".") in offline:
        return offline[norm.strip(".")]

    # 2. Check disk translation cache
    cache_k = f"{target_lang}:{clean}"
    if cache_k in _DISK_TRANSLATION_CACHE:
        return _DISK_TRANSLATION_CACHE[cache_k]

    # 3. Unlimited neural translation via MyMemory (zero tokens)
    target_code = MYMEMORY_LANG_MAP.get(target_lang)
    if target_code:
        try:
            from deep_translator import MyMemoryTranslator
            t = MyMemoryTranslator(source="en-GB", target=target_code)
            res = t.translate(clean)
            if res and str(res).strip() and str(res).strip() != clean:
                translated_val = str(res).strip()
                _DISK_TRANSLATION_CACHE[cache_k] = translated_val
                _save_disk_translation_cache()
                return translated_val
        except Exception as e:
            logger.debug(f"Free translation note for '{clean[:30]}': {e}")

    return clean


def free_translate_list(items: list, target_lang: str) -> list:
    """Translates a list of strings efficiently in batch with zero tokens."""
    if not items or target_lang in ("en", "english"):
        return items

    clean_items = [str(it).strip() for it in items if str(it).strip()]
    if not clean_items:
        return items

    translated_items = []
    items_to_translate_online = []
    index_map = []

    for idx, item in enumerate(clean_items):
        norm = item.lower()
        offline = OFFLINE_MEDICAL_TRANSLATIONS.get(target_lang, {})
        cache_k = f"{target_lang}:{item}"

        if norm in offline:
            translated_items.append(offline[norm])
        elif norm.strip(".") in offline:
            translated_items.append(offline[norm.strip(".")])
        elif cache_k in _DISK_TRANSLATION_CACHE:
            translated_items.append(_DISK_TRANSLATION_CACHE[cache_k])
        else:
            translated_items.append(item)  # Placeholder
            items_to_translate_online.append(item)
            index_map.append(idx)

    # If there are items that need online neural translation, translate them in one single batch request
    if items_to_translate_online and target_lang in MYMEMORY_LANG_MAP:
        try:
            from deep_translator import MyMemoryTranslator
            t = MyMemoryTranslator(source="en-GB", target=MYMEMORY_LANG_MAP[target_lang])
            combined = " ||| ".join(items_to_translate_online)
            res = t.translate(combined)

            splits = [s.strip() for s in res.split("|||")] if res and "|||" in res else []
            if len(splits) == len(items_to_translate_online):
                for i, translated_text in enumerate(splits):
                    orig_idx = index_map[i]
                    translated_items[orig_idx] = translated_text
                    _DISK_TRANSLATION_CACHE[f"{target_lang}:{items_to_translate_online[i]}"] = translated_text
                _save_disk_translation_cache()
            else:
                # Fallback item-by-item if delimiter was not preserved
                for i, orig_text in enumerate(items_to_translate_online):
                    tr = free_translate_text(orig_text, target_lang)
                    orig_idx = index_map[i]
                    translated_items[orig_idx] = tr
        except Exception as e:
            logger.debug(f"Batch free translation note: {e}")

    return translated_items


def localize_age_dosage_guide(
    guide: Optional[Dict[str, Any]],
    lang_code: str = "en"
) -> Optional[Dict[str, Any]]:
    """
    Ensures age group headings, notes, frequency, and clinical warnings within an AgeDosageGuide
    are properly localized into the target language (English, Tamil, Malayalam, Hindi).
    """
    if not guide or not isinstance(guide, dict):
        return guide

    lang = (lang_code or "en").lower().strip()
    localized = dict(guide)
    raw_limits = guide.get("limits") or []
    localized_limits = []

    for lim in raw_limits:
        if not isinstance(lim, dict):
            continue
        item = dict(lim)
        cur_ag = item.get("ageGroup", "")
        # Find matching cohort key from AGE_GROUP_LABELS
        matched_label = False
        for group_key, labels in AGE_GROUP_LABELS.items():
            if any(l.lower() in cur_ag.lower() for l in labels.values()) or group_key in cur_ag.lower():
                item["ageGroup"] = labels.get(lang, labels.get("en", cur_ag))
                matched_label = True
                break
        if not matched_label and lang not in ("en", "english"):
            # If no known cohort matched, attempt free text translation of the custom group label
            item["ageGroup"] = free_translate_text(cur_ag, lang)

        if lang not in ("en", "english"):
            if item.get("notes"):
                item["notes"] = free_translate_text(item["notes"], lang)
            if item.get("frequency"):
                item["frequency"] = free_translate_text(item["frequency"], lang)

        localized_limits.append(item)

    localized["limits"] = localized_limits

    if lang not in ("en", "english") and localized.get("clinicalSafetyWarning"):
        localized["clinicalSafetyWarning"] = free_translate_text(localized["clinicalSafetyWarning"], lang)

    return localized


def translate_medicine_info(
    info_dict: Dict[str, Any],
    target_lang: str = "en"
) -> Dict[str, Any]:
    """
    Translates clinical medicine information (purpose, indicationsAndUsage, summary,
    mainUses, howToTake, warnings, sideEffects) into the requested language (Tamil, Malayalam, Hindi, English).
    COMPLETELY UNLIMITED & NON-TOKEN BASED (uses MyMemory neural translator, curated clinical dictionary,
    and sub-millisecond persistent disk cache).
    """
    lang_code = (target_lang or "en").lower().strip()
    drug_name = (info_dict.get("drugName") or info_dict.get("drug_name") or "").strip()

    # English target fallback: check if we have pristine English in cache or return info_dict
    if lang_code in ("en", "english"):
        if drug_name:
            norm_drug = re.sub(r'[^a-zA-Z0-9]', '', drug_name.lower())
            openfda_cached = _DRUG_INFO_CACHE.get(norm_drug) or _DRUG_INFO_CACHE.get(drug_name.lower())
            if openfda_cached and openfda_cached.get("found"):
                return openfda_cached
        return info_dict

    # Check cache by drug name and target language
    cache_seed = f"{drug_name.lower()}_{lang_code}" if drug_name else f"{str(info_dict.get('purpose', ''))[:40]}_{lang_code}"
    cache_key = f"trans_{cache_seed}"
    if cache_key in _DRUG_INFO_CACHE:
        cached_res = dict(_DRUG_INFO_CACHE[cache_key])
        raw_ag = info_dict.get("ageDosageLimits") or cached_res.get("ageDosageLimits") or (get_age_dosage_limits(drug_name=drug_name, lang=lang_code) if drug_name else None)
        if raw_ag:
            cached_res["ageDosageLimits"] = localize_age_dosage_guide(raw_ag, lang_code)
            cached_res["maxDailyDose"] = cached_res["ageDosageLimits"].get("maxDailyDoseGeneral") if isinstance(cached_res["ageDosageLimits"], dict) else None
            _DRUG_INFO_CACHE[cache_key] = cached_res
        return cached_res

    # Check persistent disk cache
    if cache_key in _DISK_TRANSLATION_CACHE:
        cached_result = dict(_DISK_TRANSLATION_CACHE[cache_key])
        raw_ag = info_dict.get("ageDosageLimits") or cached_result.get("ageDosageLimits") or (get_age_dosage_limits(drug_name=drug_name, lang=lang_code) if drug_name else None)
        if raw_ag:
            cached_result["ageDosageLimits"] = localize_age_dosage_guide(raw_ag, lang_code)
            cached_result["maxDailyDose"] = cached_result["ageDosageLimits"].get("maxDailyDoseGeneral") if isinstance(cached_result["ageDosageLimits"], dict) else None
        _DRUG_INFO_CACHE[cache_key] = cached_result
        return cached_result

    # 1. Translate string fields using unlimited free translator
    purpose_in = info_dict.get("purpose") or ""
    ind_in = info_dict.get("indicationsAndUsage") or info_dict.get("indications_and_usage") or ""
    summary_in = info_dict.get("summary") or ""
    disclaimer_in = info_dict.get("disclaimer") or "Informational reference only. Consult your doctor or pharmacist."

    translated_purpose = free_translate_text(purpose_in, lang_code) if purpose_in else None
    translated_ind = free_translate_text(ind_in, lang_code) if ind_in else ""
    translated_summary = free_translate_text(summary_in, lang_code) if summary_in else ""
    translated_disclaimer = free_translate_text(disclaimer_in, lang_code)

    # 2. Translate list fields in batch (zero tokens)
    raw_main_uses = (info_dict.get("mainUses") or [])[:6]
    raw_how_to_take = (info_dict.get("howToTake") or [])[:4]
    raw_warnings = (info_dict.get("warnings") or [])[:4]
    raw_side_effects = (info_dict.get("sideEffects") or [])[:6]

    translated_main_uses = free_translate_list(raw_main_uses, lang_code) if raw_main_uses else None
    translated_how_to_take = free_translate_list(raw_how_to_take, lang_code) if raw_how_to_take else None
    translated_warnings = free_translate_list(raw_warnings, lang_code) if raw_warnings else None
    translated_side_effects = free_translate_list(raw_side_effects, lang_code) if raw_side_effects else None

    # Construct result payload
    translated_res = dict(info_dict)
    translated_res["purpose"] = translated_purpose
    translated_res["indicationsAndUsage"] = translated_ind
    translated_res["indications_and_usage"] = translated_ind
    translated_res["summary"] = translated_summary
    translated_res["mainUses"] = translated_main_uses
    translated_res["howToTake"] = translated_how_to_take
    translated_res["warnings"] = translated_warnings
    translated_res["sideEffects"] = translated_side_effects
    translated_res["disclaimer"] = translated_disclaimer
    translated_res["drugName"] = drug_name
    translated_res["drug_name"] = drug_name
    translated_res["lang"] = lang_code
    translated_res["source"] = f"CarePulse Medical Translation ({lang_code.upper()})"
    translated_res["translation_successful"] = True

    # 3. Translate & adapt Age Dosage Limits
    raw_age_guide = info_dict.get("ageDosageLimits")
    if not raw_age_guide and drug_name:
        raw_age_guide = get_age_dosage_limits(drug_name=drug_name, lang=lang_code)

    if raw_age_guide and isinstance(raw_age_guide, dict):
        localized_guide = localize_age_dosage_guide(raw_age_guide, lang_code)
        translated_res["ageDosageLimits"] = localized_guide
        translated_res["maxDailyDose"] = localized_guide.get("maxDailyDoseGeneral") if isinstance(localized_guide, dict) else None
    else:
        translated_res["ageDosageLimits"] = info_dict.get("ageDosageLimits")
        translated_res["maxDailyDose"] = info_dict.get("maxDailyDose")

    # Cache in memory and persist to disk for 0ms future lookups
    _DRUG_INFO_CACHE[cache_key] = translated_res
    _DISK_TRANSLATION_CACHE[cache_key] = translated_res
    _save_disk_translation_cache()

    return translated_res
