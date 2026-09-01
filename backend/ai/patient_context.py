"""
Patient Context & Memory Management Module for Healthcare AI.
Tracks patient demographics, symptoms, duration, onset, severity, medications, conditions, allergies, triggers, and lab values.
"""

import json
import re
from typing import Dict, Any, List, Optional

def extract_patient_entities(text: str, current_step: int = 1) -> Dict[str, Any]:
    """Regex & heuristic entity extractor for medical context."""
    extracted = {}
    text_lower = text.lower().strip()

    # Age extraction: Support option chips and natural text
    if any(k in text_lower for k in ["child", "<18", "under 18"]):
        extracted["age"] = 12
    elif any(k in text_lower for k in ["adult", "18-64", "18–64", "18–40", "18-40", "41–65", "41-65"]):
        extracted["age"] = 35
    elif any(k in text_lower for k in ["senior", "65+", "over 65", "elderly"]):
        extracted["age"] = 70
    else:
        age_match = re.search(r'\b(\d{1,3})\s*(years old|year old|yo|y/o|yr old|yrs old|years|yrs)\b', text_lower)
        if not age_match:
            age_match = re.search(r'\b(?:i am|im|i\'m|age|aged|am)\s*(\d{1,3})\b', text_lower)
        if not age_match and re.fullmatch(r'^\s*(\d{1,3})\s*$', text_lower):
            age_match = re.search(r'(\d{1,3})', text_lower)
        if age_match:
            try:
                val = int(age_match.group(1))
                if 0 <= val <= 120:
                    extracted["age"] = val
            except ValueError:
                pass

    # Sex / Gender extraction
    if re.search(r'\b(female|woman|lady|mother|mom|sister|daughter|she|her)\b', text_lower):
        extracted["sex"] = "Female"
    elif re.search(r'\b(male|man|gentleman|father|dad|brother|son|he|him)\b', text_lower):
        extracted["sex"] = "Male"

    # Duration extraction: Support range chips and conversational durations
    if any(k in text_lower for k in ["started today", "today", "just started"]):
        extracted["duration"] = "1 day"
    elif "yesterday" in text_lower:
        extracted["duration"] = "2 days"
    else:
        all_duration_matches = list(re.finditer(r'\b(?:more than\s+)?(\d+\s*[\-–—]\s*\d+|\d+|a|few|several|couple of)\s*(days?|weeks?|months?|years?)\b', text_lower))
        if all_duration_matches:
            target_match = None
            for m in all_duration_matches:
                start_idx = m.start()
                end_idx = m.end()
                preceding_text = text_lower[max(0, start_idx-25):start_idx]
                following_text = text_lower[end_idx:min(len(text_lower), end_idx+15)]
                # Skip if this match is part of an age statement (e.g. "62 years old", "age 62 years")
                if re.search(r'^\s*(old|of age)\b', following_text) or re.search(r'\b(age|aged|i am|im|i\'m|she is|he is)\s*$', preceding_text.strip()):
                    continue
                if not re.search(r'\b(every|each|per|times|frequency|every\s+\d+)\b', preceding_text):
                    target_match = m
                    break
            if target_match:
                extracted["duration"] = target_match.group(0).strip()
        elif "1–3 days" in text_lower or "1-3 days" in text_lower:
            extracted["duration"] = "1-3 days"
        elif "4–7 days" in text_lower or "4-7 days" in text_lower or "about a week" in text_lower:
            extracted["duration"] = "4-7 days"
        elif "1–2 weeks" in text_lower or "1-2 weeks" in text_lower:
            extracted["duration"] = "1-2 weeks"
        elif "more than a month" in text_lower or ">1 month" in text_lower:
            extracted["duration"] = "more than 1 month"

    # Symptoms extraction
    symptom_keywords = [
        "fever", "headache", "cough", "fatigue", "tired", "stomach pain", "nausea",
        "dizziness", "dizzy", "chest pain", "shortness of breath", "sore throat",
        "vomiting", "diarrhea", "constipation", "rash", "joint pain", "back pain",
        "acid reflux", "heartburn", "bloating", "wheezing", "chills", "weakness"
    ]
    matched_symptoms = []
    for sym in symptom_keywords:
        if re.search(rf'\b{re.escape(sym)}\b', text_lower):
            matched_symptoms.append(sym)
    if matched_symptoms:
        extracted["symptoms"] = matched_symptoms

    # Severity scale extraction (1-10)
    sev_match = re.search(r'\b(?:severity|pain level|scale of 1 to 10|rating|level)\s*[:=]?\s*(\d{1,2})\b', text_lower)
    if not sev_match:
        sev_match = re.search(r'\b(\d{1,2})\s*/\s*10\b', text_lower)
    if sev_match:
        try:
            val = int(sev_match.group(1))
            if 1 <= val <= 10:
                extracted["severity"] = f"{val}/10"
        except ValueError:
            pass

    # Lab report parameter extraction
    lab_matches = {}
    tsh_match = re.search(r'\btsh\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(miu/l|µiu/ml|uiu/ml)?\b', text_lower)
    if tsh_match:
        val = tsh_match.group(1)
        unit = tsh_match.group(2) or "mIU/L"
        lab_matches["TSH"] = f"{val} {unit}"

    hba1c_match = re.search(r'\bhba1c\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(%|percent)?\b', text_lower)
    if hba1c_match:
        lab_matches["HbA1c"] = f"{hba1c_match.group(1)}%"

    glucose_match = re.search(r'\b(?:glucose|fasting sugar|blood sugar)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(mg/dl|mmol/l)?\b', text_lower)
    if glucose_match:
        val = glucose_match.group(1)
        unit = glucose_match.group(2) or "mg/dL"
        lab_matches["Fasting Glucose"] = f"{val} {unit}"

    if lab_matches:
        extracted["lab_results"] = lab_matches

    return extracted
