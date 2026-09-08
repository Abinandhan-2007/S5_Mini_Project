import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

import uuid

def test_receptionist_password_crud():
    unique_email = f"rachel.{uuid.uuid4().hex[:6]}@carepulse.com"
    payload = {
        "name": "Rachel Zane",
        "email": unique_email,
        "password": "RachelPass@2026",
        "phone": "+91 98765 11223",
        "department": "Main Reception",
        "deskNumber": "Desk A-1",
        "shift": "Morning",
        "hospital_id": "hosp-bag"
    }

    create_res = client.post("/api/admin/receptionists", json=payload)
    assert create_res.status_code in [200, 201], f"Failed to create receptionist: {create_res.text}"
    rec_id = create_res.json().get("receptionist", {}).get("id")

    try:
        # 2. Verify login with the created password (using email)
        login_res = client.post("/api/staff/login", json={"email": unique_email, "password": "RachelPass@2026"})
        assert login_res.status_code == 200, f"Failed to login: {login_res.text}"

        # 3. Update password via admin
        update_res = client.put(f"/api/admin/receptionists/{rec_id}", json={"password": "NewRachelPass@2026"})
        assert update_res.status_code == 200, f"Failed to update receptionist: {update_res.text}"

        # 4. Verify login with updated password
        old_login_res = client.post("/api/staff/login", json={"email": unique_email, "password": "RachelPass@2026"})
        assert old_login_res.status_code == 401

        new_login_res = client.post("/api/staff/login", json={"email": unique_email, "password": "NewRachelPass@2026"})
        assert new_login_res.status_code == 200
    finally:
        # 5. Clean up
        if rec_id:
            client.delete(f"/api/admin/receptionists/{rec_id}")
    print("[SUCCESS] Receptionist password CRUD test PASSED!")

if __name__ == "__main__":
    test_receptionist_password_crud()
