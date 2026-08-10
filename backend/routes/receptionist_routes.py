# backend/routes/receptionist_routes.py
from fastapi import APIRouter

router = APIRouter(prefix="/api/receptionist", tags=["Receptionist Portal"])

# TODO: POST /api/receptionist/doctors (create doctor profile)
# TODO: GET /api/receptionist/doctors (list active doctors)
# TODO: POST /api/receptionist/appointments (book appointment for walk-in/call-in patient)
# TODO: PUT /api/receptionist/appointments/{id}/checkin (patient check-in & token generation)
