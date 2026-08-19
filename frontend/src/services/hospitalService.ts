import { apiGet } from '../lib/apiFetch';
import type { Hospital, Doctor } from '../lib/types';
import { MOCK_HOSPITALS, MOCK_DOCTORS } from '../lib/mockApi';

export const hospitalService = {
  /**
   * Fetch all hospitals from backend database (/api/hospitals), with fallback to mock data
   */
  async getHospitals(search?: string): Promise<Hospital[]> {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await apiGet(`/hospitals${query}`);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (err) {
      console.warn('Backend fetch hospitals failed, using local fallback:', err);
    }

    // Fallback to local mock data
    if (search) {
      const term = search.toLowerCase();
      return MOCK_HOSPITALS.filter(
        (h) =>
          h.name.toLowerCase().includes(term) ||
          h.address.toLowerCase().includes(term) ||
          h.specialties.some((s) => s.toLowerCase().includes(term))
      );
    }
    return MOCK_HOSPITALS;
  },

  /**
   * Fetch a single hospital with its doctors from backend database (/api/hospitals/:id)
   */
  async getHospitalById(id: string): Promise<{ hospital: Hospital; doctors: Doctor[] }> {
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
      console.warn(`Backend fetch hospital ${id} failed, using local fallback:`, err);
    }

    // Fallback
    const fallbackHosp = MOCK_HOSPITALS.find((h) => h.id === id) || MOCK_HOSPITALS[0];
    const fallbackDocs = MOCK_DOCTORS.filter((d) => d.hospitalId === id || d.hospitalId === 'hosp-1');
    return {
      hospital: fallbackHosp,
      doctors: fallbackDocs,
    };
  },
};
