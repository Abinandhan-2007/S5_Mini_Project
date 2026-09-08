"""
REPRODUCTION SCRIPT — Appointment Isolation Bug
================================================
Two appointments for the SAME patient + SAME doctor, different date/time slots.
Complete ONLY TK-501 (Monday 10 AM). Query BOTH appointments.
Confirms whether TK-502 (Wednesday 2 PM) was also incorrectly affected.
"""

import sys
import os
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import database
from routes.doctor_routes import save_prescriptions_and_complete_appt

database.init_db()  # ensure PostgreSQL is live

PATIENT_ID = str(uuid.uuid4())
DOCTOR_ID   = str(uuid.uuid4())
DOCTOR_NAME = "Dr. IsolationTest"
HOSPITAL_ID = "hosp-kmch-ad06b5"

APPT_TK501_ID = str(uuid.uuid4())  # Monday 10 AM slot — will be Completed
APPT_TK502_ID = str(uuid.uuid4())  # Wednesday 2 PM slot — must remain Upcoming


def _insert_appointment(conn, appt_id, date, time_slot, ticket_number):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO appointments
              (id, patient_id, doctor_id, doctor_name, hospital_id,
               date, time_slot, status, ticket_number, type, is_checked_in)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'Upcoming', %s, 'Online', FALSE)
        """, (appt_id, PATIENT_ID, DOCTOR_ID, DOCTOR_NAME, HOSPITAL_ID,
              date, time_slot, ticket_number))


def _read_appointment_status(conn, appt_id):
    with conn.cursor() as cur:
        cur.execute("SELECT id, ticket_number, status FROM appointments WHERE id::text = %s", (appt_id,))
        return cur.fetchone()


def run_repro():
    print("\n=== REPRODUCTION: Appointment Isolation Bug ===\n")

    if not database.use_pg:
        print("[SKIP] PostgreSQL not enabled — test requires live PG.")
        return

    with database.get_pg_connection() as conn:

        # ── 1. Setup: insert both appointments ──────────────────────────────
        # Insert stub patient + doctor to satisfy FK constraints
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO patients (id, full_name, email, phone, blood_group, auth_provider)
                VALUES (%s, 'Isolation TestPat', %s, '9000000001', 'O+', 'local')
                ON CONFLICT DO NOTHING
            """, (PATIENT_ID, f"isotest_{PATIENT_ID[:8]}@test.local"))
            cur.execute("""
                INSERT INTO doctors (id, name, email, specialty, hospital_id, is_available)
                VALUES (%s, %s, %s, 'General', %s, TRUE)
                ON CONFLICT DO NOTHING
            """, (DOCTOR_ID, DOCTOR_NAME, f"isodoc_{DOCTOR_ID[:8]}@test.local", HOSPITAL_ID))

        _insert_appointment(conn, APPT_TK501_ID, "2026-09-14", "10:00 AM", "TK-501")
        _insert_appointment(conn, APPT_TK502_ID, "2026-09-16", "02:00 PM", "TK-502")
        conn.commit()

        before_501 = _read_appointment_status(conn, APPT_TK501_ID)
        before_502 = _read_appointment_status(conn, APPT_TK502_ID)
        print(f"[BEFORE] TK-501 ({APPT_TK501_ID[:8]}...) status = {before_501['status']}")
        print(f"[BEFORE] TK-502 ({APPT_TK502_ID[:8]}...) status = {before_502['status']}")
        assert before_501["status"] == "Upcoming", "Setup failed"
        assert before_502["status"] == "Upcoming", "Setup failed"

        # ── 2. Complete ONLY TK-501 via save_prescriptions_and_complete_appt ─
        print(f"\n[ACTION] Completing ONLY TK-501 (appointment_id={APPT_TK501_ID[:8]}..., patient_id={PATIENT_ID[:8]}...)")
        save_prescriptions_and_complete_appt(
            patient_id=PATIENT_ID,
            doctor_id=DOCTOR_ID,
            doctor_name=DOCTOR_NAME,
            hospital_id=HOSPITAL_ID,
            prescriptions=[{
                "drugName": "Paracetamol",
                "dosage": "500mg",
                "frequency": "Twice daily",
                "duration": "3 Days",
                "instructions": "After food"
            }],
            pg_conn=conn,
            appointment_id=APPT_TK501_ID  # THE FIX: pass exact PK
        )
        conn.commit()

        after_501 = _read_appointment_status(conn, APPT_TK501_ID)
        after_502 = _read_appointment_status(conn, APPT_TK502_ID)
        print(f"\n[AFTER]  TK-501 status = {after_501['status']}")
        print(f"[AFTER]  TK-502 status = {after_502['status']}")

        if after_502["status"] == "Completed":
            print("\n[BUG CONFIRMED] ❌ TK-502 was incorrectly set to 'Completed'!")
            print("   Root cause: WHERE patient_id = %s AND (doctor_id = %s OR doctor_name ILIKE %s)")
            print("   This matches ALL appointments for the same patient+doctor pair, not just TK-501.")
        elif after_501["status"] == "Completed" and after_502["status"] == "Upcoming":
            print("\n[OK] ✅ Only TK-501 was Completed; TK-502 remains Upcoming.")
        else:
            print(f"\n[UNEXPECTED] TK-501={after_501['status']}, TK-502={after_502['status']}")

        # ── 3. Cleanup ────────────────────────────────────────────────────────
        with conn.cursor() as cur:
            cur.execute("DELETE FROM appointments WHERE id::text = %s OR id::text = %s",
                        (APPT_TK501_ID, APPT_TK502_ID))
            cur.execute("DELETE FROM prescriptions WHERE patient_id::text = %s", (PATIENT_ID,))
            cur.execute("DELETE FROM patients WHERE id::text = %s", (PATIENT_ID,))
            cur.execute("DELETE FROM doctors WHERE id::text = %s", (DOCTOR_ID,))
        conn.commit()
        print("\n[CLEANUP] Test rows removed.")


if __name__ == "__main__":
    run_repro()
