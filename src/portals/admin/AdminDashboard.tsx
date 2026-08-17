import React, { useState } from 'react';
import {
  Building2,
  UserCheck,
  CalendarCheck,
  Users,
  BarChart3,
  Ticket,
  ChevronRight,
  ArrowUpRight,
  Award,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

interface AdminDashboardProps {
  onNavigateTab: (tab: string, autoOpenModal?: boolean) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateTab,
}) => {
  const receptionists = useStaffStore((s) => s.receptionists);
  const hospitals = useStaffStore((s) => s.hospitals);
  const tokens = useStaffStore((s) => s.tokens);
  const hospitalSettings = useStaffStore((s) => s.hospitalSettings);

  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [showAllActivities, setShowAllActivities] = useState(false);

  // Computed metrics
  const totalHospitalsCount = hospitals.length;
  const totalReceptionistsCount = receptionists.length;
  const totalBookingsCount = 1428 + tokens.length;
  const totalPatientsCount = 3890;

  // Chart datasets (dual series: Appointments vs Patients)
  const chartDatasets = {
    week: [
      { label: 'Mon', appointments: 48, patients: 38, appHeight: 65, patHeight: 52 },
      { label: 'Tue', appointments: 62, patients: 50, appHeight: 82, patHeight: 66 },
      { label: 'Wed', appointments: 55, patients: 44, appHeight: 74, patHeight: 58 },
      { label: 'Thu', appointments: 70, patients: 58, appHeight: 92, patHeight: 78 },
      { label: 'Fri', appointments: 76, patients: 64, appHeight: 100, patHeight: 85 },
      { label: 'Sat', appointments: 42, patients: 34, appHeight: 56, patHeight: 45 },
      { label: 'Sun', appointments: 28, patients: 22, appHeight: 38, patHeight: 30 },
    ],
    month: [
      { label: 'Week 1', appointments: 280, patients: 230, appHeight: 68, patHeight: 55 },
      { label: 'Week 2', appointments: 340, patients: 290, appHeight: 82, patHeight: 70 },
      { label: 'Week 3', appointments: 390, patients: 330, appHeight: 94, patHeight: 80 },
      { label: 'Week 4', appointments: 425, patients: 360, appHeight: 100, patHeight: 86 },
    ],
    year: [
      { label: 'Q1', appointments: 1240, patients: 1050, appHeight: 70, patHeight: 60 },
      { label: 'Q2', appointments: 1580, patients: 1320, appHeight: 85, patHeight: 72 },
      { label: 'Q3', appointments: 1890, patients: 1610, appHeight: 96, patHeight: 82 },
      { label: 'Q4 (Est.)', appointments: 2100, patients: 1800, appHeight: 100, patHeight: 88 },
    ],
  };

  const currentChart = chartDatasets[timeRange];

  // Recent Operations Feed
  const initialActivities = [
    {
      id: 'act-1',
      actor: 'Dr. Olivia Wilson',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
      action: 'Completed 14 clinical cardiology appointments',
      time: '25m ago',
      type: 'Doctor',
      badgeColor: 'bg-teal-50 text-[#0B5A54] border-teal-200',
    },
    {
      id: 'act-2',
      actor: 'Emily Watson (Desk A-1)',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      action: 'Issued walk-in token #TOK-004 for Dr. Ethan Reynolds',
      time: '1h ago',
      type: 'Receptionist',
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    {
      id: 'act-3',
      actor: 'CarePulse System',
      avatar: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=400&auto=format&fit=crop&q=80',
      action: 'New hospital branch "Downtown Urgent Care" synchronized',
      time: '2h ago',
      type: 'Hospital',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      id: 'act-4',
      actor: 'Sarah Jenkins',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
      action: 'Online appointment confirmed with Dr. Marcus Vance (#CP-4821)',
      time: '3h ago',
      type: 'Booking',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'act-5',
      actor: 'AI Clinical Triage',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
      action: 'Symptom checker v1.4 health assessment auto-triaged 12 cases',
      time: '4h ago',
      type: 'System',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  ];

  const displayedActivities = showAllActivities ? initialActivities : initialActivities.slice(0, 4);

  // Top Performing Doctors Leaderboard
  const topDoctors = [
    {
      id: 'doc-1',
      name: 'Dr. Olivia Wilson',
      specialty: 'Cardiology',
      appointments: 54,
      rating: 4.9,
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
      rank: 1,
    },
    {
      id: 'doc-3',
      name: 'Dr. Sophia Patel',
      specialty: 'Pediatrics',
      appointments: 48,
      rating: 4.9,
      avatar: 'https://images.unsplash.com/photo-1594824813566-78a99478f237?w=400&auto=format&fit=crop&q=80',
      rank: 2,
    },
    {
      id: 'doc-2',
      name: 'Dr. Marcus Vance',
      specialty: 'Dermatology',
      appointments: 42,
      rating: 4.8,
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
      rank: 3,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header Bar with Facility Tag & System Status ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
              Command Dashboard
            </h1>
            <span className="bg-teal-50 text-[#0B5A54] border border-teal-200 text-xs font-black px-2.5 py-0.5 rounded-full">
              {hospitalSettings.name}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Executive oversight of hospital network, medical staffing, bookings, and facility intelligence.
          </p>
        </div>

        {/* System Status Indicator */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 shadow-2xs self-start sm:self-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-left">
            <p className="text-xs font-black text-emerald-950 leading-none">All Systems Synced</p>
            <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Last sync: Just now</p>
          </div>
        </div>
      </div>

      {/* ── Top Metrics Row: 4 Premium Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Hospitals */}
        <div
          onClick={() => onNavigateTab('hospitals')}
          className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-[#0B5A54]/40 transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-[#0B5A54] border border-teal-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>↑12%</span>
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Hospitals</span>
            <div className="text-3xl font-black text-slate-900 font-heading mt-0.5">
              {totalHospitalsCount}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Across 4 active clinical branches</p>
          </div>
        </div>

        {/* Metric 2: Total Receptionist Desks */}
        <div
          onClick={() => onNavigateTab('receptionists')}
          className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-sky-300 transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 border border-sky-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>↑8%</span>
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reception Desks</span>
            <div className="text-3xl font-black text-slate-900 font-heading mt-0.5">
              {totalReceptionistsCount}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Active front-desk stations</p>
          </div>
        </div>

        {/* Metric 3: Total Bookings */}
        <div
          onClick={() => onNavigateTab('bookings')}
          className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CalendarCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>↑18%</span>
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Bookings</span>
            <div className="text-3xl font-black text-slate-900 font-heading mt-0.5">
              {totalBookingsCount.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Online & OPD appointments</p>
          </div>
        </div>

        {/* Metric 4: Total Patients */}
        <div
          onClick={() => onNavigateTab('bookings')}
          className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>↑14%</span>
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Patients</span>
            <div className="text-3xl font-black text-slate-900 font-heading mt-0.5">
              {totalPatientsCount.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Registered health records</p>
          </div>
        </div>
      </div>

      {/* ── Main Content: Left (Chart 65%) vs Right (Shortcuts 35%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (65%): Dual-Series Area/Bar Chart */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading">
                  Appointment & Patient Volume Trends
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Dual-series breakdown comparing patient attendance vs completed doctor consults
                </p>
              </div>

              {/* Segmented Time-Range Control */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70 self-start sm:self-auto">
                {(['week', 'month', 'year'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                      timeRange === r
                        ? 'bg-[#0B5A54] text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-6 text-xs font-bold pt-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#0B5A54]" />
                <span className="text-slate-700">Appointments</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-teal-300" />
                <span className="text-slate-700">Patients</span>
              </div>
            </div>

            {/* Interactive Bar/Area Visualization */}
            <div className="h-64 pt-6 flex items-end justify-between gap-2 sm:gap-4 px-2">
              {currentChart.map((item, idx) => {
                const isHovered = hoveredPointIndex === idx;
                return (
                  <div
                    key={item.label}
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative cursor-pointer"
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                    onMouseLeave={() => setHoveredPointIndex(null)}
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-12 z-20 bg-slate-900 text-white text-[11px] font-bold py-1.5 px-3 rounded-xl shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95">
                        <p>{item.appointments} Appointments • {item.patients} Patients</p>
                      </div>
                    )}

                    {/* Dual Bars Graphic */}
                    <div className="w-full max-w-[36px] flex items-end justify-center gap-1.5 h-48">
                      {/* Bar 1: Appointments */}
                      <div
                        style={{ height: `${item.appHeight}%` }}
                        className={`w-1/2 rounded-t-lg transition-all duration-300 ${
                          isHovered ? 'bg-[#084540] scale-x-110 shadow-md' : 'bg-[#0B5A54]'
                        }`}
                      />
                      {/* Bar 2: Patients */}
                      <div
                        style={{ height: `${item.patHeight}%` }}
                        className={`w-1/2 rounded-t-lg transition-all duration-300 ${
                          isHovered ? 'bg-teal-400 scale-x-110 shadow-md' : 'bg-teal-300'
                        }`}
                      />
                    </div>

                    <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right (35%): Administrative Action Shortcuts */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 font-heading">
                Administrative Shortcuts
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Quick-launch creation and overview workflows
              </p>
            </div>

            {/* 2x2 Grid of Action Tiles */}
            <div className="grid grid-cols-2 gap-3 pt-3">
              {/* Tile 1: Add Hospital */}
              <button
                onClick={() => onNavigateTab('hospitals', true)}
                className="p-4 rounded-2xl bg-teal-50/60 hover:bg-[#0B5A54] hover:text-white border border-teal-200/70 text-left transition-all duration-200 group cursor-pointer shadow-2xs hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-white text-[#0B5A54] border border-teal-200/80 flex items-center justify-center shadow-2xs group-hover:bg-white/20 group-hover:text-white group-hover:border-white/30 transition-all">
                  <Building2 className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-black text-slate-900 group-hover:text-white mt-3 font-heading">
                  Add Hospital
                </h4>
                <p className="text-[10px] text-slate-500 group-hover:text-teal-100 mt-0.5 font-medium leading-tight">
                  Branch location & logo
                </p>
              </button>

              {/* Tile 2: Add Receptionist */}
              <button
                onClick={() => onNavigateTab('receptionists', true)}
                className="p-4 rounded-2xl bg-sky-50/60 hover:bg-sky-700 hover:text-white border border-sky-200/70 text-left transition-all duration-200 group cursor-pointer shadow-2xs hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-white text-sky-700 border border-sky-200/80 flex items-center justify-center shadow-2xs group-hover:bg-white/20 group-hover:text-white group-hover:border-white/30 transition-all">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-black text-slate-900 group-hover:text-white mt-3 font-heading">
                  Add Receptionist
                </h4>
                <p className="text-[10px] text-slate-500 group-hover:text-sky-100 mt-0.5 font-medium leading-tight">
                  Desk & shift roster
                </p>
              </button>

              {/* Tile 3: Tokens & Slots */}
              <button
                onClick={() => onNavigateTab('tokens')}
                className="p-4 rounded-2xl bg-indigo-50/60 hover:bg-indigo-700 hover:text-white border border-indigo-200/70 text-left transition-all duration-200 group cursor-pointer shadow-2xs hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-white text-indigo-700 border border-indigo-200/80 flex items-center justify-center shadow-2xs group-hover:bg-white/20 group-hover:text-white group-hover:border-white/30 transition-all">
                  <Ticket className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-black text-slate-900 group-hover:text-white mt-3 font-heading">
                  Tokens & Slots
                </h4>
                <p className="text-[10px] text-slate-500 group-hover:text-indigo-100 mt-0.5 font-medium leading-tight">
                  Capacity & overrides
                </p>
              </button>

              {/* Tile 4: View Reports */}
              <button
                onClick={() => onNavigateTab('reports')}
                className="p-4 rounded-2xl bg-emerald-50/60 hover:bg-emerald-700 hover:text-white border border-emerald-200/70 text-left transition-all duration-200 group cursor-pointer shadow-2xs hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-white text-emerald-700 border border-emerald-200/80 flex items-center justify-center shadow-2xs group-hover:bg-white/20 group-hover:text-white group-hover:border-white/30 transition-all">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-black text-slate-900 group-hover:text-white mt-3 font-heading">
                  View Reports
                </h4>
                <p className="text-[10px] text-slate-500 group-hover:text-emerald-100 mt-0.5 font-medium leading-tight">
                  Clinical analytics suite
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Below Main: Recent Operations Feed & Top Doctors Leaderboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (65%): Vertical Operations Feed */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 font-heading">
                Recent Operations Feed
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Live audit trail of doctor actions, receptionist check-ins, bookings, and system triggers
              </p>
            </div>
            <button
              onClick={() => setShowAllActivities(!showAllActivities)}
              className="text-xs font-bold text-[#0B5A54] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>{showAllActivities ? 'Show Less' : 'View All Activity'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Activity Items */}
          <div className="divide-y divide-slate-100">
            {displayedActivities.map((act) => (
              <div key={act.id} className="py-3.5 flex items-start gap-3.5 group">
                <img
                  src={act.avatar}
                  alt={act.actor}
                  className="w-10 h-10 rounded-2xl object-cover border border-slate-200 shadow-2xs shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 font-heading">{act.actor}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${act.badgeColor}`}>
                        {act.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{act.time}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">{act.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right (35%): Top Performing Doctors Leaderboard */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 font-heading">
                Top Performing Doctors
              </h3>
              <p className="text-xs text-slate-400 font-medium">This week's clinical leaderboards</p>
            </div>
            <Award className="w-5 h-5 text-amber-500" />
          </div>

          <div className="space-y-3">
            {topDoctors.map((doc) => (
              <div
                key={doc.id}
                className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-teal-50/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={doc.avatar}
                      alt={doc.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                    />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0B5A54] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                      #{doc.rank}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-900 truncate font-heading">{doc.name}</h4>
                    <p className="text-[11px] text-slate-500 truncate font-medium">{doc.specialty}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-[#0B5A54]">{doc.appointments} Visits</p>
                  <p className="text-[10px] text-amber-600 font-bold">★ {doc.rating}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
