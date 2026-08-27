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
    username: 'olivia.w',
    password: 'doc123',
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
    username: 'marcus.v',
    password: 'doc123',
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
    username: 'sophia.p',
    password: 'doc123',
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
    username: 'ethan.r',
    password: 'doc123',
    roomNumber: 'Cabin 301 - 3rd Floor',
    isAvailable: true,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu'],
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
    patientName: 'Elena Rostova',
    patientPhone: '+91 97777 88899',
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

const DEFAULT_ADMIN_PROFILE: AdminProfile = {
  id: 'admin-1',
  name: 'Admin',
  email: 'admin@carepulse.com',
  password: 'admin123',
  phone: '+1 (555) 735-4600',
  role: 'admin',
  department: 'Platform Super Administration',
  avatarUrl: '',
  hospitalName: 'CarePulse Global Network',
};

const DEFAULT_HOSPITAL_SETTINGS: HospitalSettings = {
  name: 'CarePulse Central Hospital',
  tagline: 'Advanced Clinical Care & Patient Guidance Center',
  address: '4517 Washington Ave, Medical Hub, Metro District',
  phone: '+1 (555) 735-4614',
  emergencyHotline: '+1 (555) 911-0000',
  email: 'contact@carepulse.com',
  logoUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=400&auto=format&fit=crop&q=80',
  defaultSlotDurationMinutes: 30,
  maxOnlineBookingPercentage: 50,
  enableAiTriage: true,
  enableSmsReminders: true,
  enableAutoCancellation: false,
};

const DEFAULT_RECEPTIONISTS: ReceptionistRecord[] = [
  {
    id: 'rec-101',
    name: 'Emily Watson',
    email: 'receptionist@carepulse.com',
    password: 'password123',
    hospitalName: 'CarePulse Central Hospital',
    phone: '+91 98765 43220',
    department: 'Main Reception',
    deskNumber: 'Desk A-1 (Ground Floor)',
    shift: 'Morning',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    assignedDoctorsCount: 4,
    joinDate: '2024-03-15'
  },
  {
    id: 'rec-102',
    name: 'Anna Mathews',
    email: 'anna.m@carepulse.com',
    password: 'password123',
    hospitalName: 'CarePulse Central Hospital',
    phone: '+91 98765 43221',
    department: 'Emergency & OPD Desk',
    deskNumber: 'Desk B-2 (Wing C)',
    shift: 'Evening',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    assignedDoctorsCount: 3,
    joinDate: '2024-06-10'
  },
  {
    id: 'rec-103',
    name: 'David Miller',
    email: 'david.m@carepulse.com',
    password: 'password123',
    hospitalName: 'CarePulse Central Hospital',
    phone: '+91 98765 43222',
    department: 'Specialist Clinic Desk',
    deskNumber: 'Desk C-1 (2nd Floor)',
    shift: 'Full Day',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    assignedDoctorsCount: 2,
    joinDate: '2025-01-20'
  }
];

const DEFAULT_HOSPITALS: HospitalBranch[] = [
  {
    id: 'hosp-1',
    name: 'CarePulse Metro Central Hospital',
    address: '4517 Washington Ave, Medical Hub, Metro District',
    city: 'Metro City',
    phone: '+1 (555) 735-4614',
    operatingHours: '24/7 Emergency & OPD (08:00 AM - 10:00 PM)',
    doctorsCount: 10,
    receptionDesksCount: 4,
    logoUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=400&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    id: 'hosp-2',
    name: 'CarePulse West Wing Specialty Clinic',
    address: '8902 Health Boulevard, Westside District',
    city: 'West Haven',
    phone: '+1 (555) 890-1200',
    operatingHours: 'Mon-Sat (08:00 AM - 08:00 PM)',
    doctorsCount: 6,
    receptionDesksCount: 2,
    logoUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    id: 'hosp-3',
    name: 'CarePulse Downtown Urgent Care',
    address: '1240 Innovation Way, Financial District',
    city: 'Downtown Core',
    phone: '+1 (555) 345-9800',
    operatingHours: '24/7 Walk-Ins & Emergency Trauma',
    doctorsCount: 4,
    receptionDesksCount: 2,
    logoUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    id: 'hosp-4',
    name: 'CarePulse Greenfield Pediatric Center',
    address: '67 Greenfield Park, North Suburb',
    city: 'Greenfield',
    phone: '+1 (555) 234-7700',
    operatingHours: 'Mon-Fri (07:30 AM - 06:30 PM)',
    doctorsCount: 3,
    receptionDesksCount: 1,
    logoUrl: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400&auto=format&fit=crop&q=80',
    isActive: true,
  },
];

const DEFAULT_DEPARTMENTS: DepartmentRecord[] = [
  {
    id: 'dept-1',
    name: 'Cardiology',
    iconName: 'HeartPulse',
    color: '#0B5A54',
    headDoctor: 'Dr. Olivia Wilson',
    operatingHours: '08:00 AM - 08:00 PM',
    description: 'Comprehensive cardiovascular diagnostics, echocardiography, ECG, and emergency heart care.',
    doctorIds: ['doc-1'],
    totalBeds: 24,
    emergencyCoverage: true,
  },
  {
    id: 'dept-2',
    name: 'Dermatology',
    iconName: 'Sparkles',
    color: '#0284C7',
    headDoctor: 'Dr. Marcus Vance',
    operatingHours: '09:00 AM - 06:00 PM',
    description: 'Advanced clinical dermatology, laser diagnostics, skin allergy treatment, and cosmetology.',
    doctorIds: ['doc-2'],
    totalBeds: 12,
    emergencyCoverage: false,
  },
  {
    id: 'dept-3',
    name: 'Pediatrics & Neonatal',
    iconName: 'Baby',
    color: '#F59E0B',
    headDoctor: 'Dr. Sophia Patel',
    operatingHours: '24/7 Emergency & Day OPD',
    description: 'Specialized child health, developmental tracking, pediatric emergency care, and immunizations.',
    doctorIds: ['doc-3'],
    totalBeds: 36,
    emergencyCoverage: true,
  },
  {
    id: 'dept-4',
    name: 'Neurology',
    iconName: 'Brain',
    color: '#7C3AED',
    headDoctor: 'Dr. Ethan Reynolds',
    operatingHours: '08:30 AM - 05:30 PM',
    description: 'Neuro-consultations, stroke protocols, EEG diagnostics, and nervous system therapeutics.',
    doctorIds: ['doc-4'],
    totalBeds: 18,
    emergencyCoverage: true,
  },
  {
    id: 'dept-5',
    name: 'Orthopedics & Joint Care',
    iconName: 'Activity',
    color: '#10B981',
    headDoctor: 'Dr. Alexander King',
    operatingHours: '08:00 AM - 07:00 PM',
    description: 'Musculoskeletal trauma, arthroscopy, joint replacement, sports injuries, and rehabilitation.',
    doctorIds: [],
    totalBeds: 30,
    emergencyCoverage: true,
  },
  {
    id: 'dept-6',
    name: 'General Medicine & OPD',
    iconName: 'Stethoscope',
    color: '#EC4899',
    headDoctor: 'Admin',
    operatingHours: '24/7 Round the Clock',
    description: 'Primary clinical consultations, internal medicine, triage, and multi-system diagnostics.',
    doctorIds: ['doc-1', 'doc-2'],
    totalBeds: 50,
    emergencyCoverage: true,
  },
];

const DEFAULT_ANNOUNCEMENTS: AnnouncementRecord[] = [
  {
    id: 'ann-1',
    title: 'Hospital Cardiology Wing Upgraded with Digital Cath Lab',
    message: 'New high-resolution cardiac catheterization equipment is now active in Wing B. All OPD slots operate under upgraded protocols.',
    audience: 'All Staff',
    priority: 'High',
    scheduledFor: '2026-08-18 09:00 AM',
    sentAt: 'Today, 09:00 AM',
    deliveredCount: 48,
    readCount: 42,
    status: 'Sent',
  },
  {
    id: 'ann-2',
    title: 'Digital Token Queue System Live Notification for Patients',
    message: 'CarePulse app live token tracker is now synchronized across all OPD reception desks. Patients receive instant SMS alerts 15 minutes prior to slot call.',
    audience: 'All Patients',
    priority: 'Normal',
    scheduledFor: '2026-08-17 10:30 AM',
    sentAt: 'Yesterday, 10:30 AM',
    deliveredCount: 312,
    readCount: 289,
    status: 'Sent',
  },
  {
    id: 'ann-3',
    title: 'Sunday General Medical Camp & Vaccination Drive',
    message: 'Special immunization and health screening camp scheduled for this Sunday in the Greenfield Pavilion. Front desk to issue physical yellow slips.',
    audience: 'All Patients',
    priority: 'Normal',
    scheduledFor: '2026-08-23 08:00 AM',
    sentAt: 'Pending Dispatch',
    deliveredCount: 0,
    readCount: 0,
    status: 'Scheduled',
  },
];

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
    id: 'admin-1',
    name: 'Admin',
    role: 'admin',
    email: 'admin@carepulse.com',
  },
  receptionistProfile: DEFAULT_RECEPTIONIST_PROFILE,
  adminProfile: DEFAULT_ADMIN_PROFILE,
  hospitalSettings: DEFAULT_HOSPITAL_SETTINGS,
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
  },

  // Admin Actions Implementation
  fetchReceptionists: async () => {
    // Already populated with DEFAULT_RECEPTIONISTS or synced with backend
  },

  createReceptionist: async (recData: Partial<ReceptionistRecord>) => {
    const newRec: ReceptionistRecord = {
      id: `rec-${Date.now()}`,
      name: recData.name || 'New Receptionist',
      email: recData.email || 'receptionist@carepulse.com',
      password: recData.password || 'password123',
      hospitalName: recData.hospitalName || 'CarePulse Central Hospital',
      phone: recData.phone || '+91 98765 00000',
      department: recData.department || 'Front Desk',
      deskNumber: recData.deskNumber || 'Desk A-1',
      shift: recData.shift || 'Morning',
      isActive: true,
      avatarUrl: recData.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      assignedDoctorsCount: recData.assignedDoctorsCount || 2,
      joinDate: new Date().toISOString().split('T')[0],
    };

    set((state) => ({
      receptionists: [newRec, ...state.receptionists],
    }));
  },

  updateReceptionist: async (id: string, updates: Partial<ReceptionistRecord>) => {
    set((state) => ({
      receptionists: state.receptionists.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  },

  deleteReceptionist: async (id: string) => {
    set((state) => ({
      receptionists: state.receptionists.filter((r) => r.id !== id),
    }));
  },

  toggleReceptionistStatus: async (id: string) => {
    set((state) => ({
      receptionists: state.receptionists.map((r) =>
        r.id === id ? { ...r, isActive: !r.isActive } : r
      ),
    }));
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
  },

  deleteDoctor: async (id: string) => {
    set((state) => ({
      doctors: state.doctors.filter((doc) => doc.id !== id),
    }));
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
      logoUrl: hospData.logoUrl || 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=400&auto=format&fit=crop&q=80',
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
