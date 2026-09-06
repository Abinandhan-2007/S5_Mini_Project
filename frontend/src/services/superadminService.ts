// frontend/src/services/superadminService.ts
import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/apiFetch';
import type { SuperAdminHospital, SuperAdminAdmin, SuperAdminStats, Staff } from '../types/staff';

export const superadminService = {
  login: async (credentials: { email: string; password: string }): Promise<{ token: string; staff: Staff }> => {
    const res = await apiPost('/superadmin/login', credentials);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'SuperAdmin login failed');
    }
    return data;
  },

  getStats: async (): Promise<SuperAdminStats> => {
    const res = await apiGet('/superadmin/stats');
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to fetch platform statistics');
    }
    return data.stats;
  },

  getHospitals: async (): Promise<SuperAdminHospital[]> => {
    const res = await apiGet('/superadmin/hospitals');
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to fetch hospitals');
    }
    return data.hospitals;
  },

  createHospital: async (payload: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
    facility_type?: string;
    specialties?: string[];
    emergency_available?: boolean;
  }): Promise<{ message: string; hospital: SuperAdminHospital }> => {
    const res = await apiPost('/superadmin/hospitals', payload);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to create hospital');
    }
    return data;
  },

  updateHospital: async (id: string, updates: Partial<SuperAdminHospital>): Promise<void> => {
    const res = await apiPatch(`/superadmin/hospitals/${id}`, updates);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to update hospital');
    }
  },

  getAdmins: async (): Promise<SuperAdminAdmin[]> => {
    const res = await apiGet('/superadmin/admins');
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to fetch administrators');
    }
    return data.admins;
  },

  createAdmin: async (payload: {
    full_name: string;
    email: string;
    password: string;
    hospital_id: string;
    phone?: string;
    department?: string;
  }): Promise<{ message: string; admin: SuperAdminAdmin }> => {
    const res = await apiPost('/superadmin/admins', payload);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to create administrator');
    }
    return data;
  },

  toggleAdminStatus: async (adminId: string, is_active: boolean): Promise<void> => {
    const res = await apiPatch(`/superadmin/admins/${adminId}/status`, { is_active });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to update administrator status');
    }
  },

  deleteHospital: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiDelete(`/superadmin/hospitals/${id}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to delete hospital');
    }
    return data;
  },

  deleteAdmin: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiDelete(`/superadmin/admins/${id}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to delete administrator');
    }
    return data;
  },
};
