import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Clock, Pill, ChevronRight, Ticket, Calendar as CalendarIcon, User as UserIcon, Building2, Search, Mic } from 'lucide-react';

import { TopBar } from '../../components/ui/TopBar';
import { BottomNav } from '../../components/ui/BottomNav';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { requestNativeLocation } from '../../lib/locationService';

import { useCarePulseStore } from '../../lib/store';
import { MOCK_PRESCRIPTIONS } from '../../lib/mockApi';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const activeAppointment = useCarePulseStore((s) => s.activeAppointment);

  const [searchQuery, setSearchQuery] = useState('');

  // Prompt native mobile OS system location permission on app startup
  useEffect(() => {
    const promptNativeLocationOnStartup = async () => {
      const hasPrompted = sessionStorage.getItem('location_native_prompted');
      if (!hasPrompted) {
        sessionStorage.setItem('location_native_prompted', 'true');
        const res = await requestNativeLocation();
        if (res.placeName) {
          navigate('/hospitals', { state: { initialSearch: res.placeName } });
        }
      }
    };
    promptNativeLocationOnStartup();
  }, [navigate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('/hospitals');
    }
  };

  return (
    <div className="min-h-screen bg-white pb-28 w-full relative">
      {/* VIBRANT CYAN HERO TOP SECTION */}
      <div className="bg-gradient-to-b from-[#1FA2AC] via-[#24A6B0] via-45% to-white pt-1 pb-6 px-4 relative space-y-3">
        <TopBar variant="cyan" />

        {/* PILL SEARCH BAR WITH VOICE MIC BUTTON */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex items-center bg-white/95 backdrop-blur-md rounded-full px-3 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-white/80 transition-all"
        >
          <Search className="w-4 h-4 text-[#6B7280] ml-1 shrink-0" />

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Doctor's, Hospitals..."
            className="w-full bg-transparent border-none text-xs sm:text-sm text-[#111827] font-medium px-2.5 py-1.5 focus:outline-none placeholder:text-[#9CA3AF]"
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
                    onClick={() => navigate('/history')}
                    className="bg-[#E3F3F1] text-[#0B5A54] hover:bg-[#0B5A54] hover:text-white px-3.5 py-1.5 rounded-pill text-xs font-bold transition-all shadow-2xs"
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
              <button onClick={() => navigate('/history')} className="text-xs font-bold text-[#0B5A54] hover:underline flex items-center">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <Card padding="md" className="divide-y divide-[#E4E7EC]/60 bg-[#F0F4F8]/70 border border-[#E4E7EC]">
              {MOCK_PRESCRIPTIONS.map((rx) => (
                <div key={rx.id} className="py-2.5 px-1 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#E3F3F1] flex items-center justify-center text-[#0B5A54] shrink-0">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-[#111827]">{rx.drugName} ({rx.dosage})</h5>
                      <p className="text-xs text-[#6B7280]">{rx.frequency} • {rx.prescriber}</p>
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
    </div>
  );
};
