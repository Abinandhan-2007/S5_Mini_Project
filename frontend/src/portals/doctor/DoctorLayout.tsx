import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  FileText,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Volume2,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { usePolling } from '../../lib/usePolling';
import { LiveIndicator } from '../../components/ui/LiveIndicator';
import { DoctorDashboard } from './DoctorDashboard';
import { ActiveConsultation } from './ActiveConsultation';
import { DoctorQueue } from './DoctorQueue';
import { DoctorEMRSearch } from './DoctorEMRSearch';
import { DoctorProfile } from './DoctorProfile';
import type { DoctorTab } from '../../types/doctor';
import type { TokenQueueItem } from '../../types/receptionist';
import { playCallChime, speakDoctorAnnouncement } from '../../services/consultationService';

// Fallback seed queue for doctor
const INITIAL_DOCTOR_QUEUE: TokenQueueItem[] = [
  {
    id: 'tok-1',
    tokenNumber: '#TOK-001',
    ticketNumber: '#CP-4821',
    patientId: 'pat-sarah-jenkins',
    patientName: 'Sarah Jenkins',
    patientPhone: '+91 98765 43210',
    doctorId: 'doc-1',
    doctorName: 'Dr. Olivia Wilson',
    doctorSpecialty: 'Cardiologist',
    timeSlot: '09:00 AM - 10:00 AM',
    status: 'In Consultation',
    arrivalTime: '08:50 AM',
    issueTime: '08:55 AM',
    type: 'In-Person',
    age: 31,
    bloodGroup: 'A+',
    healthIssue: 'Atypical chest tightness and exertional palpitation for 3 days.',
  },
  {
    id: 'tok-2',
    tokenNumber: '#TOK-002',
    ticketNumber: '#CP-4822',
    patientId: 'pat-robert-chen',
    patientName: 'Robert Chen',
    patientPhone: '+91 98765 43211',
    doctorId: 'doc-1',
    doctorName: 'Dr. Olivia Wilson',
    doctorSpecialty: 'Cardiologist',
    timeSlot: '09:30 AM - 10:30 AM',
    status: 'Waiting',
    arrivalTime: '09:15 AM',
    issueTime: '09:20 AM',
    type: 'Walk-In',
    age: 45,
    bloodGroup: 'B+',
    healthIssue: 'Follow-up routine hypertension check and morning headaches.',
  },
  {
    id: 'tok-3',
    tokenNumber: '#TOK-003',
    ticketNumber: '#CP-4823',
    patientId: 'pat-anita-sharma',
    patientName: 'Anita Sharma',
    patientPhone: '+91 98765 43212',
    doctorId: 'doc-1',
    doctorName: 'Dr. Olivia Wilson',
    doctorSpecialty: 'Cardiologist',
    timeSlot: '10:00 AM - 11:00 AM',
    status: 'Waiting',
    arrivalTime: '09:40 AM',
    issueTime: '09:45 AM',
    type: 'In-Person',
    age: 28,
    bloodGroup: 'O+',
    healthIssue: 'Routine preventive cardiac screening & ECG check.',
  },
  {
    id: 'tok-4',
    tokenNumber: '#TOK-004',
    ticketNumber: '#CP-4824',
    patientId: 'pat-michael-scott',
    patientName: 'Michael Scott',
    patientPhone: '+91 98765 43213',
    doctorId: 'doc-1',
    doctorName: 'Dr. Olivia Wilson',
    doctorSpecialty: 'Cardiologist',
    timeSlot: '10:30 AM - 11:30 AM',
    status: 'Waiting',
    arrivalTime: '10:10 AM',
    issueTime: '10:15 AM',
    type: 'In-Person',
    age: 52,
    bloodGroup: 'AB+',
    healthIssue: 'Blood pressure review and lipid profile analysis.',
  },
  {
    id: 'tok-5',
    tokenNumber: '#TOK-005',
    ticketNumber: '#CP-4825',
    patientId: 'pat-priya-nair',
    patientName: 'Priya Nair',
    patientPhone: '+91 98765 43214',
    doctorId: 'doc-1',
    doctorName: 'Dr. Olivia Wilson',
    doctorSpecialty: 'Cardiologist',
    timeSlot: '11:00 AM - 12:00 PM',
    status: 'Waiting',
    arrivalTime: '10:45 AM',
    issueTime: '10:50 AM',
    type: 'In-Person',
    age: 37,
    bloodGroup: 'O-',
    healthIssue: 'Post-op follow-up and prescription refill.',
  },
  {
    id: 'tok-6',
    tokenNumber: '#TOK-006',
    ticketNumber: '#CP-4826',
    patientId: 'pat-james-wong',
    patientName: 'James Wong',
    patientPhone: '+91 98765 43215',
    doctorId: 'doc-1',
    doctorName: 'Dr. Olivia Wilson',
    doctorSpecialty: 'Cardiologist',
    timeSlot: '11:30 AM - 12:30 PM',
    status: 'Completed',
    arrivalTime: '08:30 AM',
    issueTime: '08:35 AM',
    type: 'In-Person',
    age: 61,
    bloodGroup: 'A+',
    healthIssue: 'Cardiac stress test results review - Stable normal.',
    diagnosis: 'Ischemic Heart Disease - Stable on Medical Therapy',
  },
];

export const DoctorLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DoctorTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activePatient, setActivePatient] = useState<TokenQueueItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);

  const currentStaff = useStaffStore((s) => s.currentStaff);
  const doctors = useStaffStore((s) => s.doctors);
  const rawTokens = useStaffStore((s) => s.tokens);
  const fetchTokens = useStaffStore((s) => s.fetchTokens);
  const updateTokenStatus = useStaffStore((s) => s.updateTokenStatus);
  const toggleDoctorAvailability = useStaffStore((s) => s.toggleDoctorAvailability);
  const logoutStaff = useStaffStore((s) => s.logoutStaff);
  const hospitalSettings = useStaffStore((s) => s.hospitalSettings);
  const navigate = useNavigate();

  // Background polling for real-time doctor queue
  const { isPolling, lastUpdated, refetch } = usePolling(
    async () => {
      await fetchTokens(currentStaff?.id, true);
    },
    {
      interval: 7500,
      enabled: !!currentStaff && currentStaff.role === 'doctor',
    }
  );

  // Close notif dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Auth Guard
  if (!currentStaff || currentStaff.role !== 'doctor') {
    return <Navigate to="/staff/login" replace />;
  }

  const currentDoctor = doctors.find((d) => d.id === currentStaff.id) || doctors[0] || {
    id: currentStaff.id,
    name: currentStaff.name,
    specialty: 'Cardiologist',
    roomNumber: 'Cabin 102 - 1st Floor',
    isAvailable: true,
  };

  // Map live tokens or fallback
  const doctorQueue: TokenQueueItem[] = useMemo(() => {
    if (!rawTokens || rawTokens.length === 0) return INITIAL_DOCTOR_QUEUE;

    const filtered = rawTokens.filter(
      (t) => !t.doctorId || t.doctorId === currentStaff.id || t.doctorId === 'doc-1'
    );

    if (filtered.length === 0) return INITIAL_DOCTOR_QUEUE;

    return filtered.map((t, idx) => ({
      id: t.id || `tok-${idx}`,
      tokenNumber: t.tokenNumber || `#TOK-00${idx + 1}`,
      ticketNumber: t.ticketNumber || `#CP-482${idx + 1}`,
      patientId: t.patientId || `pat-${idx + 1}`,
      patientName: t.patientName || (t as any).name || 'Walk-In Patient',
      patientPhone: t.patientPhone || (t as any).phone || '+91 98765 43210',
      doctorId: t.doctorId || currentStaff.id,
      doctorName: t.doctorName || currentStaff.name || 'Dr. Olivia Wilson',
      doctorSpecialty: t.doctorSpecialty || currentDoctor.specialty || 'General Medicine',
      timeSlot: t.timeSlot || (t as any).slot || '10:00 AM - 11:00 AM',
      status: (t.status === 'Completed' || (t.status as any) === 'Done') ? 'Completed' : t.status,
      arrivalTime: t.arrivalTime || '09:00 AM',
      issueTime: t.issueTime || '09:05 AM',
      type: t.type || 'In-Person',
      age: t.age || 34,
      bloodGroup: t.bloodGroup || 'O+',
      healthIssue: t.healthIssue || (t as any).issue || 'General Outpatient Consultation',
      diagnosis: t.diagnosis || '',
      assessment: t.assessment || '',
      clinicalNotes: t.clinicalNotes || '',
      prescriptions: t.prescriptions || [],
      prescriptionDetails: t.prescriptionDetails || '',
    }));
  }, [rawTokens, currentStaff.id, currentDoctor.specialty]);

  const waitingCount = doctorQueue.filter((t) => t.status === 'Waiting' || t.status === 'Checked In').length;

  // Sidebar navigation items
  const navItems = [
    {
      id: 'dashboard' as DoctorTab,
      label: 'Doctor Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'consultation' as DoctorTab,
      label: 'Active Consultation',
      icon: Stethoscope,
      badge: activePatient ? 'In Cabin' : undefined,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'queue' as DoctorTab,
      label: 'Patient Queue',
      icon: Users,
      badge: waitingCount > 0 ? `${waitingCount}` : undefined,
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      id: 'emr' as DoctorTab,
      label: 'EMR / Patient History',
      icon: FileText,
    },
    {
      id: 'profile' as DoctorTab,
      label: 'Doctor Profile & Cabin',
      icon: Settings,
    },
  ];

  const handleSelectPatient = (patient: TokenQueueItem) => {
    setActivePatient(patient);
    setActiveTab('consultation');
    setIsMobileSidebarOpen(false);
  };

  const handleFinishConsultation = async (consultationData: any) => {
    if (!activePatient) return;
    await updateTokenStatus(activePatient.id, 'Completed', consultationData);
    showToast(`Saved consultation & prescription for ${activePatient.patientName}`);
    setActivePatient(null);
    setActiveTab('dashboard');
  };

  const handleQuickCallNext = () => {
    const nextWaiting = doctorQueue.find((t) => t.status === 'Waiting' || t.status === 'Checked In');
    if (!nextWaiting) {
      showToast('No patients waiting in queue.');
      return;
    }
    playCallChime();
    const room = currentDoctor.roomNumber || 'Cabin 102';
    speakDoctorAnnouncement(
      `Token ${nextWaiting.tokenNumber}, ${nextWaiting.patientName}, please proceed to ${room}`
    );
    setActivePatient(nextWaiting);
    setActiveTab('consultation');
    showToast(`Calling Token ${nextWaiting.tokenNumber} (${nextWaiting.patientName})`);
  };

  const handleLogout = () => {
    logoutStaff();
    navigate('/staff/login');
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex font-sans text-slate-800 antialiased selection:bg-[#0B5A54] selection:text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0B5A54] text-white px-5 py-3 rounded-2xl shadow-2xl border border-teal-400/30 flex items-center gap-2 font-bold text-xs animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Sidebar Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PERSISTENT CLINICAL SIDEBAR NAVIGATION
      ══════════════════════════════════════════════════════════════════ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-white border-r border-slate-200/80 shadow-xs flex flex-col justify-between transform transition-transform duration-300 lg:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Brand Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0B5A54] to-[#14B8A6] flex items-center justify-center shadow-md shadow-teal-900/20 text-white shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black text-slate-900 tracking-tight">CarePulse</span>
                  <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-full bg-teal-50 text-[#0B5A54] border border-teal-200">
                    MD
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-semibold">Doctor Portal</p>
              </div>
            </div>

            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cabin Room & On-Duty Status Badge */}
          <div className="p-4 mx-4 my-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cabin Status</span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                currentDoctor.isAvailable ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {currentDoctor.isAvailable ? '● Active' : '○ Offline'}
              </span>
            </div>
            <p className="text-xs font-black text-slate-800 truncate">{currentDoctor.roomNumber || 'Cabin 102 - 1st Floor'}</p>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-2 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0B5A54] text-white shadow-md shadow-teal-900/15'
                      : 'text-slate-600 hover:text-[#0B5A54] hover:bg-teal-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#0B5A54]'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        isActive ? 'bg-white/20 text-white border-white/20' : item.badgeColor
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom Doctor Profile & Logout Footer */}
          <div className="p-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-3 p-2 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-9 h-9 rounded-xl bg-[#0B5A54] text-white font-black flex items-center justify-center text-xs shrink-0">
                {currentStaff?.name?.charAt(0) || 'D'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-900 truncate">{currentStaff?.name || 'Doctor'}</p>
                <p className="text-[10px] text-teal-700 font-mono font-bold truncate">
                  ID: {currentStaff?.staff_code || currentStaff?.staffCode || 'D001101'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-3 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 transition-all text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out Cabin</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN EXECUTIVE CONTENT WRAPPER & TOP BAR
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 lg:pl-64 sm:lg:pl-72 flex flex-col min-h-screen">
        
        {/* Top Clinical Header Bar */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
            
            {/* Left: Mobile Toggle & Breadcrumb */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-teal-700" />
                    <span>{hospitalSettings?.name || 'CarePulse Central Hospital'}</span>
                  </span>
                  <span>•</span>
                  <span>{currentDateFormatted}</span>
                </div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  {activeTab === 'dashboard' && 'Physician OPD Dashboard'}
                  {activeTab === 'consultation' && 'Active Patient Consultation Room'}
                  {activeTab === 'queue' && "Today's Patient Queue Roster"}
                  {activeTab === 'emr' && 'Longitudinal EMR Archives'}
                  {activeTab === 'profile' && 'Doctor Profile & Cabin Config'}
                </h2>
              </div>
            </div>

            {/* Right Header Actions */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              
              {/* Live Polling Queue Indicator */}
              <LiveIndicator
                lastUpdated={lastUpdated}
                isPolling={isPolling}
                onRefresh={refetch}
                label="OPD Live"
              />

              {/* On-Duty Availability Toggle */}
              <button
                onClick={async () => {
                  await toggleDoctorAvailability(currentDoctor.id);
                  showToast(`Duty status: ${!currentDoctor.isAvailable ? 'Active' : 'Offline'}`);
                }}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  currentDoctor.isAvailable
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${currentDoctor.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span>{currentDoctor.isAvailable ? 'On-Duty' : 'Away'}</span>
              </button>

              {/* Quick Call Next Action Button */}
              <button
                onClick={handleQuickCallNext}
                className="px-3.5 py-1.5 rounded-full bg-[#0B5A54] hover:bg-[#084843] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Call next waiting patient"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Call Next</span>
              </button>

              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors relative cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full border-2 border-white" />
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-extrabold text-slate-900">
                      <span>Cabin Notifications</span>
                      <span className="text-[10px] text-teal-700">Live Feed</span>
                    </div>
                    <p className="text-slate-600 leading-snug">
                      <strong>OPD Update:</strong> Patient queue running on schedule. Average consultation pace: 12 mins.
                    </p>
                  </div>
                )}
              </div>

            </div>

          </div>
        </header>

        {/* Main Routed Tab Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
          {activeTab === 'dashboard' && (
            <DoctorDashboard
              queue={doctorQueue}
              activePatient={activePatient}
              onSelectPatient={handleSelectPatient}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'consultation' && (
            <ActiveConsultation
              patient={activePatient}
              onFinishVisit={handleFinishConsultation}
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'queue' && (
            <DoctorQueue
              queue={doctorQueue}
              onSelectPatient={handleSelectPatient}
              onCallPatient={(p) => {
                setActivePatient(p);
                showToast(`Calling ${p.tokenNumber} to Cabin.`);
              }}
            />
          )}

          {activeTab === 'emr' && <DoctorEMRSearch />}

          {activeTab === 'profile' && <DoctorProfile />}
        </main>

      </div>

    </div>
  );
};

export default DoctorLayout;
