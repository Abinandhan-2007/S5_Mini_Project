# backend/routes/admin_routes.py
import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import database
from database import read_json_db, write_json_db, get_pg_connection
try:
    from core.security import hash_password
except ImportError:
    from backend.core.security import hash_password

router = APIRouter(prefix="/api/admin", tags=["Admin Portal"])


class ReceptionistCreate(BaseModel):
    name: str
    email: str
    password: Optional[str] = "password123"
    phone: Optional[str] = "+91 98765 00000"
    department: Optional[str] = "Front Desk"
    deskNumber: Optional[str] = "Desk A-1"
    shift: Optional[str] = "Morning"
    avatarUrl: Optional[str] = None
    assignedDoctorsCount: Optional[int] = 2


class ReceptionistUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    deskNumber: Optional[str] = None
    shift: Optional[str] = None
    isActive: Optional[bool] = None
    avatarUrl: Optional[str] = None
    assignedDoctorsCount: Optional[int] = None


class HospitalSettingsUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    emergencyHotline: Optional[str] = None
    email: Optional[str] = None
    logoUrl: Optional[str] = None
    defaultSlotDurationMinutes: Optional[int] = None
    maxOnlineBookingPercentage: Optional[int] = None
    enableAiTriage: Optional[bool] = None
    enableSmsReminders: Optional[bool] = None
    enableAutoCancellation: Optional[bool] = None


@router.get("/overview")
def get_admin_overview():
    """Retrieve hospital high-level executive KPIs."""
    db = read_json_db()
    doctors = db.get("doctors", [])
    patients = db.get("patients", [])
    receptionists = db.get("receptionists", [])
    staff = db.get("staff", [])

    total_doctors = len(doctors)
    total_receptionists = len(receptionists) if receptionists else len([s for s in staff if s.get("role") == "receptionist"])
    total_patients = len(patients)

    today_appointments = 18
    active_tokens = 6
    revenue_today = sum([d.get("consultation_fee", 800) for d in doctors[:3]]) * 4

    return {
        "totalDoctors": total_doctors,
        "totalReceptionists": total_receptionists,
        "totalPatients": total_patients,
        "todayAppointments": today_appointments,
        "activeTokens": active_tokens,
        "revenueToday": revenue_today,
        "hospitalName": db.get("hospital_settings", {}).get("name", "CarePulse Central Hospital")
    }


@router.get("/receptionists")
def list_receptionists():
    """List all receptionist staff accounts."""
    db = read_json_db()
    receptionists = db.get("receptionists", [])
    return receptionists


@router.post("/receptionists", status_code=status.HTTP_201_CREATED)
def create_receptionist(payload: ReceptionistCreate):
    """Create a new receptionist account."""
    db = read_json_db()
    receptionists = db.get("receptionists", [])
    staff = db.get("staff", [])

    # Check if email already exists
    if any(s.get("email", "").lower() == payload.email.lower() for s in staff):
        raise HTTPException(status_code=400, detail="Staff member with this email already exists")

    new_id = f"rec-{uuid.uuid4().hex[:8]}"
    new_rec = {
        "id": new_id,
        "name": payload.name,
        "email": payload.email,
        "phone": payload.phone,
        "department": payload.department,
        "deskNumber": payload.deskNumber,
        "shift": payload.shift,
        "isActive": True,
        "avatarUrl": payload.avatarUrl or "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
        "assignedDoctorsCount": payload.assignedDoctorsCount or 2,
        "joinDate": "2026-08-17"
    }

    raw_pass = payload.password or "password123"
    if len(raw_pass.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password cannot exceed 72 bytes.")
    hashed_pass = hash_password(raw_pass)

    new_staff_entry = {
        "id": new_id,
        "name": payload.name,
        "email": payload.email,
        "password": hashed_pass,
        "password_hash": hashed_pass,
        "role": "receptionist",
        "department": payload.department,
        "avatar": new_rec["avatarUrl"]
    }

    receptionists.append(new_rec)
    staff.append(new_staff_entry)

    db["receptionists"] = receptionists
    db["staff"] = staff
    write_json_db(db)

    return {"message": "Receptionist created successfully", "receptionist": new_rec}


@router.put("/receptionists/{rec_id}")
def update_receptionist(rec_id: str, payload: ReceptionistUpdate):
    """Update receptionist information."""
    db = read_json_db()
    receptionists = db.get("receptionists", [])

    rec_found = False
    for r in receptionists:
        if r.get("id") == rec_id:
            for k, v in payload.dict(exclude_unset=True).items():
                r[k] = v
            rec_found = True
            break

    if not rec_found:
        raise HTTPException(status_code=404, detail="Receptionist not found")

    db["receptionists"] = receptionists
    write_json_db(db)
    return {"message": "Receptionist updated successfully"}


@router.delete("/receptionists/{rec_id}")
def delete_receptionist(rec_id: str):
    """Remove a receptionist account."""
    db = read_json_db()
    receptionists = db.get("receptionists", [])
    staff = db.get("staff", [])

    db["receptionists"] = [r for r in receptionists if r.get("id") != rec_id]
    db["staff"] = [s for s in staff if s.get("id") != rec_id]
    write_json_db(db)

    return {"message": "Receptionist removed successfully"}


@router.get("/analytics")
def get_analytics():
    """Retrieve visual analytics report datasets."""
    return {
        "appointmentsPerDoctor": [
            {"doctorName": "Dr. Olivia Wilson", "specialty": "Cardiology", "count": 48, "completionRate": 94},
            {"doctorName": "Dr. Marcus Vance", "specialty": "Dermatology", "count": 36, "completionRate": 89},
            {"doctorName": "Dr. Sophia Patel", "specialty": "Pediatrics", "count": 42, "completionRate": 96},
            {"doctorName": "Dr. Ethan Reynolds", "specialty": "Neurology", "count": 31, "completionRate": 90},
        ],
        "noShowStats": {
            "totalBookings": 157,
            "completed": 141,
            "noShow": 9,
            "cancelled": 7,
            "noShowRatePercentage": 5.7
        },
        "peakHours": [
            {"slot": "09:00 AM", "loadPercentage": 85},
            {"slot": "10:00 AM", "loadPercentage": 98},
            {"slot": "11:00 AM", "loadPercentage": 92},
            {"slot": "02:00 PM", "loadPercentage": 75},
            {"slot": "03:00 PM", "loadPercentage": 60},
            {"slot": "04:00 PM", "loadPercentage": 80},
        ],
        "monthlyGrowth": [
            {"month": "Apr", "patients": 420, "revenue": 28400},
            {"month": "May", "patients": 510, "revenue": 34600},
            {"month": "Jun", "patients": 590, "revenue": 41200},
            {"month": "Jul", "patients": 680, "revenue": 48900},
            {"month": "Aug", "patients": 740, "revenue": 54200},
        ]
    }


@router.get("/settings")
def get_settings():
    """Retrieve hospital configurations."""
    db = read_json_db()
    return db.get("hospital_settings", {})


@router.put("/settings")
def update_settings(payload: HospitalSettingsUpdate):
    """Update hospital configuration details."""
    db = read_json_db()
    current = db.get("hospital_settings", {})
    for k, v in payload.dict(exclude_unset=True).items():
        current[k] = v
    db["hospital_settings"] = current
    write_json_db(db)
    return {"message": "Hospital settings updated successfully", "settings": current}
