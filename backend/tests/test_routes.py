"""
CarePulse Core API Route Integration Tests.
Covers authentication, superadmin operations, hospitals, patient telemetry, and AI clinical safety endpoints.
"""

import sys
import unittest
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app


class TestCoreAPIRoutes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        # Authenticate SuperAdmin
        login_res = cls.client.post(
            "/api/superadmin/login",
            json={"username": "superadmin", "password": "SuperAdmin@123"}
        )
        assert login_res.status_code == 200, f"SuperAdmin login failed: {login_res.text}"
        cls.sa_token = login_res.json()["token"]
        cls.sa_headers = {"Authorization": f"Bearer {cls.sa_token}"}

    def test_01_health_check(self):
        """GET /api/health should return 200 OK and status healthy."""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("status") in ["healthy", "ok", "online", True] or data.get("success") is True)

    def test_02_superadmin_stats(self):
        """GET /api/superadmin/stats should return platform statistics."""
        res = self.client.get("/api/superadmin/stats", headers=self.sa_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertIn("stats", data)
        self.assertIn("total_hospitals", data["stats"])

    def test_03_superadmin_devices(self):
        """GET /api/superadmin/devices should return telemetry sessions."""
        res = self.client.get("/api/superadmin/devices", headers=self.sa_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertIn("devices", data)
        self.assertIn("stats", data)
        self.assertIn("latest_version", data["stats"])

    def test_04_patient_device_info_logging(self):
        """POST /api/patient/device-info should log device telemetry."""
        payload = {
            "patient_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            "device_id": "test_route_device_uuid_001",
            "device_model": "Google Pixel 8 Pro",
            "manufacturer": "Google",
            "platform": "android",
            "os_version": "Android 15",
            "app_version": "1.9.29",
            "fcm_token": ""
        }
        res = self.client.post("/api/patient/device-info", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))

    def test_05_ai_triage_emergency(self):
        """POST /api/ai/triage with emergency red flag should return emergency tier."""
        payload = {"symptoms": "Severe crushing chest pain radiating to left arm and cannot breathe"}
        res = self.client.post("/api/ai/triage", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("is_emergency") or data.get("risk_level") in ["critical", "high", "emergency"])

    def test_06_ai_drug_guard_contraindication(self):
        """POST /api/ai/drug-guard should catch severe drug interactions."""
        payload = {
            "proposed_medications": ["Ibuprofen 400mg"],
            "active_medications": ["Lisinopril 10mg"],
            "allergies": ["Penicillin"]
        }
        res = self.client.post("/api/ai/drug-guard", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn(data.get("overall_risk_level"), ["CRITICAL_CONTRAINDICATION", "HIGH_RISK", "MAJOR_INTERACTION"])
        self.assertGreaterEqual(data.get("total_alerts", 0), 1)

    def test_07_ai_rag_guidelines(self):
        """POST /api/ai/rag-search should retrieve clinical protocol chunks."""
        payload = {"query": "hypertension management guidelines", "top_k": 3}
        res = self.client.post("/api/ai/rag-search", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("results", data)

    def test_08_app_version(self):
        """GET /api/app/version should return target release metadata."""
        res = self.client.get("/api/app/version")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("version", data)
        self.assertIn("download_url", data)


if __name__ == "__main__":
    unittest.main()
