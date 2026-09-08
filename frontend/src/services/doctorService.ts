import { apiGet } from '../lib/apiFetch';
import type { Doctor } from '../lib/types';
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
        if (Array.isArray(data)) {
          return data.map((doc: any) => ({
            ...doc,
            isAvailable: doc.isAvailable !== false && doc.is_available !== false,
            is_available: doc.isAvailable !== false && doc.is_available !== false,
            availabilityReason: doc.availabilityReason || doc.availability_reason || '',
            availability_reason: doc.availabilityReason || doc.availability_reason || '',
            unavailableUntil: doc.unavailableUntil || doc.unavailable_until || '',
            unavailable_until: doc.unavailableUntil || doc.unavailable_until || '',
            photoUrl: doc.photo || doc.photoUrl || doc.photo_url || '/doctor_default.jpg',
          }));
        }
      }
    } catch (err) {
      console.warn('Backend fetch doctors failed, using local store:', err);
    }

    // Local fallback: strictly use staffStore doctors
    const staffDocs = useStaffStore.getState().doctors;
    const mappedStaffDocs: Doctor[] = staffDocs.map((s) => ({
      id: s.id,
      staffCode: s.staffCode || s.staff_code,
      staff_code: s.staffCode || s.staff_code,
      name: s.name,
      specialty: s.specialty,
      department: s.department,
      hospitalId: (s as any).hospitalId || (s as any).hospital_id || '',
      hospitalName: (s as any).hospitalName || (s as any).hospital_name || '',
      photoUrl: s.photo || '/doctor_default.jpg',
      rating: 4.8,
      reviewsCount: 95,
      experienceYears: s.experienceYears || 8,
      consultationFee: s.consultationFee || 600,
      phone: s.phone,
      email: s.email,
      roomNumber: s.roomNumber,
      isAvailable: s.isAvailable !== false && (s as any).is_available !== false,
      is_available: s.isAvailable !== false && (s as any).is_available !== false,
      availabilityReason: s.availabilityReason || (s as any).availability_reason || '',
      availability_reason: s.availabilityReason || (s as any).availability_reason || '',
      unavailableUntil: s.unavailableUntil || (s as any).unavailable_until || '',
      unavailable_until: s.unavailableUntil || (s as any).unavailable_until || '',
      availableDays: s.availableDays,
      slotCapacities: s.slotCapacities,
      slot_capacities: s.slotCapacities,
      about: s.about,
    }));

    let list = mappedStaffDocs;
    if (params?.hospitalId) {
      list = list.filter((d) => d.hospitalId === params.hospitalId);
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
  async getDoctorById(id: string): Promise<Doctor | null> {
    const staffDoc = useStaffStore.getState().doctors.find(
      (d) => d.id === id || d.staffCode === id || d.staff_code === id
    );

    try {
      const res = await apiGet(`/doctors/${id}`);
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.id) {
          return {
            ...data,
            isAvailable: data.isAvailable !== false && data.is_available !== false,
            is_available: data.isAvailable !== false && data.is_available !== false,
            availabilityReason: data.availabilityReason || data.availability_reason || '',
            availability_reason: data.availabilityReason || data.availability_reason || '',
            unavailableUntil: data.unavailableUntil || data.unavailable_until || '',
            unavailable_until: data.unavailableUntil || data.unavailable_until || '',
            photoUrl: data.photo || data.photoUrl || data.photo_url || '/doctor_default.jpg',
          };
        }
      }
    } catch (err) {
      console.warn(`Backend fetch doctor ${id} failed:`, err);
    }

    if (staffDoc) {
      return {
        id: staffDoc.id,
        staffCode: staffDoc.staffCode || staffDoc.staff_code,
        staff_code: staffDoc.staffCode || staffDoc.staff_code,
        name: staffDoc.name,
        specialty: staffDoc.specialty,
        department: staffDoc.department,
        hospitalId: (staffDoc as any).hospitalId || '',
        hospitalName: (staffDoc as any).hospitalName || '',
        photoUrl: staffDoc.photo || '/doctor_default.jpg',
        rating: 4.8,
        reviewsCount: 95,
        experienceYears: staffDoc.experienceYears || 8,
        consultationFee: staffDoc.consultationFee || 600,
        phone: staffDoc.phone,
        email: staffDoc.email,
        roomNumber: staffDoc.roomNumber,
        isAvailable: staffDoc.isAvailable !== false && (staffDoc as any).is_available !== false,
        is_available: staffDoc.isAvailable !== false && (staffDoc as any).is_available !== false,
        availabilityReason: staffDoc.availabilityReason || (staffDoc as any).availability_reason || '',
        availability_reason: staffDoc.availabilityReason || (staffDoc as any).availability_reason || '',
        unavailableUntil: staffDoc.unavailableUntil || (staffDoc as any).unavailable_until || '',
        unavailable_until: staffDoc.unavailableUntil || (staffDoc as any).unavailable_until || '',
        availableDays: staffDoc.availableDays,
        slotCapacities: staffDoc.slotCapacities,
        slot_capacities: staffDoc.slotCapacities,
        about: staffDoc.about,
      };
    }

    return null;
  },

  /**
   * Fetch live date-specific slot capacity directly from database (/api/doctors/:id/slots?date=...)
   */
  async getDoctorSlots(doctorId: string, date?: string): Promise<any[]> {
    try {
      const q = date ? `?date=${encodeURIComponent(date)}` : '';
      const res = await apiGet(`/doctors/${doctorId}/slots${q}`);
      if (res && res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.slots)) {
          return data.slots;
        }
      }
    } catch (err) {
      console.warn(`Backend fetch doctor slots for ${doctorId} failed:`, err);
    }

    // Fallback to local store doctor slots
    const staffDoc = useStaffStore.getState().doctors.find(
      (d) => d.id === doctorId || d.staffCode === doctorId || d.staff_code === doctorId
    );
    if (staffDoc?.slotCapacities && staffDoc.slotCapacities.length > 0) {
      return staffDoc.slotCapacities;
    }

    return [];
  },
};
