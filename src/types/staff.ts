// src/types/staff.ts

export type StaffRole = 'admin' | 'receptionist' | 'doctor';

export interface Staff {
  id: string;
  fullName: string;
  email: string;
  role: StaffRole;
  isActive?: boolean;
  department?: string;
  avatarUrl?: string;
}
