import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Clock,
  FileText,
  Phone,
  Stethoscope,
  Sparkles,
  CheckCircle2,
  Smartphone,
  UserPlus,
  X,
  RefreshCw,
  Printer,
  Layers,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { TokenQueueItem, TokenStatus } from '../../types/receptionist';

interface PatientBookingsProps {
  onShowToast?: (msg: string) => void;
  onOpenNewAppointment?: () => void;
}

export const PatientBookings: React.FC<PatientBookingsProps> = ({
  onShowToast,
  onOpenNewAppointment,
}) => {
  const tokens = useStaffStore((s) => s.tokens);
  const doctors = useStaffStore((s) => s.doctors);
  const fetchTokens = useStaffStore((s) => s.fetchTokens);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ONLINE' | 'OFFLINE' | 'COMPLETED' | 'ALL'>('ONLINE');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('ALL');
  const [selectedSlotFilter, setSelectedSlotFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Printable Token Slip Modal State
  const [tokenToPrint, setTokenToPrint] = useState<TokenQueueItem | null>(null);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchTokens();
    setTimeout(() => {
      setIsRefreshing(false);
      onShowToast?.('Live patient bookings synchronized.');
    }, 400);
  };

  const availableSlots = useMemo(() => {
    const slotsSet = new Set<string>();
    tokens.forEach((t) => slotsSet.add(t.timeSlot));
    return Array.from(slotsSet).sort();
  }, [tokens]);

  // Filter & sort logic
  const filteredBookings = useMemo(() => {
    return tokens
      .filter((item) => {
        const isOnline = item.type !== 'Walk-In';
        const matchesTab =
          activeTab === 'ALL' ||
          (activeTab === 'ONLINE' && isOnline) ||
          (activeTab === 'OFFLINE' && !isOnline) ||
          (activeTab === 'COMPLETED' && item.status === 'Completed');

        const matchesDoctor = selectedDoctorFilter === 'ALL' || item.doctorId === selectedDoctorFilter;
        const matchesSlot = selectedSlotFilter === 'ALL' || item.timeSlot === selectedSlotFilter;
        const matchesStatus = selectedStatusFilter === 'ALL' || item.status === selectedStatusFilter;

        const q = searchQuery.toLowerCase();
        const matchesSearch =
          item.patientName.toLowerCase().includes(q) ||
          item.ticketNumber.toLowerCase().includes(q) ||
          item.tokenNumber.toLowerCase().includes(q) ||
          item.patientPhone.includes(q);

        return matchesTab && matchesDoctor && matchesSlot && matchesStatus && matchesSearch;
      })
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [
    tokens,
    activeTab,
    selectedDoctorFilter,
    selectedSlotFilter,
    selectedStatusFilter,
    searchQuery,
  ]);

  const onlineTokensCount = tokens.filter((t) => t.type !== 'Walk-In').length;
  const offlineTokensCount = tokens.filter((t) => t.type === 'Walk-In').length;
  const completedCount = tokens.filter((t) => t.status === 'Completed').length;

  const handlePrintSlip = (token: TokenQueueItem) => {
    setTokenToPrint(token);
  };

  const getStatusBadge = (status: TokenStatus) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Consultation':
        return 'bg-teal-50 text-[#0B5A54] border-teal-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Skipped':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="space-y-6 pb-12 text-left">
      {/* ══════════════════════════════════════════════════════════════════
          1. EXECUTIVE HERO BANNER
      ══════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0B5A54] via-teal-900 to-[#084540] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-teal-950/15 border border-teal-700/50">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-black tracking-wider text-teal-100 uppercase">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>OPD Registry & Token Log</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white">
              Patient Bookings & Appointments
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 font-medium leading-relaxed">
              Comprehensive roster of pre-booked mobile appointments and same-day front-desk walk-in registrations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-4 py-3 bg-white/15 hover:bg-white/25 text-white font-bold rounded-2xl border border-white/20 shadow-xs transition-all flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
            </button>

            <button
              onClick={onOpenNewAppointment}
              className="px-5 py-3 bg-white hover:bg-teal-50 text-[#0B5A54] font-black rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-95"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Walk-In Patient</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. FILTER & CATEGORY NAVIGATION TOOLBAR
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Main Tab Switcher & View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveTab('ONLINE')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'ONLINE'
                  ? 'bg-[#0B5A54] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-teal-300" />
              <span>Online App ({onlineTokensCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('OFFLINE')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'OFFLINE'
                  ? 'bg-[#0B5A54] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-300" />
              <span>Walk-Ins ({offlineTokensCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'COMPLETED'
                  ? 'bg-[#0B5A54] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Completed ({completedCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'ALL'
                  ? 'bg-[#0B5A54] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-300" />
              <span>All ({tokens.length})</span>
            </button>
          </div>

          {/* View Mode Toggle (Grid vs Table) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl self-end sm:self-auto shrink-0">
            <button
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'GRID' ? 'bg-white text-[#0B5A54] shadow-xs' : 'text-slate-500'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'TABLE' ? 'bg-white text-[#0B5A54] shadow-xs' : 'text-slate-500'
              }`}
              title="Table Roster View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Multi-Dimensional Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Bar */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search patient, phone, token #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Doctor Filter */}
          <div>
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]"
            >
              <option value="ALL">All Physicians</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time Slot Filter */}
          <div>
            <select
              value={selectedSlotFilter}
              onChange={(e) => setSelectedSlotFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]"
            >
              <option value="ALL">All Time Slots</option>
              {availableSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Waiting">Waiting</option>
              <option value="In Consultation">In Consultation</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. BOOKINGS ROSTER DISPLAY (GRID OR TABLE)
      ══════════════════════════════════════════════════════════════════ */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-black text-slate-900">No Patient Records Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No booking records match your selected filters. Try changing filters or search terms.
          </p>
        </div>
      ) : viewMode === 'GRID' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((item) => {
            const doc = doctors.find((d) => d.id === item.doctorId);
            const isOnline = item.type !== 'Walk-In';

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-teal-300/70 transition-all space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Card Header: Token Number & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-teal-50 text-[#0B5A54] border border-teal-200 rounded-xl font-mono text-xs font-black">
                        {item.tokenNumber}
                      </span>
                      <span
                        className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isOnline
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {isOnline ? 'Online App' : 'Walk-In'}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  {/* Patient Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0B5A54] to-teal-800 text-white font-black text-xs flex items-center justify-center font-heading shrink-0 shadow-xs">
                      {item.patientName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-black text-slate-900 text-sm truncate">
                          {item.patientName}
                        </h4>
                        {item.age && (
                          <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-1.5 rounded shrink-0">
                            {item.age}y
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-semibold">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {item.patientPhone}
                        </span>
                        {item.bloodGroup && (
                          <span className="text-[9.5px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 rounded">
                            {item.bloodGroup}
                          </span>
                        )}
                      </div>

                      {item.healthIssue && (
                        <p className="text-[11px] text-slate-600 italic truncate mt-0.5">
                          Symptoms: {item.healthIssue}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Doctor & Slot Info */}
                  <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-700 font-bold">
                      <span className="flex items-center gap-1 text-[11px] truncate">
                        <Stethoscope className="w-3.5 h-3.5 text-[#0B5A54] shrink-0" />
                        {item.doctorName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.ticketNumber}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {item.timeSlot}
                      </span>
                      <span>{doc?.roomNumber || 'Cabin 101'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handlePrintSlip(item)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Print Thermal Queue Slip"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Slip</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {item.status === 'Waiting' && (
                      <button
                        onClick={() => {
                          updateTokenStatus(item.id, 'In Consultation');
                          onShowToast?.(`Token ${item.tokenNumber} summoned into consultation.`);
                        }}
                        className="px-3 py-1.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                      >
                        Call In
                      </button>
                    )}
                    {item.status === 'In Consultation' && (
                      <button
                        onClick={() => {
                          updateTokenStatus(item.id, 'Completed');
                          onShowToast?.(`Token ${item.tokenNumber} marked as completed.`);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE ROSTER VIEW */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="p-4">Token / Type</th>
                  <th className="p-4">Patient Details</th>
                  <th className="p-4">Doctor & Cabin</th>
                  <th className="p-4">Slot Time</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((item) => {
                  const doc = doctors.find((d) => d.id === item.doctorId);
                  const isOnline = item.type !== 'Walk-In';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-teal-50 text-[#0B5A54] border border-teal-200 rounded-xl font-mono text-xs font-black block w-max">
                          {item.tokenNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold block mt-1">
                          {isOnline ? '📱 Mobile App' : '🏢 Walk-In'}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {item.patientName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {item.patientPhone} {item.bloodGroup && `• ${item.bloodGroup}`}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-800">{item.doctorName}</div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {doc?.roomNumber || 'Cabin 101'}
                        </div>
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-700">{item.timeSlot}</td>

                      <td className="p-4">
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePrintSlip(item)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                            title="Print Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {item.status === 'Waiting' && (
                            <button
                              onClick={() => {
                                updateTokenStatus(item.id, 'In Consultation');
                                onShowToast?.(`Token ${item.tokenNumber} summoned into consultation.`);
                              }}
                              className="px-2.5 py-1 bg-[#0B5A54] hover:bg-[#084540] text-white font-bold rounded-lg text-xs cursor-pointer"
                            >
                              Call In
                            </button>
                          )}
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

      {/* ══════════════════════════════════════════════════════════════════
          4. PRINTABLE TOKEN SLIP MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {tokenToPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#0B5A54]" />
                <h3 className="text-base font-black text-slate-900 font-heading">
                  CarePulse OPD Queue Slip
                </h3>
              </div>
              <button
                onClick={() => setTokenToPrint(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slip Paper Preview */}
            <div className="p-5 bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-4 font-mono text-xs">
              <div className="text-center space-y-0.5 border-b border-slate-200 pb-3">
                <h4 className="font-black text-slate-900 text-sm">CAREPULSE CENTRAL HOSPITAL</h4>
                <p className="text-[10px] text-slate-500">Outpatient Consultation Pass</p>
              </div>

              <div className="text-center py-2 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                  QUEUE TOKEN
                </span>
                <span className="text-3xl font-black text-[#0B5A54] block mt-0.5">
                  {tokenToPrint.tokenNumber}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Ticket: {tokenToPrint.ticketNumber}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Patient:</span>
                  <span className="font-bold text-slate-900">{tokenToPrint.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Doctor:</span>
                  <span className="font-bold text-slate-900">{tokenToPrint.doctorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cabin Room:</span>
                  <span className="font-bold text-slate-900">
                    {doctors.find((d) => d.id === tokenToPrint.doctorId)?.roomNumber || 'Cabin 101'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Slot Time:</span>
                  <span className="font-bold text-slate-900">{tokenToPrint.timeSlot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Intake Type:</span>
                  <span className="font-bold text-[#0B5A54]">{tokenToPrint.type}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-slate-200 text-[10px] text-slate-400">
                Please wait in the reception lounge until your token number is broadcasted.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setTokenToPrint(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all cursor-pointer text-center"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                  setTokenToPrint(null);
                }}
                className="flex-1 py-3 px-4 bg-[#0B5A54] hover:bg-[#084540] text-white font-black rounded-2xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Thermal Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientBookings;
