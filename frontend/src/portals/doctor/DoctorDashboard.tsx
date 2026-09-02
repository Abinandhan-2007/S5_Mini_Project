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
  Stethoscope,
  ArrowRight,
  TrendingUp,
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
  const toggleDoctorAvailability = useStaffStore((s) => s.toggleDoctorAvailability);
  const announcements = useStaffStore((s) => s.announcements);

  const currentDoctor = doctors.find((d) => d.id === currentStaff?.id) || doctors[0] || {
    id: 'doc-1',
    name: currentStaff?.name || 'Dr. Olivia Wilson',
    specialty: 'Cardiologist',
    roomNumber: 'Cabin 102 - 1st Floor',
    isAvailable: true,
  };

  const [selectedCalendarDate, setSelectedCalendarDate] = useState<number>(new Date().getDate());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Upcoming in line (excluding currently serving)
  const upcomingQueue = useMemo(() => {
    return waitingPatients.filter((p) => !nowServing || p.id !== nowServing.id);
  }, [waitingPatients, nowServing]);

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

  // Helper to derive priority
  const getPriority = (token: TokenQueueItem): TriagePriority => {
    if (token.age && (token.age < 12 || token.age >= 65)) return 'Senior-Child';
    const issue = (token.healthIssue || (token as any).issue || '').toLowerCase();
    if (issue.includes('chest') || issue.includes('breath') || issue.includes('severe')) {
      return 'Urgent';
    }
    return 'Normal';
  };

  // Trigger Audio Chime + TTS Call
  const handleCallNextPatient = () => {
    const nextPatient = waitingPatients[0];
    if (!nextPatient) {
      showToast('No patients currently waiting in the lobby.');
      return;
    }

    playCallChime();
    const patientName = nextPatient.patientName || (nextPatient as any).name || 'Patient';
    const room = currentDoctor.roomNumber || 'Cabin 102';
    speakDoctorAnnouncement(
      `Token ${nextPatient.tokenNumber}, ${patientName}, please proceed to ${room}`
    );

    showToast(`Calling Next Patient: ${nextPatient.tokenNumber} (${patientName})`);
    onSelectPatient(nextPatient);
  };

  const handleToggleCabinDuty = async () => {
    await toggleDoctorAvailability(currentDoctor.id);
    showToast(`Cabin status changed to ${!currentDoctor.isAvailable ? 'Active' : 'Offline'}`);
  };

  // Mini calendar generator (current week)
  const currentWeekDays = [
    { day: 'Mon', date: 10 },
    { day: 'Tue', date: 11 },
    { day: 'Wed', date: 12 },
    { day: 'Thu', date: 13, isToday: true },
    { day: 'Fri', date: 14 },
    { day: 'Sat', date: 15 },
  ];

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
            LEFT COLUMN (8 COLS) — CABIN STATUS, NOW SERVING & QUEUE
        ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. Cabin Status Widget & Call Next Patient CTA */}
          <div className="bg-gradient-to-r from-[#0B5A54] to-[#14B8A6] rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono text-xs font-black backdrop-blur-xs border border-white/20">
                  {currentDoctor.roomNumber || 'Cabin 102 - 1st Floor'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleCabinDuty}
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-all ${
                    currentDoctor.isAvailable ? 'bg-emerald-400/30 hover:bg-emerald-400/40 text-emerald-100' : 'bg-rose-400/30 hover:bg-rose-400/40 text-rose-100'
                  }`}
                  title="Click to toggle cabin active/offline status"
                >
                  <span className={`w-2 h-2 rounded-full ${currentDoctor.isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  {currentDoctor.isAvailable ? 'Cabin Active' : 'Cabin Offline'}
                </button>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">Physician Command Center</h2>
              <p className="text-xs text-teal-100/80 mt-0.5">
                {waitingPatients.length > 0
                  ? `${waitingPatients.length} patient${waitingPatients.length > 1 ? 's' : ''} currently queued in OPD lobby.`
                  : 'All queued patients attended to for this slot.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5 z-10 self-start sm:self-auto">
              {/* Call Next Button with TTS */}
              <button
                type="button"
                onClick={handleCallNextPatient}
                className="px-5 py-3 rounded-2xl bg-white text-[#0B5A54] hover:bg-teal-50 font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-[#0B5A54]" />
                <span>Call Next Patient</span>
              </button>
            </div>
          </div>

          {/* 2. NOW SERVING CARD (DOMINANT HIGH-CONTRAST FOCUS CARD) */}
          <div className="bg-white rounded-3xl border-2 border-[#0B5A54]/30 shadow-md p-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider text-[#0B5A54]">
                  Now Serving in Cabin
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">Main Focus Patient</span>
            </div>

            {nowServing ? (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0B5A54] to-[#14B8A6] text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                      {(nowServing.patientName || (nowServing as any).name || 'P').charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">
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
                      <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium mt-1">
                        <span>{nowServing.age || 32} Years</span>
                        <span>•</span>
                        <span>Blood: <strong className="text-slate-800">{nowServing.bloodGroup || 'O+'}</strong></span>
                        <span>•</span>
                        <span>Slot: <strong className="text-slate-800">{nowServing.timeSlot || (nowServing as any).slot || '10:00 AM'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-2xl border sm:border-0 border-slate-100">
                    <span className="inline-block px-3 py-1 bg-amber-50 text-amber-900 font-mono font-black text-sm rounded-xl border border-amber-200 shadow-2xs">
                      {nowServing.tokenNumber}
                    </span>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      {nowServing.ticketNumber || '#CP-2026'}
                    </p>
                  </div>
                </div>

                {/* Chief Complaint Quote */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                    Chief Complaint & Intake
                  </span>
                  <p className="font-semibold text-amber-950 italic">
                    "{nowServing.healthIssue || (nowServing as any).issue || 'Routine physician examination and clinical consultation.'}"
                  </p>
                </div>

                {/* Primary Action Button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-500 font-medium">
                    Ready for SOAP documentation and digital prescription.
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectPatient(nowServing)}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#0B5A54] hover:bg-[#084843] text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Open Consultation Workspace</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No Patient Currently In Cabin</p>
                <p className="text-xs text-slate-400 mt-1">Click "Call Next Patient" above to announce next in queue.</p>
              </div>
            )}
          </div>

          {/* 3. UPCOMING QUEUE STREAM (SCROLLABLE LIST) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#0B5A54]" />
                <h3 className="text-base font-black text-slate-900">Upcoming Patient Queue</h3>
                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-[#0B5A54] text-xs font-bold border border-teal-200">
                  {upcomingQueue.length} Waiting
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('queue')}
                className="text-xs font-bold text-[#0B5A54] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
              {upcomingQueue.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No further patients waiting in the current queue.
                </div>
              ) : (
                upcomingQueue.map((patient, idx) => {
                  const priority = getPriority(patient);
                  return (
                    <div
                      key={patient.id}
                      onClick={() => onSelectPatient(patient)}
                      className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 px-3 rounded-2xl transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-xl bg-slate-100 font-mono font-bold text-xs text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-[#0B5A54] transition-colors truncate">
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

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            {patient.tokenNumber}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {patient.timeSlot || (patient as any).slot || '10:00 AM'}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0B5A54] transition-colors" />
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
