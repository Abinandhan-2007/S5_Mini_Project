export interface TimeSlotCapacity {
  id: string;
  timeSlot: string; // e.g. "10:00 AM - 11:00 AM"
  maxSeats: number; // e.g. 6 total seats
  bookedSeats: number;
  availableSeats: number;
  // 50/50 Availability Split for Online & Offline Bookings
  onlineMaxSeats: number; // e.g. 3 seats
  onlineBookedSeats: number;
  onlineAvailableSeats: number;
  offlineMaxSeats: number; // e.g. 3 seats
  offlineBookedSeats: number;
  offlineAvailableSeats: number;
  isAvailable: boolean;
}


export interface DoctorRecord {
  id: string;
  name: string;
  specialty: string;
  department: string;
  experienceYears: number;
  consultationFee: number;
  photo: string;
  phone: string;
  email: string;
  roomNumber: string;
  about?: string;
  isAvailable: boolean; // Available or Not Available toggle
  availableDays: string[];
  slotCapacities: TimeSlotCapacity[];
}


export type TokenStatus = 'Waiting' | 'In Consultation' | 'Completed' | 'Skipped' | 'Cancelled';

export interface TokenQueueItem {
  id: string;
  tokenNumber: string; // e.g. "#TOK-001"
  patientId?: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  appointmentId?: string;
  ticketNumber: string; // e.g. "#CP-4821"
  timeSlot: string; // e.g. "10:00 AM - 11:00 AM"
  status: TokenStatus;
  arrivalTime: string;
  issueTime: string;
  type: 'In-Person' | 'Walk-In' | 'Video Call';
  date?: string; // e.g. "13 Aug 2026"
  age?: number;
  bloodGroup?: string;
  address?: string;
  healthIssue?: string;
}



export interface ReceptionistProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  employeeId: string;
  clinicName: string;
  department: string;
  shift: string;
  avatarUrl: string;
}
