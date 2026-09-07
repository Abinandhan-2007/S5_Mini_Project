import React from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  HeartPulse,
  Building2,
  CalendarCheck
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

interface NurseLayoutProps {
  children: ReactNode;
}

export const NurseLayout: React.FC<NurseLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const currentStaff = useStaffStore((s) => s.currentStaff);
  const logoutStaff = useStaffStore((s) => s.logoutStaff);

  const handleLogout = () => {
    logoutStaff();
    navigate('/staff/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-30 bg-[#0B5A54] text-white shadow-md border-b border-teal-800/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Portal Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-inner">
              <HeartPulse className="w-6 h-6 text-teal-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-lg tracking-tight text-white">CarePulse</span>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-teal-400/20 border border-teal-300/30 text-teal-200">
                  Nurse Portal
                </span>
              </div>
              <p className="text-[11px] text-teal-200/70 font-medium">Pre-Consultation Vitals & Diagnostics</p>
            </div>
          </div>

          {/* Center Hospital Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/15 border border-white/10 text-xs font-semibold text-teal-100">
            <Building2 className="w-3.5 h-3.5 text-teal-300" />
            <span>{currentStaff?.hospitalName || currentStaff?.hospital_name || (currentStaff?.hospital_id === 'hosp-bag' ? 'BAG Hospital' : 'Hospital Facility')}</span>
            <span className="text-white/40">•</span>
            <span className="text-[11px] text-teal-300 font-mono font-bold">
              {currentStaff?.staff_code || currentStaff?.staffCode || 'N007101'}
            </span>
          </div>

          {/* Right Staff Profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 pl-3 border-l border-white/15">
              <div className="w-9 h-9 rounded-full bg-emerald-700/80 border-2 border-teal-300/40 flex items-center justify-center font-bold text-xs text-white shadow-sm overflow-hidden">
                {currentStaff?.avatarUrl ? (
                  <img src={currentStaff.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{(currentStaff?.name || 'Nurse').charAt(0)}</span>
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-white leading-tight">{currentStaff?.name || 'Staff Nurse'}</div>
                <div className="text-[10px] text-teal-200/80 font-medium">{currentStaff?.department || 'Triage & Vitals'}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-200 transition-colors border border-white/10 text-white cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── SUB-BAR / CLINICAL BANNER ── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-2.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <CalendarCheck className="w-4 h-4 text-[#0B5A54]" />
            <span>Active Triage Queue &bull; Today's Checked-in Patients</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Pending Vitals</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Normal Recorded</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Abnormal Flagged</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-between items-center gap-2">
          <span>CarePulse Nurse Clinical Station &bull; Empathetic Triage & Diagnostics</span>
          <span className="text-[10px] text-slate-400">
            Reference Ranges: General Adult Thresholds (Physician Confirmation Required)
          </span>
        </div>
      </footer>
    </div>
  );
};
