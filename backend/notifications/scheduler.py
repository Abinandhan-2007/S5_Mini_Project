# backend/notifications/scheduler.py
"""
Background Scheduler for CarePulse using APScheduler.
Automates:
1. Scheduled Appointment Reminders (runs every 5-10 minutes for upcoming appointments in 30-60 mins).
2. Recurring Medication Reminders (runs every 15 minutes parsing prescription frequency).
"""

import sys
import re
import logging
from datetime import datetime, date, time, timedelta
from typing import List, Tuple, Optional
from pathlib import Path

# Ensure backend root is on path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from apscheduler.schedulers.asyncio import AsyncIOScheduler
import database
from database import get_pg_connection, read_json_db
from notifications.fcm_service import (
    send_push_notification,
    log_notification,
    is_notification_already_sent
)

logger = logging.getLogger("carepulse.scheduler")

scheduler = AsyncIOScheduler()


def parse_time_slot_start(time_slot: str, base_date: date) -> Optional[datetime]:
    """
    Parse starting time from appointment slot strings such as:
    - '10:30 AM'
    - '09:00 AM - 10:00 AM'
    - '02:00 PM - 03:00 PM'
    - '14:30'
    """
    if not time_slot:
        return None

    cleaned = time_slot.strip().split("-")[0].strip()
    patterns = [
        ("%I:%M %p", True),   # 10:30 AM
        ("%I %p", True),      # 10 AM
        ("%H:%M", False),     # 14:30
    ]

    for fmt, _ in patterns:
        try:
            parsed_time = datetime.strptime(cleaned, fmt).time()
            return datetime.combine(base_date, parsed_time)
        except ValueError:
            continue

    return None


def parse_prescription_frequency_times(frequency_str: str) -> List[Tuple[int, int]]:
    """
    Parse prescriptions.frequency into a list of (hour, minute) reminder times:
    - 'Once daily' / 'Once a day' / '1 time a day' -> [(9, 0)] (9:00 AM)
    - 'Twice daily' / 'Twice a day' / '1-0-1' -> [(9, 0), (21, 0)] (9:00 AM, 9:00 PM)
    - 'Three times daily' / 'Thrice a day' / '1-1-1' -> [(8, 0), (14, 0), (20, 0)] (8:00 AM, 2:00 PM, 8:00 PM)
    - 'Four times daily' / '1-1-1-1' -> [(8, 0), (12, 0), (16, 0), (20, 0)]
    - 'Every 8 hours' -> [(6, 0), (14, 0), (22, 0)]
    - 'Every 12 hours' -> [(8, 0), (20, 0)]
    """
    text = (frequency_str or "").strip().lower()

    if "four" in text or "4 times" in text or text == "1-1-1-1":
        return [(8, 0), (12, 0), (16, 0), (20, 0)]
    elif "three" in text or "thrice" in text or "3 times" in text or text == "1-1-1":
        return [(8, 0), (14, 0), (20, 0)]
    elif "twice" in text or "2 times" in text or text == "1-0-1" or "every 12 hours" in text:
        return [(9, 0), (21, 0)]
    elif "every 8 hours" in text:
        return [(6, 0), (14, 0), (22, 0)]
    elif "once" in text or "1 time" in text or text == "1-0-0" or text == "0-0-1":
        return [(9, 0)]
    else:
        # Default fallback
        return [(9, 0)]


async def check_upcoming_appointment_reminders():
    """
    Runs periodically (e.g. every 5-10 mins).
    Finds appointments due in the next 30-60 minutes with status='Upcoming',
    checks notification_log to prevent duplicate sends, and dispatches FCM push.
    """
    now = datetime.now()
    today = now.date()
    window_start = now + timedelta(minutes=25)
    window_end = now + timedelta(minutes=65)

    logger.info(f"⏰ [SCHEDULER] Checking appointment reminders around window {window_start.strftime('%H:%M')} - {window_end.strftime('%H:%M')}")

    appointments_to_remind = []

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, patient_id, doctor_name, date, time_slot, status
                        FROM appointments
                        WHERE status = 'Upcoming' AND date >= CURRENT_DATE AND date <= CURRENT_DATE + INTERVAL '1 day'
                        """
                    )
                    rows = cur.fetchall()
                    for r in rows:
                        app_date = r["date"] if isinstance(r["date"], date) else datetime.strptime(str(r["date"]), "%Y-%m-%d").date()
                        slot_start = parse_time_slot_start(r["time_slot"], app_date)
                        if slot_start and window_start <= slot_start <= window_end:
                            appointments_to_remind.append({
                                "id": str(r["id"]),
                                "patient_id": str(r["patient_id"]),
                                "doctor_name": r["doctor_name"],
                                "date": str(r["date"]),
                                "time_slot": r["time_slot"]
                            })
        except Exception as e:
            logger.error(f"Error querying appointments for reminders: {e}")
    else:
        db = read_json_db()
        for a in db.get("appointments", []):
            if a.get("status") == "Upcoming" and a.get("date") and a.get("patient_id"):
                try:
                    app_date = datetime.strptime(str(a["date"]), "%Y-%m-%d").date()
                    slot_start = parse_time_slot_start(a.get("time_slot", ""), app_date)
                    if slot_start and window_start <= slot_start <= window_end:
                        appointments_to_remind.append({
                            "id": str(a["id"]),
                            "patient_id": str(a["patient_id"]),
                            "doctor_name": a.get("doctor_name", "Doctor"),
                            "date": str(a["date"]),
                            "time_slot": a.get("time_slot", "")
                        })
                except Exception:
                    continue

    for app in appointments_to_remind:
        p_id = app["patient_id"]
        app_id = app["id"]
        doc_name = app["doctor_name"]
        slot = app["time_slot"]

        if not is_notification_already_sent(p_id, "appointment_reminder", app_id):
            title = "Upcoming Appointment Reminder"
            body = f"Your appointment with {doc_name} is in 30 minutes at {slot}."
            data = {
                "type": "appointment_reminder",
                "screen": "/history",
                "appointment_id": app_id,
                "patient_id": p_id,
                "time_slot": slot
            }
            send_push_notification(p_id, title, body, data)
            log_notification(p_id, "appointment_reminder", app_id)
            logger.info(f"📢 Dispatched appointment reminder to patient {p_id} for appointment {app_id}")


async def check_medication_reminders():
    """
    Runs periodically (e.g. every 15 minutes).
    Checks active prescriptions, computes daily reminder times from frequency,
    and sends at most once per scheduled time per day.
    """
    now = datetime.now()
    today_str = now.strftime("%Y%m%d")
    logger.info(f"💊 [SCHEDULER] Checking medication reminders at {now.strftime('%H:%M')}")

    prescriptions = []

    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, patient_id, drug_name, dosage, frequency 
                        FROM prescriptions
                        """
                    )
                    rows = cur.fetchall()
                    for r in rows:
                        prescriptions.append({
                            "id": str(r["id"]),
                            "patient_id": str(r["patient_id"]),
                            "drug_name": r["drug_name"],
                            "dosage": r.get("dosage") or "",
                            "frequency": r.get("frequency") or "Once daily"
                        })
        except Exception as e:
            logger.error(f"Error querying prescriptions for reminders: {e}")
    else:
        db = read_json_db()
        for p in db.get("prescriptions", []):
            if p.get("patient_id") and p.get("drug_name"):
                prescriptions.append({
                    "id": str(p["id"]),
                    "patient_id": str(p["patient_id"]),
                    "drug_name": p["drug_name"],
                    "dosage": p.get("dosage", ""),
                    "frequency": p.get("frequency", "Once daily")
                })

    for rx in prescriptions:
        p_id = rx["patient_id"]
        rx_id = rx["id"]
        drug_name = rx["drug_name"]
        dosage = rx["dosage"]
        times = parse_prescription_frequency_times(rx["frequency"])

        for hr, mn in times:
            scheduled_time = now.replace(hour=hr, minute=mn, second=0, microsecond=0)
            # If current time is within +/- 15 mins of scheduled time
            diff_minutes = abs((now - scheduled_time).total_seconds()) / 60.0
            if diff_minutes <= 15.0:
                dedup_type = f"med_reminder_{hr:02d}{mn:02d}_{today_str}"
                if not is_notification_already_sent(p_id, dedup_type, rx_id):
                    title = "Medication Reminder"
                    body = f"Time to take your {drug_name} ({dosage})" if dosage else f"Time to take your {drug_name}"
                    data = {
                        "type": "medication_reminder",
                        "screen": "/history",
                        "prescription_id": rx_id,
                        "patient_id": p_id,
                        "drug_name": drug_name
                    }
                    send_push_notification(p_id, title, body, data)
                    log_notification(p_id, dedup_type, rx_id)
                    logger.info(f"📢 Dispatched medication reminder to patient {p_id} for {drug_name}")


def start_scheduler():
    """Start APScheduler jobs."""
    if not scheduler.running:
        scheduler.add_job(
            check_upcoming_appointment_reminders,
            "interval",
            minutes=5,
            id="appointment_reminders_job",
            replace_existing=True
        )
        scheduler.add_job(
            check_medication_reminders,
            "interval",
            minutes=15,
            id="medication_reminders_job",
            replace_existing=True
        )
        scheduler.start()
        logger.info("🚀 APScheduler started successfully with appointment & medication reminder jobs.")


def shutdown_scheduler():
    """Shutdown APScheduler jobs cleanly."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("🛑 APScheduler shut down cleanly.")
