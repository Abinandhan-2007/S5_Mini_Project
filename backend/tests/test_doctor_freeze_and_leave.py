# backend/tests/test_doctor_freeze_and_leave.py
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

class TestDoctorFreezeAndLeave(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        database.init_db()
        cls.client = TestClient(app)

        # Hospitals
        cls.hosp_a = "hosp-alpha"
        cls.hosp_b = "hosp-beta"

        # Doctors
        cls.doc_a_id = "doc-alpha-001"
        cls.doc_b_id = "doc-beta-001"

        # Doctor A Token (Hospital Alpha)
        cls.doctor_a_token = create_jwt({
            "type": "staff",
            "role": "doctor",
            "doctor_id": cls.doc_a_id,
            "staff_id": cls.doc_a_id,
            "name": "Dr. Alpha Specialist",
            "email": "dr.alpha@carepulse.com",
            "hospital_id": cls.hosp_a
        })

        # Doctor B Token (Hospital Beta)
        cls.doctor_b_token = create_jwt({
            "type": "staff",
            "role": "doctor",
            "doctor_id": cls.doc_b_id,
            "staff_id": cls.doc_b_id,
            "name": "Dr. Beta Specialist",
            "email": "dr.beta@carepulse.com",
            "hospital_id": cls.hosp_b
        })

        # Receptionist A Token (Hospital Alpha)
        cls.receptionist_a_token = create_jwt({
            "type": "staff",
            "role": "receptionist",
            "staff_id": "rec-alpha-01",
            "name": "Receptionist Alpha",
            "email": "rec.alpha@carepulse.com",
            "hospital_id": cls.hosp_a
        })

        # Receptionist B Token (Hospital Beta)
        cls.receptionist_b_token = create_jwt({
            "type": "staff",
            "role": "receptionist",
            "staff_id": "rec-beta-01",
            "name": "Receptionist Beta",
            "email": "rec.beta@carepulse.com",
            "hospital_id": cls.hosp_b
        })

        # Clean up any leftover test doctor leaves
        if database.use_pg:
            try:
                with database.get_pg_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("DELETE FROM doctor_leaves WHERE doctor_id IN (%s, %s)", (cls.doc_a_id, cls.doc_b_id))
                        conn.commit()
            except Exception:
                pass
        db = database.read_json_db()
        if "doctor_leaves" in db:
            db["doctor_leaves"] = [
                l for l in db["doctor_leaves"]
                if l.get("doctor_id") not in [cls.doc_a_id, cls.doc_b_id]
                and l.get("doctorId") not in [cls.doc_a_id, cls.doc_b_id]
            ]
            database.write_json_db(db)

        # Ensure doctors exist in db
        cls._ensure_doctor(cls.doc_a_id, "Dr. Alpha Specialist", cls.hosp_a)
        cls._ensure_doctor(cls.doc_b_id, "Dr. Beta Specialist", cls.hosp_b)

    @classmethod
    def _ensure_doctor(cls, doc_id, name, hosp_id):
        # Construct standard OPD slots covering whole day
        slots = [
            {"id": f"{doc_id}-s1", "timeSlot": "09:00 AM - 10:00 AM", "maxSeats": 6, "isAvailable": True},
            {"id": f"{doc_id}-s2", "timeSlot": "10:00 AM - 11:00 AM", "maxSeats": 6, "isAvailable": True},
            {"id": f"{doc_id}-s3", "timeSlot": "11:00 AM - 12:00 PM", "maxSeats": 6, "isAvailable": True},
            {"id": f"{doc_id}-s4", "timeSlot": "12:00 PM - 01:00 PM", "maxSeats": 6, "isAvailable": True},
            {"id": f"{doc_id}-s5", "timeSlot": "02:00 PM - 03:00 PM", "maxSeats": 6, "isAvailable": True},
            {"id": f"{doc_id}-s6", "timeSlot": "03:00 PM - 04:00 PM", "maxSeats": 6, "isAvailable": True},
            {"id": f"{doc_id}-s7", "timeSlot": "04:00 PM - 05:00 PM", "maxSeats": 6, "isAvailable": True},
            {"id": f"{doc_id}-s8", "timeSlot": "06:00 PM - 07:00 PM", "maxSeats": 6, "isAvailable": True},
            {"id": f"{doc_id}-s9", "timeSlot": "08:00 PM - 09:00 PM", "maxSeats": 6, "isAvailable": True},
            {"id": f"{doc_id}-s10", "timeSlot": "10:00 PM - 11:00 PM", "maxSeats": 6, "isAvailable": True},
        ]
        import json
        if database.use_pg:
            try:
                with database.get_pg_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO doctors (id, name, hospital_id, specialty, is_available, slot_capacities)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            ON CONFLICT (id) DO UPDATE
                            SET slot_capacities = %s, is_available = %s
                        """, (doc_id, name, hosp_id, "General Medicine", True, json.dumps(slots), json.dumps(slots), True))
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
            database.write_json_db(db)
        else:
            existing["slot_capacities"] = slots
            existing["slotCapacities"] = slots
            existing["is_available"] = True
            database.write_json_db(db)

    def test_01_doctor_1h30m_slot_freezing(self):
        """
        Scenario 1: If doctor is marked unavailable, slots starting in the next
        1h 30m window (current_time to current_time + 90m) are frozen.
        Slots starting after 90m remain available and visible.
        """
        # Mark doctor A unavailable
        patch_res = self.client.patch(
            f"/api/doctor/{self.doc_a_id}/availability",
            headers={"Authorization": f"Bearer {self.doctor_a_token}"},
            json={"isAvailable": False, "reason": "Emergency Call", "unavailableUntil": "90 mins"}
        )
        self.assertEqual(patch_res.status_code, 200)

        # Query slots for today
        today_str = datetime.now().strftime("%Y-%m-%d")
        res = self.client.get(f"/api/doctors/{self.doc_a_id}/slots?date={today_str}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        slots = data.get("slots", [])
        self.assertGreater(len(slots), 0)

        now = datetime.now()
        current_mins = now.hour * 60 + now.minute
        freeze_until = current_mins + 90

        # Verify freezing rule for each slot
        for s in slots:
            time_slot = s["timeSlot"]
            # Parse slot start minutes
            from main import parse_slot_start_mins
            start_mins = parse_slot_start_mins(time_slot)
            if current_mins <= start_mins < freeze_until:
                # Must be frozen!
                self.assertTrue(s["isFrozen"], f"Slot {time_slot} starting at {start_mins}m should be frozen (now={current_mins}m, window={freeze_until}m)")
                self.assertFalse(s["isAvailable"])
                self.assertEqual(s["statusBadge"], "Frozen (Doctor Away)")
            elif start_mins >= freeze_until:
                # Starts after 90 minutes -> MUST BE AVAILABLE!
                self.assertFalse(s["isFrozen"], f"Slot {time_slot} after 90m window should NOT be frozen")
                self.assertTrue(s["isAvailable"])

    def test_02_immediate_unfreeze_on_available_toggle(self):
        """
        Scenario 2: If a doctor marks themselves unavailable then marks themselves
        available again before the 90-minute window elapses, the freeze is correctly
        lifted immediately, not stuck until the original window passes.
        """
        # Toggle doctor back to available
        patch_res = self.client.patch(
            f"/api/doctor/{self.doc_a_id}/availability",
            headers={"Authorization": f"Bearer {self.doctor_a_token}"},
            json={"isAvailable": True, "reason": "", "unavailableUntil": ""}
        )
        self.assertEqual(patch_res.status_code, 200)
        self.assertTrue(patch_res.json()["doctor"]["isAvailable"])

        # Fetch slots again for today
        today_str = datetime.now().strftime("%Y-%m-%d")
        res = self.client.get(f"/api/doctors/{self.doc_a_id}/slots?date={today_str}")
        self.assertEqual(res.status_code, 200)
        slots = res.json().get("slots", [])

        now = datetime.now()
        current_mins = now.hour * 60 + now.minute

        for s in slots:
            from main import parse_slot_start_mins
            start_mins = parse_slot_start_mins(s["timeSlot"])
            if start_mins >= current_mins:
                # Any upcoming slot should NOT have the "Frozen (Doctor Away)" badge
                self.assertNotEqual(s.get("statusBadge"), "Frozen (Doctor Away)", f"Slot {s['timeSlot']} freeze was not lifted immediately upon doctor becoming available")

    def test_03_leave_default_pending_and_no_freeze_until_approved(self):
        """
        Scenario 3: Doctor leave application defaults to 'Pending' with CHECK constraint.
        Pending leave requests do NOT freeze slots. Only once Approved do they freeze slots.
        """
        target_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")

        # 1. Doctor applies for 1-day leave
        apply_res = self.client.post(
            "/api/doctor/leave",
            headers={"Authorization": f"Bearer {self.doctor_a_token}"},
            json={"startDate": target_date, "endDate": target_date, "reason": "Conference"}
        )
        self.assertEqual(apply_res.status_code, 200, f"Leave application failed: {apply_res.text}")
        leave_data = apply_res.json().get("leave", {})
        leave_id = leave_data["id"]
        self.assertEqual(leave_data["status"], "Pending", "Leave request must default to Pending")
        self.assertEqual(leave_data["daysCount"], 1)

        # 2. Check slots before approval - MUST NOT be frozen!
        res_before = self.client.get(f"/api/doctors/{self.doc_a_id}/slots?date={target_date}")
        self.assertEqual(res_before.status_code, 200)
        self.assertFalse(res_before.json().get("onLeave"), "Pending leave must NOT mark doctor as onLeave")
        for s in res_before.json().get("slots", []):
            self.assertFalse(s["isFrozen"], f"Slot {s['timeSlot']} should NOT be frozen while leave is Pending")

        # 3. Receptionist approves the leave
        approve_res = self.client.patch(
            f"/api/receptionist/leaves/{leave_id}/status",
            headers={"Authorization": f"Bearer {self.receptionist_a_token}"},
            json={"status": "Approved"}
        )
        self.assertEqual(approve_res.status_code, 200)
        self.assertEqual(approve_res.json()["leave"]["status"], "Approved")

        # 4. Check slots after approval - MUST BE FROZEN!
        res_after = self.client.get(f"/api/doctors/{self.doc_a_id}/slots?date={target_date}")
        self.assertEqual(res_after.status_code, 200)
        self.assertTrue(res_after.json().get("onLeave"), "Approved leave MUST set onLeave: True")
        for s in res_after.json().get("slots", []):
            self.assertTrue(s["isFrozen"], f"Slot {s['timeSlot']} MUST be frozen when leave is Approved")
            self.assertFalse(s["isAvailable"])

    def test_04_hospital_isolation_receptionist_leaves(self):
        """
        Scenario 4: Cross-hospital isolation:
        A receptionist at Hospital B cannot see or approve Hospital A's doctor leave requests.
        """
        leave_date = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")

        # Doctor A (Hospital Alpha) applies for leave
        apply_res = self.client.post(
            "/api/doctor/leave",
            headers={"Authorization": f"Bearer {self.doctor_a_token}"},
            json={"startDate": leave_date, "endDate": leave_date, "reason": "Alpha Hospital CME"}
        )
        self.assertEqual(apply_res.status_code, 200)
        leave_a_id = apply_res.json()["leave"]["id"]

        # Receptionist B (Hospital Beta) queries leaves: must NOT contain Doctor A's leave!
        get_b_res = self.client.get(
            "/api/receptionist/leaves",
            headers={"Authorization": f"Bearer {self.receptionist_b_token}"}
        )
        self.assertEqual(get_b_res.status_code, 200)
        leaves_seen_by_b = get_b_res.json().get("leaves", [])
        self.assertFalse(any(l["id"] == leave_a_id for l in leaves_seen_by_b),
                         "Receptionist B must NOT see leave applications from Hospital A!")

        # Receptionist B attempts to approve Doctor A's leave: MUST BE REJECTED (HTTP 403)!
        patch_b_res = self.client.patch(
            f"/api/receptionist/leaves/{leave_a_id}/status",
            headers={"Authorization": f"Bearer {self.receptionist_b_token}"},
            json={"status": "Approved"}
        )
        self.assertEqual(patch_b_res.status_code, 403, "Receptionist from another hospital must be forbidden from approving cross-hospital leaves")

        # Receptionist A (Hospital Alpha) can see and approve it
        get_a_res = self.client.get(
            "/api/receptionist/leaves",
            headers={"Authorization": f"Bearer {self.receptionist_a_token}"}
        )
        self.assertEqual(get_a_res.status_code, 200)
        leaves_seen_by_a = get_a_res.json().get("leaves", [])
        self.assertTrue(any(l["id"] == leave_a_id for l in leaves_seen_by_a),
                        "Receptionist A should see leave from their own hospital")

    def test_05_leave_cancellation_unfreezes_slots(self):
        """
        Scenario 5: If an APPROVED leave is later cancelled by the doctor or reversed
        by admin, confirm slots correctly un-freeze and become bookable again.
        """
        leave_date = (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d")

        # 1. Apply and Approve leave
        apply_res = self.client.post(
            "/api/doctor/leave",
            headers={"Authorization": f"Bearer {self.doctor_a_token}"},
            json={"startDate": leave_date, "endDate": leave_date, "reason": "Family Function"}
        )
        leave_id = apply_res.json()["leave"]["id"]

        approve_res = self.client.patch(
            f"/api/receptionist/leaves/{leave_id}/status",
            headers={"Authorization": f"Bearer {self.receptionist_a_token}"},
            json={"status": "Approved"}
        )
        self.assertEqual(approve_res.status_code, 200)

        # Verify slots are frozen
        slots_approved = self.client.get(f"/api/doctors/{self.doc_a_id}/slots?date={leave_date}").json()
        self.assertTrue(slots_approved.get("onLeave"))

        # 2. Doctor cancels leave
        del_res = self.client.delete(
            f"/api/doctor/leave/{leave_id}",
            headers={"Authorization": f"Bearer {self.doctor_a_token}"}
        )
        self.assertEqual(del_res.status_code, 200)
        self.assertTrue(del_res.json()["success"])

        # 3. Verify slots are UN-FROZEN and bookable again!
        slots_cancelled = self.client.get(f"/api/doctors/{self.doc_a_id}/slots?date={leave_date}").json()
        self.assertFalse(slots_cancelled.get("onLeave"), "Cancelled leave must NOT have onLeave: True")
        for s in slots_cancelled.get("slots", []):
            self.assertFalse(s["isFrozen"], f"Slot {s['timeSlot']} should be un-frozen after leave cancellation")
            self.assertTrue(s["isAvailable"])

if __name__ == "__main__":
    unittest.main()
