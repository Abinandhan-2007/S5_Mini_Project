// frontend/src/types/nurse.ts

/**
 * =========================================================================
 * Clinical Reference Thresholds for Abnormal Vitals Screening
 * NOTE: These thresholds represent general adult reference ranges and are
 * NOT adjusted for patient age (pediatric/geriatric), pregnancy trimester,
 * athlete physiology, or specific pre-existing chronic conditions.
 * Consistent with clinical decision support limitations documented in CarePulse
 * (e.g., OpenFDA formulation and dosage caveats), abnormal flags serve as
 * preliminary screening cues for triage and require attending physician interpretation.
 * =========================================================================
 */
export const ADULT_VITALS_NORMAL_RANGES = {
  bp_systolic: { min: 90, max: 140, unit: 'mmHg', label: 'Systolic BP' },
  bp_diastolic: { min: 60, max: 90, unit: 'mmHg', label: 'Diastolic BP' },
  heart_rate: { min: 60, max: 100, unit: 'bpm', label: 'Heart Rate' },
  respiratory_rate: { min: 12, max: 20, unit: 'breaths/min', label: 'Respiratory Rate' },
  spo2: { min: 95, max: 100, unit: '%', label: 'Blood Oxygen (SpO2)' },
  temperature_c: { min: 35.0, max: 37.9, unit: '°C', label: 'Body Temperature' },
  blood_glucose_fasting: { min: 70, max: 126, unit: 'mg/dL', label: 'Fasting Glucose' },
  blood_glucose_random: { min: 70, max: 200, unit: 'mg/dL', label: 'Random Glucose' },
  bmi: { min: 18.5, max: 24.9, unit: 'kg/m²', label: 'Body Mass Index' }
};

export type VitalsStatus = 'pending' | 'recorded' | 'abnormal_flagged';
export type GlucoseContext = 'fasting' | 'random' | 'post-meal';

export interface VitalsRecord {
  id: string;
  appointment_id: string;
  patient_id: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  bmi?: number | null;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  heart_rate?: number | null;
  temperature?: number | null;
  temperature_unit?: 'C' | 'F';
  respiratory_rate?: number | null;
  spo2?: number | null;
  blood_glucose?: number | null;
  glucose_context?: GlucoseContext | null;
  notes?: string | null;
  abnormal_flags?: string[];
  recorded_by?: string | null;
  recorded_by_name?: string | null;
  recorded_at?: string | null;
}

export interface VitalsFormData {
  appointment_id: string;
  patient_id: string;
  height_cm?: number;
  weight_kg?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  heart_rate?: number;
  temperature?: number;
  temperature_unit?: 'C' | 'F';
  respiratory_rate?: number;
  spo2?: number;
  blood_glucose?: number;
  glucose_context?: GlucoseContext;
  notes?: string;
}

export interface LabTestRecord {
  id: string;
  appointment_id: string;
  patient_id: string;
  test_type: string;
  structured_results?: Record<string, any>;
  free_text_result?: string | null;
  file_url?: string | null;
  status?: string;
  ordered_by?: string | null;
  recorded_by?: string | null;
  recorded_by_name?: string | null;
  recorded_at?: string | null;
}

export interface LabTestFormData {
  appointment_id: string;
  patient_id: string;
  test_type: string;
  structured_results?: Record<string, any>;
  free_text_result?: string;
  file_url?: string;
  status?: string;
}

export interface NurseQueuePatient {
  id: string;
  name: string;
  dob?: string;
  gender?: string;
  blood_group?: string;
  phone?: string;
  patient_code?: string;
}

export interface NurseQueueDoctor {
  id: string;
  name: string;
  specialty?: string;
  room_number?: string;
}

export interface NurseQueueItem {
  appointment_id: string;
  token_number?: number;
  queue_status: string;
  vitals_status: VitalsStatus;
  date: string;
  time: string;
  appointment_type: string;
  chief_complaint: string;
  patient: NurseQueuePatient;
  doctor: NurseQueueDoctor;
  vitals?: VitalsRecord | null;
  abnormal_flags?: string[];
  lab_test_count?: number;
}
