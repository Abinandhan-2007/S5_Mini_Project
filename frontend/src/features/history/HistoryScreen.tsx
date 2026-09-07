import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Calendar,
  Clock,
  Building2,
  Video,
  FileText,
  ChevronRight,
  ChevronDown,
  CalendarX,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Stethoscope,
  X,
  SlidersHorizontal,
  Bell,
} from 'lucide-react';
import { clsx } from 'clsx';
import { BottomNav } from '../../components/ui/BottomNav';
import { useCarePulseStore } from '../../lib/store';
import { useTranslation } from '../../i18n';

export type VisitType = 'In-Person' | 'Video Consult' | 'Follow-up';
export type VisitStatus = 'Completed' | 'Cancelled' | 'No-Show';

export interface VisitRecord {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorAvatarUrl?: string;
  hospitalName: string;
  date: string; // ISO date format YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  time: string; // e.g. "2:00 PM"
  visitType: VisitType;
  status: VisitStatus;
  summaryAvailable: boolean; // whether SOAP notes/summary exist
  diagnosis?: string;
  prescriptionDetails?: string;
  ticketNumber?: string;
}

export interface HistoryScreenProps {
  visits?: VisitRecord[];
  onSelectVisit?: (visit: VisitRecord) => void;
  isLoading?: boolean;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  visits: propVisits,
  onSelectVisit,
  isLoading: propLoading = false,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useCarePulseStore((s) => s.user);
  const storeAppointments = useCarePulseStore((s) => s.appointments);
  const storeHistory = useCarePulseStore((s) => s.history);
  const syncAppointments = useCarePulseStore((s) => s.syncAppointments);
  const syncHistory = useCarePulseStore((s) => s.syncHistory);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [customDateFilter, setCustomDateFilter] = useState<string>('ALL');
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [isSpecialtyMenuOpen, setIsSpecialtyMenuOpen] = useState(false);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(15);

  const formattedDateLabel = useMemo(() => {
    if (customDateFilter === 'ALL') return t('history.allDates', 'All Dates');
    try {
      const d = new Date(customDateFilter + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch {
      // fallback
    }
    return customDateFilter;
  }, [customDateFilter, t]);

  // Sync on mount if user is logged in
  useEffect(() => {
    if (user?.id) {
      syncAppointments(user.id);
      syncHistory(user.id);
    }
  }, [user?.id, syncAppointments, syncHistory]);

  // Combine props, store appointments/history, and mock visits with smart deduplication
  const sourceVisits = useMemo<VisitRecord[]>(() => {
    if (propVisits && propVisits.length > 0) {
      return propVisits;
    }

    const records: VisitRecord[] = [];

    // Map store appointments
    if (storeAppointments && storeAppointments.length > 0) {
      storeAppointments.forEach((apt) => {
        const docDiagnosis =
          (apt as any).diagnosis ||
          (apt as any).assessment ||
          (apt as any).healthIssue ||
          'Clinical OPD Consultation';

        records.push({
          id: apt.id,
          doctorName: apt.doctorName || 'Doctor Specialist',
          doctorSpecialty: apt.doctorSpecialty || 'General Care',
          doctorAvatarUrl: apt.doctorPhoto || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
          hospitalName: apt.hospitalName || 'CarePulse Partner Hospital',
          date: apt.date || '2026-08-25',
          time: apt.timeSlot || '10:00 AM',
          visitType: apt.type === 'Telehealth' ? 'Video Consult' : 'In-Person',
          status: apt.status === 'Completed' ? 'Completed' : 'Completed',
          summaryAvailable: true,
          diagnosis: docDiagnosis,
          prescriptionDetails: (apt as any).prescriptionDetails || (apt as any).prescriptions?.join(', '),
          ticketNumber: apt.ticketNumber,
        });
      });
    }

    // Map store clinical history items
    if (storeHistory && storeHistory.length > 0) {
      storeHistory.forEach((h, idx) => {
        if (!records.some((r) => r.id === h.id)) {
          records.push({
            id: h.id || `hist-${idx}`,
            doctorName: h.doctorName || 'Consulting Physician',
            doctorSpecialty: h.specialty || 'General Medicine',
            doctorAvatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
            hospitalName: h.hospitalName || 'CarePulse Medical Center',
            date: h.date || '2026-07-20',
            time: '11:00 AM',
            visitType: 'In-Person',
            status: 'Completed',
            summaryAvailable: Boolean(h.prescriptionDetails || h.diagnosis),
            diagnosis: h.diagnosis || 'Clinical Consultation Record',
            prescriptionDetails: h.prescriptionDetails,
          });
        }
      });
    }

    // Sort descending by date
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [propVisits, storeAppointments, storeHistory]);

  // Extract unique specialties for dropdown
  const allSpecialties = useMemo(() => {
    const specs = new Set<string>();
    sourceVisits.forEach((v) => {
      if (v.doctorSpecialty) specs.add(v.doctorSpecialty);
    });
    return ['All', ...Array.from(specs)];
  }, [sourceVisits]);

  // Filter and Sort logic (Search query + Specialty filter + Date Filter + Date Sort)
  const filteredVisits = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    const filtered = sourceVisits.filter((visit) => {
      // 1. Search Query Match
      if (query) {
        const matchesDoc = visit.doctorName.toLowerCase().includes(query);
        const matchesHosp = visit.hospitalName.toLowerCase().includes(query);
        const matchesSpec = visit.doctorSpecialty.toLowerCase().includes(query);
        const matchesDiag = visit.diagnosis?.toLowerCase().includes(query);
        const matchesTicket = visit.ticketNumber?.toLowerCase().includes(query);

        if (!matchesDoc && !matchesHosp && !matchesSpec && !matchesDiag && !matchesTicket) {
          return false;
        }
      }

      // 2. Specialty Filter
      if (selectedSpecialty !== 'All' && visit.doctorSpecialty !== selectedSpecialty) {
        return false;
      }

      // 3. Custom Date Filter
      if (customDateFilter !== 'ALL') {
        const visitDateStr = visit.date.split('T')[0];
        if (visitDateStr !== customDateFilter) {
          return false;
        }
      }

      return true;
    });

    // Sort by Date (chronological newest first)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sourceVisits, searchQuery, selectedSpecialty, customDateFilter]);

  // Group filtered visits by Month & Year (e.g. "August 2026", "July 2026")
  const groupedVisits = useMemo(() => {
    const groups: { monthKey: string; visits: VisitRecord[] }[] = [];

    filteredVisits.forEach((visit) => {
      let monthKey = 'Recent Visits';
      try {
        const d = new Date(visit.date);
        if (!isNaN(d.getTime())) {
          monthKey = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
      } catch {
        monthKey = 'Archived Records';
      }

      let existingGroup = groups.find((g) => g.monthKey === monthKey);
      if (!existingGroup) {
        existingGroup = { monthKey, visits: [] };
        groups.push(existingGroup);
      }
      existingGroup.visits.push(visit);
    });

    return groups;
  }, [filteredVisits]);

  // Total displayed count for pagination
  const paginatedGroups = useMemo(() => {
    let count = 0;
    const result: { monthKey: string; visits: VisitRecord[] }[] = [];

    for (const group of groupedVisits) {
      const remaining = visibleCount - count;
      if (remaining <= 0) break;

      const slice = group.visits.slice(0, remaining);
      result.push({ monthKey: group.monthKey, visits: slice });
      count += slice.length;
    }

    return result;
  }, [groupedVisits, visibleCount]);

  const hasMore = filteredVisits.length > visibleCount;

  const handleCardClick = (visit: VisitRecord) => {
    if (onSelectVisit) {
      onSelectVisit(visit);
    } else {
      setExpandedVisitId((prev) => (prev === visit.id ? null : visit.id));
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setCustomDateFilter('ALL');
    setSelectedSpecialty('All');
  };

  const isFilterActive = searchQuery !== '' || customDateFilter !== 'ALL' || selectedSpecialty !== 'All';

  // Highlight matched substrings in search
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-teal-100 text-[#0B5A54] font-black rounded-xs px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFCFD] pb-28 w-full relative select-none">
      {/* 1. LIGHTER LUMINOUS CYAN HEADER WITH EXPANDABLE UNIQUE SEARCH */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#22B3BD] via-[#28BAC4] to-[#35C6D0] text-white pt-5 pb-5 px-4 sm:px-6 shadow-sm sm:rounded-t-3xl transition-all">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Top Row: Title + Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-white drop-shadow-2xs font-heading">
                {t('history.title', 'History')}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Search Trigger Button (Hidden when search bar is open) */}
              <AnimatePresence>
                {!isSearchOpen && (
                  <motion.button
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    type="button"
                    onClick={() => setIsSearchOpen(true)}
                    className="w-9 h-9 rounded-full bg-white text-[#111827] hover:bg-teal-50 hover:text-[#0B5A54] flex items-center justify-center transition-all relative active:scale-95 shadow-sm shrink-0 cursor-pointer"
                    aria-label="Search Visits"
                    title="Search Visits"
                  >
                    <Search className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Notification Bell Button */}
              <button
                onClick={() => navigate('/notifications')}
                className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#111827] hover:bg-gray-100 transition-all relative active:scale-95 shadow-sm shrink-0 cursor-pointer"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-[#111827]" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
              </button>
            </div>
          </div>

          {/* UNIQUE EXPANDABLE SEARCH INTERFACE */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: -8 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -8 }}
                transition={{ type: 'spring', damping: 25, stiffness: 320 }}
                className="overflow-hidden pt-1 space-y-2"
              >
                {/* Search Bar Input Container with Close Trigger */}
                <div className="relative flex items-center bg-white/95 backdrop-blur-md rounded-full px-4 py-2.5 shadow-md focus-within:ring-2 focus-within:ring-white transition-all">
                  <Search className="w-4.5 h-4.5 text-[#0B5A54] shrink-0 mr-2.5" />
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('history.searchVisitsPlaceholder', 'Search doctor, hospital, diagnosis, Rx...')}
                    className="w-full bg-transparent border-none text-xs sm:text-sm text-[#111827] font-bold focus:outline-none placeholder:text-[#94A3B8]"
                  />

                  {/* Live Match Badge */}
                  {searchQuery && (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-teal-100/90 text-[#0B5A54] px-2 py-0.5 rounded-full mr-2 shrink-0 select-none">
                      {filteredVisits.length} {t('history.foundCount', 'found')}
                    </span>
                  )}

                  {/* Close / Collapse Search Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 ml-1 cursor-pointer transition-colors shrink-0"
                    title="Close search"
                    aria-label="Close search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* 2. UNIQUE GLASSMORPHIC FILTER TOOLBAR */}
      <section className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5 shadow-xs sticky top-[73px] sm:top-[85px] z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2.5">
          {/* Left: Interactive Date Filter Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsDateMenuOpen((prev) => !prev);
                setIsSpecialtyMenuOpen(false);
              }}
              className={clsx(
                'px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer select-none border shadow-2xs active:scale-95',
                customDateFilter !== 'ALL'
                  ? 'bg-teal-50 text-[#0B5A54] border-[#14B8A6] font-black'
                  : 'bg-slate-100/90 text-slate-700 border-slate-200/70 hover:bg-slate-200/70'
              )}
            >
              <Calendar className={clsx('w-3.5 h-3.5', customDateFilter !== 'ALL' ? 'text-[#0B5A54]' : 'text-slate-500')} />
              <span>{formattedDateLabel}</span>
              <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform text-slate-400', isDateMenuOpen && 'rotate-180')} />
            </button>

            {/* Date Selection Popover */}
            <AnimatePresence>
              {isDateMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 z-40 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#0B5A54]" />
                      {t('history.filterByDate', 'Filter by Date')}
                    </span>
                    {customDateFilter !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomDateFilter('ALL');
                          setIsDateMenuOpen(false);
                        }}
                        className="text-[11px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        {t('common.reset', 'Reset')}
                      </button>
                    )}
                  </div>

                  {/* Preset Quick Tabs */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomDateFilter('ALL');
                        setIsDateMenuOpen(false);
                      }}
                      className={clsx(
                        'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer',
                        customDateFilter === 'ALL'
                          ? 'bg-[#0B5A54] text-white shadow-2xs font-black'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      All Records
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        setCustomDateFilter(todayStr);
                        setIsDateMenuOpen(false);
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center bg-slate-50 text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Today
                    </button>
                  </div>

                  {/* Specific Date Picker Input */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[10.5px] font-bold text-slate-500 block">Or select specific day:</label>
                    <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#0B5A54] transition-all">
                      <input
                        type="date"
                        value={customDateFilter === 'ALL' ? '' : customDateFilter}
                        onChange={(e) => {
                          setCustomDateFilter(e.target.value || 'ALL');
                          if (e.target.value) setIsDateMenuOpen(false);
                        }}
                        className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Interactive Specialty Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsSpecialtyMenuOpen((prev) => !prev);
                setIsDateMenuOpen(false);
              }}
              className={clsx(
                'px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer select-none border shadow-2xs active:scale-95',
                selectedSpecialty !== 'All'
                  ? 'bg-teal-50 text-[#0B5A54] border-[#14B8A6] font-black'
                  : 'bg-slate-100/90 text-slate-700 border-slate-200/70 hover:bg-slate-200/70'
              )}
            >
              <SlidersHorizontal className={clsx('w-3.5 h-3.5', selectedSpecialty !== 'All' ? 'text-[#0B5A54]' : 'text-slate-500')} />
              <span className="max-w-[100px] sm:max-w-[140px] truncate">
                {selectedSpecialty === 'All' ? t('history.allSpecialties', 'All Specialties') : selectedSpecialty}
              </span>
              <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform text-slate-400', isSpecialtyMenuOpen && 'rotate-180')} />
            </button>

            {/* Specialty Dropdown Popover */}
            <AnimatePresence>
              {isSpecialtyMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-40"
                >
                  <div className="px-3.5 py-1.5 border-b border-slate-100 text-[10.5px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                    <span>{t('history.filterBySpecialty', 'Filter Specialty')}</span>
                    {selectedSpecialty !== 'All' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSpecialty('All');
                          setIsSpecialtyMenuOpen(false);
                        }}
                        className="text-[10.5px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        {t('common.reset', 'Reset')}
                      </button>
                    )}
                  </div>
                  <div className="max-h-56 overflow-y-auto no-scrollbar py-1">
                    {allSpecialties.map((spec) => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => {
                          setSelectedSpecialty(spec);
                          setIsSpecialtyMenuOpen(false);
                        }}
                        className={clsx(
                          'w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between hover:bg-teal-50 transition-colors cursor-pointer',
                          selectedSpecialty === spec ? 'text-[#0B5A54] font-black bg-teal-50/70' : 'text-slate-700'
                        )}
                      >
                        <span className="truncate">{spec}</span>
                        {selectedSpecialty === spec && <CheckCircle2 className="w-3.5 h-3.5 text-[#0B5A54]" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* 3. MAIN TIMELINE CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-6">
        {propLoading ? (
          /* SKELETON LOADING SHIMMER STATE */
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden space-y-3 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="w-36 h-4 bg-slate-200 rounded-md" />
                    <div className="w-24 h-3 bg-slate-200 rounded-md" />
                  </div>
                  <div className="w-20 h-6 bg-slate-200 rounded-full" />
                </div>
                <div className="w-48 h-3 bg-slate-200 rounded-md" />
              </div>
            ))}
          </div>
        ) : filteredVisits.length === 0 ? (
          /* EMPTY STATE */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-xs text-center space-y-4 my-6"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#E3F3F1] border border-[#14B8A6]/20 flex items-center justify-center mx-auto text-[#0B5A54] shadow-sm">
              <CalendarX className="w-8 h-8 sm:w-10 sm:h-10 text-[#0B5A54]" />
            </div>

            <div className="max-w-sm mx-auto space-y-1.5">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {t('history.noAppointmentsFound', 'No consultation records found')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                {isFilterActive
                  ? t('history.noAppointmentsDesc', 'No consultations match your active filters or search terms.')
                  : t('history.noAppointmentsDesc', 'Your scheduled and completed hospital visits will appear here.')}
              </p>
            </div>

            {isFilterActive ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0B5A54] hover:bg-[#084540] transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('history.clearAllFilters', 'Clear all filters')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/hospitals')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0B5A54] hover:bg-[#084540] transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>{t('home.bookAppointment', 'Book Doctor')}</span>
              </button>
            )}
          </motion.div>
        ) : (
          /* GROUPED TIMELINE */
          <div className="space-y-8">
            {paginatedGroups.map((group) => (
              <section key={group.monthKey} className="space-y-4">
                {/* Sticky Section Month Header */}
                <div className="sticky top-[125px] sm:top-[133px] z-10 py-1 bg-[#F8FAFC]/95 backdrop-blur-xs flex items-center gap-3">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest font-heading whitespace-nowrap">
                    {group.monthKey}
                  </span>
                  <div className="h-px bg-slate-200 flex-1" />
                  <span className="text-[11px] font-bold text-slate-400 shrink-0">
                    {group.visits.length} {group.visits.length === 1 ? 'visit' : 'visits'}
                  </span>
                </div>

                {/* History Activity List */}
                <div className="space-y-4">
                  {group.visits.map((visit, idx) => {
                    const isCompleted = visit.status === 'Completed';
                    const isCancelled = visit.status === 'Cancelled';
                    const isNoShow = visit.status === 'No-Show';
                    const isExpanded = expandedVisitId === visit.id;

                    return (
                      <motion.div
                        key={visit.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: idx * 0.04 }}
                        className="relative"
                      >
                        {/* VISIT CARD */}
                        <motion.div
                          whileHover={{ y: -2, scale: 1.005 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleCardClick(visit)}
                          className={clsx(
                            'bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer shadow-[0_3px_12px_-2px_rgba(11,90,84,0.06)] hover:shadow-md space-y-3 relative overflow-hidden',
                            isExpanded ? 'border-[#14B8A6] ring-1 ring-[#14B8A6]/30' : 'border-slate-200/90'
                          )}
                        >
                          {/* Top Row: Avatar + Doctor Info + Status Badge */}
                          <div className="flex items-start justify-between gap-3">
                            {/* Left + Middle */}
                            <div className="flex items-center gap-3 min-w-0">
                              {/* 44px Doctor Avatar with Status Ring */}
                              <div className="relative shrink-0">
                                <img
                                  src={visit.doctorAvatarUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80'}
                                  alt={visit.doctorName}
                                  className={clsx(
                                    'w-11 h-11 rounded-full object-cover shadow-xs',
                                    isCompleted && 'ring-2 ring-[#14B8A6]',
                                    isCancelled && 'ring-2 ring-rose-300',
                                    isNoShow && 'ring-2 ring-slate-300'
                                  )}
                                  loading="lazy"
                                />
                              </div>

                              {/* Doctor Details */}
                              <div className="min-w-0 space-y-0.5">
                                <h4 className="text-sm sm:text-base font-black text-slate-900 truncate tracking-tight">
                                  {highlightMatch(visit.doctorName, searchQuery)}
                                </h4>
                                <p className="text-xs text-slate-500 font-semibold truncate flex items-center gap-1.5">
                                  <span className="text-[#0B5A54] font-extrabold">{visit.doctorSpecialty}</span>
                                  <span>•</span>
                                  <span className="truncate">{highlightMatch(visit.hospitalName, searchQuery)}</span>
                                </p>
                              </div>
                            </div>

                            {/* Right Status Badge */}
                            <div className="shrink-0 flex flex-col items-end gap-1">
                              <span
                                className={clsx(
                                  'inline-flex items-center gap-1 text-[10.5px] sm:text-xs font-black px-2.5 py-0.5 rounded-full border shadow-2xs',
                                  isCompleted && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                                  isCancelled && 'bg-rose-50 text-rose-800 border-rose-200',
                                  isNoShow && 'bg-slate-100 text-slate-700 border-slate-200'
                                )}
                              >
                                {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-600 stroke-[2.5]" />}
                                {isCancelled && <XCircle className="w-3 h-3 text-rose-600 stroke-[2.5]" />}
                                {isNoShow && <AlertCircle className="w-3 h-3 text-slate-500 stroke-[2.5]" />}
                                <span>
                                  {visit.status === 'Completed'
                                    ? t('history.statusCompleted', 'Completed')
                                    : visit.status === 'Cancelled'
                                    ? t('history.statusCancelled', 'Cancelled')
                                    : visit.status}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Middle Row: Date, Time & Visit Type */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs font-medium text-slate-600">
                            {/* Date & Time with Calendar Icon */}
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                                <Calendar className="w-3.5 h-3.5 text-[#0B5A54] shrink-0" />
                                <span>
                                  {new Date(visit.date).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </span>

                              <span className="flex items-center gap-1 text-slate-500 font-mono font-semibold">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{visit.time}</span>
                              </span>
                            </div>

                            {/* Visit Type Badge */}
                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200/60">
                              {visit.visitType === 'Video Consult' ? (
                                <>
                                  <Video className="w-3 h-3 text-indigo-500" />
                                  <span>{t('history.videoConsult', 'Video Consult')}</span>
                                </>
                              ) : (
                                <>
                                  <Building2 className="w-3 h-3 text-teal-600" />
                                  <span>
                                    {visit.visitType === 'In-Person'
                                      ? t('history.inPerson', 'In-Person')
                                      : visit.visitType === 'Follow-up'
                                      ? t('history.followUp', 'Follow-up')
                                      : visit.visitType}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Summary / SOAP notes expandable section */}
                          {visit.summaryAvailable && (
                            <div className="pt-1">
                              <div
                                className="w-full flex items-center justify-between text-xs font-bold text-[#0B5A54] bg-[#E3F3F1]/80 hover:bg-[#E3F3F1] px-3 py-1.5 rounded-xl border border-[#14B8A6]/30 transition-colors"
                              >
                                <span className="flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-[#0B5A54]" />
                                  <span>{isExpanded ? 'Hide Consultation Summary' : 'View Consultation Summary'}</span>
                                </span>
                                <ChevronRight className={clsx('w-3.5 h-3.5 transition-transform duration-200', isExpanded && 'rotate-90')} />
                              </div>

                              {/* Expanded Clinical Details */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                                      {visit.diagnosis && (
                                        <div>
                                          <span className="font-black text-slate-700 block">{t('history.diagnosisLabel', 'Diagnosis')}:</span>
                                          <p className="text-slate-600 font-medium leading-relaxed">{visit.diagnosis}</p>
                                        </div>
                                      )}
                                      {visit.prescriptionDetails && (
                                        <div className="pt-1.5 border-t border-slate-200/70">
                                          <span className="font-black text-slate-700 block">{t('history.prescriptionLabel', 'Prescription')}:</span>
                                          <p className="text-[#0B5A54] font-bold">{visit.prescriptionDetails}</p>
                                        </div>
                                      )}
                                      {visit.ticketNumber && (
                                        <div className="pt-1 text-[11px] text-slate-400 font-mono">
                                          {t('history.tokenLabel', 'Token')}: {visit.ticketNumber}
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 15)}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-[#0B5A54] bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  Load more visits
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. BOTTOM NAVIGATION */}
      <BottomNav />
    </div>
  );
};

export default HistoryScreen;
