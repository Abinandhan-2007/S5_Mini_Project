import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity, Users, Clock, CheckCircle2, Calendar,
  LogOut, Stethoscope, Bell, User,
  ClipboardList, TrendingUp, AlertCircle, FileText
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { usePolling } from '../../lib/usePolling';
import { LiveIndicator } from '../../components/ui/LiveIndicator';
import { ConsultationForm } from './ConsultationForm';

// Initial fallback patient queue
const INITIAL_DOCTOR_QUEUE = [
  { id: 'tok-1', tokenNumber: '#CP-001', name: 'Sarah Jenkins', age: 31, issue: 'Chest discomfort', slot: '09:00 AM', status: 'In Consultation', type: 'In-Person', diagnosis: 'Mild Atypical Chest Pain - ECG Normal' },
  { id: 'tok-2', tokenNumber: '#CP-002', name: 'Robert Chen', age: 45, issue: 'Follow-up ECG', slot: '09:30 AM', status: 'Waiting', type: 'Walk-In' },
  { id: 'tok-3', tokenNumber: '#CP-003', name: 'Anita Sharma', age: 28, issue: 'Routine check-up', slot: '10:00 AM', status: 'Waiting', type: 'Online' },
  { id: 'tok-4', tokenNumber: '#CP-004', name: 'Michael Scott', age: 52, issue: 'Blood pressure review', slot: '10:30 AM', status: 'Pending', type: 'In-Person' },
  { id: 'tok-5', tokenNumber: '#CP-005', name: 'Priya Nair', age: 37, issue: 'Post-op follow-up', slot: '11:00 AM', status: 'Pending', type: 'Online' },
  { id: 'tok-6', tokenNumber: '#CP-006', name: 'James Wong', age: 61, issue: 'Cardiac stress test results', slot: '11:30 AM', status: 'Done', type: 'In-Person', diagnosis: 'Ischemic Heart Disease - Stable' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  'In Consultation': { label: 'In Consultation', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500 animate-pulse' },
  'Waiting':         { label: 'Waiting',          color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',   dot: 'bg-amber-400' },
  'Pending':         { label: 'Pending',           color: 'text-slate-600',   bg: 'bg-slate-100 border-slate-200',  dot: 'bg-slate-400' },
  'Done':            { label: 'Done',              color: 'text-sky-700',     bg: 'bg-sky-50 border-sky-200',       dot: 'bg-sky-400' },
  'Completed':       { label: 'Completed',         color: 'text-sky-700',     bg: 'bg-sky-50 border-sky-200',       dot: 'bg-sky-400' },
};

export const DoctorDashboard: React.FC = () => {
  const currentStaff = useStaffStore((s) => s.currentStaff);
  const logoutStaff  = useStaffStore((s) => s.logoutStaff);
  const rawTokens    = useStaffStore((s) => s.tokens);
  const fetchTokens  = useStaffStore((s) => s.fetchTokens);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);
  const navigate     = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [consultingPatient, setConsultingPatient] = useState<any | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Automatic robust background polling for Doctor queue
  const { isPolling, lastUpdated, refetch } = usePolling(
    async () => {
      await fetchTokens(currentStaff?.id, true);
    },
    {
      interval: 7500,
      enabled: !!currentStaff && currentStaff.role === 'doctor',
    }
  );

  // Map live tokens from store into queue format, filtered for this doctor if matched
  const liveQueue = useMemo(() => {
    if (!rawTokens || rawTokens.length === 0) return INITIAL_DOCTOR_QUEUE;

    // If doctor has specific tokens assigned
    const doctorTokens = currentStaff?.id
      ? rawTokens.filter((t) => !t.doctorId || t.doctorId === currentStaff.id || t.doctorId === 'doc-1')
      : rawTokens;

    if (doctorTokens.length === 0) return INITIAL_DOCTOR_QUEUE;

    return doctorTokens.map((t, idx) => ({
      id: t.id || `tok-${idx}`,
      tokenNumber: t.tokenNumber || `#TOK-${idx + 1}`,
      name: t.patientName || 'Walk-in Patient',
      age: t.age || 32,
      bloodGroup: t.bloodGroup || 'O+',
      issue: t.healthIssue || `${t.doctorSpecialty || 'General'} Consultation`,
      slot: t.timeSlot || '10:00 AM',
      status: t.status === 'Completed' ? 'Done' : t.status,
      type: t.type || 'In-Person',
      diagnosis: t.diagnosis || '',
      assessment: t.assessment || '',
      clinicalNotes: t.clinicalNotes || '',
      prescriptions: t.prescriptions || [],
      prescriptionDetails: t.prescriptionDetails || '',
    }));
  }, [rawTokens, currentStaff?.id]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const stats = [
    { label: 'Total Today', value: liveQueue.length, icon: <Users className="w-5 h-5" />, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200' },
    { label: 'In Progress',  value: liveQueue.filter(p => p.status === 'In Consultation').length, icon: <Activity className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Waiting',      value: liveQueue.filter(p => p.status === 'Waiting').length,         icon: <Clock className="w-5 h-5" />,    color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
    { label: 'Completed',    value: liveQueue.filter(p => p.status === 'Done' || p.status === 'Completed').length, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200' },
  ];

  const filters = ['All', 'In Consultation', 'Waiting', 'Pending', 'Done'];
  const filteredQueue = activeFilter === 'All'
    ? liveQueue
    : liveQueue.filter(p => p.status === activeFilter);

  const handleLogout = () => {
    logoutStaff();
    navigate('/staff/login');
  };

  const handleSaveConsultation = async (consultationData: {
    diagnosis: string;
    assessment: string;
    clinicalNotes: string;
    prescriptionDetails: string;
    prescriptions: string[];
    followUpDays?: number;
  }) => {
    if (!consultingPatient) return;
    await updateTokenStatus(consultingPatient.id, 'Completed', consultationData);
    setToastMsg(`✅ Assessment & Diagnosis saved for ${consultingPatient.name}: ${consultationData.diagnosis}`);
    setConsultingPatient(null);
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-[#0B5A54] selection:text-white">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-2.5 sm:gap-4">

          {/* Brand */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0B5A54] flex items-center justify-center shadow-md shrink-0">
              <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium leading-none">CarePulse</p>
              <p className="text-xs sm:text-sm font-black text-slate-900 tracking-tight leading-snug truncate">Doctor Portal</p>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Live Indicator */}
            <LiveIndicator
              lastUpdated={lastUpdated}
              isPolling={isPolling}
              onRefresh={refetch}
              label="Live Queue"
            />

            <button className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all cursor-pointer">
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full border-2 border-white" />
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-slate-100 rounded-full border border-slate-200">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#0B5A54] flex items-center justify-center shrink-0">
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-[11px] font-extrabold text-slate-800 leading-none">{currentStaff?.name}</p>
                <p className="text-[10px] text-teal-700 font-mono font-bold leading-tight">
                  Doctor ID: {currentStaff?.staff_code || currentStaff?.staffCode || 'D001101'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full max-w-full overflow-x-hidden min-w-0 px-3.5 sm:px-8 py-5 sm:py-7 space-y-5 sm:space-y-7">

        {/* ── Welcome Banner ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0B5A54] to-[#14B8A6] rounded-2xl p-4 sm:px-6 sm:py-5 text-white shadow-lg"
        >
          <div>
            <p className="text-teal-200/80 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">{today}</p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <h1 className="text-lg sm:text-xl font-black leading-tight">Good Morning, {currentStaff?.name?.split(' ').slice(0, 2).join(' ')} 👋</h1>
              <span className="font-mono text-[11px] bg-white/20 text-white font-bold px-2.5 py-0.5 rounded-full border border-white/30 shadow-xs">
                Doctor ID: {currentStaff?.staff_code || currentStaff?.staffCode || 'D001101'}
              </span>
            </div>
            <p className="text-teal-100/70 text-xs sm:text-sm mt-0.5">You have <span className="font-bold text-white">{liveQueue.filter(p => p.status !== 'Done' && p.status !== 'Completed').length} patients</span> remaining today.</p>
          </div>
          <div className="flex items-center gap-2 bg-white/15 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-white/20 self-start sm:self-center text-xs sm:text-sm font-bold">
            <Calendar className="w-4 h-4 text-teal-200 shrink-0" />
            <span>Today's Schedule</span>
          </div>
        </motion.div>

        {/* ── Stats Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`min-w-0 p-3.5 sm:p-4 rounded-2xl border ${s.bg} flex flex-col gap-1.5 sm:gap-2 overflow-hidden`}
            >
              <div className={`${s.color}`}>{s.icon}</div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono truncate">{s.value}</p>
                <p className="text-[11px] sm:text-xs text-slate-500 font-semibold truncate">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Today's Patient Queue ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-[#0B5A54] shrink-0" />
              <h2 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">Patient Queue — Today</h2>
              <span className="px-2 py-0.5 bg-teal-50 text-[#0B5A54] text-[11px] sm:text-xs font-bold rounded-full border border-teal-200 shrink-0">
                {filteredQueue.length}
              </span>
            </div>
            {/* Filters */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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
                  className="flex items-center gap-2.5 sm:gap-4 px-4 sm:px-6 py-3.5 hover:bg-slate-50/80 transition-colors group"
                >
                  {/* Token badge */}
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 group-hover:bg-[#0B5A54]/10 group-hover:border-[#0B5A54]/20 transition-colors font-mono">
                    <span className="text-[9.5px] sm:text-[10px] font-black text-slate-600 group-hover:text-[#0B5A54]">{patient.tokenNumber.replace('#CP-', '#')}</span>
                  </div>

                  {/* Patient info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">{patient.name}</p>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">{patient.issue} · Age {patient.age}</p>
                  </div>

                  {/* Slot time */}
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-semibold shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {patient.slot}
                  </div>

                  {/* Visit type */}
                  <span className="hidden md:inline text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                    {patient.type}
                  </span>

                  {/* Status badge */}
                  <span className={`flex items-center gap-1 sm:gap-1.5 text-[9.5px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border ${cfg.bg} ${cfg.color} shrink-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    <span>{cfg.label}</span>
                  </span>

                  {/* Doctor Action Button */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {patient.status === 'In Consultation' && (
                      <button
                        onClick={() => setConsultingPatient(patient)}
                        className="px-3 py-1.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95"
                      >
                        <FileText className="w-3.5 h-3.5 text-teal-200" />
                        <span>Enter Diagnosis & Rx</span>
                      </button>
                    )}

                    {patient.status === 'Waiting' && (
                      <button
                        onClick={() => {
                          updateTokenStatus(patient.id, 'In Consultation');
                          setConsultingPatient({ ...patient, status: 'In Consultation' });
                        }}
                        className="px-3 py-1.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Call & Examine</span>
                      </button>
                    )}

                    {(patient.status === 'Done' || patient.status === 'Completed') && (
                      <button
                        onClick={() => setConsultingPatient(patient)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center gap-1"
                        title="View or Edit Clinical Assessment"
                      >
                        <FileText className="w-3 h-3 text-slate-500" />
                        <span>{patient.diagnosis ? 'View Diagnosis' : 'Add Diagnosis'}</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Quick Stats Footer ───────────────────────────────────────── */}
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-teal-50 border border-teal-100 text-xs text-teal-700 font-semibold">
          <TrendingUp className="w-4 h-4 text-teal-500" />
          <span>
            You've seen <strong>{liveQueue.filter(p => p.status === 'Done' || p.status === 'Completed').length}</strong> patient(s) today.
            <span className="text-teal-400 font-normal ml-1">Keep up the great work!</span>
          </span>
        </div>
      </main>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Clinical Assessment & Diagnosis Entry Modal */}
      {consultingPatient && (
        <ConsultationForm
          patient={consultingPatient}
          doctorName={currentStaff?.name || 'Dr. Olivia Wilson'}
          doctorSpecialty={(currentStaff as any)?.specialty || 'Cardiologist'}
          onSave={handleSaveConsultation}
          onClose={() => setConsultingPatient(null)}
        />
      )}
    </div>
  );
};

export default DoctorDashboard;
