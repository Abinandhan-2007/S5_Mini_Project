import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Kanban,
  Table as TableIcon,
  ChevronRight,
  Volume2,
  Clock,
  CheckCircle2,
  X,
  SlidersHorizontal,
  XCircle,
  QrCode,
} from 'lucide-react';
import type { TokenQueueItem } from '../../types/receptionist';
import type { TriagePriority } from '../../types/doctor';
import { playCallChime, speakDoctorAnnouncement } from '../../services/consultationService';
import { useStaffStore } from '../../store/staffStore';
import { PatientQrScannerModal } from '../../components/qr/PatientQrScannerModal';
import { Patient360RecordModal } from '../../components/qr/Patient360RecordModal';

export interface DoctorQueueProps {
  queue: TokenQueueItem[];
  onSelectPatient: (patient: TokenQueueItem) => void;
  onCallPatient: (patient: TokenQueueItem) => void;
}

export const DoctorQueue: React.FC<DoctorQueueProps> = ({
  queue,
  onSelectPatient,
  onCallPatient,
}) => {
  const currentStaff = useStaffStore((s) => s.currentStaff);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [slotFilter, setSlotFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [callingTokenId, setCallingTokenId] = useState<string | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [scannedPatientRecord, setScannedPatientRecord] = useState<any>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const handlePatientQrLoaded = (data: any) => {
    setScannedPatientRecord(data);
    setIsDossierOpen(true);
  };

  const handleStartConsultationFromDossier = (patientDto: any) => {
    setIsDossierOpen(false);
    const matched = queue.find(
      (t) =>
        t.patientName.toLowerCase() === patientDto.fullName.toLowerCase() ||
        (patientDto.patientCode && t.tokenNumber.toLowerCase().includes(patientDto.patientCode.toLowerCase()))
    );
    if (matched) {
      onSelectPatient(matched);
    } else {
      onSelectPatient({
        id: patientDto.id || `tok-${Date.now()}`,
        patientId: patientDto.id,
        tokenNumber: patientDto.patientCode || '#PAT-001',
        ticketNumber: patientDto.patientCode || '#PAT-001',
        patientName: patientDto.fullName,
        patientPhone: patientDto.phone || '',
        doctorId: currentStaff?.doctorId || currentStaff?.doctor_id || currentStaff?.id || 'doc-1',
        doctorName: currentStaff?.name || 'Doctor',
        doctorSpecialty: currentStaff?.department || 'General Medicine',
        timeSlot: 'Immediate Consultation',
        status: 'In Consultation',
        type: 'In-Person',
        arrivalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        issueTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        age: patientDto.age,
        bloodGroup: patientDto.bloodGroup,
        healthIssue: patientDto.preExistingConditions || 'Consultation via QR Scan',
      });
    }
  };

  // Extract unique time slots
  const uniqueSlots = useMemo(() => {
    const slots = Array.from(new Set(queue.map((t) => t.timeSlot || '10:00 AM - 11:00 AM')));
    return ['All', ...slots];
  }, [queue]);

  // Derive priority for each token
  const getPriority = (token: TokenQueueItem): TriagePriority => {
    if (token.age && (token.age < 12 || token.age >= 65)) return 'Senior-Child';
    const issue = (token.healthIssue || (token as any).issue || '').toLowerCase();
    if (issue.includes('chest') || issue.includes('breath') || issue.includes('severe') || issue.includes('pain') || issue.includes('emergency')) {
      return 'Urgent';
    }
    return 'Normal';
  };

  // Filtered waiting patients list
  const waitingPatients = useMemo(() => {
    return queue.filter((t) => {
      const isWaiting = t.status === 'Waiting' || t.status === 'Checked In' || (t.status as any) === 'Pending';
      if (!isWaiting) return false;

      const matchSlot = slotFilter === 'All' || (t.timeSlot || '10:00 AM - 11:00 AM') === slotFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        t.patientName?.toLowerCase().includes(q) ||
        (t as any).name?.toLowerCase().includes(q) ||
        t.tokenNumber?.toLowerCase().includes(q) ||
        t.ticketNumber?.toLowerCase().includes(q) ||
        t.healthIssue?.toLowerCase().includes(q);

      return matchSlot && matchQuery;
    });
  }, [queue, slotFilter, searchQuery]);

  // Stats breakdown
  const urgentCount = waitingPatients.filter((p) => getPriority(p) === 'Urgent').length;
  const seniorChildCount = waitingPatients.filter((p) => getPriority(p) === 'Senior-Child').length;
  const normalCount = waitingPatients.length - urgentCount - seniorChildCount;

  // Next up patient (first in line)
  const nextUpPatient = waitingPatients[0] || null;

  const handleCallVoice = (token: TokenQueueItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCallingTokenId(token.id);
    playCallChime();
    const patientName = token.patientName || (token as any).name || 'Patient';
    const room = (currentStaff as any)?.roomNumber || 'Cabin 102';
    speakDoctorAnnouncement(
      `Token ${token.tokenNumber}, ${patientName}, please proceed to ${room}`
    );
    onCallPatient(token);

    setTimeout(() => {
      setCallingTokenId(null);
    }, 3000);
  };

  const handleAcceptPatient = async (patient: TokenQueueItem) => {
    try {
      await updateTokenStatus(patient.id, 'In Consultation');
      onSelectPatient(patient);
    } catch {
      onSelectPatient(patient);
    }
  };

  const handleCancelPatient = async (patient: TokenQueueItem) => {
    try {
      await updateTokenStatus(patient.id, 'Cancelled');
    } catch {}
  };

  return (
    <div className="space-y-5 font-sans max-w-7xl mx-auto">
      
      {/* ── 1. HERO COMMAND & LIVE QUEUE OVERVIEW (PREMIUM LIGHT PALETTE) ── */}
      <div className="bg-gradient-to-br from-white via-teal-50/20 to-slate-50/80 rounded-3xl p-5 sm:p-7 border border-teal-500/20 shadow-sm relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight font-heading text-slate-900">
              Outpatient Waiting Desk & Token Calling
            </h1>
          </div>

          {/* Quick Metrics & Call Master CTA */}
          <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap">
            {/* Stat Pills with Crisp Light Theme */}
            <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs flex items-center gap-4 text-center">
              <div>
                <span className="text-lg sm:text-xl font-mono font-black text-slate-900 block leading-none">
                  {waitingPatients.length}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 block">
                  Total
                </span>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div>
                <span className="text-lg sm:text-xl font-mono font-black text-rose-600 block leading-none">
                  {urgentCount}
                </span>
                <span className="text-[10px] text-rose-700/80 font-bold uppercase tracking-wider mt-1 block">
                  Urgent
                </span>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div>
                <span className="text-lg sm:text-xl font-mono font-black text-[#0B5A54] block leading-none">
                  {normalCount}
                </span>
                <span className="text-[10px] text-teal-800/80 font-bold uppercase tracking-wider mt-1 block">
                  Standard
                </span>
              </div>
            </div>

            {/* Call Next Master Button */}
            {nextUpPatient && (
              <button
                type="button"
                onClick={() => handleCallVoice(nextUpPatient)}
                className="px-5 py-3.5 rounded-2xl bg-[#0B5A54] hover:bg-teal-800 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg flex items-center gap-2 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Volume2 className="w-4 h-4 text-teal-200" />
                <span>Call Next ({nextUpPatient.tokenNumber})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. SPOTLIGHT NEXT IN LINE BANNER (IF WAITING) ─────────────── */}
      {nextUpPatient && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-teal-600/30 shadow-md relative overflow-hidden ring-4 ring-teal-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-[#0B5A54] font-heading">
                Next Up in Queue
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-teal-50 text-[#0B5A54] border border-teal-200 font-bold">
                Position #1
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Scheduled Slot: <strong className="text-slate-700 font-mono">{nextUpPatient.timeSlot || '10:00 AM - 11:00 AM'}</strong>
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0B5A54] to-teal-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                {(nextUpPatient.patientName || (nextUpPatient as any).name || 'P').charAt(0).toUpperCase()}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 font-heading">
                    {nextUpPatient.patientName || (nextUpPatient as any).name}
                  </h3>
                  <span className="px-3 py-1 bg-amber-50 text-amber-900 font-mono font-black text-xs rounded-xl border border-amber-200">
                    {nextUpPatient.tokenNumber}
                  </span>
                  {(() => {
                    const priority = getPriority(nextUpPatient);
                    return (
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          priority === 'Urgent'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : priority === 'Senior-Child'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-teal-50 text-[#0B5A54] border-teal-200'
                        }`}
                      >
                        {priority} Priority
                      </span>
                    );
                  })()}
                </div>

                <p className="text-xs text-slate-600 font-medium flex items-center gap-2">
                  <span>{nextUpPatient.age || 34} Years</span>
                  <span>•</span>
                  <span>Blood: <strong className="text-slate-800">{nextUpPatient.bloodGroup || 'O+'}</strong></span>
                  <span>•</span>
                  <span>Complaint: <strong className="text-slate-800 italic">"{nextUpPatient.healthIssue || 'Routine Checkup'}"</strong></span>
                </p>
              </div>
            </div>

            {/* Actions for Next In Line: Call Voice, Cancel, Accept */}
            <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => handleCallVoice(nextUpPatient)}
                className={`px-3.5 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 group ${
                  callingTokenId === nextUpPatient.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0B5A54] border-slate-200 hover:border-teal-300'
                }`}
                title="Re-announce token chime"
              >
                <Volume2 className="w-4 h-4 text-slate-400 group-hover:text-[#0B5A54] transition-colors" />
                <span>{callingTokenId === nextUpPatient.id ? 'Announcing...' : 'Call Voice'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCancelPatient(nextUpPatient)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-rose-200 bg-white hover:bg-rose-50/80 text-slate-600 hover:text-rose-600 font-bold text-xs shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 group"
                title="Cancel or skip patient"
              >
                <XCircle className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
                <span>Cancel</span>
              </button>

              <button
                type="button"
                onClick={() => handleAcceptPatient(nextUpPatient)}
                className="px-5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084843] text-white font-black text-xs sm:text-sm shadow-sm hover:shadow-md hover:shadow-teal-950/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
                <span>Accept</span>
                <ChevronRight className="w-3.5 h-3.5 text-teal-200 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. CONTROLS, SEARCH & SLOT FILTER CHIPS (PREMIUM TOOLBAR) ── */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Executive Search Bar */}
          <div className="flex-1 relative group">
            <div className="relative flex items-center">
              <div className="absolute left-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0B5A54] transition-colors">
                <div className="w-8 h-8 rounded-xl bg-slate-100 group-focus-within:bg-teal-50 flex items-center justify-center transition-colors">
                  <Search className="w-4 h-4" />
                </div>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search waiting queue by Patient Name, Token (#TOK-001), Chief Complaint..."
                className="w-full pl-13 pr-24 py-3 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#0B5A54]/10 focus:border-[#0B5A54] transition-all font-medium shadow-2xs"
              />

              <div className="absolute right-3 flex items-center gap-1.5">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-600 transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-400 font-mono font-bold border border-slate-200/80">
                    Quick Search
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Scan Patient QR Button */}
          <button
            type="button"
            onClick={() => setIsQrScannerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
            title="Scan Patient QR Code"
          >
            <QrCode className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">Scan QR</span>
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/90 shrink-0 self-start md:self-auto shadow-2xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-[#0B5A54] shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-4 h-4" />
              <span>Card Grid</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-[#0B5A54] shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Data Table</span>
            </button>
          </div>
        </div>

        {/* Time Slot Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 shrink-0 font-mono">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>Slots:</span>
          </div>
          {uniqueSlots.map((slot) => {
            const isSelected = slotFilter === slot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => setSlotFilter(slot)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-2xs font-extrabold ring-2 ring-teal-500/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {slot === 'All' ? 'All Slots' : slot}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. MAIN QUEUE ROSTER: CARD GRID VIEW ───────────────────────── */}
      {viewMode === 'kanban' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0B5A54]" />
              <h2 className="text-sm font-black text-slate-900 font-heading">
                Active Waiting Lobby
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-mono font-black">
                {waitingPatients.length} Active
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium">Click any patient card to consult</span>
          </div>

          {waitingPatients.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 p-8 shadow-xs">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/60" />
              <p className="font-black text-base text-slate-800 font-heading">Lobby Queue Clear</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No patients are currently waiting for your cabin. New patient arrivals checked in at reception will appear here immediately.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {waitingPatients.map((patient, idx) => {
                const priority = getPriority(patient);
                const isCalling = callingTokenId === patient.id;
                return (
                  <div
                    key={patient.id}
                    onClick={() => onSelectPatient(patient)}
                    className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-teal-400 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-3.5 relative overflow-hidden"
                  >
                    {/* Top Status Bar */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 font-mono font-bold text-xs text-slate-500 flex items-center justify-center border border-slate-200">
                            #{idx + 1}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 font-mono font-black text-xs text-slate-900 border border-slate-200 shadow-2xs">
                            {patient.tokenNumber}
                          </span>
                        </div>

                        <span
                          className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                            priority === 'Urgent'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 ring-2 ring-rose-500/20'
                              : priority === 'Senior-Child'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-teal-50 text-[#0B5A54] border-teal-200'
                          }`}
                        >
                          {priority}
                        </span>
                      </div>

                      {/* Patient Name & Demographics */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0B5A54] to-teal-700 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                          {(patient.patientName || (patient as any).name || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-[#0B5A54] transition-colors truncate font-heading">
                            {patient.patientName || (patient as any).name}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium truncate">
                            {patient.age || 32} Yrs · Blood {patient.bloodGroup || 'O+'} · {patient.type || 'In-Person'}
                          </p>
                        </div>
                      </div>

                      {/* Chief Complaint Quote Box */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100/90 text-xs">
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 font-mono">
                          Chief Complaint
                        </span>
                        <p className="text-slate-700 font-medium italic line-clamp-2 leading-snug">
                          "{patient.healthIssue || (patient as any).issue || 'General Outpatient Care'}"
                        </p>
                      </div>
                    </div>

                    {/* Card Footer: Slot & Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1 text-slate-400 font-medium text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{patient.timeSlot || '10:00 AM'}</span>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleCallVoice(patient, e)}
                          className={`p-2 rounded-xl font-bold text-xs flex items-center gap-1 border transition-all cursor-pointer shadow-2xs ${
                            isCalling
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-teal-50 hover:bg-teal-100 text-[#0B5A54] border-teal-200/80'
                          }`}
                          title="Announce token voice announcement"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectPatient(patient)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#0B5A54] hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                        >
                          <span>Consult</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 5. DATA TABLE VIEW ────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Token #</th>
                  <th className="py-3.5 px-4">Patient Demographics</th>
                  <th className="py-3.5 px-4">Triage Priority</th>
                  <th className="py-3.5 px-4">Chief Complaint</th>
                  <th className="py-3.5 px-4">Slot Time</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {waitingPatients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No waiting patients match your filter
                    </td>
                  </tr>
                )}
                {waitingPatients.map((patient) => {
                  const priority = getPriority(patient);
                  const isCalling = callingTokenId === patient.id;
                  return (
                    <tr
                      key={patient.id}
                      onClick={() => onSelectPatient(patient)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-black text-slate-900">
                        {patient.tokenNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 group-hover:text-[#0B5A54] transition-colors font-heading">
                          {patient.patientName || (patient as any).name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {patient.age || 32}y · Blood {patient.bloodGroup || 'O+'} · {patient.patientPhone || '+91 98765 00000'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            priority === 'Urgent'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : priority === 'Senior-Child'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-teal-50 text-[#0B5A54] border-teal-200'
                          }`}
                        >
                          {priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate italic">
                        "{patient.healthIssue || (patient as any).issue || 'Routine Outpatient'}"
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {patient.timeSlot || (patient as any).slot || '10:00 AM'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleCallVoice(patient, e)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isCalling
                                ? 'bg-emerald-600 text-white'
                                : 'text-slate-500 hover:text-[#0B5A54] hover:bg-teal-50'
                            }`}
                            title="Call Patient Voice"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectPatient(patient)}
                            className="px-3 py-1.5 rounded-xl bg-[#0B5A54] hover:bg-teal-800 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                          >
                            <span>Consult</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Patient QR Scanner Modal ── */}
      <PatientQrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        hospitalId={currentStaff?.hospitalId || currentStaff?.hospital_id}
        hospitalName={currentStaff?.hospitalName || currentStaff?.hospital_name}
        portalRole="doctor"
        onPatientLoaded={handlePatientQrLoaded}
      />

      {/* ── Patient 360 Record Modal ── */}
      <Patient360RecordModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        data={scannedPatientRecord}
        portalRole="doctor"
        onStartConsultation={handleStartConsultationFromDossier}
      />
    </div>
  );
};

export default DoctorQueue;
