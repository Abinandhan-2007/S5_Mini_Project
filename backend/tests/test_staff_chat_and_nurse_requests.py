# backend/tests/test_staff_chat_and_nurse_requests.py
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

class TestStaffChatAndNurseRequests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        database.init_db()
        cls.client = TestClient(app)

        cls.hosp_alpha = "hosp-alpha-chat"
        cls.hosp_beta = "hosp-beta-chat"

        cls.doc_id = "doc-chat-01"

        # Admin Alpha Token
        cls.admin_alpha_token = create_jwt({
            "type": "staff",
            "role": "admin",
            "staff_id": "adm-alpha-chat",
            "name": "Admin Alpha",
            "email": "admin.alpha@carepulse.com",
            "hospital_id": cls.hosp_alpha
        })

        # Admin Beta Token
        cls.admin_beta_token = create_jwt({
            "type": "staff",
            "role": "admin",
            "staff_id": "adm-beta-chat",
            "name": "Admin Beta",
            "email": "admin.beta@carepulse.com",
            "hospital_id": cls.hosp_beta
        })

        # Doctor Alpha Token
        cls.doctor_alpha_token = create_jwt({
            "type": "staff",
            "role": "doctor",
            "doctor_id": cls.doc_id,
            "staff_id": cls.doc_id,
            "name": "Dr. Alpha Chat",
            "email": "dr.alpha.chat@carepulse.com",
            "hospital_id": cls.hosp_alpha
        })

        # Receptionist Alpha Token
        cls.receptionist_alpha_token = create_jwt({
            "type": "staff",
            "role": "receptionist",
            "staff_id": "rec-alpha-chat",
            "name": "Rita Receptionist",
            "email": "rita.rec@carepulse.com",
            "hospital_id": cls.hosp_alpha
        })

        # Nurse Alpha Token
        cls.nurse_alpha_token = create_jwt({
            "type": "staff",
            "role": "nurse",
            "staff_id": "nurse-alpha-chat",
            "name": "Nancy Nurse",
            "email": "nancy.nurse@carepulse.com",
            "hospital_id": cls.hosp_alpha
        })

        cls._ensure_hospital(cls.hosp_alpha, "Alpha Hospital")
        cls._ensure_hospital(cls.hosp_beta, "Beta Hospital")
        cls._ensure_doctor(cls.doc_id, "Dr. Alpha Chat", cls.hosp_alpha)

    def setUp(self):
        if database.use_pg:
            try:
                with database.get_pg_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("DELETE FROM staff WHERE email IN ('clara.barton@carepulse.com', 'nurse.direct@carepulse.com')")
                        cur.execute("DELETE FROM nurse_requests WHERE email IN ('clara.barton@carepulse.com', 'nurse.direct@carepulse.com')")
                        conn.commit()
            except Exception:
                pass
        db = database.read_json_db()
        if "staff" in db:
            db["staff"] = [s for s in db["staff"] if s.get("email") not in ('clara.barton@carepulse.com', 'nurse.direct@carepulse.com')]
        if "nurse_requests" in db:
            db["nurse_requests"] = [r for r in db["nurse_requests"] if r.get("email") not in ('clara.barton@carepulse.com', 'nurse.direct@carepulse.com')]
        database.write_json_db(db)

    @classmethod
    def _ensure_hospital(cls, hosp_id: str, name: str):
        if database.use_pg:
            try:
                with database.get_pg_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO hospitals (id, name, address)
                            VALUES (%s, %s, '123 Medical Way')
                            ON CONFLICT (id) DO NOTHING;
                        """, (hosp_id, name))
                        conn.commit()
            except Exception:
                pass
        db = database.read_json_db()
        if not any(h.get("id") == hosp_id for h in db.get("hospitals", [])):
            db.setdefault("hospitals", []).append({"id": hosp_id, "name": name, "address": "123 Medical Way"})
            database.write_json_db(db)

    @classmethod
    def _ensure_doctor(cls, doc_id: str, name: str, hosp_id: str):
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
                "slot_capacities": [{"timeSlot": "09:00 AM - 10:00 AM", "maxSeats": 5, "bookedSeats": 0, "isAvailable": True}],
            })
            database.write_json_db(db)

    def test_01_staff_contacts_and_two_way_chat(self):
        """Staff contacts endpoint returns contacts and staff can message Admin."""
        # 1. Admin gets contacts list
        res_contacts = self.client.get(
            "/api/communication/staff-contacts",
            headers={"Authorization": f"Bearer {self.admin_alpha_token}"}
        )
        self.assertEqual(res_contacts.status_code, 200)
        contacts = res_contacts.json()["contacts"]
        self.assertTrue(len(contacts) > 0)

        # 2. Receptionist sends message to Admin in Chat
        send_res = self.client.post(
            "/api/communication/messages",
            headers={"Authorization": f"Bearer {self.receptionist_alpha_token}"},
            json={
                "subject": "Front Desk Wheelchair Requisition",
                "message": "We need 2 additional wheelchairs at Entrance B.",
                "priority": "normal"
            }
        )
        self.assertEqual(send_res.status_code, 201)
        msg_id = send_res.json()["data"]["id"]

        # 3. Admin retrieves messages and sees Receptionist inquiry
        admin_msgs = self.client.get(
            "/api/communication/messages",
            headers={"Authorization": f"Bearer {self.admin_alpha_token}"}
        )
        self.assertEqual(admin_msgs.status_code, 200)
        found = [m for m in admin_msgs.json()["messages"] if m["id"] == msg_id]
        self.assertEqual(len(found), 1)

        # 4. Admin replies in the thread
        reply_res = self.client.post(
            "/api/communication/messages",
            headers={"Authorization": f"Bearer {self.admin_alpha_token}"},
            json={
                "subject": "Re: Front Desk Wheelchair Requisition",
                "message": "Approved. Logistics will deliver them shortly.",
                "parentId": msg_id,
                "recipientRole": "receptionist"
            }
        )
        self.assertEqual(reply_res.status_code, 201)

    def test_02_admin_approve_doctor_leave_notifies_receptionist_and_nurse(self):
        """When Admin approves a Doctor leave, automated notifications are sent to Receptionist and Nurse."""
        leave_date = (datetime.now() + timedelta(days=12)).strftime("%Y-%m-%d")

        # 1. Doctor applies for leave
        apply_res = self.client.post(
            "/api/doctor/leave",
            headers={"Authorization": f"Bearer {self.doctor_alpha_token}"},
            json={"startDate": leave_date, "endDate": leave_date, "reason": "Surgical Workshop"}
        )
        self.assertEqual(apply_res.status_code, 200)
        leave_id = apply_res.json()["leave"]["id"]

        # 2. Admin approves leave
        approve_res = self.client.patch(
            f"/api/admin/doctor-leaves/{leave_id}/status",
            headers={"Authorization": f"Bearer {self.admin_alpha_token}"},
            json={"status": "Approved"}
        )
        self.assertEqual(approve_res.status_code, 200)
        self.assertEqual(approve_res.json()["leave"]["status"], "Approved")

        # 3. Receptionist checks messages & should have received leave notification
        rec_msgs_res = self.client.get(
            "/api/communication/messages",
            headers={"Authorization": f"Bearer {self.receptionist_alpha_token}"}
        )
        self.assertEqual(rec_msgs_res.status_code, 200)
        rec_msgs = rec_msgs_res.json()["messages"]
        matching_rec_leave = [
            m for m in rec_msgs 
            if "Doctor Leave Approved" in m.get("subject", "") and "Dr. Alpha Chat" in m.get("subject", "")
        ]
        self.assertTrue(len(matching_rec_leave) >= 1, "Receptionist must receive notification when doctor leave is approved")

        # 4. Nurse checks messages & should have received leave notification
        nurse_msgs_res = self.client.get(
            "/api/communication/messages",
            headers={"Authorization": f"Bearer {self.nurse_alpha_token}"}
        )
        self.assertEqual(nurse_msgs_res.status_code, 200)
        nurse_msgs = nurse_msgs_res.json()["messages"]
        matching_nurse_leave = [
            m for m in nurse_msgs 
            if "Doctor Leave Approved" in m.get("subject", "") and "Dr. Alpha Chat" in m.get("subject", "")
        ]
        self.assertTrue(len(matching_nurse_leave) >= 1, "Nurse must receive notification when doctor leave is approved")

    def test_03_receptionist_nurse_request_and_admin_approval(self):
        """Receptionist applies to add a nurse, Admin reviews and approves it, auto-creating the nurse account."""
        # 1. Receptionist submits nurse request
        create_res = self.client.post(
            "/api/receptionist/nurse-requests",
            headers={"Authorization": f"Bearer {self.receptionist_alpha_token}"},
            json={
                "fullName": "Nurse Clara Barton",
                "email": "clara.barton@carepulse.com",
                "phone": "+91 91234 56789",
                "department": "Emergency & ICU",
                "shift": "Morning (07:00 AM - 03:30 PM)",
                "notes": "Urgent staffing need for ICU wing"
            }
        )
        self.assertEqual(create_res.status_code, 201)
        req_data = create_res.json()["request"]
        req_id = req_data["id"]
        self.assertEqual(req_data["status"], "Pending")

        # 2. Receptionist views their nurse requests
        rec_view = self.client.get(
            "/api/receptionist/nurse-requests",
            headers={"Authorization": f"Bearer {self.receptionist_alpha_token}"}
        )
        self.assertEqual(rec_view.status_code, 200)
        matched_rec = [r for r in rec_view.json()["requests"] if r["id"] == req_id]
        self.assertEqual(len(matched_rec), 1)

        # 3. Admin Alpha views pending nurse requests
        admin_view = self.client.get(
            "/api/admin/nurse-requests",
            headers={"Authorization": f"Bearer {self.admin_alpha_token}"}
        )
        self.assertEqual(admin_view.status_code, 200)
        matched_admin = [r for r in admin_view.json()["requests"] if r["id"] == req_id]
        self.assertEqual(len(matched_admin), 1)

        # 4. Admin Beta (different hospital) cannot approve Alpha's nurse request (403)
        cross_res = self.client.patch(
            f"/api/admin/nurse-requests/{req_id}/status",
            headers={"Authorization": f"Bearer {self.admin_beta_token}"},
            json={"status": "Approved"}
        )
        self.assertEqual(cross_res.status_code, 403)

        # 5. Admin Alpha approves request -> Nurse is created
        approve_res = self.client.patch(
            f"/api/admin/nurse-requests/{req_id}/status",
            headers={"Authorization": f"Bearer {self.admin_alpha_token}"},
            json={"status": "Approved"}
        )
        self.assertEqual(approve_res.status_code, 200)
        data = approve_res.json()
        self.assertEqual(data["request"]["status"], "Approved")
        self.assertIsNotNone(data["nurse"])
        self.assertTrue(data["nurse"]["staffCode"].startswith("N"))
        self.assertEqual(data["nurse"]["name"], "Nurse Clara Barton")

    def test_04_admin_can_directly_create_nurse(self):
        """Admin can also directly create a nurse without receptionist application."""
        direct_res = self.client.post(
            "/api/admin/staff",
            headers={"Authorization": f"Bearer {self.admin_alpha_token}"},
            json={
                "full_name": "Nurse Direct Added",
                "email": "nurse.direct@carepulse.com",
                "role": "nurse",
                "specialization": "Pediatrics Care",
                "phone": "+91 99999 88888",
                "hospital_id": self.hosp_alpha
            }
        )
        self.assertIn(direct_res.status_code, [200, 201])
        self.assertTrue(direct_res.json()["success"])
        self.assertEqual(direct_res.json()["staff"]["role"], "nurse")


if __name__ == "__main__":
    unittest.main()
