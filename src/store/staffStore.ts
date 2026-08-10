// src/store/staffStore.ts
import { create } from 'zustand';
import type { Staff } from '../types/staff';

interface StaffState {
  currentStaff: Staff | null;
  token: string | null;
  isAuthenticated: boolean;
  // TODO: Staff state management actions (login, logout, active role)
  setStaffAuth: (staff: Staff, token: string) => void;
  logoutStaff: () => void;
}

export const useStaffStore = create<StaffState>((set) => ({
  currentStaff: null,
  token: null,
  isAuthenticated: false,

  setStaffAuth: (staff, token) => set({ currentStaff: staff, token, isAuthenticated: true }),
  logoutStaff: () => set({ currentStaff: null, token: null, isAuthenticated: false }),
}));
