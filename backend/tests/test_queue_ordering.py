# backend/tests/test_queue_ordering.py
"""
Comprehensive automated test suite for Scheduled-Priority Hybrid Queue Ordering & RBAC Check-In.

Covers:
1. Scenario 1: Scheduled patient arrives early (10:00 scheduled, 09:55 check-in -> 10:00 effective).
2. Scenario 2: Scheduled patient arrives late (10:00 scheduled, 10:30 check-in -> 10:30 effective).
3. Scenario 3: Walk-in patient arrives (10:10 check-in -> 10:10 effective).
4. Scenario 4: Queue sort order test (Merged order: Pt 1 [10:00], Pt 3 [10:10], Pt 2 [10:30]).
5. Scenario 5: Un-checked-in scheduled patient excluded from live queue until checked in.
6. Doctor Queue Consistency Check: Doctor portal view matches Receptionist view identically.
7. RBAC Scope Rejection Test:
   - Unauthenticated -> 401
   - Patient role -> 401
   - Disallowed staff role -> 403
   - Allowed staff roles (receptionist, doctor, nurse, admin, superadmin) -> 200
"""

import sys
from pathlib import Path
from datetime import datetime, date, time

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import uuid
from fastapi.testclient import TestClient
from main import app
from routes.receptionist_routes import (
    compute_effective_queue_position,
    parse_time_slot_start,
    parse_appointment_scheduled_datetime,
    fetch_all_tokens_from_db
)
from core.security import create_jwt
import database

client = TestClient(app)

def create_staff_jwt(role: str, hospital_id: str = "hosp-bag", doctor_id: str = None) -> str:
    payload = {
        "sub": f"staff-{role}-test",
        "type": "staff",
        "role": role,
        "email": f"{role}@carepulse.test",
        "hospital_id": hospital_id,
    }
    if doctor_id:
        payload["doctor_id"] = doctor_id
    return create_jwt(payload)

def create_patient_jwt(patient_id: str = "pat-online-1") -> str:
    payload = {
        "sub": patient_id,
        "type": "patient",
        "role": "patient",
        "email": "patient@carepulse.test"
    }
    return create_jwt(payload)


def test_scenario_1_early_arrival():
    """Scenario 1: Scheduled patient arrives early: MAX(10:00, 09:55) = 10:00 AM"""
    today_d = date.today()
    scheduled_slot = "10:00 AM - 11:00 AM"
    early_checkin = datetime.combine(today_d, time(9, 55, 0))
    
    eff_pos = compute_effective_queue_position(
        app_type="In-Person",
        date_val=today_d.isoformat(),
        time_slot=scheduled_slot,
        checked_in_at_val=early_checkin
    )
    expected = datetime.combine(today_d, time(10, 0, 0))
    assert eff_pos == expected, f"Expected {expected}, got {eff_pos}"
    print(f"  [PASS] Scenario 1: Scheduled 10:00 AM, arrived 09:55 AM -> Effective: {eff_pos.strftime('%I:%M %p')} (Slot preserved)")


def test_scenario_2_late_arrival():
    """Scenario 2: Scheduled patient arrives late: MAX(10:00, 10:30) = 10:30 AM"""
    today_d = date.today()
    scheduled_slot = "10:00 AM - 11:00 AM"
    late_checkin = datetime.combine(today_d, time(10, 30, 0))
    
    eff_pos = compute_effective_queue_position(
        app_type="In-Person",
        date_val=today_d.isoformat(),
        time_slot=scheduled_slot,
        checked_in_at_val=late_checkin
    )
    expected = datetime.combine(today_d, time(10, 30, 0))
    assert eff_pos == expected, f"Expected {expected}, got {eff_pos}"
    print(f"  [PASS] Scenario 2: Scheduled 10:00 AM, arrived 10:30 AM -> Effective: {eff_pos.strftime('%I:%M %p')} (Pushed back)")


def test_scenario_3_walkin_arrival():
    """Scenario 3: Walk-in patient arrives at 10:10 AM -> Effective: 10:10 AM"""
    today_d = date.today()
    walkin_checkin = datetime.combine(today_d, time(10, 10, 0))
    
    eff_pos = compute_effective_queue_position(
        app_type="Walk-In",
        date_val=today_d.isoformat(),
        time_slot="10:00 AM - 11:00 AM",
        checked_in_at_val=walkin_checkin
    )
    expected = walkin_checkin
    assert eff_pos == expected, f"Expected {expected}, got {eff_pos}"
    print(f"  [PASS] Scenario 3: Walk-in checked in at 10:10 AM -> Effective: {eff_pos.strftime('%I:%M %p')}")


def test_scenario_4_merged_queue_ordering():
    """Scenario 4: Merged queue sorting: Pt 1 (10:00) < Pt 3 (10:10) < Pt 2 (10:30)"""
    today_d = date.today()
    p1_eff = compute_effective_queue_position("In-Person", today_d.isoformat(), "10:00 AM - 11:00 AM", datetime.combine(today_d, time(9, 55, 0)))
    p2_eff = compute_effective_queue_position("In-Person", today_d.isoformat(), "10:00 AM - 11:00 AM", datetime.combine(today_d, time(10, 30, 0)))
    p3_eff = compute_effective_queue_position("Walk-In", today_d.isoformat(), "10:00 AM - 11:00 AM", datetime.combine(today_d, time(10, 10, 0)))
    
    patients = [
        {"name": "Patient 2 (Late)", "effective": p2_eff},
        {"name": "Patient 1 (On-time)", "effective": p1_eff},
        {"name": "Patient 3 (Walk-in)", "effective": p3_eff},
    ]
    sorted_patients = sorted(patients, key=lambda p: p["effective"])
    
    assert sorted_patients[0]["name"] == "Patient 1 (On-time)", f"1st should be Patient 1, got {sorted_patients[0]['name']}"
    assert sorted_patients[1]["name"] == "Patient 3 (Walk-in)", f"2nd should be Patient 3, got {sorted_patients[1]['name']}"
    assert sorted_patients[2]["name"] == "Patient 2 (Late)", f"3rd should be Patient 2, got {sorted_patients[2]['name']}"
    
    print("  [PASS] Scenario 4: Merged Queue Order Verified:")
    for idx, p in enumerate(sorted_patients, start=1):
        print(f"         #{idx}: {p['name']} -> {p['effective'].strftime('%I:%M %p')}")


def test_scenario_5_unattended_scheduled_excluded_and_then_checked_in():
    """Scenario 5: Scheduled patient with is_checked_in=False excluded from live queue; included in roster."""
    test_hosp_id = f"hosp-test-{uuid.uuid4().hex[:6]}"
    test_doc_id = f"doc-test-{uuid.uuid4().hex[:6]}"
    today_str = date.today().isoformat()
    receptionist_token = create_staff_jwt("receptionist", hospital_id=test_hosp_id)
    headers = {"Authorization": f"Bearer {receptionist_token}"}

    # 1. Create scheduled appointment for today
    res_create = client.post("/api/appointments", json={
        "patientId": f"pat-{uuid.uuid4().hex[:8]}",
        "patientName": "Arthur Pendelton (Online)",
        "doctorId": test_doc_id,
        "doctorName": "Dr. Test Specialist",
        "doctorSpecialty": "Cardiology",
        "hospitalId": test_hosp_id,
        "hospitalName": "Test Queue Hospital",
        "date": today_str,
        "timeSlot": "10:00 AM - 11:00 AM",
        "type": "In-Person"
    })
    assert res_create.status_code == 201, f"Failed creating appointment: {res_create.text}"
    app_data = res_create.json()
    app_id = app_data["id"]

    # 2. Query live queue: should be EMPTY because patient has NOT checked in
    res_queue = client.get(f"/api/receptionist/tokens?hospital_id={test_hosp_id}&doctor_id={test_doc_id}", headers=headers)
    assert res_queue.status_code == 200
    queue_tokens = res_queue.json().get("tokens", [])
    matching_in_queue = [t for t in queue_tokens if t["id"] == app_id or t.get("appointmentId") == app_id]
    assert len(matching_in_queue) == 0, "Un-checked-in scheduled appointment must NOT appear in live queue!"
    print("  [PASS] Scenario 5a: Un-checked-in patient correctly EXCLUDED from live queue.")

    # 3. Query bookings roster: should be PRESENT with isCheckedIn=False
    res_roster = client.get(f"/api/receptionist/bookings?hospital_id={test_hosp_id}&doctor_id={test_doc_id}", headers=headers)
    assert res_roster.status_code == 200
    roster_tokens = res_roster.json().get("tokens", [])
    matching_in_roster = [t for t in roster_tokens if t["id"] == app_id or t.get("appointmentId") == app_id]
    assert len(matching_in_roster) == 1, "Scheduled appointment must appear in bookings roster!"
    assert matching_in_roster[0].get("isCheckedIn") is False, "Appointment in roster must have isCheckedIn=False prior to check-in"
    print("  [PASS] Scenario 5b: Patient correctly present in bookings roster with isCheckedIn=False.")

    # 4. Check in patient via receptionist check-in endpoint
    res_checkin = client.post(f"/api/receptionist/appointments/{app_id}/check-in", headers=headers)
    assert res_checkin.status_code == 200, f"Check-in failed: {res_checkin.text}"
    checkin_resp = res_checkin.json()
    assert checkin_resp["success"] is True
    assert checkin_resp["isCheckedIn"] is True
    print(f"  [PASS] Scenario 5c: Patient checked in successfully at {checkin_resp['effectiveQueueTime']}.")

    # 5. Query live queue again: patient MUST NOW appear in live queue
    res_queue2 = client.get(f"/api/receptionist/tokens?hospital_id={test_hosp_id}&doctor_id={test_doc_id}", headers=headers)
    assert res_queue2.status_code == 200
    queue_tokens2 = res_queue2.json().get("tokens", [])
    matching_in_queue2 = [t for t in queue_tokens2 if t["id"] == app_id or t.get("appointmentId") == app_id]
    assert len(matching_in_queue2) == 1, "Patient must appear in live queue immediately after check-in!"
    assert matching_in_queue2[0].get("isCheckedIn") is True
    print(f"  [PASS] Scenario 5d: Patient immediately joined live queue as Token {matching_in_queue2[0].get('tokenNumber')}.")


def test_doctor_queue_consistency():
    """Addition 1: Confirm DOCTOR portal queue view and RECEPTIONIST queue view use identical ordering."""
    test_hosp_id = f"hosp-doc-consist-{uuid.uuid4().hex[:6]}"
    test_doc_id = f"doc-consist-{uuid.uuid4().hex[:6]}"
    today_str = date.today().isoformat()
    
    receptionist_token = create_staff_jwt("receptionist", hospital_id=test_hosp_id)
    doctor_token = create_staff_jwt("doctor", hospital_id=test_hosp_id, doctor_id=test_doc_id)
    rec_headers = {"Authorization": f"Bearer {receptionist_token}"}
    doc_headers = {"Authorization": f"Bearer {doctor_token}"}

    # Book and check in 3 patients with different effective positions
    # Pt A: Scheduled 10:00, checked in 09:50 -> Eff: 10:00
    res_a = client.post("/api/appointments", json={
        "patientName": "Patient Alpha",
        "doctorId": test_doc_id,
        "doctorName": "Dr. Consistency",
        "hospitalId": test_hosp_id,
        "date": today_str,
        "timeSlot": "10:00 AM - 11:00 AM",
        "type": "In-Person"
    })
    id_a = res_a.json()["id"]
    client.post(f"/api/receptionist/appointments/{id_a}/check-in", headers=rec_headers)

    # Pt B: Walk-in at 10:05 -> Eff: 10:05
    res_b = client.post("/api/receptionist/appointments", json={
        "patientName": "Patient Beta (Walk-in)",
        "patientPhone": "+91 98765 11111",
        "doctorId": test_doc_id,
        "doctorName": "Dr. Consistency",
        "doctorSpecialty": "General Medicine",
        "timeSlot": "10:00 AM - 11:00 AM",
        "date": today_str
    }, headers=rec_headers)
    assert res_b.status_code in [200, 201], f"Walk-in creation failed: {res_b.text}"

    # Pt C: Scheduled 10:00, checked in later -> Eff: 10:15
    res_c = client.post("/api/appointments", json={
        "patientName": "Patient Charlie",
        "doctorId": test_doc_id,
        "doctorName": "Dr. Consistency",
        "hospitalId": test_hosp_id,
        "date": today_str,
        "timeSlot": "10:00 AM - 11:00 AM",
        "type": "In-Person"
    })
    id_c = res_c.json()["id"]
    client.post(f"/api/receptionist/appointments/{id_c}/check-in", headers=rec_headers)

    # 1. Fetch Receptionist Queue
    res_rec = client.get(f"/api/receptionist/tokens?hospital_id={test_hosp_id}&doctor_id={test_doc_id}", headers=rec_headers)
    assert res_rec.status_code == 200
    rec_tokens = res_rec.json().get("tokens", [])
    rec_order_names = [t["patientName"] for t in rec_tokens]

    # 2. Fetch Doctor Queue via /api/doctor/queue
    res_doc = client.get(f"/api/doctor/queue?doctor_id={test_doc_id}", headers=doc_headers)
    assert res_doc.status_code == 200
    doc_tokens = res_doc.json().get("tokens", [])
    doc_order_names = [t["patientName"] for t in doc_tokens]

    # 3. Verify exact consistency
    assert len(rec_tokens) == len(doc_tokens), f"Count mismatch: Rec {len(rec_tokens)} vs Doc {len(doc_tokens)}"
    assert rec_order_names == doc_order_names, f"Queue ordering mismatch! Rec: {rec_order_names} vs Doc: {doc_order_names}"
    
    print(f"  [PASS] Doctor Queue Consistency Check: Both portals see identical {len(doc_tokens)} patients in exact sequence:")
    for idx, (r_name, d_name) in enumerate(zip(rec_order_names, doc_order_names), start=1):
        print(f"         Position #{idx}: Receptionist='{r_name}' == Doctor='{d_name}'")


def test_rbac_checkin_scope():
    """Addition 2: RBAC rejection and acceptance tests on check-in endpoint."""
    test_hosp_id = f"hosp-rbac-{uuid.uuid4().hex[:6]}"
    test_doc_id = f"doc-rbac-{uuid.uuid4().hex[:6]}"
    today_str = date.today().isoformat()

    # Create dummy appointment to test check-in RBAC
    res_create = client.post("/api/appointments", json={
        "patientName": "RBAC Security Test Patient",
        "doctorId": test_doc_id,
        "doctorName": "Dr. Security",
        "hospitalId": test_hosp_id,
        "date": today_str,
        "timeSlot": "11:00 AM - 12:00 PM",
        "type": "In-Person"
    })
    app_id = res_create.json()["id"]

    # 1. Unauthenticated request (no header) -> MUST be REJECTED (401)
    res_no_auth = client.post(f"/api/receptionist/appointments/{app_id}/check-in")
    assert res_no_auth.status_code == 401, f"Expected 401 for unauthenticated request, got {res_no_auth.status_code}"
    print(f"  [PASS] RBAC: Unauthenticated request rejected with HTTP 401 ({res_no_auth.json().get('detail')})")

    # 2. Patient-role request -> MUST be REJECTED (401)
    pat_token = create_patient_jwt("pat-unauthorized")
    res_patient = client.post(
        f"/api/receptionist/appointments/{app_id}/check-in",
        headers={"Authorization": f"Bearer {pat_token}"}
    )
    assert res_patient.status_code == 401, f"Expected 401 for patient-role request, got {res_patient.status_code}"
    print(f"  [PASS] RBAC: Patient-role JWT rejected with HTTP 401 ({res_patient.json().get('detail')})")

    # 3. Disallowed staff role (e.g. role: 'billing' / 'guest') -> MUST be REJECTED (403)
    guest_staff_token = create_staff_jwt("guest", hospital_id=test_hosp_id)
    res_guest = client.post(
        f"/api/receptionist/appointments/{app_id}/check-in",
        headers={"Authorization": f"Bearer {guest_staff_token}"}
    )
    assert res_guest.status_code == 403, f"Expected 403 for disallowed role, got {res_guest.status_code}"
    print(f"  [PASS] RBAC: Disallowed role 'guest' rejected with HTTP 403 ({res_guest.json().get('detail')})")

    # 4. Intended authorized staff roles: all MUST SUCCEED (HTTP 200)
    authorized_roles = ["receptionist", "doctor", "nurse", "admin", "superadmin"]
    for role in authorized_roles:
        # Create a fresh appointment for each role check
        res_tmp = client.post("/api/appointments", json={
            "patientName": f"Test Patient for {role}",
            "doctorId": test_doc_id,
            "doctorName": "Dr. Security",
            "hospitalId": test_hosp_id,
            "date": today_str,
            "timeSlot": "11:00 AM - 12:00 PM",
            "type": "In-Person"
        })
        tmp_app_id = res_tmp.json()["id"]

        staff_token = create_staff_jwt(role, hospital_id=test_hosp_id, doctor_id=test_doc_id)
        res_auth = client.post(
            f"/api/receptionist/appointments/{tmp_app_id}/check-in",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert res_auth.status_code == 200, f"Role {role} failed check-in with status {res_auth.status_code}: {res_auth.text}"
        assert res_auth.json().get("success") is True
        print(f"  [PASS] RBAC: Authorized role '{role}' successfully checked in patient (HTTP 200 OK)")


def run_all_tests():
    print("=" * 75)
    print("CarePulse Queue Ordering & RBAC Verification Test Suite")
    print("=" * 75)
    
    print("\n--- 1. Testing Scenarios 1 to 4: Effective Queue Position Calculations ---")
    test_scenario_1_early_arrival()
    test_scenario_2_late_arrival()
    test_scenario_3_walkin_arrival()
    test_scenario_4_merged_queue_ordering()

    print("\n--- 2. Testing Scenario 5: Exclusion & Live Check-In Workflow ---")
    test_scenario_5_unattended_scheduled_excluded_and_then_checked_in()

    print("\n--- 3. Testing Addition 1: Doctor Queue Consistency ---")
    test_doctor_queue_consistency()

    print("\n--- 4. Testing Addition 2: RBAC Scope Rejection & Authorization ---")
    test_rbac_checkin_scope()

    print("\n" + "=" * 75)
    print("ALL 7 TEST SUITES PASSED FLAWLESSLY WITH REAL API & DATABASE BACKEND!")
    print("=" * 75)

if __name__ == "__main__":
    run_all_tests()
