import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lightbulb,
  Clock,
  Pill,
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
  RefreshCw,
  Users,
} from 'lucide-react';






import { TopBar } from '../../components/ui/TopBar';
import { BottomNav } from '../../components/ui/BottomNav';
import { Avatar } from '../../components/ui/Avatar';
import { requestNativeLocation } from '../../lib/locationService';

import { useCarePulseStore } from '../../lib/store';
import { MOCK_PRESCRIPTIONS } from '../../lib/mockApi';
import { doctorService } from '../../services/doctorService';
import { hospitalService } from '../../services/hospitalService';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const activeAppointment = useCarePulseStore((s) => s.activeAppointment);
  const setBookingDoctor = useCarePulseStore((s) => s.setBookingDoctor);

  const [searchQuery, setSearchQuery] = useState('');
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);






  // Dynamic Prescription Course Day Progress & Completion state
  const [prescriptionProgress, setPrescriptionProgress] = useState<{
    [key: string]: { currentDay: number; totalDays: number; completed: boolean };
  }>({
    'rx-1': { currentDay: 4, totalDays: 7, completed: false },
    'rx-2': { currentDay: 2, totalDays: 10, completed: false },
  });

  const [completedNotice, setCompletedNotice] = useState<string | null>(null);

  const handleTakeDose = (rxId: string, drugName: string) => {
    setPrescriptionProgress((prev) => {
      const current = prev[rxId] || { currentDay: 1, totalDays: 7, completed: false };
      const nextDay = current.currentDay + 1;
      const isFinished = nextDay >= current.totalDays;

      if (isFinished) {
        setCompletedNotice(`🎉 Course Completed! ${drugName} finished.`);
        setTimeout(() => setCompletedNotice(null), 4000);
      }

      return {
        ...prev,
        [rxId]: {
          ...current,
          currentDay: isFinished ? current.totalDays : nextDay,
          completed: isFinished,
        },
      };
    });
  };

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
        {/* HERO SECTION GRID (TICKET & HEALTH TIP) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {/* 1. BOARDING PASS APPOINTMENT TICKET */}
          {activeAppointment && (
            <div className="relative bg-white rounded-2xl shadow-xs border border-[#E4E7EC] overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px]">
              {/* Physical Boarding Pass Left & Right Notch Cutouts */}
              <div className="absolute top-[30px] -left-2 w-4 h-4 rounded-full bg-white border-r border-[#E4E7EC] z-10" />
              <div className="absolute top-[30px] -right-2 w-4 h-4 rounded-full bg-white border-l border-[#E4E7EC] z-10" />

              {/* Clean White Header Strip */}
              <div className="bg-white border-b border-[#E4E7EC] px-4 py-2 flex justify-between items-center relative z-20">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0B5A54]">
                  <Ticket className="w-4 h-4 text-[#14B8A6]" />
                  <span>APPOINTMENT TICKET</span>
                </div>
                <span className="bg-[#E3F3F1] text-[#0B5A54] font-mono text-xs px-2.5 py-0.5 rounded-pill font-bold">
                  {activeAppointment.ticketNumber}
                </span>
              </div>

              {/* Ticket Body */}
              <div className="p-4 space-y-3 relative z-20 bg-white/95">
                <div className="grid grid-cols-2 gap-3 pb-1">
                  <div>
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1">
                      <UserIcon className="w-3 h-3" /> PATIENT
                    </span>
                    <p className="text-xs font-bold text-[#111827] mt-0.5">{activeAppointment.patientName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> FACILITY
                    </span>
                    <p className="text-xs font-bold text-[#111827] mt-0.5 truncate">{activeAppointment.hospitalName}</p>
                  </div>
                </div>

                <div className="dashed-divider my-1.5" />

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-3">
                    <Avatar src={activeAppointment.doctorPhoto} size="md" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#111827]">{activeAppointment.doctorName}</h4>
                      <p className="text-xs font-semibold text-[#0B5A54]">{activeAppointment.doctorSpecialty}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-xs font-bold text-[#111827]">
                      <CalendarIcon className="w-3.5 h-3.5 text-[#0B5A54]" />
                      <span>{activeAppointment.date}</span>
                    </div>
                    <span className="text-xs text-[#6B7280] font-semibold">{activeAppointment.timeSlot}</span>
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => setIsQueueModalOpen(true)}
                    className="bg-[#E3F3F1] text-[#0B5A54] hover:bg-[#0B5A54] hover:text-white px-3.5 py-1.5 rounded-pill text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. HEALTH TIP CARD */}
          <div className="bg-gradient-teal text-white rounded-2xl p-4 shadow-xs relative overflow-hidden flex justify-between items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-100">
                <Lightbulb className="w-3.5 h-3.5 text-yellow-300" />
                <span>HEALTH TIP</span>
              </div>
              <h3 className="text-sm font-bold text-white">Hydration & Vitality</h3>
              <p className="text-xs text-teal-50 opacity-90 leading-snug">
                Drink 8 glasses of water daily for clear focus & kidney care.
              </p>
            </div>

            <button
              onClick={() => navigate('/health-ai')}
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1 rounded-pill transition-colors shrink-0 ml-2"
            >
              Ask AI →
            </button>
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
                FOLLOW-UP
              </span>
            </div>

            <div
              onClick={() => navigate('/appointments/book/doc-2')}
              className="bg-gradient-to-br from-white via-white to-[#E3F3F1]/40 rounded-3xl p-4 sm:p-5 border border-[#14B8A6]/30 shadow-2xs hover:shadow-lg transition-all duration-300 cursor-pointer group space-y-3.5 relative overflow-hidden"
            >
              {/* Subtle Decorative Teal Glow Orb in background */}
              <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-[#14B8A6]/10 blur-xl pointer-events-none" />

              {/* Header Row: Doctor Avatar + Info | Countdown Badge */}
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative shrink-0">
                    <Avatar
                      src="https://images.unsplash.com/photo-1594824813566-88855ce78347?w=400&auto=format&fit=crop&q=80"
                      alt="Dr. Elena Rostova"
                      size="lg"
                      className="ring-4 ring-[#E3F3F1] shadow-md group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center text-white text-[7px] font-black">
                      ✓
                    </span>
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <h4 className="text-sm sm:text-base font-black text-[#111827] group-hover:text-[#0B5A54] transition-colors truncate tracking-tight">
                      Dr. Elena Rostova
                    </h4>
                    <p className="text-xs text-[#0B5A54] font-extrabold">General Medicine Specialist</p>
                    <p className="text-[10.5px] text-slate-500 font-semibold truncate flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-[#14B8A6] shrink-0" />
                      <span>St. Jude Heart & Medical Center</span>
                    </p>
                  </div>
                </div>

                <span className="bg-[#0B5A54] text-white font-black text-[9.5px] px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs shrink-0 flex items-center gap-1">
                  <span>IN 8 DAYS</span>
                </span>
              </div>

              {/* Bottom Schedule Pill Strip - Premium Balanced Layout */}
              <div className="pt-3 border-t border-slate-100/90 flex items-center justify-between gap-2 relative z-10">
                <span className="bg-white text-[#111827] border border-slate-200/90 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-2xs">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#0B5A54]" />
                  <span>2026-08-12</span>
                </span>

                <span className="bg-[#E3F3F1] text-[#0B5A54] text-[10.5px] font-extrabold px-3 py-1.5 rounded-xl border border-[#14B8A6]/20 flex items-center gap-1 shadow-2xs hover:bg-[#0B5A54] hover:text-white transition-colors">
                  <span>Confirm Visit</span>
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              </div>
            </div>
          </div>

          {/* 4. ACTIVE PRESCRIPTIONS - DYNAMIC COURSE COMPLETION & SCANNABLE CARDS */}
          <div className="space-y-3.5">
            {/* Header Row */}
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-black text-[#0B5A54] uppercase tracking-widest font-heading">
                ACTIVE PRESCRIPTIONS
              </h3>
              <button
                onClick={() => navigate('/prescriptions')}
                className="text-xs font-bold text-[#0B5A54] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#0B5A54]" />
              </button>
            </div>

            {/* Course Completion Toast Notice */}
            {completedNotice && (
              <div className="bg-emerald-500 text-white font-extrabold text-xs p-3 rounded-2xl shadow-md flex items-center gap-2 animate-in fade-in zoom-in-95">
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>{completedNotice}</span>
              </div>
            )}

            {/* Prescription Cards Stack */}
            <div className="space-y-4">
              {MOCK_PRESCRIPTIONS.slice(0, 2)
                .filter((rx) => !prescriptionProgress[rx.id]?.completed)
                .map((rx) => {
                  const prog = prescriptionProgress[rx.id] || { currentDay: 1, totalDays: 7, completed: false };
                  const percent = Math.min(100, Math.round((prog.currentDay / prog.totalDays) * 100));

                  return (
                    <div
                      key={rx.id}
                      className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-300 space-y-4 text-left relative overflow-hidden group"
                    >
                      {/* Top Row: Icon + Medicine Name | Active Pulse Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-[#E3F3F1] text-[#0B5A54] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <Pill className="w-5 h-5 text-[#0B5A54]" />
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-sm sm:text-base font-black text-[#111827] leading-tight tracking-tight group-hover:text-[#0B5A54] transition-colors">
                              {rx.drugName}
                            </h4>
                          </div>
                        </div>

                        {/* Active Status Badge with Pulsing Green Dot */}
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          ACTIVE
                        </span>
                      </div>

                      {/* Side-by-Side Dose & Time Schedule Pill Badges */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Dose Pill */}
                          <span className="bg-[#E3F3F1] text-[#0B5A54] text-xs font-black px-2.5 py-1 rounded-xl border border-[#14B8A6]/20 flex items-center gap-1.5 shadow-2xs">
                            <Pill className="w-3.5 h-3.5 text-[#0B5A54]" />
                            <span>{rx.frequency.split(' • ')[0] || '1 capsule'}</span>
                          </span>

                          {/* Time Schedule Pill */}
                          <span className="bg-amber-50 text-amber-900 border border-amber-200/80 text-xs font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>{rx.frequency.split(' • ')[1] || 'Daily schedule'}</span>
                          </span>
                        </div>

                        {/* Prescriber Doctor Row */}
                        <div className="flex items-center gap-2 text-slate-700">
                          <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                            <UserIcon className="w-3 h-3 text-[#0B5A54]" />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500">Prescribed by:</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/hospitals');
                            }}
                            className="text-xs font-bold text-[#0B5A54] hover:underline cursor-pointer"
                          >
                            {rx.prescriber}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Progress Bar & Quick Action */}
                      <div className="pt-2.5 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-[#0B5A54] font-black">
                            Course Progress: Day {prog.currentDay} of {prog.totalDays}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTakeDose(rx.id, rx.drugName);
                            }}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/70 text-[10.5px] font-extrabold px-3 py-1 rounded-full transition-all active:scale-95 flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <span>Taken today</span>
                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                          </button>
                        </div>

                        {/* Thin Course Progress Line */}
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#14B8A6] to-[#0B5A54] rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* All Prescriptions Completed Empty Banner */}
              {MOCK_PRESCRIPTIONS.slice(0, 2).every((rx) => prescriptionProgress[rx.id]?.completed) && (
                <div className="bg-emerald-50/90 border border-emerald-200 rounded-3xl p-5 text-center space-y-1.5 shadow-2xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-black text-emerald-950">All Prescriptions Completed!</h4>
                  <p className="text-xs font-semibold text-emerald-800">
                    You have finished the full course for all active medications.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <BottomNav />


      {/* REBUILT EXECUTIVE QUEUE STATUS POPUP MODAL (SOLID WHITE BACKGROUND) */}
      {isQueueModalOpen && activeAppointment && (
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
                  {activeAppointment.ticketNumber || 'TK-482'}
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
                <Avatar src={activeAppointment.doctorPhoto} size="sm" />
                <div>
                  <h4 className="text-xs font-extrabold text-[#111827] leading-tight">{activeAppointment.doctorName}</h4>
                  <p className="text-[10px] font-bold text-[#0B5A54] leading-tight">{activeAppointment.doctorSpecialty}</p>
                </div>
              </div>

              <div className="text-right pl-2.5 border-l border-slate-200/80">
                <div className="flex items-center justify-end gap-1 text-[11px] font-black text-[#111827]">
                  <CalendarIcon className="w-3 h-3 text-[#0B5A54]" />
                  <span>{activeAppointment.date}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-semibold">{activeAppointment.timeSlot}</span>
              </div>
            </div>

            {/* 3. Live Token Queue Tracker (Vertical Timeline) */}
            <div className="space-y-2.5 pt-0.5">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  OPD LIVE CONSULTATION TIMELINE
                </span>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
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
                      <span className="text-[11px] font-black text-[#111827] tracking-tight whitespace-nowrap">Token-5 (TK-482)</span>
                    </div>

                    {/* Patient Name */}
                    <div>
                      <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">PATIENT</p>
                      <p className="text-xs font-extrabold text-[#0B5A54]">{activeAppointment.patientName}</p>
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
      )}
    </div>
  );
};




