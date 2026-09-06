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


def is_valid_uuid(val: Any) -> bool:
    if not val:
        return False
    try:
        import uuid
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def register_device_token(patient_id: Optional[str], fcm_token: str, platform: str = "android") -> Dict[str, Any]:
    """
    Store or update an active FCM device token for a device/patient.
    Idempotent: updates existing token to active, associates patient if known, and refreshes timestamp.
    """
    if not fcm_token:
        return {"success": False, "error": "fcm_token is required"}

    token = str(fcm_token).strip()
    p_id = str(patient_id).strip() if patient_id else None
    p_id_sql = p_id if (p_id and is_valid_uuid(p_id)) else None

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO device_tokens (patient_id, fcm_token, platform, is_active, updated_at)
                        VALUES (%s, %s, %s, true, CURRENT_TIMESTAMP)
                        ON CONFLICT (fcm_token)
                        DO UPDATE SET 
                            patient_id = COALESCE(EXCLUDED.patient_id, device_tokens.patient_id),
                            is_active = true, 
                            platform = EXCLUDED.platform, 
                            updated_at = CURRENT_TIMESTAMP
                        RETURNING id, patient_id, fcm_token, platform, is_active
                        """,
                        (p_id_sql, token, platform)
                    )
                    row = cur.fetchone()
                    conn.commit()
                    logger.info(f"✅ Registered FCM token {token[:12]}... (patient: {p_id_sql or 'anonymous'}, platform: {platform})")
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

    seen_tokens = set()
    for token_record in tokens:
        token_str = token_record.get("fcm_token")
        token_id = token_record.get("id")

        if not token_str or token_str in seen_tokens:
            continue
        seen_tokens.add(token_str)

        # If Firebase Admin is available and initialized with real credentials
        if messaging and firebase_app:
            try:
                message = messaging.Message(
                    notification=messaging.Notification(
                        title=title,
                        body=body
                    ),
                    android=messaging.AndroidConfig(
                        priority="high",
                        notification=messaging.AndroidNotification(
                            channel_id="carepulse_alerts",
                            sound="default",
                            priority="high",
                            default_sound=True,
                            default_vibrate_timings=True,
                            visibility="public"
                        )
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


def get_all_active_device_tokens() -> List[Dict[str, Any]]:
    """Retrieve all active device tokens across all registered patients and devices."""
    if not database.use_pg:
        try:
            database.init_db()
        except Exception:
            pass

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, patient_id, fcm_token, platform, is_active 
                        FROM device_tokens 
                        WHERE is_active = true
                        """
                    )
                    rows = cur.fetchall()
                    return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"❌ Error fetching all active device tokens from PostgreSQL: {e}")
            return []
    else:
        db = read_json_db()
        tokens = db.get("device_tokens", [])
        return [t for t in tokens if t.get("is_active", True)]


def broadcast_app_update_notification(
    version: str,
    release_notes: Optional[str] = None,
    custom_message: Optional[str] = None,
    download_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Broadcast an FCM push notification with high priority to ALL active devices
    announcing a new CarePulse app version update.
    Deduplicated: sends to each unique device token exactly once with an Android collapse_key and tag,
    avoiding duplicate alerts caused by simultaneous topic + unicast dual delivery.
    """
    clean_version = str(version).strip()
    clean_tag = clean_version.replace(".", "_")
    update_collapse_key = f"carepulse_update_{clean_tag}"
    update_tag = f"carepulse_update_{clean_tag}"

    title = f"🚀 New CarePulse Update! (v{clean_version})"
    body = (
        custom_message or
        f"CarePulse v{clean_version} is now available with new features and performance improvements. Tap here to update!"
    )

    data_payload = {
        "type": "app_update",
        "version": clean_version,
        "release_notes": str(release_notes or ""),
        "download_url": str(download_url or ""),
        "screen": "/home"
    }

    firebase_app = firebase_config.initialize_firebase()
    sent_count = 0
    failed_count = 0

    all_tokens = get_all_active_device_tokens()
    seen_tokens = set()
    target_tokens = []

    for token_record in all_tokens:
        token_str = token_record.get("fcm_token")
        token_id = token_record.get("id")

        if not token_str or token_str in seen_tokens:
            continue
        seen_tokens.add(token_str)
        target_tokens.append((token_id, token_str))

    android_config = messaging.AndroidConfig(
        priority="high",
        collapse_key=update_collapse_key,
        notification=messaging.AndroidNotification(
            channel_id="carepulse_alerts",
            sound="default",
            priority="high",
            default_sound=True,
            default_vibrate_timings=True,
            visibility="public",
            tag=update_tag
        )
    ) if messaging else None

    # Delivery Strategy:
    # 1. If active device tokens are registered in DB, send directly to each token.
    #    Do NOT send to topic simultaneously, which was the cause of duplicate notifications on registered devices.
    # 2. If NO device tokens exist in DB, fallback to the FCM update topic.
    if target_tokens:
        for token_id, token_str in target_tokens:
            if messaging and firebase_app:
                try:
                    msg = messaging.Message(
                        notification=messaging.Notification(
                            title=title,
                            body=body
                        ),
                        android=android_config,
                        data={k: str(v) for k, v in data_payload.items()},
                        token=token_str
                    )
                    messaging.send(msg)
                    sent_count += 1
                except Exception as err:
                    err_str = str(err).lower()
                    logger.warning(f"⚠️ FCM send error to token {token_str[:12]}...: {err}")
                    if "unregistered" in err_str or "invalid" in err_str or "not-found" in err_str:
                        deactivate_device_token(token_id=token_id, fcm_token=token_str)
                    failed_count += 1
            else:
                logger.info(f"🔔 [SIMULATED UPDATE PUSH] Token: {token_str[:12]}... | Title: '{title}' | Body: '{body}'")
                sent_count += 1
    else:
        # Fallback to FCM topic only if no registered device tokens exist
        if messaging and firebase_app:
            try:
                topic_message = messaging.Message(
                    notification=messaging.Notification(
                        title=title,
                        body=body
                    ),
                    android=android_config,
                    data={k: str(v) for k, v in data_payload.items()},
                    topic="carepulse_app_updates"
                )
                topic_res = messaging.send(topic_message)
                logger.info(f"📢 FCM Topic 'carepulse_app_updates' fallback broadcast dispatched: {topic_res}")
                sent_count += 1
            except Exception as topic_err:
                logger.warning(f"Note on FCM topic broadcast fallback: {topic_err}")
                failed_count += 1

    logger.info(f"🎉 App update broadcast finished: {sent_count} sent, {failed_count} failed across {len(seen_tokens)} registered devices.")

    return {
        "success": True,
        "version": clean_version,
        "title": title,
        "body": body,
        "sent": sent_count,
        "failed": failed_count,
        "total_devices": len(seen_tokens)
    }
