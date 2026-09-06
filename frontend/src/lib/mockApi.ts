import type { User, Doctor, Hospital, Appointment, Prescription, MedicalHistoryItem, ChatMessage } from './types';


export const INITIAL_USER: User = {
  id: 'usr-101',
  fullName: 'Sarah Jenkins',
  email: 'sarah.jenkins@example.com',
  phone: '+1 (555) 234-5678',
  address: '742 Evergreen Terrace, Downtown',
  dob: '1992-05-14',
  gender: 'Female',
  bloodGroup: 'O+',
  emergencyContact: {
    name: 'Mark Jenkins',
    phone: '+1 (555) 987-6543',
    relationship: 'Spouse',
  },
  allergies: 'Penicillin, Peanuts',
  preExistingConditions: 'Mild Asthma',
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
};

export const MOCK_HOSPITALS: Hospital[] = [];

export const MOCK_DOCTORS: Doctor[] = [];

export const INITIAL_APPOINTMENT: Appointment = {
  id: 'app-ticket-1',
  ticketNumber: 'TK-482',
  patientId: 'usr-101',
  patientName: 'Sarah Jenkins',
  doctorId: 'doc-1',
  doctorName: 'Dr. Alex Morgan',
  doctorSpecialty: 'Cardiology Specialist',
  doctorPhoto: '/doctor_default.jpg',
  hospitalName: 'St. Jude Medical Center',
  date: '2026-08-06',
  timeSlot: '10:30 AM',
  type: 'Telehealth',
  status: 'Upcoming',
  daysLeftText: 'In 2 days',
};

export const MOCK_PRESCRIPTIONS: (Prescription & { doctorSpecialty?: string; hospitalName?: string; datePrescribed?: string; totalDays?: number; daysCompleted?: number; status?: string })[] = [];

export const MOCK_MEDICAL_HISTORY: MedicalHistoryItem[] = [];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'bot',
    text: "Hello Sarah! 👋 I'm CarePulse AI, your virtual health assistant. How are you feeling today? Tap a symptom below or describe what you're experiencing.",
    timestamp: '10:00 AM',
    quickReplyChips: ['Fever & Chills', 'Headache', 'Shortness of breath', 'Body aches', 'Skin Rash'],
  },
];

// Helper delay simulator
const delay = (ms = 400) => new Promise(res => setTimeout(res, ms));

export const mockApi = {
  async getHospitals(searchQuery?: string, filterCategory?: string): Promise<Hospital[]> {
    await delay();
    let list = [...MOCK_HOSPITALS];
    if (filterCategory && filterCategory !== 'All Facilities') {
      list = list.filter(h => h.facilityType.toLowerCase() === filterCategory.toLowerCase() || h.specialties.some(s => s.toLowerCase() === filterCategory.toLowerCase()));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(h => h.name.toLowerCase().includes(q) || h.address.toLowerCase().includes(q) || h.specialties.some(s => s.toLowerCase().includes(q)));
    }
    return list;
  },

  async getHospitalById(id: string): Promise<Hospital | undefined> {
    await delay();
    return MOCK_HOSPITALS.find(h => h.id === id);
  },

  async getDoctorsByHospital(hospitalId?: string): Promise<Doctor[]> {
    await delay();
    if (hospitalId) {
      return MOCK_DOCTORS.filter(d => d.hospitalId === hospitalId);
    }
    return MOCK_DOCTORS;
  },

  async getDoctorById(id: string): Promise<Doctor | undefined> {
    await delay();
    return MOCK_DOCTORS.find(d => d.id === id);
  },
};
