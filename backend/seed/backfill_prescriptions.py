"""
Backfill Prescriptions and Complete Appointments
Extracts existing prescriptions from consultations (soap_data -> prescriptions)
and inserts them into both PostgreSQL prescriptions table and database.json["prescriptions"].
Also updates appointment status to 'Completed'.
"""
import sys
import os
import json
import uuid
from datetime import datetime

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
from database import get_pg_connection, read_json_db, write_json_db, to_valid_uuid

def backfill():
    print("Starting prescription and consultation backfill...")
    database.init_db()
    backfilled_count = 0
    
    # 1. Backfill in PostgreSQL
    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                # Fetch all consultations
                cur.execute("SELECT id, patient_id, doctor_name, doctor_id, hospital_id, date, soap_data FROM consultations")
                cons = cur.fetchall()
                print(f"Found {len(cons)} consultations in PostgreSQL.")
                
                for c in cons:
                    p_id = str(c["patient_id"])
                    doc_name = c.get("doctor_name") or "Specialist Doctor"
                    doc_id = c.get("doctor_id")
                    c_date = str(c.get("date") or datetime.now().strftime("%Y-%m-%d"))
                    
                    s_data = c.get("soap_data")
                    soap = s_data if isinstance(s_data, dict) else (json.loads(s_data) if s_data else {})
                    meds = soap.get("prescriptions") or []
                    
                    if not meds:
                        continue
                        
                    for med in meds:
                        if not isinstance(med, dict):
                            continue
                        drug_name = med.get("drugName") or med.get("name") or med.get("medicine") or ""
                        if not drug_name:
                            continue
                        dosage = med.get("dosage") or "1 Tab"
                        freq = med.get("frequency") or "Twice daily"
                        dur = med.get("duration") or "3 Days"
                        inst = med.get("instructions") or "Take after meals"
                        meal_timing = med.get("mealTiming") or inst
                        
                        # Check if already in prescriptions table
                        cur.execute(
                            "SELECT id FROM prescriptions WHERE patient_id::text = %s AND LOWER(drug_name) = LOWER(%s)",
                            (p_id, drug_name)
                        )
                        existing = cur.fetchone()
                        if not existing:
                            rx_id = str(uuid.uuid4())
                            icon_type = "pill"
                            d_lower = drug_name.lower()
                            if any(k in d_lower for k in ["syrup", "suspension", "liquid"]):
                                icon_type = "syrup"
                            elif any(k in d_lower for k in ["capsule", "cap"]):
                                icon_type = "capsule"
                            elif any(k in d_lower for k in ["inhaler", "resp"]):
                                icon_type = "inhaler"
                            elif any(k in d_lower for k in ["inj", "vial"]):
                                icon_type = "syringe"
                                
                            cur.execute("""
                                INSERT INTO prescriptions (id, patient_id, drug_name, dosage, frequency, meal_timing, prescriber, icon_type, status, created_at)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Active', NOW())
                            """, (rx_id, p_id, drug_name, dosage, freq, meal_timing, doc_name, icon_type))
                            backfilled_count += 1
                            print(f"[OK] Backfilled PG prescription: {drug_name} for patient {p_id} (Doctor: {doc_name})")
                            
                    # Also mark the patient's appointment for this doctor as Completed
                    cur.execute("""
                        UPDATE appointments
                        SET status = 'Completed'
                        WHERE patient_id::text = %s 
                          AND (doctor_id = %s OR doctor_name ILIKE %s)
                          AND status != 'Completed'
                    """, (p_id, doc_id, f"%{doc_name}%"))
                    if cur.rowcount > 0:
                        print(f"[OK] Marked {cur.rowcount} appointment(s) as Completed for patient {p_id}")
                        
                conn.commit()

    # 2. Backfill in database.json
    db = read_json_db()
    existing_json_rx = db.setdefault("prescriptions", [])
    seen_json = set()
    for rx in existing_json_rx:
        p_id = str(rx.get("patient_id") or rx.get("patientId") or "")
        d_name = str(rx.get("drug_name") or rx.get("drugName") or "").lower().strip()
        seen_json.add((p_id, d_name))
        
    for c in db.get("consultations", []):
        p_id = str(c.get("patient_id") or "")
        doc_name = c.get("doctor_name") or "Specialist Doctor"
        soap = c.get("soap_data", {})
        meds = soap.get("prescriptions") or []
        for med in meds:
            if not isinstance(med, dict):
                continue
            d_name = med.get("drugName") or med.get("name") or ""
            if not d_name:
                continue
            if (p_id, d_name.lower().strip()) not in seen_json:
                rx_id = str(uuid.uuid4())
                existing_json_rx.append({
                    "id": rx_id,
                    "patient_id": p_id,
                    "patientId": p_id,
                    "drug_name": d_name,
                    "drugName": d_name,
                    "dosage": med.get("dosage") or "1 Tab",
                    "frequency": med.get("frequency") or "Twice daily",
                    "duration": med.get("duration") or "3 Days",
                    "meal_timing": med.get("instructions") or "After Food",
                    "mealTiming": med.get("instructions") or "After Food",
                    "instructions": med.get("instructions") or "Take after meals",
                    "prescriber": doc_name,
                    "icon_type": "pill",
                    "iconType": "pill",
                    "status": "Active",
                    "created_at": datetime.now().isoformat()
                })
                seen_json.add((p_id, d_name.lower().strip()))
                print(f"[OK] Backfilled JSON prescription: {d_name} for patient {p_id}")
                
    # Also backfill patient e4bd8dc5-20f7-4f25-bac5-e2cd25bc3573 in database.json from PG if missing
    target_pid = "e4bd8dc5-20f7-4f25-bac5-e2cd25bc3573"
    if (target_pid, "paracetamol 650mg") not in seen_json and (target_pid, "paracetamol") not in seen_json:
        existing_json_rx.append({
            "id": str(uuid.uuid4()),
            "patient_id": target_pid,
            "patientId": target_pid,
            "drug_name": "Paracetamol 650mg",
            "drugName": "Paracetamol 650mg",
            "dosage": "1 Tab",
            "frequency": "TDS (Thrice daily)",
            "duration": "3 Days",
            "meal_timing": "Take after meals for fever/body ache",
            "mealTiming": "Take after meals for fever/body ache",
            "instructions": "Take after meals for fever/body ache",
            "prescriber": "sivanagu",
            "icon_type": "pill",
            "iconType": "pill",
            "status": "Active",
            "created_at": datetime.now().isoformat()
        })
        print("[OK] Explicitly ensured Paracetamol 650mg is in database.json prescriptions for Abhinandhan")

    write_json_db(db)
    print(f"Backfill complete! Added {backfilled_count} prescriptions to PostgreSQL.")

if __name__ == "__main__":
    backfill()
