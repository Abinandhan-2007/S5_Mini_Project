import type { PatientEMRRecord, PrescriptionMedicine, SoapNotes, PatientVitals, TriagePriority } from '../types/doctor';
import { apiPost } from '../lib/apiFetch';

const EMR_STORAGE_KEY = 'carepulse_doctor_emr_records';
const CONSULTATION_DRAFTS_KEY = 'carepulse_doctor_consultation_drafts';

// Standard Initial Clinical EMR Seed Records for Demonstration & Offline Resilience
const SEED_EMR_RECORDS: PatientEMRRecord[] = [
  {
    id: 'emr-1',
    patientId: 'pat-sarah-jenkins',
    patientName: 'Sarah Jenkins',
    age: 31,
    gender: 'Female',
    bloodGroup: 'A+',
    phone: '+91 98765 43210',
    date: '18 Aug 2026',
    doctorId: 'doc-1',
    doctorName: 'Dr. Olivia Wilson',
    doctorSpecialty: 'Cardiologist',
    hospitalName: 'CarePulse Central Hospital',
    chiefComplaint: 'Atypical chest tightness and exertional palpitation for 3 days.',
    intakeNotes: 'Patient walked in with mild chest discomfort. Non-radiating, worse after exertion.',
    triagePriority: 'Urgent',
    vitals: {
      bpSys: 128,
      bpDia: 84,
      heartRate: 88,
      temperature: 98.6,
      spo2: 99,
      weight: 62,
      recordedAt: '09:15 AM',
    },
    soapNotes: {
      subjective: '31F reports occasional sharp substernal chest discomfort over past 72 hrs. Aggravated by strenuous work, relieved by rest. No diaphoresis, no syncope, no radiation.',
      objective: 'S1/S2 heard normally, no murmurs. Lungs clear bilaterally. 12-Lead ECG shows regular sinus rhythm with no ST-T segment elevation or acute ischemic changes.',
      assessment: 'Non-cardiac chest discomfort / musculoskeletal chest wall strain with anxiety component. Rule out microvascular angina.',
      plan: 'Advised lifestyle modification, avoid caffeine. Recheck lipid panel & 2D-Echocardiogram if symptoms persist. Prescribed analgesic and stress relief protocol.',
    },
    prescriptions: [
      {
        id: 'rx-1',
        drugName: 'Paracetamol + Tramadol (Ultracet)',
        dosage: '325mg/37.5mg',
        frequency: 'BD (Twice daily)',
        duration: '3 Days',
        instructions: 'Take after meals for severe pain only',
      },
      {
        id: 'rx-2',
        drugName: 'Pantoprazole (Pan 40)',
        dosage: '40mg',
        frequency: 'OD (Once daily)',
        duration: '7 Days',
        instructions: 'Take empty stomach in the morning',
      },
      {
        id: 'rx-3',
        drugName: 'Magnesium Glycinate',
        dosage: '250mg',
        frequency: 'OD (Night)',
        duration: '14 Days',
        instructions: 'Take at bedtime for muscle relaxation',
      },
    ],
    followUpDays: 7,
    allergies: ['Penicillin (mild rash)'],
    chronicConditions: ['None reported'],
  },
  {
    id: 'emr-2',
    patientId: 'pat-robert-chen',
    patientName: 'Robert Chen',
    age: 45,
    gender: 'Male',
    bloodGroup: 'B+',
    phone: '+91 98765 43211',
    date: '10 Aug 2026',
    doctorId: 'doc-1',
    doctorName: 'Dr. Olivia Wilson',
    doctorSpecialty: 'Cardiologist',
    hospitalName: 'CarePulse Central Hospital',
    chiefComplaint: 'Follow-up routine hypertension check and morning headaches.',
    intakeNotes: 'Patient missed anti-hypertensive medication for 2 days last week.',
    triagePriority: 'Normal',
    vitals: {
      bpSys: 142,
      bpDia: 92,
      heartRate: 76,
      temperature: 98.4,
      spo2: 98,
      weight: 81,
      recordedAt: '10:00 AM',
    },
    soapNotes: {
      subjective: '45M on Telmisartan 40mg. Complains of mild occipital throbbing upon waking. Denies vision changes, dizziness, or peripheral edema.',
      objective: 'BP measured seated 142/92 mmHg right arm, 140/90 mmHg left arm. Heart sounds normal. No pedal edema.',
      assessment: 'Stage 1 Essential Hypertension with sub-optimal blood pressure control due to compliance fluctuations.',
      plan: 'Titrated Telmisartan from 40mg to 40mg + Amlodipine 5mg combination. Low sodium DASH diet advised. Daily morning BP home monitoring log requested.',
    },
    prescriptions: [
      {
        id: 'rx-4',
        drugName: 'Telmisartan + Amlodipine (Telma-AM)',
        dosage: '40mg/5mg',
        frequency: 'OD (Once daily)',
        duration: '30 Days',
        instructions: 'Take in the morning after breakfast',
      },
      {
        id: 'rx-5',
        drugName: 'Rosuvastatin (Rosuvas 10)',
        dosage: '10mg',
        frequency: 'OD (Night)',
        duration: '30 Days',
        instructions: 'Take at night after dinner',
      },
    ],
    followUpDays: 30,
    allergies: ['Sulfa drugs'],
    chronicConditions: ['Hypertension (Stage 1)', 'Dyslipidemia'],
  },
  {
    id: 'emr-3',
    patientId: 'pat-anita-sharma',
    patientName: 'Anita Sharma',
    age: 28,
    gender: 'Female',
    bloodGroup: 'O+',
    phone: '+91 98765 43212',
    date: '02 Aug 2026',
    doctorId: 'doc-2',
    doctorName: 'Dr. Marcus Vance',
    doctorSpecialty: 'Dermatologist',
    hospitalName: 'CarePulse Central Hospital',
    chiefComplaint: 'Erythematous itchy patch on forearm and wrist.',
    intakeNotes: 'Rash started after using a new detergent powder 4 days ago.',
    triagePriority: 'Normal',
    vitals: {
      bpSys: 118,
      bpDia: 76,
      heartRate: 70,
      temperature: 98.2,
      spo2: 99,
      weight: 55,
      recordedAt: '11:15 AM',
    },
    soapNotes: {
      subjective: '28F presents with pruritic, well-demarcated erythematous papules and mild scaling over volar aspect of bilateral forearms. No fever.',
      objective: 'Maculopapular rash with excoriation marks. No secondary infection or oozing. Mucous membranes uninvolved.',
      assessment: 'Acute Contact Allergic Dermatitis secondary to household chemical exposure.',
      plan: 'Discontinue chemical contact. Topical corticosteroid and oral H1-antihistamine. Keep area moisturized.',
    },
    prescriptions: [
      {
        id: 'rx-6',
        drugName: 'Mometasone Furoate 0.1% Cream',
        dosage: 'Apply thin layer',
        frequency: 'BD (Twice daily)',
        duration: '7 Days',
        instructions: 'Apply gently over affected lesions morning and night',
      },
      {
        id: 'rx-7',
        drugName: 'Levocetirizine (Levocet 5mg)',
        dosage: '5mg',
        frequency: 'OD (Night)',
        duration: '5 Days',
        instructions: 'Take 1 tablet at night for itching',
      },
    ],
    followUpDays: 14,
    allergies: ['None known'],
    chronicConditions: ['Seasonal rhinitis'],
  },
];

// Audio Chime Player (Two-Tone Clinical Chime)
export const playCallChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Tone 1 - High note (880 Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.25, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.38);

    // Tone 2 - Harmonic resolution (659.25 Hz - E5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.22);
    gain2.gain.setValueAtTime(0.001, now + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.28, now + 0.26);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.22);
    osc2.stop(now + 0.68);
  } catch {
    // Silently continue if audio context is blocked by browser policy
  }
};

// Web Speech API Voice Announcement
export const speakDoctorAnnouncement = (text: string) => {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  } catch {
    // Ignore speech errors
  }
};

export const staffConsultationService = {
  // 1. Get all EMR records (cached + backend)
  getAllEMRRecords: async (): Promise<PatientEMRRecord[]> => {
    try {
      const stored = localStorage.getItem(EMR_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}

    // Initialize with seed records if empty
    localStorage.setItem(EMR_STORAGE_KEY, JSON.stringify(SEED_EMR_RECORDS));
    return SEED_EMR_RECORDS;
  },

  // 2. Search EMR by name, phone, ticket, diagnosis, or health issue
  searchEMR: async (query: string): Promise<PatientEMRRecord[]> => {
    const all = await staffConsultationService.getAllEMRRecords();
    if (!query.trim()) return all;
    const q = query.toLowerCase().trim();
    return all.filter((r) =>
      r.patientName.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      r.patientId.toLowerCase().includes(q) ||
      r.chiefComplaint.toLowerCase().includes(q) ||
      r.soapNotes.assessment.toLowerCase().includes(q) ||
      r.soapNotes.subjective.toLowerCase().includes(q) ||
      r.doctorName.toLowerCase().includes(q)
    );
  },

  // 3. Get EMR for a specific patient
  getPatientConsultations: async (patientIdOrName: string): Promise<PatientEMRRecord[]> => {
    const all = await staffConsultationService.getAllEMRRecords();
    const cleanKey = patientIdOrName.toLowerCase().trim();
    return all.filter(
      (r) =>
        r.patientId.toLowerCase() === cleanKey ||
        r.patientName.toLowerCase().includes(cleanKey)
    );
  },

  // 4. Save a completed Clinical Consultation
  createConsultation: async (data: {
    patientId: string;
    patientName: string;
    age?: number;
    gender?: string;
    bloodGroup?: string;
    phone?: string;
    doctorId: string;
    doctorName: string;
    doctorSpecialty?: string;
    hospitalName?: string;
    chiefComplaint: string;
    intakeNotes?: string;
    triagePriority?: TriagePriority;
    vitals: PatientVitals;
    soapNotes: SoapNotes;
    prescriptions: PrescriptionMedicine[];
    followUpDays?: number;
    allergies?: string[];
  }): Promise<PatientEMRRecord> => {
    const newRecord: PatientEMRRecord = {
      id: `emr-${Date.now()}`,
      patientId: data.patientId || `pat-${Date.now()}`,
      patientName: data.patientName || 'Patient',
      age: data.age || 35,
      gender: data.gender || 'Unknown',
      bloodGroup: data.bloodGroup || 'O+',
      phone: data.phone || '+91 98765 00000',
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      doctorSpecialty: data.doctorSpecialty || 'General Physician',
      hospitalName: data.hospitalName || 'CarePulse Hospital',
      chiefComplaint: data.chiefComplaint || 'Routine Medical Consultation',
      intakeNotes: data.intakeNotes,
      triagePriority: data.triagePriority || 'Normal',
      vitals: data.vitals,
      soapNotes: data.soapNotes,
      prescriptions: data.prescriptions,
      followUpDays: data.followUpDays || 7,
      allergies: data.allergies || [],
    };

    // 1. Save to local EMR storage
    try {
      const all = await staffConsultationService.getAllEMRRecords();
      const updated = [newRecord, ...all];
      localStorage.setItem(EMR_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save to localStorage EMR:', e);
    }

    // 2. Sync to Backend REST API (if available)
    try {
      await apiPost('/doctor/consultations', {
        patientId: newRecord.patientId,
        doctorId: newRecord.doctorId,
        doctorName: newRecord.doctorName,
        date: new Date().toISOString().split('T')[0],
        soapData: {
          subjective: newRecord.soapNotes.subjective,
          objective: newRecord.soapNotes.objective,
          assessment: newRecord.soapNotes.assessment,
          plan: newRecord.soapNotes.plan,
          vitals: newRecord.vitals,
          prescriptions: newRecord.prescriptions,
          chiefComplaint: newRecord.chiefComplaint,
        },
      });
    } catch (err) {
      console.info('Backend consultation sync note (offline safe):', err);
    }

    return newRecord;
  },

  // 5. Draft Management (Preserve doctor's in-progress notes)
  saveDraft: (patientId: string, data: any) => {
    try {
      const drafts = JSON.parse(localStorage.getItem(CONSULTATION_DRAFTS_KEY) || '{}');
      drafts[patientId] = { ...data, updatedAt: new Date().toISOString() };
      localStorage.setItem(CONSULTATION_DRAFTS_KEY, JSON.stringify(drafts));
    } catch (_) {}
  },

  getDraft: (patientId: string) => {
    try {
      const drafts = JSON.parse(localStorage.getItem(CONSULTATION_DRAFTS_KEY) || '{}');
      return drafts[patientId] || null;
    } catch (_) {
      return null;
    }
  },

  clearDraft: (patientId: string) => {
    try {
      const drafts = JSON.parse(localStorage.getItem(CONSULTATION_DRAFTS_KEY) || '{}');
      delete drafts[patientId];
      localStorage.setItem(CONSULTATION_DRAFTS_KEY, JSON.stringify(drafts));
    } catch (_) {}
  },
};
