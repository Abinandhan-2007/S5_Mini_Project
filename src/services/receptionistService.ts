import type { DoctorRecord, TokenQueueItem, TokenStatus } from '../types/receptionist';
import { apiFetch } from '../lib/apiFetch';

export const receptionistService = {
  async getDoctors(): Promise<DoctorRecord[]> {
    try {
      const res = await apiFetch('/receptionist/doctors', { method: 'GET' });
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
      const res = await apiFetch('/receptionist/doctors', {
        method: 'POST',
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
      const res = await apiFetch(`/receptionist/doctors/${doctorId}/availability`, {
        method: 'PATCH',
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
      const res = await apiFetch(`/receptionist/doctors/${doctorId}/slots`, {
        method: 'PUT',
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
      const path = doctorId ? `/receptionist/tokens?doctor_id=${doctorId}` : '/receptionist/tokens';
      const res = await apiFetch(path, { method: 'GET' });
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
      const path = doctorId ? `/receptionist/tokens/call-next?doctor_id=${doctorId}` : '/receptionist/tokens/call-next';
      const res = await apiFetch(path, { method: 'POST' });
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
      const res = await apiFetch(`/receptionist/tokens/${tokenId}/status`, {
        method: 'PATCH',
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
    age?: number;
    bloodGroup?: string;
    address?: string;
    healthIssue?: string;
  }): Promise<{ ticketNumber: string; token: TokenQueueItem } | null> {

    try {
      const res = await apiFetch('/receptionist/appointments', {
        method: 'POST',
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
