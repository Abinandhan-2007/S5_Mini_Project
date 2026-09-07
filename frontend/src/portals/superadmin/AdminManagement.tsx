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
  KeyRound,
  SlidersHorizontal,
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
    <div className="space-y-6 pb-16">
      {/* Top Header Card — Crisp Light Theme */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded font-mono text-[11px] font-bold bg-teal-50 text-[#0B5A54] border border-teal-200 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>HOSPITAL ADMINISTRATORS GOVERNANCE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              Hospital Administrators
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-sans">
              Appoint hospital administrators (<code className="font-mono text-[#0B5A54] font-bold">A001101+</code>). Strictly enforces 1 active administrator per hospital facility.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084843] text-white font-bold text-xs transition-all shadow-sm cursor-pointer font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>+ APPOINT ADMINISTRATOR</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-mono">{error}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {error.toLowerCase().includes('token') || error.toLowerCase().includes('authentication') ? (
              <a
                href="/staff/superadmin"
                className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold font-mono text-[11px] transition-colors shadow-2xs"
              >
                Re-Authenticate &rarr;
              </a>
            ) : (
              <button
                onClick={() => loadData()}
                className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold font-mono text-[11px] transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Governance Hierarchy Rule Callout Banner — Crisp Light Theme */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 text-slate-800 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0B5A54] border border-teal-200 flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded bg-teal-50 text-[#0B5A54] border border-teal-200">
                GOVERNANCE CONVENTION
              </span>
              <span className="text-xs font-bold text-slate-900 font-heading">
                One-Admin-Per-Hospital Policy &amp; Credential Numbering System
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Each registered hospital facility is strictly limited to <strong className="text-slate-900 font-bold">1 active administrator</strong>. 
              When appointed, administrators receive hierarchical staff credentials formatted as{' '}
              <code className="font-mono font-bold text-[#0B5A54] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                A&lt;HospitalNumber&gt;101
              </code>{' '}
              (e.g., <code className="font-mono text-[#0B5A54] font-bold">A007101</code> for BAG Hospital <code className="font-mono text-slate-600">H007</code>, or <code className="font-mono text-[#0B5A54] font-bold">A008101</code> for <code className="font-mono text-slate-600">H008</code>).
            </p>
          </div>
        </div>
      </div>

      {/* Search & Hospital Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by admin name, code (e.g. A007101), email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0B5A54] focus:bg-white transition-all font-sans"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Hospital:</span>
          <select
            value={hospitalFilter}
            onChange={(e) => setHospitalFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] font-mono"
          >
            <option value="all">ALL HOSPITALS</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.hospital_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Administrator Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 font-mono border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Admin Display Code</th>
                <th className="px-5 py-3.5">Administrator Name</th>
                <th className="px-5 py-3.5">Contact Details</th>
                <th className="px-5 py-3.5">Assigned Hospital Facility</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Governance Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400 text-xs font-mono">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-[#0B5A54] rounded-full animate-spin mx-auto mb-2" />
                    Loading administrator credentials...
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-xs font-mono">
                    No administrators found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Monospace Code Badge */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md bg-teal-50 text-[#0B5A54] border border-teal-200 font-mono text-xs font-bold">
                        {admin.staff_code}
                      </span>
                    </td>

                    {/* Administrator Name & Title */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 text-sm font-heading">{admin.full_name}</div>
                      <div className="text-xs text-slate-400 font-mono">{admin.department}</div>
                    </td>

                    {/* Contact Details */}
                    <td className="px-5 py-4 text-xs font-mono whitespace-nowrap">
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

                    {/* Assigned Facility */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800 text-xs font-heading">
                        {admin.hospital_name || 'Hospital Facility'}
                      </div>
                      <span className="font-mono text-[11px] text-[#0B5A54] font-bold">
                        {admin.hospital_code}
                      </span>
                    </td>

                    {/* Status Pill */}
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                          admin.is_active
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${admin.is_active ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                        {admin.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>

                    {/* Governance Toggle Action */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(admin)}
                        className={`px-3 py-1 text-xs font-bold font-mono rounded-lg transition-colors cursor-pointer ${
                          admin.is_active
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {admin.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
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
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0B5A54] border border-teal-100 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">Appoint Hospital Administrator</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Code will automatically sequence (e.g. A007101, A008101)
                  </p>
                </div>
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
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            {createdSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-mono">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{createdSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              {/* Hospital Selection with Collision Warning */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                  Assign Hospital Facility *
                </label>
                <select
                  required
                  value={selectedHospitalId}
                  onChange={(e) => setSelectedHospitalId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] font-mono"
                >
                  <option value="" disabled>
                    Select hospital...
                  </option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.hospital_code}) {h.has_active_admin ? '— [ALREADY OCCUPIED]' : '— [AVAILABLE]'}
                    </option>
                  ))}
                </select>

                {selectedHospitalHasAdmin && (
                  <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      Governance Conflict: <strong className="font-bold">{selectedHospitalObj?.name}</strong> already has an active administrator ({selectedHospitalObj?.admin?.full_name} - <code className="font-mono font-bold">{selectedHospitalObj?.admin?.staff_code}</code>). Appointing another will be rejected by policy unless the current administrator is deactivated.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                  Administrator Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Arthur Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                  Official Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin.hospital@carepulse.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                    Initial Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Admin@123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+1-800-555-0101"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                  Department / Executive Title
                </label>
                <input
                  type="text"
                  placeholder="Chief Hospital Administration"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] font-sans"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedHospitalId}
                  className="px-5 py-2.5 bg-[#0B5A54] hover:bg-[#084843] text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer font-mono"
                >
                  {isSubmitting ? 'Appointing...' : 'CONFIRM APPOINTMENT'}
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
