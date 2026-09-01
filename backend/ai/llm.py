"""
CarePulse / Med AI Conversational LLM Engine.
Provides multi-turn medical conversation synthesis, RAG-grounded clinician responses,
and robust fallbacks across Gemini, Groq, OpenRouter, OpenAI, and clinical RAG dialogue engines.
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
- NEVER use robotic filler like "Thank you for sharing your symptoms". React specifically to what they described.
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

CLINICAL_INTAKE_KNOWLEDGE = {
    "fever": {
        "title": "Fever & Temperature Elevation",
        "questions": [
            "How high has your temperature reached, and how many days has it been going on?",
            "Are you experiencing any chills, sweating, body aches, or a sore throat alongside the fever?",
            "Have you been able to take any fluids, and have you taken medications like Paracetamol / Acetaminophen?"
        ],
        "guidance": "Elevated temperature often indicates your immune system is responding to a viral or bacterial infection. Stay well-hydrated with water and electrolytes, rest in a cool environment, and log your temperature readings.",
        "warning": "If your fever exceeds 102°F (38.9°C), persists for more than 48-72 hours, or is accompanied by a stiff neck, confusion, or difficulty breathing, please seek immediate clinical evaluation.",
        "dept": "General Medicine"
    },
    "headache": {
        "title": "Headache & Cephalea",
        "questions": [
            "Is the headache throbbing, dull, or sharp, and is it concentrated on one side or all over?",
            "Does bright light, screen exposure, or loud sounds make the discomfort worse?",
            "How long has this headache lasted, and have you had any vision changes or nausea?"
        ],
        "guidance": "Headaches are frequently triggered by tension, dehydration, lack of sleep, eye strain, or sinus pressure. Rest in a quiet, dimmed room, hydrate with a glass of water, and avoid prolonged blue-light screens.",
        "warning": "If you experience a sudden 'thunderclap' severe headache, vision loss, numbness, or neck stiffness, seek emergency care immediately.",
        "dept": "General Medicine"
    },
    "cough": {
        "title": "Cough & Respiratory Tract Symptoms",
        "questions": [
            "Is your cough dry and scratchy, or are you bringing up clear, yellow, or greenish phlegm?",
            "How long have you had the cough, and does it worsen at night or when lying down?",
            "Are you having any shortness of breath, wheezing, or chest tightness?"
        ],
        "guidance": "Acute coughs are commonly caused by viral upper respiratory infections, post-nasal drip, or mild airway irritation. Warm liquids, honey-lemon water, steam inhalation, and throat lozenges can help soothe irritation.",
        "warning": "If you notice blood in sputum, severe chest pain, or difficulty catching your breath, immediate medical evaluation is required.",
        "dept": "Pulmonology"
    },
    "stomach": {
        "title": "Abdominal & Gastrointestinal Discomfort",
        "questions": [
            "Where in your abdomen is the pain situated (upper, lower, right side, or left side)?",
            "Is it a burning sensation, sharp cramps, or dull ache? Does eating food make it better or worse?",
            "Have you experienced any nausea, vomiting, acid reflux, or bowel habit changes?"
        ],
        "guidance": "Abdominal discomfort can stem from gastritis, acid reflux, food sensitivities, or indigestion. Sip clear fluids, eat bland meals (bananas, rice, applesauce, toast), and avoid spicy, greasy, or acidic foods.",
        "warning": "Severe localized lower right pain, vomiting blood, black tarry stools, or high fever with severe abdominal rigidity warrant emergency attention.",
        "dept": "Gastroenterology"
    },
    "fatigue": {
        "title": "Fatigue & Low Energy",
        "questions": [
            "How long have you been feeling this persistent fatigue, and does adequate sleep help relieve it?",
            "Have you noticed any other symptoms such as unexplained weight shifts, hair thinning, or mood changes?",
            "Have you had recent blood tests checking your hemoglobin (iron), vitamin D, or thyroid (TSH) levels?"
        ],
        "guidance": "Chronic fatigue can be related to sleep quality, stress, recovery from viral illness, anemia, or metabolic/endocrine shifts like thyroid dysfunction. Focus on regular sleep hygiene, balanced nutrition, and gentle hydration.",
        "warning": "Consult a physician for a routine panel (CBC, Vitamin B12/D, Thyroid panel) if fatigue continues for weeks despite rest.",
        "dept": "Endocrinology"
    },
    "dizziness": {
        "title": "Dizziness & Lightheadedness",
        "questions": [
            "Does the dizziness feel like the room is spinning (vertigo), or more like faintness upon standing?",
            "Have you been drinking enough fluids today, and have you eaten regular meals?",
            "Are you having any ringing in your ears, hearing changes, or heart palpitations?"
        ],
        "guidance": "Lightheadedness is often caused by dehydration, low blood sugar, or standing up too quickly (orthostatic drop). Sit or lie down immediately, drink water, and rise slowly.",
        "warning": "Sudden dizziness accompanied by chest discomfort, slurred speech, or weakness in limbs requires immediate emergency check.",
        "dept": "General Medicine"
    },
    "sore_throat": {
        "title": "Sore Throat & Pharyngitis",
        "questions": [
            "Is the throat pain severe enough to make swallowing difficult, and do you have a fever?",
            "Do you notice any white patches on your tonsils or swollen tender glands in your neck?",
            "How many days has your throat felt sore, and do you have a cough or runny nose?"
        ],
        "guidance": "Most sore throats are viral and resolve within 5 to 7 days. Warm saltwater gargles (1/2 tsp salt in warm water), honey, throat lozenges, and staying hydrated provide effective relief.",
        "warning": "If you experience severe difficulty swallowing liquids, inability to open your mouth fully, or drooling, consult a doctor promptly.",
        "dept": "General Medicine"
    },
    "allergies": {
        "title": "Allergic Rhinitis & Environmental Sensitivity",
        "questions": [
            "Are you having sneezing fits, clear nasal discharge, or itchy watery eyes?",
            "Have you recently been exposed to pollen, dust, animal dander, or changes in weather?",
            "Have you tried an over-the-counter antihistamine or saline nasal spray?"
        ],
        "guidance": "Allergic rhinitis occurs when the immune system reacts to airborne allergens. Saline nasal rinses and avoiding known triggers can significantly reduce symptoms.",
        "warning": "If you experience wheezing, facial swelling, or throat constriction, seek emergency care immediately for potential severe allergy.",
        "dept": "General Medicine"
    },
    "chest_pain": {
        "title": "Chest Discomfort & Cardiovascular Assessment",
        "questions": [
            "Can you describe the feeling — is it pressure, heaviness, burning, or sharp pain when taking a deep breath?",
            "Does the discomfort radiate to your left arm, jaw, neck, or back?",
            "Are you experiencing any shortness of breath, cold sweating, or nausea?"
        ],
        "guidance": "Chest discomfort must always be treated with high clinical caution. While it can sometimes be caused by acid reflux or muscle strain, cardiac causes must be ruled out by a medical professional.",
        "warning": "🚨 **CRITICAL WARNING**: Crushing chest pressure, pain radiating to the arm/jaw, or sudden breathlessness is a potential medical emergency. Please call 108 / 911 immediately or proceed to the nearest Emergency Room.",
        "dept": "Cardiology"
    },
    "nausea_vomiting": {
        "title": "Gastroenteritis & Nausea",
        "questions": [
            "How many episodes of vomiting or diarrhea have you had, and are you able to keep sips of water down?",
            "Did this start after consuming any particular food or beverage?",
            "Are you experiencing any signs of dehydration such as dark urine, dry mouth, or lightheadedness?"
        ],
        "guidance": "Focus on preventing dehydration with oral rehydration solution (ORS) or electrolyte water taken in small, frequent sips. Avoid solid foods until vomiting subsides, then introduce simple foods like crackers or rice.",
        "warning": "Seek medical attention if you cannot keep liquids down for over 24 hours, notice blood in vomit or stool, or feel extremely dizzy.",
        "dept": "Gastroenterology"
    }
}

def detect_symptom_key(text: str) -> Optional[str]:
    """Detects symptom category with fuzzy matching and typo normalization."""
    text_lower = text.lower()
    for sym_key, variants in SYMPTOM_TYPO_MAP.items():
        for variant in variants:
            # Word boundary check or substring match for phrases
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

    if sym_key == "chest_pain" or "emergency" in text_lower or "shortness of breath" in text_lower:
        return ["🚨 Call 108 Emergency", "Find Nearest ER", "Emergency Alert Contact"]

    if sym_key == "fever":
        return ["Check Temperature", "Duration: 1-2 days", "Body aches & Chills", "Book Doctor Visit"]

    if sym_key == "headache":
        return ["Throbbing pain", "Pain relief tips", "Light sensitivity", "Book Telehealth"]

    if sym_key == "cough":
        return ["Dry cough", "Cough with phlegm", "Home remedies", f"Consult {department}"]

    if sym_key == "stomach":
        return ["Acid reflux / heartburn", "Bland diet tips", "Sharp stomach cramps", f"Book {department}"]

    if sym_key == "fatigue":
        return ["Check routine lab tests", "Duration > 2 weeks", "Sleep hygiene tips", f"Consult {department}"]

    if sym_key == "allergies":
        return ["Sneezing & runny nose", "Allergy medication", "Book ENT Specialist"]

    return ["Book Doctor Visit", "Check Symptoms", "Home Care Guidance", "Find Specialists"]


def generate_conversational_response(
    messages: List[Dict[str, str]],
    patient_context_str: str = "",
    rag_context_str: str = ""
) -> str:
    """
    Generates conversational medical guidance using available LLM API providers
    (Gemini, Groq, OpenRouter, OpenAI) with a rich clinical RAG fallback engine.
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

    # 4. Advanced Clinician Reasoning & RAG-grounded Dialogue Engine (Offline Fallback)
    sym_key = detect_symptom_key(last_user_msg)
    
    # Check if user is responding to previous question (e.g. answering duration, temperature, or severity)
    prev_user_msgs = [m.get("content", "") for m in messages if m.get("role") == "user"]
    if not sym_key and len(prev_user_msgs) > 1:
        for prev in reversed(prev_user_msgs[:-1]):
            sym_key = detect_symptom_key(prev)
            if sym_key:
                break

    if sym_key and sym_key in CLINICAL_INTAKE_KNOWLEDGE:
        info = CLINICAL_INTAKE_KNOWLEDGE[sym_key]
        question = info["questions"][0]
        
        # Select follow-up question based on conversation turn depth
        turn_count = len(messages)
        if turn_count >= 4:
            question = info["questions"][1] if len(info["questions"]) > 1 else info["questions"][0]
        if turn_count >= 6:
            question = info["questions"][2] if len(info["questions"]) > 2 else info["questions"][0]

        response_text = (
            f"I hear that you're experiencing {sym_key.replace('_', ' ')}. "
            f"{info['guidance']}\n\n"
            f"To evaluate this thoroughly: **{question}**\n\n"
            f"ℹ️ *{info['warning']}*"
        )
        return response_text

    # Check for general question or greeting
    text_lower = last_user_msg.lower()
    if any(g in text_lower for g in ["hi", "hello", "hey", "good morning", "good evening", "namaste"]):
        return (
            "Hello! 👋 I'm CarePulse AI, your virtual clinical assistant. "
            "How are you feeling today? You can describe any symptoms you are experiencing "
            "(such as fever, headache, cough, stomach pain, or fatigue) or tap one of the options below to begin an evaluation."
        )

    if any(q in text_lower for q in ["who are you", "what can you do", "help"]):
        return (
            "I'm CarePulse AI, designed to assist you with symptom evaluation, clinical department routing, "
            "and health guidance. Please describe what you are currently feeling, including how long it has been going on."
        )

    # General clinical symptom intake response
    return (
        "I've noted the symptoms you described. To help determine the appropriate care pathway, "
        "could you share:\n"
        "1. Approximately how many days or hours have you experienced this?\n"
        "2. On a scale of 1 to 10, how severe is the discomfort?\n"
        "3. Are you experiencing any other symptoms, such as fever, dizziness, or nausea?"
    )
