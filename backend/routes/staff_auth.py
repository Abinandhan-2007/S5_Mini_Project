# backend/routes/staff_auth.py
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
import database
from database import read_json_db, write_json_db, get_pg_connection
from core.security import verify_password, hash_password, needs_rehash, create_jwt

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
    "isActive": True
}


@router.post("/login", response_model=StaffAuthResponse)
def staff_login(request: StaffLoginRequest):
    """
    Authenticate staff members (Admin, Receptionist, Doctor) using bcrypt password verification.
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
                        SELECT id, name, email, password_hash, role, department, avatar_url, is_active 
                        FROM staff 
                        WHERE LOWER(TRIM(email)) = %s 
                        LIMIT 1
                        """,
                        (raw_email,)
                    )
                    row = cur.fetchone()
                    if row:
                        found_staff = dict(row)
        except Exception as e:
            logger.warning(f"Note on PostgreSQL staff query fallback: {e}")

    # 2. Check JSON database staff collection
    if not found_staff:
        db = read_json_db()
        staff_list = db.get("staff", [])
        for s in staff_list:
            s_email = (s.get("email") or "").strip().lower()
            if s_email == raw_email or (raw_email == "admin" and s.get("role") == "admin"):
                found_staff = s
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

    staff_profile = {
        "id": str(found_staff.get("id")),
        "name": found_staff.get("name") or found_staff.get("full_name") or "Staff Member",
        "email": found_staff.get("email"),
        "role": found_staff.get("role", "staff"),
        "department": found_staff.get("department", "General"),
        "avatarUrl": found_staff.get("avatarUrl") or found_staff.get("avatar") or found_staff.get("avatar_url") or ""
    }

    session_token = create_jwt({
        "sub": staff_profile["id"],
        "staff_id": staff_profile["id"],
        "role": staff_profile["role"],
        "email": staff_profile["email"],
        "type": "staff"
    })

    return StaffAuthResponse(
        success=True,
        token=session_token,
        staff=staff_profile
    )
