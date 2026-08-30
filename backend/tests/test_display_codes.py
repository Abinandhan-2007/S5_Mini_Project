# backend/tests/test_display_codes.py
import sys
import uuid
from pathlib import Path

# Ensure backend dir is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
import database
from main import app
from routes.staff_auth import create_jwt

client = TestClient(app)

def test_display_codes():
    print("\n--- [TEST 1] Testing Patient Code Auto-Generation on Register ---")
    random_suffix = uuid.uuid4().hex[:8]
    test_email = f"test_pat_{random_suffix}@example.com"
    reg_payload = {
        "fullName": f"Test Patient {random_suffix}",
        "email": test_email,
        "password": "Password123!",
        "phone": f"+91 99999 {random_suffix[:5]}"
    }

    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 200, f"Registration failed: {res.text}"
    data = res.json()
    user = data.get("user", {})
    pat_code = user.get("patient_code") or user.get("patientCode")
    print(f"Registered patient ID: {user.get('id')}, patient_code: {pat_code}")
    assert pat_code is not None, "patient_code is missing in registration response"
    assert pat_code.startswith("PAT-"), f"patient_code {pat_code} does not start with PAT-"

    print("\n--- [TEST 2] Testing Patient Code Lookup by Display Code ---")
    lookup_res = client.get(f"/api/admin/patients/lookup/{pat_code}")
    assert lookup_res.status_code == 200, f"Patient lookup failed: {lookup_res.text}"
    lookup_data = lookup_res.json()
    assert lookup_data.get("email") == test_email
    assert lookup_data.get("patient_code") == pat_code
    print(f"Successfully looked up patient: {lookup_data.get('fullName')} ({lookup_data.get('patient_code')})")

    print("\n--- [TEST 3] Testing Receptionist Staff Code Auto-Generation & Creation ---")
    rec_email = f"rec_{random_suffix}@carepulse.com"
    rec_payload = {
        "name": f"Receptionist {random_suffix}",
        "email": rec_email,
        "password": "recPassword123!",
        "department": "Front Desk A",
        "phone": "+91 98888 11111"
    }
    rec_res = client.post("/api/admin/receptionists", json=rec_payload)
    assert rec_res.status_code == 201, f"Receptionist creation failed: {rec_res.text}"
    rec_data = rec_res.json().get("receptionist", {})
    stf_code = rec_data.get("staff_code") or rec_data.get("staffCode")
    print(f"Created receptionist ID: {rec_data.get('id')}, staff_code: {stf_code}")
    assert stf_code is not None, "staff_code is missing in receptionist response"
    assert stf_code.startswith("REC-"), f"staff_code {stf_code} does not start with REC-"

    print("\n--- [TEST 4] Testing Staff Code Lookup by Display Code ---")
    stf_lookup_res = client.get(f"/api/admin/staff/lookup/{stf_code}")
    assert stf_lookup_res.status_code == 200, f"Staff lookup failed: {stf_lookup_res.text}"
    stf_lookup_data = stf_lookup_res.json()
    assert stf_lookup_data.get("email") == rec_email
    assert stf_lookup_data.get("staff_code") == stf_code
    print(f"Successfully looked up staff: {stf_lookup_data.get('name')} ({stf_lookup_data.get('staff_code')})")

    print("\n--- [TEST 5] Testing Non-Existent Codes Return 404 ---")
    pat_404 = client.get("/api/admin/patients/lookup/PAT-999999")
    assert pat_404.status_code == 404, f"Expected 404 for PAT-999999, got {pat_404.status_code}"
    print("Non-existent patient code correctly returned 404")

    stf_404 = client.get("/api/admin/staff/lookup/ADM-9999")
    assert stf_404.status_code == 404, f"Expected 404 for ADM-9999, got {stf_404.status_code}"
    print("Non-existent staff code correctly returned 404")

    print("\n[ALL TESTS PASSED SUCCESSFULLY!]")

if __name__ == "__main__":
    test_display_codes()
