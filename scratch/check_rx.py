import sys
sys.path.insert(0, 'backend')
import database
database.init_db()
from database import get_pg_connection
with get_pg_connection() as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) as cnt FROM prescriptions WHERE patient_id::text = 'e4bd8dc5-20f7-4f25-bac5-e2cd25bc3573'")
        row = cur.fetchone()
        print('Prescriptions for Abhinandhan:', row['cnt'])
