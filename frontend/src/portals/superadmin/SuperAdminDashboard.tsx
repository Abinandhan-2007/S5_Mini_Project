// frontend/src/portals/superadmin/SuperAdminDashboard.tsx
import React, { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  ShieldCheck,
  Stethoscope,
  Plus,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import { superadminService } from '../../services/superadminService';
import type { SuperAdminHospital, SuperAdminAdmin, SuperAdminStats } from '../../types/staff';

interface SuperAdminDashboardProps {
  onNavigateTab: (tab: 'hospitals' | 'admins') => void;
  onOpenAddHospital: () => void;
  onOpenAddAdmin: (preselectedHospitalId?: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  onNavigateTab,
  onOpenAddHospital,
  onOpenAddAdmin,
}) => {
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [hospitals, setHospitals] = useState<SuperAdminHospital[]>([]);
  const [admins, setAdmins] = useState<SuperAdminAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hospitalToDelete, setHospitalToDelete] = useState<SuperAdminHospital | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [statsData, hospData, adminData] = await Promise.all([
        superadminService.getStats(),
        superadminService.getHospitals(),
        superadminService.getAdmins(),
      ]);
      setStats(statsData);
      setHospitals(hospData);
      setAdmins(adminData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load network intelligence.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleDeleteHospital = async () => {
    if (!hospitalToDelete) return;
    setIsDeleting(true);
    try {
      await superadminService.deleteHospital(hospitalToDelete.id);
      setHospitalToDelete(null);
      await loadData(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete hospital.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const hospitalsWithoutAdmin = hospitals.filter((h) => !h.has_active_admin);
  const coveragePercent =
    stats && stats.total_hospitals > 0
      ? Math.round((stats.hospitals_with_admin / stats.total_hospitals) * 100)
      : 100;

  if (isLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-3 border-[#0B5A54]/20 border-t-[#0B5A54] rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Aggregating global network telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Headline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Global Platform Scope (SA101)
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Network Command Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time topology, administrative governance, and hospital provisioning.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh Network Stats"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0B5A54]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onOpenAddHospital}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084843] text-white text-sm font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Hospital</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenAddAdmin()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Appoint Admin</span>
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

      {/* Administrative Coverage Alert if any hospital lacks an admin */}
      {hospitalsWithoutAdmin.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Administrative Coverage Gap: {hospitalsWithoutAdmin.length} Hospital(s) Without Active Admin
              </h3>
              <p className="text-xs text-amber-700 mt-0.5 max-w-2xl">
                The following facilities currently lack an appointed administrator:{' '}
                <span className="font-semibold">
                  {hospitalsWithoutAdmin.map((h) => `${h.name} (${h.hospital_code})`).join(', ')}
                </span>
                . Per system governance, doctors and receptionists cannot be onboarded without an active hospital administrator.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenAddAdmin(hospitalsWithoutAdmin[0]?.id)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 cursor-pointer"
          >
            Assign Admin to {hospitalsWithoutAdmin[0]?.hospital_code}
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Hospitals */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hospitals</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0B5A54] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900">{stats?.total_hospitals || 0}</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <span className="font-semibold text-emerald-600">{stats?.active_hospitals || 0} Active</span>
              <span>•</span>
              <span>All Sequenced (H001+)</span>
            </div>
          </div>
        </div>

        {/* Admin Coverage */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admin Coverage</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{coveragePercent}%</span>
              <span className="text-xs font-semibold text-slate-500">
                ({stats?.hospitals_with_admin || 0}/{stats?.total_hospitals || 0})
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Strictly 1 active admin per facility
            </div>
          </div>
        </div>

        {/* Clinical Staff */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical Staff</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900">
              {(stats?.total_doctors || 0) + (stats?.total_receptionists || 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              <span className="font-semibold text-slate-700">{stats?.total_doctors || 0}</span> Doctors,{' '}
              <span className="font-semibold text-slate-700">{stats?.total_receptionists || 0}</span> Front Desk
            </div>
          </div>
        </div>

        {/* Registered Patients */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Network Patients</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900">{stats?.total_patients || 0}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cross-facility patient database</span>
            </div>
          </div>
        </div>
      </div>

      {/* Network Facilities Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Registered Hospital Facilities</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live status and active administrator mapping per hospital
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('hospitals')}
            className="text-xs font-semibold text-[#0B5A54] hover:text-[#084843] inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Manage All Hospitals</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Hospital Code</th>
                <th className="px-5 py-3.5">Facility Name & Address</th>
                <th className="px-5 py-3.5">Assigned Administrator</th>
                <th className="px-5 py-3.5 text-center">Doctors</th>
                <th className="px-5 py-3.5 text-center">Reception</th>
                <th className="px-5 py-3.5 text-center">Facility Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hospitals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    No hospitals registered yet. Click &quot;Add Hospital&quot; above to initialize the network.
                  </td>
                </tr>
              ) : (
                hospitals.map((hosp) => (
                  <tr key={hosp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-[#0B5A54] whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200">
                        {hosp.hospital_code || 'H---'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{hosp.name}</div>
                      <div className="text-xs text-slate-400 truncate max-w-xs">{hosp.address}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {hosp.admin ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                            {hosp.admin.full_name?.charAt(0) || 'A'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 text-xs">
                              {hosp.admin.full_name}
                            </div>
                            <div className="font-mono text-[10px] text-emerald-700 font-bold">
                              {hosp.admin.staff_code}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center font-semibold text-slate-700">
                      {hosp.doctor_count}
                    </td>
                    <td className="px-5 py-4 text-center font-semibold text-slate-700">
                      {hosp.receptionist_count}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          hosp.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {hosp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {!hosp.admin ? (
                          <button
                            type="button"
                            onClick={() => onOpenAddAdmin(hosp.id)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#0B5A54] hover:bg-[#084843] text-white transition-colors cursor-pointer"
                          >
                            Appoint Admin
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNavigateTab('admins')}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            View Admin
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setHospitalToDelete(hosp)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Hospital"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Administrators Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Hospital Administrators Directory</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Governing hospital administrators across all facilities
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('admins')}
            className="text-xs font-semibold text-[#0B5A54] hover:text-[#084843] inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View All Administrators</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Admin Code</th>
                <th className="px-5 py-3.5">Administrator Name</th>
                <th className="px-5 py-3.5">Email & Phone</th>
                <th className="px-5 py-3.5">Assigned Hospital</th>
                <th className="px-5 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                    No administrators appointed yet.
                  </td>
                </tr>
              ) : (
                admins.slice(0, 5).map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-teal-800 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200">
                        {admin.staff_code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {admin.full_name}
                      <div className="text-[11px] text-slate-400">{admin.department}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div>{admin.email}</div>
                      <div className="text-slate-400">{admin.phone || 'No direct phone'}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{admin.hospital_name}</div>
                      <span className="font-mono text-xs text-[#0B5A54]">{admin.hospital_code}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          admin.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {admin.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {hospitalToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Hospital Facility</h3>
                <p className="text-xs text-slate-500 font-mono">{hospitalToDelete.hospital_code}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-900 font-semibold">{hospitalToDelete.name}</strong>?
            </p>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 mb-6 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-900">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Permanent Cascade Deletion Warning:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-rose-700 pl-1">
                <li>Associated hospital administrator account will be deleted</li>
                <li>All assigned doctors &amp; receptionists will be removed</li>
                <li>All pending appointments for this facility will be removed</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setHospitalToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteHospital}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Facility</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
