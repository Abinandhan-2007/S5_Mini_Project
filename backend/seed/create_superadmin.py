# backend/seed/create_superadmin.py
import sys
import os
import uuid

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
from database import get_pg_connection, read_json_db, write_json_db
from core.security import hash_password

SUPERADMIN_EMAIL = "superadmin@carepulse.com"
SUPERADMIN_PASSWORD = "SuperAdmin@123"
SUPERADMIN_NAME = "Platform SuperAdmin"
SUPERADMIN_ROLE = "superadmin"
SUPERADMIN_PHONE = "+1-800-555-0199"
SUPERADMIN_DEPT = "Global Platform Operations"


def seed_superadmin():
    print("[INFO] Initializing SuperAdmin bootstrap...")
    database.init_db()
    hashed_pwd = hash_password(SUPERADMIN_PASSWORD)
    staff_id = str(uuid.uuid4())
    assigned_code = "SA101"

    # 1. Seed or update PostgreSQL
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    # Check if superadmin already exists
                    cur.execute(
                        "SELECT id, staff_code, email FROM staff WHERE role = 'superadmin' OR LOWER(email) = LOWER(%s)",
                        (SUPERADMIN_EMAIL,)
                    )
                    existing = cur.fetchone()
                    if existing:
                        staff_id = str(existing["id"])
                        assigned_code = existing.get("staff_code") or "SA101"
                        cur.execute(
                            """
                            UPDATE staff 
                            SET password_hash = %s, full_name = %s, is_active = true, role = 'superadmin', hospital_id = NULL
                            WHERE id = %s
                            """,
                            (hashed_pwd, SUPERADMIN_NAME, staff_id)
                        )
                        print(f"[OK] Existing SuperAdmin updated in PostgreSQL. ID: {staff_id}, Staff Code: {assigned_code}")
                    else:
                        cur.execute(
                            """
                            INSERT INTO staff (
                                id, full_name, email, password_hash, role, specialization, phone, is_active, hospital_id
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s, %s, true, NULL
                            )
                            RETURNING id, staff_code;
                            """,
                            (staff_id, SUPERADMIN_NAME, SUPERADMIN_EMAIL, hashed_pwd, SUPERADMIN_ROLE, SUPERADMIN_DEPT, SUPERADMIN_PHONE)
                        )
                        row = cur.fetchone()
                        staff_id = str(row["id"])
                        assigned_code = row.get("staff_code") or "SA101"
                        print(f"[OK] New SuperAdmin inserted into PostgreSQL. ID: {staff_id}, Staff Code: {assigned_code}")
                conn.commit()
        except Exception as e:
            print(f"[ERROR] PostgreSQL error seeding SuperAdmin: {e}")

    # 2. Seed or update database.json
    try:
        db = read_json_db()
        staff_list = db.get("staff", [])
        found_idx = None
        for idx, s in enumerate(staff_list):
            if (s.get("email") or "").lower() == SUPERADMIN_EMAIL.lower() or s.get("role") == "superadmin":
                found_idx = idx
                break

        sa_entry = {
            "id": staff_id,
            "staff_code": assigned_code,
            "staffCode": assigned_code,
            "name": SUPERADMIN_NAME,
            "full_name": SUPERADMIN_NAME,
            "email": SUPERADMIN_EMAIL,
            "username": "superadmin",
            "password": hashed_pwd,
            "password_hash": hashed_pwd,
            "role": "superadmin",
            "department": SUPERADMIN_DEPT,
            "specialization": SUPERADMIN_DEPT,
            "phone": SUPERADMIN_PHONE,
            "hospital_id": None,
            "hospitalId": None,
            "doctor_id": None,
            "doctorId": None,
            "isActive": True,
            "is_active": True,
            "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
        }

        if found_idx is not None:
            staff_list[found_idx].update(sa_entry)
            print(f"[OK] database.json updated SuperAdmin record at index {found_idx}")
        else:
            staff_list.append(sa_entry)
            print("[OK] database.json appended SuperAdmin record")

        db["staff"] = staff_list
        write_json_db(db)
    except Exception as e:
        print(f"[ERROR] database.json error seeding SuperAdmin: {e}")

    print(f"[SUCCESS] SuperAdmin bootstrap complete!")
    print(f"Credentials -> Email: {SUPERADMIN_EMAIL} | Password: {SUPERADMIN_PASSWORD} | Code: {assigned_code}")


if __name__ == "__main__":
    seed_superadmin()
