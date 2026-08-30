import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronDown,
  FileText,
  Pill,
  Filter,
  CheckCircle,
  Bell,
  Activity,
  Plus,
  Calendar,
  Building2,
  Ticket,
  ChevronRight,
} from 'lucide-react';

import { BottomNav } from '../../components/ui/BottomNav';
import { Chip } from '../../components/ui/Chip';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { LiveIndicator } from '../../components/ui/LiveIndicator';
import { usePolling } from '../../lib/usePolling';
import { useCarePulseStore } from '../../lib/store';
import type { MedicalHistoryItem } from '../../lib/types';

// Curated Mild Theme Palette for History & Schedule Cards
const MILD_CARD_THEMES = [
  {
    bg: 'bg-[#F4F9F8]',        // Soft Mint/Teal
    border: 'border-[#D9ECE8]',
    accent: 'bg-[#0B5A54]',
    tagBg: 'bg-[#E3F3F1]',
    tagText: 'text-[#0B5A54]',
    subtext: 'text-[#0B5A54]',
  },
  {
    bg: 'bg-[#F2F7FC]',        // Soft Light Sky
    border: 'border-[#D8E6F5]',
    accent: 'bg-[#2563EB]',
    tagBg: 'bg-[#EBF3FC]',
    tagText: 'text-[#1E40AF]',
    subtext: 'text-[#1E40AF]',
  },
  {
    bg: 'bg-[#F8F5FD]',        // Soft Lavender/Violet
    border: 'border-[#E9E0F6]',
    accent: 'bg-[#7C3AED]',
    tagBg: 'bg-[#F2EBFB]',
    tagText: 'text-[#5B21B6]',
    subtext: 'text-[#5B21B6]',
  },
  {
    bg: 'bg-[#FCF9F2]',        // Soft Warm Sand/Amber
    border: 'border-[#EFE5CE]',
    accent: 'bg-[#D97706]',
    tagBg: 'bg-[#FEF3D6]',
    tagText: 'text-[#92400E]',
    subtext: 'text-[#92400E]',
  },
];

export const MedicalHistoryScreen: React.FC = () => {
  const navigate = useNavigate();
  const user = useCarePulseStore((s) => s.user);
  const historyItems = useCarePulseStore((s) => s.history);
  const appointments = useCarePulseStore((s) => s.appointments);
  const syncHistory = useCarePulseStore((s) => s.syncHistory);
  const syncAppointments = useCarePulseStore((s) => s.syncAppointments);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Background Live Sync Polling
  const { isPolling, lastUpdated, refetch } = usePolling(
    async () => {
      if (user?.id) {
        await Promise.all([syncHistory(user.id), syncAppointments(user.id)]);
      }
    },
    {
      interval: 8000,
      enabled: !!user?.id,
    }
  );

  useEffect(() => {
    if (user?.id) {
      syncHistory(user.id);
      syncAppointments(user.id);
    }
  }, [user?.id, syncHistory, syncAppointments]);

  // Combine both past consultations and all booked appointments into unified schedule & history stream
  const combinedHistoryRecords = useMemo(() => {
    const records: (MedicalHistoryItem & {
      ticketNumber?: string;
      isAppointment?: boolean;
      doctorPhoto?: string;
    })[] = [];

    // 1. Add all booked appointments
    (appointments || []).forEach((apt) => {
      records.push({
        id: apt.id,
        date: apt.date || 'Today',
        time: apt.timeSlot || 'Scheduled Slot',
        doctorId: apt.doctorId,
        doctorName: apt.doctorName || 'Specialist Doctor',
        specialty: apt.doctorSpecialty || 'General Consultation',
        hospitalId: apt.hospitalId,
        hospital_id: apt.hospitalId,
        hospitalName: apt.hospitalName || 'CarePulse Partner Hospital',
        diagnosis:
          apt.status === 'Upcoming'
            ? `Confirmed OPD Consultation (${apt.ticketNumber || 'Ticket'}) - Ready for digital check-in.`
            : apt.status === 'Cancelled'
            ? `Appointment Cancelled (${apt.ticketNumber || 'Ticket'})`
            : `Clinical Consultation Completed (${apt.ticketNumber || 'Ticket'})`,
        prescriptionDetails: `Status: ${apt.status || 'Upcoming'} • Ticket: ${apt.ticketNumber || '#CP-0000'}`,
        status: apt.status || 'Upcoming',
        specialtyIcon: 'stethoscope',
        ticketNumber: apt.ticketNumber,
        doctorPhoto:
          apt.doctorPhoto ||
          'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
        isAppointment: true,
      });
    });

    // 2. Add clinical consultations
    (historyItems || []).forEach((h) => {
      if (!records.some((r) => r.id === h.id)) {
        records.push({
          ...h,
          doctorPhoto:
            'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
          isAppointment: false,
        });
      }
    });

    return records;
  }, [appointments, historyItems]);

  const filteredHistory = useMemo(() => {
    let result = combinedHistoryRecords.filter((item) => {
      const matchesTab =
        activeTab === 'All' ||
        (activeTab === 'Upcoming' && item.status === 'Upcoming') ||
        (activeTab === 'Completed' && ((item.status as string) === 'Completed' || (item.status as string) === 'Done')) ||
        (activeTab === 'Cardiology' && item.specialty.toLowerCase().includes('cardio')) ||
        (activeTab === 'General' && item.specialty.toLowerCase().includes('general'));

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.doctorName.toLowerCase().includes(q) ||
        item.specialty.toLowerCase().includes(q) ||
        item.hospitalName.toLowerCase().includes(q) ||
        item.diagnosis.toLowerCase().includes(q) ||
        item.prescriptionDetails.toLowerCase().includes(q) ||
        (item.ticketNumber && item.ticketNumber.toLowerCase().includes(q));

      return matchesTab && matchesQuery;
    });

    if (sortOrder === 'oldest') {
      result = [...result].reverse();
    }

    return result;
  }, [combinedHistoryRecords, activeTab, searchQuery, sortOrder]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 w-full relative select-none">
      {/* EXECUTIVE CYAN TOP HEADER */}
      <div className="bg-gradient-to-b from-[#1FA2AC] via-[#24A6B0] to-[#1FA2AC] text-white pt-4 pb-5 px-4 shadow-md sticky top-0 z-30 sm:rounded-t-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight leading-tight">History Record</h1>
              <p className="text-[11px] text-teal-50 font-medium">Scheduled visits, consultations & clinical records</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LiveIndicator
              lastUpdated={lastUpdated}
              isPolling={isPolling}
              onRefresh={refetch}
              label="Live"
            />
            <button
              onClick={() => navigate('/notifications')}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-300 ring-2 ring-[#1FA2AC]" />
            </button>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 md:px-8 py-4 space-y-4 max-w-5xl mx-auto w-full">
        {/* Top Summary Bar & New Booking Action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-[#111827]">Consultation Sessions</h2>
            <Badge variant="tint" size="sm">
              {combinedHistoryRecords.length} {combinedHistoryRecords.length === 1 ? 'Record' : 'Records'}
            </Badge>
          </div>
          <button
            onClick={() => navigate('/hospitals')}
            className="text-xs font-bold text-white bg-[#0B5A54] hover:bg-[#084540] px-3.5 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Book Doctor</span>
          </button>
        </div>

        {/* SEARCH AND FILTER CHIPS */}
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search doctor, hospital, prescription, or ticket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E7EC] rounded-2xl text-xs font-semibold placeholder:text-[#9CA3AF] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] shadow-2xs transition-all"
            />
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {['All', 'Upcoming', 'Completed', 'Cardiology', 'General'].map((tab) => (
                <Chip
                  key={tab}
                  active={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  size="sm"
                >
                  {tab}
                </Chip>
              ))}
            </div>

            <button
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              className="p-2 rounded-xl bg-white border border-[#E4E7EC] text-[#0B5A54] hover:bg-[#E3F3F1] transition-colors flex items-center gap-1 shrink-0 shadow-2xs"
              title="Toggle Sort Order"
            >
              <Filter className="w-3.5 h-3.5 text-[#0B5A54]" />
              <span className="text-[9px] font-bold uppercase">{sortOrder}</span>
            </button>
          </div>
        </div>

        {/* CONDITIONAL RENDERING: LIST VS EMPTY STATE */}
        {filteredHistory && filteredHistory.length > 0 ? (
          <div className="space-y-3.5 pt-1">
            {filteredHistory.map((item, idx) => {
              const theme = MILD_CARD_THEMES[idx % MILD_CARD_THEMES.length];
              const isExpanded = expandedId === item.id;
              const isUpcoming = item.status === 'Upcoming';
              const isCancelled = item.status === 'Cancelled';

              return (
                <div
                  key={item.id}
                  className={`relative ${theme.bg} border ${theme.border} rounded-3xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all text-left overflow-hidden group`}
                >
                  {/* Subtle Mild Accent Stripe on Left Border */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.accent} rounded-l-3xl`} />

                  {/* Header Row */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Doctor Avatar & Information */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <Avatar
                          src={item.doctorPhoto || ''}
                          alt={item.doctorName}
                          size="lg"
                          className="ring-2 ring-white shadow-xs shrink-0"
                        />
                        <div className="min-w-0 space-y-0.5">
                          {/* Tags: Ticket Badge & Status Pill */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9.5px] font-black uppercase font-mono px-2.5 py-0.5 rounded-full ${theme.tagBg} ${theme.tagText} shadow-2xs`}>
                              {item.ticketNumber || '#CP-VISIT'}
                            </span>
                            <span
                              className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                                isUpcoming
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                                  : isCancelled
                                  ? 'bg-rose-50 text-rose-800 border-rose-200/80'
                                  : 'bg-slate-100 text-slate-700 border-slate-200/80'
                              }`}
                            >
                              {item.status || 'Upcoming'}
                            </span>
                          </div>

                          <h3 className="text-sm sm:text-base font-black text-slate-900 font-heading tracking-tight truncate mt-0.5">
                            {item.doctorName}
                          </h3>
                          <p className="text-xs font-semibold text-[#0B5A54] truncate">
                            {item.specialty}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 truncate">
                            <Building2 className="w-3 h-3 text-[#14B8A6] shrink-0" />
                            <span>{item.hospitalName}</span>
                          </p>
                        </div>
                      </div>

                      {/* Expand / Collapse Indicator */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(isExpanded ? null : item.id);
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${theme.tagBg} ${theme.tagText} hover:scale-105 shadow-2xs`}
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Date & Time Strip */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-white/90 px-3 py-1.5 rounded-xl border border-slate-200/70 shadow-2xs">
                        <Calendar className="w-3.5 h-3.5 text-[#0B5A54]" />
                        <span>{item.date} • {item.time}</span>
                      </div>

                      <div className={`text-[11px] font-bold ${theme.subtext} flex items-center gap-1 group-hover:underline`}>
                        <span>{isExpanded ? 'Hide Details' : 'View Record & Rx'}</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>

                  {/* EXPANDABLE ACCORDION DETAILS */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="mt-3.5 pt-3.5 border-t border-slate-200/80 space-y-3"
                      >
                        {/* Direct FastPass / Detail Navigation for Appointments */}
                        {item.isAppointment && (
                          <button
                            onClick={() =>
                              navigate(`/appointment-detail/${item.id}`, {
                                state: {
                                  id: item.id,
                                  ticketNumber: item.ticketNumber || '',
                                  timeSlot: item.time || '',
                                  date: item.date || '',
                                  patientName: user?.fullName || 'Patient',
                                  doctorName: item.doctorName || 'Doctor',
                                  doctorSpecialty: item.specialty || 'General',
                                  doctorPhoto: item.doctorPhoto || '',
                                  facilityName: item.hospitalName || '',
                                  status: item.status || 'Upcoming',
                                },
                              })
                            }
                            className="w-full py-2.5 px-4 bg-[#0B5A54] hover:bg-[#084540] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                          >
                            <Ticket className="w-3.5 h-3.5 text-teal-200" />
                            <span>Open Digital OPD FastPass & Live Queue</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Diagnosis / Consultation Summary Card */}
                        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B5A54]">
                              <FileText className="w-3.5 h-3.5 text-[#0B5A54]" />
                              <span>{item.isAppointment ? 'APPOINTMENT SUMMARY' : 'CLINICAL DIAGNOSIS'}</span>
                            </div>
                            <span className="text-[9.5px] font-mono font-bold text-slate-400">
                              {item.isAppointment ? 'OPD PASS' : 'ICD-10 ARCHIVE'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-800 leading-relaxed bg-[#F8FAFC] p-2.5 rounded-xl border border-slate-200 font-medium">
                            {item.diagnosis}
                          </p>

                          <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold pt-0.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Verified clinical record with {item.doctorName}</span>
                          </div>
                        </div>

                        {/* Prescribed Medications / Care Instructions Card */}
                        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B5A54]">
                              <Pill className="w-3.5 h-3.5 text-[#14B8A6]" />
                              <span>{item.isAppointment ? 'PRESCRIPTION & INSTRUCTIONS' : 'PRESCRIBED MEDICATIONS'}</span>
                            </div>
                            <Badge variant="tint" size="sm">
                              {item.isAppointment ? 'Active Slot' : 'Prescribed'}
                            </Badge>
                          </div>

                          <div className="bg-[#E3F3F1]/50 p-2.5 rounded-xl border border-[#14B8A6]/20">
                            <h5 className="text-xs font-bold text-slate-900">{item.prescriptionDetails}</h5>
                            <p className="text-[10.5px] text-slate-600 mt-0.5">
                              {item.isAppointment
                                ? 'Please arrive at the hospital 15 minutes before your scheduled consultation slot.'
                                : 'Follow doctor advice and medication timing as instructed.'}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E4E7EC] shadow-xs text-center space-y-5 my-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#E3F3F1] border border-[#14B8A6]/20 flex items-center justify-center mx-auto text-[#0B5A54] shadow-sm">
              <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-[#0B5A54]" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-base sm:text-lg font-black text-[#111827] font-heading">
                No Appointments or Records
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                You haven't scheduled any doctor appointments yet. Choose from our verified doctors across all partner hospitals to book your first visit.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/hospitals')}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#0B5A54] hover:bg-[#084540] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Book an Appointment</span>
              </button>
              <button
                onClick={() => navigate('/home')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-[#F8FAFC] hover:bg-slate-100 text-[#475467] text-xs sm:text-sm font-bold border border-[#E4E7EC] transition-all cursor-pointer"
              >
                Return to Home
              </button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};
