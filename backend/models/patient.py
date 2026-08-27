# backend/models/patient.py
"""
Patient SQLAlchemy ORM model and companion schemas.
Matches the patients table schema defined in database/init.sql.
"""

import uuid
from datetime import datetime, date
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr

try:
    from sqlalchemy import Column, String, Date, DateTime, Text, func  # type: ignore
    from sqlalchemy.dialects.postgresql import UUID  # type: ignore
    from sqlalchemy.orm import declarative_base  # type: ignore

    Base = declarative_base()

    class Patient(Base):
        """SQLAlchemy ORM model for patients table."""
        __tablename__ = "patients"

        id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        full_name = Column(String(255), nullable=False)
        email = Column(String(255), unique=True, nullable=False, index=True)
        phone = Column(String(50), default="")
        dob = Column(Date, default=func.current_date)
        gender = Column(String(50), default="Not specified")
        blood_group = Column(String(10), default="O+")
        address = Column(Text, default="")
        avatar_url = Column(Text, default="")
        google_id = Column(String(255), unique=True, nullable=True)
        auth_provider = Column(String(50), default="local")
        password_hash = Column(String(255), nullable=True)
        created_at = Column(DateTime(timezone=True), default=func.now(), server_default=func.now())

        def __repr__(self) -> str:
            return f"<Patient(id={self.id}, full_name='{self.full_name}', email='{self.email}')>"

        def to_dict(self) -> Dict[str, Any]:
            return {
                "id": str(self.id) if self.id else None,
                "full_name": self.full_name,
                "email": self.email,
                "phone": self.phone,
                "dob": str(self.dob) if self.dob else "",
                "gender": self.gender,
                "blood_group": self.blood_group,
                "address": self.address,
                "avatar_url": self.avatar_url,
                "google_id": self.google_id,
                "auth_provider": self.auth_provider,
                "created_at": self.created_at.isoformat() if self.created_at else None,
            }

except ImportError:
    # Fallback if SQLAlchemy is not yet installed in local environment
    class Patient:  # type: ignore
        """Placeholder class if SQLAlchemy is not installed."""
        pass


# ---------------------------------------------------------------------------
# Companion Pydantic Schemas (consistent with appointment.py & staff.py)
# ---------------------------------------------------------------------------

class PatientCreate(BaseModel):
    """Pydantic schema for creating a new patient record."""
    full_name: str
    email: EmailStr
    phone: Optional[str] = ""
    dob: Optional[str] = ""
    gender: Optional[str] = "Not specified"
    blood_group: Optional[str] = "O+"
    address: Optional[str] = ""
    avatar_url: Optional[str] = ""
    password: Optional[str] = None
    auth_provider: Optional[str] = "local"


class PatientOut(BaseModel):
    """Pydantic schema for returning patient details in API responses."""
    id: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = ""
    dob: Optional[str] = ""
    gender: Optional[str] = "Not specified"
    blood_group: Optional[str] = "O+"
    address: Optional[str] = ""
    avatar_url: Optional[str] = ""
    auth_provider: Optional[str] = "local"
    created_at: Optional[str] = None


class PatientUpdate(BaseModel):
    """Pydantic schema for updating existing patient profile data."""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    avatar_url: Optional[str] = None
