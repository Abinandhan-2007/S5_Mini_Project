import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Clock,
  CheckCircle2,
  Volume2,
  Calendar,
  Search,
  ChevronRight,
  Bell,
  ArrowRight,
  TrendingUp,
  Activity,
  XCircle,
} from 'lucide-react';
import type { TokenQueueItem } from '../../types/receptionist';
import type { TriagePriority, DoctorTab } from '../../types/doctor';
import { playCallChime, speakDoctorAnnouncement } from '../../services/consultationService';
import { useStaffStore } from '../../store/staffStore';

export interface DoctorDashboardProps {
  queue: TokenQueueItem[];
  activePatient: TokenQueueItem | null;
  onSelectPatient: (patient: TokenQueueItem) => void;
  onNavigateTab: (tab: DoctorTab) => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  queue,
  activePatient,
  onSelectPatient,
  onNavigateTab,
}) => {
  const currentStaff = useStaffStore((s) => s.currentStaff);
  const doctors = useStaffStore((s) => s.doctors);
  const announcements = useStaffStore((s) => s.announcements);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);

  const activeDocId = currentStaff?.doctorId || currentStaff?.doctor_id || currentStaff?.id;
  const currentDoctor = doctors.find((d) =>
    (activeDocId && d.id === activeDocId) ||
    (currentStaff?.email && d.email?.toLowerCase() === currentStaff.email.toLowerCase()) ||
    (currentStaff?.name && d.name?.toLowerCase() === currentStaff.name.toLowerCase())
  ) || {
    id: activeDocId || 'doc-current',
    name: currentStaff?.name || 'Doctor',
    specialty: currentStaff?.department || 'General Medicine',
    roomNumber: 'Cabin 101',
    isAvailable: true,
  };

  const [selectedCalendarDate, setSelectedCalendarDate] = useState<number>(new Date().getDate());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [queueFilter, setQueueFilter] = useState<'All' | 'Waiting' | 'Urgent' | 'Completed'>('All');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Derive counts & stats
  const totalToday = queue.length;
  const waitingPatients = queue.filter((p) => p.status === 'Waiting' || p.status === 'Checked In' || (p.status as any) === 'Pending');
  const inConsultationPatients = queue.filter((p) => p.status === 'In Consultation');
  const completedPatients = queue.filter((p) => p.status === 'Completed' || (p.status as any) === 'Done');

  // Currently Serving Patient (Active in consultation OR next in line if none)
  const nowServing = inConsultationPatients[0] || activePatient || waitingPatients[0] || null;

  // Helper to derive priority
  const getPriority = (token: TokenQueueItem): TriagePriority => {
    if (token.age && (token.age < 12 || token.age >= 65)) return 'Senior-Child';
    const issue = (token.healthIssue || (token as any).issue || '').toLowerCase();
    if (issue.includes('chest') || issue.includes('breath') || issue.includes('severe') || issue.includes('emergency')) {
      return 'Urgent';
    }
    return 'Normal';
  };

  // Filtered upcoming in line
  const filteredUpcomingQueue = useMemo(() => {
    return queue.filter((p) => {
      if (nowServing && p.id === nowServing.id) return false;

      // Status filter
      if (queueFilter === 'Waiting' && p.status !== 'Waiting' && p.status !== 'Checked In') return false;
      if (queueFilter === 'Completed' && p.status !== 'Completed' && (p.status as any) !== 'Done') return false;
      if (queueFilter === 'Urgent' && getPriority(p) !== 'Urgent') return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (p.patientName || (p as any).name || '').toLowerCase();
        const token = (p.tokenNumber || '').toLowerCase();
        const issue = (p.healthIssue || (p as any).issue || '').toLowerCase();
        return name.includes(q) || token.includes(q) || issue.includes(q);
      }

      return true;
    });
  }, [queue, nowServing, queueFilter, searchQuery]);

  // Average Consultation Time calculation (12m 30s)
  const avgConsultTime = '12m 30s';

  // Stats Card array
  const statCards = [
    {
      title: "Today's Total Patients",
      value: totalToday,
      subtext: 'Scheduled & Walk-ins',
      icon: Users,
      color: 'text-teal-700',
      bg: 'bg-teal-50/70 border-teal-200/80',
      badge: '+3 vs yesterday',
    },
    {
      title: 'Waiting in Lobby',
      value: waitingPatients.length,
      subtext: 'Ready for consultation',
      icon: Clock,
      color: 'text-amber-700',
      bg: 'bg-amber-50/70 border-amber-200/80',
      badge: 'Live Queue',
    },
    {
      title: 'Completed Today',
      value: completedPatients.length,
      subtext: 'Visits concluded',
      icon: CheckCircle2,
      color: 'text-sky-700',
      bg: 'bg-sky-50/70 border-sky-200/80',
      badge: `${totalToday > 0 ? Math.round((completedPatients.length / totalToday) * 100) : 0}% Target`,
    },
    {
      title: 'Avg Consultation Time',
      value: avgConsultTime,
      subtext: 'Pacing optimal',
      icon: TrendingUp,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50/70 border-emerald-200/80',
      badge: 'Clinical Target',
    },
  ];

  // Trigger Audio Chime + TTS Call
  const handleCallPatient = (patient: TokenQueueItem) => {
    playCallChime();
    const patientName = patient.patientName || (patient as any).name || 'Patient';
    const room = currentDoctor.roomNumber || 'Cabin 102';
    speakDoctorAnnouncement(
      `Token ${patient.tokenNumber}, ${patientName}, please proceed to ${room}`
    );
    showToast(`Calling: ${patient.tokenNumber} (${patientName})`);
  };

  // Accept & Open Active Consultation Workspace
  const handleAcceptPatient = async (patient: TokenQueueItem) => {
    try {
      await updateTokenStatus(patient.id, 'In Consultation');
      showToast(`Accepted consultation for ${patient.patientName || (patient as any).name}`);
      onSelectPatient(patient);
    } catch {
      onSelectPatient(patient);
    }
  };

  // Cancel / Decline Patient
  const handleCancelPatient = async (patient: TokenQueueItem) => {
    try {
      await updateTokenStatus(patient.id, 'Cancelled');
      showToast(`Patient visit cancelled (${patient.tokenNumber})`);
    } catch {
      showToast('Could not update status');
    }
  };

  // Dynamic mini calendar generator (current week Mon - Sat)
  const currentWeekDays = useMemo(() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayLabels.map((day, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      return {
        day,
        date: d.getDate(),
        isToday: d.toDateString() === today.toDateString(),
      };
    });
  }, []);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0B5A54] text-white px-5 py-3 rounded-2xl shadow-2xl border border-teal-400/30 flex items-center gap-2 font-bold text-xs animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── TOP STATS ROW (4 STAT CARDS) ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-4 sm:p-5 rounded-2xl border ${card.bg} shadow-2xs flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-600 truncate">{card.title}</span>
                <div className={`p-1.5 rounded-xl bg-white/80 shadow-2xs ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                    {card.value}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200/40 text-[10px]">
                  <span className="text-slate-500 font-medium">{card.subtext}</span>
                  <span className="font-extrabold text-slate-700 bg-white/70 px-1.5 py-0.5 rounded-md">
                    {card.badge}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── MAIN WORKSPACE GRID: 2 COLUMNS (8 COLS / 4 COLS) ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ══════════════════════════════════════════════════════════════
            LEFT COLUMN (8 COLS) — NOW SERVING & QUEUE
        ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* NOW SERVING CARD (DOMINANT HIGH-CONTRAST FOCUS CARD) */}
          <div className="bg-white rounded-3xl border border-teal-500/30 shadow-md p-5 sm:p-6 relative overflow-hidden ring-1 ring-teal-500/10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-[#0B5A54] font-heading">
                  Now Serving in Cabin
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">Clinical Focus</span>
            </div>

            {nowServing ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#0B5A54] to-[#14B8A6] text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                      {(nowServing.patientName || (nowServing as any).name || 'P').charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-heading">
                          {nowServing.patientName || (nowServing as any).name}
                        </h3>
                        {(() => {
                          const priority = getPriority(nowServing);
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
                      <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium mt-1 flex-wrap">
                        <span>{nowServing.age || 32} Yrs • {(nowServing as any).gender || 'In-Person'}</span>
                        <span>•</span>
                        <span>Blood: <strong className="text-slate-800">{nowServing.bloodGroup || 'O+'}</strong></span>
                        <span>•</span>
                        <span>Slot: <strong className="text-slate-800">{nowServing.timeSlot || (nowServing as any).slot || '10:00 AM'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="inline-block px-3 py-1 bg-amber-50 text-amber-900 font-mono font-black text-xs sm:text-sm rounded-xl border border-amber-200 shadow-2xs">
                      {nowServing.tokenNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCallPatient(nowServing)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-[#0B5A54] text-slate-600 transition-colors cursor-pointer"
                      title="Re-announce token chime"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Chief Complaint Quote */}
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5 font-mono">
                    Chief Complaint & Reason for Visit
                  </span>
                  <p className="font-semibold text-amber-950 italic leading-relaxed">
                    "{nowServing.healthIssue || (nowServing as any).issue || 'Routine physician examination and clinical consultation.'}"
                  </p>
                </div>

                {/* Action Buttons: Cancel and Accept */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-teal-600" />
                    <span>Ready for SOAP documentation and digital prescription.</span>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    {/* Cancel / Decline Button */}
                    <button
                      type="button"
                      onClick={() => handleCancelPatient(nowServing)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 hover:border-rose-200 bg-white hover:bg-rose-50/80 text-slate-600 hover:text-rose-600 font-bold text-xs sm:text-sm shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 group"
                      title="Decline or cancel this patient visit"
                    >
                      <XCircle className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
                      <span>Cancel</span>
                    </button>

                    {/* Accept & Open Active Consultation */}
                    <button
                      type="button"
                      onClick={() => handleAcceptPatient(nowServing)}
                      className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#0B5A54] hover:bg-[#084843] text-white font-black text-xs sm:text-sm shadow-sm hover:shadow-md hover:shadow-teal-950/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer group"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
                      <span>Accept</span>
                      <ChevronRight className="w-3.5 h-3.5 text-teal-200 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No Patient Currently In Cabin</p>
                <p className="text-xs text-slate-400 mt-1">Click "Call Next Patient" above to announce next in queue.</p>
              </div>
            )}
          </div>

          {/* 3. UPCOMING QUEUE STREAM WITH SEARCH & FILTER TABS */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-[#0B5A54]" />
                <h3 className="text-sm sm:text-base font-black text-slate-900 font-heading">Patient Queue Stream</h3>
                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-[#0B5A54] text-xs font-bold border border-teal-200">
                  {filteredUpcomingQueue.length}
                </span>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {(['All', 'Waiting', 'Urgent', 'Completed'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setQueueFilter(tab)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      queueFilter === tab
                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Search in Queue */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient name, token number, or health issue..."
                className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] font-medium"
              />
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1 no-scrollbar">
              {filteredUpcomingQueue.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No patients match your current filter.
                </div>
              ) : (
                filteredUpcomingQueue.map((patient, idx) => {
                  const priority = getPriority(patient);
                  const isCompleted = patient.status === 'Completed' || (patient.status as any) === 'Done';
                  return (
                    <div
                      key={patient.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2.5 rounded-2xl transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-xl bg-slate-100 font-mono font-bold text-xs text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-[#0B5A54] transition-colors truncate font-heading">
                              {patient.patientName || (patient as any).name}
                            </h4>
                            <span
                              className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                                priority === 'Urgent'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : priority === 'Senior-Child'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-teal-50 text-[#0B5A54] border-teal-200'
                              }`}
                            >
                              {priority}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {patient.healthIssue || (patient as any).issue || 'General Consultation'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right hidden sm:block">
                          <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            {patient.tokenNumber}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {patient.timeSlot || (patient as any).slot || '10:00 AM'}
                          </p>
                        </div>

                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCallPatient(patient);
                            }}
                            className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#0B5A54] text-xs font-bold transition-colors cursor-pointer"
                            title="Announce token"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectPatient(patient)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 group-hover:bg-[#0B5A54] text-slate-700 group-hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span>{isCompleted ? 'View' : 'Consult'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT COLUMN (4 COLS) — SIDE PANEL (CALENDAR, EMR, ALERTS)
        ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. Mini Interactive Calendar / Schedule */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0B5A54]" />
                <h3 className="text-xs font-extrabold text-slate-900">OPD Roster & Schedule</h3>
              </div>
              <span className="text-[10px] font-bold text-teal-700 font-mono">August 2026</span>
            </div>

            <div className="grid grid-cols-6 gap-1.5 pt-1">
              {currentWeekDays.map((d) => {
                const isSelected = selectedCalendarDate === d.date;
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setSelectedCalendarDate(d.date)}
                    className={`p-2 rounded-xl text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0B5A54] text-white shadow-xs'
                        : d.isToday
                        ? 'bg-teal-50 text-[#0B5A54] font-bold border border-teal-200'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-bold block">{d.day}</span>
                    <span className="text-xs font-black font-mono block mt-0.5">{d.date}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Quick Links to EMR Search */}
          <div className="bg-gradient-to-br from-slate-900 to-[#062e2a] text-white rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-teal-300 font-extrabold text-xs">
              <Search className="w-4 h-4" />
              <span>Patient EMR Vault</span>
            </div>
            <h4 className="text-sm font-black leading-snug">
              Instant Patient History & Longitudinal Records
            </h4>
            <p className="text-[11px] text-teal-100/70 leading-relaxed">
              Look up past consultation notes, previous ECGs, lab reports, and prior prescriptions.
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab('emr')}
              className="w-full py-2.5 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 transition-all flex items-center justify-between cursor-pointer"
            >
              <span>Search Records Archive</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3. Hospital Broadcasts & System Alerts Feed */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-extrabold text-slate-900">Hospital Alerts & Broadcasts</h3>
              </div>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </div>

            <div className="space-y-2.5 text-xs">
              {announcements && announcements.length > 0 ? (
                announcements.slice(0, 3).map((a) => (
                  <div key={a.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <p className="font-extrabold text-slate-900">{a.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{a.message}</p>
                    <span className="text-[9px] text-slate-400 block mt-1">{(a as any).date || (a as any).createdAt || 'Broadcast Log'}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                    <p className="font-extrabold text-amber-900 text-[11px]">Emergency Lab Protocol Update</p>
                    <p className="text-[10px] text-amber-800 mt-0.5">Stat cardiac biomarker turn-around time reduced to 25 mins.</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <p className="font-extrabold text-slate-800 text-[11px]">Pharmacy Formulary Revision</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">New pediatric antibiotic suspensions added to central stock.</p>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default DoctorDashboard;
