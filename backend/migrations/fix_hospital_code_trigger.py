import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import database

def apply_fix():
    print("Connecting to PostgreSQL...")
    with database.get_pg_connection() as conn:
        with conn.cursor() as cur:
            # 1. Update the function to never truncate and check for existing codes
            cur.execute("""
            CREATE OR REPLACE FUNCTION public.generate_hospital_code()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            DECLARE
                seq_val BIGINT;
            BEGIN
                IF NEW.hospital_code IS NULL OR NEW.hospital_code = '' THEN
                    LOOP
                        seq_val := nextval('hospital_code_seq');
                        NEW.hospital_code := 'H' || LPAD(seq_val::text, GREATEST(3, LENGTH(seq_val::text)), '0');
                        EXIT WHEN NOT EXISTS (SELECT 1 FROM hospitals WHERE hospital_code = NEW.hospital_code);
                    END LOOP;
                END IF;
                RETURN NEW;
            END;
            $$;
            """)
            print("✅ Updated function generate_hospital_code() successfully.")

            # 2. Reset sequence to the actual max existing numeric code
            cur.execute("""
                SELECT setval('hospital_code_seq', GREATEST(
                    (SELECT COALESCE(MAX(SUBSTRING(hospital_code FROM 2)::BIGINT), 0) FROM hospitals WHERE hospital_code ~ '^H[0-9]+$'),
                    1
                ), true);
            """)
            val = cur.fetchone()
            print(f"✅ Reset sequence hospital_code_seq to: {val}")

            # 3. Sync any missing hospitals from database.json into PostgreSQL
            db = database.read_json_db()
            json_hosps = db.get("hospitals", [])
            synced_count = 0
            for h in json_hosps:
                h_id = h.get("id")
                if not h_id:
                    continue
                cur.execute("SELECT id FROM hospitals WHERE id = %s", (h_id,))
                if not cur.fetchone():
                    name = h.get("name", "Unnamed Hospital")
                    address = h.get("address", "Hospital Address")
                    phone = h.get("phone", "")
                    email = h.get("email", "")
                    facility_type = h.get("facility_type", "General Hospital")
                    rating = float(h.get("rating") or 4.8)
                    reviews_count = int(h.get("reviews_count") or 0)
                    emergency_available = bool(h.get("emergency_available", True))
                    image_url = h.get("image_url", "")
                    specialties = h.get("specialties") or ["General Medicine"]
                    lat = h.get("latitude")
                    lng = h.get("longitude")

                    cur.execute("""
                        INSERT INTO hospitals (
                            id, name, address, phone, email, facility_type,
                            rating, reviews_count, emergency_available,
                            image_url, specialties, distance_miles, is_active,
                            latitude, longitude
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, 1.0, true,
                            %s, %s
                        )
                        RETURNING id, hospital_code, name;
                    """, (
                        h_id, name, address, phone, email, facility_type,
                        rating, reviews_count, emergency_available,
                        image_url, specialties, lat, lng
                    ))
                    inserted = cur.fetchone()
                    synced_count += 1
                    print(f"   [SYNCED] Added hospital from JSON to PostgreSQL: {inserted['name']} ({inserted['hospital_code']})")

            conn.commit()
            print(f"✅ Synced {synced_count} missing hospitals into PostgreSQL.")

if __name__ == "__main__":
    apply_fix()
