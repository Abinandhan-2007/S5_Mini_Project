import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_receptionist_password_crud():
    # 1. Create a receptionist with custom password
    payload = {
        "name": "Rachel Zane",
        "email": "rachel.zane@carepulse.com",
        "password": "RachelPass@2026",
        "phone": "+91 98765 11223",
        "department": "Main Reception",
        "deskNumber": "Desk A-1",
        "shift": "Morning",
        "hospital_id": "hosp-bag"
    }

    create_res = client.post("/api/admin/receptionists", json=payload)
    assert create_res.status_code == 200, f"Failed to create receptionist: {create_res.text}"
    rec_id = create_res.json().get("receptionist", {}).get("id")

    # 2. Verify login with the created password
    login_res = client.post("/api/staff/login", json={"email": "rachel.zane@carepulse.com", "password": "RachelPass@2026"})
    assert login_res.status_code == 200, f"Failed to login: {login_res.text}"

    # 3. Update password via admin
    update_res = client.put(f"/api/admin/receptionists/{rec_id}", json={"password": "NewRachelPass@2026"})
    assert update_res.status_code == 200, f"Failed to update receptionist: {update_res.text}"

    # 4. Verify login with updated password
    old_login_res = client.post("/api/staff/login", json={"email": "rachel.zane@carepulse.com", "password": "RachelPass@2026"})
    assert old_login_res.status_code == 401

    new_login_res = client.post("/api/staff/login", json={"email": "rachel.zane@carepulse.com", "password": "NewRachelPass@2026"})
    assert new_login_res.status_code == 200

    # 5. Clean up
    del_res = client.delete(f"/api/admin/receptionists/{rec_id}")
    assert del_res.status_code == 200
    print("Receptionist password CRUD test PASSED!")

if __name__ == "__main__":
    test_receptionist_password_crud()
