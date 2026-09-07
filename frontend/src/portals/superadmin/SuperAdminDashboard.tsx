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
  Trash2,
  Activity,
  Layers,
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
      <div className="flex flex-col items-center justify-center min-h-[440px]">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-[#0B5A54] rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
          Aggregating global network telemetry...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Command Banner — Crisp Light Theme */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded font-mono text-[11px] font-bold tracking-wider bg-teal-50 text-[#0B5A54] border border-teal-200 uppercase">
                GLOBAL PLATFORM SCOPE // SA101
              </span>
              <span className="text-slate-400 text-xs font-mono">Infrastructure Command</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              Network Command Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-sans">
              Centralized platform topology, automated hospital sequencing, and administrator governance.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
              title="Sync Global Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0B5A54]' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onOpenAddHospital}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-bold transition-all shadow-2xs cursor-pointer font-mono"
            >
              <Plus className="w-3.5 h-3.5 text-[#0B5A54]" />
              <span>+ NEW HOSPITAL</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenAddAdmin()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084843] text-white font-bold text-xs transition-all shadow-sm cursor-pointer font-mono"
            >
              <ShieldCheck className="w-4 h-4 text-teal-200" />
              <span>APPOINT ADMIN</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
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
                Retry Sync
              </button>
            )}
          </div>
        </div>
      )}

      {/* Governance Alert Banner: Administrative Coverage Gap */}
      {hospitalsWithoutAdmin.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/90 border border-amber-300 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 border border-amber-300">
                  GOVERNANCE COVERAGE GAP
                </span>
                <span className="text-xs font-bold text-amber-900">
                  {hospitalsWithoutAdmin.length} Hospital Facility Without Active Administrator
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-amber-950 mt-1 font-heading">
                Administrative Coverage Gap Detected
              </h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed max-w-3xl">
                The following physical facilities currently lack an appointed administrator:{' '}
                {hospitalsWithoutAdmin.map((h, i) => (
                  <span key={h.id} className="font-bold text-amber-950">
                    {h.name} <code className="font-mono bg-white/80 px-1.5 py-0.5 rounded text-[11px] border border-amber-300 text-amber-900 font-bold">{h.hospital_code}</code>
                    {i < hospitalsWithoutAdmin.length - 1 ? ', ' : ''}
                  </span>
                ))}
                . Per platform hierarchy rules, doctors and receptionists cannot be provisioned until an administrator is assigned.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenAddAdmin(hospitalsWithoutAdmin[0]?.id)}
              className="px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 font-mono whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4 text-amber-200" />
              <span>Assign Admin to {hospitalsWithoutAdmin[0]?.hospital_code}</span>
            </button>
          </div>
        </div>
      )}

      {/* Network Telemetry & Topology Matrix (4 Structured Stat Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Hospitals Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-[#0B5A54] transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Hospital Facilities
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0B5A54] border border-teal-100 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {stats?.total_hospitals || 0}
              </span>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {stats?.lifecycle_breakdown?.active ?? stats?.active_hospitals ?? 0} Active
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
              {stats?.lifecycle_breakdown?.active ?? 0} Active
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 font-bold">
              {stats?.lifecycle_breakdown?.pending_setup ?? 0} Pending
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 font-bold">
              {stats?.lifecycle_breakdown?.draft ?? 0} Draft
            </span>
            {Boolean(stats?.lifecycle_breakdown?.suspended) && (
              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-300 font-bold">
                {stats?.lifecycle_breakdown?.suspended} Suspended
              </span>
            )}
          </div>
        </div>

        {/* Admin Coverage Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-[#0B5A54] transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Admin Coverage
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0B5A54] border border-teal-100 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {coveragePercent}%
              </span>
              <span className="text-xs font-mono text-slate-500">
                ({stats?.hospitals_with_admin || 0}/{stats?.total_hospitals || 0} Nodes)
              </span>
            </div>
          </div>
          {/* Visual Progress Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  coveragePercent === 100 ? 'bg-[#0B5A54]' : 'bg-amber-500'
                }`}
                style={{ width: `${coveragePercent}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-1.5 font-mono">
              Strictly 1 admin per hospital node
            </div>
          </div>
        </div>

        {/* Clinical Staff Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-[#0B5A54] transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Clinical Force
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0B5A54] border border-teal-100 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {(stats?.total_doctors || 0) + (stats?.total_receptionists || 0)}
              </span>
              <span className="text-xs font-medium text-slate-500">Total Staff</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
            <span>{stats?.total_doctors || 0} Doctors</span>
            <span className="text-slate-300">•</span>
            <span>{stats?.total_receptionists || 0} Front Desk</span>
          </div>
        </div>

        {/* Network Patients Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-[#0B5A54] transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Network Patients
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0B5A54] border border-teal-100 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {stats?.total_patients || 0}
              </span>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-mono">
                Global DB
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span className="flex items-center gap-1 text-emerald-700">
              <Activity className="w-3 h-3" />
              Cross-Hospital EMR
            </span>
            <span className="text-slate-400">Synced</span>
          </div>
        </div>
      </div>

      {/* Registered Hospital Facilities Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0B5A54] border border-teal-100 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Registered Hospital Facilities
              </h2>
              <p className="text-xs text-slate-500">
                Physical nodes, active administrator bindings, and lifecycle state
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('hospitals')}
            className="text-xs font-bold text-[#0B5A54] hover:text-[#084843] inline-flex items-center gap-1.5 font-mono cursor-pointer"
          >
            <span>MANAGE ALL FACILITIES</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 font-mono border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Hospital Code</th>
                <th className="px-5 py-3.5">Facility Name & Address</th>
                <th className="px-5 py-3.5">Assigned Administrator</th>
                <th className="px-5 py-3.5 text-center">Physicians</th>
                <th className="px-5 py-3.5 text-center">Reception</th>
                <th className="px-5 py-3.5 text-center">Lifecycle Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hospitals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs font-mono">
                    No hospital facilities initialized yet. Click &quot;Add Hospital&quot; above.
                  </td>
                </tr>
              ) : (
                hospitals.map((hosp) => {
                  const lifecycle = hosp.lifecycle_state || (hosp.is_suspended ? 'Suspended' : hosp.is_active ? 'Active' : 'Draft');
                  return (
                    <tr key={hosp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Monospace Hospital Code Chip */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-teal-50 text-[#0B5A54] border border-teal-200">
                          {hosp.hospital_code || 'H---'}
                        </span>
                      </td>

                      {/* Facility Name & Address */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-sm font-heading">{hosp.name}</div>
                        <div className="text-xs text-slate-500 truncate max-w-xs">{hosp.address}</div>
                      </td>

                      {/* Assigned Administrator Badge */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {hosp.admin ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-teal-100 text-[#0B5A54] font-bold text-xs flex items-center justify-center font-mono">
                              {hosp.admin.full_name?.charAt(0) || 'A'}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 text-xs">
                                {hosp.admin.full_name}
                              </div>
                              <div className="font-mono text-[10px] text-[#0B5A54] font-bold">
                                {hosp.admin.staff_code}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold font-mono bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            NO ADMIN ASSIGNED
                          </span>
                        )}
                      </td>

                      {/* Doctors Count */}
                      <td className="px-5 py-4 text-center font-mono font-bold text-slate-700">
                        {hosp.doctor_count}
                      </td>

                      {/* Receptionist Count */}
                      <td className="px-5 py-4 text-center font-mono font-bold text-slate-700">
                        {hosp.receptionist_count}
                      </td>

                      {/* Lifecycle Status Pill */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        {lifecycle === 'Active' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            ACTIVE
                          </span>
                        )}
                        {lifecycle === 'Pending Setup' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-amber-50 text-amber-800 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            PENDING SETUP
                          </span>
                        )}
                        {lifecycle === 'Draft' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            DRAFT
                          </span>
                        )}
                        {lifecycle === 'Suspended' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-rose-50 text-rose-800 border border-rose-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            SUSPENDED
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {!hosp.admin ? (
                            <button
                              type="button"
                              onClick={() => onOpenAddAdmin(hosp.id)}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#0B5A54] hover:bg-[#084843] text-white font-mono transition-colors cursor-pointer shadow-2xs"
                            >
                              + Appoint Admin
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onNavigateTab('admins')}
                              className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer font-mono"
                            >
                              View Admin
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setHospitalToDelete(hosp)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Cascade Delete Hospital"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hospital Administrators Directory Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0B5A54] border border-teal-100 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Hospital Administrators Directory
              </h2>
              <p className="text-xs text-slate-500">
                Top tier appointed administrators across hospital network
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('admins')}
            className="text-xs font-bold text-[#0B5A54] hover:text-[#084843] inline-flex items-center gap-1.5 font-mono cursor-pointer"
          >
            <span>ALL ADMINISTRATORS ({admins.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 font-mono border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Admin Code</th>
                <th className="px-5 py-3.5">Administrator Name</th>
                <th className="px-5 py-3.5">Contact Details</th>
                <th className="px-5 py-3.5">Assigned Facility</th>
                <th className="px-5 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 text-xs font-mono">
                    No administrators appointed yet.
                  </td>
                </tr>
              ) : (
                admins.slice(0, 5).map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded bg-teal-50 text-[#0B5A54] border border-teal-200 text-xs">
                        {admin.staff_code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 text-xs font-heading">{admin.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{admin.department}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono">
                      <div className="text-slate-700">{admin.email}</div>
                      <div className="text-slate-400 text-[11px]">{admin.phone || 'No phone'}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800 text-xs">{admin.hospital_name}</div>
                      <span className="font-mono text-[11px] text-[#0B5A54] font-bold">{admin.hospital_code}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                          admin.is_active
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {admin.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permanent Cascade Delete Modal */}
      {hospitalToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 font-heading">
                  Permanent Facility Deletion
                </h3>
                <p className="text-xs text-rose-700 font-mono font-bold">{hospitalToDelete.hospital_code}</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 mb-4 leading-relaxed">
              Are you sure you want to permanently delete facility{' '}
              <strong className="text-slate-900 font-bold">{hospitalToDelete.name}</strong>?
            </p>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 mb-6 space-y-1 font-sans">
              <div className="font-bold flex items-center gap-1.5 text-rose-900">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Cascade Deletion Consequence:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-rose-800 pl-1">
                <li>Associated administrator credentials (<code className="font-mono">{hospitalToDelete.admin?.staff_code || 'A---'}</code>) will be permanently purged</li>
                <li>All doctor and receptionist staff bindings will be deleted</li>
                <li>All facility appointment records will be unlinked</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setHospitalToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer font-mono"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteHospital}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2 font-mono"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Purging Facility...</span>
                  </>
                ) : (
                  <span>CONFIRM CASCADE PURGE</span>
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
