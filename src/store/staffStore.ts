// src/store/staffStore.ts
import { create } from 'zustand';
import type { Staff } from '../types/staff';
import type { DoctorRecord, TokenQueueItem, TokenStatus, ReceptionistProfile, TimeSlotCapacity } from '../types/receptionist';
import { receptionistService } from '../services/receptionistService';

const DEFAULT_SLOTS: TimeSlotCapacity[] = [
  { id: 'slot-1', timeSlot: '09:00 AM - 10:00 AM', maxSeats: 5, bookedSeats: 2, availableSeats: 3, isAvailable: true },
  { id: 'slot-2', timeSlot: '10:00 AM - 11:00 AM', maxSeats: 6, bookedSeats: 4, availableSeats: 2, isAvailable: true },
  { id: 'slot-3', timeSlot: '11:00 AM - 12:00 PM', maxSeats: 5, bookedSeats: 1, availableSeats: 4, isAvailable: true },
  { id: 'slot-4', timeSlot: '02:00 PM - 03:00 PM', maxSeats: 6, bookedSeats: 3, availableSeats: 3, isAvailable: true },
  { id: 'slot-5', timeSlot: '03:00 PM - 04:00 PM', maxSeats: 4, bookedSeats: 0, availableSeats: 4, isAvailable: true },
  { id: 'slot-6', timeSlot: '04:00 PM - 05:00 PM', maxSeats: 5, bookedSeats: 2, availableSeats: 3, isAvailable: true },
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
    type: 'In-Person'
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
    type: 'Walk-In'
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
    type: 'In-Person'
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
    type: 'Walk-In'
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
  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80'
};

interface StaffState {
  currentStaff: Staff | null;
  receptionistProfile: ReceptionistProfile;
  token: string | null;
  isAuthenticated: boolean;
  
  doctors: DoctorRecord[];
  tokens: TokenQueueItem[];
  isLoading: boolean;

  setStaffAuth: (staff: Staff, token: string) => void;
  logoutStaff: () => void;
  
  fetchDoctors: () => Promise<void>;
  toggleDoctorAvailability: (doctorId: string) => Promise<void>;
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
  }) => Promise<void>;
}

export const useStaffStore = create<StaffState>((set, get) => ({
  currentStaff: {
    id: 'rec-101',
    name: 'Emily Watson',
    email: 'emily.watson@carepulse.com',
    role: 'receptionist'
  },
  receptionistProfile: DEFAULT_RECEPTIONIST_PROFILE,
  token: 'mock-receptionist-token-123',
  isAuthenticated: true,

  doctors: MOCK_INITIAL_DOCTORS,
  tokens: MOCK_INITIAL_TOKENS,
  isLoading: false,

  setStaffAuth: (staff, token) => set({ currentStaff: staff, token, isAuthenticated: true }),
  logoutStaff: () => set({ currentStaff: null, token: null, isAuthenticated: false }),

  fetchDoctors: async () => {
    set({ isLoading: true });
    const fetched = await receptionistService.getDoctors();
    if (fetched && fetched.length > 0) {
      set({ doctors: fetched, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  toggleDoctorAvailability: async (doctorId: string) => {
    const doctor = get().doctors.find(d => d.id === doctorId);
    if (!doctor) return;
    const newStatus = !doctor.isAvailable;

    // Optimistic update
    set(state => ({
      doctors: state.doctors.map(d => d.id === doctorId ? { ...d, isAvailable: newStatus } : d)
    }));

    await receptionistService.toggleDoctorAvailability(doctorId, newStatus);
  },

  updateSlotCapacity: async (doctorId: string, timeSlot: string, maxSeats: number, isAvailable = true) => {
    set(state => ({
      doctors: state.doctors.map(doc => {
        if (doc.id !== doctorId) return doc;
        const updatedSlots = doc.slotCapacities.map(slot => {
          if (slot.timeSlot !== timeSlot) return slot;
          const available = Math.max(0, maxSeats - slot.bookedSeats);
          return { ...slot, maxSeats, availableSeats: available, isAvailable };
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
        // Check if slot already exists
        const exists = doc.slotCapacities.some(s => s.timeSlot === timeSlot);
        if (exists) return doc;
        const newSlot: TimeSlotCapacity = {
          id: `slot-${Date.now()}`,
          timeSlot,
          maxSeats,
          bookedSeats: 0,
          availableSeats: maxSeats,
          isAvailable: true
        };
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
      isAvailable: true,
      availableDays: doctorData.availableDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      slotCapacities: DEFAULT_SLOTS.map(s => ({ ...s }))
    };

    set(state => ({ doctors: [newDoc, ...state.doctors] }));
    await receptionistService.createDoctor(doctorData);
  },

  fetchTokens: async (doctorId?: string) => {
    set({ isLoading: true });
    const fetched = await receptionistService.getTokenQueue(doctorId);
    if (fetched && fetched.length > 0) {
      set({ tokens: fetched, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  callNextToken: async (doctorId?: string) => {
    // Optimistic queue transition
    const tokens = [...get().tokens];

    for (let i = 0; i < tokens.length; i++) {
      if (doctorId && tokens[i].doctorId !== doctorId) continue;
      if (tokens[i].status === 'In Consultation') {
        tokens[i].status = 'Completed';
        break;
      }
    }


    for (let i = 0; i < tokens.length; i++) {
      if (doctorId && tokens[i].doctorId !== doctorId) continue;
      if (tokens[i].status === 'Waiting') {
        tokens[i].status = 'In Consultation';
        break;
      }
    }

    set({ tokens });
    await receptionistService.callNextToken(doctorId);
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
      type: 'Walk-In'
    };

    set(state => ({
      tokens: [newToken, ...state.tokens],
      doctors: state.doctors.map(doc => {
        if (doc.id !== payload.doctorId) return doc;
        return {
          ...doc,
          slotCapacities: doc.slotCapacities.map(slot => {
            if (slot.timeSlot !== payload.timeSlot) return slot;
            const booked = slot.bookedSeats + 1;
            return {
              ...slot,
              bookedSeats: booked,
              availableSeats: Math.max(0, slot.maxSeats - booked)
            };
          })
        };
      })
    }));

    await receptionistService.bookWalkInAppointment(payload);
  }
}));
