import { apiGet } from '../lib/apiFetch';
import type { Doctor } from '../lib/types';
import { MOCK_DOCTORS } from '../lib/mockApi';
import { useStaffStore } from '../store/staffStore';

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
          // Merge with live staffStore slots if present
          const staffDocs = useStaffStore.getState().doctors;
          return data.map((doc: any) => {
            const staffDoc = staffDocs.find(
              (s) => s.id === doc.id || s.staffCode === doc.id || s.staff_code === doc.id
            );
            if (staffDoc) {
              return {
                ...doc,
                isAvailable: staffDoc.isAvailable,
                is_available: staffDoc.isAvailable,
                slotCapacities: staffDoc.slotCapacities,
                slot_capacities: staffDoc.slotCapacities,
                availableDays: staffDoc.availableDays,
              };
            }
            return doc;
          });
        }
      }
    } catch (err) {
      console.warn('Backend fetch doctors failed, using local fallback:', err);
    }

    // Local fallback: Combine staffStore doctors and MOCK_DOCTORS
    const staffDocs = useStaffStore.getState().doctors;
    const mappedStaffDocs: Doctor[] = staffDocs.map((s) => ({
      id: s.id,
      staffCode: s.staffCode || s.staff_code,
      staff_code: s.staffCode || s.staff_code,
      name: s.name,
      specialty: s.specialty,
      department: s.department,
      hospitalId: (s as any).hospitalId || 'hosp-1',
      hospitalName: (s as any).hospitalName || 'St. Jude Heart & Medical Center',
      photoUrl: s.photo || '/doctor_default.jpg',
      rating: 4.8,
      reviewsCount: 95,
      experienceYears: s.experienceYears || 8,
      consultationFee: s.consultationFee || 600,
      phone: s.phone,
      email: s.email,
      roomNumber: s.roomNumber,
      isAvailable: s.isAvailable,
      is_available: s.isAvailable,
      availableDays: s.availableDays,
      slotCapacities: s.slotCapacities,
      slot_capacities: s.slotCapacities,
      about: s.about,
    }));

    const allDocsMap = new Map<string, Doctor>();
    mappedStaffDocs.forEach((d) => allDocsMap.set(d.id, d));
    MOCK_DOCTORS.forEach((d) => {
      if (!allDocsMap.has(d.id)) {
        allDocsMap.set(d.id, d);
      }
    });

    let list = Array.from(allDocsMap.values());
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
    const staffDoc = useStaffStore.getState().doctors.find(
      (d) => d.id === id || d.staffCode === id || d.staff_code === id
    );

    try {
      const res = await apiGet(`/doctors/${id}`);
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.id) {
          if (staffDoc) {
            return {
              ...data,
              isAvailable: staffDoc.isAvailable,
              is_available: staffDoc.isAvailable,
              slotCapacities: staffDoc.slotCapacities,
              slot_capacities: staffDoc.slotCapacities,
              availableDays: staffDoc.availableDays,
            };
          }
          return data;
        }
      }
    } catch (err) {
      console.warn(`Backend fetch doctor ${id} failed, using local fallback:`, err);
    }

    if (staffDoc) {
      return {
        id: staffDoc.id,
        staffCode: staffDoc.staffCode || staffDoc.staff_code,
        staff_code: staffDoc.staffCode || staffDoc.staff_code,
        name: staffDoc.name,
        specialty: staffDoc.specialty,
        department: staffDoc.department,
        hospitalId: (staffDoc as any).hospitalId || 'hosp-1',
        hospitalName: (staffDoc as any).hospitalName || 'St. Jude Heart & Medical Center',
        photoUrl: staffDoc.photo || '/doctor_default.jpg',
        rating: 4.8,
        reviewsCount: 95,
        experienceYears: staffDoc.experienceYears || 8,
        consultationFee: staffDoc.consultationFee || 600,
        phone: staffDoc.phone,
        email: staffDoc.email,
        roomNumber: staffDoc.roomNumber,
        isAvailable: staffDoc.isAvailable,
        is_available: staffDoc.isAvailable,
        availableDays: staffDoc.availableDays,
        slotCapacities: staffDoc.slotCapacities,
        slot_capacities: staffDoc.slotCapacities,
        about: staffDoc.about,
      };
    }

    return MOCK_DOCTORS.find((d) => d.id === id) || MOCK_DOCTORS[0];
  },
};
