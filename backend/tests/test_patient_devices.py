import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_patient_device_tracking_and_superadmin():
    """Verify end-to-end device telemetry logging and SuperAdmin device registry view."""
    # 1. SuperAdmin Login
    sa_res = client.post("/api/superadmin/login", json={"username": "superadmin", "password": "SuperAdmin@123"})
    assert sa_res.status_code == 200, f"SuperAdmin login failed: {sa_res.text}"
    sa_token = sa_res.json()["token"]
    headers = {"Authorization": f"Bearer {sa_token}"}

    # 2. Register Device Telemetry on Login for a patient
    dev_payload = {
        "patient_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d", # Demo Sarah Jenkins ID
        "device_id": "test_device_samsung_s23_ultra",
        "device_model": "Samsung Galaxy S23 Ultra (SM-S918B)",
        "manufacturer": "Samsung",
        "platform": "android",
        "os_version": "Android 14",
        "app_version": "1.0.4",
        "fcm_token": "sample_fcm_push_token_999"
    }
    log_res = client.post("/api/patient/device-info", json=dev_payload)
    assert log_res.status_code == 200, f"Failed to log device info: {log_res.text}"
    assert log_res.json()["success"] is True

    # Also test an Apple iPhone device
    ios_payload = {
        "patient_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "device_id": "test_device_iphone_15",
        "device_model": "Apple iPhone 15 Pro",
        "manufacturer": "Apple",
        "platform": "ios",
        "os_version": "iOS 17.4",
        "app_version": "1.0.4",
        "fcm_token": ""
    }
    log_res_ios = client.post("/api/patient/device-info", json=ios_payload)
    assert log_res_ios.status_code == 200

    # 3. SuperAdmin retrieves device telemetry
    get_res = client.get("/api/superadmin/devices", headers=headers)
    assert get_res.status_code == 200, f"Failed to get devices: {get_res.text}"
    data = get_res.json()
    assert data["success"] is True
    assert data["count"] >= 2
    assert data["stats"]["total_devices"] >= 2
    assert data["stats"]["android_count"] >= 1
    assert data["stats"]["ios_count"] >= 1

    # Verify device record details
    found_samsung = any("Samsung Galaxy S23 Ultra" in d["device_model"] for d in data["devices"])
    assert found_samsung, f"Samsung device not found in {data['devices']}"

    # 4. Test platform filtering
    android_res = client.get("/api/superadmin/devices?platform=android", headers=headers)
    assert android_res.status_code == 200
    for d in android_res.json()["devices"]:
        assert "android" in d["platform"].lower()

    # 5. Test search filter
    search_res = client.get("/api/superadmin/devices?search=Samsung", headers=headers)
    assert search_res.status_code == 200
    assert len(search_res.json()["devices"]) >= 1
    assert "Samsung" in search_res.json()["devices"][0]["device_model"] or "Samsung" in search_res.json()["devices"][0]["manufacturer"]

    # 6. Test Revoke / Delete device session
    del_res = client.delete("/api/superadmin/devices/test_device_iphone_15", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    print("All patient device tracking tests passed successfully!")

if __name__ == "__main__":
    test_patient_device_tracking_and_superadmin()
