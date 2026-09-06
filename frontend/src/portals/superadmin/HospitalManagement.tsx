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
} from 'lucide-react';
import { superadminService } from '../../services/superadminService';
import type { SuperAdminHospital } from '../../types/staff';

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
        `Hospital "${res.hospital.name}" created successfully with code ${res.hospital.hospital_code}!`
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

  const filteredHospitals = hospitals.filter((h) => {
    const matchQuery =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.hospital_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchType =
      filterType === 'all' ||
      (filterType === 'with_admin' && h.has_active_admin) ||
      (filterType === 'without_admin' && !h.has_active_admin);

    return matchQuery && matchType;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[#0B5A54] text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Healthcare Facility Directory
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hospital Facilities</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Provision new hospitals, auto-sequence codes (H001+), and govern facility operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadHospitals(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh Hospital List"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0B5A54]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084843] text-white text-sm font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Hospital</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => loadHospitals()} className="underline font-semibold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search hospitals by name, code (e.g. H007), address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
          >
            <option value="all">All Hospitals ({hospitals.length})</option>
            <option value="with_admin">With Active Admin</option>
            <option value="without_admin">Without Admin (Gaps)</option>
          </select>
        </div>
      </div>

      {/* Hospitals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading && hospitals.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <div className="w-8 h-8 border-3 border-[#0B5A54]/20 border-t-[#0B5A54] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading hospitals...</p>
          </div>
        ) : filteredHospitals.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200/80 text-center text-slate-400 text-sm">
            No hospital facilities match your criteria.
          </div>
        ) : (
          filteredHospitals.map((hosp) => (
            <div
              key={hosp.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
            >
              <div className="p-5">
                {/* Code & Status Row */}
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 font-mono text-xs font-bold text-[#0B5A54]">
                    {hosp.hospital_code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      hosp.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {hosp.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Facility Name & Type */}
                <h3 className="text-lg font-bold text-slate-900 leading-snug">{hosp.name}</h3>
                <div className="text-xs text-teal-700 font-medium mt-0.5">{hosp.facility_type || 'General Hospital'}</div>

                <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                  <span className="line-clamp-2">{hosp.address}</span>
                </div>

                {/* Staffing Counts */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                    <span>{hosp.doctor_count} Physicians</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{hosp.receptionist_count} Receptionists</span>
                  </div>
                </div>

                {/* Admin Assignment Block */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Assigned Administrator
                  </div>
                  {hosp.admin ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">{hosp.admin.full_name}</div>
                        <div className="text-[11px] font-mono text-emerald-700 font-semibold">
                          {hosp.admin.staff_code}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Active
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-rose-600 font-medium inline-flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        No Admin Appointed
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenAddAdminForHospital(hosp.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-[#0B5A54] hover:bg-[#084843] text-white rounded-lg transition-colors cursor-pointer"
                      >
                        + Appoint
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>{hosp.specialties?.length || 0} Departments</span>
                <button
                  type="button"
                  onClick={() => setHospitalToDelete(hosp)}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete Hospital Facility"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Hospital Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add New Hospital Facility</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Code will automatically be sequenced (e.g. H008, H009)
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
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {createdSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{createdSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateHospital} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Hospital Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. St. Jude Memorial Hospital"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Facility Type
                </label>
                <select
                  value={facilityType}
                  onChange={(e) => setFacilityType(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                >
                  <option value="General Hospital">General Hospital</option>
                  <option value="Multi-Specialty Research Hospital">Multi-Specialty Research Hospital</option>
                  <option value="Children's Specialty Hospital">Children&apos;s Specialty Hospital</option>
                  <option value="Trauma & Emergency Care Center">Trauma & Emergency Care Center</option>
                  <option value="Outpatient Surgical Center">Outpatient Surgical Center</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Street Address *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. 742 Evergreen Terrace, Medical District"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+1-800-555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    placeholder="desk@hospital.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Departments / Specialties (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="Cardiology, Oncology, Pediatrics, Emergency Care"
                  value={specialtiesInput}
                  onChange={(e) => setSpecialtiesInput(e.target.value)}
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
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#0B5A54] hover:bg-[#084843] text-white text-sm font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Creating Facility...' : 'Create Hospital'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default HospitalManagement;
