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
            if " " in variant:
                if variant in text_lower:
                    return sym_key
            else:
                if re.search(rf"\b{re.escape(variant)}\b", text_lower) or variant in text_lower:
                    return sym_key
    return None

def generate_contextual_chips(user_text: str, department: str = "General Medicine") -> List[str]:
    """Generates dynamic quick-reply action chips based on detected context."""
    sym_key = detect_symptom_key(user_text)
    text_lower = user_text.lower()

    if sym_key == "chest_pain" or "emergency" in text_lower or "breath" in text_lower:
        return ["🚨 Call 108 Emergency", "Find Nearest ER", "Emergency Alert Contact"]

    if any(k in text_lower for k in ["started today", "1-2 days", "1–2 days", "3-5 days", "days", "yesterday"]):
        return ["Chills & Shivering", "Headache & Body Aches", "Sore Throat & Cough", "No other symptoms"]

    if any(k in text_lower for k in ["chill", "shiver", "body ache", "throat", "headache", "cough", "no other"]):
        return ["Book General Physician", "Review SOAP Note", "Home Care Guidance", "Check Fever Tips"]

    if sym_key == "fever":
        return ["Started Today", "1–2 Days", "3–5 Days", "High Fever (>102°F)"]

    if sym_key == "headache":
        return ["Throbbing & Pulsing", "Dull Constant Ache", "Light Sensitivity", "Pain relief tips"]

    if sym_key == "cough":
        return ["Dry Tickly Cough", "Cough with Phlegm", "Worse at Night", "Home Care Guide"]

    if sym_key == "stomach":
        return ["Acid reflux / heartburn", "Bland diet tips", "Sharp stomach cramps", f"Book {department}"]

    if sym_key == "fatigue":
        return ["Duration > 2 weeks", "Physical exhaustion", "Check routine blood panel", f"Consult {department}"]

    if sym_key == "allergies":
        return ["Sneezing & runny nose", "Allergy medication", "Book ENT Specialist"]

    return ["Book Doctor Visit", "Check Symptoms", "Home Care Guidance", "Review SOAP Note"]


def generate_conversational_response(
    messages: List[Dict[str, str]],
    patient_context_str: str = "",
    rag_context_str: str = ""
) -> str:
    """
    Generates conversational medical guidance using available LLM API providers
    (Gemini, Groq, OpenRouter, OpenAI) with a rich multi-turn clinical reasoning engine.
    """
    last_user_msg = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            last_user_msg = m.get("content", "").strip()
            break

    if not last_user_msg:
        return "Hello! How can I assist you with your health today? Please feel free to describe any symptoms you are experiencing."

    # 1. Attempt Google Gemini API
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key:
        candidate_models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash", "gemini-1.5-pro"]
        for model_name in candidate_models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
                prompt_content = (
                    f"{HEALTH_SYSTEM_PROMPT}\n\n"
                    f"Patient Context Profile:\n{patient_context_str or 'No specific history recorded.'}\n\n"
                    f"Clinical Knowledge Guidelines (RAG):\n{rag_context_str or 'General evidence-based clinical protocols.'}\n\n"
                    f"Conversation History:\n"
                )
                for msg in messages[-4:]:
                    prompt_content += f"{msg.get('role', 'user').capitalize()}: {msg.get('content', '')}\n"
                prompt_content += "\nDoctor Response:"

                payload = {
                    "contents": [{"parts": [{"text": prompt_content}]}],
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 600}
                }
                with httpx.Client(timeout=8.0) as client:
                    res = client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts and "text" in parts[0]:
                                return parts[0]["text"].strip()
            except Exception as e:
                logger.debug(f"Gemini API ({model_name}) attempt note: {e}")

    # 2. Attempt Groq API
    groq_key = os.getenv("GROQ_API_KEY", "")
    if groq_key:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
            api_msgs = [{"role": "system", "content": f"{HEALTH_SYSTEM_PROMPT}\n\nClinical Evidence:\n{rag_context_str}"}]
            for msg in messages[-5:]:
                role = "user" if msg.get("role") == "user" else "assistant"
                api_msgs.append({"role": role, "content": msg.get("content", "")})

            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": api_msgs,
                "temperature": 0.3,
                "max_tokens": 500
            }
            with httpx.Client(timeout=8.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    return res.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.debug(f"Groq API generation attempt note: {e}")

    # 3. Attempt OpenRouter / OpenAI API
    openrouter_key = os.getenv("OPENROUTER_API_KEY", "") or os.getenv("OPENAI_API_KEY", "")
    if openrouter_key:
        try:
            api_url = "https://openrouter.ai/api/v1/chat/completions" if os.getenv("OPENROUTER_API_KEY") else "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {openrouter_key}", "Content-Type": "application/json"}
            payload = {
                "model": "gpt-4o-mini" if "openai" in api_url else "meta-llama/llama-3.3-70b-instruct",
                "messages": [
                    {"role": "system", "content": f"{HEALTH_SYSTEM_PROMPT}\nEvidence: {rag_context_str}"},
                    {"role": "user", "content": last_user_msg}
                ],
                "temperature": 0.3,
                "max_tokens": 500
            }
            with httpx.Client(timeout=8.0) as client:
                res = client.post(api_url, headers=headers, json=payload)
                if res.status_code == 200:
                    return res.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.debug(f"OpenRouter/OpenAI API generation attempt note: {e}")

    # 4. Multi-Turn Clinical Dialogue Engine (Local Offline Engine)
    user_turns = [m.get("content", "") for m in messages if m.get("role") == "user"]
    turn_num = len(user_turns)
    all_user_text = " ".join(user_turns).lower()
    last_lower = last_user_msg.lower()

    # Determine primary symptom context across history
    sym_key = detect_symptom_key(last_user_msg)
    if not sym_key:
        sym_key = detect_symptom_key(all_user_text) or "fever"

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
