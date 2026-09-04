// src/types/doctor.ts

export type TriagePriority = 'Normal' | 'Urgent' | 'Senior-Child';

export interface PatientVitals {
  bpSys: number; // e.g. 120 (mmHg)
  bpDia: number; // e.g. 80 (mmHg)
  heartRate: number; // e.g. 72 (bpm)
  temperature: number; // e.g. 98.6 (°F)
  spo2: number; // e.g. 99 (%)
  weight: number; // e.g. 68 (kg)
  recordedAt?: string;
}

export interface SoapNotes {
  subjective: string; // Chief complaints, history of present illness, patient symptoms
  objective: string;   // Physical examination, clinical signs, vitals summary
  assessment: string;  // Primary diagnosis, differential diagnosis, clinical impression
  plan: string;        // Treatment plan, investigations/labs ordered, lifestyle/diet advice
}

export interface PrescriptionMedicine {
  id: string;
  drugName: string;
  dosage: string;       // e.g. "500 mg" or "1 Tab"
  frequency: string;    // e.g. "OD (Once daily)", "BD (Twice daily)", "TDS (Thrice daily)", "SOS"
  duration: string;     // e.g. "5 Days", "10 Days", "1 Month"
  instructions: string; // e.g. "After food", "Before breakfast", "At bedtime"
}

export interface PatientEMRRecord {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  phone: string;
  date: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  hospitalName: string;
  chiefComplaint: string;
  intakeNotes?: string;
  triagePriority: TriagePriority;
  vitals: PatientVitals;
  soapNotes: SoapNotes;
  prescriptions: PrescriptionMedicine[];
  followUpDays?: number;
  allergies?: string[];
  chronicConditions?: string[];
}

export type DoctorTab =
  | 'dashboard'
  | 'consultation'
  | 'queue'
  | 'emr'
  | 'profile'
  | 'notifications';
