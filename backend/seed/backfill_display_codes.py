# backend/seed/backfill_display_codes.py
"""
Backfill script to assign human-readable display codes (patient_code / staff_code)
to all existing records missing them in both PostgreSQL and local database.json.

Format rules:
- patients: 'PAT-' + zero-padded 6-digit number (e.g. PAT-000001)
- staff role='admin': 'ADM-' + zero-padded 4-digit number (e.g. ADM-0001)
- staff role='receptionist': 'REC-' + zero-padded 4-digit number (e.g. REC-0001)
- staff role='doctor': 'DOC-' + zero-padded 4-digit number (e.g. DOC-0001)
"""

import sys
import json
import re
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import database
from database import get_pg_connection, read_json_db, write_json_db, JSON_DB_PATH

def extract_numeric_code(code_str: str) -> int:
    """Extract numeric integer from strings like 'PAT-000042' -> 42."""
    if not code_str:
        return 0
    match = re.search(r"\d+", code_str)
    return int(match.group(0)) if match else 0

def backfill_postgres():
    """Backfill missing patient_code and staff_code values in PostgreSQL."""
    if not database.use_pg:
        print("⚠️ PostgreSQL not reachable, skipping PostgreSQL backfill.")
        return {"patients": 0, "admin": 0, "receptionist": 0, "doctor": 0, "other_staff": 0}

    counts = {"patients": 0, "admin": 0, "receptionist": 0, "doctor": 0, "other_staff": 0}

    with get_pg_connection() as conn:
        with conn.cursor() as cur:
            # 1. Backfill Patients
            cur.execute("""
                SELECT id, patient_code, created_at 
                FROM patients 
                ORDER BY created_at ASC NULLS LAST, id ASC
            """)
            patients = cur.fetchall()

            # Determine starting patient sequence index
            max_pat_num = 0
            for p in patients:
                p_code = p.get("patient_code")
                if p_code and p_code.startswith("PAT-"):
                    max_pat_num = max(max_pat_num, extract_numeric_code(p_code))

            current_pat_seq = max_pat_num
            for p in patients:
                if not p.get("patient_code"):
                    current_pat_seq += 1
                    new_code = f"PAT-{current_pat_seq:06d}"
                    cur.execute(
                        "UPDATE patients SET patient_code = %s WHERE id = %s",
                        (new_code, p["id"])
                    )
                    counts["patients"] += 1

            # Sync sequence
            cur.execute("SELECT setval('patient_code_seq', %s, true)", (max(current_pat_seq, 1),))

            # 2. Backfill Staff by Role
            cur.execute("""
                SELECT id, role, staff_code, created_at 
                FROM staff 
                ORDER BY created_at ASC NULLS LAST, id ASC
            """)
            staff_rows = cur.fetchall()

            role_max = {"admin": 0, "receptionist": 0, "doctor": 0, "other": 0}
            role_prefixes = {"admin": "ADM", "receptionist": "REC", "doctor": "DOC", "other": "STF"}
            role_seqs = {"admin": "admin_code_seq", "receptionist": "receptionist_code_seq", "doctor": "doctor_code_seq"}

            for s in staff_rows:
                s_role = (s.get("role") or "").lower()
                s_code = s.get("staff_code")
                if s_code:
                    key = s_role if s_role in role_max else "other"
                    role_max[key] = max(role_max[key], extract_numeric_code(s_code))

            for s in staff_rows:
                if not s.get("staff_code"):
                    s_role = (s.get("role") or "other").lower()
                    key = s_role if s_role in role_max else "other"
                    role_max[key] += 1
                    prefix = role_prefixes.get(key, "STF")
                    new_code = f"{prefix}-{role_max[key]:04d}"
                    cur.execute(
                        "UPDATE staff SET staff_code = %s WHERE id = %s",
                        (new_code, s["id"])
                    )
                    if key in counts:
                        counts[key] += 1
                    else:
                        counts["other_staff"] += 1

            # Sync staff sequences
            for r_key, seq_name in role_seqs.items():
                cur.execute(f"SELECT setval('{seq_name}', %s, true)", (max(role_max[r_key], 1),))

            conn.commit()

    return counts

def backfill_json():
    """Backfill missing patient_code and staff_code values in database.json."""
    if not JSON_DB_PATH.exists():
        print("⚠️ database.json does not exist, skipping JSON backfill.")
        return {"patients": 0, "admin": 0, "receptionist": 0, "doctor": 0}

    db = read_json_db()
    counts = {"patients": 0, "admin": 0, "receptionist": 0, "doctor": 0}

    # 1. Patients
    patients = db.get("patients", [])
    max_pat = 0
    for p in patients:
        code = p.get("patient_code") or p.get("patientCode")
        if code and code.startswith("PAT-"):
            max_pat = max(max_pat, extract_numeric_code(code))

    for p in patients:
        if not (p.get("patient_code") or p.get("patientCode")):
            max_pat += 1
            assigned = f"PAT-{max_pat:06d}"
            p["patient_code"] = assigned
            p["patientCode"] = assigned
            counts["patients"] += 1
        elif not p.get("patient_code") and p.get("patientCode"):
            p["patient_code"] = p["patientCode"]
        elif not p.get("patientCode") and p.get("patient_code"):
            p["patientCode"] = p["patient_code"]

    # 2. Staff
    staff = db.get("staff", [])
    role_max = {"admin": 0, "receptionist": 0, "doctor": 0, "other": 0}
    role_prefixes = {"admin": "ADM", "receptionist": "REC", "doctor": "DOC", "other": "STF"}

    for s in staff:
        role = (s.get("role") or "other").lower()
        key = role if role in role_max else "other"
        code = s.get("staff_code") or s.get("staffCode")
        if code:
            role_max[key] = max(role_max[key], extract_numeric_code(code))

    for s in staff:
        role = (s.get("role") or "other").lower()
        key = role if role in role_max else "other"
        if not (s.get("staff_code") or s.get("staffCode")):
            role_max[key] += 1
            assigned = f"{role_prefixes.get(key, 'STF')}-{role_max[key]:04d}"
            s["staff_code"] = assigned
            s["staffCode"] = assigned
            if key in counts:
                counts[key] += 1
        elif not s.get("staff_code") and s.get("staffCode"):
            s["staff_code"] = s["staffCode"]
        elif not s.get("staffCode") and s.get("staff_code"):
            s["staffCode"] = s["staff_code"]

    # 3. Receptionists list (if tracked as separate array)
    recs = db.get("receptionists", [])
    for r in recs:
        # Match with staff if possible
        matching_staff = next((s for s in staff if s.get("id") == r.get("id") or s.get("email") == r.get("email")), None)
        if matching_staff and matching_staff.get("staff_code"):
            r["staff_code"] = matching_staff["staff_code"]
            r["staffCode"] = matching_staff["staff_code"]
        elif not (r.get("staff_code") or r.get("staffCode")):
            role_max["receptionist"] += 1
            assigned = f"REC-{role_max['receptionist']:04d}"
            r["staff_code"] = assigned
            r["staffCode"] = assigned

    db["patients"] = patients
    db["staff"] = staff
    db["receptionists"] = recs
    write_json_db(db)

    return counts

def run_backfill():
    print("==================================================")
    print("[CarePulse] Running Display Codes Backfill Engine")
    print("==================================================")

    database.init_db()

    print("\n--- 1. PostgreSQL Backfill ---")
    pg_results = backfill_postgres()
    print(f"[OK] PostgreSQL Backfilled:")
    print(f"   * Patients:      {pg_results['patients']}")
    print(f"   * Admin Staff:   {pg_results['admin']}")
    print(f"   * Receptionists: {pg_results['receptionist']}")
    print(f"   * Doctors:       {pg_results['doctor']}")

    print("\n--- 2. JSON Database Backfill ---")
    json_results = backfill_json()
    print(f"[OK] database.json Backfilled:")
    print(f"   * Patients:      {json_results['patients']}")
    print(f"   * Admin Staff:   {json_results['admin']}")
    print(f"   * Receptionists: {json_results['receptionist']}")
    print(f"   * Doctors:       {json_results['doctor']}")

    print("\n==================================================")
    print("[SUCCESS] Display code backfill completed successfully!")
    print("==================================================")

if __name__ == "__main__":
    run_backfill()
