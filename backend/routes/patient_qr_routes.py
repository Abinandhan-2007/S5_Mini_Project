# backend/routes/patient_qr_routes.py
import re
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Header, Query, status
import database
from database import read_json_db, get_pg_connection
from routes.staff_auth import get_current_staff

logger = logging.getLogger("carepulse.patient_qr")

router = APIRouter(prefix="/api/staff", tags=["Patient QR Scanner"])


def normalize_code(raw_code: str) -> str:
    """Strip common prefixes and clean up scanned QR code string."""
    if not raw_code:
        return ""
    code = raw_code.strip()
    if code.startswith("CAREPULSE-PATIENT-"):
        code = code[len("CAREPULSE-PATIENT-"):].strip()
    return code


def calculate_age(dob_str: Optional[str]) -> Optional[int]:
    """Calculate age from date string."""
    if not dob_str:
        return None
    try:
        birth_date = datetime.strptime(dob_str[:10], "%Y-%m-%d").date()
        today = datetime.now().date()
        return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    except Exception:
        return None


def get_hospital_catalog() -> Dict[str, Dict[str, str]]:
    """Retrieve all hospitals as a lookup map: {id: {name, code}}."""
    catalog: Dict[str, Dict[str, str]] = {
        "hosp-bag": {"name": "BAG Hospital", "code": "H001"},
        "hosp-1": {"name": "CarePulse Central Hospital", "code": "H002"},
        "hosp-2": {"name": "St. Jude Heart & Medical Center", "code": "H003"},
        "hosp-3": {"name": "Metro Health Multi-Specialty", "code": "H004"}
    }

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT id, name, hospital_code FROM hospitals")
                    rows = cur.fetchall()
                    for r in rows:
                        h_id = str(r["id"])
                        catalog[h_id] = {
                            "name": r.get("name") or "Hospital",
                            "code": r.get("hospital_code") or "H000"
                        }
        except Exception as e:
            logger.warning(f"Note on PG hospitals catalog lookup: {e}")
    else:
        db = read_json_db()
        for h in db.get("hospitals", []):
            h_id = str(h.get("id"))
            catalog[h_id] = {
                "name": h.get("name") or "Hospital",
                "code": h.get("hospital_code") or h.get("hospitalCode") or "H000"
            }

    return catalog


@router.get("/patient-qr-lookup")
def patient_qr_lookup(
    code: str = Query(..., description="Scanned patient QR code, patient ID, or patient code"),
    hospital_id: Optional[str] = Query(None, description="Optional hospital ID to scope records to"),
    authorization: Optional[str] = Header(None)
):
    """
    Look up complete patient records from a scanned QR code with hospital-level scoping.
    Retrieves demographics, active & past appointments, previous clinical visits (SOAP notes),
    active & previous prescriptions, and vitals.
    """
    clean_code = normalize_code(code)
    if not clean_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid patient QR code or ID is required."
        )

    # 1. Resolve Staff & Hospital Context
    staff_ctx = get_current_staff(authorization) if (authorization and isinstance(authorization, str)) else None
    current_hosp_id = hospital_id or (staff_ctx.get("hospital_id") if staff_ctx else None) or "hosp-bag"

    hospital_catalog = get_hospital_catalog()
    current_hosp_info = hospital_catalog.get(
        current_hosp_id,
        {"name": "BAG Hospital" if current_hosp_id == "hosp-bag" else "CarePulse Medical Center", "code": "H001"}
    )

    # 2. Locate Patient Record
    patient_record = None

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, patient_code, full_name, email, phone, dob, gender, blood_group,
                               avatar_url, address, allergies, pre_existing_conditions, emergency_contact, created_at
                        FROM patients
                        WHERE id::text = %s
                           OR LOWER(patient_code) = LOWER(%s)
                           OR LOWER(email) = LOWER(%s)
                           OR REPLACE(phone, ' ', '') = REPLACE(%s, ' ', '')
                        LIMIT 1
                        """,
                        (clean_code, clean_code, clean_code, clean_code)
                    )
                    row = cur.fetchone()
                    if row:
                        patient_record = dict(row)
        except Exception as e:
            logger.warning(f"Note on PG patient lookup: {e}")

    if not patient_record:
        db = read_json_db()
        for p in db.get("patients", []):
            p_id = str(p.get("id") or "")
            p_code = str(p.get("patient_code") or p.get("patientCode") or "")
            p_email = str(p.get("email") or "").lower()
            p_phone = re.sub(r"\D", "", str(p.get("phone") or ""))
            clean_digits = re.sub(r"\D", "", clean_code)

            if (
                p_id == clean_code
                or p_code.lower() == clean_code.lower()
                or (clean_digits and p_phone and p_phone.endswith(clean_digits))
                or p_email == clean_code.lower()
            ):
                patient_record = p
                break

    if not patient_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No patient found matching QR identifier '{clean_code}'. Please ensure the patient is registered."
        )

    patient_id = str(patient_record.get("id"))
    dob = str(patient_record.get("dob") or "1995-01-01")
    age = calculate_age(dob) or 30

    emerg_contact = patient_record.get("emergency_contact") or {}
    if isinstance(emerg_contact, str):
        try:
            emerg_contact = json.loads(emerg_contact)
        except Exception:
            emerg_contact = {}

    patient_dto = {
        "id": patient_id,
        "patientCode": patient_record.get("patient_code") or patient_record.get("patientCode") or f"PAT-{patient_id[:6].upper()}",
        "fullName": patient_record.get("full_name") or patient_record.get("name") or "Patient",
        "email": patient_record.get("email") or "",
        "phone": patient_record.get("phone") or "Not provided",
        "dob": dob,
        "age": age,
        "gender": patient_record.get("gender") or "Not specified",
        "bloodGroup": patient_record.get("blood_group") or patient_record.get("bloodGroup") or "O+",
        "avatarUrl": patient_record.get("avatar_url") or patient_record.get("avatarUrl") or "",
        "address": patient_record.get("address") or "",
        "allergies": patient_record.get("allergies") or "No known drug allergies",
        "preExistingConditions": patient_record.get("pre_existing_conditions") or "None documented",
        "emergencyContact": {
            "name": emerg_contact.get("name") or "Primary Contact",
            "phone": emerg_contact.get("phone") or patient_record.get("phone") or "",
            "relationship": emerg_contact.get("relationship") or "Family"
        }
    }

    # 3. Retrieve All Appointments for Patient
    raw_appointments: List[Dict[str, Any]] = []

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT a.*, d.room_number, d.hospital_name as doc_hosp_name,
                               COALESCE(a.hospital_id, d.hospital_id, 'hosp-bag') as resolved_hosp_id
                        FROM appointments a
                        LEFT JOIN doctors d ON a.doctor_id = d.id
                        WHERE a.patient_id::text = %s
                        ORDER BY a.date DESC, a.time_slot DESC
                        """,
                        (patient_id,)
                    )
                    for r in cur.fetchall():
                        rd = dict(r)
                        h_id = rd.get("resolved_hosp_id") or rd.get("hospital_id") or "hosp-bag"
                        h_info = hospital_catalog.get(h_id, {"name": rd.get("hospital_name") or "CarePulse Hospital", "code": "H001"})
                        raw_appointments.append({
                            "id": str(rd["id"]),
                            "ticketNumber": rd.get("ticket_number") or "#CP-1001",
                            "doctorId": str(rd.get("doctor_id") or ""),
                            "doctorName": rd.get("doctor_name") or "Specialist Physician",
                            "doctorSpecialty": rd.get("doctor_specialty") or "General Medicine",
                            "doctorPhoto": rd.get("doctor_photo") or "",
                            "roomNumber": rd.get("room_number") or "Cabin 101",
                            "hospitalId": h_id,
                            "hospitalName": rd.get("hospital_name") or h_info["name"],
                            "hospitalCode": h_info["code"],
                            "date": str(rd.get("date") or ""),
                            "timeSlot": rd.get("time_slot") or "10:00 AM",
                            "type": rd.get("type") or "In-Person",
                            "status": rd.get("status") or "Upcoming",
                            "createdAt": str(rd.get("created_at") or "")
                        })
        except Exception as e:
            logger.warning(f"Note on PG appointments fetch: {e}")

    # Fallback to JSON DB appointments
    if not raw_appointments:
        db = read_json_db()
        for a in db.get("appointments", []):
            if str(a.get("patient_id") or a.get("patientId") or "") == patient_id:
                h_id = a.get("hospital_id") or a.get("hospitalId") or "hosp-bag"
                h_info = hospital_catalog.get(h_id, {"name": a.get("hospital_name") or "CarePulse Hospital", "code": "H001"})
                raw_appointments.append({
                    "id": str(a.get("id")),
                    "ticketNumber": a.get("ticket_number") or a.get("ticketNumber") or "#CP-1001",
                    "doctorId": str(a.get("doctor_id") or a.get("doctorId") or "doc-1"),
                    "doctorName": a.get("doctor_name") or a.get("doctorName") or "Specialist Physician",
                    "doctorSpecialty": a.get("doctor_specialty") or a.get("doctorSpecialty") or "General Medicine",
                    "doctorPhoto": a.get("doctor_photo") or a.get("doctorPhoto") or "",
                    "roomNumber": a.get("room_number") or "Cabin 101",
                    "hospitalId": h_id,
                    "hospitalName": a.get("hospital_name") or h_info["name"],
                    "hospitalCode": h_info["code"],
                    "date": str(a.get("date") or ""),
                    "timeSlot": a.get("time_slot") or a.get("timeSlot") or "10:00 AM",
                    "type": a.get("type") or "In-Person",
                    "status": a.get("status") or "Upcoming",
                    "createdAt": str(a.get("created_at") or "")
                })

    # 4. Retrieve Clinical Visits / Consultations
    raw_consultations: List[Dict[str, Any]] = []

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT c.id, c.doctor_id, c.doctor_name, c.date, c.soap_data,
                               COALESCE(c.hospital_id, d.hospital_id, 'hosp-bag') as resolved_hosp_id,
                               d.specialty as doc_specialty, d.photo as doc_photo
                        FROM consultations c
                        LEFT JOIN doctors d ON c.doctor_id = d.id
                        WHERE c.patient_id::text = %s
                        ORDER BY c.date DESC
                        """,
                        (patient_id,)
                    )
                    for r in cur.fetchall():
                        rd = dict(r)
                        h_id = rd.get("resolved_hosp_id") or "hosp-bag"
                        h_info = hospital_catalog.get(h_id, {"name": "CarePulse Hospital", "code": "H001"})
                        soap = rd.get("soap_data") or {}
                        if isinstance(soap, str):
                            try:
                                soap = json.loads(soap)
                            except Exception:
                                soap = {}

                        raw_consultations.append({
                            "id": str(rd["id"]),
                            "doctorId": str(rd.get("doctor_id") or ""),
                            "doctorName": rd.get("doctor_name") or "Specialist Physician",
                            "doctorSpecialty": rd.get("doc_specialty") or "General Medicine",
                            "doctorPhoto": rd.get("doc_photo") or "",
                            "hospitalId": h_id,
                            "hospitalName": h_info["name"],
                            "hospitalCode": h_info["code"],
                            "date": str(rd.get("date") or ""),
                            "chiefComplaint": soap.get("chiefComplaint") or soap.get("assessment") or "OPD Consultation",
                            "diagnosis": soap.get("assessment") or "Routine Clinical Examination",
                            "subjective": soap.get("subjective") or "",
                            "objective": soap.get("objective") or "",
                            "assessment": soap.get("assessment") or "",
                            "plan": soap.get("plan") or "",
                            "vitals": soap.get("vitals") or {},
                            "prescriptions": soap.get("prescriptions") or []
                        })
        except Exception as e:
            logger.warning(f"Note on PG consultations fetch: {e}")

    # Fallback to JSON DB consultations
    if not raw_consultations:
        db = read_json_db()
        for c in db.get("consultations", []):
            if str(c.get("patient_id") or "") == patient_id:
                h_id = c.get("hospital_id") or c.get("hospitalId") or "hosp-bag"
                h_info = hospital_catalog.get(h_id, {"name": "CarePulse Hospital", "code": "H001"})
                soap = c.get("soap_data") or {}
                raw_consultations.append({
                    "id": str(c.get("id")),
                    "doctorId": str(c.get("doctor_id") or ""),
                    "doctorName": c.get("doctor_name") or "Specialist Physician",
                    "doctorSpecialty": c.get("doctor_specialty") or "General Medicine",
                    "doctorPhoto": c.get("doctor_photo") or "",
                    "hospitalId": h_id,
                    "hospitalName": h_info["name"],
                    "hospitalCode": h_info["code"],
                    "date": str(c.get("date") or ""),
                    "chiefComplaint": soap.get("chiefComplaint") or soap.get("assessment") or "OPD Consultation",
                    "diagnosis": soap.get("assessment") or "Routine Clinical Examination",
                    "subjective": soap.get("subjective") or "",
                    "objective": soap.get("objective") or "",
                    "assessment": soap.get("assessment") or "",
                    "plan": soap.get("plan") or "",
                    "vitals": soap.get("vitals") or {},
                    "prescriptions": soap.get("prescriptions") or []
                })

    # 5. Extract and Classify Prescriptions (Active vs Previous)
    all_prescriptions: List[Dict[str, Any]] = []

    # A. From Prescriptions Table
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, patient_id, drug_name, dosage, frequency, meal_timing,
                               prescriber, icon_type, created_at
                        FROM prescriptions
                        WHERE patient_id::text = %s
                        ORDER BY created_at DESC
                        """,
                        (patient_id,)
                    )
                    for r in cur.fetchall():
                        rd = dict(r)
                        c_at = str(rd.get("created_at") or "")
                        all_prescriptions.append({
                            "id": str(rd["id"]),
                            "drugName": rd.get("drug_name") or "Prescribed Medication",
                            "dosage": rd.get("dosage") or "As directed",
                            "frequency": rd.get("frequency") or "Once Daily",
                            "mealTiming": rd.get("meal_timing") or "After Food",
                            "instructions": f"{rd.get('dosage') or ''} • {rd.get('frequency') or ''} • {rd.get('meal_timing') or 'After Food'}",
                            "prescriber": rd.get("prescriber") or "Treating Physician",
                            "hospitalId": current_hosp_id,
                            "hospitalName": current_hosp_info["name"],
                            "hospitalCode": current_hosp_info["code"],
                            "prescribedDate": c_at[:10] if len(c_at) >= 10 else datetime.now().strftime("%Y-%m-%d"),
                            "createdAt": c_at,
                            "source": "prescriptions_table"
                        })
        except Exception as e:
            logger.warning(f"Note on PG prescriptions table fetch: {e}")

    # B. From Consultations SOAP data
    for consult in raw_consultations:
        c_hosp_id = consult.get("hospitalId") or current_hosp_id
        c_hosp_name = consult.get("hospitalName") or current_hosp_info["name"]
        c_hosp_code = consult.get("hospitalCode") or current_hosp_info["code"]
        c_doc = consult.get("doctorName") or "Treating Physician"
        c_date = consult.get("date") or datetime.now().strftime("%Y-%m-%d")

        meds = consult.get("prescriptions") or []
        for idx, med in enumerate(meds):
            if isinstance(med, dict):
                drug_name = med.get("drugName") or med.get("name") or med.get("medicine") or ""
                if not drug_name:
                    continue
                dosage = med.get("dosage") or med.get("dose") or "1 tab"
                freq = med.get("frequency") or "Twice daily"
                dur = med.get("duration") or "5 days"
                inst = med.get("instructions") or med.get("timing") or "After meals"

                all_prescriptions.append({
                    "id": f"rx-{consult['id']}-{idx}",
                    "drugName": drug_name,
                    "dosage": dosage,
                    "frequency": freq,
                    "duration": dur,
                    "mealTiming": inst,
                    "instructions": f"{dosage} • {freq} • for {dur} ({inst})",
                    "prescriber": c_doc,
                    "hospitalId": c_hosp_id,
                    "hospitalName": c_hosp_name,
                    "hospitalCode": c_hosp_code,
                    "prescribedDate": c_date,
                    "source": "consultation"
                })
            elif isinstance(med, str) and med.strip():
                all_prescriptions.append({
                    "id": f"rx-str-{consult['id']}-{idx}",
                    "drugName": med.strip(),
                    "dosage": "Standard dose",
                    "frequency": "As directed",
                    "duration": "7 days",
                    "mealTiming": "After Food",
                    "instructions": med.strip(),
                    "prescriber": c_doc,
                    "hospitalId": c_hosp_id,
                    "hospitalName": c_hosp_name,
                    "hospitalCode": c_hosp_code,
                    "prescribedDate": c_date,
                    "source": "consultation"
                })

    # Classify Active vs Previous (threshold: 30 days)
    today = datetime.now().date()
    cutoff_active_date = today - timedelta(days=30)

    for rx in all_prescriptions:
        rx_date_str = rx.get("prescribedDate")
        is_recent = True
        if rx_date_str:
            try:
                rx_dt = datetime.strptime(rx_date_str[:10], "%Y-%m-%d").date()
                is_recent = rx_dt >= cutoff_active_date
            except Exception:
                is_recent = True
        rx["isActive"] = is_recent
        rx["status"] = "Active Regimen" if is_recent else "Completed / Previous"

    # 6. Retrieve Latest Vitals & Diagnostics
    latest_vitals: Optional[Dict[str, Any]] = None
    lab_tests: List[Dict[str, Any]] = []

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    # Vitals
                    cur.execute(
                        """
                        SELECT v.*, s.full_name as recorded_by_name
                        FROM vitals v
                        LEFT JOIN staff s ON v.recorded_by = s.id
                        WHERE v.patient_id::text = %s
                        ORDER BY v.recorded_at DESC
                        LIMIT 1
                        """,
                        (patient_id,)
                    )
                    v_row = cur.fetchone()
                    if v_row:
                        vd = dict(v_row)
                        abnormal_flags = []
                        sys = vd.get("bp_systolic")
                        dia = vd.get("bp_diastolic")
                        if sys and (sys > 140 or sys < 90):
                            abnormal_flags.append(f"Systolic BP {sys} mmHg")
                        if dia and (dia > 90 or dia < 60):
                            abnormal_flags.append(f"Diastolic BP {dia} mmHg")
                        hr = vd.get("heart_rate")
                        if hr and (hr > 100 or hr < 60):
                            abnormal_flags.append(f"Heart Rate {hr} bpm")
                        spo2 = vd.get("spo2")
                        if spo2 and spo2 < 95:
                            abnormal_flags.append(f"SpO2 {spo2}%")
                        temp = vd.get("temperature")
                        if temp:
                            c_temp = temp if vd.get("temperature_unit") != "F" else (temp - 32) * 5/9
                            if c_temp > 38.0 or c_temp < 35.0:
                                abnormal_flags.append(f"Temp {temp}°{vd.get('temperature_unit', 'C')}")

                        latest_vitals = {
                            "id": str(vd["id"]),
                            "bpSystolic": sys or 120,
                            "bpDiastolic": dia or 80,
                            "bloodPressure": f"{sys or 120}/{dia or 80} mmHg",
                            "heartRate": hr or 72,
                            "temperature": float(temp or 98.6),
                            "temperatureUnit": vd.get("temperature_unit") or "F",
                            "spo2": spo2 or 99,
                            "weightKg": float(vd.get("weight_kg") or 68),
                            "heightCm": float(vd.get("height_cm") or 170),
                            "bmi": float(vd.get("bmi") or 23.5),
                            "bloodGlucose": float(vd.get("blood_glucose") or 95),
                            "glucoseContext": vd.get("glucose_context") or "Random",
                            "recordedAt": str(vd.get("recorded_at") or ""),
                            "recordedBy": vd.get("recorded_by_name") or "Staff Nurse",
                            "abnormalFlags": abnormal_flags
                        }

                    # Lab tests
                    cur.execute(
                        """
                        SELECT l.*, s.full_name as recorded_by_name
                        FROM lab_tests l
                        LEFT JOIN staff s ON l.recorded_by = s.id
                        WHERE l.patient_id::text = %s
                        ORDER BY l.recorded_at DESC
                        LIMIT 10
                        """,
                        (patient_id,)
                    )
                    for lr in cur.fetchall():
                        ld = dict(lr)
                        lab_tests.append({
                            "id": str(ld["id"]),
                            "testType": ld.get("test_type") or "Diagnostic Panel",
                            "status": ld.get("status") or "completed",
                            "results": ld.get("structured_results") or {},
                            "freeTextResult": ld.get("free_text_result") or "",
                            "fileUrl": ld.get("file_url") or "",
                            "recordedAt": str(ld.get("recorded_at") or "")
                        })
        except Exception as e:
            logger.warning(f"Note on PG vitals/tests fetch: {e}")

    # Fallback vitals from latest consultation if not in vitals table
    if not latest_vitals and raw_consultations:
        c_vitals = raw_consultations[0].get("vitals") or {}
        if c_vitals:
            latest_vitals = {
                "bloodPressure": f"{c_vitals.get('bpSys', 120)}/{c_vitals.get('bpDia', 80)} mmHg",
                "bpSystolic": c_vitals.get("bpSys", 120),
                "bpDiastolic": c_vitals.get("bpDia", 80),
                "heartRate": c_vitals.get("heartRate", 74),
                "temperature": c_vitals.get("temperature", 98.6),
                "temperatureUnit": "F",
                "spo2": c_vitals.get("spo2", 99),
                "weightKg": c_vitals.get("weight", 68),
                "heightCm": 170,
                "bmi": 23.5,
                "recordedAt": raw_consultations[0].get("date"),
                "recordedBy": raw_consultations[0].get("doctorName"),
                "abnormalFlags": []
            }

    # 7. Check Active Token for today at this hospital
    active_token = None
    today_str = datetime.now().strftime("%Y-%m-%d")
    for appt in raw_appointments:
        if appt.get("hospitalId") == current_hosp_id and appt.get("date") == today_str:
            if appt.get("status") in ["Upcoming", "Waiting", "Checked In"]:
                active_token = {
                    "appointmentId": appt["id"],
                    "ticketNumber": appt["ticketNumber"],
                    "doctorName": appt["doctorName"],
                    "timeSlot": appt["timeSlot"],
                    "status": appt["status"]
                }
                break

    # 8. Partition into Hospital-Scoped vs Other Hospitals
    current_hosp_appts_active = [a for a in raw_appointments if a.get("hospitalId") == current_hosp_id and a.get("status") in ["Upcoming", "Waiting", "Checked In", "Scheduled"]]
    current_hosp_appts_past = [a for a in raw_appointments if a.get("hospitalId") == current_hosp_id and a.get("status") in ["Completed", "Cancelled", "No Show"]]
    current_hosp_visits = [c for c in raw_consultations if c.get("hospitalId") == current_hosp_id]
    current_hosp_rx_active = [rx for rx in all_prescriptions if rx.get("hospitalId") == current_hosp_id and rx.get("isActive")]
    current_hosp_rx_previous = [rx for rx in all_prescriptions if rx.get("hospitalId") == current_hosp_id and not rx.get("isActive")]

    # Group records from other hospitals
    other_hospital_ids = set()
    for a in raw_appointments:
        if a.get("hospitalId") and a.get("hospitalId") != current_hosp_id:
            other_hospital_ids.add(a["hospitalId"])
    for c in raw_consultations:
        if c.get("hospitalId") and c.get("hospitalId") != current_hosp_id:
            other_hospital_ids.add(c["hospitalId"])
    for rx in all_prescriptions:
        if rx.get("hospitalId") and rx.get("hospitalId") != current_hosp_id:
            other_hospital_ids.add(rx["hospitalId"])

    other_hospitals_records: List[Dict[str, Any]] = []
    for o_hosp_id in other_hospital_ids:
        o_hosp_info = hospital_catalog.get(o_hosp_id, {"name": "Network Hospital", "code": "H000"})
        o_appts_active = [a for a in raw_appointments if a.get("hospitalId") == o_hosp_id and a.get("status") in ["Upcoming", "Waiting", "Checked In", "Scheduled"]]
        o_appts_past = [a for a in raw_appointments if a.get("hospitalId") == o_hosp_id and a.get("status") in ["Completed", "Cancelled", "No Show"]]
        o_visits = [c for c in raw_consultations if c.get("hospitalId") == o_hosp_id]
        o_rx_active = [rx for rx in all_prescriptions if rx.get("hospitalId") == o_hosp_id and rx.get("isActive")]
        o_rx_previous = [rx for rx in all_prescriptions if rx.get("hospitalId") == o_hosp_id and not rx.get("isActive")]

        other_hospitals_records.append({
            "hospitalId": o_hosp_id,
            "hospitalName": o_hosp_info["name"],
            "hospitalCode": o_hosp_info["code"],
            "activeAppointments": o_appts_active,
            "pastAppointments": o_appts_past,
            "visits": o_visits,
            "activePrescriptions": o_rx_active,
            "previousPrescriptions": o_rx_previous
        })

    # Summary Statistics
    summary = {
        "totalAppointments": len(raw_appointments),
        "currentHospitalAppointments": len(current_hosp_appts_active) + len(current_hosp_appts_past),
        "totalVisits": len(raw_consultations),
        "currentHospitalVisits": len(current_hosp_visits),
        "totalPrescriptions": len(all_prescriptions),
        "currentHospitalPrescriptions": len(current_hosp_rx_active) + len(current_hosp_rx_previous),
        "activePrescriptionsCount": len([rx for rx in all_prescriptions if rx.get("isActive")]),
        "otherHospitalsCount": len(other_hospitals_records)
    }

    return {
        "success": True,
        "scannedHospital": {
            "id": current_hosp_id,
            "name": current_hosp_info["name"],
            "code": current_hosp_info["code"]
        },
        "patient": patient_dto,
        "summary": summary,
        "activeToken": active_token,
        "currentHospitalRecords": {
            "hospitalId": current_hosp_id,
            "hospitalName": current_hosp_info["name"],
            "hospitalCode": current_hosp_info["code"],
            "activeAppointments": current_hosp_appts_active,
            "pastAppointments": current_hosp_appts_past,
            "visits": current_hosp_visits,
            "activePrescriptions": current_hosp_rx_active,
            "previousPrescriptions": current_hosp_rx_previous,
            "latestVitals": latest_vitals,
            "labTests": lab_tests
        },
        "otherHospitalsRecords": other_hospitals_records,
        "allRecords": {
            "activeAppointments": [a for a in raw_appointments if a.get("status") in ["Upcoming", "Waiting", "Checked In", "Scheduled"]],
            "pastAppointments": [a for a in raw_appointments if a.get("status") in ["Completed", "Cancelled", "No Show"]],
            "visits": raw_consultations,
            "activePrescriptions": [rx for rx in all_prescriptions if rx.get("isActive")],
            "previousPrescriptions": [rx for rx in all_prescriptions if not rx.get("isActive")],
            "latestVitals": latest_vitals,
            "labTests": lab_tests
        }
    }
