# backend/routes/admin_routes.py
from fastapi import APIRouter

router = APIRouter(prefix="/api/admin", tags=["Admin Portal"])

# TODO: POST /api/admin/receptionists (create receptionist account)
# TODO: GET /api/admin/receptionists (list all receptionists)
# TODO: PUT /api/admin/receptionists/{id}/deactivate (deactivate receptionist)
