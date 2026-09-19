import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Ticket,
  Calendar as CalendarIcon,
  User as UserIcon,
  Building2,
  Search,
  Mic,
  X,
  Check,
  CheckCircle2,
  Users,
  RefreshCw,
  HeartPulse,
  Microscope,
} from 'lucide-react';







import { TopBar } from '../../components/ui/TopBar';
import { BottomNav } from '../../components/ui/BottomNav';
import { Avatar } from '../../components/ui/Avatar';
import { requestNativeLocation } from '../../lib/locationService';
import { usePolling } from '../../lib/usePolling';
import { apiFetch } from '../../lib/apiFetch';

import { useCarePulseStore } from '../../lib/store';
import { doctorService } from '../../services/doctorService';
import { hospitalService } from '../../services/hospitalService';
import { isUserProfileIncomplete } from '../auth/CompleteProfileScreen';
import { MedicationCardStack, SmartMedicineLensCard } from '../../components/prescriptions';
import { AppointmentCardStack } from '../../components/appointments/AppointmentCardStack';
import type { Appointment } from '../../lib/types';
import { useLocalizedEntities } from '../../i18n';

interface LiveQueueTimelineItem {
  id: string;
  tokenNumber: string;
  patientName: string;
  status: string;
  time: string;
  isUser: boolean;
  personsAhead?: number;
}

interface LiveQueueData {
  success: boolean;
  appointment: Appointment;
  personsAhead: number;
  currentStatus: string;
  inConsultation: string | null;
  timeline: LiveQueueTimelineItem[];
}

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t, formatSpecialty, formatDoctorName, formatHospitalName } = useLocalizedEntities();
  const user = useCarePulseStore((s) => s.user);
  const appointments = useCarePulseStore((s) => s.appointments);
  const activeAppointment = useCarePulseStore((s) => s.activeAppointment);
  const prescriptions = useCarePulseStore((s) => s.prescriptions);
  const syncAppointments = useCarePulseStore((s) => s.syncAppointments);
  const syncPrescriptions = useCarePulseStore((s) => s.syncPrescriptions);
  const setBookingDoctor = useCarePulseStore((s) => s.setBookingDoctor);

  // Active appointments list (fallback to activeAppointment or empty if none)
  const activeAppointments = useMemo(() => {
    if (appointments && appointments.length > 0) {
      const activeList = appointments.filter((a) => {
        const s = (a.status || '').trim().toLowerCase();
        return s !== 'completed' && s !== 'cancelled' && s !== 'rejected' && s !== 'archived';
      });
      if (activeList.length > 0) return activeList;
    }
    if (activeAppointment) {
      const s = (activeAppointment.status || '').trim().toLowerCase();
      if (s !== 'completed' && s !== 'cancelled' && s !== 'rejected' && s !== 'archived') {
        return [activeAppointment];
      }
    }
    return [];
  }, [appointments, activeAppointment]);

  const [selectedModalAppointment, setSelectedModalAppointment] = useState<Appointment | null>(null);
  const [liveQueueData, setLiveQueueData] = useState<LiveQueueData | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  const fetchLiveQueue = async (appointmentId: string, showSpinner = false) => {
    if (showSpinner) setIsLoadingQueue(true);
    try {
      const res = await apiFetch(`/appointments/${appointmentId}/live-queue`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLiveQueueData(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch live queue data', err);
    } finally {
      if (showSpinner) setIsLoadingQueue(false);
    }
  };

  // Automatic background polling for Patient appointments & queue updates (3500ms)
  usePolling(
    async () => {
      if (user?.id) {
        await Promise.all([
          syncAppointments(user.id),
          syncPrescriptions(user.id),
        ]);
      }
    },
    {
      interval: 3500,
      enabled: !!user?.id,
    }
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [completedNotice] = useState<string | null>(null);

  // Periodic polling for live queue timeline when modal is open
  usePolling(
    async () => {
      const modalApp = selectedModalAppointment || activeAppointment || activeAppointments[0];
      if (isQueueModalOpen && modalApp?.id) {
        await fetchLiveQueue(modalApp.id, false);
      }
    },
    {
      interval: 4000,
      enabled: isQueueModalOpen && !!(selectedModalAppointment?.id || activeAppointment?.id || activeAppointments[0]?.id),
    }
  );

  // Immediate sync on tab focus or visibility change
  useEffect(() => {
    if (!user?.id) return;
    const handleSync = () => {
      syncAppointments(user.id);
      syncPrescriptions(user.id);
    };
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);
    return () => {
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, [user?.id, syncAppointments, syncPrescriptions]);

  useEffect(() => {
    const modalApp = selectedModalAppointment || activeAppointment || activeAppointments[0];
    if (isQueueModalOpen && modalApp?.id) {
      fetchLiveQueue(modalApp.id, true);
    }
  }, [isQueueModalOpen, selectedModalAppointment?.id, activeAppointment?.id]);

  const handleRefreshQueue = async () => {
    const modalApp = selectedModalAppointment || activeAppointment || activeAppointments[0];
    if (!modalApp?.id) return;
    setIsRefreshing(true);
    await fetchLiveQueue(modalApp.id, false);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  };

  // Prompt native mobile OS system location permission on app startup without redirecting
  useEffect(() => {
    const promptNativeLocationOnStartup = async () => {
      const hasPrompted = sessionStorage.getItem('location_native_prompted');
      if (!hasPrompted) {
        sessionStorage.setItem('location_native_prompted', 'true');
        await requestNativeLocation();
      }
    };
    promptNativeLocationOnStartup();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = (searchQuery || '').trim().toLowerCase();
    if (!query) {
      navigate('/hospitals');
      return;
    }

    // 1. Check if query matches a Doctor's Name or Specialty -> Go to Doctor Booking Page
    doctorService.getDoctors({ search: query }).then((matchedDocs) => {
      if (matchedDocs && matchedDocs.length > 0) {
        setBookingDoctor(matchedDocs[0]);
        navigate(`/appointments/book/${matchedDocs[0].id}`);
        return;
      }

      // 2. Check if query matches a Hospital's Name -> Go to Hospital Detail Page
      hospitalService.getHospitals(query).then((matchedHosps) => {
        if (matchedHosps && matchedHosps.length > 0) {
          navigate(`/hospitals/${matchedHosps[0].id}`);
          return;
        }

        // 3. Fallback: Redirect to Hospitals list with search filter
        navigate('/hospitals', { state: { initialSearch: searchQuery.trim() } });
      });
    }).catch(() => {
      navigate('/hospitals', { state: { initialSearch: searchQuery.trim() } });
    });
  };

  return (
    <div className="min-h-screen bg-white pb-28 w-full relative overflow-hidden">
      {/* VIBRANT EXTENDED CYAN HERO TOP SECTION - FULL WIDTH FIT */}
      <div className="bg-gradient-to-b from-[#1FA2AC] via-[#24A6B0] via-60% to-white pt-0 pb-10 sm:pb-12 w-full relative shadow-2xs">
        <TopBar variant="cyan" />

        {/* PILL SEARCH BAR WITH VOICE MIC BUTTON */}
        <div className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto mt-3 sm:mt-4 w-full">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex items-center bg-white/95 backdrop-blur-md rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-sm focus-within:ring-2 focus-within:ring-white/80 transition-all"
          >
            <button
              type="submit"
              className="p-1 text-[#6B7280] hover:text-[#0B5A54] transition-colors shrink-0 flex items-center justify-center cursor-pointer"
              title="Search"
            >
              <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('home.searchPlaceholder', "Search Doctor's, Hospitals...")}
              className="w-full bg-transparent border-none text-xs sm:text-sm md:text-base text-[#111827] font-medium px-2 py-1 focus:outline-none placeholder:text-[#9CA3AF]"
            />

            <button
              type="button"
              onClick={() => alert('Voice Search: Speak your query...')}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#111827] hover:bg-gray-100 transition-colors shrink-0 shadow-2xs cursor-pointer"
              title="Voice Search"
            >
              <Mic className="w-4 h-4 text-[#111827]" />
            </button>
          </form>
        </div>
      </div>

      {/* MAIN BODY CONTENT - FULL SCREEN RESOLUTION ADAPTIVE */}
      <main className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pt-1 pb-4 space-y-6 w-full">
        {/* INCOMPLETE PROFILE REMINDER BANNER */}
        {isUserProfileIncomplete(user) && (
          <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#0B5A54] text-white flex items-center justify-center shrink-0 shadow-xs">
                <UserIcon className="w-5 h-5 text-teal-200" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black text-slate-900 font-heading tracking-tight">
                  {t('home.completeProfileNoticeTitle', 'Complete Your Medical Profile')}
                </h3>
                <p className="text-[11px] text-slate-600 font-medium">
                  {t(
                    'home.completeProfileNoticeDesc',
                    'Please add your phone number, date of birth & emergency contact to unlock clinical bookings.'
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/complete-profile')}
              className="px-4 py-2 bg-[#0B5A54] hover:bg-[#08423D] text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              {t('home.completeNow', 'Complete Now →')}
            </button>
          </div>
        )}
        {/* HERO SECTION GRID (TOKEN STACK & HEALTH TIP) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {/* 1. BOARDING PASS APPOINTMENT TOKEN STACK OR QUICK BOOKING CARD */}
          <AppointmentCardStack
            appointments={activeAppointments}
            onViewDetails={(app) => {
              setSelectedModalAppointment(app);
              setIsQueueModalOpen(true);
            }}
            onScheduleNew={() => navigate('/hospitals')}
          />

          {/* 2. ULTRA-PREMIUM SMART MEDICINE LENS CARD */}
          <SmartMedicineLensCard onScan={() => navigate('/prescriptions/scan')} />
        </div>

        {/* SECONDARY SECTION GRID - ADAPTIVE RESPONSIVE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {/* 3. NEXT DOCTOR VISIT (EXECUTIVE ULTRA-PREMIUM CARD) */}
          <div className="space-y-2 text-left">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-black text-[#0B5A54] uppercase tracking-widest font-heading">
                {t('home.nextDoctorVisit', 'NEXT DOCTOR VISIT')}
              </h3>
              <span className="text-[10px] font-extrabold text-[#0B5A54] bg-[#E3F3F1] px-2.5 py-0.5 rounded-full border border-[#14B8A6]/20 shadow-2xs">
                {activeAppointments[0] ? t('home.scheduledBadge', 'SCHEDULED') : t('home.routineCareBadge', 'ROUTINE CARE')}
              </span>
            </div>

            {activeAppointments[0] ? (
              <div
                onClick={() => navigate('/history')}
                className="bg-gradient-to-br from-white via-white to-[#E3F3F1]/40 rounded-3xl p-4 sm:p-5 border border-[#14B8A6]/30 shadow-2xs hover:shadow-lg transition-all duration-300 cursor-pointer group space-y-3.5 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar
                      src={activeAppointments[0].doctorPhoto}
                      alt={activeAppointments[0].doctorName}
                      size="lg"
                      className="ring-4 ring-[#E3F3F1] shadow-md group-hover:scale-105 transition-transform"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <h4 className="text-sm sm:text-base font-black text-[#111827] group-hover:text-[#0B5A54] transition-colors truncate tracking-tight">
                        {formatDoctorName(activeAppointments[0].doctorName)}
                      </h4>
                      <p className="text-xs text-[#0B5A54] font-extrabold">{formatSpecialty(activeAppointments[0].doctorSpecialty)}</p>
                      <p className="text-[10.5px] text-slate-500 font-semibold truncate flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-[#14B8A6] shrink-0" />
                        <span>{formatHospitalName(activeAppointments[0].hospitalName)}</span>
                      </p>
                    </div>
                  </div>

                  <span className="bg-[#0B5A54] text-white font-black text-[9.5px] px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs shrink-0 flex items-center gap-1">
                    <span>{t('home.upcomingBadge', 'UPCOMING')}</span>
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100/90 flex items-center justify-between gap-2 relative z-10">
                  <span className="bg-white text-[#111827] border border-slate-200/90 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-2xs">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#0B5A54]" />
                    <span>{activeAppointments[0].date} • {activeAppointments[0].timeSlot}</span>
                  </span>

                  <span className="bg-[#E3F3F1] text-[#0B5A54] text-[10.5px] font-extrabold px-3 py-1.5 rounded-xl border border-[#14B8A6]/20 flex items-center gap-1 shadow-2xs group-hover:bg-[#0B5A54] group-hover:text-white transition-colors">
                    <span>{t('home.viewSession', 'View Session')}</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => navigate('/hospitals')}
                className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#E3F3F1] text-[#0B5A54] flex items-center justify-center font-bold shrink-0">
                    <CalendarIcon className="w-5 h-5 text-[#0B5A54]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#111827]">{t('home.noFollowUps', 'No Scheduled Follow-ups')}</h4>
                    <p className="text-xs text-[#6B7280]">{t('home.browseDoctors', 'Browse doctors by specialty to book a consultation')}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/hospitals'); }}
                  className="text-xs font-bold text-[#0B5A54] hover:underline flex items-center gap-1"
                >
                  <span>{t('home.exploreSpecialists', 'Explore Specialists →')}</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. ACTIVE PRESCRIPTIONS - SAMSUNG PASS CASCADING MEDICATION CARD STACK */}
          <div className="space-y-3.5">
            {/* Course Completion Toast Notice */}
            {completedNotice && (
              <div className="bg-emerald-500 text-white font-extrabold text-xs p-3 rounded-2xl shadow-md flex items-center gap-2 animate-in fade-in zoom-in-95">
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>{completedNotice}</span>
              </div>
            )}

            <MedicationCardStack
              prescriptions={prescriptions}
              onViewAll={() => navigate('/prescriptions')}
              onSelectMedication={() => navigate('/prescriptions')}
            />
          </div>
        </div>

        {/* ── HOSPITAL VITALS & LAB TEST TRACKING CARD ── */}
        <div
          onClick={() => navigate('/vitals-lab')}
          className="bg-gradient-to-r from-[#0B5A54] via-teal-700 to-teal-600 rounded-3xl p-4 sm:p-5 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group relative overflow-hidden"
        >
          {/* Decorative glow blob */}
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/8 blur-xl" />
          <div className="absolute -right-2 -bottom-4 w-20 h-20 rounded-full bg-teal-300/10 blur-lg" />

          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-start gap-3.5">
              {/* Icon cluster */}
              <div className="flex items-center gap-1.5">
                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shadow-xs">
                  <HeartPulse className="w-5 h-5 text-white" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shadow-xs">
                  <Microscope className="w-5 h-5 text-white" />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-teal-200">
                  Hospital Pre-Consultation
                </p>
                <h3 className="text-sm sm:text-base font-black text-white leading-tight tracking-tight">
                  Vitals & Lab Test Tracking
                </h3>
                <p className="text-[11px] text-teal-200/80 font-medium leading-snug max-w-[200px]">
                  View nurse-recorded triage vitals, live test status & diagnostic reports from your hospital visits
                </p>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/25 group-hover:bg-white/30 transition-colors">
                <ChevronRight className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>

      </main>

      <BottomNav />


      {/* REBUILT EXECUTIVE QUEUE STATUS POPUP MODAL (SOLID WHITE BACKGROUND) */}
      {(() => {
        const modalApp = selectedModalAppointment || activeAppointment || activeAppointments[0];
        if (!isQueueModalOpen || !modalApp) return null;

        return (
          <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 sm:p-5 animate-in fade-in duration-200 select-none">
            <div className="bg-white rounded-3xl w-[calc(100%-2rem)] max-w-[360px] sm:max-w-[385px] p-4 sm:p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] space-y-3.5 max-h-[90vh] overflow-y-auto border border-slate-100 animate-in zoom-in-95 duration-200">

              {/* 1. Header Row */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-[#0B5A54]" />
                  <h3 className="text-sm font-extrabold text-[#111827] tracking-tight">{t('home.queueStatusTitle', 'Queue Status')}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-[#E3F3F1] text-[#0B5A54] font-mono text-[11px] px-2 py-0.5 rounded-full font-extrabold border border-[#14B8A6]/20">
                    {modalApp.ticketNumber || '#CP-PENDING'}
                  </span>
                  <button
                    onClick={() => setIsQueueModalOpen(false)}
                    className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer border-0 outline-none"
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 2. Doctor/Appointment Summary Strip (Clean Solid Card) */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <Avatar src={modalApp.doctorPhoto} size="sm" />
                  <div>
                    <h4 className="text-xs font-extrabold text-[#111827] leading-tight">{formatDoctorName(modalApp.doctorName)}</h4>
                    <p className="text-[10px] font-bold text-[#0B5A54] leading-tight">{formatSpecialty(modalApp.doctorSpecialty)}</p>
                  </div>
                </div>

                <div className="text-right pl-2.5 border-l border-slate-200/80">
                  <div className="flex items-center justify-end gap-1 text-[11px] font-black text-[#111827]">
                    <CalendarIcon className="w-3 h-3 text-[#0B5A54]" />
                    <span>{modalApp.date}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">{modalApp.timeSlot}</span>
                </div>
              </div>

              {/* 3. Live Token Queue Tracker (Vertical Timeline) */}
              <div className="space-y-2.5 pt-0.5">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    OPD LIVE CONSULTATION TIMELINE
                  </span>
                  {liveQueueData && (
                    <span className="text-[9px] font-bold text-[#0B5A54] bg-[#E3F3F1] px-2 py-0.5 rounded-full border border-[#14B8A6]/20">
                      Live Queue Active
                    </span>
                  )}
                </div>

                <div className="relative pl-1 space-y-2.5">
                  {/* Thin Vertical Timeline Line */}
                  <div className="absolute left-[11px] top-2.5 bottom-2.5 w-[1.5px] bg-slate-200 z-0" />

                  {isLoadingQueue && !liveQueueData ? (
                    <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400 z-10 relative">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#0B5A54]" />
                      <span className="text-[11px] font-bold text-slate-500">Loading live OPD queue...</span>
                    </div>
                  ) : (liveQueueData?.timeline && liveQueueData.timeline.length > 0) ? (
                    liveQueueData.timeline.map((item) => {
                      // 1. Patient's Own Token
                      if (item.isUser) {
                        return (
                          <div key={item.id} className="relative flex items-start gap-2.5 z-10">
                            <div className="w-5 h-5 rounded-full bg-[#0B5A54] text-white flex items-center justify-center ring-4 ring-[#E3F3F1] z-10 shrink-0 text-[9px] mt-1 shadow-2xs">
                              ⭐
                            </div>

                            <div className="flex-1 bg-[#E3F3F1] border-2 border-[#0B5A54] rounded-xl p-2.5 space-y-1.5 shadow-xs">
                              {/* Top Row: YOUR TOKEN badge + Token Number */}
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="bg-[#0B5A54] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shadow-2xs">
                                    YOUR TOKEN
                                  </span>
                                  <span className="text-[11px] font-black text-[#111827] tracking-tight whitespace-nowrap">
                                    {item.tokenNumber || modalApp.ticketNumber || '#CP-PENDING'}
                                  </span>
                                </div>
                                <span className="text-[9.5px] font-extrabold text-[#0B5A54] bg-white px-2 py-0.5 rounded-md border border-[#0B5A54]/20 shadow-2xs">
                                  {item.status || modalApp.status || 'Scheduled'}
                                </span>
                              </div>

                              {/* Patient Name */}
                              <div>
                                <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">PATIENT</p>
                                <p className="text-xs font-extrabold text-[#0B5A54]">{item.patientName || modalApp.patientName}</p>
                              </div>

                              {/* Footer Queue Position Bar */}
                              <div className="pt-1.5 border-t border-[#0B5A54]/15 flex items-center justify-between text-[10px] font-bold text-[#0B5A54]">
                                <span className="bg-[#0B5A54]/10 text-[#0B5A54] px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Users className="w-3 h-3 text-[#0B5A54]" />
                                  {(liveQueueData.personsAhead ?? item.personsAhead ?? 0) === 0
                                    ? (item.status === 'In Consultation' ? 'Currently Consulting' : 'You are Next')
                                    : `${liveQueueData.personsAhead ?? item.personsAhead} ${(liveQueueData.personsAhead ?? item.personsAhead) === 1 ? 'Person' : 'Persons'} Ahead of You`}
                                </span>
                                <span className="text-slate-600 font-semibold">{modalApp.timeSlot || 'Scheduled Today'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 2. Currently In Consultation
                      if (item.status === 'In Consultation') {
                        return (
                          <div key={item.id} className="relative flex items-center gap-2.5 z-10">
                            <div className="relative flex items-center justify-center w-5 h-5 shrink-0 z-10">
                              <span className="absolute inset-0 rounded-full bg-amber-400/50 animate-ping" />
                              <div className="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center border-2 border-white shadow-xs z-10">
                                ●
                              </div>
                            </div>
                            <div className="flex-1 bg-amber-50/90 border border-amber-300 rounded-xl p-2.5 shadow-2xs">
                              <div className="flex items-center justify-between gap-1">
                                <div>
                                  <p className="text-[11px] font-black text-amber-950 whitespace-nowrap">{item.tokenNumber}</p>
                                  <p className="text-[9.5px] font-semibold text-amber-800">{item.patientName}</p>
                                </div>
                                <span className="text-[9px] font-extrabold text-amber-900 bg-white px-1.5 py-0.5 rounded border border-amber-200 whitespace-nowrap shrink-0">
                                  In Consultation
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 3. Completed Patient Token
                      if (item.status === 'Completed') {
                        return (
                          <div key={item.id} className="relative flex items-center gap-2.5 z-10">
                            <div className="w-5 h-5 rounded-full bg-[#0B5A54] text-white flex items-center justify-center text-[10px] shadow-2xs z-10 shrink-0">
                              <Check className="w-3 h-3 text-white stroke-[3]" />
                            </div>
                            <div className="flex-1 flex items-center justify-between pr-0.5">
                              <div>
                                <p className="text-[11px] font-bold text-slate-700 leading-tight">{item.tokenNumber}</p>
                                <p className="text-[9.5px] text-slate-500 font-medium">Completed</p>
                              </div>
                              <span className="text-[10px] font-semibold text-slate-500">{item.time || 'Completed'}</span>
                            </div>
                          </div>
                        );
                      }

                      // 4. Station Status / Ready
                      if (item.status === 'Station Ready') {
                        return (
                          <div key={item.id} className="relative flex items-center gap-2.5 z-10">
                            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow-2xs z-10 shrink-0">
                              <Check className="w-3 h-3 text-white stroke-[3]" />
                            </div>
                            <div className="flex-1 flex items-center justify-between pr-0.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-2.5 py-1.5">
                              <div>
                                <p className="text-[11px] font-bold text-emerald-950 leading-tight">{item.tokenNumber}</p>
                                <p className="text-[9.5px] text-emerald-700 font-medium">{item.patientName}</p>
                              </div>
                              <span className="text-[9px] font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">{item.time}</span>
                            </div>
                          </div>
                        );
                      }

                      // 5. Waiting / Upcoming Patient Token
                      return (
                        <div key={item.id} className="relative flex items-center gap-2.5 z-10">
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white z-10 shrink-0" />
                          <div className="flex-1 flex items-center justify-between pr-0.5">
                            <div>
                              <p className="text-[11px] font-bold text-slate-700 leading-tight">{item.tokenNumber}</p>
                              <p className="text-[9.5px] text-slate-400 font-medium">{item.status || 'Waiting'}</p>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400">{item.time || 'Upcoming'}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Default fallback if no timeline returned yet
                    <div className="relative flex items-start gap-2.5 z-10">
                      <div className="w-5 h-5 rounded-full bg-[#0B5A54] text-white flex items-center justify-center ring-4 ring-[#E3F3F1] z-10 shrink-0 text-[9px] mt-1 shadow-2xs">
                        ⭐
                      </div>

                      <div className="flex-1 bg-[#E3F3F1] border-2 border-[#0B5A54] rounded-xl p-2.5 space-y-1.5 shadow-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-[#0B5A54] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shadow-2xs">
                            YOUR TOKEN
                          </span>
                          <span className="text-[11px] font-black text-[#111827] tracking-tight whitespace-nowrap">
                            {modalApp.ticketNumber || '#CP-PENDING'}
                          </span>
                        </div>

                        <div>
                          <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">PATIENT</p>
                          <p className="text-xs font-extrabold text-[#0B5A54]">{modalApp.patientName}</p>
                        </div>

                        <div className="pt-1.5 border-t border-[#0B5A54]/15 flex items-center justify-between text-[10px] font-bold text-[#0B5A54]">
                          <span className="bg-[#0B5A54]/10 text-[#0B5A54] px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Users className="w-3 h-3 text-[#0B5A54]" />
                            <span>Scheduled Consultation</span>
                          </span>
                          <span className="text-slate-600 font-semibold">{modalApp.timeSlot}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Footer Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center">
                <button
                  onClick={handleRefreshQueue}
                  className="w-full bg-[#0B5A54] hover:bg-[#084540] active:scale-[0.98] text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer border-0 outline-none"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{t('home.trackLive', 'Track Live')}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};




