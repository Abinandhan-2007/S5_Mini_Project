// src/store/staffStore.ts
import { create } from 'zustand';
import type {
  Staff,
  AdminProfile,
  ReceptionistRecord,
  NurseRecord,
  HospitalSettings,
  HospitalBranch,
  DepartmentRecord,
  AnnouncementRecord,
} from '../types/staff';
import type { DoctorRecord, TokenQueueItem, TokenStatus, ReceptionistProfile, TimeSlotCapacity } from '../types/receptionist';
import { receptionistService } from '../services/receptionistService';
import { apiGet, apiPost, apiFetch } from '../lib/apiFetch';

export function createSplitSlot(
  id: string,
  timeSlot: string,
  maxSeats: number,
  onlineBooked = 0,
  offlineBooked = 0,
  isAvailable = true
): TimeSlotCapacity {
  const onlineMaxSeats = Math.ceil(maxSeats / 2);
  const offlineMaxSeats = Math.floor(maxSeats / 2);
  const onlineAvailableSeats = Math.max(0, onlineMaxSeats - onlineBooked);
  const offlineAvailableSeats = Math.max(0, offlineMaxSeats - offlineBooked);

  return {
    id,
    timeSlot,
    maxSeats,
    bookedSeats: onlineBooked + offlineBooked,
    availableSeats: onlineAvailableSeats + offlineAvailableSeats,
    onlineMaxSeats,
    onlineBookedSeats: onlineBooked,
    onlineAvailableSeats,
    offlineMaxSeats,
    offlineBookedSeats: offlineBooked,
    offlineAvailableSeats,
    isAvailable,
  };
}

export const DEFAULT_SLOTS: TimeSlotCapacity[] = [];

const INITIAL_DOCTORS: DoctorRecord[] = [];

const INITIAL_TOKENS: TokenQueueItem[] = [];

const getStoredStaff = (): Staff | null => {
  try {
    const raw = localStorage.getItem('carepulse_staff');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getInitialReceptionistProfile = (): ReceptionistProfile => {
  const storedStaff = getStoredStaff();
  if (storedStaff && storedStaff.role === 'receptionist') {
    const hospName = storedStaff.hospitalName || storedStaff.hospital_name || 'CarePulse Medical Center';
    const empId = storedStaff.staffCode || storedStaff.staff_code || '';
    const emailPrefix = storedStaff.email ? storedStaff.email.split('@')[0] : 'receptionist';
    return {
      id: storedStaff.id,
      name: storedStaff.name || 'Reception Desk',
      fullName: storedStaff.name || 'Reception Desk',
      username: storedStaff.username || emailPrefix,
      email: storedStaff.email || '',
      phone: storedStaff.phone || '',
      employeeId: empId,
      staffCode: empId,
      clinicName: hospName,
      hospitalName: hospName,
      hospitalId: storedStaff.hospitalId || undefined,
      deskName: storedStaff.deskName || 'Main Reception & OPD Desk',
      department: storedStaff.department || 'Front Desk & Patient Triage',
      shift: 'Morning Shift (08:00 AM - 04:00 PM)',
      avatarUrl: storedStaff.avatarUrl || storedStaff.avatar || '',
      operationalStatus: 'Active On Duty',
      twoFactorEnabled: true,
      isActive: true,
    };
  }
  return {
    id: '',
    name: 'Reception Desk',
    fullName: 'Reception Desk',
    username: 'receptionist',
    email: '',
    phone: '',
    employeeId: '',
    staffCode: '',
    clinicName: 'CarePulse Medical Center',
    hospitalName: 'CarePulse Medical Center',
    hospitalId: '',
    deskName: 'Main Reception & OPD Desk',
    department: 'Front Desk & Patient Triage',
    shift: 'Morning Shift (08:00 AM - 04:00 PM)',
    avatarUrl: '',
    operationalStatus: 'Active On Duty',
    twoFactorEnabled: true,
    isActive: true,
  };
};

const DEFAULT_ADMIN_PROFILE: AdminProfile = {
  id: '',
  name: 'Hospital Administrator',
  email: '',
  username: 'admin',
  password: '',
  phone: '',
  role: 'admin',
  department: 'Hospital Administration & Operations',
  avatarUrl: '',
  hospitalName: 'CarePulse Medical Center',
  hospitalId: '',
};

export const getInitialAdminProfile = (): AdminProfile => {
  const storedStaff = getStoredStaff();
  if (storedStaff && storedStaff.role === 'admin') {
    const hospName = storedStaff.hospitalName || storedStaff.hospital_name || 'CarePulse Medical Center';
    return {
      id: storedStaff.id,
      name: storedStaff.name || 'Hospital Administrator',
      email: storedStaff.email || '',
      username: storedStaff.username || (storedStaff.email ? storedStaff.email.split('@')[0] : 'admin'),
      password: '',
      phone: storedStaff.phone || '',
      role: 'admin',
      department: storedStaff.department || 'Chief Hospital Administration',
      avatarUrl: storedStaff.avatarUrl || '',
      hospitalName: hospName,
      hospitalId: storedStaff.hospitalId || undefined,
    };
  }
  return DEFAULT_ADMIN_PROFILE;
};

const DEFAULT_HOSPITAL_SETTINGS: HospitalSettings = {
  name: 'CarePulse Medical Center',
  tagline: 'Advanced Clinical Care & Patient Guidance Center',
  address: 'Healthcare Complex, Medical District',
  phone: '+91 1800 123 4567',
  emergencyHotline: '+91 1800 123 4567',
  email: 'admin@carepulse.health',
  logoUrl: '/hospital_default.jpg',
  defaultSlotDurationMinutes: 30,
  maxOnlineBookingPercentage: 50,
  enableAiTriage: true,
  enableSmsReminders: true,
  enableAutoCancellation: false,
};

export const getInitialHospitalSettings = (): HospitalSettings => {
  const storedStaff = getStoredStaff();
  const hospName = storedStaff?.hospitalName || storedStaff?.hospital_name || 'CarePulse Medical Center';
  return {
    ...DEFAULT_HOSPITAL_SETTINGS,
    name: hospName,
  };
};

const DEFAULT_RECEPTIONISTS: ReceptionistRecord[] = [];

const DEFAULT_HOSPITALS: HospitalBranch[] = [];

const DEFAULT_DEPARTMENTS: DepartmentRecord[] = [];

const DEFAULT_ANNOUNCEMENTS: AnnouncementRecord[] = [];

export interface StaffState {
  currentStaff: Staff | null;
  receptionistProfile: ReceptionistProfile;
  adminProfile: AdminProfile;
  hospitalSettings: HospitalSettings;
  receptionists: ReceptionistRecord[];
  nurses: NurseRecord[];
  hospitals: HospitalBranch[];
  departments: DepartmentRecord[];
  announcements: AnnouncementRecord[];
  doctors: DoctorRecord[];
  tokens: TokenQueueItem[];
  isLoading: boolean;
  error: string | null;

  // Auth Actions
  setStaffAuth: (staff: Staff, token?: string) => void;
  logoutStaff: () => void;

  // Department Actions
  addDepartment: (deptData: Partial<DepartmentRecord>) => Promise<void>;
  updateDepartment: (id: string, updates: Partial<DepartmentRecord>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;

  // Announcement Actions
  addAnnouncement: (annData: Partial<AnnouncementRecord>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;

  // Hospital Branch Actions
  addHospital: (hospData: Partial<HospitalBranch>) => Promise<void>;
  updateHospital: (id: string, updates: Partial<HospitalBranch>) => Promise<void>;
  deleteHospital: (id: string) => Promise<void>;

  // Receptionist Actions
  fetchReceptionistProfile: () => Promise<void>;
  updateReceptionistProfile: (profile: Partial<ReceptionistProfile>) => Promise<void>;

  // Admin Receptionist Actions
  fetchReceptionists: () => Promise<void>;
  createReceptionist: (recData: Partial<ReceptionistRecord>) => Promise<void>;
  updateReceptionist: (id: string, updates: Partial<ReceptionistRecord>) => Promise<void>;
  deleteReceptionist: (id: string) => Promise<void>;
  toggleReceptionistStatus: (id: string) => Promise<void>;

  // Admin Nurse Actions
  fetchNurses: () => Promise<void>;
  createNurse: (nurseData: Partial<NurseRecord>) => Promise<NurseRecord | null>;
  updateNurse: (id: string, updates: Partial<NurseRecord>) => Promise<void>;
  deleteNurse: (id: string) => Promise<void>;
  toggleNurseStatus: (id: string) => Promise<void>;
  updateHospitalSettings: (settings: Partial<HospitalSettings>) => Promise<void>;
  updateAdminProfile: (profile: Partial<AdminProfile>) => Promise<void>;
  globalSlotOverride: (doctorId: string, slotId: string, maxSeats: number, isAvailable?: boolean) => Promise<void>;
  updateDoctor: (id: string, updates: Partial<DoctorRecord>) => Promise<void>;
  deleteDoctor: (id: string) => Promise<void>;

  // Doctor & Token Actions
  fetchDoctors: (silent?: boolean) => Promise<void>;
  toggleDoctorAvailability: (doctorId: string, isAvailable?: boolean, reason?: string, unavailableUntil?: string) => Promise<void>;
  updateDoctorSlotCapacity: (doctorId: string, timeSlot: string, availableSeats: number) => Promise<void>;
  updateSlotCapacity: (doctorId: string, timeSlot: string, maxSeats: number, isAvailable?: boolean) => Promise<void>;
  addTimeSlot: (doctorId: string, timeSlot: string, maxSeats: number) => Promise<void>;
  removeTimeSlot: (doctorId: string, slotId: string) => Promise<void>;
  createDoctor: (doctorData: Partial<DoctorRecord>) => Promise<void>;
  fetchTokens: (doctorId?: string, silent?: boolean) => Promise<void>;
  callNextToken: (doctorId?: string) => Promise<void>;
  updateTokenStatus: (
    tokenId: string,
    status: TokenStatus,
    consultationData?: {
      diagnosis?: string;
      assessment?: string;
      clinicalNotes?: string;
      prescriptionDetails?: string;
      prescriptions?: string[];
      checkInTime?: string;
    }
  ) => Promise<void>;
  bookWalkInAppointment: (appointmentData: {
    patientName: string;
    patientPhone: string;
    doctorId: string;
    doctorName: string;
    doctorSpecialty: string;
    date: string;
    timeSlot: string;
    age?: number;
    bloodGroup?: string;
    address?: string;
    healthIssue?: string;
    hospitalId?: string;
    hospitalName?: string;
  }) => Promise<TokenQueueItem | null>;
}

export const useStaffStore = create<StaffState>((set, get) => ({
  currentStaff: getStoredStaff(),
  receptionistProfile: getInitialReceptionistProfile(),
  adminProfile: getInitialAdminProfile(),
  hospitalSettings: getInitialHospitalSettings(),
  receptionists: DEFAULT_RECEPTIONISTS,
  nurses: [],
  hospitals: DEFAULT_HOSPITALS,
  departments: DEFAULT_DEPARTMENTS,
  announcements: DEFAULT_ANNOUNCEMENTS,
  doctors: INITIAL_DOCTORS,
  tokens: INITIAL_TOKENS,
  isLoading: false,
  error: null,

  setStaffAuth: (staff, token) => {
    if (token) localStorage.setItem('staff_token', token);
    if (staff) {
      const hospId = staff.hospitalId || staff.hospital_id;
      const hospName = staff.hospitalName || staff.hospital_name || 'CarePulse Medical Center';
      const updatedStaff = {
        ...staff,
        hospitalId: hospId,
        hospital_id: hospId,
        hospitalName: hospName,
        hospital_name: hospName,
      };
      localStorage.setItem('carepulse_staff', JSON.stringify(updatedStaff));

      set((state) => ({
        hospitalSettings: {
          ...state.hospitalSettings,
          name: hospName,
        },
      }));

      if (staff.role === 'receptionist') {
        const emailPrefix = staff.email ? staff.email.split('@')[0] : 'receptionist';
        const empId = staff.staff_code || staff.staffCode || staff.id || '';
        set((state) => ({
          receptionistProfile: {
            ...state.receptionistProfile,
            id: staff.id,
            name: staff.name || state.receptionistProfile.name,
            fullName: staff.name || state.receptionistProfile.fullName,
            username: staff.username || emailPrefix,
            email: staff.email,
            phone: staff.phone || state.receptionistProfile.phone,
            department: staff.department || state.receptionistProfile.department,
            clinicName: hospName,
            hospitalName: hospName,
            hospitalId: hospId,
            deskName: staff.deskName || state.receptionistProfile.deskName || 'Main Reception & OPD Desk',
            employeeId: empId,
            staffCode: empId,
          },
        }));
      }

      if (staff.role === 'admin') {
        set((state) => ({
          adminProfile: {
            ...state.adminProfile,
            id: staff.id,
            name: staff.name || state.adminProfile.name,
            email: staff.email,
            hospitalId: hospId,
            hospitalName: hospName,
            department: staff.department || state.adminProfile.department,
          },
        }));
      }
    }
    set({ currentStaff: staff });
  },

  logoutStaff: () => {
    localStorage.removeItem('staff_token');
    localStorage.removeItem('carepulse_staff');
    set({ currentStaff: null });
  },

  fetchReceptionistProfile: async () => {
    try {
      const realProfile = await receptionistService.getProfile();
      if (realProfile) {
        set({ receptionistProfile: realProfile });
      }
    } catch (e) {
      console.warn('Failed to fetch real receptionist profile from API', e);
    }
  },

  updateReceptionistProfile: async (updatedData) => {
    set((state) => ({
      receptionistProfile: { ...state.receptionistProfile, ...updatedData },
    }));
    try {
      const saved = await receptionistService.updateProfile(updatedData);
      if (saved) {
        set({ receptionistProfile: saved });
      }
    } catch (e) {
      console.warn('Failed to update receptionist profile via backend', e);
    }
  },

  fetchDoctors: async (silent?: boolean) => {
    if (!silent) set({ isLoading: true });
    try {
      const hospId = get().currentStaff?.hospitalId || get().currentStaff?.hospital_id;
      const doctors = await receptionistService.getDoctors(hospId);
      if (doctors) {
        set({ doctors, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      if (!silent) set({ isLoading: false });
    }
  },

  toggleDoctorAvailability: async (doctorId: string, isAvailable?: boolean, reason?: string, unavailableUntil?: string) => {
    const currentDoc = get().doctors.find(d => d.id === doctorId || d.staffCode === doctorId || d.staff_code === doctorId);
    const nextAvail = typeof isAvailable === 'boolean' ? isAvailable : (currentDoc ? !currentDoc.isAvailable : true);
    const finalReason = nextAvail ? '' : (reason !== undefined ? reason : (currentDoc?.availabilityReason || 'Temporarily Away'));
    const finalUntil = nextAvail ? '' : (unavailableUntil !== undefined ? unavailableUntil : (currentDoc?.unavailableUntil || ''));

    set(state => ({
      doctors: state.doctors.map(doc => {
        if (doc.id !== doctorId && doc.staffCode !== doctorId && doc.staff_code !== doctorId) return doc;
        return {
          ...doc,
          isAvailable: nextAvail,
          is_available: nextAvail,
          availabilityReason: finalReason,
          availability_reason: finalReason,
          unavailableUntil: finalUntil,
          unavailable_until: finalUntil,
        };
      })
    }));

    await receptionistService.toggleDoctorAvailability(doctorId, nextAvail, finalReason, finalUntil);
    await get().fetchDoctors(true);
  },

  updateDoctorSlotCapacity: async (doctorId: string, timeSlot: string, availableSeats: number) => {
    set(state => ({
      doctors: state.doctors.map(doc => {
        if (doc.id !== doctorId) return doc;
        const currentSlots = doc.slotCapacities || [];
        const updatedSlots = currentSlots.map(slot => {
          if (slot.timeSlot !== timeSlot) return slot;
          const offlineAvail = Math.max(0, availableSeats);
          return {
            ...slot,
            offlineAvailableSeats: offlineAvail,
            availableSeats: slot.onlineAvailableSeats + offlineAvail
          };
        });
        return { ...doc, slotCapacities: updatedSlots };
      })
    }));

    await receptionistService.updateSlotCapacity(doctorId, timeSlot, availableSeats);
  },

  updateSlotCapacity: async (doctorId: string, timeSlot: string, maxSeats: number, isAvailable = true) => {
    set(state => ({
      doctors: state.doctors.map(doc => {
        if (doc.id !== doctorId) return doc;
        const currentSlots = doc.slotCapacities || [];
        const updatedSlots = currentSlots.map(slot => {
          if (slot.timeSlot !== timeSlot) return slot;
          const onlineMax = Math.ceil(maxSeats / 2);
          const offlineMax = Math.floor(maxSeats / 2);
          const onlineAvail = Math.max(0, onlineMax - slot.onlineBookedSeats);
          const offlineAvail = Math.max(0, offlineMax - slot.offlineBookedSeats);
          return {
            ...slot,
            maxSeats,
            onlineMaxSeats: onlineMax,
            onlineAvailableSeats: onlineAvail,
            offlineMaxSeats: offlineMax,
            offlineAvailableSeats: offlineAvail,
            availableSeats: onlineAvail + offlineAvail,
            isAvailable
          };
        });
        return { ...doc, slotCapacities: updatedSlots };
      })
    }));

    await receptionistService.updateSlotCapacity(doctorId, timeSlot, maxSeats, isAvailable);
  },

  addTimeSlot: async (doctorId: string, timeSlot: string, maxSeats: number) => {
    set(state => ({
      doctors: state.doctors.map(doc => {
        if (doc.id !== doctorId) return doc;
        const currentSlots = doc.slotCapacities || [];
        const exists = currentSlots.some(s => s.timeSlot === timeSlot);
        if (exists) return doc;
        const newSlot = createSplitSlot(`slot-${Date.now()}`, timeSlot, maxSeats, 0, 0, true);
        return { ...doc, slotCapacities: [...currentSlots, newSlot] };
      })
    }));

    await receptionistService.addSlot(doctorId, timeSlot, maxSeats, true);
  },

  removeTimeSlot: async (doctorId: string, slotId: string) => {
    set(state => ({
      doctors: state.doctors.map(doc => {
        if (doc.id !== doctorId) return doc;
        const currentSlots = doc.slotCapacities || [];
        return {
          ...doc,
          slotCapacities: currentSlots.filter(s => s.id !== slotId && s.timeSlot !== slotId)
        };
      })
    }));

    await receptionistService.deleteSlot(doctorId, slotId);
  },

  createDoctor: async (doctorData: Partial<DoctorRecord>) => {
    const hospId = get().currentStaff?.hospitalId || get().currentStaff?.hospital_id || 'hosp-bag';
    try {
      const created = await receptionistService.createDoctor({
        ...doctorData,
        hospital_id: doctorData.hospital_id || hospId,
        hospitalId: doctorData.hospitalId || hospId,
      });
      if (created) {
        const formatted: DoctorRecord = {
          ...created,
          isAvailable: created.isAvailable !== false,
          department: created.department || created.specialty || 'General Medicine',
          specialty: created.specialty || created.department || 'General Medicine',
          photo: created.photo || '/doctor_default.jpg',
          password: created.password || doctorData.password || 'doc123',
        };
        set((state) => ({
          doctors: [formatted, ...state.doctors.filter((d) => d.id !== formatted.id)],
        }));
      }
    } catch (e) {
      console.warn('Create doctor store error:', e);
    }
    await get().fetchDoctors(true);
  },

  fetchTokens: async (doctorId?: string, silent?: boolean) => {
    if (!silent) set({ isLoading: true });
    try {
      const hospId = get().currentStaff?.hospitalId || get().currentStaff?.hospital_id;
      const fetchedTokens = await receptionistService.getTokenQueue(doctorId, hospId);
      if (fetchedTokens) {
        // Merge fetched tokens with any pending local walk-ins to avoid wiping optimistic records
        const fetchedIds = new Set(fetchedTokens.map((t) => t.id));
        const localWalkIns = get().tokens.filter(
          (t) => t.id.startsWith('tok-') && !fetchedIds.has(t.id) && (t.type || '').toLowerCase().includes('walk-in')
        );
        set({ tokens: [...localWalkIns, ...fetchedTokens], isLoading: false });
      } else {
        if (!silent) set({ isLoading: false });
      }
    } catch {
      if (!silent) set({ isLoading: false });
    }
  },

  callNextToken: async (doctorId?: string) => {
    await receptionistService.callNextToken(doctorId);
    const waitingTokens = get().tokens.filter(t => t.status === 'Waiting');
    if (waitingTokens.length > 0) {
      const targetToken = doctorId ? waitingTokens.find(t => t.doctorId === doctorId) : waitingTokens[0];
      if (targetToken) {
        set(state => ({
          tokens: state.tokens.map(t => t.id === targetToken.id ? { ...t, status: 'In Consultation' } : t)
        }));
      }
    }
  },

  updateTokenStatus: async (
    tokenId: string,
    status: TokenStatus,
    consultationData?: {
      diagnosis?: string;
      assessment?: string;
      clinicalNotes?: string;
      prescriptionDetails?: string;
      prescriptions?: string[];
      checkInTime?: string;
    }
  ) => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const nowTimeStr = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;

    set((state) => ({
      tokens: state.tokens.map((t) =>
        t.id === tokenId
          ? {
              ...t,
              status,
              ...(status === 'Checked In' ? { checkInTime: consultationData?.checkInTime || nowTimeStr } : {}),
              ...(consultationData?.checkInTime ? { checkInTime: consultationData.checkInTime } : {}),
              ...(consultationData?.diagnosis ? { diagnosis: consultationData.diagnosis } : {}),
              ...(consultationData?.assessment ? { assessment: consultationData.assessment } : {}),
              ...(consultationData?.clinicalNotes ? { clinicalNotes: consultationData.clinicalNotes } : {}),
              ...(consultationData?.prescriptionDetails ? { prescriptionDetails: consultationData.prescriptionDetails } : {}),
              ...(consultationData?.prescriptions ? { prescriptions: consultationData.prescriptions } : {}),
            }
          : t
      ),
    }));

    const effectiveCheckInTime = consultationData?.checkInTime || (status === 'Checked In' ? nowTimeStr : undefined);
    await receptionistService.updateTokenStatus(tokenId, status, effectiveCheckInTime);
  },

  bookWalkInAppointment: async (payload) => {
    const todayIso = new Date().toISOString().split('T')[0];
    const targetDate = payload.date || todayIso;
    const ticketNumber = `#CP-${Math.floor(1000 + Math.random() * 9000)}`;
    const tokenNumber = `#TOK-${String(get().tokens.length + 1).padStart(3, '0')}`;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentHospId = get().currentStaff?.hospitalId || get().currentStaff?.hospital_id || 'hosp-1';
    const currentHospName = get().hospitalSettings?.name || 'CarePulse Medical Center';

    const tempToken: TokenQueueItem = {
      id: `tok-${Date.now()}`,
      tokenNumber,
      patientName: payload.patientName,
      patientPhone: payload.patientPhone,
      doctorId: payload.doctorId,
      doctorName: payload.doctorName,
      doctorSpecialty: payload.doctorSpecialty,
      ticketNumber,
      timeSlot: payload.timeSlot,
      status: 'Waiting',
      arrivalTime: nowStr,
      issueTime: nowStr,
      type: 'Walk-In',
      date: targetDate,
      age: payload.age || 30,
      bloodGroup: payload.bloodGroup || 'O+',
      address: payload.address || '',
      healthIssue: payload.healthIssue || 'General Consultation',
      hospitalId: payload.hospitalId || currentHospId,
      hospital_id: payload.hospitalId || currentHospId,
    };

    set((state) => ({
      tokens: [tempToken, ...state.tokens],
      doctors: state.doctors.map((doc) => {
        if (doc.id !== payload.doctorId) return doc;
        return {
          ...doc,
          slotCapacities: (doc.slotCapacities || []).map((slot) => {
            if (slot.timeSlot !== payload.timeSlot) return slot;
            const offlineBooked = (slot.offlineBookedSeats || 0) + 1;
            const offlineMax = slot.offlineMaxSeats || 3;
            const offlineAvail = Math.max(0, offlineMax - offlineBooked);
            const totalBooked = (slot.onlineBookedSeats || 0) + offlineBooked;
            const totalAvail = (slot.onlineAvailableSeats || 0) + offlineAvail;

            return {
              ...slot,
              offlineBookedSeats: offlineBooked,
              offlineAvailableSeats: offlineAvail,
              bookedSeats: totalBooked,
              availableSeats: totalAvail,
            };
          }),
        };
      }),
    }));

    try {
      const serverRes = await receptionistService.bookWalkInAppointment({
        ...payload,
        date: targetDate,
        hospitalId: payload.hospitalId || currentHospId,
        hospitalName: payload.hospitalName || currentHospName,
      });

      if (serverRes?.token) {
        const finalToken: TokenQueueItem = {
          ...tempToken,
          ...serverRes.token,
          id: serverRes.token.id || tempToken.id,
          tokenNumber: serverRes.token.tokenNumber || tempToken.tokenNumber,
          ticketNumber: serverRes.token.ticketNumber || serverRes.ticketNumber || tempToken.ticketNumber,
          type: 'Walk-In',
          status: 'Waiting',
        };

        set((state) => ({
          tokens: state.tokens.map((t) => (t.id === tempToken.id ? finalToken : t)),
        }));

        return finalToken;
      }
    } catch (e) {
      console.warn('Backend sync failed, using optimistic walk-in token', e);
    }

    return tempToken;
  },

  // Admin Actions Implementation
  fetchReceptionists: async () => {
    try {
      const hospId = get().currentStaff?.hospitalId || get().currentStaff?.hospital_id;
      const q = hospId ? `?hospital_id=${encodeURIComponent(hospId)}` : '';
      const res = await apiGet(`/admin/receptionists${q}`);
      if (res.ok) {
        const data = await res.json();
        set({ receptionists: Array.isArray(data) ? data : [] });
      } else {
        set({ receptionists: [] });
      }
    } catch {
      set({ receptionists: [] });
    }
  },

  createReceptionist: async (recData: Partial<ReceptionistRecord>) => {
    const hospId = get().currentStaff?.hospitalId || get().currentStaff?.hospital_id;
    try {
      const res = await apiPost('/admin/receptionists', {
        name: recData.name || 'New Receptionist',
        email: recData.email || 'receptionist@carepulse.com',
        password: recData.password || undefined,
        phone: recData.phone || '+91 98765 00000',
        department: recData.department || 'Front Desk',
        deskNumber: recData.deskNumber || 'Desk A-1',
        shift: recData.shift || 'Morning',
        assignedDoctorsCount: recData.assignedDoctorsCount || 2,
        avatarUrl: recData.avatarUrl || '',
        hospital_id: hospId,
      });
      if (res.ok) {
        const data = await res.json();
        const created = data.receptionist;
        if (created) {
          set((state) => ({
            receptionists: [created, ...state.receptionists.filter((r) => r.id !== created.id)],
          }));
          return;
        }
      }
    } catch (e) {
      console.warn('Backend receptionist create note:', e);
    }
    get().fetchReceptionists();
  },

  updateReceptionist: async (id: string, updates: Partial<ReceptionistRecord>) => {
    set((state) => ({
      receptionists: state.receptionists.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
    try {
      await apiFetch(`/admin/receptionists/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.warn('Backend receptionist update note:', e);
    }
  },

  deleteReceptionist: async (id: string) => {
    set((state) => ({
      receptionists: state.receptionists.filter((r) => r.id !== id),
    }));
    try {
      await apiFetch(`/admin/receptionists/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Backend receptionist delete note:', e);
    }
  },

  toggleReceptionistStatus: async (id: string) => {
    const rec = get().receptionists.find((r) => r.id === id);
    if (!rec) return;
    const nextStatus = !rec.isActive;
    get().updateReceptionist(id, { isActive: nextStatus });
  },

  // Admin Nurse Actions Implementation
  fetchNurses: async () => {
    try {
      const hospId = get().currentStaff?.hospitalId || get().currentStaff?.hospital_id;
      const q = hospId ? `?hospital_id=${encodeURIComponent(hospId)}` : '';
      const res = await apiGet(`/admin/nurses${q}`);
      if (res.ok) {
        const data = await res.json();
        set({ nurses: Array.isArray(data) ? data : [] });
      } else {
        set({ nurses: [] });
      }
    } catch {
      set({ nurses: [] });
    }
  },

  createNurse: async (nurseData: Partial<NurseRecord>) => {
    const hospId = get().currentStaff?.hospitalId || get().currentStaff?.hospital_id;
    try {
      const res = await apiPost('/admin/nurses', {
        name: nurseData.name || 'New Nurse',
        email: nurseData.email || 'nurse@carepulse.com',
        username: nurseData.username || undefined,
        password: nurseData.password || undefined,
        phone: nurseData.phone || '+91 98765 00000',
        department: nurseData.department || 'Triage & Vitals',
        shift: nurseData.shift || 'Morning',
        avatarUrl: nurseData.avatarUrl || '',
        hospital_id: hospId,
      });
      if (res.ok) {
        const data = await res.json();
        const created = data.nurse;
        if (created) {
          set((state) => ({
            nurses: [created, ...state.nurses.filter((n) => n.id !== created.id)],
          }));
          return created;
        }
      }
    } catch (e) {
      console.warn('Backend nurse create note:', e);
    }
    get().fetchNurses();
    return null;
  },

  updateNurse: async (id: string, updates: Partial<NurseRecord>) => {
    set((state) => ({
      nurses: state.nurses.map((n) =>
        n.id === id ? { ...n, ...updates } : n
      ),
    }));
    try {
      await apiFetch(`/admin/nurses/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.warn('Backend nurse update note:', e);
    }
  },

  deleteNurse: async (id: string) => {
    set((state) => ({
      nurses: state.nurses.filter((n) => n.id !== id),
    }));
    try {
      await apiFetch(`/admin/nurses/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Backend nurse delete note:', e);
    }
  },

  toggleNurseStatus: async (id: string) => {
    const nurse = get().nurses.find((n) => n.id === id);
    if (!nurse) return;
    const nextStatus = !nurse.isActive;
    get().updateNurse(id, { isActive: nextStatus });
  },

  updateHospitalSettings: async (settings: Partial<HospitalSettings>) => {
    set((state) => ({
      hospitalSettings: { ...state.hospitalSettings, ...settings },
    }));
  },

  updateAdminProfile: async (profile: Partial<AdminProfile>) => {
    set((state) => ({
      adminProfile: { ...state.adminProfile, ...profile },
    }));
  },

  globalSlotOverride: async (
    doctorId: string,
    slotId: string,
    maxSeats: number,
    isAvailable = true
  ) => {
    set((state) => ({
      doctors: state.doctors.map((doc) => {
        if (doc.id !== doctorId) return doc;
        return {
          ...doc,
          slotCapacities: doc.slotCapacities.map((slot) => {
            if (slot.id !== slotId) return slot;
            return createSplitSlot(
              slot.id,
              slot.timeSlot,
              maxSeats,
              slot.onlineBookedSeats,
              slot.offlineBookedSeats,
              isAvailable
            );
          }),
        };
      }),
    }));
  },

  updateDoctor: async (id: string, updates: Partial<DoctorRecord>) => {
    set((state) => ({
      doctors: state.doctors.map((doc) =>
        doc.id === id ? { ...doc, ...updates } : doc
      ),
    }));
    try {
      await apiFetch(`/admin/doctors/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.warn('Backend doctor update error:', e);
    }
  },

  deleteDoctor: async (id: string) => {
    set((state) => ({
      doctors: state.doctors.filter((doc) => doc.id !== id),
    }));
    try {
      await apiFetch(`/admin/doctors/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Backend doctor delete error:', e);
    }
  },

  addHospital: async (hospData: Partial<HospitalBranch>) => {
    const newHosp: HospitalBranch = {
      id: `hosp-${Date.now()}`,
      name: hospData.name || 'New Hospital Location',
      address: hospData.address || 'Medical Hub',
      city: hospData.city || 'Metro District',
      phone: hospData.phone || '+1 (555) 000-0000',
      operatingHours: hospData.operatingHours || '24/7 Service',
      doctorsCount: hospData.doctorsCount || 5,
      receptionDesksCount: hospData.receptionDesksCount || 2,
      logoUrl: hospData.logoUrl || '/hospital_default.jpg',
      isActive: true,
    };
    set((state) => ({
      hospitals: [newHosp, ...state.hospitals],
    }));
  },

  updateHospital: async (id: string, updates: Partial<HospitalBranch>) => {
    set((state) => ({
      hospitals: state.hospitals.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    }));
  },

  deleteHospital: async (id: string) => {
    set((state) => ({
      hospitals: state.hospitals.filter((h) => h.id !== id),
    }));
  },

  addDepartment: async (deptData: Partial<DepartmentRecord>) => {
    const newDept: DepartmentRecord = {
      id: `dept-${Date.now()}`,
      name: deptData.name || 'New Department',
      iconName: deptData.iconName || 'Stethoscope',
      color: deptData.color || '#0B5A54',
      headDoctor: deptData.headDoctor || 'Admin',
      operatingHours: deptData.operatingHours || '08:00 AM - 08:00 PM',
      description: deptData.description || 'Specialized clinical care department.',
      doctorIds: deptData.doctorIds || [],
      totalBeds: deptData.totalBeds || 20,
      emergencyCoverage: deptData.emergencyCoverage ?? true,
    };
    set((state) => ({
      departments: [newDept, ...state.departments],
    }));
  },

  updateDepartment: async (id: string, updates: Partial<DepartmentRecord>) => {
    set((state) => ({
      departments: state.departments.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }));
  },

  deleteDepartment: async (id: string) => {
    set((state) => ({
      departments: state.departments.filter((d) => d.id !== id),
    }));
  },

  addAnnouncement: async (annData: Partial<AnnouncementRecord>) => {
    const newAnn: AnnouncementRecord = {
      id: `ann-${Date.now()}`,
      title: annData.title || 'New Hospital Notice',
      message: annData.message || '',
      audience: annData.audience || 'All Staff',
      department: annData.department,
      priority: annData.priority || 'Normal',
      scheduledFor: annData.scheduledFor || new Date().toLocaleString(),
      sentAt: annData.status === 'Scheduled' ? 'Pending Dispatch' : 'Just now',
      deliveredCount: annData.status === 'Scheduled' ? 0 : 54,
      readCount: annData.status === 'Scheduled' ? 0 : 12,
      status: annData.status || 'Sent',
    };
    set((state) => ({
      announcements: [newAnn, ...state.announcements],
    }));
  },

  deleteAnnouncement: async (id: string) => {
    set((state) => ({
      announcements: state.announcements.filter((a) => a.id !== id),
    }));
  },
}));
