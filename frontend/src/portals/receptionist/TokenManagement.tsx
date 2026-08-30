import React, { useState, useMemo, useRef } from 'react';
import {
  Ticket,
  Clock,
  Search,
  Volume2,
  Smartphone,
  UserPlus,
  CheckCircle2,
  UserCheck,
  Phone,
  Stethoscope,
  Users,
  Layers,
  Check,
  Radio,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lock,
  Ban,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { TokenQueueItem } from '../../types/receptionist';

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

// Voice announcement using Web Speech API
const speakAnnouncement = (text: string) => {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  } catch {
    // Ignore speech errors if unsupported
  }
};

export const TokenManagement: React.FC<TokenManagementProps> = ({
  onShowToast,
  onOpenNewAppointment,
}) => {
  const tokens = useStaffStore((s) => s.tokens);
  const doctors = useStaffStore((s) => s.doctors);
  const callNextToken = useStaffStore((s) => s.callNextToken);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);
  const updateSlotCapacity = useStaffStore((s) => s.updateSlotCapacity);

  // Filter States
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('ALL');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Waiting' | 'In Consultation' | 'Completed'>('ALL');
  const [lastAnnouncedToken, setLastAnnouncedToken] = useState<string | null>(null);

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
        return matchesDoc && matchesSlot;
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
  }, [availableTimeSlots, tokens, selectedDoctorId, activeDoctor]);

  // Filtered Tokens
  const filteredTokens = useMemo(() => {
    return tokens.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (statusFilter === 'ALL' && t.status === 'Cancelled') return false;

      const matchesDoc = selectedDoctorId === 'ALL' || t.doctorId === selectedDoctorId;
      if (!matchesDoc) return false;

      const matchesSlot = selectedTimeSlot === 'ALL' || isSlotMatching(t.timeSlot, selectedTimeSlot);
      if (!matchesSlot) return false;

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
    });
  }, [tokens, selectedDoctorId, selectedTimeSlot, statusFilter, searchQuery]);

  // Split into Online & Offline Queues
  const onlineBookedPatients = useMemo(() => filteredTokens.filter(isOnlineToken), [filteredTokens]);
  const offlineBookedPatients = useMemo(() => filteredTokens.filter((t) => !isOnlineToken(t)), [filteredTokens]);

  // Active in consultation list
  const currentlyInConsultation = useMemo(() => {
    return tokens.filter((t) => {
      const matchesDoc = selectedDoctorId === 'ALL' || t.doctorId === selectedDoctorId;
      const matchesSlot = selectedTimeSlot === 'ALL' || isSlotMatching(t.timeSlot, selectedTimeSlot);
      return t.status === 'In Consultation' && matchesDoc && matchesSlot;
    });
  }, [tokens, selectedDoctorId, selectedTimeSlot]);

  // Waiting tokens in view
  const waitingTokensInView = useMemo(() => {
    return filteredTokens.filter((t) => t.status === 'Waiting');
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

  // Handler to Block / Unblock the current active slot timing
  const handleToggleBlockCurrentSlot = async () => {
    if (selectedTimeSlot === 'ALL') {
      onShowToast?.('Please select a specific time slot first to Block or Unblock it.');
      return;
    }

    const nextAvail = isCurrentSlotBlocked; // toggling: if currently blocked (true), next state is available (true)

    if (selectedDoctorId !== 'ALL' && activeDoctor) {
      const matchingSlot = activeDoctor.slotCapacities?.find((s) => s.timeSlot === selectedTimeSlot);
      const maxSeats = matchingSlot?.maxSeats || 6;
      await updateSlotCapacity(activeDoctor.id, selectedTimeSlot, maxSeats, nextAvail);
      onShowToast?.(
        nextAvail
          ? `🟢 Slot "${selectedTimeSlot}" is UNBLOCKED and visible in Patient App.`
          : `🚫 Slot "${selectedTimeSlot}" is now BLOCKED and hidden from Patient App.`
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
          ? `🟢 Slot "${selectedTimeSlot}" is UNBLOCKED for all doctors.`
          : `🚫 Slot "${selectedTimeSlot}" is now BLOCKED for all doctors and hidden from Patient App.`
      );
    }
  };

  // Call Next Token handler
  const handleCallNext = async (doctorId?: string) => {
    const targetToken = doctorId
      ? waitingTokensInView.find((t) => t.doctorId === doctorId)
      : waitingTokensInView[0];

    if (!targetToken) {
      onShowToast?.('No waiting patients found in this queue selection.');
      return;
    }

    await callNextToken(doctorId);
    setLastAnnouncedToken(targetToken.tokenNumber);
    playHospitalChime();

    const doc = doctors.find((d) => d.id === targetToken.doctorId);
    const room = doc?.roomNumber || 'Consultation Cabin';
    const speechText = `Token ${targetToken.tokenNumber.replace('#', '')}. ${targetToken.patientName}. Please proceed to ${room}.`;
    speakAnnouncement(speechText);

    onShowToast?.(`📢 Calling next: ${targetToken.tokenNumber} (${targetToken.patientName}) -> ${room}`);
  };

  // Audio broadcast summons
  const handleAnnounceChime = (token: TokenQueueItem) => {
    setLastAnnouncedToken(token.tokenNumber);
    playHospitalChime();

    const doc = doctors.find((d) => d.id === token.doctorId);
    const room = doc?.roomNumber || 'Consultation Cabin';
    const speechText = `Attention please. Token ${token.tokenNumber.replace('#', '')}. ${token.patientName}. Please proceed to ${room}.`;
    speakAnnouncement(speechText);

    onShowToast?.(`📢 Audio broadcast summons: Token ${token.tokenNumber} (${token.patientName}) -> ${room}`);
  };

  // Render a Single Patient Card
  const renderPatientCard = (token: TokenQueueItem, isOnline: boolean) => {
    const isConsulting = token.status === 'In Consultation';
    const isCompleted = token.status === 'Completed';
    const doc = doctors.find((d) => d.id === token.doctorId);

    return (
      <div
        key={token.id}
        className={`group p-4 sm:p-4.5 rounded-2xl border transition-all duration-200 relative shadow-2xs hover:shadow-sm ${
          isConsulting
            ? 'bg-gradient-to-br from-teal-50/95 via-white to-emerald-50/60 border-teal-400 ring-2 ring-teal-500/20 shadow-teal-500/10'
            : isCompleted
            ? 'bg-slate-50/80 border-slate-200/90 opacity-75'
            : isOnline
            ? 'bg-white hover:bg-purple-50/15 border-slate-200/90 hover:border-purple-300'
            : 'bg-white hover:bg-amber-50/15 border-slate-200/90 hover:border-amber-300'
        }`}
      >
        {/* Card Header Bar */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`px-2.5 py-0.5 rounded-lg font-mono text-xs font-black tracking-wide ${
                isOnline
                  ? 'bg-purple-100/90 text-purple-950 border border-purple-300/80'
                  : 'bg-amber-100/90 text-amber-950 border border-amber-300/80'
              }`}
            >
              {token.tokenNumber}
            </span>

            <span
              className={`inline-flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isOnline
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
                  <UserPlus className="w-2.5 h-2.5 text-amber-600" />
                  <span>Walk-In</span>
                </>
              )}
            </span>

            {token.ticketNumber && (
              <span className="text-[9.5px] font-mono text-slate-400 font-semibold">
                {token.ticketNumber}
              </span>
            )}
          </div>

          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border transition-all ${
              isConsulting
                ? 'bg-teal-100 text-[#0B5A54] border-teal-300 animate-pulse'
                : isCompleted
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {isConsulting ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping" />
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
        </div>

        {/* Patient Profile Details */}
        <div className="mt-3 flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0 font-heading ${
              isOnline
                ? 'bg-gradient-to-br from-purple-700 to-indigo-800'
                : 'bg-gradient-to-br from-[#0B5A54] to-teal-800'
            }`}
          >
            {token.patientName.charAt(0)}
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-black text-slate-900 text-xs sm:text-sm truncate group-hover:text-[#0B5A54] transition-colors">
                {token.patientName}
              </h4>
              {token.age && (
                <span className="text-[9.5px] font-extrabold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded shrink-0 border border-slate-200/80">
                  {token.age}y
                </span>
              )}
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

              {token.arrivalTime && (
                <span className="text-[10px] text-slate-400 font-normal">
                  • Arrived: {token.arrivalTime}
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

        {/* Doctor & Location Info */}
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

          <div className="flex items-center gap-1 shrink-0 bg-slate-100 px-2 py-0.5 rounded text-slate-700 text-[10.5px] font-bold">
            <Clock className="w-2.5 h-2.5 text-slate-400" />
            <span className="font-mono">{token.timeSlot}</span>
          </div>
        </div>

        {/* Card Actions */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleAnnounceChime(token)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#0B5A54] text-slate-600 hover:text-white transition-all cursor-pointer shadow-2xs"
              title="Broadcast Audio Chime & Summon Patient"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>

            {!isCompleted && (
              <button
                onClick={() => {
                  updateTokenStatus(token.id, 'Cancelled');
                  onShowToast?.(`Token ${token.tokenNumber} cancelled.`);
                }}
                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10.5px] border border-rose-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {!isConsulting && !isCompleted ? (
              <button
                onClick={() => {
                  updateTokenStatus(token.id, 'In Consultation');
                  playHospitalChime();
                  const speechText = `Token ${token.tokenNumber.replace('#', '')}. ${token.patientName}. Admitted to ${doc?.roomNumber || 'Cabin'}.`;
                  speakAnnouncement(speechText);
                  onShowToast?.(`Token ${token.tokenNumber} admitted to ${doc?.roomNumber || 'Cabin'}.`);
                }}
                className="px-3 py-1 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold rounded-lg text-xs shadow-2xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <UserCheck className="w-3 h-3" />
                <span>Call Patient</span>
              </button>
            ) : isConsulting ? (
              <button
                onClick={() => {
                  updateTokenStatus(token.id, 'Completed');
                  onShowToast?.(`Token ${token.tokenNumber} marked as completed.`);
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs shadow-2xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Complete</span>
              </button>
            ) : (
              <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                ✓ Finished
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-8 text-left w-full max-w-full overflow-x-hidden">
      {/* ══════════════════════════════════════════════════════════════════
          1. TOP COMMAND DECK & SUMMARY HEADER
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#0B5A54] to-teal-700 text-white flex items-center justify-center shadow-sm shrink-0">
              <Ticket className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 font-heading">
                  Live Token & Slot Management Desk
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Synchronized live arrival tokens with split online vs offline lanes and broadcast summons.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <button
              onClick={() => handleCallNext(selectedDoctorId === 'ALL' ? undefined : selectedDoctorId)}
              disabled={waitingTokensInView.length === 0}
              className="px-4 py-2.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Volume2 className="w-3.5 h-3.5 text-teal-200 stroke-[2.5]" />
              <span>Call Next</span>
            </button>

            <button
              onClick={onOpenNewAppointment}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
              <span>+ Walk-In</span>
            </button>
          </div>
        </div>

        {/* ── Active Consultation Live Banner ── */}
        {currentlyInConsultation.length > 0 && (
          <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-teal-500/10 border border-teal-300 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <div>
                <span className="text-[9.5px] font-black uppercase tracking-wider text-[#0B5A54] block">
                  Now In Consultation
                </span>
                <div className="flex flex-wrap items-center gap-1.5 font-bold text-xs text-slate-800 mt-0.5">
                  {currentlyInConsultation.map((c) => (
                    <span
                      key={c.id}
                      className="bg-white px-2.5 py-1 rounded-lg border border-teal-200 font-mono shadow-2xs flex items-center gap-1"
                    >
                      <strong className="text-[#0B5A54] font-black">{c.tokenNumber}</strong>
                      <span className="text-slate-700">{c.patientName}</span>
                      <span className="text-slate-400 text-[10px]">({c.doctorName})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {lastAnnouncedToken && (
              <div className="flex items-center gap-1.5 bg-white/90 px-3 py-1 rounded-lg border border-teal-200/80 shadow-2xs text-[11px] font-bold text-slate-600">
                <Radio className="w-3 h-3 text-[#0B5A54] animate-pulse" />
                <span>
                  Summoned: <strong className="font-mono text-[#0B5A54]">{lastAnnouncedToken}</strong>
                </span>
              </div>
            )}
          </div>
        )}

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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
                selectedDoctorId === 'ALL'
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
                    isSelected
                      ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-xs ring-2 ring-teal-500/20'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9.5px] font-black shrink-0 ${
                      isSelected ? 'bg-teal-300 text-teal-950' : 'bg-teal-50 text-[#0B5A54]'
                    }`}
                  >
                    {doc.name.replace('Dr. ', '').charAt(0)}
                  </div>

                  <span>{doc.name}</span>

                  <span
                    className={`text-[9.5px] px-1.5 py-0.2 rounded font-semibold ${
                      isSelected ? 'bg-teal-800/80 text-teal-100' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {doc.specialty}
                  </span>

                  {docWaitingTokens > 0 && (
                    <span
                      className={`text-[9.5px] font-black px-1.5 py-0.2 rounded-full ${
                        isSelected
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
              className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer min-w-[170px] max-w-[200px] shrink-0 flex flex-col justify-between ${
                selectedTimeSlot === 'ALL'
                  ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-md ring-2 ring-teal-500/25'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      selectedTimeSlot === 'ALL'
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
                  className={`font-mono px-1.5 py-0.2 rounded font-black ${
                    selectedTimeSlot === 'ALL'
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
                  className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer min-w-[170px] max-w-[200px] shrink-0 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-br from-teal-50 via-white to-emerald-50/70 border-teal-500 ring-2 ring-teal-500/30 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          metrics.isBlocked
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
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
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
                      className={`font-black text-xs truncate font-mono ${
                        isSelected ? 'text-[#0B5A54]' : 'text-slate-900'
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
            4. SEARCH & STATUS FILTER TOOLBAR
        ══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
              Filter:
            </span>
            {(['ALL', 'Waiting', 'In Consultation', 'Completed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search patient, phone, #TOK-001..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          5. CURRENT SELECTION OVERVIEW STRIP
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0B5A54] to-slate-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-teal-300 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[10.5px]">
              <span className="font-bold uppercase tracking-wider text-teal-300">Active View:</span>
              <span className="text-white/80 font-semibold truncate">
                {activeDoctor ? activeDoctor.name : 'All Physicians'}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-white font-heading">
              {selectedTimeSlot === 'ALL' ? 'All Scheduled Time Slots' : selectedTimeSlot}
            </h2>
          </div>
        </div>

        {/* Metrics Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
            <span className="text-white/60 font-medium">Total: </span>
            <strong className="font-mono text-white font-black">{filteredTokens.length}</strong>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-400/30 text-purple-200">
            <span className="font-medium">📱 Online: </span>
            <strong className="font-mono text-white font-black">{onlineBookedPatients.length}</strong>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-200">
            <span className="font-medium">🚶 Walk-In: </span>
            <strong className="font-mono text-white font-black">{offlineBookedPatients.length}</strong>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-200">
            <span className="font-medium">⏳ Waiting: </span>
            <strong className="font-mono text-white font-black">{waitingTokensInView.length}</strong>
          </div>

          {/* Block / Unblock Action Button Next to Waiting */}
          {selectedTimeSlot !== 'ALL' ? (
            <button
              onClick={handleToggleBlockCurrentSlot}
              className={`px-3 py-1 rounded-lg font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95 border ${
                isCurrentSlotBlocked
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 ring-2 ring-rose-400/40 animate-pulse'
                  : 'bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 hover:text-white border-rose-400/40'
              }`}
              title={
                isCurrentSlotBlocked
                  ? 'Slot is BLOCKED in Patient App. Click to unblock.'
                  : 'Block this timing slot to hide it from the Patient Booking App.'
              }
            >
              {isCurrentSlotBlocked ? (
                <>
                  <Ban className="w-3.5 h-3.5 text-white" />
                  <span>🚫 Blocked (Unblock)</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-rose-300" />
                  <span>Block Slot</span>
                </>
              )}
            </button>
          ) : (
            <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/40 text-[11px] font-medium hidden sm:flex items-center gap-1">
              <Lock className="w-3 h-3 text-white/30" />
              <span>Select slot to block</span>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          6. SPLIT TWO COLUMNS: ONLINE QUEUE VS OFFLINE WALK-IN QUEUE
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start w-full max-w-full">
        {/* ── COLUMN 1: ONLINE APP BOOKINGS (MOBILE APP QUEUE) ── */}
        <div className="space-y-3 w-full">
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 border border-purple-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-black text-purple-950 font-heading">
                    Online App Bookings
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-black bg-purple-200 text-purple-900 font-mono">
                    50% Split
                  </span>
                </div>
                <p className="text-[11px] text-purple-800/80 font-medium">
                  Pre-scheduled digital appointments via CarePulse Patient App.
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 bg-white text-purple-950 font-mono font-black text-xs rounded-xl border border-purple-200 shadow-2xs shrink-0">
              {onlineBookedPatients.length} Active
            </span>
          </div>

          {/* List of Online Patients */}
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
            <div className="space-y-3">
              {onlineBookedPatients.map((item) => renderPatientCard(item, true))}
            </div>
          )}
        </div>

        {/* ── COLUMN 2: OFFLINE WALK-IN DESK REGISTRATIONS ── */}
        <div className="space-y-3 w-full">
          <div className="bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 border border-amber-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-black text-amber-950 font-heading">
                    Offline Walk-In Desk Queue
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-black bg-amber-200 text-amber-900 font-mono">
                    50% Split
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/80 font-medium">
                  Same-day OPD arrivals registered in-person at front desk.
                </p>
              </div>
            </div>

            <button
              onClick={onOpenNewAppointment}
              className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-950 font-extrabold text-xs rounded-xl border border-amber-300 shadow-2xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>+ Walk-In</span>
            </button>
          </div>

          {/* List of Offline Walk-In Patients */}
          {offlineBookedPatients.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-amber-200 space-y-2 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
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
                <UserPlus className="w-3 h-3" />
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
    </div>
  );
};

export default TokenManagement;
