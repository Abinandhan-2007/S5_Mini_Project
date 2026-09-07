// src/store/staffStore.ts
import { create } from 'zustand';
import type {
  Staff,
  AdminProfile,
  ReceptionistRecord,
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

export const DEFAULT_SLOTS: TimeSlotCapacity[] = [
  createSplitSlot('slot-1', '09:00 AM - 10:00 AM', 6, 1, 1, true),
  createSplitSlot('slot-2', '10:00 AM - 11:00 AM', 6, 2, 2, true),
  createSplitSlot('slot-3', '11:00 AM - 12:00 PM', 6, 1, 0, true),
  createSplitSlot('slot-4', '02:00 PM - 03:00 PM', 6, 2, 1, true),
  createSplitSlot('slot-5', '03:00 PM - 04:00 PM', 6, 0, 0, true),
  createSplitSlot('slot-6', '04:00 PM - 05:00 PM', 6, 1, 1, true),
];

const MOCK_INITIAL_DOCTORS: DoctorRecord[] = [];

const MOCK_INITIAL_TOKENS: TokenQueueItem[] = [];

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
    const hospName = storedStaff.hospitalName || storedStaff.hospital_name || (storedStaff.hospitalId === 'hosp-bag' ? 'BAG Hospital' : 'Empathetic Healthcare');
    const empId = storedStaff.staffCode || storedStaff.staff_code || (storedStaff.hospitalId === 'hosp-bag' ? 'R007101' : 'R010101');
    const emailPrefix = storedStaff.email ? storedStaff.email.split('@')[0] : 'rep1';
    return {
      id: storedStaff.id,
      name: storedStaff.name || 'REP1',
      fullName: storedStaff.name || 'REP1',
      username: storedStaff.username || emailPrefix,
      email: storedStaff.email || 'bag@bitsathy',
      phone: storedStaff.phone || '+91 98765 43220',
      employeeId: empId,
      staffCode: empId,
      clinicName: hospName,
      hospitalName: hospName,
      hospitalId: storedStaff.hospitalId || undefined,
      deskName: storedStaff.deskName || 'Main Reception & OPD Queue Desk 01',
      department: storedStaff.department || 'Main Reception & OPD Queue',
      shift: 'Morning Shift (08:00 AM - 04:00 PM)',
      avatarUrl: storedStaff.avatarUrl || storedStaff.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      operationalStatus: 'Active On Duty',
      twoFactorEnabled: true,
      isActive: true,
    };
  }
  return {
    id: 'a708461f-e3fe-45b8-9ed1-b9848d064e29',
    name: 'REP1',
    fullName: 'REP1',
    username: 'rep1',
    email: 'bag@bitsathy',
    phone: '+91 98765 43220',
    employeeId: 'R007101',
    staffCode: 'R007101',
    clinicName: 'BAG Hospital',
    hospitalName: 'BAG Hospital',
    hospitalId: 'hosp-bag',
    deskName: 'Main Reception & OPD Queue Desk 01',
    department: 'Main Reception & OPD Queue',
    shift: 'Morning Shift (08:00 AM - 04:00 PM)',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    operationalStatus: 'Active On Duty',
    twoFactorEnabled: true,
    isActive: true,
  };
};

const DEFAULT_ADMIN_PROFILE: AdminProfile = {
  id: 'admin-bag',
  name: 'BAG Hospital Administrator',
  email: 'bag@carepulse.com',
  username: 'BAG',
  password: 'bitsathy',
  phone: '+91 4295 226000',
  role: 'admin',
  department: 'Hospital Administration & Operations',
  avatarUrl: '',
  hospitalName: 'BAG Hospital',
  hospitalId: 'hosp-bag',
};

export const getInitialAdminProfile = (): AdminProfile => {
  const storedStaff = getStoredStaff();
  if (storedStaff && storedStaff.role === 'admin') {
    const hospName = storedStaff.hospitalName || storedStaff.hospital_name || (storedStaff.hospitalId === 'hosp-bag' ? 'BAG Hospital' : 'Empathetic Healthcare');
    return {
      id: storedStaff.id,
      name: storedStaff.name || 'Hospital Administrator',
      email: storedStaff.email || 'admin@carepulse.com',
      username: storedStaff.username || (storedStaff.email ? storedStaff.email.split('@')[0] : 'admin'),
      password: 'Admin@123',
      phone: storedStaff.phone || '+91 4295 226000',
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
  name: 'BAG Hospital',
  tagline: 'Advanced Clinical Care & Patient Guidance Center',
  address: 'Bannari Amman Group (BAG) Medical Complex, Sathyamangalam, Tamil Nadu 638401',
  phone: '+91 4295 226000',
  emergencyHotline: '+91 4295 226000',
  email: 'bag@carepulse.com',
  logoUrl: '/hospital_default.jpg',
  defaultSlotDurationMinutes: 30,
  maxOnlineBookingPercentage: 50,
  enableAiTriage: true,
  enableSmsReminders: true,
  enableAutoCancellation: false,
};

export const getInitialHospitalSettings = (): HospitalSettings => {
  const storedStaff = getStoredStaff();
  const hospName = storedStaff?.hospitalName || storedStaff?.hospital_name || (storedStaff?.hospitalId === 'hosp-bag' ? 'BAG Hospital' : 'Empathetic Healthcare');
  return {
    ...DEFAULT_HOSPITAL_SETTINGS,
    name: hospName,
  };
};

const DEFAULT_RECEPTIONISTS: ReceptionistRecord[] = [];

const DEFAULT_HOSPITALS: HospitalBranch[] = [
  {
    id: 'hosp-bag',
    name: 'BAG Hospital',
    address: 'Bannari Amman Group (BAG) Medical Complex, Alathukombai, Sathyamangalam, Tamil Nadu 638401',
    city: 'Sathyamangalam',
    phone: '+91 4295 226000',
    operatingHours: '24/7 Emergency & OPD (08:00 AM - 10:00 PM)',
    doctorsCount: 10,
    receptionDesksCount: 4,
    logoUrl: '/hospital_default.jpg',
    isActive: true,
  },
];

const DEFAULT_DEPARTMENTS: DepartmentRecord[] = [];

const DEFAULT_ANNOUNCEMENTS: AnnouncementRecord[] = [];

export interface StaffState {
  currentStaff: Staff | null;
  receptionistProfile: ReceptionistProfile;
  adminProfile: AdminProfile;
  hospitalSettings: HospitalSettings;
  receptionists: ReceptionistRecord[];
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

  // Admin Actions
  fetchReceptionists: () => Promise<void>;
  createReceptionist: (recData: Partial<ReceptionistRecord>) => Promise<void>;
  updateReceptionist: (id: string, updates: Partial<ReceptionistRecord>) => Promise<void>;
  deleteReceptionist: (id: string) => Promise<void>;
  toggleReceptionistStatus: (id: string) => Promise<void>;
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
  addTimeSlot: (doctorId: string, timeSlot: string, maxSeats: number) => void;
  removeTimeSlot: (doctorId: string, slotId: string) => void;
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
  }) => Promise<void>;
}

export const useStaffStore = create<StaffState>((set, get) => ({
  currentStaff: getStoredStaff() || {
    id: 'admin-1',
    name: 'Admin',
    role: 'admin',
    email: 'admin@carepulse.com',
  },
  receptionistProfile: getInitialReceptionistProfile(),
  adminProfile: getInitialAdminProfile(),
  hospitalSettings: getInitialHospitalSettings(),
  receptionists: DEFAULT_RECEPTIONISTS,
  hospitals: DEFAULT_HOSPITALS,
  departments: DEFAULT_DEPARTMENTS,
  announcements: DEFAULT_ANNOUNCEMENTS,
  doctors: MOCK_INITIAL_DOCTORS,
  tokens: MOCK_INITIAL_TOKENS,
  isLoading: false,
  error: null,

  setStaffAuth: (staff, token) => {
    if (token) localStorage.setItem('staff_token', token);
    if (staff) {
      const hospId = staff.hospitalId || staff.hospital_id;
      const hospName = staff.hospitalName || staff.hospital_name || (hospId === 'hosp-bag' ? 'BAG Hospital' : 'Empathetic Healthcare');
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
        const emailPrefix = staff.email ? staff.email.split('@')[0] : 'rep1';
        const empId = staff.staff_code || staff.staffCode || staff.id || (hospId === 'hosp-bag' ? 'R007101' : 'R010101');
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
            deskName: staff.deskName || state.receptionistProfile.deskName || 'Main Reception & OPD Queue Desk 01',
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
      set({ doctors: doctors || [], isLoading: false });
    } catch {
      if (!silent) set({ isLoading: false });
    }
  },

  toggleDoctorAvailability: async (doctorId: string, isAvailable?: boolean, reason?: string, unavailableUntil?: string) => {
    set(state => ({
      doctors: state.doctors.map(doc => {
        if (doc.id !== doctorId) return doc;
        const nextAvail = typeof isAvailable === 'boolean' ? isAvailable : !doc.isAvailable;
        return {
          ...doc,
          isAvailable: nextAvail,
          availabilityReason: nextAvail ? '' : (reason !== undefined ? reason : (doc.availabilityReason || 'Temporarily Away')),
          unavailableUntil: nextAvail ? '' : (unavailableUntil !== undefined ? unavailableUntil : (doc.unavailableUntil || '')),
        };
      })
    }));

    const doc = get().doctors.find(d => d.id === doctorId);
    if (doc) {
      await receptionistService.toggleDoctorAvailability(doctorId, doc.isAvailable);
    }
  },

  updateDoctorSlotCapacity: async (doctorId: string, timeSlot: string, availableSeats: number) => {
    set(state => ({
      doctors: state.doctors.map(doc => {
        if (doc.id !== doctorId) return doc;
        const updatedSlots = doc.slotCapacities.map(slot => {
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
        const updatedSlots = doc.slotCapacities.map(slot => {
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

  addTimeSlot: (doctorId: string, timeSlot: string, maxSeats: number) => {
    set(state => ({
      doctors: state.doctors.map(doc => {
        if (doc.id !== doctorId) return doc;
        const exists = doc.slotCapacities.some(s => s.timeSlot === timeSlot);
        if (exists) return doc;
        const newSlot = createSplitSlot(`slot-${Date.now()}`, timeSlot, maxSeats, 0, 0, true);
        return { ...doc, slotCapacities: [...doc.slotCapacities, newSlot] };
      })
    }));
  },

  removeTimeSlot: (doctorId: string, slotId: string) => {
    set(state => ({
      doctors: state.doctors.map(doc => {
        if (doc.id !== doctorId) return doc;
        return {
          ...doc,
          slotCapacities: doc.slotCapacities.filter(s => s.id !== slotId)
        };
      })
    }));
  },

  createDoctor: async (doctorData: Partial<DoctorRecord>) => {
    const hospId = get().currentStaff?.hospitalId || get().currentStaff?.hospital_id;
    try {
      const created = await receptionistService.createDoctor({
        ...doctorData,
        hospital_id: hospId,
      });
      if (created) {
        set((state) => ({
          doctors: [created, ...state.doctors.filter((d) => d.id !== created.id)],
        }));
        return;
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
      set({ tokens: fetchedTokens || [], isLoading: false });
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

    await receptionistService.updateTokenStatus(tokenId, status);
  },

  bookWalkInAppointment: async (payload) => {
    const ticketNumber = `#CP-${Math.floor(1000 + Math.random() * 9000)}`;
    const tokenNumber = `#TOK-00${get().tokens.length + 1}`;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newToken: TokenQueueItem = {
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
      date: payload.date || '13 Aug 2026',
      age: payload.age,
      bloodGroup: payload.bloodGroup,
      address: payload.address,
      healthIssue: payload.healthIssue,
    };

    set(state => ({
      tokens: [newToken, ...state.tokens],
      doctors: state.doctors.map(doc => {
        if (doc.id !== payload.doctorId) return doc;
        return {
          ...doc,
          slotCapacities: doc.slotCapacities.map(slot => {
            if (slot.timeSlot !== payload.timeSlot) return slot;
            const offlineBooked = slot.offlineBookedSeats + 1;
            const offlineAvail = Math.max(0, slot.offlineMaxSeats - offlineBooked);
            const totalBooked = slot.onlineBookedSeats + offlineBooked;
            const totalAvail = slot.onlineAvailableSeats + offlineAvail;

            return {
              ...slot,
              offlineBookedSeats: offlineBooked,
              offlineAvailableSeats: offlineAvail,
              bookedSeats: totalBooked,
              availableSeats: totalAvail,
            };
          })
        };
      })
    }));

    await receptionistService.bookWalkInAppointment(payload);
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
        password: recData.password || 'password123',
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
