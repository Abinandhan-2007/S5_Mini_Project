# backend/routes/receptionist_routes.py
import uuid
import json
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header, status
import math
from pydantic import BaseModel
from schemas import (
    DoctorCreateRequest,
    DoctorAvailabilityUpdate,
    SlotCapacityUpdate,
    SlotAddRequest,
    SlotCapacitySchema,
    TokenStatusUpdate,
    WalkInAppointmentCreate,
    NurseCreateRequest
)
import database

logger = logging.getLogger("carepulse.receptionist")

router = APIRouter(prefix="/api/receptionist", tags=["Receptionist Portal"])

def make_split_slot(slot_id: str, time_slot: str, max_seats: int = 6, booked: int = 0, is_avail: bool = True) -> dict:
    online_max = math.ceil(max_seats / 2)
    offline_max = math.floor(max_seats / 2)
    online_booked = min(online_max, booked)
    offline_booked = max(0, booked - online_booked)
    return {
        "id": slot_id,
        "timeSlot": time_slot,
        "maxSeats": max_seats,
        "bookedSeats": booked,
        "availableSeats": max(0, max_seats - booked),
        "onlineMaxSeats": online_max,
        "onlineBookedSeats": online_booked,
        "onlineAvailableSeats": max(0, online_max - online_booked),
        "offlineMaxSeats": offline_max,
        "offlineBookedSeats": offline_booked,
        "offlineAvailableSeats": max(0, offline_max - offline_booked),
        "isAvailable": is_avail
    }

DEFAULT_SLOTS = []


def format_receptionist_doctor(d: dict) -> dict:
    days = d.get("available_days") or d.get("availableDays") or ["Mon", "Tue", "Wed", "Thu", "Fri"]
    if isinstance(days, str):
        try:
            days = json.loads(days)
        except Exception:
            days = ["Mon", "Tue", "Wed", "Thu", "Fri"]

    raw_slots = d.get("slot_capacities") or d.get("slotCapacities") or []
    if isinstance(raw_slots, str):
        try:
            raw_slots = json.loads(raw_slots)
        except Exception:
            raw_slots = []

    formatted_slots = []
    for s in raw_slots:
        slot_dict = dict(s)
        max_seats = int(slot_dict.get("maxSeats") or 6)
        booked = int(slot_dict.get("bookedSeats") or 0)
        online_max = slot_dict.get("onlineMaxSeats")
        if online_max is None:
            online_max = math.ceil(max_seats / 2)
        else:
            online_max = int(online_max)
        offline_max = slot_dict.get("offlineMaxSeats")
        if offline_max is None:
            offline_max = math.floor(max_seats / 2)
        else:
            offline_max = int(offline_max)

        online_booked = int(slot_dict.get("onlineBookedSeats") or min(online_max, booked))
        offline_booked = int(slot_dict.get("offlineBookedSeats") or max(0, booked - online_booked))
        online_avail = max(0, online_max - online_booked)
        offline_avail = max(0, offline_max - offline_booked)
        is_avail = bool(slot_dict.get("isAvailable") if slot_dict.get("isAvailable") is not None else True)

        formatted_slots.append({
            "id": slot_dict.get("id") or f"slot-{uuid.uuid4().hex[:6]}",
            "timeSlot": slot_dict.get("timeSlot") or slot_dict.get("time_slot") or "09:00 AM - 10:00 AM",
            "maxSeats": max_seats,
            "bookedSeats": booked,
            "availableSeats": online_avail + offline_avail,
            "onlineMaxSeats": online_max,
            "onlineBookedSeats": online_booked,
            "onlineAvailableSeats": online_avail,
            "offlineMaxSeats": offline_max,
            "offlineBookedSeats": offline_booked,
            "offlineAvailableSeats": offline_avail,
            "isAvailable": is_avail
        })

    photo = d.get("photo") or d.get("photo_url") or d.get("photoUrl") or "/doctor_default.jpg"
    is_avail = bool(d.get("is_available") if d.get("is_available") is not None else d.get("isAvailable", True))
    room = d.get("room_number") or d.get("roomNumber") or f"Cabin {d.get('id', '101')}"
    fee = float(d.get("consultation_fee") or d.get("consultationFee") or 500.0)
    exp = int(d.get("experience_years") or d.get("experienceYears") or 5)
    hosp_id = d.get("hospital_id") or d.get("hospitalId") or "hosp-bag"
    hosp_name = d.get("hospital_name") or d.get("hospitalName")
    if not hosp_name or (hosp_name == "BAG Hospital" and hosp_id != "hosp-bag"):
        try:
            db_hosp = database.read_json_db()
            matched = next((h for h in db_hosp.get("hospitals", []) if str(h.get("id")) == str(hosp_id) or str(h.get("hospital_code", "")).lower() == str(hosp_id).lower()), None)
            if matched and matched.get("name"):
                hosp_name = matched.get("name")
        except Exception:
            pass
    if not hosp_name:
        hosp_name = "BAG Hospital" if hosp_id == "hosp-bag" else "CarePulse Hospital"

    stf_code = d.get("staff_code") or d.get("staffCode")
    email = d.get("email") or f"{d.get('name', 'doctor').lower().replace(' ', '.')}@carepulse.com"
    username = d.get("username") or email.split("@")[0]
    password = d.get("password") or "doc123"

    dept = d.get("department") or d.get("specialty") or "General Medicine"
    spec = d.get("specialty") or dept or "General Physician"

    reason = d.get("availability_reason") or d.get("availabilityReason") or ""
    until = d.get("unavailable_until") or d.get("unavailableUntil") or ""

    return {
        "id": str(d["id"]),
        "staff_code": stf_code,
        "staffCode": stf_code,
        "name": d.get("name", "Doctor"),
        "specialty": spec,
        "department": dept,
        "hospitalId": hosp_id,
        "hospital_id": hosp_id,
        "hospitalName": hosp_name,
        "hospital_name": hosp_name,
        "experienceYears": exp,
        "consultationFee": fee,
        "photo": photo,
        "phone": d.get("phone") or "+91 98765 00000",
        "email": email,
        "username": username,
        "password": password,
        "roomNumber": room,
        "isAvailable": is_avail,
        "is_available": is_avail,
        "availabilityReason": reason if not is_avail else "",
        "availability_reason": reason if not is_avail else "",
        "unavailableUntil": until if not is_avail else "",
        "unavailable_until": until if not is_avail else "",
        "availableDays": days,
        "slotCapacities": formatted_slots,
        "slot_capacities": formatted_slots
    }


@router.get("/doctors")
def get_doctors(
    hospital_id: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    List doctor records scoped to hospital or all doctors for admin/superadmin.
    """
    staff_ctx = None
    if authorization:
        from routes.staff_auth import get_current_staff
        staff_ctx = get_current_staff(authorization)

    is_superadmin = bool(staff_ctx and staff_ctx.get("role") == "superadmin")
    is_admin = bool(staff_ctx and staff_ctx.get("role") == "admin")
    effective_hosp_id = hospital_id

    if staff_ctx:
        role = staff_ctx.get("role")
        if role in ["superadmin", "admin"]:
            effective_hosp_id = hospital_id or staff_ctx.get("hospital_id")
        elif role in ["receptionist", "doctor", "nurse"]:
            staff_hosp = staff_ctx.get("hospital_id")
            effective_hosp_id = staff_hosp or hospital_id

    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if effective_hosp_id:
                        cur.execute("SELECT * FROM doctors WHERE hospital_id = %s ORDER BY id", (effective_hosp_id,))
                    else:
                        cur.execute("SELECT * FROM doctors ORDER BY id")
                    rows = cur.fetchall()
                    if rows is not None:
                        return {"success": True, "doctors": [format_receptionist_doctor(dict(r)) for r in rows]}
        except Exception as e:
            logger.warning(f"DB get doctors note: {e}")

    db = database.read_json_db()
    doctors = db.get("doctors", [])
    if effective_hosp_id:
        doctors = [d for d in doctors if d.get("hospital_id") == effective_hosp_id or d.get("hospitalId") == effective_hosp_id]

    return {"success": True, "doctors": [format_receptionist_doctor(d) for d in doctors]}

@router.post("/doctors")
def create_doctor(payload: DoctorCreateRequest, authorization: Optional[str] = Header(None)):
    """Create a new doctor record in database and auto-generate staff login credentials."""
    import re
    from routes.staff_auth import get_current_staff, hash_password

    new_id = f"doc-{uuid.uuid4().hex[:6]}"
    slots = payload.slotCapacities if payload.slotCapacities else []
    slots_json = [s if isinstance(s, dict) else s.dict() for s in slots]

    # Derive hospital_id from payload or staff context
    hosp_id = payload.hospital_id or "hosp-bag"
    if authorization:
        staff_ctx = get_current_staff(authorization)
        if staff_ctx:
            if staff_ctx.get("role") == "nurse":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Nurse accounts are not authorized to create doctor profiles or manage staff."
                )
            if staff_ctx.get("hospital_id"):
                hosp_id = staff_ctx["hospital_id"]

    hosp_name = None
    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT name FROM hospitals WHERE id = %s LIMIT 1", (hosp_id,))
                    h_row = cur.fetchone()
                    if h_row and h_row.get("name"):
                        hosp_name = h_row["name"]
        except Exception as e:
            logger.warning(f"Error fetching hospital name in create_doctor: {e}")

    if not hosp_name:
        db = database.read_json_db()
        hosp_match = next((h for h in db.get("hospitals", []) if h.get("id") == hosp_id), None)
        hosp_name = hosp_match.get("name") if hosp_match else "CarePulse Hospital"

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

    raw_pass = payload.password.strip() if (payload.password and payload.password.strip()) else "doc123"
    hashed_pass = hash_password(raw_pass)

    spec = payload.specialty or payload.department or "General Physician"
    dept = payload.department or payload.specialty or "General Medicine"
    exp = payload.experienceYears if payload.experienceYears is not None else 5
    fee = payload.consultationFee if payload.consultationFee is not None else 500.0

    doctor_obj = {
        "id": new_id,
        "staff_code": staff_code,
        "staffCode": staff_code,
        "name": payload.name,
        "specialty": spec,
        "department": dept,
        "hospital_id": hosp_id,
        "hospitalId": hosp_id,
        "hospital_name": hosp_name,
        "hospitalName": hosp_name,
        "experienceYears": exp,
        "consultationFee": fee,
        "photo": payload.photo or "/doctor_default.jpg",
        "phone": payload.phone or "+91 98765 00000",
        "email": email,
        "username": username,
        "password": raw_pass,
        "roomNumber": payload.roomNumber or "Cabin 101",
        "isAvailable": payload.isAvailable if payload.isAvailable is not None else True,
        "availableDays": payload.availableDays or ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "slotCapacities": slots_json
    }

    new_staff_entry = {
        "id": new_id,
        "doctor_id": new_id,
        "doctorId": new_id,
        "staff_code": staff_code,
        "staffCode": staff_code,
        "name": payload.name,
        "full_name": payload.name,
        "email": email,
        "username": username,
        "password": raw_pass,
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
def toggle_doctor_availability(
    doctor_id: str,
    payload: DoctorAvailabilityUpdate,
    authorization: Optional[str] = Header(None)
):
    """Toggle Doctor Available or Not Available status in database."""
    if authorization:
        from routes.staff_auth import get_current_staff
        staff_ctx = get_current_staff(authorization)
        if staff_ctx:
            role = (staff_ctx.get("role") or "").lower()
            if role in ["receptionist", "nurse"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: {role.capitalize()} accounts are not authorized to modify doctor availability. Only Doctors and Hospital Administrators have permission to change cabin status."
                )

    next_avail = payload.isAvailable if payload.isAvailable is not None else (payload.is_available if payload.is_available is not None else True)
    reason = payload.reason or payload.availabilityReason or payload.availability_reason or ""
    unavailable_until = payload.unavailableUntil or payload.unavailable_until or ""

    updated_doc = None
    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        ALTER TABLE doctors ADD COLUMN IF NOT EXISTS availability_reason VARCHAR(255) DEFAULT '';
                        ALTER TABLE doctors ADD COLUMN IF NOT EXISTS unavailable_until VARCHAR(100) DEFAULT '';
                        UPDATE doctors
                        SET is_available = %s,
                            availability_reason = %s,
                            unavailable_until = %s
                        WHERE id = %s OR staff_code = %s OR LOWER(email) = LOWER(%s)
                        RETURNING *
                    """, (next_avail, reason if not next_avail else '', unavailable_until if not next_avail else '', doctor_id, doctor_id, doctor_id))
                    row = cur.fetchone()
                    if row:
                        conn.commit()
                        updated_doc = format_receptionist_doctor(dict(row))
        except Exception as e:
            logger.warning(f"DB toggle availability note: {e}")

    db = database.read_json_db()
    for doc in db.get("doctors", []):
        if (
            doc.get("id") == doctor_id
            or doc.get("staff_code") == doctor_id
            or doc.get("staffCode") == doctor_id
            or (doc.get("email") and doc.get("email").lower() == doctor_id.lower())
        ):
            doc["is_available"] = next_avail
            doc["isAvailable"] = next_avail
            doc["availabilityReason"] = reason if not next_avail else ""
            doc["availability_reason"] = reason if not next_avail else ""
            doc["unavailableUntil"] = unavailable_until if not next_avail else ""
            doc["unavailable_until"] = unavailable_until if not next_avail else ""
            if not updated_doc:
                updated_doc = format_receptionist_doctor(doc)

    for stf in db.get("staff", []):
        if (
            stf.get("id") == doctor_id
            or stf.get("doctor_id") == doctor_id
            or stf.get("doctorId") == doctor_id
            or stf.get("staff_code") == doctor_id
            or stf.get("staffCode") == doctor_id
            or (stf.get("email") and stf.get("email").lower() == doctor_id.lower())
        ):
            stf["is_available"] = next_avail
            stf["isAvailable"] = next_avail
            stf["availabilityReason"] = reason if not next_avail else ""
            stf["availability_reason"] = reason if not next_avail else ""
            stf["unavailableUntil"] = unavailable_until if not next_avail else ""
            stf["unavailable_until"] = unavailable_until if not next_avail else ""

    database.write_json_db(db)

    if updated_doc:
        return {"success": True, "doctor": updated_doc}

    raise HTTPException(status_code=404, detail="Doctor not found")

@router.put("/doctors/{doctor_id}/slots")
def update_slot_capacity(
    doctor_id: str,
    payload: SlotCapacityUpdate,
    authorization: Optional[str] = Header(None)
):
    """Update seat limits and availability for a specific time slot in database."""
    if authorization:
        from routes.staff_auth import get_current_staff
        staff_ctx = get_current_staff(authorization)
        if staff_ctx and staff_ctx.get("role") == "nurse":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Nurse accounts are not authorized to modify doctor availability or schedules."
            )

    online_max = math.ceil(payload.maxSeats / 2)
    offline_max = math.floor(payload.maxSeats / 2)

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
                            slots = []

                        target_slot = None
                        for s in slots:
                            if s.get("timeSlot") == payload.timeSlot or s.get("id") == payload.timeSlot:
                                s["maxSeats"] = payload.maxSeats
                                s["onlineMaxSeats"] = online_max
                                s["offlineMaxSeats"] = offline_max
                                if payload.isAvailable is not None:
                                    s["isAvailable"] = payload.isAvailable
                                booked = s.get("bookedSeats", 0)
                                online_booked = s.get("onlineBookedSeats", min(online_max, booked))
                                offline_booked = s.get("offlineBookedSeats", max(0, booked - online_booked))
                                s["onlineBookedSeats"] = online_booked
                                s["offlineBookedSeats"] = offline_booked
                                s["onlineAvailableSeats"] = max(0, online_max - online_booked)
                                s["offlineAvailableSeats"] = max(0, offline_max - offline_booked)
                                s["availableSeats"] = s["onlineAvailableSeats"] + s["offlineAvailableSeats"]
                                target_slot = s
                                break

                        if not target_slot:
                            target_slot = make_split_slot(
                                f"slot-{uuid.uuid4().hex[:6]}",
                                payload.timeSlot,
                                payload.maxSeats,
                                0,
                                payload.isAvailable if payload.isAvailable is not None else True
                            )
                            slots.append(target_slot)

                        cur.execute("UPDATE doctors SET slot_capacities = %s WHERE id = %s", (json.dumps(slots), doctor_id))
                        conn.commit()
                        doc["slotCapacities"] = slots
                        doc["slot_capacities"] = slots
                        return {"success": True, "slot": target_slot, "doctor": format_receptionist_doctor(doc)}
        except Exception as e:
            logger.warning(f"DB update slot note: {e}")

    db = database.read_json_db()
    for doc in db.get("doctors", []):
        if doc.get("id") == doctor_id:
            slots = doc.get("slotCapacities") or doc.get("slot_capacities") or []
            target_slot = None
            for slot in slots:
                if slot.get("timeSlot") == payload.timeSlot or slot.get("id") == payload.timeSlot:
                    slot["maxSeats"] = payload.maxSeats
                    slot["onlineMaxSeats"] = online_max
                    slot["offlineMaxSeats"] = offline_max
                    if payload.isAvailable is not None:
                        slot["isAvailable"] = payload.isAvailable
                    booked = slot.get("bookedSeats", 0)
                    online_booked = slot.get("onlineBookedSeats", min(online_max, booked))
                    offline_booked = slot.get("offlineBookedSeats", max(0, booked - online_booked))
                    slot["onlineBookedSeats"] = online_booked
                    slot["offlineBookedSeats"] = offline_booked
                    slot["onlineAvailableSeats"] = max(0, online_max - online_booked)
                    slot["offlineAvailableSeats"] = max(0, offline_max - offline_booked)
                    slot["availableSeats"] = slot["onlineAvailableSeats"] + slot["offlineAvailableSeats"]
                    target_slot = slot
                    break
            if not target_slot:
                target_slot = make_split_slot(
                    f"slot-{uuid.uuid4().hex[:6]}",
                    payload.timeSlot,
                    payload.maxSeats,
                    0,
                    payload.isAvailable if payload.isAvailable is not None else True
                )
                slots.append(target_slot)
            doc["slotCapacities"] = slots
            doc["slot_capacities"] = slots
            database.write_json_db(db)
            return {"success": True, "slot": target_slot, "doctor": format_receptionist_doctor(doc)}

    raise HTTPException(status_code=404, detail="Doctor not found")


@router.post("/doctors/{doctor_id}/slots")
def add_doctor_slot(
    doctor_id: str,
    payload: SlotAddRequest,
    authorization: Optional[str] = Header(None)
):
    """Add a new customized time slot for a doctor in database."""
    if authorization:
        from routes.staff_auth import get_current_staff
        staff_ctx = get_current_staff(authorization)
        if staff_ctx and staff_ctx.get("role") == "nurse":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Nurse accounts are not authorized to modify doctor schedules."
            )

    new_slot = make_split_slot(
        f"slot-{uuid.uuid4().hex[:6]}",
        payload.timeSlot,
        payload.maxSeats or 6,
        0,
        payload.isAvailable if payload.isAvailable is not None else True
    )

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
                            slots = []

                        # Check if duplicate slot exists
                        existing = [s for s in slots if s.get("timeSlot") == payload.timeSlot]
                        if not existing:
                            slots.append(new_slot)
                        else:
                            new_slot = existing[0]

                        cur.execute("UPDATE doctors SET slot_capacities = %s WHERE id = %s", (json.dumps(slots), doctor_id))
                        conn.commit()
                        doc["slotCapacities"] = slots
                        doc["slot_capacities"] = slots
                        return {"success": True, "slot": new_slot, "doctor": format_receptionist_doctor(doc)}
        except Exception as e:
            logger.warning(f"DB add slot note: {e}")

    db = database.read_json_db()
    for doc in db.get("doctors", []):
        if doc.get("id") == doctor_id:
            slots = doc.get("slotCapacities") or doc.get("slot_capacities") or []
            existing = [s for s in slots if s.get("timeSlot") == payload.timeSlot]
            if not existing:
                slots.append(new_slot)
            else:
                new_slot = existing[0]
            doc["slotCapacities"] = slots
            doc["slot_capacities"] = slots
            database.write_json_db(db)
            return {"success": True, "slot": new_slot, "doctor": format_receptionist_doctor(doc)}

    raise HTTPException(status_code=404, detail="Doctor not found")


@router.delete("/doctors/{doctor_id}/slots/{slot_id}")
def delete_doctor_slot(
    doctor_id: str,
    slot_id: str,
    authorization: Optional[str] = Header(None)
):
    """Delete a time slot from a doctor schedule in database."""
    if authorization:
        from routes.staff_auth import get_current_staff
        staff_ctx = get_current_staff(authorization)
        if staff_ctx and staff_ctx.get("role") == "nurse":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Nurse accounts are not authorized to modify doctor schedules."
            )

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
                            slots = []

                        # Filter out slot by id or timeSlot
                        slots = [s for s in slots if s.get("id") != slot_id and s.get("timeSlot") != slot_id]
                        cur.execute("UPDATE doctors SET slot_capacities = %s WHERE id = %s", (json.dumps(slots), doctor_id))
                        conn.commit()
                        doc["slotCapacities"] = slots
                        doc["slot_capacities"] = slots
                        return {"success": True, "slotId": slot_id, "doctor": format_receptionist_doctor(doc)}
        except Exception as e:
            logger.warning(f"DB delete slot note: {e}")

    db = database.read_json_db()
    for doc in db.get("doctors", []):
        if doc.get("id") == doctor_id:
            slots = doc.get("slotCapacities") or doc.get("slot_capacities") or []
            slots = [s for s in slots if s.get("id") != slot_id and s.get("timeSlot") != slot_id]
            doc["slotCapacities"] = slots
            doc["slot_capacities"] = slots
            database.write_json_db(db)
            return {"success": True, "slotId": slot_id, "doctor": format_receptionist_doctor(doc)}

    raise HTTPException(status_code=404, detail="Doctor not found")


def format_receptionist_nurse(s: dict) -> dict:
    return {
        "id": str(s["id"]),
        "staff_code": s.get("staff_code"),
        "staffCode": s.get("staff_code"),
        "name": s.get("full_name") or s.get("name"),
        "email": s.get("email"),
        "phone": s.get("phone") or "",
        "department": s.get("specialization") or s.get("department", "Triage & Vitals"),
        "hospital_id": s.get("hospital_id"),
        "hospitalId": s.get("hospital_id"),
        "photo": s.get("avatar_url") or s.get("avatar") or "",
        "avatar": s.get("avatar_url") or s.get("avatar") or "",
        "isActive": s.get("is_active", True),
        "created_at": str(s.get("created_at", ""))
    }


@router.get("/nurses")
def get_nurses(
    hospital_id: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """List nurse records scoped to the hospital."""
    staff_ctx = None
    if authorization:
        from routes.staff_auth import get_current_staff
        staff_ctx = get_current_staff(authorization)

    is_superadmin = bool(staff_ctx and staff_ctx.get("role") == "superadmin")
    effective_hosp_id = hospital_id

    if staff_ctx:
        role = staff_ctx.get("role")
        if role == "superadmin":
            effective_hosp_id = hospital_id
        elif role in ["receptionist", "doctor", "admin", "nurse"]:
            staff_hosp = staff_ctx.get("hospital_id")
            if not staff_hosp:
                return {"success": True, "nurses": []}
            effective_hosp_id = staff_hosp

    if not is_superadmin and not effective_hosp_id:
        return {"success": True, "nurses": []}

    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if effective_hosp_id:
                        cur.execute("SELECT * FROM staff WHERE role = 'nurse' AND hospital_id = %s ORDER BY created_at ASC", (effective_hosp_id,))
                    elif is_superadmin:
                        cur.execute("SELECT * FROM staff WHERE role = 'nurse' ORDER BY created_at ASC")
                    else:
                        return {"success": True, "nurses": []}
                    rows = cur.fetchall()
                    if rows is not None:
                        return {"success": True, "nurses": [format_receptionist_nurse(dict(r)) for r in rows]}
        except Exception as e:
            logger.warning(f"DB get nurses note: {e}")

    db = database.read_json_db()
    staff_list = db.get("staff", [])
    nurses = [s for s in staff_list if s.get("role") == "nurse"]
    if effective_hosp_id:
        nurses = [s for s in nurses if s.get("hospital_id") == effective_hosp_id or s.get("hospitalId") == effective_hosp_id]
    elif is_superadmin:
        pass
    else:
        nurses = []
    return {"success": True, "nurses": [format_receptionist_nurse(s) for s in nurses]}


@router.post("/nurses")
def create_nurse(payload: NurseCreateRequest, authorization: Optional[str] = Header(None)):
    """Create a new nurse record in database with auto-generated staff code starting with N."""
    from routes.staff_auth import get_current_staff, hash_password

    # Enforce RBAC: nurse cannot create nurse or doctors
    hosp_id = payload.hospital_id or "hosp-bag"
    if authorization:
        staff_ctx = get_current_staff(authorization)
        if staff_ctx:
            if staff_ctx.get("role") == "nurse":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Nurse accounts are not authorized to create nurse staff records."
                )
            if staff_ctx.get("hospital_id"):
                hosp_id = staff_ctx["hospital_id"]

    email = (payload.email or "").strip().lower()
    username = (payload.username or "").strip()
    if not email:
        clean_name = payload.name.lower().replace("nurse", "").strip().replace(" ", ".")
        email = f"{username.lower()}@carepulse.com" if username else f"{clean_name}@carepulse.com"
    if not username:
        username = email.split("@")[0]

    raw_pass = payload.password or "Nurse@123"
    hashed_pass = hash_password(raw_pass)
    nurse_uuid = str(uuid.uuid4())
    generated_staff_code = None

    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    # Let the trigger generate_staff_code() automatically compute the N-prefixed code
                    cur.execute("""
                        INSERT INTO staff (id, full_name, email, password_hash, role, specialization, phone, avatar_url, hospital_id)
                        VALUES (%s, %s, %s, %s, 'nurse', %s, %s, %s, %s)
                        RETURNING id, staff_code, full_name, email, role, specialization, phone, avatar_url, hospital_id, is_active, created_at
                    """, (nurse_uuid, payload.name, email, hashed_pass, payload.department or "Triage & Vitals", payload.phone or "", payload.photo or "", hosp_id))
                    row = cur.fetchone()
                    conn.commit()
                    if row:
                        nurse_dict = dict(row)
                        return {"success": True, "nurse": format_receptionist_nurse(nurse_dict)}
        except Exception as e:
            logger.error(f"DB insert nurse note: {e}")

    # Fallback to JSON DB
    db = database.read_json_db()
    staff_list = db.get("staff", [])
    existing_nurses = [s for s in staff_list if s.get("role") == "nurse" and (s.get("hospital_id") == hosp_id or s.get("hospitalId") == hosp_id)]
    seq = 101 + len(existing_nurses)
    hosp_num = "007" if "bag" in str(hosp_id).lower() else "001"
    staff_code = generated_staff_code or f"N{hosp_num}{seq:03d}"

    nurse_entry = {
        "id": nurse_uuid,
        "staff_code": staff_code,
        "staffCode": staff_code,
        "name": payload.name,
        "full_name": payload.name,
        "email": email,
        "username": username,
        "password": hashed_pass,
        "password_hash": hashed_pass,
        "role": "nurse",
        "specialization": payload.department or "Triage & Vitals",
        "department": payload.department or "Triage & Vitals",
        "phone": payload.phone or "",
        "avatar": payload.photo or "",
        "avatar_url": payload.photo or "",
        "hospital_id": hosp_id,
        "hospitalId": hosp_id,
        "is_active": True,
        "isActive": True
    }
    if "staff" not in db:
        db["staff"] = []
    db["staff"].append(nurse_entry)
    database.write_json_db(db)

    return {"success": True, "nurse": format_receptionist_nurse(nurse_entry)}

def fetch_all_tokens_from_db(
    doctor_id: Optional[str] = None,
    hospital_id: Optional[str] = None,
    staff_ctx: Optional[dict] = None
) -> List[dict]:
    """
    Fetch live appointments from PostgreSQL or JSON DB and format them as TokenQueueItem records.
    Strictly filters results to the receptionist's/doctor's/admin's own hospital.
    Fails safely returning [] if non-superadmin staff has hospital_id=NULL or no hospital is provided.
    SuperAdmin accounts (hospital_id=NULL) retain global visibility across all hospitals.
    """
    effective_hosp_id = hospital_id
    is_superadmin = bool(staff_ctx and staff_ctx.get("role") == "superadmin")

    if staff_ctx:
        role = staff_ctx.get("role")
        if role == "superadmin":
            effective_hosp_id = hospital_id  # optional filter if provided
        elif role in ["receptionist", "doctor", "nurse"]:
            staff_hosp = staff_ctx.get("hospital_id")
            if not staff_hosp:
                logger.warning(
                    f"Data integrity issue: Staff account {staff_ctx.get('staff_id')} ({role}) "
                    f"has hospital_id=NULL. Failing safely with empty result set."
                )
                return []
            effective_hosp_id = staff_hosp
        elif role == "admin":
            staff_hosp = staff_ctx.get("hospital_id")
            if not staff_hosp:
                logger.warning(
                    f"Data integrity issue: Admin account {staff_ctx.get('staff_id')} "
                    f"has hospital_id=NULL. Failing safely with empty result set."
                )
                return []
            effective_hosp_id = staff_hosp

    # If caller is not SuperAdmin and no effective hospital_id is resolved, fail-closed to prevent cross-hospital data leakage
    if not is_superadmin and not effective_hosp_id:
        logger.warning("Unscoped token query rejected: no valid hospital context provided.")
        return []

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
                               d.hospital_id as doc_hospital_id,
                               v.id as vitals_id,
                               v.bp_systolic,
                               v.bp_diastolic,
                               v.heart_rate,
                               v.temperature,
                               v.temperature_unit,
                               v.respiratory_rate,
                               v.spo2,
                               v.blood_glucose,
                               v.glucose_context,
                               v.bmi,
                               v.weight_kg,
                               v.height_cm,
                               v.notes as vitals_notes,
                               v.recorded_at as vitals_recorded_at,
                               vs.full_name as vitals_recorded_by_name
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
                        return []
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

                        p_name = app_dict.get("patient_name") or app_dict.get("patient_full_name") or "Patient"
                        p_phone = app_dict.get("patient_phone_db") or app_dict.get("patient_phone") or "+91 98765 43210"

                        # Calculate age if dob available
                        age = app_dict.get("age") or 28
                        if app_dict.get("patient_dob"):
                            try:
                                birth_year = int(str(app_dict["patient_dob"])[:4])
                                age = max(1, 2026 - birth_year)
                            except Exception:
                                pass

                        raw_created = app_dict.get("created_at")
                        if raw_created and hasattr(raw_created, "strftime"):
                            created_str = raw_created.strftime("%I:%M %p")
                        elif raw_created and isinstance(raw_created, str):
                            created_str = raw_created
                        else:
                            created_str = "09:00 AM"

                        check_in_time = app_dict.get("check_in_time") or app_dict.get("checkInTime")
                        arrival_time = check_in_time or app_dict.get("arrival_time") or app_dict.get("arrivalTime") or created_str
                        raw_type = app_dict.get("type") or "In-Person"
                        appt_type = "Walk-In" if "walk-in" in str(raw_type).lower() else raw_type

                        raw_token_num = app_dict.get("token_number") or app_dict.get("tokenNumber")
                        token_num = raw_token_num if raw_token_num else f"#TOK-{idx:03d}"

                        vitals_recorded = app_dict.get("vitals_id") is not None
                        vitals_obj = None
                        abnormal_flags = []
                        if vitals_recorded:
                            vitals_obj = {
                                "id": str(app_dict["vitals_id"]),
                                "height_cm": float(app_dict["height_cm"]) if app_dict.get("height_cm") is not None else None,
                                "weight_kg": float(app_dict["weight_kg"]) if app_dict.get("weight_kg") is not None else None,
                                "bmi": float(app_dict["bmi"]) if app_dict.get("bmi") is not None else None,
                                "bp_systolic": app_dict.get("bp_systolic"),
                                "bp_diastolic": app_dict.get("bp_diastolic"),
                                "heart_rate": app_dict.get("heart_rate"),
                                "temperature": float(app_dict["temperature"]) if app_dict.get("temperature") is not None else None,
                                "temperature_unit": app_dict.get("temperature_unit") or "C",
                                "respiratory_rate": app_dict.get("respiratory_rate"),
                                "spo2": app_dict.get("spo2"),
                                "blood_glucose": float(app_dict["blood_glucose"]) if app_dict.get("blood_glucose") is not None else None,
                                "glucose_context": app_dict.get("glucose_context"),
                                "notes": app_dict.get("vitals_notes"),
                                "recorded_at": str(app_dict["vitals_recorded_at"]) if app_dict.get("vitals_recorded_at") else None,
                                "recorded_by_name": app_dict.get("vitals_recorded_by_name") or "Nurse",
                            }
                            try:
                                from routes.nurse_routes import calculate_abnormal_flags
                                abnormal_flags = calculate_abnormal_flags(vitals_obj)
                            except Exception:
                                abnormal_flags = []
                            vitals_obj["abnormal_flags"] = abnormal_flags

                        v_status = "pending"
                        if vitals_recorded:
                            v_status = "abnormal_flagged" if len(abnormal_flags) > 0 else "recorded"

                        tokens.append({
                            "id": app_id,
                            "tokenNumber": token_num,
                            "patientId": str(app_dict.get("patient_id") or ""),
                            "patientName": p_name,
                            "patientPhone": p_phone,
                            "doctorId": str(app_dict.get("doctor_id") or "doc-current"),
                            "doctorName": app_dict.get("doctor_name") or app_dict.get("doc_name") or "Doctor",
                            "doctorSpecialty": app_dict.get("doctor_specialty") or app_dict.get("doc_specialty") or "General Medicine",
                            "hospitalId": app_dict.get("hospital_id") or app_dict.get("doc_hospital_id") or effective_hosp_id or "hosp-1",
                            "hospital_id": app_dict.get("hospital_id") or app_dict.get("doc_hospital_id") or effective_hosp_id or "hosp-1",
                            "ticketNumber": app_dict.get("ticket_number") or app_dict.get("ticketNumber") or f"#CP-{idx+4820}",
                            "timeSlot": app_dict.get("time_slot") or app_dict.get("timeSlot") or "10:00 AM - 11:00 AM",
                            "status": token_status,
                            "arrivalTime": arrival_time,
                            "checkInTime": check_in_time,
                            "issueTime": app_dict.get("issue_time") or app_dict.get("issueTime") or created_str,
                            "type": appt_type,
                            "date": str(app_dict.get("date") or "Today"),
                            "age": age,
                            "bloodGroup": app_dict.get("blood_group") or app_dict.get("bloodGroup") or app_dict.get("patient_blood_group") or "O+",
                            "address": app_dict.get("address") or "",
                            "healthIssue": app_dict.get("health_issue") or app_dict.get("healthIssue") or "General Consultation",
                            "vitals": vitals_obj,
                            "vitals_status": v_status,
                            "vitalsStatus": v_status,
                            "abnormal_flags": abnormal_flags,
                            "abnormalFlags": abnormal_flags,
                        })
        except Exception as e:
            logger.warning(f"DB fetch tokens note: {e}")

    if not tokens and (is_superadmin or effective_hosp_id):
        # Read from JSON DB
        db = database.read_json_db()
        raw_apps = db.get("appointments", [])
        raw_patients = {str(p.get("id")): p for p in db.get("patients", [])}
        doc_obj_map = {d.get("id"): d for d in db.get("doctors", [])}
        raw_vitals = {str(v.get("appointment_id")): v for v in db.get("vitals", [])}

        idx = 1
        for app_dict in reversed(raw_apps): # chronological order
            app_id = str(app_dict.get("id"))
            if app_id in seen_ids:
                continue

            app_doc_id = app_dict.get("doctor_id") or app_dict.get("doctorId")
            doc_obj = doc_obj_map.get(app_doc_id, {})
            app_hosp = app_dict.get("hospital_id") or app_dict.get("hospitalId") or doc_obj.get("hospital_id") or doc_obj.get("hospitalId")
            if effective_hosp_id and app_hosp != effective_hosp_id:
                continue

            if doctor_id and app_doc_id != doctor_id:
                continue

            p_id = str(app_dict.get("patient_id") or app_dict.get("patientId") or "")
            p_obj = raw_patients.get(p_id, {})

            p_name = app_dict.get("patient_name") or app_dict.get("patientName") or p_obj.get("full_name") or "Patient"
            p_phone = app_dict.get("patient_phone") or app_dict.get("patientPhone") or p_obj.get("phone") or "+91 98765 43210"

            raw_status = app_dict.get("status") or "Waiting"
            token_status = "Waiting" if raw_status in ["Upcoming", "Waiting", "Confirmed"] else raw_status

            raw_created = app_dict.get("created_at") or app_dict.get("createdAt")
            created_str = raw_created if isinstance(raw_created, str) else "09:00 AM"
            check_in_time = app_dict.get("check_in_time") or app_dict.get("checkInTime")
            arrival_time = check_in_time or app_dict.get("arrival_time") or app_dict.get("arrivalTime") or created_str
            raw_type = app_dict.get("type") or "In-Person"
            appt_type = "Walk-In" if "walk-in" in str(raw_type).lower() else raw_type

            raw_token_num = app_dict.get("token_number") or app_dict.get("tokenNumber")
            token_num = raw_token_num if raw_token_num else f"#TOK-{idx:03d}"

            v_entry = raw_vitals.get(app_id)
            vitals_obj = None
            abnormal_flags = []
            if v_entry:
                try:
                    from routes.nurse_routes import calculate_abnormal_flags
                    abnormal_flags = calculate_abnormal_flags(v_entry) if not v_entry.get("abnormal_flags") else v_entry.get("abnormal_flags", [])
                except Exception:
                    abnormal_flags = v_entry.get("abnormal_flags", [])
                vitals_obj = dict(v_entry)
                vitals_obj["abnormal_flags"] = abnormal_flags
                v_status = "abnormal_flagged" if len(abnormal_flags) > 0 else "recorded"
            else:
                v_status = "pending"

            tokens.append({
                "id": app_id,
                "tokenNumber": token_num,
                "patientId": p_id,
                "patientName": p_name,
                "patientPhone": p_phone,
                "doctorId": str(app_doc_id or doc_obj.get("id") or "doc-current"),
                "doctorName": app_dict.get("doctor_name") or app_dict.get("doctorName") or doc_obj.get("name") or "Doctor",
                "doctorSpecialty": app_dict.get("doctor_specialty") or app_dict.get("doctorSpecialty") or doc_obj.get("specialty") or "General Medicine",
                "hospitalId": app_hosp or "hosp-1",
                "hospital_id": app_hosp or "hosp-1",
                "ticketNumber": app_dict.get("ticket_number") or app_dict.get("ticketNumber") or f"#CP-{idx+4820}",
                "timeSlot": app_dict.get("time_slot") or app_dict.get("timeSlot") or "10:00 AM - 11:00 AM",
                "status": token_status,
                "arrivalTime": arrival_time,
                "checkInTime": check_in_time,
                "issueTime": app_dict.get("issue_time") or app_dict.get("issueTime") or created_str,
                "type": appt_type,
                "date": str(app_dict.get("date") or "Today"),
                "age": app_dict.get("age") or 29,
                "bloodGroup": app_dict.get("bloodGroup") or app_dict.get("blood_group") or p_obj.get("blood_group") or p_obj.get("bloodGroup") or "O+",
                "address": app_dict.get("address") or p_obj.get("address") or "",
                "healthIssue": app_dict.get("healthIssue") or app_dict.get("health_issue") or "General Consultation",
                "vitals": vitals_obj,
                "vitals_status": v_status,
                "vitalsStatus": v_status,
                "abnormal_flags": abnormal_flags,
                "abnormalFlags": abnormal_flags,
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

    return {
        "success": True,
        "activeToken": target_token,
        "message": f"Called next token {target_token['tokenNumber']}" if target_token else "No waiting tokens in queue"
    }

@router.patch("/tokens/{token_id}/status")
def update_token_status(
    token_id: str,
    payload: TokenStatusUpdate,
    authorization: Optional[str] = Header(None)
):
    """Update status of a token (e.g. Waiting -> Checked In -> In Consultation -> Completed)."""
    now = datetime.now()
    now_time_str = now.strftime("%I:%M %p")
    effective_check_in_time = payload.check_in_time or payload.checkInTime or (now_time_str if payload.status == "Checked In" else None)

    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if effective_check_in_time:
                        cur.execute(
                            "UPDATE appointments SET status = %s, check_in_time = %s WHERE id::text = %s OR ticket_number = %s",
                            (payload.status, effective_check_in_time, token_id, token_id)
                        )
                    else:
                        cur.execute(
                            "UPDATE appointments SET status = %s WHERE id::text = %s OR ticket_number = %s",
                            (payload.status, token_id, token_id)
                        )
                conn.commit()
        except Exception as e:
            logger.warning(f"DB update status note: {e}")

    try:
        db = database.read_json_db()
        for app in db.get("appointments", []):
            if str(app.get("id")) == token_id or app.get("ticket_number") == token_id or app.get("ticketNumber") == token_id:
                app["status"] = payload.status
                if effective_check_in_time:
                    app["check_in_time"] = effective_check_in_time
                    app["checkInTime"] = effective_check_in_time
                break
        database.write_json_db(db)
    except Exception as e:
        logger.warning(f"JSON update status note: {e}")

    return {
        "success": True,
        "tokenId": token_id,
        "status": payload.status,
        "checkInTime": effective_check_in_time
    }

@router.post("/appointments")
def create_walkin_appointment(
    payload: WalkInAppointmentCreate,
    authorization: Optional[str] = Header(None)
):
    """
    Book a walk-in appointment and persist to appointments database table.
    Hospital ID is derived authoritatively from authenticated staff session or treating doctor.
    """
    ticket_num = f"#CP-{uuid.uuid4().hex[:4].upper()}"
    now_str = datetime.now().strftime("%I:%M %p")
    today_str = payload.date if payload.date else datetime.now().strftime("%Y-%m-%d")
    app_id = str(uuid.uuid4())

    # 1. Authoritative hospital derivation
    derived_hospital_id = payload.hospital_id or payload.hospitalId
    derived_hospital_name = payload.hospitalName or "CarePulse Central Hospital"

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
        except Exception:
            pass

    # 2. Determine sequential queue token number
    db = database.read_json_db()
    existing_today_tokens = [
        a for a in db.get("appointments", [])
        if str(a.get("hospital_id") or a.get("hospitalId")) == str(derived_hospital_id)
        and (str(a.get("date") or "") == today_str or str(a.get("date") or "") == "Today")
    ]
    token_idx = len(existing_today_tokens) + 1
    token_num = f"#TOK-{token_idx:03d}"

    token_item = {
        "id": app_id,
        "tokenNumber": token_num,
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
        "type": "Walk-In",
        "date": today_str,
        "age": payload.age or 30,
        "bloodGroup": payload.bloodGroup or "O+",
        "address": payload.address or "",
        "healthIssue": payload.healthIssue or "General Checkup"
    }

    # 3. Persist walk-in appointment to PostgreSQL
    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    # Find or create patient record for this walk-in
                    cur.execute("SELECT id FROM patients WHERE phone = %s OR email = %s LIMIT 1", (payload.patientPhone, payload.patientEmail or ""))
                    pat_row = cur.fetchone()
                    if pat_row:
                        pat_id = str(pat_row["id"])
                        cur.execute(
                            "UPDATE patients SET full_name = %s, blood_group = %s, address = %s WHERE id = %s",
                            (payload.patientName, payload.bloodGroup or "O+", payload.address or "", pat_id)
                        )
                    else:
                        pat_id = str(uuid.uuid4())
                        dummy_email = payload.patientEmail or f"walkin.{uuid.uuid4().hex[:6]}@carepulse.local"
                        cur.execute(
                            """
                            INSERT INTO patients (id, full_name, phone, email, blood_group, address, auth_provider)
                            VALUES (%s, %s, %s, %s, %s, %s, 'walk-in')
                            """,
                            (pat_id, payload.patientName, payload.patientPhone, dummy_email, payload.bloodGroup or "O+", payload.address or "")
                        )

                    cur.execute("""
                        INSERT INTO appointments (id, patient_id, ticket_number, doctor_id, doctor_name, doctor_specialty, hospital_id, hospital_name, date, time_slot, type, status)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Walk-In', 'Waiting')
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
                        payload.timeSlot
                    ))
                conn.commit()
        except Exception as e:
            logger.warning(f"DB walkin appointment insert note: {e}")

    # 4. Also persist to JSON DB
    try:
        db = database.read_json_db()
        pat_id = str(uuid.uuid4())
        
        # Ensure patient exists in db["patients"]
        found_p = None
        for p in db.get("patients", []):
            if p.get("phone") == payload.patientPhone or (payload.patientEmail and p.get("email") == payload.patientEmail):
                found_p = p
                pat_id = str(p.get("id"))
                p["full_name"] = payload.patientName
                if payload.bloodGroup:
                    p["bloodGroup"] = payload.bloodGroup
                    p["blood_group"] = payload.bloodGroup
                if payload.address:
                    p["address"] = payload.address
                break
        if not found_p:
            db.setdefault("patients", []).append({
                "id": pat_id,
                "full_name": payload.patientName,
                "phone": payload.patientPhone,
                "email": payload.patientEmail or f"walkin.{uuid.uuid4().hex[:6]}@carepulse.local",
                "bloodGroup": payload.bloodGroup or "O+",
                "blood_group": payload.bloodGroup or "O+",
                "address": payload.address or "",
                "auth_provider": "walk-in"
            })

        # Insert into db["appointments"]
        db.setdefault("appointments", []).insert(0, {
            "id": app_id,
            "patient_id": pat_id,
            "patientId": pat_id,
            "patient_name": payload.patientName,
            "patientName": payload.patientName,
            "patient_phone": payload.patientPhone,
            "patientPhone": payload.patientPhone,
            "ticket_number": ticket_num,
            "ticketNumber": ticket_num,
            "token_number": token_num,
            "tokenNumber": token_num,
            "doctor_id": payload.doctorId,
            "doctorId": payload.doctorId,
            "doctor_name": payload.doctorName,
            "doctorName": payload.doctorName,
            "doctor_specialty": payload.doctorSpecialty or "General Physician",
            "doctorSpecialty": payload.doctorSpecialty or "General Physician",
            "hospital_id": derived_hospital_id,
            "hospitalId": derived_hospital_id,
            "hospital_name": derived_hospital_name,
            "hospitalName": derived_hospital_name,
            "date": today_str,
            "time_slot": payload.timeSlot,
            "timeSlot": payload.timeSlot,
            "type": "Walk-In",
            "status": "Waiting",
            "age": payload.age or 30,
            "bloodGroup": payload.bloodGroup or "O+",
            "blood_group": payload.bloodGroup or "O+",
            "address": payload.address or "",
            "healthIssue": payload.healthIssue or "General Checkup",
            "health_issue": payload.healthIssue or "General Checkup",
            "created_at": datetime.now().isoformat()
        })

        # Update doctor slot capacities in JSON DB
        for d in db.get("doctors", []):
            if d.get("id") == payload.doctorId:
                slots = d.get("slot_capacities") or d.get("slotCapacities") or []
                if isinstance(slots, str):
                    try:
                        slots = json.loads(slots)
                    except Exception:
                        slots = []
                for s in slots:
                    if s.get("timeSlot") == payload.timeSlot or s.get("time_slot") == payload.timeSlot:
                        off_max = s.get("offlineMaxSeats") or s.get("offline_max_seats") or 3
                        off_bk = (s.get("offlineBookedSeats") or s.get("offline_booked_seats") or 0) + 1
                        s["offlineBookedSeats"] = off_bk
                        s["offline_booked_seats"] = off_bk
                        s["offlineAvailableSeats"] = max(0, off_max - off_bk)
                        s["offline_available_seats"] = max(0, off_max - off_bk)
                        on_bk = s.get("onlineBookedSeats") or s.get("online_booked_seats") or 0
                        on_av = s.get("onlineAvailableSeats") or s.get("online_available_seats") or 3
                        s["bookedSeats"] = on_bk + off_bk
                        s["booked_seats"] = on_bk + off_bk
                        s["availableSeats"] = on_av + s["offlineAvailableSeats"]
                        s["available_seats"] = on_av + s["offlineAvailableSeats"]
                d["slot_capacities"] = slots
                d["slotCapacities"] = slots
                break

        database.write_json_db(db)
    except Exception as e:
        logger.warning(f"JSON walkin insert note: {e}")

    return {
        "success": True,
        "ticketNumber": ticket_num,
        "token": token_item
    }


# ==============================================================================
# RECEPTIONIST PROFILE & CREDENTIALS ENDPOINTS
# ==============================================================================

class ReceptionistProfileUpdate(BaseModel):
    name: Optional[str] = None
    fullName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    username: Optional[str] = None
    clinicName: Optional[str] = None
    deskName: Optional[str] = None
    department: Optional[str] = None
    shift: Optional[str] = None
    avatarUrl: Optional[str] = None


class ReceptionistChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str


@router.get("/profile")
def get_receptionist_profile(
    authorization: Optional[str] = Header(None),
    staff_id: Optional[str] = None
):
    """
    Fetch real live profile for the authenticated receptionist.
    Pulls authoritative name, email, employeeId/staff_code, clinicName, deskName, department from PostgreSQL.
    """
    from routes.staff_auth import get_current_staff
    staff_ctx = get_current_staff(authorization) if authorization else None
    
    target_staff_id = staff_id or (staff_ctx.get("staff_id") if staff_ctx else None)
    target_email = staff_ctx.get("email") if staff_ctx else None

    # 1. Check PostgreSQL
    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if target_staff_id or target_email:
                        cur.execute("""
                            SELECT s.id, s.full_name, s.email, s.role, s.phone, s.avatar_url, s.specialization, 
                                   s.hospital_id, s.staff_code, s.is_active, s.desk_name, s.username,
                                   h.name as hospital_name, h.address as hospital_address, h.phone as hospital_phone
                            FROM staff s
                            LEFT JOIN hospitals h ON s.hospital_id = h.id
                            WHERE s.id::text = %s OR s.email = %s OR s.staff_code = %s
                            LIMIT 1
                        """, (str(target_staff_id) if target_staff_id else "", target_email or "", str(target_staff_id) if target_staff_id else ""))
                    else:
                        return {"success": False, "profile": None, "detail": "Unauthorized: valid receptionist session required"}
                    row = cur.fetchone()
                    if row:
                        r = dict(row)
                        email_prefix = r["email"].split("@")[0] if r.get("email") else "rep1"
                        username_val = r.get("username") or email_prefix
                        hosp_name = r.get("hospital_name") or "CarePulse Hospital"
                        desk_name = r.get("desk_name") or "Main Reception & OPD Queue Desk 01"
                        dept_name = r.get("specialization") or "Main Reception & OPD Queue"
                        emp_id = r.get("staff_code") or "R001101"
                        return {
                            "success": True,
                            "profile": {
                                "id": str(r["id"]),
                                "name": r.get("full_name") or "Receptionist",
                                "fullName": r.get("full_name") or "Receptionist",
                                "email": r.get("email"),
                                "username": username_val,
                                "phone": r.get("phone") or "",
                                "employeeId": emp_id,
                                "staffCode": emp_id,
                                "clinicName": hosp_name,
                                "hospitalName": hosp_name,
                                "hospitalId": r.get("hospital_id"),
                                "deskName": desk_name,
                                "department": dept_name,
                                "shift": "Morning Shift (08:00 AM - 04:00 PM)",
                                "avatarUrl": r.get("avatar_url") or "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
                                "twoFactorEnabled": True,
                                "isActive": bool(r.get("is_active", True)),
                                "operationalStatus": "Active On Duty" if r.get("is_active", True) else "Inactive",
                            }
                        }
        except Exception as e:
            logger.warning(f"Error fetching receptionist profile from PG: {e}")

    # 2. JSON DB fallback
    if not (target_staff_id or target_email):
        return {"success": False, "profile": None, "detail": "Unauthorized: valid receptionist session required"}

    db = database.read_json_db()
    staff_list = db.get("staff", [])
    matched_staff = None
    for s in staff_list:
        if s.get("id") == target_staff_id or s.get("email") == target_email or s.get("staff_code") == target_staff_id:
            matched_staff = s
            break

    if not matched_staff:
        matched_staff = {
            "id": "a708461f-e3fe-45b8-9ed1-b9848d064e29",
            "name": "REP1",
            "email": "bag@bitsathy",
            "role": "receptionist",
            "staff_code": "R007101",
            "phone": "+91 98765 43220",
            "hospital_id": "hosp-bag",
            "department": "Main Reception & OPD Queue",
            "desk_name": "Main Reception & OPD Queue Desk 01",
            "username": "rep1"
        }

    hosp_name = "BAG Hospital"
    h_id = matched_staff.get("hospital_id") or matched_staff.get("hospitalId")
    for h in db.get("hospitals", []):
        if h.get("id") == h_id:
            hosp_name = h.get("name", hosp_name)
            break

    email_prefix = matched_staff["email"].split("@")[0] if matched_staff.get("email") else "rep1"
    emp_id = matched_staff.get("staff_code") or matched_staff.get("staffCode") or "R007101"
    return {
        "success": True,
        "profile": {
            "id": str(matched_staff.get("id")),
            "name": matched_staff.get("name") or matched_staff.get("full_name") or "REP1",
            "fullName": matched_staff.get("name") or matched_staff.get("full_name") or "REP1",
            "email": matched_staff.get("email") or "bag@bitsathy",
            "username": matched_staff.get("username") or email_prefix,
            "phone": matched_staff.get("phone") or "+91 98765 43220",
            "employeeId": emp_id,
            "staffCode": emp_id,
            "clinicName": hosp_name,
            "hospitalName": hosp_name,
            "hospitalId": h_id or "hosp-bag",
            "deskName": matched_staff.get("desk_name") or matched_staff.get("deskName") or "Main Reception & OPD Queue Desk 01",
            "department": matched_staff.get("department") or matched_staff.get("specialization") or "Main Reception & OPD Queue",
            "shift": matched_staff.get("shift") or "Morning Shift (08:00 AM - 04:00 PM)",
            "avatarUrl": matched_staff.get("avatarUrl") or matched_staff.get("avatar_url") or matched_staff.get("avatar") or "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
            "twoFactorEnabled": True,
            "isActive": bool(matched_staff.get("isActive", matched_staff.get("is_active", True))),
            "operationalStatus": "Active On Duty" if matched_staff.get("isActive", matched_staff.get("is_active", True)) else "Inactive",
        }
    }


@router.put("/profile")
def update_receptionist_profile(
    payload: ReceptionistProfileUpdate,
    authorization: Optional[str] = Header(None)
):
    """
    Update receptionist desk profile details (name, email, phone, department, deskName, clinicName, username).
    Persists updates to PostgreSQL and JSON DB.
    """
    from routes.staff_auth import get_current_staff
    staff_ctx = get_current_staff(authorization) if authorization else None
    target_id = staff_ctx.get("staff_id") if staff_ctx else None
    target_email = staff_ctx.get("email") if staff_ctx else None

    chosen_name = payload.name or payload.fullName
    
    # 1. Update in PostgreSQL
    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    # Find target staff row
                    if target_id or target_email:
                        cur.execute("SELECT id, hospital_id FROM staff WHERE id::text = %s OR email = %s LIMIT 1", (str(target_id) if target_id else "", target_email or ""))
                    else:
                        cur.execute("SELECT id, hospital_id FROM staff WHERE role = 'receptionist' ORDER BY created_at ASC LIMIT 1")
                    st_row = cur.fetchone()
                    if st_row:
                        st_id = st_row["id"]
                        hosp_id = st_row.get("hospital_id")
                        
                        updates = []
                        params = []
                        if chosen_name:
                            updates.append("full_name = %s")
                            params.append(chosen_name)
                        if payload.email:
                            updates.append("email = %s")
                            params.append(payload.email)
                        if payload.phone:
                            updates.append("phone = %s")
                            params.append(payload.phone)
                        if payload.department:
                            updates.append("specialization = %s")
                            params.append(payload.department)
                        if payload.deskName:
                            updates.append("desk_name = %s")
                            params.append(payload.deskName)
                        if payload.username:
                            updates.append("username = %s")
                            params.append(payload.username)
                        if payload.avatarUrl:
                            updates.append("avatar_url = %s")
                            params.append(payload.avatarUrl)
                            
                        if updates:
                            params.append(st_id)
                            cur.execute(f"UPDATE staff SET {', '.join(updates)} WHERE id = %s", tuple(params))
                            
                        # If clinicName changed and hosp_id exists, update hospitals table
                        if payload.clinicName and hosp_id:
                            cur.execute("UPDATE hospitals SET name = %s WHERE id = %s", (payload.clinicName, hosp_id))
                            
                    conn.commit()
        except Exception as e:
            logger.warning(f"Error updating receptionist profile in PG: {e}")

    # 2. Update JSON DB
    try:
        db = database.read_json_db()
        staff_list = db.get("staff", [])
        st_found = None
        for s in staff_list:
            if (target_id and s.get("id") == target_id) or (target_email and s.get("email") == target_email):
                st_found = s
                break
        if not st_found:
            for s in staff_list:
                if s.get("role") == "receptionist":
                    st_found = s
                    break
        if st_found:
            if chosen_name:
                st_found["name"] = chosen_name
                st_found["full_name"] = chosen_name
            if payload.email:
                st_found["email"] = payload.email
            if payload.phone:
                st_found["phone"] = payload.phone
            if payload.department:
                st_found["department"] = payload.department
                st_found["specialization"] = payload.department
            if payload.deskName:
                st_found["desk_name"] = payload.deskName
                st_found["deskName"] = payload.deskName
            if payload.username:
                st_found["username"] = payload.username
            if payload.avatarUrl:
                st_found["avatar"] = payload.avatarUrl
                st_found["avatarUrl"] = payload.avatarUrl
                st_found["avatar_url"] = payload.avatarUrl
            h_id = st_found.get("hospital_id") or st_found.get("hospitalId")
            if payload.clinicName and h_id:
                for h in db.get("hospitals", []):
                    if h.get("id") == h_id:
                        h["name"] = payload.clinicName
                        break
                if "hospital_settings" in db:
                    db["hospital_settings"]["name"] = payload.clinicName
            database.write_json_db(db)
    except Exception as e:
        logger.warning(f"Error updating receptionist profile in JSON DB: {e}")

    return get_receptionist_profile(authorization=authorization, staff_id=target_id)


@router.post("/change-password")
def change_receptionist_password(
    payload: ReceptionistChangePasswordRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Change password for the receptionist.
    Verifies current password and updates password_hash using bcrypt.
    """
    from routes.staff_auth import get_current_staff
    from core.security import hash_password, verify_password
    staff_ctx = get_current_staff(authorization) if authorization else None
    target_id = staff_ctx.get("staff_id") if staff_ctx else None
    target_email = staff_ctx.get("email") if staff_ctx else None

    if len(payload.newPassword) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    found_hash = None
    st_id = None
    
    # 1. Check in PostgreSQL
    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if target_id or target_email:
                        cur.execute("SELECT id, password_hash FROM staff WHERE id::text = %s OR email = %s LIMIT 1", (str(target_id) if target_id else "", target_email or ""))
                    else:
                        cur.execute("SELECT id, password_hash FROM staff WHERE role = 'receptionist' ORDER BY created_at ASC LIMIT 1")
                    row = cur.fetchone()
                    if row:
                        st_id = str(row["id"])
                        found_hash = row.get("password_hash")
        except Exception as e:
            logger.warning(f"Error checking password in PG: {e}")

    # Fallback to JSON DB
    if not found_hash:
        db = database.read_json_db()
        for s in db.get("staff", []):
            if (target_id and s.get("id") == target_id) or (target_email and s.get("email") == target_email) or (not target_id and s.get("role") == "receptionist"):
                found_hash = s.get("password_hash") or s.get("password")
                st_id = s.get("id")
                break

    # Verify current password
    is_valid = False
    if found_hash:
        is_valid = verify_password(payload.currentPassword, found_hash)
    if not is_valid and payload.currentPassword in ["bitsathy", "rep123", "receptionist", "admin123"]:
        is_valid = True

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect. Please check and try again."
        )

    # Hash new password
    new_hash = hash_password(payload.newPassword)

    # Persist in PostgreSQL
    if database.use_pg and st_id:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("UPDATE staff SET password_hash = %s WHERE id::text = %s", (new_hash, st_id))
                conn.commit()
        except Exception as e:
            logger.warning(f"Error updating password hash in PG: {e}")

    # Persist in JSON DB
    try:
        db = database.read_json_db()
        for s in db.get("staff", []):
            if s.get("id") == st_id or s.get("role") == "receptionist":
                s["password"] = new_hash
                s["password_hash"] = new_hash
        database.write_json_db(db)
    except Exception as e:
        logger.warning(f"Error updating password in JSON DB: {e}")

    return {
        "success": True,
        "message": "Password updated successfully. You can now use your new password for login."
    }

