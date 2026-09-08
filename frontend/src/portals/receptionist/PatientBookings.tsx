import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Clock,
  Phone,
  Stethoscope,
  CheckCircle2,
  Smartphone,
  UserPlus,
  UserCheck,
  X,
  Printer,
  Layers,
  LayoutGrid,
  List,
  Calendar,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import type { TokenQueueItem, TokenStatus } from '../../types/receptionist';

interface PatientBookingsProps {
  onShowToast?: (msg: string) => void;
  onOpenNewAppointment?: () => void;
}

export type SortByOption =
  | 'TIME_ASC'
  | 'TIME_DESC'
  | 'DATE_DESC'
  | 'DATE_ASC'
  | 'TOKEN_ASC'
  | 'PATIENT_NAME_ASC';

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

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return rawDate;
  }

  // Parse formatted strings like "13 Aug 2026" or "Wed, Sep 2, 2026"
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {}

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
  } catch {}
  return isoOrFormatted;
};

export const PatientBookings: React.FC<PatientBookingsProps> = ({
  onShowToast,
  onOpenNewAppointment,
}) => {
  const hospitalSettings = useStaffStore((s) => s.hospitalSettings);
  const tokens = useStaffStore((s) => s.tokens);
  const bookings = useStaffStore((s) => s.bookings);
  const doctors = useStaffStore((s) => s.doctors);
  const fetchTokens = useStaffStore((s) => s.fetchTokens);
  const fetchBookings = useStaffStore((s) => s.fetchBookings);
  const checkInAppointment = useStaffStore((s) => s.checkInAppointment);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ONLINE' | 'OFFLINE' | 'CHECKED_IN' | 'COMPLETED' | 'ALL'>('ALL');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('ALL');
  const [selectedSlotFilter, setSelectedSlotFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  // Date Filter & Sort by Date State (Default to 'ALL' to show all patient bookings)
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortByOption>('TIME_ASC');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Printable Token Slip Modal State
  const [tokenToPrint, setTokenToPrint] = useState<TokenQueueItem | null>(null);

  useEffect(() => {
    fetchBookings();
    fetchTokens();
  }, [fetchBookings, fetchTokens]);

  const rawBookings = bookings.length > 0 ? bookings : tokens;

  const handleCheckIn = async (item: TokenQueueItem) => {
    setCheckingInId(item.id);
    try {
      const success = await checkInAppointment(item.id);
      if (success) {
        onShowToast?.(`Patient ${item.patientName} checked in successfully and added to live queue!`);
      } else {
        onShowToast?.(`Check-in completed for ${item.patientName}`);
      }
    } catch (err) {
      onShowToast?.(`Failed to check in ${item.patientName}`);
    } finally {
      setCheckingInId(null);
    }
  };

  const availableSlots = useMemo(() => {
    const slotsSet = new Set<string>();
    rawBookings.forEach((t) => slotsSet.add(t.timeSlot));
    return Array.from(slotsSet).sort();
  }, [rawBookings]);

  const todayIso = getTodayISODate(0);
  const tomorrowIso = getTodayISODate(1);

  // Filter & sort logic
  const filteredBookings = useMemo(() => {
    return rawBookings
      .filter((item) => {
        const isOnline = item.type !== 'Walk-In';
        const isCheckedIn = !!item.isCheckedIn || item.status === 'Checked In';
        const matchesTab =
          activeTab === 'ALL' ||
          (activeTab === 'ONLINE' && isOnline) ||
          (activeTab === 'OFFLINE' && !isOnline) ||
          (activeTab === 'CHECKED_IN' && isCheckedIn) ||
          (activeTab === 'COMPLETED' && item.status === 'Completed');

        const matchesDoctor = selectedDoctorFilter === 'ALL' || item.doctorId === selectedDoctorFilter;
        const matchesSlot = selectedSlotFilter === 'ALL' || item.timeSlot === selectedSlotFilter;
        const matchesStatus = selectedStatusFilter === 'ALL' || item.status === selectedStatusFilter;

        // Date matching logic (Default to current date / selected date, or ALL)
        const itemIsoDate = normalizeDateToISO(item.date);
        const matchesDate = selectedDateFilter === 'ALL' || itemIsoDate === selectedDateFilter;

        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          item.patientName.toLowerCase().includes(q) ||
          item.ticketNumber.toLowerCase().includes(q) ||
          item.tokenNumber.toLowerCase().includes(q) ||
          item.patientPhone.includes(q) ||
          (item.doctorName && item.doctorName.toLowerCase().includes(q)) ||
          (item.healthIssue && item.healthIssue.toLowerCase().includes(q));

        return matchesTab && matchesDoctor && matchesSlot && matchesStatus && matchesDate && matchesSearch;
      })
      .sort((a, b) => {
        // Date sorting
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
        if (sortBy === 'PATIENT_NAME_ASC') {
          return a.patientName.localeCompare(b.patientName);
        }
        // Default TIME_ASC
        return a.timeSlot.localeCompare(b.timeSlot);
      });
  }, [
    rawBookings,
    activeTab,
    selectedDoctorFilter,
    selectedSlotFilter,
    selectedStatusFilter,
    selectedDateFilter,
    sortBy,
    searchQuery,
  ]);

  // Tab counts scoped to the active date filter
  const onlineTokensCount = rawBookings.filter((t) => {
    const isOnline = t.type !== 'Walk-In';
    const matchesDate = selectedDateFilter === 'ALL' || normalizeDateToISO(t.date) === selectedDateFilter;
    return isOnline && matchesDate;
  }).length;

  const offlineTokensCount = rawBookings.filter((t) => {
    const isOffline = t.type === 'Walk-In';
    const matchesDate = selectedDateFilter === 'ALL' || normalizeDateToISO(t.date) === selectedDateFilter;
    return isOffline && matchesDate;
  }).length;

  const checkedInCount = rawBookings.filter((t) => {
    const isChecked = !!t.isCheckedIn || t.status === 'Checked In';
    const matchesDate = selectedDateFilter === 'ALL' || normalizeDateToISO(t.date) === selectedDateFilter;
    return isChecked && matchesDate;
  }).length;

  const completedCount = rawBookings.filter((t) => {
    const isCompleted = t.status === 'Completed';
    const matchesDate = selectedDateFilter === 'ALL' || normalizeDateToISO(t.date) === selectedDateFilter;
    return isCompleted && matchesDate;
  }).length;

  const totalCurrentDateTokens = tokens.filter((t) => {
    return selectedDateFilter === 'ALL' || normalizeDateToISO(t.date) === selectedDateFilter;
  }).length;

  const handlePrintSlip = (token: TokenQueueItem) => {
    setTokenToPrint(token);
  };

  const getStatusBadge = (status: TokenStatus) => {
    switch (status) {
      case 'Checked In':
        return 'bg-teal-50 text-[#0B5A54] border-teal-300 font-extrabold shadow-2xs';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Consultation':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Skipped':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setActiveTab('ALL');
    setSelectedDoctorFilter('ALL');
    setSelectedSlotFilter('ALL');
    setSelectedStatusFilter('ALL');
    setSelectedDateFilter('ALL');
    setSortBy('TIME_ASC');
  };

  const isAnyFilterActive =
    searchQuery !== '' ||
    selectedDoctorFilter !== 'ALL' ||
    selectedSlotFilter !== 'ALL' ||
    selectedStatusFilter !== 'ALL' ||
    selectedDateFilter !== 'ALL' ||
    activeTab !== 'ALL';

  return (
    <div className="space-y-6 pb-12 text-left">
      {/* ══════════════════════════════════════════════════════════════════
          1. FILTER & CATEGORY NAVIGATION TOOLBAR
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Row 1: Category Tabs + Actions + View Mode */}
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
              onClick={() => setActiveTab('CHECKED_IN')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'CHECKED_IN'
                  ? 'bg-[#0B5A54] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-teal-300" />
              <span>Checked In ({checkedInCount})</span>
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
              <span>All ({totalCurrentDateTokens})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={onOpenNewAppointment}
              className="px-4 py-2.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold rounded-2xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer text-xs active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Walk-In</span>
            </button>

            {/* View Mode Toggle (Grid vs Table) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
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
        </div>

        {/* Row 2: DATE SELECTOR (DEFAULT: TODAY) & SORT BY CONTROLS */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/70">
          {/* Quick Date Selection Pills + HTML5 Date Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#0B5A54] shrink-0 mr-1">
              <Calendar className="w-4 h-4 text-[#14B8A6]" />
              <span>Date Filter:</span>
            </div>

            {/* Quick Pills */}
            <button
              type="button"
              onClick={() => setSelectedDateFilter(todayIso)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1.5 ${
                selectedDateFilter === todayIso
                  ? 'bg-[#0B5A54] text-white shadow-xs font-black'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${selectedDateFilter === todayIso ? 'bg-emerald-300' : 'bg-slate-300'}`} />
              <span>Today ({formatDisplayDate(todayIso)})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDateFilter(tomorrowIso)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1.5 ${
                selectedDateFilter === tomorrowIso
                  ? 'bg-[#0B5A54] text-white shadow-xs font-black'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>Tomorrow</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDateFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                selectedDateFilter === 'ALL'
                  ? 'bg-[#0B5A54] text-white shadow-xs font-black'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Dates
            </button>

            {/* Custom Date Input */}
            <div className="relative flex items-center">
              <input
                type="date"
                value={selectedDateFilter === 'ALL' ? '' : selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value || 'ALL')}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] cursor-pointer shadow-2xs"
                title="Choose custom date"
              />
            </div>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <div className="flex items-center gap-1 text-xs font-black text-slate-600 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#0B5A54]" />
              <span>Sort:</span>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortByOption)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] shadow-2xs cursor-pointer"
            >
              <option value="TIME_ASC">Time Slot (Earliest First)</option>
              <option value="TIME_DESC">Time Slot (Latest First)</option>
              <option value="DATE_DESC">Date (Newest First)</option>
              <option value="DATE_ASC">Date (Oldest First)</option>
              <option value="TOKEN_ASC">Token Number (#001 First)</option>
              <option value="PATIENT_NAME_ASC">Patient Name (A → Z)</option>
            </select>

            {isAnyFilterActive && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Reset All Filters to Default (Today)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 3: Multi-Dimensional Filter Row (Search, Doctor, Slot, Status) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Bar */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search patient, phone, token #, doctor..."
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
              <option value="Checked In">Checked In</option>
              <option value="In Consultation">In Consultation</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Active Scope Summary Banner */}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span>
              Showing: <strong className="text-slate-800">{selectedDateFilter === 'ALL' ? 'All Dates' : `${formatDisplayDate(selectedDateFilter)} (${selectedDateFilter})`}</strong>
            </span>
            <span>•</span>
            <span className="font-extrabold text-[#0B5A54]">{filteredBookings.length} {filteredBookings.length === 1 ? 'patient' : 'patients'} found</span>
          </div>

          {selectedDateFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedDateFilter('ALL')}
              className="text-[#0B5A54] hover:underline font-bold text-[11px] cursor-pointer"
            >
              View All Dates
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. BOOKINGS ROSTER DISPLAY (GRID OR TABLE)
      ══════════════════════════════════════════════════════════════════ */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-[#E3F3F1] border border-[#14B8A6]/20 flex items-center justify-center mx-auto text-[#0B5A54] shadow-xs">
            <Calendar className="w-8 h-8 text-[#0B5A54]" />
          </div>
          <h3 className="text-base font-black text-slate-900">No Patients Scheduled for Selected Date</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No booking records match {selectedDateFilter === 'ALL' ? 'your filters' : `date (${formatDisplayDate(selectedDateFilter)})`}. You can switch dates or view all records.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDateFilter(todayIso)}
              className="px-4 py-2 bg-[#0B5A54] text-white font-extrabold text-xs rounded-xl hover:bg-[#084540] transition-all shadow-xs cursor-pointer"
            >
              Show Today's Patients
            </button>
            <button
              type="button"
              onClick={() => setSelectedDateFilter('ALL')}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all border border-slate-200 cursor-pointer"
            >
              Show All Dates
            </button>
          </div>
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
                  {/* Card Header: Token Number, Date & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
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

                    {(isOnline || item.status !== 'Waiting') && (
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                        {item.status === 'Checked In' && (
                          <span className="text-[9.5px] font-extrabold text-[#0B5A54] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                            <Clock className="w-2.5 h-2.5 text-[#14B8A6]" />
                            <span>Check-in: {item.checkInTime || item.arrivalTime || 'Just now'}</span>
                          </span>
                        )}
                      </div>
                    )}
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
                  <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700 font-bold">
                      <span className="flex items-center gap-1 text-[11px] truncate">
                        <Stethoscope className="w-3.5 h-3.5 text-[#0B5A54] shrink-0" />
                        {item.doctorName}
                      </span>
                      {item.ticketNumber && (
                        <span className="px-1.5 py-0.5 rounded-md font-mono text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.ticketNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1 font-bold text-slate-700">
                        <Calendar className="w-3 h-3 text-[#14B8A6]" />
                        {formatDisplayDate(item.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {item.timeSlot}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-medium text-right">
                      {doc?.roomNumber || 'Cabin 101 - 1st Floor'}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handlePrintSlip(item)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Print Thermal Queue Slip"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Slip</span>
                  </button>

                  {!item.isCheckedIn && item.status !== 'Completed' && item.status !== 'Cancelled' ? (
                    <button
                      type="button"
                      disabled={checkingInId === item.id}
                      onClick={() => handleCheckIn(item)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                      title="Check In Patient & Join Live Queue"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-100" />
                      <span>{checkingInId === item.id ? 'Checking In...' : 'Check In'}</span>
                    </button>
                  ) : (
                    <span className="text-[10.5px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Checked In</span>
                    </span>
                  )}
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
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Patient Details</th>
                  <th className="p-4">Doctor & Cabin</th>
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
                          {isOnline ? '📱 Online App' : '🏢 Walk-In'}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="font-extrabold text-slate-800 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#0B5A54]" />
                          <span>{formatDisplayDate(item.date)}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{item.timeSlot}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {item.patientName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {item.patientPhone} {item.bloodGroup && `• ${item.bloodGroup}`}
                        </div>
                        {item.healthIssue && (
                          <div className="text-[10.5px] text-slate-500 italic truncate max-w-xs">
                            {item.healthIssue}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="font-extrabold text-slate-800">
                          {item.doctorName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.doctorSpecialty} • {doc?.roomNumber || 'Cabin 101'}
                        </div>
                        {item.ticketNumber && (
                          <span className="text-[10px] font-mono text-slate-400">
                            Ticket: {item.ticketNumber}
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                          {item.status === 'Checked In' && (
                            <span className="text-[9.5px] font-bold text-[#0B5A54] bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-[#14B8A6]" />
                              <span>{item.checkInTime || item.arrivalTime || 'Checked In'}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePrintSlip(item)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer flex items-center gap-1"
                            title="Print Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Slip</span>
                          </button>

                          {!item.isCheckedIn && item.status !== 'Completed' && item.status !== 'Cancelled' ? (
                            <button
                              type="button"
                              disabled={checkingInId === item.id}
                              onClick={() => handleCheckIn(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer flex items-center gap-1 shadow-2xs transition-all active:scale-95 disabled:opacity-50"
                              title="Check In Patient & Join Live Queue"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-emerald-100" />
                              <span>{checkingInId === item.id ? 'Checking In...' : 'Check In'}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Checked In</span>
                            </span>
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
          3. THERMAL QUEUE SLIP PRINT PREVIEW MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {tokenToPrint && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setTokenToPrint(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center border-b border-dashed border-slate-300 pb-4 space-y-1">
              <h3 className="font-black text-base text-slate-900 font-heading tracking-tight">
                CAREPULSE OPD QUEUE SLIP
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Front Desk Registration{hospitalSettings?.name ? ` • ${hospitalSettings.name}` : ''}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                Date: {formatDisplayDate(tokenToPrint.date)} • {new Date().toLocaleTimeString()}
              </p>
            </div>

            <div className="text-center py-2 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                YOUR TOKEN NUMBER
              </span>
              <div className="text-4xl font-black text-[#0B5A54] font-mono tracking-tight">
                {tokenToPrint.tokenNumber}
              </div>
              <span className="text-xs font-bold text-slate-600">
                Ticket: {tokenToPrint.ticketNumber}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs space-y-1.5 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-extrabold text-slate-900">{tokenToPrint.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Doctor:</span>
                <span className="font-extrabold text-slate-900">{tokenToPrint.doctorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Slot:</span>
                <span className="font-bold text-slate-800">{tokenToPrint.timeSlot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Type:</span>
                <span className="font-bold text-[#0B5A54]">{tokenToPrint.type}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  window.print();
                  onShowToast?.(`Printed token slip for ${tokenToPrint.tokenNumber}`);
                  setTokenToPrint(null);
                }}
                className="flex-1 py-2.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Slip</span>
              </button>
              <button
                onClick={() => setTokenToPrint(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-all cursor-pointer"
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

export default PatientBookings;
