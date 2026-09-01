"""
CarePulse AI Route Handlers
Provides endpoints for AI Triage, Ambient Clinical Voice Scribe, and Differential Analysis.
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
import database
from ai.schemas import AITriageRequest, AITriageResponse
from ai.inference import predict_triage
from ai.agents.scribe_agent import process_consultation_transcript

router = APIRouter(
    prefix="/api/ai",
    tags=["AI Clinical Services"]
)


class ScribeProcessRequest(BaseModel):
    transcript: str = Field(..., description="Raw ambient conversational speech transcript")
    doctorId: Optional[str] = None
    patientId: Optional[str] = None
    doctorSpecialty: Optional[str] = "General Medicine"
    patientContext: Optional[Dict[str, Any]] = None
    verbalConsentGiven: Optional[bool] = True


@router.post(
    "/triage",
    response_model=AITriageResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate patient symptoms for specialty suggestions"
)
async def triage_symptoms(request: AITriageRequest):
    """POST /api/ai/triage - Returns structured AI specialty recommendations and risk tiers."""
    try:
        return predict_triage(request)
    except NotImplementedError as nie:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(nie)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Triage service error: {str(e)}"
        )


@router.post(
    "/scribe/process",
    status_code=status.HTTP_200_OK,
    summary="Process ambient consultation voice transcript into structured SOAP note & digital prescription"
)
async def process_scribe_transcript(request: ScribeProcessRequest):
    """
    POST /api/ai/scribe/process
    - Transcribes natural doctor-patient dialogue
    - Extracts SOAP clinical notes and vitals
    - Cross-references patient's on-file database allergies (patients.allergies)
    - Returns calibrated medication confidence badges (High, Inferred, Unclear)
    """
    if not request.transcript or not request.transcript.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript cannot be empty."
        )

    # 1. Fetch authoritative stored patient records & allergies from DB if patientId is provided
    stored_allergies = ""
    patient_ctx = request.patientContext or {}

    if request.patientId:
        try:
            if database.use_pg:
                with database.get_pg_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT * FROM patients WHERE id = %s OR token_number = %s LIMIT 1", (request.patientId, request.patientId))
                        row = cur.fetchone()
                        if row:
                            p_dict = dict(row)
                            stored_allergies = p_dict.get("allergies") or ""
                            patient_ctx.setdefault("name", p_dict.get("name") or p_dict.get("full_name"))
                            patient_ctx.setdefault("age", p_dict.get("age"))
                            patient_ctx.setdefault("gender", p_dict.get("gender") or p_dict.get("sex"))
                            patient_ctx.setdefault("allergies", stored_allergies)
            else:
                db = database.read_json_db()
                patients = db.get("patients", [])
                for p in patients:
                    if p.get("id") == request.patientId or p.get("token_number") == request.patientId or p.get("tokenNumber") == request.patientId:
                        stored_allergies = p.get("allergies") or ""
                        patient_ctx.setdefault("name", p.get("name") or p.get("full_name"))
                        patient_ctx.setdefault("age", p.get("age"))
                        patient_ctx.setdefault("gender", p.get("gender") or p.get("sex"))
                        patient_ctx.setdefault("allergies", stored_allergies)
                        break
        except Exception as e:
            # Non-fatal DB lookup error
            pass

    # 2. Run Scribe AI Extraction & Stored Allergy Cross-Referencing
    try:
        result = process_consultation_transcript(
            transcript=request.transcript,
            doctor_specialty=request.doctorSpecialty or "General Medicine",
            patient_context=patient_ctx,
            stored_allergies=stored_allergies or patient_ctx.get("allergies")
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scribe extraction error: {str(e)}"
        )
