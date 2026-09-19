# backend/tests/test_staff_communication.py
import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import unittest
from fastapi.testclient import TestClient
from main import app
from core.security import create_jwt

class TestStaffCommunication(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

        # Hospital A (hosp-bag) Tokens
        cls.admin_a_token = create_jwt({
            "type": "staff",
            "role": "admin",
            "staff_id": "admin-bag-01",
            "name": "Admin BAG",
            "email": "admin.bag@carepulse.com",
            "hospital_id": "hosp-bag"
        })
        cls.doctor_a_token = create_jwt({
            "type": "staff",
            "role": "doctor",
            "staff_id": "doc-bag-01",
            "staff_code": "D007101",
            "name": "Dr. Sarah Adams",
            "email": "sarah.adams@carepulse.com",
            "hospital_id": "hosp-bag"
        })
        cls.nurse_a_token = create_jwt({
            "type": "staff",
            "role": "nurse",
            "staff_id": "nurse-bag-01",
            "staff_code": "N007101",
            "name": "Nurse Jenkins",
            "email": "nurse.jenkins@carepulse.com",
            "hospital_id": "hosp-bag"
        })
        cls.receptionist_a_token = create_jwt({
            "type": "staff",
            "role": "receptionist",
            "staff_id": "rec-bag-01",
            "staff_code": "R007101",
            "name": "Receptionist Rita",
            "email": "rita@carepulse.com",
            "hospital_id": "hosp-bag"
        })

        # Hospital B (hosp-001) Tokens
        cls.admin_b_token = create_jwt({
            "type": "staff",
            "role": "admin",
            "staff_id": "admin-hosp1-01",
            "name": "Admin Metro",
            "email": "admin.metro@carepulse.com",
            "hospital_id": "hosp-001"
        })
        cls.doctor_b_token = create_jwt({
            "type": "staff",
            "role": "doctor",
            "staff_id": "doc-hosp1-01",
            "staff_code": "D001101",
            "name": "Dr. John Doe",
            "email": "john.doe@carepulse.com",
            "hospital_id": "hosp-001"
        })

        # SuperAdmin Token (Global Platform Scope, hospital_id = None)
        cls.superadmin_token = create_jwt({
            "type": "staff",
            "role": "superadmin",
            "staff_id": "superadmin-01",
            "staff_code": "SA101",
            "name": "Global SuperAdmin",
            "email": "superadmin@carepulse.com",
            "hospital_id": None
        })

    def test_01_unauthenticated_access_rejected(self):
        """Unauthenticated requests must be rejected with 401."""
        res = self.client.get("/api/communication/announcements")
        self.assertEqual(res.status_code, 401)

        res = self.client.get("/api/communication/messages")
        self.assertEqual(res.status_code, 401)

    def test_02_admin_post_announcement_and_doctor_receive(self):
        """Admin A posts announcement to All Staff; Doctor A receives it."""
        post_res = self.client.post(
            "/api/communication/announcements",
            headers={"Authorization": f"Bearer {self.admin_a_token}"},
            json={
                "title": "Hospital A Wing Closed for Sanitization",
                "message": "Floor 2 is undergoing deep clinical cleaning.",
                "audience": "All Staff",
                "priority": "High"
            }
        )
        self.assertEqual(post_res.status_code, 201)
        data = post_res.json()
        self.assertTrue(data["success"])
        ann_id = data["announcement"]["id"]
        self.assertEqual(data["announcement"]["hospitalId"], "hosp-bag")

        # Doctor A at Hospital A fetches announcements
        get_res = self.client.get(
            "/api/communication/announcements",
            headers={"Authorization": f"Bearer {self.doctor_a_token}"}
        )
        self.assertEqual(get_res.status_code, 200)
        ann_list = get_res.json()["announcements"]
        matched = [a for a in ann_list if a["id"] == ann_id]
        self.assertEqual(len(matched), 1)
        self.assertEqual(matched[0]["title"], "Hospital A Wing Closed for Sanitization")

    def test_03_cross_hospital_isolation_announcements(self):
        """
        CROSS-HOSPITAL ISOLATION:
        Doctor B at Hospital B MUST NOT see Hospital A's announcements,
        even if Doctor B attempts to pass ?hospital_id=hosp-bag in query.
        """
        # Admin A posts announcement strictly for Hospital A
        post_res = self.client.post(
            "/api/communication/announcements",
            headers={"Authorization": f"Bearer {self.admin_a_token}"},
            json={
                "title": "Confidential Staff Notice Hospital A",
                "message": "Strictly internal to BAG facility.",
                "audience": "All Staff",
                "priority": "Urgent"
            }
        )
        self.assertEqual(post_res.status_code, 201)
        target_ann_id = post_res.json()["announcement"]["id"]

        # Doctor B queries their own announcements
        res_normal = self.client.get(
            "/api/communication/announcements",
            headers={"Authorization": f"Bearer {self.doctor_b_token}"}
        )
        self.assertEqual(res_normal.status_code, 200)
        leaked = [a for a in res_normal.json()["announcements"] if a["id"] == target_ann_id]
        self.assertEqual(len(leaked), 0, "Hospital B Doctor received Hospital A's announcement!")

        # Doctor B maliciously passes ?hospital_id=hosp-bag to bypass isolation
        res_tampered = self.client.get(
            "/api/communication/announcements?hospital_id=hosp-bag",
            headers={"Authorization": f"Bearer {self.doctor_b_token}"}
        )
        self.assertEqual(res_tampered.status_code, 200)
        leaked_tampered = [a for a in res_tampered.json()["announcements"] if a["id"] == target_ann_id]
        self.assertEqual(len(leaked_tampered), 0, "Hospital B Doctor bypassed isolation using query param injection!")

    def test_04_audience_filtering(self):
        """Clinical Staff announcement is delivered to Doctor, but hidden from Receptionist and Nurse."""
        post_res = self.client.post(
            "/api/communication/announcements",
            headers={"Authorization": f"Bearer {self.admin_a_token}"},
            json={
                "title": "Clinical Doctor Meeting at 4 PM",
                "message": "Discussion on oncology protocol updates.",
                "audience": "Clinical Staff",
                "priority": "Normal"
            }
        )
        self.assertEqual(post_res.status_code, 201)
        clinical_ann_id = post_res.json()["announcement"]["id"]

        # Doctor A must see it
        doc_res = self.client.get(
            "/api/communication/announcements",
            headers={"Authorization": f"Bearer {self.doctor_a_token}"}
        )
        self.assertEqual(doc_res.status_code, 200)
        doc_matched = [a for a in doc_res.json()["announcements"] if a["id"] == clinical_ann_id]
        self.assertEqual(len(doc_matched), 1, "Doctor failed to receive Clinical Staff notice")

        # Receptionist A must NOT see it
        rec_res = self.client.get(
            "/api/communication/announcements",
            headers={"Authorization": f"Bearer {self.receptionist_a_token}"}
        )
        self.assertEqual(rec_res.status_code, 200)
        rec_matched = [a for a in rec_res.json()["announcements"] if a["id"] == clinical_ann_id]
        self.assertEqual(len(rec_matched), 0, "Receptionist improperly received Clinical Staff notice")

        # Nurse A must NOT see it
        nurse_res = self.client.get(
            "/api/communication/announcements",
            headers={"Authorization": f"Bearer {self.nurse_a_token}"}
        )
        self.assertEqual(nurse_res.status_code, 200)
        nurse_matched = [a for a in nurse_res.json()["announcements"] if a["id"] == clinical_ann_id]
        self.assertEqual(len(nurse_matched), 0, "Nurse improperly received Clinical Staff notice")

    def test_05_staff_to_admin_communication_and_reply(self):
        """
        Two-Way Communication:
        1. Nurse sends inquiry to Admin.
        2. Admin views inquiry and replies with parent_id.
        3. Nurse sees reply in thread.
        4. Admin marks message as read.
        """
        # Step 1: Nurse Jenkins sends requisition to Admin
        send_res = self.client.post(
            "/api/communication/messages",
            headers={"Authorization": f"Bearer {self.nurse_a_token}"},
            json={
                "subject": "Phlebotomy Vials Low in Triage Cabin 3",
                "message": "We need 50 EDTA blood collection tubes before 2 PM.",
                "priority": "high",
                "recipientRole": "admin"
            }
        )
        self.assertEqual(send_res.status_code, 201)
        msg_data = send_res.json()["data"]
        msg_id = msg_data["id"]
        self.assertEqual(msg_data["senderRole"], "nurse")
        self.assertEqual(msg_data["hospitalId"], "hosp-bag")

        # Step 2: Admin A retrieves messages and sees Nurse's request
        admin_res = self.client.get(
            "/api/communication/messages",
            headers={"Authorization": f"Bearer {self.admin_a_token}"}
        )
        self.assertEqual(admin_res.status_code, 200)
        threads = admin_res.json()["messages"]
        target_thread = next((t for t in threads if t["id"] == msg_id), None)
        self.assertIsNotNone(target_thread, "Admin A cannot find Nurse's message")
        self.assertEqual(target_thread["subject"], "Phlebotomy Vials Low in Triage Cabin 3")

        # Step 3: Admin A replies to Nurse
        reply_res = self.client.post(
            "/api/communication/messages",
            headers={"Authorization": f"Bearer {self.admin_a_token}"},
            json={
                "parentId": msg_id,
                "subject": "Re: Phlebotomy Vials Low in Triage Cabin 3",
                "message": "Approved. Dispatched 60 EDTA vials from central store to Station 3.",
                "priority": "normal"
            }
        )
        self.assertEqual(reply_res.status_code, 201)
        reply_data = reply_res.json()["data"]
        self.assertEqual(reply_data["parentId"], msg_id)

        # Step 4: Nurse retrieves messages and verifies Admin reply exists in replies array
        nurse_threads_res = self.client.get(
            "/api/communication/messages",
            headers={"Authorization": f"Bearer {self.nurse_a_token}"}
        )
        self.assertEqual(nurse_threads_res.status_code, 200)
        nurse_threads = nurse_threads_res.json()["messages"]
        nurse_thread = next((t for t in nurse_threads if t["id"] == msg_id), None)
        self.assertIsNotNone(nurse_thread)
        self.assertEqual(len(nurse_thread["replies"]), 1)
        self.assertEqual(nurse_thread["replies"][0]["message"], "Approved. Dispatched 60 EDTA vials from central store to Station 3.")

        # Step 5: Mark message as read
        read_res = self.client.patch(
            f"/api/communication/messages/{msg_id}/read",
            headers={"Authorization": f"Bearer {self.admin_a_token}"}
        )
        self.assertEqual(read_res.status_code, 200)

    def test_06_cross_hospital_isolation_messages(self):
        """
        CROSS-HOSPITAL MESSAGE ISOLATION:
        Admin B at Hospital B CANNOT view Nurse A's message from Hospital A,
        and Doctor B cannot send a reply to Hospital A's message thread.
        """
        # Step 1: Nurse A sends message in Hospital A
        send_res = self.client.post(
            "/api/communication/messages",
            headers={"Authorization": f"Bearer {self.nurse_a_token}"},
            json={
                "subject": "Hospital A Private Requisition",
                "message": "Strictly internal requisition.",
                "priority": "normal"
            }
        )
        self.assertEqual(send_res.status_code, 201)
        msg_a_id = send_res.json()["data"]["id"]

        # Step 2: Admin B at Hospital B checks their messages
        admin_b_res = self.client.get(
            "/api/communication/messages",
            headers={"Authorization": f"Bearer {self.admin_b_token}"}
        )
        self.assertEqual(admin_b_res.status_code, 200)
        leaked_msgs = [m for m in admin_b_res.json()["messages"] if m["id"] == msg_a_id]
        self.assertEqual(len(leaked_msgs), 0, "Admin B at Hospital B was able to see Hospital A's message!")

        # Step 3: Malicious cross-hospital reply attempt by Doctor B to Hospital A's message
        reply_hack_res = self.client.post(
            "/api/communication/messages",
            headers={"Authorization": f"Bearer {self.doctor_b_token}"},
            json={
                "parentId": msg_a_id,
                "subject": "Hacked cross-hospital reply",
                "message": "Attempting to inject reply across hospital boundaries"
            }
        )
        self.assertIn(reply_hack_res.status_code, [403, 400], "Cross-hospital reply was not forbidden!")

    def test_07_superadmin_global_scope(self):
        """SuperAdmin can view across all hospitals or filter by specific hospital."""
        super_res = self.client.get(
            "/api/communication/announcements",
            headers={"Authorization": f"Bearer {self.superadmin_token}"}
        )
        self.assertEqual(super_res.status_code, 200)
        self.assertTrue(super_res.json()["success"])

        # SuperAdmin can filter by hospital_id
        super_filter_res = self.client.get(
            "/api/communication/announcements?hospital_id=hosp-bag",
            headers={"Authorization": f"Bearer {self.superadmin_token}"}
        )
        self.assertEqual(super_filter_res.status_code, 200)
        for ann in super_filter_res.json()["announcements"]:
            self.assertEqual(ann["hospitalId"], "hosp-bag")

if __name__ == "__main__":
    unittest.main()
