import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lightbulb,
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
  Camera,
  Sparkles,
  Scan,
  ArrowRight,
} from 'lucide-react';






import { TopBar } from '../../components/ui/TopBar';
import { BottomNav } from '../../components/ui/BottomNav';
import { Avatar } from '../../components/ui/Avatar';
import { LiveIndicator } from '../../components/ui/LiveIndicator';
import { requestNativeLocation } from '../../lib/locationService';
import { usePolling } from '../../lib/usePolling';

import { useCarePulseStore } from '../../lib/store';
import { doctorService } from '../../services/doctorService';
import { hospitalService } from '../../services/hospitalService';
import { isUserProfileIncomplete } from '../auth/CompleteProfileScreen';
import { MedicationCardStack } from '../../components/prescriptions';
import { AppointmentCardStack } from '../../components/appointments/AppointmentCardStack';
import type { Appointment } from '../../lib/types';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const user = useCarePulseStore((s) => s.user);
  const appointments = useCarePulseStore((s) => s.appointments);
  const activeAppointment = useCarePulseStore((s) => s.activeAppointment);
  const prescriptions = useCarePulseStore((s) => s.prescriptions);
  const syncAppointments = useCarePulseStore((s) => s.syncAppointments);
  const syncPrescriptions = useCarePulseStore((s) => s.syncPrescriptions);
  const setBookingDoctor = useCarePulseStore((s) => s.setBookingDoctor);

  // Active appointments list (fallback to activeAppointment or mock if empty)
  const activeAppointments = useMemo(() => {
    if (appointments && appointments.length > 0) {
      const activeList = appointments.filter(
        (a) => a.status === 'Scheduled' || a.status === 'Confirmed' || a.status === 'In-Progress'
      );
      if (activeList.length > 0) return activeList;
    }
    return activeAppointment ? [activeAppointment] : [];
  }, [appointments, activeAppointment]);

  const [selectedModalAppointment, setSelectedModalAppointment] = useState<Appointment | null>(null);

  // Automatic background polling for Patient appointments & queue updates
  const { isPolling, lastUpdated, refetch } = usePolling(
    async () => {
      if (user?.id) {
        await Promise.all([
          syncAppointments(user.id),
          syncPrescriptions(user.id),
        ]);
      }
    },
    {
      interval: 8000,
      enabled: !!user?.id,
    }
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [completedNotice] = useState<string | null>(null);

  const handleRefreshQueue = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 650);
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
        <div className="px-4 mt-4">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex items-center bg-white/95 backdrop-blur-md rounded-full px-3 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-white/80 transition-all"
          >
            <button
              type="submit"
              className="p-1 text-[#6B7280] hover:text-[#0B5A54] transition-colors shrink-0 flex items-center justify-center cursor-pointer"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Doctor's, Hospitals..."
              className="w-full bg-transparent border-none text-xs sm:text-sm text-[#111827] font-medium px-2 py-1.5 focus:outline-none placeholder:text-[#9CA3AF]"
            />

            <button
              type="button"
              onClick={() => alert('Voice Search: Speak your query...')}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#111827] hover:bg-gray-100 transition-colors shrink-0 shadow-2xs"
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
                  Complete Your Medical Profile
                </h3>
                <p className="text-[11px] text-slate-600 font-medium">
                  Please add your phone number, date of birth & emergency contact to unlock clinical bookings.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/complete-profile')}
              className="px-4 py-2 bg-[#0B5A54] hover:bg-[#08423D] text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              Complete Now →
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
          <div
            onClick={() => navigate('/prescriptions/scan')}
            className="bg-gradient-to-br from-[#063833] via-[#0B5A54] to-[#042824] text-white rounded-3xl p-5 shadow-sm hover:shadow-2xl border border-teal-400/40 relative overflow-hidden group cursor-pointer active:scale-[0.99] transition-all duration-300 flex flex-col justify-between"
          >
            {/* Ambient Radial Mesh & High-Tech Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(#14B8A6_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />
            <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-[#14B8A6]/25 blur-3xl pointer-events-none group-hover:bg-[#14B8A6]/40 transition-all duration-500" />
            <div className="absolute -left-10 -top-10 w-36 h-36 rounded-full bg-emerald-400/15 blur-2xl pointer-events-none" />

            {/* Top Header Row */}
            <div className="relative z-10 py-1">
              <h3 className="text-base font-black font-heading text-white tracking-tight leading-snug">
                Smart Medicine Lens
              </h3>
            </div>

            {/* Bottom Glow Action CTA */}
            <div className="pt-2 relative z-10">
              <button
                type="button"
                className="w-full bg-gradient-to-r from-teal-300 via-teal-200 to-[#14B8A6] text-[#05322E] font-black text-xs py-2.5 px-4 rounded-2xl flex items-center justify-between shadow-[0_0_20px_rgba(20,184,166,0.35)] group-hover:shadow-[0_0_25px_rgba(20,184,166,0.55)] group-hover:scale-[1.01] active:scale-98 transition-all cursor-pointer"
              >
                <span className="tracking-wide">Launch Camera Scanner</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* SECONDARY SECTION GRID - ADAPTIVE RESPONSIVE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {/* 3. NEXT DOCTOR VISIT (EXECUTIVE ULTRA-PREMIUM CARD) */}
          <div className="space-y-2 text-left">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-black text-[#0B5A54] uppercase tracking-widest font-heading">
                NEXT DOCTOR VISIT
              </h3>
              <span className="text-[10px] font-extrabold text-[#0B5A54] bg-[#E3F3F1] px-2.5 py-0.5 rounded-full border border-[#14B8A6]/20 shadow-2xs">
                {activeAppointment ? 'SCHEDULED' : 'ROUTINE CARE'}
              </span>
            </div>

            {activeAppointment ? (
              <div
                onClick={() => navigate('/history')}
                className="bg-gradient-to-br from-white via-white to-[#E3F3F1]/40 rounded-3xl p-4 sm:p-5 border border-[#14B8A6]/30 shadow-2xs hover:shadow-lg transition-all duration-300 cursor-pointer group space-y-3.5 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar
                      src={activeAppointment.doctorPhoto}
                      alt={activeAppointment.doctorName}
                      size="lg"
                      className="ring-4 ring-[#E3F3F1] shadow-md group-hover:scale-105 transition-transform"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <h4 className="text-sm sm:text-base font-black text-[#111827] group-hover:text-[#0B5A54] transition-colors truncate tracking-tight">
                        {activeAppointment.doctorName}
                      </h4>
                      <p className="text-xs text-[#0B5A54] font-extrabold">{activeAppointment.doctorSpecialty}</p>
                      <p className="text-[10.5px] text-slate-500 font-semibold truncate flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-[#14B8A6] shrink-0" />
                        <span>{activeAppointment.hospitalName}</span>
                      </p>
                    </div>
                  </div>

                  <span className="bg-[#0B5A54] text-white font-black text-[9.5px] px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs shrink-0 flex items-center gap-1">
                    <span>UPCOMING</span>
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100/90 flex items-center justify-between gap-2 relative z-10">
                  <span className="bg-white text-[#111827] border border-slate-200/90 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-2xs">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#0B5A54]" />
                    <span>{activeAppointment.date} • {activeAppointment.timeSlot}</span>
                  </span>

                  <span className="bg-[#E3F3F1] text-[#0B5A54] text-[10.5px] font-extrabold px-3 py-1.5 rounded-xl border border-[#14B8A6]/20 flex items-center gap-1 shadow-2xs group-hover:bg-[#0B5A54] group-hover:text-white transition-colors">
                    <span>View Session</span>
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
                    <h4 className="text-sm font-black text-[#111827]">No Scheduled Follow-ups</h4>
                    <p className="text-xs text-[#6B7280]">Browse doctors by specialty to book a consultation</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/hospitals'); }}
                  className="text-xs font-bold text-[#0B5A54] hover:underline flex items-center gap-1"
                >
                  <span>Explore Specialists →</span>
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
                  <h3 className="text-sm font-extrabold text-[#111827] tracking-tight">Queue Status</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-[#E3F3F1] text-[#0B5A54] font-mono text-[11px] px-2 py-0.5 rounded-full font-extrabold border border-[#14B8A6]/20">
                    {modalApp.ticketNumber || 'TK-482'}
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
                    <h4 className="text-xs font-extrabold text-[#111827] leading-tight">{modalApp.doctorName}</h4>
                    <p className="text-[10px] font-bold text-[#0B5A54] leading-tight">{modalApp.doctorSpecialty}</p>
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
                  <LiveIndicator
                    lastUpdated={lastUpdated}
                    isPolling={isPolling}
                    variant="badge"
                    label="Live Sync"
                    onRefresh={refetch}
                  />
                </div>

                <div className="relative pl-1 space-y-2.5">
                  {/* Thin Vertical Timeline Line */}
                  <div className="absolute left-[11px] top-2.5 bottom-2.5 w-[1.5px] bg-slate-200 z-0" />

                  {/* Token-1 (Completed - NO STRIKETHROUGH) */}
                  <div className="relative flex items-center gap-2.5 z-10">
                    <div className="w-5 h-5 rounded-full bg-[#0B5A54] text-white flex items-center justify-center text-[10px] shadow-2xs z-10 shrink-0">
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    </div>
                    <div className="flex-1 flex items-center justify-between pr-0.5">
                      <div>
                        <p className="text-[11px] font-bold text-slate-700 leading-tight">Token-1 (TK-478)</p>
                        <p className="text-[9.5px] text-slate-500 font-medium">Completed</p>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500">Called 10:05 AM</span>
                    </div>
                  </div>

                  {/* Token-2 (Completed - NO STRIKETHROUGH) */}
                  <div className="relative flex items-center gap-2.5 z-10">
                    <div className="w-5 h-5 rounded-full bg-[#0B5A54] text-white flex items-center justify-center text-[10px] shadow-2xs z-10 shrink-0">
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    </div>
                    <div className="flex-1 flex items-center justify-between pr-0.5">
                      <div>
                        <p className="text-[11px] font-bold text-slate-700 leading-tight">Token-2 (TK-479)</p>
                        <p className="text-[9.5px] text-slate-500 font-medium">Completed</p>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500">Called 10:18 AM</span>
                    </div>
                  </div>

                  {/* Token-3 (Current Patient Consulting - NO WRAPPING PREMUM CARD) */}
                  <div className="relative flex items-center gap-2.5 z-10">
                    <div className="relative flex items-center justify-center w-5 h-5 shrink-0 z-10">
                      <span className="absolute inset-0 rounded-full bg-amber-400/50 animate-ping" />
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center border-2 border-white shadow-xs z-10">
                        ✕
                      </div>
                    </div>
                    <div className="flex-1 bg-amber-50/90 border border-amber-300 rounded-xl p-2.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[11px] font-black text-amber-950 whitespace-nowrap">Token-3 (TK-480)</p>
                        <span className="text-[9px] font-extrabold text-amber-900 bg-white px-1.5 py-0.5 rounded border border-amber-200 whitespace-nowrap shrink-0">
                          In Consultation
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Token-4 (Upcoming - CLEAN TITLE) */}
                  <div className="relative flex items-center gap-2.5 z-10">
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white z-10 shrink-0" />
                    <div className="flex-1 flex items-center justify-between pr-0.5">
                      <p className="text-[11px] font-bold text-slate-700 leading-tight">Token-4 (TK-481)</p>
                    </div>
                  </div>

                  {/* Token-5 (Patient's Own Token - Highlighted Box) */}
                  <div className="relative flex items-start gap-2.5 z-10">
                    <div className="w-5 h-5 rounded-full bg-[#0B5A54] text-white flex items-center justify-center ring-4 ring-[#E3F3F1] z-10 shrink-0 text-[9px] mt-1 shadow-2xs">
                      ⭐
                    </div>

                    <div className="flex-1 bg-[#E3F3F1] border-2 border-[#0B5A54] rounded-xl p-2.5 space-y-1.5 shadow-xs">
                      {/* Top Row: YOUR TOKEN badge + Token Number */}
                      <div className="flex items-center gap-1.5">
                        <span className="bg-[#0B5A54] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shadow-2xs">
                          YOUR TOKEN
                        </span>
                        <span className="text-[11px] font-black text-[#111827] tracking-tight whitespace-nowrap">
                          {modalApp.ticketNumber || 'TK-482'}
                        </span>
                      </div>

                      {/* Patient Name */}
                      <div>
                        <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">PATIENT</p>
                        <p className="text-xs font-extrabold text-[#0B5A54]">{modalApp.patientName}</p>
                      </div>

                      {/* Footer Queue Position Bar */}
                      <div className="pt-1.5 border-t border-[#0B5A54]/15 flex items-center justify-between text-[10px] font-bold text-[#0B5A54]">
                        <span className="bg-[#0B5A54]/10 text-[#0B5A54] px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#0B5A54]" />
                          2 Persons Ahead of You
                        </span>
                        <span className="text-slate-600 font-semibold">Scheduled Today</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Footer Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center">
                <button
                  onClick={handleRefreshQueue}
                  className="w-full bg-[#0B5A54] hover:bg-[#084540] active:scale-[0.98] text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer border-0 outline-none"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Track Live</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};




