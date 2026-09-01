"""
CarePulse AI Route Handlers.

TODO: Expose AI endpoints for triage suggestions and clinical assistant workflows.
Note: These endpoints return AI recommendations/suggestions and DO NOT perform direct database writes.
"""

from fastapi import APIRouter, HTTPException, status
from ai.schemas import AITriageRequest, AITriageResponse
from ai.inference import predict_triage

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

    TODO:
    - Calls `backend/ai/inference.py::predict_triage(request)`.
    - Returns structured AI specialty recommendations and risk tiers.
    - Advisory only — does not directly write to the database.
    """
    try:
        # TODO: Replace with actual inference execution
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
