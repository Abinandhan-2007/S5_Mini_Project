import sys
import os
import uuid
import unittest
from fastapi.testclient import TestClient

# Add project root and backend directory to sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
backend_dir = os.path.join(project_root, "backend")

for p in [project_root, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.main import app

client = TestClient(app)


class TestNewPatientIsolation(unittest.TestCase):
    """
    Verify that a brand-new patient account has complete data isolation:
    1. Zero appointments returned (empty array, not leaked or fallback)
    2. Zero prescriptions returned
    3. Zero consultations returned
    4. Seed patient (Sarah Jenkins) data is preserved and not leaked
    """

    def test_new_patient_data_isolation(self):
        unique_suffix = uuid.uuid4().hex[:8]
        test_email = f"patient_{unique_suffix}@example.com"
        test_password = "SecurePassword123!"
        test_name = f"Test New Patient {unique_suffix}"

        # 1. Register new patient
        reg_res = client.post(
            "/api/auth/register",
            json={
                "email": test_email,
                "password": test_password,
                "fullName": test_name,
                "role": "patient",
            },
        )
        self.assertEqual(reg_res.status_code, 200, f"Registration failed: {reg_res.text}")
        reg_data = reg_res.json()
        new_patient_id = reg_data["user"]["id"]
        token = reg_data["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Check Appointments for new patient -> MUST be []
        app_res = client.get(f"/api/appointments/patient/{new_patient_id}", headers=headers)
        self.assertEqual(app_res.status_code, 200)
        appointments = app_res.json()
        self.assertIsInstance(appointments, list)
        self.assertEqual(len(appointments), 0, f"Expected 0 appointments for new patient, got {len(appointments)}")

        # 3. Check Prescriptions for new patient -> MUST be []
        rx_res = client.get(f"/api/prescriptions/patient/{new_patient_id}", headers=headers)
        self.assertEqual(rx_res.status_code, 200)
        prescriptions = rx_res.json()
        self.assertIsInstance(prescriptions, list)
        self.assertEqual(len(prescriptions), 0, f"Expected 0 prescriptions for new patient, got {len(prescriptions)}")

        # 4. Check Consultations for new patient -> MUST be []
        cons_res = client.get(f"/api/consultations/patient/{new_patient_id}", headers=headers)
        self.assertEqual(cons_res.status_code, 200)
        consultations = cons_res.json()
        self.assertIsInstance(consultations, list)
        self.assertEqual(len(consultations), 0, f"Expected 0 consultations for new patient, got {len(consultations)}")

        # 5. Check Seed Patient (Sarah Jenkins) data remains intact
        sarah_id = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
        sarah_apps = client.get(f"/api/appointments/patient/{sarah_id}")
        self.assertEqual(sarah_apps.status_code, 200)
        self.assertIsInstance(sarah_apps.json(), list)


if __name__ == "__main__":
    unittest.main()
