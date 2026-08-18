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
  username?: string;
  password?: string;
  phone: string;
  role: 'admin';
  department: string;
  avatarUrl?: string;
  hospitalName?: string;
}

export interface ReceptionistRecord {
  id: string;
  name: string;
  email: string;
  username?: string;
  staffId?: string;
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

export interface DepartmentRecord {
  id: string;
  name: string;
  iconName: string;
  color: string;
  headDoctor: string;
  operatingHours: string;
  description: string;
  doctorIds: string[];
  totalBeds?: number;
  emergencyCoverage?: boolean;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  message: string;
  audience: 'All Patients' | 'All Staff' | 'Clinical Staff' | 'Front Desk Reception';
  department?: string;
  priority: 'Normal' | 'High' | 'Urgent';
  scheduledFor: string;
  sentAt: string;
  deliveredCount: number;
  readCount: number;
  status: 'Sent' | 'Scheduled' | 'Draft';
}
