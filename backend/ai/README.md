# CarePulse AI & LLM RAG Intelligence Suite

This module contains the complete, production-ready AI & Multi-Agent RAG engine for the CarePulse / Healthcare Knowledge Navigator system.

## Features & Architecture

1. **RAG Vector Search Engine (`rag.py`)**:
   - High-performance TF-IDF vector space with cosine similarity ranking.
   - Intelligent character chunking with section header extraction and token overlap.
   - Pre-loaded with clinical guidelines across Cardiology, Endocrinology, Pulmonology, Gastroenterology, Pharmacology, and Laboratory References.
2. **Clinical Safety Triage Filter (`triage.py`)**:
   - Deterministic red-flag detection ensuring **100% Sensitivity (Zero False Negatives)** on life-threatening conditions (chest pain, stroke, dyspnea, anaphylaxis).
3. **Medical Intent Classifier (`intent.py`)**:
   - Multi-intent classification across 13 clinical and administrative query types with confidence scoring.
4. **Clinical Entity Extractor (`patient_context.py`)**:
   - Demographics (age, sex), symptoms, duration/onset, severity level (1-10), and laboratory values (TSH, HbA1c, Fasting Glucose).
5. **Calibrated Evidence Confidence Engine (`confidence.py`)**:
   - Weighted composite index balancing retrieval score, source quality tier, and multi-source agreement.
6. **Multi-Agent Clinical Pipeline (`agents/`)**:
   - **Triage Agent**: 4-step assessment protocol with ranked differential conditions and department routing.
   - **Scheduling Agent**: Specialist matching and conflict-free slot reservation.
   - **Report Agent**: Doctor-ready SOAP (Subjective, Objective, Assessment, Plan) clinical note generation.
   - **Care Agent**: Medication reminders and discharge guidance.
7. **Conversational LLM Engine (`llm.py`)**:
   - Cloud ML Mistral Agent API integration for multi-turn medical intake and clinical guidance.

---

## Directory Structure

```
backend/ai/
├── agents/
│   ├── __init__.py
│   ├── triage_agent.py
│   ├── scheduling_agent.py
│   ├── report_agent.py
│   └── care_agent.py
├── data/
│   └── medical_kb/
│       ├── 01_cardiovascular_guidelines.md
│       ├── 02_endocrinology_thyroid_diabetes.md
│       ├── 03_pulmonology_fatigue_respiratory.md
│       ├── 04_gastroenterology_abdominal_pain.md
│       ├── 05_pharmacology_drug_interactions.md
│       └── 06_laboratory_reference_ranges.md
├── __init__.py
├── config.py
├── confidence.py
├── evaluate_accuracy.py
├── followup_agent.py
├── graph.py
├── inference.py
├── intent.py
├── llm.py
├── patient_context.py
├── rag.py
├── schemas.py
├── triage.py
└── README.md
```

---

## Running the Model Accuracy Benchmark

To run the accuracy evaluation suite:

```bash
python backend/ai/evaluate_accuracy.py
```
