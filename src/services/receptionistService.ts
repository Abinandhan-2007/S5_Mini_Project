import type { DoctorRecord, TokenQueueItem, TokenStatus } from '../types/receptionist';

const API_BASE = '/api/receptionist';

export const receptionistService = {
  async getDoctors(): Promise<DoctorRecord[]> {
    try {
      const res = await fetch(`${API_BASE}/doctors`);
      if (res.ok) {
        const data = await res.json();
        return data.doctors || [];
      }
    } catch (e) {
      console.warn('Backend server offline, returning fallback doctor records', e);
    }
    return [];
  },

  async createDoctor(payload: Partial<DoctorRecord>): Promise<DoctorRecord | null> {
    try {
      const res = await fetch(`${API_BASE}/doctors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        return data.doctor;
      }
    } catch (e) {
      console.warn('Failed to create doctor via backend API', e);
    }
    return null;
  },

  async toggleDoctorAvailability(doctorId: string, isAvailable: boolean): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/doctors/${doctorId}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to toggle doctor availability', e);
      return false;
    }
  },

  async updateSlotCapacity(doctorId: string, timeSlot: string, maxSeats: number, isAvailable: boolean = true): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/doctors/${doctorId}/slots`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeSlot, maxSeats, isAvailable }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to update slot capacity', e);
      return false;
    }
  },

  async getTokenQueue(doctorId?: string): Promise<TokenQueueItem[]> {
    try {
      const url = doctorId ? `${API_BASE}/tokens?doctor_id=${doctorId}` : `${API_BASE}/tokens`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.tokens || [];
      }
    } catch (e) {
      console.warn('Backend server offline, returning token queue fallback', e);
    }
    return [];
  },

  async callNextToken(doctorId?: string): Promise<TokenQueueItem | null> {
    try {
      const url = doctorId ? `${API_BASE}/tokens/call-next?doctor_id=${doctorId}` : `${API_BASE}/tokens/call-next`;
      const res = await fetch(url, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        return data.activeToken || null;
      }
    } catch (e) {
      console.warn('Failed to call next token', e);
    }
    return null;
  },

  async updateTokenStatus(tokenId: string, status: TokenStatus): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/tokens/${tokenId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to update token status', e);
      return false;
    }
  },

  async bookWalkInAppointment(payload: {
    patientName: string;
    patientPhone: string;
    doctorId: string;
    doctorName: string;
    doctorSpecialty: string;
    date: string;
    timeSlot: string;
  }): Promise<{ ticketNumber: string; token: TokenQueueItem } | null> {
    try {
      const res = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to book walkin appointment', e);
    }
    return null;
  }
};
