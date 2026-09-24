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
  Phone,
  Loader2,
  Activity,
  LayoutGrid,
  ListFilter,
  Eye,
  X,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { TokenQueueItem, DoctorRecord } from '../../types/receptionist';

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
  const bookings = useStaffStore((s) => s.bookings);
  const checkInAppointment = useStaffStore((s) => s.checkInAppointment);
  const callNextToken = useStaffStore((s) => s.callNextToken);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);
  const receptionistProfile = useStaffStore((s) => s.receptionistProfile);
  const currentStaff = useStaffStore((s) => s.currentStaff);

  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [onlineArrivalFilter, setOnlineArrivalFilter] = useState<'all' | 'awaiting' | 'checked_in'>('all');
  // Physician Cabin Status Filter States & Telemetry View
  const [cabinStatusFilter, setCabinStatusFilter] = useState<'all' | 'in_session' | 'ready' | 'offline'>('all');
  const [cabinFloorFilter, setCabinFloorFilter] = useState<string>('all');
  const [cabinSearchQuery, setCabinSearchQuery] = useState<string>('');
  const [cabinViewMode, setCabinViewMode] = useState<'grid' | 'table'>('grid');
  const [inspectingCabinDoctor, setInspectingCabinDoctor] = useState<DoctorRecord | null>(null);
  // Active Operational Stream Tab (Cabins vs Queue vs Pre-Booked)
  const [activeOperationsTab, setActiveOperationsTab] = useState<'cabins' | 'queue' | 'prebooked'>('cabins');

  // Master appointment set (merges live tokens and all bookings)
  const allAppointments = useMemo(() => {
    if (!bookings || bookings.length === 0) return tokens;
    const result = [...tokens];
    const seen = new Set(tokens.map((t) => t.id));
    bookings.forEach((b) => {
      if (!seen.has(b.id)) {
        seen.add(b.id);
        result.push(b);
      }
    });
    return result;
  }, [bookings, tokens]);

  // Token categories
  const waitingTokens = tokens.filter((t) => t.status === 'Waiting' || t.status === 'Checked In');
  const inConsultationTokens = tokens.filter((t) => t.status === 'In Consultation');
  const isWalkIn = (type?: string) => (type || '').toLowerCase().includes('walk-in');
  const completedTokens = allAppointments.filter((t) => t.status === 'Completed');
  const onlineTokens = useMemo(() => allAppointments.filter((t) => t.type !== 'Walk-In'), [allAppointments]);
  const pendingOnlineArrivals = useMemo(
    () =>
      onlineTokens.filter(
        (t) =>
          !t.isCheckedIn &&
          t.status !== 'In Consultation' &&
          t.status !== 'Completed' &&
          t.status !== 'Cancelled'
      ),
    [onlineTokens]
  );
  const walkInTokens = useMemo(() => allAppointments.filter((t) => t.type === 'Walk-In'), [allAppointments]);

  // Filtered list for the Expected Online Arrivals card section
  const filteredOnlineArrivals = useMemo(() => {
    return onlineTokens.filter((item) => {
      if (onlineArrivalFilter === 'awaiting') {
        return !item.isCheckedIn && item.status !== 'In Consultation' && item.status !== 'Completed';
      }
      if (onlineArrivalFilter === 'checked_in') {
        return item.isCheckedIn || item.status === 'Checked In' || item.status === 'In Consultation';
      }
      return true;
    });
  }, [onlineTokens, onlineArrivalFilter]);

  const handleCheckInPatient = async (item: TokenQueueItem) => {
    setCheckingInId(item.id);
    try {
      const ok = await checkInAppointment(item.id);
      if (ok) {
        onShowToast?.(`Patient ${item.patientName} (${item.ticketNumber}) checked in and added to Live Queue!`);
      } else {
        onShowToast?.(`Patient ${item.patientName} check-in recorded.`);
      }
    } catch {
      onShowToast?.(`Failed to check in ${item.patientName}.`);
    } finally {
      setCheckingInId(null);
    }
  };

  // Doctor categorizations
  const activeDoctors = doctors.filter((d) => d.isAvailable);

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

  // Cabin Telemetry Real-Time Aggregation
  const cabinTelemetry = useMemo(() => {
    let inSessionCount = 0;
    let readyCount = 0;
    let offDutyCount = 0;
    let totalQueuedPatients = 0;

    doctors.forEach((doc) => {
      const hasActive = inConsultationTokens.some((t) => t.doctorId === doc.id);
      const docWaiters = waitingTokens.filter((t) => t.doctorId === doc.id);
      totalQueuedPatients += docWaiters.length;

      if (!doc.isAvailable) {
        offDutyCount++;
      } else if (hasActive) {
        inSessionCount++;
      } else {
        readyCount++;
      }
    });

    return {
      totalCabins: doctors.length,
      inSessionCount,
      readyCount,
      offDutyCount,
      totalQueuedPatients,
    };
  }, [doctors, inConsultationTokens, waitingTokens]);

  // Filtered doctors for the Physician Cabin Status grid & table
  const filteredCabinDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const hasActive = inConsultationTokens.some((t) => t.doctorId === doctor.id);

      // Status filter
      if (cabinStatusFilter === 'in_session' && !hasActive) return false;
      if (cabinStatusFilter === 'ready' && (!doctor.isAvailable || hasActive)) return false;
      if (cabinStatusFilter === 'offline' && doctor.isAvailable) return false;

      // Floor filter
      if (cabinFloorFilter !== 'all' && !doctor.roomNumber.toLowerCase().includes(cabinFloorFilter.toLowerCase())) {
        return false;
      }

      // Search query
      if (cabinSearchQuery.trim()) {
        const q = cabinSearchQuery.toLowerCase();
        const matchName = doctor.name.toLowerCase().includes(q);
        const matchSpecialty = (doctor.specialty || '').toLowerCase().includes(q);
        const matchDepartment = (doctor.department || '').toLowerCase().includes(q);
        const matchRoom = (doctor.roomNumber || '').toLowerCase().includes(q);
        if (!matchName && !matchSpecialty && !matchDepartment && !matchRoom) return false;
      }

      return true;
    });
  }, [doctors, inConsultationTokens, cabinStatusFilter, cabinFloorFilter, cabinSearchQuery]);

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

  const handleAdmitNextPatient = async (doctorId: string) => {
    const docWaiting = waitingTokens.filter((t) => t.doctorId === doctorId);
    const target = docWaiting[0];
    if (!target) {
      onShowToast?.('No waiting patients found for this cabin.');
      return;
    }
    await updateTokenStatus(target.id, 'In Consultation');
    onShowToast?.(`Token ${target.tokenNumber} (${target.patientName}) admitted into consultation.`);
  };

  const handleCompleteCurrentConsultation = async (consultationId: string, patientName: string) => {
    await updateTokenStatus(consultationId, 'Completed');
    onShowToast?.(`Consultation for ${patientName} marked completed.`);
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
          onClick={() => setActiveOperationsTab('queue')}
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
          onClick={() => setActiveOperationsTab('cabins')}
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
          onClick={() => setActiveOperationsTab('cabins')}
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
          onClick={() => setActiveOperationsTab('prebooked')}
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
            <p className="text-[10px] sm:text-[10.5px] text-purple-700 font-bold mt-0.5">
              {pendingOnlineArrivals.length > 0 ? `${pendingOnlineArrivals.length} Awaiting Check-In` : 'Pre-Booked'}
            </p>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Active Doctor Cabin Consultations */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-extrabold text-base text-slate-900 truncate">
                                {item.patientName}
                              </h3>
                              {item.patientCode && (
                                <span className="px-1.5 py-0.5 rounded-md bg-teal-50 text-[#0B5A54] text-[10px] font-mono font-bold border border-teal-200">
                                  {item.patientCode}
                                </span>
                              )}
                            </div>
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

        {/* Right 1 Column: Fixed Compact Hospital Action Cards */}
        <div className="lg:col-span-1 self-start">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#0B5A54] border border-teal-200 text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#0B5A54]" />
                Front Desk Quick Hub
              </span>
              <span className="text-[10.5px] font-black text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full font-mono">
                4 Actions
              </span>
            </div>

            {/* Fixed 2-Column 2-Row Compact Hospital-Themed Cards Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
              {/* 1. Walk-In Registration (Clinical Mint & Sage Teal) */}
              <button
                onClick={onOpenNewAppointment}
                className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-teal-50/90 via-emerald-50/50 to-teal-100/50 border border-teal-200/90 hover:border-teal-400 shadow-2xs hover:shadow-md hover:shadow-teal-900/10 transition-all duration-200 flex flex-col justify-between items-start text-left cursor-pointer group hover:-translate-y-0.5 relative overflow-hidden h-[122px] shrink-0"
              >
                {/* Subtle Clinical Mesh Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#0B5A54_0.75px,transparent_0.75px)] [background-size:14px_14px] opacity-10 pointer-events-none" />

                <div className="flex items-center justify-between w-full relative z-10">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#0B5A54] to-teal-700 text-white flex items-center justify-center shadow-md shadow-teal-900/20 group-hover:scale-105 transition-transform shrink-0">
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-teal-100/90 text-teal-900 border border-teal-300/80 text-[10px] font-mono font-black">
                    + Intake
                  </span>
                </div>

                <div className="flex items-end justify-between w-full relative z-10 pt-1.5">
                  <div className="space-y-0.5 min-w-0 flex-1 pr-1.5">
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-[#0B5A54] transition-colors leading-snug truncate">
                      Walk-In Patient
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                      Issue instant token
                    </p>
                  </div>
                  <div className="w-6 h-6 rounded-lg bg-white text-slate-700 border border-teal-200 group-hover:bg-[#0B5A54] group-hover:text-white group-hover:border-[#0B5A54] flex items-center justify-center transition-all shadow-2xs shrink-0">
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </button>

              {/* 2. Express Arrival Check-In (Medical Cyan & Ocean Sky) */}
              <button
                onClick={() => setActiveOperationsTab('prebooked')}
                className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-sky-50/90 via-cyan-50/50 to-sky-100/50 border border-sky-200/90 hover:border-sky-400 shadow-2xs hover:shadow-md hover:shadow-sky-900/10 transition-all duration-200 flex flex-col justify-between items-start text-left cursor-pointer group hover:-translate-y-0.5 relative overflow-hidden h-[122px] shrink-0"
              >
                {/* Subtle Clinical Mesh Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#0284c7_0.75px,transparent_0.75px)] [background-size:14px_14px] opacity-10 pointer-events-none" />

                <div className="flex items-center justify-between w-full relative z-10">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-sky-900/20 group-hover:scale-105 transition-transform shrink-0">
                    <UserCheck className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-xl bg-sky-100/90 text-sky-900 border border-sky-300/80 text-[10px] sm:text-[10.5px] font-mono font-black">
                    {pendingOnlineArrivals.length > 0 ? `${pendingOnlineArrivals.length} Pending` : `${onlineTokens.length} Online`}
                  </span>
                </div>

                <div className="flex items-end justify-between w-full relative z-10 pt-1.5">
                  <div className="space-y-0.5 min-w-0 flex-1 pr-1.5">
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-sky-800 transition-colors leading-snug truncate">
                      Express Arrival
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                      {pendingOnlineArrivals.length > 0 ? `Verify ${pendingOnlineArrivals.length} online arrivals` : 'Verify app booking'}
                    </p>
                  </div>
                  <div className="w-6 h-6 rounded-lg bg-white text-slate-700 border border-sky-200 group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 flex items-center justify-center transition-all shadow-2xs shrink-0">
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </button>

              {/* 3. Today's History & Visit Logs (Clinical Lilac & Care Violet) */}
              <button
                onClick={() => onNavigateTab?.('bookings')}
                className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-purple-50/90 via-indigo-50/50 to-purple-100/50 border border-purple-200/90 hover:border-purple-400 shadow-2xs hover:shadow-md hover:shadow-purple-900/10 transition-all duration-200 flex flex-col justify-between items-start text-left cursor-pointer group hover:-translate-y-0.5 relative overflow-hidden h-[122px] shrink-0"
              >
                {/* Subtle Clinical Mesh Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#7c3aed_0.75px,transparent_0.75px)] [background-size:14px_14px] opacity-10 pointer-events-none" />

                <div className="flex items-center justify-between w-full relative z-10">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-purple-900/20 group-hover:scale-105 transition-transform shrink-0">
                    <CalendarCheck className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-purple-100/90 text-purple-900 border border-purple-300/80 text-[10px] font-mono font-black">
                    {completedTokens.length} Done
                  </span>
                </div>

                <div className="flex items-end justify-between w-full relative z-10 pt-1.5">
                  <div className="space-y-0.5 min-w-0 flex-1 pr-1.5">
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-purple-800 transition-colors leading-snug truncate">
                      Today's History
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                      Bookings & visit log
                    </p>
                  </div>
                  <div className="w-6 h-6 rounded-lg bg-white text-slate-700 border border-purple-200 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 flex items-center justify-center transition-all shadow-2xs shrink-0">
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </button>

              {/* 4. Print OPD Roster (Medical Amber & Warm Sand) */}
              <button
                onClick={handlePrintRoster}
                className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-100/50 border border-amber-200/90 hover:border-amber-400 shadow-2xs hover:shadow-md hover:shadow-amber-900/10 transition-all duration-200 flex flex-col justify-between items-start text-left cursor-pointer group hover:-translate-y-0.5 relative overflow-hidden h-[122px] shrink-0"
              >
                {/* Subtle Clinical Mesh Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#d97706_0.75px,transparent_0.75px)] [background-size:14px_14px] opacity-10 pointer-events-none" />

                <div className="flex items-center justify-between w-full relative z-10">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-md shadow-amber-900/20 group-hover:scale-105 transition-transform shrink-0">
                    <Printer className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-100/90 text-amber-900 border border-amber-300/80 text-[10px] font-mono font-black">
                    PDF / Print
                  </span>
                </div>

                <div className="flex items-end justify-between w-full relative z-10 pt-1.5">
                  <div className="space-y-0.5 min-w-0 flex-1 pr-1.5">
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-amber-800 transition-colors leading-snug truncate">
                      Print OPD Roster
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                      Token schedule
                    </p>
                  </div>
                  <div className="w-6 h-6 rounded-lg bg-white text-slate-700 border border-amber-200 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600 flex items-center justify-center transition-all shadow-2xs shrink-0">
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
                {currentStaff?.name || receptionistProfile.name || 'Front Desk Staff'} (Desk A-1)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          OPD OPERATIONAL CONSOLE: STREAM TAB BAR
          Switch between: Physician Cabins, Waiting Hall Queue, Pre-Booked Arrivals
      ══════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-[69px] z-20 bg-[#F8FAFB]/95 backdrop-blur-md py-3 -mx-1 px-1 transition-all flex justify-center">
        <div className="inline-flex items-center p-1.5 bg-white rounded-full border border-slate-200/90 shadow-md shadow-slate-200/60 max-w-full overflow-x-auto no-scrollbar gap-1.5 ring-1 ring-slate-100">
          {/* Tab 1: Physician Cabins */}
          <button
            type="button"
            onClick={() => setActiveOperationsTab('cabins')}
            className={`px-5 py-2.5 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeOperationsTab === 'cabins'
                ? 'bg-gradient-to-r from-[#0B5A54] to-teal-800 text-white shadow-md shadow-teal-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
            }`}
          >
            <Stethoscope className={`w-4 h-4 ${activeOperationsTab === 'cabins' ? 'text-teal-200' : 'text-[#0B5A54]'}`} />
            <span>Physician Cabins</span>
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                activeOperationsTab === 'cabins'
                  ? 'bg-white/20 text-white border-white/30'
                  : 'bg-teal-50 text-[#0B5A54] border-teal-200'
              }`}
            >
              {cabinTelemetry.inSessionCount > 0 ? `${cabinTelemetry.inSessionCount} In Session` : `${cabinTelemetry.totalCabins} Cabins`}
            </span>
          </button>

          {/* Tab 2: Waiting Hall Queue */}
          <button
            type="button"
            onClick={() => setActiveOperationsTab('queue')}
            className={`px-5 py-2.5 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeOperationsTab === 'queue'
                ? 'bg-gradient-to-r from-[#0B5A54] to-teal-800 text-white shadow-md shadow-teal-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
            }`}
          >
            <Clock className={`w-4 h-4 ${activeOperationsTab === 'queue' ? 'text-teal-200' : 'text-amber-600'}`} />
            <span>Waiting Hall Queue</span>
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                activeOperationsTab === 'queue'
                  ? 'bg-white/20 text-white border-white/30'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {waitingTokens.length} Waiting
            </span>
          </button>

          {/* Tab 3: Pre-Booked Online */}
          <button
            type="button"
            onClick={() => setActiveOperationsTab('prebooked')}
            className={`px-5 py-2.5 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeOperationsTab === 'prebooked'
                ? 'bg-gradient-to-r from-[#0B5A54] to-teal-800 text-white shadow-md shadow-teal-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
            }`}
          >
            <Smartphone className={`w-4 h-4 ${activeOperationsTab === 'prebooked' ? 'text-teal-200' : 'text-purple-600'}`} />
            <span>Pre-Booked Arrivals</span>
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                activeOperationsTab === 'prebooked'
                  ? 'bg-white/20 text-white border-white/30'
                  : pendingOnlineArrivals.length > 0
                  ? 'bg-purple-100 text-purple-900 border-purple-300 animate-pulse'
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              }`}
            >
              {pendingOnlineArrivals.length > 0 ? `${pendingOnlineArrivals.length} Awaiting` : `${onlineTokens.length}`}
            </span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3.5 PRE-BOOKED ONLINE APPOINTMENTS & EXPECTED ARRIVALS
      ══════════════════════════════════════════════════════════════════ */}
      {activeOperationsTab === 'prebooked' && (
      <div className="w-full bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="space-y-1">
            <h2 className="text-base sm:text-xl font-black text-slate-900 font-heading flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-purple-600" />
              Pre-Booked Online Appointments
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                {onlineTokens.length} Scheduled Today
              </span>
              {pendingOnlineArrivals.length > 0 && (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {pendingOnlineArrivals.length} Awaiting Check-In
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Appointments booked via the patient app for this hospital. When patients arrive at the reception desk, click &ldquo;Check In Patient&rdquo; to add them to the live consultation queue.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {/* Filter Pills */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setOnlineArrivalFilter('all')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  onlineArrivalFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All ({onlineTokens.length})
              </button>
              <button
                onClick={() => setOnlineArrivalFilter('awaiting')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  onlineArrivalFilter === 'awaiting'
                    ? 'bg-white text-amber-800 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Awaiting ({pendingOnlineArrivals.length})
              </button>
              <button
                onClick={() => setOnlineArrivalFilter('checked_in')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  onlineArrivalFilter === 'checked_in'
                    ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Checked-In ({onlineTokens.length - pendingOnlineArrivals.length})
              </button>
            </div>

            <button
              onClick={() => onNavigateTab?.('bookings')}
              className="text-xs font-extrabold text-[#0B5A54] hover:underline flex items-center gap-1 cursor-pointer shrink-0 bg-teal-50/60 hover:bg-teal-50 px-3.5 py-2 rounded-xl border border-teal-200/80 transition-all"
            >
              <span>Full Bookings Roster</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {filteredOnlineArrivals.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Smartphone className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              {onlineTokens.length === 0
                ? 'No online appointments booked for today yet.'
                : 'No appointments match the selected filter.'}
            </p>
            <p className="text-xs text-slate-400">
              When patients book consultations in the CarePulse app, their slots will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredOnlineArrivals.map((item) => {
              const isCheckedIn = !!item.isCheckedIn || item.status === 'Checked In';
              const isInConsultation = item.status === 'In Consultation';
              const isDone = item.status === 'Completed';
              const isPending = !isCheckedIn && !isInConsultation && !isDone;
              const isCheckingIn = checkingInId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl bg-white border transition-all flex flex-col justify-between gap-3.5 group relative overflow-hidden ${
                    isPending
                      ? 'border-purple-200/90 hover:border-purple-400 hover:shadow-md'
                      : isCheckedIn
                      ? 'border-emerald-200/90 hover:border-emerald-400 hover:shadow-md'
                      : 'border-slate-200/90'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header: Ticket & Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
                          {item.ticketNumber}
                        </span>
                        {item.tokenNumber && isCheckedIn && (
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-teal-50 text-[#0B5A54] border border-teal-200">
                            {item.tokenNumber}
                          </span>
                        )}
                        {item.patientCode && (
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
                            {item.patientCode}
                          </span>
                        )}
                      </div>

                      {isPending ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Awaiting Check-In
                        </span>
                      ) : isCheckedIn ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Checked In
                        </span>
                      ) : isInConsultation ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0B5A54] border border-teal-200 text-[11px] font-bold">
                          In Cabin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                          Completed
                        </span>
                      )}
                    </div>

                    {/* Patient Details */}
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-purple-900 transition-colors truncate">
                        {item.patientName}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        {item.patientPhone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {item.patientPhone}
                          </span>
                        )}
                        {item.age && (
                          <span className="text-[10.5px] bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                            {item.age}y
                          </span>
                        )}
                        {item.bloodGroup && (
                          <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 rounded font-bold">
                            {item.bloodGroup}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Doctor & Slot Info */}
                    <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-100 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-700 font-medium">
                        <span className="flex items-center gap-1.5 truncate">
                          <Stethoscope className="w-3.5 h-3.5 text-[#0B5A54] shrink-0" />
                          <strong className="text-slate-900">{item.doctorName}</strong>
                        </span>
                        <span className="text-[10.5px] text-slate-400 shrink-0">
                          {item.doctorSpecialty}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[11px] font-mono pt-1 border-t border-slate-200/60">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {item.timeSlot}
                        </span>
                        <span className="text-slate-400">
                          {item.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    {isPending ? (
                      <button
                        disabled={isCheckingIn}
                        onClick={() => handleCheckInPatient(item)}
                        className="w-full py-2 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isCheckingIn ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Checking in...</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Check In Patient</span>
                          </>
                        )}
                      </button>
                    ) : isCheckedIn ? (
                      <div className="w-full flex items-center justify-between text-xs text-[#0B5A54] bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200">
                        <span className="flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0B5A54]" />
                          In Live Queue
                        </span>
                        <span className="font-mono text-[11px] text-teal-700">
                          {item.effectiveQueueTime ? `Slot: ${item.effectiveQueueTime}` : 'Checked In'}
                        </span>
                      </div>
                    ) : (
                      <div className="w-full text-center text-xs text-slate-500 py-1 font-medium">
                        Consultation {item.status}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          4. WAITING HALL QUEUE STREAM (FULL PAGE WIDTH)
      ══════════════════════════════════════════════════════════════════ */}
      {activeOperationsTab === 'queue' && (
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
                    {item.patientCode && (
                      <span className="px-2 py-0.5 bg-teal-50 text-teal-800 font-mono font-bold text-[10px] rounded-lg border border-teal-200">
                        {item.patientCode}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.status === 'Checked In' && (
                      <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Checked In</span>
                      </span>
                    )}
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      isWalkIn(item.type)
                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}>
                      {isWalkIn(item.type) ? 'Walk-In' : 'Online'}
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
      )}

      {/* ══════════════════════════════════════════════════════════════════
          5. PHYSICIAN CABIN STATUS & LIVE TELEMETRY CONSOLE
          ULTRA-PREMIUM MEDICAL COMMAND CENTER & ROOM PRESENCE
      ══════════════════════════════════════════════════════════════════ */}
      {activeOperationsTab === 'cabins' && (
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6 relative overflow-hidden">
        {/* Subtle Ambient Decorative Gradient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-100/30 via-emerald-100/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        {/* ── Section Header with Telemetry Beacon, View Toggles & Actions ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0B5A54] to-teal-700 text-white flex items-center justify-center shadow-lg shadow-teal-900/15 shrink-0 ring-4 ring-teal-50">
              <Stethoscope className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 font-heading tracking-tight">
                  Physician Cabin Status & Telemetry
                </h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black uppercase tracking-wider shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Presence Console
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5 max-w-2xl">
                Real-time room occupancy, clinician duty presence, active in-cabin patient encounters, and waiting load across OPD wings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-auto shrink-0 flex-wrap">
            {/* View Mode Toggle: Grid vs Table */}
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setCabinViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  cabinViewMode === 'grid'
                    ? 'bg-white text-[#0B5A54] shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setCabinViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  cabinViewMode === 'table'
                    ? 'bg-white text-[#0B5A54] shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table Telemetry Board"
              >
                <ListFilter className="w-4 h-4" />
                <span className="hidden sm:inline">Board</span>
              </button>
            </div>

            <button
              onClick={() => onNavigateTab?.('doctors')}
              className="px-4 py-2 bg-slate-50 hover:bg-teal-50 text-[#0B5A54] hover:text-[#084540] border border-slate-200 hover:border-teal-300 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Manage Doctors & Slots</span>
            </button>
          </div>
        </div>

        {/* ── High-Level Telemetry 4-Metric Bar ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
          <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Cabins</span>
              <p className="text-xl font-black text-slate-900 font-mono">{cabinTelemetry.totalCabins}</p>
              <p className="text-[11px] text-slate-500 font-medium">Configured Rooms</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white text-slate-700 border border-slate-200 flex items-center justify-center shadow-2xs">
              <DoorOpen className="w-4 h-4 text-slate-600" />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">In Consultation</span>
              <p className="text-xl font-black text-emerald-800 font-mono">{cabinTelemetry.inSessionCount}</p>
              <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active In-Cabin
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-2xs">
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#0B5A54]">Cabin Ready</span>
              <p className="text-xl font-black text-[#0B5A54] font-mono">{cabinTelemetry.readyCount}</p>
              <p className="text-[11px] text-teal-700 font-medium">Available for Intake</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white text-[#0B5A54] border border-teal-200 flex items-center justify-center shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-[#0B5A54]" />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Waiting Load</span>
              <p className="text-xl font-black text-amber-800 font-mono">{cabinTelemetry.totalQueuedPatients}</p>
              <p className="text-[11px] text-amber-700 font-bold">Patients in Queue</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white text-amber-700 border border-amber-200 flex items-center justify-center shadow-2xs">
              <Users className="w-4 h-4 text-amber-600" />
            </div>
          </div>
        </div>

        {/* ── Filter Bar, Floor Selector & Search Console ── */}
        <div className="space-y-3 relative z-10">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/70">
              <button
                type="button"
                onClick={() => setCabinStatusFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  cabinStatusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Cabins ({cabinTelemetry.totalCabins})
              </button>
              <button
                type="button"
                onClick={() => setCabinStatusFilter('in_session')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  cabinStatusFilter === 'in_session'
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-emerald-700 hover:bg-white/60'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cabinStatusFilter === 'in_session' ? 'bg-white' : 'bg-emerald-500'}`} />
                <span>In Session ({cabinTelemetry.inSessionCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setCabinStatusFilter('ready')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  cabinStatusFilter === 'ready'
                    ? 'bg-[#0B5A54] text-white shadow-xs font-black'
                    : 'text-teal-800 hover:bg-white/60'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cabinStatusFilter === 'ready' ? 'bg-white' : 'bg-teal-500'}`} />
                <span>On-Duty • Ready ({cabinTelemetry.readyCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setCabinStatusFilter('offline')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  cabinStatusFilter === 'offline'
                    ? 'bg-slate-700 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cabinStatusFilter === 'offline' ? 'bg-white' : 'bg-slate-400'}`} />
                <span>Off-Duty ({cabinTelemetry.offDutyCount})</span>
              </button>
            </div>

            {/* Floor Filter & Search Bar */}
            <div className="flex items-center gap-2.5 flex-1 lg:max-w-xl">
              {/* Floor Dropdown */}
              <div className="relative shrink-0">
                <select
                  value={cabinFloorFilter}
                  onChange={(e) => setCabinFloorFilter(e.target.value)}
                  className="text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-2xs appearance-none"
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

              {/* Wide Search Input with Clear Button */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search doctor name, cabin, specialty, or department..."
                  value={cabinSearchQuery}
                  onChange={(e) => setCabinSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 text-xs font-medium rounded-xl border border-slate-200/90 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/70 hover:bg-white transition-all shadow-2xs"
                />
                {cabinSearchQuery && (
                  <button
                    onClick={() => setCabinSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Content: Empty State, Grid View or Table View ── */}
        {filteredCabinDoctors.length === 0 ? (
          <div className="p-12 text-center bg-slate-50/70 rounded-3xl border border-dashed border-slate-200 space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-base font-black text-slate-700">No physician cabins match your criteria</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting the floor, duty status filter, or search keywords to view other consultation rooms.
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
        ) : cabinViewMode === 'table' ? (
          /* ── High-Density Hospital Central Telemetry Table ── */
          <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-mono uppercase text-[10px] tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Cabin Room</th>
                  <th className="py-3.5 px-4 font-bold">Attending Clinician</th>
                  <th className="py-3.5 px-4 font-bold">Duty Status</th>
                  <th className="py-3.5 px-4 font-bold">Current In-Cabin Encounter</th>
                  <th className="py-3.5 px-4 font-bold">Queue Load</th>
                  <th className="py-3.5 px-4 font-bold text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCabinDoctors.map((doctor) => {
                  const activeConsultation = inConsultationTokens.find((t) => t.doctorId === doctor.id);
                  const docWaitingTokens = waitingTokens.filter((t) => t.doctorId === doctor.id);
                  const nextWaiting = docWaitingTokens[0];
                  const isBusy = !!activeConsultation;

                  return (
                    <tr key={doctor.id} className="hover:bg-teal-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <DoorOpen className="w-4 h-4 text-[#0B5A54]" />
                          <span>{doctor.roomNumber || 'Cabin 101'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <DoctorAvatar
                            photo={doctor.photo}
                            name={doctor.name}
                            specialty={doctor.specialty}
                            size="sm"
                            status={doctor.isAvailable ? 'active' : 'offline'}
                          />
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm">{doctor.name}</div>
                            <div className="text-[11px] text-teal-800 font-bold">{doctor.specialty}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isBusy ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            In Session
                          </span>
                        ) : doctor.isAvailable ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 text-[#0B5A54] border border-teal-200 text-[10px] font-black uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                            On-Duty
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase">
                            Off-Duty
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isBusy && activeConsultation ? (
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 bg-teal-100 text-teal-900 font-mono rounded text-[10px]">
                                {activeConsultation.tokenNumber}
                              </span>
                              <span>{activeConsultation.patientName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">Slot: {activeConsultation.timeSlot}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Room Free / Idle</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-lg font-mono font-bold text-[11px] ${
                            docWaitingTokens.length > 0 ? 'bg-[#0B5A54] text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {docWaitingTokens.length} Queued
                          </span>
                          {nextWaiting && (
                            <span className="text-[11px] text-slate-600 font-medium">
                              Next: <strong className="text-slate-900">{nextWaiting.tokenNumber}</strong>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {docWaitingTokens.length > 0 && doctor.isAvailable ? (
                          <button
                            onClick={() => handleCallNext(doctor.id)}
                            className="px-3 py-1.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-[11px] rounded-xl transition-all cursor-pointer shadow-xs inline-flex items-center gap-1 hover:scale-105 active:scale-95"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Call Next</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setInspectingCabinDoctor(doctor)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                          >
                            Inspect
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Modern Executive Multi-Column Cabin Cards Grid ── */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {filteredCabinDoctors.map((doctor) => {
              const activeConsultation = inConsultationTokens.find((t) => t.doctorId === doctor.id);
              const docWaitingTokens = waitingTokens.filter((t) => t.doctorId === doctor.id);
              const nextWaiting = docWaitingTokens[0];
              const isBusy = !!activeConsultation;

              return (
                <div
                  key={doctor.id}
                  className={`group rounded-3xl p-5 sm:p-6 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between space-y-4 hover:shadow-xl hover:-translate-y-1 ${
                    isBusy
                      ? 'bg-gradient-to-b from-teal-50/50 via-white to-white border-teal-300/90 shadow-xs'
                      : doctor.isAvailable
                      ? 'bg-white border-slate-200/90 hover:border-teal-300 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200/90 opacity-90 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  {/* Top Ambient Status Accent Bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      isBusy
                        ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400'
                        : doctor.isAvailable
                        ? 'bg-gradient-to-r from-[#0B5A54] to-teal-400'
                        : 'bg-slate-300'
                    }`}
                  />

                  {/* Top Header: Cabin Room Pill & Live State Badge */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200/80 text-slate-800 text-xs font-black font-mono">
                      <DoorOpen className="w-3.5 h-3.5 text-[#0B5A54]" />
                      <span>{doctor.roomNumber || 'Cabin 101'}</span>
                    </div>

                    {/* Status Beacon Badge */}
                    <div className="shrink-0">
                      {isBusy ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black uppercase tracking-wider shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          In Session
                        </span>
                      ) : doctor.isAvailable ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#0B5A54] border border-teal-200 text-[11px] font-black uppercase tracking-wider">
                          <span className="w-2 h-2 rounded-full bg-teal-500" />
                          On-Duty • Ready
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
                  <div className="flex items-start gap-3.5 pt-1">
                    <DoctorAvatar
                      photo={doctor.photo}
                      name={doctor.name}
                      specialty={doctor.specialty}
                      size="md"
                      status={doctor.isAvailable ? 'active' : 'offline'}
                    />

                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                        {doctor.name}
                      </h3>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-[#0B5A54] bg-teal-50/90 px-2.5 py-0.5 rounded-lg border border-teal-200/80">
                          {doctor.specialty}
                        </span>
                        {doctor.experienceYears && (
                          <span className="text-[11px] font-semibold text-slate-500">
                            {doctor.experienceYears}y exp
                          </span>
                        )}
                      </div>

                      {doctor.department && (
                        <p className="text-[11px] text-slate-400 font-medium">
                          Dept: {doctor.department}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ── Live In-Cabin Presence & Telemetry Center ── */}
                  {isBusy && activeConsultation ? (
                    /* Case 1: Active Encounter Ongoing in Room */
                    <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200/90 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-black uppercase text-[#0B5A54] tracking-wider flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                          In-Cabin Patient
                        </span>
                        <span className="px-2.5 py-0.5 bg-[#0B5A54] text-white rounded-lg font-mono text-[11px] font-black shadow-2xs">
                          {activeConsultation.tokenNumber}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-sm text-slate-900 truncate">
                            {activeConsultation.patientName}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            Slot: {activeConsultation.timeSlot} • {activeConsultation.type}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCompleteCurrentConsultation(activeConsultation.id, activeConsultation.patientName)}
                          className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 hover:text-emerald-900 border border-emerald-200 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer shadow-2xs shrink-0 flex items-center gap-1 hover:scale-105 active:scale-95"
                          title="Mark consultation completed"
                        >
                          <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                          <span>Done</span>
                        </button>
                      </div>
                    </div>
                  ) : doctor.isAvailable && nextWaiting ? (
                    /* Case 2: Cabin Ready & Next Patient Waiting */
                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          Next Patient in Line
                        </span>
                        <span className="px-2.5 py-0.5 bg-amber-600 text-white rounded-lg font-mono text-[11px] font-black shadow-2xs">
                          {nextWaiting.tokenNumber}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-sm text-slate-900 truncate">
                            {nextWaiting.patientName}
                          </h4>
                          <p className="text-[11px] text-amber-800 font-semibold truncate mt-0.5">
                            Waiting in Hall • Slot: {nextWaiting.timeSlot}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAdmitNextPatient(doctor.id)}
                          className="px-2.5 py-1.5 bg-[#0B5A54] hover:bg-[#084540] text-white rounded-xl text-[11px] font-extrabold transition-all cursor-pointer shadow-2xs shrink-0 flex items-center gap-1 hover:scale-105 active:scale-95"
                          title="Admit patient directly into cabin"
                        >
                          <span>Admit In</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : doctor.isAvailable ? (
                    /* Case 3: Cabin Ready & Queue Clear */
                    <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#0B5A54] flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-800">Cabin Ready & Idle</p>
                        <p className="text-[11px] text-slate-400 font-medium">Queue is clear for this doctor</p>
                      </div>
                    </div>
                  ) : (
                    /* Case 4: Doctor Off-Duty / Stepped Out */
                    <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/80 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-black text-rose-900">
                        <Clock className="w-3.5 h-3.5 text-rose-600" />
                        <span>Doctor Stepped Out / Break</span>
                      </div>
                      <p className="text-xs text-rose-800 font-bold truncate">
                        "{doctor.availabilityReason || 'Stepped out for rounds'}"
                      </p>
                      {doctor.unavailableUntil && (
                        <p className="text-[11px] text-rose-700 font-medium">
                          Expected back: <strong className="font-bold">{doctor.unavailableUntil}</strong>
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── Live Queue Count & Load Gauge ── */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/90 border border-slate-200/70">
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="w-4 h-4 text-slate-500 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-xs font-extrabold text-slate-800 block">
                            Queue Load:
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {docWaitingTokens.length > 0 ? `~${docWaitingTokens.length * 10} mins wait time` : 'No backlog'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2.5 py-1 rounded-xl font-mono text-xs font-black ${
                            docWaitingTokens.length > 0
                              ? 'bg-[#0B5A54] text-white shadow-2xs'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {docWaitingTokens.length} {docWaitingTokens.length === 1 ? 'Patient' : 'Patients'}
                        </span>

                        {docWaitingTokens.length > 0 && (
                          <button
                            onClick={() => setInspectingCabinDoctor(doctor)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
                            title="Inspect full queue for this cabin"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Card Footer: Primary Action & Live Duty Indicator ── */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Primary Summon Button */}
                    {docWaitingTokens.length > 0 && doctor.isAvailable ? (
                      <button
                        onClick={() => handleCallNext(doctor.id)}
                        className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#0B5A54] to-teal-800 hover:from-[#084540] hover:to-[#0B5A54] text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95"
                      >
                        <Volume2 className="w-4 h-4 text-teal-200" />
                        <span>Call Next ({nextWaiting?.tokenNumber})</span>
                      </button>
                    ) : doctor.isAvailable ? (
                      <button
                        onClick={onOpenNewAppointment}
                        className="flex-1 py-2.5 px-3 bg-teal-50 hover:bg-teal-100 text-[#0B5A54] border border-teal-200 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Assign Walk-In</span>
                      </button>
                    ) : (
                      <div className="flex-1 py-2 text-center text-xs text-slate-400 font-bold bg-slate-100 rounded-xl">
                        Shift Paused
                      </div>
                    )}

                    {/* Live Duty Presence Chip */}
                    <div
                      className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 shadow-2xs select-none ${
                        isBusy
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : doctor.isAvailable
                          ? 'bg-teal-50 text-[#0B5A54] border border-teal-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {isBusy ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>In Session</span>
                        </>
                      ) : doctor.isAvailable ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Off-Duty</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* ── Inspect Cabin Queue Modal ── */}
      {inspectingCabinDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0B5A54] border border-teal-200 flex items-center justify-center">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {inspectingCabinDoctor.roomNumber || 'Cabin 101'} Queue
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dr. {inspectingCabinDoctor.name} • {inspectingCabinDoctor.specialty}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingCabinDoctor(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {waitingTokens.filter((t) => t.doctorId === inspectingCabinDoctor.id).length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">Queue is clear!</p>
                  <p className="text-xs text-slate-400">No patients waiting for this cabin.</p>
                </div>
              ) : (
                waitingTokens
                  .filter((t) => t.doctorId === inspectingCabinDoctor.id)
                  .map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-teal-50/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-xs text-[#0B5A54] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              {item.tokenNumber}
                            </span>
                            <span className="font-extrabold text-slate-900 text-xs truncate">
                              {item.patientName}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Slot: {item.timeSlot} • {item.type}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            handleCallNext(inspectingCabinDoctor.id);
                            setInspectingCabinDoctor(null);
                          }}
                          className="px-2.5 py-1.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Call</span>
                        </button>
                        <button
                          onClick={async () => {
                            await updateTokenStatus(item.id, 'In Consultation');
                            onShowToast?.(`Token ${item.tokenNumber} admitted into consultation.`);
                            setInspectingCabinDoctor(null);
                          }}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          Admit
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setInspectingCabinDoctor(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistDashboard;
