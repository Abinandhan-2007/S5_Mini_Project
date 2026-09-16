// frontend/src/portals/superadmin/HospitalManagement.tsx
import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Stethoscope,
  Users,
  X,
  SlidersHorizontal,
  Trash2,
  ShieldCheck,
  Layers,
  PauseCircle,
  PlayCircle,
  Clock,
  Ban,
  FileText,
} from 'lucide-react';
import { superadminService } from '../../services/superadminService';
import type { SuperAdminHospital, SuperAdminHospitalLifecycle } from '../../types/staff';

interface HospitalManagementProps {
  onOpenAddAdminForHospital: (hospitalId: string) => void;
  autoOpenAddModal?: boolean;
  onResetAutoOpen?: () => void;
}

export const HospitalManagement: React.FC<HospitalManagementProps> = ({
  onOpenAddAdminForHospital,
  autoOpenAddModal = false,
  onResetAutoOpen,
}) => {
  const [hospitals, setHospitals] = useState<SuperAdminHospital[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdSuccess, setCreatedSuccess] = useState<string | null>(null);

  // Delete Modal State
  const [hospitalToDelete, setHospitalToDelete] = useState<SuperAdminHospital | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Suspend Modal State
  const [hospitalToSuspend, setHospitalToSuspend] = useState<SuperAdminHospital | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [isSuspending, setIsSuspending] = useState(false);
  const [suspendError, setSuspendError] = useState<string | null>(null);

  // Resume State
  const [isResumingId, setIsResumingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [facilityType, setFacilityType] = useState('General Hospital');
  const [specialtiesInput, setSpecialtiesInput] = useState('Cardiology, General Medicine, Pediatrics, Emergency Care');

  const loadHospitals = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await superadminService.getHospitals();
      setHospitals(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load hospitals.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadHospitals();
  }, []);

  useEffect(() => {
    if (autoOpenAddModal) {
      setIsAddModalOpen(true);
      if (onResetAutoOpen) onResetAutoOpen();
    }
  }, [autoOpenAddModal, onResetAutoOpen]);

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setCreatedSuccess(null);

    try {
      const specs = specialtiesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await superadminService.createHospital({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        facility_type: facilityType,
        specialties: specs.length > 0 ? specs : ['General Medicine'],
      });

      setCreatedSuccess(
        `Hospital "${res.hospital.name}" created successfully with sequenced code ${res.hospital.hospital_code} (State: Draft)!`
      );
      setName('');
      setAddress('');
      setPhone('');
      setEmail('');
      await loadHospitals(true);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setCreatedSuccess(null);
      }, 2000);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create hospital.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHospital = async () => {
    if (!hospitalToDelete) return;
    setIsDeleting(true);
    try {
      await superadminService.deleteHospital(hospitalToDelete.id);
      setHospitalToDelete(null);
      await loadHospitals(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete hospital.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSuspendFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalToSuspend) return;
    if (!suspensionReason.trim()) {
      setSuspendError('A formal justification reason is required for compliance.');
      return;
    }

    setIsSuspending(true);
    setSuspendError(null);
    try {
      await superadminService.updateHospitalLifecycle(hospitalToSuspend.id, 'suspend', suspensionReason.trim());
      setHospitalToSuspend(null);
      setSuspensionReason('');
      await loadHospitals(true);
    } catch (err: any) {
      setSuspendError(err?.message || 'Failed to suspend facility.');
    } finally {
      setIsSuspending(false);
    }
  };

  const handleResumeFacility = async (hosp: SuperAdminHospital) => {
    setIsResumingId(hosp.id);
    try {
      await superadminService.updateHospitalLifecycle(hosp.id, 'reactivate');
      await loadHospitals(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to reactivate facility.');
    } finally {
      setIsResumingId(null);
    }
  };

  const getLifecycleBadge = (lifecycleState?: SuperAdminHospitalLifecycle | string, isSuspended?: boolean) => {
    const state = lifecycleState || (isSuspended ? 'Suspended' : 'Draft');
    switch (state) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'Pending Setup':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 font-sans">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending Setup
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-sans">
            <FileText className="w-3 h-3 text-slate-500" />
            Draft
          </span>
        );
      case 'Suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 font-sans">
            <Ban className="w-3 h-3 text-rose-600" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-sans">
            {state}
          </span>
        );
    }
  };

  const filteredHospitals = hospitals.filter((h) => {
    const matchQuery =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.hospital_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.address.toLowerCase().includes(searchQuery.toLowerCase());

    const lifecycle = h.lifecycle_state || (h.is_suspended ? 'Suspended' : 'Draft');
    const matchType =
      filterType === 'all' ||
      (filterType === 'with_admin' && h.has_active_admin) ||
      (filterType === 'without_admin' && !h.has_active_admin) ||
      (filterType === 'Active' && lifecycle === 'Active') ||
      (filterType === 'Pending Setup' && lifecycle === 'Pending Setup') ||
      (filterType === 'Draft' && lifecycle === 'Draft') ||
      (filterType === 'Suspended' && lifecycle === 'Suspended');

    return matchQuery && matchType;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Card — Crisp Light Theme */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-[#0B5A54] border border-teal-200 mb-2 font-sans">
              <Building2 className="w-3.5 h-3.5" />
              <span>Healthcare Facility Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              Hospital Facilities
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-sans">
              Provision physical hospital nodes, monitor 4-stage lifecycle states (<span className="font-semibold text-slate-700">Draft &rarr; Pending Setup &rarr; Active &rarr; Suspended</span>), and govern facility staffing.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => loadHospitals(true)}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
              title="Refresh Hospital Registry"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0B5A54]' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084843] text-white font-bold text-xs transition-all shadow-sm cursor-pointer font-sans"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Hospital Facility</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-sans">{error}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {error.toLowerCase().includes('token') || error.toLowerCase().includes('authentication') ? (
              <a
                href="/staff/superadmin"
                className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold font-sans text-xs transition-colors shadow-2xs"
              >
                Re-Authenticate &rarr;
              </a>
            ) : (
              <button
                onClick={() => loadHospitals()}
                className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold font-sans text-xs transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by facility name, code (e.g. H007), address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0B5A54] focus:bg-white transition-all font-sans"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">Filter:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] font-sans cursor-pointer"
          >
            <option value="all">All Facilities ({hospitals.length})</option>
            <option value="Active">State: Active</option>
            <option value="Pending Setup">State: Pending Setup</option>
            <option value="Draft">State: Draft</option>
            <option value="Suspended">State: Suspended</option>
            <option value="with_admin">With Active Admin</option>
            <option value="without_admin">Admin Coverage Gaps</option>
          </select>
        </div>
      </div>

      {/* Hospital Facilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading && hospitals.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-[#0B5A54] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-sans text-slate-500 uppercase tracking-widest">
              Loading hospital network directory...
            </p>
          </div>
        ) : filteredHospitals.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs font-sans">
            No hospital facilities match your search criteria.
          </div>
        ) : (
          filteredHospitals.map((hosp) => {
            const isSuspended = hosp.lifecycle_state === 'Suspended' || hosp.is_suspended;

            return (
              <div
                key={hosp.id}
                className={`bg-white rounded-2xl border ${
                  isSuspended ? 'border-rose-300 ring-1 ring-rose-200/60' : 'border-slate-200/90'
                } shadow-2xs hover:border-[#0B5A54] transition-all overflow-hidden flex flex-col justify-between`}
              >
                <div className="p-5">
                  {/* Facility Code & Lifecycle Status Top Bar */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-teal-50 text-[#0B5A54] border border-teal-200 text-xs font-bold font-mono">
                      {hosp.hospital_code}
                    </span>
                    {getLifecycleBadge(hosp.lifecycle_state, hosp.is_suspended)}
                  </div>

                  {/* Facility Name & Classification */}
                  <h3 className="text-lg font-bold text-slate-900 leading-snug font-heading">{hosp.name}</h3>
                  <div className="text-xs text-teal-700 font-medium mt-0.5 font-sans">
                    {hosp.facility_type || 'General Hospital'}
                  </div>

                  <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 font-sans">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                    <span className="line-clamp-2">{hosp.address}</span>
                  </div>

                  {/* Suspension Justification Alert (if suspended) */}
                  {isSuspended && hosp.suspension_reason && (
                    <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-sans">
                      <div className="font-bold flex items-center gap-1 font-sans text-xs text-rose-800 uppercase tracking-wide">
                        <Ban className="w-3.5 h-3.5 text-rose-600" />
                        Suspension Reason:
                      </div>
                      <p className="mt-0.5 text-rose-700 italic">{hosp.suspension_reason}</p>
                    </div>
                  )}

                  {/* Staff Telemetry Counts */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-sans">
                    <div className="flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                      <span>{hosp.doctor_count} Physicians</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{hosp.receptionist_count} Receptionists</span>
                    </div>
                  </div>

                  {/* Administrator Assignment Sub-Panel */}
                  <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 font-sans">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>Assigned Administrator</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    {hosp.admin ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-900 font-heading">
                            {hosp.admin.full_name}
                          </div>
                          <div className="text-xs text-[#0B5A54] font-medium">
                            {hosp.admin.staff_code}
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Active
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-rose-700 font-semibold inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Unassigned (Draft)
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenAddAdminForHospital(hosp.id)}
                          className="px-3 py-1.5 text-xs font-bold bg-[#0B5A54] hover:bg-[#084843] text-white rounded-xl transition-colors cursor-pointer shadow-xs"
                        >
                          + Appoint
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer with Lifecycle & Delete Controls */}
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-sans">
                  <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    {hosp.specialties?.length || 0} Depts
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Lifecycle Toggle */}
                    {isSuspended ? (
                      <button
                        type="button"
                        onClick={() => handleResumeFacility(hosp)}
                        disabled={isResumingId === hosp.id}
                        className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-bold px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                        title="Resume Facility Operations"
                      >
                        <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isResumingId === hosp.id ? 'Resuming...' : 'Resume'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setHospitalToSuspend(hosp);
                          setSuspensionReason('');
                          setSuspendError(null);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-bold px-2.5 py-1 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                        title="Suspend Facility"
                      >
                        <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Suspend</span>
                      </button>
                    )}

                    <span className="text-slate-200">|</span>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => setHospitalToDelete(hosp)}
                      className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-bold px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Cascade Delete Hospital"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Hospital Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0B5A54] border border-teal-100 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">Provision New Hospital</h3>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    Initial state will be <strong className="text-slate-700">Draft</strong> until an administrator is appointed.
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
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-sans">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {createdSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-sans">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{createdSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateHospital} className="space-y-4 font-sans">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-sans">
                  Hospital Facility Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. St. Jude Memorial Hospital"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-sans">
                  Facility Classification
                </label>
                <select
                  value={facilityType}
                  onChange={(e) => setFacilityType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] font-sans cursor-pointer"
                >
                  <option value="General Hospital">General Hospital</option>
                  <option value="Multi-Specialty Research Hospital">Multi-Specialty Research Hospital</option>
                  <option value="Children's Specialty Hospital">Children&apos;s Specialty Hospital</option>
                  <option value="Trauma & Emergency Care Center">Trauma & Emergency Care Center</option>
                  <option value="Outpatient Surgical Center">Outpatient Surgical Center</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-sans">
                  Full Street Address *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. 742 Evergreen Terrace, Medical District"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-sans">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+1-800-555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-sans">
                    Official Email
                  </label>
                  <input
                    type="email"
                    placeholder="desk@hospital.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-sans">
                  Specialties / Clinical Departments (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="Cardiology, Oncology, Pediatrics, Emergency Care"
                  value={specialtiesInput}
                  onChange={(e) => setSpecialtiesInput(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] font-sans"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#0B5A54] hover:bg-[#084843] text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer font-sans"
                >
                  {isSubmitting ? 'Provisioning...' : 'Confirm Provisioning'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend Hospital Modal */}
      {hospitalToSuspend && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200 font-sans">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                <PauseCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Suspend Facility Operations</h3>
                <p className="text-xs text-amber-700 font-medium">{hospitalToSuspend.name} ({hospitalToSuspend.hospital_code})</p>
              </div>
            </div>

            {suspendError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-sans">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{suspendError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-sans">
                  Mandatory Governance Justification *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Temporary suspension for clinical compliance review and department re-accreditation."
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                />
                <p className="text-[11px] text-slate-500 mt-1 font-sans">
                  Reason will be permanently recorded in the immutable platform audit ledger.
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setHospitalToSuspend(null);
                  setSuspensionReason('');
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer font-sans"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSuspendFacility}
                disabled={isSuspending || !suspensionReason.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2 font-sans"
              >
                {isSuspending ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {hospitalToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200 font-sans">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-4">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Deprovision Facility</h3>
                <p className="text-xs text-rose-700 font-medium">{hospitalToDelete.name} ({hospitalToDelete.hospital_code})</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-sans">
              <p>
                Are you sure you want to permanently delete <strong className="text-slate-900">{hospitalToDelete.name}</strong>?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Cascading Deletion Impact:
                </div>
                <p className="text-[11px] text-rose-700">
                  All doctors, receptionists, front-desk queues, and historical appointment records linked to this facility will be permanently removed.
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setHospitalToDelete(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer font-sans"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteHospital}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2 font-sans"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalManagement;
