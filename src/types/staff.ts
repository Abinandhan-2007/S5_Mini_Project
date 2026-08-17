// src/types/staff.ts

export type StaffRole = 'admin' | 'receptionist' | 'doctor';

export interface Staff {
  id: string;
  name?: string;
  fullName?: string;
  email: string;
  role: StaffRole;
  isActive?: boolean;
  department?: string;
  avatarUrl?: string;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin';
  department: string;
  avatarUrl: string;
  hospitalName: string;
}

export interface ReceptionistRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  hospitalName?: string;
  department: string;
  deskNumber: string;
  shift: 'Morning' | 'Evening' | 'Night' | 'Full Day';
  isActive: boolean;
  avatarUrl: string;
  assignedDoctorsCount?: number;
  joinDate: string;
}

export interface HospitalSettings {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  emergencyHotline: string;
  email: string;
  logoUrl?: string;
  defaultSlotDurationMinutes: number;
  maxOnlineBookingPercentage: number;
  enableAiTriage: boolean;
  enableSmsReminders: boolean;
  enableAutoCancellation: boolean;
}

export interface HospitalBranch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  operatingHours: string;
  doctorsCount: number;
  receptionDesksCount: number;
  logoUrl: string;
  isActive: boolean;
}
