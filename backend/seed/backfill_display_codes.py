# backend/seed/backfill_display_codes.py
"""
Backfill script to assign and regenerate human-readable display codes across CarePulse:
1. Patients: 'P' + zero-padded 6-digit sequence (e.g. P000001, P000002)
2. Hospitals: 'H' + zero-padded 3-digit sequence (e.g. H001, H002)
3. Staff: '<RoleLetter><3-digit HospitalNumber><3-digit Seq starting at 101>'
   - Admin:        A001101
   - Doctors:      D001101, D001102, D001103...
   - Receptionists: R001101, R001102...
"""

import sys
import json
import re
from pathlib import Path
from typing import Dict, Any, List, Tuple

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import database
from database import get_pg_connection, read_json_db, write_json_db, JSON_DB_PATH

def extract_numeric_digits(text: str) -> str:
    """Extract numeric digits from a string, e.g. 'hosp-2' -> '2', 'H003' -> '003'."""
    if not text:
        return ""
    digits = re.sub(r"[^0-9]", "", text)
    return digits

def backfill_postgres() -> Dict[str, Any]:
    """Regenerate and backfill all display codes in PostgreSQL."""
    if not database.use_pg:
        print("⚠️ PostgreSQL not reachable, skipping PostgreSQL backfill.")
        return {"hospitals": [], "staff": [], "patients": []}

    audit_log = {
        "hospitals": [],
        "staff": [],
        "patients": []
    }

    with get_pg_connection() as conn:
        with conn.cursor() as cur:
            # -------------------------------------------------------------
            # 1. Backfill Hospitals (H001, H002, H003...)
            # -------------------------------------------------------------
            cur.execute("""
                SELECT id, name, hospital_code, created_at 
                FROM hospitals 
                ORDER BY created_at ASC NULLS LAST, id ASC
            """)
            hospitals = cur.fetchall()

            hosp_num_map = {}
            for idx, h in enumerate(hospitals, start=1):
                old_code = h.get("hospital_code") or "(none)"
                new_code = f"H{idx:03d}"
                h_id = str(h["id"])
                hosp_num_map[h_id] = f"{idx:03d}"

                cur.execute(
                    "UPDATE hospitals SET hospital_code = %s WHERE id = %s",
                    (new_code, h_id)
                )
                audit_log["hospitals"].append({
                    "id": h_id,
                    "name": h["name"],
                    "before": old_code,
                    "after": new_code
                })

            cur.execute("SELECT setval('hospital_code_seq', %s, true)", (max(len(hospitals), 1),))

            # -------------------------------------------------------------
            # 2. Backfill Patients (P000001, P000002...)
            # -------------------------------------------------------------
            cur.execute("""
                SELECT id, full_name, email, patient_code, created_at 
                FROM patients 
                ORDER BY created_at ASC NULLS LAST, id ASC
            """)
            patients = cur.fetchall()

            for idx, p in enumerate(patients, start=1):
                old_code = p.get("patient_code") or "(none)"
                new_code = f"P{idx:06d}"
                p_id = p["id"]

                cur.execute(
                    "UPDATE patients SET patient_code = %s WHERE id = %s",
                    (new_code, p_id)
                )
                audit_log["patients"].append({
                    "id": str(p_id),
                    "name": p["full_name"],
                    "email": p["email"],
                    "before": old_code,
                    "after": new_code
                })

            cur.execute("SELECT setval('patient_code_seq', %s, true)", (max(len(patients), 1),))

            # -------------------------------------------------------------
            # 3. Backfill Staff (<RoleLetter><HospNum><101+>)
            # -------------------------------------------------------------
            cur.execute("""
                SELECT id, full_name, email, role, hospital_id, staff_code, created_at 
                FROM staff 
                ORDER BY hospital_id ASC NULLS LAST, role ASC, created_at ASC NULLS LAST, id ASC
            """)
            staff_rows = cur.fetchall()

            # Group by hospital_id and role
            role_counters: Dict[Tuple[str, str], int] = {}
            role_letters = {"admin": "A", "doctor": "D", "receptionist": "R"}

            for s in staff_rows:
                s_id = s["id"]
                s_role = (s.get("role") or "staff").lower()
                s_hosp_id = s.get("hospital_id") or "hosp-1"
                old_code = s.get("staff_code") or "(none)"

                hosp_digits = hosp_num_map.get(str(s_hosp_id))
                if not hosp_digits:
                    raw_digits = extract_numeric_digits(str(s_hosp_id))
                    hosp_digits = f"{int(raw_digits):03d}" if raw_digits else "001"

                group_key = (str(s_hosp_id), s_role)
                current_seq = role_counters.get(group_key, 101)
                role_counters[group_key] = current_seq + 1

                prefix = role_letters.get(s_role, "S")
                new_code = f"{prefix}{hosp_digits}{current_seq:03d}"

                cur.execute(
                    "UPDATE staff SET staff_code = %s WHERE id = %s",
                    (new_code, s_id)
                )

                audit_log["staff"].append({
                    "id": str(s_id),
                    "name": s["full_name"],
                    "email": s["email"],
                    "role": s_role,
                    "hospital_id": str(s_hosp_id),
                    "before": old_code,
                    "after": new_code
                })

            conn.commit()

    return audit_log

def backfill_json() -> Dict[str, Any]:
    """Regenerate and backfill all display codes in database.json."""
    if not JSON_DB_PATH.exists():
        return {"hospitals": [], "staff": [], "patients": []}

    db = read_json_db()
    audit_log = {"hospitals": [], "staff": [], "patients": []}

    # 1. Hospitals
    hospitals = db.get("hospitals", [])
    hosp_num_map = {}
    for idx, h in enumerate(hospitals, start=1):
        old_code = h.get("hospital_code") or h.get("hospitalCode") or "(none)"
        new_code = f"H{idx:03d}"
        h["hospital_code"] = new_code
        h["hospitalCode"] = new_code
        h_id = str(h["id"])
        hosp_num_map[h_id] = f"{idx:03d}"
        audit_log["hospitals"].append({
            "id": h_id,
            "name": h.get("name"),
            "before": old_code,
            "after": new_code
        })

    # 2. Patients
    patients = db.get("patients", [])
    for idx, p in enumerate(patients, start=1):
        old_code = p.get("patient_code") or p.get("patientCode") or "(none)"
        new_code = f"P{idx:06d}"
        p["patient_code"] = new_code
        p["patientCode"] = new_code
        audit_log["patients"].append({
            "id": str(p["id"]),
            "name": p.get("full_name") or p.get("fullName"),
            "before": old_code,
            "after": new_code
        })

    # 3. Staff
    staff = db.get("staff", [])
    role_counters: Dict[Tuple[str, str], int] = {}
    role_letters = {"admin": "A", "doctor": "D", "receptionist": "R"}

    for s in staff:
        s_id = str(s.get("id"))
        s_role = (s.get("role") or "staff").lower()
        s_hosp_id = s.get("hospital_id") or s.get("hospitalId") or "hosp-1"
        old_code = s.get("staff_code") or s.get("staffCode") or "(none)"

        hosp_digits = hosp_num_map.get(str(s_hosp_id))
        if not hosp_digits:
            raw_digits = extract_numeric_digits(str(s_hosp_id))
            hosp_digits = f"{int(raw_digits):03d}" if raw_digits else "001"

        group_key = (str(s_hosp_id), s_role)
        current_seq = role_counters.get(group_key, 101)
        role_counters[group_key] = current_seq + 1

        prefix = role_letters.get(s_role, "S")
        new_code = f"{prefix}{hosp_digits}{current_seq:03d}"

        s["staff_code"] = new_code
        s["staffCode"] = new_code

        audit_log["staff"].append({
            "id": s_id,
            "name": s.get("name") or s.get("full_name"),
            "email": s.get("email"),
            "role": s_role,
            "hospital_id": str(s_hosp_id),
            "before": old_code,
            "after": new_code
        })

    # Sync receptionists array if present
    recs = db.get("receptionists", [])
    for r in recs:
        matching = next((s for s in staff if s.get("id") == r.get("id") or s.get("email") == r.get("email")), None)
        if matching and matching.get("staff_code"):
            r["staff_code"] = matching["staff_code"]
            r["staffCode"] = matching["staff_code"]

    db["hospitals"] = hospitals
    db["patients"] = patients
    db["staff"] = staff
    db["receptionists"] = recs
    write_json_db(db)

    return audit_log

def print_audit_table(title: str, records: List[Dict[str, Any]], fields: List[Tuple[str, str]]):
    """Print formatted ASCII table of before/after records."""
    print(f"\n=== {title} ({len(records)} records) ===")
    if not records:
        print("  (No records found)")
        return

    col_widths = {label: max(len(label), max(len(str(r.get(key, ''))) for r in records)) for key, label in fields}
    header_str = " | ".join(f"{label:<{col_widths[label]}}" for _, label in fields)
    divider_str = "-+-".join("-" * col_widths[label] for _, label in fields)

    print(header_str)
    print(divider_str)
    for r in records:
        row_str = " | ".join(f"{str(r.get(key, '')):<{col_widths[label]}}" for key, label in fields)
        print(row_str)

def run_backfill():
    print("====================================================================")
    print("CarePulse Hierarchical Display Codes Backfill Engine")
    print("====================================================================")

    database.init_db()

    print("\n>>> Executing PostgreSQL Backfill Migration...")
    pg_audit = backfill_postgres()

    print_audit_table(
        "HOSPITALS BACKFILLED (Format: H001, H002...)",
        pg_audit["hospitals"],
        [("id", "Hospital ID"), ("name", "Hospital Name"), ("before", "Before Code"), ("after", "New Hospital Code")]
    )

    print_audit_table(
        "STAFF BACKFILLED (Format: <Role><Hosp><101+>, e.g. A001101, D001101, R001101)",
        pg_audit["staff"],
        [("role", "Role"), ("name", "Staff Name"), ("hospital_id", "Hospital ID"), ("before", "Before Code"), ("after", "New Staff Code")]
    )

    print_audit_table(
        "PATIENTS BACKFILLED (Format: P000001, P000002...)",
        pg_audit["patients"],
        [("id", "Patient ID"), ("name", "Patient Name"), ("email", "Email"), ("before", "Before Code"), ("after", "New Patient Code")]
    )

    print("\n>>> Synchronizing Local database.json Fallback...")
    json_audit = backfill_json()
    print(f"[OK] database.json synced: {len(json_audit['hospitals'])} hospitals, {len(json_audit['staff'])} staff, {len(json_audit['patients'])} patients.")

    print("\n====================================================================")
    print("Display Code Migration & Backfill Completed Successfully!")
    print("====================================================================")

if __name__ == "__main__":
    run_backfill()
