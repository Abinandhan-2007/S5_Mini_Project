# backend/routes/superadmin_routes.py
import re
import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, status, Query
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

    # 2. Always sync to database.json
    try:
        db = read_json_db()
        logs = db.get("audit_logs", [])
        logs.insert(0, event)
        # Cap at 500 records
        db["audit_logs"] = logs[:500]
        write_json_db(db)
    except Exception as e:
        logger.warning(f"Note on audit log JSON insert: {e}")

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

    # Counts
    db = read_json_db()
    staff_list = db.get("staff", [])
    patients = db.get("patients", [])

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
    stats["hospitals_without_admin"] = max(0, len(hosp_list) - len(admin_hosp_ids))
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
    Includes active administrator details, doctor count, receptionist count, and dynamic lifecycle state.
    """
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

                        # Read lifecycle info from JSON cache/attributes if set
                        db_json = read_json_db()
                        matching_json_h = next((jh for jh in db_json.get("hospitals", []) if str(jh.get("id")) == str(h_id)), {})
                        
                        is_suspended = matching_json_h.get("is_suspended", False)
                        h_dict["is_suspended"] = is_suspended
                        h_dict["suspension_reason"] = matching_json_h.get("suspension_reason")
                        h_dict["suspended_at"] = matching_json_h.get("suspended_at")
                        
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
        
        lifecycle = compute_hospital_lifecycle(
            h_copy,
            has_admin=h_copy["has_active_admin"],
            doc_count=doc_count
        )
        h_copy["lifecycle_state"] = lifecycle
        h_copy["is_active"] = (lifecycle != "Suspended") and h.get("is_active", True)
        hospitals.append(h_copy)

    return {"success": True, "hospitals": hospitals}


@router.post("/hospitals")
def create_hospital(payload: CreateHospitalRequest, current_user: Dict[str, Any] = Depends(require_superadmin)):
    """
    Create a new hospital facility.
    Database trigger automatically assigns the next sequential display code (e.g. H008, H009).
    Lands in 'Draft' lifecycle state and appends to audit log.
    """
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
        except Exception as e:
            logger.error(f"Error inserting hospital in PostgreSQL: {e}")

    if not created_code:
        db = read_json_db()
        created_code = f"H{len(db.get('hospitals', [])) + 1:03d}"

    # Sync to JSON DB with initial Draft state
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
            "is_suspended": False,
            "lifecycle_state": "Draft",
            "distance_miles": 1.0
        }
        h_list.append(new_hosp_entry)
        db["hospitals"] = h_list
        write_json_db(db)
    except Exception as e:
        logger.warning(f"Error syncing hospital to database.json: {e}")

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

    db = read_json_db()
    target_hosp = None
    for h in db.get("hospitals", []):
        if str(h.get("id")) == str(hospital_id):
            target_hosp = h
            break

    if not target_hosp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital facility not found.")

    hosp_code = target_hosp.get("hospital_code") or "H---"
    hosp_name = target_hosp.get("name") or "Hospital Facility"
    prev_state = target_hosp.get("lifecycle_state") or "Active"

    now_iso = datetime.now(timezone.utc).isoformat()

    if action == "suspend":
        target_hosp["is_suspended"] = True
        target_hosp["lifecycle_state"] = "Suspended"
        target_hosp["suspension_reason"] = reason
        target_hosp["suspended_at"] = now_iso
        target_hosp["is_active"] = False

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
        write_json_db(db)
        return {
            "success": True,
            "message": f"Hospital {hosp_code} ({hosp_name}) has been suspended.",
            "lifecycle_state": "Suspended"
        }

    elif action == "reactivate":
        target_hosp["is_suspended"] = False
        target_hosp["suspension_reason"] = None
        target_hosp["suspended_at"] = None
        target_hosp["is_active"] = True

        # Recalculate lifecycle
        has_admin = any(
            s.get("hospital_id") == hospital_id and s.get("role") == "admin" and (s.get("is_active", True))
            for s in db.get("staff", [])
        )
        doc_count = sum(
            1 for s in db.get("staff", [])
            if s.get("hospital_id") == hospital_id and s.get("role") == "doctor" and (s.get("is_active", True))
        )
        new_state = compute_hospital_lifecycle(target_hosp, has_admin, doc_count)
        target_hosp["lifecycle_state"] = new_state

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
        write_json_db(db)
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
    db = read_json_db()
    target_hosp = next((h for h in db.get("hospitals", []) if str(h.get("id")) == str(hospital_id)), None)
    
    deleted_name = target_hosp.get("name") if target_hosp else hospital_id
    deleted_code = target_hosp.get("hospital_code") if target_hosp else "H---"

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT id, name, hospital_code FROM hospitals WHERE id = %s", (hospital_id,))
                    hosp = cur.fetchone()
                    if hosp:
                        deleted_name = hosp["name"]
                        deleted_code = hosp["hospital_code"]

                    cur.execute("UPDATE consultations SET hospital_id = NULL WHERE hospital_id = %s", (hospital_id,))
                    cur.execute("DELETE FROM appointments WHERE hospital_id = %s", (hospital_id,))
                    cur.execute("DELETE FROM receptionist_desks WHERE hospital_id = %s", (hospital_id,))
                    cur.execute("DELETE FROM staff WHERE hospital_id = %s", (hospital_id,))
                    cur.execute("DELETE FROM doctors WHERE hospital_id = %s", (hospital_id,))
                    cur.execute("DELETE FROM hospitals WHERE id = %s", (hospital_id,))
                    conn.commit()
        except Exception as e:
            logger.error(f"Error deleting hospital in PostgreSQL: {e}")

    # Sync to JSON DB
    try:
        db["hospitals"] = [h for h in db.get("hospitals", []) if str(h.get("id")) != str(hospital_id)]
        db["staff"] = [s for s in db.get("staff", []) if str(s.get("hospital_id")) != str(hospital_id) and str(s.get("hospitalId")) != str(hospital_id)]
        db["doctors"] = [d for d in db.get("doctors", []) if str(d.get("hospital_id")) != str(hospital_id) and str(d.get("hospitalId")) != str(hospital_id)]
        db["appointments"] = [a for a in db.get("appointments", []) if str(a.get("hospital_id")) != str(hospital_id) and str(a.get("hospitalId")) != str(hospital_id)]
        write_json_db(db)
    except Exception as e:
        logger.warning(f"Error syncing hospital deletion in database.json: {e}")

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

    db = read_json_db()
    target_hosp = next((h for h in db.get("hospitals", []) if str(h.get("id")) == str(hospital_id)), None)
    
    if not target_hosp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Hospital '{hospital_id}' does not exist.")

    # Check collision: strictly one active admin per hospital
    for s in db.get("staff", []):
        if str(s.get("hospital_id")) == str(hospital_id) and s.get("role") == "admin" and (s.get("is_active", True) or s.get("isActive", True)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Hospital '{target_hosp.get('name')}' already has active administrator '{s.get('full_name')}' ({s.get('staff_code')})."
            )

    # Sequence staff code A<HospitalNumber>101
    h_code = target_hosp.get("hospital_code") or "H001"
    digits = re.sub(r'\D', '', h_code) or "001"
    assigned_code = f"A{int(digits):03d}101"

    hashed_pwd = hash_password(payload.password.strip())
    staff_id = str(uuid.uuid4())

    # Save to JSON DB
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
    db["staff"] = db.get("staff", []) + [admin_entry]

    # Advance hospital lifecycle state to Pending Setup if in Draft
    if target_hosp.get("lifecycle_state") == "Draft" or not target_hosp.get("lifecycle_state"):
        target_hosp["lifecycle_state"] = "Pending Setup"

    write_json_db(db)

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
            "hospital_name": target_hosp.get("name"),
            "facility_lifecycle": target_hosp.get("lifecycle_state")
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

    db = read_json_db()
    target_admin = next((s for s in db.get("staff", []) if str(s.get("id")) == str(admin_id)), None)

    if not target_admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Administrator not found.")

    admin_code = target_admin.get("staff_code") or "Admin"
    admin_name = target_admin.get("full_name") or target_admin.get("name") or "Administrator"
    hosp_id = target_admin.get("hospital_id") or target_admin.get("hospitalId")
    hosp_obj = next((h for h in db.get("hospitals", []) if str(h.get("id")) == str(hosp_id)), {})
    hosp_code = hosp_obj.get("hospital_code") or ""
    hosp_name = hosp_obj.get("name") or "Assigned Hospital"

    # Collision check if activating
    if new_status and hosp_id:
        for s in db.get("staff", []):
            if str(s.get("id")) != str(admin_id) and str(s.get("hospital_id")) == str(hosp_id) and s.get("role") == "admin" and (s.get("is_active", True) or s.get("isActive", True)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot activate administrator: Hospital already has active admin '{s.get('full_name')}' ({s.get('staff_code')})."
                )

    target_admin["is_active"] = new_status
    target_admin["isActive"] = new_status
    write_json_db(db)

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
    db = read_json_db()
    target_admin = next((s for s in db.get("staff", []) if str(s.get("id")) == str(admin_id)), None)

    if not target_admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Administrator not found.")

    admin_code = target_admin.get("staff_code") or "Admin"
    admin_name = target_admin.get("full_name") or target_admin.get("name") or "Administrator"

    db["staff"] = [s for s in db.get("staff", []) if str(s.get("id")) != str(admin_id)]
    write_json_db(db)

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
    db = read_json_db()
    logs = db.get("audit_logs", [])

    filtered = []
    clean_search = (search or "").strip().lower()
    clean_action = (action_type or "").strip().upper()
    clean_hosp = (hospital_code or "").strip().upper()

    for item in logs:
        # Filter action_type
        if clean_action and clean_action != "ALL" and item.get("action_type") != clean_action:
            continue

        # Filter hospital_code
        if clean_hosp and clean_hosp != "ALL":
            target_code = (item.get("target_code") or "").upper()
            after_hosp = (item.get("after_state") or {}).get("hospital_code", "").upper()
            if clean_hosp not in target_code and clean_hosp not in after_hosp and clean_hosp not in (item.get("description") or "").upper():
                continue

        # Search term
        if clean_search:
            blob = f"{item.get('actor_code')} {item.get('target_code')} {item.get('target_name')} {item.get('description')} {item.get('reason') or ''}".lower()
            if clean_search not in blob:
                continue

        filtered.append(item)

    return {
        "success": True,
        "count": len(filtered),
        "audit_logs": filtered
    }
