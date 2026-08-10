export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
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
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospitalId: string;
  hospitalName: string;
  photoUrl: string;
  rating: number;
  reviewsCount: number;
  experienceYears: number;
  about?: string;
}

export interface Hospital {
  id: string;
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
}

export interface MedicalHistoryItem {
  id: string;
  date: string;
  time: string;
  doctorName: string;
  specialty: string;
  hospitalName: string;
  diagnosis: string;
  prescriptionDetails: string;
  status: 'Completed' | 'Follow-up Required';
  specialtyIcon: 'heart' | 'stethoscope' | 'bandage' | 'bone' | 'eye';
}

export interface BookingSelection {
  doctorId?: string;
  doctor?: Doctor | null;
  date?: string;
  slot?: string | null;
  reason?: string;
}
