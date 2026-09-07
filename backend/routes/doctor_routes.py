# backend/routes/doctor_routes.py
import logging
import uuid
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Header, status
from pydantic import BaseModel
import database
from database import read_json_db, write_json_db, get_pg_connection
from routes.staff_auth import get_current_staff
from schemas import ConsultationCreate, ConsultationResponse, AppointmentResponse

logger = logging.getLogger("carepulse.doctor")

router = APIRouter(prefix="/api/doctor", tags=["Doctor Portal"])


@router.get("/appointments", response_model=List[AppointmentResponse])
def get_doctor_appointments(
    doctor_id: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    Retrieve appointments scoped to the doctor's own hospital and doctor profile.
    Fails safely returning [] if doctor's hospital_id=NULL.
    """
    staff_ctx = get_current_staff(authorization) if authorization else None
    effective_hosp_id = None
    target_doc_id = doctor_id

    if staff_ctx:
        role = staff_ctx.get("role")
        if role in ["doctor", "receptionist"]:
            staff_hosp = staff_ctx.get("hospital_id")
            if not staff_hosp:
                logger.warning(
                    f"Data integrity issue: Staff {staff_ctx.get('staff_id')} ({role}) "
                    f"has hospital_id=NULL. Failing safely with empty result set."
                )
                return []
            effective_hosp_id = staff_hosp
            if role == "doctor" and staff_ctx.get("doctor_id"):
                target_doc_id = staff_ctx["doctor_id"]

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    query = """
                        SELECT a.*, p.full_name as p_name, d.hospital_id as doc_hospital_id
                        FROM appointments a
                        LEFT JOIN patients p ON a.patient_id = p.id
                        LEFT JOIN doctors d ON a.doctor_id = d.id
                        WHERE 1=1
                    """
                    params = []
                    if effective_hosp_id:
                        query += " AND (a.hospital_id = %s OR (a.hospital_id IS NULL AND d.hospital_id = %s))"
                        params.extend([effective_hosp_id, effective_hosp_id])
                    if target_doc_id:
                        query += " AND a.doctor_id = %s"
                        params.append(target_doc_id)
                    query += " ORDER BY a.date DESC, a.created_at DESC"

                    cur.execute(query, tuple(params))
                    rows = cur.fetchall()
                    result = []
                    for r in rows:
                        result.append(AppointmentResponse(
                            id=str(r["id"]),
                            ticketNumber=r.get("ticket_number") or "#CP-1001",
                            patientId=str(r.get("patient_id") or ""),
                            patientName=r.get("p_name") or "",
                            doctorId=r["doctor_id"],
                            doctorName=r["doctor_name"],
                            doctorSpecialty=r.get("doctor_specialty") or "General Medicine",
                            doctorPhoto=r.get("doctor_photo") or "",
                            hospitalId=r.get("hospital_id") or r.get("doc_hospital_id") or effective_hosp_id or "hosp-1",
                            hospital_id=r.get("hospital_id") or r.get("doc_hospital_id") or effective_hosp_id or "hosp-1",
                            hospitalName=r.get("hospital_name") or "CarePulse Central Hospital",
                            date=str(r["date"]),
                            timeSlot=r["time_slot"],
                            type=r.get("type") or "In-Person",
                            status=r.get("status") or "Upcoming"
                        ))
                    return result
        except Exception as e:
            logger.warning(f"DB doctor appointments query note: {e}")

    db = read_json_db()
    apps = db.get("appointments", [])
    doc_hosp_map = {d.get("id"): (d.get("hospital_id") or d.get("hospitalId")) for d in db.get("doctors", [])}

    result = []
    for a in apps:
        app_hosp = a.get("hospital_id") or a.get("hospitalId") or doc_hosp_map.get(a.get("doctor_id"))
        if effective_hosp_id and app_hosp != effective_hosp_id:
            continue
        if target_doc_id and a.get("doctor_id") != target_doc_id:
            continue
        result.append(AppointmentResponse(
            id=a["id"],
            ticketNumber=a.get("ticket_number", "#CP-1001"),
            patientId=a.get("patient_id", ""),
            patientName=a.get("patient_name", ""),
            doctorId=a["doctor_id"],
            doctorName=a["doctor_name"],
            doctorSpecialty=a.get("doctor_specialty", "General Medicine"),
            doctorPhoto=a.get("doctor_photo", ""),
            hospitalId=app_hosp or "hosp-1",
            hospital_id=app_hosp or "hosp-1",
            hospitalName=a.get("hospital_name", "CarePulse Central Hospital"),
            date=str(a["date"]),
            timeSlot=a["time_slot"],
            type=a.get("type", "In-Person"),
            status=a.get("status", "Upcoming")
        ))
    return result


@router.get("/consultations", response_model=List[ConsultationResponse])
def get_doctor_consultations(
    doctor_id: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    Retrieve clinical consultations scoped to the doctor's hospital and profile.
    Fails safely returning [] if doctor's hospital_id=NULL.
    """
    staff_ctx = get_current_staff(authorization) if authorization else None
    effective_hosp_id = None
    target_doc_id = doctor_id

    if staff_ctx:
        role = staff_ctx.get("role")
        if role in ["doctor", "receptionist"]:
            staff_hosp = staff_ctx.get("hospital_id")
            if not staff_hosp:
                logger.warning(
                    f"Data integrity issue: Staff {staff_ctx.get('staff_id')} ({role}) "
                    f"has hospital_id=NULL. Failing safely with empty result set."
                )
                return []
            effective_hosp_id = staff_hosp
            if role == "doctor" and staff_ctx.get("doctor_id"):
                target_doc_id = staff_ctx["doctor_id"]

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    query = """
                        SELECT c.id, c.doctor_id, c.doctor_name, c.hospital_id, c.date, c.soap_data, p.full_name as patient_name,
                               d.hospital_id as doc_hospital_id
                        FROM consultations c
                        LEFT JOIN patients p ON c.patient_id = p.id
                        LEFT JOIN doctors d ON c.doctor_id = d.id
                        WHERE 1=1
                    """
                    params = []
                    if effective_hosp_id:
                        query += " AND (c.hospital_id = %s OR (c.hospital_id IS NULL AND d.hospital_id = %s))"
                        params.extend([effective_hosp_id, effective_hosp_id])
                    if target_doc_id:
                        query += " AND c.doctor_id = %s"
                        params.append(target_doc_id)
                    query += " ORDER BY c.date DESC"

                    cur.execute(query, tuple(params))
                    rows = cur.fetchall()
                    result = []
                    for r in rows:
                        result.append(ConsultationResponse(
                            id=str(r["id"]),
                            doctor_id=r.get("doctor_id"),
                            doctor_name=r["doctor_name"],
                            hospital_id=r.get("hospital_id") or r.get("doc_hospital_id") or effective_hosp_id or "hosp-1",
                            hospitalId=r.get("hospital_id") or r.get("doc_hospital_id") or effective_hosp_id or "hosp-1",
                            date=str(r["date"]),
                            soap_data=r["soap_data"] if isinstance(r["soap_data"], dict) else json.loads(r["soap_data"]),
                            patient_name=r.get("patient_name") or "Unknown Patient"
                        ))
                    return result
        except Exception as e:
            logger.warning(f"DB doctor consultations query note: {e}")

    db = read_json_db()
    consultations = db.get("consultations", [])
    patients = {p["id"]: p.get("full_name", "Unknown Patient") for p in db.get("patients", [])}
    doc_hosp_map = {d.get("id"): (d.get("hospital_id") or d.get("hospitalId")) for d in db.get("doctors", [])}

    result = []
    for c in reversed(consultations):
        c_hosp = c.get("hospital_id") or c.get("hospitalId") or doc_hosp_map.get(c.get("doctor_id"))
        if effective_hosp_id and c_hosp != effective_hosp_id:
            continue
        if target_doc_id and c.get("doctor_id") != target_doc_id:
            continue
        p_name = patients.get(c.get("patient_id"), "Unknown Patient")
        result.append(ConsultationResponse(
            id=c["id"],
            doctor_id=c.get("doctor_id"),
            doctor_name=c["doctor_name"],
            hospital_id=c_hosp or "hosp-1",
            hospitalId=c_hosp or "hosp-1",
            date=c["date"],
            soap_data=c.get("soap_data", {}),
            patient_name=p_name
        ))
    return result


@router.post("/consultations", status_code=status.HTTP_201_CREATED)
def create_doctor_consultation(
    data: ConsultationCreate,
    authorization: Optional[str] = Header(None)
):
    """
    Create a consultation SOAP record from the Doctor portal.
    Server-side derives hospital_id from the authenticated doctor's authoritative hospital record,
    ignoring any client-supplied hospital_id in the request payload.
    """
    patient_id = data.patientId or "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
    date_val = data.date or datetime.now().strftime("%Y-%m-%d")

    # Authoritative hospital derivation
    derived_hospital_id = None

    if authorization:
        staff_ctx = get_current_staff(authorization)
        if staff_ctx:
            if staff_ctx.get("role") == "nurse":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Nurse accounts are not authorized to create doctor consultations or write prescriptions."
                )
            if staff_ctx.get("hospital_id"):
                derived_hospital_id = staff_ctx["hospital_id"]

    if not derived_hospital_id:
        if database.use_pg:
            try:
                with get_pg_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT hospital_id FROM doctors WHERE id = %s LIMIT 1", (data.doctorId,))
                        d_row = cur.fetchone()
                        if d_row and d_row.get("hospital_id"):
                            derived_hospital_id = d_row["hospital_id"]
            except Exception as e:
                logger.warning(f"DB doctor lookup note: {e}")

    if not derived_hospital_id:
        db = read_json_db()
        for doc in db.get("doctors", []):
            if doc.get("id") == data.doctorId:
                derived_hospital_id = doc.get("hospital_id") or doc.get("hospitalId")
                break

    if not derived_hospital_id:
        derived_hospital_id = "hosp-1"

    if database.use_pg:
        new_id = str(uuid.uuid4())
        soap_json = json.dumps(data.soapData)
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                # Ensure patient exists or link to first patient
                cur.execute("SELECT id FROM patients WHERE id::text = %s", (patient_id,))
                row_p = cur.fetchone()
                if not row_p:
                    cur.execute("SELECT id FROM patients LIMIT 1")
                    first_p = cur.fetchone()
                    if first_p:
                        patient_id = str(first_p["id"])
                    else:
                        patient_id = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"

                cur.execute("""
                    INSERT INTO consultations (id, patient_id, doctor_id, doctor_name, hospital_id, date, soap_data)
                    VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
                    RETURNING *
                """, (new_id, patient_id, data.doctorId, data.doctorName, derived_hospital_id, date_val, soap_json))
                row = cur.fetchone()
                conn.commit()
                return {
                    "id": str(row["id"]),
                    "doctor_name": row["doctor_name"],
                    "hospital_id": row.get("hospital_id") or derived_hospital_id,
                    "hospitalId": row.get("hospital_id") or derived_hospital_id,
                    "date": str(row["date"]),
                    "soap_data": row["soap_data"]
                }
    else:
        db = read_json_db()
        new_record = {
            "id": f"c-{uuid.uuid4().hex[:12]}",
            "patient_id": patient_id,
            "doctor_id": data.doctorId,
            "doctor_name": data.doctorName,
            "hospital_id": derived_hospital_id,
            "hospitalId": derived_hospital_id,
            "date": date_val,
            "soap_data": data.soapData,
            "soap_embedding": data.soapEmbedding or []
        }
        db.setdefault("consultations", []).append(new_record)
        write_json_db(db)
        return {
            "id": new_record["id"],
            "doctor_name": new_record["doctor_name"],
            "hospital_id": new_record["hospital_id"],
            "hospitalId": new_record["hospital_id"],
            "date": new_record["date"],
            "soap_data": new_record["soap_data"]
        }


@router.get("/consultation-prep/{appointment_id}")
def get_consultation_prep(
    appointment_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Returns pre-consultation clinical data (vitals, auto-calculated BMI, abnormal flags,
    and lab test reports) recorded by nurses for the given appointment.
    """
    result = {
        "appointment_id": appointment_id,
        "has_vitals": False,
        "vitals": None,
        "lab_tests": [],
        "abnormal_flags": []
    }

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    # 1. Fetch vitals
                    cur.execute("""
                        SELECT v.*, s.full_name as recorded_by_name
                        FROM vitals v
                        LEFT JOIN staff s ON v.recorded_by = s.id
                        WHERE v.appointment_id = %s
                        ORDER BY v.recorded_at DESC LIMIT 1
                    """, (appointment_id,))
                    v_row = cur.fetchone()
                    if v_row:
                        v_dict = dict(v_row)
                        # Format numeric and datetime fields
                        v_dict["id"] = str(v_dict["id"])
                        v_dict["appointment_id"] = str(v_dict["appointment_id"])
                        v_dict["patient_id"] = str(v_dict["patient_id"])
                        v_dict["recorded_by"] = str(v_dict["recorded_by"]) if v_dict.get("recorded_by") else None
                        v_dict["recorded_at"] = str(v_dict["recorded_at"]) if v_dict.get("recorded_at") else None
                        v_dict["bmi"] = float(v_dict["bmi"]) if v_dict.get("bmi") is not None else None
                        v_dict["height_cm"] = float(v_dict["height_cm"]) if v_dict.get("height_cm") is not None else None
                        v_dict["weight_kg"] = float(v_dict["weight_kg"]) if v_dict.get("weight_kg") is not None else None
                        v_dict["temperature"] = float(v_dict["temperature"]) if v_dict.get("temperature") is not None else None
                        v_dict["blood_glucose"] = float(v_dict["blood_glucose"]) if v_dict.get("blood_glucose") is not None else None

                        # Compute abnormal flags
                        flags = []
                        sys = v_dict.get("bp_systolic")
                        dia = v_dict.get("bp_diastolic")
                        if sys and (sys > 140 or sys < 90):
                            flags.append(f"Abnormal BP Systolic: {sys} mmHg")
                        if dia and (dia > 90 or dia < 60):
                            flags.append(f"Abnormal BP Diastolic: {dia} mmHg")
                        hr = v_dict.get("heart_rate")
                        if hr and (hr > 100 or hr < 60):
                            flags.append(f"Abnormal Heart Rate: {hr} bpm")
                        spo2 = v_dict.get("spo2")
                        if spo2 and spo2 < 95:
                            flags.append(f"Low SpO2: {spo2}%")
                        temp = v_dict.get("temperature")
                        if temp:
                            c_temp = temp if v_dict.get("temperature_unit") != "F" else (temp - 32) * 5/9
                            if c_temp > 38.0:
                                flags.append(f"Fever: {temp}°{v_dict.get('temperature_unit', 'C')}")
                            elif c_temp < 35.0:
                                flags.append(f"Hypothermia: {temp}°{v_dict.get('temperature_unit', 'C')}")
                        bg = v_dict.get("blood_glucose")
                        ctx = (v_dict.get("glucose_context") or "").lower()
                        if bg:
                            if ctx == "fasting" and bg > 126:
                                flags.append(f"Elevated Fasting Glucose: {bg} mg/dL")
                            elif bg > 200:
                                flags.append(f"Elevated Glucose: {bg} mg/dL")
                            elif bg < 70:
                                flags.append(f"Hypoglycemia: {bg} mg/dL")

                        v_dict["abnormal_flags"] = flags
                        result["has_vitals"] = True
                        result["vitals"] = v_dict
                        result["abnormal_flags"] = flags

                    # 2. Fetch lab tests
                    cur.execute("""
                        SELECT l.*, s.full_name as recorded_by_name
                        FROM lab_tests l
                        LEFT JOIN staff s ON l.recorded_by = s.id
                        WHERE l.appointment_id = %s
                        ORDER BY l.recorded_at ASC
                    """, (appointment_id,))
                    l_rows = cur.fetchall()
                    if l_rows:
                        formatted_tests = []
                        for lr in l_rows:
                            ld = dict(lr)
                            ld["id"] = str(ld["id"])
                            ld["appointment_id"] = str(ld["appointment_id"])
                            ld["patient_id"] = str(ld["patient_id"])
                            ld["recorded_by"] = str(ld["recorded_by"]) if ld.get("recorded_by") else None
                            ld["recorded_at"] = str(ld["recorded_at"]) if ld.get("recorded_at") else None
                            if isinstance(ld.get("structured_results"), str):
                                try:
                                    ld["structured_results"] = json.loads(ld["structured_results"])
                                except Exception:
                                    ld["structured_results"] = {}
                            formatted_tests.append(ld)
                        result["lab_tests"] = formatted_tests

                    return result
        except Exception as e:
            logger.warning(f"DB get consultation prep note: {e}")

    # Fallback to JSON DB
    db = read_json_db()
    vitals_list = db.get("vitals", [])
    for v in vitals_list:
        if v.get("appointment_id") == appointment_id:
            result["has_vitals"] = True
            result["vitals"] = v
            result["abnormal_flags"] = v.get("abnormal_flags", [])
            break
    lab_tests_list = db.get("lab_tests", [])
    result["lab_tests"] = [t for t in lab_tests_list if t.get("appointment_id") == appointment_id]
    return result
