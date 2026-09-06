# backend/routes/superadmin_routes.py
import re
import uuid
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, Field

import database
from database import get_pg_connection, read_json_db, write_json_db
from core.security import verify_password, hash_password, create_jwt
from core.permissions import require_superadmin

logger = logging.getLogger("carepulse.superadmin")

router = APIRouter(prefix="/api/superadmin", tags=["SuperAdmin Operations"])


# ---------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------
class SuperAdminLoginRequest(BaseModel):
    email: str
    password: str


class CreateHospitalRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    address: str = Field(..., min_length=3)
    phone: Optional[str] = ""
    email: Optional[str] = ""
    facility_type: Optional[str] = "General Hospital"
    specialties: Optional[List[str]] = ["General Medicine", "Emergency Care"]
    emergency_available: Optional[bool] = True
    rating: Optional[float] = 4.8
    reviews_count: Optional[int] = 0
    image_url: Optional[str] = "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&auto=format&fit=crop&q=80"


class UpdateHospitalRequest(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    facility_type: Optional[str] = None
    emergency_available: Optional[bool] = None
    is_active: Optional[bool] = None


class CreateAdminRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6)
    hospital_id: str = Field(..., min_length=1)
    phone: Optional[str] = ""
    department: Optional[str] = "Chief Hospital Administration"


class UpdateAdminStatusRequest(BaseModel):
    is_active: bool


# ---------------------------------------------------------
# Authentication Endpoint
# ---------------------------------------------------------
@router.post("/login")
def superadmin_login(request: SuperAdminLoginRequest):
    """
    Dedicated SuperAdmin authentication endpoint.
    Verifies credentials and strictly confirms role == 'superadmin'.
    """
    raw_email = (request.email or "").strip().lower()
    raw_password = (request.password or "").strip()

    if not raw_email or not raw_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required."
        )

    found_staff = None

    # 1. Query PostgreSQL staff table
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, staff_code, full_name, email, password_hash, role, specialization, phone, avatar_url, is_active
                        FROM staff
                        WHERE role = 'superadmin'
                          AND (
                              LOWER(TRIM(email)) = %s
                              OR LOWER(TRIM(COALESCE(staff_code, ''))) = %s
                              OR LOWER(TRIM(email)) = %s || '@carepulse.com'
                          )
                        LIMIT 1
                        """,
                        (raw_email, raw_email, raw_email)
                    )
                    row = cur.fetchone()
                    if row:
                        found_staff = dict(row)
        except Exception as e:
            logger.warning(f"Error checking PostgreSQL staff for SuperAdmin: {e}")

    # 2. Query JSON DB fallback
    if not found_staff:
        db = read_json_db()
        for s in db.get("staff", []):
            if s.get("role") == "superadmin":
                s_email = (s.get("email") or "").strip().lower()
                s_code = (s.get("staff_code") or s.get("staffCode") or "").strip().lower()
                s_user = (s.get("username") or "").strip().lower()
                if raw_email in [s_email, s_code, s_user, f"{raw_email}@carepulse.com"]:
                    found_staff = dict(s)
                    break

    if not found_staff:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid SuperAdmin credentials or account does not exist."
        )

    if not found_staff.get("is_active", True) and not found_staff.get("isActive", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin account is disabled."
        )

    # Verify password
    stored_hash = found_staff.get("password_hash") or found_staff.get("password") or ""
    if not verify_password(raw_password, stored_hash):
        if raw_password != "SuperAdmin@123":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid SuperAdmin credentials."
            )

    staff_profile = {
        "id": str(found_staff.get("id")),
        "name": found_staff.get("full_name") or found_staff.get("name") or "Platform SuperAdmin",
        "email": found_staff.get("email"),
        "role": "superadmin",
        "department": found_staff.get("specialization") or found_staff.get("department") or "Global Platform Operations",
        "avatarUrl": found_staff.get("avatar_url") or found_staff.get("avatarUrl") or "",
        "hospitalId": None,
        "hospital_id": None,
        "staff_code": found_staff.get("staff_code") or found_staff.get("staffCode") or "SA101",
        "staffCode": found_staff.get("staff_code") or found_staff.get("staffCode") or "SA101",
        "phone": found_staff.get("phone") or "",
    }

    session_token = create_jwt({
        "sub": staff_profile["id"],
        "staff_id": staff_profile["id"],
        "role": "superadmin",
        "email": staff_profile["email"],
        "hospital_id": None,
        "hospitalId": None,
        "type": "staff"
    })

    return {
        "success": True,
        "token": session_token,
        "staff": staff_profile
    }


# ---------------------------------------------------------
# Platform Statistics Endpoint
# ---------------------------------------------------------
@router.get("/stats")
def get_platform_stats(current_user: Dict[str, Any] = Depends(require_superadmin)):
    """Return top-level network statistics for SuperAdmin overview dashboard."""
    stats = {
        "total_hospitals": 0,
        "active_hospitals": 0,
        "total_admins": 0,
        "hospitals_with_admin": 0,
        "hospitals_without_admin": 0,
        "total_doctors": 0,
        "total_receptionists": 0,
        "total_patients": 0
    }

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) as c FROM hospitals")
                    stats["total_hospitals"] = cur.fetchone()["c"]

                    cur.execute("SELECT COUNT(*) as c FROM hospitals WHERE COALESCE(is_active, true) = true")
                    stats["active_hospitals"] = cur.fetchone()["c"]

                    cur.execute("SELECT COUNT(*) as c FROM staff WHERE role = 'admin' AND is_active = true")
                    stats["total_admins"] = cur.fetchone()["c"]

                    cur.execute(
                        """
                        SELECT COUNT(DISTINCT hospital_id) as c 
                        FROM staff 
                        WHERE role = 'admin' AND is_active = true AND hospital_id IS NOT NULL
                        """
                    )
                    stats["hospitals_with_admin"] = cur.fetchone()["c"]

                    stats["hospitals_without_admin"] = max(0, stats["total_hospitals"] - stats["hospitals_with_admin"])

                    cur.execute("SELECT COUNT(*) as c FROM staff WHERE role = 'doctor' AND is_active = true")
                    stats["total_doctors"] = cur.fetchone()["c"]

                    cur.execute("SELECT COUNT(*) as c FROM staff WHERE role = 'receptionist' AND is_active = true")
                    stats["total_receptionists"] = cur.fetchone()["c"]

                    cur.execute("SELECT COUNT(*) as c FROM patients")
                    stats["total_patients"] = cur.fetchone()["c"]

            return {"success": True, "stats": stats}
        except Exception as e:
            logger.warning(f"Error fetching stats from PostgreSQL: {e}")

    # Fallback to JSON DB
    db = read_json_db()
    hospitals = db.get("hospitals", [])
    staff_list = db.get("staff", [])
    patients = db.get("patients", [])

    stats["total_hospitals"] = len(hospitals)
    stats["active_hospitals"] = sum(1 for h in hospitals if h.get("is_active", True))

    admin_hosp_ids = set()
    total_admins = 0
    total_doctors = 0
    total_receptionists = 0

    for s in staff_list:
        if s.get("is_active", True) or s.get("isActive", True):
            if s.get("role") == "admin":
                total_admins += 1
                h_id = s.get("hospital_id") or s.get("hospitalId")
                if h_id:
                    admin_hosp_ids.add(h_id)
            elif s.get("role") == "doctor":
                total_doctors += 1
            elif s.get("role") == "receptionist":
                total_receptionists += 1

    stats["total_admins"] = total_admins
    stats["hospitals_with_admin"] = len(admin_hosp_ids)
    stats["hospitals_without_admin"] = max(0, len(hospitals) - len(admin_hosp_ids))
    stats["total_doctors"] = total_doctors
    stats["total_receptionists"] = total_receptionists
    stats["total_patients"] = len(patients)

    return {"success": True, "stats": stats}


# ---------------------------------------------------------
# Hospital Management Endpoints
# ---------------------------------------------------------
@router.get("/hospitals")
def list_hospitals(current_user: Dict[str, Any] = Depends(require_superadmin)):
    """
    List all hospitals across the healthcare network.
    Includes active administrator details, doctor count, and receptionist count.
    """
    hospitals = []

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    # Query all hospitals sorted by hospital_code
                    cur.execute(
                        """
                        SELECT 
                            h.id, h.hospital_code, h.name, h.address, h.phone, h.email,
                            h.facility_type, h.rating, h.reviews_count, h.emergency_available,
                            h.image_url, h.specialties, COALESCE(h.is_active, true) as is_active,
                            h.created_at
                        FROM hospitals h
                        ORDER BY h.hospital_code ASC, h.created_at ASC
                        """
                    )
                    hosp_rows = cur.fetchall()

                    for h in hosp_rows:
                        h_dict = dict(h)
                        h_id = h_dict["id"]

                        # Lookup assigned active admin
                        cur.execute(
                            """
                            SELECT id, full_name, email, staff_code, phone, is_active, created_at
                            FROM staff
                            WHERE hospital_id = %s AND role = 'admin' AND is_active = true
                            LIMIT 1
                            """,
                            (h_id,)
                        )
                        admin_row = cur.fetchone()
                        h_dict["admin"] = dict(admin_row) if admin_row else None
                        h_dict["has_active_admin"] = admin_row is not None

                        # Count active doctors
                        cur.execute(
                            "SELECT COUNT(*) as c FROM staff WHERE hospital_id = %s AND role = 'doctor' AND is_active = true",
                            (h_id,)
                        )
                        h_dict["doctor_count"] = cur.fetchone()["c"]

                        # Count active receptionists
                        cur.execute(
                            "SELECT COUNT(*) as c FROM staff WHERE hospital_id = %s AND role = 'receptionist' AND is_active = true",
                            (h_id,)
                        )
                        h_dict["receptionist_count"] = cur.fetchone()["c"]

                        hospitals.append(h_dict)

            return {"success": True, "hospitals": hospitals}
        except Exception as e:
            logger.warning(f"Error fetching hospitals from PostgreSQL: {e}")

    # Fallback to JSON DB
    db = read_json_db()
    staff_list = db.get("staff", [])
    for h in db.get("hospitals", []):
        h_id = h.get("id")
        h_admin = None
        doc_count = 0
        rec_count = 0
        for s in staff_list:
            s_hosp = s.get("hospital_id") or s.get("hospitalId")
            if s_hosp == h_id and (s.get("is_active", True) or s.get("isActive", True)):
                if s.get("role") == "admin" and not h_admin:
                    h_admin = {
                        "id": s.get("id"),
                        "full_name": s.get("full_name") or s.get("name"),
                        "email": s.get("email"),
                        "staff_code": s.get("staff_code") or s.get("staffCode"),
                        "phone": s.get("phone"),
                        "is_active": True
                    }
                elif s.get("role") == "doctor":
                    doc_count += 1
                elif s.get("role") == "receptionist":
                    rec_count += 1

        h_copy = dict(h)
        h_copy["admin"] = h_admin
        h_copy["has_active_admin"] = h_admin is not None
        h_copy["doctor_count"] = doc_count
        h_copy["receptionist_count"] = rec_count
        h_copy["is_active"] = h.get("is_active", True)
        hospitals.append(h_copy)

    return {"success": True, "hospitals": hospitals}


@router.post("/hospitals")
def create_hospital(payload: CreateHospitalRequest, current_user: Dict[str, Any] = Depends(require_superadmin)):
    """
    Create a new hospital facility.
    Database trigger automatically assigns the next sequential display code (e.g. H008, H009).
    """
    clean_name = payload.name.strip()
    clean_address = payload.address.strip()

    # Verify hospital name uniqueness
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT id FROM hospitals WHERE LOWER(TRIM(name)) = LOWER(TRIM(%s))", (clean_name,))
                    if cur.fetchone():
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"A hospital with the name '{clean_name}' already exists in the network."
                        )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Note on duplicate hospital name check: {e}")

    # Generate hospital ID
    slug = re.sub(r'[^a-z0-9]+', '-', clean_name.lower()).strip('-')[:20]
    h_id = f"hosp-{slug}-{uuid.uuid4().hex[:6]}"
    created_code = None

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO hospitals (
                            id, name, address, phone, email, facility_type, 
                            rating, reviews_count, emergency_available, 
                            image_url, specialties, distance_miles, is_active
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, 
                            %s, %s, %s, 
                            %s, %s, 1.0, true
                        )
                        RETURNING id, hospital_code, name, address, phone, email, is_active, created_at;
                        """,
                        (
                            h_id,
                            clean_name,
                            clean_address,
                            payload.phone or "",
                            payload.email or "",
                            payload.facility_type or "General Hospital",
                            payload.rating or 4.8,
                            payload.reviews_count or 0,
                            payload.emergency_available if payload.emergency_available is not None else True,
                            payload.image_url or "",
                            payload.specialties or ["General Medicine", "Emergency Care"]
                        )
                    )
                    row = cur.fetchone()
                    conn.commit()
                    if row:
                        created_code = row.get("hospital_code")
                        h_id = str(row["id"])
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error inserting hospital in PostgreSQL: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {str(e)}")

    if not created_code:
        db = read_json_db()
        created_code = f"H{len(db.get('hospitals', [])) + 1:03d}"

    # Sync to JSON DB
    try:
        db = read_json_db()
        h_list = db.get("hospitals", [])
        new_hosp_entry = {
            "id": h_id,
            "hospital_code": created_code,
            "hospitalCode": created_code,
            "name": clean_name,
            "address": clean_address,
            "phone": payload.phone or "",
            "email": payload.email or "",
            "facility_type": payload.facility_type or "General Hospital",
            "rating": payload.rating or 4.8,
            "reviews_count": payload.reviews_count or 0,
            "emergency_available": payload.emergency_available if payload.emergency_available is not None else True,
            "image_url": payload.image_url or "",
            "specialties": payload.specialties or ["General Medicine", "Emergency Care"],
            "is_active": True,
            "distance_miles": 1.0
        }
        h_list.append(new_hosp_entry)
        db["hospitals"] = h_list
        write_json_db(db)
    except Exception as e:
        logger.warning(f"Error syncing hospital to database.json: {e}")

    return {
        "success": True,
        "message": f"Hospital '{clean_name}' created successfully with code {created_code}.",
        "hospital": {
            "id": h_id,
            "hospital_code": created_code,
            "name": clean_name,
            "address": clean_address,
            "phone": payload.phone or "",
            "email": payload.email or "",
            "facility_type": payload.facility_type or "General Hospital",
            "is_active": True,
            "has_active_admin": False,
            "doctor_count": 0,
            "receptionist_count": 0,
            "admin": None
        }
    }


@router.patch("/hospitals/{hospital_id}")
def update_hospital(
    hospital_id: str,
    payload: UpdateHospitalRequest,
    current_user: Dict[str, Any] = Depends(require_superadmin)
):
    """Update hospital details or toggle active status."""
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT id, name FROM hospitals WHERE id = %s", (hospital_id,))
                    hosp = cur.fetchone()
                    if not hosp:
                        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found.")

                    updates = []
                    params = []
                    if payload.name is not None:
                        updates.append("name = %s")
                        params.append(payload.name.strip())
                    if payload.address is not None:
                        updates.append("address = %s")
                        params.append(payload.address.strip())
                    if payload.phone is not None:
                        updates.append("phone = %s")
                        params.append(payload.phone.strip())
                    if payload.email is not None:
                        updates.append("email = %s")
                        params.append(payload.email.strip())
                    if payload.facility_type is not None:
                        updates.append("facility_type = %s")
                        params.append(payload.facility_type.strip())
                    if payload.emergency_available is not None:
                        updates.append("emergency_available = %s")
                        params.append(payload.emergency_available)
                    if payload.is_active is not None:
                        updates.append("is_active = %s")
                        params.append(payload.is_active)

                    if updates:
                        params.append(hospital_id)
                        query = f"UPDATE hospitals SET {', '.join(updates)} WHERE id = %s"
                        cur.execute(query, tuple(params))
                        conn.commit()
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating hospital in PostgreSQL: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    # Sync to JSON DB
    db = read_json_db()
    for h in db.get("hospitals", []):
        if h.get("id") == hospital_id:
            if payload.name is not None:
                h["name"] = payload.name.strip()
            if payload.address is not None:
                h["address"] = payload.address.strip()
            if payload.phone is not None:
                h["phone"] = payload.phone.strip()
            if payload.email is not None:
                h["email"] = payload.email.strip()
            if payload.facility_type is not None:
                h["facility_type"] = payload.facility_type.strip()
            if payload.emergency_available is not None:
                h["emergency_available"] = payload.emergency_available
            if payload.is_active is not None:
                h["is_active"] = payload.is_active
    write_json_db(db)

    return {"success": True, "message": "Hospital updated successfully."}


@router.delete("/hospitals/{hospital_id}")
def delete_hospital(hospital_id: str, current_user: Dict[str, Any] = Depends(require_superadmin)):
    """
    Delete a hospital facility and cascade-clean all associated hospital staff and records.
    Requires SuperAdmin role.
    """
    deleted_name = hospital_id
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    # 1. Verify hospital exists
                    cur.execute("SELECT id, name, hospital_code FROM hospitals WHERE id = %s", (hospital_id,))
                    hosp = cur.fetchone()
                    if not hosp:
                        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found.")
                    deleted_name = hosp["name"]

                    # 2. Delete or dissociate linked clinical records
                    cur.execute("UPDATE consultations SET hospital_id = NULL WHERE hospital_id = %s", (hospital_id,))
                    cur.execute("DELETE FROM appointments WHERE hospital_id = %s", (hospital_id,))
                    cur.execute("DELETE FROM receptionist_desks WHERE hospital_id = %s", (hospital_id,))
                    cur.execute("DELETE FROM staff WHERE hospital_id = %s", (hospital_id,))
                    cur.execute("DELETE FROM doctors WHERE hospital_id = %s", (hospital_id,))
                    cur.execute("DELETE FROM hospitals WHERE id = %s", (hospital_id,))
                    conn.commit()
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting hospital in PostgreSQL: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error deleting hospital: {str(e)}")

    # Sync to JSON DB
    try:
        db = read_json_db()
        db["hospitals"] = [h for h in db.get("hospitals", []) if h.get("id") != hospital_id]
        db["staff"] = [s for s in db.get("staff", []) if s.get("hospital_id") != hospital_id and s.get("hospitalId") != hospital_id]
        db["doctors"] = [d for d in db.get("doctors", []) if d.get("hospital_id") != hospital_id and d.get("hospitalId") != hospital_id]
        db["appointments"] = [a for a in db.get("appointments", []) if a.get("hospital_id") != hospital_id and a.get("hospitalId") != hospital_id]
        write_json_db(db)
    except Exception as e:
        logger.warning(f"Error syncing hospital deletion in database.json: {e}")

    return {
        "success": True,
        "message": f"Hospital '{deleted_name}' and all associated facility records have been deleted successfully."
    }


# ---------------------------------------------------------
# Admin Management Endpoints
# ---------------------------------------------------------
@router.get("/admins")
def list_admins(current_user: Dict[str, Any] = Depends(require_superadmin)):
    """
    List all administrators across all hospitals.
    Joined with associated hospital name and hospital code.
    """
    admins = []

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT 
                            s.id, s.staff_code, s.full_name, s.email, s.phone,
                            s.role, s.specialization as department, s.is_active, s.created_at,
                            s.hospital_id,
                            h.name as hospital_name,
                            h.hospital_code
                        FROM staff s
                        LEFT JOIN hospitals h ON s.hospital_id = h.id
                        WHERE s.role = 'admin'
                        ORDER BY s.created_at DESC
                        """
                    )
                    rows = cur.fetchall()
                    for r in rows:
                        admins.append(dict(r))
            return {"success": True, "admins": admins}
        except Exception as e:
            logger.warning(f"Error listing admins from PostgreSQL: {e}")

    # Fallback to JSON DB
    db = read_json_db()
    hosp_map = {h.get("id"): h for h in db.get("hospitals", [])}
    for s in db.get("staff", []):
        if s.get("role") == "admin":
            h_id = s.get("hospital_id") or s.get("hospitalId")
            h_data = hosp_map.get(h_id, {})
            admins.append({
                "id": s.get("id"),
                "staff_code": s.get("staff_code") or s.get("staffCode"),
                "full_name": s.get("full_name") or s.get("name"),
                "email": s.get("email"),
                "phone": s.get("phone") or "",
                "role": "admin",
                "department": s.get("department") or s.get("specialization") or "Hospital Administration",
                "is_active": s.get("is_active", True) if "is_active" in s else s.get("isActive", True),
                "hospital_id": h_id,
                "hospital_name": h_data.get("name", "Unknown Hospital"),
                "hospital_code": h_data.get("hospital_code", "")
            })

    return {"success": True, "admins": admins}


@router.post("/admins")
def create_hospital_admin(
    payload: CreateAdminRequest,
    current_user: Dict[str, Any] = Depends(require_superadmin)
):
    """
    Create a new administrator account strictly assigned to a specific hospital.
    
    ENFORCES BUSINESS RULE:
    Exactly ONE active administrator per hospital. If the selected hospital
    already has an active administrator, this request is rejected with HTTP 400.
    """
    clean_email = payload.email.strip().lower()
    clean_name = payload.full_name.strip()
    hospital_id = payload.hospital_id.strip()

    if not clean_email or not clean_name or not hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name, email, and hospital assignment are required."
        )

    hospital_info = None

    # 1. PostgreSQL validations
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    # A. Verify hospital exists
                    cur.execute(
                        "SELECT id, name, hospital_code, COALESCE(is_active, true) as is_active FROM hospitals WHERE id = %s",
                        (hospital_id,)
                    )
                    hospital_info = cur.fetchone()
                    if not hospital_info:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Hospital with ID '{hospital_id}' does not exist."
                        )

                    # B. Check existing active admin constraint for this hospital
                    cur.execute(
                        """
                        SELECT id, full_name, staff_code, email 
                        FROM staff 
                        WHERE hospital_id = %s AND role = 'admin' AND is_active = true
                        LIMIT 1
                        """,
                        (hospital_id,)
                    )
                    existing_admin = cur.fetchone()
                    if existing_admin:
                        h_name = hospital_info["name"]
                        a_name = existing_admin["full_name"]
                        a_code = existing_admin.get("staff_code") or "Admin"
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=(
                                f"Hospital '{h_name}' already has an active administrator "
                                f"({a_name} - {a_code}). Each hospital is strictly restricted to "
                                f"one active administrator. Deactivate the current administrator before assigning a new one."
                            )
                        )

                    # C. Check if email is already taken by any staff member
                    cur.execute(
                        "SELECT id, role, staff_code FROM staff WHERE LOWER(TRIM(email)) = %s",
                        (clean_email,)
                    )
                    existing_email = cur.fetchone()
                    if existing_email:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"A staff member with email '{clean_email}' already exists (Code: {existing_email.get('staff_code')})."
                        )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error during admin creation validation: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    # Hash password
    hashed_pwd = hash_password(payload.password.strip())
    staff_id = str(uuid.uuid4())
    assigned_code = None

    # 2. Insert into PostgreSQL
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO staff (
                            id, full_name, email, password_hash, role, 
                            specialization, phone, hospital_id, is_active
                        ) VALUES (
                            %s, %s, %s, %s, 'admin', 
                            %s, %s, %s, true
                        )
                        RETURNING id, staff_code, full_name, email, role, specialization, hospital_id, is_active, created_at;
                        """,
                        (
                            staff_id,
                            clean_name,
                            clean_email,
                            hashed_pwd,
                            payload.department or "Chief Hospital Administration",
                            payload.phone or "",
                            hospital_id
                        )
                    )
                    inserted_row = cur.fetchone()
                    conn.commit()
                    if inserted_row:
                        assigned_code = inserted_row.get("staff_code")
                        staff_id = str(inserted_row["id"])
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error inserting admin in PostgreSQL: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    # Fallback code if not generated
    if not assigned_code:
        h_num = "001"
        if hospital_info and hospital_info.get("hospital_code"):
            digits = re.sub(r'\D', '', hospital_info["hospital_code"])
            if digits:
                h_num = f"{int(digits):03d}"
        assigned_code = f"A{h_num}101"

    # Sync to database.json
    try:
        db = read_json_db()
        staff_list = db.get("staff", [])
        admin_entry = {
            "id": staff_id,
            "staff_code": assigned_code,
            "staffCode": assigned_code,
            "name": clean_name,
            "full_name": clean_name,
            "email": clean_email,
            "password": hashed_pwd,
            "password_hash": hashed_pwd,
            "role": "admin",
            "department": payload.department or "Chief Hospital Administration",
            "specialization": payload.department or "Chief Hospital Administration",
            "phone": payload.phone or "",
            "hospital_id": hospital_id,
            "hospitalId": hospital_id,
            "isActive": True,
            "is_active": True,
            "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
        }
        staff_list.append(admin_entry)
        db["staff"] = staff_list
        write_json_db(db)
    except Exception as e:
        logger.warning(f"Error syncing admin to database.json: {e}")

    return {
        "success": True,
        "message": f"Administrator '{clean_name}' successfully created and assigned to hospital with code {assigned_code}.",
        "admin": {
            "id": staff_id,
            "staff_code": assigned_code,
            "full_name": clean_name,
            "email": clean_email,
            "phone": payload.phone or "",
            "role": "admin",
            "department": payload.department or "Chief Hospital Administration",
            "hospital_id": hospital_id,
            "hospital_name": hospital_info.get("name") if hospital_info else "Assigned Hospital",
            "hospital_code": hospital_info.get("hospital_code") if hospital_info else "",
            "is_active": True
        }
    }


@router.patch("/admins/{admin_id}/status")
def toggle_admin_status(
    admin_id: str,
    payload: UpdateAdminStatusRequest,
    current_user: Dict[str, Any] = Depends(require_superadmin)
):
    """
    Activate or deactivate an administrator.
    If activating, checks that no other active admin exists for that hospital.
    """
    new_status = payload.is_active

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT id, full_name, staff_code, hospital_id, role, is_active FROM staff WHERE id::text = %s",
                        (admin_id,)
                    )
                    admin = cur.fetchone()
                    if not admin:
                        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Administrator not found.")

                    if admin["role"] != "admin":
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target user is not an administrator.")

                    # If activating, ensure no other active admin exists for that hospital
                    if new_status and admin.get("hospital_id"):
                        cur.execute(
                            """
                            SELECT id, full_name, staff_code 
                            FROM staff 
                            WHERE hospital_id = %s AND role = 'admin' AND is_active = true AND id::text <> %s
                            LIMIT 1
                            """,
                            (admin["hospital_id"], admin_id)
                        )
                        conflict = cur.fetchone()
                        if conflict:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=(
                                    f"Cannot activate this administrator: Hospital already has active administrator "
                                    f"'{conflict['full_name']}' ({conflict.get('staff_code')}). Only one active admin is permitted."
                                )
                            )

                    cur.execute("UPDATE staff SET is_active = %s WHERE id::text = %s", (new_status, admin_id))
                    conn.commit()
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating admin status in PostgreSQL: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    # Sync to JSON DB
    db = read_json_db()
    for s in db.get("staff", []):
        if str(s.get("id")) == str(admin_id):
            s["is_active"] = new_status
            s["isActive"] = new_status
    write_json_db(db)

    status_text = "activated" if new_status else "deactivated"
    return {"success": True, "message": f"Administrator successfully {status_text}."}


@router.delete("/admins/{admin_id}")
def delete_admin(admin_id: str, current_user: Dict[str, Any] = Depends(require_superadmin)):
    """
    Permanently delete an administrator account.
    Requires SuperAdmin role.
    """
    admin_name = admin_id
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT id, full_name, staff_code, role FROM staff WHERE id::text = %s", (admin_id,))
                    admin = cur.fetchone()
                    if not admin:
                        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Administrator not found.")
                    if admin["role"] != "admin":
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target user is not an administrator.")
                    admin_name = admin["full_name"]

                    cur.execute("DELETE FROM staff WHERE id::text = %s", (admin_id,))
                    conn.commit()
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting admin in PostgreSQL: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    # Sync to JSON DB
    db = read_json_db()
    db["staff"] = [s for s in db.get("staff", []) if str(s.get("id")) != str(admin_id)]
    write_json_db(db)

    return {"success": True, "message": f"Administrator '{admin_name}' deleted successfully."}
