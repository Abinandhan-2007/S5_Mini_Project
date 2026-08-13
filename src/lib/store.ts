import { create } from 'zustand';
import { Preferences } from '@capacitor/preferences';
import type { User, Appointment, MedicalHistoryItem, ChatMessage, Doctor, BookingSelection } from './types';
import { INITIAL_USER, INITIAL_APPOINTMENT, MOCK_MEDICAL_HISTORY, INITIAL_CHAT_MESSAGES } from './mockApi';

interface CarePulseState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isBiometricEnabled: boolean;
  login: (phone: string) => void;
  setUserAuth: (user: User, token?: string) => Promise<void>;
  checkAuthSession: () => Promise<boolean>;
  logout: () => Promise<void>;
  toggleBiometric: (enabled: boolean) => void;
  updateUser: (updatedFields: Partial<User>) => void;
  registerUser: (userData: Partial<User>) => void;

  // Appointments
  appointments: Appointment[];
  activeAppointment: Appointment | null;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, fields: Partial<Appointment>) => void;
  cancelAppointment: (id: string, reason?: string) => void;
  rescheduleAppointment: (id: string, newDate: string, newSlot: string) => void;
  syncAppointments: (patientId?: string) => Promise<void>;


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
  user: parsedUser || null,
  isAuthenticated: false,
  isInitializing: true,
  isBiometricEnabled: storedBio === 'true',

  login: (_phone: string) => {
    localStorage.setItem('has_logged_in', 'true');
    localStorage.setItem('carepulse_user', JSON.stringify(INITIAL_USER));
    Preferences.set({ key: 'carepulse_user', value: JSON.stringify(INITIAL_USER) });
    set({
      user: INITIAL_USER,
      isAuthenticated: true,
      isInitializing: false,
    });
  },

  setUserAuth: async (user: User, token?: string) => {
    // 1. Immediately update Zustand reactive state so routes pass instantly on first click
    set({
      user,
      isAuthenticated: true,
      isInitializing: false,
    });

    // 2. Persist to localStorage synchronously
    localStorage.setItem('has_logged_in', 'true');
    localStorage.setItem('carepulse_user', JSON.stringify(user));
    if (token) {
      localStorage.setItem('carepulse_token', token);
      localStorage.setItem('auth_token', token);
    }

    // 3. Persist to native Capacitor Preferences in background
    try {
      await Preferences.set({ key: 'carepulse_user', value: JSON.stringify(user) });
      if (token) {
        await Preferences.set({ key: 'auth_token', value: token });
      }
    } catch (e) {
      console.warn('Preferences storage note:', e);
    }

    // 4. Trigger live background sync of appointments from PostgreSQL
    get().syncAppointments(user.id);
  },

  checkAuthSession: async () => {
    try {
      // 1. Check Capacitor Preferences for saved JWT token
      let token: string | null = null;
      try {
        const { value } = await Preferences.get({ key: 'auth_token' });
        token = value;
      } catch {
        token = null;
      }

      // Fallback to localStorage
      if (!token) {
        token = localStorage.getItem('carepulse_token') || localStorage.getItem('auth_token');
      }

      if (!token) {
        set({ isInitializing: false, isAuthenticated: false });
        return false;
      }

      // 2. Verify token against backend /api/auth/me
      const tryVerify = async (baseUrl: string) => {
        return await fetch(`${baseUrl}/auth/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      };

      let res: Response | null = null;
      try {
        res = await tryVerify('/api');
      } catch {
        try {
          res = await tryVerify('http://localhost:5000/api');
        } catch {
          res = null;
        }
      }

      if (res && res.ok) {
        const userData: User = await res.json();
        await Preferences.set({ key: 'carepulse_user', value: JSON.stringify(userData) });
        localStorage.setItem('carepulse_user', JSON.stringify(userData));
        localStorage.setItem('has_logged_in', 'true');

        set({
          user: userData,
          isAuthenticated: true,
          isInitializing: false,
        });

        get().syncAppointments(userData.id);
        return true;
      }

      // 3. If token invalid or expired (401 Unauthorized) -> Clear stored session
      if (res && res.status === 401) {
        await Preferences.remove({ key: 'auth_token' });
        await Preferences.remove({ key: 'carepulse_user' });
        localStorage.removeItem('carepulse_token');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('has_logged_in');

        set({
          user: null,
          isAuthenticated: false,
          isInitializing: false,
        });
        return false;
      }

      // 4. Offline / Server Unreachable: Fallback to cached user in Preferences
      let cachedUserJson: string | null = null;
      try {
        const { value } = await Preferences.get({ key: 'carepulse_user' });
        cachedUserJson = value;
      } catch {
        cachedUserJson = null;
      }

      if (!cachedUserJson) {
        cachedUserJson = localStorage.getItem('carepulse_user');
      }

      if (cachedUserJson) {
        const cachedUser = JSON.parse(cachedUserJson);
        set({
          user: cachedUser,
          isAuthenticated: true,
          isInitializing: false,
        });
        return true;
      }

      set({ isInitializing: false, isAuthenticated: false });
      return false;
    } catch {
      set({ isInitializing: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await Preferences.remove({ key: 'auth_token' });
      await Preferences.remove({ key: 'carepulse_user' });
    } catch {
      // Ignore
    }
    localStorage.removeItem('has_logged_in');
    localStorage.removeItem('carepulse_user');
    localStorage.removeItem('carepulse_token');
    localStorage.removeItem('auth_token');
    set({
      user: null,
      isAuthenticated: false,
      isInitializing: false,
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
  updateAppointment: (id, fields) => {
    set((state) => {
      const updatedApps = state.appointments.map((app) =>
        app.id === id ? { ...app, ...fields } : app
      );
      const active = state.activeAppointment?.id === id
        ? { ...state.activeAppointment, ...fields }
        : state.activeAppointment;
      return { appointments: updatedApps, activeAppointment: active };
    });
  },
  cancelAppointment: (id, _reason) => {
    set((state) => {
      const updatedApps = state.appointments.map((app) =>
        app.id === id ? { ...app, status: 'Cancelled' as const } : app
      );
      const active = state.activeAppointment?.id === id
        ? { ...state.activeAppointment, status: 'Cancelled' as const }
        : state.activeAppointment;
      return { appointments: updatedApps, activeAppointment: active };
    });
  },
  rescheduleAppointment: (id, newDate, newSlot) => {
    set((state) => {
      const updatedApps = state.appointments.map((app) =>
        app.id === id ? { ...app, date: newDate, timeSlot: newSlot, status: 'Upcoming' as const } : app
      );
      const active = state.activeAppointment?.id === id
        ? { ...state.activeAppointment, date: newDate, timeSlot: newSlot, status: 'Upcoming' as const }
        : state.activeAppointment;
      return { appointments: updatedApps, activeAppointment: active };
    });
  },


  syncAppointments: async (patientId?: string) => {
    try {
      const pid = patientId || get().user?.id || 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
      const tryFetch = async (url: string) => fetch(`${url}/appointments/patient/${pid}`);
      let res: Response | null = null;
      try {
        res = await tryFetch('/api');
      } catch {
        try {
          res = await tryFetch('http://localhost:5000/api');
        } catch {
          res = null;
        }
      }
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          set({
            appointments: data,
            activeAppointment: data[0] || null,
          });
        }
      }
    } catch (e) {
      console.warn('Sync appointments notice:', e);
    }
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
