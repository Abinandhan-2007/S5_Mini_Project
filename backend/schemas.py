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
    patient_code: Optional[str] = None
    patientCode: Optional[str] = None
    fullName: str
    email: str
    phone: Optional[str] = ""
    address: Optional[str] = ""
    dob: Optional[str] = ""
    gender: Optional[str] = "Not specified"
    bloodGroup: Optional[str] = "O+"
    avatarUrl: Optional[str] = ""
    authProvider: Optional[str] = "local"
    allergies: Optional[str] = ""
    preExistingConditions: Optional[str] = ""
    emergencyContact: Optional[Dict[str, Any]] = None

class UpdatePatientRequest(BaseModel):
    fullName: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    bloodGroup: Optional[str] = None
    avatarUrl: Optional[str] = None
    allergies: Optional[str] = None
    preExistingConditions: Optional[str] = None
    emergencyContact: Optional[Dict[str, Any]] = None

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
    username: Optional[str] = None
    email: Optional[str] = None
    otp: Optional[str] = None
    submitted_otp: Optional[str] = None

class ForgotPasswordVerifyOtpResponse(BaseModel):
    success: bool
    message: str
    verified: bool
    reset_token: Optional[str] = None

class ForgotPasswordResetRequest(BaseModel):
    reset_token: Optional[str] = None
    new_password: Optional[str] = None
    newPassword: Optional[str] = None
    username: Optional[str] = None
    otp: Optional[str] = None

class AppointmentCreate(BaseModel):
    patientId: Optional[str] = None
    patientName: Optional[str] = ""
    doctorId: str
    doctorName: str
    doctorSpecialty: Optional[str] = "General Physician"
    doctorPhoto: Optional[str] = ""
    hospitalId: Optional[str] = None
    hospital_id: Optional[str] = None
    hospitalName: Optional[str] = "CarePulse Hospital"
    hospital_name: Optional[str] = None
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
    hospitalId: Optional[str] = None
    hospital_id: Optional[str] = None
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
    hospitalId: Optional[str] = None
    hospital_id: Optional[str] = None
    date: Optional[str] = None
    soapData: Dict[str, Any]
    soapEmbedding: Optional[List[float]] = None

class ConsultationResponse(BaseModel):
    id: str
    doctor_id: Optional[str] = None
    doctor_name: str
    hospital_id: Optional[str] = None
    hospitalId: Optional[str] = None
    hospital_name: Optional[str] = None
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
    hospitalId: Optional[str] = None
    hospital_id: Optional[str] = None
    hospitalName: Optional[str] = None
    hospital_name: Optional[str] = None
    date: str
    timeSlot: str
    type: Optional[str] = "Walk-In"
    age: Optional[int] = 30
    bloodGroup: Optional[str] = "O+"
    address: Optional[str] = ""
    healthIssue: Optional[str] = "General Checkup"

class HospitalResponse(BaseModel):
    id: str
    hospital_code: Optional[str] = None
    hospitalCode: Optional[str] = None
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
    staff_code: Optional[str] = None
    staffCode: Optional[str] = None
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

class DeviceTokenRequest(BaseModel):
    patient_id: str
    fcm_token: str
    platform: Optional[str] = "android"

class AppointmentCancelRequest(BaseModel):
    reason: Optional[str] = "Patient requested cancellation"

class ScanMatchRequest(BaseModel):
    image: Optional[str] = None
    ocrText: Optional[str] = None
    ocr_text: Optional[str] = None
    patientId: Optional[str] = None
    patient_id: Optional[str] = None

class DrugInfoSchema(BaseModel):
    drug_name: str
    found: bool
    purpose: str
    indications_and_usage: Optional[str] = ""
    summary: str
    source: str

class PrescriptionMatchedItem(BaseModel):
    id: str
    drugName: str
    dosage: str
    frequency: str
    mealTiming: Optional[str] = "As directed"
    prescriber: Optional[str] = "Treating Physician"
    iconType: Optional[str] = "pill"
    confidence: float
    drugInfo: Optional[DrugInfoSchema] = None

class ScanMatchResponse(BaseModel):
    status: str
    matchType: str
    confidence: float
    message: str
    extractedText: str
    match: Optional[PrescriptionMatchedItem] = None
    matches: List[PrescriptionMatchedItem] = []
    drugInfo: Optional[DrugInfoSchema] = None

class MedicineInfoLookupRequest(BaseModel):
    image: Optional[str] = None
    ocrText: Optional[str] = None
    ocr_text: Optional[str] = None
    drugName: Optional[str] = None
    drug_name: Optional[str] = None

class MedicineInfoLookupResponse(BaseModel):
    status: str  # FOUND, UNCLEAR_TEXT, NO_INFO_AVAILABLE
    drugName: str
    extractedText: str
    purpose: str
    indicationsAndUsage: Optional[str] = ""
    summary: str
    source: str
    disclaimer: Optional[str] = "General Information Only — This is NOT a verification against your prescriptions. For personal dosage instructions, use 'Check My Prescription'."





