#!/usr/bin/env python3
"""
CarePulse Database Friendly Views Migration Script.

Creates pre-joined human-readable PostgreSQL views for easy inspection in database GUIs
(DBeaver, pgAdmin, TablePlus, VS Code Database Client):
- v_appointments: Shows patient_code, patient_name, doctor_name, hospital_name, date, time, status.
- v_consultations: Shows patient_code, patient_name, doctor_name, diagnosis, clinical plan.
- v_prescriptions: Shows patient_code, patient_name, drug_name, dosage, meal_timing, prescriber.
- v_queue_tokens: Shows token_number, patient_code, patient_name, doctor_name, hospital_name, status.
- v_patients: Shows patient_code (P000001), full_name, email, phone, gender, blood_group.

Also backfills any missing patient_code (P000001+) and hospital_code (H001+) on existing records.
"""

import sys
import logging
from pathlib import Path

# Setup import path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from database import get_pg_connection, use_pg, db_conn_info, INIT_SQL_PATH

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("carepulse.views")


MIGRATION_SQL = """
-- 1. Ensure patient_code column and sequence exists
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_code VARCHAR(20) UNIQUE;
CREATE SEQUENCE IF NOT EXISTS patient_code_seq START 1;

-- Backfill missing patient_codes (e.g. P000001, P000002)
DO $$
DECLARE
    r RECORD;
    new_code VARCHAR(20);
BEGIN
    FOR r IN SELECT id FROM patients WHERE patient_code IS NULL OR patient_code = '' ORDER BY created_at ASC, id ASC LOOP
        new_code := 'P' || LPAD(nextval('patient_code_seq')::text, 6, '0');
        UPDATE patients SET patient_code = new_code WHERE id = r.id;
    END LOOP;
END $$;

-- 2. Ensure hospital_code column and sequence exists
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS hospital_code VARCHAR(20) UNIQUE;
CREATE SEQUENCE IF NOT EXISTS hospital_code_seq START 1;

-- Backfill missing hospital_codes (e.g. H001, H002)
UPDATE hospitals
SET hospital_code = 'H' || LPAD(REGEXP_REPLACE(id, '[^0-9]', '', 'g')::text, 3, '0')
WHERE (hospital_code IS NULL OR hospital_code = '') AND id ~ '[0-9]';

DO $$
DECLARE
    r RECORD;
    new_code VARCHAR(20);
BEGIN
    FOR r IN SELECT id FROM hospitals WHERE hospital_code IS NULL OR hospital_code = '' ORDER BY created_at ASC, id ASC LOOP
        new_code := 'H' || LPAD(nextval('hospital_code_seq')::text, 3, '0');
        UPDATE hospitals SET hospital_code = new_code WHERE id = r.id;
    END LOOP;
END $$;

-- Ensure prescriptions table has status column
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';

-- 3. Friendly View: v_appointments
-- Replaces raw patient UUID with patient_code (P000001) and patient_name (Sarah Jenkins)
CREATE OR REPLACE VIEW v_appointments AS
SELECT 
    a.id AS appointment_id,
    a.ticket_number,
    p.patient_code,
    p.full_name AS patient_name,
    p.phone AS patient_phone,
    p.email AS patient_email,
    COALESCE(s.staff_code, a.doctor_id) AS doctor_code,
    a.doctor_name,
    a.doctor_specialty,
    h.hospital_code,
    a.hospital_name,
    a.date AS appointment_date,
    a.time_slot,
    a.type,
    a.status,
    a.created_at
FROM appointments a
LEFT JOIN patients p ON a.patient_id = p.id
LEFT JOIN hospitals h ON a.hospital_id = h.id
LEFT JOIN staff s ON a.doctor_id = s.doctor_id AND s.role = 'doctor';

-- 4. Friendly View: v_consultations
-- Replaces raw patient UUID with patient_code and patient_name
CREATE OR REPLACE VIEW v_consultations AS
SELECT 
    c.id AS consultation_id,
    p.patient_code,
    p.full_name AS patient_name,
    p.phone AS patient_phone,
    p.gender AS patient_gender,
    COALESCE(s.staff_code, c.doctor_id) AS doctor_code,
    c.doctor_name,
    h.hospital_code,
    h.name AS hospital_name,
    c.date AS consultation_date,
    c.soap_data->>'subjective' AS subjective_symptoms,
    c.soap_data->>'assessment' AS diagnosis,
    c.soap_data->>'plan' AS treatment_plan,
    c.created_at
FROM consultations c
LEFT JOIN patients p ON c.patient_id = p.id
LEFT JOIN hospitals h ON c.hospital_id = h.id
LEFT JOIN staff s ON c.doctor_id = s.doctor_id AND s.role = 'doctor';

-- 5. Friendly View: v_prescriptions
-- Replaces raw patient UUID with patient_code and patient_name
CREATE OR REPLACE VIEW v_prescriptions AS
SELECT 
    pr.id AS prescription_id,
    p.patient_code,
    p.full_name AS patient_name,
    pr.drug_name,
    pr.dosage,
    pr.frequency,
    pr.meal_timing,
    pr.prescriber AS doctor_name,
    COALESCE(pr.status, 'Active') AS status,
    pr.created_at
FROM prescriptions pr
LEFT JOIN patients p ON pr.patient_id = p.id;

-- 5. Friendly View: v_staff_directory
-- Shows staff_code (D001101, R001101, A001101), full_name, role, hospital_code, hospital_name
CREATE OR REPLACE VIEW v_staff_directory AS
SELECT 
    s.id AS staff_id,
    s.staff_code,
    s.full_name,
    s.role,
    s.specialization,
    s.email,
    s.phone,
    h.hospital_code,
    h.name AS hospital_name,
    s.is_active,
    s.created_at
FROM staff s
LEFT JOIN hospitals h ON s.hospital_id = h.id;

-- 7. Friendly View: v_patients
-- Shows patient_code prominently alongside patient profile
CREATE OR REPLACE VIEW v_patients AS
SELECT 
    p.patient_code,
    p.full_name,
    p.email,
    p.phone,
    p.dob,
    p.gender,
    p.blood_group,
    p.id AS patient_uuid,
    p.created_at
FROM patients p;
"""


def apply_friendly_views():
    logger.info("Applying friendly database views and backfilling patient codes...")
    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(MIGRATION_SQL)
                conn.commit()

                # Verify creation
                cur.execute(
                    """
                    SELECT table_name 
                    FROM information_schema.views 
                    WHERE table_schema = 'public' AND table_name LIKE 'v_%'
                    ORDER BY table_name;
                    """
                )
                views = [row["table_name"] for row in cur.fetchall()]
                logger.info(f"✅ Successfully created / updated database views: {views}")

                # Query sample from v_appointments
                cur.execute(
                    """
                    SELECT ticket_number, patient_code, patient_name, doctor_name, hospital_name, appointment_date
                    FROM v_appointments
                    LIMIT 5;
                    """
                )
                samples = cur.fetchall()
                logger.info("================================================================================")
                logger.info("📋 Sample from 'v_appointments':")
                for s in samples:
                    logger.info(
                        f"   Ticket: {s['ticket_number']} | Patient: [{s['patient_code']}] {s['patient_name']} "
                        f"| Doctor: {s['doctor_name']} | Hospital: {s['hospital_name']} | Date: {s['appointment_date']}"
                    )
                logger.info("================================================================================")
        return True
    except Exception as e:
        logger.error(f"Failed to apply database views: {e}")
        return False


if __name__ == "__main__":
    success = apply_friendly_views()
    sys.exit(0 if success else 1)
