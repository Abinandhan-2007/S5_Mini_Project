import type { PatientEMRRecord, PrescriptionMedicine, SoapNotes, PatientVitals, TriagePriority } from '../types/doctor';
import { apiPost } from '../lib/apiFetch';

const EMR_STORAGE_KEY = 'carepulse_doctor_emr_records';
const CONSULTATION_DRAFTS_KEY = 'carepulse_doctor_consultation_drafts';



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
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (_) {}

    return [];
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
