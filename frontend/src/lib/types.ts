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
  type: 'In-Person' | 'Telehealth';
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  daysLeftText?: string;
}

export interface Prescription {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  prescriber: string;
  iconType: 'pill' | 'syrup' | 'capsule';
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
  status: 'Completed' | 'Follow-up Required' | 'Upcoming' | 'Cancelled';
  specialtyIcon?: 'heart' | 'stethoscope' | 'bandage' | 'bone' | 'eye' | 'calendar';
}

export interface BookingSelection {
  doctorId?: string;
  doctor?: Doctor | null;
  date?: string;
  slot?: string | null;
  reason?: string;
}
