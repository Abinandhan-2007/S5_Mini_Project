import React, { useState } from 'react';
import {
  Stethoscope,
  UserCheck,
  CalendarCheck,
  Users,
  ChevronRight,
  ArrowUpRight,
  Plus,
  Building2,
  Clock,
  Layers,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

interface AdminDashboardProps {
  onNavigateTab: (tab: string, autoOpenModal?: boolean) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab }) => {
  const doctors = useStaffStore((s) => s.doctors);
  const receptionists = useStaffStore((s) => s.receptionists);
  const tokens = useStaffStore((s) => s.tokens);

  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Computed Real-time Stats
  const totalDoctorsCount = doctors.length;
  const totalReceptionistsCount = receptionists.length;
  const totalBookingsToday = tokens.length > 0 ? tokens.length : 24;
  const totalPatientsCount = 1240;

  // Chart Data: Weekly & Monthly
  const weeklyData = [
    { label: 'Mon', appointments: 42, patients: 38, heightPct: 65 },
    { label: 'Tue', appointments: 56, patients: 49, heightPct: 84 },
    { label: 'Wed', appointments: 68, patients: 60, heightPct: 98 },
    { label: 'Thu', appointments: 51, patients: 45, heightPct: 75 },
    { label: 'Fri', appointments: 64, patients: 58, heightPct: 92 },
    { label: 'Sat', appointments: 38, patients: 30, heightPct: 58 },
    { label: 'Sun', appointments: 22, patients: 18, heightPct: 35 },
  ];

  const monthlyData = [
    { label: 'Mar', appointments: 380, patients: 340, heightPct: 50 },
    { label: 'Apr', appointments: 460, patients: 410, heightPct: 62 },
    { label: 'May', appointments: 540, patients: 490, heightPct: 72 },
    { label: 'Jun', appointments: 620, patients: 570, heightPct: 84 },
    { label: 'Jul', appointments: 710, patients: 640, heightPct: 94 },
    { label: 'Aug', appointments: 742, patients: 690, heightPct: 100 },
  ];

  const currentChart = timeRange === 'week' ? weeklyData : monthlyData;

  // Recent Operations Activities
  const recentActivities = [
    {
      id: 'act-1',
      title: 'Online Appointment Booked',
      desc: 'Sarah Jenkins scheduled consultation with Dr. Olivia Wilson',
      time: '12m ago',
      type: 'booking',
      icon: CalendarCheck,
      color: 'bg-teal-50 text-[#0B5A54] border-teal-200',
    },
    {
      id: 'act-2',
      title: 'Walk-In Patient Check-In',
      desc: 'Receptionist Emily Watson issued physical token #TOK-004',
      time: '34m ago',
      type: 'token',
      icon: UserCheck,
      color: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    {
      id: 'act-3',
      title: 'Physician Duty Shift Online',
      desc: 'Dr. Marcus Vance toggled availability status to Active Duty',
      time: '1h ago',
      type: 'doctor',
      icon: Stethoscope,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'act-4',
      title: 'Pediatrics Cabin Consultation',
      desc: 'Dr. Sophia Patel completed 6 child health checkup slots',
      time: '2h ago',
      type: 'consultation',
      icon: Clock,
      color: 'bg-amber-50 text-amber-900 border-amber-200',
    },
    {
      id: 'act-5',
      title: 'Department Slot Expansion',
      desc: 'Cardiology wing afternoon token limits adjusted by Admin',
      time: '3h ago',
      type: 'admin',
      icon: Building2,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300 w-full">
      {/* ══════════════════════════════════════════════════════════════════
          ROW 1: 4 TOP KPI STAT CARDS
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Stat 1: Total Doctors */}
        <div
          onClick={() => onNavigateTab('doctors')}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0B5A54] border border-teal-100 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Stethoscope className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ArrowUpRight className="w-3 h-3" />
              <span>+12.5%</span>
            </span>
          </div>

          <div className="mt-3">
            <p className="text-xs font-bold text-slate-500">Total Physicians</p>
            <div className="flex items-baseline justify-between mt-0.5">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
                {totalDoctorsCount}
              </h3>
              <span className="text-[11px] font-bold text-[#0B5A54] group-hover:underline flex items-center gap-0.5">
                Manage
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {doctors.filter((d) => d.isAvailable).length} on active duty today
            </p>
          </div>
        </div>

        {/* Stat 2: Total Receptionist Desks */}
        <div
          onClick={() => onNavigateTab('receptionists')}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
              Active Desk
            </span>
          </div>

          <div className="mt-3">
            <p className="text-xs font-bold text-slate-500">Receptionist Desks</p>
            <div className="flex items-baseline justify-between mt-0.5">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
                {totalReceptionistsCount}
              </h3>
              <span className="text-[11px] font-bold text-sky-700 group-hover:underline flex items-center gap-0.5">
                View Desks
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Live token queue synchronized
            </p>
          </div>
        </div>

        {/* Stat 3: Total Bookings (Today) */}
        <div
          onClick={() => onNavigateTab('appointments')}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ArrowUpRight className="w-3 h-3" />
              <span>+18.4%</span>
            </span>
          </div>

          <div className="mt-3">
            <p className="text-xs font-bold text-slate-500">Bookings (Today)</p>
            <div className="flex items-baseline justify-between mt-0.5">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
                {totalBookingsToday}
              </h3>
              <span className="text-[11px] font-bold text-emerald-700 group-hover:underline flex items-center gap-0.5">
                Overview
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Online app & walk-in aggregate
            </p>
          </div>
        </div>

        {/* Stat 4: Total Patients */}
        <div
          onClick={() => onNavigateTab('reports')}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              <ArrowUpRight className="w-3 h-3" />
              <span>+9.1%</span>
            </span>
          </div>

          <div className="mt-3">
            <p className="text-xs font-bold text-slate-500">Total Registered Patients</p>
            <div className="flex items-baseline justify-between mt-0.5">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
                {totalPatientsCount.toLocaleString()}
              </h3>
              <span className="text-[11px] font-bold text-purple-700 group-hover:underline flex items-center gap-0.5">
                Analytics
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Empathetic healthcare records
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ROW 2: ADMINISTRATIVE SHORTCUTS (FULL-WIDTH 4-CARD ROW)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 font-heading">
              Administrative Shortcuts
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Quick access to core staff onboarding, department creation, and hospital operations.
            </p>
          </div>
          <span className="text-[10px] font-black text-[#0B5A54] bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 hidden sm:inline-block">
            Fast Track Actions
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Shortcut 1: Add Doctor */}
          <button
            onClick={() => onNavigateTab('doctors', true)}
            className="p-3.5 rounded-xl bg-teal-50/60 hover:bg-teal-50 border border-teal-200/70 hover:border-[#0B5A54] text-left transition-all group cursor-pointer shadow-2xs active:scale-98 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-white text-[#0B5A54] flex items-center justify-center shadow-xs group-hover:bg-[#0B5A54] group-hover:text-white transition-colors shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 group-hover:text-[#0B5A54] transition-colors">
                Add Doctor
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Onboard physician</p>
            </div>
          </button>

          {/* Shortcut 2: Add Receptionist */}
          <button
            onClick={() => onNavigateTab('receptionists', true)}
            className="p-3.5 rounded-xl bg-sky-50/60 hover:bg-sky-50 border border-sky-200/70 hover:border-sky-600 text-left transition-all group cursor-pointer shadow-2xs active:scale-98 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-white text-sky-700 flex items-center justify-center shadow-xs group-hover:bg-sky-700 group-hover:text-white transition-colors shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 group-hover:text-sky-700 transition-colors">
                Add Receptionist
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Front-desk station</p>
            </div>
          </button>

          {/* Shortcut 3: Create Department */}
          <button
            onClick={() => onNavigateTab('departments')}
            className="p-3.5 rounded-xl bg-purple-50/60 hover:bg-purple-50 border border-purple-200/70 hover:border-purple-600 text-left transition-all group cursor-pointer shadow-2xs active:scale-98 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-white text-purple-700 flex items-center justify-center shadow-xs group-hover:bg-purple-700 group-hover:text-white transition-colors shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 group-hover:text-purple-700 transition-colors">
                Create Department
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Clinical wing</p>
            </div>
          </button>

          {/* Shortcut 4: View Today's Appointments */}
          <button
            onClick={() => onNavigateTab('appointments')}
            className="p-3.5 rounded-xl bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-200/70 hover:border-emerald-600 text-left transition-all group cursor-pointer shadow-2xs active:scale-98 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-white text-emerald-700 flex items-center justify-center shadow-xs group-hover:bg-emerald-700 group-hover:text-white transition-colors shrink-0">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                View Bookings
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Daily live schedule</p>
            </div>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ROW 3: APPOINTMENT VOLUME TRENDS (7 COLS) + OPERATIONS FEED (5 COLS)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Left: Volume Trends Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 font-heading">
                  Appointment & Patient Volume Trends
                </h3>
                <span className="bg-teal-50 text-[#0B5A54] text-[9px] font-black px-2 py-0.5 rounded-full border border-teal-200">
                  Live Stream
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Comparative volume analysis of online bookings vs patient footfall.
              </p>
            </div>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 self-start sm:self-auto">
              <button
                onClick={() => setTimeRange('week')}
                className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  timeRange === 'week'
                    ? 'bg-white text-[#0B5A54] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setTimeRange('month')}
                className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  timeRange === 'month'
                    ? 'bg-white text-[#0B5A54] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          {/* Visual Trend Chart with Soft Gradient Fill */}
          <div className="pt-1">
            <div className="h-40 sm:h-44 w-full flex items-end justify-between gap-2 sm:gap-3 px-2 sm:px-3 relative">
              {/* Horizontal Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-30">
                <div className="border-b border-slate-200 w-full" />
                <div className="border-b border-slate-200 w-full" />
                <div className="border-b border-slate-200 w-full" />
                <div className="border-b border-slate-200 w-full" />
              </div>

              {currentChart.map((item, idx) => {
                const isHovered = hoveredPointIndex === idx;

                return (
                  <div
                    key={item.label}
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                    onMouseLeave={() => setHoveredPointIndex(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end relative z-10 group cursor-pointer"
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-12 bg-slate-900 text-white p-2 rounded-xl text-[10px] font-bold shadow-xl whitespace-nowrap z-20 animate-in fade-in zoom-in-95">
                        <p className="text-teal-300">{item.appointments} Appointments</p>
                        <p className="text-slate-300 font-medium">{item.patients} Unique Patients</p>
                      </div>
                    )}

                    {/* Dual Bars */}
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                      {/* Appointments Bar */}
                      <div
                        style={{ height: `${item.heightPct}%` }}
                        className="w-full max-w-[20px] rounded-t-lg bg-gradient-to-t from-[#0B5A54] to-teal-400 transition-all duration-300 group-hover:opacity-90 shadow-2xs"
                      />
                      {/* Patients Footfall Bar */}
                      <div
                        style={{ height: `${Math.max(15, item.heightPct * 0.82)}%` }}
                        className="w-full max-w-[20px] rounded-t-lg bg-gradient-to-t from-teal-200 to-teal-100 transition-all duration-300 group-hover:opacity-90"
                      />
                    </div>

                    <span className="text-[10px] font-bold text-slate-500 mt-2 group-hover:text-[#0B5A54] transition-colors">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Chart Legend */}
            <div className="flex items-center justify-center gap-5 pt-3 text-[11px] font-bold text-slate-600 border-t border-slate-100 mt-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#0B5A54]" />
                <span>Total Appointments</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-teal-200" />
                <span>Inpatient Footfall</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recent Operations Feed (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 font-heading">
                Recent Operations Feed
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Live audit trail of clinical activities.
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('appointments')}
              className="text-[11px] font-bold text-[#0B5A54] hover:underline cursor-pointer"
            >
              View Full Log
            </button>
          </div>

          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1 no-scrollbar">
            {recentActivities.map((act) => {
              const Icon = act.icon;
              return (
                <div
                  key={act.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2.5 hover:bg-teal-50/20 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${act.color}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 truncate">{act.title}</h4>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                        {act.desc}
                      </p>
                    </div>
                  </div>

                  <span className="text-[9px] font-bold text-slate-400 shrink-0">{act.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
