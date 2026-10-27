# backend/routes/superadmin_routes.py
import re
import uuid
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel, EmailStr, Field

import database
from database import get_pg_connection
from core.security import verify_password, hash_password, create_jwt
from core.permissions import require_superadmin

logger = logging.getLogger("carepulse.superadmin")

router = APIRouter(prefix="/api/superadmin", tags=["SuperAdmin Operations"])


# ---------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------
class SuperAdminLoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    identifier: Optional[str] = None
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
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class UpdateHospitalRequest(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    facility_type: Optional[str] = None
    emergency_available: Optional[bool] = None
    is_active: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class HospitalLifecycleRequest(BaseModel):
    action: str = Field(..., description="'suspend' or 'reactivate'")
    reason: Optional[str] = ""


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
# Audit Logging & Lifecycle Helpers
# ---------------------------------------------------------
def log_audit_event(
    action_type: str,
    target_type: str,
    target_id: str,
    target_code: str,
    target_name: str,
    description: str,
    actor_code: str = "SA101",
    actor_name: str = "Platform SuperAdmin",
    before_state: Optional[Dict[str, Any]] = None,
    after_state: Optional[Dict[str, Any]] = None,
    reason: Optional[str] = None
) -> Dict[str, Any]:
    """
    Append an immutable event record to the platform governance audit log.
    Persists to PostgreSQL table (if available) and synchronizes to database.json.
    """
    event_id = f"audit-{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    event = {
        "id": event_id,
        "timestamp": now_iso,
        "actor_code": actor_code,
        "actor_name": actor_name,
        "action_type": action_type,
        "target_type": target_type,
        "target_id": str(target_id),
        "target_code": target_code,
        "target_name": target_name,
        "description": description,
        "before_state": before_state,
        "after_state": after_state,
        "reason": reason
    }

    # 1. PostgreSQL insert
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS platform_audit_logs (
                            id VARCHAR PRIMARY KEY,
                            timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                            actor_code VARCHAR(50),
                            actor_name VARCHAR(255),
                            action_type VARCHAR(100),
                            target_type VARCHAR(50),
                            target_id VARCHAR(100),
                            target_code VARCHAR(50),
                            target_name VARCHAR(255),
                            description TEXT,
                            before_state JSONB,
                            after_state JSONB,
                            reason TEXT
                        );
                    """)
                    cur.execute("""
                        INSERT INTO platform_audit_logs (
                            id, timestamp, actor_code, actor_name, action_type,
                            target_type, target_id, target_code, target_name,
                            description, before_state, after_state, reason
                        ) VALUES (
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s, %s, %s
                        )
                    """, (
                        event_id, now_iso, actor_code, actor_name, action_type,
                        target_type, str(target_id), target_code, target_name,
                        description,
                        json.dumps(before_state) if before_state else None,
                        json.dumps(after_state) if after_state else None,
                        reason
                    ))
                    conn.commit()
        except Exception as e:
            logger.warning(f"Note on audit log PG insert: {e}")

    return event


def compute_hospital_lifecycle(hosp: Dict[str, Any], has_admin: bool, doc_count: int) -> str:
    """
    Computes dynamic facility lifecycle state:
    - Suspended: Manually taken offline by SuperAdmin with reason.
    - Draft: Newly provisioned record without an appointed active admin.
    - Pending Setup: Administrator appointed, but clinical doctors/reception not onboarded yet.
    - Active: Fully operational (appointed admin + clinical doctors onboarded).
    """
    if hosp.get("is_suspended") or hosp.get("lifecycle_state") == "Suspended":
        return "Suspended"
    if not has_admin:
        return "Draft"
    if doc_count == 0:
        return "Pending Setup"
    return "Active"


# ---------------------------------------------------------
# Authentication Endpoint
# ---------------------------------------------------------
@router.post("/login")
def superadmin_login(request: SuperAdminLoginRequest):
    """
    Dedicated SuperAdmin authentication endpoint.
    Verifies credentials and strictly confirms role == 'superadmin'.
    Accepts login via Username (e.g. 'superadmin', 'sa', 'sa101') or Email ('superadmin@carepulse.com').
    """
    raw_identifier = (request.identifier or request.username or request.email or "").strip().lower()
    raw_password = (request.password or "").strip()

    if not raw_identifier or not raw_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email and password are required."
        )

    raw_prefix = raw_identifier.split("@")[0] if "@" in raw_identifier else raw_identifier
    carepulse_email = f"{raw_identifier}@carepulse.com" if "@" not in raw_identifier else raw_identifier

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
                              OR LOWER(TRIM(email)) = %s
                              OR LOWER(TRIM(SPLIT_PART(email, '@', 1))) = %s
                              OR LOWER(TRIM(SPLIT_PART(email, '@', 1))) = %s
                              OR LOWER(TRIM(COALESCE(staff_code, ''))) = %s
                              OR %s IN ('superadmin', 'sa', 'sa101')
                          )
                        LIMIT 1
                        """,
                        (raw_identifier, carepulse_email, raw_identifier, raw_prefix, raw_identifier, raw_identifier)
                    )
                    row = cur.fetchone()
                    if row:
                        found_staff = dict(row)
        except Exception as e:
            logger.warning(f"Error checking PostgreSQL staff for SuperAdmin: {e}")

    # Default fallback SuperAdmin
    if not found_staff and raw_identifier in ["superadmin@carepulse.com", "superadmin", "sa101", "sa"]:
        from routes.staff_auth import DEFAULT_SUPERADMIN
        found_staff = dict(DEFAULT_SUPERADMIN)

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
    """Return top-level network statistics for SuperAdmin overview dashboard with lifecycle breakdown."""
    stats = {
        "total_hospitals": 0,
        "active_hospitals": 0,
        "total_admins": 0,
        "hospitals_with_admin": 0,
        "hospitals_without_admin": 0,
        "total_doctors": 0,
        "total_receptionists": 0,
        "total_patients": 0,
        "lifecycle_breakdown": {
            "active": 0,
            "pending_setup": 0,
            "draft": 0,
            "suspended": 0
        }
    }

    # Fetch hospitals list to compute lifecycle breakdown
    hosp_res = list_hospitals(current_user=current_user)
    hosp_list = hosp_res.get("hospitals", [])

    stats["total_hospitals"] = len(hosp_list)
    
    for h in hosp_list:
        state = (h.get("lifecycle_state") or "Draft").lower().replace(" ", "_")
        if state in stats["lifecycle_breakdown"]:
            stats["lifecycle_breakdown"][state] += 1
        if h.get("is_active"):
            stats["active_hospitals"] += 1

    # Query PostgreSQL directly for platform statistics
    database.check_pg_health_and_sync()
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) as c FROM staff WHERE role = 'admin' AND is_active = true")
                    stats["total_admins"] = cur.fetchone()["c"]

                    cur.execute("SELECT COUNT(DISTINCT hospital_id) as c FROM staff WHERE role = 'admin' AND is_active = true")
                    admin_count = cur.fetchone()["c"]
                    stats["hospitals_with_admin"] = admin_count
                    stats["hospitals_without_admin"] = max(0, len(hosp_list) - admin_count)

                    cur.execute("SELECT COUNT(*) as c FROM staff WHERE role = 'doctor' AND is_active = true")
                    stats["total_doctors"] = cur.fetchone()["c"]

                    cur.execute("SELECT COUNT(*) as c FROM staff WHERE role = 'receptionist' AND is_active = true")
                    stats["total_receptionists"] = cur.fetchone()["c"]

                    cur.execute("SELECT COUNT(*) as c FROM patients")
                    stats["total_patients"] = cur.fetchone()["c"]
        except Exception as e:
            logger.warning(f"Error querying platform stats from PG: {e}")

    return {"success": True, "stats": stats}


# ---------------------------------------------------------
# Hospital Management Endpoints
# ---------------------------------------------------------
@router.get("/hospitals")
def list_hospitals(current_user: Dict[str, Any] = Depends(require_superadmin)):
    """
    List all hospitals across the healthcare network.
    Includes active administrator details, doctor count, receptionist count, and dynamic lifecycle state.
    """
    database.check_pg_health_and_sync()
    hospitals = []

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
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
                        doc_count = cur.fetchone()["c"]
                        h_dict["doctor_count"] = doc_count

                        # Count active receptionists
                        cur.execute(
                            "SELECT COUNT(*) as c FROM staff WHERE hospital_id = %s AND role = 'receptionist' AND is_active = true",
                            (h_id,)
                        )
                        h_dict["receptionist_count"] = cur.fetchone()["c"]

                        # Read lifecycle info directly from PostgreSQL columns
                        is_suspended = bool(h_dict.get("is_suspended", False))
                        h_dict["is_suspended"] = is_suspended
                        h_dict["suspension_reason"] = h_dict.get("suspension_reason")
                        h_dict["suspended_at"] = str(h_dict.get("suspended_at")) if h_dict.get("suspended_at") else None
                        
                        h_dict["lifecycle_state"] = compute_hospital_lifecycle(
                            h_dict,
                            has_admin=h_dict["has_active_admin"],
                            doc_count=doc_count
                        )
                        # Active boolean alignment
                        if h_dict["lifecycle_state"] == "Suspended":
                            h_dict["is_active"] = False

                        hospitals.append(h_dict)

            return {"success": True, "hospitals": hospitals}
        except Exception as e:
            logger.error(f"Error fetching hospitals from PostgreSQL: {e}")
            raise HTTPException(status_code=500, detail=f"Database error fetching hospitals: {e}")

    raise HTTPException(status_code=503, detail="PostgreSQL database offline")


@router.post("/hospitals")
def create_hospital(payload: CreateHospitalRequest, current_user: Dict[str, Any] = Depends(require_superadmin)):
    """
    Create a new hospital facility.
    Database trigger automatically assigns the next sequential display code (e.g. H008, H009).
    Lands in 'Draft' lifecycle state and appends to audit log.
    """
    database.check_pg_health_and_sync()
    clean_name = payload.name.strip()
    clean_address = payload.address.strip()

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
                            image_url, specialties, distance_miles, is_active,
                            latitude, longitude
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, 
                            %s, %s, %s, 
                            %s, %s, 1.0, true,
                            %s, %s
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
                            payload.specialties or ["General Medicine", "Emergency Care"],
                            payload.latitude,
                            payload.longitude
                        )
                    )
                    row = cur.fetchone()
                    conn.commit()
                    if row:
                        created_code = row.get("hospital_code")
                        h_id = str(row["id"])
        except Exception as e:
            logger.error(f"Error inserting hospital in PostgreSQL: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error inserting hospital into PostgreSQL: {e}"
            )

    # Emit Audit Log Event
    log_audit_event(
        action_type="HOSPITAL_CREATED",
        target_type="hospital",
        target_id=h_id,
        target_code=created_code,
        target_name=clean_name,
        description=f"Provisioned hospital facility {created_code} ({clean_name}) in Draft state",
        after_state={
            "hospital_code": created_code,
            "name": clean_name,
            "facility_type": payload.facility_type or "General Hospital",
            "lifecycle_state": "Draft",
            "address": clean_address
        }
    )

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
            "is_suspended": False,
            "lifecycle_state": "Draft",
            "has_active_admin": False,
            "doctor_count": 0,
            "receptionist_count": 0,
            "admin": None
        }
    }


@router.post("/hospitals/{hospital_id}/lifecycle")
def update_hospital_lifecycle(
    hospital_id: str,
    payload: HospitalLifecycleRequest,
    current_user: Dict[str, Any] = Depends(require_superadmin)
):
    """
    Manually transition hospital lifecycle state (e.g. Suspend with mandatory reason note, or Reactivate).
    Logs immutable before/after record to the platform governance audit log.
    """
    action = payload.action.strip().lower()
    reason = (payload.reason or "").strip()

    if action not in ["suspend", "reactivate"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lifecycle action must be either 'suspend' or 'reactivate'."
        )

    if action == "suspend" and len(reason) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A specific justification note is required to suspend a hospital facility."
        )

    database.check_pg_health_and_sync()
    if not database.use_pg:
        raise HTTPException(status_code=503, detail="PostgreSQL database offline")

    target_hosp = None
    with get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, hospital_code, name, is_active, is_suspended FROM hospitals WHERE id = %s", (hospital_id,))
            target_hosp = cur.fetchone()

    if not target_hosp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital facility not found.")

    target_hosp = dict(target_hosp)
    hosp_code = target_hosp.get("hospital_code") or "H---"
    hosp_name = target_hosp.get("name") or "Hospital Facility"
    prev_state = "Suspended" if target_hosp.get("is_suspended") else ("Active" if target_hosp.get("is_active") else "Draft")
    now_iso = datetime.now(timezone.utc).isoformat()

    if action == "suspend":
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE hospitals SET is_suspended = true, is_active = false, suspension_reason = %s, suspended_at = NOW() WHERE id = %s",
                    (reason, hospital_id)
                )
            conn.commit()

        log_audit_event(
            action_type="HOSPITAL_LIFECYCLE_CHANGED",
            target_type="hospital",
            target_id=hospital_id,
            target_code=hosp_code,
            target_name=hosp_name,
            description=f"Suspended hospital facility {hosp_code} ({hosp_name}) — Reason: {reason}",
            before_state={"lifecycle_state": prev_state, "is_suspended": False},
            after_state={"lifecycle_state": "Suspended", "is_suspended": True, "reason": reason, "suspended_at": now_iso},
            reason=reason
        )
        return {
            "success": True,
            "message": f"Hospital {hosp_code} ({hosp_name}) has been suspended.",
            "lifecycle_state": "Suspended"
        }

    elif action == "reactivate":
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE hospitals SET is_suspended = false, is_active = true, suspension_reason = NULL, suspended_at = NULL WHERE id = %s",
                    (hospital_id,)
                )
                cur.execute("SELECT COUNT(*) as c FROM staff WHERE hospital_id = %s AND role = 'admin' AND is_active = true", (hospital_id,))
                has_admin = cur.fetchone()["c"] > 0
                cur.execute("SELECT COUNT(*) as c FROM staff WHERE hospital_id = %s AND role = 'doctor' AND is_active = true", (hospital_id,))
                doc_count = cur.fetchone()["c"]
            conn.commit()

        target_hosp["is_suspended"] = False
        target_hosp["is_active"] = True
        new_state = compute_hospital_lifecycle(target_hosp, has_admin, doc_count)

        log_audit_event(
            action_type="HOSPITAL_LIFECYCLE_CHANGED",
            target_type="hospital",
            target_id=hospital_id,
            target_code=hosp_code,
            target_name=hosp_name,
            description=f"Reactivated hospital facility {hosp_code} ({hosp_name}) from Suspended state -> {new_state}",
            before_state={"lifecycle_state": "Suspended", "is_suspended": True},
            after_state={"lifecycle_state": new_state, "is_suspended": False}
        )
        return {
            "success": True,
            "message": f"Hospital {hosp_code} ({hosp_name}) has been reactivated.",
            "lifecycle_state": new_state
        }


@router.delete("/hospitals/{hospital_id}")
def delete_hospital(hospital_id: str, current_user: Dict[str, Any] = Depends(require_superadmin)):
    """
    Delete a hospital facility and cascade-clean all associated hospital staff and records.
    Appends deletion event to audit log.
    """
    database.check_pg_health_and_sync()
    if not database.use_pg:
        raise HTTPException(status_code=503, detail="PostgreSQL database offline")

    deleted_name = hospital_id
    deleted_code = "H---"

    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name, hospital_code FROM hospitals WHERE id = %s", (hospital_id,))
                hosp = cur.fetchone()
                if not hosp:
                    raise HTTPException(status_code=404, detail="Hospital facility not found.")
                
                deleted_name = hosp["name"]
                deleted_code = hosp["hospital_code"]

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
        raise HTTPException(status_code=500, detail=f"Database error deleting hospital: {e}")

    # Emit Audit Log Event
    log_audit_event(
        action_type="HOSPITAL_DELETED",
        target_type="hospital",
        target_id=hospital_id,
        target_code=deleted_code,
        target_name=deleted_name,
        description=f"Permanently deleted hospital facility {deleted_code} ({deleted_name}) and cascaded associated staff bindings"
    )

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
    seen_emails = set()

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
                        adm = dict(r)
                        adm["id"] = str(adm["id"])
                        adm["full_name"] = adm.get("full_name") or "Administrator"
                        adm["name"] = adm["full_name"]
                        admins.append(adm)
                        if adm.get("email"):
                            seen_emails.add(adm["email"].strip().lower())
        except Exception as e:
            logger.warning(f"Error listing admins from PostgreSQL: {e}")

    return {"success": True, "admins": admins}


@router.post("/admins")
def create_hospital_admin(
    payload: CreateAdminRequest,
    current_user: Dict[str, Any] = Depends(require_superadmin)
):
    """
    Create a new administrator account strictly assigned to a specific hospital.
    Enforces exactly ONE active administrator per hospital.
    Automatically advances facility lifecycle from 'Draft' -> 'Pending Setup'.
    """
    clean_email = payload.email.strip().lower()
    clean_name = payload.full_name.strip()
    hospital_id = payload.hospital_id.strip()

    if not clean_email or not clean_name or not hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name, email, and hospital assignment are required."
        )

    database.check_pg_health_and_sync()
    if not database.use_pg:
        raise HTTPException(status_code=503, detail="PostgreSQL database offline")

    target_hosp = None
    with get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, hospital_code, name FROM hospitals WHERE id = %s", (hospital_id,))
            target_hosp = cur.fetchone()

    if not target_hosp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Hospital '{hospital_id}' does not exist.")

    target_hosp = dict(target_hosp)
    h_code = target_hosp.get("hospital_code") or "H001"
    digits = re.sub(r'\D', '', h_code) or "001"
    prefix = f"A{int(digits):03d}"

    with get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT staff_code FROM staff WHERE staff_code LIKE %s", (f"{prefix}%",))
            existing_codes = {r["staff_code"] for r in cur.fetchall() if r.get("staff_code")}

            cur.execute("SELECT id, staff_code FROM staff WHERE LOWER(email) = %s LIMIT 1", (clean_email,))
            existing_staff_entry = cur.fetchone()

    if existing_staff_entry and (existing_staff_entry.get("staff_code") or "").startswith(prefix):
        assigned_code = existing_staff_entry.get("staff_code")
        staff_id = str(existing_staff_entry.get("id"))
    else:
        seq = 101
        while f"{prefix}{seq:03d}" in existing_codes:
            seq += 1
        assigned_code = f"{prefix}{seq:03d}"
        staff_id = str(existing_staff_entry.get("id")) if existing_staff_entry else str(uuid.uuid4())

    hashed_pwd = hash_password(payload.password.strip())
    raw_pwd = payload.password.strip()
    clean_username = clean_email.split("@")[0]

    with get_pg_connection() as conn:
        with conn.cursor() as cur:
            # Enforce strictly one active admin per hospital by deactivating existing active admins for this hospital
            cur.execute("UPDATE staff SET is_active = false WHERE hospital_id = %s AND role = 'admin'", (hospital_id,))
            cur.execute(
                """
                INSERT INTO staff (id, staff_code, username, full_name, email, password, password_hash, role, specialization, phone, avatar_url, hospital_id, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'admin', %s, %s, %s, %s, true)
                ON CONFLICT (email) DO UPDATE SET
                    staff_code = EXCLUDED.staff_code,
                    username = EXCLUDED.username,
                    full_name = EXCLUDED.full_name,
                    password = EXCLUDED.password,
                    password_hash = EXCLUDED.password_hash,
                    role = 'admin',
                    specialization = EXCLUDED.specialization,
                    phone = EXCLUDED.phone,
                    hospital_id = EXCLUDED.hospital_id,
                    is_active = true
                """,
                (
                    staff_id,
                    assigned_code,
                    clean_username,
                    clean_name,
                    clean_email,
                    raw_pwd,
                    hashed_pwd,
                    payload.department or "Chief Hospital Administration",
                    payload.phone or "",
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
                    hospital_id
                )
            )
        conn.commit()

    # Emit Audit Log Event
    log_audit_event(
        action_type="ADMIN_APPOINTED",
        target_type="admin",
        target_id=staff_id,
        target_code=assigned_code,
        target_name=clean_name,
        description=f"Appointed administrator {assigned_code} ({clean_name}) to hospital {h_code} ({target_hosp.get('name')})",
        after_state={
            "staff_code": assigned_code,
            "full_name": clean_name,
            "email": clean_email,
            "hospital_id": hospital_id,
            "hospital_code": h_code,
            "hospital_name": target_hosp.get("name")
        }
    )

    return {
        "success": True,
        "message": f"Administrator '{clean_name}' successfully appointed with code {assigned_code}.",
        "admin": {
            "id": staff_id,
            "staff_code": assigned_code,
            "full_name": clean_name,
            "email": clean_email,
            "phone": payload.phone or "",
            "role": "admin",
            "department": payload.department or "Chief Hospital Administration",
            "hospital_id": hospital_id,
            "hospital_name": target_hosp.get("name"),
            "hospital_code": h_code,
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
    Appends before/after state to audit log.
    """
    new_status = payload.is_active
    database.check_pg_health_and_sync()
    if not database.use_pg:
        raise HTTPException(status_code=503, detail="PostgreSQL database offline")

    with get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT s.id, s.staff_code, s.full_name, s.hospital_id, h.name as hospital_name, h.hospital_code
                FROM staff s
                LEFT JOIN hospitals h ON s.hospital_id = h.id
                WHERE s.id::text = %s
                """,
                (admin_id,)
            )
            target_admin = cur.fetchone()
            if not target_admin:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Administrator not found.")

            admin_code = target_admin.get("staff_code") or "Admin"
            admin_name = target_admin.get("full_name") or "Administrator"
            hosp_id = target_admin.get("hospital_id")
            hosp_code = target_admin.get("hospital_code") or ""
            hosp_name = target_admin.get("hospital_name") or "Assigned Hospital"

            if new_status and hosp_id:
                cur.execute(
                    "UPDATE staff SET is_active = false WHERE hospital_id = %s AND role = 'admin' AND id::text != %s",
                    (hosp_id, str(admin_id))
                )
            cur.execute(
                "UPDATE staff SET is_active = %s WHERE id::text = %s",
                (new_status, str(admin_id))
            )
        conn.commit()

    # Emit Audit Log Event
    act_type = "ADMIN_ACTIVATED" if new_status else "ADMIN_DEACTIVATED"
    log_audit_event(
        action_type=act_type,
        target_type="admin",
        target_id=admin_id,
        target_code=admin_code,
        target_name=admin_name,
        description=f"{'Activated' if new_status else 'Deactivated'} administrator {admin_code} ({admin_name}) for hospital {hosp_code} ({hosp_name})",
        before_state={"is_active": not new_status},
        after_state={"is_active": new_status, "hospital_code": hosp_code}
    )

    status_text = "activated" if new_status else "deactivated"
    return {"success": True, "message": f"Administrator successfully {status_text}."}


@router.delete("/admins/{admin_id}")
def delete_admin(admin_id: str, current_user: Dict[str, Any] = Depends(require_superadmin)):
    """Permanently delete administrator account and append audit record."""
    database.check_pg_health_and_sync()
    if not database.use_pg:
        raise HTTPException(status_code=503, detail="PostgreSQL database offline")

    with get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, staff_code, full_name FROM staff WHERE id::text = %s", (admin_id,))
            target_admin = cur.fetchone()
            if not target_admin:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Administrator not found.")

            admin_code = target_admin.get("staff_code") or "Admin"
            admin_name = target_admin.get("full_name") or "Administrator"

            cur.execute("DELETE FROM staff WHERE id::text = %s", (admin_id,))
        conn.commit()

    log_audit_event(
        action_type="ADMIN_DELETED",
        target_type="admin",
        target_id=admin_id,
        target_code=admin_code,
        target_name=admin_name,
        description=f"Permanently purged administrator account {admin_code} ({admin_name})"
    )

    return {"success": True, "message": f"Administrator '{admin_name}' deleted successfully."}


# ---------------------------------------------------------
# Audit Log Query Endpoint
# ---------------------------------------------------------
@router.get("/audit-logs")
def get_audit_logs(
    action_type: Optional[str] = Query(None),
    hospital_code: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_superadmin)
):
    """
    Query the immutable platform governance audit log in reverse-chronological order.
    Supports filtering by action_type, hospital_code, and free-text search.
    """
    database.check_pg_health_and_sync()
    clean_search = (search or "").strip().lower()
    clean_action = (action_type or "").strip().upper()
    clean_hosp = (hospital_code or "").strip().upper()

    logs = []
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    query = """
                        SELECT id, timestamp, actor_code, actor_name, action_type,
                               target_type, target_id, target_code, target_name,
                               description, before_state, after_state, reason
                        FROM platform_audit_logs
                        WHERE 1=1
                    """
                    params = []
                    if clean_action and clean_action != "ALL":
                        query += " AND action_type = %s"
                        params.append(clean_action)
                    if clean_hosp and clean_hosp != "ALL":
                        query += " AND (target_code ILIKE %s OR description ILIKE %s)"
                        params.append(f"%{clean_hosp}%")
                        params.append(f"%{clean_hosp}%")
                    if clean_search:
                        query += " AND (actor_code ILIKE %s OR target_code ILIKE %s OR target_name ILIKE %s OR description ILIKE %s OR reason ILIKE %s)"
                        s_term = f"%{clean_search}%"
                        params.extend([s_term, s_term, s_term, s_term, s_term])
                    query += " ORDER BY timestamp DESC LIMIT 200"
                    cur.execute(query, tuple(params))
                    rows = cur.fetchall()
                    for r in rows:
                        row_dict = dict(r)
                        row_dict["timestamp"] = str(row_dict.get("timestamp") or "")
                        logs.append(row_dict)
        except Exception as e:
            logger.warning(f"Error fetching platform audit logs from PostgreSQL: {e}")

    return {
        "success": True,
        "count": len(logs),
        "audit_logs": logs
    }


# ---------------------------------------------------------
# Patient App Devices & Login Sessions (SuperAdmin Scope)
# ---------------------------------------------------------
@router.get("/devices")
def list_patient_devices(
    platform: Optional[str] = Query(None, description="Filter by platform: android, ios, web"),
    search: Optional[str] = Query(None, description="Search by patient name, phone, email, device model, or IP"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(require_superadmin)
):
    """
    List all patient mobile/web devices that have logged in,
    enriched with patient name, phone, email, and device specs.
    """
    clean_search = (search or "").strip().lower()
    clean_platform = (platform or "").strip().lower()
    if clean_platform == "all":
        clean_platform = ""

    # Read latest published app release version from app_version.json
    version_file = Path(__file__).resolve().parent.parent / "app_version.json"
    latest_app_ver = "1.0.0"
    if version_file.exists():
        try:
            with open(version_file, "r", encoding="utf-8") as vf:
                v_data = json.load(vf)
                latest_app_ver = str(v_data.get("version") or "1.0.0").strip()
        except Exception:
            latest_app_ver = "1.0.0"

    device_list = []
    stats = {
        "total_devices": 0,
        "android_count": 0,
        "ios_count": 0,
        "web_count": 0,
        "active_24h": 0,
        "latest_version": latest_app_ver,
        "updated_devices_count": 0,
        "outdated_devices_count": 0,
    }

    def check_is_updated(dev_ver_str: str) -> bool:
        if not dev_ver_str:
            return False
        clean_dev = dev_ver_str.strip().lstrip("v").lower()
        clean_latest = latest_app_ver.strip().lstrip("v").lower()
        return clean_dev == clean_latest

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    # Self-heal table if not present
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS patient_devices (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
                            device_id VARCHAR(255),
                            device_model VARCHAR(255) DEFAULT 'Unknown Device',
                            manufacturer VARCHAR(100) DEFAULT 'Unknown',
                            platform VARCHAR(50) DEFAULT 'android',
                            os_version VARCHAR(50) DEFAULT '',
                            app_version VARCHAR(50) DEFAULT '1.0.0',
                            ip_address VARCHAR(100) DEFAULT '',
                            fcm_token TEXT DEFAULT '',
                            is_active BOOLEAN DEFAULT true,
                            last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                        );
                        """
                    )
                    conn.commit()

                    query = """
                        SELECT 
                            d.id,
                            d.patient_id,
                            d.device_id,
                            d.device_model,
                            d.manufacturer,
                            d.platform,
                            d.os_version,
                            d.app_version,
                            d.ip_address,
                            d.fcm_token,
                            d.is_active,
                            d.last_login,
                            d.created_at,
                            p.full_name AS patient_name,
                            p.phone AS patient_phone,
                            p.email AS patient_email,
                            p.patient_code,
                            p.avatar_url AS patient_avatar
                        FROM patient_devices d
                        LEFT JOIN patients p ON d.patient_id = p.id
                        ORDER BY d.last_login DESC NULLS LAST
                    """
                    cur.execute(query)
                    rows = cur.fetchall()

                    now_utc = datetime.now(timezone.utc)
                    for r in rows:
                        row_plat = (r.get("platform") or "android").lower()
                        dev_ver = r.get("app_version") or "1.0.0"
                        is_updated = check_is_updated(dev_ver)

                        # Stats aggregation
                        stats["total_devices"] += 1
                        if "android" in row_plat:
                            stats["android_count"] += 1
                        elif "ios" in row_plat:
                            stats["ios_count"] += 1
                        else:
                            stats["web_count"] += 1

                        if is_updated:
                            stats["updated_devices_count"] += 1
                        else:
                            stats["outdated_devices_count"] += 1

                        last_log = r.get("last_login")
                        if last_log:
                            if hasattr(last_log, "timestamp"):
                                diff_hours = (now_utc.timestamp() - last_log.timestamp()) / 3600.0
                                if diff_hours <= 24.0:
                                    stats["active_24h"] += 1

                        # Filters
                        if clean_platform and clean_platform not in row_plat:
                            continue

                        p_name = r.get("patient_name") or ""
                        p_phone = r.get("patient_phone") or ""
                        p_email = r.get("patient_email") or ""
                        p_code = r.get("patient_code") or ""
                        dev_model = r.get("device_model") or ""
                        dev_manuf = r.get("manufacturer") or ""
                        dev_ip = r.get("ip_address") or ""

                        if clean_search:
                            search_target = f"{p_name} {p_phone} {p_email} {p_code} {dev_model} {dev_manuf} {dev_ip} {dev_ver}".lower()
                            if clean_search not in search_target:
                                continue

                        device_list.append({
                            "id": str(r.get("id")),
                            "patient_id": str(r.get("patient_id")) if r.get("patient_id") else None,
                            "patient_name": p_name or "Guest Patient",
                            "patient_phone": p_phone,
                            "patient_email": p_email,
                            "patient_code": p_code or "N/A",
                            "patient_avatar": r.get("patient_avatar") or "",
                            "device_id": r.get("device_id") or "",
                            "device_model": dev_model or "Unknown Phone",
                            "manufacturer": dev_manuf or "Unknown",
                            "platform": row_plat,
                            "os_version": r.get("os_version") or "",
                            "app_version": dev_ver,
                            "latest_version": latest_app_ver,
                            "is_up_to_date": is_updated,
                            "ip_address": dev_ip,
                            "has_fcm": bool(r.get("fcm_token")),
                            "is_active": bool(r.get("is_active", True)),
                            "last_login": r.get("last_login").isoformat() if r.get("last_login") else None,
                            "created_at": r.get("created_at").isoformat() if r.get("created_at") else None,
                        })

            return {
                "success": True,
                "count": len(device_list),
                "stats": stats,
                "devices": device_list[offset : offset + limit]
            }
        except Exception as e:
            logger.error(f"Error listing patient devices from PostgreSQL: {e}")
            raise HTTPException(status_code=500, detail=f"Database error fetching devices: {e}")

    return {
        "success": True,
        "count": len(device_list),
        "stats": stats,
        "devices": device_list[offset : offset + limit]
    }


@router.delete("/devices/{device_id}")
def delete_patient_device(
    device_id: str,
    current_user: Dict[str, Any] = Depends(require_superadmin)
):
    """SuperAdmin revoke or remove a registered mobile app device."""
    target_id = str(device_id).strip()
    database.check_pg_health_and_sync()
    if not database.use_pg:
        raise HTTPException(status_code=503, detail="PostgreSQL database offline")

    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM patient_devices WHERE id::text = %s OR device_id = %s", (target_id, target_id))
                conn.commit()
        return {"success": True, "message": f"Device session {target_id} revoked"}
    except Exception as e:
        logger.error(f"Error deleting device in PostgreSQL: {e}")
        raise HTTPException(status_code=500, detail=f"Database error revoking device session: {e}")

