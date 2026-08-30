import React, { useState } from 'react';
import {
  ShieldCheck,
  Building,
  LogOut,
  Edit3,
  KeyRound,
  Ticket,
  Smartphone,
  UserPlus,
  X,
  Clock,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { useNavigate } from 'react-router-dom';

interface ReceptionistProfileProps {
  onShowToast?: (msg: string) => void;
}

export const ReceptionistProfile: React.FC<ReceptionistProfileProps> = ({ onShowToast }) => {
  const profile = useStaffStore((s) => s.receptionistProfile);
  const updateProfile = useStaffStore((s) => s.updateReceptionistProfile);
  const logoutStaff = useStaffStore((s) => s.logoutStaff);
  const tokens = useStaffStore((s) => s.tokens);
  const navigate = useNavigate();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [shift, setShift] = useState(profile.shift);
  const [clinicName, setClinicName] = useState(profile.clinicName);
  const [department, setDepartment] = useState(profile.department);
  const [isSaving, setIsSaving] = useState(false);

  const handleLogout = () => {
    logoutStaff();
    navigate('/staff/login');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateProfile({
      name,
      email,
      phone,
      shift,
      clinicName,
      department,
    });
    setIsSaving(false);
    setIsEditModalOpen(false);
    onShowToast?.('Receptionist desk profile updated successfully.');
  };

  const onlineCount = tokens.filter((t) => t.type !== 'Walk-In').length;
  const offlineCount = tokens.filter((t) => t.type === 'Walk-In').length;

  return (
    <div className="space-y-6 pb-12 text-left">
      {/* ══════════════════════════════════════════════════════════════════
          1. EXECUTIVE HERO PROFILE CARD
      ══════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0B5A54] via-teal-900 to-[#084540] rounded-3xl p-7 sm:p-9 text-white shadow-xl shadow-teal-950/15 border border-teal-700/50">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left flex-1">
            <div className="relative">
              <img
                src={
                  profile.avatarUrl ||
                  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80'
                }
                alt={profile.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white/20 shadow-xl"
              />
              <span
                className="w-4 h-4 rounded-full bg-emerald-400 border-2 border-teal-900 absolute bottom-1 right-1 shadow"
                title="Active On Duty"
              />
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10.5px] font-black text-teal-200 border border-white/20 flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-300" /> Certified Desk Administrator
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-400/20 text-emerald-300 font-extrabold rounded-full text-[10.5px] border border-emerald-400/30">
                  Active On Duty
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white">
                {profile.name}
              </h1>
              <p className="text-xs sm:text-sm text-teal-100/90 font-medium">
                {profile.clinicName} • {profile.department}
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/20 rounded-xl font-mono text-xs text-teal-200 border border-white/10 font-bold">
                <span>Employee ID: {profile.employeeId}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-5 py-3 bg-white/15 hover:bg-white/25 text-white font-extrabold rounded-2xl text-xs backdrop-blur-md border border-white/20 shadow-xs transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <Edit3 className="w-4 h-4 text-teal-200" />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-5 py-3 bg-rose-500/90 hover:bg-rose-600 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. PRODUCTIVITY & INTAKE STATS SUMMARY
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#0B5A54] flex items-center justify-center">
            <Ticket className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">{tokens.length}</div>
          <div className="text-[11px] font-bold text-slate-400">Total Tokens Logged</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black font-mono text-purple-700">{onlineCount}</div>
          <div className="text-[11px] font-bold text-slate-400">App Appointments</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <UserPlus className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-800">{offlineCount}</div>
          <div className="text-[11px] font-bold text-slate-400">Walk-In Intakes</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700">3.5m</div>
          <div className="text-[11px] font-bold text-slate-400">Avg. Intake Speed</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. DETAILED INFORMATION CARDS GRID
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workstation & Schedule Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Building className="w-5 h-5 text-[#0B5A54]" />
            <h3 className="text-base font-black text-slate-900 font-heading">
              Desk Assignment & Hospital Schedule
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-slate-500 font-bold">Assigned Workstation:</span>
              <span className="font-extrabold text-slate-900">{profile.clinicName}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-slate-500 font-bold">Desk Department:</span>
              <span className="font-extrabold text-[#0B5A54]">{profile.department}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-slate-500 font-bold">Shift Schedule:</span>
              <span className="font-extrabold text-slate-900">{profile.shift}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-slate-500 font-bold">Live Emergency Extension:</span>
              <span className="font-mono font-extrabold text-slate-900">Ext. 4092 (OPD Front)</span>
            </div>
          </div>
        </div>

        {/* Contact & Security Credentials */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <KeyRound className="w-5 h-5 text-[#0B5A54]" />
            <h3 className="text-base font-black text-slate-900 font-heading">
              Contact & Staff Security
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-slate-500 font-bold">Staff Email:</span>
              <span className="font-extrabold text-slate-900 font-mono">{profile.email}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-slate-500 font-bold">Phone Number:</span>
              <span className="font-extrabold text-slate-900 font-mono">{profile.phone}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-slate-500 font-bold">Account Role:</span>
              <span className="font-extrabold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                Front-Desk Receptionist
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-slate-500 font-bold">Two-Factor Authentication:</span>
              <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Enabled (CarePulse Staff SSO)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          4. EDIT PROFILE MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 text-left animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 font-heading">
                Edit Receptionist Profile
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Shift Timings</label>
                <input
                  type="text"
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  placeholder="Morning Shift (08:00 AM - 04:00 PM)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hospital / Clinic</label>
                  <input
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-black rounded-xl text-xs shadow-md"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistProfile;
