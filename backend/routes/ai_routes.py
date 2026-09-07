"""
CarePulse AI Route Handlers.
Exposes REST endpoints for clinical symptom triage, vision document scanning,
ambient voice scribing, drug safety interaction guard, and RAG chat workflows.

Note: These endpoints return AI recommendations/suggestions and DO NOT perform direct database writes.
"""

from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any

try:
    from ai.schemas import (
        AITriageRequest, AITriageResponse,
        AIVisionRequest, AIVisionResponse,
        AIVoiceScribeRequest, AIVoiceScribeResponse,
        AIDrugGuardRequest, AIDrugGuardResponse,
        AIChatRequest, AIChatResponse,
        AIRagSearchRequest, AIExtractEntitiesRequest
    )
    from ai.inference import (
        predict_triage,
        predict_vision_document,
        predict_voice_scribe,
        predict_drug_guard,
        predict_rag_chat,
        generate_soap_summary
    )
    from ai.patient_context import extract_patient_entities
    from ai.rag import rag_engine
except (ImportError, ValueError):
    from backend.ai.schemas import (
        AITriageRequest, AITriageResponse,
        AIVisionRequest, AIVisionResponse,
        AIVoiceScribeRequest, AIVoiceScribeResponse,
        AIDrugGuardRequest, AIDrugGuardResponse,
        AIChatRequest, AIChatResponse,
        AIRagSearchRequest, AIExtractEntitiesRequest
    )
    from backend.ai.inference import (
        predict_triage,
        predict_vision_document,
        predict_voice_scribe,
        predict_drug_guard,
        predict_rag_chat,
        generate_soap_summary
    )
    from backend.ai.patient_context import extract_patient_entities
    from backend.ai.rag import rag_engine

router = APIRouter(
    prefix="/api/ai",
    tags=["AI Clinical Services"]
)


@router.post(
    "/triage",
    response_model=AITriageResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate patient symptoms for specialty suggestions"
)
async def triage_symptoms(request: AITriageRequest):
    """
    POST /api/ai/triage
    Evaluates patient symptoms, calculates risk tier, and routes to appropriate medical department.
    """
    try:
        return predict_triage(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Triage service error: {str(e)}"
        )


@router.post(
    "/scan-document",
    response_model=AIVisionResponse,
    status_code=status.HTTP_200_OK,
    summary="Prescription & Lab Report Vision Image Scanner"
)
async def scan_medical_document(request: AIVisionRequest):
    """
    POST /api/ai/scan-document
    Parses doctor prescription photos or lab report images via Gemini Vision / OCR.
    Extracts prescribed drugs (name, dosage, frequency) and lab biomarkers (parameter, status: high/low).
    """
    try:
        return predict_vision_document(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vision Document Scanner error: {str(e)}"
        )


@router.post(
    "/voice-scribe",
    response_model=AIVoiceScribeResponse,
    status_code=status.HTTP_200_OK,
    summary="Ambient Voice Consultation Audio Scribe"
)
async def scribe_consultation_voice(request: AIVoiceScribeRequest):
    """
    POST /api/ai/voice-scribe
    Transcribes ambient doctor-patient consultation dialogue and synthesizes structured SOAP clinical draft notes.
    """
    try:
        return predict_voice_scribe(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ambient Voice Scribe error: {str(e)}"
        )


@router.post(
    "/drug-guard",
    response_model=AIDrugGuardResponse,
    status_code=status.HTTP_200_OK,
    summary="Real-Time Drug-Drug Interaction & Allergy Guard Alert"
)
async def check_medication_guard(request: AIDrugGuardRequest):
    """
    POST /api/ai/drug-guard
    Cross-checks proposed prescriptions against patient active medications and documented allergies to flag dangerous drug collisions.
    """
    try:
        return predict_drug_guard(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Drug Safety Guard error: {str(e)}"
        )


@router.post(
    "/chat",
    response_model=AIChatResponse,
    status_code=status.HTTP_200_OK,
    summary="RAG Conversational Clinician Chat Assistant"
)
@router.post(
    "/health-assistant/chat",
    response_model=AIChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Mistral Health Assistant Chat API"
)
async def chat_medical_assistant(request: AIChatRequest):
    """
    POST /api/ai/chat or POST /api/ai/health-assistant/chat
    Provides multi-turn conversational health guidance powered by Mistral Agent API.
    """
    try:
        return predict_rag_chat(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Medical Chat Assistant error: {str(e)}"
        )


@router.post(
    "/soap-summary",
    status_code=status.HTTP_200_OK,
    summary="Generate Structured SOAP Draft Clinical Notes"
)
async def generate_soap_note_endpoint(payload: Dict[str, Any]):
    """
    POST /api/ai/soap-summary
    Generates SOAP (Subjective, Objective, Assessment, Plan) physician summary from clinical text.
    """
    try:
        notes = payload.get("consultation_notes", payload.get("text", ""))
        if not notes:
            raise HTTPException(status_code=400, detail="consultation_notes parameter is required.")
        return generate_soap_summary(notes, payload.get("patient_id"))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SOAP Summary error: {str(e)}"
        )


@router.post(
    "/rag-search",
    status_code=status.HTTP_200_OK,
    summary="Clinical RAG TF-IDF Semantic Vector Search"
)
async def rag_search_endpoint(request: AIRagSearchRequest):
    """
    POST /api/ai/rag-search
    Searches the clinical knowledge base using TF-IDF vector space retrieval.
    """
    try:
        results, score = rag_engine.search(request.query, top_k=request.top_k)
        return {"query": request.query, "top_score": score, "results": results}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG Search error: {str(e)}"
        )


@router.post(
    "/extract-entities",
    status_code=status.HTTP_200_OK,
    summary="Extract Demographics and Clinical Entities"
)
async def extract_entities_endpoint(request: AIExtractEntitiesRequest):
    """
    POST /api/ai/extract-entities
    Extracts age, sex, symptoms, duration, severity, and lab parameters from text.
    """
    try:
        return {"extracted_entities": extract_patient_entities(request.text)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Entity extraction error: {str(e)}"
        )
