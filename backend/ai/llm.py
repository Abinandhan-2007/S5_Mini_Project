"""
CarePulse / Med AI Conversational LLM Engine.
Provides multi-turn medical conversation synthesis, RAG-grounded clinician responses,
and robust clinical dialogue handling powered exclusively by Cloud ML (Mistral Agent API).
"""

import json
import httpx
import logging
import os
import re
from typing import List, Dict, Optional, Any, Tuple

logger = logging.getLogger(__name__)

HEALTH_SYSTEM_PROMPT = """You are CarePulse Med AI, an intelligent, empathetic clinical intake and triage assistant. 
You talk like an attentive, knowledgeable clinician chatting with a patient — never like a generic robot. 
You gather information through natural back-and-forth dialogue, react specifically to what the patient says, and guide them with evidence-based recommendations.

You are NOT a replacement for an in-person doctor. You provide informational guidance, triage risk assessment, and always recommend seeing a qualified healthcare specialist for definitive diagnosis.

TONE & GUIDELINES:
- Empathetic, calm, professional, and clear.
- NEVER use robotic filler. React specifically to what they described.
- Ask ONE targeted follow-up question per turn to understand duration, severity, or accompanying symptoms.
- If emergency red flags appear (chest pain, severe breathlessness, sudden weakness, very high fever), advise immediate emergency care (108 / 911 / ER).
"""

# Normalized Symptom Synonyms & Typo Mapping
SYMPTOM_TYPO_MAP = {
    "fever": [
        "fever", "fewer", "fevr", "feever", "feverish", "high temp", "temperature",
        "chills", "shivering", "burning up", "hot body", "pyrexia", "feeling hot"
    ],
    "headache": [
        "headache", "hedache", "head ache", "head pain", "migraine", "throbbing head",
        "temple pain", "cephalea", "head hurts", "head spin"
    ],
    "neck_pain": [
        "neckpain", "neck pain", "stiff neck", "neck stiffness", "neck hurts", "cervical pain", "neck ache"
    ],
    "back_pain": [
        "backpain", "back pain", "lower back pain", "spine pain", "lumbago", "back ache"
    ],
    "joint_pain": [
        "joint pain", "knee pain", "elbow pain", "body ache", "body aches", "muscle pain", "myalgia"
    ],
    "skin_rash": [
        "skin rash", "rash", "hives", "itchy", "itching", "skin itch", "dermatitis", "skin redness"
    ],
    "cough": [
        "cough", "caugh", "couph", "coughing", "dry cough", "wet cough", "phlegm",
        "mucus", "hacking", "wheeze", "wheezing", "throat tickle"
    ],
    "stomach": [
        "stomach", "stomac", "stomach pain", "tummy", "belly pain", "abdominal pain",
        "gastric", "acid reflux", "heartburn", "gerd", "cramps", "bloating", "indigestion"
    ],
    "fatigue": [
        "fatigue", "fatig", "tired", "tiredness", "exhausted", "exhaustion", "weakness",
        "low energy", "drained", "lethargic", "burnout", "heavy body"
    ],
    "dizziness": [
        "dizziness", "dizzy", "dizy", "lightheaded", "vertigo", "spinning", "faint", "woozy"
    ],
    "sore_throat": [
        "sore throat", "sorethrote", "throat pain", "scratchy throat", "swollen tonsils", "pain swallowing"
    ],
    "allergies": [
        "allergy", "allergies", "allergic", "sneezing", "congestion", "runny nose", "itchy eyes", "sinus"
    ],
    "chest_pain": [
        "chest pain", "chest tightness", "crushing chest", "heart racing", "palpitations", "shortness of breath", "breathless"
    ],
    "nausea_vomiting": [
        "nausea", "vomit", "vomiting", "throwing up", "queasy", "upset stomach", "diarrhea", "loose motion"
    ]
}

def detect_symptom_key(text: str) -> Optional[str]:
    """Detects symptom category with fuzzy matching, typo normalization, and negation awareness."""
    text_lower = text.lower()
    
    for sym_key, variants in SYMPTOM_TYPO_MAP.items():
        for variant in variants:
            pattern = rf"\b{re.escape(variant)}\b" if (" " not in variant and len(variant) <= 4) else re.escape(variant)
            for match in re.finditer(pattern, text_lower):
                start = match.start()
                prefix = text_lower[max(0, start - 40):start]
                if not re.search(r"\b(no|not|without|denies|denying|free of|negative for)\b(?:\s+\w+){0,4}\s*(?:or|and)?\s*$", prefix):
                    return sym_key
    return None

def generate_contextual_chips(user_text: str, department: str = "General Medicine") -> List[str]:
    """Generates dynamic quick-reply action chips based on detected context."""
    sym_key = detect_symptom_key(user_text)
    text_lower = user_text.lower()

    if sym_key == "chest_pain" or "emergency" in text_lower or ("shortness of breath" in text_lower and not ("no shortness of breath" in text_lower or "without shortness of breath" in text_lower)):
        return ["🚨 Call 108 Emergency", "Find Nearest ER", "Emergency Alert Contact"]

    if sym_key == "fever":
        if any(k in text_lower for k in ["chills", "body ache", "101", "102", "100", "days"]):
            return ["Book Doctor Visit", "Review SOAP Note", "Home Care Guidance", "Hydration Tips"]
        return ["Check Temperature", "Duration: 1-2 days", "Body aches & Chills", "Book Doctor Visit"]

    if sym_key == "headache":
        if any(k in text_lower for k in ["throbbing", "dull", "sharp", "nausea", "no nausea", "left side", "right side"]):
            return ["Book Doctor Visit", "Review SOAP Note", "Pain Relief Tips", "Consult Specialist"]
        return ["Throbbing pain", "Pain relief tips", "Light sensitivity", "Book Telehealth"]

    if sym_key == "neck_pain":
        return ["Stiff neck check", "Posture tips", "Duration > 3 days", "Consult Specialist"]

    if sym_key == "back_pain":
        return ["Lower back pain", "Posture & Stretching", "Pain relief tips", "Book Orthopedics"]

    if sym_key == "joint_pain":
        return ["Knee / Joint swelling", "Warm compress tips", "Book Orthopedics"]

    if sym_key == "skin_rash":
        return ["Itchy skin", "Topical soothing", "Allergy check", "Book Dermatology"]

    if sym_key == "cough":
        if any(k in text_lower for k in ["dry", "phlegm", "mucus", "no fever"]):
            return ["Home remedies", "Review SOAP Note", "Book Pulmonology", "Consult Specialist"]
        return ["Dry cough", "Cough with phlegm", "Home remedies", f"Consult {department}"]

    if sym_key == "stomach":
        return ["Acid reflux / heartburn", "Bland diet tips", "Sharp stomach cramps", f"Book {department}"]

    if sym_key == "fatigue":
        return ["Check routine lab tests", "Duration > 2 weeks", "Sleep hygiene tips", f"Consult {department}"]

    if sym_key == "allergies":
        return ["Sneezing & runny nose", "Allergy medication", "Book ENT Specialist"]

    return ["Book Doctor Visit", "Check Symptoms", "Home Care Guidance", "Review SOAP Note"]


def call_mistral_agent(
    messages: List[Dict[str, str]],
    patient_context_str: str = "",
    rag_context_str: str = ""
) -> Optional[str]:
    """
    Calls the official Cloud ML Mistral Agent API (ag_01a062cbadc977cf85c1546ff60ad68e)
    using MISTRAL_API_KEY and MISTRAL_AGENT_ID loaded from environment variables.
    Preserves full multi-turn conversation context.
    """
    import time

    mistral_key = (os.getenv("MISTRAL_API_KEY") or "").strip()
    if not mistral_key:
        try:
            import config
            mistral_key = (getattr(config, "MISTRAL_API_KEY", "") or "").strip()
        except Exception:
            pass

    mistral_agent_id = (os.getenv("MISTRAL_AGENT_ID") or "").strip()
    if not mistral_agent_id:
        try:
            import config
            mistral_agent_id = (getattr(config, "MISTRAL_AGENT_ID", "") or "ag_01a062cbadc977cf85c1546ff60ad68e").strip()
        except Exception:
            mistral_agent_id = "ag_01a062cbadc977cf85c1546ff60ad68e"

    if not mistral_key:
        logger.warning("MISTRAL_API_KEY not configured in backend environment.")
        return None

    system_prompt = (
        f"{HEALTH_SYSTEM_PROMPT}\n\n"
        f"Patient Context Profile:\n{patient_context_str or 'No specific history recorded.'}\n\n"
        f"Clinical Guidelines (RAG):\n{rag_context_str or 'General evidence-based clinical protocols.'}"
    )

    api_msgs = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        role = "user" if msg.get("role") == "user" else "assistant"
        content = msg.get("content", "").strip()
        if content:
            api_msgs.append({"role": role, "content": content})

    payload = {
        "agent_id": mistral_agent_id,
        "messages": api_msgs,
        "max_tokens": 600
    }

    headers = {
        "Authorization": f"Bearer {mistral_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    url = "https://api.mistral.ai/v1/agents/completions"

    try:
        with httpx.Client(timeout=15.0) as client:
            res = client.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                choices = data.get("choices", [])
                if choices and "message" in choices[0]:
                    reply = choices[0]["message"].get("content", "").strip()
                    if reply:
                        return reply
            else:
                logger.warning(f"Mistral Agent API ({url}) returned status {res.status_code}. Attempting Cloud ML Chat Completions fallback...")
    except Exception as e:
        logger.warning(f"Mistral Agent API call notice: {e}")

    # Fallback to Cloud ML Chat Completions (open-mistral-7b / open-mistral-nemo)
    chat_url = "https://api.mistral.ai/v1/chat/completions"
    for model_name in ["open-mistral-7b", "open-mistral-nemo", "mistral-small-latest"]:
        chat_payload = {
            "model": model_name,
            "messages": api_msgs,
            "max_tokens": 600,
            "temperature": 0.3
        }
        try:
            with httpx.Client(timeout=15.0) as client:
                res = client.post(chat_url, headers=headers, json=chat_payload)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices and "message" in choices[0]:
                        reply = choices[0]["message"].get("content", "").strip()
                        if reply:
                            return reply
        except Exception as e:
            logger.warning(f"Cloud ML fallback model '{model_name}' failed: {e}")

    return None


def generate_conversational_response(
    messages: List[Dict[str, str]],
    patient_context_str: str = "",
    rag_context_str: str = ""
) -> str:
    """
    Generates medical symptom guidance using ONLY the Cloud ML Mistral Agent API.
    """
    last_user_msg = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            last_user_msg = m.get("content", "").strip()
            break

    if not last_user_msg:
        return "Hello! I'm CarePulse Health AI, here to help guide you through your health concerns. Could you please tell me what symptoms or health issues you're experiencing today?"

    # Primary & ONLY AI Provider: Cloud ML Mistral Agent Integration
    mistral_reply = call_mistral_agent(
        messages=messages,
        patient_context_str=patient_context_str,
        rag_context_str=rag_context_str
    )
    if mistral_reply:
        return mistral_reply

    # Safety check for emergency red flags
    last_lower = last_user_msg.lower()
    if any(k in last_lower for k in ["chest pain", "cannot breathe", "severe breathlessness", "unconscious"]):
        return (
            "🚨 **CRITICAL SAFETY ALERT**: Severe chest pain, pressure, or acute shortness of breath requires IMMEDIATE emergency medical attention. "
            "Please call 108 / 911 or proceed to the nearest Emergency Room right away."
        )

    return "Cloud ML Agent service is currently unavailable. Please verify your MISTRAL_API_KEY and active internet connection."
