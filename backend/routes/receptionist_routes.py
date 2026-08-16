# backend/routes/receptionist_routes.py
import uuid
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from schemas import (
    DoctorCreateRequest,
    DoctorAvailabilityUpdate,
    SlotCapacityUpdate,
    TokenStatusUpdate,
    WalkInAppointmentCreate
)
import database

router = APIRouter(prefix="/api/receptionist", tags=["Receptionist Portal"])

DEFAULT_SLOTS = [
    {"id": "slot-1", "timeSlot": "09:00 AM - 10:00 AM", "maxSeats": 5, "bookedSeats": 2, "availableSeats": 3, "isAvailable": True},
    {"id": "slot-2", "timeSlot": "10:00 AM - 11:00 AM", "maxSeats": 6, "bookedSeats": 4, "availableSeats": 2, "isAvailable": True},
    {"id": "slot-3", "timeSlot": "11:00 AM - 12:00 PM", "maxSeats": 5, "bookedSeats": 1, "availableSeats": 4, "isAvailable": True},
    {"id": "slot-4", "timeSlot": "02:00 PM - 03:00 PM", "maxSeats": 6, "bookedSeats": 3, "availableSeats": 3, "isAvailable": True},
    {"id": "slot-5", "timeSlot": "03:00 PM - 04:00 PM", "maxSeats": 4, "bookedSeats": 0, "availableSeats": 4, "isAvailable": True},
    {"id": "slot-6", "timeSlot": "04:00 PM - 05:00 PM", "maxSeats": 5, "bookedSeats": 2, "availableSeats": 3, "isAvailable": True},
]

MOCK_TOKEN_QUEUE = [
    {
        "id": "tok-1",
        "tokenNumber": "#TOK-001",
        "patientName": "Sarah Jenkins",
        "patientPhone": "+91 98765 43210",
        "doctorId": "doc-1",
        "doctorName": "Dr. Olivia Wilson",
        "doctorSpecialty": "Cardiologist",
        "ticketNumber": "#CP-4821",
        "timeSlot": "10:00 AM - 11:00 AM",
        "status": "In Consultation",
        "arrivalTime": "09:45 AM",
        "issueTime": "09:50 AM",
        "type": "In-Person"
    },
    {
        "id": "tok-2",
        "tokenNumber": "#TOK-002",
        "patientName": "Robert Chen",
        "patientPhone": "+91 98111 22334",
        "doctorId": "doc-1",
        "doctorName": "Dr. Olivia Wilson",
        "doctorSpecialty": "Cardiologist",
        "ticketNumber": "#CP-4822",
        "timeSlot": "10:00 AM - 11:00 AM",
        "status": "Waiting",
        "arrivalTime": "10:05 AM",
        "issueTime": "10:08 AM",
        "type": "Walk-In"
    },
    {
        "id": "tok-3",
        "tokenNumber": "#TOK-003",
        "patientName": "Anita Sharma",
        "patientPhone": "+91 99887 76655",
        "doctorId": "doc-2",
        "doctorName": "Dr. Marcus Vance",
        "doctorSpecialty": "Dermatologist",
        "ticketNumber": "#CP-4823",
        "timeSlot": "11:00 AM - 12:00 PM",
        "status": "Waiting",
        "arrivalTime": "10:15 AM",
        "issueTime": "10:20 AM",
        "type": "In-Person"
    },
    {
        "id": "tok-4",
        "tokenNumber": "#TOK-004",
        "patientName": "Michael Scott",
        "patientPhone": "+91 91234 56789",
        "doctorId": "doc-4",
        "doctorName": "Dr. Ethan Reynolds",
        "doctorSpecialty": "Neurologist",
        "ticketNumber": "#CP-4824",
        "timeSlot": "02:00 PM - 03:00 PM",
        "status": "Waiting",
        "arrivalTime": "10:25 AM",
        "issueTime": "10:28 AM",
        "type": "Walk-In"
    }
]

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

    photo = d.get("photo") or d.get("photo_url") or d.get("photoUrl") or "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80"
    is_avail = bool(d.get("is_available") if d.get("is_available") is not None else d.get("isAvailable", True))
    room = d.get("room_number") or d.get("roomNumber") or f"Cabin {d.get('id', '101')}"
    fee = float(d.get("consultation_fee") or d.get("consultationFee") or 500.0)
    exp = int(d.get("experience_years") or d.get("experienceYears") or 5)

    return {
        "id": str(d["id"]),
        "name": d["name"],
        "specialty": d["specialty"],
        "department": d.get("department", "General Medicine"),
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
def get_doctors():
    """List doctor records with live availability status and time slot capacity from database."""
    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM doctors ORDER BY id")
                    rows = cur.fetchall()
                    if rows and len(rows) > 0:
                        return {"success": True, "doctors": [format_receptionist_doctor(dict(r)) for r in rows]}
        except Exception as e:
            print("DB get doctors note:", e)

    db = database.read_json_db()
    doctors = db.get("doctors", [])
    return {"success": True, "doctors": [format_receptionist_doctor(d) for d in doctors]}

@router.post("/doctors")
def create_doctor(payload: DoctorCreateRequest):
    """Create a new doctor record in database."""
    new_id = f"doc-{uuid.uuid4().hex[:6]}"
    slots = payload.slotCapacities if payload.slotCapacities else [dict(s) for s in DEFAULT_SLOTS]
    slots_json = [s if isinstance(s, dict) else s.dict() for s in slots]

    doctor_obj = {
        "id": new_id,
        "name": payload.name,
        "specialty": payload.specialty,
        "department": payload.department,
        "experienceYears": payload.experienceYears,
        "consultationFee": payload.consultationFee,
        "photo": payload.photo or "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80",
        "phone": payload.phone or "+91 98765 00000",
        "email": payload.email or f"{payload.name.lower().replace(' ', '.')}@carepulse.com",
        "roomNumber": payload.roomNumber or "Cabin 105",
        "isAvailable": payload.isAvailable if payload.isAvailable is not None else True,
        "availableDays": payload.availableDays or ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "slotCapacities": slots_json
    }

    if database.use_pg:
        try:
            with database.get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO doctors (id, name, specialty, department, experience_years, consultation_fee, photo, phone, email, room_number, is_available, available_days, slot_capacities)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        new_id,
                        payload.name,
                        payload.specialty,
                        payload.department,
                        payload.experienceYears,
                        payload.consultationFee,
                        doctor_obj["photo"],
                        doctor_obj["phone"],
                        doctor_obj["email"],
                        doctor_obj["roomNumber"],
                        doctor_obj["isAvailable"],
                        json.dumps(doctor_obj["availableDays"]),
                        json.dumps(slots_json)
                    ))
                conn.commit()
                return {"success": True, "doctor": doctor_obj}
        except Exception as e:
            print("DB insert doctor note:", e)

    db = database.read_json_db()
    if "doctors" not in db:
        db["doctors"] = []
    db["doctors"].append(doctor_obj)
    database.write_json_db(db)
    return {"success": True, "doctor": doctor_obj}

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

def fetch_all_tokens_from_db(doctor_id: Optional[str] = None) -> List[dict]:
    """Fetch live appointments from PostgreSQL or JSON DB and format them as TokenQueueItem records."""
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
                               p.dob as patient_dob
                        FROM appointments a
                        LEFT JOIN patients p ON a.patient_id = p.id
                    """
                    params = []
                    if doctor_id:
                        query += " WHERE a.doctor_id = %s"
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
                            "doctorId": str(app_dict.get("doctor_id") or "doc-1"),
                            "doctorName": app_dict.get("doctor_name") or "Dr. Olivia Wilson",
                            "doctorSpecialty": app_dict.get("doctor_specialty") or "Cardiologist",
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
            print("DB fetch tokens note:", e)

    if not tokens:
        # Read from JSON DB
        db = database.read_json_db()
        raw_apps = db.get("appointments", [])
        raw_patients = {str(p.get("id")): p for p in db.get("patients", [])}

        idx = 1
        for app_dict in reversed(raw_apps): # chronological order
            app_id = str(app_dict.get("id"))
            if app_id in seen_ids:
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
                "doctorId": str(app_dict.get("doctor_id") or "doc-1"),
                "doctorName": app_dict.get("doctor_name") or "Dr. Olivia Wilson",
                "doctorSpecialty": app_dict.get("doctor_specialty") or "Cardiologist",
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

    # Fallback to MOCK_TOKEN_QUEUE if both DB and JSON are empty
    if not tokens:
        for t in MOCK_TOKEN_QUEUE:
            if not doctor_id or t.get("doctorId") == doctor_id:
                tokens.append(dict(t))

    return tokens

@router.get("/tokens")
def get_token_queue(doctor_id: Optional[str] = None):
    """Get active live queue tokens from database including patient bookings."""
    tokens = fetch_all_tokens_from_db(doctor_id)
    return {"success": True, "tokens": tokens}

@router.post("/tokens/call-next")
def call_next_token(doctor_id: Optional[str] = None):
    """Advance queue token state from Waiting -> In Consultation."""
    tokens = fetch_all_tokens_from_db(doctor_id)
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
            print("DB update status note:", e)

    # 2. Update in JSON DB
    try:
        db = database.read_json_db()
        for app in db.get("appointments", []):
            if str(app.get("id")) == token_id or str(app.get("ticket_number")) == token_id:
                app["status"] = payload.status
                database.write_json_db(db)
                break
    except Exception as e:
        print("JSON update status note:", e)

    # 3. Update in memory mock if present
    for tok in MOCK_TOKEN_QUEUE:
        if tok.get("id") == token_id:
            tok["status"] = payload.status

    return {"success": True, "tokenId": token_id, "status": payload.status}

@router.post("/appointments")
def create_walkin_appointment(payload: WalkInAppointmentCreate):
    """Book a walk-in appointment and persist to appointments database table."""
    ticket_num = f"#CP-{uuid.uuid4().hex[:4].upper()}"
    now_str = datetime.now().strftime("%I:%M %p")
    today_str = payload.date if payload.date else datetime.now().strftime("%Y-%m-%d")
    app_id = f"app-{uuid.uuid4().hex[:8]}"

    token_item = {
        "id": app_id,
        "tokenNumber": "#TOK-NEW",
        "patientName": payload.patientName,
        "patientPhone": payload.patientPhone,
        "doctorId": payload.doctorId,
        "doctorName": payload.doctorName,
        "doctorSpecialty": payload.doctorSpecialty or "General Physician",
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

    # Persist walk-in appointment to Database
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
                        INSERT INTO appointments (id, patient_id, ticket_number, doctor_id, doctor_name, doctor_specialty, hospital_name, date, time_slot, type, status)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Upcoming')
                    """, (
                        app_id,
                        pat_id,
                        ticket_num,
                        payload.doctorId,
                        payload.doctorName,
                        payload.doctorSpecialty or "General Physician",
                        "CarePulse Central Hospital",
                        today_str,
                        payload.timeSlot,
                        payload.type or "Walk-In"
                    ))
                conn.commit()
        except Exception as e:
            print("DB walkin appointment insert note:", e)

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
            "hospital_name": "CarePulse Central Hospital",
            "date": today_str,
            "time_slot": payload.timeSlot,
            "type": payload.type or "Walk-In",
            "status": "Upcoming"
        })
        database.write_json_db(db)
    except Exception as e:
        print("JSON walkin insert note:", e)

    return {
        "success": True,
        "ticketNumber": ticket_num,
        "token": token_item
    }
