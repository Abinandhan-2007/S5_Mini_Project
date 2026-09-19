import { apiFetch } from '../lib/apiFetch';

export interface DoctorLeaveRecord {
  id: string;
  doctorId: string;
  doctor_id?: string;
  doctorName: string;
  hospitalId: string;
  hospital_id?: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | string;
  appliedAt: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

export interface NurseRequestRecord {
  id: string;
  hospitalId: string;
  requestedById?: string;
  requestedByName?: string;
  requestedByRole?: string;
  fullName: string;
  email: string;
  phone?: string;
  department?: string;
  shift?: string;
  specialization?: string;
  notes?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | string;
  createdAt: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
}

export const adminService = {
  async getHospitalDoctorLeaves(): Promise<DoctorLeaveRecord[]> {
    try {
      const res = await apiFetch('/admin/doctor-leaves', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        return data.leaves || [];
      }
    } catch (e) {
      console.warn('Failed to fetch hospital doctor leaves for admin', e);
    }
    return [];
  },

  async updateDoctorLeaveStatus(leaveId: string, status: string): Promise<{ success: boolean; leave?: DoctorLeaveRecord }> {
    const res = await apiFetch(`/admin/doctor-leaves/${encodeURIComponent(leaveId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update doctor leave status' }));
      throw new Error(err.detail || `Failed with status ${res.status}`);
    }
    return await res.json();
  },

  async getNurseRequests(): Promise<NurseRequestRecord[]> {
    try {
      const res = await apiFetch('/admin/nurse-requests', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        return data.requests || [];
      }
    } catch (e) {
      console.warn('Failed to fetch nurse onboarding requests for admin', e);
    }
    return [];
  },

  async updateNurseRequestStatus(
    requestId: string,
    status: 'Approved' | 'Rejected',
    rejectionReason?: string
  ): Promise<{ success: boolean; request?: NurseRequestRecord; nurse?: any }> {
    const res = await apiFetch(`/admin/nurse-requests/${encodeURIComponent(requestId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejectionReason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update nurse request status' }));
      throw new Error(err.detail || `Failed with status ${res.status}`);
    }
    return await res.json();
  },

  async getStaffPasswordResets(status?: string): Promise<{ requests: StaffPasswordReset[]; total: number; pendingCount: number }> {
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const res = await apiFetch(`/admin/staff-password-resets${query}`, { method: 'GET' });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to fetch staff password resets', e);
    }
    return { requests: [], total: 0, pendingCount: 0 };
  },

  async resolveStaffPasswordReset(
    requestId: string,
    temporaryPassword?: string
  ): Promise<{ success: boolean; message: string; temporaryPassword?: string }> {
    const res = await apiFetch(`/admin/staff-password-resets/${encodeURIComponent(requestId)}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temporaryPassword: temporaryPassword || 'CarePulse#2026' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to resolve password reset request' }));
      throw new Error(err.detail || `Failed with status ${res.status}`);
    }
    return await res.json();
  },

  async directResetStaffPassword(
    staffId: string,
    temporaryPassword?: string
  ): Promise<{ success: boolean; message: string; temporaryPassword?: string }> {
    const res = await apiFetch(`/admin/staff/${encodeURIComponent(staffId)}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temporaryPassword: temporaryPassword || 'CarePulse#2026' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to reset staff password' }));
      throw new Error(err.detail || `Failed with status ${res.status}`);
    }
    return await res.json();
  },
};

export interface StaffPasswordReset {
  id: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  staffEmail: string;
  hospitalId?: string;
  status: 'Pending' | 'Resolved' | string;
  temporaryPassword?: string;
  resolvedBy?: string;
  createdAt: string;
  resolvedAt?: string | null;
}

