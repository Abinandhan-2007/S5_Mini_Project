import React, { useState, useMemo } from 'react';
import {
  User,
  Users,
  UserCheck,
  Stethoscope,
  Plus,
  Clock,
  Check,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Volume2,
  Sparkles,
  Smartphone,
  UserPlus,
  Printer,
  ChevronRight,
  Search,
  Building2,
  DoorOpen,
  SlidersHorizontal,
  CalendarCheck,
  ArrowUpRight,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { DoctorRecord } from '../../types/receptionist';

interface ReceptionistDashboardProps {
  onNavigateTab?: (tab: string) => void;
  onShowToast?: (msg: string) => void;
  onOpenNewAppointment?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Robust Doctor Avatar Component with Initials Fallback & Status Ring
// ─────────────────────────────────────────────────────────────────────────────
const DoctorAvatar: React.FC<{
  photo?: string;
  name: string;
  specialty?: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'active' | 'offline';
}> = ({ photo, name, size = 'md', status = 'offline' }) => {
  const [imgError, setImgError] = useState(false);

  // Generate doctor initials (e.g., "Dr. Olivia Wilson" -> "OW")
  const cleanName = name.replace(/^Dr\.\s*/i, '').trim();
  const parts = cleanName.split(' ');
  const initials =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : cleanName.slice(0, 2).toUpperCase();

  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-14 h-14 text-base',
  }[size];

  const ringColor = {
    active: 'border-emerald-500 shadow-emerald-500/20',
    offline: 'border-slate-300 shadow-slate-300/10',
  }[status];

  return (
    <div className="relative shrink-0 select-none">
      {!imgError && photo ? (
        <img
          src={photo}
          alt={name}
          onError={() => setImgError(true)}
          className={`${sizeClasses} rounded-2xl object-cover border-2 ${ringColor} shadow-md transition-all`}
        />
      ) : (
        <div
          className={`${sizeClasses} rounded-2xl bg-gradient-to-br from-[#0B5A54] via-teal-800 to-slate-800 text-white font-extrabold flex items-center justify-center border-2 ${ringColor} shadow-md tracking-wider`}
        >
          {initials || 'DR'}
        </div>
      )}

      {/* Status Dot */}
      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
        {status === 'active' && (
          <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
        )}
        <span
          className={`relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-white ${
            status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
          }`}
        />
      </span>
    </div>
  );
};

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

  // Physician Cabin Status Filter States
  const [cabinStatusFilter, setCabinStatusFilter] = useState<'all' | 'active' | 'offline'>('all');
  const [cabinFloorFilter, setCabinFloorFilter] = useState<string>('all');
  const [cabinSearchQuery, setCabinSearchQuery] = useState<string>('');

  // Token categories
  const waitingTokens = tokens.filter((t) => t.status === 'Waiting' || t.status === 'Checked In');
  const inConsultationTokens = tokens.filter((t) => t.status === 'In Consultation');
  const completedTokens = tokens.filter((t) => t.status === 'Completed');
  const onlineTokens = tokens.filter((t) => t.type !== 'Walk-In');
  const walkInTokens = tokens.filter((t) => t.type === 'Walk-In');

  // Doctor categorizations
  const activeDoctors = doctors.filter((d) => d.isAvailable);
  const offDutyDoctors = doctors.filter((d) => !d.isAvailable);

  // Extract unique floor names dynamically from doctor records
  const availableFloors = useMemo(() => {
    const floorSet = new Set<string>();
    doctors.forEach((d) => {
      if (d.roomNumber.includes('1st Floor')) floorSet.add('1st Floor');
      else if (d.roomNumber.includes('2nd Floor')) floorSet.add('2nd Floor');
      else if (d.roomNumber.includes('3rd Floor')) floorSet.add('3rd Floor');
      else if (d.roomNumber.includes('Floor')) {
        const match = d.roomNumber.match(/(\d+(?:st|nd|rd|th)?\s*Floor)/i);
        if (match) floorSet.add(match[1]);
      }
    });
    return Array.from(floorSet).sort();
  }, [doctors]);

  // Filtered doctors for the Physician Cabin Status grid
  const filteredCabinDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      // Status filter
      if (cabinStatusFilter === 'active' && !doctor.isAvailable) return false;
      if (cabinStatusFilter === 'offline' && doctor.isAvailable) return false;

      // Floor filter
      if (cabinFloorFilter !== 'all' && !doctor.roomNumber.toLowerCase().includes(cabinFloorFilter.toLowerCase())) {
        return false;
      }

      // Search query
      if (cabinSearchQuery.trim()) {
        const q = cabinSearchQuery.toLowerCase();
        const matchName = doctor.name.toLowerCase().includes(q);
        const matchSpecialty = doctor.specialty.toLowerCase().includes(q);
        const matchDepartment = doctor.department?.toLowerCase().includes(q);
        const matchRoom = doctor.roomNumber.toLowerCase().includes(q);
        if (!matchName && !matchSpecialty && !matchDepartment && !matchRoom) return false;
      }

      return true;
    });
  }, [doctors, cabinStatusFilter, cabinFloorFilter, cabinSearchQuery]);

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
    onShowToast?.(`🔊 Now Calling: ${targetToken.tokenNumber} - ${targetToken.patientName}`);
  };

  const handlePrintRoster = () => {
    window.print();
    onShowToast?.('Opening print dialog for today’s OPD roster...');
  };

  return (
    <div className="space-y-6 pb-12 text-left">
      {/* ══════════════════════════════════════════════════════════════════
          1. EXECUTIVE 6-CARD KPI METRICS MATRIX (RESPONSIVE ALIGNMENT)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 w-full">
        {/* Waiting in Queue */}
        <div
          onClick={() => onNavigateTab?.('queue')}
          className="min-w-0 bg-white p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
        >
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[10px] sm:text-[10.5px] font-black text-slate-400 uppercase tracking-wider leading-tight">
              Waiting Queue
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 font-mono">
              {waitingTokens.length}
            </div>
            <p className="text-[10px] sm:text-[10.5px] text-amber-700 font-bold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>In Waiting Hall</span>
            </p>
          </div>
        </div>

        {/* In Consultation */}
        <div
          onClick={() => onNavigateTab?.('queue')}
          className="min-w-0 bg-white p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
        >
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[10px] sm:text-[10.5px] font-black text-slate-400 uppercase tracking-wider leading-tight">
              In Consultation
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-teal-50 text-[#0B5A54] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#0B5A54] font-mono">
              {inConsultationTokens.length}
            </div>
            <p className="text-[10px] sm:text-[10.5px] text-teal-700 font-bold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse shrink-0" />
              <span>Active In Cabins</span>
            </p>
          </div>
        </div>

        {/* On-Duty Doctors */}
        <div
          onClick={() => onNavigateTab?.('doctors')}
          className="min-w-0 bg-white p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
        >
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[10px] sm:text-[10.5px] font-black text-slate-400 uppercase tracking-wider leading-tight">
              On-Duty Doctors
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-600 font-mono">
              {activeDoctors.length}{' '}
              <span className="text-[11px] sm:text-xs text-slate-400 font-normal font-sans">/ {doctors.length}</span>
            </div>
            <p className="text-[10px] sm:text-[10.5px] text-emerald-700 font-bold mt-0.5">Available Now</p>
          </div>
        </div>

        {/* Completed Visits */}
        <div
          onClick={() => onNavigateTab?.('bookings')}
          className="min-w-0 bg-white p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
        >
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[10px] sm:text-[10.5px] font-black text-slate-400 uppercase tracking-wider leading-tight">
              Completed
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-blue-600 font-mono">
              {completedTokens.length}
            </div>
            <p className="text-[10px] sm:text-[10.5px] text-blue-700 font-bold mt-0.5">Done Today</p>
          </div>
        </div>

        {/* Online App Tokens */}
        <div
          onClick={() => onNavigateTab?.('bookings')}
          className="min-w-0 bg-white p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
        >
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[10px] sm:text-[10.5px] font-black text-slate-400 uppercase tracking-wider leading-tight">
              Online App
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-purple-700 font-mono">
              {onlineTokens.length}
            </div>
            <p className="text-[10px] sm:text-[10.5px] text-purple-700 font-bold mt-0.5">Pre-Booked</p>
          </div>
        </div>

        {/* Walk-In Registrations */}
        <div
          onClick={() => onNavigateTab?.('bookings')}
          className="min-w-0 bg-white p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-sky-300 transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
        >
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[10px] sm:text-[10.5px] font-black text-slate-400 uppercase tracking-wider leading-tight">
              Walk-Ins
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-sky-700 font-mono">
              {walkInTokens.length}
            </div>
            <p className="text-[10px] sm:text-[10.5px] text-sky-700 font-bold mt-0.5">Front Desk</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. ACTIVE CONSULTATIONS (LEFT) & COMPACT ACTIVITY HUB (RIGHT)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Active Doctor Cabin Consultations */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 font-heading flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  Active Doctor Cabin Consultations
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Currently engaged consultation rooms and active patient encounters.
                </p>
              </div>

              <span className="text-xs font-bold text-[#0B5A54] bg-teal-50 px-3 py-1 rounded-full border border-teal-200 shrink-0">
                {inConsultationTokens.length} Active Cabin(s)
              </span>
            </div>

            {inConsultationTokens.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2 my-auto">
                <Stethoscope className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">No active cabin consultations right now.</p>
                <p className="text-[11px] text-slate-400">Click &ldquo;Call Next Token&rdquo; to summon the next patient in line.</p>
              </div>
            ) : inConsultationTokens.length === 1 ? (
              /* Single Active Consultation: Spacious Executive Spotlight */
              (() => {
                const item = inConsultationTokens[0];
                const doc = doctors.find((d) => d.id === item.doctorId);
                return (
                  <div className="w-full flex-1 my-auto p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/50 border border-teal-200/90 shadow-xs space-y-4 relative overflow-hidden">
                    {/* Top Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-teal-100/80">
                      <div className="flex items-center gap-2">
                        <span className="px-3.5 py-1 bg-[#0B5A54] text-white rounded-xl font-mono text-xs font-black shadow-xs tracking-wider">
                          {item.tokenNumber}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-300/70 text-[11px] font-black uppercase tracking-wider">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Live Consultation
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-teal-900 bg-teal-100/80 px-3 py-1.5 rounded-xl border border-teal-200 shadow-2xs">
                        <Building2 className="w-3.5 h-3.5 text-[#0B5A54]" />
                        {doc?.roomNumber || 'Cabin 101'}
                      </span>
                    </div>

                    {/* Core Encounter Details (Patient & Doctor Grid) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 py-0.5">
                      {/* Patient Cardlet */}
                      <div className="p-4 rounded-2xl bg-white border border-teal-100/90 shadow-2xs space-y-2">
                        <span className="text-[10px] font-mono font-black uppercase text-slate-400 tracking-wider">
                          Patient In Cabin
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-[#0B5A54] font-black flex items-center justify-center shrink-0">
                            <User className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-extrabold text-base text-slate-900 truncate">
                              {item.patientName}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                              Arrival: {item.arrivalTime || 'On Schedule'} • {item.type}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Attending Physician Cardlet */}
                      <div className="p-4 rounded-2xl bg-white border border-teal-100/90 shadow-2xs space-y-2">
                        <span className="text-[10px] font-mono font-black uppercase text-slate-400 tracking-wider">
                          Attending Physician
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-black flex items-center justify-center shrink-0">
                            <Stethoscope className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-extrabold text-base text-[#0B5A54] truncate">
                              {item.doctorName}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                              {item.doctorSpecialty || 'Consultant Specialist'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Slot & Status Telemetry */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-teal-100/80 text-xs">
                      <div className="flex items-center gap-2 text-slate-600 font-mono text-[11.5px]">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>Consultation Slot: <strong className="text-slate-800 font-bold">{item.timeSlot}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Doctor In Session • Live Presence</span>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              /* Multiple Active Consultations: Multi-Card Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-auto">
                {inConsultationTokens.map((item) => {
                  const doc = doctors.find((d) => d.id === item.doctorId);
                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-4.5 rounded-2xl bg-gradient-to-br from-white via-teal-50/30 to-emerald-50/40 border border-teal-200/90 shadow-2xs hover:shadow-md hover:border-teal-400 transition-all space-y-3.5 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-[#0B5A54] text-white rounded-xl font-mono text-xs font-black shadow-xs tracking-wide">
                            {item.tokenNumber}
                          </span>
                          <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300/60">
                            In Session
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-teal-900 bg-teal-100/70 px-2.5 py-1 rounded-xl border border-teal-200/80 shadow-2xs">
                          <Building2 className="w-3 h-3 text-[#0B5A54]" />
                          {doc?.roomNumber || 'Cabin 101'}
                        </span>
                      </div>

                      <div className="space-y-1.5 py-0.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-teal-50 text-[#0B5A54] border border-teal-200/60 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                            {item.patientName}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium pl-8 truncate">
                          <Stethoscope className="w-3.5 h-3.5 text-[#0B5A54] shrink-0" />
                          <span>
                            With <strong className="text-[#0B5A54] font-black">{item.doctorName}</strong>
                          </span>
                          {item.doctorSpecialty && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 font-medium">{item.doctorSpecialty}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-teal-100/90 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Slot: {item.timeSlot}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Doctor In Session</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Real-time cabin consultation telemetry</span>
              <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                {inConsultationTokens.length} In-Room
              </span>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Spacious Light Hospital Action Cards (Fills Container Space) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#0B5A54] border border-teal-200 text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#0B5A54]" />
                Front Desk Quick Hub
              </span>
              <span className="text-[10.5px] font-black text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full font-mono">
                4 Actions
              </span>
            </div>

            {/* Responsive Light Hospital-Themed Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-3.5 flex-1 my-1">
              {/* 1. Walk-In Registration (Clinical Mint & Sage Teal) */}
              <button
                onClick={onOpenNewAppointment}
                className="p-4 sm:p-4.5 rounded-3xl bg-gradient-to-br from-teal-50/90 via-emerald-50/50 to-teal-100/50 border border-teal-200/90 hover:border-teal-400 shadow-2xs hover:shadow-lg hover:shadow-teal-900/10 transition-all duration-300 flex flex-col justify-between items-start text-left cursor-pointer group hover:-translate-y-1 relative overflow-hidden min-h-[125px] sm:min-h-[135px]"
              >
                {/* Subtle Clinical Mesh Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#0B5A54_0.75px,transparent_0.75px)] [background-size:14px_14px] opacity-10 pointer-events-none" />

                <div className="flex items-center justify-between w-full relative z-10">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#0B5A54] to-teal-700 text-white flex items-center justify-center shadow-md shadow-teal-900/20 group-hover:scale-105 transition-transform shrink-0">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-xl bg-teal-100/90 text-teal-900 border border-teal-300/80 text-[10px] sm:text-[10.5px] font-mono font-black">
                    + Intake
                  </span>
                </div>

                <div className="flex items-end justify-between w-full relative z-10 pt-2.5">
                  <div className="space-y-0.5 min-w-0 flex-1 pr-1.5">
                    <h4 className="font-extrabold text-sm sm:text-[15px] text-slate-900 group-hover:text-[#0B5A54] transition-colors leading-snug">
                      Walk-In Patient
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                      Issue instant token
                    </p>
                  </div>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-white text-slate-700 border border-teal-200 group-hover:bg-[#0B5A54] group-hover:text-white group-hover:border-[#0B5A54] flex items-center justify-center transition-all shadow-2xs shrink-0">
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </button>

              {/* 2. Express Arrival Check-In (Medical Cyan & Ocean Sky) */}
              <button
                onClick={() => onNavigateTab?.('checkin')}
                className="p-4 sm:p-4.5 rounded-3xl bg-gradient-to-br from-sky-50/90 via-cyan-50/50 to-sky-100/50 border border-sky-200/90 hover:border-sky-400 shadow-2xs hover:shadow-lg hover:shadow-sky-900/10 transition-all duration-300 flex flex-col justify-between items-start text-left cursor-pointer group hover:-translate-y-1 relative overflow-hidden min-h-[125px] sm:min-h-[135px]"
              >
                {/* Subtle Clinical Mesh Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#0284c7_0.75px,transparent_0.75px)] [background-size:14px_14px] opacity-10 pointer-events-none" />

                <div className="flex items-center justify-between w-full relative z-10">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-sky-900/20 group-hover:scale-105 transition-transform shrink-0">
                    <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-xl bg-sky-100/90 text-sky-900 border border-sky-300/80 text-[10px] sm:text-[10.5px] font-mono font-black">
                    {onlineTokens.length} Online
                  </span>
                </div>

                <div className="flex items-end justify-between w-full relative z-10 pt-2.5">
                  <div className="space-y-0.5 min-w-0 flex-1 pr-1.5">
                    <h4 className="font-extrabold text-sm sm:text-[15px] text-slate-900 group-hover:text-sky-800 transition-colors leading-snug">
                      Express Arrival
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                      Verify app booking
                    </p>
                  </div>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-white text-slate-700 border border-sky-200 group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 flex items-center justify-center transition-all shadow-2xs shrink-0">
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </button>

              {/* 3. Today's History & Visit Logs (Clinical Lilac & Care Violet) */}
              <button
                onClick={() => onNavigateTab?.('bookings')}
                className="p-4 sm:p-4.5 rounded-3xl bg-gradient-to-br from-purple-50/90 via-indigo-50/50 to-purple-100/50 border border-purple-200/90 hover:border-purple-400 shadow-2xs hover:shadow-lg hover:shadow-purple-900/10 transition-all duration-300 flex flex-col justify-between items-start text-left cursor-pointer group hover:-translate-y-1 relative overflow-hidden min-h-[125px] sm:min-h-[135px]"
              >
                {/* Subtle Clinical Mesh Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#7c3aed_0.75px,transparent_0.75px)] [background-size:14px_14px] opacity-10 pointer-events-none" />

                <div className="flex items-center justify-between w-full relative z-10">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-purple-900/20 group-hover:scale-105 transition-transform shrink-0">
                    <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-xl bg-purple-100/90 text-purple-900 border border-purple-300/80 text-[10px] sm:text-[10.5px] font-mono font-black">
                    {completedTokens.length} Done
                  </span>
                </div>

                <div className="flex items-end justify-between w-full relative z-10 pt-2.5">
                  <div className="space-y-0.5 min-w-0 flex-1 pr-1.5">
                    <h4 className="font-extrabold text-sm sm:text-[15px] text-slate-900 group-hover:text-purple-800 transition-colors leading-snug">
                      Today's History
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                      Bookings & visit log
                    </p>
                  </div>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-white text-slate-700 border border-purple-200 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 flex items-center justify-center transition-all shadow-2xs shrink-0">
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </button>

              {/* 4. Print OPD Roster (Medical Amber & Warm Sand) */}
              <button
                onClick={handlePrintRoster}
                className="p-4 sm:p-4.5 rounded-3xl bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-100/50 border border-amber-200/90 hover:border-amber-400 shadow-2xs hover:shadow-lg hover:shadow-amber-900/10 transition-all duration-300 flex flex-col justify-between items-start text-left cursor-pointer group hover:-translate-y-1 relative overflow-hidden min-h-[125px] sm:min-h-[135px]"
              >
                {/* Subtle Clinical Mesh Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#d97706_0.75px,transparent_0.75px)] [background-size:14px_14px] opacity-10 pointer-events-none" />

                <div className="flex items-center justify-between w-full relative z-10">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-md shadow-amber-900/20 group-hover:scale-105 transition-transform shrink-0">
                    <Printer className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-xl bg-amber-100/90 text-amber-900 border border-amber-300/80 text-[10px] sm:text-[10.5px] font-mono font-black">
                    PDF / Print
                  </span>
                </div>

                <div className="flex items-end justify-between w-full relative z-10 pt-2.5">
                  <div className="space-y-0.5 min-w-0 flex-1 pr-1.5">
                    <h4 className="font-extrabold text-sm sm:text-[15px] text-slate-900 group-hover:text-amber-800 transition-colors leading-snug">
                      Print OPD Roster
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                      Token schedule
                    </p>
                  </div>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-white text-slate-700 border border-amber-200 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600 flex items-center justify-center transition-all shadow-2xs shrink-0">
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            </div>

            {/* Operator Desk Telemetry Footer */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-slate-700">Operator Desk Active</span>
              </div>
              <span className="font-mono font-semibold text-slate-600 text-[11px]">
                {receptionistProfile.name || 'Emily Watson'} (Desk A-1)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          4. WAITING HALL QUEUE STREAM (FULL PAGE WIDTH)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="space-y-1">
            <h2 className="text-base sm:text-xl font-black text-slate-900 font-heading flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0B5A54]" />
              Waiting Hall Queue Stream
              <span className="text-xs font-bold text-[#0B5A54] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                {waitingTokens.length} Waiting
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Real-time ordered patient arrival tokens ready for doctor consultation call across all departments.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab?.('queue')}
            className="text-xs font-extrabold text-[#0B5A54] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto shrink-0 bg-teal-50/60 hover:bg-teal-50 px-3.5 py-2 rounded-xl border border-teal-200/80 transition-all"
          >
            <span>Full Queue Board</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {waitingTokens.length === 0 ? (
          <div className="p-10 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Waiting hall queue is currently clear!</p>
            <p className="text-xs text-slate-400">All registered patients have been attended by consultation rooms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {waitingTokens.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between gap-3.5 group relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center font-mono group-hover:bg-teal-50 group-hover:text-[#0B5A54] transition-colors">
                      {idx + 1}
                    </span>
                    <span className="px-3 py-1 bg-teal-50 text-[#0B5A54] font-mono font-black text-xs rounded-xl border border-teal-200">
                      {item.tokenNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.status === 'Checked In' && (
                      <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Checked In</span>
                      </span>
                    )}
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      item.type === 'Walk-In'
                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}>
                      {item.type === 'Walk-In' ? 'Walk-In' : 'Online'}
                    </span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-sm text-slate-900 truncate">{item.patientName}</h4>
                  <p className="text-xs text-slate-500 font-medium truncate">
                    Assigned: <span className="text-[#0B5A54] font-bold">{item.doctorName}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="font-mono text-slate-400 text-[11px]">
                    Slot: {item.timeSlot}
                  </span>
                  <button
                    onClick={() => {
                      updateTokenStatus(item.id, 'In Consultation');
                      onShowToast?.(`Token ${item.tokenNumber} summoned into consultation.`);
                    }}
                    className="px-3.5 py-1.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1 hover:scale-105 active:scale-95 shadow-xs"
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

      {/* ══════════════════════════════════════════════════════════════════
          5. PHYSICIAN CABIN STATUS (PLACED DIRECTLY DOWN TO WAITING HALL QUEUE STREAM)
          PREMIUM TELEMETRY & LIVE ROOM PRESENCE CONSOLE
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-md space-y-6">
        {/* Header with Title, Live Telemetry Beacon, and Manage Shortcut */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-200 text-[#0B5A54] flex items-center justify-center shadow-xs">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-black text-slate-900 font-heading flex items-center gap-2">
                  Physician Cabin Status
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Presence
                  </span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Real-time consultation room occupancy, duty presence, and waiting load across hospital floors.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={() => onNavigateTab?.('doctors')}
              className="px-3.5 py-2 bg-slate-50 hover:bg-teal-50 text-[#0B5A54] hover:text-[#084540] border border-slate-200 hover:border-teal-200 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:scale-105 active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Manage All Doctors</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar Controls */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Status Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60">
              <button
                onClick={() => setCabinStatusFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  cabinStatusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Cabins ({doctors.length})
              </button>
              <button
                onClick={() => setCabinStatusFilter('active')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  cabinStatusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:bg-white/60'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cabinStatusFilter === 'active' ? 'bg-white' : 'bg-emerald-500'}`} />
                <span>On-Duty ({activeDoctors.length})</span>
              </button>
              <button
                onClick={() => setCabinStatusFilter('offline')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  cabinStatusFilter === 'offline'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cabinStatusFilter === 'offline' ? 'bg-white' : 'bg-slate-400'}`} />
                <span>Off-Duty ({offDutyDoctors.length})</span>
              </button>
            </div>

            {/* Floor Filter & Search Bar */}
            <div className="flex items-center gap-2">
              {/* Floor Dropdown/Selector */}
              <div className="relative shrink-0">
                <select
                  value={cabinFloorFilter}
                  onChange={(e) => setCabinFloorFilter(e.target.value)}
                  className="text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-2xs appearance-none pr-8"
                >
                  <option value="all">All Floors</option>
                  {availableFloors.map((fl) => (
                        <option key={fl} value={fl}>
                          {fl}
                        </option>
                  ))}
                </select>
                <Building2 className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Search Input */}
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search doctor or cabin..."
                  value={cabinSearchQuery}
                  onChange={(e) => setCabinSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50 hover:bg-white transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cabin Cards Responsive Multi-Column Grid */}
        {filteredCabinDoctors.length === 0 ? (
          <div className="p-10 text-center bg-slate-50/70 rounded-3xl border border-dashed border-slate-200 space-y-2.5">
            <Building2 className="w-9 h-9 text-slate-300 mx-auto" />
            <h4 className="text-sm font-black text-slate-700">No physician cabins match your criteria</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting the floor, availability status, or search query filter to inspect other cabins.
            </p>
            <button
              onClick={() => {
                setCabinStatusFilter('all');
                setCabinFloorFilter('all');
                setCabinSearchQuery('');
              }}
              className="px-4 py-2 bg-white text-[#0B5A54] border border-teal-200 text-xs font-bold rounded-xl hover:bg-teal-50 transition-all cursor-pointer shadow-2xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCabinDoctors.map((doctor) => {
              const docWaitingTokens = waitingTokens.filter((t) => t.doctorId === doctor.id);
              const nextWaiting = docWaitingTokens[0];

              return (
                <div
                  key={doctor.id}
                  className={`group rounded-3xl p-5 border transition-all duration-200 relative overflow-hidden flex flex-col justify-between space-y-4 hover:shadow-lg hover:-translate-y-0.5 ${
                    doctor.isAvailable
                      ? 'bg-white border-slate-200/90 hover:border-emerald-300 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200 opacity-90 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  {/* Top Header: Cabin Room Pill & Live State Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-800 text-xs font-black font-mono">
                      <DoorOpen className="w-3.5 h-3.5 text-[#0B5A54]" />
                      <span className="truncate">{doctor.roomNumber || 'Cabin 101'}</span>
                    </div>

                    {/* Status Beacon Badge */}
                    <div className="shrink-0">
                      {doctor.isAvailable ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black uppercase tracking-wider">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          On-Duty
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-black uppercase tracking-wider">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          Shift Off-Duty
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Doctor Profile Info Row */}
                  <div className="flex items-center gap-3.5 pt-1">
                    <DoctorAvatar
                      photo={doctor.photo}
                      name={doctor.name}
                      specialty={doctor.specialty}
                      size="md"
                      status={doctor.isAvailable ? 'active' : 'offline'}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                          {doctor.name}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] font-bold text-[#0B5A54] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100 truncate">
                          {doctor.specialty}
                        </span>
                        {doctor.experienceYears && (
                          <span className="text-[10px] font-semibold text-slate-500">
                            {doctor.experienceYears}y exp
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Live Queue Count Status Box */}
                  <div className="pt-1">
                    <div
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        docWaitingTokens.length > 0
                          ? 'bg-teal-50/60 border-teal-200/80'
                          : 'bg-slate-50/80 border-slate-200/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Users className={`w-4 h-4 shrink-0 ${docWaitingTokens.length > 0 ? 'text-[#0B5A54]' : 'text-slate-400'}`} />
                        <div className="min-w-0">
                          <span className="text-xs font-extrabold text-slate-800 block">
                            Patients in Queue:
                          </span>
                          {docWaitingTokens.length > 0 && nextWaiting && (
                            <p className="text-[10.5px] text-[#0B5A54] font-extrabold truncate">
                              Next: {nextWaiting.tokenNumber}
                            </p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-xl font-mono text-xs font-black shadow-2xs shrink-0 ${
                          docWaitingTokens.length > 0
                            ? 'bg-[#0B5A54] text-white'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {docWaitingTokens.length} {docWaitingTokens.length === 1 ? 'Patient' : 'Patients'}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: Action Controls & Duty Switcher */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Quick Cabin-Specific Call Next Button */}
                    {docWaitingTokens.length > 0 && doctor.isAvailable ? (
                      <button
                        onClick={() => handleCallNext(doctor.id)}
                        className="flex-1 py-2 px-3 bg-[#0B5A54] hover:bg-[#084540] text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:scale-[1.02] active:scale-95"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Call Next ({nextWaiting?.tokenNumber})</span>
                      </button>
                    ) : (
                      <div className="flex-1 text-[11px] text-slate-400 font-medium">
                        {doctor.isAvailable ? 'Cabin Ready' : 'Shift Paused'}
                      </div>
                    )}

                    {/* Duty Toggle Pill */}
                    <button
                      onClick={() => setDoctorToToggle(doctor)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs hover:scale-105 active:scale-95 ${
                        doctor.isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                      }`}
                      title={`Click to set ${doctor.isAvailable ? 'Off-Duty' : 'Available'}`}
                    >
                      {doctor.isAvailable ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Off-Duty</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
                className={`flex-1 py-3 px-4 text-white font-black rounded-2xl text-xs shadow-md transition-all cursor-pointer ${
                  doctorToToggle.isAvailable
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
