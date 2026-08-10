import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

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

use_pg = False
db_conn_info = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_DATABASE}"

def init_json_db() -> Dict[str, Any]:
    """Ensure database.json exists with initial data if needed."""
    if not JSON_DB_PATH.exists():
        JSON_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        initial_data = {
            "patients": [
                {
                    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
                    "full_name": "Sarah Jenkins",
                    "email": "sarah.j@carepulse.com",
                    "phone": "+91 98765 43210",
                    "dob": "1995-07-24",
                    "gender": "Female",
                    "blood_group": "O+",
                    "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
                    "auth_provider": "google",
                    "google_id": "google-demo-sarah"
                }
            ],
            "consultations": [
                {
                    "id": "c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f",
                    "patient_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
                    "doctor_id": "doc-1",
                    "doctor_name": "Dr. Olivia Wilson",
                    "date": "2026-07-24",
                    "soap_data": {
                        "subjective": "Patient reports mild seasonal allergy symptoms including sneezing and congestion.",
                        "objective": "Clear nasal discharge, no wheezing, clear breath sounds, normal temperature.",
                        "assessment": "Allergic Rhinitis.",
                        "plan": "Prescribed Cetirizine 10mg once daily as needed. Recommended avoidance of known environmental allergens.",
                        "vitals": {
                            "bp": "118/76",
                            "heart_rate": 72,
                            "temperature": 98.4
                        }
                    },
                    "soap_embedding": []
                }
            ]
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
    conn = psycopg.connect(db_conn_info, row_factory=dict_row, connect_timeout=3)
    try:
        register_vector(conn)
    except Exception:
        pass
    return conn

def init_db():
    """Attempt PostgreSQL connection and execute initial migration scripts."""
    global use_pg
    init_json_db()
    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT NOW()")
                if INIT_SQL_PATH.exists():
                    try:
                        sql = INIT_SQL_PATH.read_text(encoding="utf-8")
                        cur.execute(sql)
                    except Exception as sql_err:
                        logger.warning(f"Note on init.sql migration: {sql_err}")
                conn.commit()
        use_pg = True
        logger.info("✅ PostgreSQL Database connected successfully")
    except Exception as e:
        use_pg = False
        logger.warning(f"⚠️ PostgreSQL database not reachable ({e}). Falling back to local JSON file store ({JSON_DB_PATH}).")

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
