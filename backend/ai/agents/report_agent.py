"""
Agent 3: Report Agent (Doctor-Ready SOAP Summaries)
Generates structured SOAP (Subjective, Objective, Assessment, Plan) clinical draft notes from patient consultations.
"""

from typing import Dict, Any, Optional

def generate_soap_clinical_note(
    patient_text: str,
    extracted_context: Optional[Dict[str, Any]] = None,
    triage_info: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Generates structured SOAP summary draft ready for physician review."""
    ctx = extracted_context or {}
    triage = triage_info or {}
    
    age = ctx.get("age", "Unspecified age")
    sex = ctx.get("sex", "Unspecified sex")
    symptoms = ", ".join(ctx.get("symptoms", ["General health inquiry"]))
    duration = ctx.get("duration", "unspecified duration")
    severity = ctx.get("severity", "moderate")
    dept = triage.get("department", "General Medicine")
    
    top_condition = "Pending clinical assessment"
    if triage.get("ranked_possibilities"):
        top_condition = triage["ranked_possibilities"][0]["condition"]

    subjective = (
        f"Patient is a {age} {sex} presenting with primary complaint of {symptoms} "
        f"persisting for {duration}. Patient reports severity level {severity}. "
        f"Narrative: \"{patient_text}\""
    )

    objective = "Vital Signs: Pending triage desk recording. "
    if ctx.get("lab_results"):
        lab_str = ", ".join([f"{k}: {v}" for k, v in ctx["lab_results"].items()])
        objective += f"Self-reported Lab Values: {lab_str}. "
    else:
        objective += "Diagnostic Labs: None uploaded during intake."

    assessment = (
        f"1. Primary Clinical Impression: {top_condition}.\n"
        f"2. Recommended Department Referral: {dept}.\n"
        f"3. Risk Level: {'High / Escalated' if triage.get('is_emergency') else 'Routine / Stable'}."
    )

    plan = (
        f"1. Schedule in-person clinical consultation with {dept} physician.\n"
        f"2. Conduct physical exam and confirm baseline lab panels.\n"
        f"3. Advise patient to seek emergency care if red-flag symptoms develop."
    )

    return {
        "status": "draft_pending_physician_review",
        "department": dept,
        "subjective": subjective,
        "objective": objective,
        "assessment": assessment,
        "plan": plan
    }
