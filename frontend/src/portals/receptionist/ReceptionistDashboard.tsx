import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Stethoscope,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Volume2,
  Sparkles,
  Smartphone,
  UserPlus,
  ArrowRight,
  Printer,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { DoctorRecord } from '../../types/receptionist';

interface ReceptionistDashboardProps {
  onNavigateTab?: (tab: string) => void;
  onShowToast?: (msg: string) => void;
  onOpenNewAppointment?: () => void;
}

export const ReceptionistDashboard: React.FC<ReceptionistDashboardProps> = ({
  onNavigateTab,
  onShowToast,
  onOpenNewAppointment,
}) => {
  const doctors = useStaffStore((s) => s.doctors);
  const tokens = useStaffStore((s) => s.tokens);
  const toggleDoctorAvailability = useStaffStore((s) => s.toggleDoctorAvailability);
  const callNextToken = useStaffStore((s) => s.callNextToken);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);
  const receptionistProfile = useStaffStore((s) => s.receptionistProfile);

  const [doctorToToggle, setDoctorToToggle] = useState<DoctorRecord | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Live real-time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeDoctors = doctors.filter((d) => d.isAvailable);
  const waitingTokens = tokens.filter((t) => t.status === 'Waiting');
  const inConsultationTokens = tokens.filter((t) => t.status === 'In Consultation');
  const completedTokens = tokens.filter((t) => t.status === 'Completed');
  const onlineTokens = tokens.filter((t) => t.type !== 'Walk-In');
  const walkInTokens = tokens.filter((t) => t.type === 'Walk-In');

  const handleConfirmToggleAvailability = async () => {
    if (doctorToToggle) {
      await toggleDoctorAvailability(doctorToToggle.id);
      const newState = !doctorToToggle.isAvailable ? 'Available' : 'Unavailable';
      onShowToast?.(`Dr. ${doctorToToggle.name} marked as ${newState}.`);
      setDoctorToToggle(null);
    }
  };

  const handleCallNext = async (doctorId?: string) => {
    const targetToken = doctorId
      ? waitingTokens.find((t) => t.doctorId === doctorId)
      : waitingTokens[0];

    if (!targetToken) {
      onShowToast?.('No waiting patients found for this cabin.');
      return;
    }

    await callNextToken(doctorId);
    onShowToast?.(`Now Calling: ${targetToken.tokenNumber} - ${targetToken.patientName}`);
  };

  const handlePrintRoster = () => {
    window.print();
    onShowToast?.('Opening print dialog for today’s OPD roster...');
  };

  return (
    <div className="space-y-6 pb-12 text-left">
      {/* ══════════════════════════════════════════════════════════════════
          1. EXECUTIVE HERO BANNER & LIVE COMMAND CONTROLS
      ══════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0B5A54] via-teal-900 to-[#06332F] rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white shadow-xl shadow-teal-950/15 border border-teal-700/50">
        {/* Ambient Glows */}
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-teal-400/15 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-60 h-60 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2 sm:space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-teal-200">
                <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                Live OPD Command Center
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] sm:text-[10.5px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Desk Active
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black font-heading tracking-tight text-white leading-tight">
              Welcome back, {receptionistProfile.name || 'Front Desk'}
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 font-medium leading-relaxed">
              Monitoring active consultation rooms, patient intake flow, token queue broadcasts, and doctor availability in real time.
            </p>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 text-xs text-teal-200 font-semibold font-mono">
              <span className="flex items-center gap-1.5 bg-black/20 px-2.5 sm:px-3 py-1 rounded-xl border border-white/10 text-[11px] sm:text-xs">
                <Clock className="w-3.5 h-3.5 text-teal-300" />
                {currentTime || '08:00 AM'}
              </span>
              <span className="flex items-center gap-1.5 bg-black/20 px-2.5 sm:px-3 py-1 rounded-xl border border-white/10 text-[11px] sm:text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
                {receptionistProfile.department || 'Main OPD Reception'}
              </span>
            </div>
          </div>

          {/* Quick Action Triggers */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              onClick={() => handleCallNext()}
              disabled={waitingTokens.length === 0}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-3 sm:py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Volume2 className="w-4 h-4 text-slate-900 stroke-[2.5]" />
              <span>Call Next</span>
            </button>

            <button
              onClick={onOpenNewAppointment}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-3 sm:py-3.5 bg-white hover:bg-teal-50 text-[#0B5A54] font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-4 h-4 text-[#0B5A54] stroke-[3]" />
              <span>+ Walk-In</span>
            </button>

            <button
              onClick={handlePrintRoster}
              className="p-3 sm:p-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/20 transition-all cursor-pointer"
              title="Print Today's OPD Roster"
            >
              <Printer className="w-4 h-4 text-teal-200" />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. EXECUTIVE 6-CARD KPI METRICS MATRIX
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4 w-full">
        {/* Waiting in Queue */}
        <div
          onClick={() => onNavigateTab?.('queue')}
          className="min-w-0 overflow-hidden bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all cursor-pointer space-y-1.5 sm:space-y-2 group"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9.5px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
              Waiting Queue
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 font-mono truncate">
            {waitingTokens.length}
          </div>
          <p className="text-[10px] sm:text-[10.5px] text-amber-700 font-bold flex items-center gap-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span className="truncate">In Waiting Hall</span>
          </p>
        </div>

        {/* In Consultation */}
        <div
          onClick={() => onNavigateTab?.('queue')}
          className="min-w-0 overflow-hidden bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all cursor-pointer space-y-1.5 sm:space-y-2 group"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9.5px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
              In Consultation
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-teal-50 text-[#0B5A54] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#0B5A54] font-mono truncate">
            {inConsultationTokens.length}
          </div>
          <p className="text-[10px] sm:text-[10.5px] text-teal-700 font-bold flex items-center gap-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse shrink-0" />
            <span className="truncate">Active In Cabins</span>
          </p>
        </div>

        {/* On-Duty Doctors */}
        <div
          onClick={() => onNavigateTab?.('doctors')}
          className="min-w-0 overflow-hidden bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer space-y-1.5 sm:space-y-2 group"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9.5px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
              On-Duty Doctors
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-600 font-mono truncate">
            {activeDoctors.length}{' '}
            <span className="text-[11px] sm:text-xs text-slate-400 font-normal font-sans">/ {doctors.length}</span>
          </div>
          <p className="text-[10px] sm:text-[10.5px] text-emerald-700 font-bold truncate">Available Now</p>
        </div>

        {/* Completed Visits */}
        <div
          onClick={() => onNavigateTab?.('bookings')}
          className="min-w-0 overflow-hidden bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer space-y-1.5 sm:space-y-2 group"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9.5px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
              Completed
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-blue-600 font-mono truncate">
            {completedTokens.length}
          </div>
          <p className="text-[10px] sm:text-[10.5px] text-blue-700 font-bold truncate">Done Today</p>
        </div>

        {/* Online App Tokens */}
        <div
          onClick={() => onNavigateTab?.('bookings')}
          className="min-w-0 overflow-hidden bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all cursor-pointer space-y-1.5 sm:space-y-2 group"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9.5px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
              Online App
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-purple-700 font-mono truncate">
            {onlineTokens.length}
          </div>
          <p className="text-[10px] sm:text-[10.5px] text-purple-700 font-bold truncate">Pre-Booked</p>
        </div>

        {/* Walk-In Registrations */}
        <div
          onClick={() => onNavigateTab?.('bookings')}
          className="min-w-0 overflow-hidden bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-sky-300 transition-all cursor-pointer space-y-1.5 sm:space-y-2 group"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9.5px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
              Walk-Ins
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-sky-700 font-mono truncate">
            {walkInTokens.length}
          </div>
          <p className="text-[10px] sm:text-[10.5px] text-sky-700 font-bold truncate">Front Desk</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. REAL-TIME LIVE QUEUE STREAM & ON-DUTY CABIN RADAR
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Live Queue & Active Consultations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Cabin Consultations */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 font-heading flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  Active Doctor Cabin Consultations
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Currently engaged consultation rooms and active patient encounters.
                </p>
              </div>

              <span className="text-xs font-bold text-[#0B5A54] bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                {inConsultationTokens.length} Active Cabin(s)
              </span>
            </div>

            {inConsultationTokens.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Stethoscope className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">No active cabin consultations right now.</p>
                <p className="text-[11px] text-slate-400">Click &ldquo;Call Next Token&rdquo; to summon the next patient in line.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {inConsultationTokens.map((item) => {
                  const doc = doctors.find((d) => d.id === item.doctorId);
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-gradient-to-br from-teal-50/80 to-white border border-teal-200/90 shadow-2xs space-y-3 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 bg-[#0B5A54] text-white rounded-xl font-mono text-xs font-black">
                          {item.tokenNumber}
                        </span>
                        <span className="text-[10px] font-black uppercase text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-full">
                          {doc?.roomNumber || 'Cabin 101'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{item.patientName}</h4>
                        <p className="text-xs text-slate-600 font-semibold mt-0.5">
                          With <span className="text-[#0B5A54]">{item.doctorName}</span> ({item.doctorSpecialty})
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-teal-100 text-xs">
                        <span className="text-[10.5px] text-slate-400 font-mono">
                          Slot: {item.timeSlot}
                        </span>
                        <button
                          onClick={() => {
                            updateTokenStatus(item.id, 'Completed');
                            onShowToast?.(`Token ${item.tokenNumber} marked as completed.`);
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-[11px] transition-all cursor-pointer"
                        >
                          Mark Completed
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Next in Line Queue Stream */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 font-heading flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#0B5A54]" />
                  Waiting Hall Queue Stream
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Ordered patient arrival tokens ready for doctor consultation call.
                </p>
              </div>

              <button
                onClick={() => onNavigateTab?.('queue')}
                className="text-xs font-extrabold text-[#0B5A54] hover:underline flex items-center gap-1"
              >
                <span>Full Queue Board</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {waitingTokens.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-slate-600">Waiting hall queue is currently clear!</p>
                <p className="text-[11px] text-slate-400">All registered patients have been attended.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {waitingTokens.slice(0, 5).map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-teal-300 hover:shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      <span className="px-3 py-1 bg-amber-50 text-amber-900 font-mono font-black text-xs rounded-xl border border-amber-200">
                        {item.tokenNumber}
                      </span>
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900">{item.patientName}</h4>
                        <p className="text-[11px] text-slate-500">
                          {item.doctorName} • <span className="font-mono text-slate-400">{item.timeSlot}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {item.type === 'Walk-In' ? 'Walk-In' : 'Online'}
                      </span>
                      <button
                        onClick={() => {
                          updateTokenStatus(item.id, 'In Consultation');
                          onShowToast?.(`Token ${item.tokenNumber} summoned into consultation.`);
                        }}
                        className="px-3 py-1.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>Call In</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: On-Duty Doctors & Quick Availability Switcher */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 font-heading flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-[#0B5A54]" />
                  Physician Cabin Status
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Live presence and duty toggle.
                </p>
              </div>

              <button
                onClick={() => onNavigateTab?.('doctors')}
                className="text-xs font-bold text-[#0B5A54] hover:underline"
              >
                Manage
              </button>
            </div>

            <div className="space-y-3">
              {doctors.map((doctor) => {
                const docWaitingCount = waitingTokens.filter((t) => t.doctorId === doctor.id).length;
                const isDocConsulting = inConsultationTokens.some((t) => t.doctorId === doctor.id);

                return (
                  <div
                    key={doctor.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={doctor.photo}
                          alt={doctor.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div className="truncate">
                          <h4 className="font-extrabold text-xs text-slate-900 truncate">
                            {doctor.name}
                          </h4>
                          <p className="text-[11px] text-[#0B5A54] font-semibold truncate">
                            {doctor.specialty}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setDoctorToToggle(doctor)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer shrink-0 ${doctor.isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                      >
                        {doctor.isAvailable ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Off-Duty</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 text-slate-500 font-medium">
                      <span>{doctor.roomNumber}</span>
                      <div className="flex items-center gap-2">
                        {isDocConsulting && (
                          <span className="text-[9px] font-black uppercase text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                            In Cabin
                          </span>
                        )}
                        <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          {docWaitingCount} Queue
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Desk Actions Speed Dial */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white space-y-3.5 shadow-md">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-300 font-mono">
              Front Desk Speed Dial
            </span>
            <h3 className="text-base font-black font-heading">Need Fast Patient Intake?</h3>
            <p className="text-xs text-slate-300">
              Register walk-in patients or capture incoming triage vitals in seconds.
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={onOpenNewAppointment}
                className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <UserPlus className="w-4 h-4 text-teal-300" />
                  <span>Walk-In Registration</span>
                </div>
                <ArrowRight className="w-4 h-4 text-teal-300" />
              </button>

              <button
                onClick={() => onNavigateTab?.('checkin')}
                className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-emerald-300" />
                  <span>Express Arrival Check-In</span>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          CONFIRMATION MODAL FOR DOCTOR AVAILABILITY TOGGLE
      ══════════════════════════════════════════════════════════════════ */}
      {doctorToToggle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 font-heading">
                Confirm Availability Change?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to set <strong className="text-slate-900 font-extrabold">{doctorToToggle.name}</strong> to{' '}
                <span className={`font-black ${doctorToToggle.isAvailable ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {doctorToToggle.isAvailable ? 'OFF-DUTY (UNAVAILABLE)' : 'ACTIVE (AVAILABLE)'}
                </span>.
              </p>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-200/70 rounded-2xl text-left space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Operational Impact</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-normal font-medium">
                {doctorToToggle.isAvailable
                  ? 'Marking this physician as unavailable will pause token queue routing and alert triage handlers.'
                  : 'Marking this physician as available will activate the consultation room and resume token calls.'}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setDoctorToToggle(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmToggleAvailability}
                className={`flex-1 py-3 px-4 text-white font-black rounded-2xl text-xs shadow-md transition-all cursor-pointer ${doctorToToggle.isAvailable
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#0B5A54] hover:bg-[#084540]'
                  }`}
              >
                Confirm {doctorToToggle.isAvailable ? 'Off-Duty' : 'Available'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistDashboard;
