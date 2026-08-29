# backend/routes/staff_auth.py
import logging
from typing import Optional, Dict, Any, Union
from fastapi import APIRouter, HTTPException, Header, status
from pydantic import BaseModel, EmailStr
import database
from database import read_json_db, write_json_db, get_pg_connection
from core.security import verify_password, hash_password, needs_rehash, create_jwt, verify_jwt

logger = logging.getLogger("carepulse.staff_auth")

router = APIRouter(prefix="/api/staff", tags=["Staff Auth"])


class StaffLoginRequest(BaseModel):
    email: str
    password: str


class StaffAuthResponse(BaseModel):
    success: bool
    token: str
    staff: Dict[str, Any]


# Default fallback Admin credentials if not yet in database
DEFAULT_ADMIN = {
    "id": "admin-1",
    "name": "Dr. Arthur Vance",
    "email": "admin@carepulse.com",
    "password": "admin123",  # Plaintext will be verified via verify_password and upgraded
    "role": "admin",
    "department": "Chief Medical Administration",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    "isActive": True,
    "hospital_id": None
}


def resolve_authoritative_hospital_id(role: str, staff_hospital_id: Optional[str], doctor_id: Optional[str]) -> Optional[str]:
    """
    Derives authoritative hospital_id:
    - For role='doctor': authoritative hospital_id MUST come from linked doctors.hospital_id record (via doctor_id),
      which takes precedence if they ever differ.
    - For role='receptionist': hospital_id from staff record/session.
    - For role='admin': hospital_id if set (scoped admin), or None (global super-admin).
    """
    if role == "doctor":
        if doctor_id:
            # 1. Query PostgreSQL doctors table
            if database.use_pg:
                try:
                    with get_pg_connection() as conn:
                        with conn.cursor() as cur:
                            cur.execute("SELECT hospital_id FROM doctors WHERE id = %s LIMIT 1", (doctor_id,))
                            row = cur.fetchone()
                            if row and row.get("hospital_id"):
                                return row["hospital_id"]
                except Exception as e:
                    logger.warning(f"Note on PostgreSQL doctor hospital query: {e}")

            # 2. Query JSON DB
            try:
                db = read_json_db()
                for doc in db.get("doctors", []):
                    if doc.get("id") == doctor_id:
                        h_id = doc.get("hospital_id") or doc.get("hospitalId")
                        if h_id:
                            return h_id
            except Exception as e:
                logger.warning(f"Note on JSON doctor hospital query: {e}")

        # Fallback to staff hospital_id if doctor lookup yielded nothing
        return staff_hospital_id

    # For receptionists and admins
    return staff_hospital_id


def get_current_staff(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """
    FastAPI dependency to extract and verify staff JWT session from Authorization header.
    Returns dictionary with authenticated staff metadata and authoritative hospital_id.
    """
    if not authorization:
        return None

    payload = verify_jwt(authorization)
    if not payload or payload.get("type") != "staff":
        return None

    role = payload.get("role", "staff")
    staff_id = payload.get("staff_id") or payload.get("sub")
    doctor_id = payload.get("doctor_id") or payload.get("doctorId")
    raw_hospital_id = payload.get("hospital_id") or payload.get("hospitalId")

    # Authoritative resolution for doctor/receptionist
    authoritative_hospital_id = resolve_authoritative_hospital_id(role, raw_hospital_id, doctor_id)

    return {
        "staff_id": str(staff_id) if staff_id else None,
        "email": payload.get("email"),
        "role": role,
        "hospital_id": authoritative_hospital_id,
        "doctor_id": doctor_id,
        "is_authenticated": True
    }


@router.post("/login", response_model=StaffAuthResponse)
def staff_login(request: StaffLoginRequest):
    """
    Authenticate staff members (Admin, Receptionist, Doctor) using bcrypt password verification.
    Resolves authoritative hospital_id and populates token and profile.
    """
    raw_email = (request.email or "").strip().lower()
    raw_password = (request.password or "").strip()

    if not raw_email or not raw_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both email and password are required for staff login."
        )

    # 1. Check PostgreSQL staff table if available
    found_staff = None
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, full_name, email, password_hash, role, specialization, avatar_url, hospital_id, doctor_id, is_active 
                        FROM staff 
                        WHERE LOWER(TRIM(email)) = %s 
                        LIMIT 1
                        """,
                        (raw_email,)
                    )
                    row = cur.fetchone()
                    if row:
                        found_staff = dict(row)
                        # Normalize key names
                        if "full_name" in found_staff and not found_staff.get("name"):
                            found_staff["name"] = found_staff["full_name"]
                        if "specialization" in found_staff and not found_staff.get("department"):
                            found_staff["department"] = found_staff["specialization"]
        except Exception as e:
            logger.warning(f"Note on PostgreSQL staff query fallback: {e}")

    # 2. Check JSON database staff collection
    if not found_staff:
        db = read_json_db()
        staff_list = db.get("staff", [])
        for s in staff_list:
            s_email = (s.get("email") or "").strip().lower()
            if s_email == raw_email or (raw_email == "admin" and s.get("role") == "admin"):
                found_staff = dict(s)
                break

    # 3. Default fallback for initial Admin access
    if not found_staff and (raw_email in ["admin@carepulse.com", "admin"]):
        found_staff = dict(DEFAULT_ADMIN)

    if not found_staff:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid staff email or password."
        )

    if not found_staff.get("isActive", True) and not found_staff.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This staff account has been deactivated. Please contact the administrator."
        )

    # Verify password using bcrypt with graceful None/empty/legacy handling
    stored_password = found_staff.get("password_hash") or found_staff.get("password") or ""
    if not verify_password(raw_password, stored_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid staff email or password."
        )

    # Automatically upgrade legacy plaintext password to bcrypt hash in background
    if needs_rehash(stored_password):
        try:
            new_hash = hash_password(raw_password)
            db = read_json_db()
            staff_list = db.get("staff", [])
            for s in staff_list:
                if s.get("id") == found_staff.get("id") or s.get("email", "").lower() == raw_email:
                    s["password"] = new_hash
                    s["password_hash"] = new_hash
            write_json_db(db)
        except Exception as e:
            logger.warning(f"Could not auto-upgrade staff password hash: {e}")

    role = found_staff.get("role", "staff")
    doc_id = found_staff.get("doctor_id") or found_staff.get("doctorId")
    staff_hosp_id = found_staff.get("hospital_id") or found_staff.get("hospitalId")

    # Authoritative resolution for doctor / receptionist hospital_id
    resolved_hospital_id = resolve_authoritative_hospital_id(role, staff_hosp_id, doc_id)

    # If role='doctor' and doctor has linked doctors table hospital_id, keep staff table in sync if differed
    if role == "doctor" and resolved_hospital_id and resolved_hospital_id != staff_hosp_id and database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("UPDATE staff SET hospital_id = %s WHERE id::text = %s", (resolved_hospital_id, str(found_staff.get("id"))))
                conn.commit()
        except Exception as e:
            logger.warning(f"Could not sync staff hospital_id: {e}")

    staff_profile = {
        "id": str(found_staff.get("id")),
        "name": found_staff.get("name") or found_staff.get("full_name") or "Staff Member",
        "email": found_staff.get("email"),
        "role": role,
        "department": found_staff.get("department") or found_staff.get("specialization") or "General",
        "avatarUrl": found_staff.get("avatarUrl") or found_staff.get("avatar") or found_staff.get("avatar_url") or "",
        "hospitalId": resolved_hospital_id,
        "hospital_id": resolved_hospital_id,
        "doctorId": doc_id,
        "doctor_id": doc_id,
    }

    session_token = create_jwt({
        "sub": staff_profile["id"],
        "staff_id": staff_profile["id"],
        "role": staff_profile["role"],
        "email": staff_profile["email"],
        "hospital_id": resolved_hospital_id,
        "hospitalId": resolved_hospital_id,
        "doctor_id": doc_id,
        "doctorId": doc_id,
        "type": "staff"
    })

    return StaffAuthResponse(
        success=True,
        token=session_token,
        staff=staff_profile
    )

