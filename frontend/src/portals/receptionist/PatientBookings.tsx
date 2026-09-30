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
  HeartPulse,
  Microscope,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { nurseService } from '../../services/nurseService';
import type { TokenQueueItem, TokenStatus } from '../../types/receptionist';
import type { NurseQueueItem } from '../../types/nurse';

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

  // Live Nurse Vitals & Labs Queue State
  const [nurseQueue, setNurseQueue] = useState<NurseQueueItem[]>([]);
  const [trackingItem, setTrackingItem] = useState<{ token: TokenQueueItem; triage?: NurseQueueItem | null } | null>(null);
  const [trackingLabTests, setTrackingLabTests] = useState<any[]>([]);
  const [isLoadingTrackingLabTests, setIsLoadingTrackingLabTests] = useState(false);

  const currentStaff = useStaffStore((s) => s.currentStaff);
  const effectiveHospId = currentStaff?.hospital_id || currentStaff?.hospitalId;

  const loadNurseQueue = React.useCallback(async () => {
    try {
      const q = await nurseService.getQueue(effectiveHospId);
      setNurseQueue(q || []);
    } catch {
      // ignore offline fallback
    }
  }, [effectiveHospId]);

  // Date Filter & Sort by Date State (Default to 'ALL' to show all patient bookings)
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortByOption>('TIME_ASC');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Printable Token Slip Modal State
  const [tokenToPrint, setTokenToPrint] = useState<TokenQueueItem | null>(null);

  useEffect(() => {
    fetchBookings();
    fetchTokens();
    loadNurseQueue();
    const timer = setInterval(() => {
      loadNurseQueue();
    }, 6000);
    return () => clearInterval(timer);
  }, [fetchBookings, fetchTokens, loadNurseQueue]);

  const rawBookings = useMemo(() => {
    const map = new Map<string, TokenQueueItem>();
    tokens.forEach((t) => {
      const key = String(t.id || t.appointmentId || t.ticketNumber || t.tokenNumber);
      if (key) map.set(key, t);
    });
    bookings.forEach((b) => {
      const key = String(b.id || b.appointmentId || b.ticketNumber || b.tokenNumber);
      if (key) {
        const existing = map.get(key);
        if (existing && (existing.isCheckedIn || existing.status === 'Checked In') && !b.isCheckedIn) {
          map.set(key, existing);
        } else {
          map.set(key, b);
        }
      }
    });
    return Array.from(map.values());
  }, [tokens, bookings]);

  const handleCheckIn = async (item: TokenQueueItem) => {
    setCheckingInId(item.id);
    try {
      const targetId = item.id || item.appointmentId || item.ticketNumber;
      const success = await checkInAppointment(targetId);
      if (success) {
        onShowToast?.(`Patient ${item.patientName} checked in! Transferred to Nurse Station for triage vitals & lab tests.`);
      } else {
        onShowToast?.(`Check-in completed for ${item.patientName}. Transferred to Nurse Station.`);
      }
      await loadNurseQueue();
    } catch (err) {
      onShowToast?.(`Failed to check in ${item.patientName}`);
    } finally {
      setCheckingInId(null);
    }
  };

  const handleOpenTrackingModal = async (item: TokenQueueItem) => {
    const triageMatch = nurseQueue.find(
      (nq) =>
        nq.appointment_id === item.id ||
        nq.appointment_id === item.appointmentId ||
        (item.patientName && nq.patient?.name?.toLowerCase() === item.patientName.toLowerCase())
    );
    setTrackingItem({ token: item, triage: triageMatch || null });
    setIsLoadingTrackingLabTests(true);
    try {
      const tests = await nurseService.getLabTests(item.id);
      setTrackingLabTests(tests || []);
    } catch {
      setTrackingLabTests([]);
    } finally {
      setIsLoadingTrackingLabTests(false);
    }
  };

  const availableSlots = useMemo(() => {
    const slotsSet = new Set<string>();
    rawBookings.forEach((t) => slotsSet.add(t.timeSlot));
    return Array.from(slotsSet).sort();
  }, [rawBookings]);

  const todayIso = getTodayISODate(0);
  const tomorrowIso = getTodayISODate(1);

  const isWalkIn = (type?: string) => (type || '').toLowerCase().includes('walk-in');

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
    const isOffline = isWalkIn(t.type);
    const isAccepted = isOffline || t.status !== 'Waiting';
    const matchesDate = selectedDateFilter === 'ALL' || normalizeDateToISO(t.date) === selectedDateFilter;
    return isAccepted && matchesDate;
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
                  {doc.name} {!doc.isAvailable ? `(Unavailable${doc.availabilityReason ? ` - ${doc.availabilityReason}` : ''})` : ''}
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
            const isOnline = !isWalkIn(item.type);
            const triageMatch = nurseQueue.find(
              (nq) =>
                nq.appointment_id === item.id ||
                nq.appointment_id === item.appointmentId ||
                (item.patientName && nq.patient?.name?.toLowerCase() === item.patientName.toLowerCase())
            );

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
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="font-black text-slate-900 text-sm truncate">
                            {item.patientName}
                          </h4>
                          {item.patientCode && (
                            <span className="px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] font-mono font-bold border border-teal-200 shrink-0">
                              {item.patientCode}
                            </span>
                          )}
                        </div>
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

                  {/* Live Clinical Status: Nurse Vitals & Labs Tracker */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-1 text-[10px]">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      {triageMatch?.vitals ? (
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border ${
                            triageMatch.abnormal_flags && triageMatch.abnormal_flags.length > 0
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                          title={`BP: ${triageMatch.vitals.bp_systolic}/${triageMatch.vitals.bp_diastolic}, Pulse: ${triageMatch.vitals.heart_rate}`}
                        >
                          <HeartPulse className="w-3 h-3 text-emerald-600" />
                          <span>Vitals: {triageMatch.vitals.bp_systolic}/{triageMatch.vitals.bp_diastolic}</span>
                        </span>
                      ) : item.isCheckedIn || item.status === 'Checked In' ? (
                        <span className="px-2 py-0.5 rounded-md font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Vitals Pending (Nurse)</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md font-medium text-slate-400 bg-slate-100 border border-slate-200">
                          Awaiting Arrival
                        </span>
                      )}

                      {triageMatch?.lab_test_count && triageMatch.lab_test_count > 0 ? (
                        <span className="px-1.5 py-0.5 rounded-md font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                          <Microscope className="w-3 h-3 text-sky-600" />
                          <span>{triageMatch.lab_test_count} Labs</span>
                        </span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenTrackingModal(item)}
                      className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#0B5A54] border border-teal-200 font-extrabold flex items-center gap-1 text-[10px] cursor-pointer shrink-0 transition-colors"
                      title="Track clinical vitals and diagnostic lab progress"
                    >
                      <Activity className="w-3 h-3 text-[#14B8A6]" />
                      <span>Track</span>
                    </button>
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
                  <th className="p-4">Clinical Status (Nurse)</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((item) => {
                  const doc = doctors.find((d) => d.id === item.doctorId);
                  const isOnline = !isWalkIn(item.type);
                  const triageMatch = nurseQueue.find(
                    (nq) =>
                      nq.appointment_id === item.id ||
                      nq.appointment_id === item.appointmentId ||
                      (item.patientName && nq.patient?.name?.toLowerCase() === item.patientName.toLowerCase())
                  );

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
                        <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{item.patientName}</span>
                          {item.patientCode && (
                            <span className="px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] font-mono font-bold border border-teal-200">
                              {item.patientCode}
                            </span>
                          )}
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

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-1">
                            {triageMatch?.vitals ? (
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 border ${
                                triageMatch.abnormal_flags && triageMatch.abnormal_flags.length > 0
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                <HeartPulse className="w-3 h-3 text-emerald-600" />
                                <span>{triageMatch.vitals.bp_systolic}/{triageMatch.vitals.bp_diastolic} mmHg</span>
                              </span>
                            ) : item.isCheckedIn || item.status === 'Checked In' ? (
                              <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-max">
                                <Clock className="w-3 h-3 text-amber-500" />
                                <span>Vitals Pending</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md font-medium text-[10px] text-slate-400 bg-slate-100 border border-slate-200 w-max">
                                Waiting Arrival
                              </span>
                            )}

                            {triageMatch?.lab_test_count && triageMatch.lab_test_count > 0 ? (
                              <span className="px-1.5 py-0.5 rounded-md font-bold text-[10px] bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1 w-max">
                                <Microscope className="w-3 h-3 text-sky-600" />
                                <span>{triageMatch.lab_test_count} Lab Tests</span>
                              </span>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenTrackingModal(item)}
                            className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#0B5A54] border border-teal-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Track clinical vitals & lab diagnostics"
                          >
                            <Activity className="w-3.5 h-3.5 text-[#14B8A6]" />
                            <span>Track</span>
                          </button>
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

      {/* ══════════════════════════════════════════════════════════════════
          4. LIVE CLINICAL VITALS & LABS TRACKING INSPECTOR MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {trackingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setTrackingItem(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-[#0B5A54] border border-teal-200 font-mono text-xs font-black">
                  {trackingItem.token.tokenNumber}
                </span>
                <h3 className="font-black text-lg text-slate-900 font-heading">
                  {trackingItem.token.patientName}
                </h3>
                {trackingItem.token.isCheckedIn || trackingItem.token.status === 'Checked In' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Checked In
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                    Waiting Arrival
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Attending: <strong className="text-[#0B5A54]">{trackingItem.token.doctorName}</strong> • Phone: <span className="font-mono">{trackingItem.token.patientPhone}</span> • Slot: <span className="font-mono font-bold">{trackingItem.token.timeSlot}</span>
              </p>
            </div>

            {/* Section A: Nurse Triage Vitals */}
            <div className={`p-4 rounded-2xl border ${
              trackingItem.triage?.vitals
                ? trackingItem.triage.abnormal_flags && trackingItem.triage.abnormal_flags.length > 0
                  ? 'bg-rose-50/40 border-rose-200'
                  : 'bg-emerald-50/30 border-emerald-200'
                : 'bg-amber-50/40 border-amber-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <HeartPulse className={`w-4 h-4 ${trackingItem.triage?.vitals ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Clinical Triage Vitals (Nurse Station)
                  </h4>
                </div>

                {trackingItem.triage?.vitals ? (
                  trackingItem.triage.abnormal_flags && trackingItem.triage.abnormal_flags.length > 0 ? (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-300 font-extrabold text-[10px] rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Abnormal Vitals Flagged</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[10px] rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Recorded by Nurse</span>
                    </span>
                  )
                ) : (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-[10px] rounded-full">
                    Pending Nurse Triage
                  </span>
                )}
              </div>

              {trackingItem.triage?.vitals ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 block">Blood Pressure</span>
                      <span className="font-mono font-black text-slate-800 text-sm">
                        {trackingItem.triage.vitals.bp_systolic && trackingItem.triage.vitals.bp_diastolic
                          ? `${trackingItem.triage.vitals.bp_systolic}/${trackingItem.triage.vitals.bp_diastolic} mmHg`
                          : '--'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 block">Heart Rate</span>
                      <span className="font-mono font-black text-slate-800 text-sm">
                        {trackingItem.triage.vitals.heart_rate ? `${trackingItem.triage.vitals.heart_rate} bpm` : '--'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 block">Temperature</span>
                      <span className="font-mono font-black text-slate-800 text-sm">
                        {trackingItem.triage.vitals.temperature
                          ? `${trackingItem.triage.vitals.temperature} °${trackingItem.triage.vitals.temperature_unit || 'F'}`
                          : '--'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 block">Blood Oxygen (SpO2)</span>
                      <span className="font-mono font-black text-slate-800 text-sm">
                        {trackingItem.triage.vitals.spo2 ? `${trackingItem.triage.vitals.spo2} %` : '--'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 block">Weight / BMI</span>
                      <span className="font-mono font-black text-slate-800 text-sm">
                        {trackingItem.triage.vitals.weight_kg ? `${trackingItem.triage.vitals.weight_kg} kg` : '--'}
                        {trackingItem.triage.vitals.bmi ? ` (${trackingItem.triage.vitals.bmi.toFixed(1)})` : ''}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 block">Blood Glucose</span>
                      <span className="font-mono font-black text-slate-800 text-sm">
                        {trackingItem.triage.vitals.blood_glucose ? `${trackingItem.triage.vitals.blood_glucose} mg/dL` : 'Not tested'}
                      </span>
                    </div>
                  </div>

                  {trackingItem.triage.abnormal_flags && trackingItem.triage.abnormal_flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {trackingItem.triage.abnormal_flags.map((flag, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-black flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>{flag}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-slate-500 font-medium flex items-center justify-between pt-1 border-t border-slate-200/70">
                    <span>Recorded by: <strong className="text-slate-800">{trackingItem.triage.vitals.recorded_by_name || 'Nurse'}</strong></span>
                    <span className="font-mono">{trackingItem.triage.vitals.recorded_at ? new Date(trackingItem.triage.vitals.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}</span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center space-y-1.5">
                  <p className="text-xs font-bold text-slate-800">
                    {trackingItem.token.isCheckedIn || trackingItem.token.status === 'Checked In'
                      ? 'Patient is queued at the Nurse Station awaiting vitals'
                      : 'Patient has not arrived/checked in yet'}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Receptionists track progress here. Once the triage nurse inputs the clinical readings in the Nurse Portal, they appear here live.
                  </p>
                </div>
              )}
            </div>

            {/* Section B: Diagnostic Lab Tests */}
            <div className={`p-4 rounded-2xl border ${
              trackingLabTests.length > 0 ? 'bg-sky-50/30 border-sky-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Microscope className={`w-4 h-4 ${trackingLabTests.length > 0 ? 'text-sky-600' : 'text-slate-400'}`} />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Diagnostic Lab Tests & Specimen Status
                  </h4>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold border bg-white text-slate-700 border-slate-200">
                  {trackingLabTests.length} Tests
                </span>
              </div>

              {isLoadingTrackingLabTests ? (
                <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 animate-spin text-sky-500" />
                  <span>Loading diagnostic tests...</span>
                </div>
              ) : trackingLabTests.length > 0 ? (
                <div className="space-y-2">
                  {trackingLabTests.map((t, idx) => (
                    <div key={t.id || idx} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-extrabold text-slate-900 block">{t.test_type}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {t.recorded_at ? new Date(t.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                        </span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                        t.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : t.status === 'In Analysis'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      }`}>
                        {t.status || 'Sample Collected'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-2">
                  No diagnostic laboratory tests have been ordered for this consultation.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTrackingItem(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
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
