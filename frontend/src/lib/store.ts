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
            // Token is invalid or expired — purge token only, preserve offline user session so user is never logged out on reload
            console.warn('Background token expired or rejected. Removing expired token while preserving active user session.');
            try {
              localStorage.removeItem('carepulse_token');
              localStorage.removeItem('auth_token');
              await Preferences.remove({ key: 'auth_token' });
            } catch {}
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
        set({ prescriptions: Array.isArray(data) ? data : [] });
      } else {
        set({ prescriptions: [] });
      }
    } catch (e) {
      console.warn('Sync prescriptions notice:', e);
      set({ prescriptions: [] });
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
            prescriptions: c.prescriptions || c.soapData?.prescriptions || [],
            soapData: c.soapData,
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

        let res: Response | null = null;
        try {
          res = await apiFetch('/health-assistant/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: formattedHistory,
              patient_context: patientContext,
            }),
          });
        } catch {
          res = null;
        }

        if (!res || !res.ok) {
          try {
            res = await apiFetch('/ai/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: formattedHistory,
                patient_context: patientContext,
              }),
            });
          } catch {
            res = null;
          }
        }

        if (res && res.ok) {
          const aiData = await res.json();
          const replyText = aiData.reply || aiData.response || "I've reviewed your symptoms. Please stay hydrated and monitor your condition.";
          const botMsg: ChatMessage = {
            id: `msg-${Date.now() + 1}`,
            sender: 'bot',
            text: replyText,
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
        console.warn('Health AI Chat API error:', err);
      }

      // Offline / fallback reasoning if network unreachable
      const userMessages = [...currentHistory, userMsg].filter((m) => m.sender === 'user').map((m) => m.text);
      const fullHistoryLower = userMessages.join(' ').toLowerCase();
      const turnCount = userMessages.length;

      let botReply = "I've noted the symptoms you described. To help evaluate this, could you share how long this has been present and if anything specific relieves it?";
      let chips: string[] = ['Book Doctor Visit', 'Check Symptoms', 'Home Care Guidance', 'Review SOAP Note'];
      let confidence = 85;
      let riskLevel: 'low' | 'moderate' | 'critical' = 'low';
      let specialty = 'General Medicine';
      let topCondition = 'General Health Intake Evaluation';

      if (fullHistoryLower.includes('chest') || fullHistoryLower.includes('breath') || fullHistoryLower.includes('emergency')) {
        botReply = "🚨 CRITICAL SAFETY ALERT: Severe chest pain, pressure, or shortness of breath requires IMMEDIATE emergency medical attention. Please call 108 / 911 or visit the nearest ER right away.";
        chips = ['🚨 Call 108 Emergency', 'Find Nearest ER', 'Emergency Contact'];
        confidence = 98;
        riskLevel = 'critical';
        specialty = 'Cardiology';
        topCondition = 'Acute Critical Emergency (Immediate Hospital Attention Required)';
      } else if (fullHistoryLower.includes('fever') || fullHistoryLower.includes('fewer') || fullHistoryLower.includes('fevr') || fullHistoryLower.includes('chills') || fullHistoryLower.includes('temp')) {
        specialty = 'General Medicine';
        topCondition = 'Acute Febrile Illness / Temperature Elevation';
        if (turnCount > 1) {
          botReply = "Thank you for providing those details. Based on your symptoms, this is consistent with an Acute Febrile Illness. Recommended care steps: Stay well-hydrated, rest in a cool room, and monitor your temperature. Consult a physician if your fever exceeds 102°F or persists beyond 48 hours.";
          chips = ['Book Doctor Visit', 'Review SOAP Note', 'Home Care Guidance'];
        } else {
          botReply = "I hear you are dealing with an elevated temperature or fever. Stay well-hydrated with fluids and electrolytes, rest in a cool room, and monitor your readings. How many days have you had this fever?";
          chips = ['Check Temperature', 'Duration: 1-2 days', 'Body aches & Chills', 'Book Doctor Visit'];
        }
        confidence = 88;
      } else if (fullHistoryLower.includes('headache') || fullHistoryLower.includes('hedache') || fullHistoryLower.includes('migraine')) {
        specialty = 'General Medicine';
        topCondition = 'Tension Headache / Cephalea Evaluation';
        if (turnCount > 1) {
          botReply = "Thank you for the update. Headaches often correlate with tension, dehydration, or eye strain. Ensure adequate hydration, rest in a quiet dim room, and take a screen break. If pain is severe or sudden, seek medical evaluation.";
          chips = ['Book Doctor Visit', 'Review SOAP Note', 'Home Care Guidance'];
        } else {
          botReply = "Headaches can stem from dehydration, tension, or eye strain. Is the pain throbbing or dull, and does bright light or noise make it worse?";
          chips = ['Throbbing pain', 'Pain relief tips', 'Book Telehealth'];
        }
        confidence = 86;
      } else if (fullHistoryLower.includes('cough') || fullHistoryLower.includes('phlegm') || fullHistoryLower.includes('mucus')) {
        specialty = 'Pulmonology';
        topCondition = 'Acute Upper Respiratory Tract Infection';
        if (turnCount > 1) {
          botReply = "Thank you for sharing. Your symptoms are consistent with an upper respiratory infection. Stay hydrated, sip warm fluids with honey, and use steam inhalation to soothe airway irritation. Consult a doctor if shortness of breath occurs.";
          chips = ['Book Doctor Visit', 'Review SOAP Note', 'Consult Pulmonology'];
        } else {
          botReply = "I understand you are dealing with a cough. Is it a dry tickly cough, or are you bringing up mucus or phlegm?";
          chips = ['Dry cough', 'Cough with phlegm', 'Home remedies', 'Consult Pulmonology'];
        }
        confidence = 86;
      } else if (fullHistoryLower.includes('neck') || fullHistoryLower.includes('cervical') || fullHistoryLower.includes('neckpain')) {
        specialty = 'General Medicine';
        topCondition = 'Cervical Strain / Postural Discomfort';
        if (turnCount > 1) {
          botReply = "Thank you for the details. Neck pain is frequently linked to muscle strain or sleeping posture. Gentle stretching, warm compresses, and maintaining good ergonomic posture can help. Seek medical attention if pain radiates or fever develops.";
          chips = ['Stiff neck check', 'Posture tips', 'Consult Specialist'];
        } else {
          botReply = "I hear you are experiencing neck pain or stiffness. How long have you had this neck pain, and can you turn your head side-to-side without severe discomfort?";
          chips = ['Stiff neck check', 'Posture tips', 'Duration > 3 days', 'Consult Specialist'];
        }
        confidence = 86;
      } else if (fullHistoryLower.includes('back') || fullHistoryLower.includes('lumbago')) {
        specialty = 'Orthopedics';
        topCondition = 'Musculoskeletal Lumbar Strain';
        if (turnCount > 1) {
          botReply = "Thank you for the update. Back discomfort typically responds to rest, gentle stretching, avoiding heavy lifting, and applying heat or cold packs. Consult an orthopedist if pain radiates down your leg or worsens.";
          chips = ['Posture & Stretching', 'Book Orthopedics', 'Review SOAP Note'];
        } else {
          botReply = "I note you are experiencing back discomfort. Is the pain located in your upper or lower back, and does it radiate down your legs?";
          chips = ['Lower back pain', 'Posture & Stretching', 'Pain relief tips', 'Book Orthopedics'];
        }
        confidence = 85;
      } else if (fullHistoryLower.includes('stomach') || fullHistoryLower.includes('acid') || fullHistoryLower.includes('reflux') || fullHistoryLower.includes('belly')) {
        specialty = 'Gastroenterology';
        topCondition = 'Dyspepsia / Acid Reflux Evaluation';
        if (turnCount > 1) {
          botReply = "Thank you for providing those details. For abdominal discomfort or acid reflux, eat smaller bland meals, avoid lying down immediately after eating, and stay hydrated. Consult a gastroenterologist if pain is sharp or persistent.";
          chips = ['Bland diet tips', 'Book Gastroenterology', 'Review SOAP Note'];
        } else {
          botReply = "I hear you are having stomach or abdominal discomfort. Where is the discomfort located, and is it a burning acid sensation or sharp cramps?";
          chips = ['Acid reflux / heartburn', 'Bland diet tips', 'Sharp stomach cramps', 'Book Gastroenterology'];
        }
        confidence = 86;
      } else if (turnCount > 1) {
        botReply = "Thank you for providing those details. I have synthesized your clinical intake profile based on your symptoms. Please review your generated SOAP Note or schedule a consultation with our general medicine specialists for formal examination.";
        chips = ['Book Doctor Visit', 'Review SOAP Note', 'Check Symptoms'];
      }

      const soapDraft = {
        status: 'draft_pending_physician_review',
        department: specialty,
        subjective: `Patient reports primary complaint of ${msg.text}.`,
        objective: 'Vital Signs: Pending triage desk recording.',
        assessment: `1. Primary Clinical Impression: ${topCondition}.\n2. Recommended Referral: ${specialty}.`,
        plan: `1. Schedule clinical evaluation with ${specialty}.\n2. Monitor symptoms and seek emergency care if red flags develop.`
      };

      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'bot',
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickReplyChips: chips,
        confidence,
        riskLevel,
        specialty,
        isEmergency: riskLevel === 'critical',
        soapNote: soapDraft
      };

      set((state) => ({
        chatMessages: [...state.chatMessages, botMsg],
        latestAssessment: {
          subjective: soapDraft.subjective,
          objective: soapDraft.objective,
          assessmentDiagnosis: soapDraft.assessment,
          plan: soapDraft.plan,
          confidence,
          riskLevel,
          specialty
        },
        isAiTyping: false,
      }));
      return botMsg;
    }
    return null;
  },
  clearChat: () => set({ chatMessages: INITIAL_CHAT_MESSAGES, latestAssessment: null }),
}));
