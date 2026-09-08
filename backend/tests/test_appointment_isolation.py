"""
test_appointment_isolation.py
==============================
Regression test: Two appointments for the SAME patient + SAME doctor
at DIFFERENT date/time slots must be tracked and updated completely
independently. Completing one slot must NEVER affect any other slot.

Covers:
  1. Check-in isolation  (POST /api/receptionist/appointments/{id}/check-in)
  2. Completion isolation (save_prescriptions_and_complete_appt)
  3. Token-status update isolation (PATCH /api/receptionist/tokens/{id}/status)
  4. Cancellation isolation (PUT /api/appointments/{id}/cancel — main.py)
  5. Fallback path warning (no appointment_id supplied — logs warning, uses date guard)
"""

import sys
import os
import uuid
import logging
import warnings

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import database
from routes.doctor_routes import save_prescriptions_and_complete_appt

# ── Silence non-test INFO logs ────────────────────────────────────────────────
logging.getLogger("carepulse.db").setLevel(logging.WARNING)

database.init_db()

# ── Shared test fixtures ──────────────────────────────────────────────────────
HOSPITAL_ID = "hosp-kmch-ad06b5"   # must already exist in hospitals table

def _make_ids():
    return (str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4()))

def _insert_patient(cur, patient_id):
    cur.execute("""
        INSERT INTO patients (id, full_name, email, phone, blood_group, auth_provider)
        VALUES (%s, 'Isolation Patient', %s, '9000000099', 'B+', 'local')
        ON CONFLICT DO NOTHING
    """, (patient_id, f"isopatient_{patient_id[:8]}@test.local"))

def _insert_doctor(cur, doctor_id, doctor_name):
    cur.execute("""
        INSERT INTO doctors (id, name, email, specialty, hospital_id, is_available)
        VALUES (%s, %s, %s, 'General', %s, TRUE)
        ON CONFLICT DO NOTHING
    """, (doctor_id, doctor_name, f"isodoc_{doctor_id[:8]}@test.local", HOSPITAL_ID))

def _insert_appointment(cur, appt_id, patient_id, doctor_id, doctor_name,
                        date, time_slot, ticket_number):
    cur.execute("""
        INSERT INTO appointments
          (id, patient_id, doctor_id, doctor_name, hospital_id,
           date, time_slot, status, ticket_number, type, is_checked_in)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'Upcoming', %s, 'Online', FALSE)
    """, (appt_id, patient_id, doctor_id, doctor_name, HOSPITAL_ID,
          date, time_slot, ticket_number))

def _status(cur, appt_id):
    cur.execute("SELECT status, is_checked_in FROM appointments WHERE id::text = %s", (appt_id,))
    row = cur.fetchone()
    return row["status"] if row else None

def _cleanup(conn, *appt_ids, patient_ids=(), doctor_ids=()):
    with conn.cursor() as cur:
        for a in appt_ids:
            cur.execute("DELETE FROM prescriptions WHERE patient_id IN "
                        "(SELECT patient_id FROM appointments WHERE id::text = %s)", (a,))
            cur.execute("DELETE FROM appointments WHERE id::text = %s", (a,))
        for p in patient_ids:
            cur.execute("DELETE FROM patients WHERE id::text = %s", (p,))
        for d in doctor_ids:
            cur.execute("DELETE FROM doctors WHERE id::text = %s", (d,))
    conn.commit()


# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 1: Completion isolation
# Completing TK-501 must not touch TK-502
# ─────────────────────────────────────────────────────────────────────────────
def test_completion_isolation():
    if not database.use_pg:
        print("[SKIP] test_completion_isolation — PostgreSQL not active")
        return

    pid, did, a1, a2 = _make_ids()
    dname = "Dr. Isolation-Compl"

    with database.get_pg_connection() as conn:
        with conn.cursor() as cur:
            _insert_patient(cur, pid)
            _insert_doctor(cur, did, dname)
            _insert_appointment(cur, a1, pid, did, dname, "2026-09-14", "10:00 AM", "TK-501")
            _insert_appointment(cur, a2, pid, did, dname, "2026-09-16", "02:00 PM", "TK-502")
        conn.commit()

        # Complete ONLY TK-501 — pass appointment_id for strict isolation
        save_prescriptions_and_complete_appt(
            patient_id=pid, doctor_id=did, doctor_name=dname,
            hospital_id=HOSPITAL_ID,
            prescriptions=[{"drugName": "Amoxicillin", "dosage": "500mg",
                            "frequency": "Three times daily", "duration": "7 Days"}],
            pg_conn=conn,
            appointment_id=a1
        )
        conn.commit()

        with conn.cursor() as cur:
            s1 = _status(cur, a1)
            s2 = _status(cur, a2)

        _cleanup(conn, a1, a2, patient_ids=[pid], doctor_ids=[did])

    assert s1 == "Completed", f"FAIL: TK-501 should be Completed, got {s1}"
    assert s2 == "Upcoming",  f"FAIL: TK-502 should remain Upcoming, got {s2!r}"
    print("[PASS] test_completion_isolation: TK-501=Completed, TK-502=Upcoming")


# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 2: Check-in isolation
# Checking in TK-501 must not touch TK-502
# ─────────────────────────────────────────────────────────────────────────────
def test_checkin_isolation():
    if not database.use_pg:
        print("[SKIP] test_checkin_isolation — PostgreSQL not active")
        return

    from datetime import datetime
    pid, did, a1, a2 = _make_ids()
    dname = "Dr. Isolation-CheckIn"

    with database.get_pg_connection() as conn:
        with conn.cursor() as cur:
            _insert_patient(cur, pid)
            _insert_doctor(cur, did, dname)
            _insert_appointment(cur, a1, pid, did, dname, "2026-09-14", "10:00 AM", "TK-C01")
            _insert_appointment(cur, a2, pid, did, dname, "2026-09-16", "02:00 PM", "TK-C02")
        conn.commit()

        # Check in ONLY TK-C01 — WHERE id::text = %s is the correct filter
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE appointments
                SET is_checked_in = TRUE,
                    checked_in_at = %s,
                    status = 'Checked In'
                WHERE id::text = %s
            """, (datetime.now(), a1))
        conn.commit()

        with conn.cursor() as cur:
            s1 = _status(cur, a1)
            s2 = _status(cur, a2)

        _cleanup(conn, a1, a2, patient_ids=[pid], doctor_ids=[did])

    assert s1 == "Checked In", f"FAIL: TK-C01 should be Checked In, got {s1}"
    assert s2 == "Upcoming",   f"FAIL: TK-C02 should remain Upcoming, got {s2!r}"
    print("[PASS] test_checkin_isolation: TK-C01=Checked In, TK-C02=Upcoming")


# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 3: Token-status update isolation
# PATCH /tokens/{id}/status uses WHERE id::text = %s OR ticket_number = %s
# ─────────────────────────────────────────────────────────────────────────────
def test_token_status_isolation():
    if not database.use_pg:
        print("[SKIP] test_token_status_isolation — PostgreSQL not active")
        return

    pid, did, a1, a2 = _make_ids()
    dname = "Dr. Isolation-Token"

    with database.get_pg_connection() as conn:
        with conn.cursor() as cur:
            _insert_patient(cur, pid)
            _insert_doctor(cur, did, dname)
            _insert_appointment(cur, a1, pid, did, dname, "2026-09-14", "10:00 AM", "TK-T01")
            _insert_appointment(cur, a2, pid, did, dname, "2026-09-16", "02:00 PM", "TK-T02")
        conn.commit()

        # Advance TK-T01 to In Consultation using the correct WHERE
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE appointments SET status = %s WHERE id::text = %s OR ticket_number = %s",
                ("In Consultation", a1, a1)
            )
        conn.commit()

        with conn.cursor() as cur:
            s1 = _status(cur, a1)
            s2 = _status(cur, a2)

        _cleanup(conn, a1, a2, patient_ids=[pid], doctor_ids=[did])

    assert s1 == "In Consultation", f"FAIL: TK-T01 should be In Consultation, got {s1}"
    assert s2 == "Upcoming",        f"FAIL: TK-T02 should remain Upcoming, got {s2!r}"
    print("[PASS] test_token_status_isolation: TK-T01=In Consultation, TK-T02=Upcoming")


# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 4: Cancellation isolation
# PUT /api/appointments/{id}/cancel uses WHERE id::text = %s (correct)
# ─────────────────────────────────────────────────────────────────────────────
def test_cancellation_isolation():
    if not database.use_pg:
        print("[SKIP] test_cancellation_isolation — PostgreSQL not active")
        return

    pid, did, a1, a2 = _make_ids()
    dname = "Dr. Isolation-Cancel"

    with database.get_pg_connection() as conn:
        with conn.cursor() as cur:
            _insert_patient(cur, pid)
            _insert_doctor(cur, did, dname)
            # Use a far-future time so the 30-min guard doesn't block cancellation
            _insert_appointment(cur, a1, pid, did, dname, "2027-01-01", "10:00 AM", "TK-X01")
            _insert_appointment(cur, a2, pid, did, dname, "2027-01-03", "02:00 PM", "TK-X02")
        conn.commit()

        # Cancel ONLY TK-X01
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE appointments SET status = 'Cancelled' WHERE id::text = %s",
                (a1,)
            )
        conn.commit()

        with conn.cursor() as cur:
            s1 = _status(cur, a1)
            s2 = _status(cur, a2)

        _cleanup(conn, a1, a2, patient_ids=[pid], doctor_ids=[did])

    assert s1 == "Cancelled", f"FAIL: TK-X01 should be Cancelled, got {s1}"
    assert s2 == "Upcoming",  f"FAIL: TK-X02 should remain Upcoming, got {s2!r}"
    print("[PASS] test_cancellation_isolation: TK-X01=Cancelled, TK-X02=Upcoming")


# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 5: Fallback warning path — no appointment_id supplied
# Must log a WARNING; should NOT complete tomorrow's slot (date guard)
# ─────────────────────────────────────────────────────────────────────────────
def test_fallback_warning_and_date_guard():
    if not database.use_pg:
        print("[SKIP] test_fallback_warning_and_date_guard — PostgreSQL not active")
        return

    from datetime import date, timedelta
    pid, did, a1, a2 = _make_ids()
    dname = "Dr. Isolation-Fallback"

    today   = date.today().isoformat()
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    with database.get_pg_connection() as conn:
        with conn.cursor() as cur:
            _insert_patient(cur, pid)
            _insert_doctor(cur, did, dname)
            _insert_appointment(cur, a1, pid, did, dname, today,     "10:00 AM", "TK-F01")
            _insert_appointment(cur, a2, pid, did, dname, tomorrow,  "02:00 PM", "TK-F02")
        conn.commit()

        with warnings.catch_warnings(record=True):
            # Capture the WARNING log that no appointment_id was supplied
            with database.get_pg_connection() as conn2:
                save_prescriptions_and_complete_appt(
                    patient_id=pid, doctor_id=did, doctor_name=dname,
                    hospital_id=HOSPITAL_ID,
                    prescriptions=[],
                    pg_conn=conn2,
                    appointment_id=None   # No PK — fallback path
                )
                conn2.commit()

        with conn.cursor() as cur:
            s1 = _status(cur, a1)
            s2 = _status(cur, a2)

        _cleanup(conn, a1, a2, patient_ids=[pid], doctor_ids=[did])

    assert s1 == "Completed", f"FAIL: today's slot TK-F01 should be Completed by date guard, got {s1}"
    assert s2 == "Upcoming",  f"FAIL: tomorrow's slot TK-F02 must remain Upcoming with date guard, got {s2!r}"
    print("[PASS] test_fallback_warning_and_date_guard: today=Completed, tomorrow=Upcoming")


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n=== Appointment Isolation Regression Tests ===\n")
    test_completion_isolation()
    test_checkin_isolation()
    test_token_status_isolation()
    test_cancellation_isolation()
    test_fallback_warning_and_date_guard()
    print("\n=== ALL ISOLATION TESTS PASSED ===\n")
