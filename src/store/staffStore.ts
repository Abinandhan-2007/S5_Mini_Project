// src/store/staffStore.ts
import { create } from 'zustand';
import type { Staff } from '../types/staff';
import type { DoctorRecord, TokenQueueItem, TokenStatus, ReceptionistProfile, TimeSlotCapacity } from '../types/receptionist';
import { receptionistService } from '../services/receptionistService';

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

const DEFAULT_SLOTS: TimeSlotCapacity[] = [
  createSplitSlot('slot-1', '09:00 AM - 10:00 AM', 6, 1, 1, true),
  createSplitSlot('slot-2', '10:00 AM - 11:00 AM', 6, 2, 2, true),
  createSplitSlot('slot-3', '11:00 AM - 12:00 PM', 6, 1, 0, true),
  createSplitSlot('slot-4', '02:00 PM - 03:00 PM', 6, 2, 1, true),
  createSplitSlot('slot-5', '03:00 PM - 04:00 PM', 6, 0, 0, true),
  createSplitSlot('slot-6', '04:00 PM - 05:00 PM', 6, 1, 1, true),
];

const MOCK_INITIAL_DOCTORS: DoctorRecord[] = [
  {
    id: 'doc-1',
    name: 'Dr. Olivia Wilson',
    specialty: 'Cardiologist',
    department: 'Cardiology',
    experienceYears: 12,
    consultationFee: 850,
    photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
    phone: '+91 98765 11001',
    email: 'olivia.w@carepulse.com',
    roomNumber: 'Cabin 102 - 1st Floor',
    isAvailable: true,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    slotCapacities: DEFAULT_SLOTS.map(s => ({ ...s }))
  },
  {
    id: 'doc-2',
    name: 'Dr. Marcus Vance',
    specialty: 'Dermatologist',
    department: 'Dermatology',
    experienceYears: 9,
    consultationFee: 700,
    photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
    phone: '+91 98765 11002',
    email: 'marcus.v@carepulse.com',
    roomNumber: 'Cabin 204 - 2nd Floor',
    isAvailable: true,
    availableDays: ['Mon', 'Wed', 'Fri', 'Sat'],
    slotCapacities: DEFAULT_SLOTS.map(s => ({ ...s }))
  },
  {
    id: 'doc-3',
    name: 'Dr. Sophia Patel',
    specialty: 'Pediatrician',
    department: 'Pediatrics',
    experienceYears: 14,
    consultationFee: 900,
    photo: 'https://images.unsplash.com/photo-1594824813566-78a99478f237?w=400&auto=format&fit=crop&q=80',
    phone: '+91 98765 11003',
    email: 'sophia.p@carepulse.com',
    roomNumber: 'Cabin 108 - 1st Floor',
    isAvailable: false,
    availableDays: ['Tue', 'Thu', 'Sat'],
    slotCapacities: DEFAULT_SLOTS.map(s => ({ ...s }))
  },
  {
    id: 'doc-4',
    name: 'Dr. Ethan Reynolds',
    specialty: 'Neurologist',
    department: 'Neurology',
    experienceYears: 16,
    consultationFee: 1200,
    photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
    phone: '+91 98765 11004',
    email: 'ethan.r@carepulse.com',
    roomNumber: 'Cabin 301 - 3rd Floor',
    isAvailable: true,
    availableDays: ['Mon', 'Tue', 'Thu', 'Fri'],
    slotCapacities: DEFAULT_SLOTS.map(s => ({ ...s }))
  }
];

const MOCK_INITIAL_TOKENS: TokenQueueItem[] = [
  {
    id: 'tok-1',
    tokenNumber: '#TOK-001',
    patientName: 'Sarah Jenkins',
    patientPhone: '+91 98765 43210',
    doctorId: 'doc-1',
    doctorName: 'Dr. Olivia Wilson',
    doctorSpecialty: 'Cardiologist',
    ticketNumber: '#CP-4821',
    timeSlot: '10:00 AM - 11:00 AM',
    status: 'In Consultation',
    arrivalTime: '09:45 AM',
    issueTime: '09:50 AM',
    type: 'In-Person',
    date: '13 Aug 2026'
  },
  {
    id: 'tok-2',
    tokenNumber: '#TOK-002',
    patientName: 'Robert Chen',
    patientPhone: '+91 98111 22334',
    doctorId: 'doc-1',
    doctorName: 'Dr. Olivia Wilson',
    doctorSpecialty: 'Cardiologist',
    ticketNumber: '#CP-4822',
    timeSlot: '10:00 AM - 11:00 AM',
    status: 'Waiting',
    arrivalTime: '10:05 AM',
    issueTime: '10:08 AM',
    type: 'Walk-In',
    date: '13 Aug 2026'
  },
  {
    id: 'tok-3',
    tokenNumber: '#TOK-003',
    patientName: 'Anita Sharma',
    patientPhone: '+91 99887 76655',
    doctorId: 'doc-2',
    doctorName: 'Dr. Marcus Vance',
    doctorSpecialty: 'Dermatologist',
    ticketNumber: '#CP-4823',
    timeSlot: '11:00 AM - 12:00 PM',
    status: 'Waiting',
    arrivalTime: '10:15 AM',
    issueTime: '10:20 AM',
    type: 'In-Person',
    date: '13 Aug 2026'
  },
  {
    id: 'tok-4',
    tokenNumber: '#TOK-004',
    patientName: 'Michael Scott',
    patientPhone: '+91 91234 56789',
    doctorId: 'doc-4',
    doctorName: 'Dr. Ethan Reynolds',
    doctorSpecialty: 'Neurologist',
    ticketNumber: '#CP-4824',
    timeSlot: '11:00 AM - 12:00 PM',
    status: 'Waiting',
    arrivalTime: '10:25 AM',
    issueTime: '10:28 AM',
    type: 'Walk-In',
    date: '13 Aug 2026'
  }
];

const DEFAULT_RECEPTIONIST_PROFILE: ReceptionistProfile = {
  id: 'rec-101',
  name: 'Emily Watson',
  email: 'emily.watson@carepulse.com',
  phone: '+91 98765 99887',
  employeeId: 'REC-4092',
  clinicName: 'CarePulse Central Hospital',
  department: 'Main Reception & OPD Queue',
  shift: 'Morning Shift (08:00 AM - 04:00 PM)',
  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
};

export interface StaffState {
  currentStaff: Staff | null;
  receptionistProfile: ReceptionistProfile;
  doctors: DoctorRecord[];
  tokens: TokenQueueItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setStaffAuth: (staff: Staff, token?: string) => void;
  logoutStaff: () => void;
  fetchReceptionistProfile: () => Promise<void>;
  updateReceptionistProfile: (profile: Partial<ReceptionistProfile>) => Promise<void>;
  fetchDoctors: () => Promise<void>;
  toggleDoctorAvailability: (doctorId: string) => Promise<void>;
  updateDoctorSlotCapacity: (doctorId: string, timeSlot: string, availableSeats: number) => Promise<void>;
  updateSlotCapacity: (doctorId: string, timeSlot: string, maxSeats: number, isAvailable?: boolean) => Promise<void>;
  addTimeSlot: (doctorId: string, timeSlot: string, maxSeats: number) => void;
  removeTimeSlot: (doctorId: string, slotId: string) => void;
  createDoctor: (doctorData: Partial<DoctorRecord>) => Promise<void>;
  fetchTokens: (doctorId?: string) => Promise<void>;
  callNextToken: (doctorId?: string) => Promise<void>;
  updateTokenStatus: (tokenId: string, status: TokenStatus) => Promise<void>;
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
  currentStaff: {
    id: 'rec-101',
    name: 'Emily Watson',
    role: 'receptionist',
    email: 'emily.watson@carepulse.com',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
  },
  receptionistProfile: DEFAULT_RECEPTIONIST_PROFILE,
  doctors: MOCK_INITIAL_DOCTORS,
  tokens: MOCK_INITIAL_TOKENS,
  isLoading: false,
  error: null,

  setStaffAuth: (staff, token) => {
    if (token) localStorage.setItem('staff_token', token);
    set({ currentStaff: staff });
  },

  logoutStaff: () => {
    localStorage.removeItem('staff_token');
    set({ currentStaff: null });
  },

  fetchReceptionistProfile: async () => {
    set({ isLoading: true });
    set({ isLoading: false });
  },

  updateReceptionistProfile: async (updatedData) => {
    set((state) => ({
      receptionistProfile: { ...state.receptionistProfile, ...updatedData },
    }));
  },

  fetchDoctors: async () => {
    set({ isLoading: true });
    try {
      const doctors = await receptionistService.getDoctors();
      if (doctors && doctors.length > 0) {
        set({ doctors, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  toggleDoctorAvailability: async (doctorId: string) => {
    set(state => ({
      doctors: state.doctors.map(doc =>
        doc.id === doctorId ? { ...doc, isAvailable: !doc.isAvailable } : doc
      )
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
    const newDoc: DoctorRecord = {
      id: `doc-${Date.now()}`,
      name: doctorData.name || 'Dr. New Doctor',
      specialty: doctorData.specialty || 'General Medicine',
      department: doctorData.department || 'General Medicine',
      experienceYears: doctorData.experienceYears || 5,
      consultationFee: doctorData.consultationFee || 600,
      photo: doctorData.photo || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
      phone: doctorData.phone || '+91 98765 00000',
      email: doctorData.email || 'doctor@carepulse.com',
      roomNumber: doctorData.roomNumber || 'Cabin 105',
      about: doctorData.about || `Senior specialist with ${doctorData.experienceYears || 5}+ years of clinical experience.`,
      isAvailable: true,
      availableDays: doctorData.availableDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      slotCapacities: DEFAULT_SLOTS.map(s => ({ ...s }))
    };

    set(state => ({
      doctors: [newDoc, ...state.doctors]
    }));

    await receptionistService.createDoctor(newDoc);
  },

  fetchTokens: async (doctorId?: string) => {
    set({ isLoading: true });
    try {
      const tokens = await receptionistService.getTokenQueue(doctorId);
      if (tokens && tokens.length > 0) {
        set({ tokens, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
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

  updateTokenStatus: async (tokenId: string, status: TokenStatus) => {
    set(state => ({
      tokens: state.tokens.map(t => t.id === tokenId ? { ...t, status } : t)
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
  }
}));
