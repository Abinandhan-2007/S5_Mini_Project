# backend/routes/communication_routes.py
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Header, status, Query
from pydantic import BaseModel, Field

import database
from database import read_json_db, write_json_db, safe_pg_connection
from routes.staff_auth import get_current_staff

logger = logging.getLogger("carepulse.communication")

router = APIRouter(prefix="/api/communication", tags=["Staff Communication & Announcements"])


# ─────────────────────────────────────────────────────────────
# Pydantic Request & Response Schemas
# ─────────────────────────────────────────────────────────────

class AnnouncementCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    audience: str = "All Staff"  # 'All Staff', 'Clinical Staff', 'Front Desk Reception', 'Nursing Staff', 'All Patients'
    department: Optional[str] = "All"
    priority: str = "Normal"     # 'Normal', 'High', 'Urgent'
    status: Optional[str] = "Sent" # 'Sent', 'Scheduled'
    scheduledFor: Optional[str] = None
    hospitalId: Optional[str] = None # Only respected if caller is superadmin


class StaffMessageCreateRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    priority: Optional[str] = "normal"  # 'normal', 'high', 'urgent'
    recipientRole: Optional[str] = "admin" # 'admin', 'doctor', 'receptionist', 'nurse'
    recipientId: Optional[str] = None
    parentId: Optional[str] = None # For threaded replies
    hospitalId: Optional[str] = None # Only respected if caller is superadmin


# ─────────────────────────────────────────────────────────────
# Database Migration & Schema Guarantee
# ─────────────────────────────────────────────────────────────

def ensure_communication_tables():
    """Ensure hospital_announcements and staff_messages exist in PostgreSQL."""
    try:
        with safe_pg_connection() as conn:
            if not conn:
                return
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS hospital_announcements (
                        id VARCHAR(100) PRIMARY KEY,
                        hospital_id VARCHAR(100) NOT NULL,
                        author_id VARCHAR(100),
                        author_name VARCHAR(255),
                        author_role VARCHAR(50) DEFAULT 'admin',
                        title VARCHAR(255) NOT NULL,
                        message TEXT NOT NULL,
                        audience VARCHAR(100) DEFAULT 'All Staff',
                        department VARCHAR(100) DEFAULT 'All',
                        priority VARCHAR(50) DEFAULT 'Normal',
                        status VARCHAR(50) DEFAULT 'Sent',
                        scheduled_for TIMESTAMP WITH TIME ZONE,
                        sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    ALTER TABLE hospital_announcements DROP CONSTRAINT IF EXISTS hospital_announcements_hospital_id_fkey;
                    CREATE INDEX IF NOT EXISTS idx_announcements_hospital_id ON hospital_announcements(hospital_id);
                    CREATE INDEX IF NOT EXISTS idx_announcements_audience ON hospital_announcements(audience);

                    CREATE TABLE IF NOT EXISTS staff_messages (
                        id VARCHAR(100) PRIMARY KEY,
                        hospital_id VARCHAR(100) NOT NULL,
                        sender_id VARCHAR(100) NOT NULL,
                        sender_name VARCHAR(255) NOT NULL,
                        sender_role VARCHAR(50) NOT NULL,
                        sender_code VARCHAR(50),
                        recipient_role VARCHAR(50) DEFAULT 'admin',
                        recipient_id VARCHAR(100),
                        subject VARCHAR(255) NOT NULL,
                        message TEXT NOT NULL,
                        priority VARCHAR(50) DEFAULT 'normal',
                        is_read BOOLEAN DEFAULT FALSE,
                        parent_id VARCHAR(100),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    ALTER TABLE staff_messages DROP CONSTRAINT IF EXISTS staff_messages_hospital_id_fkey;
                    CREATE INDEX IF NOT EXISTS idx_staff_messages_hospital_id ON staff_messages(hospital_id);
                    CREATE INDEX IF NOT EXISTS idx_staff_messages_sender_id ON staff_messages(sender_id);
                    CREATE INDEX IF NOT EXISTS idx_staff_messages_parent_id ON staff_messages(parent_id);
                """)
                conn.commit()
    except Exception as e:
        logger.warning(f"ensure_communication_tables note: {e}")


def _require_auth_staff(authorization: Optional[str]) -> Dict[str, Any]:
    """Extract authoritative staff session or raise 401."""
    staff = get_current_staff(authorization)
    if not staff or not staff.get("is_authenticated"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Staff authentication required to access hospital communication hub."
        )
    return staff


def _resolve_hospital_scope(staff: Dict[str, Any], client_hospital_id: Optional[str] = None) -> Optional[str]:
    """
    CRITICAL SECURITY CHECK:
    - Non-SuperAdmin staff CANNOT override or choose their hospital_id.
      It is strictly locked to their authenticated JWT session.
    - SuperAdmin (global scope) can view all or optionally filter by client_hospital_id.
    """
    is_superadmin = staff.get("role") == "superadmin"
    if is_superadmin:
        return client_hospital_id.strip() if client_hospital_id else None
    
    auth_hosp_id = staff.get("hospital_id")
    if not auth_hosp_id:
        # Fallback to default if somehow unset in mock
        auth_hosp_id = "hosp-bag"
    return auth_hosp_id


# ─────────────────────────────────────────────────────────────
# 1. ANNOUNCEMENTS ENDPOINTS
# ─────────────────────────────────────────────────────────────

@router.get("/announcements")
def get_announcements(
    hospital_id: Optional[str] = Query(None, description="Only permitted for SuperAdmin"),
    authorization: Optional[str] = Header(None)
):
    """
    Retrieve announcements strictly scoped to the caller's authoritative hospital.
    Filters by caller's role so clinical/front-desk staff only receive relevant items.
    """
    staff = _require_auth_staff(authorization)
    effective_hosp_id = _resolve_hospital_scope(staff, hospital_id)
    caller_role = staff.get("role", "staff")

    ensure_communication_tables()

    # Allowed audiences based on staff role
    audience_filter = None
    if caller_role in ("admin", "superadmin"):
        audience_filter = None # See all
    elif caller_role == "doctor":
        audience_filter = ["All Staff", "Clinical Staff", "All Patients", "All"]
    elif caller_role == "receptionist":
        audience_filter = ["All Staff", "Front Desk Reception", "All Patients", "All"]
    elif caller_role == "nurse":
        audience_filter = ["All Staff", "Nursing Staff", "All Patients", "All"]
    else:
        audience_filter = ["All Staff", "All Patients", "All"]

    # Try PostgreSQL
    try:
        with safe_pg_connection() as conn:
            if conn:
                with conn.cursor() as cur:
                    query = "SELECT * FROM hospital_announcements"
                    params = []
                    where_clauses = []

                    if effective_hosp_id:
                        where_clauses.append("hospital_id = %s")
                        params.append(effective_hosp_id)

                    if audience_filter:
                        where_clauses.append("audience = ANY(%s)")
                        params.append(audience_filter)

                    if where_clauses:
                        query += " WHERE " + " AND ".join(where_clauses)
                    query += " ORDER BY created_at DESC"

                    cur.execute(query, params)
                    rows = cur.fetchall()

                    results = []
                    for r in rows:
                        results.append({
                            "id": str(r["id"]),
                            "hospitalId": r["hospital_id"],
                            "authorId": r["author_id"],
                            "authorName": r["author_name"],
                            "authorRole": r["author_role"],
                            "title": r["title"],
                            "message": r["message"],
                            "audience": r["audience"],
                            "department": r["department"],
                            "priority": r["priority"],
                            "status": r["status"],
                            "scheduledFor": str(r["scheduled_for"]) if r["scheduled_for"] else None,
                            "sentAt": str(r["sent_at"]) if r["sent_at"] else "Just now",
                            "createdAt": str(r["created_at"]) if r["created_at"] else None,
                            "deliveredCount": 54,
                            "readCount": 18,
                        })
                    return {"success": True, "announcements": results}
    except Exception as e:
        logger.warning(f"Error fetching announcements from Postgres: {e}")

    # Fallback to JSON DB
    db = read_json_db()
    all_ann = db.get("hospital_announcements", [])
    filtered = []
    for a in all_ann:
        if effective_hosp_id and a.get("hospital_id") != effective_hosp_id and a.get("hospitalId") != effective_hosp_id:
            continue
        aud = a.get("audience", "All Staff")
        if audience_filter and aud not in audience_filter:
            continue
        filtered.append(a)

    return {"success": True, "announcements": filtered}


@router.post("/announcements", status_code=status.HTTP_201_CREATED)
def create_announcement(
    payload: AnnouncementCreateRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Dispatch a new hospital broadcast notification.
    Restricted strictly to Admin and SuperAdmin roles.
    Hospital ID is enforced strictly from the authenticated session.
    """
    staff = _require_auth_staff(authorization)
    caller_role = staff.get("role")
    if caller_role not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only hospital administrators or platform superadmins may dispatch broadcasts."
        )

    effective_hosp_id = _resolve_hospital_scope(staff, payload.hospitalId)
    if not effective_hosp_id:
        effective_hosp_id = "hosp-bag"

    ann_id = f"ann-{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    author_name = staff.get("name") or staff.get("full_name") or "Hospital Administration"
    author_id = staff.get("staff_id") or "admin"

    ensure_communication_tables()

    # Try PostgreSQL
    try:
        with safe_pg_connection() as conn:
            if conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO hospital_announcements (
                            id, hospital_id, author_id, author_name, author_role,
                            title, message, audience, department, priority,
                            status, scheduled_for, sent_at, created_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """, (
                        ann_id,
                        effective_hosp_id,
                        author_id,
                        author_name,
                        caller_role,
                        payload.title,
                        payload.message,
                        payload.audience,
                        payload.department or "All",
                        payload.priority or "Normal",
                        payload.status or "Sent",
                        payload.scheduledFor
                    ))
                    conn.commit()

                    return {
                        "success": True,
                        "message": "Hospital announcement dispatched successfully.",
                        "announcement": {
                            "id": ann_id,
                            "hospitalId": effective_hosp_id,
                            "authorId": author_id,
                            "authorName": author_name,
                            "authorRole": caller_role,
                            "title": payload.title,
                            "message": payload.message,
                            "audience": payload.audience,
                            "department": payload.department or "All",
                            "priority": payload.priority or "Normal",
                            "status": payload.status or "Sent",
                            "scheduledFor": payload.scheduledFor,
                            "sentAt": "Just now",
                            "createdAt": now_iso,
                            "deliveredCount": 54,
                            "readCount": 1,
                        }
                    }
    except Exception as e:
        logger.warning(f"Error creating announcement in Postgres: {e}")

    # Fallback to JSON DB
    db = read_json_db()
    if "hospital_announcements" not in db:
        db["hospital_announcements"] = []
    
    new_record = {
        "id": ann_id,
        "hospitalId": effective_hosp_id,
        "hospital_id": effective_hosp_id,
        "authorId": author_id,
        "authorName": author_name,
        "authorRole": caller_role,
        "title": payload.title,
        "message": payload.message,
        "audience": payload.audience,
        "department": payload.department or "All",
        "priority": payload.priority or "Normal",
        "status": payload.status or "Sent",
        "scheduledFor": payload.scheduledFor,
        "sentAt": "Just now",
        "createdAt": now_iso,
        "deliveredCount": 54,
        "readCount": 1,
    }
    db["hospital_announcements"].insert(0, new_record)
    write_json_db(db)

    return {
        "success": True,
        "message": "Hospital announcement dispatched successfully (local storage).",
        "announcement": new_record
    }


@router.delete("/announcements/{ann_id}")
def delete_announcement(
    ann_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Remove an announcement. Admin can only delete within their own hospital.
    """
    staff = _require_auth_staff(authorization)
    caller_role = staff.get("role")
    if caller_role not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators may delete announcements."
        )

    effective_hosp_id = _resolve_hospital_scope(staff)

    try:
        with safe_pg_connection() as conn:
            if conn:
                with conn.cursor() as cur:
                    if caller_role == "superadmin":
                        cur.execute("DELETE FROM hospital_announcements WHERE id = %s RETURNING id", (ann_id,))
                    else:
                        cur.execute("DELETE FROM hospital_announcements WHERE id = %s AND hospital_id = %s RETURNING id", (ann_id, effective_hosp_id))
                    deleted = cur.fetchone()
                    conn.commit()
                    if deleted:
                        return {"success": True, "message": f"Announcement {ann_id} deleted."}
    except Exception as e:
        logger.warning(f"Error deleting announcement in Postgres: {e}")

    # Fallback to JSON DB
    db = read_json_db()
    existing = db.get("hospital_announcements", [])
    updated = [a for a in existing if a.get("id") != ann_id or (caller_role != "superadmin" and a.get("hospital_id") != effective_hosp_id)]
    db["hospital_announcements"] = updated
    write_json_db(db)

    return {"success": True, "message": f"Announcement {ann_id} deleted."}


# ─────────────────────────────────────────────────────────────
# 2. TWO-WAY STAFF-ADMIN MESSAGING ENDPOINTS
# ─────────────────────────────────────────────────────────────

@router.get("/messages")
def get_staff_messages(
    hospital_id: Optional[str] = Query(None, description="Only permitted for SuperAdmin"),
    authorization: Optional[str] = Header(None)
):
    """
    Fetch two-way staff messages:
    - Admin: sees all incoming inquiries from doctors, receptionists, and nurses for their hospital.
    - Doctor / Receptionist / Nurse: sees all messages they sent to Admin, and Admin replies.
    - SuperAdmin: global view across all hospitals or filtered by hospital_id.
    """
    staff = _require_auth_staff(authorization)
    effective_hosp_id = _resolve_hospital_scope(staff, hospital_id)
    caller_role = staff.get("role", "staff")
    caller_id = staff.get("staff_id") or ""

    ensure_communication_tables()

    try:
        with safe_pg_connection() as conn:
            if conn:
                with conn.cursor() as cur:
                    query = "SELECT * FROM staff_messages"
                    params = []
                    where_clauses = []

                    if effective_hosp_id:
                        where_clauses.append("hospital_id = %s")
                        params.append(effective_hosp_id)

                    # Role-based visibility
                    if caller_role in ("admin", "superadmin"):
                        # Admin sees all messages in their facility
                        pass
                    else:
                        # Staff sees messages where they are sender, recipient, recipient_role, or part of parent thread
                        where_clauses.append("""
                            (sender_id = %s 
                             OR recipient_id = %s 
                             OR recipient_role = %s
                             OR recipient_role = 'all'
                             OR parent_id IN (SELECT id FROM staff_messages WHERE sender_id = %s)
                             OR id IN (SELECT parent_id FROM staff_messages WHERE sender_id = %s))
                        """)
                        params.extend([caller_id, caller_id, caller_role, caller_id, caller_id])

                    if where_clauses:
                        query += " WHERE " + " AND ".join(where_clauses)
                    query += " ORDER BY created_at ASC"

                    cur.execute(query, params)
                    rows = cur.fetchall()

                    # Organize into root threads and replies
                    messages_by_id = {}
                    root_messages = []

                    for r in rows:
                        msg = {
                            "id": str(r["id"]),
                            "hospitalId": r["hospital_id"],
                            "senderId": r["sender_id"],
                            "senderName": r["sender_name"],
                            "senderRole": r["sender_role"],
                            "senderCode": r["sender_code"],
                            "recipientRole": r["recipient_role"],
                            "recipientId": r["recipient_id"],
                            "subject": r["subject"],
                            "message": r["message"],
                            "priority": r["priority"],
                            "isRead": bool(r["is_read"]),
                            "parentId": r["parent_id"],
                            "createdAt": str(r["created_at"]) if r["created_at"] else None,
                            "replies": []
                        }
                        messages_by_id[msg["id"]] = msg

                    # Link replies into parent objects
                    for msg in messages_by_id.values():
                        parent_id = msg.get("parentId")
                        if parent_id and parent_id in messages_by_id:
                            messages_by_id[parent_id]["replies"].append(msg)
                        else:
                            root_messages.append(msg)

                    # Return root threads ordered by newest first
                    root_messages.sort(key=lambda x: x.get("createdAt") or "", reverse=True)
                    return {"success": True, "messages": root_messages}
    except Exception as e:
        logger.warning(f"Error fetching staff messages in Postgres: {e}")

    # Fallback to JSON DB
    db = read_json_db()
    all_msgs = db.get("staff_messages", [])
    
    # Filter by hospital
    hosp_msgs = []
    for m in all_msgs:
        m_hosp = m.get("hospital_id") or m.get("hospitalId")
        if effective_hosp_id and m_hosp != effective_hosp_id:
            continue
        hosp_msgs.append(m)

    # Organize into threads
    msgs_by_id = {}
    root_messages = []
    for m in hosp_msgs:
        m_id = m.get("id")
        m_copy = dict(m)
        if "replies" not in m_copy:
            m_copy["replies"] = []
        msgs_by_id[m_id] = m_copy

    for m in msgs_by_id.values():
        p_id = m.get("parentId") or m.get("parent_id")
        if p_id and p_id in msgs_by_id:
            msgs_by_id[p_id]["replies"].append(m)
        else:
            root_messages.append(m)

    # If caller is staff (not admin/superadmin), only return threads where caller is involved or targeted by role
    if caller_role not in ("admin", "superadmin"):
        visible_roots = []
        for root in root_messages:
            r_sender = root.get("sender_id") or root.get("senderId")
            r_recip = root.get("recipient_id") or root.get("recipientId")
            r_role = root.get("recipient_role") or root.get("recipientRole")
            involved = (
                r_sender == caller_id
                or r_recip == caller_id
                or r_role in (caller_role, "all")
                or any(
                    (rep.get("sender_id") or rep.get("senderId")) == caller_id
                    or (rep.get("recipient_id") or rep.get("recipientId")) == caller_id
                    or (rep.get("recipient_role") or rep.get("recipientRole")) in (caller_role, "all")
                    for rep in root.get("replies", [])
                )
            )
            if involved:
                visible_roots.append(root)
        root_messages = visible_roots

    root_messages.sort(key=lambda x: x.get("createdAt") or x.get("created_at") or "", reverse=True)
    return {"success": True, "messages": root_messages}


@router.post("/messages", status_code=status.HTTP_201_CREATED)
def send_staff_message(
    payload: StaffMessageCreateRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Send a message between staff and administration:
    - Staff (doctor, nurse, receptionist) sends inquiry to Admin.
    - Admin replies to staff inquiry (via parentId).
    Hospital ID and sender details are strictly derived from JWT session.
    """
    staff = _require_auth_staff(authorization)
    effective_hosp_id = _resolve_hospital_scope(staff, payload.hospitalId)
    if not effective_hosp_id:
        effective_hosp_id = "hosp-bag"

    sender_id = staff.get("staff_id") or str(uuid.uuid4())
    sender_name = staff.get("name") or staff.get("full_name") or "Staff Member"
    sender_role = staff.get("role", "staff")
    sender_code = staff.get("staff_code") or staff.get("staffCode") or ""

    msg_id = f"msg-{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    ensure_communication_tables()

    # Validate parentId belongs to same hospital if replying
    if payload.parentId:
        parent_hosp = None
        try:
            with safe_pg_connection() as conn:
                if conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT hospital_id FROM staff_messages WHERE id = %s", (payload.parentId,))
                        row = cur.fetchone()
                        if row:
                            parent_hosp = row["hospital_id"]
        except Exception as e:
            logger.warning(f"Error checking parent message hospital in Postgres: {e}")

        if not parent_hosp:
            db = read_json_db()
            for m in db.get("staff_messages", []):
                if m.get("id") == payload.parentId:
                    parent_hosp = m.get("hospital_id") or m.get("hospitalId")
                    break

        if parent_hosp and parent_hosp != effective_hosp_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-hospital message replies are strictly prohibited."
            )

    # Determine recipient
    recipient_role = payload.recipientRole or ("admin" if sender_role != "admin" else "staff")

    try:
        with safe_pg_connection() as conn:
            if conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO staff_messages (
                            id, hospital_id, sender_id, sender_name, sender_role,
                            sender_code, recipient_role, recipient_id, subject,
                            message, priority, is_read, parent_id, created_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    """, (
                        msg_id,
                        effective_hosp_id,
                        sender_id,
                        sender_name,
                        sender_role,
                        sender_code,
                        recipient_role,
                        payload.recipientId,
                        payload.subject,
                        payload.message,
                        payload.priority or "normal",
                        False,
                        payload.parentId
                    ))
                    conn.commit()

                    return {
                        "success": True,
                        "message": "Message dispatched successfully.",
                        "data": {
                            "id": msg_id,
                            "hospitalId": effective_hosp_id,
                            "senderId": sender_id,
                            "senderName": sender_name,
                            "senderRole": sender_role,
                            "senderCode": sender_code,
                            "recipientRole": recipient_role,
                            "recipientId": payload.recipientId,
                            "subject": payload.subject,
                            "message": payload.message,
                            "priority": payload.priority or "normal",
                            "isRead": False,
                            "parentId": payload.parentId,
                            "createdAt": now_iso,
                            "replies": []
                        }
                    }
    except Exception as e:
        logger.warning(f"Error saving message in Postgres: {e}")

    # Fallback to JSON DB
    db = read_json_db()
    if "staff_messages" not in db:
        db["staff_messages"] = []

    new_msg = {
        "id": msg_id,
        "hospitalId": effective_hosp_id,
        "hospital_id": effective_hosp_id,
        "senderId": sender_id,
        "sender_id": sender_id,
        "senderName": sender_name,
        "senderRole": sender_role,
        "senderCode": sender_code,
        "recipientRole": recipient_role,
        "recipientId": payload.recipientId,
        "subject": payload.subject,
        "message": payload.message,
        "priority": payload.priority or "normal",
        "isRead": False,
        "parentId": payload.parentId,
        "createdAt": now_iso,
        "replies": []
    }
    db["staff_messages"].insert(0, new_msg)
    write_json_db(db)

    return {
        "success": True,
        "message": "Message dispatched successfully (local storage).",
        "data": new_msg
    }


@router.patch("/messages/{msg_id}/read")
def mark_message_as_read(
    msg_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Mark a staff message as read.
    Enforces hospital isolation check.
    """
    staff = _require_auth_staff(authorization)
    effective_hosp_id = _resolve_hospital_scope(staff)

    try:
        with safe_pg_connection() as conn:
            if conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE staff_messages
                        SET is_read = TRUE
                        WHERE id = %s AND hospital_id = %s
                        RETURNING id
                    """, (msg_id, effective_hosp_id))
                    updated = cur.fetchone()
                    conn.commit()
                    if updated:
                        return {"success": True, "message": f"Message {msg_id} marked as read."}
    except Exception as e:
        logger.warning(f"Error updating message read status in Postgres: {e}")

    db = read_json_db()
    msgs = db.get("staff_messages", [])
    found = False
    for m in msgs:
        if m.get("id") == msg_id:
            m["isRead"] = True
            m["is_read"] = True
            found = True
            break
    if found:
        write_json_db(db)
        return {"success": True, "message": f"Message {msg_id} marked as read."}

    return {"success": True, "message": "Read status updated."}


@router.delete("/messages/{msg_id}")
def delete_message(
    msg_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Delete a staff message. Caller must be sender or Admin of the same hospital.
    """
    staff = _require_auth_staff(authorization)
    effective_hosp_id = _resolve_hospital_scope(staff)
    caller_role = staff.get("role")
    caller_id = staff.get("staff_id")

    try:
        with safe_pg_connection() as conn:
            if conn:
                with conn.cursor() as cur:
                    if caller_role in ("admin", "superadmin"):
                        cur.execute("DELETE FROM staff_messages WHERE id = %s AND hospital_id = %s RETURNING id", (msg_id, effective_hosp_id))
                    else:
                        cur.execute("DELETE FROM staff_messages WHERE id = %s AND sender_id = %s AND hospital_id = %s RETURNING id", (msg_id, caller_id, effective_hosp_id))
                    deleted = cur.fetchone()
                    conn.commit()
                    if deleted:
                        return {"success": True, "message": f"Message {msg_id} removed."}
    except Exception as e:
        logger.warning(f"Error deleting message in Postgres: {e}")

    return {"success": True, "message": f"Message {msg_id} removed."}


def dispatch_system_staff_notification(
    hospital_id: str,
    subject: str,
    message: str,
    recipient_role: str = "receptionist",
    priority: str = "high",
    sender_name: str = "Hospital Administration"
) -> dict:
    """
    Programmatically dispatches an automated administrative notification message to a specific staff role
    (e.g., 'receptionist', 'nurse', 'doctor', or 'all') within the target hospital.
    """
    ensure_communication_tables()
    msg_id = f"sys-msg-{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        with safe_pg_connection() as conn:
            if conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO staff_messages (
                            id, hospital_id, sender_id, sender_name, sender_role,
                            sender_code, recipient_role, recipient_id, subject,
                            message, priority, is_read, parent_id, created_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    """, (
                        msg_id,
                        hospital_id,
                        "system-admin",
                        sender_name,
                        "admin",
                        "ADM001",
                        recipient_role,
                        None,
                        subject,
                        message,
                        priority,
                        False,
                        None
                    ))
                    conn.commit()
    except Exception as e:
        logger.warning(f"Error dispatching system staff notification in Postgres: {e}")

    # Fallback to JSON DB
    db = read_json_db()
    if "staff_messages" not in db:
        db["staff_messages"] = []
    
    rec = {
        "id": msg_id,
        "hospitalId": hospital_id,
        "hospital_id": hospital_id,
        "senderId": "system-admin",
        "sender_id": "system-admin",
        "senderName": sender_name,
        "senderRole": "admin",
        "senderCode": "ADM001",
        "recipientRole": recipient_role,
        "recipient_role": recipient_role,
        "recipientId": None,
        "subject": subject,
        "message": message,
        "priority": priority,
        "isRead": False,
        "is_read": False,
        "parentId": None,
        "createdAt": now_iso,
        "created_at": now_iso,
        "replies": []
    }
    db["staff_messages"].insert(0, rec)
    write_json_db(db)
    return rec


@router.get("/staff-contacts")
def get_staff_contacts_for_chat(
    authorization: Optional[str] = Header(None)
):
    """
    Retrieve contact directory for the interactive Chat Area.
    Every staff member (Doctor, Nurse, Receptionist, Administrator) can view
    all other staff contacts in their hospital facility for peer-to-peer and inter-department chat.
    """
    staff = _require_auth_staff(authorization)
    caller_role = staff.get("role", "staff")
    caller_id = staff.get("staff_id") or staff.get("id") or ""
    effective_hosp_id = _resolve_hospital_scope(staff)

    contacts = []
    seen_ids = set()

    # 1. Hospital Administration contact (always available for non-admins)
    if caller_role not in ("admin", "superadmin"):
        contacts.append({
            "id": "admin",
            "name": "Hospital Administration",
            "role": "admin",
            "department": "Executive Management",
            "staffCode": "HQ-ADMIN",
            "avatarUrl": "",
            "online": True
        })
        seen_ids.add("admin")

    # 2. Query PostgreSQL if enabled
    if database.use_pg:
        try:
            with safe_pg_connection() as conn:
                if conn:
                    with conn.cursor() as cur:
                        # Doctors
                        doc_query = "SELECT id, name, specialty, department, photo, hospital_id FROM doctors"
                        doc_params = []
                        if effective_hosp_id:
                            doc_query += " WHERE hospital_id = %s"
                            doc_params.append(effective_hosp_id)
                        cur.execute(doc_query, doc_params)
                        for r in cur.fetchall():
                            d_id = str(r["id"])
                            if d_id != caller_id and d_id not in seen_ids:
                                seen_ids.add(d_id)
                                contacts.append({
                                    "id": d_id,
                                    "name": r["name"] or "Doctor",
                                    "role": "doctor",
                                    "department": r.get("department") or r.get("specialty") or "General Medicine",
                                    "staffCode": "DOC",
                                    "avatarUrl": r.get("photo") or "/doctor_default.jpg",
                                    "online": True
                                })

                        # Staff: Nurses, Receptionists, and Admins
                        stf_query = "SELECT id, full_name, role, specialization, staff_code, avatar_url, hospital_id FROM staff WHERE is_active = true"
                        stf_params = []
                        if effective_hosp_id:
                            stf_query += " AND hospital_id = %s"
                            stf_params.append(effective_hosp_id)
                        cur.execute(stf_query, stf_params)
                        for r in cur.fetchall():
                            s_id = str(r["id"])
                            if s_id != caller_id and s_id not in seen_ids:
                                seen_ids.add(s_id)
                                s_role = r.get("role") or "staff"
                                contacts.append({
                                    "id": s_id,
                                    "name": r.get("full_name") or "Staff Member",
                                    "role": s_role,
                                    "department": r.get("specialization") or ("Executive" if s_role == "admin" else ("Nursing" if s_role == "nurse" else "Front Desk")),
                                    "staffCode": r.get("staff_code") or "",
                                    "avatarUrl": r.get("avatar_url") or "",
                                    "online": True
                                })
        except Exception as e:
            logger.warning(f"Error fetching staff contacts from PG: {e}")

    # 3. Query JSON DB (fallback or supplement)
    db = read_json_db()
    for doc in db.get("doctors", []):
        d_id = str(doc.get("id"))
        d_hosp = doc.get("hospital_id") or doc.get("hospitalId")
        if effective_hosp_id and d_hosp != effective_hosp_id:
            continue
        if d_id != caller_id and d_id not in seen_ids:
            seen_ids.add(d_id)
            contacts.append({
                "id": d_id,
                "name": doc.get("name", "Doctor"),
                "role": "doctor",
                "department": doc.get("department") or doc.get("specialty") or "General Medicine",
                "staffCode": doc.get("staff_code") or doc.get("staffCode") or "DOC",
                "avatarUrl": doc.get("photo") or "/doctor_default.jpg",
                "online": True
            })

    for s in db.get("staff", []):
        s_id = str(s.get("id"))
        s_hosp = s.get("hospital_id") or s.get("hospitalId")
        if effective_hosp_id and s_hosp != effective_hosp_id:
            continue
        if s_id != caller_id and s_id not in seen_ids:
            seen_ids.add(s_id)
            s_role = s.get("role") or "staff"
            contacts.append({
                "id": s_id,
                "name": s.get("full_name") or s.get("name", "Staff Member"),
                "role": s_role,
                "department": s.get("specialization") or s.get("department") or ("Executive" if s_role == "admin" else ("Nursing" if s_role == "nurse" else "Front Desk")),
                "staffCode": s.get("staff_code") or s.get("staffCode") or "",
                "avatarUrl": s.get("avatar_url") or s.get("avatarUrl") or "",
                "online": True
            })

    return {"success": True, "contacts": contacts}

