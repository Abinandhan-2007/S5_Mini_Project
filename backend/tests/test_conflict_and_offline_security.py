import sys
from pathlib import Path
import uuid
import json
import os

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import database
from database import get_pg_connection, sync_offline_json_to_pg, read_json_db, write_json_db
from routes.staff_auth import staff_login, StaffLoginRequest
from fastapi import HTTPException

def test_genuine_conflict_scenarios():
    print("\n--- TEST 1: GENUINE APPOINTMENT CONFLICT RESOLUTION ---")
    with get_pg_connection() as conn:
        with conn.cursor() as cur:
            # Setup dummy patient and hospital in PG
            test_pat_id = str(uuid.uuid4())
            test_hosp_id = "hosp-conflict-test"
            cur.execute("""
                INSERT INTO hospitals (id, name, address) VALUES (%s, 'Test Conflict Hospital', 'Test Address')
                ON CONFLICT (id) DO NOTHING
            """, (test_hosp_id,))
            cur.execute("""
                INSERT INTO patients (id, full_name, email, phone, blood_group, auth_provider)
                VALUES (%s, 'Conflict Test Patient', 'conflict_pat@test.com', '1234567890', 'O+', 'local')
                ON CONFLICT (id) DO NOTHING
            """, (test_pat_id,))
            conn.commit()

            # Scenario A: PostgreSQL has advanced to 'Completed', JSON has stale 'Upcoming'
            app_id_a = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO appointments (id, patient_id, ticket_number, doctor_id, doctor_name, hospital_id, date, time_slot, status, is_checked_in, checked_in_at)
                VALUES (%s, %s, 'TC-A01', 'doc-1', 'Dr. Smith', %s, '2026-09-08', '10:00 AM', 'Completed', true, NOW())
            """, (app_id_a, test_pat_id, test_hosp_id))
            conn.commit()

            # Scenario B: PostgreSQL has advanced to 'In Consultation', JSON has stale 'Checked In'
            app_id_b = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO appointments (id, patient_id, ticket_number, doctor_id, doctor_name, hospital_id, date, time_slot, status, is_checked_in, checked_in_at)
                VALUES (%s, %s, 'TC-B01', 'doc-1', 'Dr. Smith', %s, '2026-09-08', '11:00 AM', 'In Consultation', true, NOW())
            """, (app_id_b, test_pat_id, test_hosp_id))
            conn.commit()

            # Scenario C: PostgreSQL has 'Upcoming', JSON has new offline check-in 'Checked In'
            app_id_c = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO appointments (id, patient_id, ticket_number, doctor_id, doctor_name, hospital_id, date, time_slot, status, is_checked_in, checked_in_at)
                VALUES (%s, %s, 'TC-C01', 'doc-1', 'Dr. Smith', %s, '2026-09-08', '12:00 PM', 'Upcoming', false, NULL)
            """, (app_id_c, test_pat_id, test_hosp_id))
            conn.commit()

            # Scenario D: PostgreSQL has 'Cancelled', JSON has stale 'Upcoming'
            app_id_d = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO appointments (id, patient_id, ticket_number, doctor_id, doctor_name, hospital_id, date, time_slot, status, is_checked_in, checked_in_at)
                VALUES (%s, %s, 'TC-D01', 'doc-1', 'Dr. Smith', %s, '2026-09-08', '01:00 PM', 'Cancelled', false, NULL)
            """, (app_id_d, test_pat_id, test_hosp_id))
            conn.commit()

            # Prepare conflicting records in database.json
            current_db = read_json_db()
            original_apps = list(current_db.get("appointments", []))

            conflicting_apps = list(original_apps) + [
                {
                    "id": app_id_a,
                    "patient_id": test_pat_id,
                    "ticket_number": "TC-A01",
                    "doctor_id": "doc-1",
                    "doctor_name": "Dr. Smith",
                    "hospital_id": test_hosp_id,
                    "date": "2026-09-08",
                    "time_slot": "10:00 AM",
                    "status": "Upcoming",  # STALE!
                    "is_checked_in": False, # STALE!
                    "checked_in_at": None
                },
                {
                    "id": app_id_b,
                    "patient_id": test_pat_id,
                    "ticket_number": "TC-B01",
                    "doctor_id": "doc-1",
                    "doctor_name": "Dr. Smith",
                    "hospital_id": test_hosp_id,
                    "date": "2026-09-08",
                    "time_slot": "11:00 AM",
                    "status": "Checked In",  # STALE compared to In Consultation!
                    "is_checked_in": True,
                    "checked_in_at": "2026-09-08T11:00:00"
                },
                {
                    "id": app_id_c,
                    "patient_id": test_pat_id,
                    "ticket_number": "TC-C01",
                    "doctor_id": "doc-1",
                    "doctor_name": "Dr. Smith",
                    "hospital_id": test_hosp_id,
                    "date": "2026-09-08",
                    "time_slot": "12:00 PM",
                    "status": "Checked In",  # VALID OFFLINE PROGRESSION!
                    "is_checked_in": True,
                    "checked_in_at": "2026-09-08T12:05:00"
                },
                {
                    "id": app_id_d,
                    "patient_id": test_pat_id,
                    "ticket_number": "TC-D01",
                    "doctor_id": "doc-1",
                    "doctor_name": "Dr. Smith",
                    "hospital_id": test_hosp_id,
                    "date": "2026-09-08",
                    "time_slot": "01:00 PM",
                    "status": "Upcoming",  # STALE compared to Cancelled!
                    "is_checked_in": False,
                    "checked_in_at": None
                }
            ]

            current_db["appointments"] = conflicting_apps
            write_json_db(current_db)

            try:
                # Run Sync
                sync_count = sync_offline_json_to_pg(conn)
                print(f"Synced {sync_count} items into PostgreSQL.")

                # VERIFY SCENARIO A: PG 'Completed' must NOT be overwritten by JSON 'Upcoming'
                cur.execute("SELECT status, is_checked_in FROM appointments WHERE id = %s", (app_id_a,))
                row_a = cur.fetchone()
                assert row_a["status"] == "Completed", f"FAILED: Scenario A status was regressed to {row_a['status']}"
                assert row_a["is_checked_in"] is True, "FAILED: Scenario A is_checked_in was regressed to False"
                print("[OK] Scenario A PASSED: PG 'Completed' preserved against stale JSON 'Upcoming'.")

                # VERIFY SCENARIO B: PG 'In Consultation' must NOT be overwritten by JSON 'Checked In'
                cur.execute("SELECT status, is_checked_in FROM appointments WHERE id = %s", (app_id_b,))
                row_b = cur.fetchone()
                assert row_b["status"] == "In Consultation", f"FAILED: Scenario B status was regressed to {row_b['status']}"
                assert row_b["is_checked_in"] is True, "FAILED: Scenario B is_checked_in was regressed"
                print("[OK] Scenario B PASSED: PG 'In Consultation' preserved against stale JSON 'Checked In'.")

                # VERIFY SCENARIO C: PG 'Upcoming' SHOULD progress to JSON 'Checked In'
                cur.execute("SELECT status, is_checked_in FROM appointments WHERE id = %s", (app_id_c,))
                row_c = cur.fetchone()
                assert row_c["status"] == "Checked In", f"FAILED: Scenario C status did not advance: {row_c['status']}"
                assert row_c["is_checked_in"] is True, "FAILED: Scenario C is_checked_in is not True"
                print("[OK] Scenario C PASSED: PG 'Upcoming' successfully progressed to offline 'Checked In'.")

                # VERIFY SCENARIO D: PG 'Cancelled' must NOT be overwritten by JSON 'Upcoming'
                cur.execute("SELECT status, is_checked_in FROM appointments WHERE id = %s", (app_id_d,))
                row_d = cur.fetchone()
                assert row_d["status"] == "Cancelled", f"FAILED: Scenario D status was regressed to {row_d['status']}"
                print("[OK] Scenario D PASSED: PG 'Cancelled' terminal state preserved against stale JSON 'Upcoming'.")

            finally:
                # Cleanup test appointments
                cur.execute("DELETE FROM appointments WHERE id IN (%s, %s, %s, %s)", (app_id_a, app_id_b, app_id_c, app_id_d))
                cur.execute("DELETE FROM patients WHERE id = %s", (test_pat_id,))
                cur.execute("DELETE FROM hospitals WHERE id = %s", (test_hosp_id,))
                conn.commit()

                # Restore database.json
                current_db["appointments"] = original_apps
                write_json_db(current_db)


def test_sequence_code_collision_safety():
    print("\n--- TEST 2: SEQUENCE CODE & COLLISION SAFETY ---")
    with get_pg_connection() as conn:
        with conn.cursor() as cur:
            # 1. Inspect current sequence max
            cur.execute("""
                SELECT setval('patient_code_seq', GREATEST(
                    (SELECT COALESCE(MAX(SUBSTRING(patient_code FROM 2)::BIGINT), 0) FROM patients WHERE patient_code ~ '^P[0-9]+$'),
                    1
                ), true);
            """)
            current_max = list(cur.fetchone().values())[0]
            print(f"Current PG patient_code_seq max value: {current_max}")

            # 2. Simulate an offline patient created with a high sequence number in JSON
            offline_seq_val = current_max + 100
            offline_patient_code = f"P{offline_seq_val:06d}"
            offline_patient_id = str(uuid.uuid4())

            current_db = read_json_db()
            orig_patients = list(current_db.get("patients", []))
            current_db["patients"] = orig_patients + [{
                "id": offline_patient_id,
                "patient_code": offline_patient_code,
                "full_name": "Offline Sequence Test Patient",
                "email": f"offline_seq_{offline_seq_val}@test.com",
                "phone": "9998887776",
                "bloodGroup": "B+"
            }]
            write_json_db(current_db)

            try:
                # 3. Sync offline JSON to PostgreSQL
                sync_offline_json_to_pg(conn)

                # Verify offline patient was inserted with the specified code
                cur.execute("SELECT id, patient_code FROM patients WHERE id = %s", (offline_patient_id,))
                p_row = cur.fetchone()
                assert p_row is not None, "Offline patient was not synced to PG"
                assert p_row["patient_code"] == offline_patient_code, f"Expected {offline_patient_code}, got {p_row['patient_code']}"
                print(f"[OK] Offline patient synced with code: {p_row['patient_code']}")

                # 4. Check that sequence counter was advanced to >= offline_seq_val
                cur.execute("SELECT last_value, is_called FROM patient_code_seq")
                seq_info = cur.fetchone()
                print(f"Sequence state after sync: last_value={seq_info['last_value']}")
                assert seq_info["last_value"] >= offline_seq_val, f"Sequence not advanced! last_value={seq_info['last_value']}"

                # 5. Now simulate a new online registration in PostgreSQL (using trigger default)
                online_pat_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO patients (id, full_name, email, phone, blood_group, auth_provider)
                    VALUES (%s, 'Online After Sync Patient', 'online_seq@test.com', '9991112223', 'A+', 'local')
                    RETURNING patient_code;
                """, (online_pat_id,))
                online_code = cur.fetchone()["patient_code"]
                conn.commit()

                print(f"[OK] New online registration generated code: {online_code}")
                # Parse numeric part
                online_num = int(online_code[1:])
                assert online_num > offline_seq_val, f"Collision hazard! Online code {online_num} is not > {offline_seq_val}"
                print(f"[OK] VERIFIED: Sequence successfully stayed ahead ({online_num} > {offline_seq_val}). Zero collision risk!")

            finally:
                # Cleanup
                cur.execute("DELETE FROM patients WHERE id IN (%s, %s)", (offline_patient_id, online_pat_id))
                # Reset sequence back to realistic max
                cur.execute("""
                    SELECT setval('patient_code_seq', GREATEST(
                        (SELECT COALESCE(MAX(SUBSTRING(patient_code FROM 2)::BIGINT), 0) FROM patients WHERE patient_code ~ '^P[0-9]+$'),
                        1
                    ), true);
                """)
                conn.commit()
                current_db["patients"] = orig_patients
                write_json_db(current_db)


def test_staff_auth_fail_loud_503():
    print("\n--- TEST 3: STAFF AUTH 503 LOUD FAILURE (NO SILENT BYPASS) ---")
    
    # Simulate PostgreSQL down
    orig_use_pg = database.use_pg
    orig_health_fn = database.check_pg_health_and_sync
    orig_mock_flag = os.environ.get("ALLOW_STAFF_MOCK_LOGIN")
    
    try:
        # 1. PG is down, ALLOW_STAFF_MOCK_LOGIN is default (not set / false)
        database.use_pg = False
        database.check_pg_health_and_sync = lambda *args, **kwargs: False
        os.environ.pop("ALLOW_STAFF_MOCK_LOGIN", None)

        req = StaffLoginRequest(
            email="doc-1",
            password="doc123"
        )

        threw_503 = False
        try:
            staff_login(req)
        except HTTPException as exc:
            print(f"Staff login raised HTTP {exc.status_code}: {exc.detail}")
            if exc.status_code == 503:
                threw_503 = True

        assert threw_503, "CRITICAL FLAW: Staff login did NOT throw 503 when PG was offline!"
        print("[OK] VERIFIED: Staff login FAILS LOUDLY (HTTP 503) when PostgreSQL is offline. Silent bypass prevented!")

        # 2. PG is online, invalid user enters arbitrary credentials
        database.use_pg = True
        req_bad = StaffLoginRequest(
            email="non_existent_doc_id_999",
            password="doc123"
        )
        threw_401 = False
        try:
            staff_login(req_bad)
        except HTTPException as exc:
            print(f"Bad staff login raised HTTP {exc.status_code}: {exc.detail}")
            if exc.status_code == 401:
                threw_401 = True

        assert threw_401, f"Expected HTTP 401 on unrecognized staff user, but got another response!"
        print("[OK] VERIFIED: Unrecognized staff member receives HTTP 401 Unauthorized, zero silent fallback to mock accounts.")

    finally:
        database.use_pg = orig_use_pg
        database.check_pg_health_and_sync = orig_health_fn
        if orig_mock_flag is not None:
            os.environ["ALLOW_STAFF_MOCK_LOGIN"] = orig_mock_flag
        else:
            os.environ.pop("ALLOW_STAFF_MOCK_LOGIN", None)


if __name__ == "__main__":
    print("=========================================================")
    print("RUNNING ARCHITECTURAL VERIFICATION & RESILIENCE TESTS")
    print("=========================================================")
    test_genuine_conflict_scenarios()
    test_sequence_code_collision_safety()
    test_staff_auth_fail_loud_503()
    print("\n=========================================================")
    print("ALL 3 VERIFICATION TEST SUITES COMPLETED AND PASSED!")
    print("=========================================================")
