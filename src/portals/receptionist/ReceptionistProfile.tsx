import React from 'react';
import { User, ShieldCheck, Building, Clock, Mail, Phone, LogOut, Award, CheckCircle2 } from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { useNavigate } from 'react-router-dom';

export const ReceptionistProfile: React.FC = () => {
  const profile = useStaffStore((s) => s.receptionistProfile);
  const logoutStaff = useStaffStore((s) => s.logoutStaff);
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutStaff();
    navigate('/receptionist/login');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          <img
            src={profile.avatarUrl}
            alt={profile.name}
            className="w-24 h-24 rounded-3xl object-cover border-4 border-slate-100 shadow-md"
          />

          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-3.5 py-1 bg-teal-50 text-[#0B5A54] font-bold rounded-full text-xs flex items-center gap-1.5 border border-teal-200">
                <ShieldCheck className="w-4 h-4" /> Certified Reception Desk Administrator
              </span>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-xs border border-emerald-200">
                Active On Duty
              </span>
            </div>

            <h1 className="text-3xl font-black text-slate-900 font-heading">{profile.name}</h1>
            <p className="text-xs font-semibold text-slate-500">{profile.clinicName} • {profile.department}</p>
            <p className="text-xs text-slate-400 font-mono font-medium">Employee ID: {profile.employeeId}</p>
          </div>

          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-2xl text-xs transition-all flex items-center gap-2 border border-rose-200"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Duty Shift & Location Card */}
        <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs space-y-5">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-[#0B5A54]" />
            Workstation & Duty Schedule
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
              <span className="text-slate-500 font-medium">Assigned Hospital</span>
              <span className="font-bold text-slate-900">{profile.clinicName}</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
              <span className="text-slate-500 font-medium">Department</span>
              <span className="font-bold text-slate-900">{profile.department}</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
              <span className="text-slate-500 font-medium">Active Shift</span>
              <span className="font-bold text-[#0B5A54] flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {profile.shift}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Info Card */}
        <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs space-y-5">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-[#0B5A54]" />
            Staff Contact Details
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" /> Official Email
              </span>
              <span className="font-bold text-slate-900">{profile.email}</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" /> Phone Contact
              </span>
              <span className="font-bold text-slate-900">{profile.phone}</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-400" /> System Authorization
              </span>
              <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Level 2 OPD Admin
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
