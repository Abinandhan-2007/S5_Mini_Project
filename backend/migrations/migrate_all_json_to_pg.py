import sys
import json
import logging
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import JSON_DB_PATH
from database import get_pg_connection, to_valid_uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_to_pg")

def run_migration():
    if not JSON_DB_PATH.exists():
        print("No database.json found to migrate.")
        return

    with open(JSON_DB_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    conn = get_pg_connection()
    try:
        with conn.cursor() as cur:
            # 1. Hospitals
            json_hospitals = data.get("hospitals", [])
            for h in json_hospitals:
                h_id = h.get("id")
                if not h_id:
                    continue
                cur.execute("SELECT id FROM hospitals WHERE id = %s", (h_id,))
                if not cur.fetchone():
                    h_code = h.get("hospital_code")
                    if not h_code:
                        cur.execute("SELECT CONCAT('H', LPAD(nextval('hospital_code_seq')::text, 3, '0')) as code")
                        h_code = cur.fetchone()["code"]
                    cur.execute(
                        """
                        INSERT INTO hospitals (id, hospital_code, name, address, phone, email, facility_type, rating, reviews_count, emergency_available, image_url, specialties, is_active, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (id) DO NOTHING
                        """,
                        (
                            h_id,
                            h_code,
                            h.get("name") or "Hospital Facility",
                            h.get("address") or "",
                            h.get("phone") or "",
                            h.get("email") or "",
                            h.get("facility_type") or "Multispecialty Hospital",
                            float(h.get("rating") or 4.5),
                            int(h.get("reviews_count") or 10),
                            bool(h.get("emergency_available", True)),
                            h.get("image_url") or "",
                            h.get("specialties") or ["General Medicine"],
                            bool(h.get("is_active", True))
                        )
                    )
                    print(f"Migrated hospital: {h_id} ({h.get('name')})")

            conn.commit()

            # 2. Staff
            json_staff = data.get("staff", [])
            for s in json_staff:
                s_id = s.get("id")
                if not s_id:
                    continue
                cur.execute("SELECT id FROM staff WHERE id::text = %s", (str(s_id),))
                if not cur.fetchone():
                    cur.execute(
                        """
                        INSERT INTO staff (id, staff_code, full_name, email, password, password_hash, role, specialization, hospital_id, phone, is_active, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT DO NOTHING
                        """,
                        (
                            s_id,
                            s.get("staff_code") or s.get("staffCode") or f"STF-{s_id[:6]}",
                            s.get("full_name") or s.get("name") or "Staff",
                            s.get("email") or "",
                            s.get("password") or "CarePulse#2026",
                            s.get("password_hash") or s.get("passwordHash") or "",
                            s.get("role") or "staff",
                            s.get("specialization") or s.get("department") or "",
                            s.get("hospital_id") or s.get("hospitalId"),
                            s.get("phone") or "",
                            bool(s.get("is_active", True))
                        )
                    )
                    print(f"Migrated staff: {s_id}")

            conn.commit()

            # 3. Doctors
            json_doctors = data.get("doctors", [])
            for d in json_doctors:
                d_id = d.get("id")
                if not d_id:
                    continue
                cur.execute("SELECT id FROM doctors WHERE id = %s", (d_id,))
                if not cur.fetchone():
                    # Ensure hospital exists
                    h_id = d.get("hospital_id") or d.get("hospitalId")
                    if h_id:
                        cur.execute("SELECT id FROM hospitals WHERE id = %s", (h_id,))
                        if not cur.fetchone():
                            cur.execute(
                                "INSERT INTO hospitals (id, hospital_code, name, address, is_active) VALUES (%s, %s, %s, %s, true) ON CONFLICT DO NOTHING",
                                (h_id, f"H{abs(hash(h_id))%900+100}", d.get("hospital_name") or "Hospital", "City Hospital Address")
                            )
                    cur.execute(
                        """
                        INSERT INTO doctors (id, name, specialty, hospital_id, hospital_name, photo_url, rating, reviews_count, experience_years, about, created_at, department, consultation_fee, phone, email, is_available)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                        """,
                        (
                            d_id,
                            d.get("name") or "Doctor",
                            d.get("specialty") or "General Medicine",
                            h_id,
                            d.get("hospital_name") or "Hospital",
                            d.get("photo_url") or d.get("photo") or "/doctor_default.jpg",
                            float(d.get("rating") or 4.8),
                            int(d.get("reviews_count") or 50),
                            int(d.get("experience_years") or 10),
                            d.get("about") or "Experienced healthcare specialist.",
                            d.get("department") or d.get("specialty") or "General Medicine",
                            float(d.get("consultation_fee") or 500.0),
                            d.get("phone") or "",
                            d.get("email") or "",
                            bool(d.get("is_available", True))
                        )
                    )
                    print(f"Migrated doctor: {d_id} ({d.get('name')})")

            conn.commit()

            # Also check doctors referenced by appointments:
            for a in data.get("appointments", []):
                d_id = a.get("doctor_id") or a.get("doctorId")
                if d_id:
                    cur.execute("SELECT id FROM doctors WHERE id = %s", (d_id,))
                    if not cur.fetchone():
                        h_id = a.get("hospital_id") or a.get("hospitalId") or "hosp-kmch-5fd04b"
                        cur.execute("SELECT id FROM hospitals WHERE id = %s", (h_id,))
                        if not cur.fetchone():
                            cur.execute(
                                "INSERT INTO hospitals (id, hospital_code, name, address, is_active) VALUES (%s, %s, %s, %s, true) ON CONFLICT DO NOTHING",
                                (h_id, f"H{abs(hash(h_id))%900+100}", a.get("hospital_name") or "Hospital", "City Hospital Address")
                            )
                        cur.execute(
                            """
                            INSERT INTO doctors (id, name, specialty, hospital_id, hospital_name, photo_url, rating, reviews_count, experience_years, about, created_at, department, consultation_fee, phone, email, is_available)
                            VALUES (%s, %s, %s, %s, %s, %s, 4.8, 20, 10, 'Specialist physician.', NOW(), %s, 500.0, '', '', true)
                            ON CONFLICT (id) DO NOTHING
                            """,
                            (
                                d_id,
                                a.get("doctor_name") or a.get("doctorName") or "Specialist Doctor",
                                a.get("doctor_specialty") or a.get("doctorSpecialty") or "General Medicine",
                                h_id,
                                a.get("hospital_name") or a.get("hospitalName") or "Hospital",
                                a.get("doctor_photo") or a.get("doctorPhoto") or "/doctor_default.jpg",
                                a.get("doctor_specialty") or a.get("doctorSpecialty") or "General Medicine",
                            )
                        )
                        print(f"Provisioned referenced doctor: {d_id}")

            conn.commit()

            # 4. Patients
            json_patients = data.get("patients", [])
            for p in json_patients:
                raw_pid = p.get("id")
                if not raw_pid:
                    continue
                p_uuid = to_valid_uuid(raw_pid)
                cur.execute("SELECT id FROM patients WHERE id = %s", (p_uuid,))
                if not cur.fetchone():
                    cur.execute(
                        """
                        INSERT INTO patients (id, full_name, email, phone, gender, blood_group, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (id) DO NOTHING
                        """,
                        (
                            p_uuid,
                            p.get("full_name") or p.get("name") or "Patient",
                            p.get("email") or f"patient_{p_uuid[:8]}@example.com",
                            p.get("phone") or "",
                            p.get("gender") or "Not Specified",
                            p.get("blood_group") or "O+"
                        )
                    )
                    print(f"Migrated patient: {p_uuid} ({p.get('full_name') or p.get('name')})")

            conn.commit()

            # 5. Appointments
            json_appointments = data.get("appointments", [])
            for a in json_appointments:
                raw_aid = a.get("id")
                if not raw_aid:
                    continue
                a_uuid = to_valid_uuid(raw_aid)
                cur.execute("SELECT id FROM appointments WHERE id = %s", (a_uuid,))
                if not cur.fetchone():
                    p_raw = a.get("patient_id") or a.get("patientId") or a.get("patient_uuid")
                    if not p_raw:
                        continue
                    p_uuid = to_valid_uuid(p_raw)
                    # Verify patient exists
                    cur.execute("SELECT id FROM patients WHERE id = %s", (p_uuid,))
                    if not cur.fetchone():
                        p_name = a.get("patient_name") or a.get("patientName") or "Patient"
                        cur.execute(
                            "INSERT INTO patients (id, full_name, email, phone) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING",
                            (p_uuid, p_name, f"patient_{p_uuid[:8]}@example.com", "")
                        )
                    h_id = a.get("hospital_id") or a.get("hospitalId")
                    if h_id:
                        cur.execute("SELECT id FROM hospitals WHERE id = %s", (h_id,))
                        if not cur.fetchone():
                            cur.execute(
                                "INSERT INTO hospitals (id, hospital_code, name, address, is_active) VALUES (%s, %s, %s, %s, true) ON CONFLICT DO NOTHING",
                                (h_id, f"H{abs(hash(h_id))%900+100}", a.get("hospital_name") or "Hospital", "Hospital Address")
                            )
                    cur.execute(
                        """
                        INSERT INTO appointments (
                            id, patient_id, ticket_number, doctor_id, doctor_name, doctor_specialty,
                            doctor_photo, hospital_name, date, time_slot, type, status, created_at,
                            hospital_id, is_checked_in, checked_in_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                        """,
                        (
                            a_uuid,
                            p_uuid,
                            a.get("ticket_number") or a.get("ticketNumber") or f"TK-{abs(hash(str(a_uuid)))%90000000+10000000}",
                            a.get("doctor_id") or a.get("doctorId") or "doc-1",
                            a.get("doctor_name") or a.get("doctorName") or "Doctor",
                            a.get("doctor_specialty") or a.get("doctorSpecialty") or "General Medicine",
                            a.get("doctor_photo") or a.get("doctorPhoto") or "/doctor_default.jpg",
                            a.get("hospital_name") or a.get("hospitalName") or "Hospital",
                            a.get("date") or datetime.now().strftime("%Y-%m-%d"),
                            a.get("time_slot") or a.get("timeSlot") or "09:00 AM - 10:00 AM",
                            a.get("type") or "In-Person",
                            a.get("status") or "Upcoming",
                            h_id,
                            bool(a.get("is_checked_in", False)),
                            a.get("checked_in_at")
                        )
                    )
                    print(f"Migrated appointment: {a_uuid} for {a.get('patient_name')}")

            conn.commit()

            # 6. Prescriptions
            json_prescriptions = data.get("prescriptions", [])
            for pr in json_prescriptions:
                pr_id = pr.get("id")
                if not pr_id:
                    continue
                pr_uuid = to_valid_uuid(pr_id)
                cur.execute("SELECT id FROM prescriptions WHERE id = %s", (pr_uuid,))
                if not cur.fetchone():
                    p_raw = pr.get("patient_id") or pr.get("patientId")
                    if not p_raw:
                        continue
                    p_uuid = to_valid_uuid(p_raw)
                    # Verify patient exists
                    cur.execute("SELECT id FROM patients WHERE id = %s", (p_uuid,))
                    if not cur.fetchone():
                        cur.execute(
                            "INSERT INTO patients (id, full_name, email) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                            (p_uuid, "Patient", f"patient_{p_uuid[:8]}@example.com")
                        )
                    d_name = pr.get("drug_name") or pr.get("drugName") or "Medication"
                    cur.execute(
                        """
                        INSERT INTO prescriptions (id, patient_id, drug_name, dosage, frequency, prescriber, icon_type, meal_timing, status, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (id) DO NOTHING
                        """,
                        (
                            pr_uuid,
                            p_uuid,
                            d_name,
                            pr.get("dosage") or "1 Tab",
                            pr.get("frequency") or "Twice daily",
                            pr.get("prescriber") or "Treating Physician",
                            pr.get("icon_type") or pr.get("iconType") or "pill",
                            pr.get("meal_timing") or pr.get("mealTiming") or "As directed",
                            pr.get("status") or "Active"
                        )
                    )
                    print(f"Migrated prescription: {pr_uuid} ({d_name})")

            conn.commit()
            print("Migration of database.json into PostgreSQL finished successfully!")

    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
