// frontend/src/portals/receptionist/NurseManagement.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  HeartPulse,
  UserPlus,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { nurseService } from '../../services/nurseService';
import { receptionistService } from '../../services/receptionistService';
import { useStaffStore } from '../../store/staffStore';
import type { NurseRecord } from '../../types/staff';

interface NurseManagementProps {
  onShowToast: (msg: string) => void;
}

const DEPARTMENTS = [
  'Triage & Vitals',
  'OPD Pre-Check',
  'Emergency & ICU',
  'General Inpatient Ward',
  'Pediatrics Care',
  'Day Surgery Pre-Op',
];

const SHIFTS = [
  'Morning (07:00 AM - 03:30 PM)',
  'Evening (03:00 PM - 11:30 PM)',
  'Night (11:00 PM - 07:30 AM)',
  'Rotational (12-hr Duty)',
];

export const NurseManagement: React.FC<NurseManagementProps> = ({ onShowToast }) => {
  const currentStaff = useStaffStore((s) => s.currentStaff);
  const [activeTab, setActiveTab] = useState<'directory' | 'requests'>('directory');
  const [nurses, setNurses] = useState<NurseRecord[]>([]);
  const [nurseRequests, setNurseRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Requisition Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Triage & Vitals');
  const [shift, setShift] = useState('Morning (07:00 AM - 03:30 PM)');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchNurses = useCallback(async () => {
    setIsLoading(true);
    try {
      const hospId = currentStaff?.hospital_id || currentStaff?.hospitalId || undefined;
      const list = await nurseService.getHospitalNurses(hospId);
      setNurses(list);
    } catch (err) {
      console.error('Failed to fetch nurses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentStaff]);

  const fetchNurseRequests = useCallback(async () => {
    try {
      const list = await receptionistService.getNurseRequests();
      setNurseRequests(list || []);
    } catch (err) {
      console.error('Failed to fetch nurse requests:', err);
    }
  }, []);

  useEffect(() => {
    fetchNurses();
    fetchNurseRequests();
  }, [fetchNurses, fetchNurseRequests]);

  // Auto-fill suggested email when name changes
  const handleNameChange = (val: string) => {
    setName(val);
    if (!email || email.includes('@carepulse.com')) {
      const clean = val.toLowerCase().replace(/nurse/g, '').trim().replace(/\s+/g, '.');
      if (clean) {
        setEmail(`${clean}@carepulse.com`);
      }
    }
  };

  const handleRequestNurse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      await receptionistService.createNurseRequest({
        fullName: name,
        email,
        phone,
        department,
        shift,
        notes,
      });

      setIsSubmitting(false);
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setNotes('');
      await fetchNurseRequests();
      setActiveTab('requests');
      onShowToast(`Nurse addition request for '${name}' submitted to Hospital Administration for approval.`);
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err.message || 'Failed to submit nurse requisition');
    }
  };

  const pendingRequestsCount = nurseRequests.filter((r) => r.status === 'Pending').length;

  const filteredNurses = nurses.filter((n) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      n.name.toLowerCase().includes(q) ||
      (n.email && n.email.toLowerCase().includes(q)) ||
      (n.staff_code && n.staff_code.toLowerCase().includes(q)) ||
      (n.staffCode && n.staffCode.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* ── TOP BANNER & TAB SWITCHER ── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 font-heading tracking-tight">
              Hospital Nursing &amp; Triage Staff
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-teal-50 text-[#0B5A54] border border-teal-200 text-[10px] font-black uppercase">
              {nurses.length} On Duty
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Receptionists submit nurse requisition requests for Hospital Admin review and approval.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-[#0B5A54] hover:bg-[#084540] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto active:scale-95"
        >
          <UserPlus className="w-4 h-4 text-teal-200" />
          <span>+ Request Nurse Addition</span>
        </button>
      </div>

      {/* ── TOP NAVIGATION TABS ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('directory')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'directory'
              ? 'bg-[#0B5A54] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          <span>Active Nursing Staff</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'directory' ? 'bg-teal-900 text-teal-200' : 'bg-slate-100 text-slate-600'
          }`}>
            {nurses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-[#0B5A54] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Nurse Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
              {pendingRequestsCount} Pending
            </span>
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1: ACTIVE NURSING STAFF DIRECTORY
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nurse by name, staff code (e.g. N007101), or email..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 shadow-xs"
              />
            </div>
            <button
              onClick={fetchNurses}
              disabled={isLoading}
              className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
              title="Refresh List"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#0B5A54]' : ''}`} />
            </button>
          </div>

          {/* Nurses Grid */}
          {filteredNurses.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0B5A54] mx-auto flex items-center justify-center">
                <HeartPulse className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-800">No Nurses Registered</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click "+ Request Nurse Addition" above to submit a new nurse onboarding requisition for Admin approval.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNurses.map((nurse) => (
                <div
                  key={nurse.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center font-black text-[#0B5A54] text-sm">
                        {nurse.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 font-heading">{nurse.name}</h3>
                        <span className="inline-block px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200 text-[#0B5A54] font-mono text-[10px] font-bold">
                          {nurse.staff_code || nurse.staffCode || 'N-Code'}
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      Active
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{nurse.email}</span>
                    </div>
                    {nurse.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{nurse.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{nurse.department || 'Triage & Vitals'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2: MY NURSE ADDITION REQUESTS
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-teal-50/50 p-4 rounded-2xl border border-teal-100">
            <div className="flex items-center gap-2 text-xs text-teal-900 font-medium">
              <ShieldCheck className="w-4 h-4 text-[#0B5A54] shrink-0" />
              <span>
                All nurse addition requests are routed to Hospital Administration. Once approved, nurse credentials and staff codes are auto-provisioned.
              </span>
            </div>
            <button
              onClick={fetchNurseRequests}
              className="p-2 rounded-xl bg-white border border-teal-200 text-teal-700 hover:bg-teal-50 transition cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {nurseRequests.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No Nurse Requests Submitted Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click "+ Request Nurse Addition" above to submit a requisition for your front-desk or clinical ward.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nurseRequests.map((req) => {
                const isPending = req.status === 'Pending';
                const isApproved = req.status === 'Approved';
                const isRejected = req.status === 'Rejected';

                return (
                  <div
                    key={req.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{req.fullName}</h4>
                        <p className="text-xs text-slate-500">{req.email}</p>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isApproved
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isPending
                            ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {isPending ? 'Pending Admin Approval' : isApproved ? 'Approved & Added' : 'Rejected'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-700 font-medium">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Department:</span>
                        <span className="font-bold text-slate-900">{req.department}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Shift:</span>
                        <span className="font-bold text-slate-900">{req.shift}</span>
                      </div>
                      {req.phone && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Phone:</span>
                          <span className="font-bold text-slate-900">{req.phone}</span>
                        </div>
                      )}
                      {req.notes && (
                        <div className="pt-1 border-t border-slate-200/60 text-slate-600">
                          <strong>Notes:</strong> {req.notes}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Requested: {new Date(req.createdAt).toLocaleDateString()}
                      </span>

                      {isApproved && (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Approved by {req.approvedBy || 'Admin'}
                        </span>
                      )}

                      {isRejected && (
                        <span className="text-rose-700 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          Rejected
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── REQUISITION MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0B5A54]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 font-heading">
                    Request Nurse Addition
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Submit requisition for Hospital Administrator approval
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleRequestNurse} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block mb-1 text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Nurse Clara Barton"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                />
              </div>

              <div>
                <label className="block mb-1 text-slate-700">Hospital Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="clara.barton@carepulse.com"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-700">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-slate-700">Shift</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  >
                    {SHIFTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-slate-700">Contact Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                />
              </div>

              <div>
                <label className="block mb-1 text-slate-700">Requisition Reason / Clinical Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Additional triage nurse needed for morning OPD rush..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4 text-teal-200" />
                  )}
                  <span>Submit for Approval</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
