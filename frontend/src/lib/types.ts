export interface User {
  id: string;
  patient_code?: string;
  patientCode?: string;
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  dob: string;
  gender: string;
  bloodGroup: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  allergies?: string;
  preExistingConditions?: string;
  avatarUrl: string;
  authProvider?: string;
  password?: string;
}

export interface Doctor {
  id: string;
  staff_code?: string;
  staffCode?: string;
  name: string;
  specialty: string;
  department?: string;
  hospitalId: string;
  hospital_id?: string;
  hospitalName: string;
  hospital_name?: string;
  photoUrl: string;
  photo?: string;
  rating: number;
  reviewsCount: number;
  reviews_count?: number;
  experienceYears: number;
  experience_years?: number;
  consultationFee?: number;
  consultation_fee?: number;
  phone?: string;
  email?: string;
  roomNumber?: string;
  room_number?: string;
  about?: string;
  isAvailable?: boolean;
  is_available?: boolean;
  availabilityReason?: string;
  availability_reason?: string;
  unavailableUntil?: string;
  unavailable_until?: string;
  availableDays?: string[];
  available_days?: string[];
  slotCapacities?: any[];
  slot_capacities?: any[];
}

export interface Hospital {
  id: string;
  hospital_code?: string;
  hospitalCode?: string;
  name: string;
  address: string;
  distanceMiles: number;
  rating: number;
  reviewsCount: number;
  imageUrl: string;
  specialties: string[];
  facilityType: 'General' | 'Cardiology' | 'Pediatrics' | 'Specialty Clinic' | 'Emergency Care';
}

export interface Appointment {
  id: string;
  ticketNumber: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorPhoto: string;
  hospitalId?: string;
  hospital_id?: string;
  hospitalName: string;
  date: string; // ISO date string e.g. "2026-08-10"
  timeSlot: string; // e.g. "10:30 AM"
  type: 'In-Person' | 'Telehealth' | 'Follow-up';
  status: 'Upcoming' | 'Completed' | 'Cancelled' | 'Scheduled' | 'Confirmed' | 'In-Progress';
  daysLeftText?: string;
}

export interface Prescription {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  mealTiming?: string | null;
  prescriber: string;
  iconType?: 'pill' | 'syrup' | 'capsule' | 'inhaler' | 'bottle' | 'syringe';
  patientId?: string;
  hospitalName?: string;
  status?: string;
  totalDays?: number;
  daysCompleted?: number;
  nextDose?: string;
  createdAt?: string;
}

export interface DrugInfoData {
  drug_name: string;
  found: boolean;
  purpose?: string | null;
  indications_and_usage?: string;
  summary: string;
  source: string;
  mainUses?: string[] | null;
  howToTake?: string[] | null;
  warnings?: string[] | null;
  sideEffects?: string[] | null;
  boxedWarning?: string[] | null;
}

export interface ScanMatchResult {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  mealTiming?: string;
  prescriber?: string;
  iconType?: string;
  confidence: number;
  drugInfo?: DrugInfoData | null;
}

export interface ScanMatchResponse {
  status: 'SUCCESS' | 'AMBIGUOUS' | 'NO_MATCH' | 'UNREADABLE' | 'NO_ACTIVE_PRESCRIPTION';
  matchType: 'HIGH_CONFIDENCE' | 'AMBIGUOUS' | 'NO_MATCH' | 'NO_ACTIVE_PRESCRIPTION';
  confidence: number;
  message: string;
  extractedText: string;
  match?: ScanMatchResult | null;
  matches?: ScanMatchResult[];
  drugInfo?: DrugInfoData | null;
}

export interface MedicineInfoLookupResponse {
  status: 'FOUND' | 'UNCLEAR_TEXT' | 'NO_INFO_AVAILABLE';
  drugName: string;
  genericName?: string | null;
  extractedText: string;
  purpose?: string | null;
  indicationsAndUsage?: string;
  summary: string;
  source: string;
  mainUses?: string[] | null;
  howToTake?: string[] | null;
  warnings?: string[] | null;
  sideEffects?: string[] | null;
  boxedWarning?: string[] | null;
  disclaimer?: string;
}

export interface MedicineSearchResultItem {
  id: string;
  name: string;
  generic_name: string;
  dosage_form?: string;
  strengths?: string[];
  category?: string;
  purpose?: string;
  match_type: 'exact' | 'prefix' | 'contains' | 'fuzzy';
  similarity_score: number;
}

export interface MedicineSearchResponse {
  query: string;
  total: number;
  did_you_mean?: string | null;
  matches: MedicineSearchResultItem[];
}



export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  quickReplyChips?: string[];
  confidence?: number;
  riskLevel?: 'low' | 'moderate' | 'critical';
  specialty?: string;
  isEmergency?: boolean;
  soapNote?: {
    status?: string;
    department?: string;
    subjective: string;
    objective: string;
    assessment?: string;
    assessmentDiagnosis?: string;
    plan: string;
    confidence?: number;
    riskLevel?: 'low' | 'moderate' | 'critical';
  };
}

export interface MedicalHistoryItem {
  id: string;
  date: string;
  time: string;
  doctorId?: string;
  doctorName: string;
  doctorPhoto?: string;
  specialty: string;
  hospitalId?: string;
  hospital_id?: string;
  hospitalName: string;
  diagnosis: string;
  prescriptionDetails: string;
  status: 'Completed' | 'Follow-up Required' | 'Upcoming' | 'Cancelled' | 'Scheduled' | 'Confirmed' | 'In-Progress';
  specialtyIcon?: 'heart' | 'stethoscope' | 'bandage' | 'bone' | 'eye' | 'calendar';
}

export interface BookingSelection {
  doctorId?: string;
  doctor?: Doctor | null;
  date?: string;
  slot?: string | null;
  reason?: string;
}
