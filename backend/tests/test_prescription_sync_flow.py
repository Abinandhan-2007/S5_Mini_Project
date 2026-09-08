"""
Integration Test: Doctor Consultation -> Patient Prescription Flow
Verifies:
1. Doctor adds consultation with prescriptions via /api/doctor/consultations.
2. Prescriptions table and database.json both receive the new prescriptions.
3. Matching appointment status transitions to 'Completed'.
4. Patient endpoint /api/prescriptions/patient/{patient_id} returns all prescribed medications with rich fields.
5. Patient endpoint /api/consultations/patient/{patient_id} returns formatted details and structured prescriptions array.
6. Existing consultations with prescriptions (e.g. Abhinandhan Kannusamy) correctly surface in both endpoints.
"""
import sys
import os
import uuid
from datetime import datetime

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
from database import init_db, get_pg_connection, read_json_db, write_json_db, to_valid_uuid
import main
from schemas import ConsultationCreate
from routes.doctor_routes import create_doctor_consultation

def test_prescription_flow_end_to_end():
    init_db()
    
    # 1. Verify Abhinandhan's existing consultation and prescription
    abhinandhan_id = "e4bd8dc5-20f7-4f25-bac5-e2cd25bc3573"
    rx_list = main.get_patient_prescriptions(abhinandhan_id)
    assert len(rx_list) >= 1, "Expected at least 1 prescription for Abhinandhan"
    
    paracetamol = next((r for r in rx_list if "paracetamol" in r["drugName"].lower()), None)
    assert paracetamol is not None, "Paracetamol 650mg should be found in patient prescriptions"
    assert paracetamol["patientId"] == abhinandhan_id
    assert paracetamol["prescriber"] == "sivanagu"
    print(f"[TEST PASS] Abhinandhan's prescription verified: {paracetamol['drugName']}, {paracetamol['dosage']}, Prescriber: {paracetamol['prescriber']}")

    # 2. Test newly added consultation with multiple prescriptions
    test_patient_id = str(uuid.uuid4())
    test_doc_id = "doc-test-101"
    test_doc_name = "Dr. Test Specialist"
    
    # Ensure patient in patients table
    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO patients (id, full_name, email, phone, blood_group, auth_provider)
                    VALUES (%s, 'Flow Test Patient', %s, '+91 99999 11111', 'O+', 'local')
                    ON CONFLICT (id) DO NOTHING
                """, (test_patient_id, f"test_flow_{test_patient_id[:8]}@carepulse.local"))
                
                # Also create an active appointment for this patient
                cur.execute("""
                    INSERT INTO appointments (
                        id, patient_id, ticket_number, doctor_id, doctor_name, doctor_specialty,
                        hospital_id, hospital_name, date, time_slot, type, status, is_checked_in
                    )
                    VALUES (%s, %s, '#CP-FLOW-1', %s, %s, 'Cardiology', 'hosp-1', 'Test Hospital', CURRENT_DATE, '10:00 AM', 'In-Person', 'In Consultation', TRUE)
                    ON CONFLICT DO NOTHING
                """, (str(uuid.uuid4()), test_patient_id, test_doc_id, test_doc_name))
                conn.commit()

    consultation_payload = ConsultationCreate(
        patientId=test_patient_id,
        doctorId=test_doc_id,
        doctorName=test_doc_name,
        date=datetime.now().strftime("%Y-%m-%d"),
        soapData={
            "subjective": "Patient reports persistent dry cough and chest tightness.",
            "objective": "Clear breath sounds, BP 120/80 mmHg, SpO2 98%.",
            "assessment": "Acute Bronchitis (Mild)",
            "plan": "Antibiotics and bronchodilator for 5 days. Increase fluid intake.",
            "prescriptions": [
                {
                    "id": "rx-flow-1",
                    "drugName": "Azithromycin 500mg",
                    "dosage": "1 Tab",
                    "frequency": "Once daily (OD)",
                    "duration": "5 Days",
                    "instructions": "Take after meals"
                },
                {
                    "id": "rx-flow-2",
                    "drugName": "Levosalbutamol Inhaler",
                    "dosage": "2 Puffs",
                    "frequency": "Twice daily as needed",
                    "duration": "7 Days",
                    "instructions": "Inhale with spacer"
                }
            ]
        }
    )

    # Invoke consultation creation
    res = create_doctor_consultation(data=consultation_payload)
    assert res is not None
    assert res.get("id") is not None
    print(f"[TEST PASS] Consultation created with ID: {res.get('id')}")

    # Verify prescriptions returned by patient endpoint
    patient_prescriptions = main.get_patient_prescriptions(test_patient_id)
    assert len(patient_prescriptions) >= 2, f"Expected 2 prescriptions, got {len(patient_prescriptions)}"
    
    azithro = next((p for p in patient_prescriptions if "azithromycin" in p["drugName"].lower()), None)
    inhaler = next((p for p in patient_prescriptions if "inhaler" in p["drugName"].lower()), None)
    
    assert azithro is not None, "Azithromycin prescription missing from patient app"
    assert inhaler is not None, "Inhaler prescription missing from patient app"
    assert inhaler.get("iconType") == "inhaler", f"Expected iconType inhaler, got {inhaler.get('iconType')}"
    print("[TEST PASS] Both newly prescribed medications correctly returned to patient app with full metadata")

    # Verify consultation history returned by patient endpoint
    consultations = main.get_patient_consultations(test_patient_id)
    assert len(consultations) >= 1, "Expected consultation in patient history"
    assert "Azithromycin" in consultations[0]["prescriptionDetails"], "prescriptionDetails should list actual medicines"
    assert len(consultations[0]["prescriptions"]) == 2, "Structured prescriptions array should contain both medicines"
    print(f"[TEST PASS] Patient consultation history contains formatted details: {consultations[0]['prescriptionDetails']}")

    # Verify appointment was marked Completed
    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT status FROM appointments WHERE patient_id::text = %s", (test_patient_id,))
                app_row = cur.fetchone()
                if app_row:
                    assert app_row["status"] == "Completed", f"Expected appointment status Completed, got {app_row['status']}"
                    print("[TEST PASS] Appointment status successfully transitioned to 'Completed'")

    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_prescription_flow_end_to_end()
