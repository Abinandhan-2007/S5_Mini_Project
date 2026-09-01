# backend/routes/admin_routes.py
import uuid
import re
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Header, status
from pydantic import BaseModel
import database
from database import read_json_db, write_json_db, get_pg_connection
try:
    from core.security import hash_password
except ImportError:
    from backend.core.security import hash_password
from routes.staff_auth import get_current_staff
from schemas import PatientResponse

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
    hospital_id: Optional[str] = None


class StaffCreateRequest(BaseModel):
    full_name: str
    email: str
    role: str  # 'admin', 'doctor', 'receptionist'
    password: Optional[str] = "password123"
    phone: Optional[str] = ""
    specialization: Optional[str] = "General"
    avatar_url: Optional[str] = None
    hospital_id: Optional[str] = None


class HospitalCreate(BaseModel):
    id: Optional[str] = None
    name: str
    address: str
    phone: Optional[str] = "+91 80 2345 6789"
    rating: Optional[float] = 4.8
    reviews_count: Optional[int] = 1000
    emergency_available: Optional[bool] = True
    image_url: Optional[str] = "/hospital_default.jpg"
    specialties: Optional[List[str]] = ["General", "Emergency Care"]
    facility_type: Optional[str] = "General"
    distance_miles: Optional[float] = 1.0


class ReceptionistUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    deskNumber: Optional[str] = None
    shift: Optional[str] = None
    isActive: Optional[bool] = None
    avatarUrl: Optional[str] = None
    assignedDoctorsCount: Optional[int] = None
    hospital_id: Optional[str] = None


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
def get_admin_overview(
    hospital_id: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """Retrieve hospital high-level executive KPIs. Global if super-admin, or scoped to hospital_id."""
    staff_ctx = get_current_staff(authorization) if authorization else None
    effective_hosp_id = hospital_id
    if staff_ctx and staff_ctx.get("hospital_id"):
        effective_hosp_id = staff_ctx["hospital_id"]

    db = read_json_db()
    doctors = db.get("doctors", [])
    patients = db.get("patients", [])
    receptionists = db.get("receptionists", [])
    staff = db.get("staff", [])

    if effective_hosp_id:
        doctors = [d for d in doctors if d.get("hospital_id") == effective_hosp_id or d.get("hospitalId") == effective_hosp_id]
        receptionists = [r for r in receptionists if r.get("hospital_id") == effective_hosp_id or r.get("hospitalId") == effective_hosp_id]
        staff = [s for s in staff if s.get("hospital_id") == effective_hosp_id or s.get("hospitalId") == effective_hosp_id]

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
def list_receptionists(
    hospital_id: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """List receptionist staff accounts."""
    staff_ctx = get_current_staff(authorization) if authorization else None
    effective_hosp_id = hospital_id
    if staff_ctx and staff_ctx.get("hospital_id"):
        effective_hosp_id = staff_ctx["hospital_id"]

    db = read_json_db()
    receptionists = db.get("receptionists", [])
    if effective_hosp_id:
        receptionists = [r for r in receptionists if r.get("hospital_id") == effective_hosp_id or r.get("hospitalId") == effective_hosp_id]
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
    raw_pass = payload.password or "password123"
    if len(raw_pass.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password cannot exceed 72 bytes.")
    hashed_pass = hash_password(raw_pass)

    staff_code = None

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO staff (full_name, email, password_hash, role, specialization, phone, avatar_url, hospital_id)
                        VALUES (%s, %s, %s, 'receptionist', %s, %s, %s, %s)
                        RETURNING id, staff_code
                        """,
                        (
                            payload.name,
                            payload.email,
                            hashed_pass,
                            payload.department,
                            payload.phone,
                            payload.avatarUrl or "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
                            payload.hospital_id
                        )
                    )
                    inserted = cur.fetchone()
                    if inserted:
                        new_id = str(inserted["id"])
                        staff_code = inserted.get("staff_code")
                    conn.commit()
        except Exception as e:
            database.logger.warning(f"Could not insert staff in Postgres: {e}")

    if not staff_code:
        max_rec = 0
        for s in staff:
            if s.get("role") == "receptionist":
                code = s.get("staff_code") or s.get("staffCode")
                if code and code.startswith("REC-"):
                    m = re.search(r"\d+", code)
                    if m:
                        max_rec = max(max_rec, int(m.group(0)))
        staff_code = f"REC-{max_rec + 1:04d}"

    new_rec = {
        "id": new_id,
        "staff_code": staff_code,
        "staffCode": staff_code,
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

    new_staff_entry = {
        "id": new_id,
        "staff_code": staff_code,
        "staffCode": staff_code,
        "name": payload.name,
        "email": payload.email,
        "password": hashed_pass,
        "password_hash": hashed_pass,
        "role": "receptionist",
        "department": payload.department,
        "avatar": new_rec["avatarUrl"],
        "hospital_id": payload.hospital_id,
        "hospitalId": payload.hospital_id
    }

    receptionists.append(new_rec)
    staff.append(new_staff_entry)

    db["receptionists"] = receptionists
    db["staff"] = staff
    write_json_db(db)

    return {"message": "Receptionist created successfully", "receptionist": new_rec}


@router.post("/staff", status_code=status.HTTP_201_CREATED)
def create_staff_account(payload: StaffCreateRequest):
    """
    Create a new staff member account (admin, doctor, receptionist).
    Enforces business rule: Exactly ONE active administrator per hospital.
    Auto-generates hierarchical staff_code (<RoleLetter><HospitalNumber><Seq101+>).
    """
    role = (payload.role or "").strip().lower()
    if role not in ["admin", "doctor", "receptionist"]:
        raise HTTPException(status_code=400, detail=f"Invalid staff role '{payload.role}'. Must be admin, doctor, or receptionist.")

    email_clean = payload.email.strip().lower()
    hosp_id = payload.hospital_id or "hosp-1"

    # Business Rule Check: One Active Admin per Hospital
    if role == "admin":
        if database.use_pg:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT id, full_name FROM staff WHERE hospital_id = %s AND role = 'admin' AND is_active = true LIMIT 1",
                        (hosp_id,)
                    )
                    existing_admin = cur.fetchone()
                    if existing_admin:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Hospital already has an active administrator. Only one admin is permitted per hospital."
                        )
        else:
            db = read_json_db()
            for s in db.get("staff", []):
                if s.get("role") == "admin" and (s.get("hospital_id") == hosp_id or s.get("hospitalId") == hosp_id) and s.get("is_active", True):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Hospital already has an active administrator. Only one admin is permitted per hospital."
                    )

    # Check email uniqueness
    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM staff WHERE LOWER(email) = %s LIMIT 1", (email_clean,))
                if cur.fetchone():
                    raise HTTPException(status_code=400, detail="Staff member with this email already exists.")
    else:
        db = read_json_db()
        if any(s.get("email", "").lower() == email_clean for s in db.get("staff", [])):
            raise HTTPException(status_code=400, detail="Staff member with this email already exists.")

    new_id = str(uuid.uuid4())
    raw_pass = payload.password or "password123"
    hashed_pass = hash_password(raw_pass)

    staff_code = None

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO staff (id, full_name, email, password_hash, role, specialization, phone, avatar_url, hospital_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id, staff_code, full_name, email, role, hospital_id
                        """,
                        (
                            new_id,
                            payload.full_name,
                            email_clean,
                            hashed_pass,
                            role,
                            payload.specialization,
                            payload.phone or "",
                            payload.avatar_url or "",
                            hosp_id
                        )
                    )
                    inserted = cur.fetchone()
                    if inserted:
                        new_id = str(inserted["id"])
                        staff_code = inserted.get("staff_code")
                    conn.commit()
        except Exception as e:
            err_str = str(e).lower()
            if "idx_one_active_admin_per_hospital" in err_str or ("unique" in err_str and "admin" in err_str):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Hospital already has an active administrator. Only one admin is permitted per hospital."
                )
            database.logger.warning(f"Could not insert staff in Postgres: {e}")
            raise HTTPException(status_code=400, detail=str(e))

    if not staff_code:
        # Fallback generator for JSON DB
        role_prefix = {"admin": "A", "doctor": "D", "receptionist": "R"}.get(role, "S")
        hosp_num = "001"
        db = read_json_db()
        if hosp_id:
            matched_hosp = next((h for h in db.get("hospitals", []) if h.get("id") == hosp_id), None)
            if matched_hosp:
                hc = matched_hosp.get("hospital_code") or matched_hosp.get("hospitalCode") or ""
                m = re.search(r"\d+", hc)
                if m:
                    hosp_num = f"{int(m.group(0)):03d}"
            else:
                m = re.search(r"\d+", hosp_id)
                if m:
                    hosp_num = f"{int(m.group(0)):03d}"
        
        staff_list = db.get("staff", [])
        same_role_count = sum(1 for s in staff_list if s.get("role") == role and (s.get("hospital_id") == hosp_id or s.get("hospitalId") == hosp_id))
        seq_num = 101 + same_role_count
        staff_code = f"{role_prefix}{hosp_num}{seq_num:03d}"

    new_staff_record = {
        "id": new_id,
        "staff_code": staff_code,
        "staffCode": staff_code,
        "full_name": payload.full_name,
        "name": payload.full_name,
        "email": email_clean,
        "role": role,
        "specialization": payload.specialization,
        "department": payload.specialization,
        "phone": payload.phone or "",
        "avatar_url": payload.avatar_url or "",
        "avatarUrl": payload.avatar_url or "",
        "hospital_id": hosp_id,
        "hospitalId": hosp_id,
        "is_active": True,
        "isActive": True
    }

    db = read_json_db()
    staff_list = db.get("staff", [])
    staff_list.append(new_staff_record)
    db["staff"] = staff_list
    write_json_db(db)

    return {
        "success": True,
        "message": f"Staff member created successfully with code {staff_code}",
        "staff": new_staff_record
    }


@router.post("/hospitals", status_code=status.HTTP_201_CREATED)
def create_hospital_record(payload: HospitalCreate):
    """Create a new hospital branch. Auto-generates hospital_code (H001, H002...)."""
    h_id = payload.id or f"hosp-{uuid.uuid4().hex[:6]}"
    h_code = None

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO hospitals (id, name, address, phone, rating, reviews_count, emergency_available, image_url, specialties, facility_type, distance_miles)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id, hospital_code, name, address
                        """,
                        (
                            h_id,
                            payload.name,
                            payload.address,
                            payload.phone,
                            payload.rating,
                            payload.reviews_count,
                            payload.emergency_available,
                            payload.image_url,
                            payload.specialties or ["General", "Emergency Care"],
                            payload.facility_type,
                            payload.distance_miles
                        )
                    )
                    row = cur.fetchone()
                    if row:
                        h_id = str(row["id"])
                        h_code = row.get("hospital_code")
                    conn.commit()
        except Exception as e:
            database.logger.warning(f"Could not insert hospital in Postgres: {e}")
            raise HTTPException(status_code=400, detail=str(e))

    if not h_code:
        db = read_json_db()
        hosp_list = db.get("hospitals", [])
        h_code = f"H{len(hosp_list) + 1:03d}"

    new_hosp = {
        "id": h_id,
        "hospital_code": h_code,
        "hospitalCode": h_code,
        "name": payload.name,
        "address": payload.address,
        "phone": payload.phone,
        "rating": payload.rating,
        "reviewsCount": payload.reviews_count,
        "reviews_count": payload.reviews_count,
        "emergencyAvailable": payload.emergency_available,
        "emergency_available": payload.emergency_available,
        "imageUrl": payload.image_url,
        "image_url": payload.image_url,
        "specialties": payload.specialties,
        "facilityType": payload.facility_type,
        "facility_type": payload.facility_type,
        "distanceMiles": payload.distance_miles,
        "distance_miles": payload.distance_miles
    }

    db = read_json_db()
    hosp_list = db.get("hospitals", [])
    hosp_list.append(new_hosp)
    db["hospitals"] = hosp_list
    write_json_db(db)

    return {
        "success": True,
        "message": f"Hospital created successfully with code {h_code}",
        "hospital": new_hosp
    }


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


# ==========================================
# DISPLAY CODE LOOKUP ENDPOINTS (PAT-XXXXXX & STF-XXXX)
# ==========================================

@router.get("/patients/lookup/{patient_code}", response_model=PatientResponse)
def lookup_patient_by_code(
    patient_code: str,
    authorization: Optional[str] = Header(None)
):
    """
    Lookup patient by human-readable display code (e.g. PAT-000042).
    Accessible by staff/admin.
    """
    clean_code = (patient_code or "").strip().upper()
    if not clean_code:
        raise HTTPException(status_code=400, detail="Patient display code is required.")

    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM patients WHERE UPPER(patient_code) = %s LIMIT 1",
                    (clean_code,)
                )
                row = cur.fetchone()
                if row:
                    emerg = row.get("emergency_contact")
                    if isinstance(emerg, str):
                        try:
                            emerg = json.loads(emerg)
                        except Exception:
                            emerg = None
                    return PatientResponse(
                        id=str(row["id"]),
                        patient_code=row.get("patient_code"),
                        patientCode=row.get("patient_code"),
                        fullName=row["full_name"],
                        email=row["email"],
                        phone=row.get("phone") or "",
                        address=row.get("address") or "",
                        dob=str(row.get("dob") or ""),
                        gender=row.get("gender") or "Not specified",
                        bloodGroup=row.get("blood_group") or "O+",
                        avatarUrl=row.get("avatar_url") or "",
                        authProvider=row.get("auth_provider") or "local",
                        allergies=row.get("allergies") or "",
                        preExistingConditions=row.get("pre_existing_conditions") or "",
                        emergencyContact=emerg
                    )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with code '{patient_code}' not found"
        )
    else:
        db = read_json_db()
        for p in db.get("patients", []):
            p_code = (p.get("patient_code") or p.get("patientCode") or "").strip().upper()
            if p_code == clean_code:
                return PatientResponse(
                    id=str(p["id"]),
                    patient_code=p.get("patient_code") or p.get("patientCode"),
                    patientCode=p.get("patient_code") or p.get("patientCode"),
                    fullName=p["full_name"],
                    email=p["email"],
                    phone=p.get("phone", ""),
                    address=p.get("address", ""),
                    dob=str(p.get("dob", "")),
                    gender=p.get("gender", "Female"),
                    bloodGroup=p.get("blood_group", "O+"),
                    avatarUrl=p.get("avatar_url", ""),
                    authProvider=p.get("auth_provider", "local"),
                    allergies=p.get("allergies", ""),
                    preExistingConditions=p.get("pre_existing_conditions", ""),
                    emergencyContact=p.get("emergency_contact")
                )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with code '{patient_code}' not found"
        )


@router.get("/staff/lookup/{staff_code}")
def lookup_staff_by_code(
    staff_code: str,
    authorization: Optional[str] = Header(None)
):
    """
    Lookup staff member by human-readable display code (e.g. ADM-0001, REC-0001, DOC-0001).
    Accessible by staff/admin.
    """
    clean_code = (staff_code or "").strip().upper()
    if not clean_code:
        raise HTTPException(status_code=400, detail="Staff display code is required.")

    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, full_name, email, role, specialization, phone, avatar_url, hospital_id, doctor_id, is_active, staff_code 
                    FROM staff 
                    WHERE UPPER(staff_code) = %s 
                    LIMIT 1
                    """,
                    (clean_code,)
                )
                row = cur.fetchone()
                if row:
                    return {
                        "id": str(row["id"]),
                        "staff_code": row.get("staff_code"),
                        "staffCode": row.get("staff_code"),
                        "fullName": row["full_name"],
                        "name": row["full_name"],
                        "email": row["email"],
                        "role": row["role"],
                        "department": row.get("specialization") or "General",
                        "phone": row.get("phone") or "",
                        "avatarUrl": row.get("avatar_url") or "",
                        "hospitalId": row.get("hospital_id"),
                        "hospital_id": row.get("hospital_id"),
                        "doctorId": row.get("doctor_id"),
                        "doctor_id": row.get("doctor_id"),
                        "isActive": row.get("is_active", True)
                    }
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff member with code '{staff_code}' not found"
        )
    else:
        db = read_json_db()
        for s in db.get("staff", []):
            s_code = (s.get("staff_code") or s.get("staffCode") or "").strip().upper()
            if s_code == clean_code:
                return {
                    "id": str(s.get("id")),
                    "staff_code": s.get("staff_code") or s.get("staffCode"),
                    "staffCode": s.get("staff_code") or s.get("staffCode"),
                    "fullName": s.get("name") or s.get("full_name") or "Staff Member",
                    "name": s.get("name") or s.get("full_name") or "Staff Member",
                    "email": s.get("email"),
                    "role": s.get("role", "staff"),
                    "department": s.get("department") or s.get("specialization") or "General",
                    "phone": s.get("phone") or "",
                    "avatarUrl": s.get("avatarUrl") or s.get("avatar") or "",
                    "hospitalId": s.get("hospital_id") or s.get("hospitalId"),
                    "hospital_id": s.get("hospital_id") or s.get("hospitalId"),
                    "doctorId": s.get("doctor_id") or s.get("doctorId"),
                    "doctor_id": s.get("doctor_id") or s.get("doctorId"),
                    "isActive": s.get("isActive", True) if s.get("isActive") is not None else s.get("is_active", True)
                }
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff member with code '{staff_code}' not found"
        )


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
