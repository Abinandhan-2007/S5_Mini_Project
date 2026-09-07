import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_doctor_credentials_assignment_and_login():
    # 1. Admin/Receptionist creates a new doctor with custom username & password
    new_doc_payload = {
        "name": "Dr. Sarah Jenkins",
        "specialty": "Cardiologist",
        "department": "Cardiology",
        "experienceYears": 8,
        "consultationFee": 700.0,
        "phone": "+91 98765 43210",
        "email": "sarah.jenkins@carepulse.com",
        "username": "sarah.j",
        "password": "SarahSecret@2026",
        "roomNumber": "Cabin 204",
        "hospital_id": "hosp-bag"
    }

    create_res = client.post("/api/receptionist/doctors", json=new_doc_payload)
    assert create_res.status_code == 200, f"Failed to create doctor: {create_res.text}"
    created_data = create_res.json()
    assert created_data["success"] is True, "Doctor creation returned failure"
    doc_id = created_data["doctor"]["id"]
    staff_code = created_data["doctor"]["staffCode"]

    # 2. Verify doctor list endpoint returns username and credentials for admin/receptionist portal
    list_res = client.get("/api/receptionist/doctors?hospital_id=hosp-bag")
    assert list_res.status_code == 200, f"Failed to list doctors: {list_res.text}"
    doctors = list_res.json().get("doctors", [])
    matched = next((d for d in doctors if d["id"] == doc_id), None)
    assert matched is not None, "Created doctor not found in doctor list"
    assert matched["username"] == "sarah.j", f"Expected username 'sarah.j', got {matched.get('username')}"
    assert matched["password"] == "SarahSecret@2026", f"Expected password 'SarahSecret@2026', got {matched.get('password')}"

    # 3. Test Staff Login with Username
    login_user_res = client.post("/api/staff/login", json={"email": "sarah.j", "password": "SarahSecret@2026"})
    assert login_user_res.status_code == 200, f"Failed username login: {login_user_res.text}"
    user_data = login_user_res.json()
    assert user_data["success"] is True
    assert user_data["staff"]["role"] == "doctor"
    assert user_data["staff"]["doctorId"] == doc_id

    # 4. Test Staff Login with Email
    login_email_res = client.post("/api/staff/login", json={"email": "sarah.jenkins@carepulse.com", "password": "SarahSecret@2026"})
    assert login_email_res.status_code == 200, f"Failed email login: {login_email_res.text}"

    # 5. Test Staff Login with Staff Code
    login_code_res = client.post("/api/staff/login", json={"email": staff_code, "password": "SarahSecret@2026"})
    assert login_code_res.status_code == 200, f"Failed staff code login: {login_code_res.text}"

    # 6. Test Admin updates doctor password
    update_res = client.put(f"/api/admin/doctors/{doc_id}", json={"password": "NewSarahPass@999"})
    assert update_res.status_code == 200, f"Failed to update doctor: {update_res.text}"

    # 7. Verify old password is now rejected
    old_login_res = client.post("/api/staff/login", json={"email": "sarah.j", "password": "SarahSecret@2026"})
    assert old_login_res.status_code == 401, "Old password should have been rejected"

    # 8. Verify new password succeeds
    new_login_res = client.post("/api/staff/login", json={"email": "sarah.j", "password": "NewSarahPass@999"})
    assert new_login_res.status_code == 200, f"Failed new password login: {new_login_res.text}"

    # 9. Clean up test doctor
    del_res = client.delete(f"/api/admin/doctors/{doc_id}")
    assert del_res.status_code == 200, f"Failed to delete test doctor: {del_res.text}"

if __name__ == "__main__":
    test_doctor_credentials_assignment_and_login()
    print("All doctor credentials assignment and login tests passed successfully!")
