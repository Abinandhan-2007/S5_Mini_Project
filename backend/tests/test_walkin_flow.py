import sys
import unittest
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from routes.receptionist_routes import create_walkin_appointment, fetch_all_tokens_from_db
from schemas import WalkInAppointmentCreate

class TestWalkInFlow(unittest.TestCase):
    def test_walkin_registration_and_queue_sync(self):
        # 1. Create walk-in appointment
        payload = WalkInAppointmentCreate(
            patientName="Ramesh Narayanan",
            patientPhone="+91 94444 55555",
            doctorId="doc-c43a2b",
            doctorName="Dr. SANMUGAM",
            doctorSpecialty="Dermatology",
            date="2026-09-08",
            timeSlot="09:00 AM - 10:00 AM",
            age=42,
            bloodGroup="A+",
            address="14 West Cross Road",
            healthIssue="Chronic skin rash",
            hospitalId="hosp-kmch-8f5879",
            hospitalName="KMCH"
        )
        res = create_walkin_appointment(payload)
        
        self.assertTrue(res.get("success"))
        self.assertIsNotNone(res.get("ticketNumber"))
        self.assertTrue(res["ticketNumber"].startswith("#CP-"))
        
        token = res.get("token")
        self.assertIsNotNone(token)
        self.assertEqual(token["patientName"], "Ramesh Narayanan")
        self.assertEqual(token["type"], "Walk-In")
        self.assertEqual(token["status"], "Waiting")
        self.assertTrue(token["tokenNumber"].startswith("#TOK-"))
        self.assertEqual(token["age"], 42)
        self.assertEqual(token["bloodGroup"], "A+")

        # 2. Query tokens for hospital
        tokens = fetch_all_tokens_from_db(hospital_id="hosp-kmch-8f5879")
        matching = [t for t in tokens if t.get("patientName") == "Ramesh Narayanan"]
        self.assertGreaterEqual(len(matching), 1)
        
        matched_tok = matching[0]
        self.assertEqual(matched_tok["type"], "Walk-In")
        self.assertEqual(matched_tok["status"], "Waiting")
        self.assertEqual(matched_tok["patientPhone"], "+91 94444 55555")
        self.assertEqual(matched_tok["age"], 42)
        self.assertEqual(matched_tok["bloodGroup"], "A+")
        self.assertEqual(matched_tok["address"], "14 West Cross Road")
        self.assertEqual(matched_tok["healthIssue"], "Chronic skin rash")

if __name__ == "__main__":
    unittest.main()
