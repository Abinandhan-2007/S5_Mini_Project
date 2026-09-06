# scratch/test_superadmin_api.py
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import database
database.init_db()

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("==================================================")
    print(" RUNNING SUPERADMIN ENDPOINT & CONSTRAINTS TESTS")
    print("==================================================")

    # 1. SuperAdmin Login
    print("\n[TEST 1] Testing /api/superadmin/login...")
    resp = client.post("/api/superadmin/login", json={
        "email": "superadmin@carepulse.com",
        "password": "SuperAdmin@123"
    })
    print(f"Status: {resp.status_code}")
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    token = data["token"]
    staff = data["staff"]
    print(f"Staff: name={staff['name']}, role={staff['role']}, code={staff['staff_code']}, hospital_id={staff['hospital_id']}")
    assert staff["role"] == "superadmin"
    assert staff["staff_code"] == "SA101"
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Stats
    print("\n[TEST 2] Testing /api/superadmin/stats...")
    resp = client.get("/api/superadmin/stats", headers=headers)
    print(f"Status: {resp.status_code}")
    assert resp.status_code == 200, f"Stats failed: {resp.text}"
    stats = resp.json()["stats"]
    print(f"Stats summary: {stats}")

    # 3. Hospitals list
    print("\n[TEST 3] Testing /api/superadmin/hospitals...")
    resp = client.get("/api/superadmin/hospitals", headers=headers)
    print(f"Status: {resp.status_code}")
    assert resp.status_code == 200
    hospitals = resp.json()["hospitals"]
    print(f"Total hospitals returned: {len(hospitals)}")

    # 4. Create New Hospital
    test_hosp_name = "Apex Medical Institute"
    print(f"\n[TEST 4] Creating new hospital '{test_hosp_name}'...")
    resp = client.post("/api/superadmin/hospitals", headers=headers, json={
        "name": test_hosp_name,
        "address": "450 Health Parkway, Sector 9",
        "phone": "+1-800-444-0199",
        "email": "contact@apexmedical.org",
        "facility_type": "Specialty Research Hospital",
        "specialties": ["Cardiology", "Neurology", "Emergency Care"]
    })
    print(f"Status: {resp.status_code}")
    if resp.status_code == 400 and "already exists" in resp.text:
        print("Hospital already exists from previous run, finding it...")
        resp2 = client.get("/api/superadmin/hospitals", headers=headers)
        new_hosp = next(h for h in resp2.json()["hospitals"] if h["name"] == test_hosp_name)
    else:
        assert resp.status_code == 200, f"Hospital creation failed: {resp.text}"
        new_hosp = resp.json()["hospital"]

    print(f"[OK] Hospital details: ID={new_hosp['id']}, Code={new_hosp['hospital_code']}, Name={new_hosp['name']}")
    hosp_id = new_hosp["id"]
    hosp_code = new_hosp["hospital_code"]

    # 5. Create First Admin for this hospital
    test_admin_email = f"admin.{hosp_code.lower()}@carepulse.com"
    print(f"\n[TEST 5] Creating first Administrator for hospital ({hosp_code}) with email {test_admin_email}...")
    resp = client.post("/api/superadmin/admins", headers=headers, json={
        "full_name": "Dr. Sarah Apex",
        "email": test_admin_email,
        "password": "ApexAdmin@123",
        "hospital_id": hosp_id,
        "phone": "+1-800-444-0101",
        "department": "Chief Medical Operations"
    })
    print(f"Status: {resp.status_code}")
    if resp.status_code == 400 and "already has an active administrator" in resp.text:
        print("[NOTE] Admin already created in earlier run.")
    else:
        assert resp.status_code == 200, f"Admin creation failed: {resp.text}"
        admin_data = resp.json()["admin"]
        print(f"[OK] Admin Created: Code={admin_data['staff_code']}, Name={admin_data['full_name']}, Hospital={admin_data['hospital_name']}")

    # 6. Attempt to Create a SECOND Admin for the SAME Hospital (MUST BE REJECTED)
    print(f"\n[TEST 6] Attempting to create a SECOND Administrator for the same hospital {hosp_code} (Should fail with 400)...")
    resp = client.post("/api/superadmin/admins", headers=headers, json={
        "full_name": "Dr. Robert Duplicate",
        "email": f"duplicate.{hosp_code.lower()}@carepulse.com",
        "password": "Duplicate@123",
        "hospital_id": hosp_id,
        "phone": "+1-800-444-0102",
        "department": "Vice Administration"
    })
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")
    assert resp.status_code == 400, f"Expected 400 rejection for duplicate admin, got {resp.status_code}"
    assert "already has an active administrator" in resp.text, "Error message should explain one active admin rule"
    print("[SUCCESS] Second active administrator strictly rejected by business rule!")

    # 7. Test Login with the newly created Admin
    print(f"\n[TEST 7] Testing login with newly created Administrator ({test_admin_email})...")
    resp = client.post("/api/staff/login", json={
        "email": test_admin_email,
        "password": "ApexAdmin@123"
    })
    print(f"Status: {resp.status_code}")
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    admin_auth = resp.json()
    print(f"[OK] Admin Logged In: Code={admin_auth['staff']['staff_code']}, Hospital ID={admin_auth['staff']['hospital_id']}")
    assert admin_auth["staff"]["hospital_id"] == hosp_id

    print("\n==================================================")
    print(" ALL SUPERADMIN BACKEND TESTS PASSED SUCCESSFULLY! ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
