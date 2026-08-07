import { create } from 'zustand';
import type { User, Appointment, MedicalHistoryItem, ChatMessage, Doctor, BookingSelection } from './types';
import { INITIAL_USER, INITIAL_APPOINTMENT, MOCK_MEDICAL_HISTORY, INITIAL_CHAT_MESSAGES } from './mockApi';

interface CarePulseState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  isBiometricEnabled: boolean;
  login: (phone: string) => void;
  logout: () => void;
  toggleBiometric: (enabled: boolean) => void;
  updateUser: (updatedFields: Partial<User>) => void;
  registerUser: (userData: Partial<User>) => void;

  // Appointments
  appointments: Appointment[];
  activeAppointment: Appointment | null;
  addAppointment: (appointment: Appointment) => void;

  // Booking Flow Draft
  booking: BookingSelection;
  setBookingDoctor: (doctor: Doctor) => void;
  setBookingDate: (dateStr: string) => void;
  setBookingSlot: (slotStr: string) => void;
  clearBooking: () => void;

  // Medical History
  history: MedicalHistoryItem[];

  // Health AI Chat
  chatMessages: ChatMessage[];
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChat: () => void;
}

const storedUser = localStorage.getItem('carepulse_user');
const parsedUser = storedUser ? JSON.parse(storedUser) : null;
const storedBio = localStorage.getItem('carepulse_biometric_enabled');

export const useCarePulseStore = create<CarePulseState>((set, get) => ({
  user: parsedUser || INITIAL_USER,
  isAuthenticated: false, // Always start at Login Screen on app open
  isBiometricEnabled: storedBio === 'true', // Disabled by default for new users until enabled in Profile

  login: (_phone: string) => {
    localStorage.setItem('has_logged_in', 'true');
    localStorage.setItem('carepulse_user', JSON.stringify(INITIAL_USER));
    set({
      user: INITIAL_USER,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem('has_logged_in');
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  toggleBiometric: (enabled: boolean) => {
    localStorage.setItem('carepulse_biometric_enabled', String(enabled));
    set({ isBiometricEnabled: enabled });
  },

  updateUser: (updatedFields) => {
    const updated = { ...(get().user || INITIAL_USER), ...updatedFields };
    localStorage.setItem('carepulse_user', JSON.stringify(updated));
    set({ user: updated });
  },

  registerUser: (userData) => {
    const newUser: User = {
      id: `usr-${Date.now()}`,
      fullName: userData.fullName || 'Sarah Jenkins',
      dob: userData.dob || '1992-05-14',
      gender: (userData.gender as any) || 'Female',
      bloodGroup: userData.bloodGroup || 'O+',
      phone: userData.phone || '+91 98765 43210',
      email: userData.email || 'sarah@example.com',
      avatarUrl: userData.avatarUrl || INITIAL_USER.avatarUrl,
      emergencyContact: userData.emergencyContact || {
        name: 'Mark Jenkins',
        phone: '+91 98765 12345',
        relationship: 'Spouse',
      },
      allergies: userData.allergies,
      preExistingConditions: userData.preExistingConditions,
    };
    localStorage.setItem('has_logged_in', 'true');
    localStorage.setItem('carepulse_user', JSON.stringify(newUser));
    set({
      user: newUser,
      isAuthenticated: true,
    });
  },

  appointments: [INITIAL_APPOINTMENT],
  activeAppointment: INITIAL_APPOINTMENT,
  addAppointment: (appointment) => {
    set((state) => ({
      appointments: [appointment, ...state.appointments],
      activeAppointment: appointment,
    }));
  },

  booking: {
    doctor: null,
    date: new Date().toISOString().split('T')[0],
    slot: null,
  },
  setBookingDoctor: (doctor) => set((s) => ({ booking: { ...s.booking, doctor } })),
  setBookingDate: (date) => set((s) => ({ booking: { ...s.booking, date } })),
  setBookingSlot: (slot) => set((s) => ({ booking: { ...s.booking, slot } })),
  clearBooking: () =>
    set({
      booking: {
        doctor: null,
        date: new Date().toISOString().split('T')[0],
        slot: null,
      },
    }),

  history: MOCK_MEDICAL_HISTORY,

  chatMessages: INITIAL_CHAT_MESSAGES,
  addChatMessage: (msg) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    set((state) => ({
      chatMessages: [...state.chatMessages, newMsg],
    }));
  },
  clearChat: () => set({ chatMessages: INITIAL_CHAT_MESSAGES }),
}));
