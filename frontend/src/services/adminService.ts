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
};
