"""
CarePulse Ambient Voice Scribe Module.
Transcribes audio consultation transcripts into structured SOAP clinical notes and proposed prescription orders.
"""

from typing import Dict, Any, Optional, List
import re

try:
    from .patient_context import extract_patient_entities
    from .agents.report_agent import generate_soap_clinical_note
    from .vision_parser import parse_medical_text_fallback
except (ImportError, ValueError):
    from patient_context import extract_patient_entities
    from agents.report_agent import generate_soap_clinical_note
    from vision_parser import parse_medical_text_fallback

def process_ambient_consultation_transcript(
    consultation_transcript: str,
    patient_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Processes ambient consultation speech transcript, extracting clinical context,
    building a structured SOAP note, and extracting recommended Rx orders.
    """
    entities = extract_patient_entities(consultation_transcript)
    soap_note = generate_soap_clinical_note(
        patient_text=consultation_transcript,
        extracted_context=entities,
        triage_info={}
    )

    # Extract proposed medications from speech
    rx_extraction = parse_medical_text_fallback(consultation_transcript, document_type="prescription")
    proposed_meds = rx_extraction.get("medications", [])

    return {
        "scribe_status": "completed",
        "patient_id": patient_id or "Anonymous",
        "consultation_transcript": consultation_transcript,
        "extracted_context": entities,
        "soap_note": soap_note,
        "proposed_prescriptions": proposed_meds,
        "disclaimer": "Ambient Voice Scribe generated draft. Requires physician review and digital signature before finalizing EMR entry."
    }
