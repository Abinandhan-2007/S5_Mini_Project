# backend/routes/doctor_routes.py
from fastapi import APIRouter

router = APIRouter(prefix="/api/doctor", tags=["Doctor Portal"])

# TODO: GET /api/doctor/patients (view assigned patients and queue)
# TODO: POST /api/doctor/consultations (create consultation SOAP record and prescription)
