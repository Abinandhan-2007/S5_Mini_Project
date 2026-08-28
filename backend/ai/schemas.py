"""
CarePulse AI Pydantic Schemas.

TODO: Define request and response data contracts for AI inference and triage.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class AITriageRequest(BaseModel):
    """
    TODO: Pydantic request shell for clinical symptom triage.
    """
    symptoms: str = Field(..., description="Raw natural language description of patient symptoms")
    patient_id: Optional[str] = Field(None, description="Optional patient UUID for historical medical context")
    duration_days: Optional[int] = Field(None, description="Reported duration of symptoms in days")
    severity_self_reported: Optional[int] = Field(None, ge=1, le=10, description="Self-reported pain/discomfort level 1-10")


class AITriageResponse(BaseModel):
    """
    TODO: Pydantic response shell for clinical symptom triage suggestions.
    Note: Represents AI advisory suggestions, not a direct database write.
    """
    suggested_specialties: List[str] = Field(default_factory=list, description="Ranked list of recommended medical specialties")
    primary_specialty: Optional[str] = Field(None, description="Top recommended department or doctor specialty")
    risk_level: str = Field("low", description="Triage risk tier: low, moderate, or critical")
    confidence_score: float = Field(0.0, ge=0.0, le=100.0, description="Model confidence percentage")
    is_emergency: bool = Field(False, description="Flag indicating urgent care / emergency escalation required")
    summary: Optional[str] = Field(None, description="Clinical summary explanation of the triage evaluation")
    disclaimer: str = Field(
        "This AI assessment is for informational guidance and preliminary triage only. For life-threatening emergencies, seek immediate in-person medical care.",
        description="Standard medical safety disclaimer"
    )
