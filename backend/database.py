import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import os
import json
import time
import math
import logging
import uuid as _uuid
from typing import Dict, Any, List, Optional
from contextlib import contextmanager
import psycopg
from psycopg.rows import dict_row
from pgvector.psycopg import register_vector

from config import DB_USER, DB_PASSWORD, DB_DATABASE, DB_HOST, DB_PORT, INIT_SQL_PATH, JSON_DB_PATH

logger = logging.getLogger("carepulse.db")
logging.basicConfig(level=logging.INFO)

# Fail-Fast Architecture: ALLOW_JSON_FALLBACK defaults to False in code to prevent silent degradation.
# Offline booking resilience is enabled via explicit opt-in in .env (ALLOW_JSON_FALLBACK=true).
ALLOW_JSON_FALLBACK = os.environ.get("ALLOW_JSON_FALLBACK", "false").strip().lower() in ("true", "1", "yes")
use_pg = False
db_conn_info = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_DATABASE}"

_last_pg_probe_time = 0.0
_pg_probe_interval = 3.0  # seconds between reconnect probes when down


def init_json_db() -> Dict[str, Any]:
    """Ensure database.json exists with initial data if needed."""
    if not JSON_DB_PATH.exists():
        JSON_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        initial_data = {
            "patients": [],
            "consultations": [],
            "appointments": [],
            "prescriptions": [],
            "doctors": [],
            "hospitals": [],
            "staff": []
        }
        with open(JSON_DB_PATH, "w", encoding="utf-8") as f:
            json.dump(initial_data, f, indent=2)
        return initial_data

    try:
        with open(JSON_DB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"patients": [], "consultations": [], "appointments": []}


def read_json_db() -> Dict[str, Any]:
    return init_json_db()


def write_json_db(data: Dict[str, Any]) -> None:
    with open(JSON_DB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def to_valid_uuid(val: Any) -> str:
    """Safely converts any string or ID to a valid RFC 4122 UUID."""
    if not val:
        return str(_uuid.uuid4())
    s = str(val).strip()
    try:
        return str(_uuid.UUID(s))
    except Exception:
        return str(_uuid.uuid5(_uuid.NAMESPACE_DNS, s))


def get_pg_connection():
    """Get a new psycopg connection with dictionary rows and optional pgvector support."""
    global use_pg
    try:
        conn = psycopg.connect(db_conn_info, row_factory=dict_row, connect_timeout=4)
        try:
            register_vector(conn)
        except Exception:
            pass
        return conn
    except Exception as e:
        use_pg = False
        raise e


@contextmanager
def safe_pg_connection():
    """
    Context manager that yields a PostgreSQL connection if available,
    or None if PostgreSQL is offline, cleanly catching connection errors without crashing.
    """
    global use_pg
    if not use_pg:
        # Check if PostgreSQL has come back online
        check_pg_health_and_sync()

    if not use_pg:
        yield None
        return

    conn = None
    try:
        conn = psycopg.connect(db_conn_info, row_factory=dict_row, connect_timeout=3)
        try:
            register_vector(conn)
        except Exception:
            pass
        yield conn
    except Exception as e:
        use_pg = False
        logger.warning(f"PostgreSQL connection lost during operation: {e}. Falling back to local store.")
        yield None
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def split_sql_script(sql: str) -> List[str]:
    """Split SQL script by semicolons outside of dollar-quoted blocks ($$)."""
    statements = []
    current = []
    in_dollar_quote = False
    for line in sql.splitlines(keepends=True):
        if "$$" in line:
            count = line.count("$$")
            if count % 2 == 1:
                in_dollar_quote = not in_dollar_quote

        if not in_dollar_quote and ";" in line:
            parts = line.split(";")
            for part in parts[:-1]:
                current.append(part)
                stmt = "".join(current).strip()
                if stmt:
                    statements.append(stmt)
                current = []
            if parts[-1].strip():
                current.append(parts[-1])
        else:
            current.append(line)

    if current:
        stmt = "".join(current).strip()
        if stmt:
            statements.append(stmt)
    return statements


def run_db_migrations(conn=None):
    """Execute initial schema migration scripts from init.sql."""
    if not INIT_SQL_PATH.exists():
        return
    try:
        sql = INIT_SQL_PATH.read_text(encoding="utf-8")
        statements = split_sql_script(sql)
        should_close = False
        if not conn:
            conn = get_pg_connection()
            should_close = True

        with conn.cursor() as cur:
            for stmt in statements:
                try:
                    cur.execute(stmt)
                    conn.commit()
                except Exception as stmt_err:
                    conn.rollback()
                    logger.debug(f"Statement note in init.sql: {stmt_err}")

        if should_close:
            conn.close()
    except Exception as e:
        logger.warning(f"Note on running DB migrations: {e}")


def sync_offline_json_to_pg(existing_conn=None) -> int:
    """
    Synchronizes any appointments, patients, and doctors created or updated offline in database.json
    into PostgreSQL when PostgreSQL is ON.
    Safe, idempotent, and non-destructive.
    """
    db = read_json_db()
    json_appointments = db.get("appointments", [])
    if not json_appointments:
        return 0

    def _sync(cur):
        # 1. Sync hospitals
        for h in db.get("hospitals", []):
            h_id = h.get("id")
            if h_id:
                try:
                    with cur.connection.transaction():
                        cur.execute("""
                            INSERT INTO hospitals (id, name, address)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (id) DO NOTHING
                        """, (str(h_id), str(h.get("name") or "CarePulse Hospital"), str(h.get("address") or "Hospital Campus")))
                except Exception:
                    pass

        # 2. Sync doctors
        for d in db.get("doctors", []):
            d_id = d.get("id")
            if d_id:
                try:
                    with cur.connection.transaction():
                        cur.execute("""
                            INSERT INTO doctors (id, name, specialty, hospital_id, hospital_name)
                            VALUES (%s, %s, %s, %s, %s)
                            ON CONFLICT (id) DO NOTHING
                        """, (str(d_id), str(d.get("name") or "Doctor"), str(d.get("specialty") or "General Medicine"), str(d.get("hospital_id") or d.get("hospitalId") or "hosp-1"), str(d.get("hospital_name") or d.get("hospitalName") or "Hospital")))
                except Exception:
                    pass

        # 3. Sync patients
        for p in db.get("patients", []):
            raw_pid = p.get("id")
            if raw_pid:
                p_uuid = to_valid_uuid(raw_pid)
                p_name = p.get("full_name") or p.get("name") or "Patient"
                p_email = p.get("email") or f"pat_{p_uuid[:8]}@carepulse.local"
                p_phone = p.get("phone") or ""
                p_bg = p.get("bloodGroup") or p.get("blood_group") or "O+"
                p_code = p.get("patient_code") or p.get("patientCode")
                try:
                    with cur.connection.transaction():
                        if p_code:
                            cur.execute("""
                                INSERT INTO patients (id, patient_code, full_name, email, phone, blood_group, auth_provider)
                                VALUES (%s, %s, %s, %s, %s, %s, 'local')
                                ON CONFLICT (id) DO NOTHING
                            """, (p_uuid, p_code, p_name, p_email, p_phone, p_bg))
                        else:
                            cur.execute("""
                                INSERT INTO patients (id, full_name, email, phone, blood_group, auth_provider)
                                VALUES (%s, %s, %s, %s, %s, 'local')
                                ON CONFLICT (id) DO NOTHING
                            """, (p_uuid, p_name, p_email, p_phone, p_bg))
                except Exception:
                    # If patient_code collided with another patient's code, retry without explicit code so PG sequence trigger generates a new unique one
                    try:
                        with cur.connection.transaction():
                            cur.execute("""
                                INSERT INTO patients (id, full_name, email, phone, blood_group, auth_provider)
                                VALUES (%s, %s, %s, %s, %s, 'local')
                                ON CONFLICT (id) DO NOTHING
                            """, (p_uuid, p_name, p_email, p_phone, p_bg))
                    except Exception:
                        pass

        # Resynchronize patient_code_seq so subsequent online registrations never collide with synced codes
        try:
            with cur.connection.transaction():
                cur.execute("""
                    SELECT setval('patient_code_seq', GREATEST(
                        (SELECT COALESCE(MAX(SUBSTRING(patient_code FROM 2)::BIGINT), 0) FROM patients WHERE patient_code ~ '^P[0-9]+$'),
                        1
                    ), true);
                """)
        except Exception as seq_err:
            logger.debug(f"Note on syncing patient_code_seq: {seq_err}")

        # 4. Sync appointments
        synced = 0
        for app in json_appointments:
            raw_id = app.get("id")
            if not raw_id:
                continue
            app_uuid = to_valid_uuid(raw_id)
            raw_pid = app.get("patient_id") or app.get("patientId")
            p_uuid = to_valid_uuid(raw_pid) if raw_pid else None
            p_name = app.get("patient_name") or app.get("patientName") or "Patient"
            p_phone = app.get("patient_phone") or app.get("patientPhone") or ""

            # Ensure patient exists
            if p_uuid:
                try:
                    with cur.connection.transaction():
                        cur.execute("""
                            INSERT INTO patients (id, full_name, email, phone, auth_provider)
                            VALUES (%s, %s, %s, %s, 'online')
                            ON CONFLICT DO NOTHING
                        """, (p_uuid, p_name, f"pat_{p_uuid[:8]}@carepulse.local", p_phone))
                except Exception:
                    pass

            ticket = app.get("ticket_number") or app.get("ticketNumber") or f"#CP-{raw_id[:6].upper()}"
            d_id = str(app.get("doctor_id") or app.get("doctorId") or "doc-1")
            d_name = app.get("doctor_name") or app.get("doctorName") or "Doctor"
            d_spec = app.get("doctor_specialty") or app.get("doctorSpecialty") or "General Medicine"
            d_photo = app.get("doctor_photo") or app.get("doctorPhoto") or "/doctor_default.jpg"
            h_id = app.get("hospital_id") or app.get("hospitalId")
            h_name = app.get("hospital_name") or app.get("hospitalName") or "CarePulse Hospital"
            d_date = str(app.get("date") or "2026-09-08")
            t_slot = app.get("time_slot") or app.get("timeSlot") or "10:00 AM - 11:00 AM"
            a_type = app.get("type") or "In-Person"
            st = app.get("status") or "Upcoming"
            is_chk = bool(app.get("is_checked_in", False))
            chk_at = app.get("checked_in_at")

            # Ensure hospital exists
            if h_id:
                try:
                    with cur.connection.transaction():
                        cur.execute("""
                            INSERT INTO hospitals (id, name, address)
                            VALUES (%s, %s, 'CarePulse Campus')
                            ON CONFLICT (id) DO NOTHING
                        """, (str(h_id), str(h_name)))
                except Exception:
                    pass

            # Ensure doctor exists
            try:
                with cur.connection.transaction():
                    cur.execute("""
                        INSERT INTO doctors (id, name, specialty, hospital_id, hospital_name)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                    """, (d_id, d_name, d_spec, str(h_id) if h_id else None, str(h_name)))
            except Exception:
                pass

            try:
                with cur.connection.transaction():
                    cur.execute("""
                        INSERT INTO appointments (
                            id, patient_id, ticket_number, doctor_id, doctor_name, doctor_specialty, doctor_photo,
                            hospital_id, hospital_name, date, time_slot, type, status, is_checked_in, checked_in_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            status = CASE
                                -- Terminal statuses in PostgreSQL are NEVER overwritten by stale offline JSON
                                WHEN appointments.status IN ('Completed', 'Cancelled') THEN appointments.status
                                -- Offline terminal actions (e.g. cancelled offline) are accepted
                                WHEN EXCLUDED.status IN ('Completed', 'Cancelled') THEN EXCLUDED.status
                                -- Active consultation in PostgreSQL is protected against earlier queue states
                                WHEN appointments.status = 'In Consultation' AND EXCLUDED.status NOT IN ('Completed', 'Cancelled') THEN appointments.status
                                -- Checked in status in PostgreSQL is protected against earlier upcoming/confirmed states
                                WHEN appointments.status IN ('Checked In', 'Waiting') AND EXCLUDED.status IN ('Upcoming', 'Confirmed', 'Pending') THEN appointments.status
                                ELSE EXCLUDED.status
                            END,
                            is_checked_in = (appointments.is_checked_in OR EXCLUDED.is_checked_in),
                            checked_in_at = COALESCE(appointments.checked_in_at, EXCLUDED.checked_in_at)
                    """, (
                        app_uuid, p_uuid, ticket, d_id, d_name, d_spec, d_photo,
                        str(h_id) if h_id else None, str(h_name), d_date, t_slot, a_type, st, is_chk, chk_at
                    ))
                    synced += 1
            except Exception as ins_err:
                logger.debug(f"Note on inserting appointment {ticket}: {ins_err}")

        # 5. Sync consultations
        for c in db.get("consultations", []):
            c_id = c.get("id")
            if c_id:
                c_uuid = to_valid_uuid(c_id)
                raw_pid = c.get("patient_id")
                p_uuid = to_valid_uuid(raw_pid) if raw_pid else None
                if p_uuid:
                    try:
                        with cur.connection.transaction():
                            cur.execute("""
                                INSERT INTO consultations (id, patient_id, doctor_id, doctor_name, hospital_id, date, soap_data)
                                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
                                ON CONFLICT (id) DO NOTHING
                            """, (c_uuid, p_uuid, c.get("doctor_id"), c.get("doctor_name"), c.get("hospital_id"), c.get("date"), json.dumps(c.get("soap_data", {}))))
                    except Exception:
                        pass

        # 6. Sync prescriptions
        for rx in db.get("prescriptions", []):
            rx_id = rx.get("id")
            if rx_id:
                rx_uuid = to_valid_uuid(rx_id)
                raw_pid = rx.get("patient_id") or rx.get("patientId")
                p_uuid = to_valid_uuid(raw_pid) if raw_pid else None
                if p_uuid:
                    try:
                        with cur.connection.transaction():
                            cur.execute("""
                                INSERT INTO prescriptions (id, patient_id, drug_name, dosage, frequency, meal_timing, prescriber, icon_type, status, created_at)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                                ON CONFLICT (id) DO NOTHING
                            """, (
                                rx_uuid, p_uuid, rx.get("drug_name") or rx.get("drugName"),
                                rx.get("dosage"), rx.get("frequency"),
                                rx.get("meal_timing") or rx.get("mealTiming"),
                                rx.get("prescriber"), rx.get("icon_type") or rx.get("iconType") or "pill",
                                rx.get("status") or "Active"
                            ))
                    except Exception:
                        pass

        return synced

    if existing_conn:
        with existing_conn.cursor() as cur:
            count = _sync(cur)
            existing_conn.commit()
            return count
    else:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    count = _sync(cur)
                    conn.commit()
                    return count
        except Exception as e:
            logger.warning(f"Error executing offline sync to PostgreSQL: {e}")
            return 0


def check_pg_health_and_sync(force_sync: bool = False) -> bool:
    """
    Checks if PostgreSQL is reachable.
    If PostgreSQL was previously unavailable and is now reachable:
      - Sets use_pg = True
      - Runs migrations if needed
      - Automatically synchronizes all offline bookings and patients from database.json into PostgreSQL!
    If PostgreSQL was reachable but is now unreachable:
      - Sets use_pg = False and falls back to database.json seamlessly.
    Returns True if PostgreSQL is currently connected and active.
    """
    global use_pg, _last_pg_probe_time
    now = time.time()

    if use_pg and not force_sync:
        # Fast liveness check every 5 seconds with a 1-second timeout
        if now - _last_pg_probe_time < 5.0:
            return True
        _last_pg_probe_time = now
        try:
            with psycopg.connect(db_conn_info, row_factory=dict_row, connect_timeout=1) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
            return True
        except Exception:
            use_pg = False
            logger.warning("⚠️ PostgreSQL disconnected. Backend seamlessly operating in resilient offline JSON mode.")
            return False

    # If use_pg is False, throttle reconnect probes (unless force_sync is requested)
    if not use_pg and not force_sync and (now - _last_pg_probe_time < _pg_probe_interval):
        return False

    _last_pg_probe_time = now
    try:
        with psycopg.connect(db_conn_info, row_factory=dict_row, connect_timeout=2) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
            
            was_offline = not use_pg
            use_pg = True
            if was_offline:
                logger.info("================================================================================")
                logger.info("✅ [DATABASE AUTO-RECOVERY] PostgreSQL is now ONLINE!")
                logger.info("   Executing auto-sync of offline bookings from database.json into PostgreSQL...")
                logger.info("================================================================================")
                try:
                    run_db_migrations(conn)
                except Exception as mig_err:
                    logger.warning(f"Migration check on auto-recovery: {mig_err}")

            synced_count = sync_offline_json_to_pg(conn)
            if synced_count > 0:
                logger.info(f"✅ [DATABASE AUTO-SYNC] Synchronized {synced_count} offline appointments to PostgreSQL.")
            return True
    except Exception:
        use_pg = False
        return False



def init_db():
    """
    Attempt PostgreSQL connection and execute initial migration scripts.
    Never crashes on startup if PostgreSQL is OFF; gracefully boots in resilient offline JSON mode
    and auto-reconnects as soon as PostgreSQL is turned ON.
    """
    global use_pg
    init_json_db()
    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT NOW()")
            run_db_migrations(conn)
            synced_count = sync_offline_json_to_pg(conn)

        use_pg = True
        logger.info("================================================================================")
        logger.info("✅ [DATABASE] Connected to PostgreSQL successfully (pgvector enabled).")
        logger.info(f"   Target: postgresql://{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_DATABASE}")
        if synced_count > 0:
            logger.info(f"   Synchronized {synced_count} offline appointments to PostgreSQL.")
        logger.info("================================================================================")
    except Exception as e:
        use_pg = False
        warning_box = (
            "\n"
            "================================================================================\n"
            "⚠️ [RESILIENT OFFLINE MODE] POSTGRESQL IS CURRENTLY OFF / UNREACHABLE\n"
            f"⚠️ Reason: {e}\n"
            f"⚠️ Backend will operate smoothly with local JSON store: {JSON_DB_PATH.name}.\n"
            "⚠️ All patient bookings will be saved locally and automatically synced to PostgreSQL\n"
            "⚠️ as soon as PostgreSQL is turned ON (no server restart required).\n"
            "================================================================================\n"
        )
        logger.warning(warning_box)
        print(warning_box, file=sys.stderr)


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Calculate cosine similarity between two float vectors."""
    dot_product = 0.0
    norm_a = 0.0
    norm_b = 0.0
    length = min(len(vec_a), len(vec_b))
    for i in range(length):
        dot_product += vec_a[i] * vec_b[i]
        norm_a += vec_a[i] * vec_a[i]
        norm_b += vec_b[i] * vec_b[i]
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (math.sqrt(norm_a) * math.sqrt(norm_b))
