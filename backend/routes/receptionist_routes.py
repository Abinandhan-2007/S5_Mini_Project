# backend/routes/receptionist_routes.py
import uuid
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

router = APIRouter(prefix="/api/receptionist", tags=["Receptionist Portal"])

# In-memory / persistent mock store for doctor records and token queue
DEFAULT_SLOTS = [
    {"id": "slot-1", "timeSlot": "09:00 AM - 10:00 AM", "maxSeats": 5, "bookedSeats": 2, "availableSeats": 3, "isAvailable": True},
    {"id": "slot-2", "timeSlot": "10:00 AM - 11:00 AM", "maxSeats": 6, "bookedSeats": 4, "availableSeats": 2, "isAvailable": True},
    {"id": "slot-3", "timeSlot": "11:00 AM - 12:00 PM", "maxSeats": 5, "bookedSeats": 1, "availableSeats": 4, "isAvailable": True},
    {"id": "slot-4", "timeSlot": "02:00 PM - 03:00 PM", "maxSeats": 6, "bookedSeats": 3, "availableSeats": 3, "isAvailable": True},
    {"id": "slot-5", "timeSlot": "03:00 PM - 04:00 PM", "maxSeats": 4, "bookedSeats": 0, "availableSeats": 4, "isAvailable": True},
    {"id": "slot-6", "timeSlot": "04:00 PM - 05:00 PM", "maxSeats": 5, "bookedSeats": 2, "availableSeats": 3, "isAvailable": True},
]

MOCK_DOCTOR_RECORDS = [
    {
        "id": "doc-1",
        "name": "Dr. Olivia Wilson",
        "specialty": "Cardiologist",
        "department": "Cardiology",
        "experienceYears": 12,
        "consultationFee": 850.0,
        "photo": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80",
        "phone": "+91 98765 11001",
        "email": "olivia.w@carepulse.com",
        "roomNumber": "Cabin 102 - 1st Floor",
        "isAvailable": True,
        "availableDays": ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "slotCapacities": [dict(s) for s in DEFAULT_SLOTS]
    },
    {
        "id": "doc-2",
        "name": "Dr. Marcus Vance",
        "specialty": "Dermatologist",
        "department": "Dermatology",
        "experienceYears": 9,
        "consultationFee": 700.0,
        "photo": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80",
        "phone": "+91 98765 11002",
        "email": "marcus.v@carepulse.com",
        "roomNumber": "Cabin 204 - 2nd Floor",
        "isAvailable": True,
        "availableDays": ["Mon", "Wed", "Fri", "Sat"],
        "slotCapacities": [dict(s) for s in DEFAULT_SLOTS]
    },
    {
        "id": "doc-3",
        "name": "Dr. Sophia Patel",
        "specialty": "Pediatrician",
        "department": "Pediatrics",
        "experienceYears": 14,
        "consultationFee": 900.0,
        "photo": "https://images.unsplash.com/photo-1594824813566-78a99478f237?w=400&auto=format&fit=crop&q=80",
        "phone": "+91 98765 11003",
        "email": "sophia.p@carepulse.com",
        "roomNumber": "Cabin 108 - 1st Floor",
        "isAvailable": False,
        "availableDays": ["Tue", "Thu", "Sat"],
        "slotCapacities": [dict(s) for s in DEFAULT_SLOTS]
    },
    {
        "id": "doc-4",
        "name": "Dr. Ethan Reynolds",
        "specialty": "Neurologist",
        "department": "Neurology",
        "experienceYears": 16,
        "consultationFee": 1200.0,
        "photo": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80",
        "phone": "+91 98765 11004",
        "email": "ethan.r@carepulse.com",
        "roomNumber": "Cabin 301 - 3rd Floor",
        "isAvailable": True,
        "availableDays": ["Mon", "Tue", "Thu", "Fri"],
        "slotCapacities": [dict(s) for s in DEFAULT_SLOTS]
    }
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
        "timeSlot": "11:00 AM - 12:00 PM",
        "status": "Waiting",
        "arrivalTime": "10:25 AM",
        "issueTime": "10:28 AM",
        "type": "Walk-In"
    }
]

@router.get("/doctors")

def get_doctors():
    """List doctor records with availability status and time slot capacity."""
    return {"success": True, "doctors": MOCK_DOCTOR_RECORDS}

@router.post("/doctors")
def create_doctor(payload: DoctorCreateRequest):
    """Create a new doctor record."""
    new_id = f"doc-{len(MOCK_DOCTOR_RECORDS) + 1}"
    slots = payload.slotCapacities if payload.slotCapacities else [dict(s) for s in DEFAULT_SLOTS]
    
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
        "roomNumber": payload.roomNumber or f"Cabin 10{len(MOCK_DOCTOR_RECORDS)+1}",
        "isAvailable": payload.isAvailable if payload.isAvailable is not None else True,
        "availableDays": payload.availableDays or ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "slotCapacities": [s if isinstance(s, dict) else s.dict() for s in slots]
    }
    MOCK_DOCTOR_RECORDS.append(doctor_obj)
    return {"success": True, "doctor": doctor_obj}

@router.patch("/doctors/{doctor_id}/availability")
def toggle_doctor_availability(doctor_id: str, payload: DoctorAvailabilityUpdate):
    """Toggle Doctor Available or Not Available status."""
    for doc in MOCK_DOCTOR_RECORDS:
        if doc["id"] == doctor_id:
            doc["isAvailable"] = payload.isAvailable
            return {"success": True, "doctor": doc}
    raise HTTPException(status_code=404, detail="Doctor not found")

@router.put("/doctors/{doctor_id}/slots")
def update_slot_capacity(doctor_id: str, payload: SlotCapacityUpdate):
    """Update seat limits and availability for a specific time slot (e.g. 10:00 AM - 11:00 AM)."""
    for doc in MOCK_DOCTOR_RECORDS:
        if doc["id"] == doctor_id:
            for slot in doc["slotCapacities"]:
                if slot["timeSlot"] == payload.timeSlot:
                    slot["maxSeats"] = payload.maxSeats
                    if payload.isAvailable is not None:
                        slot["isAvailable"] = payload.isAvailable
                    slot["availableSeats"] = max(0, slot["maxSeats"] - slot["bookedSeats"])
                    return {"success": True, "slot": slot, "doctor": doc}
            # Slot not found, add it
            new_slot = {
                "id": f"slot-{uuid.uuid4().hex[:6]}",
                "timeSlot": payload.timeSlot,
                "maxSeats": payload.maxSeats,
                "bookedSeats": 0,
                "availableSeats": payload.maxSeats,
                "isAvailable": payload.isAvailable if payload.isAvailable is not None else True
            }
            doc["slotCapacities"].append(new_slot)
            return {"success": True, "slot": new_slot, "doctor": doc}
    raise HTTPException(status_code=404, detail="Doctor not found")

@router.get("/tokens")
def get_token_queue(doctor_id: Optional[str] = None):
    """Get active token queue for today, optionally filtered by doctor."""
    if doctor_id:
        filtered = [t for t in MOCK_TOKEN_QUEUE if t["doctorId"] == doctor_id]
        return {"success": True, "tokens": filtered}
    return {"success": True, "tokens": MOCK_TOKEN_QUEUE}

@router.post("/tokens/call-next")
def call_next_token(doctor_id: Optional[str] = None):
    """Advance queue token state from Waiting -> In Consultation."""
    # Complete current in-consultation if any
    for tok in MOCK_TOKEN_QUEUE:
        if doctor_id and tok["doctorId"] != doctor_id:
            continue
        if tok["status"] == "In Consultation":
            tok["status"] = "Completed"
            break

    # Call next waiting token
    for tok in MOCK_TOKEN_QUEUE:
        if doctor_id and tok["doctorId"] != doctor_id:
            continue
        if tok["status"] == "Waiting":
            tok["status"] = "In Consultation"
            return {"success": True, "activeToken": tok}
    return {"success": True, "activeToken": None, "message": "No waiting tokens in queue"}

@router.patch("/tokens/{token_id}/status")
def update_token_status(token_id: str, payload: TokenStatusUpdate):
    """Update token status ('Waiting', 'In Consultation', 'Completed', 'Skipped', 'Cancelled')."""
    for tok in MOCK_TOKEN_QUEUE:
        if tok["id"] == token_id:
            tok["status"] = payload.status
            return {"success": True, "token": tok}
    raise HTTPException(status_code=404, detail="Token not found")

@router.post("/appointments")
def create_walkin_appointment(payload: WalkInAppointmentCreate):
    """Book a walk-in or call-in patient appointment and generate a live queue token."""
    ticket_num = f"#CP-{uuid.uuid4().hex[:4].upper()}"
    token_num = f"#TOK-00{len(MOCK_TOKEN_QUEUE) + 1}"
    now_str = datetime.now().strftime("%I:%M %p")
    
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

    # Update doctor slot booked seats
    for doc in MOCK_DOCTOR_RECORDS:
        if doc["id"] == payload.doctorId:
            for slot in doc["slotCapacities"]:
                if slot["timeSlot"] == payload.timeSlot:
                    slot["bookedSeats"] += 1
                    slot["availableSeats"] = max(0, slot["maxSeats"] - slot["bookedSeats"])

    return {
        "success": True,
        "ticketNumber": ticket_num,
        "token": token_item
    }
