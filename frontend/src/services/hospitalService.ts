import { apiGet } from '../lib/apiFetch';
import type { Hospital, Doctor } from '../lib/types';

export const hospitalService = {
  /**
   * Fetch all hospitals from backend database (/api/hospitals)
   */
  async getHospitals(search?: string): Promise<Hospital[]> {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await apiGet(`/hospitals${query}`);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data;
        }
      }
    } catch (err) {
      console.warn('Backend fetch hospitals failed:', err);
    }

    return [];
  },

  /**
   * Fetch a single hospital with its doctors from backend database (/api/hospitals/:id)
   */
  async getHospitalById(id: string): Promise<{ hospital: Hospital | null; doctors: Doctor[] }> {
    try {
      const res = await apiGet(`/hospitals/${id}`);
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.hospital) {
          return {
            hospital: data.hospital,
            doctors: data.doctors || [],
          };
        }
      }
    } catch (err) {
      console.warn(`Backend fetch hospital ${id} failed:`, err);
    }

    return {
      hospital: null,
      doctors: [],
    };
  },
};
