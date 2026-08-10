# backend/models/staff.py
from pydantic import BaseModel, EmailStr
from typing import Optional

class StaffCreate(BaseModel):
    """TODO: Pydantic model for staff account creation."""
    full_name: str
    email: EmailStr
    role: str  # admin, receptionist, doctor
    password: Optional[str] = None

class StaffOut(BaseModel):
    """TODO: Pydantic model for staff account response."""
    id: str
    full_name: str
    email: EmailStr
    role: str
    is_active: bool = True

class StaffLogin(BaseModel):
    """TODO: Pydantic model for staff credential login."""
    email: EmailStr
    password: str
