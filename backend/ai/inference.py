"""
CarePulse Core AI Inference Module.
Handles symptom triage, RAG retrieval grounding, and SOAP note synthesis.
"""

from typing import Optional, Dict, Any, List

try:
    from .schemas import AITriageRequest, AITriageResponse
    from .triage import evaluate_medical_triage
    from .agents.triage_agent import run_triage_assessment
    from .agents.report_agent import generate_soap_clinical_note
    from .rag import rag_engine
    from .confidence import calculate_evidence_confidence
except (ImportError, ValueError):
    try:
        from ai.schemas import AITriageRequest, AITriageResponse
        from ai.triage import evaluate_medical_triage
        from ai.agents.triage_agent import run_triage_assessment
        from ai.agents.report_agent import generate_soap_clinical_note
        from ai.rag import rag_engine
        from ai.confidence import calculate_evidence_confidence
    except (ImportError, ValueError):
        from schemas import AITriageRequest, AITriageResponse
        from triage import evaluate_medical_triage
        from agents.triage_agent import run_triage_assessment
        from agents.report_agent import generate_soap_clinical_note
        from rag import rag_engine
        from confidence import calculate_evidence_confidence

def predict_triage(request: AITriageRequest) -> AITriageResponse:
    """
    Run clinical symptom triage inference on patient input using the 4-step triage agent.
    """
    context_dict = {}
    if request.duration_days:
        context_dict["duration"] = f"{request.duration_days} days"
    if request.severity_self_reported:
        context_dict["severity"] = f"{request.severity_self_reported}/10"

    triage_result = run_triage_assessment(request.symptoms, context_dict)
    
    # RAG search for relevant clinical evidence
    rag_results, top_score = rag_engine.search(request.symptoms, top_k=3)
    conf_level, conf_details = calculate_evidence_confidence(rag_results, request.symptoms)

    is_emergency = triage_result.get("is_emergency", False)
    triage_level = triage_result.get("triage_level", "ROUTINE_CONSULTATION")
    dept = triage_result.get("department", "General Medicine")
    
    # Calculate risk level
    if is_emergency or triage_level == "EMERGENCY":
        risk_level = "critical"
    elif triage_level == "URGENT_EVALUATION":
        risk_level = "moderate"
    else:
        risk_level = "low"

    # Suggested specialties ranking
    suggested = [dept]
    if dept != "General Medicine":
        suggested.append("General Medicine")
    if dept != "Internal Medicine":
        suggested.append("Internal Medicine")

    summary_text = triage_result.get("recommendation", "")
    if triage_result.get("ranked_possibilities"):
        top_dx = triage_result["ranked_possibilities"][0]
        summary_text = f"Primary Clinical Impression: {top_dx['condition']} ({top_dx['probability']}). Recommended routing: {dept}."

    return AITriageResponse(
        suggested_specialties=suggested,
        primary_specialty=dept,
        risk_level=risk_level,
        confidence_score=round(triage_result.get("confidence_score", 0.85) * 100.0, 1),
        is_emergency=is_emergency,
        summary=summary_text,
        disclaimer="This AI assessment is for informational guidance and preliminary triage only. For life-threatening emergencies, seek immediate in-person medical care."
    )

def generate_soap_summary(consultation_notes: str, patient_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Generate structured SOAP (Subjective, Objective, Assessment, Plan) clinical notes.
    """
    triage_result = run_triage_assessment(consultation_notes, {})
    return generate_soap_clinical_note(
        patient_text=consultation_notes,
        extracted_context=triage_result.get("extracted_context", {}),
        triage_info=triage_result
    )
