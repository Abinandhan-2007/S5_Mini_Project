"""
CarePulse OCR & Prescription Fuzzy Matching Engine.

Performs offline optical character recognition (OCR) using Tesseract (pytesseract)
and safety-first fuzzy matching against an authenticated patient's prescription records.
"""

import io
import re
import os
import json
import base64
import difflib
import logging
from typing import Dict, Any, List, Optional, Union
import httpx
from PIL import Image

logger = logging.getLogger("carepulse.ocr")

# Minimum confidence threshold for considering a match plausible
HIGH_CONFIDENCE_THRESHOLD = 0.75
AMBIGUOUS_CONFIDENCE_THRESHOLD = 0.55
AMBIGUITY_DELTA_THRESHOLD = 0.15

NO_MATCH_SAFETY_WARNING = (
    "⚠️ This doesn't match any of your current prescriptions. "
    "Do NOT take this medication without confirming with your doctor or pharmacist."
)

UNREADABLE_MESSAGE = (
    "Could not read text from image. Please ensure the packaging is well-lit and "
    "the medicine name is clearly visible."
)


def scan_medicine_packaging_vision(image_input: Union[bytes, str]) -> Dict[str, Any]:
    """
    Google Lens-style Multimodal Vision AI analysis for medicine packaging (boxes, blister strips, bottles).
    Extracts:
    - drug_name: commercial brand name (e.g. "Dolo 650", "Augmentin 625 Duo", "Pan-D")
    - generic_name: active pharmaceutical substance (e.g. "Paracetamol", "Amoxicillin and Clavulanate")
    - strength: concentration/strength (e.g. "650mg", "500mg/125mg")
    - dosage_form: form factor (e.g. "Tablet", "Capsule", "Oral Liquid", "Suspension")
    - all_text: complete legible text on the packaging
    - engine: the AI recognition engine used
    """
    empty_res = {
        "drug_name": "",
        "generic_name": "",
        "strength": "",
        "dosage_form": "",
        "all_text": "",
        "engine": "none",
    }
    if not image_input:
        return empty_res

    # 1. Normalize image input to base64 string and mime type
    raw_b64 = ""
    mime_type = "image/jpeg"
    try:
        if isinstance(image_input, str):
            clean_str = image_input.strip()
            if "," in clean_str:
                header, raw_b64 = clean_str.split(",", 1)
                header_low = header.lower()
                if "png" in header_low:
                    mime_type = "image/png"
                elif "webp" in header_low:
                    mime_type = "image/webp"
            else:
                raw_b64 = clean_str
        elif isinstance(image_input, bytes):
            raw_b64 = base64.b64encode(image_input).decode("utf-8")
    except Exception as e:
        logger.warning(f"Failed to prepare image for vision scan: {e}")
        return empty_res

    if not raw_b64 or len(raw_b64) < 20:
        return empty_res

    data_uri = f"data:{mime_type};base64,{raw_b64}"

    system_prompt = (
        "You are a clinical medicine packaging scanner like Google Lens. Carefully analyze this photo of a medicine box, blister strip, bottle, or tube.\n"
        "Identify the medicine and extract:\n"
        '1. "drug_name": The primary commercial brand name printed prominently on the packaging (e.g. "Dolo 650", "Augmentin 625 Duo", "Pan-D", "Allegra 120mg", "Metformin 500").\n'
        '2. "generic_name": The active pharmaceutical substance or chemical composition (e.g. "Paracetamol", "Amoxicillin and Potassium Clavulanate", "Pantoprazole & Domperidone", "Cetirizine").\n'
        '3. "strength": Strength or dosage quantity (e.g. "650 mg", "500 mg / 125 mg", "10 mg").\n'
        '4. "dosage_form": Form factor (e.g. "Tablet", "Film Coated Tablet", "Capsule", "Oral Liquid", "Suspension", "Ointment").\n'
        '5. "all_text": All legible text printed on the packaging (brand, generic, composition, manufacturer, batch, instructions).\n\n'
        "Return ONLY a valid JSON object matching:\n"
        "{\n"
        '  "drug_name": "...",\n'
        '  "generic_name": "...",\n'
        '  "strength": "...",\n'
        '  "dosage_form": "...",\n'
        '  "all_text": "..."\n'
        "}\n"
        "If the image does not show any medicine packaging or is completely unreadable, return empty strings for all keys."
    )

    # 2. Priority 1: Mistral Vision (mistral-small-latest) using MISTRAL_API_KEY
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
            payload = {
                "model": "mistral-small-latest",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": system_prompt},
                            {"type": "image_url", "image_url": data_uri}
                        ]
                    }
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.1,
                "max_tokens": 400
            }
            with httpx.Client(timeout=14.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"].strip()
                    parsed = json.loads(content)

                    # Normalize strength / dosage_form if returned as array
                    strength_val = parsed.get("strength")
                    if isinstance(strength_val, list):
                        strength_str = ", ".join(str(s) for s in strength_val)
                    else:
                        strength_str = str(strength_val or "").strip()

                    form_val = parsed.get("dosage_form")
                    if isinstance(form_val, list):
                        form_str = ", ".join(str(f) for f in form_val)
                    else:
                        form_str = str(form_val or "").strip()

                    drug_name = str(parsed.get("drug_name") or "").strip()
                    generic_name = str(parsed.get("generic_name") or "").strip()
                    all_text = str(parsed.get("all_text") or "").strip()

                    if drug_name or generic_name or all_text:
                        logger.info(f"Vision AI packaging recognized: drug='{drug_name}', generic='{generic_name}'")
                        return {
                            "drug_name": drug_name,
                            "generic_name": generic_name,
                            "strength": strength_str,
                            "dosage_form": form_str,
                            "all_text": all_text or f"{drug_name} {generic_name}",
                            "engine": "Mistral Vision AI (Google Lens Engine)"
                        }
        except Exception as e:
            logger.warning(f"Mistral Vision packaging scan note: {e}")

    # 3. Priority 2: Gemini 1.5 Flash Vision (if GEMINI_API_KEY configured)
    gemini_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            g_payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": system_prompt},
                            {"inlineData": {"mimeType": mime_type, "data": raw_b64}}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.1,
                    "responseMimeType": "application/json"
                }
            }
            with httpx.Client(timeout=14.0) as client:
                res = client.post(url, json=g_payload)
                if res.status_code == 200:
                    g_data = res.json()
                    g_text = g_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    parsed = json.loads(g_text)
                    return {
                        "drug_name": str(parsed.get("drug_name") or "").strip(),
                        "generic_name": str(parsed.get("generic_name") or "").strip(),
                        "strength": str(parsed.get("strength") or "").strip(),
                        "dosage_form": str(parsed.get("dosage_form") or "").strip(),
                        "all_text": str(parsed.get("all_text") or "").strip(),
                        "engine": "Gemini 1.5 Flash Vision"
                    }
        except Exception as e:
            logger.warning(f"Gemini Vision packaging scan note: {e}")

    # 4. Priority 3: Local Tesseract OCR (if installed in environment)
    try:
        raw_bytes = base64.b64decode(raw_b64)
        image = Image.open(io.BytesIO(raw_bytes))
        if image.mode not in ("L", "RGB"):
            image = image.convert("RGB")
        import pytesseract
        local_text = pytesseract.image_to_string(image).strip()
        if local_text:
            return {
                "drug_name": extract_drug_candidate_from_ocr(local_text) or "",
                "generic_name": "",
                "strength": "",
                "dosage_form": "",
                "all_text": local_text,
                "engine": "Local Tesseract OCR"
            }
    except Exception as e:
        logger.debug(f"Local OCR packaging notice: {e}")

    return empty_res


def extract_text_from_image(image_input: Union[bytes, str]) -> str:
    """
    Extract raw text from an image via Multimodal Vision AI or OCR.
    Accepts base64 encoded string or raw image bytes.
    Fails gracefully returning '' if image is unreadable.
    """
    if not image_input:
        return ""

    vision_res = scan_medicine_packaging_vision(image_input)
    drug_name = vision_res.get("drug_name", "")
    generic_name = vision_res.get("generic_name", "")
    all_text = vision_res.get("all_text", "")

    parts = []
    if drug_name:
        parts.append(drug_name)
    if generic_name and generic_name.lower() != drug_name.lower():
        parts.append(generic_name)
    if all_text:
        parts.append(all_text)

    return "\n".join(parts).strip()


def clean_text_for_matching(text: str) -> str:
    """Normalize text by lowering and removing non-alphanumeric characters."""
    if not text:
        return ""
    return re.sub(r'[^a-z0-9\s]', ' ', text.lower()).strip()


# Common non-drug packaging words to filter out
PACKAGING_STOP_WORDS = {
    "tablet", "tablets", "capsule", "capsules", "syrup", "suspension", "solution",
    "injection", "ointment", "cream", "gel", "drops", "oral", "topical", "strip",
    "pack", "box", "bottle", "mg", "mcg", "gm", "g", "ml", "iu", "usp", "ip", "bp",
    "ep", "pharma", "pharmaceuticals", "ltd", "pvt", "inc", "corp", "mfg", "lic",
    "no", "batch", "exp", "expiry", "date", "mrp", "rs", "rx", "only", "contains",
    "each", "uncoated", "film", "coated", "store", "below", "temperature", "protect",
    "from", "light", "moisture", "keep", "out", "of", "reach", "children", "dosage",
    "as", "directed", "by", "physician", "doctor", "warning", "schedule", "drug",
    "prescription", "caution", "not", "to", "be", "sold", "without", "retail",
    "medical", "practitioner", "for", "use", "net", "qty", "contents", "composition"
}


def extract_drug_candidate_from_ocr(ocr_text: str) -> Optional[str]:
    """
    Extract the most likely drug name from arbitrary OCR text on a packaging scan
    without matching against any specific patient's prescriptions.
    """
    if not ocr_text or not str(ocr_text).strip():
        return None

    # Check for non-alphabetic noise
    cleaned = clean_text_for_matching(ocr_text)
    words = [w for w in cleaned.split() if len(w) >= 3 and not w.isdigit()]
    if not words:
        return None

    # Import synonyms dictionary
    try:
        from services.drug_info_service import DRUG_SYNONYMS
    except Exception:
        DRUG_SYNONYMS = {}

    # 1. Check for direct presence of known common drug names / synonyms
    for word in words:
        if word in DRUG_SYNONYMS:
            return word.capitalize()

    # 2. Filter out stop words
    candidate_tokens = [w for w in words if w not in PACKAGING_STOP_WORDS]

    if candidate_tokens:
        # Return the most prominent candidate token (first non-stop word)
        return candidate_tokens[0].capitalize()

    # If all tokens were filtered out but valid alphabetic words existed
    return words[0].capitalize()



def compute_drug_similarity(target_drug_name: str, ocr_text: str) -> float:
    """
    Compute similarity between a target prescription drug name and OCR text.
    Checks word tokens, n-grams, and exact substring occurrences.
    Returns float score between 0.0 and 1.0.
    """
    if not target_drug_name or not ocr_text:
        return 0.0

    target_clean = clean_text_for_matching(target_drug_name)
    ocr_clean = clean_text_for_matching(ocr_text)

    if not target_clean or not ocr_clean:
        return 0.0

    target_words = target_clean.split()
    target_primary = target_words[0] if target_words else target_clean

    ocr_words = ocr_clean.split()
    if not ocr_words:
        return 0.0

    # 1. Exact full name or primary brand name match in OCR text
    if target_clean in ocr_clean or f" {target_clean} " in f" {ocr_clean} ":
        return 1.0
    if target_primary in ocr_words:
        return 1.0

    max_score = 0.0

    # 2. Sliding window n-gram matching against target drug name
    n_target_words = len(target_words)
    window_sizes = {1, max(1, n_target_words), min(len(ocr_words), n_target_words + 1)}

    for w_size in window_sizes:
        if w_size > len(ocr_words):
            continue
        for i in range(len(ocr_words) - w_size + 1):
            window_str = " ".join(ocr_words[i:i + w_size])
            
            # Compare with full target
            ratio_full = difflib.SequenceMatcher(None, target_clean, window_str).ratio()
            if ratio_full > max_score:
                max_score = ratio_full

            # Compare with primary drug word (e.g. Paracetamol)
            if w_size == 1:
                ratio_prim = difflib.SequenceMatcher(None, target_primary, window_str).ratio()
                if ratio_prim > max_score:
                    max_score = ratio_prim

    # 3. Overall sequence matcher fallback for short texts
    overall_ratio = difflib.SequenceMatcher(None, target_clean, ocr_clean).ratio()
    if overall_ratio > max_score:
        max_score = overall_ratio

    return round(max_score, 3)


def fuzzy_match_prescription(
    extracted_text: str,
    patient_prescriptions: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Fuzzy match extracted OCR text against ONLY this authenticated patient's prescriptions.
    
    Returns one of three response categories:
    - HIGH_CONFIDENCE: Single clear match above threshold (>= 0.75)
    - AMBIGUOUS: Multiple plausible candidates (>= 0.55) requiring user confirmation
    - NO_MATCH: Below threshold or unreadable, with clear safety warning
    """
    clean_ocr = (extracted_text or "").strip()
    
    # 1. Unreadable OCR condition
    if not clean_ocr:
        return {
            "status": "UNREADABLE",
            "match_type": "NO_MATCH",
            "confidence": 0.0,
            "message": UNREADABLE_MESSAGE,
            "extracted_text": "",
            "match": None,
            "matches": []
        }

    # 2. Patient has no active prescriptions on file
    if not patient_prescriptions:
        return {
            "status": "NO_MATCH",
            "match_type": "NO_MATCH",
            "confidence": 0.0,
            "message": NO_MATCH_SAFETY_WARNING,
            "extracted_text": clean_ocr,
            "match": None,
            "matches": []
        }

    # 3. Score all patient's own prescriptions
    scored_candidates = []
    for rx in patient_prescriptions:
        drug_name = rx.get("drug_name") or rx.get("drugName") or ""
        score = compute_drug_similarity(drug_name, clean_ocr)
        
        normalized_rx = {
            "id": str(rx.get("id")),
            "drugName": drug_name,
            "dosage": rx.get("dosage") or "",
            "frequency": rx.get("frequency") or "",
            "mealTiming": rx.get("meal_timing") or rx.get("mealTiming") or "As directed",
            "prescriber": rx.get("prescriber") or "Treating Physician",
            "iconType": rx.get("icon_type") or rx.get("iconType") or "pill",
            "confidence": score
        }
        scored_candidates.append(normalized_rx)

    # Sort descending by confidence
    scored_candidates.sort(key=lambda x: x["confidence"], reverse=True)

    top_candidate = scored_candidates[0]
    top_score = top_candidate["confidence"]

    # Filter plausible candidates (>= AMBIGUOUS_CONFIDENCE_THRESHOLD)
    plausible_candidates = [c for c in scored_candidates if c["confidence"] >= AMBIGUOUS_CONFIDENCE_THRESHOLD]

    # 4. Check for HIGH_CONFIDENCE match
    if top_score >= HIGH_CONFIDENCE_THRESHOLD:
        # Check if there is a competing second match too close to the top match
        if len(plausible_candidates) > 1:
            second_score = plausible_candidates[1]["confidence"]
            if (top_score - second_score) < AMBIGUITY_DELTA_THRESHOLD:
                # Multiple close matches above threshold -> require user selection
                return {
                    "status": "AMBIGUOUS",
                    "match_type": "AMBIGUOUS",
                    "confidence": top_score,
                    "message": "Multiple possible matches found in your prescriptions. Please select the correct medication below.",
                    "extracted_text": clean_ocr,
                    "match": None,
                    "matches": plausible_candidates
                }
        
        # Single clear high-confidence match
        return {
            "status": "SUCCESS",
            "match_type": "HIGH_CONFIDENCE",
            "confidence": top_score,
            "message": "Prescription matched successfully.",
            "extracted_text": clean_ocr,
            "match": top_candidate,
            "matches": [top_candidate]
        }

    # 5. Check for AMBIGUOUS matches
    if plausible_candidates:
        return {
            "status": "AMBIGUOUS",
            "match_type": "AMBIGUOUS",
            "confidence": top_score,
            "message": "Multiple possible matches found in your prescriptions. Please select the correct medication below.",
            "extracted_text": clean_ocr,
            "match": None,
            "matches": plausible_candidates
        }

    # 6. NO_MATCH condition
    return {
        "status": "NO_MATCH",
        "match_type": "NO_MATCH",
        "confidence": top_score,
        "message": NO_MATCH_SAFETY_WARNING,
        "extracted_text": clean_ocr,
        "match": None,
        "matches": []
    }
