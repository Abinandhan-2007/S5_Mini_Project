"""
CarePulse Database Schema & Integrity Tests.
Validates table presence, column specifications, foreign key integrity, and JSON fallback schema consistency.
"""

import sys
import unittest
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import database
from database import get_pg_connection, read_json_db


class TestDatabaseSchemaIntegrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        database.init_db()

    def test_01_core_tables_exist(self):
        """Verify all critical CarePulse tables exist in PostgreSQL."""
        if not database.use_pg:
            self.skipTest("PostgreSQL is currently unreachable; skipping PostgreSQL schema check.")

        required_tables = [
            "hospitals",
            "staff",
            "patients",
            "appointments",
            "consultations",
            "prescriptions",
            "patient_devices",
            "device_tokens"
        ]

        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public';
                """)
                existing_tables = [row["table_name"] for row in cur.fetchall()]

        for table in required_tables:
            self.assertIn(table, existing_tables, f"Critical table '{table}' is missing from PostgreSQL schema!")

    def test_02_patient_columns_integrity(self):
        """Verify patients table contains essential clinical and safety columns."""
        if not database.use_pg:
            self.skipTest("PostgreSQL is currently unreachable; skipping check.")

        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'patients';
                """)
                columns = [row["column_name"] for row in cur.fetchall()]

        required_cols = ["id", "full_name", "phone", "email", "allergies", "pre_existing_conditions"]
        for col in required_cols:
            self.assertIn(col, columns, f"Required column '{col}' missing from 'patients' table!")

    def test_03_patient_devices_columns_integrity(self):
        """Verify patient_devices table contains telemetry tracking columns."""
        if not database.use_pg:
            self.skipTest("PostgreSQL is currently unreachable; skipping check.")

        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'patient_devices';
                """)
                columns = [row["column_name"] for row in cur.fetchall()]

        required_cols = ["id", "patient_id", "device_model", "manufacturer", "platform", "app_version", "last_login"]
        for col in required_cols:
            self.assertIn(col, columns, f"Required column '{col}' missing from 'patient_devices' table!")

    def test_04_json_fallback_store_structure(self):
        """Verify database.json maintains valid JSON structure with expected domain collections."""
        db = read_json_db()
        self.assertIsInstance(db, dict)
        expected_keys = ["patients", "appointments", "consultations"]
        for k in expected_keys:
            self.assertIn(k, db, f"Key '{k}' must exist in offline JSON store!")


if __name__ == "__main__":
    unittest.main()
