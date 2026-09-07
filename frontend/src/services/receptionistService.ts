import type { DoctorRecord, TokenQueueItem, TokenStatus, ReceptionistProfile } from '../types/receptionist';
import { apiFetch } from '../lib/apiFetch';

export const receptionistService = {
  async getDoctors(hospitalId?: string): Promise<DoctorRecord[]> {
    try {
      const q = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : '';
      let res = await apiFetch(`/receptionist/doctors${q}`, { method: 'GET' });
      if (!res.ok) {
        res = await apiFetch(`/doctors${q}`, { method: 'GET' });
      }
      if (res.ok) {
        const data = await res.json();
        const docs = Array.isArray(data) ? data : (data.doctors || []);
        return docs.map((d: any) => ({
          ...d,
          photo: d.photo || d.photoUrl || d.photo_url || '/doctor_default.jpg',
        }));
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

  async getTokenQueue(doctorId?: string, hospitalId?: string): Promise<TokenQueueItem[]> {
    try {
      const params = new URLSearchParams();
      if (doctorId) params.append('doctor_id', doctorId);
      if (hospitalId) params.append('hospital_id', hospitalId);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await apiFetch(`/receptionist/tokens${query}`, { method: 'GET' });
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
  },

  async getProfile(): Promise<ReceptionistProfile | null> {
    try {
      const res = await apiFetch('/receptionist/profile', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        return data.profile || null;
      }
    } catch (e) {
      console.warn('Failed to load receptionist profile from API', e);
    }
    return null;
  },

  async updateProfile(updates: Partial<ReceptionistProfile>): Promise<ReceptionistProfile | null> {
    try {
      const res = await apiFetch('/receptionist/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        return data.profile || null;
      }
    } catch (e) {
      console.warn('Failed to update receptionist profile via API', e);
    }
    return null;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await apiFetch('/receptionist/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.detail || data.message || 'Failed to update password.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Network error updating password.' };
    }
  },
};
