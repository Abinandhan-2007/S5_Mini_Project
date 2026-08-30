# backend/models/staff.py
from pydantic import BaseModel, EmailStr
from typing import Optional

class StaffCreate(BaseModel):
    """Pydantic model for staff account creation."""
    full_name: str
    email: EmailStr
    role: str  # admin, receptionist, doctor
    password: Optional[str] = None
    staff_code: Optional[str] = None
    staffCode: Optional[str] = None
    phone: Optional[str] = ""
    avatar_url: Optional[str] = ""
    specialization: Optional[str] = ""
    hospital_id: Optional[str] = None

class StaffOut(BaseModel):
    """Pydantic model for staff account response."""
    id: str
    staff_code: Optional[str] = None
    staffCode: Optional[str] = None
    full_name: str
    name: Optional[str] = None
    email: EmailStr
    role: str
    is_active: bool = True
    isActive: Optional[bool] = None
    phone: Optional[str] = ""
    avatar_url: Optional[str] = ""
    avatarUrl: Optional[str] = ""
    department: Optional[str] = ""
    specialization: Optional[str] = ""
    hospital_id: Optional[str] = None
    hospitalId: Optional[str] = None
    doctor_id: Optional[str] = None
    doctorId: Optional[str] = None

class StaffLogin(BaseModel):
    """Pydantic model for staff credential login."""
    email: EmailStr
    password: str
