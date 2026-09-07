# backend/routes/nurse_routes.py
import os
import re
import uuid
import json
import base64
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path
from fastapi import APIRouter, HTTPException, Header, status

import database
from database import read_json_db, write_json_db, get_pg_connection
from routes.staff_auth import get_current_staff
from schemas import (
    VitalsCreateRequest,
    VitalsResponse,
    LabTestCreateRequest,
    LabTestResponse,
    ReportUploadRequest,
    ReportUploadResponse
)

logger = logging.getLogger("carepulse.nurse")

router = APIRouter(prefix="/api/nurse", tags=["Nurse Portal"])

# Ensure static report storage directory exists
REPORTS_DIR = Path(__file__).resolve().parent.parent / "static_downloads" / "lab_reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


# =========================================================================
# Clinical Reference Thresholds for Abnormal Vitals Screening
# NOTE: These thresholds represent general adult reference ranges and are
# NOT adjusted for patient age (pediatric/geriatric), pregnancy trimester,
# athlete physiology, or specific pre-existing chronic conditions.
# Consistent with clinical decision support limitations documented in CarePulse
# (e.g., OpenFDA formulation and dosage caveats), abnormal flags serve as
# preliminary screening cues for triage and require attending physician interpretation.
# =========================================================================
ADULT_VITALS_THRESHOLDS = {
    "bp_systolic_high": 140,
    "bp_systolic_low": 90,
    "bp_diastolic_high": 90,
    "bp_diastolic_low": 60,
    "heart_rate_high": 100,
    "heart_rate_low": 60,
    "respiratory_rate_high": 20,
    "respiratory_rate_low": 12,
    "spo2_low": 95,
    "temp_fever_c": 38.0,
    "temp_hypo_c": 35.0,
    "glucose_fasting_high": 126.0,
    "glucose_random_high": 200.0,
    "glucose_low": 70.0,
    "bmi_underweight": 18.5,
    "bmi_overweight": 25.0,
    "bmi_obese": 30.0,
}


def calculate_abnormal_flags(v: Dict[str, Any]) -> List[str]:
    """
    Evaluates vital sign readings against adult reference ranges.
    Returns human-readable clinical warning strings for abnormal values.
    """
    flags = []

    # Blood Pressure
    sys = v.get("bp_systolic")
    dia = v.get("bp_diastolic")
    if sys is not None:
        if sys > ADULT_VITALS_THRESHOLDS["bp_systolic_high"]:
            flags.append(f"Elevated Systolic BP ({sys} mmHg > 140)")
        elif sys < ADULT_VITALS_THRESHOLDS["bp_systolic_low"]:
            flags.append(f"Low Systolic BP ({sys} mmHg < 90)")
    if dia is not None:
        if dia > ADULT_VITALS_THRESHOLDS["bp_diastolic_high"]:
            flags.append(f"Elevated Diastolic BP ({dia} mmHg > 90)")
        elif dia < ADULT_VITALS_THRESHOLDS["bp_diastolic_low"]:
            flags.append(f"Low Diastolic BP ({dia} mmHg < 60)")

    # Heart Rate
    hr = v.get("heart_rate")
    if hr is not None:
        if hr > ADULT_VITALS_THRESHOLDS["heart_rate_high"]:
            flags.append(f"Tachycardia ({hr} bpm > 100)")
        elif hr < ADULT_VITALS_THRESHOLDS["heart_rate_low"]:
            flags.append(f"Bradycardia ({hr} bpm < 60)")

    # SpO2 Blood Oxygen
    spo2 = v.get("spo2")
    if spo2 is not None and spo2 < ADULT_VITALS_THRESHOLDS["spo2_low"]:
        flags.append(f"Hypoxemia Risk ({spo2}% < 95%)")

    # Respiratory Rate
    rr = v.get("respiratory_rate")
    if rr is not None:
        if rr > ADULT_VITALS_THRESHOLDS["respiratory_rate_high"]:
            flags.append(f"Tachypnea ({rr} breaths/min > 20)")
        elif rr < ADULT_VITALS_THRESHOLDS["respiratory_rate_low"]:
            flags.append(f"Bradypnea ({rr} breaths/min < 12)")

    # Temperature
    temp = v.get("temperature")
    temp_unit = v.get("temperature_unit") or "C"
    if temp is not None:
        c_temp = temp if temp_unit.upper() != "F" else (temp - 32) * 5 / 9
        if c_temp >= ADULT_VITALS_THRESHOLDS["temp_fever_c"]:
            flags.append(f"Fever ({temp}°{temp_unit})")
        elif c_temp < ADULT_VITALS_THRESHOLDS["temp_hypo_c"]:
            flags.append(f"Hypothermia ({temp}°{temp_unit})")

    # Blood Glucose
    bg = v.get("blood_glucose")
    ctx = (v.get("glucose_context") or "").strip().lower()
    if bg is not None:
        if bg < ADULT_VITALS_THRESHOLDS["glucose_low"]:
            flags.append(f"Hypoglycemia ({bg} mg/dL < 70)")
        elif ctx == "fasting" and bg > ADULT_VITALS_THRESHOLDS["glucose_fasting_high"]:
            flags.append(f"Elevated Fasting Glucose ({bg} mg/dL > 126)")
        elif bg > ADULT_VITALS_THRESHOLDS["glucose_random_high"]:
            flags.append(f"Elevated Glucose ({bg} mg/dL > 200)")

    # BMI
    bmi = v.get("bmi")
    if bmi is not None:
        if bmi < ADULT_VITALS_THRESHOLDS["bmi_underweight"]:
            flags.append(f"Underweight (BMI {bmi} < 18.5)")
        elif bmi >= ADULT_VITALS_THRESHOLDS["bmi_obese"]:
            flags.append(f"Obese (BMI {bmi} ≥ 30.0)")
        elif bmi >= ADULT_VITALS_THRESHOLDS["bmi_overweight"]:
            flags.append(f"Overweight (BMI {bmi} ≥ 25.0)")

    return flags


@router.get("/queue")
def get_nurse_queue(
    hospital_id: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    List today's patient queue for pre-consultation vitals recording.
    Nurses have a read-only view of the patient appointment queue with
    computed vitals status ('pending', 'recorded', 'abnormal_flagged').
    """
    staff_ctx = get_current_staff(authorization) if authorization else None
    is_superadmin = bool(staff_ctx and staff_ctx.get("role") == "superadmin")
    effective_hosp_id = hospital_id
    if staff_ctx and staff_ctx.get("hospital_id"):
        effective_hosp_id = staff_ctx["hospital_id"]

    if not is_superadmin and not effective_hosp_id:
        return {"success": True, "queue": []}

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    query = """
                        SELECT 
                            a.id AS appointment_id,
                            a.ticket_number AS token_number,
                            a.status AS queue_status,
                            a.date,
                            a.time_slot AS time,
                            a.type AS appointment_type,
                            a.hospital_id,
                            p.id AS patient_id,
                            COALESCE(p.full_name, 'Patient') AS patient_name,
                            p.dob AS patient_dob,
                            p.gender AS patient_gender,
                            p.blood_group AS patient_blood_group,
                            p.phone AS patient_phone,
                            p.patient_code,
                            d.id AS doctor_id,
                            COALESCE(d.name, a.doctor_name, 'Attending Doctor') AS doctor_name,
                            COALESCE(d.specialty, a.doctor_specialty, 'General Medicine') AS doctor_specialty,
                            COALESCE(d.room_number, 'Cabin 101') AS room_number,
                            v.id AS vitals_id,
                            v.height_cm,
                            v.weight_kg,
                            v.bmi,
                            v.bp_systolic,
                            v.bp_diastolic,
                            v.heart_rate,
                            v.temperature,
                            v.temperature_unit,
                            v.respiratory_rate,
                            v.spo2,
                            v.blood_glucose,
                            v.glucose_context,
                            v.notes AS vitals_notes,
                            v.recorded_at AS vitals_recorded_at,
                            vs.full_name AS vitals_recorded_by_name,
                            (SELECT COUNT(*) FROM lab_tests lt WHERE lt.appointment_id = a.id) AS lab_test_count
                        FROM appointments a
                        LEFT JOIN patients p ON a.patient_id = p.id
                        LEFT JOIN doctors d ON a.doctor_id = d.id
                        LEFT JOIN vitals v ON v.appointment_id = a.id
                        LEFT JOIN staff vs ON v.recorded_by = vs.id
                        WHERE 1=1
                    """
                    params = []
                    if effective_hosp_id:
                        query += " AND (a.hospital_id = %s OR (a.hospital_id IS NULL AND d.hospital_id = %s))"
                        params.extend([effective_hosp_id, effective_hosp_id])
                    elif not is_superadmin:
                        return {"success": True, "queue": []}

                    query += " ORDER BY a.created_at DESC NULLS LAST, a.date DESC"
                    cur.execute(query, tuple(params))
                    rows = cur.fetchall()

                    queue_items = []
                    for r in rows:
                        rd = dict(r)
                        vitals_recorded = rd.get("vitals_id") is not None
                        abnormal_flags = []
                        vitals_obj = None

                        if vitals_recorded:
                            vitals_obj = {
                                "id": str(rd["vitals_id"]),
                                "height_cm": float(rd["height_cm"]) if rd.get("height_cm") is not None else None,
                                "weight_kg": float(rd["weight_kg"]) if rd.get("weight_kg") is not None else None,
                                "bmi": float(rd["bmi"]) if rd.get("bmi") is not None else None,
                                "bp_systolic": rd.get("bp_systolic"),
                                "bp_diastolic": rd.get("bp_diastolic"),
                                "heart_rate": rd.get("heart_rate"),
                                "temperature": float(rd["temperature"]) if rd.get("temperature") is not None else None,
                                "temperature_unit": rd.get("temperature_unit") or "C",
                                "respiratory_rate": rd.get("respiratory_rate"),
                                "spo2": rd.get("spo2"),
                                "blood_glucose": float(rd["blood_glucose"]) if rd.get("blood_glucose") is not None else None,
                                "glucose_context": rd.get("glucose_context"),
                                "notes": rd.get("vitals_notes"),
                                "recorded_at": str(rd["vitals_recorded_at"]) if rd.get("vitals_recorded_at") else None,
                                "recorded_by_name": rd.get("vitals_recorded_by_name")
                            }
                            abnormal_flags = calculate_abnormal_flags(vitals_obj)

                        # Determine vitals status
                        if not vitals_recorded:
                            vitals_status = "pending"
                        elif len(abnormal_flags) > 0:
                            vitals_status = "abnormal_flagged"
                        else:
                            vitals_status = "recorded"

                        queue_items.append({
                            "appointment_id": str(rd["appointment_id"]),
                            "token_number": rd.get("token_number"),
                            "queue_status": rd.get("queue_status") or "waiting",
                            "vitals_status": vitals_status,
                            "date": str(rd["date"]),
                            "time": str(rd["time"]),
                            "appointment_type": rd.get("appointment_type") or "In-Person",
                            "chief_complaint": rd.get("chief_complaint") or "Routine consultation",
                            "patient": {
                                "id": str(rd["patient_id"]),
                                "name": rd.get("patient_name"),
                                "dob": str(rd.get("patient_dob") or ""),
                                "gender": rd.get("patient_gender") or "Not specified",
                                "blood_group": rd.get("patient_blood_group") or "O+",
                                "phone": rd.get("patient_phone") or "",
                                "patient_code": rd.get("patient_code")
                            },
                            "doctor": {
                                "id": str(rd["doctor_id"]),
                                "name": rd.get("doctor_name"),
                                "specialty": rd.get("doctor_specialty"),
                                "room_number": rd.get("room_number") or "Cabin 101"
                            },
                            "vitals": vitals_obj,
                            "abnormal_flags": abnormal_flags,
                            "lab_test_count": int(rd.get("lab_test_count") or 0)
                        })

                    return {"success": True, "queue": queue_items}
        except Exception as e:
            logger.warning(f"PostgreSQL nurse queue fetch note: {e}")

    # Fallback to JSON DB
    db = read_json_db()
    appointments = db.get("appointments", [])
    patients = {p["id"]: p for p in db.get("patients", [])}
    doctors = {d["id"]: d for d in db.get("doctors", [])}
    vitals_map = {v["appointment_id"]: v for v in db.get("vitals", [])}
    lab_tests = db.get("lab_tests", [])

    queue_items = []
    for a in appointments:
        if effective_hosp_id and a.get("hospital_id") != effective_hosp_id:
            continue
        if not is_superadmin and not a.get("hospital_id"):
            continue
        p = patients.get(a.get("patient_id"), {})
        d = doctors.get(a.get("doctor_id"), {})
        v = vitals_map.get(a.get("id"))
        abnormal_flags = calculate_abnormal_flags(v) if v else []
        t_count = sum(1 for lt in lab_tests if lt.get("appointment_id") == a.get("id"))

        if not v:
            v_status = "pending"
        elif len(abnormal_flags) > 0:
            v_status = "abnormal_flagged"
        else:
            v_status = "recorded"

        queue_items.append({
            "appointment_id": str(a.get("id")),
            "token_number": a.get("token_number") or a.get("tokenNumber"),
            "queue_status": a.get("queue_status") or a.get("queueStatus") or "waiting",
            "vitals_status": v_status,
            "date": a.get("date"),
            "time": a.get("time"),
            "appointment_type": a.get("appointment_type") or "In-Person",
            "chief_complaint": a.get("chief_complaint") or a.get("reason") or "Consultation",
            "patient": {
                "id": p.get("id"),
                "name": p.get("full_name") or p.get("fullName") or "Patient",
                "dob": p.get("dob", ""),
                "gender": p.get("gender", ""),
                "blood_group": p.get("blood_group") or p.get("bloodGroup", "O+"),
                "phone": p.get("phone", ""),
                "patient_code": p.get("patient_code")
            },
            "doctor": {
                "id": d.get("id"),
                "name": d.get("name", "Doctor"),
                "specialty": d.get("specialty", "General Medicine"),
                "room_number": d.get("room_number") or d.get("roomNumber") or "Cabin 101"
            },
            "vitals": v,
            "abnormal_flags": abnormal_flags,
            "lab_test_count": t_count
        })

    return {"success": True, "queue": queue_items}


@router.post("/vitals", status_code=status.HTTP_201_CREATED)
def record_vitals(
    payload: VitalsCreateRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Record or update patient vitals for an appointment.
    Auto-computes BMI and abnormal flags.
    Saves to PostgreSQL stored BMI column with nurse attribution.
    """
    staff_id = None
    staff_name = "Nurse"
    if authorization:
        staff_ctx = get_current_staff(authorization)
        if staff_ctx:
            staff_id = staff_ctx.get("staff_id")
            staff_name = staff_ctx.get("email", "Nurse")

    # Compute BMI client-side as fallback for JSON DB or immediate response
    computed_bmi = None
    if payload.height_cm and payload.height_cm > 0 and payload.weight_kg and payload.weight_kg > 0:
        h_m = payload.height_cm / 100.0
        computed_bmi = round(payload.weight_kg / (h_m * h_m), 1)

    v_dict = {
        "height_cm": payload.height_cm,
        "weight_kg": payload.weight_kg,
        "bmi": computed_bmi,
        "bp_systolic": payload.bp_systolic,
        "bp_diastolic": payload.bp_diastolic,
        "heart_rate": payload.heart_rate,
        "temperature": payload.temperature,
        "temperature_unit": payload.temperature_unit or "C",
        "respiratory_rate": payload.respiratory_rate,
        "spo2": payload.spo2,
        "blood_glucose": payload.blood_glucose,
        "glucose_context": payload.glucose_context,
        "notes": payload.notes,
    }
    abnormal_flags = calculate_abnormal_flags(v_dict)

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    # Upsert vitals for this appointment
                    cur.execute("""
                        INSERT INTO vitals (
                            appointment_id, patient_id, height_cm, weight_kg,
                            bp_systolic, bp_diastolic, heart_rate,
                            temperature, temperature_unit, respiratory_rate,
                            spo2, blood_glucose, glucose_context, notes, recorded_by
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id, appointment_id, patient_id, height_cm, weight_kg, bmi,
                                  bp_systolic, bp_diastolic, heart_rate, temperature, temperature_unit,
                                  respiratory_rate, spo2, blood_glucose, glucose_context, notes,
                                  recorded_by, recorded_at
                    """, (
                        payload.appointment_id, payload.patient_id, payload.height_cm, payload.weight_kg,
                        payload.bp_systolic, payload.bp_diastolic, payload.heart_rate,
                        payload.temperature, payload.temperature_unit or 'C', payload.respiratory_rate,
                        payload.spo2, payload.blood_glucose, payload.glucose_context, payload.notes,
                        staff_id
                    ))
                    row = cur.fetchone()
                    conn.commit()
                    if row:
                        res = dict(row)
                        res["id"] = str(res["id"])
                        res["appointment_id"] = str(res["appointment_id"])
                        res["patient_id"] = str(res["patient_id"])
                        res["recorded_by"] = str(res["recorded_by"]) if res.get("recorded_by") else None
                        res["recorded_at"] = str(res["recorded_at"]) if res.get("recorded_at") else None
                        res["bmi"] = float(res["bmi"]) if res.get("bmi") is not None else computed_bmi
                        res["height_cm"] = float(res["height_cm"]) if res.get("height_cm") is not None else None
                        res["weight_kg"] = float(res["weight_kg"]) if res.get("weight_kg") is not None else None
                        res["temperature"] = float(res["temperature"]) if res.get("temperature") is not None else None
                        res["blood_glucose"] = float(res["blood_glucose"]) if res.get("blood_glucose") is not None else None
                        res["abnormal_flags"] = abnormal_flags
                        res["recorded_by_name"] = staff_name
                        return {"success": True, "vitals": res, "abnormal_flags": abnormal_flags}
        except Exception as e:
            logger.error(f"PostgreSQL record vitals error: {e}")

    # Fallback to JSON DB
    db = read_json_db()
    if "vitals" not in db:
        db["vitals"] = []

    vitals_entry = {
        "id": f"vit-{uuid.uuid4().hex[:12]}",
        "appointment_id": payload.appointment_id,
        "patient_id": payload.patient_id,
        "height_cm": payload.height_cm,
        "weight_kg": payload.weight_kg,
        "bmi": computed_bmi,
        "bp_systolic": payload.bp_systolic,
        "bp_diastolic": payload.bp_diastolic,
        "heart_rate": payload.heart_rate,
        "temperature": payload.temperature,
        "temperature_unit": payload.temperature_unit or "C",
        "respiratory_rate": payload.respiratory_rate,
        "spo2": payload.spo2,
        "blood_glucose": payload.blood_glucose,
        "glucose_context": payload.glucose_context,
        "notes": payload.notes,
        "abnormal_flags": abnormal_flags,
        "recorded_by": staff_id,
        "recorded_by_name": staff_name,
        "recorded_at": datetime.now().isoformat()
    }
    # Replace existing or append
    db["vitals"] = [x for x in db["vitals"] if x.get("appointment_id") != payload.appointment_id]
    db["vitals"].append(vitals_entry)
    write_json_db(db)

    return {"success": True, "vitals": vitals_entry, "abnormal_flags": abnormal_flags}


@router.get("/vitals/{appointment_id}")
def get_vitals_by_appointment(appointment_id: str):
    """Retrieve recorded vitals for a specific appointment."""
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT v.*, s.full_name as recorded_by_name
                        FROM vitals v
                        LEFT JOIN staff s ON v.recorded_by = s.id
                        WHERE v.appointment_id = %s
                        ORDER BY v.recorded_at DESC LIMIT 1
                    """, (appointment_id,))
                    row = cur.fetchone()
                    if row:
                        res = dict(row)
                        res["id"] = str(res["id"])
                        res["appointment_id"] = str(res["appointment_id"])
                        res["patient_id"] = str(res["patient_id"])
                        res["recorded_by"] = str(res["recorded_by"]) if res.get("recorded_by") else None
                        res["recorded_at"] = str(res["recorded_at"]) if res.get("recorded_at") else None
                        res["bmi"] = float(res["bmi"]) if res.get("bmi") is not None else None
                        res["height_cm"] = float(res["height_cm"]) if res.get("height_cm") is not None else None
                        res["weight_kg"] = float(res["weight_kg"]) if res.get("weight_kg") is not None else None
                        res["temperature"] = float(res["temperature"]) if res.get("temperature") is not None else None
                        res["blood_glucose"] = float(res["blood_glucose"]) if res.get("blood_glucose") is not None else None
                        res["abnormal_flags"] = calculate_abnormal_flags(res)
                        return {"success": True, "vitals": res, "has_vitals": True}
                    else:
                        return {"success": True, "vitals": None, "has_vitals": False}
        except Exception as e:
            logger.warning(f"PostgreSQL fetch vitals error: {e}")

    # Fallback to JSON DB
    db = read_json_db()
    for v in db.get("vitals", []):
        if v.get("appointment_id") == appointment_id:
            v["abnormal_flags"] = calculate_abnormal_flags(v)
            return {"success": True, "vitals": v, "has_vitals": True}

    return {"success": True, "vitals": None, "has_vitals": False}


@router.post("/tests", status_code=status.HTTP_201_CREATED)
def record_lab_test(
    payload: LabTestCreateRequest,
    authorization: Optional[str] = Header(None)
):
    """Record lab or diagnostic test results before doctor consultation."""
    staff_id = None
    staff_name = "Nurse"
    if authorization:
        staff_ctx = get_current_staff(authorization)
        if staff_ctx:
            staff_id = staff_ctx.get("staff_id")
            staff_name = staff_ctx.get("email", "Nurse")

    test_uuid = str(uuid.uuid4())
    struct_json = json.dumps(payload.structured_results or {})

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO lab_tests (
                            id, appointment_id, patient_id, test_type,
                            structured_results, free_text_result, file_url,
                            status, recorded_by
                        ) VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s)
                        RETURNING id, appointment_id, patient_id, test_type,
                                  structured_results, free_text_result, file_url,
                                  status, recorded_by, recorded_at
                    """, (
                        test_uuid, payload.appointment_id, payload.patient_id, payload.test_type,
                        struct_json, payload.free_text_result, payload.file_url,
                        payload.status or "completed", staff_id
                    ))
                    row = cur.fetchone()
                    conn.commit()
                    if row:
                        res = dict(row)
                        res["id"] = str(res["id"])
                        res["appointment_id"] = str(res["appointment_id"])
                        res["patient_id"] = str(res["patient_id"])
                        res["recorded_by"] = str(res["recorded_by"]) if res.get("recorded_by") else None
                        res["recorded_at"] = str(res["recorded_at"]) if res.get("recorded_at") else None
                        res["recorded_by_name"] = staff_name
                        return {"success": True, "test": res}
        except Exception as e:
            logger.error(f"PostgreSQL record lab test error: {e}")

    # Fallback to JSON DB
    db = read_json_db()
    if "lab_tests" not in db:
        db["lab_tests"] = []

    test_entry = {
        "id": test_uuid,
        "appointment_id": payload.appointment_id,
        "patient_id": payload.patient_id,
        "test_type": payload.test_type,
        "structured_results": payload.structured_results or {},
        "free_text_result": payload.free_text_result,
        "file_url": payload.file_url,
        "status": payload.status or "completed",
        "recorded_by": staff_id,
        "recorded_by_name": staff_name,
        "recorded_at": datetime.now().isoformat()
    }
    db["lab_tests"].append(test_entry)
    write_json_db(db)

    return {"success": True, "test": test_entry}


@router.get("/tests/{appointment_id}")
def get_lab_tests_by_appointment(appointment_id: str):
    """Retrieve all diagnostic tests recorded for a given appointment."""
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT l.*, s.full_name as recorded_by_name
                        FROM lab_tests l
                        LEFT JOIN staff s ON l.recorded_by = s.id
                        WHERE l.appointment_id = %s
                        ORDER BY l.recorded_at ASC
                    """, (appointment_id,))
                    rows = cur.fetchall()
                    tests = []
                    for r in rows:
                        rd = dict(r)
                        rd["id"] = str(rd["id"])
                        rd["appointment_id"] = str(rd["appointment_id"])
                        rd["patient_id"] = str(rd["patient_id"])
                        rd["recorded_by"] = str(rd["recorded_by"]) if rd.get("recorded_by") else None
                        rd["recorded_at"] = str(rd["recorded_at"]) if rd.get("recorded_at") else None
                        if isinstance(rd.get("structured_results"), str):
                            try:
                                rd["structured_results"] = json.loads(rd["structured_results"])
                            except Exception:
                                rd["structured_results"] = {}
                        tests.append(rd)
                    return {"success": True, "tests": tests}
        except Exception as e:
            logger.warning(f"PostgreSQL fetch lab tests error: {e}")

    # Fallback to JSON DB
    db = read_json_db()
    tests = [t for t in db.get("lab_tests", []) if t.get("appointment_id") == appointment_id]
    return {"success": True, "tests": tests}


@router.post("/upload-report", response_model=ReportUploadResponse)
def upload_lab_report(payload: ReportUploadRequest):
    """
    Upload diagnostic report document or image via base64 decoding.
    Reuses the established CarePulse base64 image/file decoding approach
    (identical to prescription scanning) rather than introducing a separate upload pattern.
    """
    raw_data = payload.file_data or ""
    if not raw_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File data is required (base64 string or data URL)."
        )

    # Determine extension and extract raw base64 string
    extension = "png"
    clean_b64 = raw_data

    if "," in raw_data:
        header, clean_b64 = raw_data.split(",", 1)
        if "pdf" in header:
            extension = "pdf"
        elif "jpeg" in header or "jpg" in header:
            extension = "jpg"
        elif "webp" in header:
            extension = "webp"
        elif "png" in header:
            extension = "png"
    elif payload.filename and "." in payload.filename:
        extension = payload.filename.rsplit(".", 1)[-1].lower()

    # Decode base64 bytes
    try:
        file_bytes = base64.b64decode(clean_b64)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid base64 encoding: {str(e)}"
        )

    # Sanitize and generate unique filename
    safe_prefix = re.sub(r"[^a-zA-Z0-9_\-]", "", (payload.filename or "report").split(".")[0])[:20]
    unique_filename = f"{safe_prefix}_{uuid.uuid4().hex[:8]}.{extension}"
    target_path = REPORTS_DIR / unique_filename

    try:
        with open(target_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        logger.error(f"Failed to write lab report to disk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save report file to server."
        )

    file_url = f"/static_downloads/lab_reports/{unique_filename}"
    logger.info(f"Successfully uploaded lab report: {file_url} ({len(file_bytes)} bytes)")

    return ReportUploadResponse(
        success=True,
        file_url=file_url,
        filename=unique_filename
    )
