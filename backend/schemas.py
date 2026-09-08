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
    id: Optional[str] = None
    timeSlot: str
    maxSeats: int
    bookedSeats: Optional[int] = 0
    availableSeats: Optional[int] = 0
    onlineMaxSeats: Optional[int] = None
    onlineBookedSeats: Optional[int] = 0
    onlineAvailableSeats: Optional[int] = None
    offlineMaxSeats: Optional[int] = None
    offlineBookedSeats: Optional[int] = 0
    offlineAvailableSeats: Optional[int] = None
    isAvailable: Optional[bool] = True

class SlotAddRequest(BaseModel):
    timeSlot: str
    maxSeats: Optional[int] = 6
    isAvailable: Optional[bool] = True

class DoctorCreateRequest(BaseModel):
    name: str
    specialty: Optional[str] = "General Physician"
    department: Optional[str] = "General Medicine"
    experienceYears: Optional[int] = 5
    consultationFee: Optional[float] = 500.0
    photo: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    username: Optional[str] = ""
    password: Optional[str] = None
    hospital_id: Optional[str] = None
    roomNumber: Optional[str] = "Cabin 101"
    isAvailable: Optional[bool] = True
    availableDays: Optional[List[str]] = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    slotCapacities: Optional[List[SlotCapacitySchema]] = []

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
    doctorSpecialty: str
    date: Optional[str] = None
    timeSlot: str
    age: Optional[int] = None
    bloodGroup: Optional[str] = None
    address: Optional[str] = None
    healthIssue: Optional[str] = None
    type: Optional[str] = "Walk-In"

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
    is24x7: Optional[bool] = True
    is_24x7: Optional[bool] = True
    emergencyAvailable: Optional[bool] = True
    emergency_available: Optional[bool] = True
    imageUrl: str
    image_url: Optional[str] = None
    specialties: List[str]
    facilityType: str
    facility_type: Optional[str] = None
    distanceMiles: Optional[float] = 1.0
    distance_miles: Optional[float] = 1.0

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
    slot_capacities: Optional[List[Any]] = []

class DeviceTokenRequest(BaseModel):
    patient_id: Optional[str] = "anonymous"
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
    purpose: Optional[str] = None
    indications_and_usage: Optional[str] = ""
    summary: str
    source: str
    mainUses: Optional[List[str]] = None
    howToTake: Optional[List[str]] = None
    warnings: Optional[List[str]] = None
    sideEffects: Optional[List[str]] = None
    boxedWarning: Optional[List[str]] = None

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
    genericName: Optional[str] = None
    generic_name: Optional[str] = None
    medicineId: Optional[str] = None
    medicine_id: Optional[str] = None

class MedicineInfoLookupResponse(BaseModel):
    status: str  # FOUND, UNCLEAR_TEXT, NO_INFO_AVAILABLE
    drugName: str
    genericName: Optional[str] = None
    extractedText: str
    purpose: Optional[str] = None
    indicationsAndUsage: Optional[str] = ""
    summary: str
    source: str
    mainUses: Optional[List[str]] = None
    howToTake: Optional[List[str]] = None
    warnings: Optional[List[str]] = None
    sideEffects: Optional[List[str]] = None
    boxedWarning: Optional[List[str]] = None
    disclaimer: Optional[str] = "General Information Only — This is NOT a verification against your prescriptions. For personal dosage instructions, use 'Check My Prescription'."

class MedicineSearchResultItem(BaseModel):
    id: str
    name: str
    generic_name: str
    dosage_form: Optional[str] = "Tablet"
    strengths: List[str] = []
    category: Optional[str] = "General"
    purpose: Optional[str] = ""
    match_type: str = "fuzzy"  # exact, prefix, contains, fuzzy
    similarity_score: float = 0.0

class MedicineSearchResponse(BaseModel):
    query: str
    total: int
    did_you_mean: Optional[str] = None
    matches: List[MedicineSearchResultItem] = []


# ===================================================================
# Nurse Portal & Pre-Consultation Vitals / Lab Tests Schemas
# ===================================================================

class NurseCreateRequest(BaseModel):
    name: str
    email: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    department: Optional[str] = "Triage & Vitals"
    phone: Optional[str] = ""
    photo: Optional[str] = ""
    hospital_id: Optional[str] = None


class NurseResponse(BaseModel):
    id: str
    staff_code: Optional[str] = None
    name: str
    email: str
    department: Optional[str] = "Triage & Vitals"
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None
    phone: Optional[str] = ""
    photo: Optional[str] = ""
    is_active: bool = True


class VitalsCreateRequest(BaseModel):
    appointment_id: str
    patient_id: str
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    temperature: Optional[float] = None
    temperature_unit: Optional[str] = "C"
    respiratory_rate: Optional[int] = None
    spo2: Optional[int] = None
    blood_glucose: Optional[float] = None
    glucose_context: Optional[str] = None
    notes: Optional[str] = None


class VitalsResponse(BaseModel):
    id: str
    appointment_id: str
    patient_id: str
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    bmi: Optional[float] = None
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    temperature: Optional[float] = None
    temperature_unit: Optional[str] = "C"
    respiratory_rate: Optional[int] = None
    spo2: Optional[int] = None
    blood_glucose: Optional[float] = None
    glucose_context: Optional[str] = None
    notes: Optional[str] = None
    abnormal_flags: List[str] = []
    recorded_by: Optional[str] = None
    recorded_by_name: Optional[str] = None
    recorded_at: Optional[str] = None


class LabTestCreateRequest(BaseModel):
    appointment_id: str
    patient_id: str
    test_type: str
    structured_results: Optional[Dict[str, Any]] = {}
    free_text_result: Optional[str] = None
    file_url: Optional[str] = None
    status: Optional[str] = "completed"


class LabTestResponse(BaseModel):
    id: str
    appointment_id: str
    patient_id: str
    test_type: str
    structured_results: Optional[Dict[str, Any]] = {}
    free_text_result: Optional[str] = None
    file_url: Optional[str] = None
    status: Optional[str] = "completed"
    ordered_by: Optional[str] = None
    recorded_by: Optional[str] = None
    recorded_by_name: Optional[str] = None
    recorded_at: Optional[str] = None


class ReportUploadRequest(BaseModel):
    file_data: str
    filename: Optional[str] = "report.png"
    appointment_id: Optional[str] = None


class ReportUploadResponse(BaseModel):
    success: bool
    file_url: str
    filename: str
