import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Bell,
} from 'lucide-react';
import { BottomNav } from '../../components/ui/BottomNav';
import { Badge } from '../../components/ui/Badge';

export const AppointmentScheduleScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white pb-28 w-full relative">
      {/* Main Content Area */}
      <main className="px-4 sm:px-6 md:px-8 py-4 space-y-4 max-w-7xl mx-auto w-full">
        
        {/* Header with Notification Button (Matching History Screen Style) */}
        <div className="space-y-0.5 pt-1">
          <div className="flex justify-between items-center">
            <h1 className="text-base font-extrabold font-heading text-[#111827]">Appointments Schedule</h1>
            <div className="flex items-center gap-2">
              <Badge variant="tint" size="sm">
                4 Slots Booked
              </Badge>
              <button
                onClick={() => navigate('/notifications')}
                className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#111827] hover:bg-gray-100 transition-all relative active:scale-95 shadow-sm shrink-0"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-[#111827]" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[#6B7280]">
            Hourly timeline slots, duration spans, and scheduled doctor visits.
          </p>
        </div>

        {/* TIMELINE LIST VIEW (WIDE PASTEL TOUCHABLE CARDS) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E4E7EC] shadow-2xs space-y-5 text-left">
          {/* Header Title Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-bold text-[#0B5A54] uppercase tracking-wider">Hourly Timeline Grid</span>
              <h3 className="text-base font-extrabold text-[#111827] font-heading mt-0.5">Tuesday, August 12, 2026</h3>
            </div>
            <button
              onClick={() => navigate('/booking')}
              className="text-xs font-bold text-white bg-[#0B5A54] hover:bg-[#084540] px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer self-start sm:self-auto"
            >
              + New Appointment
            </button>
          </div>

          {/* TRUE CALENDAR TIMELINE GRID (7:00 AM to 5:00 PM) */}
          <div className="pt-1">
            {/* Timeline Grid Container (80px per hour slot, starting 7:00 AM) */}
            <div className="relative min-h-[880px] border-l border-slate-100/80">
              {/* Hourly Background Horizontal Grid Lines & Left Time Axis (7 AM to 5 PM) */}
              {[
                '7:00 AM',
                '8:00 AM',
                '9:00 AM',
                '10:00 AM',
                '11:00 AM',
                '12:00 PM',
                '1:00 PM',
                '2:00 PM',
                '3:00 PM',
                '4:00 PM',
                '5:00 PM',
              ].map((timeLabel, idx) => (
                <div
                  key={timeLabel}
                  style={{ top: `${idx * 80}px` }}
                  className="absolute left-0 right-0 h-[80px] border-t border-slate-100 flex items-start pointer-events-none"
                >
                  <span className="-mt-2.5 text-[11px] font-bold text-slate-400 w-16 text-right pr-3 shrink-0">
                    {timeLabel}
                  </span>
                  <div className="flex-1 h-full border-l border-slate-100/60" />
                </div>
              ))}

              {/* OVERLAID APPOINTMENT CARDS AT EXACT VERTICAL TOP & HEIGHT ACCORDING TO TIME */}

              {/* CARD 1: 8:45 AM - 10:25 AM (Top: 140px, Height: 133px) - Soft Lavender */}
              <div
                style={{ top: '140px', height: '133px' }}
                onClick={() =>
                  navigate('/appointment-detail/app-1', {
                    state: {
                      id: 'app-1',
                      timeSlot: '8:45 AM - 10:25 AM',
                      type: 'General Consultation',
                      clientName: 'Jane Cooper',
                      doctorName: 'Dr. Jane Cooper',
                      doctorSpecialty: 'General Practitioner',
                      doctorPhoto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
                      facilityName: 'St. Jude Medical Center',
                      bgColor: 'bg-[#F3E8FF]',
                      borderColor: 'border-purple-200',
                      textColor: 'text-purple-950',
                    },
                  })
                }
                className="absolute left-20 right-0 bg-[#F3E8FF] border border-purple-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all cursor-pointer text-left flex flex-col justify-between group active:scale-[0.99] overflow-hidden z-10"
              >
                {/* Thick Left Accent Line */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-600 rounded-l-2xl" />

                {/* Top Right Dot */}
                <div className="w-2 h-2 rounded-full bg-purple-600 absolute right-3.5 top-3.5" />

                <div>
                  <span className="text-[9.5px] font-black uppercase text-purple-600 tracking-wider block mb-0.5">
                    ACTIVE
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-purple-950 font-heading leading-tight truncate pr-4">
                    General Consultation
                  </h4>
                  <p className="text-[10.5px] font-bold text-purple-600/90 mt-0.5">
                    12 Aug 2026
                  </p>
                  <p className="text-xs font-black text-purple-700 mt-1">
                    8:45 AM - 10:25 AM
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-1.5 border-t border-purple-200/60 text-[11px] font-bold text-purple-900">
                  <UserIcon className="w-3 h-3 text-purple-600" />
                  <span>Client: Jane Cooper</span>
                </div>
              </div>

              {/* CARD 2: 10:40 AM - 12:30 PM (Top: 293px, Height: 146px) - Soft Emerald */}
              <div
                style={{ top: '293px', height: '146px' }}
                onClick={() =>
                  navigate('/appointment-detail/app-2', {
                    state: {
                      id: 'app-2',
                      timeSlot: '10:40 AM - 12:30 PM',
                      type: 'Vaccination Drive',
                      clientName: 'Marvin McKinney',
                      doctorName: 'Dr. Marvin McKinney',
                      doctorSpecialty: 'Immunology Specialist',
                      doctorPhoto: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
                      facilityName: 'CarePulse Central Hospital',
                      bgColor: 'bg-[#ECFDF5]',
                      borderColor: 'border-emerald-200',
                      textColor: 'text-emerald-950',
                    },
                  })
                }
                className="absolute left-20 right-0 bg-[#ECFDF5] border border-emerald-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all cursor-pointer text-left flex flex-col justify-between group active:scale-[0.99] overflow-hidden z-10"
              >
                {/* Thick Left Accent Line */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-600 rounded-l-2xl" />

                {/* Top Right Dot */}
                <div className="w-2 h-2 rounded-full bg-emerald-600 absolute right-3.5 top-3.5" />

                <div>
                  <span className="text-[9.5px] font-black uppercase text-emerald-600 tracking-wider block mb-0.5">
                    ACTIVE
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-emerald-950 font-heading leading-tight truncate pr-4">
                    Vaccination Drive
                  </h4>
                  <p className="text-[10.5px] font-bold text-emerald-600/90 mt-0.5">
                    12 Aug 2026
                  </p>
                  <p className="text-xs font-black text-emerald-700 mt-1">
                    10:40 AM - 12:30 PM
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-1.5 border-t border-emerald-200/60 text-[11px] font-bold text-emerald-900">
                  <UserIcon className="w-3 h-3 text-emerald-600" />
                  <span>Client: Marvin McKinney</span>
                </div>
              </div>

              {/* CARD 3: 1:00 PM - 2:30 PM (Top: 480px, Height: 120px) - Soft Sky Blue */}
              <div
                style={{ top: '480px', height: '120px' }}
                onClick={() =>
                  navigate('/appointment-detail/app-3', {
                    state: {
                      id: 'app-3',
                      timeSlot: '1:00 PM - 2:30 PM',
                      type: 'Digital X-Ray & Imaging',
                      clientName: 'Cody Fisher',
                      doctorName: 'Dr. Cody Fisher',
                      doctorSpecialty: 'Radiology Expert',
                      doctorPhoto: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
                      facilityName: 'Metropolitan Medical Hub',
                      bgColor: 'bg-[#EFF6FF]',
                      borderColor: 'border-blue-200',
                      textColor: 'text-blue-950',
                    },
                  })
                }
                className="absolute left-20 right-0 bg-[#EFF6FF] border border-blue-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all cursor-pointer text-left flex flex-col justify-between group active:scale-[0.99] overflow-hidden z-10"
              >
                {/* Thick Left Accent Line */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-l-2xl" />

                {/* Top Right Dot */}
                <div className="w-2 h-2 rounded-full bg-blue-600 absolute right-3.5 top-3.5" />

                <div>
                  <span className="text-[9.5px] font-black uppercase text-blue-600 tracking-wider block mb-0.5">
                    UPCOMING
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-blue-950 font-heading leading-tight truncate pr-4">
                    Digital X-Ray & Imaging
                  </h4>
                  <p className="text-[10.5px] font-bold text-blue-600/90 mt-0.5">
                    12 Aug 2026
                  </p>
                  <p className="text-xs font-black text-blue-700 mt-1">
                    1:00 PM - 2:30 PM
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-1.5 border-t border-blue-200/60 text-[11px] font-bold text-blue-900">
                  <UserIcon className="w-3 h-3 text-blue-600" />
                  <span>Client: Cody Fisher</span>
                </div>
              </div>

              {/* CARD 4: 3:00 PM - 4:40 PM (Top: 640px, Height: 133px) - Soft Rose Pink */}
              <div
                style={{ top: '640px', height: '133px' }}
                onClick={() =>
                  navigate('/appointment-detail/app-4', {
                    state: {
                      id: 'app-4',
                      timeSlot: '3:00 PM - 4:40 PM',
                      type: 'Specialized Treatment',
                      clientName: 'Ronald Richards',
                      doctorName: 'Dr. Ronald Richards',
                      doctorSpecialty: 'Dermatology Specialist',
                      doctorPhoto: 'https://images.unsplash.com/photo-1594824813566-88855ce78347?w=400&auto=format&fit=crop&q=80',
                      facilityName: 'Cedar Skin & Wellness Clinic',
                      bgColor: 'bg-[#FFF1F2]',
                      borderColor: 'border-rose-200',
                      textColor: 'text-rose-950',
                    },
                  })
                }
                className="absolute left-20 right-0 bg-[#FFF1F2] border border-rose-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all cursor-pointer text-left flex flex-col justify-between group active:scale-[0.99] overflow-hidden z-10"
              >
                {/* Thick Left Accent Line */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-600 rounded-l-2xl" />

                {/* Top Right Dot */}
                <div className="w-2 h-2 rounded-full bg-rose-600 absolute right-3.5 top-3.5" />

                <div>
                  <span className="text-[9.5px] font-black uppercase text-rose-600 tracking-wider block mb-0.5">
                    UPCOMING
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-rose-950 font-heading leading-tight truncate pr-4">
                    Specialized Treatment
                  </h4>
                  <p className="text-[10.5px] font-bold text-rose-600/90 mt-0.5">
                    12 Aug 2026
                  </p>
                  <p className="text-xs font-black text-rose-700 mt-1">
                    3:00 PM - 4:40 PM
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-1.5 border-t border-rose-200/60 text-[11px] font-bold text-rose-900">
                  <UserIcon className="w-3 h-3 text-rose-600" />
                  <span>Client: Ronald Richards</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Nav Capsule */}
      <BottomNav />
    </div>
  );
};
