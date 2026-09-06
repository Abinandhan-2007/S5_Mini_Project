# backend/routes/receptionist_routes.py
import uuid
import json
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header, status
from schemas import (
    DoctorCreateRequest,
    DoctorAvailabilityUpdate,
    SlotCapacityUpdate,
    TokenStatusUpdate,
    WalkInAppointmentCreate
)
import database

logger = logging.getLogger("carepulse.receptionist")

router = APIRouter(prefix="/api/receptionist", tags=["Receptionist Portal"])

DEFAULT_SLOTS = [
    {"id": "slot-1", "timeSlot": "09:00 AM - 10:00 AM", "maxSeats": 5, "bookedSeats": 0, "availableSeats": 5, "isAvailable": True},
    {"id": "slot-2", "timeSlot": "10:00 AM - 11:00 AM", "maxSeats": 6, "bookedSeats": 0, "availableSeats": 6, "isAvailable": True},
    {"id": "slot-3", "timeSlot": "11:00 AM - 12:00 PM", "maxSeats": 5, "bookedSeats": 0, "availableSeats": 5, "isAvailable": True},
    {"id": "slot-4", "timeSlot": "02:00 PM - 03:00 PM", "maxSeats": 6, "bookedSeats": 0, "availableSeats": 6, "isAvailable": True},
    {"id": "slot-5", "timeSlot": "03:00 PM - 04:00 PM", "maxSeats": 4, "bookedSeats": 0, "availableSeats": 4, "isAvailable": True},
    {"id": "slot-6", "timeSlot": "04:00 PM - 05:00 PM", "maxSeats": 5, "bookedSeats": 0, "availableSeats": 5, "isAvailable": True},
]

MOCK_TOKEN_QUEUE = []


def format_receptionist_doctor(d: dict) -> dict:
    days = d.get("available_days") or d.get("availableDays") or ["Mon", "Tue", "Wed", "Thu", "Fri"]
    if isinstance(days, str):
        try:
            days = json.loads(days)
        except Exception:
            days = ["Mon", "Tue", "Wed", "Thu", "Fri"]

    slots = d.get("slot_capacities") or d.get("slotCapacities") or []
    if isinstance(slots, str):
        try:
            slots = json.loads(slots)
        except Exception:
            slots = []
    if not slots or len(slots) == 0:
        slots = [dict(s) for s in DEFAULT_SLOTS]

    photo = d.get("photo") or d.get("photo_url") or d.get("photoUrl") or "/doctor_default.jpg"
    is_avail = bool(d.get("is_available") if d.get("is_available") is not None else d.get("isAvailable", True))
    room = d.get("room_number") or d.get("roomNumber") or f"Cabin {d.get('id', '101')}"
    fee = float(d.get("consultation_fee") or d.get("consultationFee") or 500.0)
    exp = int(d.get("experience_years") or d.get("experienceYears") or 5)
    hosp_id = d.get("hospital_id") or d.get("hospitalId") or "hosp-1"
    hosp_name = d.get("hospital_name") or d.get("hospitalName") or "St. Jude Heart & Medical Center"

    stf_code = d.get("staff_code") or d.get("staffCode")

    return {
        "id": str(d["id"]),
        "staff_code": stf_code,
        "staffCode": stf_code,
        "name": d["name"],
        "specialty": d["specialty"],
        "department": d.get("department", "General Medicine"),
        "hospitalId": hosp_id,
        "hospital_id": hosp_id,
        "hospitalName": hosp_name,
        "hospital_name": hosp_name,
        "experienceYears": exp,
        "consultationFee": fee,
        "photo": photo,
        "phone": d.get("phone") or "+91 98765 00000",
        "email": d.get("email") or f"{d['name'].lower().replace(' ', '.')}@carepulse.com",
        "roomNumber": room,
        "isAvailable": is_avail,
        "availableDays": days,
        "slotCapacities": slots
    }

@router.get("/doctors")
def get_doctors(
    hospital_id: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    List doctor records scoped to the receptionist's or doctor's own hospital.
    Fails safely with empty results if a staff member has hospital_id=NULL.
    """
    effective_hosp_id = hospital_id

    # Check staff auth header
    if authorization:
        from routes.staff_auth import get_current_staff
        staff_ctx = get_current_staff(authorization)
        if staff_ctx:
            role = staff_ctx.get("role")
            if role in ["receptionist", "doctor"]:
                staff_hosp = staff_ctx.get("hospital_id")
                if not staff_hosp:
                    logger.warning(f"Data integrity issue: Staff account {staff_ctx.get('staff_id')} ({role}) has hospital_id=NULL. Failing safely with empty result set.")
                    return {"success": True, "doctors": []}
                effective_hosp_id = staff_hosp
            elif role == "admin" and staff_ctx.get("hospital_id"):
                effective_hosp_id = staff_ctx.get("hospital_id")

    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if effective_hosp_id:
                        cur.execute("SELECT * FROM doctors WHERE hospital_id = %s ORDER BY id", (effective_hosp_id,))
                    else:
                        cur.execute("SELECT * FROM doctors WHERE hospital_id IS NULL ORDER BY id")
                    rows = cur.fetchall()
                    if rows is not None:
                        return {"success": True, "doctors": [format_receptionist_doctor(dict(r)) for r in rows]}
        except Exception as e:
            logger.warning(f"DB get doctors note: {e}")

    db = database.read_json_db()
    doctors = db.get("doctors", [])
    if effective_hosp_id:
        doctors = [d for d in doctors if d.get("hospital_id") == effective_hosp_id or d.get("hospitalId") == effective_hosp_id]
    else:
        doctors = [d for d in doctors if not d.get("hospital_id") and not d.get("hospitalId")]
    return {"success": True, "doctors": [format_receptionist_doctor(d) for d in doctors]}

@router.post("/doctors")
def create_doctor(payload: DoctorCreateRequest, authorization: Optional[str] = Header(None)):
    """Create a new doctor record in database and auto-generate staff login credentials."""
    import re
    from routes.staff_auth import get_current_staff, hash_password

    new_id = f"doc-{uuid.uuid4().hex[:6]}"
    slots = payload.slotCapacities if payload.slotCapacities else [dict(s) for s in DEFAULT_SLOTS]
    slots_json = [s if isinstance(s, dict) else s.dict() for s in slots]

    # Derive hospital_id from payload or staff context
    hosp_id = payload.hospital_id or "hosp-bag"
    if authorization:
        staff_ctx = get_current_staff(authorization)
        if staff_ctx and staff_ctx.get("hospital_id"):
            hosp_id = staff_ctx["hospital_id"]

    db = database.read_json_db()
    hosp_match = next((h for h in db.get("hospitals", []) if h.get("id") == hosp_id), None)
    hosp_name = hosp_match.get("name") if hosp_match else "BAG Hospital"

    # Auto-generate staff code D<HospNum><Seq>
    hosp_num = "007"
    if "bag" in str(hosp_id).lower():
        hosp_num = "007"
    else:
        m = re.search(r"\d+", str(hosp_id))
        hosp_num = f"{int(m.group(0)):03d}" if m else "001"

    staff_list = db.get("staff", [])
    existing_docs = [s for s in staff_list if s.get("role") == "doctor" and (s.get("hospital_id") == hosp_id or s.get("hospitalId") == hosp_id)]
    seq = 101 + len(existing_docs)
    staff_code = f"D{hosp_num}{seq:03d}"

    # Generate login email and username
    username = (payload.username or "").strip()
    email = (payload.email or "").strip().lower()
    if not email:
        clean_name = payload.name.lower().replace("dr.", "").strip().replace(" ", ".")
        email = f"{username.lower()}@carepulse.com" if username else f"{clean_name}@carepulse.com"
    if not username:
        username = email.split("@")[0]

    raw_pass = payload.password or "doc123"
    hashed_pass = hash_password(raw_pass)

    doctor_obj = {
        "id": new_id,
        "staff_code": staff_code,
        "staffCode": staff_code,
        "name": payload.name,
        "specialty": payload.specialty,
        "department": payload.department,
        "hospital_id": hosp_id,
        "hospitalId": hosp_id,
        "hospital_name": hosp_name,
        "hospitalName": hosp_name,
        "experienceYears": payload.experienceYears,
        "consultationFee": payload.consultationFee,
        "photo": payload.photo or "/doctor_default.jpg",
        "phone": payload.phone or "+91 98765 00000",
        "email": email,
        "username": username,
        "roomNumber": payload.roomNumber or "Cabin 105",
        "isAvailable": payload.isAvailable if payload.isAvailable is not None else True,
        "availableDays": payload.availableDays or ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "slotCapacities": slots_json
    }

    new_staff_entry = {
        "id": new_id,
        "staff_code": staff_code,
        "staffCode": staff_code,
        "name": payload.name,
        "full_name": payload.name,
        "email": email,
        "username": username,
        "password": hashed_pass,
        "password_hash": hashed_pass,
        "role": "doctor",
        "specialization": payload.specialty,
        "department": payload.department,
        "phone": doctor_obj["phone"],
        "avatar": doctor_obj["photo"],
        "avatar_url": doctor_obj["photo"],
        "avatarUrl": doctor_obj["photo"],
        "hospital_id": hosp_id,
        "hospitalId": hosp_id,
        "is_active": True,
        "isActive": True
    }

    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    # 1. Insert into doctors table FIRST so staff foreign key constraint succeeds
                    cur.execute("""
                        INSERT INTO doctors (id, name, specialty, department, hospital_id, hospital_name, experience_years, consultation_fee, photo, phone, email, room_number, is_available, available_days, slot_capacities)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            specialty = EXCLUDED.specialty,
                            department = EXCLUDED.department,
                            consultation_fee = EXCLUDED.consultation_fee,
                            experience_years = EXCLUDED.experience_years,
                            phone = EXCLUDED.phone,
                            email = EXCLUDED.email,
                            room_number = EXCLUDED.room_number,
                            is_available = EXCLUDED.is_available,
                            available_days = EXCLUDED.available_days,
                            slot_capacities = EXCLUDED.slot_capacities
                    """, (
                        new_id,
                        payload.name,
                        payload.specialty,
                        payload.department,
                        hosp_id,
                        hosp_name,
                        payload.experienceYears,
                        payload.consultationFee,
                        doctor_obj["photo"],
                        doctor_obj["phone"],
                        email,
                        doctor_obj["roomNumber"],
                        doctor_obj["isAvailable"],
                        json.dumps(doctor_obj["availableDays"]),
                        json.dumps(slots_json)
                    ))
                    # 2. Insert into staff table with valid UUID and doctor_id FK
                    staff_uuid = str(uuid.uuid4())
                    cur.execute("""
                        INSERT INTO staff (id, doctor_id, staff_code, full_name, email, password_hash, role, specialization, phone, avatar_url, hospital_id)
                        VALUES (%s, %s, %s, %s, %s, %s, 'doctor', %s, %s, %s, %s)
                        ON CONFLICT (email) DO UPDATE SET
                            doctor_id = EXCLUDED.doctor_id,
                            full_name = EXCLUDED.full_name,
                            password_hash = EXCLUDED.password_hash,
                            phone = EXCLUDED.phone,
                            specialization = EXCLUDED.specialization,
                            hospital_id = EXCLUDED.hospital_id
                    """, (staff_uuid, new_id, staff_code, payload.name, email, hashed_pass, payload.specialty, doctor_obj["phone"], doctor_obj["photo"], hosp_id))
                conn.commit()
        except Exception as e:
            logger.error(f"DB insert doctor note: {e}")

    # JSON DB write
    if "doctors" not in db:
        db["doctors"] = []
    if "staff" not in db:
        db["staff"] = []

    db["doctors"].append(doctor_obj)
    db["staff"].append(new_staff_entry)
    database.write_json_db(db)

    return {"success": True, "doctor": doctor_obj, "staff": new_staff_entry}

@router.patch("/doctors/{doctor_id}/availability")
def toggle_doctor_availability(doctor_id: str, payload: DoctorAvailabilityUpdate):
    """Toggle Doctor Available or Not Available status in database."""
    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("UPDATE doctors SET is_available = %s WHERE id = %s RETURNING *", (payload.isAvailable, doctor_id))
                    row = cur.fetchone()
                    if row:
                        conn.commit()
                        return {"success": True, "doctor": format_receptionist_doctor(dict(row))}
        except Exception as e:
            print("DB toggle availability note:", e)

    db = database.read_json_db()
    for doc in db.get("doctors", []):
        if doc.get("id") == doctor_id:
            doc["is_available"] = payload.isAvailable
            doc["isAvailable"] = payload.isAvailable
            database.write_json_db(db)
            return {"success": True, "doctor": format_receptionist_doctor(doc)}

    raise HTTPException(status_code=404, detail="Doctor not found")

@router.put("/doctors/{doctor_id}/slots")
def update_slot_capacity(doctor_id: str, payload: SlotCapacityUpdate):
    """Update seat limits and availability for a specific time slot in database."""
    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM doctors WHERE id = %s LIMIT 1", (doctor_id,))
                    row = cur.fetchone()
                    if row:
                        doc = dict(row)
                        slots = doc.get("slot_capacities") or []
                        if isinstance(slots, str):
                            try:
                                slots = json.loads(slots)
                            except Exception:
                                slots = []
                        if not slots:
                            slots = [dict(s) for s in DEFAULT_SLOTS]

                        target_slot = None
                        for s in slots:
                            if s.get("timeSlot") == payload.timeSlot:
                                s["maxSeats"] = payload.maxSeats
                                if payload.isAvailable is not None:
                                    s["isAvailable"] = payload.isAvailable
                                s["availableSeats"] = max(0, s["maxSeats"] - s.get("bookedSeats", 0))
                                target_slot = s
                                break
                        if not target_slot:
                            target_slot = {
                                "id": f"slot-{uuid.uuid4().hex[:6]}",
                                "timeSlot": payload.timeSlot,
                                "maxSeats": payload.maxSeats,
                                "bookedSeats": 0,
                                "availableSeats": payload.maxSeats,
                                "isAvailable": payload.isAvailable if payload.isAvailable is not None else True
                            }
                            slots.append(target_slot)

                        cur.execute("UPDATE doctors SET slot_capacities = %s WHERE id = %s", (json.dumps(slots), doctor_id))
                        conn.commit()
                        doc["slotCapacities"] = slots
                        return {"success": True, "slot": target_slot, "doctor": format_receptionist_doctor(doc)}
        except Exception as e:
            print("DB update slot note:", e)

    db = database.read_json_db()
    for doc in db.get("doctors", []):
        if doc.get("id") == doctor_id:
            slots = doc.get("slotCapacities") or doc.get("slot_capacities") or [dict(s) for s in DEFAULT_SLOTS]
            target_slot = None
            for slot in slots:
                if slot.get("timeSlot") == payload.timeSlot:
                    slot["maxSeats"] = payload.maxSeats
                    if payload.isAvailable is not None:
                        slot["isAvailable"] = payload.isAvailable
                    slot["availableSeats"] = max(0, slot["maxSeats"] - slot.get("bookedSeats", 0))
                    target_slot = slot
                    break
            if not target_slot:
                target_slot = {
                    "id": f"slot-{uuid.uuid4().hex[:6]}",
                    "timeSlot": payload.timeSlot,
                    "maxSeats": payload.maxSeats,
                    "bookedSeats": 0,
                    "availableSeats": payload.maxSeats,
                    "isAvailable": payload.isAvailable if payload.isAvailable is not None else True
                }
                slots.append(target_slot)
            doc["slotCapacities"] = slots
            doc["slot_capacities"] = slots
            database.write_json_db(db)
            return {"success": True, "slot": target_slot, "doctor": format_receptionist_doctor(doc)}

    raise HTTPException(status_code=404, detail="Doctor not found")

def fetch_all_tokens_from_db(
    doctor_id: Optional[str] = None,
    hospital_id: Optional[str] = None,
    staff_ctx: Optional[dict] = None
) -> List[dict]:
    """
    Fetch live appointments from PostgreSQL or JSON DB and format them as TokenQueueItem records.
    Strictly filters results to the receptionist's/doctor's own hospital.
    Fails safely returning [] if staff has hospital_id=NULL.
    """
    effective_hosp_id = hospital_id

    if staff_ctx:
        role = staff_ctx.get("role")
        if role in ["receptionist", "doctor"]:
            staff_hosp = staff_ctx.get("hospital_id")
            if not staff_hosp:
                logger.warning(
                    f"Data integrity issue: Staff account {staff_ctx.get('staff_id')} ({role}) "
                    f"has hospital_id=NULL. Failing safely with empty result set."
                )
                return []
            effective_hosp_id = staff_hosp
        elif role == "admin" and staff_ctx.get("hospital_id"):
            effective_hosp_id = staff_ctx.get("hospital_id")

    tokens = []
    seen_ids = set()

    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    query = """
                        SELECT a.*, 
                               p.full_name as patient_full_name, 
                               p.phone as patient_phone_db, 
                               p.blood_group as patient_blood_group,
                               p.dob as patient_dob,
                               d.name as doc_name,
                               d.specialty as doc_specialty,
                               d.hospital_id as doc_hospital_id
                        FROM appointments a
                        LEFT JOIN patients p ON a.patient_id = p.id
                        LEFT JOIN doctors d ON a.doctor_id = d.id
                        WHERE 1=1
                    """
                    params = []
                    if effective_hosp_id:
                        query += " AND (a.hospital_id = %s OR (a.hospital_id IS NULL AND d.hospital_id = %s))"
                        params.extend([effective_hosp_id, effective_hosp_id])
                    if doctor_id:
                        query += " AND a.doctor_id = %s"
                        params.append(doctor_id)
                    query += " ORDER BY a.created_at ASC"

                    cur.execute(query, tuple(params))
                    rows = cur.fetchall()

                    for idx, row in enumerate(rows, start=1):
                        app_dict = dict(row)
                        app_id = str(app_dict["id"])
                        seen_ids.add(app_id)

                        raw_status = app_dict.get("status") or "Waiting"
                        token_status = "Waiting" if raw_status in ["Upcoming", "Waiting", "Confirmed"] else raw_status

                        p_name = app_dict.get("patient_name") or app_dict.get("patient_full_name") or "Online Patient"
                        p_phone = app_dict.get("patient_phone_db") or "+91 98765 43210"

                        # Calculate age if dob available
                        age = 28
                        if app_dict.get("patient_dob"):
                            try:
                                birth_year = int(str(app_dict["patient_dob"])[:4])
                                age = max(1, 2026 - birth_year)
                            except Exception:
                                age = 28

                        tokens.append({
                            "id": app_id,
                            "tokenNumber": f"#TOK-{idx:03d}",
                            "patientId": str(app_dict.get("patient_id") or ""),
                            "patientName": p_name,
                            "patientPhone": p_phone,
                            "doctorId": str(app_dict.get("doctor_id") or "doc-current"),
                            "doctorName": app_dict.get("doctor_name") or app_dict.get("doc_name") or "Doctor",
                            "doctorSpecialty": app_dict.get("doctor_specialty") or app_dict.get("doc_specialty") or "General Medicine",
                            "hospitalId": app_dict.get("hospital_id") or app_dict.get("doc_hospital_id") or effective_hosp_id or "hosp-1",
                            "hospital_id": app_dict.get("hospital_id") or app_dict.get("doc_hospital_id") or effective_hosp_id or "hosp-1",
                            "ticketNumber": app_dict.get("ticket_number") or f"#CP-{idx+4820}",
                            "timeSlot": app_dict.get("time_slot") or "10:00 AM - 11:00 AM",
                            "status": token_status,
                            "arrivalTime": app_dict.get("created_at").strftime("%I:%M %p") if app_dict.get("created_at") and hasattr(app_dict.get("created_at"), "strftime") else "09:45 AM",
                            "issueTime": "09:45 AM",
                            "type": app_dict.get("type") or "In-Person",
                            "date": str(app_dict.get("date") or "Today"),
                            "age": age,
                            "bloodGroup": app_dict.get("patient_blood_group") or "O+",
                            "healthIssue": "General Consultation"
                        })
        except Exception as e:
            logger.warning(f"DB fetch tokens note: {e}")

    if not tokens and not (staff_ctx and staff_ctx.get("role") in ["receptionist", "doctor"] and not staff_ctx.get("hospital_id")):
        # Read from JSON DB
        db = database.read_json_db()
        raw_apps = db.get("appointments", [])
        raw_patients = {str(p.get("id")): p for p in db.get("patients", [])}
        doc_obj_map = {d.get("id"): d for d in db.get("doctors", [])}

        idx = 1
        for app_dict in reversed(raw_apps): # chronological order
            app_id = str(app_dict.get("id"))
            if app_id in seen_ids:
                continue

            app_doc_id = app_dict.get("doctor_id")
            doc_obj = doc_obj_map.get(app_doc_id, {})
            app_hosp = app_dict.get("hospital_id") or app_dict.get("hospitalId") or doc_obj.get("hospital_id") or doc_obj.get("hospitalId")
            if effective_hosp_id and app_hosp != effective_hosp_id:
                continue

            if doctor_id and app_dict.get("doctor_id") != doctor_id:
                continue

            p_id = str(app_dict.get("patient_id", ""))
            p_obj = raw_patients.get(p_id, {})

            p_name = app_dict.get("patient_name") or p_obj.get("full_name") or "Online Patient"
            p_phone = app_dict.get("patient_phone") or p_obj.get("phone") or "+91 98765 43210"

            raw_status = app_dict.get("status") or "Waiting"
            token_status = "Waiting" if raw_status in ["Upcoming", "Waiting", "Confirmed"] else raw_status

            tokens.append({
                "id": app_id,
                "tokenNumber": f"#TOK-{idx:03d}",
                "patientId": p_id,
                "patientName": p_name,
                "patientPhone": p_phone,
                "doctorId": str(app_dict.get("doctor_id") or doc_obj.get("id") or "doc-current"),
                "doctorName": app_dict.get("doctor_name") or doc_obj.get("name") or "Doctor",
                "doctorSpecialty": app_dict.get("doctor_specialty") or doc_obj.get("specialty") or "General Medicine",
                "hospitalId": app_hosp or "hosp-1",
                "hospital_id": app_hosp or "hosp-1",
                "ticketNumber": app_dict.get("ticket_number") or f"#CP-{idx+4820}",
                "timeSlot": app_dict.get("time_slot") or "10:00 AM - 11:00 AM",
                "status": token_status,
                "arrivalTime": "09:45 AM",
                "issueTime": "09:45 AM",
                "type": app_dict.get("type") or "In-Person",
                "date": str(app_dict.get("date") or "Today"),
                "age": 29,
                "bloodGroup": p_obj.get("blood_group") or p_obj.get("bloodGroup") or "O+",
                "healthIssue": "General Consultation"
            })
            idx += 1

    return tokens

@router.get("/tokens")
def get_token_queue(
    doctor_id: Optional[str] = None,
    hospital_id: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    Get active live queue tokens from database scoped to the requesting staff member's hospital.
    Fails safely returning [] if staff has hospital_id=NULL.
    """
    from routes.staff_auth import get_current_staff
    staff_ctx = get_current_staff(authorization) if authorization else None
    tokens = fetch_all_tokens_from_db(doctor_id=doctor_id, hospital_id=hospital_id, staff_ctx=staff_ctx)
    return {"success": True, "tokens": tokens}

@router.post("/tokens/call-next")
def call_next_token(
    doctor_id: Optional[str] = None,
    hospital_id: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """Advance queue token state from Waiting -> In Consultation within the staff member's hospital."""
    from routes.staff_auth import get_current_staff
    staff_ctx = get_current_staff(authorization) if authorization else None
    tokens = fetch_all_tokens_from_db(doctor_id=doctor_id, hospital_id=hospital_id, staff_ctx=staff_ctx)
    target_token = None

    for tok in tokens:
        if tok.get("status") == "In Consultation":
            update_token_status(tok["id"], TokenStatusUpdate(status="Completed"))
            break

    for tok in tokens:
        if tok.get("status") == "Waiting":
            target_token = tok
            target_token["status"] = "In Consultation"
            update_token_status(tok["id"], TokenStatusUpdate(status="In Consultation"))
            break

    return {"success": True, "activeToken": target_token, "message": "Queue updated"}

@router.patch("/tokens/{token_id}/status")
def update_token_status(token_id: str, payload: TokenStatusUpdate):
    """Update token status in live queue and database."""
    # 1. Update in PostgreSQL
    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("UPDATE appointments SET status = %s WHERE id::text = %s OR ticket_number = %s", (payload.status, token_id, token_id))
                conn.commit()
        except Exception as e:
            logger.warning(f"DB update status note: {e}")

    # 2. Update in JSON DB
    try:
        db = database.read_json_db()
        for app in db.get("appointments", []):
            if str(app.get("id")) == token_id or str(app.get("ticket_number")) == token_id:
                app["status"] = payload.status
                database.write_json_db(db)
                break
    except Exception as e:
        logger.warning(f"JSON update status note: {e}")

    # 3. Update in memory mock if present
    for tok in MOCK_TOKEN_QUEUE:
        if tok.get("id") == token_id:
            tok["status"] = payload.status

    return {"success": True, "tokenId": token_id, "status": payload.status}

@router.post("/appointments")
def create_walkin_appointment(
    payload: WalkInAppointmentCreate,
    authorization: Optional[str] = Header(None)
):
    """
    Book a walk-in appointment and persist to appointments database table.
    Hospital ID is ALWAYS server-side derived from the authenticated staff member / treating doctor,
    never trusted from client payload.
    """
    ticket_num = f"#CP-{uuid.uuid4().hex[:4].upper()}"
    now_str = datetime.now().strftime("%I:%M %p")
    today_str = payload.date if payload.date else datetime.now().strftime("%Y-%m-%d")
    app_id = str(uuid.uuid4())

    # Server-side authoritative hospital derivation (never trust client payload)
    derived_hospital_id = None
    derived_hospital_name = "CarePulse Central Hospital"

    if authorization:
        from routes.staff_auth import get_current_staff
        staff_ctx = get_current_staff(authorization)
        if staff_ctx and staff_ctx.get("hospital_id"):
            derived_hospital_id = staff_ctx["hospital_id"]

    # If not from staff context, look up treating doctor's hospital
    if not derived_hospital_id:
        if database.use_pg:
            try:
                with database.get_pg_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT hospital_id, hospital_name FROM doctors WHERE id = %s LIMIT 1", (payload.doctorId,))
                        d_row = cur.fetchone()
                        if d_row:
                            derived_hospital_id = d_row.get("hospital_id")
                            if d_row.get("hospital_name"):
                                derived_hospital_name = d_row["hospital_name"]
            except Exception as e:
                logger.warning(f"DB doctor lookup note: {e}")

    if not derived_hospital_id:
        db = database.read_json_db()
        for doc in db.get("doctors", []):
            if doc.get("id") == payload.doctorId:
                derived_hospital_id = doc.get("hospital_id") or doc.get("hospitalId")
                if doc.get("hospital_name") or doc.get("hospitalName"):
                    derived_hospital_name = doc.get("hospital_name") or doc.get("hospitalName")
                break

    if not derived_hospital_id:
        derived_hospital_id = "hosp-1"

    # Query hospital_name if needed
    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT name FROM hospitals WHERE id = %s LIMIT 1", (derived_hospital_id,))
                    h_row = cur.fetchone()
                    if h_row and h_row.get("name"):
                        derived_hospital_name = h_row["name"]
        except Exception as e:
            pass

    token_item = {
        "id": app_id,
        "tokenNumber": "#TOK-NEW",
        "patientName": payload.patientName,
        "patientPhone": payload.patientPhone,
        "doctorId": payload.doctorId,
        "doctorName": payload.doctorName,
        "doctorSpecialty": payload.doctorSpecialty or "General Physician",
        "hospitalId": derived_hospital_id,
        "hospital_id": derived_hospital_id,
        "hospitalName": derived_hospital_name,
        "hospital_name": derived_hospital_name,
        "ticketNumber": ticket_num,
        "timeSlot": payload.timeSlot,
        "status": "Waiting",
        "arrivalTime": now_str,
        "issueTime": now_str,
        "type": payload.type or "Walk-In",
        "date": today_str,
        "age": payload.age or 30,
        "bloodGroup": payload.bloodGroup or "O+",
        "address": payload.address or "",
        "healthIssue": payload.healthIssue or "General Checkup"
    }

    # Persist walk-in appointment to PostgreSQL
    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    # Find or create patient record for this walk-in
                    cur.execute("SELECT id FROM patients WHERE phone = %s OR email = %s LIMIT 1", (payload.patientPhone, payload.patientEmail or ""))
                    pat_row = cur.fetchone()
                    if pat_row:
                        pat_id = str(pat_row["id"])
                    else:
                        pat_id = str(uuid.uuid4())
                        dummy_email = payload.patientEmail or f"walkin.{uuid.uuid4().hex[:6]}@carepulse.local"
                        cur.execute(
                            "INSERT INTO patients (id, full_name, phone, email, auth_provider) VALUES (%s, %s, %s, %s, 'walk-in')",
                            (pat_id, payload.patientName, payload.patientPhone, dummy_email)
                        )

                    cur.execute("""
                        INSERT INTO appointments (id, patient_id, ticket_number, doctor_id, doctor_name, doctor_specialty, hospital_id, hospital_name, date, time_slot, type, status)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Upcoming')
                    """, (
                        app_id,
                        pat_id,
                        ticket_num,
                        payload.doctorId,
                        payload.doctorName,
                        payload.doctorSpecialty or "General Physician",
                        derived_hospital_id,
                        derived_hospital_name,
                        today_str,
                        payload.timeSlot,
                        payload.type or "Walk-In"
                    ))
                conn.commit()
        except Exception as e:
            logger.warning(f"DB walkin appointment insert note: {e}")

    # Also persist to JSON DB
    try:
        db = database.read_json_db()
        db.setdefault("appointments", []).insert(0, {
            "id": app_id,
            "patient_name": payload.patientName,
            "patient_phone": payload.patientPhone,
            "ticket_number": ticket_num,
            "doctor_id": payload.doctorId,
            "doctor_name": payload.doctorName,
            "doctor_specialty": payload.doctorSpecialty or "General Physician",
            "hospital_id": derived_hospital_id,
            "hospitalId": derived_hospital_id,
            "hospital_name": derived_hospital_name,
            "date": today_str,
            "time_slot": payload.timeSlot,
            "type": payload.type or "Walk-In",
            "status": "Upcoming"
        })
        database.write_json_db(db)
    except Exception as e:
        logger.warning(f"JSON walkin insert note: {e}")

    return {
        "success": True,
        "ticketNumber": ticket_num,
        "token": token_item
    }
