import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_staff_dual_login():
    """Verify that all staff roles can log in using either Username or Email."""

    # 1. Admin Login (Username 'admin' and Email 'admin@carepulse.com')
    res_admin_user = client.post("/api/staff/login", json={"username": "admin", "password": "admin123"})
    assert res_admin_user.status_code == 200, f"Failed Admin username login: {res_admin_user.text}"
    assert res_admin_user.json()["staff"]["role"] == "admin"

    res_admin_email = client.post("/api/staff/login", json={"email": "admin@carepulse.com", "password": "admin123"})
    assert res_admin_email.status_code == 200, f"Failed Admin email login: {res_admin_email.text}"
    assert res_admin_email.json()["staff"]["role"] == "admin"

    # 2. BAG Admin Login (Username 'bag' and Email 'bag@carepulse.com')
    res_bag_user = client.post("/api/staff/login", json={"username": "bag", "password": "bitsathy"})
    assert res_bag_user.status_code == 200, f"Failed BAG Admin username login: {res_bag_user.text}"
    assert res_bag_user.json()["staff"]["hospital_id"] == "hosp-bag"

    res_bag_email = client.post("/api/staff/login", json={"email": "bag@carepulse.com", "password": "bitsathy"})
    assert res_bag_email.status_code == 200, f"Failed BAG Admin email login: {res_bag_email.text}"
    assert res_bag_email.json()["staff"]["hospital_id"] == "hosp-bag"

    # 3. SuperAdmin Login (via /api/staff/login and /api/superadmin/login)
    res_sa_user = client.post("/api/staff/login", json={"username": "superadmin", "password": "SuperAdmin@123"})
    assert res_sa_user.status_code == 200, f"Failed SuperAdmin username staff login: {res_sa_user.text}"
    assert res_sa_user.json()["staff"]["role"] == "superadmin"

    res_sa_email = client.post("/api/staff/login", json={"email": "superadmin@carepulse.com", "password": "SuperAdmin@123"})
    assert res_sa_email.status_code == 200, f"Failed SuperAdmin email staff login: {res_sa_email.text}"
    assert res_sa_email.json()["staff"]["role"] == "superadmin"

    # Dedicated superadmin endpoint
    res_sa_direct_user = client.post("/api/superadmin/login", json={"username": "superadmin", "password": "SuperAdmin@123"})
    assert res_sa_direct_user.status_code == 200, f"Failed direct SuperAdmin username login: {res_sa_direct_user.text}"
    assert res_sa_direct_user.json()["staff"]["role"] == "superadmin"

    res_sa_direct_email = client.post("/api/superadmin/login", json={"email": "superadmin@carepulse.com", "password": "SuperAdmin@123"})
    assert res_sa_direct_email.status_code == 200, f"Failed direct SuperAdmin email login: {res_sa_direct_email.text}"
    assert res_sa_direct_email.json()["staff"]["role"] == "superadmin"

    # 4. Nurse Login (Username 'nurse' and Email 'nurse@carepulse.com')
    res_nurse_user = client.post("/api/staff/login", json={"username": "nurse", "password": "Nurse@123"})
    assert res_nurse_user.status_code == 200, f"Failed Nurse username login: {res_nurse_user.text}"
    assert res_nurse_user.json()["staff"]["role"] == "nurse"

    res_nurse_email = client.post("/api/staff/login", json={"email": "nurse@carepulse.com", "password": "Nurse@123"})
    assert res_nurse_email.status_code == 200, f"Failed Nurse email login: {res_nurse_email.text}"
    assert res_nurse_email.json()["staff"]["role"] == "nurse"

    # 5. Doctor Login (Username 'doc' and Email 'doc@carepulse.com')
    res_doc_user = client.post("/api/staff/login", json={"username": "doc", "password": "doc123"})
    assert res_doc_user.status_code == 200, f"Failed Doctor username login: {res_doc_user.text}"
    assert res_doc_user.json()["staff"]["role"] == "doctor"

    res_doc_email = client.post("/api/staff/login", json={"email": "doc@carepulse.com", "password": "doc123"})
    assert res_doc_email.status_code == 200, f"Failed Doctor email login: {res_doc_email.text}"
    assert res_doc_email.json()["staff"]["role"] == "doctor"

    # 6. Receptionist Login (Username 'rec' and Email 'rec@carepulse.com')
    res_rec_user = client.post("/api/staff/login", json={"username": "rec", "password": "password123"})
    assert res_rec_user.status_code == 200, f"Failed Receptionist username login: {res_rec_user.text}"
    assert res_rec_user.json()["staff"]["role"] == "receptionist"

    res_rec_email = client.post("/api/staff/login", json={"email": "rec@carepulse.com", "password": "password123"})
    assert res_rec_email.status_code == 200, f"Failed Receptionist email login: {res_rec_email.text}"
    assert res_rec_email.json()["staff"]["role"] == "receptionist"

    # 7. Dynamic Doctor Creation & Dual Login Test
    new_doc = {
        "name": "Dr. Dual Test Doctor",
        "specialty": "Neurology",
        "department": "Neurology",
        "experienceYears": 6,
        "consultationFee": 600.0,
        "phone": "+91 98765 09988",
        "email": "dual.doc@carepulse.com",
        "username": "dual.doc",
        "password": "DualSecret@2026",
        "roomNumber": "Cabin 305",
        "hospital_id": "hosp-bag"
    }
    create_doc_res = client.post("/api/receptionist/doctors", json=new_doc)
    assert create_doc_res.status_code == 200, f"Failed to create test doctor: {create_doc_res.text}"
    doc_id = create_doc_res.json()["doctor"]["id"]

    # Test login with new doctor username
    login_dyn_user = client.post("/api/staff/login", json={"username": "dual.doc", "password": "DualSecret@2026"})
    assert login_dyn_user.status_code == 200, f"Failed dynamic doctor username login: {login_dyn_user.text}"
    assert login_dyn_user.json()["staff"]["role"] == "doctor"

    # Test login with new doctor email
    login_dyn_email = client.post("/api/staff/login", json={"email": "dual.doc@carepulse.com", "password": "DualSecret@2026"})
    assert login_dyn_email.status_code == 200, f"Failed dynamic doctor email login: {login_dyn_email.text}"
    assert login_dyn_email.json()["staff"]["role"] == "doctor"

    # Cleanup dynamic doctor
    del_res = client.delete(f"/api/admin/doctors/{doc_id}")
    assert del_res.status_code == 200, f"Failed to cleanup test doctor: {del_res.text}"


if __name__ == "__main__":
    test_staff_dual_login()
    print("[SUCCESS] All staff dual login (username and email) tests passed successfully!")
