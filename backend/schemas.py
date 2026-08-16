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
    username: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

class RegisterRequest(BaseModel):
    fullName: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""
    password: Optional[str] = None
    dob: Optional[str] = ""
    gender: Optional[str] = "Not specified"
    bloodGroup: Optional[str] = "O+"
    avatarUrl: Optional[str] = ""
    allergies: Optional[str] = ""
    preExistingConditions: Optional[str] = ""
    emergencyContact: Optional[Dict[str, Any]] = None

class PatientResponse(BaseModel):
    id: str
    fullName: str
    email: str
    phone: Optional[str] = ""
    address: Optional[str] = ""
    dob: Optional[str] = ""
    gender: Optional[str] = "Not specified"
    bloodGroup: Optional[str] = "O+"
    avatarUrl: Optional[str] = ""
    authProvider: Optional[str] = "local"

class AuthResponse(BaseModel):
    success: bool
    user: PatientResponse
    token: str

class ForgotPasswordRequestOtp(BaseModel):
    username: str
    deliveryMethod: Optional[str] = "email"

class ForgotPasswordOtpResponse(BaseModel):
    success: bool
    message: str
    fullName: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    maskedDestination: str
    deliveryMethod: str
    otp: str

class ForgotPasswordVerifyOtpRequest(BaseModel):
    username: str
    otp: str

class ForgotPasswordVerifyOtpResponse(BaseModel):
    success: bool
    message: str
    verified: bool

class ForgotPasswordResetRequest(BaseModel):
    username: str
    otp: str
    newPassword: str

class AppointmentCreate(BaseModel):
    patientId: Optional[str] = None
    patientName: Optional[str] = ""
    doctorId: str
    doctorName: str
    doctorSpecialty: Optional[str] = "General Physician"
    doctorPhoto: Optional[str] = ""
    hospitalName: Optional[str] = "CarePulse Hospital"
    date: str
    timeSlot: str
    type: Optional[str] = "In-Person"
    ticketNumber: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: str
    ticketNumber: str
    patientId: str
    patientName: Optional[str] = ""
    doctorId: str
    doctorName: str
    doctorSpecialty: str
    doctorPhoto: str
    hospitalName: str
    date: str
    timeSlot: str
    type: str
    status: str
    daysLeftText: Optional[str] = None

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

class SlotCapacitySchema(BaseModel):
    id: str
    timeSlot: str
    maxSeats: int
    bookedSeats: int
    availableSeats: int
    isAvailable: bool

class DoctorCreateRequest(BaseModel):
    name: str
    specialty: str
    department: str
    experienceYears: int
    consultationFee: float
    photo: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    roomNumber: Optional[str] = "Room 101"
    isAvailable: Optional[bool] = True
    availableDays: Optional[List[str]] = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    slotCapacities: Optional[List[SlotCapacitySchema]] = None

class DoctorAvailabilityUpdate(BaseModel):
    isAvailable: bool

class SlotCapacityUpdate(BaseModel):
    timeSlot: str
    maxSeats: int
    isAvailable: Optional[bool] = True

class TokenStatusUpdate(BaseModel):
    status: str

class WalkInAppointmentCreate(BaseModel):
    patientName: str
    patientPhone: str
    patientEmail: Optional[str] = ""
    doctorId: str
    doctorName: str
    doctorSpecialty: Optional[str] = "General Physician"
    date: str
    timeSlot: str
    type: Optional[str] = "Walk-In"

class HospitalResponse(BaseModel):
    id: str
    name: str
    address: str
    phone: Optional[str] = ""
    rating: float
    reviewsCount: int
    reviews_count: Optional[int] = None
    emergencyAvailable: bool
    emergency_available: Optional[bool] = None
    imageUrl: str
    image_url: Optional[str] = None
    specialties: List[str]
    facilityType: str
    facility_type: Optional[str] = None
    distanceMiles: float
    distance_miles: Optional[float] = None

class DoctorResponse(BaseModel):
    id: str
    name: str
    specialty: str
    department: Optional[str] = "General Medicine"
    hospitalId: Optional[str] = ""
    hospital_id: Optional[str] = None
    hospitalName: Optional[str] = "St. Jude Heart & Medical Center"
    hospital_name: Optional[str] = None
    photoUrl: str
    photo: Optional[str] = None
    rating: float
    reviewsCount: int
    reviews_count: Optional[int] = None
    experienceYears: int
    experience_years: Optional[int] = None
    consultationFee: Optional[float] = 500.0
    consultation_fee: Optional[float] = None
    phone: Optional[str] = ""
    email: Optional[str] = ""
    roomNumber: Optional[str] = ""
    room_number: Optional[str] = None
    isAvailable: bool
    is_available: Optional[bool] = None
    about: Optional[str] = ""
    availableDays: Optional[List[str]] = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    slotCapacities: Optional[List[Any]] = []


