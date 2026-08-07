import type { User, Doctor, Hospital, Appointment, Prescription, MedicalHistoryItem, ChatMessage } from './types';


export const INITIAL_USER: User = {
  id: 'usr-101',
  fullName: 'Sarah Jenkins',
  email: 'sarah.jenkins@example.com',
  phone: '+1 (555) 234-5678',
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

export const MOCK_HOSPITALS: Hospital[] = [
  {
    id: 'hosp-1',
    name: 'St. Jude Heart & Medical Center',
    address: '742 Evergreen Terrace, Downtown',
    distanceMiles: 0.8,
    rating: 4.9,
    reviewsCount: 2420,
    imageUrl: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80',
    specialties: ['Cardiology', 'General Medicine', 'Surgery', 'Pediatrics'],
    facilityType: 'Cardiology',
  },
  {
    id: 'hosp-2',
    name: 'Metropolitan General Hospital',
    address: '1200 Grand Avenue, Midtown',
    distanceMiles: 1.4,
    rating: 4.8,
    reviewsCount: 1850,
    imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80',
    specialties: ['General', 'Emergency Care', 'Orthopedics', 'Neurology'],
    facilityType: 'General',
  },
  {
    id: 'hosp-3',
    name: 'Cedar Skin & Wellness Clinic',
    address: '450 University Blvd, Westside',
    distanceMiles: 2.1,
    rating: 4.7,
    reviewsCount: 940,
    imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80',
    specialties: ['Dermatology', 'Wellness', 'Allergy'],
    facilityType: 'Specialty Clinic',
  },
  {
    id: 'hosp-4',
    name: 'Children & Family Care Center',
    address: '88 Peak Street, Northside',
    distanceMiles: 3.5,
    rating: 4.9,
    reviewsCount: 3100,
    imageUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80',
    specialties: ['Pediatrics', 'Neonatology', 'General'],
    facilityType: 'Pediatrics',
  },
];

export const MOCK_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Alex Morgan',
    specialty: 'CARDIOLOGY',
    hospitalId: 'hosp-1',
    hospitalName: 'St. Jude Heart & Medical Center',
    photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewsCount: 340,
    experienceYears: 12,
    about: 'Senior Cardiologist specializing in preventive heart health and electrophysiology. Over 12 years of clinical practice.',
  },
  {
    id: 'doc-2',
    name: 'Dr. Elena Rostova',
    specialty: 'GENERAL MEDICINE',
    hospitalId: 'hosp-1',
    hospitalName: 'St. Jude Heart & Medical Center',
    photoUrl: 'https://images.unsplash.com/photo-1594824813566-88855ce78347?w=400&auto=format&fit=crop&q=80',
    rating: 4.8,
    reviewsCount: 290,
    experienceYears: 9,
    about: 'Compassionate physician focused on comprehensive family healthcare, preventative screenings, and chronic illness management.',
  },
  {
    id: 'doc-3',
    name: 'Dr. Marcus Vance',
    specialty: 'DERMATOLOGY',
    hospitalId: 'hosp-3',
    hospitalName: 'Cedar Skin & Wellness Clinic',
    photoUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewsCount: 410,
    experienceYears: 15,
    about: 'Board-certified dermatologist specializing in laser therapy, eczema treatments, and aesthetic skincare solutions.',
  },
  {
    id: 'doc-4',
    name: 'Dr. Sophia Chen',
    specialty: 'PEDIATRICS',
    hospitalId: 'hosp-4',
    hospitalName: 'Children & Family Care Center',
    photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
    rating: 4.95,
    reviewsCount: 520,
    experienceYears: 10,
    about: 'Pediatric care expert devoted to infant wellness, developmental milestone tracking, and childhood vaccinations.',
  },
];

export const INITIAL_APPOINTMENT: Appointment = {
  id: 'app-ticket-1',
  ticketNumber: 'TK-482',
  patientId: 'usr-101',
  patientName: 'Sarah Jenkins',
  doctorId: 'doc-1',
  doctorName: 'Dr. Alex Morgan',
  doctorSpecialty: 'Cardiology Specialist',
  doctorPhoto: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
  hospitalName: 'St. Jude Medical Center',
  date: '2026-08-06',
  timeSlot: '10:30 AM',
  type: 'Telehealth',
  status: 'Upcoming',
  daysLeftText: 'In 2 days',
};

export const MOCK_PRESCRIPTIONS: (Prescription & { doctorSpecialty?: string; hospitalName?: string; datePrescribed?: string })[] = [
  {
    id: 'rx-1',
    drugName: 'Amoxicillin Trihydrate',
    dosage: '500 mg',
    frequency: '1 capsule • Twice daily after meals',
    prescriber: 'Dr. Elena Rostova',
    doctorSpecialty: 'General Medicine Specialist',
    hospitalName: 'Metropolitan General Hospital',
    datePrescribed: 'Jul 24, 2026',
    iconType: 'capsule',
  },
  {
    id: 'rx-2',
    drugName: 'Lisinopril Oral',
    dosage: '10 mg',
    frequency: '1 tablet • Daily every morning',
    prescriber: 'Dr. Alex Morgan',
    doctorSpecialty: 'Cardiology Specialist',
    hospitalName: 'St. Jude Heart & Medical Center',
    datePrescribed: 'Jul 18, 2026',
    iconType: 'pill',
  },
  {
    id: 'rx-3',
    drugName: 'Atorvastatin Calcium',
    dosage: '20 mg',
    frequency: '1 tablet • Nightly before bedtime',
    prescriber: 'Dr. Michael Chen',
    doctorSpecialty: 'Neurology & Internal Medicine',
    hospitalName: 'City General Hospital',
    datePrescribed: 'Jun 30, 2026',
    iconType: 'pill',
  },
  {
    id: 'rx-4',
    drugName: 'Salbutamol Inhaler',
    dosage: '100 mcg',
    frequency: '2 puffs • As needed for shortness of breath',
    prescriber: 'Dr. Sarah Jenkins',
    doctorSpecialty: 'Pulmonology Specialist',
    hospitalName: 'Cedar Skin & Wellness Clinic',
    datePrescribed: 'May 12, 2026',
    iconType: 'capsule',
  },
];

export const MOCK_MEDICAL_HISTORY: MedicalHistoryItem[] = [
  {
    id: 'hist-1',
    date: 'Jul 24, 2026',
    time: '02:15 PM',
    doctorName: 'Dr. Alex Morgan',
    specialty: 'Cardiology Consultation',
    hospitalName: 'St. Jude Heart Center',
    diagnosis: 'Routine BP Check & ECG Screening. Heart rate normal at 72 bpm.',
    prescriptionDetails: 'Lisinopril 10mg prescribed. Next follow-up in 3 months.',
    status: 'Completed',
    specialtyIcon: 'heart',
  },
  {
    id: 'hist-2',
    date: 'Jun 12, 2026',
    time: '11:00 AM',
    doctorName: 'Dr. Elena Rostova',
    specialty: 'General Wellness Exam',
    hospitalName: 'Metropolitan General Hospital',
    diagnosis: 'Seasonal allergic rhinitis and mild fatigue. Blood panel normal.',
    prescriptionDetails: 'Antihistamine 10mg daily as needed.',
    status: 'Completed',
    specialtyIcon: 'stethoscope',
  },
  {
    id: 'hist-3',
    date: 'Apr 05, 2026',
    time: '09:30 AM',
    doctorName: 'Dr. Marcus Vance',
    specialty: 'Dermatology Consultation',
    hospitalName: 'Cedar Skin & Wellness Clinic',
    diagnosis: 'Contact dermatitis on left forearm.',
    prescriptionDetails: 'Hydrocortisone cream 1% applied twice daily.',
    status: 'Completed',
    specialtyIcon: 'bandage',
  },
  {
    id: 'hist-4',
    date: 'Jan 18, 2026',
    time: '03:45 PM',
    doctorName: 'Dr. Robert Thorne',
    specialty: 'Orthopedic Joint Check',
    hospitalName: 'Metropolitan General Hospital',
    diagnosis: 'Mild wrist strain from repetitive exercise.',
    prescriptionDetails: 'Support wrist brace for 10 days, ice therapy.',
    status: 'Completed',
    specialtyIcon: 'bone',
  },
];

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
