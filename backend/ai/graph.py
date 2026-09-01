"""
Multi-Agent Orchestration Workflow for Clinical Triage.
Provides structured sequential and graph-based execution of symptom intake, safety filtering, and routing.
"""

from typing import Any, Dict

try:
    from .triage import evaluate_medical_triage
    from .agents.triage_agent import run_triage_assessment
    from .agents.scheduling_agent import get_available_specialists
    from .agents.report_agent import generate_soap_clinical_note
    from .rag import rag_engine
except (ImportError, ValueError):
    try:
        from ai.triage import evaluate_medical_triage
        from ai.agents.triage_agent import run_triage_assessment
        from ai.agents.scheduling_agent import get_available_specialists
        from ai.agents.report_agent import generate_soap_clinical_note
        from ai.rag import rag_engine
    except (ImportError, ValueError):
        from triage import evaluate_medical_triage
        from agents.triage_agent import run_triage_assessment
        from agents.scheduling_agent import get_available_specialists
        from agents.report_agent import generate_soap_clinical_note
        from rag import rag_engine

def execute_triage_workflow(initial_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes the multi-agent clinical triage pipeline workflow.
    State transitions:
    1. Red Flag Safety Detection
    2. RAG Retrieval of Medical Evidence
    3. Multi-Agent Triage Assessment & Differential Diagnosis
    4. Specialist Matching
    5. SOAP Note Draft Synthesis
    """
    user_symptoms = initial_state.get("symptoms", "")
    patient_context = initial_state.get("patient_context", {})

    # Step 1: Safety Triage
    triage_level, emergency_msg = evaluate_medical_triage(user_symptoms, patient_context)
    
    # Step 2: RAG Retrieval
    evidence_results, top_score = rag_engine.search(user_symptoms, top_k=3)
    
    # Step 3: Multi-Agent Triage Assessment
    assessment = run_triage_assessment(user_symptoms, patient_context)
    dept = assessment.get("department", "General Medicine")

    # Step 4: Specialist Availability Lookup
    available_doctors = get_available_specialists(dept)

    # Step 5: SOAP Draft
    soap_note = generate_soap_clinical_note(
        patient_text=user_symptoms,
        extracted_context=assessment.get("extracted_context", {}),
        triage_info=assessment
    )

    return {
        "status": "completed",
        "triage_level": triage_level,
        "is_emergency": assessment.get("is_emergency", False),
        "assessment": assessment,
        "evidence_sources": evidence_results,
        "available_specialists": available_doctors,
        "soap_note": soap_note
    }
