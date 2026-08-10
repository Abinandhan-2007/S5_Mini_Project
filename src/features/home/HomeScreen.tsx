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
  Users,
  X,
  RefreshCw,
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
  const [isTokenQueueOpen, setIsTokenQueueOpen] = useState(false);
  const [isRefreshingQueue, setIsRefreshingQueue] = useState(false);

  const handleRefreshQueue = () => {
    setIsRefreshingQueue(true);
    setTimeout(() => {
      setIsRefreshingQueue(false);
    }, 600);
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsTokenQueueOpen(true)}
                    className="bg-amber-50 text-amber-700 border border-amber-200/80 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    Queue: 3 Ahead
                  </button>
                  <span className="bg-[#E3F3F1] text-[#0B5A54] font-mono text-xs px-2.5 py-0.5 rounded-pill font-bold">
                    {activeAppointment.ticketNumber}
                  </span>
                </div>
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

                <div className="pt-1 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setIsTokenQueueOpen(true)}
                    className="bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-pill text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    Persons Before Me (3)
                  </button>

                  <button
                    onClick={() => setIsTokenQueueOpen(true)}
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
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1 rounded-pill transition-colors shrink-0 ml-2 cursor-pointer"
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

      {/* LIVE TOKEN QUEUE POPUP MODAL */}
      {isTokenQueueOpen && activeAppointment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-gray-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Live Token Queue Status</h3>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  {activeAppointment.doctorName} • {activeAppointment.hospitalName}
                </p>
              </div>

              <button
                onClick={() => setIsTokenQueueOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hero Token Status Card */}
            <div className="bg-gradient-to-br from-[#0B5A54] via-[#14B8A6] to-[#0B5A54] text-white p-4 rounded-2xl shadow-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-teal-100">NOW CONSULTING</span>
                  <div className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    <span>TK-479</span>
                    <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full text-teal-50">Room 4</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-teal-100">YOUR TOKEN</span>
                  <div className="text-2xl font-black tracking-tight text-yellow-300">
                    {activeAppointment.ticketNumber}
                  </div>
                </div>
              </div>

              <div className="bg-white/15 backdrop-blur-md rounded-xl p-2.5 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2 text-white">
                  <Users className="w-4 h-4 text-yellow-300" />
                  <span>
                    <strong>3 Persons</strong> Ahead of You
                  </span>
                </div>
                <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[11px] font-bold">
                  ~15 mins wait
                </span>
              </div>
            </div>

            {/* List of Persons / Tokens Before You */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                  TOKENS AHEAD OF YOU (3 PATIENTS)
                </h4>
                <button
                  onClick={handleRefreshQueue}
                  className="text-[11px] font-bold text-[#0B5A54] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingQueue ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className="space-y-2">
                {/* Token 1: In Room */}
                <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500 text-white font-mono font-black text-xs flex items-center justify-center shadow-xs">
                      479
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-gray-900">Token #TK-479</h5>
                        <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                          In Cabin
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 font-medium">Inside OPD Room 4 • Consultation Active</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700">10:15 AM</span>
                </div>

                {/* Token 2: Next in Line */}
                <div className="bg-amber-50/90 border border-amber-200/80 p-3 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-500 text-white font-mono font-black text-xs flex items-center justify-center shadow-xs">
                      480
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-gray-900">Token #TK-480</h5>
                        <span className="bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                          Next Up
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 font-medium">Vitals Desk • Called for Checkup</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700">10:20 AM</span>
                </div>

                {/* Token 3: Waiting in Lounge */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-600 text-white font-mono font-black text-xs flex items-center justify-center shadow-xs">
                      481
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-gray-900">Token #TK-481</h5>
                        <span className="bg-slate-200 text-slate-700 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                          Waiting
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">Lounge Waiting Area • Checked-In</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">10:25 AM</span>
                </div>

                {/* YOUR TOKEN HIGHLIGHT */}
                <div className="bg-[#E3F3F1] border-2 border-[#14B8A6] p-3 rounded-2xl flex items-center justify-between shadow-sm relative">
                  <div className="absolute -top-2 right-3 bg-[#0B5A54] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    ⭐ YOUR TOKEN
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#0B5A54] text-white font-mono font-black text-xs flex items-center justify-center shadow-xs">
                      482
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-gray-900">
                        {activeAppointment.patientName} (#{activeAppointment.ticketNumber})
                      </h5>
                      <p className="text-[11px] text-[#0B5A54] font-bold">You are 4th in Queue • Ready for Entry</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#0B5A54]">{activeAppointment.timeSlot}</span>
                </div>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  setIsTokenQueueOpen(false);
                  navigate('/history');
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 px-3 rounded-xl transition-colors text-center cursor-pointer"
              >
                Full History
              </button>

              <button
                onClick={() => setIsTokenQueueOpen(false)}
                className="flex-1 bg-[#0B5A54] hover:bg-[#084540] text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-colors text-center shadow-sm cursor-pointer"
              >
                Close Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
