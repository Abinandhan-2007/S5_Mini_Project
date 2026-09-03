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


def get_clinical_ai_medicine_summary(
    drug_name: str,
    generic_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Clinical AI knowledge synthesis when OpenFDA does not index regional or commercial packaging brands.
    Provides verified clinical purpose, indications, how to take, warnings, and side effects.
    """
    if not drug_name or not str(drug_name).strip():
        return {"found": False}

    raw_drug = str(drug_name).strip()
    raw_gen = str(generic_name or "").strip()
    target_name = f"{raw_drug} ({raw_gen})" if raw_gen and raw_gen.lower() != raw_drug.lower() else raw_drug
    cache_key = f"ai_{target_name.lower()}"
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
            prompt = (
                f"You are a clinical pharmacist AI. Provide accurate medical information for the medication: {target_name}.\n"
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
                "model": "mistral-small-latest",
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
                "temperature": 0.1,
                "max_tokens": 400
            }
            with httpx.Client(timeout=10.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
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
                        "source": "CarePulse Clinical AI (Packaging Vision)"
                    }
                    _DRUG_INFO_CACHE[cache_key] = result
                    return result
        except Exception as e:
            logger.warning(f"Clinical AI medicine summary note: {e}")

    return {"found": False}
