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

@router.get("/tokens")
def get_token_queue(doctor_id: Optional[str] = None):
    """Get active live queue tokens from database."""
    if doctor_id:
        filtered = [t for t in MOCK_TOKEN_QUEUE if t.get("doctorId") == doctor_id]
        return {"success": True, "tokens": filtered}
    return {"success": True, "tokens": MOCK_TOKEN_QUEUE}

@router.post("/tokens/call-next")
def call_next_token(doctor_id: Optional[str] = None):
    """Advance queue token state from Waiting -> In Consultation."""
    # Complete current in-consultation if any
    for tok in MOCK_TOKEN_QUEUE:
        if doctor_id and tok.get("doctorId") != doctor_id:
            continue
        if tok.get("status") == "In Consultation":
            tok["status"] = "Completed"
            break

    # Call next waiting token
    for tok in MOCK_TOKEN_QUEUE:
        if doctor_id and tok.get("doctorId") != doctor_id:
            continue
        if tok.get("status") == "Waiting":
            tok["status"] = "In Consultation"
            return {"success": True, "activeToken": tok}
    return {"success": True, "activeToken": None, "message": "No waiting tokens in queue"}

@router.patch("/tokens/{token_id}/status")
def update_token_status(token_id: str, payload: TokenStatusUpdate):
    """Update token status in live queue."""
    for tok in MOCK_TOKEN_QUEUE:
        if tok.get("id") == token_id:
            tok["status"] = payload.status
            return {"success": True, "token": tok}
    raise HTTPException(status_code=404, detail="Token not found")

@router.post("/appointments")
def create_walkin_appointment(payload: WalkInAppointmentCreate):
    """Book a walk-in appointment and persist to appointments database table."""
    ticket_num = f"#CP-{uuid.uuid4().hex[:4].upper()}"
    token_num = f"#TOK-00{len(MOCK_TOKEN_QUEUE) + 1}"
    now_str = datetime.now().strftime("%I:%M %p")
    today_str = payload.date if payload.date else datetime.now().strftime("%Y-%m-%d")

    token_item = {
        "id": f"tok-{uuid.uuid4().hex[:6]}",
        "tokenNumber": token_num,
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
        "type": payload.type or "Walk-In"
    }
    MOCK_TOKEN_QUEUE.append(token_item)

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
                        str(uuid.uuid4()),
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
    else:
        db = database.read_json_db()
        if "appointments" not in db:
            db["appointments"] = []
        db["appointments"].append({
            "id": f"app-{uuid.uuid4().hex[:8]}",
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

    return {
        "success": True,
        "ticketNumber": ticket_num,
        "token": token_item
    }
