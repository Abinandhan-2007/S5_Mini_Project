import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Building,
  Clock,
  Mail,
  Phone,
  LogOut,
  Award,
  CheckCircle2,
  Edit3,
  KeyRound,
  Ticket,
  Smartphone,
  UserPlus,
  Save,
  X,
} from 'lucide-react';

import { useStaffStore } from '../../store/staffStore';
import { useNavigate } from 'react-router-dom';

export const ReceptionistProfile: React.FC = () => {
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
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const handleLogout = () => {
    logoutStaff();
    navigate('/receptionist/login');
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
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 4000);
  };

  const onlineCount = tokens.filter(
    (t) => t.type === 'In-Person' || t.type === 'Video Call' || !t.type.includes('Walk-In')
  ).length;
  const offlineCount = tokens.filter((t) => t.type === 'Walk-In').length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-16 text-left px-1 sm:px-2">
      {/* Toast Alert */}
      {showSaveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center justify-between text-xs font-bold shadow-md animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Receptionist Staff Profile updated successfully!</span>
          </div>
          <button onClick={() => setShowSaveSuccess(false)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* EXECUTIVE HERO HEADER CARD */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0B5A54] via-teal-800 to-[#084540] rounded-3xl p-7 sm:p-10 text-white shadow-xl shadow-teal-950/10 border border-teal-700/50">
        {/* Background Blur Shapes */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-48 -bottom-16 w-56 h-56 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left flex-1">
            <div className="relative">
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-white/20 shadow-2xl"
              />
              <span className="w-5 h-5 rounded-full bg-emerald-500 border-3 border-teal-900 absolute bottom-1 right-1 shadow-md" title="Active On Duty" />
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-bold text-teal-100 border border-white/20 flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-300" /> Certified Reception Desk Administrator
                </span>
                <span className="px-3 py-1 bg-emerald-400/20 text-emerald-200 font-extrabold rounded-full text-[11px] border border-emerald-400/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Active On Duty
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black font-heading tracking-tight text-white">{profile.name}</h1>
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

      {/* SHIFT & LIVE METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0B5A54]">
            <Ticket className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">{tokens.length}</div>
          <div className="text-xs font-bold text-slate-500">Total Tokens Logged</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">{onlineCount}</div>
          <div className="text-xs font-bold text-slate-500">Online Patient App Tokens</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
            <UserPlus className="w-5 h-5 text-amber-800" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">{offlineCount}</div>
          <div className="text-xs font-bold text-slate-500">Offline Walk-In Registrations</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">3.8 mins</div>
          <div className="text-xs font-bold text-slate-500">Avg. Token Intake Speed</div>
        </div>
      </div>

      {/* DETAILED INFORMATION CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* WORKSTATION & SCHEDULE CARD */}
        <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0B5A54]">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 font-heading">
                Workstation & Duty Schedule
              </h3>
              <p className="text-xs text-slate-500 font-medium">Assigned hospital branch & active shift parameters</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-4 bg-slate-50/80 rounded-2xl flex items-center justify-between border border-slate-200/70">
              <span className="text-slate-500 font-bold">Assigned Hospital</span>
              <span className="font-extrabold text-slate-900">{profile.clinicName}</span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-2xl flex items-center justify-between border border-slate-200/70">
              <span className="text-slate-500 font-bold">OPD Desk Department</span>
              <span className="font-extrabold text-slate-900">{profile.department}</span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-2xl flex items-center justify-between border border-slate-200/70">
              <span className="text-slate-500 font-bold">Active Shift Schedule</span>
              <span className="font-extrabold text-[#0B5A54] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#0B5A54]" />
                {profile.shift}
              </span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-2xl flex items-center justify-between border border-slate-200/70">
              <span className="text-slate-500 font-bold">OPD Desk Counter</span>
              <span className="font-extrabold text-slate-900">Counter #01 (Main Lobby)</span>
            </div>
          </div>
        </div>

        {/* STAFF CONTACT & SECURITY CARD */}
        <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0B5A54]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 font-heading">
                Contact & Authorization Details
              </h3>
              <p className="text-xs text-slate-500 font-medium">Official staff credentials and encryption token</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-4 bg-slate-50/80 rounded-2xl flex items-center justify-between border border-slate-200/70">
              <span className="text-slate-500 font-bold flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" /> Official Email
              </span>
              <span className="font-extrabold text-slate-900">{profile.email}</span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-2xl flex items-center justify-between border border-slate-200/70">
              <span className="text-slate-500 font-bold flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" /> Phone Contact
              </span>
              <span className="font-extrabold text-slate-900 font-mono">{profile.phone}</span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-2xl flex items-center justify-between border border-slate-200/70">
              <span className="text-slate-500 font-bold flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-400" /> System Access Level
              </span>
              <span className="font-black text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Level 2 OPD Administrator
              </span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-2xl flex items-center justify-between border border-slate-200/70">
              <span className="text-slate-500 font-bold flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-slate-400" /> Security Status
              </span>
              <span className="font-mono text-[11px] font-bold text-slate-700">Encrypted JWT Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto relative animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="bg-gradient-to-r from-[#0B5A54] to-teal-800 text-white p-6 flex items-center justify-between border-b border-teal-700">
              <div>
                <h3 className="text-xl font-black font-heading">Edit Staff Profile</h3>
                <p className="text-xs text-teal-100 font-medium">Update official receptionist staff details</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Official Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Contact</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Shift Schedule</label>
                <input
                  type="text"
                  required
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Hospital Name</label>
                  <input
                    type="text"
                    required
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Department</label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-7 py-3 bg-[#0B5A54] hover:bg-[#084540] text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
