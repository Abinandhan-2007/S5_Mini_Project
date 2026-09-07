import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_slot_flow():
    # 1. Test get all doctors
    res = client.get('/api/doctors')
    assert res.status_code == 200, f'Failed get doctors: {res.text}'
    docs = res.json()
    assert len(docs) > 0, 'No doctors found'
    doc1 = docs[0]
    doc_id = doc1['id']
    assert 'slotCapacities' in doc1, 'Doctor missing slotCapacities property'

    # 2. Test get single doctor
    res2 = client.get(f'/api/doctors/{doc_id}')
    assert res2.status_code == 200, f'Failed get doctor: {res2.text}'
    doc_detail = res2.json()
    assert 'slotCapacities' in doc_detail, 'Single doctor missing slotCapacities property'

    # 3. Test get doctor slots with date
    res3 = client.get(f'/api/doctors/{doc_id}/slots?date=2026-09-07')
    assert res3.status_code == 200, f'Failed get doctor slots: {res3.text}'
    slots_data = res3.json()
    assert 'slots' in slots_data, 'Failed slots query'

    # 4. Test receptionist add custom slot
    res4 = client.post(f'/api/receptionist/doctors/{doc_id}/slots', json={'timeSlot': '07:30 AM - 08:30 AM', 'maxSeats': 8})
    assert res4.status_code == 200, f'Failed add slot: {res4.text}'

    # 5. Verify the new custom slot is visible in public /api/doctors/{doc_id}/slots
    res5 = client.get(f'/api/doctors/{doc_id}/slots?date=2026-09-07')
    slots_data2 = res5.json()
    custom_slot = next((s for s in slots_data2['slots'] if s['timeSlot'] == '07:30 AM - 08:30 AM'), None)
    assert custom_slot is not None, 'New custom slot not found in patient slot API!'
    assert custom_slot['maxSeats'] == 8, 'Custom slot seat limit mismatch'

    # 6. Test receptionist update slot capacity
    res6 = client.put(f'/api/receptionist/doctors/{doc_id}/slots', json={'timeSlot': '07:30 AM - 08:30 AM', 'maxSeats': 10, 'isAvailable': True})
    assert res6.status_code == 200, f'Failed update slot: {res6.text}'

    # 7. Test receptionist delete slot
    slot_id_to_del = custom_slot['id']
    res7 = client.delete(f'/api/receptionist/doctors/{doc_id}/slots/{slot_id_to_del}')
    assert res7.status_code == 200, f'Failed delete slot: {res7.text}'

    # 8. Verify slot was removed
    res8 = client.get(f'/api/doctors/{doc_id}/slots?date=2026-09-07')
    deleted_slot = next((s for s in res8.json()['slots'] if s['timeSlot'] == '07:30 AM - 08:30 AM'), None)
    assert deleted_slot is None, 'Deleted slot still present!'

    # 9. Test doctor with receptionist-configured slots (e.g. doc-ff9f2e SIVAGOKUL)
    res9 = client.get('/api/doctors/doc-ff9f2e')
    if res9.status_code == 200:
        doc_siva = res9.json()
        siva_slots = doc_siva.get('slotCapacities', [])
        assert len(siva_slots) == 5, f'Expected 5 receptionist-configured slots for Dr. SIVAGOKUL, got {len(siva_slots)}'
        expected_slots = [
            ("09:00 AM - 10:00 AM", 6, 3, 3),
            ("10:00 AM - 11:00 AM", 6, 3, 3),
            ("11:00 AM - 12:00 PM", 5, 3, 2),
            ("02:00 PM - 03:00 PM", 6, 3, 3),
            ("03:00 PM - 04:00 PM", 4, 2, 2),
        ]
        for time_str, max_s, on_s, off_s in expected_slots:
            slot = next((s for s in siva_slots if s['timeSlot'] == time_str), None)
            assert slot is not None, f'Expected slot {time_str} not found in Dr. SIVAGOKUL slots'
            assert slot['maxSeats'] == max_s, f'Expected maxSeats {max_s} for {time_str}, got {slot["maxSeats"]}'
        
        # Verify 04:00 PM - 05:00 PM is NOT in SIVAGOKUL slots
        assert not any(s['timeSlot'] == '04:00 PM - 05:00 PM' for s in siva_slots), 'Slot 04:00 PM - 05:00 PM should not be present'

        # Test slots query endpoint with date
        res10 = client.get('/api/doctors/doc-ff9f2e/slots?date=2026-09-07')
        assert res10.status_code == 200, f'Failed slots query for doc-ff9f2e: {res10.text}'
        res10_slots = res10.json().get('slots', [])
        assert len(res10_slots) == 5, f'Expected 5 slots in slots endpoint, got {len(res10_slots)}'

    # 10. Test NEW doctor creation - must have EMPTY slots by default
    res11 = client.post('/api/receptionist/doctors', json={
        'name': 'Test New Physician',
        'specialty': 'Dermatologist',
        'department': 'Dermatology',
        'hospital_id': 'hosp-bag',
        'experienceYears': 4,
        'consultationFee': 400.0,
        'phone': '+91 99999 11111',
        'email': 'testnewdoc@carepulse.com',
        'username': 'TESTNEWDOC',
        'password': 'password123',
        'roomNumber': 'Cabin 204',
        'isAvailable': True,
        'availableDays': ['Mon', 'Tue', 'Wed'],
        'slotCapacities': []
    })
    assert res11.status_code == 200, f'Failed creating new doctor: {res11.text}'
    new_doc_data = res11.json().get('doctor', {})
    new_doc_id = new_doc_data.get('id')
    assert new_doc_id is not None, 'New doctor ID is missing'
    assert len(new_doc_data.get('slotCapacities', [])) == 0, f'New doctor should have 0 slots, got {new_doc_data.get("slotCapacities")}'

    # Verify public slots endpoint returns empty slots for this new doctor
    res12 = client.get(f'/api/doctors/{new_doc_id}/slots?date=2026-09-07')
    assert res12.status_code == 200, f'Failed querying new doctor slots: {res12.text}'
    assert len(res12.json().get('slots', [])) == 0, f'Expected 0 slots for new doctor, got {res12.json().get("slots")}'

    # Clean up test doctor
    client.delete(f'/api/admin/doctors/{new_doc_id}')

if __name__ == '__main__':
    test_slot_flow()
    print('All slot tests passed!')
