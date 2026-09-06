import React, { useState, useMemo, useRef } from 'react';
import {
  Ticket,
  Clock,
  Search,
  Smartphone,
  UserPlus,
  CheckCircle2,
  UserCheck,
  Phone,
  Stethoscope,
  Users,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Building2,
  Calendar,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { TokenQueueItem } from '../../types/receptionist';
import { speakText } from '../../lib/speechUtils';

interface TokenManagementProps {
  onShowToast?: (msg: string) => void;
  onOpenNewAppointment?: () => void;
}

// Play pleasant hospital announcement chime using Web Audio API
const playHospitalChime = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.22);
    gain2.gain.setValueAtTime(0.22, now + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.22);
    osc2.stop(now + 0.65);
  } catch {
    // Silently continue if audio context is blocked
  }
};

// Voice announcement using CarePulse TTS Engine
const speakAnnouncement = (text: string) => {
  speakText(text, { rate: 0.95, pitch: 1.05 });
};

export type TokenSortOption =
  | 'TIME_ASC'
  | 'TIME_DESC'
  | 'DATE_DESC'
  | 'DATE_ASC'
  | 'TOKEN_ASC'
  | 'NAME_ASC';

const getTodayISODate = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeDateToISO = (rawDate?: string): string => {
  if (!rawDate) return getTodayISODate(0);
  if (rawDate === 'Today') return getTodayISODate(0);
  if (rawDate === 'Tomorrow') return getTodayISODate(1);
  if (rawDate === 'Yesterday') return getTodayISODate(-1);

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return rawDate;
  }

  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch { }

  return rawDate;
};

const formatDisplayDate = (isoOrFormatted?: string): string => {
  if (!isoOrFormatted) return 'Today';
  const iso = normalizeDateToISO(isoOrFormatted);
  const todayIso = getTodayISODate(0);
  const tomorrowIso = getTodayISODate(1);
  const yesterdayIso = getTodayISODate(-1);

  if (iso === todayIso) return 'Today';
  if (iso === tomorrowIso) return 'Tomorrow';
  if (iso === yesterdayIso) return 'Yesterday';

  try {
    const d = new Date(iso + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  } catch { }
  return isoOrFormatted;
};

export const TokenManagement: React.FC<TokenManagementProps> = ({
  onShowToast,
  onOpenNewAppointment,
}) => {
  const tokens = useStaffStore((s) => s.tokens);
  const doctors = useStaffStore((s) => s.doctors);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);
  const updateSlotCapacity = useStaffStore((s) => s.updateSlotCapacity);

  // Filter & Sort States
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('ALL');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Waiting' | 'Checked In' | 'In Consultation' | 'Completed'>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(getTodayISODate(0));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<TokenSortOption>('TIME_ASC');
  const [activeDivision, setActiveDivision] = useState<'ONLINE' | 'OFFLINE' | 'ALL'>('ONLINE');
  const [showSlotToggleConfirm, setShowSlotToggleConfirm] = useState(false);
  const [tokenToCancel, setTokenToCancel] = useState<TokenQueueItem | null>(null);

  // Horizontal scroll refs for slick navigation
  const doctorScrollRef = useRef<HTMLDivElement>(null);
  const slotScrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) ref.current.scrollBy({ left: -240, behavior: 'smooth' });
  };
  const scrollRight = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) ref.current.scrollBy({ left: 240, behavior: 'smooth' });
  };

  // Active selected doctor object
  const activeDoctor = useMemo(() => {
    return selectedDoctorId === 'ALL' ? null : doctors.find((d) => d.id === selectedDoctorId) || null;
  }, [doctors, selectedDoctorId]);

  // Standard fallback slots
  const standardSlots = useMemo(
    () => [
      '09:00 AM - 10:00 AM',
      '10:00 AM - 11:00 AM',
      '11:00 AM - 12:00 PM',
      '02:00 PM - 03:00 PM',
      '03:00 PM - 04:00 PM',
      '04:00 PM - 05:00 PM',
    ],
    []
  );

  // Compute all available time slots dynamically based on doctor selectivity
  const availableTimeSlots = useMemo(() => {
    const slotSet = new Set<string>();

    if (selectedDoctorId === 'ALL') {
      doctors.forEach((doc) => {
        doc.slotCapacities?.forEach((s) => {
          if (s.timeSlot) slotSet.add(s.timeSlot);
        });
      });
      tokens.forEach((t) => {
        if (t.timeSlot) slotSet.add(t.timeSlot);
      });
      if (slotSet.size === 0) {
        standardSlots.forEach((s) => slotSet.add(s));
      }
    } else {
      const doc = doctors.find((d) => d.id === selectedDoctorId);
      if (doc?.slotCapacities && doc.slotCapacities.length > 0) {
        doc.slotCapacities.forEach((s) => {
          if (s.timeSlot) slotSet.add(s.timeSlot);
        });
      }
      tokens
        .filter((t) => t.doctorId === selectedDoctorId)
        .forEach((t) => {
          if (t.timeSlot) slotSet.add(t.timeSlot);
        });
      if (slotSet.size === 0) {
        standardSlots.forEach((s) => slotSet.add(s));
      }
    }

    return Array.from(slotSet);
  }, [selectedDoctorId, doctors, tokens, standardSlots]);

  // Resilient slot matching helper
  const isSlotMatching = (tokenSlot: string | undefined, targetSlot: string) => {
    if (!tokenSlot || !targetSlot) return false;
    if (targetSlot === 'ALL') return true;
    if (tokenSlot.trim().toLowerCase() === targetSlot.trim().toLowerCase()) return true;
    const cleanToken = tokenSlot.toLowerCase().replace(/\s+/g, '');
    const cleanTarget = targetSlot.toLowerCase().replace(/\s+/g, '');
    return cleanToken.includes(cleanTarget) || cleanTarget.includes(cleanToken);
  };

  // Helper to distinguish Online App vs Offline Walk-In
  const isOnlineToken = (token: TokenQueueItem) => {
    const tType = (token.type || '').toLowerCase();
    return (
      !tType.includes('walk-in') &&
      (tType.includes('in-person') || tType.includes('video') || tType.includes('online') || tType === '')
    );
  };

  // Metrics for each slot
  const slotMetrics = useMemo(() => {
    const map = new Map<
      string,
      { total: number; online: number; offline: number; inConsultation: number; maxSeats: number; isBlocked?: boolean }
    >();

    availableTimeSlots.forEach((slotTime) => {
      const relevantTokens = tokens.filter((t) => {
        if (t.status === 'Cancelled') return false;
        const matchesDoc = selectedDoctorId === 'ALL' || t.doctorId === selectedDoctorId;
        const matchesSlot = isSlotMatching(t.timeSlot, slotTime);
        const matchesDate = selectedDateFilter === 'ALL' || normalizeDateToISO(t.date) === selectedDateFilter;
        return matchesDoc && matchesSlot && matchesDate;
      });

      const onlineCount = relevantTokens.filter(isOnlineToken).length;
      const offlineCount = relevantTokens.filter((t) => !isOnlineToken(t)).length;
      const inConsultCount = relevantTokens.filter((t) => t.status === 'In Consultation').length;

      let slotCap = 6;
      let isBlocked = false;
      if (selectedDoctorId !== 'ALL' && activeDoctor?.slotCapacities) {
        const matchingDocSlot = activeDoctor.slotCapacities.find((s) => s.timeSlot === slotTime);
        if (matchingDocSlot?.maxSeats) slotCap = matchingDocSlot.maxSeats;
        if (matchingDocSlot?.isAvailable === false) isBlocked = true;
      }

      map.set(slotTime, {
        total: relevantTokens.length,
        online: onlineCount,
        offline: offlineCount,
        inConsultation: inConsultCount,
        maxSeats: slotCap,
        isBlocked,
      });
    });

    return map;
  }, [availableTimeSlots, tokens, selectedDoctorId, selectedDateFilter, activeDoctor]);

  // Filtered & Sorted Tokens
  const filteredTokens = useMemo(() => {
    return tokens
      .filter((t) => {
        if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
        if (statusFilter === 'ALL' && t.status === 'Cancelled') return false;

        const matchesDoc = selectedDoctorId === 'ALL' || t.doctorId === selectedDoctorId;
        if (!matchesDoc) return false;

        const matchesSlot = selectedTimeSlot === 'ALL' || isSlotMatching(t.timeSlot, selectedTimeSlot);
        if (!matchesSlot) return false;

        // Date matching (defaults to Today, or ALL)
        const itemIsoDate = normalizeDateToISO(t.date);
        const matchesDate = selectedDateFilter === 'ALL' || itemIsoDate === selectedDateFilter;
        if (!matchesDate) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const numMatch = (t.tokenNumber || '').toLowerCase().includes(q);
          const nameMatch = (t.patientName || '').toLowerCase().includes(q);
          const ticketMatch = (t.ticketNumber || '').toLowerCase().includes(q);
          const phoneMatch = (t.patientPhone || '').includes(q);
          const docMatch = (t.doctorName || '').toLowerCase().includes(q);
          if (!numMatch && !nameMatch && !ticketMatch && !phoneMatch && !docMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'DATE_DESC') {
          const dateComp = normalizeDateToISO(b.date).localeCompare(normalizeDateToISO(a.date));
          if (dateComp !== 0) return dateComp;
          return a.timeSlot.localeCompare(b.timeSlot);
        }
        if (sortBy === 'DATE_ASC') {
          const dateComp = normalizeDateToISO(a.date).localeCompare(normalizeDateToISO(b.date));
          if (dateComp !== 0) return dateComp;
          return a.timeSlot.localeCompare(b.timeSlot);
        }
        if (sortBy === 'TIME_DESC') {
          return b.timeSlot.localeCompare(a.timeSlot);
        }
        if (sortBy === 'TOKEN_ASC') {
          return a.tokenNumber.localeCompare(b.tokenNumber);
        }
        if (sortBy === 'NAME_ASC') {
          return a.patientName.localeCompare(b.patientName);
        }
        // Default TIME_ASC
        return a.timeSlot.localeCompare(b.timeSlot);
      });
  }, [tokens, selectedDoctorId, selectedTimeSlot, statusFilter, selectedDateFilter, sortBy, searchQuery]);

  // Split into Online & Offline Queues
  const onlineBookedPatients = useMemo(() => filteredTokens.filter(isOnlineToken), [filteredTokens]);
  const offlineBookedPatients = useMemo(() => filteredTokens.filter((t) => !isOnlineToken(t)), [filteredTokens]);

  // Waiting or Checked In tokens in view
  const waitingTokensInView = useMemo(() => {
    return filteredTokens.filter((t) => t.status === 'Waiting' || t.status === 'Checked In');
  }, [filteredTokens]);

  // Check if the currently active selected slot timing is blocked in Patient App
  const isCurrentSlotBlocked = useMemo(() => {
    if (selectedTimeSlot === 'ALL') return false;
    if (selectedDoctorId !== 'ALL' && activeDoctor?.slotCapacities) {
      const matching = activeDoctor.slotCapacities.find((s) => s.timeSlot === selectedTimeSlot);
      return matching?.isAvailable === false;
    }
    const docsWithSlot = doctors.filter((d) =>
      d.slotCapacities?.some((s) => s.timeSlot === selectedTimeSlot)
    );
    return (
      docsWithSlot.length > 0 &&
      docsWithSlot.some(
        (d) => d.slotCapacities?.find((s) => s.timeSlot === selectedTimeSlot)?.isAvailable === false
      )
    );
  }, [selectedTimeSlot, selectedDoctorId, activeDoctor, doctors]);

  // Handler to prompt warning before toggling slot availability
  const handleToggleBlockCurrentSlot = () => {
    if (selectedTimeSlot === 'ALL') {
      onShowToast?.('Please select a specific time slot first to toggle availability.');
      return;
    }
    setShowSlotToggleConfirm(true);
  };

  // Execution handler called after confirming the warning modal
  const executeToggleBlockCurrentSlot = async () => {
    const nextAvail = isCurrentSlotBlocked; // toggling: if currently blocked (true), next state is available (true)

    if (selectedDoctorId !== 'ALL' && activeDoctor) {
      const matchingSlot = activeDoctor.slotCapacities?.find((s) => s.timeSlot === selectedTimeSlot);
      const maxSeats = matchingSlot?.maxSeats || 6;
      await updateSlotCapacity(activeDoctor.id, selectedTimeSlot, maxSeats, nextAvail);
      onShowToast?.(
        nextAvail
          ? `🟢 Slot "${selectedTimeSlot}" is now marked as Available.`
          : `🔴 Slot "${selectedTimeSlot}" is now marked as Not Available.`
      );
    } else {
      for (const doc of doctors) {
        const matchingSlot = doc.slotCapacities?.find((s) => s.timeSlot === selectedTimeSlot);
        if (matchingSlot) {
          await updateSlotCapacity(doc.id, selectedTimeSlot, matchingSlot.maxSeats, nextAvail);
        }
      }
      onShowToast?.(
        nextAvail
          ? `🟢 Slot "${selectedTimeSlot}" is now marked as Available for all doctors.`
          : `🔴 Slot "${selectedTimeSlot}" is now marked as Not Available for all doctors.`
      );
    }
  };

  // Render a Single Patient Card
  const renderPatientCard = (token: TokenQueueItem, isOnline: boolean) => {
    const isCheckedIn = token.status === 'Checked In';
    const isConsulting = token.status === 'In Consultation';
    const isCompleted = token.status === 'Completed';
    const doc = doctors.find((d) => d.id === token.doctorId);

    return (
      <div
        key={token.id}
        className={`group p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 relative shadow-2xs hover:shadow-sm w-full min-w-0 ${isCheckedIn
            ? 'bg-gradient-to-br from-teal-50/50 via-white to-emerald-50/30 border-teal-300/80 ring-1 ring-teal-500/20 shadow-xs'
            : isConsulting
              ? 'bg-gradient-to-br from-teal-50/40 via-white to-emerald-50/20 border-teal-300/80'
              : isCompleted
                ? 'bg-slate-50/80 border-slate-200/90 opacity-75'
                : isOnline
                  ? 'bg-white border-slate-200/90 hover:bg-purple-50/15 hover:border-purple-200'
                  : 'bg-white border-slate-200/90 hover:bg-amber-50/15 hover:border-amber-200'
          }`}
      >
        {/* Card Header Bar */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`px-2.5 py-0.5 rounded-lg font-mono text-xs font-black tracking-wide ${isOnline
                  ? 'bg-purple-100/90 text-purple-950 border border-purple-300/80'
                  : 'bg-amber-100/90 text-amber-950 border border-amber-300/80'
                }`}
            >
              {token.tokenNumber}
            </span>

            <span
              className={`inline-flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${isOnline
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
            >
              {isOnline ? (
                <>
                  <Smartphone className="w-2.5 h-2.5 text-purple-600" />
                  <span>Mobile App</span>
                </>
              ) : (
                <>
                  <Building2 className="w-2.5 h-2.5 text-amber-600" />
                  <span>Walk-In</span>
                </>
              )}
            </span>

            {token.ticketNumber && (
              <span className="px-1.5 py-0.5 rounded-md font-mono text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200/80">
                {token.ticketNumber}
              </span>
            )}
          </div>

          {/* Status Badge - Hidden for Walk-Ins when Waiting */}
          {(isOnline || isCheckedIn || isConsulting || isCompleted) && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border transition-all ${isCheckedIn
                  ? 'bg-teal-50 text-[#0B5A54] border-teal-300 shadow-2xs'
                  : isConsulting
                    ? 'bg-teal-100 text-[#0B5A54] border-teal-300'
                    : isCompleted
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
            >
              {isCheckedIn ? (
                <>
                  <UserCheck className="w-3 h-3 text-[#0B5A54]" />
                  <span>Checked In</span>
                </>
              ) : isConsulting ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  <span>In Consultation</span>
                </>
              ) : isCompleted ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Completed</span>
                </>
              ) : (
                <>
                  <Clock className="w-2.5 h-2.5 text-amber-600" />
                  <span>Waiting</span>
                </>
              )}
            </span>
          )}
        </div>

        {/* Patient Profile Details */}
        <div className="mt-3 flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0 font-heading ${isOnline
                ? 'bg-gradient-to-br from-purple-700 to-indigo-800'
                : 'bg-gradient-to-br from-[#0B5A54] to-teal-800'
              }`}
          >
            {token.patientName.charAt(0)}
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h4 className="font-black text-slate-900 text-xs sm:text-sm truncate group-hover:text-[#0B5A54] transition-colors">
                  {token.patientName}
                </h4>
                {token.age && (
                  <span className="text-[9.5px] font-extrabold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded shrink-0 border border-slate-200/80">
                    {token.age}y
                  </span>
                )}
              </div>

              {isCheckedIn && (token.checkInTime || token.arrivalTime) ? (
                <span className="text-[10.5px] text-[#0B5A54] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md font-bold shrink-0 flex items-center gap-1 shadow-2xs">
                  <Clock className="w-2.5 h-2.5 text-[#14B8A6]" />
                  <span>Check-in: {token.checkInTime || token.arrivalTime}</span>
                </span>
              ) : token.arrivalTime ? (
                <span className="text-[10.5px] text-slate-500 font-semibold shrink-0">
                  • Arrived: {token.arrivalTime}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-semibold">
              <span className="flex items-center gap-1 font-mono text-slate-600">
                <Phone className="w-3 h-3 text-slate-400" />
                {token.patientPhone}
              </span>

              {token.bloodGroup && (
                <span className="text-[9.5px] font-black text-rose-700 bg-rose-50 border border-rose-200/80 px-1.5 rounded">
                  {token.bloodGroup}
                </span>
              )}
            </div>

            {token.healthIssue && (
              <p className="text-[10.5px] text-slate-600 truncate mt-0.5">
                <span className="font-bold text-slate-400 mr-1">Note:</span>
                {token.healthIssue}
              </p>
            )}
          </div>
        </div>

        {/* Doctor, Date & Location Info */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 min-w-0">
            <Stethoscope className="w-3.5 h-3.5 text-[#0B5A54] shrink-0" />
            <span className="font-bold text-slate-800 truncate text-[11px]">
              {token.doctorName}
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              • {doc?.roomNumber || 'Cabin 101'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10.5px]">
              <Calendar className="w-3 h-3 text-[#14B8A6]" />
              <span>{formatDisplayDate(token.date)}</span>
            </span>
            <div className="flex items-center gap-1 shrink-0 bg-slate-100 px-2 py-0.5 rounded text-slate-700 text-[10.5px] font-bold">
              <Clock className="w-2.5 h-2.5 text-slate-400" />
              <span className="font-mono">{token.timeSlot}</span>
            </div>
          </div>
        </div>

        {/* Card Actions - Check-in exclusively for Online App Bookings (Walk-ins are already in hospital) */}
        {isOnline ? (
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            {!isCheckedIn && !isConsulting && !isCompleted ? (
              <button
                onClick={() => {
                  const now = new Date();
                  let hours = now.getHours();
                  const minutes = now.getMinutes().toString().padStart(2, '0');
                  const ampm = hours >= 12 ? 'PM' : 'AM';
                  hours = hours % 12;
                  hours = hours ? hours : 12;
                  const checkInTime = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;

                  updateTokenStatus(token.id, 'Checked In', { checkInTime });
                  playHospitalChime();
                  const speechText = `Token ${token.tokenNumber.replace('#', '')}. ${token.patientName} checked in at ${checkInTime}.`;
                  speakAnnouncement(speechText);
                  onShowToast?.(`Patient ${token.patientName} (${token.tokenNumber}) checked in at ${checkInTime}!`);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold rounded-xl text-xs shadow-xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                title="Check In Patient"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Check-in</span>
              </button>
            ) : isCheckedIn ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#0B5A54] bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 shadow-2xs">
                <Check className="w-3.5 h-3.5 text-[#0B5A54]" />
                <span>Checked In</span>
              </span>
            ) : isConsulting ? (
              <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                In Session
              </span>
            ) : (
              <span className="text-[10.5px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
                ✓ Finished
              </span>
            )}
          </div>
        ) : isConsulting ? (
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end">
            <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
              In Session
            </span>
          </div>
        ) : isCompleted ? (
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end">
            <span className="text-[10.5px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
              ✓ Finished
            </span>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-8 text-left w-full max-w-full overflow-x-hidden">
      {/* ══════════════════════════════════════════════════════════════════
          1. TOP COMMAND DECK & SEARCH HEADER
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4 w-full min-w-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#0B5A54] to-teal-700 text-white flex items-center justify-center shadow-sm shrink-0">
              <Ticket className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 font-heading truncate">
                Live Token & Slot Management Desk
              </h1>
              <p className="text-xs text-slate-500 font-medium hidden sm:block truncate">
                Synchronized live arrival tokens with split online vs offline lanes and broadcast summons.
              </p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            2. DOCTOR SELECTIVITY FILTER ROW
        ══════════════════════════════════════════════════════════════════ */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-[#0B5A54]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                1. Select Physician
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => scrollLeft(doctorScrollRef)}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                title="Scroll Left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => scrollRight(doctorScrollRef)}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                title="Scroll Right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={doctorScrollRef}
            className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar w-full"
          >
            {/* All Physicians Pill */}
            <button
              onClick={() => {
                setSelectedDoctorId('ALL');
                setSelectedTimeSlot('ALL');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${selectedDoctorId === 'ALL'
                  ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-xs ring-2 ring-teal-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Physicians ({doctors.length})</span>
            </button>

            {/* Individual Doctor Pills */}
            {doctors.map((doc) => {
              const isSelected = selectedDoctorId === doc.id;
              const docWaitingTokens = tokens.filter(
                (t) => t.doctorId === doc.id && t.status === 'Waiting'
              ).length;

              return (
                <button
                  key={doc.id}
                  onClick={() => {
                    setSelectedDoctorId(doc.id);
                    setSelectedTimeSlot('ALL');
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${isSelected
                      ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-xs ring-2 ring-teal-500/20'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9.5px] font-black shrink-0 ${isSelected ? 'bg-teal-300 text-teal-950' : 'bg-teal-50 text-[#0B5A54]'
                      }`}
                  >
                    {doc.name.replace('Dr. ', '').charAt(0)}
                  </div>

                  <span>{doc.name}</span>

                  <span
                    className={`text-[9.5px] px-1.5 py-0.2 rounded font-semibold ${isSelected ? 'bg-teal-800/80 text-teal-100' : 'bg-slate-100 text-slate-500'
                      }`}
                  >
                    {doc.specialty}
                  </span>

                  {docWaitingTokens > 0 && (
                    <span
                      className={`text-[9.5px] font-black px-1.5 py-0.2 rounded-full ${isSelected
                          ? 'bg-amber-400 text-slate-950 font-mono'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}
                    >
                      {docWaitingTokens}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            3. TIME SLOTS SELECTOR MATRIX (BASED ON DOCTOR SELECTIVITY)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="pt-2.5 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0B5A54]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                2. Select Time Slot {activeDoctor ? `for ${activeDoctor.name}` : '(All Doctors)'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => scrollLeft(slotScrollRef)}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                title="Scroll Left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => scrollRight(slotScrollRef)}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                title="Scroll Right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Time Slots Carousel / Grid Container */}
          <div
            ref={slotScrollRef}
            className="flex items-stretch gap-2.5 overflow-x-auto pb-2 pt-0.5 no-scrollbar w-full"
          >
            {/* "All Time Slots" Master Card */}
            <button
              onClick={() => setSelectedTimeSlot('ALL')}
              className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer min-w-[170px] max-w-[200px] shrink-0 flex flex-col justify-between ${selectedTimeSlot === 'ALL'
                  ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-md ring-2 ring-teal-500/25'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs'
                }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${selectedTimeSlot === 'ALL'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                      }`}
                  >
                    Full Schedule
                  </span>
                  {selectedTimeSlot === 'ALL' && (
                    <Check className="w-3.5 h-3.5 text-teal-200 stroke-[3]" />
                  )}
                </div>
                <h4 className="font-black text-xs truncate">All Time Slots</h4>
              </div>

              <div className="mt-2 pt-1.5 border-t border-white/15 flex items-center justify-between text-[10.5px] font-bold">
                <span className={selectedTimeSlot === 'ALL' ? 'text-teal-100' : 'text-slate-500'}>
                  Total Queue:
                </span>
                <span
                  className={`font-mono px-1.5 py-0.2 rounded font-black ${selectedTimeSlot === 'ALL'
                      ? 'bg-white text-[#0B5A54]'
                      : 'bg-slate-100 text-slate-900'
                    }`}
                >
                  {filteredTokens.length}
                </span>
              </div>
            </button>

            {/* Individual Time Slot Cards */}
            {availableTimeSlots.map((slotTime) => {
              const metrics = slotMetrics.get(slotTime) || {
                total: 0,
                online: 0,
                offline: 0,
                inConsultation: 0,
                maxSeats: 6,
              };
              const isSelected = selectedTimeSlot === slotTime;
              const hasActiveConsultation = metrics.inConsultation > 0;

              return (
                <button
                  key={slotTime}
                  onClick={() => setSelectedTimeSlot(slotTime)}
                  className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer min-w-[170px] max-w-[200px] shrink-0 flex flex-col justify-between ${isSelected
                      ? 'bg-gradient-to-br from-teal-50 via-white to-emerald-50/70 border-teal-500 ring-2 ring-teal-500/30 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs'
                    }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${metrics.isBlocked
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : hasActiveConsultation
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isSelected
                                ? 'bg-[#0B5A54] text-white'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                      >
                        {metrics.isBlocked ? (
                          '🚫 Blocked'
                        ) : hasActiveConsultation ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </>
                        ) : metrics.total > 0 ? (
                          `${metrics.total} Booked`
                        ) : (
                          'Available'
                        )}
                      </span>

                      {isSelected && (
                        <div className="w-3.5 h-3.5 rounded-full bg-[#0B5A54] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <h4
                      className={`font-black text-xs truncate font-mono ${isSelected ? 'text-[#0B5A54]' : 'text-slate-900'
                        }`}
                    >
                      {slotTime}
                    </h4>
                  </div>

                  {/* Split Occupancy Badges */}
                  <div className="mt-2 pt-1.5 border-t border-slate-100 space-y-1">
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                      <span className="inline-flex items-center gap-0.5 text-purple-700 bg-purple-50 px-1 py-0.2 rounded font-bold">
                        <Smartphone className="w-2.5 h-2.5" />
                        <span>{metrics.online} Online</span>
                      </span>

                      <span className="inline-flex items-center gap-0.5 text-amber-800 bg-amber-50 px-1 py-0.2 rounded font-bold">
                        <UserPlus className="w-2.5 h-2.5" />
                        <span>{metrics.offline} Offline</span>
                      </span>
                    </div>

                    {/* Saturation Bar */}
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="bg-purple-500 h-full transition-all"
                        style={{
                          width: `${Math.min(100, (metrics.online / Math.max(1, metrics.maxSeats)) * 100)}%`,
                        }}
                      />
                      <div
                        className="bg-amber-500 h-full transition-all"
                        style={{
                          width: `${Math.min(100, (metrics.offline / Math.max(1, metrics.maxSeats)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            4. DATE FILTER, STATUS FILTER & SORT TOOLBAR
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100 w-full min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-slate-50/80 p-2.5 sm:p-3 rounded-2xl border border-slate-200/70 w-full min-w-0">
            {/* Quick Date Pills + Date Input */}
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#0B5A54] shrink-0 mr-1">
                <Calendar className="w-4 h-4 text-[#14B8A6]" />
                <span>Date:</span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDateFilter(getTodayISODate(0))}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1.5 ${selectedDateFilter === getTodayISODate(0)
                    ? 'bg-[#0B5A54] text-white shadow-xs font-black'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${selectedDateFilter === getTodayISODate(0) ? 'bg-emerald-300' : 'bg-slate-300'}`} />
                <span>Today ({formatDisplayDate(getTodayISODate(0))})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDateFilter(getTodayISODate(1))}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${selectedDateFilter === getTodayISODate(1)
                    ? 'bg-[#0B5A54] text-white shadow-xs font-black'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
              >
                Tomorrow
              </button>

              <button
                type="button"
                onClick={() => setSelectedDateFilter('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${selectedDateFilter === 'ALL'
                    ? 'bg-[#0B5A54] text-white shadow-xs font-black'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
              >
                All Dates
              </button>

              {/* Custom Date Input */}
              <input
                type="date"
                value={selectedDateFilter === 'ALL' ? '' : selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value || 'ALL')}
                className="px-2 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] cursor-pointer shadow-2xs"
                title="Choose custom date"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
              <div className="flex items-center gap-1 text-xs font-black text-slate-600 shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#0B5A54]" />
                <span>Sort:</span>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as TokenSortOption)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] shadow-2xs cursor-pointer"
              >
                <option value="TIME_ASC">Time Slot (Earliest First)</option>
                <option value="TIME_DESC">Time Slot (Latest First)</option>
                <option value="DATE_DESC">Date (Newest First)</option>
                <option value="DATE_ASC">Date (Oldest First)</option>
                <option value="TOKEN_ASC">Token Number (#001 First)</option>
                <option value="NAME_ASC">Patient Name (A → Z)</option>
              </select>

              {selectedDateFilter !== getTodayISODate(0) && (
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter(getTodayISODate(0))}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Reset Date to Today"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter Chips Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar w-full min-w-0">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
              Status:
            </span>
            {(['ALL', 'Waiting', 'Checked In', 'In Consultation', 'Completed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${statusFilter === st
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
              >
                {st === 'ALL' ? 'All Statuses' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          5. CURRENT SELECTION OVERVIEW STRIP
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-[#0B5A54] shrink-0 shadow-2xs">
            <Clock className="w-5 h-5 stroke-[2.2] text-[#0B5A54]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="font-extrabold uppercase tracking-wider text-[#0B5A54]">Active View:</span>
              <span className="text-slate-600 font-bold truncate">
                {activeDoctor ? activeDoctor.name : 'All Physicians'}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 font-heading tracking-tight">
              {selectedTimeSlot === 'ALL' ? 'All Scheduled Time Slots' : selectedTimeSlot}
            </h2>
          </div>
        </div>

        {/* Metrics Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 shadow-2xs">
            <span className="text-slate-400 font-bold text-[11px]">Total: </span>
            <strong className="font-mono text-slate-900 font-black">{filteredTokens.length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200/80 text-purple-800 shadow-2xs">
            <span className="font-bold text-[11px]">📱 Online: </span>
            <strong className="font-mono text-purple-950 font-black">{onlineBookedPatients.length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 shadow-2xs">
            <span className="font-bold text-[11px]">🚶 Walk-In: </span>
            <strong className="font-mono text-amber-950 font-black">{offlineBookedPatients.length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-800 shadow-2xs">
            <span className="font-bold text-[11px]">⏳ Waiting: </span>
            <strong className="font-mono text-teal-950 font-black">{waitingTokensInView.length}</strong>
          </div>

          {/* Available / Not Available Toggle Button */}
          {selectedTimeSlot !== 'ALL' ? (
            <button
              onClick={handleToggleBlockCurrentSlot}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-2xs cursor-pointer hover:scale-[1.02] active:scale-95 border ${!isCurrentSlotBlocked
                  ? 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 hover:bg-rose-100/80 text-rose-800 border-rose-200'
                }`}
              title={
                !isCurrentSlotBlocked
                  ? 'Slot is Currently Available. Click to mark Not Available.'
                  : 'Slot is Currently Not Available. Click to mark Available.'
              }
            >
              <span className="flex items-center gap-1.5 text-[11px] font-bold">
                <span className={`w-2 h-2 rounded-full ${!isCurrentSlotBlocked ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {!isCurrentSlotBlocked ? 'Available' : 'Not Available'}
              </span>

              {/* Interactive Toggle Switch */}
              <div
                className={`w-7 h-4 rounded-full transition-colors relative flex items-center px-0.5 ${!isCurrentSlotBlocked ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out transform ${!isCurrentSlotBlocked ? 'translate-x-3' : 'translate-x-0'
                    }`}
                />
              </div>
            </button>
          ) : (
            <div
              className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-400 text-xs font-semibold hidden sm:flex items-center gap-2"
              title="Select a specific time slot above to toggle availability"
            >
              <span className="text-[11px] font-semibold text-slate-400">Availability</span>
              <div className="w-7 h-4 rounded-full bg-slate-200 relative flex items-center px-0.5 opacity-60">
                <div className="w-3 h-3 rounded-full bg-white shadow-xs" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Division Switcher (Centered) & Search Bar (Right-Aligned) Row */}
        <div className="relative flex flex-col md:flex-row items-center justify-center w-full py-1 min-h-[44px] gap-3">
          {/* Centered Division Switcher Tabs (Matching Reference) */}
          <div className="inline-flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-full border border-slate-200/80 shadow-inner z-10">
            {/* Division 1: Online App Bookings */}
            <button
              type="button"
              onClick={() => setActiveDivision('ONLINE')}
              className={`px-5 sm:px-6 py-2 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${activeDivision === 'ONLINE'
                  ? 'bg-white text-purple-950 shadow-xs font-black scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
            >
              <Smartphone className={`w-3.5 h-3.5 ${activeDivision === 'ONLINE' ? 'text-purple-600' : 'text-slate-500'}`} />
              <span>Online App Bookings</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${activeDivision === 'ONLINE' ? 'bg-purple-100 text-purple-900' : 'bg-slate-200 text-slate-700'
                  }`}
              >
                {onlineBookedPatients.length}
              </span>
            </button>

            {/* Division 2: Offline Walk-In Desk Queue */}
            <button
              type="button"
              onClick={() => setActiveDivision('OFFLINE')}
              className={`px-5 sm:px-6 py-2 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${activeDivision === 'OFFLINE'
                  ? 'bg-white text-amber-950 shadow-xs font-black scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${activeDivision === 'OFFLINE' ? 'text-amber-600' : 'text-slate-500'}`} />
              <span>Offline Walk-In Desk</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${activeDivision === 'OFFLINE' ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-700'
                  }`}
              >
                {offlineBookedPatients.length}
              </span>
            </button>
          </div>

          {/* Search Bar Right-Aligned on Desktop / Stacks on Mobile */}
          <div className="relative w-full sm:w-72 md:w-80 group md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center pointer-events-none group-focus-within:bg-[#0B5A54] group-focus-within:text-white transition-colors duration-200 shadow-2xs">
              <Search className="w-3 h-3" />
            </div>
            <input
              type="text"
              placeholder="Search patient, phone, token (#TOK-001)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-8 py-2 bg-white hover:bg-slate-50/60 focus:bg-white border border-slate-200/90 focus:border-[#0B5A54] rounded-full text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/15 shadow-2xs transition-all duration-200"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-[9px] font-black transition-all cursor-pointer hover:scale-110"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── DIVISION CONTENT DISPLAY ── */}
        {activeDivision === 'ONLINE' && (
          /* ONLINE APP BOOKINGS DIVISION */
          <div className="space-y-3 w-full min-w-0">
            <div className="bg-purple-50/80 border border-purple-200/80 rounded-2xl px-4 py-3 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-purple-950 font-heading truncate">
                    Online App Bookings Division
                  </h3>
                  <p className="text-[11px] text-purple-700 font-medium">
                    Remote digital mobile appointments scheduled by patients.
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 bg-white text-purple-950 font-mono font-black text-xs rounded-xl border border-purple-200 shadow-2xs shrink-0">
                {onlineBookedPatients.length} Active
              </span>
            </div>

            {/* List of Online Patients */}
            {onlineBookedPatients.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-purple-200 space-y-2 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-400 mx-auto flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">No Online App Bookings</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs mx-auto">
                    {selectedTimeSlot !== 'ALL'
                      ? `No digital appointments booked for the ${selectedTimeSlot} slot.`
                      : 'No digital patient appointments in queue.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 w-full min-w-0">
                {onlineBookedPatients.map((item) => renderPatientCard(item, true))}
              </div>
            )}
          </div>
        )}

        {activeDivision === 'OFFLINE' && (
          /* OFFLINE WALK-IN DESK DIVISION */
          <div className="space-y-3 w-full min-w-0">
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl px-4 py-3 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-950 font-heading truncate">
                    Offline Walk-In Desk Division
                  </h3>
                  <p className="text-[11px] text-amber-800 font-medium">
                    Same-day physical arrival queue registered at the front desk.
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 bg-white text-amber-950 font-mono font-black text-xs rounded-xl border border-amber-200 shadow-2xs shrink-0">
                {offlineBookedPatients.length} Active
              </span>
            </div>

            {/* List of Offline Walk-In Patients */}
            {offlineBookedPatients.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-amber-200 space-y-2 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">No Walk-In Patients</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs mx-auto">
                    {selectedTimeSlot !== 'ALL'
                      ? `No in-person walk-in patients registered for the ${selectedTimeSlot} slot.`
                      : 'No same-day walk-in patients registered at the front desk.'}
                  </p>
                </div>
                <button
                  onClick={onOpenNewAppointment}
                  className="mt-1.5 inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold rounded-xl text-xs shadow-2xs transition-all hover:scale-105 cursor-pointer"
                >
                  <Building2 className="w-3 h-3" />
                  <span>Register Walk-In Patient</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 w-full min-w-0">
                {offlineBookedPatients.map((item) => renderPatientCard(item, false))}
              </div>
            )}
          </div>
        )}

        {activeDivision === 'ALL' && (
          /* DUAL SIDE-BY-SIDE VIEW */
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 items-start w-full min-w-0 max-w-full">
            {/* COLUMN 1: ONLINE */}
            <div className="space-y-3 w-full min-w-0">
              <div className="bg-purple-50/80 border border-purple-200/80 rounded-xl px-3.5 py-2.5 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-purple-950 font-heading truncate">
                    Online App Bookings
                  </h3>
                </div>

                <span className="px-2.5 py-1 bg-white text-purple-950 font-mono font-black text-xs rounded-xl border border-purple-200 shadow-2xs shrink-0">
                  {onlineBookedPatients.length} Active
                </span>
              </div>

              {onlineBookedPatients.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-purple-200 space-y-2 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-400 mx-auto flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm">No Online App Bookings</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs mx-auto">
                      {selectedTimeSlot !== 'ALL'
                        ? `No digital appointments booked for the ${selectedTimeSlot} slot.`
                        : 'No digital patient appointments in queue.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 w-full min-w-0">
                  {onlineBookedPatients.map((item) => renderPatientCard(item, true))}
                </div>
              )}
            </div>

            {/* COLUMN 2: OFFLINE WALK-IN */}
            <div className="space-y-3 w-full min-w-0">
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl px-3.5 py-2.5 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-amber-950 font-heading truncate">
                    Offline Walk-In Desk Queue
                  </h3>
                </div>

                <span className="px-2.5 py-1 bg-white text-amber-950 font-mono font-black text-xs rounded-xl border border-amber-200 shadow-2xs shrink-0">
                  {offlineBookedPatients.length} Active
                </span>
              </div>

              {offlineBookedPatients.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-amber-200 space-y-2 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm">No Walk-In Patients</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs mx-auto">
                      {selectedTimeSlot !== 'ALL'
                        ? `No in-person walk-in patients registered for the ${selectedTimeSlot} slot.`
                        : 'No same-day walk-in patients registered at the front desk.'}
                    </p>
                  </div>
                  <button
                    onClick={onOpenNewAppointment}
                    className="mt-1.5 inline-flex items-center gap-1 px-3 py-1.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold rounded-lg text-xs shadow-2xs transition-all hover:scale-105 cursor-pointer"
                  >
                    <Building2 className="w-3 h-3" />
                    <span>Register Walk-In Patient</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {offlineBookedPatients.map((item) => renderPatientCard(item, false))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          7. SLOT AVAILABILITY TOGGLE WARNING MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showSlotToggleConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 text-center animate-in zoom-in-95 duration-200">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-xs border ${!isCurrentSlotBlocked
                  ? 'bg-rose-50 border-rose-200/80 text-rose-600'
                  : 'bg-emerald-50 border-emerald-200/80 text-emerald-600'
                }`}
            >
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 font-heading">
                {!isCurrentSlotBlocked ? 'Mark Slot as Not Available?' : 'Make Slot Available?'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to mark timing slot <strong className="text-slate-900 font-extrabold">{selectedTimeSlot}</strong> {activeDoctor ? `for ${activeDoctor.name}` : 'for all doctors'} as{' '}
                <span className={`font-black ${!isCurrentSlotBlocked ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {!isCurrentSlotBlocked ? 'NOT AVAILABLE' : 'AVAILABLE'}
                </span>.
              </p>
              {!isCurrentSlotBlocked ? (
                <p className="text-[11px] text-rose-600 font-semibold bg-rose-50/80 p-2.5 rounded-xl border border-rose-200/60">
                  ⚠️ Patients will not be able to book appointments for this time slot on the mobile app.
                </p>
              ) : (
                <p className="text-[11px] text-emerald-700 font-semibold bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/60">
                  ✓ Patients will immediately be able to book appointments for this slot on the mobile app.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowSlotToggleConfirm(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowSlotToggleConfirm(false);
                  await executeToggleBlockCurrentSlot();
                }}
                className={`w-full py-3 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all cursor-pointer active:scale-95 ${!isCurrentSlotBlocked
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#0B5A54] hover:bg-[#084540]'
                  }`}
              >
                Confirm {!isCurrentSlotBlocked ? 'Not Available' : 'Available'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          8. TOKEN CANCELLATION WARNING MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {tokenToCancel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 font-heading">
                Cancel Token Appointment?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to cancel token <strong className="text-slate-900 font-extrabold">{tokenToCancel.tokenNumber}</strong> for <strong className="text-slate-900 font-extrabold">{tokenToCancel.patientName}</strong>?
              </p>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-left text-xs space-y-1.5">
                <div className="flex justify-between text-slate-700">
                  <span className="text-slate-500 font-medium">Doctor:</span>
                  <span className="font-bold">{tokenToCancel.doctorName}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="text-slate-500 font-medium">Time Slot:</span>
                  <span className="font-bold font-mono">{tokenToCancel.timeSlot}</span>
                </div>
                {tokenToCancel.ticketNumber && (
                  <div className="flex justify-between text-slate-700">
                    <span className="text-slate-500 font-medium">Ticket ID:</span>
                    <span className="font-bold font-mono text-slate-900">{tokenToCancel.ticketNumber}</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-rose-600 font-semibold bg-rose-50/80 p-2.5 rounded-xl border border-rose-200/60">
                ⚠️ This patient will be removed from the active queue. This action cannot be undone.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setTokenToCancel(null)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs transition-all cursor-pointer"
              >
                Keep Token
              </button>
              <button
                type="button"
                onClick={() => {
                  updateTokenStatus(tokenToCancel.id, 'Cancelled');
                  onShowToast?.(`🔴 Token ${tokenToCancel.tokenNumber} cancelled.`);
                  setTokenToCancel(null);
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all cursor-pointer active:scale-95"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenManagement;
