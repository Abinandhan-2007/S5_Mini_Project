import unittest
import sys
import os
import uuid
from datetime import datetime, date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
import database
from main import app
from routes.receptionist_routes import (
    clean_expired_unvisited_appointments,
    parse_appointment_scheduled_datetime
)

client = TestClient(app)

class TestUnvisitedSlotCleanup(unittest.TestCase):
    def setUp(self):
        self.past_unvisited_id = str(uuid.uuid4())
        self.future_unvisited_id = str(uuid.uuid4())
        self.past_visited_id = str(uuid.uuid4())

        past_date = (datetime.now().date() - timedelta(days=2)).strftime("%Y-%m-%d")
        future_date = (datetime.now().date() + timedelta(days=1)).strftime("%Y-%m-%d")

        # Seed test appointments in DB
        database.check_pg_health_and_sync()
        patient_id = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
        doc_id = "doc-1"
        hosp_id = None

        if database.use_pg:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT id FROM patients LIMIT 1")
                    row = cur.fetchone()
                    if row:
                        patient_id = str(row["id"])

                    cur.execute("SELECT id FROM hospitals LIMIT 1")
                    hrow = cur.fetchone()
                    if hrow:
                        hosp_id = str(hrow["id"])

                    cur.execute("SELECT id FROM doctors LIMIT 1")
                    drow = cur.fetchone()
                    if drow:
                        doc_id = str(drow["id"])

                    # 1. Past unvisited (>24h, not visited) -> MUST BE DELETED
                    cur.execute("""
                        INSERT INTO appointments (
                            id, patient_id, ticket_number, doctor_id, doctor_name, hospital_id,
                            date, time_slot, status, is_checked_in
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        self.past_unvisited_id, patient_id,
                        "TK-TEST-PURGE-1", doc_id, "Dr. Test", hosp_id,
                        past_date, "10:00 AM - 11:00 AM", "Upcoming", False
                    ))

                    # 2. Future unvisited (<24h from now) -> MUST BE RETAINED
                    cur.execute("""
                        INSERT INTO appointments (
                            id, patient_id, ticket_number, doctor_id, doctor_name, hospital_id,
                            date, time_slot, status, is_checked_in
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        self.future_unvisited_id, patient_id,
                        "TK-TEST-PURGE-2", doc_id, "Dr. Test", hosp_id,
                        future_date, "10:00 AM - 11:00 AM", "Upcoming", False
                    ))

                    # 3. Past visited (>24h but checked in / attended) -> MUST BE RETAINED
                    cur.execute("""
                        INSERT INTO appointments (
                            id, patient_id, ticket_number, doctor_id, doctor_name, hospital_id,
                            date, time_slot, status, is_checked_in
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        self.past_visited_id, patient_id,
                        "TK-TEST-PURGE-3", doc_id, "Dr. Test", hosp_id,
                        past_date, "10:00 AM - 11:00 AM", "Completed", True
                    ))
                conn.commit()

        # Also seed in JSON DB fallback
        db = database.read_json_db()
        db.setdefault("appointments", []).extend([
            {
                "id": self.past_unvisited_id,
                "patient_id": patient_id,
                "ticket_number": "TK-TEST-PURGE-1",
                "doctor_id": doc_id,
                "hospital_id": hosp_id,
                "date": past_date,
                "time_slot": "10:00 AM - 11:00 AM",
                "status": "Upcoming",
                "is_checked_in": False
            },
            {
                "id": self.future_unvisited_id,
                "patient_id": patient_id,
                "ticket_number": "TK-TEST-PURGE-2",
                "doctor_id": doc_id,
                "hospital_id": hosp_id,
                "date": future_date,
                "time_slot": "10:00 AM - 11:00 AM",
                "status": "Upcoming",
                "is_checked_in": False
            },
            {
                "id": self.past_visited_id,
                "patient_id": patient_id,
                "ticket_number": "TK-TEST-PURGE-3",
                "doctor_id": doc_id,
                "hospital_id": hosp_id,
                "date": past_date,
                "time_slot": "10:00 AM - 11:00 AM",
                "status": "Completed",
                "is_checked_in": True
            }
        ])
        database.write_json_db(db)

    def tearDown(self):
        # Clean up any leftover test appointments
        ids = [self.past_unvisited_id, self.future_unvisited_id, self.past_visited_id]
        if database.use_pg:
            try:
                with database.get_pg_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("DELETE FROM appointments WHERE id::text = ANY(%s)", (ids,))
                    conn.commit()
            except Exception:
                pass
        try:
            db = database.read_json_db()
            db["appointments"] = [a for a in db.get("appointments", []) if str(a.get("id")) not in ids]
            database.write_json_db(db)
        except Exception:
            pass

    def test_clean_expired_unvisited_appointments(self):
        # Execute cleanup
        deleted = clean_expired_unvisited_appointments()
        self.assertIn(self.past_unvisited_id, deleted, "Expected past unvisited appointment to be deleted")
        self.assertNotIn(self.future_unvisited_id, deleted, "Future appointment must not be deleted")
        self.assertNotIn(self.past_visited_id, deleted, "Visited / completed appointment must not be deleted")

        # Verify PostgreSQL state
        if database.use_pg:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT id FROM appointments WHERE id::text = %s", (self.past_unvisited_id,))
                    self.assertIsNone(cur.fetchone(), "Past unvisited appointment must be absent from PostgreSQL")

                    cur.execute("SELECT id FROM appointments WHERE id::text = %s", (self.future_unvisited_id,))
                    self.assertIsNotNone(cur.fetchone(), "Future unvisited appointment must remain in PostgreSQL")

                    cur.execute("SELECT id FROM appointments WHERE id::text = %s", (self.past_visited_id,))
                    self.assertIsNotNone(cur.fetchone(), "Past visited appointment must remain in PostgreSQL")

        # Verify JSON DB state
        db = database.read_json_db()
        json_ids = [str(a.get("id")) for a in db.get("appointments", [])]
        self.assertNotIn(self.past_unvisited_id, json_ids, "Past unvisited appointment must be deleted from JSON DB")
        self.assertIn(self.future_unvisited_id, json_ids, "Future appointment must remain in JSON DB")
        self.assertIn(self.past_visited_id, json_ids, "Past visited appointment must remain in JSON DB")

    def test_cleanup_endpoint(self):
        res = client.post("/api/receptionist/appointments/cleanup-unvisited")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertIn("deletedCount", data)

if __name__ == "__main__":
    unittest.main()
