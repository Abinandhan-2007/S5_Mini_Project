"""
CarePulse OCR & Prescription Fuzzy Matching Engine.

Performs offline optical character recognition (OCR) using Tesseract (pytesseract)
and safety-first fuzzy matching against an authenticated patient's prescription records.
"""

import io
import re
import base64
import difflib
import logging
from typing import Dict, Any, List, Optional, Union
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


def extract_text_from_image(image_input: Union[bytes, str]) -> str:
    """
    Extract raw text from an image via pytesseract OCR.
    Accepts base64 encoded string or raw image bytes.
    Fails gracefully returning '' if image is unreadable or OCR binary is not present.
    """
    if not image_input:
        return ""

    try:
        raw_bytes: bytes
        if isinstance(image_input, str):
            # Check for base64 data URI header e.g. "data:image/jpeg;base64,"
            str_data = image_input.strip()
            if "," in str_data:
                header, str_data = str_data.split(",", 1)
            raw_bytes = base64.b64decode(str_data)
        else:
            raw_bytes = image_input

        if not raw_bytes or len(raw_bytes) < 10:
            return ""

        # Open image with Pillow
        image = Image.open(io.BytesIO(raw_bytes))
        
        # Convert image to RGB/Grayscale for OCR clarity
        if image.mode not in ("L", "RGB"):
            image = image.convert("RGB")

        # Import pytesseract dynamically
        import pytesseract
        text = pytesseract.image_to_string(image)
        return text.strip() if text else ""
    except Exception as e:
        logger.warning(f"OCR text extraction notice: {e}. Handling gracefully.")
        # If pytesseract binary is missing in environment, try string decoding or return empty
        return ""


def clean_text_for_matching(text: str) -> str:
    """Normalize text by lowering and removing non-alphanumeric characters."""
    if not text:
        return ""
    return re.sub(r'[^a-z0-9\s]', ' ', text.lower()).strip()


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
