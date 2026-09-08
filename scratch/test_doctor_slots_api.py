import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_slot_endpoints():
    print("Testing Doctor Slot Endpoints...")
    
    # 1. Fetch doctors to get a doctor
    res = requests.get(f"{BASE_URL}/receptionist/doctors")
    assert res.status_code == 200, f"Failed getting doctors: {res.text}"
    data = res.json()
    doctors = data.get("doctors", [])
    assert len(doctors) > 0, "No doctors found in system"
    
    target_doc = doctors[0]
    doc_id = target_doc["id"]
    staff_code = target_doc.get("staffCode") or target_doc.get("staff_code")
    print(f"Target Doctor: {target_doc.get('name')} (id={doc_id}, staff_code={staff_code})")
    
    # 2. Test Add Slot by Doctor ID
    new_slot_time = "07:00 AM - 08:00 AM"
    print(f"1. Adding slot '{new_slot_time}' using doc_id '{doc_id}'...")
    res = requests.post(f"{BASE_URL}/receptionist/doctors/{doc_id}/slots", json={
        "timeSlot": new_slot_time,
        "maxSeats": 8,
        "isAvailable": True
    })
    print("Status:", res.status_code, res.text[:200])
    assert res.status_code == 200, f"Failed adding slot: {res.text}"
    res_data = res.json()
    assert res_data.get("success") is True
    assert res_data["slot"]["timeSlot"] == new_slot_time
    assert res_data["slot"]["maxSeats"] == 8
    print("-> Successfully added slot with doc_id!")
    
    # 3. Test Add/Update Slot by Staff Code (e.g. D007101)
    if staff_code:
        print(f"2. Adding slot using staff_code '{staff_code}'...")
        sc_slot_time = "08:00 AM - 09:00 AM"
        res = requests.post(f"{BASE_URL}/receptionist/doctors/{staff_code}/slots", json={
            "timeSlot": sc_slot_time,
            "maxSeats": 10,
            "isAvailable": True
        })
        print("Status:", res.status_code, res.text[:200])
        assert res.status_code == 200, f"Failed adding slot with staff_code: {res.text}"
        res_data = res.json()
        assert res_data.get("success") is True
        print("-> Successfully resolved doctor and added slot using staff_code!")
    
    # 4. Test Standard Slots Endpoint
    print(f"3. Testing /standard-slots bulk OPD initialization on '{doc_id}'...")
    res = requests.post(f"{BASE_URL}/receptionist/doctors/{doc_id}/standard-slots", json={
        "maxSeats": 6,
        "clearExisting": False
    })
    print("Status:", res.status_code, res.text[:200])
    assert res.status_code == 200, f"Failed standard slots: {res.text}"
    std_data = res.json()
    assert std_data.get("success") is True
    slots = std_data.get("slots", [])
    print(f"-> Total slots now configured: {len(slots)}")
    assert len(slots) >= 7, "Standard slots did not populate 7 shifts"
    
    # 5. Clean up the test slot
    print(f"4. Cleaning up temporary slot '{new_slot_time}'...")
    res = requests.delete(f"{BASE_URL}/receptionist/doctors/{doc_id}/slots/{new_slot_time}")
    print("Delete status:", res.status_code)
    assert res.status_code == 200, f"Failed deleting test slot: {res.text}"
    
    print("\nALL BACKEND DOCTOR SLOT TESTS PASSED!")

if __name__ == "__main__":
    test_slot_endpoints()
