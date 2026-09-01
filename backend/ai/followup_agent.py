"""
Follow-up Question & Interactive Chip Generation Agent.
Generates relevant clinical quick-response options (chips) based on current symptoms and intake steps.
"""

from typing import List, Dict, Any, Optional

SYMPTOM_OPTION_CHIPS = {
    "fever": ["Under 100°F (Mild)", "100–102°F (Moderate)", "Above 103°F (High)", "Not Measured"],
    "headache": ["Throbbing / Pulsing", "Dull Constant Ache", "Sharp / Stabbing", "Pressure in Forehead"],
    "cough": ["Dry Tickly Cough", "Wet Phlegm / Mucus", "Worse at Night", "Wheezing / Tight Chest"],
    "stomach": ["Upper Abdomen / Heartburn", "Lower Abdomen", "Cramping", "Bloating & Nausea"],
    "fatigue": ["Physical Exhaustion", "Brain Fog / Mental", "Worse in Morning", "Constant All Day"],
    "pain": ["Mild (1–3/10)", "Moderate (4–6/10)", "Severe (7–10/10)"],
    "duration": ["Started Today", "1–3 Days", "1–2 Weeks", "More Than 1 Month"]
}

def generate_followup_options(user_text: str, patient_context: Optional[Dict[str, Any]] = None) -> List[str]:
    """Generates 3-4 interactive quick-answer option chips for patient UI."""
    text_lower = user_text.lower()
    
    # Check if duration options needed
    if not (patient_context and patient_context.get("duration")):
        if any(w in text_lower for w in ["pain", "fever", "cough", "tired", "headache", "ache"]):
            return SYMPTOM_OPTION_CHIPS["duration"]

    for sym, chips in SYMPTOM_OPTION_CHIPS.items():
        if sym in text_lower:
            return chips

    return ["Yes, exactly", "No, not quite", "Mild symptoms", "Getting worse"]
