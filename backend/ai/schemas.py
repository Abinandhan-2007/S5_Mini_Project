"""
CarePulse AI Pydantic Schemas.
Defines request and response contracts for clinical triage, vision document scanner,
ambient voice scribe, drug interaction guard, and RAG chat endpoints.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# 1. Triage Schemas
class AITriageRequest(BaseModel):
    symptoms: str = Field(..., description="Raw natural language description of patient symptoms")
    patient_id: Optional[str] = Field(None, description="Optional patient UUID for historical context")
    duration_days: Optional[int] = Field(None, description="Reported duration of symptoms in days")
    severity_self_reported: Optional[int] = Field(None, ge=1, le=10, description="Self-reported pain level 1-10")


class AITriageResponse(BaseModel):
    suggested_specialties: List[str] = Field(default_factory=list, description="Ranked list of recommended medical specialties")
    primary_specialty: Optional[str] = Field(None, description="Top recommended department")
    risk_level: str = Field("low", description="Triage risk tier: low, moderate, or critical")
    confidence_score: float = Field(0.0, ge=0.0, le=100.0, description="Model confidence percentage")
    is_emergency: bool = Field(False, description="Flag indicating emergency escalation required")
    summary: Optional[str] = Field(None, description="Clinical summary explanation")
    disclaimer: str = Field(
        "This AI assessment is for informational guidance and preliminary triage only. For life-threatening emergencies, seek immediate in-person medical care.",
        description="Standard medical safety disclaimer"
    )


# 2. Vision Document Scanner Schemas
class AIVisionRequest(BaseModel):
    image_base64_or_text: str = Field(..., description="Base64 encoded document image or raw OCR text content")
    document_type: str = Field("auto", description="Document category: prescription, lab_report, or auto")


class AIVisionResponse(BaseModel):
    analysis_engine: str = Field(..., description="Engine used for extraction (Cloud ML Vision AI or OCR Fallback)")
    document_type: str = Field(..., description="Extracted document classification")
    patient_name: Optional[str] = Field(None, description="Extracted patient name")
    date: Optional[str] = Field(None, description="Document date")
    medications: List[Dict[str, Any]] = Field(default_factory=list, description="Extracted prescription drugs")
    lab_results: List[Dict[str, Any]] = Field(default_factory=list, description="Extracted lab parameters with status flags")
    clinical_summary: str = Field(..., description="Summary of parsed findings")
    disclaimer: str = Field("AI-extracted document summary. Physician confirmation required.")


# 3. Ambient Voice Scribe Schemas
class AIVoiceScribeRequest(BaseModel):
    consultation_transcript: str = Field(..., description="Doctor-patient audio transcription or dialogue text")
    patient_id: Optional[str] = Field(None, description="Patient identifier")


class AIVoiceScribeResponse(BaseModel):
    scribe_status: str = Field("completed")
    patient_id: str = Field("Anonymous")
    consultation_transcript: str
    extracted_context: Dict[str, Any] = Field(default_factory=dict)
    soap_note: Dict[str, Any] = Field(default_factory=dict)
    proposed_prescriptions: List[Dict[str, Any]] = Field(default_factory=list)
    disclaimer: str = Field("Ambient Voice Scribe draft note. Physician review and signature required.")


# 4. Real-Time Drug Guard Schemas
class AIDrugGuardRequest(BaseModel):
    proposed_medications: List[str] = Field(..., description="List of proposed drug names to prescribe")
    active_medications: Optional[List[str]] = Field(default_factory=list, description="Patient's currently active drugs")
    allergies: Optional[List[str]] = Field(default_factory=list, description="Patient's documented drug allergies")


class AIDrugGuardResponse(BaseModel):
    is_safe: bool = Field(..., description="True if no contraindications or severe collisions detected")
    overall_risk_level: str = Field("SAFE", description="SAFE, MODERATE_INTERACTION, MAJOR_INTERACTION, or CRITICAL_CONTRAINDICATION")
    total_alerts: int = Field(0, description="Total warning count")
    alerts: List[Dict[str, Any]] = Field(default_factory=list, description="Structured clinical safety warnings")
    summary: str = Field(..., description="Clinical risk summary")
    disclaimer: str = Field("Clinical Decision Support Alert. Physician retains final prescribing judgment.")


# 5. RAG Chat & Search Schemas
class AIChatMessage(BaseModel):
    role: str = Field(..., description="user or assistant")
    content: str = Field(..., description="Message text")


class AIChatRequest(BaseModel):
    messages: List[AIChatMessage] = Field(..., description="Conversation history")
    patient_context: Optional[str] = Field("", description="Patient demographic and symptom context")


class AIChatResponse(BaseModel):
    reply: str = Field(..., description="AI clinician response")
    response: Optional[str] = Field(None, description="Alias for reply for standardized response format")
    disclaimer: str = Field(
        "This is a preliminary AI-based assessment and is not a confirmed medical diagnosis.",
        description="Standard medical safety disclaimer"
    )
    provider: str = Field("CarePulse Mistral AI Engine", description="Active response provider")
    confidence_score: Optional[float] = Field(92.0, description="Model confidence percentage")
    risk_level: Optional[str] = Field("low", description="Triage risk tier: low, moderate, or critical")
    suggested_specialties: Optional[List[str]] = Field(default_factory=list, description="Suggested medical specialties")
    quickReplyChips: Optional[List[str]] = Field(default_factory=list, description="Contextual quick reply suggestions")
    is_emergency: Optional[bool] = Field(False, description="Emergency escalation flag")
    soap_note: Optional[Dict[str, Any]] = Field(None, description="Synthesized SOAP clinical summary")



class AIRagSearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    top_k: int = Field(3, ge=1, le=10, description="Top matches count")


class AIExtractEntitiesRequest(BaseModel):
    text: str = Field(..., description="Clinical text")
