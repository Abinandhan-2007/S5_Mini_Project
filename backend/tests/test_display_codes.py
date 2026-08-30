# backend/tests/test_display_codes.py
import sys
import uuid
import re
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
import database
from main import app

client = TestClient(app)

def test_hierarchical_display_codes_and_admin_constraint():
    database.init_db()
    print("\n====================================================================")
    print("CarePulse Hierarchical Display Codes & Business Rule Test Suite")
    print("====================================================================")

    # -------------------------------------------------------------
    # TEST 1: Patient Auto-Code Generation (Format: P000001, P000042)
    # -------------------------------------------------------------
    print("\n--- [TEST 1] Patient Code Auto-Generation (P-prefix) ---")
    random_suffix = uuid.uuid4().hex[:6]
    patient_email = f"test_patient_{random_suffix}@carepulse.com"
    reg_payload = {
        "fullName": f"Test Patient {random_suffix}",
        "email": patient_email,
        "password": "Password123!",
        "phone": f"+91 99999 {random_suffix[:5]}"
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 200, f"Registration failed: {res.text}"
    user_data = res.json().get("user", {})
    pat_code = user_data.get("patient_code") or user_data.get("patientCode")
    print(f" [PASS] Registered patient '{user_data.get('fullName')}' with patient_code: {pat_code}")
    assert pat_code is not None, "patient_code is missing"
    assert pat_code.startswith("P"), f"patient_code {pat_code} does not start with 'P'"
    assert re.match(r"^P\d{6}$", pat_code), f"patient_code {pat_code} is not 'P' followed by 6 digits"

    # -------------------------------------------------------------
    # TEST 2: Patient Lookup by 'P' Display Code
    # -------------------------------------------------------------
    print("\n--- [TEST 2] Patient Display Code Lookup ---")
    lookup_res = client.get(f"/api/admin/patients/lookup/{pat_code}")
    assert lookup_res.status_code == 200, f"Patient lookup failed: {lookup_res.text}"
    lookup_data = lookup_res.json()
    assert lookup_data.get("patient_code") == pat_code
    print(f" [PASS] Successfully looked up patient: {lookup_data.get('fullName')} ({pat_code})")

    # -------------------------------------------------------------
    # TEST 3: Hospital Auto-Code Generation (Format: H001, H002...)
    # -------------------------------------------------------------
    print("\n--- [TEST 3] Hospital Creation & Auto-Code Generation (H-prefix) ---")
    hosp_payload = {
        "name": f"Apex Specialty Hospital {random_suffix}",
        "address": f"{random_suffix} Healthcare Blvd, Sector 4",
        "phone": "+91 80 4455 6677"
    }
    hosp_res = client.post("/api/admin/hospitals", json=hosp_payload)
    assert hosp_res.status_code == 201, f"Hospital creation failed: {hosp_res.text}"
    hosp_data = hosp_res.json().get("hospital", {})
    new_hosp_id = hosp_data.get("id")
    hosp_code = hosp_data.get("hospital_code") or hosp_data.get("hospitalCode")
    print(f" [PASS] Created hospital '{hosp_data.get('name')}' (ID: {new_hosp_id}) with hospital_code: {hosp_code}")
    assert hosp_code is not None, "hospital_code is missing"
    assert hosp_code.startswith("H"), f"hospital_code {hosp_code} does not start with 'H'"
    assert re.match(r"^H\d{3}$", hosp_code), f"hospital_code {hosp_code} does not match H00X pattern"

    # Extract 3-digit hospital number
    hosp_num = hosp_code[1:]

    # -------------------------------------------------------------
    # TEST 4: Create Admin for this Hospital -> Must be A<hosp_num>101
    # -------------------------------------------------------------
    print("\n--- [TEST 4] Hospital Admin Creation (Format: A<hosp>101) ---")
    admin_payload = {
        "full_name": f"Admin Leader {random_suffix}",
        "email": f"admin_{random_suffix}@carepulse.com",
        "role": "admin",
        "hospital_id": new_hosp_id,
        "specialization": "Hospital Administration"
    }
    admin_res = client.post("/api/admin/staff", json=admin_payload)
    assert admin_res.status_code == 201, f"Admin creation failed: {admin_res.text}"
    admin_data = admin_res.json().get("staff", {})
    admin_code = admin_data.get("staff_code") or admin_data.get("staffCode")
    expected_admin_code = f"A{hosp_num}101"
    print(f" [PASS] Created Admin: '{admin_data.get('full_name')}' with code: {admin_code} (Expected: {expected_admin_code})")
    assert admin_code == expected_admin_code, f"Expected {expected_admin_code}, got {admin_code}"

    # -------------------------------------------------------------
    # TEST 5: Business Rule - Reject Second Active Admin for Same Hospital
    # -------------------------------------------------------------
    print("\n--- [TEST 5] Business Rule: Reject 2nd Active Admin for Same Hospital ---")
    duplicate_admin_payload = {
        "full_name": f"Duplicate Admin {random_suffix}",
        "email": f"second_admin_{random_suffix}@carepulse.com",
        "role": "admin",
        "hospital_id": new_hosp_id
    }
    dup_res = client.post("/api/admin/staff", json=duplicate_admin_payload)
    print(f" Duplicate Admin Response Status: {dup_res.status_code}")
    print(f" Duplicate Admin Response Body: {dup_res.text}")
    assert dup_res.status_code == 400, f"Expected 400 Bad Request, got {dup_res.status_code}"
    dup_error_detail = dup_res.json().get("detail", "")
    assert "one admin" in dup_error_detail.lower() or "active administrator" in dup_error_detail.lower(), \
        f"Unexpected error detail: {dup_error_detail}"
    print(f" [PASS] Duplicate Admin correctly rejected with friendly message: '{dup_error_detail}'")

    # -------------------------------------------------------------
    # TEST 6: Create 2 Doctors for this Hospital -> D<hosp>101, D<hosp>102
    # -------------------------------------------------------------
    print("\n--- [TEST 6] Doctor Creation & Sequential Staff Codes (D<hosp>101, D<hosp>102) ---")
    doc1_payload = {
        "full_name": f"Dr. First Physician {random_suffix}",
        "email": f"doc1_{random_suffix}@carepulse.com",
        "role": "doctor",
        "hospital_id": new_hosp_id,
        "specialization": "Cardiology"
    }
    doc1_res = client.post("/api/admin/staff", json=doc1_payload)
    assert doc1_res.status_code == 201, f"Doctor 1 creation failed: {doc1_res.text}"
    doc1_code = doc1_res.json().get("staff", {}).get("staff_code")
    expected_doc1_code = f"D{hosp_num}101"
    print(f" [PASS] Doctor 1 code: {doc1_code} (Expected: {expected_doc1_code})")
    assert doc1_code == expected_doc1_code, f"Expected {expected_doc1_code}, got {doc1_code}"

    doc2_payload = {
        "full_name": f"Dr. Second Physician {random_suffix}",
        "email": f"doc2_{random_suffix}@carepulse.com",
        "role": "doctor",
        "hospital_id": new_hosp_id,
        "specialization": "Neurology"
    }
    doc2_res = client.post("/api/admin/staff", json=doc2_payload)
    assert doc2_res.status_code == 201, f"Doctor 2 creation failed: {doc2_res.text}"
    doc2_code = doc2_res.json().get("staff", {}).get("staff_code")
    expected_doc2_code = f"D{hosp_num}102"
    print(f" [PASS] Doctor 2 code: {doc2_code} (Expected: {expected_doc2_code})")
    assert doc2_code == expected_doc2_code, f"Expected {expected_doc2_code}, got {doc2_code}"

    # -------------------------------------------------------------
    # TEST 7: Create 2 Receptionists for this Hospital -> R<hosp>101, R<hosp>102
    # -------------------------------------------------------------
    print("\n--- [TEST 7] Receptionist Creation & Sequential Staff Codes (R<hosp>101, R<hosp>102) ---")
    rec1_payload = {
        "full_name": f"Receptionist Alpha {random_suffix}",
        "email": f"rec1_{random_suffix}@carepulse.com",
        "role": "receptionist",
        "hospital_id": new_hosp_id,
        "specialization": "Front Desk A"
    }
    rec1_res = client.post("/api/admin/staff", json=rec1_payload)
    assert rec1_res.status_code == 201, f"Receptionist 1 creation failed: {rec1_res.text}"
    rec1_code = rec1_res.json().get("staff", {}).get("staff_code")
    expected_rec1_code = f"R{hosp_num}101"
    print(f" [PASS] Receptionist 1 code: {rec1_code} (Expected: {expected_rec1_code})")
    assert rec1_code == expected_rec1_code, f"Expected {expected_rec1_code}, got {rec1_code}"

    rec2_payload = {
        "full_name": f"Receptionist Beta {random_suffix}",
        "email": f"rec2_{random_suffix}@carepulse.com",
        "role": "receptionist",
        "hospital_id": new_hosp_id,
        "specialization": "Front Desk B"
    }
    rec2_res = client.post("/api/admin/staff", json=rec2_payload)
    assert rec2_res.status_code == 201, f"Receptionist 2 creation failed: {rec2_res.text}"
    rec2_code = rec2_res.json().get("staff", {}).get("staff_code")
    expected_rec2_code = f"R{hosp_num}102"
    print(f" [PASS] Receptionist 2 code: {rec2_code} (Expected: {expected_rec2_code})")
    assert rec2_code == expected_rec2_code, f"Expected {expected_rec2_code}, got {rec2_code}"

    # -------------------------------------------------------------
    # TEST 8: Staff Code Lookup Endpoint
    # -------------------------------------------------------------
    print("\n--- [TEST 8] Staff Display Code Lookup ---")
    stf_lookup_res = client.get(f"/api/admin/staff/lookup/{doc2_code}")
    assert stf_lookup_res.status_code == 200, f"Staff lookup failed: {stf_lookup_res.text}"
    stf_lookup_data = stf_lookup_res.json()
    assert stf_lookup_data.get("staff_code") == doc2_code
    print(f" [PASS] Successfully looked up staff: {stf_lookup_data.get('name')} ({doc2_code})")

    # -------------------------------------------------------------
    # TEST 9: 404 for Non-Existent Codes
    # -------------------------------------------------------------
    print("\n--- [TEST 9] Non-Existent Code Validation ---")
    pat_404 = client.get("/api/admin/patients/lookup/P999999")
    assert pat_404.status_code == 404
    print(" [PASS] P999999 returned 404")

    stf_404 = client.get("/api/admin/staff/lookup/A999999")
    assert stf_404.status_code == 404
    print(" [PASS] A999999 returned 404")

    print("\n====================================================================")
    print("ALL TESTS PASSED WITH 100% SUCCESS!")
    print("====================================================================")

if __name__ == "__main__":
    test_hierarchical_display_codes_and_admin_constraint()
