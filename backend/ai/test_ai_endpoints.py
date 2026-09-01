"""
End-to-End FastAPI Test Suite for CarePulse AI Endpoints.
Verifies real HTTP requests to /api/ai/triage, /api/ai/scan-document, /api/ai/voice-scribe, /api/ai/drug-guard, /api/ai/chat.
"""

import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_ai_triage():
    res = client.post("/api/ai/triage", json={
        "symptoms": "Severe crushing chest pain radiating to left arm",
        "duration_days": 1,
        "severity_self_reported": 9
    })
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["is_emergency"] is True
    assert data["risk_level"] == "critical"
    print("[PASS] /api/ai/triage HTTP endpoint verified.")

def test_ai_scan_document():
    res = client.post("/api/ai/scan-document", json={
        "image_base64_or_text": "Rx: Amoxicillin 500mg PO TID x 7 days. HbA1c 7.8% (High).",
        "document_type": "prescription"
    })
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert len(data["medications"]) > 0 or len(data["lab_results"]) > 0
    print("[PASS] /api/ai/scan-document HTTP endpoint verified.")

def test_ai_voice_scribe():
    res = client.post("/api/ai/voice-scribe", json={
        "consultation_transcript": "Patient is a 55 year old male presenting with chest discomfort for 2 days.",
        "patient_id": "p-12345"
    })
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert "soap_note" in data
    assert "subjective" in data["soap_note"]
    print("[PASS] /api/ai/voice-scribe HTTP endpoint verified.")

def test_ai_drug_guard():
    res = client.post("/api/ai/drug-guard", json={
        "proposed_medications": ["Ibuprofen"],
        "active_medications": ["Lisinopril"],
        "allergies": ["Penicillin"]
    })
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["is_safe"] is False
    assert data["overall_risk_level"] == "CRITICAL_CONTRAINDICATION"
    print("[PASS] /api/ai/drug-guard HTTP endpoint verified.")

def test_ai_chat():
    res = client.post("/api/ai/chat", json={
        "messages": [
            {"role": "user", "content": "What are common symptoms of hypertension?"}
        ]
    })
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert "reply" in data
    print("[PASS] /api/ai/chat HTTP endpoint verified.")

if __name__ == "__main__":
    test_ai_triage()
    test_ai_scan_document()
    test_ai_voice_scribe()
    test_ai_drug_guard()
    test_ai_chat()
    print("\nALL 5 END-TO-END AI HTTP ENDPOINT TESTS PASSED SUCCESSFULLY!")
