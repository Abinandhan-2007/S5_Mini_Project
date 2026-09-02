"""
CarePulse / Med AI Conversational LLM Engine.
Provides multi-turn medical conversation synthesis, RAG-grounded clinician responses,
and robust fallbacks across Gemini, Groq, OpenRouter, and CarePulse multi-agent clinical rule engines.
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
    """Detects symptom category with fuzzy matching and typo normalization."""
    text_lower = text.lower()
    for sym_key, variants in SYMPTOM_TYPO_MAP.items():
        for variant in variants:
            # Word boundary check or substring match for phrases
            if " " in variant or len(variant) > 4:
                if variant in text_lower:
                    return sym_key
            else:
                if re.search(rf"\b{re.escape(variant)}\b", text_lower):
                    return sym_key
    return None

def generate_contextual_chips(user_text: str, department: str = "General Medicine") -> List[str]:
    """Generates dynamic quick-reply action chips based on detected context."""
    sym_key = detect_symptom_key(user_text)
    text_lower = user_text.lower()

    if sym_key == "chest_pain" or "emergency" in text_lower or "shortness of breath" in text_lower:
        return ["🚨 Call 108 Emergency", "Find Nearest ER", "Emergency Alert Contact"]

    if sym_key == "fever":
        return ["Check Temperature", "Duration: 1-2 days", "Body aches & Chills", "Book Doctor Visit"]

    if sym_key == "headache":
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
    Calls the official Mistral Agent API (ag_01a062cbadc977cf85c1546ff60ad68e)
    using MISTRAL_API_KEY and MISTRAL_AGENT_ID loaded from environment variables.
    Preserves full multi-turn conversation context.
    """
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
                logger.error(f"Mistral Agent API call ({url}) returned status {res.status_code}: {res.text}")
    except Exception as e:
        logger.error(f"Error calling Mistral Agent API ({url}): {e}")

    return None


def generate_conversational_response(
    messages: List[Dict[str, str]],
    patient_context_str: str = "",
    rag_context_str: str = ""
) -> str:
    """
    Generates medical symptom guidance using the Mistral Agent API with a clinical rule engine fallback.
    """
    last_user_msg = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            last_user_msg = m.get("content", "").strip()
            break

    if not last_user_msg:
        return "Hello! How can I assist you with your health today? Please feel free to describe any symptoms you are experiencing."

    # 1. Primary AI Provider: New Mistral Agent Integration
    mistral_reply = call_mistral_agent(
        messages=messages,
        patient_context_str=patient_context_str,
        rag_context_str=rag_context_str
    )
    if mistral_reply:
        return mistral_reply

    # 4. Multi-Turn Clinical Dialogue Engine (Local Offline Engine)
    user_turns = [m.get("content", "") for m in messages if m.get("role") == "user"]
    turn_num = len(user_turns)
    all_user_text = " ".join(user_turns).lower()
    last_lower = last_user_msg.lower()

    # Determine primary symptom context across history (NO hardcoded fallback!)
    sym_key = detect_symptom_key(last_user_msg)
    if not sym_key:
        sym_key = detect_symptom_key(all_user_text)

    # Emergency check
    if any(k in last_lower for k in ["chest pain", "cannot breathe", "severe breathlessness", "unconscious"]):
        return (
            "🚨 **CRITICAL SAFETY ALERT**: Severe chest pain, pressure, or acute shortness of breath requires IMMEDIATE emergency medical attention. "
            "Please call 108 / 911 or proceed to the nearest Emergency Room right away."
        )

    # TURN 1: Initial Symptom Presentation
    if turn_num <= 1:
        if sym_key == "fever":
            return (
                "I understand you are experiencing a fever. Elevated temperature is typically your body's immune response to an infection.\n\n"
                "To evaluate this properly: **How many days have you had the fever, and have you checked your temperature with a thermometer?**"
            )
        elif sym_key == "headache":
            return (
                "I hear you have a headache. Headaches are frequently triggered by tension, dehydration, lack of sleep, or eye strain.\n\n"
                "To evaluate this: **Is the pain throbbing, dull, or sharp, and does bright light or noise make it worse?**"
            )
        elif sym_key == "neck_pain":
            return (
                "I hear you are experiencing neck pain or stiffness. Neck discomfort is commonly related to muscle strain, poor posture, or sleeping position.\n\n"
                "To evaluate this properly: **How long have you had this neck pain, and are you able to turn your head side-to-side without severe pain or fever?**"
            )
        elif sym_key == "back_pain":
            return (
                "I note you are experiencing back pain. Back discomfort can result from muscle strain, lifting, or posture.\n\n"
                "To evaluate this: **Where is the pain located (upper or lower back), and does it radiate down your legs?**"
            )
        elif sym_key == "joint_pain":
            return (
                "I note you are experiencing joint pain or body aches.\n\n"
                "To evaluate this: **Which joints are affected, and is there any swelling, redness, or warmth in the joints?**"
            )
        elif sym_key == "skin_rash":
            return (
                "I understand you are noticing a skin rash or irritation.\n\n"
                "To evaluate this: **Is the rash itchy or painful, and have you been exposed to any new soaps, foods, or environmental triggers?**"
            )
        elif sym_key == "cough":
            return (
                "I understand you are dealing with a cough. Acute coughs are commonly caused by viral upper respiratory infections or airway irritation.\n\n"
                "To help assess this: **Is it a dry tickly cough, or are you bringing up mucus or phlegm?**"
            )
        elif sym_key == "stomach":
            return (
                "I hear you are having stomach or abdominal discomfort.\n\n"
                "To help assess this: **Where is the discomfort situated (upper or lower), and is it a burning acid sensation or sharp cramps?**"
            )
        elif sym_key == "fatigue":
            return (
                "I note you are experiencing fatigue and low energy.\n\n"
                "To help assess this: **How long have you felt this persistent tiredness, and does a full night's sleep help you feel rested?**"
            )
        else:
            return (
                "I've noted the symptoms you described. To help determine the appropriate care pathway:\n\n"
                "**Approximately how many days have you experienced this, and how severe is the discomfort?**"
            )

    # TURN 2: Duration / Temperature / Severity Answered
    if turn_num == 2 or any(k in last_lower for k in ["day", "today", "yesterday", "week", "101", "102", "100", "mild", "moderate", "severe"]):
        duration_note = "noted the timeline"
        for d in ["started today", "1-2 days", "1–2 days", "3-5 days", "a week", "2 weeks"]:
            if d in last_lower:
                duration_note = f"noted the {d} duration"
                break

        if sym_key == "fever":
            return (
                f"Thank you for sharing that, I have {duration_note}.\n\n"
                "**Are you experiencing any accompanying symptoms — like body chills, headache, sore throat, or body aches?**"
            )
        elif sym_key == "headache":
            return (
                f"Thank you, I have {duration_note}.\n\n"
                "**Are you having any nausea, dizziness, neck stiffness, or vision changes alongside the headache?**"
            )
        elif sym_key == "cough":
            return (
                f"Thank you, I have {duration_note}.\n\n"
                "**Are you experiencing any fever, shortness of breath, or chest tightness with the cough?**"
            )
        else:
            return (
                f"Thank you, I have {duration_note}.\n\n"
                "**Are you experiencing any other symptoms, such as fever, dizziness, or nausea?**"
            )

    # TURN 3+: Full Clinical Impression & Synthesis
    if sym_key == "fever":
        return (
            "Thank you for providing those details. Based on your fever and accompanying symptoms, this is consistent with an **Acute Febrile Syndrome** (likely viral in origin).\n\n"
            "**Recommended Care Steps:**\n"
            "• **Hydration**: Drink plenty of water, electrolyte fluids, and clear broths.\n"
            "• **Rest**: Allow your body adequate bed rest in a cool, well-ventilated room.\n"
            "• **Temperature Monitoring**: Check and log your temperature twice daily.\n"
            "• **Clinical Evaluation**: Consult a General Physician if your fever exceeds 102°F (38.9°C) or lasts beyond 48 hours.\n\n"
            "You can review your generated **SOAP Clinical Note** above or schedule a consultation with our verified **General Medicine** specialists."
        )
    elif sym_key == "headache":
        return (
            "Thank you for the details. Based on your symptoms, this is consistent with a **Tension-Type Headache or Fatigue-Related Cephalea**.\n\n"
            "**Recommended Care Steps:**\n"
            "• Rest in a quiet, dimly lit room and take a screen break.\n"
            "• Hydrate with a full glass of water.\n"
            "• Apply a cool compress to your forehead or temples.\n"
            "• Consult a physician if pain becomes sudden and severe.\n\n"
            "You can review your **SOAP Note** or book an appointment with our specialists."
        )
    elif sym_key == "cough":
        return (
            "Thank you for the details. Your symptoms are consistent with an **Upper Respiratory Tract Infection / Bronchial Hyperreactivity**.\n\n"
            "**Recommended Care Steps:**\n"
            "• Sip warm liquids with honey and lemon.\n"
            "• Use steam inhalation to soothe airway irritation.\n"
            "• Seek prompt care if you notice wheezing, chest pain, or breathlessness.\n\n"
            "Recommended routing: **Pulmonology or General Medicine**."
        )
    else:
        return (
            "Thank you for sharing your symptoms. Based on your report, I have synthesized your preliminary clinical intake evaluation.\n\n"
            "**Next Recommended Steps:**\n"
            "• Review your synthesized **SOAP Note** for a structured summary of your symptoms.\n"
            "• Schedule a consultation with our recommended medical specialist for definitive examination."
        )
