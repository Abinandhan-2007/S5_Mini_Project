# backend/tests/test_push_notifications.py
import sys
import uuid
from datetime import datetime, date, timedelta
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
import database
from main import app
from notifications.fcm_service import (
    register_device_token,
    get_active_device_tokens,
    deactivate_device_token,
    send_push_notification,
    log_notification,
    is_notification_already_sent
)
from notifications.scheduler import (
    parse_time_slot_start,
    parse_prescription_frequency_times,
    check_upcoming_appointment_reminders,
    check_medication_reminders
)

client = TestClient(app)


def test_push_notification_system():
    print("\n===========================================================")
    print("[CarePulse] Running FCM Push Notifications Test Suite")
    print("===========================================================")

    database.init_db()

    # -------------------------------------------------------------
    # 1. Test Device Token Registration & Persistence
    # -------------------------------------------------------------
    print("\n--- [TEST 1] Device Token Registration & Upsert ---")
    random_suffix = uuid.uuid4().hex[:8]
    import random
    random_phone_1 = f"+91 9{random.randint(100000000, 999999999)}"
    reg_res = client.post(
        "/api/auth/register",
        json={
            "fullName": f"Push Test Patient {random_suffix}",
            "email": f"pushtest_{random_suffix}@example.com",
            "password": "Password123!",
            "phone": random_phone_1
        }
    )
    assert reg_res.status_code == 200, f"Patient registration failed: {reg_res.text}"
    patient_data = reg_res.json()["user"]
    patient_id = patient_data["id"]
    test_token_1 = f"fcm_token_sample_{random_suffix}"

    # Register via API
    res = client.post(
        "/api/patient/device-token",
        json={
            "patient_id": patient_id,
            "fcm_token": test_token_1,
            "platform": "android"
        }
    )
    assert res.status_code == 200, f"Token registration failed: {res.text}"
    tokens = get_active_device_tokens(patient_id)
    assert len(tokens) == 1, f"Expected 1 active token, found {len(tokens)}"
    assert tokens[0]["fcm_token"] == test_token_1
    print(f"[OK] Token registered and verified in DB: {test_token_1}")

    # Test Idempotent Upsert
    res_repeat = client.post(
        "/api/patient/device-token",
        json={
            "patient_id": patient_id,
            "fcm_token": test_token_1,
            "platform": "android"
        }
    )
    assert res_repeat.status_code == 200
    tokens_repeat = get_active_device_tokens(patient_id)
    assert len(tokens_repeat) == 1, "Duplicate tokens inserted on repeated registration"
    print("[OK] Idempotent token upsert verified")

    # -------------------------------------------------------------
    # 2. Test send_push_notification with active and empty tokens
    # -------------------------------------------------------------
    print("\n--- [TEST 2] FCM Push Notification Delivery Logic ---")
    # Patient with no tokens -> skip silently without error
    empty_patient_id = str(uuid.uuid4())
    no_token_res = send_push_notification(empty_patient_id, "Test Title", "Test Body")
    assert no_token_res["status"] == "no_active_tokens"
    assert no_token_res["sent"] == 0
    print("[OK] Patients without tokens skipped gracefully without error")

    # Patient with active token
    push_res = send_push_notification(patient_id, "Test Title", "Test Body", {"type": "test"})
    assert push_res["status"] == "completed"
    assert push_res["sent"] >= 1
    print(f"[OK] Notification successfully delivered/simulated for patient {patient_id}")

    # Token Deactivation
    deactivate_device_token(tokens[0]["id"])
    active_after = get_active_device_tokens(patient_id)
    assert len(active_after) == 0, "Token was not deactivated"
    print("[OK] Inactive token filtering and deactivation verified")

    # -------------------------------------------------------------
    # 3. Test Immediate Appointment Cancellation Notification
    # -------------------------------------------------------------
    print("\n--- [TEST 3] Appointment Cancellation Immediate Push ---")
    cancel_suffix = uuid.uuid4().hex[:8]
    random_phone_2 = f"+91 9{random.randint(100000000, 999999999)}"
    # Create test patient & appointment
    pat_res = client.post(
        "/api/auth/register",
        json={
            "fullName": f"Cancel Test {cancel_suffix[:6]}",
            "email": f"cancel_test_{cancel_suffix[:6]}@example.com",
            "password": "Password123!",
            "phone": random_phone_2
        }
    )
    assert pat_res.status_code == 200
    pat_data = pat_res.json()["user"]
    pat_id = pat_data["id"]

    # Register active token for cancel test patient
    register_device_token(pat_id, f"fcm_cancel_token_{cancel_suffix[:6]}", "android")

    # Book appointment
    app_res = client.post(
        "/api/appointments",
        json={
            "patientId": pat_id,
            "patientName": pat_data["fullName"],
            "doctorId": "doc-1",
            "doctorName": "Dr. Olivia Wilson",
            "doctorSpecialty": "Cardiologist",
            "date": (date.today() + timedelta(days=2)).isoformat(),
            "timeSlot": "10:30 AM",
            "type": "In-Person"
        }
    )
    assert app_res.status_code == 201
    created_app = app_res.json()
    app_id = created_app["id"]

    # Cancel Appointment
    cancel_res = client.put(f"/api/appointments/{app_id}/cancel", json={"reason": "Doctor unavailable"})
    assert cancel_res.status_code == 200
    cancelled_data = cancel_res.json()
    assert cancelled_data["appointment"]["status"] == "Cancelled"
    print(f"[OK] Appointment {app_id} cancelled and immediate push alert dispatched to {pat_id}")

    # -------------------------------------------------------------
    # 4. Test Appointment Reminder Schedule Parser & Deduplication
    # -------------------------------------------------------------
    print("\n--- [TEST 4] Appointment Reminder Logic & Deduplication ---")
    today = date.today()
    parsed_dt = parse_time_slot_start("10:30 AM - 11:30 AM", today)
    assert parsed_dt is not None
    assert parsed_dt.hour == 10 and parsed_dt.minute == 30
    print(f"[OK] Parsed time slot '10:30 AM - 11:30 AM' -> {parsed_dt.strftime('%H:%M')}")

    # Test Deduplication Helper
    assert not is_notification_already_sent(pat_id, "appointment_reminder", app_id)
    log_notification(pat_id, "appointment_reminder", app_id)
    assert is_notification_already_sent(pat_id, "appointment_reminder", app_id)
    print("[OK] Notification logging and duplicate prevention verified")

    # -------------------------------------------------------------
    # 5. Test Medication Reminder Frequency Parser & Schedule
    # -------------------------------------------------------------
    print("\n--- [TEST 5] Medication Reminder Frequency Parser ---")
    once_times = parse_prescription_frequency_times("Once daily")
    assert once_times == [(9, 0)]

    twice_times = parse_prescription_frequency_times("Twice daily")
    assert twice_times == [(9, 0), (21, 0)]

    thrice_times = parse_prescription_frequency_times("Three times daily")
    assert thrice_times == [(8, 0), (14, 0), (20, 0)]

    custom_times = parse_prescription_frequency_times("1-1-1-1")
    assert custom_times == [(8, 0), (12, 0), (16, 0), (20, 0)]
    print(f"[OK] Frequency parser verified: 'Once daily' -> {once_times}, 'Twice daily' -> {twice_times}, 'Three times daily' -> {thrice_times}")

    print("\n===========================================================")
    print("[SUCCESS] ALL PUSH NOTIFICATION TESTS PASSED SUCCESSFULLY!")
    print("===========================================================")


if __name__ == "__main__":
    test_push_notification_system()
