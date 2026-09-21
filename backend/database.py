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

ALLOW_JSON_FALLBACK = False
use_pg = False
has_pgvector = False
db_conn_info = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_DATABASE}"

_last_pg_probe_time = 0.0
_pg_probe_interval = 3.0  # seconds between reconnect probes when down


def sync_offline_json_to_pg(existing_conn=None) -> int:
    """
    Offline sync has been permanently removed.
    PostgreSQL is the single authoritative database.
    """
    return 0


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
            "staff": [],
            "doctor_leaves": []
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


def check_pg_health_and_sync(force_sync: bool = False) -> bool:
    """
    Checks if PostgreSQL is reachable.
    If PostgreSQL is offline, logs an explicit notification and returns False.
    Offline sync has been permanently removed.
    """
    global use_pg, _last_pg_probe_time
    now = time.time()

    if use_pg and not force_sync:
        if now - _last_pg_probe_time < 5.0:
            return True
        _last_pg_probe_time = now
        try:
            with psycopg.connect(db_conn_info, row_factory=dict_row, connect_timeout=1) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
            return True
        except Exception as e:
            use_pg = False
            logger.error(f"❌ [DATABASE NOTIFICATION] PostgreSQL is OFFLINE! Error: {e}")
            logger.error("   Please start PostgreSQL / pgAdmin. (Offline sync is disabled)")
            return False

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
                logger.info("✅ [DATABASE NOTIFICATION] PostgreSQL is now ONLINE and ready!")
                logger.info("================================================================================")
                try:
                    run_db_migrations(conn)
                except Exception as mig_err:
                    logger.warning(f"Migration check: {mig_err}")
            return True
    except Exception as e:
        use_pg = False
        logger.error(f"❌ [DATABASE NOTIFICATION] PostgreSQL is OFFLINE! Cannot connect ({e}).")
        logger.error("   Please start PostgreSQL / pgAdmin on port 5432. (Offline sync is disabled)")
        return False


def init_db():
    """
    Attempt PostgreSQL connection and execute initial migration scripts.
    If PostgreSQL is offline, logs a clear notification. Offline sync is permanently disabled.
    """
    global use_pg, has_pgvector
    init_json_db()
    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT NOW()")
            run_db_migrations(conn)

            vector_active = False
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1 FROM pg_extension WHERE extname = 'vector';")
                    vector_active = cur.fetchone() is not None
            except Exception:
                vector_active = False

        use_pg = True
        has_pgvector = vector_active
        vector_tag = "pgvector enabled" if vector_active else "standard relational mode"
        logger.info("================================================================================")
        logger.info(f"✅ [DATABASE] Connected to PostgreSQL successfully ({vector_tag}).")
        logger.info(f"   Target: postgresql://{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_DATABASE}")
        logger.info("   Offline sync is disabled. PostgreSQL is the primary store.")
        logger.info("================================================================================")
    except Exception as e:
        use_pg = False
        has_pgvector = False
        notification = (
            "\n"
            "================================================================================\n"
            "❌ [DATABASE NOTIFICATION] POSTGRESQL IS OFFLINE!\n"
            f"❌ Connection Error: {e}\n"
            "❌ Please start PostgreSQL / pgAdmin on port 5432.\n"
            "❌ Offline sync is DISABLED. No offline data will be synced or restored.\n"
            "================================================================================\n"
        )
        logger.error(notification)
        print(notification, file=sys.stderr)


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
