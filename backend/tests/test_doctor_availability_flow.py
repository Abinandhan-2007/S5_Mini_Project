import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import database
database.init_db()

from fastapi.testclient import TestClient
from main import app
from core.security import create_jwt

client = TestClient(app)

def test_doctor_availability_propagation_flow():
    # 1. First get all doctors or create a test doctor
    res = client.get("/api/doctors")
    assert res.status_code == 200, f"Failed to get doctors: {res.text}"
    docs = res.json()
    assert len(docs) > 0, "No doctors found in database"
    test_doc = docs[0]
    doc_id = test_doc["id"]

    # 2. Doctor sets status to NOT AVAILABLE with reason & return time via /api/receptionist/doctors/{id}/availability
    patch_payload = {
        "isAvailable": False,
        "reason": "In Emergency Surgery",
        "unavailableUntil": "45 mins"
    }
    patch_res = client.patch(f"/api/receptionist/doctors/{doc_id}/availability", json=patch_payload)
    assert patch_res.status_code == 200, f"Failed to patch availability: {patch_res.text}"
    data = patch_res.json()
    assert data["success"] is True
    assert data["doctor"]["isAvailable"] is False
    assert data["doctor"]["availabilityReason"] == "In Emergency Surgery"
    assert data["doctor"]["unavailableUntil"] == "45 mins"

    # Verify PostgreSQL row directly
    if database.use_pg:
        with database.get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, is_available, availability_reason, unavailable_until FROM doctors WHERE id = %s", (doc_id,))
                pg_row = cur.fetchone()
                assert pg_row is not None
                assert pg_row["is_available"] is False
                assert pg_row["availability_reason"] == "In Emergency Surgery"
                assert pg_row["unavailable_until"] == "45 mins"

    # 3. Verify public /api/doctors reflects unavailable status & reason
    pub_res = client.get("/api/doctors")
    assert pub_res.status_code == 200
    pub_docs = pub_res.json()
    matched_pub = next((d for d in pub_docs if d["id"] == doc_id), None)
    assert matched_pub is not None
    assert matched_pub["isAvailable"] is False
    assert matched_pub["availabilityReason"] == "In Emergency Surgery"
    assert matched_pub["unavailableUntil"] == "45 mins"

    # 4. Verify single doctor lookup /api/doctors/{id} reflects unavailable status
    single_res = client.get(f"/api/doctors/{doc_id}")
    assert single_res.status_code == 200
    single_doc = single_res.json()
    assert single_doc["isAvailable"] is False
    assert single_doc["availabilityReason"] == "In Emergency Surgery"
    assert single_doc["unavailableUntil"] == "45 mins"

    # 5. Verify direct /api/doctors/{id}/availability endpoint works
    direct_patch = client.patch(f"/api/doctors/{doc_id}/availability", json={
        "isAvailable": False,
        "reason": "Attending Inpatient Ward Rounds",
        "unavailableUntil": "1 hour"
    })
    assert direct_patch.status_code == 200
    assert direct_patch.json()["doctor"]["availabilityReason"] == "Attending Inpatient Ward Rounds"

    # 6. Verify /api/receptionist/doctors returns updated availability (ensures polling won't revert)
    rec_res = client.get("/api/receptionist/doctors")
    assert rec_res.status_code == 200
    rec_docs = rec_res.json().get("doctors", [])
    matched_rec = next((d for d in rec_docs if d["id"] == doc_id), None)
    assert matched_rec is not None
    assert matched_rec["isAvailable"] is False
    assert matched_rec["availabilityReason"] == "Attending Inpatient Ward Rounds"

    # 7. Test staff_code and doc-current alias resolution with doctor session token
    # Create doctor token for Dr. Abhinandhan K (D006101 / doc-dcd123)
    abhinandhan_jwt = create_jwt({
        "id": "28e59dd9-1c8e-4fc1-a7a0-908900f4a8e2",
        "staff_id": "28e59dd9-1c8e-4fc1-a7a0-908900f4a8e2",
        "doctor_id": "doc-dcd123",
        "staff_code": "D006101",
        "role": "doctor",
        "email": "kvabhinanthan@gmail.com",
        "name": "Dr. Abhinandhan K",
        "type": "staff"
    })

    # 7a. Toggle via staff_code D006101
    stf_code_res = client.patch(
        "/api/receptionist/doctors/D006101/availability",
        json={"isAvailable": False, "reason": "Lunch Break", "unavailableUntil": "30 mins"},
        headers={"Authorization": f"Bearer {abhinandhan_jwt}"}
    )
    assert stf_code_res.status_code == 200
    assert stf_code_res.json()["doctor"]["isAvailable"] is False
    assert stf_code_res.json()["doctor"]["availabilityReason"] == "Lunch Break"

    if database.use_pg:
        with database.get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT is_available, availability_reason FROM doctors WHERE id = %s", ("doc-dcd123",))
                row = cur.fetchone()
                assert row["is_available"] is False
                assert row["availability_reason"] == "Lunch Break"

    # 7b. Toggle via doc-current alias with session
    alias_res = client.patch(
        "/api/receptionist/doctors/doc-current/availability",
        json={"isAvailable": False, "reason": "Ward Rounds", "unavailableUntil": "45 mins"},
        headers={"Authorization": f"Bearer {abhinandhan_jwt}"}
    )
    assert alias_res.status_code == 200
    assert alias_res.json()["doctor"]["availabilityReason"] == "Ward Rounds"

    # 7c. Direct /api/doctor/availability endpoint
    my_avail_res = client.patch(
        "/api/doctor/availability",
        json={"isAvailable": True, "reason": "", "unavailableUntil": ""},
        headers={"Authorization": f"Bearer {abhinandhan_jwt}"}
    )
    assert my_avail_res.status_code == 200
    assert my_avail_res.json()["doctor"]["isAvailable"] is True

    # 8. Doctor sets status back to AVAILABLE
    avail_payload = {
        "isAvailable": True,
        "reason": "",
        "unavailableUntil": ""
    }
    avail_res = client.patch(f"/api/doctors/{doc_id}/availability", json=avail_payload)
    assert avail_res.status_code == 200
    avail_data = avail_res.json()
    assert avail_data["success"] is True
    assert avail_data["doctor"]["isAvailable"] is True
    assert avail_data["doctor"]["availabilityReason"] == ""

    # 9. Verify public and receptionist endpoints reflect Available
    pub_res2 = client.get(f"/api/doctors/{doc_id}")
    assert pub_res2.status_code == 200
    assert pub_res2.json()["isAvailable"] is True
    assert pub_res2.json()["availabilityReason"] == ""

    rec_res2 = client.get("/api/receptionist/doctors")
    assert rec_res2.status_code == 200
    matched_rec2 = next((d for d in rec_res2.json().get("doctors", []) if d["id"] == doc_id), None)
    assert matched_rec2["isAvailable"] is True
    assert matched_rec2["availabilityReason"] == ""

    # 10. Verify Receptionist role is BLOCKED from modifying availability (403 Forbidden)
    receptionist_jwt = create_jwt({"id": "rec-test", "role": "receptionist", "name": "Front Desk User", "type": "staff"})
    rec_patch = client.patch(
        f"/api/doctors/{doc_id}/availability",
        json={"isAvailable": False, "reason": "Unauthorized Attempt"},
        headers={"Authorization": f"Bearer {receptionist_jwt}"}
    )
    assert rec_patch.status_code == 403, f"Expected 403 Forbidden for receptionist, got {rec_patch.status_code}: {rec_patch.text}"
    assert "not authorized" in rec_patch.text.lower()

    # 11. Verify Admin / Doctor role is ALLOWED (200 OK)
    admin_jwt = create_jwt({"id": "admin-1", "role": "admin", "name": "Arthur Vance", "type": "staff"})
    admin_patch = client.patch(
        f"/api/doctors/{doc_id}/availability",
        json={"isAvailable": True, "reason": ""},
        headers={"Authorization": f"Bearer {admin_jwt}"}
    )
    assert admin_patch.status_code == 200, f"Expected 200 OK for admin, got {admin_patch.status_code}: {admin_patch.text}"

if __name__ == "__main__":
    test_doctor_availability_propagation_flow()
    print("All doctor availability tests passed successfully!")
