"""
CarePulse Drug Information Service (OpenFDA Public API Integration).

Fetches general medication background, purpose, and indications & usage
from the public, free OpenFDA API (no API key required).
Includes in-memory caching and fail-safe fallbacks for safety.
"""

import re
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


def clean_text_snippet(raw_text: str, max_chars: int = 500) -> str:
    """Clean clinical formatting artifacts, headings, and truncate gracefully."""
    if not raw_text:
        return ""
    # Strip common section numbering like '1 INDICATIONS AND USAGE' or 'Uses'
    cleaned = re.sub(r'^(?:\d+\s+)?(?:INDICATIONS\s+AND\s+USAGE|Uses|Purpose|PURPOSE|INDICATIONS)[\s\:\-]+', '', raw_text.strip(), flags=re.IGNORECASE)
    # Remove redundant multiple spaces/newlines
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    if len(cleaned) > max_chars:
        # Cut at sentence or word boundary
        cutoff = cleaned[:max_chars].rfind('. ')
        if cutoff > 150:
            cleaned = cleaned[:cutoff + 1]
        else:
            cleaned = cleaned[:max_chars].rsplit(' ', 1)[0] + '...'
    return cleaned


def get_drug_info(drug_name: str) -> Dict[str, Any]:
    """
    Retrieve purpose and indications for a given drug name via OpenFDA.
    Guaranteed to return safely with fallback text on any error or timeout.
    """
    if not drug_name or not str(drug_name).strip():
        return {
            "drug_name": "",
            "found": False,
            "purpose": FALLBACK_MESSAGE,
            "indications_and_usage": "",
            "summary": FALLBACK_MESSAGE,
            "source": "None"
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
        
        # Try generic name search first, then brand name fallback
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
                        purpose_list = first_item.get("purpose") or []
                        indications_list = first_item.get("indications_and_usage") or []
                        
                        raw_purpose = purpose_list[0] if purpose_list else ""
                        raw_indications = indications_list[0] if indications_list else ""
                        
                        clean_purpose = clean_text_snippet(raw_purpose, max_chars=250)
                        clean_indications = clean_text_snippet(raw_indications, max_chars=400)
                        
                        summary_parts = []
                        if clean_purpose:
                            summary_parts.append(clean_purpose)
                        if clean_indications and (not clean_purpose or clean_purpose.lower() not in clean_indications.lower()):
                            summary_parts.append(clean_indications)
                            
                        final_summary = " ".join(summary_parts).strip()
                        if not final_summary:
                            final_summary = FALLBACK_MESSAGE
                        
                        result_payload = {
                            "drug_name": raw_name,
                            "found": True,
                            "purpose": clean_purpose or "General therapeutic medication.",
                            "indications_and_usage": clean_indications or final_summary,
                            "summary": final_summary,
                            "source": "OpenFDA"
                        }
                        _DRUG_INFO_CACHE[norm_name] = result_payload
                        return result_payload
            
            # None of the candidates matched (e.g. 404 Not Found or unindexed brand name)
            logger.info(f"OpenFDA returned no results for '{search_term}'. Using fallback.")
    except Exception as e:
        logger.warning(f"OpenFDA query failed gracefully for '{search_term}': {e}. Using fallback.")

    # 3. Graceful fallback on missing / unreachable
    fallback_payload = {
        "drug_name": raw_name,
        "found": False,
        "purpose": FALLBACK_MESSAGE,
        "indications_and_usage": "",
        "summary": FALLBACK_MESSAGE,
        "source": "Fallback"
    }
    _DRUG_INFO_CACHE[norm_name] = fallback_payload
    return fallback_payload
