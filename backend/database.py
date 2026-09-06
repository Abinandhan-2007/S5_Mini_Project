import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import os
import json
import math
import logging
from typing import Dict, Any, List, Optional
import psycopg
from psycopg.rows import dict_row
from pgvector.psycopg import register_vector

from config import DB_USER, DB_PASSWORD, DB_DATABASE, DB_HOST, DB_PORT, INIT_SQL_PATH, JSON_DB_PATH

logger = logging.getLogger("carepulse.db")
logging.basicConfig(level=logging.INFO)

# Default is strict PostgreSQL requirement (Fail-Fast).
# Local JSON fallback is only allowed when explicitly opted in via ALLOW_JSON_FALLBACK=true.
ALLOW_JSON_FALLBACK = os.environ.get("ALLOW_JSON_FALLBACK", "").strip().lower() in ("true", "1", "yes")
use_pg = False
db_conn_info = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_DATABASE}"

def init_json_db() -> Dict[str, Any]:
    """Ensure database.json exists with initial data if needed."""
    if not JSON_DB_PATH.exists():
        JSON_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        initial_data = {
            "patients": [],
            "consultations": [],
            "appointments": [],
            "prescriptions": []
        }
        with open(JSON_DB_PATH, "w", encoding="utf-8") as f:
            json.dump(initial_data, f, indent=2)
        return initial_data

    try:
        with open(JSON_DB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"patients": [], "consultations": []}

def read_json_db() -> Dict[str, Any]:
    return init_json_db()

def write_json_db(data: Dict[str, Any]) -> None:
    with open(JSON_DB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def get_pg_connection():
    """Get a new psycopg connection with dictionary rows and optional pgvector support."""
    conn = psycopg.connect(db_conn_info, row_factory=dict_row, connect_timeout=5)
    try:
        register_vector(conn)
    except Exception:
        pass
    return conn

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

def init_db():
    """
    Attempt PostgreSQL connection and execute initial migration scripts.
    Fails loudly and refuses startup if PostgreSQL is unreachable unless ALLOW_JSON_FALLBACK=true.
    """
    global use_pg
    init_json_db()
    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT NOW()")
                if INIT_SQL_PATH.exists():
                    try:
                        sql = INIT_SQL_PATH.read_text(encoding="utf-8")
                        statements = split_sql_script(sql)
                        for stmt in statements:
                            try:
                                cur.execute(stmt)
                                conn.commit()
                            except Exception as stmt_err:
                                conn.rollback()
                                logger.debug(f"Statement note in init.sql: {stmt_err}")
                    except Exception as sql_err:
                        logger.warning(f"Note on init.sql migration: {sql_err}")
        use_pg = True
        logger.info("================================================================================")
        logger.info("✅ [DATABASE] Connected to PostgreSQL successfully (pgvector enabled).")
        logger.info(f"   Target: postgresql://{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_DATABASE}")
        logger.info("================================================================================")
    except Exception as e:
        use_pg = False
        if not ALLOW_JSON_FALLBACK:
            error_box = (
                "\n"
                "================================================================================\n"
                "❌ [FATAL ERROR] CAREPULSE BACKEND STARTUP HALTED: POSTGRESQL UNREACHABLE\n"
                "================================================================================\n"
                f"Target Connection: postgresql://{DB_USER}:***@{DB_HOST}:{DB_PORT}/{DB_DATABASE}\n"
                f"Root Cause Error : {e}\n"
                "\n"
                "Troubleshooting Steps:\n"
                "1. Verify PostgreSQL service is running:\n"
                "   - Windows: Check 'Services' for 'postgresql-x64-18' or run: net start postgresql-x64-18\n"
                "   - Docker:  Run 'docker compose up -d'\n"
                "2. Verify credentials in .env or config.py:\n"
                f"   - DB_HOST={DB_HOST}, DB_PORT={DB_PORT}, DB_DATABASE={DB_DATABASE}, DB_USER={DB_USER}\n"
                "3. If you intentionally want to run in offline mock demo mode without PostgreSQL,\n"
                "   set the environment variable: ALLOW_JSON_FALLBACK=true\n"
                "================================================================================\n"
            )
            logger.error(error_box)
            print(error_box, file=sys.stderr)
            raise RuntimeError(
                f"PostgreSQL Database is unreachable at {DB_HOST}:{DB_PORT}. "
                "Backend startup aborted to prevent silent data degradation. "
                "(To allow local mock fallback, set ALLOW_JSON_FALLBACK=true)"
            )
        else:
            warning_box = (
                "\n"
                "================================================================================\n"
                "⚠️ [WARNING] RUNNING IN OFFLINE MOCK JSON MODE (ALLOW_JSON_FALLBACK=true)\n"
                f"⚠️ PostgreSQL unreachable ({e}). Data will be written ONLY to {JSON_DB_PATH.name}.\n"
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
