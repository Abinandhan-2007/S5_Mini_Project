from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr

class GoogleAuthProfile(BaseModel):
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    googleId: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None
    profile: Optional[GoogleAuthProfile] = None

class LoginRequest(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

class PatientResponse(BaseModel):
    id: str
    fullName: str
    email: str
    phone: Optional[str] = ""
    dob: Optional[str] = ""
    gender: Optional[str] = "Not specified"
    bloodGroup: Optional[str] = "O+"
    avatarUrl: Optional[str] = ""
    authProvider: Optional[str] = "local"

class AuthResponse(BaseModel):
    success: bool
    user: PatientResponse
    token: str

class Vitals(BaseModel):
    bp: Optional[str] = None
    heart_rate: Optional[int] = None
    temperature: Optional[float] = None

class SoapData(BaseModel):
    subjective: Optional[str] = ""
    objective: Optional[str] = ""
    assessment: Optional[str] = ""
    plan: Optional[str] = ""
    vitals: Optional[Dict[str, Any]] = None

class ConsultationCreate(BaseModel):
    patientId: Optional[str] = None
    doctorId: str
    doctorName: str
    date: Optional[str] = None
    soapData: Dict[str, Any]
    soapEmbedding: Optional[List[float]] = None

class ConsultationResponse(BaseModel):
    id: str
    doctor_id: Optional[str] = None
    doctor_name: str
    date: str
    soap_data: Dict[str, Any]
    patient_name: Optional[str] = None

class SearchRequest(BaseModel):
    queryEmbedding: List[float]
    limit: Optional[int] = 5

class SearchResultItem(BaseModel):
    id: str
    doctor_name: str
    date: str
    soap_data: Dict[str, Any]
    distance: float
