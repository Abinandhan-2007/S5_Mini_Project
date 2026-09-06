// frontend/src/portals/superadmin/AdminManagement.tsx
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Phone,
  X,
  Info,
} from 'lucide-react';
import { superadminService } from '../../services/superadminService';
import type { SuperAdminAdmin, SuperAdminHospital } from '../../types/staff';

interface AdminManagementProps {
  preselectedHospitalId?: string;
  autoOpenAddModal?: boolean;
  onResetAutoOpen?: () => void;
}

export const AdminManagement: React.FC<AdminManagementProps> = ({
  preselectedHospitalId,
  autoOpenAddModal = false,
  onResetAutoOpen,
}) => {
  const [admins, setAdmins] = useState<SuperAdminAdmin[]>([]);
  const [hospitals, setHospitals] = useState<SuperAdminHospital[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdSuccess, setCreatedSuccess] = useState<string | null>(null);

  // Form State
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Admin@123');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Chief Hospital Administration');

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [adminList, hospList] = await Promise.all([
        superadminService.getAdmins(),
        superadminService.getHospitals(),
      ]);
      setAdmins(adminList);
      setHospitals(hospList);

      if (preselectedHospitalId && hospList.some((h) => h.id === preselectedHospitalId)) {
        setSelectedHospitalId(preselectedHospitalId);
      } else if (hospList.length > 0 && !selectedHospitalId) {
        // Default to first hospital without an active admin if possible
        const unassigned = hospList.find((h) => !h.has_active_admin);
        setSelectedHospitalId(unassigned ? unassigned.id : hospList[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load administrator directory.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (autoOpenAddModal) {
      if (preselectedHospitalId) {
        setSelectedHospitalId(preselectedHospitalId);
      }
      setIsAddModalOpen(true);
      if (onResetAutoOpen) onResetAutoOpen();
    }
  }, [autoOpenAddModal, preselectedHospitalId, onResetAutoOpen]);

  const handleToggleStatus = async (admin: SuperAdminAdmin) => {
    try {
      await superadminService.toggleAdminStatus(admin.id, !admin.is_active);
      await loadData(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to update administrator status.');
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setCreatedSuccess(null);

    try {
      const res = await superadminService.createAdmin({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        hospital_id: selectedHospitalId,
        phone: phone.trim() || undefined,
        department: department.trim(),
      });

      setCreatedSuccess(
        `Administrator "${res.admin.full_name}" appointed successfully with code ${res.admin.staff_code}!`
      );
      setFullName('');
      setEmail('');
      setPhone('');
      await loadData(true);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setCreatedSuccess(null);
      }, 2000);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to appoint administrator.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedHospitalObj = hospitals.find((h) => h.id === selectedHospitalId);
  const selectedHospitalHasAdmin = selectedHospitalObj?.has_active_admin ?? false;

  const filteredAdmins = admins.filter((admin) => {
    const matchQuery =
      admin.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.staff_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (admin.hospital_name && admin.hospital_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (admin.hospital_code && admin.hospital_code.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchHospital =
      hospitalFilter === 'all' || admin.hospital_id === hospitalFilter;

    return matchQuery && matchHospital;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Hospital Administrators Governance
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hospital Administrators</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Appoint hospital administrators (A001101+). Strictly enforces one active administrator per facility.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh Administrators"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0B5A54]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              const unassigned = hospitals.find((h) => !h.has_active_admin);
              if (unassigned) setSelectedHospitalId(unassigned.id);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Appoint Administrator</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => loadData()} className="underline font-semibold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Governance Notice Banner */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
        <Info className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600">
          <span className="font-bold text-slate-900">Hospital Hierarchy Governance Rule: </span>
          Each hospital facility is strictly limited to <span className="font-semibold text-slate-900">one active administrator</span>.
          When an administrator is appointed, they are issued hierarchical staff credentials formatted as{' '}
          <span className="font-mono font-semibold text-teal-700">A&lt;HospitalNumber&gt;101</span> (e.g. A007101 for BAG Hospital, A008101 for Hospital H008).
        </div>
      </div>

      {/* Search & Hospital Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search admins by name, code (e.g. A008101), email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospital:</span>
          <select
            value={hospitalFilter}
            onChange={(e) => setHospitalFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
          >
            <option value="all">All Hospitals</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.hospital_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Admin Display Code</th>
                <th className="px-5 py-3.5">Administrator Name</th>
                <th className="px-5 py-3.5">Contact Details</th>
                <th className="px-5 py-3.5">Assigned Facility</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                    <div className="w-6 h-6 border-2 border-teal-600/20 border-t-teal-600 rounded-full animate-spin mx-auto mb-2" />
                    Loading administrator directory...
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                    No administrators found matching your search.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-teal-800 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200 text-xs">
                        {admin.staff_code}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{admin.full_name}</div>
                      <div className="text-xs text-slate-400">{admin.department}</div>
                    </td>
                    <td className="px-5 py-4 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{admin.email}</span>
                      </div>
                      {admin.phone && (
                        <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{admin.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800 text-xs">
                        {admin.hospital_name || 'Hospital Facility'}
                      </div>
                      <span className="font-mono text-[11px] text-[#0B5A54] font-bold">
                        {admin.hospital_code}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          admin.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {admin.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(admin)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          admin.is_active
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {admin.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appoint Administrator Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Appoint Hospital Administrator</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Code will automatically be sequenced (e.g. A007101, A008101)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            {createdSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{createdSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              {/* Hospital Selection with Collision Warning */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assign Hospital Facility *
                </label>
                <select
                  required
                  value={selectedHospitalId}
                  onChange={(e) => setSelectedHospitalId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                >
                  <option value="" disabled>
                    Select hospital...
                  </option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.hospital_code}) {h.has_active_admin ? '— [Already Assigned Admin]' : '— [Available]'}
                    </option>
                  ))}
                </select>

                {selectedHospitalHasAdmin && (
                  <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      Notice: <span className="font-semibold">{selectedHospitalObj?.name}</span> already has an active
                      administrator ({selectedHospitalObj?.admin?.full_name} - {selectedHospitalObj?.admin?.staff_code}).
                      Submitting will be rejected unless the existing administrator is deactivated first.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Administrator Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Arthur Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Official Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin.hospital@carepulse.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Initial Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Admin@123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+1-800-555-0101"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Department / Position Title
                </label>
                <input
                  type="text"
                  placeholder="Chief Hospital Administration"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedHospitalId}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Appointing...' : 'Appoint Administrator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
