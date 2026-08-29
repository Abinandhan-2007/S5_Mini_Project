import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Building2,
  Bell,
  ChevronRight,
  Plus,
  CalendarCheck,
} from 'lucide-react';
import { BottomNav } from '../../components/ui/BottomNav';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { LiveIndicator } from '../../components/ui/LiveIndicator';
import { usePolling } from '../../lib/usePolling';
import { useCarePulseStore } from '../../lib/store';

export const AppointmentScheduleScreen: React.FC = () => {
  const navigate = useNavigate();
  const user = useCarePulseStore((s) => s.user);
  const syncAppointments = useCarePulseStore((s) => s.syncAppointments);
  const appointments = useCarePulseStore((s) => s.appointments);

  // Automatic background polling for Patient schedule
  const { isPolling, lastUpdated, refetch } = usePolling(
    async () => {
      if (user?.id) {
        await syncAppointments(user.id);
      }
    },
    {
      interval: 8000,
      enabled: !!user?.id,
    }
  );

  const totalSlotsCount = appointments ? appointments.length : 0;

  // Theme accents cycle for cards
  const CARD_THEMES = [
    { bg: 'bg-[#F3E8FF]', border: 'border-purple-200/90', text: 'text-purple-950', accent: 'bg-purple-600', subtext: 'text-purple-700' },
    { bg: 'bg-[#ECFDF5]', border: 'border-emerald-200/90', text: 'text-emerald-950', accent: 'bg-emerald-600', subtext: 'text-emerald-700' },
    { bg: 'bg-[#EFF6FF]', border: 'border-blue-200/90', text: 'text-blue-950', accent: 'bg-blue-600', subtext: 'text-blue-700' },
    { bg: 'bg-[#FFF1F2]', border: 'border-rose-200/90', text: 'text-rose-950', accent: 'bg-rose-600', subtext: 'text-rose-700' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 w-full relative select-none">
      {/* EXECUTIVE TOP HEADER */}
      <div className="bg-gradient-to-b from-[#1FA2AC] via-[#24A6B0] to-[#1FA2AC] text-white pt-4 pb-5 px-4 shadow-md sticky top-0 z-30 sm:rounded-t-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight leading-tight">My Appointments</h1>
              <p className="text-[11px] text-teal-50 font-medium">Scheduled visits, timings & tokens</p>
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

      {/* MAIN CONTENT AREA */}
      <main className="px-4 sm:px-6 md:px-8 py-4 space-y-4 max-w-5xl mx-auto w-full">
        {/* Title Bar with New Appointment CTA */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-[#111827]">Booked Sessions</h2>
            <Badge variant="tint" size="sm">
              {totalSlotsCount} {totalSlotsCount === 1 ? 'Slot' : 'Slots'}
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

        {/* CONDITIONAL RENDERING: EMPTY STATE VS DYNAMIC LIST */}
        {totalSlotsCount === 0 ? (
          /* CLEAN & INVITING EMPTY STATE */
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E4E7EC] shadow-xs text-center space-y-5 my-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#E3F3F1] border border-[#14B8A6]/20 flex items-center justify-center mx-auto text-[#0B5A54] shadow-sm">
              <CalendarCheck className="w-8 h-8 sm:w-10 sm:h-10 text-[#0B5A54]" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-base sm:text-lg font-black text-[#111827] font-heading">
                No Appointments Scheduled
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
        ) : (
          /* DYNAMIC APPOINTMENTS LIST */
          <div className="space-y-3.5">
            {appointments.map((app, idx) => {
              const theme = CARD_THEMES[idx % CARD_THEMES.length];
              const isUpcoming = app.status === 'Upcoming';

              return (
                <div
                  key={app.id}
                  onClick={() =>
                    navigate(`/appointment-detail/${app.id}`, {
                      state: {
                        id: app.id,
                        ticketNumber: app.ticketNumber,
                        timeSlot: app.timeSlot,
                        date: app.date,
                        type: app.type,
                        patientName: app.patientName || user?.fullName || 'Patient',
                        doctorName: app.doctorName,
                        doctorSpecialty: app.doctorSpecialty,
                        doctorPhoto: app.doctorPhoto,
                        facilityName: app.hospitalName,
                        status: app.status,
                      },
                    })
                  }
                  className={`relative ${theme.bg} border ${theme.border} rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer text-left overflow-hidden group active:scale-[0.99]`}
                >
                  {/* Thick Accent Stripe */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.accent} rounded-l-2xl`} />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Doctor Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Avatar
                        src={app.doctorPhoto}
                        alt={app.doctorName}
                        size="lg"
                        className="ring-2 ring-white shadow-sm shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9.5px] font-black uppercase ${theme.subtext} tracking-wider`}>
                            {app.ticketNumber || '#CP-0000'}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                              isUpcoming
                                ? 'bg-emerald-100 text-emerald-800'
                                : app.status === 'Cancelled'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {app.status || 'Upcoming'}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-[#111827] font-heading truncate mt-0.5">
                          {app.doctorName}
                        </h4>
                        <p className="text-xs font-semibold text-[#0B5A54] truncate">
                          {app.doctorSpecialty}
                        </p>
                        <p className="text-[11px] text-[#6B7280] font-medium flex items-center gap-1 mt-0.5 truncate">
                          <Building2 className="w-3 h-3 text-[#14B8A6] shrink-0" />
                          <span>{app.hospitalName}</span>
                        </p>
                      </div>
                    </div>

                    {/* Date, Time & Action */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-black/5 pt-2 sm:pt-0 shrink-0">
                      <div className="text-left sm:text-right">
                        <div className="flex items-center sm:justify-end gap-1.5 text-xs font-black text-[#111827]">
                          <Calendar className="w-3.5 h-3.5 text-[#0B5A54]" />
                          <span>{app.date}</span>
                        </div>
                        <div className="flex items-center sm:justify-end gap-1.5 text-xs font-bold text-[#6B7280] mt-0.5">
                          <Clock className="w-3 h-3 text-[#0B5A54]" />
                          <span>{app.timeSlot}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-bold text-[#0B5A54] mt-2 group-hover:translate-x-1 transition-transform">
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Nav Capsule */}
      <BottomNav />
    </div>
  );
};
