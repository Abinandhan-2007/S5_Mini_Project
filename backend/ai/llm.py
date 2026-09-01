"""
CarePulse / Med AI Conversational LLM Engine.
Provides multi-turn medical conversation synthesis, RAG-grounded clinician responses,
and robust fallbacks across Gemini, Groq, OpenRouter, and conversational medical rule trees.
"""

import json
import httpx
import logging
import os
import random
from typing import List, Dict, Optional, Any

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

HEALTH_SYSTEM_PROMPT = """You are Med AI, a conversational health-intake assistant. You talk like an attentive clinician chatting with a patient — never like a form, checklist, or survey bot. You gather information through natural back-and-forth dialogue, react to what the user actually says, and only show structure at the very end when you summarize.

You are NOT a doctor. You never give a definitive diagnosis or prescribe medication or dosages. You provide informational guidance and always point toward professional care when appropriate.

TONE — YOUR MOST IMPORTANT RULE:
- NEVER use generic filler like "Thank you for providing that detail" or similar robot expressions. React specifically to what the user just said, in your own words, so they feel heard.
- Ask ONE question per turn, phrased conversationally. Never label it "Step N" or expose your internal flow to the patient.
- Reference earlier answers by name when relevant ("Since you mentioned stress...", "Given the symptom onset...").
- Vary sentence structure and length turn to turn.

SAFETY & RED FLAGS:
- Any red-flag combination (chest pain + breathlessness, sudden severe headache, confusion, high fever, etc.) must immediately trigger emergency advice (call 911 / 112 / 108). Stop intake.
- Never give specific drug dosages or prescriptions.
"""

CONVERSATIONAL_INTAKE_QUESTIONS = {
    "fever": [
        "How high has your temperature been? Have you been able to check it with a thermometer?",
        "Are you experiencing any other symptoms along with the fever — like body aches, sore throat, or headache?",
        "Have you been around anyone who's been sick recently, or traveled anywhere in the past couple of weeks?"
    ],
    "headache": [
        "Can you describe the pain — is it more of a throbbing sensation, a pressure feeling, or a sharp stabbing pain?",
        "Where exactly do you feel it — is it on one side, both sides, the front of your head, or the back?",
        "Does anything make it better or worse — like resting, light, noise, or certain movements?"
    ],
    "cough": [
        "Is it a dry cough, or are you bringing up any mucus or phlegm?",
        "Does the cough get worse at any particular time — like at night or after physical activity?",
        "Are you experiencing any other symptoms — like fever, shortness of breath, or a sore throat?"
    ],
    "stomach": [
        "Where exactly is the pain located — upper abdomen, lower, left side, or right side?",
        "How would you describe the pain — is it sharp, cramping, or burning?",
        "Is the pain constant, or does it come and go? Does eating make it better or worse?"
    ],
    "fatigue": [
        "When you say tired, do you mean physically exhausted, mentally drained, or both?",
        "Does the fatigue improve with rest, or do you still feel tired even after a full night's sleep?",
        "Have you noticed any changes in your weight, appetite, or mood recently?"
    ]
}

def generate_conversational_response(
    messages: List[Dict[str, str]],
    patient_context_str: str = "",
    rag_context_str: str = ""
) -> str:
    """
    Generate conversational medical guidance using available LLM API providers,
    with automatic fallbacks.
    """
    last_user_msg = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            last_user_msg = m.get("content", "")
            break

    # 1. Attempt Gemini API
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            prompt_content = f"{HEALTH_SYSTEM_PROMPT}\n\nPatient Context:\n{patient_context_str}\n\nMedical Knowledge Retrieved:\n{rag_context_str}\n\nUser Question: {last_user_msg}"
            payload = {
                "contents": [{"parts": [{"text": prompt_content}]}]
            }
            with httpx.Client(timeout=10.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            logger.warning(f"Gemini API generation failed: {e}")

    # 2. Attempt Groq API
    groq_key = os.getenv("GROQ_API_KEY", "")
    if groq_key:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": f"{HEALTH_SYSTEM_PROMPT}\n\nEvidence Context:\n{rag_context_str}"},
                    {"role": "user", "content": f"{patient_context_str}\n\n{last_user_msg}"}
                ]
            }
            with httpx.Client(timeout=10.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    return res.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.warning(f"Groq API generation failed: {e}")

    # 3. Clinical Rule Tree Fallback
    text_lower = last_user_msg.lower()
    for sym_key, questions in CONVERSATIONAL_INTAKE_QUESTIONS.items():
        if sym_key in text_lower:
            return f"I understand you are dealing with {sym_key}. To help evaluate this properly: {questions[0]}"

    return "Thank you for sharing your symptoms. Could you describe how long this has been going on and if anything specific triggers or relieves it?"


def call_llm_json(
    prompt: str,
    system_instruction: str = "",
    temperature: float = 0.1
) -> Optional[Dict[str, Any]]:
    """
    Executes a structured JSON LLM call across Gemini, Groq, or OpenRouter.
    Returns parsed dictionary or None on failure.
    """
    # 1. Attempt Gemini 1.5 Flash
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            payload = {
                "contents": [{"parts": [{"text": f"{system_instruction}\n\n{prompt}"}]}],
                "generationConfig": {
                    "temperature": temperature,
                    "responseMimeType": "application/json"
                }
            }
            with httpx.Client(timeout=12.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    raw_text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(raw_text)
        except Exception as e:
            logger.warning(f"Gemini JSON API call note: {e}")

    # 2. Attempt Groq Llama-3.3-70b
    groq_key = os.getenv("GROQ_API_KEY", "")
    if groq_key:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": f"{system_instruction}\nRespond ONLY in valid raw JSON matching the requested schema."},
                    {"role": "user", "content": prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": temperature
            }
            with httpx.Client(timeout=12.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    raw_content = res.json()["choices"][0]["message"]["content"]
                    return json.loads(raw_content)
        except Exception as e:
            logger.warning(f"Groq JSON API call note: {e}")

    return None

