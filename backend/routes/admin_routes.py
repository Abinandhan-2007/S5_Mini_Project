# backend/routes/admin_routes.py
import uuid
import re
import json
from datetime import datetime
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
    password: Optional[str] = "desk123"
    phone: Optional[str] = "+91 98765 00000"
    department: Optional[str] = "Front Desk"
    deskNumber: Optional[str] = "Desk A-1"
    shift: Optional[str] = "Morning"
    avatarUrl: Optional[str] = None
    assignedDoctorsCount: Optional[int] = 2
    hospital_id: Optional[str] = None


class NurseCreate(BaseModel):
    name: str
    email: str
    username: Optional[str] = None
    password: Optional[str] = "Nurse@123"
    phone: Optional[str] = "+91 98765 00000"
    department: Optional[str] = "Triage & Vitals"
    shift: Optional[str] = "Morning"
    avatarUrl: Optional[str] = None
    hospital_id: Optional[str] = None


class NurseUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    shift: Optional[str] = None
    isActive: Optional[bool] = None
    avatarUrl: Optional[str] = None
    hospital_id: Optional[str] = None


class StaffCreateRequest(BaseModel):
    full_name: str
    email: str
    role: str  # 'admin', 'doctor', 'receptionist', 'nurse'
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
    email: Optional[str] = None
    password: Optional[str] = None
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
    staff_ctx = get_current_staff(authorization) if (authorization and isinstance(authorization, str)) else None
    effective_hosp_id = hospital_id
    if staff_ctx and staff_ctx.get("hospital_id"):
        effective_hosp_id = staff_ctx["hospital_id"]

    hospital_name = None
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if effective_hosp_id:
                        cur.execute("SELECT name FROM hospitals WHERE id = %s LIMIT 1", (effective_hosp_id,))
                        h_row = cur.fetchone()
                        if h_row and h_row.get("name"):
                            hospital_name = h_row["name"]

                        cur.execute("SELECT COUNT(*) as c FROM doctors WHERE hospital_id = %s", (effective_hosp_id,))
                        total_doctors = cur.fetchone()["c"]

                        cur.execute("SELECT COUNT(*) as c FROM staff WHERE role = 'receptionist' AND hospital_id = %s", (effective_hosp_id,))
                        total_receptionists = cur.fetchone()["c"]

                        cur.execute("SELECT COUNT(*) as c FROM staff WHERE role = 'nurse' AND hospital_id = %s", (effective_hosp_id,))
                        total_nurses = cur.fetchone()["c"]

                        cur.execute("SELECT COUNT(*) as c FROM appointments WHERE hospital_id = %s", (effective_hosp_id,))
                        today_appointments = cur.fetchone()["c"]
                    else:
                        cur.execute("SELECT COUNT(*) as c FROM doctors")
                        total_doctors = cur.fetchone()["c"]

                        cur.execute("SELECT COUNT(*) as c FROM staff WHERE role = 'receptionist'")
                        total_receptionists = cur.fetchone()["c"]

                        cur.execute("SELECT COUNT(*) as c FROM staff WHERE role = 'nurse'")
                        total_nurses = cur.fetchone()["c"]

                        cur.execute("SELECT COUNT(*) as c FROM appointments")
                        today_appointments = cur.fetchone()["c"]

                    cur.execute("SELECT COUNT(*) as c FROM patients")
                    total_patients = cur.fetchone()["c"]

                    # Real PostgreSQL aggregation for Weekly Trend (Mon - Sun of current week)
                    cur.execute(
                        """
                        SELECT 
                            to_char(d, 'Dy') as label,
                            d::date as full_date,
                            COUNT(a.id) as appointments,
                            COUNT(DISTINCT a.patient_id) as patients
                        FROM generate_series(date_trunc('week', CURRENT_DATE), date_trunc('week', CURRENT_DATE) + INTERVAL '6 days', '1 day'::interval) d
                        LEFT JOIN appointments a ON a.date = d::date AND (%s::text IS NULL OR a.hospital_id = %s)
                        GROUP BY d
                        ORDER BY d;
                        """,
                        (effective_hosp_id, effective_hosp_id)
                    )
                    weekly_rows = cur.fetchall()
                    max_w = max([r["appointments"] for r in weekly_rows] or [1])
                    weekly_data = [
                        {
                            "label": r["label"],
                            "appointments": r["appointments"],
                            "patients": r["patients"],
                            "heightPct": round((r["appointments"] / max_w) * 100)
                        }
                        for r in weekly_rows
                    ]

                    # Real PostgreSQL aggregation for Monthly Trend (Past 6 months up to current month)
                    cur.execute(
                        """
                        SELECT 
                            to_char(m, 'Mon') as label,
                            date_part('year', m) as yr,
                            date_part('month', m) as mo,
                            COUNT(a.id) as appointments,
                            COUNT(DISTINCT a.patient_id) as patients
                        FROM generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '5 months', date_trunc('month', CURRENT_DATE), '1 month'::interval) m
                        LEFT JOIN appointments a ON date_trunc('month', a.date) = m AND (%s::text IS NULL OR a.hospital_id = %s)
                        GROUP BY m, yr, mo
                        ORDER BY m;
                        """,
                        (effective_hosp_id, effective_hosp_id)
                    )
                    monthly_rows = cur.fetchall()
                    max_m = max([r["appointments"] for r in monthly_rows] or [1])
                    monthly_data = [
                        {
                            "label": r["label"],
                            "appointments": r["appointments"],
                            "patients": r["patients"],
                            "heightPct": round((r["appointments"] / max_m) * 100)
                        }
                        for r in monthly_rows
                    ]

                    return {
                        "totalDoctors": total_doctors,
                        "totalReceptionists": total_receptionists,
                        "totalNurses": total_nurses,
                        "totalPatients": total_patients,
                        "todayAppointments": today_appointments,
                        "activeTokens": today_appointments,
                        "revenueToday": total_doctors * 800 * 2,
                        "hospitalName": hospital_name or "CarePulse Central Hospital",
                        "weeklyData": weekly_data,
                        "monthlyData": monthly_data
                    }
        except Exception as e:
            database.logger.warning(f"Could not fetch admin overview from Postgres: {e}")

    db = read_json_db()
    doctors = db.get("doctors", [])
    patients = db.get("patients", [])
    receptionists = db.get("receptionists", [])
    nurses = db.get("nurses", [])
    staff = db.get("staff", [])
    all_appointments = db.get("appointments", [])

    if effective_hosp_id:
        doctors = [d for d in doctors if d.get("hospital_id") == effective_hosp_id or d.get("hospitalId") == effective_hosp_id]
        receptionists = [r for r in receptionists if r.get("hospital_id") == effective_hosp_id or r.get("hospitalId") == effective_hosp_id]
        nurses = [n for n in nurses if n.get("hospital_id") == effective_hosp_id or n.get("hospitalId") == effective_hosp_id]
        staff = [s for s in staff if s.get("hospital_id") == effective_hosp_id or s.get("hospitalId") == effective_hosp_id]
        all_appointments = [a for a in all_appointments if a.get("hospital_id") == effective_hosp_id or a.get("hospitalId") == effective_hosp_id]
        hosp_match = next((h for h in db.get("hospitals", []) if h.get("id") == effective_hosp_id), None)
        if hosp_match:
            hospital_name = hosp_match.get("name")

    total_doctors = len(doctors)
    total_receptionists = len(receptionists) if receptionists else len([s for s in staff if s.get("role") == "receptionist"])
    total_nurses = len(nurses) if nurses else len([s for s in staff if s.get("role") == "nurse"])
    total_patients = len(patients)

    today_str = datetime.now().strftime("%Y-%m-%d")
    today_appointments = len([a for a in all_appointments if a.get("date") == today_str])
    active_tokens = today_appointments
    revenue_today = sum([d.get("consultation_fee", 800) for d in doctors[:3]]) * max(1, today_appointments)

    # Dynamic weekly & monthly data from all_appointments
    week_days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    weekly_data = [{"label": day, "appointments": 0, "patients": 0, "heightPct": 0} for day in week_days]
    months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
    monthly_data = [{"label": m, "appointments": 0, "patients": 0, "heightPct": 0} for m in months]

    return {
        "totalDoctors": total_doctors,
        "totalReceptionists": total_receptionists,
        "totalNurses": total_nurses,
        "totalPatients": total_patients,
        "todayAppointments": today_appointments,
        "activeTokens": active_tokens,
        "revenueToday": revenue_today,
        "hospitalName": hospital_name or db.get("hospital_settings", {}).get("name", "CarePulse Central Hospital"),
        "weeklyData": weekly_data,
        "monthlyData": monthly_data
    }


@router.get("/receptionists")
def list_receptionists(
    hospital_id: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """List receptionist staff accounts scoped to the hospital."""
    staff_ctx = get_current_staff(authorization) if authorization else None
    is_superadmin = bool(staff_ctx and staff_ctx.get("role") == "superadmin")
    effective_hosp_id = hospital_id
    if staff_ctx and staff_ctx.get("hospital_id"):
        effective_hosp_id = staff_ctx["hospital_id"]

    results = []
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if effective_hosp_id:
                        cur.execute("""
                            SELECT id, full_name, email, role, phone, avatar_url, specialization, hospital_id, staff_code, password_hash
                            FROM staff
                            WHERE role = 'receptionist' AND hospital_id = %s
                            ORDER BY id
                        """, (effective_hosp_id,))
                    elif is_superadmin:
                        cur.execute("""
                            SELECT id, full_name, email, role, phone, avatar_url, specialization, hospital_id, staff_code, password_hash
                            FROM staff
                            WHERE role = 'receptionist'
                            ORDER BY id
                        """)
                    rows = cur.fetchall()
                    if rows:
                        for r in rows:
                            raw_p = r.get("password_hash") or ""
                            if raw_p.startswith("$2b$"):
                                raw_p = ""
                            results.append({
                                "id": str(r["id"]),
                                "staff_code": r.get("staff_code"),
                                "staffCode": r.get("staff_code"),
                                "name": r["full_name"],
                                "email": r["email"],
                                "password": raw_p,
                                "phone": r.get("phone") or "+91 98765 00000",
                                "department": r.get("specialization") or "Main Reception",
                                "deskNumber": "Desk A-1 (Ground Floor)",
                                "shift": "Morning",
                                "isActive": True,
                                "avatarUrl": r.get("avatar_url") or "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
                                "assignedDoctorsCount": 2,
                                "hospital_id": r.get("hospital_id"),
                                "hospitalId": r.get("hospital_id"),
                            })
                        return results
        except Exception as e:
            database.logger.warning(f"Could not fetch receptionists from PG: {e}")

    # JSON fallback
    db = read_json_db()
    recs = db.get("receptionists", [])
    staff_list = db.get("staff", [])

    combined = []
    seen_ids = set()
    for r in recs:
        r_hosp = r.get("hospital_id") or r.get("hospitalId")
        if not effective_hosp_id or r_hosp == effective_hosp_id:
            s_match = next((s for s in staff_list if s.get("id") == r.get("id") or (s.get("email") and s.get("email").lower() == str(r.get("email")).lower())), None)
            rec_pass = r.get("password")
            if not rec_pass or str(rec_pass).startswith("$2b$"):
                if s_match and s_match.get("password") and not str(s_match.get("password")).startswith("$2b$"):
                    rec_pass = s_match.get("password")
                else:
                    rec_pass = r.get("password") if r.get("password") and not str(r.get("password")).startswith("$2b$") else ""
            r_entry = dict(r)
            r_entry["password"] = rec_pass or ""
            combined.append(r_entry)
            seen_ids.add(str(r.get("id")))

    for s in staff_list:
        if s.get("role") == "receptionist":
            s_hosp = s.get("hospital_id") or s.get("hospitalId")
            if (not effective_hosp_id or s_hosp == effective_hosp_id) and str(s.get("id")) not in seen_ids:
                s_pass = s.get("password") if (s.get("password") and not str(s.get("password")).startswith("$2b$")) else ""
                combined.append({
                    "id": str(s.get("id")),
                    "staff_code": s.get("staff_code") or s.get("staffCode"),
                    "staffCode": s.get("staff_code") or s.get("staffCode"),
                    "name": s.get("name") or s.get("full_name"),
                    "email": s.get("email"),
                    "password": s_pass,
                    "phone": s.get("phone") or "+91 98765 00000",
                    "department": s.get("department") or s.get("specialization") or "Main Reception",
                    "deskNumber": s.get("deskNumber") or "Desk A-1",
                    "shift": s.get("shift") or "Morning",
                    "isActive": s.get("isActive", True),
                    "avatarUrl": s.get("avatar") or s.get("avatarUrl") or "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
                    "assignedDoctorsCount": s.get("assignedDoctorsCount", 2),
                    "hospital_id": s_hosp,
                    "hospitalId": s_hosp,
                })
                seen_ids.add(str(s.get("id")))

    return combined


@router.post("/receptionists", status_code=status.HTTP_201_CREATED)
def create_receptionist(payload: ReceptionistCreate, authorization: Optional[str] = Header(None)):
    """Create a new receptionist account linked to hospital."""
    staff_ctx = get_current_staff(authorization) if authorization else None
    
    # Authoritative hospital scoping:
    # If caller is an Admin, their session hospital_id is strictly authoritative (adversarial client overrides are ignored)
    if staff_ctx and staff_ctx.get("role") == "admin" and staff_ctx.get("hospital_id"):
        effective_hosp_id = staff_ctx["hospital_id"]
    elif staff_ctx and staff_ctx.get("role") == "superadmin":
        effective_hosp_id = payload.hospital_id or "hosp-bag"
    else:
        effective_hosp_id = (staff_ctx.get("hospital_id") if staff_ctx else None) or payload.hospital_id or "hosp-bag"

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
                            effective_hosp_id
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
        hosp_num = "007"
        if "bag" in str(effective_hosp_id).lower():
            hosp_num = "007"
        else:
            m = re.search(r"\d+", str(effective_hosp_id))
            hosp_num = f"{int(m.group(0)):03d}" if m else "001"
        existing_recs = [s for s in staff if s.get("role") == "receptionist" and (s.get("hospital_id") == effective_hosp_id or s.get("hospitalId") == effective_hosp_id)]
        seq = 101 + len(existing_recs)
        staff_code = f"R{hosp_num}{seq:03d}"

    new_rec = {
        "id": new_id,
        "staff_code": staff_code,
        "staffCode": staff_code,
        "name": payload.name,
        "email": payload.email,
        "password": raw_pass,
        "phone": payload.phone,
        "department": payload.department,
        "deskNumber": payload.deskNumber,
        "shift": payload.shift,
        "isActive": True,
        "avatarUrl": payload.avatarUrl or "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
        "assignedDoctorsCount": payload.assignedDoctorsCount or 2,
        "hospital_id": effective_hosp_id,
        "hospitalId": effective_hosp_id,
        "joinDate": datetime.now().strftime("%Y-%m-%d")
    }

    new_staff_entry = {
        "id": new_id,
        "staff_code": staff_code,
        "staffCode": staff_code,
        "name": payload.name,
        "full_name": payload.name,
        "email": payload.email,
        "password": raw_pass,
        "password_hash": hashed_pass,
        "role": "receptionist",
        "department": payload.department,
        "avatar": new_rec["avatarUrl"],
        "avatar_url": new_rec["avatarUrl"],
        "avatarUrl": new_rec["avatarUrl"],
        "hospital_id": effective_hosp_id,
        "hospitalId": effective_hosp_id,
        "is_active": True,
        "isActive": True
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
    if role not in ["admin", "doctor", "receptionist", "nurse"]:
        raise HTTPException(status_code=400, detail=f"Invalid staff role '{payload.role}'. Must be admin, doctor, receptionist, or nurse.")

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
        role_prefix = {"admin": "A", "doctor": "D", "receptionist": "R", "nurse": "N"}.get(role, "S")
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
    """Update receptionist information and credentials in staff and receptionist records."""
    db = read_json_db()
    receptionists = db.get("receptionists", [])
    staff = db.get("staff", [])

    rec_found = False
    updates = payload.dict(exclude_unset=True)
    raw_pass = updates.get("password")
    hashed_pass = hash_password(raw_pass) if (raw_pass and raw_pass.strip()) else None

    for r in receptionists:
        if str(r.get("id")) == str(rec_id) or str(r.get("email", "")).lower() == str(rec_id).lower() or str(r.get("staff_code", "")) == str(rec_id):
            for k, v in updates.items():
                r[k] = v
            if raw_pass and raw_pass.strip():
                r["password"] = raw_pass.strip()
            rec_found = True
            break

    for s in staff:
        if str(s.get("id")) == str(rec_id) or str(s.get("email", "")).lower() == str(rec_id).lower() or str(s.get("staff_code", "")) == str(rec_id):
            if "name" in updates and updates["name"]:
                s["name"] = updates["name"]
                s["full_name"] = updates["name"]
            if "email" in updates and updates["email"]:
                s["email"] = updates["email"].lower()
            if "phone" in updates:
                s["phone"] = updates["phone"]
            if "department" in updates and updates["department"]:
                s["department"] = updates["department"]
                s["specialization"] = updates["department"]
            if "isActive" in updates and updates["isActive"] is not None:
                s["isActive"] = updates["isActive"]
                s["is_active"] = updates["isActive"]
            if raw_pass and raw_pass.strip():
                s["password"] = raw_pass.strip()
                s["password_hash"] = hashed_pass
            rec_found = True
            break

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    fields = []
                    vals = []
                    if "name" in updates and updates["name"]:
                        fields.append("full_name = %s")
                        vals.append(updates["name"])
                    if "email" in updates and updates["email"]:
                        fields.append("email = %s")
                        vals.append(updates["email"].lower())
                    if "phone" in updates:
                        fields.append("phone = %s")
                        vals.append(updates["phone"])
                    if "department" in updates and updates["department"]:
                        fields.append("specialization = %s")
                        vals.append(updates["department"])
                    if "isActive" in updates and updates["isActive"] is not None:
                        fields.append("is_active = %s")
                        vals.append(bool(updates["isActive"]))
                    if raw_pass and raw_pass.strip():
                        fields.append("password = %s")
                        vals.append(raw_pass.strip())
                        fields.append("password_hash = %s")
                        vals.append(hashed_pass)

                    if fields:
                        vals.extend([rec_id, rec_id, rec_id.lower()])
                        cur.execute(f"""
                            UPDATE staff 
                            SET {', '.join(fields)}
                            WHERE (id::text = %s OR staff_code = %s OR LOWER(email) = %s)
                              AND role = 'receptionist'
                        """, tuple(vals))
                conn.commit()
        except Exception as e:
            database.logger.warning(f"Could not update staff in Postgres: {e}")

    if not rec_found:
        raise HTTPException(status_code=404, detail="Receptionist not found")

    db["receptionists"] = receptionists
    db["staff"] = staff
    write_json_db(db)
    return {"success": True, "message": "Receptionist updated successfully"}


@router.delete("/receptionists/{rec_id}")
def delete_receptionist(rec_id: str):
    """Remove a receptionist account from database and staff."""
    db = read_json_db()
    receptionists = db.get("receptionists", [])
    staff = db.get("staff", [])

    db["receptionists"] = [
        r for r in receptionists 
        if str(r.get("id")) != str(rec_id) and str(r.get("email", "")).lower() != str(rec_id).lower() and str(r.get("staff_code", "")) != str(rec_id)
    ]
    db["staff"] = [
        s for s in staff 
        if str(s.get("id")) != str(rec_id) and str(s.get("email", "")).lower() != str(rec_id).lower() and str(s.get("staff_code", "")) != str(rec_id)
    ]
    write_json_db(db)

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        DELETE FROM staff 
                        WHERE (id::text = %s OR staff_code = %s OR LOWER(email) = %s)
                          AND role = 'receptionist'
                    """, (rec_id, rec_id, rec_id.lower()))
                conn.commit()
        except Exception as e:
            database.logger.warning(f"Could not delete staff from Postgres: {e}")

    return {"success": True, "message": "Receptionist removed successfully"}


# ==========================================
# NURSE MANAGEMENT ENDPOINTS
# ==========================================

@router.get("/nurses")
def list_nurses(
    hospital_id: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """List nurse staff accounts scoped to the hospital."""
    staff_ctx = get_current_staff(authorization) if authorization else None
    is_superadmin = bool(staff_ctx and staff_ctx.get("role") == "superadmin")
    effective_hosp_id = hospital_id
    if staff_ctx and staff_ctx.get("hospital_id"):
        effective_hosp_id = staff_ctx["hospital_id"]

    results = []
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if effective_hosp_id:
                        cur.execute("""
                            SELECT s.id, s.full_name, s.email, s.username, s.role, s.phone, s.avatar_url, s.specialization, s.hospital_id, s.staff_code, s.password_hash, s.is_active, s.created_at, h.name as hospital_name
                            FROM staff s
                            LEFT JOIN hospitals h ON s.hospital_id = h.id
                            WHERE s.role = 'nurse' AND s.hospital_id = %s
                            ORDER BY s.id
                        """, (effective_hosp_id,))
                    elif is_superadmin:
                        cur.execute("""
                            SELECT s.id, s.full_name, s.email, s.username, s.role, s.phone, s.avatar_url, s.specialization, s.hospital_id, s.staff_code, s.password_hash, s.is_active, s.created_at, h.name as hospital_name
                            FROM staff s
                            LEFT JOIN hospitals h ON s.hospital_id = h.id
                            WHERE s.role = 'nurse'
                            ORDER BY s.id
                        """)
                    rows = cur.fetchall()
                    if rows:
                        # Cross-check with JSON DB for handover plaintext password if available
                        db_json = read_json_db()
                        json_nurses = db_json.get("nurses", []) + [s for s in db_json.get("staff", []) if s.get("role") == "nurse"]
                        pass_map = {}
                        shift_map = {}
                        for jn in json_nurses:
                            jid = str(jn.get("id"))
                            jemail = str(jn.get("email", "")).lower()
                            jpass = jn.get("password")
                            jshift = jn.get("shift")
                            if jpass and not str(jpass).startswith("$2b$"):
                                pass_map[jid] = jpass
                                pass_map[jemail] = jpass
                            if jshift:
                                shift_map[jid] = jshift
                                shift_map[jemail] = jshift

                        for r in rows:
                            raw_p = r.get("password_hash") or ""
                            if raw_p.startswith("$2b$"):
                                raw_p = pass_map.get(str(r["id"])) or pass_map.get(str(r["email"]).lower()) or ""
                            shift_val = shift_map.get(str(r["id"])) or shift_map.get(str(r["email"]).lower()) or "Morning"
                            results.append({
                                "id": str(r["id"]),
                                "staff_code": r.get("staff_code"),
                                "staffCode": r.get("staff_code"),
                                "name": r.get("full_name") or r.get("name") or "Nurse",
                                "fullName": r.get("full_name") or r.get("name") or "Nurse",
                                "email": r.get("email"),
                                "username": r.get("username") or (r.get("email").split("@")[0] if r.get("email") else "nurse"),
                                "password": raw_p,
                                "phone": r.get("phone") or "+91 98765 00000",
                                "department": r.get("specialization") or "Triage & Vitals",
                                "shift": shift_val,
                                "isActive": bool(r.get("is_active", True)),
                                "avatarUrl": r.get("avatar_url") or "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&auto=format&fit=crop&q=80",
                                "hospital_id": r.get("hospital_id"),
                                "hospitalId": r.get("hospital_id"),
                                "hospitalName": r.get("hospital_name") or "CarePulse Medical Center",
                                "role": "nurse",
                                "joinDate": str(r.get("created_at") or datetime.now().strftime("%Y-%m-%d"))[:10]
                            })
                        return results
        except Exception as e:
            database.logger.warning(f"Could not fetch nurses from PG: {e}")

    # JSON DB fallback
    db = read_json_db()
    nurses = db.get("nurses", [])
    staff_list = db.get("staff", [])

    combined = []
    seen_ids = set()
    for n in nurses:
        n_hosp = n.get("hospital_id") or n.get("hospitalId")
        if not effective_hosp_id or n_hosp == effective_hosp_id:
            s_match = next((s for s in staff_list if s.get("id") == n.get("id") or (s.get("email") and s.get("email").lower() == str(n.get("email")).lower())), None)
            nurse_pass = n.get("password")
            if not nurse_pass or str(nurse_pass).startswith("$2b$"):
                if s_match and s_match.get("password") and not str(s_match.get("password")).startswith("$2b$"):
                    nurse_pass = s_match.get("password")
                else:
                    nurse_pass = n.get("password") if n.get("password") and not str(n.get("password")).startswith("$2b$") else ""
            n_entry = dict(n)
            n_entry["password"] = nurse_pass or ""
            n_entry["role"] = "nurse"
            n_entry["name"] = n.get("name") or n.get("fullName") or "Nurse"
            n_entry["fullName"] = n.get("name") or n.get("fullName") or "Nurse"
            combined.append(n_entry)
            seen_ids.add(str(n.get("id")))

    for s in staff_list:
        if s.get("role") == "nurse":
            s_hosp = s.get("hospital_id") or s.get("hospitalId")
            if (not effective_hosp_id or s_hosp == effective_hosp_id) and str(s.get("id")) not in seen_ids:
                s_pass = s.get("password") if (s.get("password") and not str(s.get("password")).startswith("$2b$")) else ""
                combined.append({
                    "id": str(s.get("id")),
                    "staff_code": s.get("staff_code") or s.get("staffCode"),
                    "staffCode": s.get("staff_code") or s.get("staffCode"),
                    "name": s.get("name") or s.get("full_name") or "Nurse",
                    "fullName": s.get("name") or s.get("full_name") or "Nurse",
                    "email": s.get("email"),
                    "username": s.get("username") or (s.get("email").split("@")[0] if s.get("email") else "nurse"),
                    "password": s_pass,
                    "phone": s.get("phone") or "+91 98765 00000",
                    "department": s.get("department") or s.get("specialization") or "Triage & Vitals",
                    "shift": s.get("shift") or "Morning",
                    "isActive": s.get("isActive", s.get("is_active", True)),
                    "avatarUrl": s.get("avatar") or s.get("avatarUrl") or s.get("avatar_url") or "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&auto=format&fit=crop&q=80",
                    "hospital_id": s_hosp,
                    "hospitalId": s_hosp,
                    "role": "nurse",
                    "joinDate": s.get("joinDate") or datetime.now().strftime("%Y-%m-%d")
                })
                seen_ids.add(str(s.get("id")))

    return combined


@router.post("/nurses", status_code=status.HTTP_201_CREATED)
def create_nurse(payload: NurseCreate, authorization: Optional[str] = Header(None)):
    """Create a new nurse account linked to hospital with auto-generated staff code."""
    staff_ctx = get_current_staff(authorization) if authorization else None
    
    # Authoritative hospital scoping
    if staff_ctx and staff_ctx.get("role") == "admin" and staff_ctx.get("hospital_id"):
        effective_hosp_id = staff_ctx["hospital_id"]
    elif staff_ctx and staff_ctx.get("role") == "superadmin":
        effective_hosp_id = payload.hospital_id or "hosp-bag"
    else:
        effective_hosp_id = (staff_ctx.get("hospital_id") if staff_ctx else None) or payload.hospital_id or "hosp-bag"

    db = read_json_db()
    nurses = db.get("nurses", [])
    staff = db.get("staff", [])

    email_clean = payload.email.strip().lower()
    username_clean = (payload.username or email_clean.split("@")[0]).strip().lower()

    # Check if email already exists
    if any(s.get("email", "").lower() == email_clean for s in staff):
        raise HTTPException(status_code=400, detail="Staff member with this email already exists")

    new_id = f"nurse-{uuid.uuid4().hex[:8]}"
    raw_pass = payload.password or "Nurse@123"
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
                        INSERT INTO staff (full_name, email, username, password_hash, role, specialization, phone, avatar_url, hospital_id)
                        VALUES (%s, %s, %s, %s, 'nurse', %s, %s, %s, %s)
                        RETURNING id, staff_code
                        """,
                        (
                            payload.name,
                            email_clean,
                            username_clean,
                            hashed_pass,
                            payload.department or "Triage & Vitals",
                            payload.phone or "+91 98765 00000",
                            payload.avatarUrl or "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&auto=format&fit=crop&q=80",
                            effective_hosp_id
                        )
                    )
                    inserted = cur.fetchone()
                    if inserted:
                        new_id = str(inserted["id"])
                        staff_code = inserted.get("staff_code")
                    conn.commit()
        except Exception as e:
            database.logger.warning(f"Could not insert nurse in Postgres: {e}")

    if not staff_code:
        hosp_num = "007"
        if "bag" in str(effective_hosp_id).lower():
            hosp_num = "007"
        else:
            m = re.search(r"\d+", str(effective_hosp_id))
            hosp_num = f"{int(m.group(0)):03d}" if m else "001"
        existing_nurses = [s for s in staff if s.get("role") == "nurse" and (s.get("hospital_id") == effective_hosp_id or s.get("hospitalId") == effective_hosp_id)]
        seq = 101 + len(existing_nurses)
        staff_code = f"N{hosp_num}{seq:03d}"

    new_nurse = {
        "id": new_id,
        "staff_code": staff_code,
        "staffCode": staff_code,
        "name": payload.name,
        "fullName": payload.name,
        "email": email_clean,
        "username": username_clean,
        "password": raw_pass,
        "phone": payload.phone or "+91 98765 00000",
        "department": payload.department or "Triage & Vitals",
        "shift": payload.shift or "Morning",
        "isActive": True,
        "avatarUrl": payload.avatarUrl or "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&auto=format&fit=crop&q=80",
        "hospital_id": effective_hosp_id,
        "hospitalId": effective_hosp_id,
        "role": "nurse",
        "joinDate": datetime.now().strftime("%Y-%m-%d")
    }

    new_staff_entry = {
        "id": new_id,
        "staff_code": staff_code,
        "staffCode": staff_code,
        "name": payload.name,
        "full_name": payload.name,
        "email": email_clean,
        "username": username_clean,
        "password": raw_pass,
        "password_hash": hashed_pass,
        "role": "nurse",
        "department": payload.department or "Triage & Vitals",
        "specialization": payload.department or "Triage & Vitals",
        "phone": payload.phone or "+91 98765 00000",
        "shift": payload.shift or "Morning",
        "avatar": new_nurse["avatarUrl"],
        "avatar_url": new_nurse["avatarUrl"],
        "avatarUrl": new_nurse["avatarUrl"],
        "hospital_id": effective_hosp_id,
        "hospitalId": effective_hosp_id,
        "is_active": True,
        "isActive": True
    }

    nurses.append(new_nurse)
    staff.append(new_staff_entry)

    db["nurses"] = nurses
    db["staff"] = staff
    write_json_db(db)

    return {"message": "Nurse created successfully", "nurse": new_nurse}


@router.put("/nurses/{nurse_id}")
def update_nurse(nurse_id: str, payload: NurseUpdate):
    """Update nurse information and credentials in staff and nurse records."""
    db = read_json_db()
    nurses = db.get("nurses", [])
    staff = db.get("staff", [])

    nurse_found = False
    updates = payload.dict(exclude_unset=True)
    raw_pass = updates.get("password")
    hashed_pass = hash_password(raw_pass) if (raw_pass and raw_pass.strip()) else None

    for n in nurses:
        if str(n.get("id")) == str(nurse_id) or str(n.get("email", "")).lower() == str(nurse_id).lower() or str(n.get("staff_code", "")) == str(nurse_id) or str(n.get("username", "")).lower() == str(nurse_id).lower():
            for k, v in updates.items():
                n[k] = v
            if raw_pass and raw_pass.strip():
                n["password"] = raw_pass.strip()
            nurse_found = True
            break

    for s in staff:
        if str(s.get("id")) == str(nurse_id) or str(s.get("email", "")).lower() == str(nurse_id).lower() or str(s.get("staff_code", "")) == str(nurse_id) or str(s.get("username", "")).lower() == str(nurse_id).lower():
            if "name" in updates and updates["name"]:
                s["name"] = updates["name"]
                s["full_name"] = updates["name"]
            if "email" in updates and updates["email"]:
                s["email"] = updates["email"].lower()
            if "username" in updates and updates["username"]:
                s["username"] = updates["username"].lower()
            if "phone" in updates:
                s["phone"] = updates["phone"]
            if "department" in updates and updates["department"]:
                s["department"] = updates["department"]
                s["specialization"] = updates["department"]
            if "shift" in updates and updates["shift"]:
                s["shift"] = updates["shift"]
            if "isActive" in updates and updates["isActive"] is not None:
                s["isActive"] = updates["isActive"]
                s["is_active"] = updates["isActive"]
            if raw_pass and raw_pass.strip():
                s["password"] = raw_pass.strip()
                s["password_hash"] = hashed_pass
            nurse_found = True
            break

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    fields = []
                    vals = []
                    if "name" in updates and updates["name"]:
                        fields.append("full_name = %s")
                        vals.append(updates["name"])
                    if "email" in updates and updates["email"]:
                        fields.append("email = %s")
                        vals.append(updates["email"].lower())
                    if "username" in updates and updates["username"]:
                        fields.append("username = %s")
                        vals.append(updates["username"].lower())
                    if "phone" in updates:
                        fields.append("phone = %s")
                        vals.append(updates["phone"])
                    if "department" in updates and updates["department"]:
                        fields.append("specialization = %s")
                        vals.append(updates["department"])
                    if "isActive" in updates and updates["isActive"] is not None:
                        fields.append("is_active = %s")
                        vals.append(bool(updates["isActive"]))
                    if raw_pass and raw_pass.strip():
                        fields.append("password_hash = %s")
                        vals.append(hashed_pass)

                    if fields:
                        vals.extend([nurse_id, nurse_id, nurse_id.lower(), nurse_id.lower()])
                        cur.execute(f"""
                            UPDATE staff 
                            SET {', '.join(fields)}
                            WHERE (id::text = %s OR staff_code = %s OR LOWER(email) = %s OR LOWER(COALESCE(username, '')) = %s)
                              AND role = 'nurse'
                        """, tuple(vals))
                conn.commit()
        except Exception as e:
            database.logger.warning(f"Could not update nurse in Postgres: {e}")

    if not nurse_found:
        raise HTTPException(status_code=404, detail="Nurse not found")

    db["nurses"] = nurses
    db["staff"] = staff
    write_json_db(db)
    return {"success": True, "message": "Nurse updated successfully"}


@router.delete("/nurses/{nurse_id}")
def delete_nurse(nurse_id: str):
    """Remove a nurse account from database and staff."""
    db = read_json_db()
    nurses = db.get("nurses", [])
    staff = db.get("staff", [])

    db["nurses"] = [
        n for n in nurses 
        if str(n.get("id")) != str(nurse_id) and str(n.get("email", "")).lower() != str(nurse_id).lower() and str(n.get("staff_code", "")) != str(nurse_id) and str(n.get("username", "")).lower() != str(nurse_id).lower()
    ]
    db["staff"] = [
        s for s in staff 
        if str(s.get("id")) != str(nurse_id) and str(s.get("email", "")).lower() != str(nurse_id).lower() and str(s.get("staff_code", "")) != str(nurse_id) and str(s.get("username", "")).lower() != str(nurse_id).lower()
    ]
    write_json_db(db)

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        DELETE FROM staff 
                        WHERE (id::text = %s OR staff_code = %s OR LOWER(email) = %s OR LOWER(COALESCE(username, '')) = %s)
                          AND role = 'nurse'
                    """, (nurse_id, nurse_id, nurse_id.lower(), nurse_id.lower()))
                conn.commit()
        except Exception as e:
            database.logger.warning(f"Could not delete nurse from Postgres: {e}")

    return {"success": True, "message": "Nurse removed successfully"}


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
def get_settings(
    hospital_id: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """Retrieve hospital configurations scoped to authenticated admin's hospital."""
    staff_ctx = get_current_staff(authorization) if authorization else None
    effective_hosp_id = hospital_id
    if staff_ctx and staff_ctx.get("hospital_id"):
        effective_hosp_id = staff_ctx["hospital_id"]

    db = read_json_db()
    current = dict(db.get("hospital_settings", {}))

    if effective_hosp_id:
        hosp = next((h for h in db.get("hospitals", []) if str(h.get("id")) == str(effective_hosp_id)), None)
        if hosp:
            current["name"] = hosp.get("name") or current.get("name")
            current["address"] = hosp.get("address") or current.get("address")
            current["phone"] = hosp.get("phone") or current.get("phone")
            current["email"] = hosp.get("email") or current.get("email")
            current["hospital_code"] = hosp.get("hospital_code") or ""
            current["hospitalId"] = effective_hosp_id
            current["hospital_id"] = effective_hosp_id

    return current


@router.put("/settings")
def update_settings(
    payload: HospitalSettingsUpdate,
    authorization: Optional[str] = Header(None)
):
    """Update hospital configuration details scoped to hospital."""
    staff_ctx = get_current_staff(authorization) if authorization else None
    effective_hosp_id = staff_ctx.get("hospital_id") if staff_ctx else None

    db = read_json_db()
    current = db.get("hospital_settings", {})
    updates = payload.dict(exclude_unset=True)
    for k, v in updates.items():
        current[k] = v
    db["hospital_settings"] = current

    if effective_hosp_id:
        for h in db.get("hospitals", []):
            if str(h.get("id")) == str(effective_hosp_id):
                if "name" in updates and updates["name"]:
                    h["name"] = updates["name"]
                if "address" in updates and updates["address"]:
                    h["address"] = updates["address"]
                if "phone" in updates and updates["phone"]:
                    h["phone"] = updates["phone"]
                if "email" in updates and updates["email"]:
                    h["email"] = updates["email"]
                break

        if database.use_pg:
            try:
                with get_pg_connection() as conn:
                    with conn.cursor() as cur:
                        fields = []
                        vals = []
                        if "name" in updates and updates["name"]:
                            fields.append("name = %s")
                            vals.append(updates["name"])
                        if "address" in updates and updates["address"]:
                            fields.append("address = %s")
                            vals.append(updates["address"])
                        if "phone" in updates and updates["phone"]:
                            fields.append("phone = %s")
                            vals.append(updates["phone"])
                        if "email" in updates and updates["email"]:
                            fields.append("email = %s")
                            vals.append(updates["email"])
                        if fields:
                            vals.append(str(effective_hosp_id))
                            cur.execute(f"UPDATE hospitals SET {', '.join(fields)} WHERE id = %s", tuple(vals))
                    conn.commit()
            except Exception as e:
                database.logger.warning(f"Note on updating hospital in PG: {e}")

    write_json_db(db)
    return {"message": "Hospital settings updated successfully", "settings": current}


@router.delete("/doctors/{doctor_id}")
def delete_doctor_record(doctor_id: str):
    """Permanently delete a doctor from database and remove associated staff account."""
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT id, email FROM doctors WHERE id = %s", (doctor_id,))
                    doc_row = cur.fetchone()
                    doc_email = doc_row.get("email") if doc_row else None

                    # Delete staff account linked to doctor
                    cur.execute("""
                        DELETE FROM staff 
                        WHERE doctor_id = %s 
                           OR (role = 'doctor' AND (id::text = %s OR LOWER(email) = %s))
                    """, (doctor_id, doctor_id, (doc_email or "").lower()))
                    
                    # Delete appointments referencing this doctor
                    cur.execute("DELETE FROM appointments WHERE doctor_id = %s", (doctor_id,))
                    
                    # Delete doctor record
                    cur.execute("DELETE FROM doctors WHERE id = %s", (doctor_id,))
                conn.commit()
        except Exception as e:
            database.logger.warning(f"Could not delete doctor from Postgres: {e}")

    # Delete from JSON DB
    db = read_json_db()
    db["doctors"] = [d for d in db.get("doctors", []) if str(d.get("id")) != str(doctor_id)]
    db["staff"] = [s for s in db.get("staff", []) if str(s.get("id")) != str(doctor_id) and str(s.get("doctor_id")) != str(doctor_id)]
    write_json_db(db)

    return {"success": True, "message": "Doctor deleted successfully"}


@router.get("/doctors")
def get_admin_doctors(
    hospital_id: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """List all doctors for the admin portal, scoped by hospital if specified."""
    from routes.receptionist_routes import get_doctors
    return get_doctors(hospital_id=hospital_id, authorization=authorization)


@router.post("/doctors")
def create_doctor_admin(payload: Dict[str, Any], authorization: Optional[str] = Header(None)):
    """Create a new doctor profile through admin portal."""
    from routes.receptionist_routes import create_doctor
    from schemas import DoctorCreateRequest
    req = DoctorCreateRequest(**payload)
    return create_doctor(req, authorization)


@router.put("/doctors/{doctor_id}")
def update_doctor_record(doctor_id: str, payload: Dict[str, Any]):
    """Update doctor profile and corresponding staff account credentials."""
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    fields = []
                    vals = []
                    if "name" in payload and payload["name"]:
                        fields.append("name = %s")
                        vals.append(payload["name"])
                    if "specialty" in payload and payload["specialty"]:
                        fields.append("specialty = %s")
                        vals.append(payload["specialty"])
                    if "department" in payload and payload["department"]:
                        fields.append("department = %s")
                        vals.append(payload["department"])
                    if "consultationFee" in payload and payload["consultationFee"] is not None:
                        fields.append("consultation_fee = %s")
                        vals.append(payload["consultationFee"])
                    if "experienceYears" in payload and payload["experienceYears"] is not None:
                        fields.append("experience_years = %s")
                        vals.append(payload["experienceYears"])
                    if "phone" in payload and payload["phone"] is not None:
                        fields.append("phone = %s")
                        vals.append(payload["phone"])
                    if "email" in payload and payload["email"]:
                        fields.append("email = %s")
                        vals.append(payload["email"])
                    if "roomNumber" in payload and payload["roomNumber"] is not None:
                        fields.append("room_number = %s")
                        vals.append(payload["roomNumber"])
                    if "isAvailable" in payload and payload["isAvailable"] is not None:
                        fields.append("is_available = %s")
                        vals.append(payload["isAvailable"])
                    if fields:
                        vals.append(doctor_id)
                        cur.execute(f"UPDATE doctors SET {', '.join(fields)} WHERE id = %s", tuple(vals))
                    if "password" in payload and payload["password"]:
                        raw = payload["password"]
                        h = hash_password(raw)
                        cur.execute("UPDATE staff SET password_hash = %s WHERE doctor_id = %s OR id::text = %s", (h, doctor_id, doctor_id))
                    if "name" in payload and payload["name"]:
                        cur.execute("UPDATE staff SET full_name = %s WHERE doctor_id = %s OR id::text = %s", (payload["name"], doctor_id, doctor_id))
                    if "email" in payload and payload["email"]:
                        cur.execute("UPDATE staff SET email = %s WHERE doctor_id = %s OR id::text = %s", (payload["email"], doctor_id, doctor_id))
                    if "specialty" in payload and payload["specialty"]:
                        cur.execute("UPDATE staff SET specialization = %s WHERE doctor_id = %s OR id::text = %s", (payload["specialty"], doctor_id, doctor_id))
                    if "department" in payload and payload["department"]:
                        cur.execute("UPDATE staff SET department = %s WHERE doctor_id = %s OR id::text = %s", (payload["department"], doctor_id, doctor_id))
                conn.commit()
        except Exception as e:
            database.logger.warning(f"Could not update doctor in Postgres: {e}")

    db = read_json_db()
    target_doc = None
    for d in db.get("doctors", []):
        if str(d.get("id")) == str(doctor_id):
            d.update(payload)
            if "password" in payload and payload["password"]:
                d["password"] = payload["password"]
            if "username" in payload and payload["username"]:
                d["username"] = payload["username"]
            target_doc = d
            break

    staff_found = False
    for s in db.get("staff", []):
        if str(s.get("id")) == str(doctor_id) or str(s.get("doctor_id")) == str(doctor_id):
            staff_found = True
            if "name" in payload and payload["name"]:
                s["name"] = payload["name"]
                s["full_name"] = payload["name"]
            if "username" in payload and payload["username"]:
                s["username"] = payload["username"]
            if "email" in payload and payload["email"]:
                s["email"] = payload["email"]
            if "phone" in payload and payload["phone"]:
                s["phone"] = payload["phone"]
            if "specialty" in payload and payload["specialty"]:
                s["specialization"] = payload["specialty"]
            if "department" in payload and payload["department"]:
                s["department"] = payload["department"]
            if "password" in payload and payload["password"]:
                s["password_hash"] = hash_password(payload["password"])
                s["password"] = payload["password"]
            break

    if not staff_found and target_doc:
        doc_pwd = payload.get("password") or target_doc.get("password") or "doc123"
        db["staff"].append({
            "id": doctor_id,
            "doctor_id": doctor_id,
            "doctorId": doctor_id,
            "staff_code": target_doc.get("staff_code") or target_doc.get("staffCode") or f"D{doctor_id[-4:]}",
            "staffCode": target_doc.get("staffCode") or target_doc.get("staff_code") or f"D{doctor_id[-4:]}",
            "name": target_doc.get("name"),
            "full_name": target_doc.get("name"),
            "email": target_doc.get("email") or f"{target_doc.get('name', 'doctor').lower().replace(' ', '.')}@carepulse.com",
            "username": target_doc.get("username") or target_doc.get("name", "doctor").lower().replace(" ", "."),
            "password": doc_pwd,
            "password_hash": hash_password(doc_pwd),
            "role": "doctor",
            "specialization": target_doc.get("specialty", "General Medicine"),
            "department": target_doc.get("department", "General Medicine"),
            "phone": target_doc.get("phone", "+91 98765 00000"),
            "avatar": target_doc.get("photo", "/doctor_default.jpg"),
            "avatar_url": target_doc.get("photo", "/doctor_default.jpg"),
            "avatarUrl": target_doc.get("photo", "/doctor_default.jpg"),
            "hospital_id": target_doc.get("hospital_id") or target_doc.get("hospitalId") or "hosp-bag",
            "hospitalId": target_doc.get("hospitalId") or target_doc.get("hospital_id") or "hosp-bag",
            "is_active": True,
            "isActive": True
        })

    write_json_db(db)
    return {"success": True, "message": "Doctor updated successfully"}


