import { create } from 'zustand';
import { Preferences } from '@capacitor/preferences';
import type { User, Appointment, MedicalHistoryItem, ChatMessage, Doctor, BookingSelection, Prescription } from './types';
import { INITIAL_CHAT_MESSAGES } from './mockApi';
import { apiGet, apiFetch } from './apiFetch';
import { signOutGoogle } from './googleAuth';
import { registerPushNotifications } from './pushNotifications';

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

  // Offline / Mock Data Fallback State
  isOfflineMode: boolean;
  isOfflineDismissed: boolean;
  setIsOfflineMode: (offline: boolean) => void;
  dismissOfflineBanner: () => void;

  // Appointments
  appointments: Appointment[];
  activeAppointment: Appointment | null;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, fields: Partial<Appointment>) => void;
  cancelAppointment: (id: string, reason?: string) => void;
  rescheduleAppointment: (id: string, newDate: string, newSlot: string) => void;
  syncAppointments: (patientId?: string) => Promise<void>;

  // Prescriptions
  prescriptions: Prescription[];
  syncPrescriptions: (patientId?: string) => Promise<void>;

  // Booking Flow Draft
  booking: BookingSelection;
  setBookingDoctor: (doctor: Doctor) => void;
  setBookingDate: (dateStr: string) => void;
  setBookingSlot: (slotStr: string) => void;
  clearBooking: () => void;

  // Medical History
  history: MedicalHistoryItem[];
  syncHistory: (patientId?: string) => Promise<void>;

  // Health AI Chat
  chatMessages: ChatMessage[];
  latestAssessment: any | null;
  isAiTyping: boolean;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<ChatMessage | null>;
  clearChat: () => void;
}

export const clearPersistentUserStorage = async (): Promise<void> => {
  try {
    await Preferences.remove({ key: 'auth_token' });
    await Preferences.remove({ key: 'carepulse_user' });
  } catch (e) {
    console.warn('Preferences session cleanup note:', e);
  }
  try {
    localStorage.removeItem('has_logged_in');
    localStorage.removeItem('carepulse_user');
    localStorage.removeItem('carepulse_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('google_last_email');
    sessionStorage.removeItem('carepulse_app_unlocked');
  } catch {}
};

const storedUser = localStorage.getItem('carepulse_user');
let parsedUser: User | null = null;
try {
  parsedUser = storedUser ? JSON.parse(storedUser) : null;
} catch {
  parsedUser = null;
}
const storedBio = localStorage.getItem('carepulse_biometric_enabled');
const hasLoggedIn = localStorage.getItem('has_logged_in') === 'true' || !!parsedUser;

export const useCarePulseStore = create<CarePulseState>((set, get) => ({
  user: parsedUser || null,
  isAuthenticated: hasLoggedIn,
  isInitializing: !hasLoggedIn,
  isBiometricEnabled: storedBio === 'true',

  // Offline banner states
  isOfflineMode: false,
  isOfflineDismissed: false,
  setIsOfflineMode: (offline: boolean) =>
    set((state) => ({
      isOfflineMode: offline,
      // If returning online, reset dismissal so next offline event warns again
      isOfflineDismissed: offline ? state.isOfflineDismissed : false,
    })),
  dismissOfflineBanner: () => set({ isOfflineDismissed: true }),

  login: (phone: string) => {
    const demoPatient: User = {
      id: `usr-${Date.now()}`,
      fullName: 'Patient',
      email: '',
      phone: phone || '+91 98765 00000',
      address: '',
      dob: '1995-01-01',
      gender: 'Other',
      bloodGroup: 'O+',
      emergencyContact: {
        name: 'Emergency Contact',
        phone: '+91 98765 00000',
        relationship: 'Primary Contact',
      },
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    };
    localStorage.setItem('has_logged_in', 'true');
    localStorage.setItem('carepulse_user', JSON.stringify(demoPatient));
    try {
      sessionStorage.setItem('carepulse_app_unlocked', 'true');
    } catch {}
    Preferences.set({ key: 'carepulse_user', value: JSON.stringify(demoPatient) }).catch(() => {});
    set({
      user: demoPatient,
      isAuthenticated: true,
      isInitializing: false,
      appointments: [],
      activeAppointment: null,
      history: [],
      prescriptions: [],
    });
    get().syncAppointments(demoPatient.id);
    get().syncPrescriptions(demoPatient.id);
    get().syncHistory(demoPatient.id);
  },

  setUserAuth: async (user: User, token?: string) => {
    // 1. Immediately reset Zustand reactive state with clean empty arrays for this user
    try {
      sessionStorage.setItem('carepulse_app_unlocked', 'true');
    } catch {}
    set({
      user,
      isAuthenticated: true,
      isInitializing: false,
      appointments: [],
      activeAppointment: null,
      history: [],
      prescriptions: [],
    });

    // 2. Explicitly purge any previously cached session tokens to prevent cross-user token leaks
    try {
      localStorage.removeItem('carepulse_token');
      localStorage.removeItem('auth_token');
      await Preferences.remove({ key: 'auth_token' });
    } catch {}

    // 3. Persist new user to localStorage synchronously
    localStorage.setItem('has_logged_in', 'true');
    localStorage.setItem('carepulse_user', JSON.stringify(user));
    if (token && token.trim()) {
      localStorage.setItem('carepulse_token', token.trim());
      localStorage.setItem('auth_token', token.trim());
    }

    // 4. Persist to native Capacitor Preferences in background
    try {
      await Preferences.set({ key: 'carepulse_user', value: JSON.stringify(user) });
      if (token && token.trim()) {
        await Preferences.set({ key: 'auth_token', value: token.trim() });
      }
    } catch (e) {
      console.warn('Preferences storage note:', e);
    }

    // 5. Trigger live background sync of appointments, prescriptions, and history exclusively for the new user
    if (user && user.id) {
      get().syncAppointments(user.id);
      get().syncPrescriptions(user.id);
      get().syncHistory(user.id);
      registerPushNotifications(user.id).catch(() => {});
    }
  },

  checkAuthSession: async () => {
    try {
      // 1. Check Capacitor Preferences and localStorage for cached user
      let cachedUser: User | null = get().user;

      if (!cachedUser) {
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
          try {
            cachedUser = JSON.parse(cachedUserJson);
          } catch {
            cachedUser = null;
          }
        }
      }

      // Check saved biometric preference
      try {
        const { value: bioVal } = await Preferences.get({ key: 'carepulse_biometric_enabled' });
        if (bioVal !== null) {
          set({ isBiometricEnabled: bioVal === 'true' });
        }
      } catch {}

      // 2. Check for saved JWT token
      let token: string | null = null;
      try {
        const { value } = await Preferences.get({ key: 'auth_token' });
        token = value;
      } catch {
        token = null;
      }

      if (!token) {
        token = localStorage.getItem('carepulse_token') || localStorage.getItem('auth_token');
      }

      // If no token and no cached user, then user is not authenticated
      if (!token && !cachedUser) {
        set({
          isInitializing: false,
          isAuthenticated: false,
          user: null,
          appointments: [],
          activeAppointment: null,
          history: [],
          prescriptions: [],
        });
        return false;
      }

      // 3. If token exists, verify & refresh latest profile from backend /api/auth/me
      if (token) {
        try {
          const res = await apiGet('/auth/me', { Authorization: `Bearer ${token}` });
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
            get().syncPrescriptions(userData.id);
            get().syncHistory(userData.id);
            registerPushNotifications(userData.id).catch(() => {});
            return true;
          } else if (res && (res.status === 401 || res.status === 403)) {
            // Token is invalid/expired — purge stale credentials immediately
            await clearPersistentUserStorage();
            set({
              user: null,
              isAuthenticated: false,
              isInitializing: false,
              appointments: [],
              activeAppointment: null,
              history: [],
              prescriptions: [],
            });
            return false;
          }
        } catch (err) {
          console.warn('Background token refresh notice:', err);
        }
      }

      // If backend was unreachable or in offline mode, but we have a valid cached user,
      // preserve the user session so the user never gets logged out on app reopen
      if (cachedUser && cachedUser.id) {
        set({
          user: cachedUser,
          isAuthenticated: true,
          isInitializing: false,
        });
        get().syncAppointments(cachedUser.id);
        get().syncPrescriptions(cachedUser.id);
        get().syncHistory(cachedUser.id);
        registerPushNotifications(cachedUser.id).catch(() => {});
        return true;
      }

      set({
        isInitializing: false,
        isAuthenticated: false,
        user: null,
        appointments: [],
        activeAppointment: null,
        history: [],
        prescriptions: [],
      });
      return false;
    } catch {
      // On any unexpected error, if we had a user cached, keep them logged in
      const existingUser = get().user;
      if (existingUser && existingUser.id) {
        set({ isInitializing: false, isAuthenticated: true });
        return true;
      }
      set({
        isInitializing: false,
        isAuthenticated: false,
        user: null,
        appointments: [],
        activeAppointment: null,
        history: [],
        prescriptions: [],
      });
      return false;
    }
  },

  logout: async () => {
    // 1. Clear Google session on native Android & web
    try {
      await signOutGoogle();
    } catch {}

    // 2. Clear native Capacitor preferences & localStorage synchronously and asynchronously
    await clearPersistentUserStorage();

    // 3. Synchronously reset Zustand auth state and clear patient-specific records
    set({
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      appointments: [],
      activeAppointment: null,
      history: [],
      prescriptions: [],
    });
  },

  toggleBiometric: (enabled: boolean) => {
    localStorage.setItem('carepulse_biometric_enabled', String(enabled));
    Preferences.set({ key: 'carepulse_biometric_enabled', value: String(enabled) }).catch(() => {});
    set({ isBiometricEnabled: enabled });
  },

  updateUser: (updatedFields) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updated = { ...currentUser, ...updatedFields };
    localStorage.setItem('carepulse_user', JSON.stringify(updated));
    Preferences.set({ key: 'carepulse_user', value: JSON.stringify(updated) }).catch(() => {});
    set({ user: updated });
  },

  registerUser: (userData) => {
    const newUser: User = {
      id: `usr-${Date.now()}`,
      fullName: userData.fullName || 'Patient',
      dob: userData.dob || '1995-01-01',
      gender: (userData.gender as any) || 'Female',
      bloodGroup: userData.bloodGroup || 'O+',
      phone: userData.phone || '+91 98765 00000',
      email: userData.email || '',
      avatarUrl: userData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      emergencyContact: userData.emergencyContact || {
        name: 'Emergency Contact',
        phone: '+91 98765 00000',
        relationship: 'Primary Contact',
      },
      allergies: userData.allergies,
      preExistingConditions: userData.preExistingConditions,
      password: userData.password,
    };
    try {
      localStorage.removeItem('carepulse_token');
      localStorage.removeItem('auth_token');
      Preferences.remove({ key: 'auth_token' }).catch(() => {});
    } catch {}
    localStorage.setItem('has_logged_in', 'true');
    localStorage.setItem('carepulse_user', JSON.stringify(newUser));
    Preferences.set({ key: 'carepulse_user', value: JSON.stringify(newUser) }).catch(() => {});
    set({
      user: newUser,
      isAuthenticated: true,
      isInitializing: false,
      appointments: [],
      activeAppointment: null,
      history: [],
      prescriptions: [],
    });
  },

  appointments: [],
  activeAppointment: null,
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
    apiFetch(`/appointments/${encodeURIComponent(id)}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason: _reason || 'Cancelled by patient' }),
    }).catch((e) => console.warn('Cancel appointment API notice:', e));
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
      const pid = patientId || get().user?.id;
      if (!pid || pid === 'undefined' || pid === 'null') {
        set({ appointments: [], activeAppointment: null });
        return;
      }
      let res: Response | null = null;
      try {
        res = await apiFetch(`/appointments/patient/${encodeURIComponent(pid)}`, { method: 'GET' });
      } catch {
        res = null;
      }
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const upcoming = data.find((a: any) => a.status === 'Upcoming');
          set({
            appointments: data,
            activeAppointment: upcoming || data[0] || null,
          });
        }
      }
    } catch (e) {
      console.warn('Sync appointments notice:', e);
    }
  },

  prescriptions: [],
  syncPrescriptions: async (patientId?: string) => {
    try {
      const pid = patientId || get().user?.id;
      if (!pid || pid === 'undefined' || pid === 'null') {
        set({ prescriptions: [] });
        return;
      }
      let res: Response | null = null;
      try {
        res = await apiFetch(`/prescriptions/patient/${encodeURIComponent(pid)}`, { method: 'GET' });
      } catch {
        res = null;
      }
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          set({ prescriptions: data });
        }
      }
    } catch (e) {
      console.warn('Sync prescriptions notice:', e);
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

  history: [],
  syncHistory: async (patientId?: string) => {
    try {
      const pid = patientId || get().user?.id;
      if (!pid || pid === 'undefined' || pid === 'null') {
        set({ history: [] });
        return;
      }
      let res: Response | null = null;
      try {
        res = await apiFetch(`/consultations/patient/${encodeURIComponent(pid)}`, { method: 'GET' });
      } catch {
        res = null;
      }
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped: MedicalHistoryItem[] = data.map((c: any) => ({
            id: c.id,
            date: c.date,
            time: 'Consultation',
            doctorId: c.doctorId,
            doctorName: c.doctorName || 'Specialist Doctor',
            specialty: c.doctorSpecialty || 'General Consultation',
            hospitalId: c.hospitalId,
            hospital_id: c.hospitalId,
            hospitalName: c.hospitalName || 'CarePulse Central Hospital',
            diagnosis: c.diagnosis || 'Clinical consultation recorded.',
            prescriptionDetails: c.prescriptionDetails || 'Prescription notes provided.',
            status: 'Completed',
            specialtyIcon: 'stethoscope'
          }));
          set({ history: mapped });
        }
      }
    } catch (e) {
      console.warn('Sync history notice:', e);
    }
  },

  chatMessages: INITIAL_CHAT_MESSAGES,
  latestAssessment: null,
  isAiTyping: false,
  addChatMessage: async (msg) => {
    const userMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const currentHistory = get().chatMessages;
    set({
      chatMessages: [...currentHistory, userMsg],
    });

    if (msg.sender === 'user') {
      set({ isAiTyping: true });
      try {
        const formattedHistory = [...currentHistory, userMsg].map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

        const user = get().user;
        const patientContext = user
          ? `Patient Name: ${user.fullName}, Gender: ${user.gender || 'Not specified'}, Blood: ${user.bloodGroup || 'Not specified'}, Allergies: ${user.allergies || 'None'}, Conditions: ${user.preExistingConditions || 'None'}`
          : '';

        const res = await apiFetch('/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: formattedHistory,
            patient_context: patientContext,
          }),
        });

        if (res && res.ok) {
          const aiData = await res.json();
          const botMsg: ChatMessage = {
            id: `msg-${Date.now() + 1}`,
            sender: 'bot',
            text: aiData.reply || "I've reviewed your symptoms. Please stay hydrated and monitor your condition.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            quickReplyChips: aiData.quickReplyChips,
            confidence: aiData.confidence_score ?? 88,
            riskLevel: aiData.risk_level ?? 'low',
            specialty: (aiData.suggested_specialties && aiData.suggested_specialties[0]) || 'General Medicine',
            isEmergency: aiData.is_emergency ?? false,
            soapNote: aiData.soap_note,
          };

          set((state) => ({
            chatMessages: [...state.chatMessages, botMsg],
            latestAssessment: aiData.soap_note ? {
              subjective: aiData.soap_note.subjective || msg.text,
              objective: aiData.soap_note.objective || 'Pending in-person clinical examination.',
              assessmentDiagnosis: aiData.soap_note.assessment || `${aiData.suggested_specialties?.[0] || 'General Medicine'} Evaluation`,
              plan: aiData.soap_note.plan || 'Schedule specialist consultation for formal assessment.',
              confidence: aiData.confidence_score ?? 88,
              riskLevel: aiData.risk_level ?? 'low',
              specialty: aiData.suggested_specialties?.[0] || 'General Medicine',
            } : state.latestAssessment,
            isAiTyping: false,
          }));
          return botMsg;
        }
      } catch (err) {
        console.warn('AI Chat API offline fallback note:', err);
      }

      // Offline / fallback reasoning if network unreachable
      const userTextLower = msg.text.toLowerCase();
      let botReply = "I've noted the symptoms you described. Could you share how many days this has been present and if anything specific triggers or relieves it?";
      let chips: string[] = ['Check Temperature', 'Book Doctor Visit', 'Home Care Tips'];
      let confidence = 85;
      let riskLevel: 'low' | 'moderate' | 'critical' = 'low';

      if (userTextLower.includes('fever') || userTextLower.includes('fewer') || userTextLower.includes('fevr') || userTextLower.includes('chills') || userTextLower.includes('temp')) {
        botReply = "I hear you are dealing with an elevated temperature or fever. Stay well-hydrated with fluids and electrolytes, rest in a cool room, and monitor your readings. If temperature exceeds 102°F (38.9°C) or lasts over 48 hours, please consult a physician promptly.";
        chips = ['Check Temperature', 'Duration: 1-2 days', 'Body aches & Chills', 'Book Doctor Visit'];
        confidence = 88;
      } else if (userTextLower.includes('headache') || userTextLower.includes('hedache') || userTextLower.includes('migraine')) {
        botReply = "Headaches can stem from dehydration, tension, or eye strain. Ensure you take a break from screens, drink plenty of water, and rest in a dim room.";
        chips = ['Throbbing pain', 'Pain relief tips', 'Book Telehealth'];
        confidence = 86;
      } else if (userTextLower.includes('chest') || userTextLower.includes('breath') || userTextLower.includes('emergency')) {
        botReply = "🚨 CRITICAL SAFETY ALERT: Severe chest pain, pressure, or shortness of breath requires IMMEDIATE emergency medical attention. Please call 108 / 911 or visit the nearest ER right away.";
        chips = ['🚨 Call 108 Emergency', 'Find Nearest ER', 'Emergency Contact'];
        confidence = 98;
        riskLevel = 'critical';
      }

      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'bot',
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickReplyChips: chips,
        confidence,
        riskLevel,
        isEmergency: riskLevel === 'critical',
      };

      set((state) => ({
        chatMessages: [...state.chatMessages, botMsg],
        isAiTyping: false,
      }));
      return botMsg;
    }
    return null;
  },
  clearChat: () => set({ chatMessages: INITIAL_CHAT_MESSAGES, latestAssessment: null }),
}));
