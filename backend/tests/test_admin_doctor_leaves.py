# backend/tests/test_admin_doctor_leaves.py
import sys
from pathlib import Path
from datetime import datetime, timedelta

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import unittest
from fastapi.testclient import TestClient
from main import app
from core.security import create_jwt
import database

class TestAdminDoctorLeaves(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        database.init_db()
        cls.client = TestClient(app)

        cls.hosp_a = "hosp-alpha"
        cls.hosp_b = "hosp-beta"

        cls.doc_a_id = "doc-adm-001"
        cls.doc_b_id = "doc-adm-002"

        # Doctor A Token (Hospital Alpha)
        cls.doctor_a_token = create_jwt({
            "type": "staff",
            "role": "doctor",
            "doctor_id": cls.doc_a_id,
            "staff_id": cls.doc_a_id,
            "name": "Dr. Alpha Medic",
            "email": "dr.alpha.medic@carepulse.com",
            "hospital_id": cls.hosp_a
        })

        # Admin A Token (Hospital Alpha)
        cls.admin_a_token = create_jwt({
            "type": "staff",
            "role": "admin",
            "staff_id": "adm-alpha-01",
            "name": "Admin Alpha Hospital",
            "email": "admin.alpha@carepulse.com",
            "hospital_id": cls.hosp_a
        })

        # Admin B Token (Hospital Beta)
        cls.admin_b_token = create_jwt({
            "type": "staff",
            "role": "admin",
            "staff_id": "adm-beta-01",
            "name": "Admin Beta Hospital",
            "email": "admin.beta@carepulse.com",
            "hospital_id": cls.hosp_b
        })

        # Receptionist A Token (Hospital Alpha)
        cls.receptionist_a_token = create_jwt({
            "type": "staff",
            "role": "receptionist",
            "staff_id": "rec-alpha-99",
            "name": "Receptionist Alpha Desk",
            "email": "rec.alpha99@carepulse.com",
            "hospital_id": cls.hosp_a
        })

        # Seed doctors
        cls._ensure_doctor(cls.doc_a_id, "Dr. Alpha Medic", cls.hosp_a)
        cls._ensure_doctor(cls.doc_b_id, "Dr. Beta Medic", cls.hosp_b)

    def setUp(self):
        # Clean up leaves for test doctors before each test
        if database.use_pg:
            try:
                with database.get_pg_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("DELETE FROM doctor_leaves WHERE doctor_id IN (%s, %s)", (self.doc_a_id, self.doc_b_id))
                        conn.commit()
            except Exception:
                pass
        db = database.read_json_db()
        if "doctor_leaves" in db:
            db["doctor_leaves"] = [
                l for l in db["doctor_leaves"]
                if l.get("doctor_id") not in [self.doc_a_id, self.doc_b_id]
                and l.get("doctorId") not in [self.doc_a_id, self.doc_b_id]
            ]
            database.write_json_db(db)

    @classmethod
    def _ensure_doctor(cls, doc_id: str, name: str, hosp_id: str):
        slots = [
            {"timeSlot": "09:00 AM - 10:00 AM", "maxSeats": 5, "bookedSeats": 0, "isAvailable": True},
            {"timeSlot": "10:00 AM - 11:00 AM", "maxSeats": 5, "bookedSeats": 0, "isAvailable": True},
            {"timeSlot": "11:00 AM - 12:00 PM", "maxSeats": 5, "bookedSeats": 0, "isAvailable": True},
        ]
        if database.use_pg:
            try:
                with database.get_pg_connection() as conn:
                    with conn.cursor() as cur:
                        import json
                        cur.execute("""
                            INSERT INTO doctors (id, name, hospital_id, specialty, department, is_available, slot_capacities)
                            VALUES (%s, %s, %s, 'General Medicine', 'General Medicine', TRUE, %s)
                            ON CONFLICT (id) DO UPDATE SET
                                is_available = TRUE,
                                hospital_id = EXCLUDED.hospital_id,
                                slot_capacities = EXCLUDED.slot_capacities;
                        """, (doc_id, name, hosp_id, json.dumps(slots)))
                        conn.commit()
            except Exception as e:
                print(f"PG ensure doctor error: {e}")

        db = database.read_json_db()
        existing = next((d for d in db.get("doctors", []) if d.get("id") == doc_id), None)
        if not existing:
            db.setdefault("doctors", []).append({
                "id": doc_id,
                "name": name,
                "hospital_id": hosp_id,
                "hospitalId": hosp_id,
                "specialty": "General Medicine",
                "is_available": True,
                "isAvailable": True,
                "slot_capacities": slots,
                "slotCapacities": slots,
            })
        else:
            existing["slot_capacities"] = slots
            existing["slotCapacities"] = slots
            existing["is_available"] = True
            existing["hospital_id"] = hosp_id
        database.write_json_db(db)

    def test_01_receptionist_forbidden_from_approving_leave(self):
        """
        Scenario 1: Receptionist attempts to approve/reject a doctor leave request.
        Must be strictly rejected with HTTP 403 Forbidden.
        """
        leave_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")

        # Doctor A applies for leave
        apply_res = self.client.post(
            "/api/doctor/leave",
            headers={"Authorization": f"Bearer {self.doctor_a_token}"},
            json={"startDate": leave_date, "endDate": leave_date, "reason": "Academic Leave"}
        )
        self.assertEqual(apply_res.status_code, 200)
        leave_id = apply_res.json()["leave"]["id"]

        # Receptionist A attempts to approve leave: MUST FAIL WITH 403
        rec_patch_res = self.client.patch(
            f"/api/receptionist/leaves/{leave_id}/status",
            headers={"Authorization": f"Bearer {self.receptionist_a_token}"},
            json={"status": "Approved"}
        )
        self.assertEqual(rec_patch_res.status_code, 403, "Receptionist must NOT be permitted to approve leaves")
        self.assertIn("strictly reserved for Hospital Administrators", rec_patch_res.json().get("detail", ""))

    def test_02_admin_approve_doctor_leave_and_freeze_slots(self):
        """
        Scenario 2: Hospital Admin approves doctor leave via /api/admin/doctor-leaves.
        Status becomes 'Approved' and doctor slots for that date range are dynamically frozen.
        """
        leave_date = (datetime.now() + timedelta(days=8)).strftime("%Y-%m-%d")

        # 1. Doctor applies for leave
        apply_res = self.client.post(
            "/api/doctor/leave",
            headers={"Authorization": f"Bearer {self.doctor_a_token}"},
            json={"startDate": leave_date, "endDate": leave_date, "reason": "Annual Medical Camp"}
        )
        self.assertEqual(apply_res.status_code, 200)
        leave_id = apply_res.json()["leave"]["id"]

        # 2. Admin Alpha lists leaves: must find leave_id
        list_res = self.client.get(
            "/api/admin/doctor-leaves",
            headers={"Authorization": f"Bearer {self.admin_a_token}"}
        )
        self.assertEqual(list_res.status_code, 200)
        leaves = list_res.json().get("leaves", [])
        self.assertTrue(any(l["id"] == leave_id for l in leaves), "Admin should see doctor leave request in their hospital")

        # 3. Verify slots before approval - NOT frozen
        slots_before = self.client.get(f"/api/doctors/{self.doc_a_id}/slots?date={leave_date}").json()
        self.assertFalse(slots_before.get("onLeave"))
        for s in slots_before.get("slots", []):
            self.assertFalse(s["isFrozen"])

        # 4. Admin Alpha approves the leave
        approve_res = self.client.patch(
            f"/api/admin/doctor-leaves/{leave_id}/status",
            headers={"Authorization": f"Bearer {self.admin_a_token}"},
            json={"status": "Approved"}
        )
        self.assertEqual(approve_res.status_code, 200)
        self.assertEqual(approve_res.json()["leave"]["status"], "Approved")

        # 5. Verify slots after approval - MUST BE FROZEN
        slots_after = self.client.get(f"/api/doctors/{self.doc_a_id}/slots?date={leave_date}").json()
        self.assertTrue(slots_after.get("onLeave"), "Approved leave must set doctor onLeave: True")
        for s in slots_after.get("slots", []):
            self.assertTrue(s["isFrozen"], f"Slot {s['timeSlot']} must be frozen after Admin approval")
            self.assertFalse(s["isAvailable"])

    def test_03_cross_hospital_admin_isolation(self):
        """
        Scenario 3: Multi-tenant hospital isolation:
        Admin at Hospital B cannot view or approve leave applications for Doctor at Hospital A.
        """
        leave_date = (datetime.now() + timedelta(days=9)).strftime("%Y-%m-%d")

        # Doctor A (Hospital Alpha) applies for leave
        apply_res = self.client.post(
            "/api/doctor/leave",
            headers={"Authorization": f"Bearer {self.doctor_a_token}"},
            json={"startDate": leave_date, "endDate": leave_date, "reason": "Hospital Alpha Internal"}
        )
        leave_id = apply_res.json()["leave"]["id"]

        # Admin B (Hospital Beta) lists leaves: must NOT contain Doctor A's leave
        list_b_res = self.client.get(
            "/api/admin/doctor-leaves",
            headers={"Authorization": f"Bearer {self.admin_b_token}"}
        )
        self.assertEqual(list_b_res.status_code, 200)
        leaves_b = list_b_res.json().get("leaves", [])
        self.assertFalse(any(l["id"] == leave_id for l in leaves_b), "Admin B must not see leaves from Hospital Alpha")

        # Admin B attempts to approve Doctor A's leave: MUST BE FORBIDDEN (403)
        patch_b_res = self.client.patch(
            f"/api/admin/doctor-leaves/{leave_id}/status",
            headers={"Authorization": f"Bearer {self.admin_b_token}"},
            json={"status": "Approved"}
        )
        self.assertEqual(patch_b_res.status_code, 403, "Cross-hospital admin approval must return 403 Forbidden")

    def test_04_admin_reject_or_revoke_leave_unfreezes_slots(self):
        """
        Scenario 4: If an approved leave is revoked by Admin (status set to Cancelled or Rejected),
        slots unfreeze immediately.
        """
        leave_date = (datetime.now() + timedelta(days=12)).strftime("%Y-%m-%d")

        # 1. Doctor applies for leave
        apply_res = self.client.post(
            "/api/doctor/leave",
            headers={"Authorization": f"Bearer {self.doctor_a_token}"},
            json={"startDate": leave_date, "endDate": leave_date, "reason": "Personal Leave"}
        )
        leave_id = apply_res.json()["leave"]["id"]

        # 2. Admin approves leave
        self.client.patch(
            f"/api/admin/doctor-leaves/{leave_id}/status",
            headers={"Authorization": f"Bearer {self.admin_a_token}"},
            json={"status": "Approved"}
        )
        slots_approved = self.client.get(f"/api/doctors/{self.doc_a_id}/slots?date={leave_date}").json()
        self.assertTrue(slots_approved.get("onLeave"))

        # 3. Admin revokes leave (status: Cancelled)
        revoke_res = self.client.patch(
            f"/api/admin/doctor-leaves/{leave_id}/status",
            headers={"Authorization": f"Bearer {self.admin_a_token}"},
            json={"status": "Cancelled"}
        )
        self.assertEqual(revoke_res.status_code, 200)

        # 4. Slots must be unfrozen
        slots_revoked = self.client.get(f"/api/doctors/{self.doc_a_id}/slots?date={leave_date}").json()
        self.assertFalse(slots_revoked.get("onLeave"), "Revoked leave must NOT mark doctor onLeave")
        for s in slots_revoked.get("slots", []):
            self.assertFalse(s["isFrozen"], "Slots should be unfrozen when leave is cancelled/revoked")

if __name__ == "__main__":
    unittest.main()
