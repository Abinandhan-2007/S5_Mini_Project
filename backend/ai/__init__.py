"""
CarePulse AI & LLM RAG Pipeline.
Self-contained clinical intelligence suite including:
- TF-IDF Vector RAG Engine over Clinical Knowledge Base
- Deterministic Emergency Triage & Red-Flag Safety Filter
- Medical Intent Classifier & Entity Extractor
- Calibrated Evidence Confidence Scoring
- 4-Step Clinical Multi-Agent Assessment Protocol
- SOAP Note Generator and Doctor Scheduling Agents
"""

from .rag import rag_engine, chunk_text, extract_text_from_file, rewrite_query_for_rag
from .triage import evaluate_medical_triage, EMERGENCY_PATTERNS, URGENT_PATTERNS
from .intent import classify_intent, HEALTH_INTENT_KEYWORDS
from .confidence import calculate_evidence_confidence
from .patient_context import extract_patient_entities
from .followup_agent import generate_followup_options
from .llm import generate_conversational_response, HEALTH_SYSTEM_PROMPT
from .inference import predict_triage, generate_soap_summary
from .schemas import AITriageRequest, AITriageResponse
from .graph import execute_triage_workflow

__all__ = [
    "rag_engine",
    "chunk_text",
    "extract_text_from_file",
    "rewrite_query_for_rag",
    "evaluate_medical_triage",
    "EMERGENCY_PATTERNS",
    "URGENT_PATTERNS",
    "classify_intent",
    "HEALTH_INTENT_KEYWORDS",
    "calculate_evidence_confidence",
    "extract_patient_entities",
    "generate_followup_options",
    "generate_conversational_response",
    "HEALTH_SYSTEM_PROMPT",
    "predict_triage",
    "generate_soap_summary",
    "AITriageRequest",
    "AITriageResponse",
    "execute_triage_workflow"
]
