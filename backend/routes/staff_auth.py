# backend/routes/staff_auth.py
from fastapi import APIRouter

router = APIRouter(prefix="/api/staff", tags=["Staff Auth"])

# TODO: POST /api/staff/login (credential login for admin/receptionist/doctor)
# TODO: POST /api/staff/google (Google OAuth for staff with whitelist verification)
