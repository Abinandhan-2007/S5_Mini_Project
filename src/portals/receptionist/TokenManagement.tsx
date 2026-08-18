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
  Sparkles,
  ChevronRight,
} from 'lucide-react';

import { useStaffStore } from '../../store/staffStore';
import type { TokenQueueItem } from '../../types/receptionist';

export const TokenManagement: React.FC = () => {
  const tokens = useStaffStore((s) => s.tokens);
  const doctors = useStaffStore((s) => s.doctors);
  const callNextToken = useStaffStore((s) => s.callNextToken);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);

  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // FILTER OUT COMPLETED & CANCELLED TOKENS FROM ACTIVE QUEUES
  const activeQueueTokens = tokens.filter((t) => {
    const isCompletedOrCancelled = t.status === 'Completed' || t.status === 'Cancelled';
    if (isCompletedOrCancelled) return false; // Remove details if completed

    const matchesDoctor = selectedDoctorFilter === 'ALL' || t.doctorId === selectedDoctorFilter;
    const matchesSearch =
      t.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.patientPhone.includes(searchQuery);

    return matchesDoctor && matchesSearch;
  });

  // SPLIT INTO ONLINE AND OFFLINE QUEUES
  const onlineQueue = activeQueueTokens.filter(
    (t) => t.type === 'In-Person' || t.type === 'Video Call' || !t.type.includes('Walk-In')
  );

  const offlineQueue = activeQueueTokens.filter((t) => t.type === 'Walk-In');

  const activeInConsultation = tokens.find((t) => t.status === 'In Consultation');
  const waitingCount = activeQueueTokens.filter((t) => t.status === 'Waiting').length;

  const handleCallNext = async () => {
    await callNextToken(selectedDoctorFilter === 'ALL' ? undefined : selectedDoctorFilter);
  };

  const renderTokenCard = (token: TokenQueueItem, isOnline: boolean) => {
    const isConsulting = token.status === 'In Consultation';
    const doc = doctors.find((d) => d.id === token.doctorId);

    return (
      <div
        key={token.id}
        className={`p-5 rounded-3xl border transition-all duration-200 shadow-xs space-y-4 relative ${
          isConsulting
            ? 'bg-gradient-to-br from-amber-50/90 to-amber-100/60 border-amber-300 ring-2 ring-amber-400/40'
            : 'bg-white hover:bg-slate-50/70 border-slate-200/90 hover:border-teal-300/80 hover:shadow-md'
        }`}
      >
        {/* Top Card Bar: Token Badge & Status Indicator */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`px-3.5 py-1.5 rounded-2xl font-mono text-xs font-black shadow-2xs ${
                isOnline
                  ? 'bg-teal-50 text-[#0B5A54] border border-teal-200/90'
                  : 'bg-amber-50 text-amber-900 border border-amber-200/90'
              }`}
            >
              {token.tokenNumber}
            </span>
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                isOnline
                  ? 'bg-teal-100/60 text-[#0B5A54] border-teal-200'
                  : 'bg-amber-100/60 text-amber-800 border-amber-200'
              }`}
            >
              {isOnline ? '📱 Online App' : '🏢 Offline Walk-In'}
            </span>
          </div>

          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-extrabold border shadow-2xs ${
              isConsulting
                ? 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
                : 'bg-sky-50 text-sky-900 border-sky-200'
            }`}
          >
            {isConsulting && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
            <span>{isConsulting ? 'In Consultation' : 'Waiting in Queue'}</span>
          </span>
        </div>

        {/* Patient Profile Details */}
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0B5A54] to-teal-700 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
            {token.patientName.charAt(0)}
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-black text-slate-900 text-sm">{token.patientName}</h4>
              {token.age && (
                <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {token.age} yrs
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                <span className="font-mono text-slate-600">{token.patientPhone}</span>
              </span>
              {token.bloodGroup && (
                <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md">
                  {token.bloodGroup}
                </span>
              )}
            </div>

            {token.healthIssue && (
              <div className="text-[11px] font-medium text-slate-600 italic bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/70 mt-1">
                Symptoms: {token.healthIssue}
              </div>
            )}
          </div>
        </div>

        {/* Doctor & Location Info */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Stethoscope className="w-3.5 h-3.5 text-[#0B5A54] shrink-0" />
            <div className="truncate">
              <span className="font-bold text-slate-900 block truncate">{token.doctorName}</span>
              <span className="text-[10px] text-[#0B5A54] font-semibold block truncate">{token.doctorSpecialty}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <div className="truncate">
              <span className="font-bold text-slate-800 block truncate">{token.timeSlot}</span>
              <span className="text-[10px] text-slate-400 font-semibold block truncate">{doc?.roomNumber || 'Cabin 101'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Cancel, Call Patient, Mark Completed */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={() => updateTokenStatus(token.id, 'Cancelled')}
            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors cursor-pointer"
            title="Cancel Appointment"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {!isConsulting ? (
              <button
                onClick={() => updateTokenStatus(token.id, 'In Consultation')}
                className="px-4 py-2 bg-gradient-to-r from-[#0B5A54] to-teal-700 hover:from-[#084540] hover:to-[#0B5A54] text-white font-extrabold rounded-xl text-xs shadow-xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-teal-200" />
                <span>Call Patient</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => updateTokenStatus(token.id, 'Completed')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Mark Completed</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-16 text-left max-w-[1600px] mx-auto px-1 sm:px-2">
      {/* EXECUTIVE CONTROL HERO BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0B5A54] via-teal-800 to-[#084540] rounded-3xl p-7 sm:p-8 text-white shadow-xl shadow-teal-950/10 border border-teal-700/50">
        {/* Background Blur Shapes */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-48 -bottom-16 w-56 h-56 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold tracking-wider text-teal-100 uppercase">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>Live Dual-Queue Controller</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white flex items-center gap-2.5">
              <Ticket className="w-7 h-7 text-teal-200" />
              <span>Live Token Queue Management</span>
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 font-medium leading-relaxed">
              Separated 2-column live queue for Online Patient App tokens and Offline Walk-In registrations.
            </p>
          </div>

          {/* Active Call Control Box */}
          <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 flex items-center gap-5 shrink-0">
            <div>
              <span className="text-[10px] font-black uppercase text-teal-200 tracking-wider block">Current Active Call</span>
              <div className="text-2xl font-black font-mono text-white mt-0.5">
                {activeInConsultation ? activeInConsultation.tokenNumber : 'No Token Called'}
              </div>
              <p className="text-xs text-teal-100 truncate mt-0.5 font-medium max-w-[180px]">
                {activeInConsultation
                  ? `${activeInConsultation.patientName} (${activeInConsultation.doctorName})`
                  : `${waitingCount} Patients Waiting`}
              </p>
            </div>

            <button
              onClick={handleCallNext}
              disabled={waitingCount === 0}
              className="px-5 py-3.5 bg-white text-[#0B5A54] hover:bg-teal-50 font-black rounded-2xl shadow-lg transition-all flex items-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer hover:scale-[1.02] shrink-0"
            >
              <Volume2 className="w-4 h-4 text-[#0B5A54]" />
              <span>Call Next</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTER AND SEARCH TOOLBAR */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4.5 h-4.5 text-[#0B5A54] absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[2.5]" />
            <input
              type="text"
              placeholder="Search by Token # (#TOK-001), Patient Name, Phone, or Ticket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5A54] text-slate-900 placeholder:text-slate-400 transition-all shadow-2xs"
            />
          </div>

          {/* Doctor Filter Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-bold text-slate-700">
              <Stethoscope className="w-4 h-4 text-[#0B5A54]" />
              <select
                value={selectedDoctorFilter}
                onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                className="bg-transparent text-xs font-bold focus:outline-none text-slate-900 cursor-pointer pr-1"
              >
                <option value="ALL">All Doctors Queue</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialty})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN DUAL QUEUE BOARD: ONLINE VS OFFLINE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* COLUMN 1: ONLINE APP TOKENS QUEUE */}
        <div className="space-y-4">
          {/* Column Header */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0B5A54] shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 font-heading">
                  Online App Queue ({onlineQueue.length})
                </h3>
                <p className="text-xs text-slate-500 font-medium">Booked via Patient Mobile App</p>
              </div>
            </div>

            <span className="px-3 py-1 bg-teal-50 text-[#0B5A54] border border-teal-200 font-extrabold text-xs rounded-full">
              {onlineQueue.filter((t) => t.status === 'Waiting').length} Waiting
            </span>
          </div>

          {/* Tokens List */}
          <div className="space-y-4">
            {onlineQueue.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0B5A54] mx-auto">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">No Online Tokens in Queue</h4>
                <p className="text-xs text-slate-400 font-medium">
                  Completed tokens are automatically removed from the live queue.
                </p>
              </div>
            ) : (
              onlineQueue.map((token) => renderTokenCard(token, true))
            )}
          </div>
        </div>

        {/* COLUMN 2: OFFLINE WALK-IN TOKENS QUEUE */}
        <div className="space-y-4">
          {/* Column Header */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-900 shrink-0">
                <UserPlus className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 font-heading">
                  Offline Walk-In Queue ({offlineQueue.length})
                </h3>
                <p className="text-xs text-slate-500 font-medium">Registered at Reception Desk</p>
              </div>
            </div>

            <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 font-extrabold text-xs rounded-full">
              {offlineQueue.filter((t) => t.status === 'Waiting').length} Waiting
            </span>
          </div>

          {/* Tokens List */}
          <div className="space-y-4">
            {offlineQueue.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-800 mx-auto">
                  <UserPlus className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">No Offline Tokens in Queue</h4>
                <p className="text-xs text-slate-400 font-medium">
                  Completed walk-in tokens are automatically removed from the live queue.
                </p>
              </div>
            ) : (
              offlineQueue.map((token) => renderTokenCard(token, false))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
