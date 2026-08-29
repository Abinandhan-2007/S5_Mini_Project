# backend/seed/backfill_hospitals.py
import sys
import os
import json
import logging

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
from database import read_json_db, write_json_db, get_pg_connection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("carepulse.backfill")

def run_backfill():
    logger.info("Starting safe backfill of hospital_id on appointments and consultations...")
    database.init_db()
    
    # 1. Load doctor and hospital mappings from JSON DB and PostgreSQL
    db = read_json_db()
    
    hospitals_list = db.get("hospitals", [])
    doctors_list = db.get("doctors", [])
    
    # Map doctor_id -> hospital_id
    doc_to_hosp = {}
    for d in doctors_list:
        doc_id = str(d.get("id"))
        h_id = d.get("hospital_id") or d.get("hospitalId")
        if h_id:
            doc_to_hosp[doc_id] = h_id

    # Map hospital_name (lowercased) -> hospital_id
    name_to_hosp = {}
    for h in hospitals_list:
        h_id = str(h.get("id"))
        h_name = str(h.get("name", "")).strip().lower()
        if h_name:
            name_to_hosp[h_name] = h_id

    # Add standard known hospital name variations
    name_to_hosp["carepulse central hospital"] = "hosp-1"
    name_to_hosp["st. jude heart & medical center"] = "hosp-1"
    name_to_hosp["apollo city multispecialty"] = "hosp-2"
    name_to_hosp["apex memorial care"] = "hosp-3"
    name_to_hosp["metro health center"] = "hosp-4"

    # Also query PostgreSQL doctors & hospitals if available to augment mapping
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT id, hospital_id FROM doctors WHERE hospital_id IS NOT NULL")
                    for r in cur.fetchall():
                        doc_to_hosp[str(r["id"])] = str(r["hospital_id"])
                    
                    cur.execute("SELECT id, name FROM hospitals")
                    for r in cur.fetchall():
                        name_to_hosp[str(r["name"]).strip().lower()] = str(r["id"])
        except Exception as e:
            logger.warning(f"Error reading mappings from PostgreSQL: {e}")

    logger.info(f"Loaded {len(doc_to_hosp)} doctor->hospital mappings and {len(name_to_hosp)} hospital name mappings.")

    # 2. Backfill JSON DB
    json_app_total = len(db.get("appointments", []))
    json_app_backfilled = 0
    json_app_null = 0

    for a in db.get("appointments", []):
        current_h_id = a.get("hospital_id") or a.get("hospitalId")
        if not current_h_id:
            # Primary: lookup by doctor_id
            doc_id = str(a.get("doctor_id")) if a.get("doctor_id") else None
            derived = doc_to_hosp.get(doc_id)
            
            # Fallback: lookup by hospital_name
            if not derived and a.get("hospital_name"):
                h_name_clean = str(a.get("hospital_name")).strip().lower()
                derived = name_to_hosp.get(h_name_clean)
            
            # Default fallback if still None
            if not derived:
                derived = "hosp-1"

            a["hospital_id"] = derived
            a["hospitalId"] = derived
            json_app_backfilled += 1
        else:
            json_app_backfilled += 1

    json_cons_total = len(db.get("consultations", []))
    json_cons_backfilled = 0
    json_cons_null = 0

    for c in db.get("consultations", []):
        current_h_id = c.get("hospital_id") or c.get("hospitalId")
        if not current_h_id:
            doc_id = str(c.get("doctor_id")) if c.get("doctor_id") else None
            derived = doc_to_hosp.get(doc_id)
            if not derived:
                derived = "hosp-1"
            c["hospital_id"] = derived
            c["hospitalId"] = derived
            json_cons_backfilled += 1
        else:
            json_cons_backfilled += 1

    write_json_db(db)
    logger.info(f"JSON DB Appointments: total={json_app_total}, backfilled={json_app_backfilled}, null={json_app_null}")
    logger.info(f"JSON DB Consultations: total={json_cons_total}, backfilled={json_cons_backfilled}, null={json_cons_null}")

    # 3. Backfill PostgreSQL DB
    pg_app_total = 0
    pg_app_backfilled = 0
    pg_app_null = 0

    pg_cons_total = 0
    pg_cons_backfilled = 0
    pg_cons_null = 0

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    # Backfill appointments
                    cur.execute("SELECT id, doctor_id, hospital_name, hospital_id FROM appointments")
                    apps = cur.fetchall()
                    pg_app_total = len(apps)

                    for a in apps:
                        a_id = a["id"]
                        current_h_id = a.get("hospital_id")
                        if not current_h_id:
                            doc_id = str(a.get("doctor_id")) if a.get("doctor_id") else None
                            derived = doc_to_hosp.get(doc_id)
                            if not derived and a.get("hospital_name"):
                                h_name_clean = str(a.get("hospital_name")).strip().lower()
                                derived = name_to_hosp.get(h_name_clean)
                            if not derived:
                                derived = "hosp-1"
                            
                            cur.execute("UPDATE appointments SET hospital_id = %s WHERE id = %s", (derived, a_id))
                            pg_app_backfilled += 1
                        else:
                            pg_app_backfilled += 1

                    # Backfill consultations
                    cur.execute("SELECT id, doctor_id, hospital_id FROM consultations")
                    cons = cur.fetchall()
                    pg_cons_total = len(cons)

                    for c in cons:
                        c_id = c["id"]
                        current_h_id = c.get("hospital_id")
                        if not current_h_id:
                            doc_id = str(c.get("doctor_id")) if c.get("doctor_id") else None
                            derived = doc_to_hosp.get(doc_id)
                            if not derived:
                                derived = "hosp-1"
                            
                            cur.execute("UPDATE consultations SET hospital_id = %s WHERE id = %s", (derived, c_id))
                            pg_cons_backfilled += 1
                        else:
                            pg_cons_backfilled += 1

                conn.commit()
            logger.info(f"PostgreSQL DB Appointments: total={pg_app_total}, backfilled={pg_app_backfilled}, null={pg_app_null}")
            logger.info(f"PostgreSQL DB Consultations: total={pg_cons_total}, backfilled={pg_cons_backfilled}, null={pg_cons_null}")
        except Exception as e:
            logger.error(f"Error during PostgreSQL backfill: {e}")

    report = {
        "status": "COMPLETED",
        "json_db": {
            "appointments": {"total": json_app_total, "backfilled": json_app_backfilled, "left_null": json_app_null},
            "consultations": {"total": json_cons_total, "backfilled": json_cons_backfilled, "left_null": json_cons_null}
        },
        "postgresql": {
            "appointments": {"total": pg_app_total, "backfilled": pg_app_backfilled, "left_null": pg_app_null},
            "consultations": {"total": pg_cons_total, "backfilled": pg_cons_backfilled, "left_null": pg_cons_null}
        }
    }
    
    print("\n================ BACKFILL REPORT ================")
    print(json.dumps(report, indent=2))
    print("=================================================\n")
    return report

if __name__ == "__main__":
    run_backfill()
