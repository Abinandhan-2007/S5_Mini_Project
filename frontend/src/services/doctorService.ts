import { apiGet } from '../lib/apiFetch';
import type { Doctor } from '../lib/types';
import { MOCK_DOCTORS } from '../lib/mockApi';

export const doctorService = {
  /**
   * Fetch doctors from backend database (/api/doctors) with optional filters
   */
  async getDoctors(params?: {
    hospitalId?: string;
    specialty?: string;
    search?: string;
  }): Promise<Doctor[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.hospitalId) searchParams.append('hospital_id', params.hospitalId);
      if (params?.specialty && params.specialty !== 'All') searchParams.append('specialty', params.specialty);
      if (params?.search) searchParams.append('search', params.search);

      const qs = searchParams.toString();
      const res = await apiGet(`/doctors${qs ? `?${qs}` : ''}`);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (err) {
      console.warn('Backend fetch doctors failed, using local fallback:', err);
    }

    // Local fallback
    let list = [...MOCK_DOCTORS];
    if (params?.hospitalId) {
      list = list.filter((d) => d.hospitalId === params.hospitalId || d.hospitalId === 'hosp-1');
    }
    if (params?.specialty && params.specialty !== 'All') {
      list = list.filter((d) => d.specialty.toLowerCase() === params.specialty?.toLowerCase());
    }
    if (params?.search) {
      const term = params.search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(term) ||
          d.specialty.toLowerCase().includes(term) ||
          d.hospitalName.toLowerCase().includes(term)
      );
    }
    return list;
  },

  /**
   * Fetch a single doctor by ID (/api/doctors/:id)
   */
  async getDoctorById(id: string): Promise<Doctor> {
    try {
      const res = await apiGet(`/doctors/${id}`);
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.id) {
          return data;
        }
      }
    } catch (err) {
      console.warn(`Backend fetch doctor ${id} failed, using local fallback:`, err);
    }

    // Local fallback
    return MOCK_DOCTORS.find((d) => d.id === id) || MOCK_DOCTORS[0];
  },
};
