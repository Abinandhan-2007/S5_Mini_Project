import { create } from 'zustand';
import type { User, Appointment, MedicalHistoryItem, ChatMessage, Doctor, BookingSelection } from './types';
import { INITIAL_USER, INITIAL_APPOINTMENT, MOCK_MEDICAL_HISTORY, INITIAL_CHAT_MESSAGES } from './mockApi';

interface CarePulseState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  isBiometricEnabled: boolean;
  login: (phone: string) => void;
  setUserAuth: (user: User, token?: string) => void;
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
  isAuthenticated: false,
  isBiometricEnabled: storedBio === 'true',

  login: (_phone: string) => {
    localStorage.setItem('has_logged_in', 'true');
    localStorage.setItem('carepulse_user', JSON.stringify(INITIAL_USER));
    set({
      user: INITIAL_USER,
      isAuthenticated: true,
    });
  },

  setUserAuth: (user: User, token?: string) => {
    localStorage.setItem('has_logged_in', 'true');
    localStorage.setItem('carepulse_user', JSON.stringify(user));
    if (token) {
      localStorage.setItem('carepulse_token', token);
    }
    set({
      user,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem('has_logged_in');
    localStorage.removeItem('carepulse_user');
    localStorage.removeItem('carepulse_token');
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
      password: userData.password,
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
  setBookingDoctor: (doctor) => set((s) => ({ booking: { ...s.booking, doctor, doctorId: doctor.id } })),
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

    if (msg.sender === 'user') {
      setTimeout(() => {
        const userTextLower = msg.text.toLowerCase();
        let botReply = "Thank you for sharing your symptoms. Based on your description, it is recommended to stay hydrated, rest, and monitor your condition.";
        let chips: string[] | undefined = undefined;

        if (userTextLower.includes('fever') || userTextLower.includes('chills')) {
          botReply = "I note you have a fever. Keep yourself cool, rest, and take fluids. If your temperature exceeds 102°F (38.9°C) or lasts over 48 hours, please consult a physician immediately.";
          chips = ['Book Doctor Visit', 'Medication guidance', 'Contact Emergency'];
        } else if (userTextLower.includes('headache')) {
          botReply = "Headaches can be caused by dehydration, stress, or eye strain. Ensure you take a break from screens, drink a glass of water, and rest in a dim room.";
          chips = ['Book Telehealth', 'Pain relief tips'];
        } else if (userTextLower.includes('shortness of breath') || userTextLower.includes('chest')) {
          botReply = "⚠️ Severe shortness of breath or chest discomfort requires IMMEDIATE medical attention. Please call emergency services or visit the nearest ER right away.";
          chips = ['Find Nearest ER', 'Emergency Contact'];
        } else if (userTextLower.includes('book doctor') || userTextLower.includes('appointment')) {
          botReply = "You can easily schedule a consultation with our verified specialists under the 'Appointments' tab!";
          chips = ['Find Hospitals & Doctors'];
        }

        const botMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: 'bot',
          text: botReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          quickReplyChips: chips,
        };

        set((state) => ({
          chatMessages: [...state.chatMessages, botMsg],
        }));
      }, 700);
    }
  },
  clearChat: () => set({ chatMessages: INITIAL_CHAT_MESSAGES }),
}));
