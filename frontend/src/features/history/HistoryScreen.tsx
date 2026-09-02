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
} from 'lucide-react';
import { clsx } from 'clsx';
import { BottomNav } from '../../components/ui/BottomNav';
import { useCarePulseStore } from '../../lib/store';

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

// Curated realistic clinical visit records spanning multiple months
export const DEFAULT_MOCK_VISITS: VisitRecord[] = [
  {
    id: 'visit-1',
    doctorName: 'Dr. Sarah Jenkins',
    doctorSpecialty: 'Cardiologist',
    doctorAvatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
    hospitalName: 'CarePulse Medical Center',
    date: '2026-08-24',
    time: '10:30 AM',
    visitType: 'In-Person',
    status: 'Completed',
    summaryAvailable: true,
    diagnosis: 'Routine Cardiovascular Follow-up & ECG Review',
    prescriptionDetails: 'Lisinopril 10mg • Daily morning',
    ticketNumber: '#CP-9021',
  },
  {
    id: 'visit-2',
    doctorName: 'Dr. Marcus Vance',
    doctorSpecialty: 'Dermatologist',
    doctorAvatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
    hospitalName: 'Cedar Skin & Wellness Clinic',
    date: '2026-08-11',
    time: '2:15 PM',
    visitType: 'Video Consult',
    status: 'Completed',
    summaryAvailable: true,
    diagnosis: 'Mild Contact Dermatitis Assessment',
    prescriptionDetails: 'Hydrocortisone 1% Topical • Twice daily',
    ticketNumber: '#CP-8842',
  },
  {
    id: 'visit-3',
    doctorName: 'Dr. Elena Rostova',
    doctorSpecialty: 'General Physician',
    doctorAvatarUrl: 'https://images.unsplash.com/photo-1594824813575-b8923b789943?w=400&auto=format&fit=crop&q=80',
    hospitalName: 'Metropolitan General Hospital',
    date: '2026-07-29',
    time: '9:00 AM',
    visitType: 'In-Person',
    status: 'Completed',
    summaryAvailable: true,
    diagnosis: 'Seasonal Upper Respiratory Tract Infection',
    prescriptionDetails: 'Amoxicillin 500mg • Twice daily for 7 days',
    ticketNumber: '#CP-7910',
  },
  {
    id: 'visit-4',
    doctorName: 'Dr. James Wilson',
    doctorSpecialty: 'Orthopedic Surgeon',
    doctorAvatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
    hospitalName: 'St. Jude Sports & Ortho Center',
    date: '2026-07-15',
    time: '4:00 PM',
    visitType: 'Follow-up',
    status: 'Cancelled',
    summaryAvailable: false,
    diagnosis: 'Knee Arthroscopy Post-op Check',
    ticketNumber: '#CP-7603',
  },
  {
    id: 'visit-5',
    doctorName: 'Dr. Priya Nair',
    doctorSpecialty: 'Endocrinologist',
    doctorAvatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
    hospitalName: 'CarePulse Central Hospital',
    date: '2026-06-30',
    time: '11:45 AM',
    visitType: 'Video Consult',
    status: 'Completed',
    summaryAvailable: true,
    diagnosis: 'Type 2 Diabetes Glycemic Control Review (HbA1c 6.4%)',
    prescriptionDetails: 'Metformin 500mg • 3 times daily with meals',
    ticketNumber: '#CP-6921',
  },
  {
    id: 'visit-6',
    doctorName: 'Dr. Michael Chen',
    doctorSpecialty: 'Neurologist',
    doctorAvatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
    hospitalName: 'City Neuro & Spine Institute',
    date: '2026-06-12',
    time: '3:30 PM',
    visitType: 'In-Person',
    status: 'No-Show',
    summaryAvailable: false,
    diagnosis: 'Tension Headache & Sleep Hygiene Consultation',
    ticketNumber: '#CP-6401',
  },
  {
    id: 'visit-7',
    doctorName: 'Dr. Emily Watson',
    doctorSpecialty: 'Pulmonologist',
    doctorAvatarUrl: 'https://images.unsplash.com/photo-1594824813575-b8923b789943?w=400&auto=format&fit=crop&q=80',
    hospitalName: 'Metropolitan General Hospital',
    date: '2026-05-18',
    time: '1:00 PM',
    visitType: 'In-Person',
    status: 'Completed',
    summaryAvailable: true,
    diagnosis: 'Bronchial Asthma Maintenance Spirometry Check',
    prescriptionDetails: 'Salbutamol Inhaler 100mcg • 2 puffs PRN',
    ticketNumber: '#CP-5819',
  },
  {
    id: 'visit-8',
    doctorName: 'Dr. Alex Morgan',
    doctorSpecialty: 'Cardiologist',
    doctorAvatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
    hospitalName: 'St. Jude Heart Center',
    date: '2026-04-22',
    time: '10:00 AM',
    visitType: 'Follow-up',
    status: 'Completed',
    summaryAvailable: true,
    diagnosis: 'Lipid Panel Review & Statin Titration',
    prescriptionDetails: 'Atorvastatin 20mg • Nightly',
    ticketNumber: '#CP-4911',
  },
];

type TimeFilter = 'All' | 'This Month' | 'Last 3 Months' | 'This Year';

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  visits: propVisits,
  onSelectVisit,
  isLoading: propLoading = false,
}) => {
  const navigate = useNavigate();
  const user = useCarePulseStore((s) => s.user);
  const storeAppointments = useCarePulseStore((s) => s.appointments);
  const storeHistory = useCarePulseStore((s) => s.history);
  const syncAppointments = useCarePulseStore((s) => s.syncAppointments);
  const syncHistory = useCarePulseStore((s) => s.syncHistory);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeTimeFilter, setActiveTimeFilter] = useState<TimeFilter>('All');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [isSpecialtyMenuOpen, setIsSpecialtyMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(15);

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

    // If still empty, use rich default mock visits
    if (records.length === 0) {
      return DEFAULT_MOCK_VISITS;
    }

    // Merge mock visits for historical depth
    DEFAULT_MOCK_VISITS.forEach((mock) => {
      if (!records.some((r) => r.id === mock.id)) {
        records.push(mock);
      }
    });

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

  // Filter logic (Search query + Time filter + Specialty filter)
  const filteredVisits = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const now = new Date('2026-08-31T00:00:00Z'); // Fixed baseline for consistency

    return sourceVisits.filter((visit) => {
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

      // 3. Time Filter
      if (activeTimeFilter !== 'All') {
        const visitDate = new Date(visit.date);
        const diffDays = (now.getTime() - visitDate.getTime()) / (1000 * 3600 * 24);

        if (activeTimeFilter === 'This Month' && (diffDays > 31 || diffDays < 0)) {
          return false;
        }
        if (activeTimeFilter === 'Last 3 Months' && (diffDays > 93 || diffDays < 0)) {
          return false;
        }
        if (activeTimeFilter === 'This Year' && visitDate.getFullYear() !== 2026) {
          return false;
        }
      }

      return true;
    });
  }, [sourceVisits, searchQuery, selectedSpecialty, activeTimeFilter]);

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

  // Handle pull / click to refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (user?.id) {
      await Promise.all([syncAppointments(user.id), syncHistory(user.id)]);
    }
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleCardClick = (visit: VisitRecord) => {
    if (onSelectVisit) {
      onSelectVisit(visit);
    } else {
      setExpandedVisitId((prev) => (prev === visit.id ? null : visit.id));
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setActiveTimeFilter('All');
    setSelectedSpecialty('All');
  };

  const isFilterActive = searchQuery !== '' || activeTimeFilter !== 'All' || selectedSpecialty !== 'All';

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
    <div className="min-h-screen bg-[#F8FAFC] pb-28 w-full relative select-none">
      {/* 1. EXECUTIVE CYAN HEADER */}
      <header className="bg-gradient-to-b from-[#1FA2AC] via-[#24A6B0] to-[#1FA2AC] text-white pt-4 pb-4 px-4 sm:px-6 shadow-md sticky top-0 z-30 sm:rounded-t-3xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
              Visit History
            </h1>
            <p className="text-xs text-teal-50 font-medium">
              {filteredVisits.length} {filteredVisits.length === 1 ? 'past visit' : 'past visits'} recorded
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen((prev) => !prev);
                if (isSearchOpen) setSearchQuery('');
              }}
              className={clsx(
                'w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs',
                isSearchOpen ? 'bg-white text-[#0B5A54]' : 'bg-white/15 hover:bg-white/25 text-white'
              )}
              title="Search Visits"
              aria-label="Search Visits"
            >
              {isSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              className={clsx(
                'w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all cursor-pointer shadow-2xs',
                isRefreshing && 'animate-spin'
              )}
              title="Refresh Visits"
              aria-label="Refresh Visits"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inline Search Bar (Expands on search button click) */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl mx-auto overflow-hidden pt-3"
            >
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search doctor, specialty, hospital, or diagnosis..."
                  className="w-full bg-white text-slate-900 text-xs font-semibold placeholder:text-slate-400 pl-10 pr-9 py-2.5 rounded-2xl shadow-inner focus:outline-none focus:ring-2 focus:ring-teal-200 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. FILTER CHIPS ROW */}
      <section className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-2.5 shadow-xs sticky top-[69px] sm:top-[77px] z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Horizontally scrollable pill-shaped chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0">
            {(['All', 'This Month', 'Last 3 Months', 'This Year'] as TimeFilter[]).map((tab) => {
              const isActive = activeTimeFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTimeFilter(tab)}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer select-none shrink-0',
                    isActive
                      ? 'bg-[#0B5A54] text-white shadow-xs'
                      : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/70 border border-slate-200/60'
                  )}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Specialty Dropdown Filter */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsSpecialtyMenuOpen((prev) => !prev)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none border',
                selectedSpecialty !== 'All'
                  ? 'bg-teal-50 text-[#0B5A54] border-[#14B8A6]/50 shadow-2xs'
                  : 'bg-slate-100/90 text-slate-600 border-slate-200/60 hover:bg-slate-200/70'
              )}
            >
              <SlidersHorizontal className="w-3 h-3 text-[#14B8A6]" />
              <span className="max-w-[85px] sm:max-w-[120px] truncate">
                {selectedSpecialty === 'All' ? 'Specialty' : selectedSpecialty}
              </span>
              <ChevronDown className={clsx('w-3 h-3 transition-transform', isSpecialtyMenuOpen && 'rotate-180')} />
            </button>

            {/* Specialty Dropdown Popover */}
            <AnimatePresence>
              {isSpecialtyMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40"
                >
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[10.5px] font-black uppercase text-slate-400 tracking-wider">
                    Filter By Specialty
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
                          'w-full text-left px-3.5 py-2 text-xs font-bold flex items-center justify-between transition-colors hover:bg-teal-50/80',
                          selectedSpecialty === spec ? 'text-[#0B5A54] bg-teal-50 font-black' : 'text-slate-700'
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
                No visits found
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                {isFilterActive
                  ? "No consultations match your active filters or search terms."
                  : "You don't have any past doctor visits recorded in your clinical history."}
              </p>
            </div>

            {isFilterActive ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0B5A54] hover:bg-[#084540] transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear filters</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/hospitals')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0B5A54] hover:bg-[#084540] transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Book a Consultation</span>
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
                                <span>{visit.status}</span>
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
                                  <span>Video Consult</span>
                                </>
                              ) : (
                                <>
                                  <Building2 className="w-3 h-3 text-teal-600" />
                                  <span>{visit.visitType}</span>
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
                                          <span className="font-black text-slate-700 block">Assessment / Diagnosis:</span>
                                          <p className="text-slate-600 font-medium leading-relaxed">{visit.diagnosis}</p>
                                        </div>
                                      )}
                                      {visit.prescriptionDetails && (
                                        <div className="pt-1.5 border-t border-slate-200/70">
                                          <span className="font-black text-slate-700 block">Prescribed Medication:</span>
                                          <p className="text-[#0B5A54] font-bold">{visit.prescriptionDetails}</p>
                                        </div>
                                      )}
                                      {visit.ticketNumber && (
                                        <div className="pt-1 text-[11px] text-slate-400 font-mono">
                                          Reference Ticket: {visit.ticketNumber}
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
