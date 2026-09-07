// frontend/src/services/nurseService.ts
import { apiFetch } from '../lib/apiFetch';
import type {
  NurseQueueItem,
  VitalsRecord,
  VitalsFormData,
  LabTestRecord,
  LabTestFormData,
} from '../types/nurse';
import type { NurseRecord } from '../types/staff';

export const nurseService = {
  /**
   * Fetch today's patient queue for nurse vitals recording
   */
  async getQueue(hospitalId?: string): Promise<NurseQueueItem[]> {
    const query = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : '';
    const res = await apiFetch(`/nurse/queue${query}`, { method: 'GET' });
    if (!res.ok) {
      throw new Error(`Failed to fetch nurse queue (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.queue || [];
  },

  /**
   * Record or update patient vitals
   */
  async recordVitals(payload: VitalsFormData): Promise<{ vitals: VitalsRecord; abnormal_flags: string[] }> {
    const res = await apiFetch('/nurse/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to record vitals' }));
      throw new Error(err.detail || `Failed to record vitals (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * Get recorded vitals for an appointment
   */
  async getVitals(appointmentId: string): Promise<VitalsRecord | null> {
    const res = await apiFetch(`/nurse/vitals/${encodeURIComponent(appointmentId)}`, { method: 'GET' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.vitals || null;
  },

  /**
   * Record a diagnostic / lab test
   */
  async recordLabTest(payload: LabTestFormData): Promise<LabTestRecord> {
    const res = await apiFetch('/nurse/tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to record lab test' }));
      throw new Error(err.detail || `Failed to record lab test (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.test;
  },

  /**
   * Get all lab tests for an appointment
   */
  async getLabTests(appointmentId: string): Promise<LabTestRecord[]> {
    const res = await apiFetch(`/nurse/tests/${encodeURIComponent(appointmentId)}`, { method: 'GET' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.tests || [];
  },

  /**
   * Upload diagnostic report file using base64 decoding (preserves established scan convention)
   */
  async uploadReport(fileData: string, filename?: string, appointmentId?: string): Promise<{ file_url: string; filename: string }> {
    const res = await apiFetch('/nurse/upload-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_data: fileData, filename, appointment_id: appointmentId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to upload report' }));
      throw new Error(err.detail || `Failed to upload report (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * Receptionist endpoint: Get all nurses in hospital
   */
  async getHospitalNurses(hospitalId?: string): Promise<NurseRecord[]> {
    const query = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : '';
    const res = await apiFetch(`/receptionist/nurses${query}`, { method: 'GET' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.nurses || [];
  },

  /**
   * Receptionist endpoint: Create nurse staff account
   */
  async createNurse(payload: Partial<NurseRecord>): Promise<NurseRecord> {
    const res = await apiFetch('/receptionist/nurses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create nurse record' }));
      throw new Error(err.detail || `Failed to create nurse record (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.nurse;
  }
};
