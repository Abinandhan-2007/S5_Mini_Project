import React, { useState } from 'react';
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
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { TokenQueueItem } from '../../types/receptionist';

interface TokenManagementProps {
  onShowToast?: (msg: string) => void;
  onOpenNewAppointment?: () => void;
}

export const TokenManagement: React.FC<TokenManagementProps> = ({
  onShowToast,
  onOpenNewAppointment,
}) => {
  const tokens = useStaffStore((s) => s.tokens);
  const doctors = useStaffStore((s) => s.doctors);
  const callNextToken = useStaffStore((s) => s.callNextToken);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);

  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastAnnouncedToken, setLastAnnouncedToken] = useState<string | null>(null);

  // Active queue tokens (exclude completed or cancelled)
  const activeQueueTokens = tokens.filter((t) => {
    const isCompletedOrCancelled = t.status === 'Completed' || t.status === 'Cancelled';
    if (isCompletedOrCancelled) return false;

    const matchesDoctor = selectedDoctorFilter === 'ALL' || t.doctorId === selectedDoctorFilter;
    const matchesSearch =
      t.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.patientPhone.includes(searchQuery);

    return matchesDoctor && matchesSearch;
  });

  const onlineQueue = activeQueueTokens.filter(
    (t) => t.type === 'In-Person' || t.type === 'Video Call' || !t.type.includes('Walk-In')
  );
  const offlineQueue = activeQueueTokens.filter((t) => t.type === 'Walk-In');

  const currentlyInConsultation = tokens.filter((t) => t.status === 'In Consultation');
  const waitingTokens = activeQueueTokens.filter((t) => t.status === 'Waiting');

  const handleCallNext = async (doctorId?: string) => {
    const targetToken = doctorId
      ? waitingTokens.find((t) => t.doctorId === doctorId)
      : waitingTokens[0];

    if (!targetToken) {
      onShowToast?.('No waiting patients found in this queue lane.');
      return;
    }

    await callNextToken(doctorId);
    setLastAnnouncedToken(targetToken.tokenNumber);
    onShowToast?.(`Calling next patient: ${targetToken.tokenNumber} (${targetToken.patientName})`);
  };

  const handleAnnounceChime = (token: TokenQueueItem) => {
    setLastAnnouncedToken(token.tokenNumber);
    onShowToast?.(`📢 Audio broadcast chime: Token ${token.tokenNumber} - ${token.patientName}, please proceed to ${doctors.find((d) => d.id === token.doctorId)?.roomNumber || 'Cabin 101'}.`);
  };

  const renderTokenCard = (token: TokenQueueItem, isOnline: boolean) => {
    const isConsulting = token.status === 'In Consultation';
    const doc = doctors.find((d) => d.id === token.doctorId);

    return (
      <div
        key={token.id}
        className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 shadow-2xs space-y-3.5 relative ${isConsulting
            ? 'bg-gradient-to-br from-teal-50/90 via-white to-teal-50/50 border-teal-300 ring-2 ring-teal-500/20 shadow-md'
            : 'bg-white hover:bg-slate-50/70 border-slate-200/90 hover:border-teal-300/80 hover:shadow-xs'
          }`}
      >
        {/* Top Card Bar */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-xl font-mono text-xs font-black shadow-2xs ${isOnline
                  ? 'bg-teal-50 text-[#0B5A54] border border-teal-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
                }`}
            >
              {token.tokenNumber}
            </span>
            <span
              className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${isOnline
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-sky-50 text-sky-700 border-sky-200'
                }`}
            >
              {isOnline ? 'Mobile App' : 'Walk-In'}
            </span>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${isConsulting
                ? 'bg-teal-100 text-[#0B5A54] border-teal-300 animate-pulse'
                : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
          >
            {isConsulting ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping" />
                In Consultation
              </>
            ) : (
              'Waiting in Queue'
            )}
          </span>
        </div>

        {/* Patient Profile */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0B5A54] to-teal-800 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0 font-heading">
            {token.patientName.charAt(0)}
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-black text-slate-900 text-xs sm:text-sm truncate">
                {token.patientName}
              </h4>
              {token.age && (
                <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                  {token.age}y
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-semibold">
              <span className="flex items-center gap-1 font-mono">
                <Phone className="w-3 h-3 text-slate-400" />
                {token.patientPhone}
              </span>
              {token.bloodGroup && (
                <span className="text-[9.5px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 rounded">
                  {token.bloodGroup}
                </span>
              )}
            </div>

            {token.healthIssue && (
              <p className="text-[11px] text-slate-600 italic truncate mt-0.5">
                Note: {token.healthIssue}
              </p>
            )}
          </div>
        </div>

        {/* Doctor & Location Info */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5 min-w-0">
            <Stethoscope className="w-3.5 h-3.5 text-[#0B5A54] shrink-0" />
            <span className="font-bold text-slate-800 truncate text-[11px]">
              {token.doctorName}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-slate-500 text-[11px]">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="font-mono">{token.timeSlot}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleAnnounceChime(token)}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Broadcast Audio Chime for this patient"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                updateTokenStatus(token.id, 'Cancelled');
                onShowToast?.(`Token ${token.tokenNumber} cancelled.`);
              }}
              className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isConsulting ? (
              <button
                onClick={() => {
                  updateTokenStatus(token.id, 'In Consultation');
                  onShowToast?.(`Token ${token.tokenNumber} admitted to ${doc?.roomNumber || 'Cabin'}.`);
                }}
                className="px-3 py-1.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold rounded-xl text-xs shadow-xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Call Patient</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  updateTokenStatus(token.id, 'Completed');
                  onShowToast?.(`Token ${token.tokenNumber} marked as completed.`);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Complete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12 text-left">
      {/* ══════════════════════════════════════════════════════════════════
          1. LIVE TOKEN COMMAND DECK & AUDIO CALL BROADCASTER
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-5 w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-teal-50 border border-teal-200 text-[#0B5A54] flex items-center justify-center shadow-xs shrink-0">
                <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 font-heading truncate">
                  Live OPD Queue & Token Desk
                </h1>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Synchronized live arrival tokens with split online vs offline lanes and broadcast summons.
                </p>
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => handleCallNext(selectedDoctorFilter === 'ALL' ? undefined : selectedDoctorFilter)}
              disabled={waitingTokens.length === 0}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 sm:py-3 bg-[#0B5A54] hover:bg-[#084540] text-white font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Volume2 className="w-4 h-4 text-teal-200 stroke-[2.5]" />
              <span>Call Next Token</span>
            </button>

            <button
              onClick={onOpenNewAppointment}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 sm:py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-slate-900 stroke-[2.5]" />
              <span>+ Walk-In</span>
            </button>
          </div>
        </div>

        {/* Currently Calling Banner */}
        {currentlyInConsultation.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/5 border border-teal-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0B5A54] block">
                  Now In Consultation
                </span>
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800 mt-0.5">
                  {currentlyInConsultation.map((c) => (
                    <span
                      key={c.id}
                      className="bg-white px-2.5 py-1 rounded-xl border border-teal-200 font-mono shadow-2xs"
                    >
                      <strong className="text-[#0B5A54]">{c.tokenNumber}</strong>: {c.patientName} ({c.doctorName})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {lastAnnouncedToken && (
              <span className="text-[11px] font-bold text-slate-500 bg-white/80 px-3 py-1 rounded-xl border border-slate-200">
                Last Summoned: <span className="font-mono text-[#0B5A54]">{lastAnnouncedToken}</span>
              </span>
            )}
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
              Doctor Filter:
            </span>
            <button
              onClick={() => setSelectedDoctorFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${selectedDoctorFilter === 'ALL'
                  ? 'bg-[#0B5A54] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              All Physicians ({doctors.length})
            </button>

            {doctors.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDoctorFilter(doc.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${selectedDoctorFilter === doc.id
                    ? 'bg-[#0B5A54] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                {doc.name.replace('Dr. ', '')}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search token # or patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]"
            />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. SPLIT LIVE LANES: ONLINE APP TOKENS VS OFFLINE WALK-INS
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lane 1: Online App Tokens */}
        <div className="space-y-4">
          <div className="bg-purple-50/80 border border-purple-200/80 rounded-3xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-purple-950 font-heading">
                  Online App Queue
                </h3>
                <p className="text-xs text-purple-800 font-medium">
                  Pre-scheduled digital appointments via CarePulse Patient App.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-white text-purple-900 font-mono font-black text-xs rounded-full border border-purple-200 shadow-2xs">
              {onlineQueue.length} Active
            </span>
          </div>

          {onlineQueue.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">No active online app tokens in queue.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {onlineQueue.map((item) => renderTokenCard(item, true))}
            </div>
          )}
        </div>

        {/* Lane 2: Offline Walk-In Registrations */}
        <div className="space-y-4">
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-3xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-2xs">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-amber-950 font-heading">
                  Offline Walk-In Desk Queue
                </h3>
                <p className="text-xs text-amber-800 font-medium">
                  Same-day OPD arrivals registered in-person at the front desk.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-white text-amber-900 font-mono font-black text-xs rounded-full border border-amber-200 shadow-2xs">
              {offlineQueue.length} Active
            </span>
          </div>

          {offlineQueue.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">No active walk-in tokens in queue.</p>
              <button
                onClick={onOpenNewAppointment}
                className="text-xs font-bold text-[#0B5A54] hover:underline"
              >
                + Register Walk-In Patient
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {offlineQueue.map((item) => renderTokenCard(item, false))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TokenManagement;
