import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity, Users, Clock, CheckCircle2, Calendar,
  ChevronRight, LogOut, Stethoscope, Bell, User,
  ClipboardList, TrendingUp, AlertCircle
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

// ─── Mock patient queue data for doctor dashboard ─────────────────────────────
const TODAY_QUEUE = [
  { id: 'tok-1', tokenNumber: '#CP-001', name: 'Sarah Jenkins', age: 31, issue: 'Chest discomfort', slot: '09:00 AM', status: 'In Consultation', type: 'In-Person' },
  { id: 'tok-2', tokenNumber: '#CP-002', name: 'Robert Chen', age: 45, issue: 'Follow-up ECG', slot: '09:30 AM', status: 'Waiting', type: 'Walk-In' },
  { id: 'tok-3', tokenNumber: '#CP-003', name: 'Anita Sharma', age: 28, issue: 'Routine check-up', slot: '10:00 AM', status: 'Waiting', type: 'Online' },
  { id: 'tok-4', tokenNumber: '#CP-004', name: 'Michael Scott', age: 52, issue: 'Blood pressure review', slot: '10:30 AM', status: 'Pending', type: 'In-Person' },
  { id: 'tok-5', tokenNumber: '#CP-005', name: 'Priya Nair', age: 37, issue: 'Post-op follow-up', slot: '11:00 AM', status: 'Pending', type: 'Online' },
  { id: 'tok-6', tokenNumber: '#CP-006', name: 'James Wong', age: 61, issue: 'Cardiac stress test results', slot: '11:30 AM', status: 'Done', type: 'In-Person' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  'In Consultation': { label: 'In Consultation', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500 animate-pulse' },
  'Waiting':         { label: 'Waiting',          color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',   dot: 'bg-amber-400' },
  'Pending':         { label: 'Pending',           color: 'text-slate-600',   bg: 'bg-slate-100 border-slate-200',  dot: 'bg-slate-400' },
  'Done':            { label: 'Done',              color: 'text-sky-700',     bg: 'bg-sky-50 border-sky-200',       dot: 'bg-sky-400' },
};

export const DoctorDashboard: React.FC = () => {
  const currentStaff = useStaffStore((s) => s.currentStaff);
  const logoutStaff  = useStaffStore((s) => s.logoutStaff);
  const navigate     = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const stats = [
    { label: 'Total Today', value: TODAY_QUEUE.length, icon: <Users className="w-5 h-5" />, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200' },
    { label: 'In Progress',  value: TODAY_QUEUE.filter(p => p.status === 'In Consultation').length, icon: <Activity className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Waiting',      value: TODAY_QUEUE.filter(p => p.status === 'Waiting').length,         icon: <Clock className="w-5 h-5" />,    color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
    { label: 'Completed',    value: TODAY_QUEUE.filter(p => p.status === 'Done').length,            icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200' },
  ];

  const filters = ['All', 'In Consultation', 'Waiting', 'Pending', 'Done'];
  const filteredQueue = activeFilter === 'All'
    ? TODAY_QUEUE
    : TODAY_QUEUE.filter(p => p.status === activeFilter);

  const handleLogout = () => {
    logoutStaff();
    navigate('/staff/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-[#0B5A54] selection:text-white">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B5A54] flex items-center justify-center shadow-md">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium leading-none">CarePulse</p>
              <p className="text-sm font-black text-slate-900 tracking-tight leading-snug">Doctor Portal</p>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2.5">
            <button className="relative w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full border-2 border-white" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
              <div className="w-7 h-7 rounded-full bg-[#0B5A54] flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-[11px] font-extrabold text-slate-800 leading-none">{currentStaff?.name}</p>
                <p className="text-[10px] text-slate-400 font-medium leading-tight">Doctor</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-5 sm:px-8 py-7 space-y-7">

        {/* ── Welcome Banner ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0B5A54] to-[#14B8A6] rounded-2xl px-6 py-5 text-white shadow-lg"
        >
          <div>
            <p className="text-teal-200/80 text-xs font-semibold uppercase tracking-wider">{today}</p>
            <h1 className="text-xl font-black mt-0.5">Good Morning, {currentStaff?.name?.split(' ').slice(0, 2).join(' ')} 👋</h1>
            <p className="text-teal-100/70 text-sm mt-0.5">You have <span className="font-bold text-white">{TODAY_QUEUE.filter(p => p.status !== 'Done').length} patients</span> remaining today.</p>
          </div>
          <div className="flex items-center gap-2 bg-white/15 px-4 py-2.5 rounded-xl border border-white/20 self-start sm:self-center">
            <Calendar className="w-4 h-4 text-teal-200" />
            <span className="text-sm font-bold">Today's Schedule</span>
          </div>
        </motion.div>

        {/* ── Stats Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`p-4 rounded-2xl border ${s.bg} flex flex-col gap-2`}
            >
              <div className={`${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-2xl font-black text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500 font-semibold">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Today's Patient Queue ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#0B5A54]" />
              <h2 className="font-extrabold text-slate-900 text-base">Patient Queue — Today</h2>
              <span className="px-2 py-0.5 bg-teal-50 text-[#0B5A54] text-xs font-bold rounded-full border border-teal-200">
                {filteredQueue.length} patients
              </span>
            </div>
            {/* Filters */}
            <div className="flex gap-1.5 flex-wrap">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    activeFilter === f
                      ? 'bg-[#0B5A54] text-white shadow-sm'
                      : 'text-slate-500 hover:text-[#0B5A54] hover:bg-teal-50 bg-slate-100'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Queue List */}
          <div className="divide-y divide-slate-100">
            {filteredQueue.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm font-semibold">No patients in this category</p>
              </div>
            )}
            {filteredQueue.map((patient, i) => {
              const cfg = STATUS_CONFIG[patient.status] ?? STATUS_CONFIG['Pending'];
              return (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/80 transition-colors group"
                >
                  {/* Token badge */}
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 group-hover:bg-[#0B5A54]/10 group-hover:border-[#0B5A54]/20 transition-colors">
                    <span className="text-[10px] font-black text-slate-600 group-hover:text-[#0B5A54]">{patient.tokenNumber.replace('#CP-', '#')}</span>
                  </div>

                  {/* Patient info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{patient.name}</p>
                    <p className="text-[11px] text-slate-400 font-medium truncate">{patient.issue} · Age {patient.age}</p>
                  </div>

                  {/* Slot time */}
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-semibold shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {patient.slot}
                  </div>

                  {/* Visit type */}
                  <span className="hidden sm:inline text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                    {patient.type}
                  </span>

                  {/* Status badge */}
                  <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} shrink-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>

                  {/* Chevron */}
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#0B5A54] shrink-0 transition-colors" />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Quick Stats Footer ───────────────────────────────────────── */}
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-teal-50 border border-teal-100 text-xs text-teal-700 font-semibold">
          <TrendingUp className="w-4 h-4 text-teal-500" />
          <span>
            You've seen <strong>{TODAY_QUEUE.filter(p => p.status === 'Done').length}</strong> patient(s) today.
            <span className="text-teal-400 font-normal ml-1">Keep up the great work!</span>
          </span>
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;
