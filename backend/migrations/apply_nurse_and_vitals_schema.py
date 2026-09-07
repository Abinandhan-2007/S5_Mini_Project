# backend/migrations/apply_nurse_and_vitals_schema.py
import sys
import os

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
from database import get_pg_connection

def apply_migration():
    print("[INFO] Applying Nurse role & Vitals/LabTests schema migration...")
    database.init_db()

    if not database.use_pg:
        print("[WARN] PostgreSQL not enabled. Skipping SQL migration.")
        return

    with get_pg_connection() as conn:
        with conn.cursor() as cur:
            # 1. Update staff role CHECK constraint to include 'nurse'
            print("[INFO] Updating staff_role_check constraint...")
            cur.execute("ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;")
            cur.execute("""
                ALTER TABLE staff ADD CONSTRAINT staff_role_check 
                CHECK (role IN ('superadmin', 'admin', 'receptionist', 'doctor', 'nurse'));
            """)

            # 2. Update generate_staff_code() trigger function to explicitly map role='nurse' -> 'N'
            print("[INFO] Updating generate_staff_code() trigger function with explicit role='nurse' -> 'N' mapping...")
            cur.execute("""
            CREATE OR REPLACE FUNCTION generate_staff_code()
            RETURNS TRIGGER AS $$
            DECLARE
                h_code VARCHAR(20);
                h_num VARCHAR(10);
                role_letter CHAR(1);
                staff_count INT;
                seq_num INT;
            BEGIN
                IF NEW.staff_code IS NULL OR NEW.staff_code = '' THEN
                    -- Special handling for SuperAdmin: Global scope, format SA101, SA102...
                    IF NEW.role = 'superadmin' THEN
                        SELECT COUNT(*) INTO staff_count 
                        FROM staff 
                        WHERE role = 'superadmin' 
                          AND (NEW.id IS NULL OR id <> NEW.id);
                        seq_num := 101 + staff_count;
                        NEW.staff_code := 'SA' || LPAD(seq_num::text, 3, '0');
                        RETURN NEW;
                    END IF;

                    -- 1. Explicit Role Letter Mapping (Enforces 'N' strictly for nurse)
                    IF NEW.role = 'admin' THEN
                        role_letter := 'A';
                    ELSIF NEW.role = 'doctor' THEN
                        role_letter := 'D';
                    ELSIF NEW.role = 'receptionist' THEN
                        role_letter := 'R';
                    ELSIF NEW.role = 'nurse' THEN
                        role_letter := 'N';
                    ELSE
                        role_letter := 'S';
                    END IF;

                    -- 2. Lookup Hospital 3-digit number from hospital_code (or hospital_id fallback)
                    h_num := '001';
                    IF NEW.hospital_id IS NOT NULL THEN
                        SELECT hospital_code INTO h_code FROM hospitals WHERE id = NEW.hospital_id;
                        IF h_code IS NOT NULL AND h_code <> '' THEN
                            h_num := LPAD(REGEXP_REPLACE(h_code, '[^0-9]', '', 'g'), 3, '0');
                        ELSE
                            h_num := LPAD(REGEXP_REPLACE(NEW.hospital_id, '[^0-9]', '', 'g'), 3, '0');
                        END IF;
                    END IF;
                    IF h_num IS NULL OR h_num = '' THEN
                        h_num := '001';
                    END IF;

                    -- 3. Calculate sequence number within hospital for this role (STARTING AT 101)
                    IF NEW.hospital_id IS NOT NULL THEN
                        SELECT COUNT(*) INTO staff_count 
                        FROM staff 
                        WHERE hospital_id = NEW.hospital_id 
                          AND role = NEW.role 
                          AND (NEW.id IS NULL OR id <> NEW.id);
                    ELSE
                        SELECT COUNT(*) INTO staff_count 
                        FROM staff 
                        WHERE hospital_id IS NULL 
                          AND role = NEW.role 
                          AND (NEW.id IS NULL OR id <> NEW.id);
                    END IF;

                    seq_num := 101 + staff_count;
                    NEW.staff_code := role_letter || h_num || LPAD(seq_num::text, 3, '0');
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            """)

            # 3. Create vitals table
            print("[INFO] Creating vitals table...")
            cur.execute("""
            CREATE TABLE IF NOT EXISTS vitals (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
                patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
                height_cm NUMERIC,
                weight_kg NUMERIC,
                bmi NUMERIC GENERATED ALWAYS AS (
                    CASE WHEN height_cm > 0 THEN ROUND(weight_kg / ((height_cm/100.0) * (height_cm/100.0)), 1) ELSE NULL END
                ) STORED,
                bp_systolic INTEGER,
                bp_diastolic INTEGER,
                heart_rate INTEGER,
                temperature NUMERIC,
                temperature_unit VARCHAR(1) DEFAULT 'C',
                respiratory_rate INTEGER,
                spo2 INTEGER,
                blood_glucose NUMERIC,
                glucose_context VARCHAR(20), -- fasting, random, post-meal
                notes TEXT,
                recorded_by UUID REFERENCES staff(id) ON DELETE SET NULL,
                recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_vitals_appointment_id ON vitals(appointment_id);
            CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON vitals(patient_id);
            """)

            # 4. Create lab_tests table
            print("[INFO] Creating lab_tests table...")
            cur.execute("""
            CREATE TABLE IF NOT EXISTS lab_tests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
                patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
                test_type VARCHAR(100) NOT NULL,
                structured_results JSONB DEFAULT '{}'::jsonb,
                free_text_result TEXT,
                file_url TEXT,
                status VARCHAR(20) DEFAULT 'ordered', -- ordered, in_progress, completed
                ordered_by UUID REFERENCES staff(id) ON DELETE SET NULL,
                recorded_by UUID REFERENCES staff(id) ON DELETE SET NULL,
                recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_lab_tests_appointment_id ON lab_tests(appointment_id);
            CREATE INDEX IF NOT EXISTS idx_lab_tests_patient_id ON lab_tests(patient_id);
            """)

            conn.commit()
            print("[SUCCESS] Nurse role and Vitals/LabTests schema migration successfully applied!")

if __name__ == "__main__":
    apply_migration()
