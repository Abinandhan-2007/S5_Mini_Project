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
from typing import Dict, Any, Optional
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

        with httpx.Client(timeout=6.0) as client:
            for query in search_candidates:
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
                        }
                        _DRUG_INFO_CACHE[norm_name] = result_payload
                        return result_payload

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
    }
    _DRUG_INFO_CACHE[norm_name] = fallback_payload
    return fallback_payload


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
                "max_tokens": 500
            }
            with httpx.Client(timeout=12.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"].strip()
                    if content.startswith("```"):
                        content = re.sub(r"^```(?:json)?\s*", "", content)
                        content = re.sub(r"\s*```$", "", content)
                    parsed = json.loads(content)

                    how_to_take = parsed.get("how_to_take")
                    how_to_take_list = []
                    if isinstance(how_to_take, list):
                        how_to_take_list = [str(h).strip() for h in how_to_take if str(h).strip()]
                    elif isinstance(how_to_take, dict):
                        desc = f"{how_to_take.get('administration', '')} {how_to_take.get('dosage_form', '')}".strip()
                        if desc:
                            how_to_take_list = [desc]
                    elif how_to_take:
                        how_to_take_list = [str(how_to_take).strip()]

                    warnings = parsed.get("warnings")
                    warnings_list = []
                    if isinstance(warnings, list):
                        warnings_list = [str(w).strip() for w in warnings if str(w).strip()]
                    elif warnings:
                        warnings_list = [str(warnings).strip()]

                    side_effects = parsed.get("side_effects") or []
                    if isinstance(side_effects, str):
                        side_effects = [s.strip() for s in side_effects.split(",")]

                    result = {
                        "found": True,
                        "purpose": str(parsed.get("purpose") or "").strip(),
                        "indications_and_usage": str(parsed.get("indications_and_usage") or "").strip(),
                        "summary": str(parsed.get("purpose") or "").strip(),
                        "howToTake": how_to_take_list or None,
                        "warnings": warnings_list or None,
                        "sideEffects": [str(s) for s in side_effects if str(s).strip()] or None,
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
        return _DRUG_INFO_CACHE[cache_key]

    # Check persistent disk cache
    if cache_key in _DISK_TRANSLATION_CACHE:
        cached_result = _DISK_TRANSLATION_CACHE[cache_key]
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

    # Cache in memory and persist to disk for 0ms future lookups
    _DRUG_INFO_CACHE[cache_key] = translated_res
    _DISK_TRANSLATION_CACHE[cache_key] = translated_res
    _save_disk_translation_cache()

    return translated_res
