"""
Automated Test Suite for Age-Based Dosage Limits & Safe Daily Ceilings.

Verifies:
1. Retrieval of curated age-cohort dosage limits for core medications (Paracetamol, Amoxicillin, Ibuprofen).
2. Dynamic clinical fallback generator for unindexed medications.
3. Multi-language localization (English, Tamil, Malayalam, Hindi).
4. API response integration across /api/prescriptions/drug-info, /api/medicine/lookup-info, and /api/medicine/translate-info.
"""

import sys
import os
import unittest
from fastapi.testclient import TestClient

# Ensure backend and project root are in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
backend_dir = os.path.join(project_root, "backend")
for p in [project_root, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.main import app
from backend.services.drug_info_service import get_age_dosage_limits, get_drug_info, AGE_GROUP_LABELS

client = TestClient(app)


class TestAgeDosageLimits(unittest.TestCase):

    def test_paracetamol_age_dosage_limits(self):
        """Paracetamol/Acetaminophen must have 4,000mg general ceiling and 5 age cohorts."""
        guide = get_age_dosage_limits("Paracetamol")
        self.assertIsNotNone(guide)
        self.assertIn("4,000 mg", guide["maxDailyDoseGeneral"])
        self.assertEqual(len(guide["limits"]), 5)

        cohort_names = [l["ageGroup"] for l in guide["limits"]]
        self.assertTrue(any("Infants" in name for name in cohort_names))
        self.assertTrue(any("Children" in name for name in cohort_names))
        self.assertTrue(any("Adults" in name for name in cohort_names))
        self.assertTrue(any("Geriatric" in name for name in cohort_names))

        # Adults limit must specify 4,000 mg
        adult_limit = next(l for l in guide["limits"] if "Adults" in l["ageGroup"])
        self.assertIn("4,000 mg", adult_limit["maxDailyLimit"])

    def test_amoxicillin_age_dosage_limits(self):
        """Amoxicillin must have antibiotic duration note and appropriate age ranges."""
        guide = get_age_dosage_limits("Amoxicillin")
        self.assertIsNotNone(guide)
        self.assertIn("2,000", guide["maxDailyDoseGeneral"])
        self.assertEqual(len(guide["limits"]), 5)

    def test_ibuprofen_pediatric_caution(self):
        """Ibuprofen must flag contraindication or caution in young infants."""
        guide = get_age_dosage_limits("Ibuprofen")
        self.assertIsNotNone(guide)
        infant_limit = next(l for l in guide["limits"] if "Infants" in l["ageGroup"])
        self.assertIn(infant_limit["status"], ["not_recommended", "caution"])

    def test_unindexed_medicine_fallback(self):
        """Unknown brand name should fall back to structured dynamic age cohort ceilings."""
        guide = get_age_dosage_limits("CustomHerbalEx99 500mg")
        self.assertIsNotNone(guide)
        self.assertEqual(len(guide["limits"]), 5)
        self.assertIsNotNone(guide["maxDailyDoseGeneral"])
        self.assertIn("doctor", guide["clinicalSafetyWarning"].lower())

    def test_multilingual_age_group_labels(self):
        """Age group headers and notes should localize into Tamil, Malayalam, and Hindi."""
        guide_ta = get_age_dosage_limits("Paracetamol", lang="ta")
        self.assertTrue(any("பெரியவர்கள்" in l["ageGroup"] for l in guide_ta["limits"]))

        guide_ml = get_age_dosage_limits("Paracetamol", lang="ml")
        self.assertTrue(any("മുതിർന്നവർ" in l["ageGroup"] for l in guide_ml["limits"]))

        guide_hi = get_age_dosage_limits("Paracetamol", lang="hi")
        self.assertTrue(any("वयस्क" in l["ageGroup"] for l in guide_hi["limits"]))

    def test_api_drug_info_endpoint_includes_age_limits(self):
        """GET /api/prescriptions/drug-info returns ageDosageLimits."""
        res = client.get("/api/prescriptions/drug-info", params={"drug_name": "Amoxicillin"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("ageDosageLimits", data)
        if data.get("ageDosageLimits"):
            self.assertGreaterEqual(len(data["ageDosageLimits"]["limits"]), 5)

    def test_api_lookup_endpoint_includes_age_limits(self):
        """POST /api/medicine/lookup-info returns ageDosageLimits."""
        res = client.post("/api/medicine/lookup-info", json={"drugName": "Paracetamol"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "FOUND")
        self.assertIn("ageDosageLimits", data)
        self.assertIsNotNone(data["ageDosageLimits"])
        self.assertEqual(len(data["ageDosageLimits"]["limits"]), 5)

    def test_api_translate_endpoint_preserves_age_limits(self):
        """POST /api/medicine/translate-info translates and preserves ageDosageLimits."""
        res = client.post(
            "/api/medicine/translate-info",
            json={
                "targetLang": "ta",
                "drugName": "Paracetamol",
                "purpose": "Pain reliever",
                "ageDosageLimits": {
                    "maxDailyDoseGeneral": "4,000 mg / 24 hrs",
                    "unit": "mg",
                    "limits": [
                        {
                            "ageGroup": "Adults (18–64 yrs)",
                            "standardDose": "500–1,000 mg per dose",
                            "maxDailyLimit": "4,000 mg / 24 hrs",
                            "frequency": "Every 4–6 hrs",
                            "notes": "Never exceed 4,000 mg daily.",
                            "status": "safe"
                        }
                    ],
                    "clinicalSafetyWarning": "Strict daily ceiling."
                }
            }
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("ageDosageLimits", data)
        self.assertIsNotNone(data["ageDosageLimits"])
        # Age group must be localized to Tamil
        ag = data["ageDosageLimits"]["limits"][0]["ageGroup"]
        self.assertIn("பெரியவர்கள்", ag)


if __name__ == "__main__":
    unittest.main()
