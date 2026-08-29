# backend/models/appointment.py
from pydantic import BaseModel
from typing import Optional

class AppointmentCreate(BaseModel):
    """Pydantic model for creating a staff-managed appointment."""
    patient_id: str
    doctor_id: str
    hospital_id: Optional[str] = None
    date: str
    time_slot: str
    type: Optional[str] = "In-Person"

class AppointmentOut(BaseModel):
    """Pydantic model for returning staff appointment details."""
    id: str
    patient_id: str
    doctor_id: str
    hospital_id: Optional[str] = None
    date: str
    time_slot: str
    status: str
