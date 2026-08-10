# backend/routes/appointment_routes.py
from fastapi import APIRouter

router = APIRouter(prefix="/api/staff/appointments", tags=["Staff Appointments"])

# TODO: GET /api/staff/appointments (shared appointment calendar & status management)
# TODO: PUT /api/staff/appointments/{id}/status (update status: completed, cancelled, in-progress)
