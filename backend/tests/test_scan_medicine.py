"""
Automated Test Suite for CarePulse Scan Medicine Feature & OpenFDA Integration.

Covers:
1. Clear, correctly-spelled drug name match (HIGH_CONFIDENCE with meal_timing)
2. Misspelled / OCR-garbled text fuzzy match (e.g. "Paracetmol" -> "Paracetamol")
3. Unprescribed drug safety isolation (NO_MATCH, never false positive)
4. Empty / unreadable image handling (graceful UNREADABLE status)
5. Multi-patient prescription data isolation (Patient B cannot match Patient A's drugs)
6. OpenFDA public API drug background lookup for generic medicines
7. OpenFDA unlisted / brand fallback resilience
8. OpenFDA failure / timeout resilience (core matching remains uninterrupted)
"""

import sys
import os
import uuid
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient

# Ensure project root and backend dir are in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
backend_dir = os.path.join(project_root, "backend")

for p in [project_root, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.main import app
from backend.core.ocr_matcher import compute_drug_similarity, fuzzy_match_prescription
from backend.services.drug_info_service import get_drug_info, clean_text_snippet, FALLBACK_MESSAGE

client = TestClient(app)


class TestScanMedicineOCRAndFuzzyMatch(unittest.TestCase):
    def setUp(self):
        self.patient_id = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
        self.sample_prescriptions = [
            {
                "id": "rx-amox-001",
                "patient_id": self.patient_id,
                "drug_name": "Amoxicillin",
                "dosage": "500mg",
                "frequency": "Three times daily",
                "meal_timing": "After Food",
                "prescriber": "Dr. Olivia Wilson",
                "icon_type": "capsule"
            },
            {
                "id": "rx-pcm-002",
                "patient_id": self.patient_id,
                "drug_name": "Paracetamol",
                "dosage": "650mg",
                "frequency": "As needed for fever",
                "meal_timing": "After Food",
                "prescriber": "Dr. Marilyn Stanton",
                "icon_type": "pill"
            },
            {
                "id": "rx-met-003",
                "patient_id": self.patient_id,
                "drug_name": "Metformin",
                "dosage": "500mg",
                "frequency": "Twice daily",
                "meal_timing": "With Food",
                "prescriber": "Dr. Johan Janson",
                "icon_type": "pill"
            }
        ]

    # -------------------------------------------------------------------------
    # SCENARIO 1: Clear, correctly-spelled drug name match
    # -------------------------------------------------------------------------
    def test_clear_correctly_spelled_match(self):
        ocr_text = "Amoxicillin 500mg capsules PO TID"
        result = fuzzy_match_prescription(ocr_text, self.sample_prescriptions)

        self.assertEqual(result["status"], "SUCCESS")
        self.assertEqual(result["match_type"], "HIGH_CONFIDENCE")
        self.assertGreaterEqual(result["confidence"], 0.75)
        self.assertIsNotNone(result["match"])
        self.assertEqual(result["match"]["drugName"], "Amoxicillin")
        self.assertEqual(result["match"]["dosage"], "500mg")
        self.assertEqual(result["match"]["mealTiming"], "After Food")

    # -------------------------------------------------------------------------
    # SCENARIO 2: Slightly misspelled / OCR-garbled text fuzzy match
    # -------------------------------------------------------------------------
    def test_misspelled_ocr_fuzzy_match(self):
        # "Paracetmol" missing the second 'a'
        ocr_text = "Paracetmol 650mg Tablets"
        result = fuzzy_match_prescription(ocr_text, self.sample_prescriptions)

        # Must either be HIGH_CONFIDENCE or top AMBIGUOUS candidate
        self.assertIn(result["match_type"], ["HIGH_CONFIDENCE", "AMBIGUOUS"])
        top_drug = (result["match"]["drugName"] if result["match"] else result["matches"][0]["drugName"])
        self.assertEqual(top_drug, "Paracetamol")
        self.assertGreaterEqual(result["confidence"], 0.70)

        # Another garbled variant: "Metformn"
        ocr_text_2 = "Rx: Metformn 500 mg oral tablet"
        result_2 = fuzzy_match_prescription(ocr_text_2, self.sample_prescriptions)
        top_drug_2 = (result_2["match"]["drugName"] if result_2["match"] else result_2["matches"][0]["drugName"])
        self.assertEqual(top_drug_2, "Metformin")

    # -------------------------------------------------------------------------
    # SCENARIO 3: Unprescribed drug safety isolation (NO FALSE POSITIVES)
    # -------------------------------------------------------------------------
    def test_unprescribed_drug_returns_no_match(self):
        ocr_text = "Sildenafil Citrate 100mg Tablets"
        result = fuzzy_match_prescription(ocr_text, self.sample_prescriptions)

        self.assertEqual(result["status"], "NO_MATCH")
        self.assertEqual(result["match_type"], "NO_MATCH")
        self.assertIsNone(result["match"])
        self.assertEqual(len(result["matches"]), 0)
        self.assertIn("Do NOT take this medication", result["message"])

    # -------------------------------------------------------------------------
    # SCENARIO 4: Empty / unreadable OCR image handling
    # -------------------------------------------------------------------------
    def test_empty_or_unreadable_ocr_text(self):
        # Empty string
        result_empty = fuzzy_match_prescription("", self.sample_prescriptions)
        self.assertEqual(result_empty["status"], "UNREADABLE")
        self.assertEqual(result_empty["match_type"], "NO_MATCH")
        self.assertIsNone(result_empty["match"])

        # Whitespace-only string
        result_whitespace = fuzzy_match_prescription("   \n\t  ", self.sample_prescriptions)
        self.assertEqual(result_whitespace["status"], "UNREADABLE")
        self.assertEqual(result_whitespace["match_type"], "NO_MATCH")

    # -------------------------------------------------------------------------
    # SCENARIO 5: Full HTTP Endpoint Test with Patient Isolation
    # -------------------------------------------------------------------------
    def test_api_scan_match_endpoint_and_patient_isolation(self):
        # 1. Register a new isolated patient with NO prescriptions
        unique_suffix = uuid.uuid4().hex[:8]
        reg_res = client.post(
            "/api/auth/register",
            json={
                "email": f"patient_{unique_suffix}@example.com",
                "password": "Password123!",
                "fullName": f"Isolated Patient {unique_suffix}"
            }
        )
        self.assertEqual(reg_res.status_code, 200)
        new_patient = reg_res.json()["user"]
        token = reg_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Scanning Amoxicillin for this new patient MUST return NO_MATCH (Strict Isolation)
        scan_res = client.post(
            "/api/prescriptions/scan-match",
            json={
                "ocrText": "Amoxicillin 500mg capsules",
                "patientId": new_patient["id"]
            },
            headers=headers
        )
        self.assertEqual(scan_res.status_code, 200)
        data = scan_res.json()
        self.assertEqual(data["status"], "NO_MATCH")
        self.assertEqual(data["matchType"], "NO_MATCH")
        self.assertIsNone(data["match"])

        # 3. Scanning for Sarah Jenkins (who HAS Amoxicillin) MUST return HIGH_CONFIDENCE
        sarah_res = client.post(
            "/api/prescriptions/scan-match",
            json={
                "ocrText": "Amoxicillin 500mg capsules",
                "patientId": self.patient_id
            }
        )
        self.assertEqual(sarah_res.status_code, 200)
        sarah_data = sarah_res.json()
        self.assertEqual(sarah_data["status"], "SUCCESS")
        self.assertEqual(sarah_data["matchType"], "HIGH_CONFIDENCE")
        self.assertIsNotNone(sarah_data["match"])
        self.assertEqual(sarah_data["match"]["drugName"], "Amoxicillin")
        self.assertEqual(sarah_data["match"]["mealTiming"], "After Food")

    # -------------------------------------------------------------------------
    # SCENARIO 6: OpenFDA Public API Drug Background Lookup
    # -------------------------------------------------------------------------
    def test_openfda_generic_drug_lookup(self):
        info = get_drug_info("Amoxicillin")
        self.assertTrue(info["found"])
        self.assertEqual(info["source"], "OpenFDA")
        self.assertIn("amoxicillin", info["summary"].lower() + info["purpose"].lower() + info["indications_and_usage"].lower())
        print("\n[OpenFDA Real Response Test 1 - Amoxicillin]:", info["summary"][:160])

        info_pcm = get_drug_info("Paracetamol")
        self.assertTrue(info_pcm["found"])
        self.assertIn("pain", info_pcm["purpose"].lower() + info_pcm["summary"].lower() + info_pcm["indications_and_usage"].lower())
        print("[OpenFDA Real Response Test 2 - Paracetamol]:", info_pcm["summary"][:160])

    # -------------------------------------------------------------------------
    # SCENARIO 7: OpenFDA Unlisted / Local Brand Fallback
    # -------------------------------------------------------------------------
    def test_openfda_unlisted_drug_fallback(self):
        info = get_drug_info("TotallyUnknownLocalBrand99999")
        self.assertFalse(info["found"])
        self.assertEqual(info["summary"], FALLBACK_MESSAGE)
        self.assertEqual(info["source"], "Fallback")

    # -------------------------------------------------------------------------
    # SCENARIO 8: OpenFDA Failure / Timeout Resiliency
    # -------------------------------------------------------------------------
    def test_openfda_timeout_does_not_break_core_matching(self):
        with patch("services.drug_info_service.httpx.Client.get", side_effect=Exception("Connection timed out")):
            # Core scan-match must still succeed with high confidence
            sarah_res = client.post(
                "/api/prescriptions/scan-match",
                json={
                    "ocrText": "Amoxicillin 500mg capsules",
                    "patientId": self.patient_id
                }
            )
            self.assertEqual(sarah_res.status_code, 200)
            data = sarah_res.json()
            self.assertEqual(data["status"], "SUCCESS")
            self.assertEqual(data["match"]["drugName"], "Amoxicillin")
            self.assertEqual(data["match"]["mealTiming"], "After Food")


if __name__ == "__main__":
    unittest.main()
