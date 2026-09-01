/**
 * CarePulse Consultation & AI Clinical Scribe Service
 */

import { apiFetch } from '../lib/apiFetch';

export interface MedicationItem {
  id?: string;
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  duration: string;
  instructions: string;
  confidence: 'high' | 'inferred' | 'low';
  confidence_reason?: string;
}

export interface AllergyWarning {
  drug: string;
  allergy: string;
  source: string;
  severity: string;
  warning: string;
}

export interface ScribeResult {
  status: string;
  doctor_specialty?: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  primary_diagnosis?: string;
  vitals?: {
    blood_pressure?: string;
    pulse?: string;
    temperature?: string;
    spo2?: string;
    weight?: string;
  };
  medications: MedicationItem[];
  diagnostic_tests: string[];
  dietary_advice?: string;
  follow_up?: string;
  allergy_warnings: AllergyWarning[];
  attribution_method?: string;
  transcript_preview?: string;
}

export interface SaveConsultationPayload {
  patient_id?: string;
  doctor_id?: string;
  doctor_name?: string;
  doctor_specialty?: string;
  token_number?: string;
  ticket_number?: string;
  diagnosis: string;
  symptoms?: string;
  subjective_notes?: string;
  objective_notes?: string;
  assessment_notes?: string;
  plan_notes?: string;
  prescriptions: Array<{
    medicine: string;
    dosage: string;
    timing: string;
    duration: string;
  }>;
  tests_ordered?: string[];
  follow_up?: string;
}

/**
 * Sends speech transcript to the AI Scribe agent for SOAP extraction,
 * calibrated drug confidence scoring, and stored database allergy cross-referencing.
 */
export async function processAmbientScribe(params: {
  transcript: string;
  doctorId?: string;
  patientId?: string;
  doctorSpecialty?: string;
  patientContext?: Record<string, any>;
  verbalConsentGiven?: boolean;
}): Promise<ScribeResult> {
  const response = await apiFetch('/ai/scribe/process', {
    method: 'POST',
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to process consultation audio transcript');
  }

  const data: ScribeResult = await response.json();
  return data;
}

/**
 * Saves completed clinical consultation to backend database.
 */
export async function saveConsultation(payload: SaveConsultationPayload): Promise<any> {
  const response = await apiFetch('/consultations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to save consultation');
  }

  return response.json();
}
