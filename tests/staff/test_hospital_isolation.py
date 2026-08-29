import sys
import os
import unittest
import json
import logging
from fastapi.testclient import TestClient

# Add project root and backend directory to sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
backend_dir = os.path.join(project_root, "backend")

for p in [project_root, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.main import app
from backend.database import init_db, get_pg_connection, read_json_db
from backend.core.security import create_jwt, verify_jwt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("carepulse.test")

client = TestClient(app)


class TestHospitalScopingAndIsolation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        logger.info("Test suite initialized with database connection.")

    def test_01_jwt_compatibility(self):
        """Test that expanding JWT claims with hospital_id and doctor_id does not break token routines."""
        payload = {
            "sub": "test-staff-1",
            "staff_id": "test-staff-1",
            "role": "receptionist",
            "email": "test.rec@carepulse.com",
            "hospital_id": "hosp-1",
            "hospitalId": "hosp-1",
            "doctor_id": None,
            "type": "staff"
        }
        token = create_jwt(payload)
        self.assertIsNotNone(token)
        
        decoded = verify_jwt(token)
        self.assertIsNotNone(decoded)
        self.assertEqual(decoded["staff_id"], "test-staff-1")
        self.assertEqual(decoded["hospital_id"], "hosp-1")
        self.assertEqual(decoded["type"], "staff")

    def test_02_patient_unrestricted_booking_and_retrieval(self):
        """Test that patient booking remains completely unrestricted across hospitals and hospital_id is saved."""
        patient_id = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
        
        # Book doctor 1 at hosp-1
        res1 = client.post("/api/appointments", json={
            "patientId": patient_id,
            "patientName": "Sarah Jenkins",
            "doctorId": "doc-1",
            "doctorName": "Dr. Olivia Wilson",
            "date": "2026-09-01",
            "timeSlot": "10:00 AM - 11:00 AM",
            "type": "In-Person"
        })
        self.assertEqual(res1.status_code, 201)
        data1 = res1.json()
        self.assertEqual(data1["hospitalId"], "hosp-1")
        self.assertEqual(data1["hospital_id"], "hosp-1")
        
        # Book doctor 4 at hosp-2
        res2 = client.post("/api/appointments", json={
            "patientId": patient_id,
            "patientName": "Sarah Jenkins",
            "doctorId": "doc-4",
            "doctorName": "Dr. Ethan Reynolds",
            "date": "2026-09-02",
            "timeSlot": "02:00 PM - 03:00 PM",
            "type": "In-Person"
        })
        self.assertEqual(res2.status_code, 201)
        data2 = res2.json()
        self.assertEqual(data2["hospitalId"], "hosp-2")
        self.assertEqual(data2["hospital_id"], "hosp-2")

        # Patient queries their appointments: must receive appointments from BOTH hospitals
        res_patient = client.get(f"/api/appointments/patient/{patient_id}")
        self.assertEqual(res_patient.status_code, 200)
        p_apps = res_patient.json()
        hosp_ids = {a.get("hospitalId") or a.get("hospital_id") for a in p_apps}
        self.assertIn("hosp-1", hosp_ids)
        self.assertIn("hosp-2", hosp_ids)

    def test_03_receptionist_query_isolation(self):
        """Test that receptionist at hosp-1 only sees hosp-1 doctors and queue tokens."""
        # Staff login for receptionist at hosp-1
        login_res = client.post("/api/staff/login", json={
            "email": "receptionist@carepulse.com",
            "password": "password123"
        })
        self.assertEqual(login_res.status_code, 200)
        token_hosp1 = login_res.json()["token"]
        headers_hosp1 = {"Authorization": f"Bearer {token_hosp1}"}

        # Query doctors as receptionist at hosp-1
        doc_res = client.get("/api/receptionist/doctors", headers=headers_hosp1)
        self.assertEqual(doc_res.status_code, 200)
        doctors = doc_res.json()["doctors"]
        self.assertTrue(len(doctors) > 0)
        for doc in doctors:
            self.assertEqual(doc.get("hospital_id"), "hosp-1")

        # Query queue tokens as receptionist at hosp-1
        tok_res = client.get("/api/receptionist/tokens", headers=headers_hosp1)
        self.assertEqual(tok_res.status_code, 200)
        tokens = tok_res.json()["tokens"]
        for tok in tokens:
            self.assertEqual(tok.get("hospital_id"), "hosp-1")

    def test_04_doctor_authoritative_hospital_resolution(self):
        """Test Additional Requirement 1: Doctor hospital scoping derives authoritatively from doctors table."""
        # Login doctor Olivia Wilson (linked to doc-1 at hosp-1)
        login_res = client.post("/api/staff/login", json={
            "email": "olivia.w@carepulse.com",
            "password": "doctor123"
        })
        self.assertEqual(login_res.status_code, 200)
        data = login_res.json()
        self.assertEqual(data["staff"]["hospital_id"], "hosp-1")
        self.assertEqual(data["staff"]["doctor_id"], "doc-1")
        
        token_doc = data["token"]
        headers_doc = {"Authorization": f"Bearer {token_doc}"}

        # Doctor appointments endpoint
        res = client.get("/api/doctor/appointments", headers=headers_doc)
        self.assertEqual(res.status_code, 200)
        apps = res.json()
        for a in apps:
            self.assertEqual(a.get("hospital_id"), "hosp-1")
            self.assertEqual(a.get("doctorId"), "doc-1")

    def test_05_fail_safe_integrity_on_null_hospital(self):
        """Test Additional Requirement 2: Staff with hospital_id=NULL fails safely returning empty lists."""
        # Create a synthetic token for receptionist with hospital_id = None
        null_hosp_token = create_jwt({
            "sub": "orphan-rec-99",
            "staff_id": "orphan-rec-99",
            "role": "receptionist",
            "email": "orphan@carepulse.com",
            "hospital_id": None,
            "hospitalId": None,
            "doctor_id": None,
            "type": "staff"
        })
        headers = {"Authorization": f"Bearer {null_hosp_token}"}

        # 1. Receptionist doctors query
        res1 = client.get("/api/receptionist/doctors", headers=headers)
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.json()["doctors"], [])

        # 2. Receptionist token queue query
        res2 = client.get("/api/receptionist/tokens", headers=headers)
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["tokens"], [])

        # 3. Doctor with hospital_id=NULL
        null_doc_token = create_jwt({
            "sub": "orphan-doc-99",
            "staff_id": "orphan-doc-99",
            "role": "doctor",
            "email": "orphan.doc@carepulse.com",
            "hospital_id": None,
            "hospitalId": None,
            "doctor_id": None,
            "type": "staff"
        })
        doc_headers = {"Authorization": f"Bearer {null_doc_token}"}
        res3 = client.get("/api/doctor/appointments", headers=doc_headers)
        self.assertEqual(res3.status_code, 200)
        self.assertEqual(res3.json(), [])

    def test_06_server_side_write_derivation_tamper_protection(self):
        """Test Additional Requirement 3: Client cannot tamper hospital_id on walk-ins and consultations."""
        # Login receptionist at hosp-1
        login_res = client.post("/api/staff/login", json={
            "email": "receptionist@carepulse.com",
            "password": "password123"
        })
        token_hosp1 = login_res.json()["token"]
        headers_hosp1 = {"Authorization": f"Bearer {token_hosp1}"}

        # Receptionist attempts to create a walk-in claiming it belongs to hosp-2
        walkin_res = client.post("/api/receptionist/appointments", json={
            "patientName": "Tamper Test Patient",
            "patientPhone": "+91 91111 22222",
            "doctorId": "doc-1",
            "doctorName": "Dr. Olivia Wilson",
            "hospital_id": "hosp-2", # TAMPER ATTEMPT
            "hospitalId": "hosp-2",  # TAMPER ATTEMPT
            "timeSlot": "09:00 AM - 10:00 AM",
            "date": "2026-09-05",
            "type": "Walk-In"
        }, headers=headers_hosp1)
        
        self.assertEqual(walkin_res.status_code, 200)
        token_data = walkin_res.json()["token"]
        # MUST BE hosp-1, NEVER hosp-2
        self.assertEqual(token_data["hospital_id"], "hosp-1")
        self.assertEqual(token_data["hospitalId"], "hosp-1")

        # Doctor creates consultation attempting to tag hosp-4
        doc_login_res = client.post("/api/staff/login", json={
            "email": "olivia.w@carepulse.com",
            "password": "doctor123"
        })
        token_doc = doc_login_res.json()["token"]
        headers_doc = {"Authorization": f"Bearer {token_doc}"}

        cons_res = client.post("/api/consultations", json={
            "patientId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            "doctorId": "doc-1",
            "doctorName": "Dr. Olivia Wilson",
            "hospital_id": "hosp-4", # TAMPER ATTEMPT
            "hospitalId": "hosp-4",  # TAMPER ATTEMPT
            "date": "2026-09-05",
            "soapData": {
                "subjective": "Follow up examination.",
                "objective": "Normal vital signs.",
                "assessment": "Healthy.",
                "plan": "Continue current routine."
            }
        }, headers=headers_doc)

        self.assertEqual(cons_res.status_code, 201)
        cons_data = cons_res.json()
        # MUST BE hosp-1 derived from doc-1
        self.assertEqual(cons_data["hospital_id"], "hosp-1")
        self.assertEqual(cons_data["hospitalId"], "hosp-1")

    def test_07_admin_visibility_global_vs_scoped(self):
        """Test admin global visibility vs scoped visibility."""
        # Global Admin login
        admin_login = client.post("/api/staff/login", json={
            "email": "admin@carepulse.com",
            "password": "admin123"
        })
        self.assertEqual(admin_login.status_code, 200)
        admin_data = admin_login.json()
        self.assertIsNone(admin_data["staff"]["hospital_id"])
        
        token_admin = admin_data["token"]
        headers_admin = {"Authorization": f"Bearer {token_admin}"}

        # Global overview
        overview_res = client.get("/api/admin/overview", headers=headers_admin)
        self.assertEqual(overview_res.status_code, 200)
        overview = overview_res.json()
        self.assertTrue(overview["totalDoctors"] >= 4)

        # Scoped overview by query param
        scoped_overview_res = client.get("/api/admin/overview?hospital_id=hosp-1", headers=headers_admin)
        self.assertEqual(scoped_overview_res.status_code, 200)
        scoped_overview = scoped_overview_res.json()
        self.assertTrue(scoped_overview["totalDoctors"] <= overview["totalDoctors"])


if __name__ == "__main__":
    unittest.main()
