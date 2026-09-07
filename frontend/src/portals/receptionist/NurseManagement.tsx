// frontend/src/portals/receptionist/NurseManagement.tsx
import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  UserPlus,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  X
} from 'lucide-react';
import { nurseService } from '../../services/nurseService';
import { useStaffStore } from '../../store/staffStore';
import type { NurseRecord } from '../../types/staff';

interface NurseManagementProps {
  onShowToast: (msg: string) => void;
}

export const NurseManagement: React.FC<NurseManagementProps> = ({ onShowToast }) => {
  const currentStaff = useStaffStore((s) => s.currentStaff);
  const [nurses, setNurses] = useState<NurseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Triage & Vitals');
  const [password, setPassword] = useState('Nurse@123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchNurses = async () => {
    setIsLoading(true);
    try {
      const hospId = currentStaff?.hospital_id || currentStaff?.hospitalId || 'hosp-bag';
      const list = await nurseService.getHospitalNurses(hospId);
      setNurses(list);
    } catch (err) {
      console.error('Failed to fetch nurses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNurses();
  }, [currentStaff]);

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

  const handleCreateNurse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const hospId = currentStaff?.hospital_id || currentStaff?.hospitalId || 'hosp-bag';
      const created = await nurseService.createNurse({
        name,
        email,
        phone,
        department,
        password,
        hospital_id: hospId,
      });

      setIsSubmitting(false);
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setPassword('Nurse@123');
      fetchNurses();
      onShowToast(`Nurse account created! Staff Code: ${created.staff_code || created.staffCode || 'N-Code'}`);
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err.message || 'Failed to appoint nurse');
    }
  };

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
      {/* Top Banner & Action */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 font-heading tracking-tight">
              Hospital Nursing &amp; Triage Staff
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-teal-50 text-[#0B5A54] border border-teal-200 text-[10px] font-black uppercase">
              {nurses.length} Appointed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Nurses record patient vitals and lab results prior to doctor consultation.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-[#0B5A54] hover:bg-[#084540] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 text-teal-200" />
          <span>+ Appoint New Nurse</span>
        </button>
      </div>

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
            Click "Appoint New Nurse" above to create nurse credentials for pre-consultation vitals recording.
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
                <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{nurse.department || 'Triage & Vitals'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Appoint Nurse Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#0B5A54] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                  <UserPlus className="w-4 h-4 text-teal-200" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-heading">Appoint New Nurse</h3>
                  <p className="text-[11px] text-teal-200/80">Auto-assigns N-prefixed Staff Code</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNurse} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nurse Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Nurse Maria Rodriguez"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. maria.rodriguez@carepulse.com"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 00000"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nurse@123"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Triage & Patient Vitals"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                />
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? 'Appointing...' : 'Appoint Nurse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
