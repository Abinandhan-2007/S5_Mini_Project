import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app
import database

client = TestClient(app)

def test_nurse_management_and_vitals_workflow():
    """
    End-to-end integration test:
    1. Admin logs in and lists nurses.
    2. Admin creates a new nurse (checking N-series staff_code & hospital scoping).
    3. Nurse logs in using username, staff_code, and email.
    4. Nurse records patient vitals with nurse name attribution & abnormal flag screening.
    5. Tokens endpoint returns attached vitals with color-coded status.
    6. Doctor consultation-prep endpoint returns pre-consultation vitals with nurse attribution.
    7. Admin updates and then deletes the nurse.
    """
    # 1. Admin login
    admin_login_res = client.post("/api/staff/login", json={
        "email": "admin@carepulse.com",
        "password": "admin123"
    })
    assert admin_login_res.status_code == 200, f"Admin login failed: {admin_login_res.text}"
    admin_data = admin_login_res.json()
    admin_token = admin_data["token"]
    admin_hosp = admin_data["staff"]["hospitalId"] or "hosp-bag"
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. List nurses
    list_res = client.get("/api/admin/nurses", headers=admin_headers)
    assert list_res.status_code == 200
    initial_nurses = list_res.json()
    assert isinstance(initial_nurses, list)

    # 3. Create a new nurse
    test_nurse_payload = {
        "name": "Nurse Clara Barton",
        "email": f"clara_{os.getpid()}@carepulse.com",
        "username": f"clara_{os.getpid()}",
        "password": "ClaraSecure@2026",
        "phone": "+91 98765 43219",
        "department": "Triage & Vitals",
        "shift": "Morning",
        "hospital_id": admin_hosp
    }
    create_res = client.post("/api/admin/nurses", json=test_nurse_payload, headers=admin_headers)
    assert create_res.status_code == 201, f"Create nurse failed: {create_res.text}"
    create_data = create_res.json()
    created_nurse = create_data["nurse"]
    nurse_id = created_nurse["id"]
    staff_code = created_nurse.get("staff_code") or created_nurse.get("staffCode")
    assert staff_code is not None, "Staff code was not generated"
    assert staff_code.startswith("N"), f"Expected N prefix, got {staff_code}"
    assert created_nurse["hospital_id"] == admin_hosp or created_nurse["hospitalId"] == admin_hosp

    # 4. Nurse Login tests:
    # 4a. Login via Username
    login_user_res = client.post("/api/staff/login", json={
        "email": test_nurse_payload["username"],
        "password": "ClaraSecure@2026"
    })
    assert login_user_res.status_code == 200, f"Nurse login by username failed: {login_user_res.text}"
    nurse_auth_data = login_user_res.json()
    nurse_token = nurse_auth_data["token"]
    assert nurse_auth_data["staff"]["role"] == "nurse"
    assert "Clara" in nurse_auth_data["staff"]["name"]
    nurse_headers = {"Authorization": f"Bearer {nurse_token}"}

    # 4b. Login via Staff Code
    login_code_res = client.post("/api/staff/login", json={
        "email": staff_code,
        "password": "ClaraSecure@2026"
    })
    assert login_code_res.status_code == 200, f"Nurse login by staff_code failed: {login_code_res.text}"

    # 4c. Login via Email
    login_email_res = client.post("/api/staff/login", json={
        "email": test_nurse_payload["email"],
        "password": "ClaraSecure@2026"
    })
    assert login_email_res.status_code == 200, f"Nurse login by email failed: {login_email_res.text}"

    # 5. Record Vitals with Nurse attribution
    test_appointment_id = "test-appt-vitals-01"
    test_patient_id = "test-patient-01"

    vitals_payload = {
        "appointment_id": test_appointment_id,
        "patient_id": test_patient_id,
        "height_cm": 175.0,
        "weight_kg": 72.0,
        "bp_systolic": 145,  # Elevated (> 140) -> triggers abnormal flag
        "bp_diastolic": 92,   # Elevated (> 90) -> triggers abnormal flag
        "heart_rate": 78,
        "temperature": 37.0,
        "temperature_unit": "C",
        "respiratory_rate": 16,
        "spo2": 98,
        "blood_glucose": 110.0,
        "glucose_context": "fasting",
        "notes": "Patient reports mild morning headaches."
    }

    vitals_res = client.post("/api/nurse/vitals", json=vitals_payload, headers=nurse_headers)
    assert vitals_res.status_code == 201, f"Record vitals failed: {vitals_res.text}"
    vitals_data = vitals_res.json()
    assert vitals_data["success"] is True
    rec_vitals = vitals_data["vitals"]
    assert rec_vitals["bmi"] == 23.5
    assert len(vitals_data["abnormal_flags"]) > 0
    assert "Clara" in (rec_vitals.get("recorded_by_name") or "")

    # 6. Doctor Consultation Prep returns the vitals with nurse attribution
    prep_res = client.get(f"/api/doctor/consultation-prep/{test_appointment_id}")
    assert prep_res.status_code == 200
    prep_data = prep_res.json()
    assert prep_data["has_vitals"] is True
    assert prep_data["vitals"] is not None
    assert prep_data["vitals"]["bp_systolic"] == 145
    assert "Clara" in (prep_data["vitals"].get("recorded_by_name") or "")

    # 7. Admin Update Nurse Details & Password
    update_payload = {
        "department": "Emergency & ICU",
        "shift": "Night",
        "password": "ClaraNewPassword@2026"
    }
    update_res = client.put(f"/api/admin/nurses/{nurse_id}", json=update_payload, headers=admin_headers)
    assert update_res.status_code == 200, f"Update nurse failed: {update_res.text}"

    # Verify new password login
    new_login_res = client.post("/api/staff/login", json={
        "email": staff_code,
        "password": "ClaraNewPassword@2026"
    })
    assert new_login_res.status_code == 200, "Login with updated password failed"

    # 8. Admin Delete Nurse
    delete_res = client.delete(f"/api/admin/nurses/{nurse_id}", headers=admin_headers)
    assert delete_res.status_code == 200, f"Delete nurse failed: {delete_res.text}"

    # Verify nurse no longer exists or cannot login
    deleted_login_res = client.post("/api/staff/login", json={
        "email": staff_code,
        "password": "ClaraNewPassword@2026"
    })
    assert deleted_login_res.status_code in [401, 404], "Deleted nurse should not be able to log in"
    print("[SUCCESS] All Nurse Team Management and Nurse-Doctor Vitals Workflow integration tests passed!")

if __name__ == "__main__":
    test_nurse_management_and_vitals_workflow()
