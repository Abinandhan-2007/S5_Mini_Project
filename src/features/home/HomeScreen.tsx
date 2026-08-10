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
  RefreshCw,
  Navigation,
  Users,
} from 'lucide-react';

import { TopBar } from '../../components/ui/TopBar';
import { BottomNav } from '../../components/ui/BottomNav';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { requestNativeLocation } from '../../lib/locationService';

import { useCarePulseStore } from '../../lib/store';
import { MOCK_PRESCRIPTIONS, MOCK_DOCTORS, MOCK_HOSPITALS } from '../../lib/mockApi';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const activeAppointment = useCarePulseStore((s) => s.activeAppointment);
  const setBookingDoctor = useCarePulseStore((s) => s.setBookingDoctor);

  const [searchQuery, setSearchQuery] = useState('');
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    const matchedDoctor = MOCK_DOCTORS.find((d) => {
      const docName = (d?.name || '').toLowerCase();
      const docSpec = (d?.specialty || '').toLowerCase();
      return docName.includes(query) || docSpec.includes(query);
    });

    if (matchedDoctor) {
      setBookingDoctor(matchedDoctor);
      navigate(`/appointments/book/${matchedDoctor.id}`);
      return;
    }

    // 2. Check if query matches a Hospital's Name -> Go to Hospital Detail Page showing Doctors available there
    const matchedHospital = MOCK_HOSPITALS.find((h) => {
      const hospName = (h?.name || '').toLowerCase();
      const hospAddr = (h?.address || '').toLowerCase();
      return hospName.includes(query) || hospAddr.includes(query);
    });

    if (matchedHospital) {
      navigate(`/hospitals/${matchedHospital.id}`);
      return;
    }

    // 3. Fallback: Redirect to Hospitals list with search filter
    navigate('/hospitals', { state: { initialSearch: searchQuery.trim() } });
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

      {/* MAIN BODY CONTENT */}
      <main className="px-4 pt-1 pb-4 space-y-4">
        {/* HERO SECTION GRID (TICKET & HEALTH TIP) */}
        <div className="grid grid-cols-1 gap-4">
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

        {/* SECONDARY SECTION GRID */}
        <div className="grid grid-cols-1 gap-4">
          {/* 3. UPCOMING VISIT CARD */}
          {activeAppointment && (
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-extrabold text-[#6B7280] uppercase tracking-wider">UPCOMING VISIT</h3>
              </div>

              <Card padding="md" className="bg-[#E3F3F1]/70 border border-[#14B8A6]/20">
                <div className="flex justify-between items-center">
                  <div className="flex gap-3 items-center">
                    <Avatar src={activeAppointment.doctorPhoto} size="md" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#111827]">{activeAppointment.doctorName}</h4>
                      <p className="text-xs text-[#0B5A54] font-semibold">{activeAppointment.doctorSpecialty}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#0B5A54] font-semibold">
                        <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5 text-[#0B5A54]" /> {activeAppointment.date}</span>
                        <span className="flex items-center gap-1 text-[#6B7280]"><Clock className="w-3.5 h-3.5 text-[#14B8A6]" /> {activeAppointment.timeSlot}</span>
                      </div>
                    </div>
                  </div>

                  <Badge variant="tint" size="sm">{activeAppointment.daysLeftText || 'In 2 days'}</Badge>
                </div>
              </Card>
            </div>
          )}

          {/* 4. ACTIVE PRESCRIPTIONS CARD */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-extrabold text-[#6B7280] uppercase tracking-wider">ACTIVE PRESCRIPTIONS</h3>
              <button onClick={() => navigate('/prescriptions')} className="text-xs font-bold text-[#0B5A54] hover:underline flex items-center cursor-pointer">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <Card padding="md" className="divide-y divide-[#E4E7EC]/60 bg-[#F0F4F8]/70 border border-[#E4E7EC]">
              {MOCK_PRESCRIPTIONS.slice(0, 2).map((rx) => (
                <div key={rx.id} className="py-2.5 px-1 flex items-center justify-between first:pt-0 last:pb-0 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#E3F3F1] flex items-center justify-center text-[#0B5A54] shrink-0">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-[#111827]">{rx.drugName} ({rx.dosage})</h5>
                      <p className="text-[11px] text-[#0B5A54] font-bold">Prescribed by {rx.prescriber}</p>
                      <p className="text-[10px] text-[#6B7280]">{rx.frequency}</p>
                    </div>
                  </div>

                  <Badge variant="tint" size="sm">Active</Badge>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </main>

      <BottomNav />

      {/* REBUILT EXECUTIVE QUEUE STATUS POPUP MODAL (SOLID WHITE BACKGROUND) */}
      {isQueueModalOpen && activeAppointment && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 select-none">
          <div className="bg-white rounded-3xl w-full max-w-sm sm:max-w-md p-5 sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] space-y-4 max-h-[90vh] overflow-y-auto border border-slate-100 animate-in zoom-in-95 duration-200">
            
            {/* 1. Header Row */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-4.5 h-4.5 text-[#0B5A54]" />
                <h3 className="text-base font-extrabold text-[#111827] tracking-tight">Queue Status</h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-[#E3F3F1] text-[#0B5A54] font-mono text-xs px-2.5 py-0.5 rounded-full font-extrabold border border-[#14B8A6]/20">
                  {activeAppointment.ticketNumber || 'TK-482'}
                </span>
                <button
                  onClick={() => setIsQueueModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer border-0 outline-none"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. Doctor/Appointment Summary Strip (Clean Solid Card) */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <Avatar src={activeAppointment.doctorPhoto} size="sm" />
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-[#111827] leading-tight">{activeAppointment.doctorName}</h4>
                  <p className="text-[11px] font-bold text-[#0B5A54] leading-tight">{activeAppointment.doctorSpecialty}</p>
                </div>
              </div>

              <div className="text-right pl-3 border-l border-slate-200/80">
                <div className="flex items-center justify-end gap-1 text-xs font-black text-[#111827]">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#0B5A54]" />
                  <span>{activeAppointment.date}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">{activeAppointment.timeSlot}</span>
              </div>
            </div>

            {/* 3. Live Token Queue Tracker (Vertical Timeline) */}
            <div className="space-y-3 pt-0.5">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  OPD LIVE CONSULTATION TIMELINE
                </span>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>

              <div className="relative pl-1 space-y-3">
                {/* Thin Vertical Timeline Line */}
                <div className="absolute left-[11px] top-2.5 bottom-2.5 w-[1.5px] bg-slate-200 z-0" />

                {/* Token-1 (Completed - NO STRIKETHROUGH) */}
                <div className="relative flex items-center gap-3 z-10">
                  <div className="w-5 h-5 rounded-full bg-[#0B5A54] text-white flex items-center justify-center text-[10px] shadow-2xs z-10 shrink-0">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-700 leading-tight">Token-1 (TK-478)</p>
                      <p className="text-[9.5px] text-slate-500 font-medium">Completed</p>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">Called 10:05 AM</span>
                  </div>
                </div>

                {/* Token-2 (Completed - NO STRIKETHROUGH) */}
                <div className="relative flex items-center gap-3 z-10">
                  <div className="w-5 h-5 rounded-full bg-[#0B5A54] text-white flex items-center justify-center text-[10px] shadow-2xs z-10 shrink-0">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-700 leading-tight">Token-2 (TK-479)</p>
                      <p className="text-[9.5px] text-slate-500 font-medium">Completed</p>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">Called 10:18 AM</span>
                  </div>
                </div>

                {/* Token-3 (Current Patient Consulting - NO WRAPPING PREMUM CARD) */}
                <div className="relative flex items-start gap-3 z-10">
                  <div className="relative flex items-center justify-center w-5 h-5 shrink-0 mt-1 z-10">
                    <span className="absolute inset-0 rounded-full bg-amber-400/50 animate-ping" />
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center border-2 border-white shadow-xs z-10">
                      ✕
                    </div>
                  </div>
                  <div className="flex-1 bg-amber-50/90 border border-amber-300 rounded-xl p-3 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-1 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <p className="text-xs font-black text-amber-950 whitespace-nowrap">Token-3 (TK-480)</p>
                        <span className="bg-amber-500 text-white font-black text-[8.5px] px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shadow-2xs">
                          NOW SERVING
                        </span>
                      </div>
                      <span className="text-[9.5px] font-extrabold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200 whitespace-nowrap shrink-0 ml-auto sm:ml-0">
                        In Consultation
                      </span>
                    </div>
                    <p className="text-[10.5px] text-amber-900 font-bold leading-tight">Inside Room 4 with Dr. Morgan</p>
                  </div>
                </div>

                {/* Token-4 (Upcoming - NO 'WAITING IN LOUNGE' TEXT) */}
                <div className="relative flex items-center gap-3 z-10">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white z-10 shrink-0" />
                  <div className="flex-1 flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-700 leading-tight">Token-4 (TK-481)</p>
                    <span className="text-[10px] font-semibold text-slate-500">Est. 10:25 AM</span>
                  </div>
                </div>

                {/* Token-5 (Patient's Own Token - Highlighted Box) */}
                <div className="relative flex items-start gap-3 z-10">
                  <div className="w-5 h-5 rounded-full bg-[#0B5A54] text-white flex items-center justify-center ring-4 ring-[#E3F3F1] z-10 shrink-0 text-[9px] mt-1.5 shadow-2xs">
                    ⭐
                  </div>

                  <div className="flex-1 bg-[#E3F3F1] border-2 border-[#0B5A54] rounded-2xl p-3.5 space-y-2 shadow-xs">
                    {/* Top Row: YOUR TOKEN badge + Token Number */}
                    <div className="flex items-center gap-2">
                      <span className="bg-[#0B5A54] text-white text-[8.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shadow-2xs">
                        YOUR TOKEN
                      </span>
                      <span className="text-xs font-black text-[#111827] tracking-tight whitespace-nowrap">Token-5 (TK-482)</span>
                    </div>

                    {/* Patient Name & Time */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">PATIENT</p>
                        <p className="text-xs font-extrabold text-[#0B5A54]">{activeAppointment.patientName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">ESTIMATED TIME</p>
                        <p className="text-xs font-bold text-[#111827]">{activeAppointment.timeSlot}</p>
                      </div>
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
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                onClick={handleRefreshQueue}
                className="flex-1 bg-[#0B5A54] hover:bg-[#084540] active:scale-[0.98] text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer border-0 outline-none"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Track Live</span>
              </button>

              <button
                onClick={() => {
                  setIsQueueModalOpen(false);
                  navigate('/hospitals');
                }}
                className="flex-1 border border-[#0B5A54]/30 text-[#0B5A54] hover:bg-[#E3F3F1]/50 active:scale-[0.98] font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer outline-none"
              >
                <Navigation className="w-3.5 h-3.5 text-[#0B5A54]" />
                <span>Get Directions</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
