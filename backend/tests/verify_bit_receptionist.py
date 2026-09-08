import sys
sys.path.append('backend')
import database
database.init_db()
from routes.receptionist_routes import checkin_appointment, fetch_all_tokens_from_db
from core.security import create_jwt

# Create valid receptionist auth token with type="staff"
rec_token = create_jwt({
    "sub": "933577d3-cd9a-46e8-a160-7a02760e623d",
    "staff_id": "933577d3-cd9a-46e8-a160-7a02760e623d",
    "role": "receptionist",
    "hospital_id": "hosp-bit-8bef29",
    "email": "nagu@bitsathy",
    "type": "staff"
})
auth_header = f"Bearer {rec_token}"
staff_ctx = {'staff_id': '933577d3-cd9a-46e8-a160-7a02760e623d', 'role': 'receptionist', 'hospital_id': 'hosp-bit-8bef29', 'is_authenticated': True}

# 1. Check bookings roster
bookings = fetch_all_tokens_from_db(hospital_id='hosp-bit-8bef29', staff_ctx=staff_ctx, checked_in_only=False)
print(f"--- 1. PRE-CHECKIN BOOKINGS ROSTER (count = {len(bookings)}) ---")
for b in bookings:
    print(f"Ticket: {b['ticketNumber']} | Patient: {b['patientName']} | Status: {b['status']} | CheckedIn: {b['isCheckedIn']} | Slot: {b['timeSlot']}")

# 2. Check live queue before check-in
tokens = fetch_all_tokens_from_db(hospital_id='hosp-bit-8bef29', staff_ctx=staff_ctx, checked_in_only=True)
print(f"--- 2. LIVE QUEUE BEFORE CHECK-IN (count = {len(tokens)}) ---")

# 3. Perform check-in on TK-484
conn = database.get_pg_connection()
cur = conn.cursor()
cur.execute("SELECT id FROM appointments WHERE ticket_number = 'TK-484'")
row = cur.fetchone()
appt_id = str(row['id'])
conn.close()

res = checkin_appointment(appt_id, authorization=auth_header)
print(f"--- 3. CHECK-IN ENDPOINT RESULT ---")
print(f"Success: {res.get('success')} | Effective Queue Position: {res.get('effectiveQueuePosition')} | CheckedInAt: {res.get('checkedInAt')}")

# 4. Check live queue after check-in
tokens_after = fetch_all_tokens_from_db(hospital_id='hosp-bit-8bef29', staff_ctx=staff_ctx, checked_in_only=True)
print(f"--- 4. LIVE QUEUE AFTER CHECK-IN (count = {len(tokens_after)}) ---")
for t in tokens_after:
    print(f"Token: {t['tokenNumber']} | Ticket: {t['ticketNumber']} | Patient: {t['patientName']} | Status: {t['status']} | EffPos: {t.get('effectiveQueueTime')}")

# 5. Reset TK-484 back to pre-booked Upcoming state for user testing
conn = database.get_pg_connection()
cur = conn.cursor()
cur.execute("UPDATE appointments SET status = 'Upcoming', is_checked_in = FALSE, checked_in_at = NULL WHERE ticket_number = 'TK-484'")
conn.commit()
conn.close()
print("--- 5. RESET TK-484 BACK TO PRE-BOOKED UPCOMING STATE FOR USER DEMO ---")
