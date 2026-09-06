import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
import database

def migrate():
    print("Applying SuperAdmin database changes to PostgreSQL...")
    conn = database.get_pg_connection()
    with conn.cursor() as cur:
        # 1. Update staff_role_check constraint
        print("1. Updating staff_role_check constraint...")
        cur.execute("ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;")
        cur.execute("""
            ALTER TABLE staff ADD CONSTRAINT staff_role_check 
            CHECK (role IN ('superadmin', 'admin', 'receptionist', 'doctor'));
        """)
        print("   [OK] staff_role_check constraint updated.")

        # 2. Update generate_staff_code trigger function
        print("2. Updating generate_staff_code() function...")
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
                    -- SuperAdmin has global scope: SA + 3-digit sequence starting at 101 (e.g. SA101, SA102)
                    IF NEW.role = 'superadmin' THEN
                        SELECT COUNT(*) INTO staff_count 
                        FROM staff 
                        WHERE role = 'superadmin' 
                          AND (NEW.id IS NULL OR id <> NEW.id);
                        seq_num := 101 + staff_count;
                        NEW.staff_code := 'SA' || LPAD(seq_num::text, 3, '0');
                        RETURN NEW;
                    END IF;

                    -- 1. Determine Role Letter for hospital staff
                    IF NEW.role = 'admin' THEN
                        role_letter := 'A';
                    ELSIF NEW.role = 'doctor' THEN
                        role_letter := 'D';
                    ELSIF NEW.role = 'receptionist' THEN
                        role_letter := 'R';
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
        print("   [OK] generate_staff_code() function updated.")

    conn.commit()
    print("All database schema changes applied and committed successfully!")

if __name__ == "__main__":
    migrate()
