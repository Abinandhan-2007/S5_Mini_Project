// src/types/staff.ts

export type StaffRole = 'superadmin' | 'admin' | 'receptionist' | 'doctor' | 'nurse';

export interface Staff {
  id: string;
  staff_code?: string;
  staffCode?: string;
  name?: string;
  fullName?: string;
  email: string;
  role: StaffRole;
  isActive?: boolean;
  department?: string;
  avatarUrl?: string;
  hospital_id?: string;
  hospitalId?: string;
  doctorId?: string;
  doctor_id?: string;
  phone?: string;
}

export interface AdminProfile {
  id: string;
  staff_code?: string;
  staffCode?: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  phone: string;
  role: 'admin';
  department: string;
  avatarUrl?: string;
  hospitalName?: string;
  hospitalId?: string;
  hospital_id?: string;
}

export interface ReceptionistRecord {
  id: string;
  staff_code?: string;
  staffCode?: string;
  name: string;
  email: string;
  username?: string;
  staffId?: string;
  phone: string;
  password?: string;
  hospitalName?: string;
  hospitalId?: string;
  hospital_id?: string;
  department: string;
  deskNumber: string;
  shift: 'Morning' | 'Evening' | 'Night' | 'Full Day';
  isActive: boolean;
  avatarUrl: string;
  assignedDoctorsCount?: number;
  joinDate: string;
}

export interface NurseRecord {
  id: string;
  staff_code?: string;
  staffCode?: string;
  name: string;
  email: string;
  username?: string;
  phone: string;
  password?: string;
  hospitalName?: string;
  hospitalId?: string;
  hospital_id?: string;
  department: string;
  role: 'nurse';
  isActive: boolean;
  avatarUrl?: string;
  photo?: string;
  created_at?: string;
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
  hospital_code?: string;
  hospitalCode?: string;
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

export interface SuperAdminStats {
  total_hospitals: number;
  active_hospitals: number;
  total_admins: number;
  hospitals_with_admin: number;
  hospitals_without_admin: number;
  total_doctors: number;
  total_receptionists: number;
  total_patients: number;
}

export interface SuperAdminHospital {
  id: string;
  hospital_code: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  facility_type?: string;
  rating?: number;
  reviews_count?: number;
  emergency_available?: boolean;
  image_url?: string;
  specialties?: string[];
  is_active: boolean;
  created_at?: string;
  has_active_admin: boolean;
  doctor_count: number;
  receptionist_count: number;
  admin?: {
    id: string;
    full_name: string;
    email: string;
    staff_code: string;
    phone?: string;
    is_active: boolean;
    created_at?: string;
  } | null;
}

export interface SuperAdminAdmin {
  id: string;
  staff_code: string;
  full_name: string;
  email: string;
  phone?: string;
  role: 'admin';
  department: string;
  is_active: boolean;
  hospital_id: string;
  hospital_name: string;
  hospital_code: string;
  created_at?: string;
}
