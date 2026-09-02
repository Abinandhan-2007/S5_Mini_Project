"""
CarePulse Core AI Inference Module.
Handles symptom triage, document vision scanning, ambient voice scribing, drug safety guard, and RAG chat generation.
"""

from typing import Optional, Dict, Any, List

try:
    from .schemas import (
        AITriageRequest, AITriageResponse,
        AIVisionRequest, AIVisionResponse,
        AIVoiceScribeRequest, AIVoiceScribeResponse,
        AIDrugGuardRequest, AIDrugGuardResponse,
        AIChatRequest, AIChatResponse
    )
    from .triage import evaluate_medical_triage
    from .agents.triage_agent import run_triage_assessment
    from .agents.report_agent import generate_soap_clinical_note
    from .rag import rag_engine
    from .confidence import calculate_evidence_confidence
    from .vision_parser import analyze_medical_document_image
    from .voice_scribe import process_ambient_consultation_transcript
    from .drug_guard import check_drug_interactions
    from .llm import generate_conversational_response, generate_contextual_chips
    from .patient_context import extract_patient_entities
except (ImportError, ValueError):
    try:
        from ai.schemas import (
            AITriageRequest, AITriageResponse,
            AIVisionRequest, AIVisionResponse,
            AIVoiceScribeRequest, AIVoiceScribeResponse,
            AIDrugGuardRequest, AIDrugGuardResponse,
            AIChatRequest, AIChatResponse
        )
        from ai.triage import evaluate_medical_triage
        from ai.agents.triage_agent import run_triage_assessment
        from ai.agents.report_agent import generate_soap_clinical_note
        from ai.rag import rag_engine
        from ai.confidence import calculate_evidence_confidence
        from ai.vision_parser import analyze_medical_document_image
        from ai.voice_scribe import process_ambient_consultation_transcript
        from ai.drug_guard import check_drug_interactions
        from ai.llm import generate_conversational_response, generate_contextual_chips
        from ai.patient_context import extract_patient_entities
    except (ImportError, ValueError):
        from schemas import (
            AITriageRequest, AITriageResponse,
            AIVisionRequest, AIVisionResponse,
            AIVoiceScribeRequest, AIVoiceScribeResponse,
            AIDrugGuardRequest, AIDrugGuardResponse,
            AIChatRequest, AIChatResponse
        )
        from triage import evaluate_medical_triage
        from agents.triage_agent import run_triage_assessment
        from agents.report_agent import generate_soap_clinical_note
        from rag import rag_engine
        from confidence import calculate_evidence_confidence
        from vision_parser import analyze_medical_document_image
        from voice_scribe import process_ambient_consultation_transcript
        from drug_guard import check_drug_interactions
        from llm import generate_conversational_response, generate_contextual_chips
        from patient_context import extract_patient_entities


def predict_triage(request: AITriageRequest) -> AITriageResponse:
    """Run clinical symptom triage inference on patient input using the 4-step triage agent."""
    context_dict = {}
    if request.duration_days:
        context_dict["duration"] = f"{request.duration_days} days"
    if request.severity_self_reported:
        context_dict["severity"] = f"{request.severity_self_reported}/10"

    triage_result = run_triage_assessment(request.symptoms, context_dict)
    
    rag_results, top_score = rag_engine.search(request.symptoms, top_k=3)

    is_emergency = triage_result.get("is_emergency", False)
    triage_level = triage_result.get("triage_level", "ROUTINE_CONSULTATION")
    dept = triage_result.get("department", "General Medicine")
    
    if is_emergency or triage_level == "EMERGENCY":
        risk_level = "critical"
    elif triage_level == "URGENT_EVALUATION":
        risk_level = "moderate"
    else:
        risk_level = "low"

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


def predict_vision_document(request: AIVisionRequest) -> AIVisionResponse:
    """Parses prescription or lab report images via Gemini Vision or OCR fallback."""
    result = analyze_medical_document_image(
        image_base64_or_text=request.image_base64_or_text,
        document_type=request.document_type
    )
    return AIVisionResponse(
        analysis_engine=result.get("analysis_engine", "CarePulse Vision AI"),
        document_type=result.get("document_type", "prescription"),
        patient_name=result.get("patient_name", "Extracted Patient"),
        date=result.get("date", "2026-09-01"),
        medications=result.get("medications", []),
        lab_results=result.get("lab_results", []),
        clinical_summary=result.get("clinical_summary", "Document parsed successfully."),
        disclaimer=result.get("disclaimer", "AI-extracted document summary. Physician confirmation required.")
    )


def predict_voice_scribe(request: AIVoiceScribeRequest) -> AIVoiceScribeResponse:
    """Processes ambient doctor audio transcript into structured SOAP note and prescription orders."""
    res = process_ambient_consultation_transcript(
        consultation_transcript=request.consultation_transcript,
        patient_id=request.patient_id
    )
    return AIVoiceScribeResponse(
        scribe_status=res.get("scribe_status", "completed"),
        patient_id=res.get("patient_id", "Anonymous"),
        consultation_transcript=res.get("consultation_transcript", ""),
        extracted_context=res.get("extracted_context", {}),
        soap_note=res.get("soap_note", {}),
        proposed_prescriptions=res.get("proposed_prescriptions", []),
        disclaimer=res.get("disclaimer", "Ambient Voice Scribe draft note. Physician review and signature required.")
    )


def predict_drug_guard(request: AIDrugGuardRequest) -> AIDrugGuardResponse:
    """Evaluates proposed prescription against patient active meds and documented allergies."""
    res = check_drug_interactions(
        proposed_medications=request.proposed_medications,
        active_medications=request.active_medications,
        allergies=request.allergies
    )
    return AIDrugGuardResponse(
        is_safe=res["is_safe"],
        overall_risk_level=res["overall_risk_level"],
        total_alerts=res["total_alerts"],
        alerts=res["alerts"],
        summary=res["summary"],
        disclaimer=res["disclaimer"]
    )


def predict_rag_chat(request: AIChatRequest) -> AIChatResponse:
    """Generates RAG-grounded conversational medical guidance with dynamic triage and SOAP note."""
    msgs = [{"role": m.role, "content": m.content} for m in request.messages]
    last_msg = msgs[-1]["content"] if msgs else ""
    
    # 1. Emergency Safety Override Check
    triage_level, emergency_msg = evaluate_medical_triage(last_msg)
    is_emergency = (triage_level == "EMERGENCY")
    
    # 2. 4-Step Clinical Triage & Department Routing
    triage_assessment = run_triage_assessment(last_msg)
    dept = triage_assessment.get("department", "General Medicine")
    conf_score = round(triage_assessment.get("confidence_score", 0.92) * 100.0, 1)
    
    if is_emergency:
        risk_level = "critical"
    elif triage_level == "URGENT_EVALUATION":
        risk_level = "moderate"
    else:
        risk_level = "low"

    # 3. RAG Knowledge Base Semantic Search
    rag_docs, _ = rag_engine.search(last_msg, top_k=3)
    rag_ctx = "\n".join([f"- Document {d['document_name']}: {d.get('content', d.get('content_snippet', ''))[:300]}" for d in rag_docs])
    
    # 4. Multi-turn Conversational LLM Synthesizer
    if is_emergency and emergency_msg:
        reply = emergency_msg
        chips = ["🚨 Call 108 Emergency", "Find Nearest ER", "Emergency Alert Contact"]
    else:
        reply = generate_conversational_response(
            messages=msgs,
            patient_context_str=request.patient_context or "",
            rag_context_str=rag_ctx
        )
        chips = generate_contextual_chips(last_msg, dept)

    # 5. Generate structured SOAP note for clinical documentation
    soap_note = generate_soap_clinical_note(
        patient_text=last_msg,
        extracted_context=triage_assessment.get("extracted_context", {}),
        triage_info=triage_assessment
    )

    return AIChatResponse(
        reply=reply,
        response=reply,
        disclaimer="This is a preliminary AI-based assessment and is not a confirmed medical diagnosis.",
        provider="CarePulse Mistral AI Engine",
        confidence_score=conf_score,
        risk_level=risk_level,
        suggested_specialties=[dept],
        quickReplyChips=chips,
        is_emergency=is_emergency,
        soap_note=soap_note
    )


def generate_soap_summary(consultation_notes: str, patient_id: Optional[str] = None) -> Dict[str, Any]:
    """Generate structured SOAP clinical notes."""
    triage_result = run_triage_assessment(consultation_notes, {})
    return generate_soap_clinical_note(
        patient_text=consultation_notes,
        extracted_context=triage_result.get("extracted_context", {}),
        triage_info=triage_result
    )
