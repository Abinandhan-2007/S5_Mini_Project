# backend/notifications/fcm_service.py
"""
Firebase Cloud Messaging (FCM) Push Notification Utility for CarePulse.
Handles token registration, multi-device delivery, invalid token revocation, and delivery logging.
"""

import sys
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path

# Ensure backend root is on path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import database
from database import get_pg_connection, read_json_db, write_json_db
import firebase_config

try:
    import firebase_admin
    from firebase_admin import messaging
except ImportError:
    firebase_admin = None
    messaging = None

logger = logging.getLogger("carepulse.fcm")


def register_device_token(patient_id: str, fcm_token: str, platform: str = "android") -> Dict[str, Any]:
    """
    Store or update an active FCM device token for a patient.
    Idempotent: updates existing token to active and refreshes timestamp.
    """
    if not patient_id or not fcm_token:
        return {"success": False, "error": "patient_id and fcm_token are required"}

    p_id = str(patient_id).strip()
    token = str(fcm_token).strip()

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO device_tokens (patient_id, fcm_token, platform, is_active, updated_at)
                        VALUES (%s, %s, %s, true, CURRENT_TIMESTAMP)
                        ON CONFLICT (patient_id, fcm_token)
                        DO UPDATE SET is_active = true, platform = EXCLUDED.platform, updated_at = CURRENT_TIMESTAMP
                        RETURNING id, patient_id, fcm_token, platform, is_active
                        """,
                        (p_id, token, platform)
                    )
                    row = cur.fetchone()
                    conn.commit()
                    logger.info(f"✅ Registered FCM token for patient {p_id} (platform: {platform})")
                    return {"success": True, "token_id": str(row["id"])}
        except Exception as e:
            logger.error(f"❌ Error registering device token in PostgreSQL: {e}")
            return {"success": False, "error": str(e)}
    else:
        # Fallback to local database.json
        db = read_json_db()
        tokens = db.get("device_tokens", [])
        found = False
        for t in tokens:
            if t.get("patient_id") == p_id and t.get("fcm_token") == token:
                t["is_active"] = True
                t["platform"] = platform
                found = True
                break

        if not found:
            import uuid
            tokens.append({
                "id": str(uuid.uuid4()),
                "patient_id": p_id,
                "fcm_token": token,
                "platform": platform,
                "is_active": True
            })

        db["device_tokens"] = tokens
        write_json_db(db)
        logger.info(f"✅ Registered FCM token in JSON DB for patient {p_id}")
        return {"success": True}


def get_active_device_tokens(patient_id: str) -> List[Dict[str, Any]]:
    """Retrieve all active device tokens for a patient."""
    p_id = str(patient_id).strip()
    if not p_id:
        return []

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, patient_id, fcm_token, platform, is_active 
                        FROM device_tokens 
                        WHERE patient_id::text = %s AND is_active = true
                        """,
                        (p_id,)
                    )
                    rows = cur.fetchall()
                    return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"❌ Error fetching device tokens for patient {p_id}: {e}")
            return []
    else:
        db = read_json_db()
        tokens = db.get("device_tokens", [])
        return [
            t for t in tokens 
            if str(t.get("patient_id")).strip() == p_id and t.get("is_active", True)
        ]


def deactivate_device_token(token_id: str, fcm_token: Optional[str] = None):
    """Mark an invalid or expired token as inactive."""
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if token_id:
                        cur.execute("UPDATE device_tokens SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id::text = %s", (str(token_id),))
                    elif fcm_token:
                        cur.execute("UPDATE device_tokens SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE fcm_token = %s", (fcm_token,))
                    conn.commit()
                    logger.info(f"⚠️ Deactivated invalid device token {token_id or fcm_token}")
        except Exception as e:
            logger.error(f"❌ Error deactivating device token: {e}")
    else:
        db = read_json_db()
        tokens = db.get("device_tokens", [])
        for t in tokens:
            if (token_id and str(t.get("id")) == str(token_id)) or (fcm_token and t.get("fcm_token") == fcm_token):
                t["is_active"] = False
        db["device_tokens"] = tokens
        write_json_db(db)


def log_notification(patient_id: str, notification_type: str, reference_id: Optional[str] = None):
    """Log a sent notification to prevent duplicate deliveries."""
    p_id = str(patient_id).strip()
    ref_id = str(reference_id).strip() if reference_id else None

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO notification_log (patient_id, notification_type, reference_id, sent_at)
                        VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                        """,
                        (p_id, notification_type, ref_id)
                    )
                    conn.commit()
        except Exception as e:
            logger.warning(f"Note logging notification to PostgreSQL: {e}")
    else:
        db = read_json_db()
        db.setdefault("notification_log", []).append({
            "patient_id": p_id,
            "notification_type": notification_type,
            "reference_id": ref_id
        })
        write_json_db(db)


def is_notification_already_sent(patient_id: str, notification_type: str, reference_id: Optional[str] = None) -> bool:
    """Check if a notification has already been sent for deduplication."""
    p_id = str(patient_id).strip()
    ref_id = str(reference_id).strip() if reference_id else None

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if ref_id:
                        cur.execute(
                            """
                            SELECT id FROM notification_log 
                            WHERE patient_id::text = %s AND notification_type = %s AND reference_id::text = %s
                            LIMIT 1
                            """,
                            (p_id, notification_type, ref_id)
                        )
                    else:
                        cur.execute(
                            """
                            SELECT id FROM notification_log 
                            WHERE patient_id::text = %s AND notification_type = %s
                            LIMIT 1
                            """,
                            (p_id, notification_type)
                        )
                    return cur.fetchone() is not None
        except Exception as e:
            logger.warning(f"Note checking notification_log: {e}")
            return False
    else:
        db = read_json_db()
        logs = db.get("notification_log", [])
        for l in logs:
            if l.get("patient_id") == p_id and l.get("notification_type") == notification_type:
                if ref_id is None or str(l.get("reference_id")) == ref_id:
                    return True
        return False


def send_push_notification(
    patient_id: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Send an FCM push notification to all active devices registered by the patient.
    - If patient has no active tokens, skips silently without throwing errors.
    - Revokes tokens if FCM reports them invalid/unregistered.
    """
    if not patient_id:
        return {"sent": 0, "failed": 0, "status": "missing_patient_id"}

    tokens = get_active_device_tokens(patient_id)
    if not tokens:
        logger.info(f"ℹ️ No active device tokens for patient {patient_id}. Skipping push notification.")
        return {"sent": 0, "failed": 0, "status": "no_active_tokens"}

    string_data = {k: str(v) for k, v in (data or {}).items()}

    # Initialize Firebase if needed
    firebase_app = firebase_config.initialize_firebase()
    
    sent_count = 0
    failed_count = 0

    for token_record in tokens:
        token_str = token_record.get("fcm_token")
        token_id = token_record.get("id")

        if not token_str:
            continue

        # If Firebase Admin is available and initialized with real credentials
        if messaging and firebase_app:
            try:
                message = messaging.Message(
                    notification=messaging.Notification(
                        title=title,
                        body=body
                    ),
                    data=string_data,
                    token=token_str
                )
                response = messaging.send(message)
                logger.info(f"🚀 FCM push sent successfully to token {token_str[:12]}... (Message ID: {response})")
                sent_count += 1
            except Exception as fcm_err:
                err_str = str(fcm_err).lower()
                logger.warning(f"⚠️ FCM send error for token {token_str[:12]}...: {fcm_err}")
                # Check for invalid / unregistered / expired token errors
                if "unregistered" in err_str or "invalid" in err_str or "mismatch" in err_str or "not-found" in err_str:
                    deactivate_device_token(token_id=token_id, fcm_token=token_str)
                failed_count += 1
        else:
            # Simulated delivery for development / test environments without active FCM private key
            logger.info(f"🔔 [SIMULATED PUSH] To Patient: {patient_id} | Title: '{title}' | Body: '{body}' | Data: {string_data}")
            sent_count += 1

    return {
        "sent": sent_count,
        "failed": failed_count,
        "patient_id": patient_id,
        "title": title,
        "body": body,
        "status": "completed"
    }
