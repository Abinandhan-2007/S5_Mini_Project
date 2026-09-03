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
  ChevronDown,
  AlertTriangle,
  Clock,
  Coffee,
  Check,
  Radio,
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

const REASON_PRESETS = [
  { label: '☕ Lunch / Meal Break', duration: '30 mins' },
  { label: '🏥 Emergency Ward Rounds / ICU Call', duration: '45 mins' },
  { label: '👥 Department Clinical Meeting', duration: '1 hour' },
  { label: '🔬 Procedure / In-Patient Review', duration: '45 mins' },
  { label: '🩺 Cabin Sanitization & Prep', duration: '15 mins' },
  { label: '🚗 Stepped Out Temporarily', duration: '20 mins' },
];

const DURATION_PRESETS = ['15 mins', '30 mins', '45 mins', '1 hour', '2 hours', 'End of Shift'];

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

interface NavSection {
  groupTitle: string;
  items: {
    id: DoctorTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }[];
}

export const DoctorLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DoctorTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activePatient, setActivePatient] = useState<TokenQueueItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

  // Availability Reason Modal State
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [absenceReason, setAbsenceReason] = useState('');
  const [returnDuration, setReturnDuration] = useState('30 mins');

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const currentDoctor = doctors.find((d) => d.id === currentStaff?.id) || doctors[0] || {
    id: currentStaff?.id || 'doc-1',
    name: currentStaff?.name || 'Dr. Olivia Wilson',
    specialty: 'Cardiologist',
    roomNumber: 'Cabin 102 - 1st Floor',
    isAvailable: true,
    availabilityReason: '',
    unavailableUntil: '',
  };

  const handleOpenUnavailableModal = () => {
    setAbsenceReason(currentDoctor.availabilityReason || '');
    setReturnDuration(currentDoctor.unavailableUntil || '30 mins');
    setIsAvailabilityModalOpen(true);
  };

  const handleSetAvailable = async () => {
    await toggleDoctorAvailability(currentDoctor.id, true, '', '');
    setIsAvailabilityModalOpen(false);
    showToast(`Cabin status set to Active & Available`);
  };

  const handleSetUnavailable = async () => {
    const finalReason = absenceReason.trim() || 'Temporarily Stepped Out';
    await toggleDoctorAvailability(currentDoctor.id, false, finalReason, returnDuration);
    setIsAvailabilityModalOpen(false);
    showToast(`Cabin status set to Not Available (${finalReason})`);
  };

  // Map live tokens or fallback
  const doctorQueue: TokenQueueItem[] = useMemo(() => {
    if (!rawTokens || rawTokens.length === 0) return INITIAL_DOCTOR_QUEUE;

    const staffId = currentStaff?.id;
    const filtered = rawTokens.filter(
      (t) => !t.doctorId || t.doctorId === staffId || t.doctorId === 'doc-1'
    );

    if (filtered.length === 0) return INITIAL_DOCTOR_QUEUE;

    return filtered.map((t, idx) => ({
      id: t.id || `tok-${idx}`,
      tokenNumber: t.tokenNumber || `#TOK-00${idx + 1}`,
      ticketNumber: t.ticketNumber || `#CP-482${idx + 1}`,
      patientId: t.patientId || `pat-${idx + 1}`,
      patientName: t.patientName || (t as any).name || 'Walk-In Patient',
      patientPhone: t.patientPhone || (t as any).phone || '+91 98765 43210',
      doctorId: t.doctorId || currentStaff?.id || 'doc-1',
      doctorName: t.doctorName || currentStaff?.name || 'Dr. Olivia Wilson',
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
  }, [rawTokens, currentStaff?.id, currentStaff?.name, currentDoctor.specialty]);

  // Auth Guard
  if (!currentStaff || currentStaff.role !== 'doctor') {
    return <Navigate to="/staff/login" replace />;
  }

  const waitingCount = doctorQueue.filter((t) => t.status === 'Waiting' || t.status === 'Checked In').length;

  // Grouped Sidebar Navigation Sections
  const navSections: NavSection[] = [
    {
      groupTitle: 'Clinical Workspace',
      items: [
        {
          id: 'dashboard',
          label: 'Physician Command',
          icon: LayoutDashboard,
        },
        {
          id: 'consultation',
          label: 'Active Consultation',
          icon: Stethoscope,
          badge: activePatient ? 'In Cabin' : undefined,
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        },
        {
          id: 'queue',
          label: 'Patient Live Queue',
          icon: Users,
          badge: waitingCount > 0 ? `${waitingCount}` : undefined,
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        },
      ],
    },
    {
      groupTitle: 'Medical Archives',
      items: [
        {
          id: 'emr',
          label: 'Longitudinal EMR',
          icon: FileText,
        },
      ],
    },
    {
      groupTitle: 'Cabin Configuration',
      items: [
        {
          id: 'profile',
          label: 'Doctor Profile & Shift',
          icon: Settings,
        },
      ],
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

  const getHeaderContext = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Physician Clinical Command',
          breadcrumb: 'Doctor Portal / Live Overview',
        };
      case 'consultation':
        return {
          title: 'Active Patient Consultation Room',
          breadcrumb: 'Doctor Portal / Clinical Examination & SOAP',
        };
      case 'queue':
        return {
          title: "Today's Patient Queue Roster",
          breadcrumb: 'Doctor Portal / Token Calling & Queue Stream',
        };
      case 'emr':
        return {
          title: 'Longitudinal EMR Archives & Search',
          breadcrumb: 'Doctor Portal / Patient Medical Records',
        };
      case 'profile':
        return {
          title: 'Doctor Profile & Cabin Settings',
          breadcrumb: 'Doctor Portal / Profile & Shift Configurations',
        };
      default:
        return {
          title: 'Doctor Clinical Workspace',
          breadcrumb: 'Doctor Portal / CarePulse',
        };
    }
  };

  const headerContext = getHeaderContext();

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex font-sans text-slate-800 antialiased selection:bg-[#0B5A54] selection:text-white">
      
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0B5A54] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-teal-400/30 flex items-center gap-2.5 font-bold text-xs animate-in slide-in-from-top-4 duration-300">
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
          PERSISTENT EXECUTIVE CLINICAL SIDEBAR NAVIGATION
      ══════════════════════════════════════════════════════════════════ */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* ── CarePulse Brand Header ── */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center shadow-md shadow-teal-900/20 text-white shrink-0">
                <img src="/logo.png" alt="CarePulse Logo" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black text-slate-900 font-heading tracking-tight">CarePulse</span>
                  <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-full bg-teal-50 text-[#0B5A54] border border-teal-200/80">
                    MD
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold truncate">Doctor Workspace</p>
              </div>
            </div>

            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Cabin Room & Availability Status Card ── */}
          <div className="p-3 mx-3 my-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cabin Status</span>
              <button
                type="button"
                onClick={() => {
                  if (currentDoctor.isAvailable) {
                    handleOpenUnavailableModal();
                  } else {
                    handleSetAvailable();
                  }
                }}
                className={`text-[9px] font-black px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                  currentDoctor.isAvailable
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentDoctor.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span>{currentDoctor.isAvailable ? '● Available' : '○ Not Available'}</span>
              </button>
            </div>
            <p className="text-xs font-black text-slate-800 truncate font-heading">{currentDoctor.roomNumber || 'Cabin 102 - 1st Floor'}</p>
            {!currentDoctor.isAvailable && (
              <p className="text-[10px] text-rose-700 font-medium truncate italic">
                Reason: {currentDoctor.availabilityReason || 'Away'} ({currentDoctor.unavailableUntil || 'Short Break'})
              </p>
            )}
          </div>

          {/* ── Grouped Navigation ── */}
          <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto no-scrollbar">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400/90 font-mono">
                  {section.groupTitle}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#0B5A54] text-white shadow-sm shadow-teal-900/20'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-200' : 'text-slate-400'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.2 rounded-full border shadow-2xs shrink-0 ${
                              isActive
                                ? 'bg-white/20 text-white border-white/20'
                                : item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* ── Sidebar Footer: Red Logout Button ── */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/40 shrink-0">
          <button
            onClick={() => setShowLogoutWarning(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-red-600/20 hover:shadow-md hover:shadow-red-600/30 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-white" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA & TOP BAR
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen min-w-0 max-w-full overflow-x-hidden">
        
        {/* ── Executive Top Bar ── */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <p className="text-[11px] font-bold text-slate-400 hidden sm:block">
                {headerContext.breadcrumb}
              </p>
              <h2 className="text-base sm:text-lg font-black text-slate-900 font-heading tracking-tight leading-tight">
                {headerContext.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* ── DOCTOR AVAILABILITY SEGMENTED QUICK SWITCHER ── */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/90 shadow-2xs">
              <button
                type="button"
                onClick={handleSetAvailable}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentDoctor.isAvailable
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Mark doctor Available & Active in cabin"
              >
                <span className={`w-2 h-2 rounded-full ${currentDoctor.isAvailable ? 'bg-white animate-pulse' : 'bg-emerald-500'}`} />
                <span>Available</span>
              </button>

              <button
                type="button"
                onClick={handleOpenUnavailableModal}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  !currentDoctor.isAvailable
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Mark doctor Not Available & Enter absence reason"
              >
                <span className={`w-2 h-2 rounded-full ${!currentDoctor.isAvailable ? 'bg-white' : 'bg-rose-500'}`} />
                <span>Not Available</span>
              </button>
            </div>

            {/* Live Polling Sync Indicator */}
            <LiveIndicator
              lastUpdated={lastUpdated}
              isPolling={isPolling}
              onRefresh={refetch}
              label="OPD Live"
            />

            {/* Quick Call Next Action Button */}
            <button
              onClick={handleQuickCallNext}
              className="px-3.5 py-2 rounded-xl bg-[#0B5A54] hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-900/15 hover:shadow-lg transition-all cursor-pointer"
              title="Call next waiting patient"
            >
              <Volume2 className="w-3.5 h-3.5 text-teal-200" />
              <span className="hidden sm:inline">Call Next</span>
            </button>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 transition-all relative cursor-pointer"
                title="Cabin Alerts"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl border border-slate-200 shadow-2xl p-4 z-50 animate-in fade-in duration-200 text-xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 font-black text-slate-900 font-heading">
                    <span>Cabin Notifications</span>
                    <span className="text-[9px] bg-teal-50 text-[#0B5A54] font-bold px-2 py-0.5 rounded-full border border-teal-200">
                      Live Feed
                    </span>
                  </div>
                  <div className="py-2.5 space-y-2 text-slate-600">
                    <p className="leading-relaxed">
                      <strong className="text-slate-800">OPD Queue:</strong> {waitingCount} patient{waitingCount !== 1 ? 's' : ''} currently waiting for your cabin.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Hospital: {hospitalSettings?.name || 'CarePulse Central Hospital'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Doctor Profile Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-[#0B5A54] text-white flex items-center justify-center font-black text-xs font-heading shadow-xs">
                  {(currentStaff?.name || 'D').charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-3xl border border-slate-200 shadow-2xl p-2 z-50 animate-in fade-in duration-200 text-xs font-bold text-slate-700 space-y-1">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-black text-slate-900 font-heading">{currentStaff?.name || 'Dr. Olivia Wilson'}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      {currentDoctor.specialty || 'Cardiologist'}
                    </p>
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100">
                      <span className="text-[9px] text-[#0B5A54] font-extrabold font-mono">
                        {currentDoctor.roomNumber || 'Cabin 102'}
                      </span>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                          currentDoctor.isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {currentDoctor.isAvailable ? '● Available' : '○ Not Available'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (currentDoctor.isAvailable) {
                        handleOpenUnavailableModal();
                      } else {
                        handleSetAvailable();
                      }
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5 text-slate-400" />
                    <span>Toggle Availability Status</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cabin Settings & Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setShowLogoutWarning(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out Cabin</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── NOT AVAILABLE REASON NOTICE BAR ── */}
        {!currentDoctor.isAvailable && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
              <div className="truncate">
                <strong className="font-black text-amber-950">You are currently marked NOT AVAILABLE.</strong>
                <span className="text-amber-800 ml-1.5">
                  Reason: <em>"{currentDoctor.availabilityReason || 'Stepped Out'}"</em>
                  {currentDoctor.unavailableUntil && <span className="font-semibold ml-1">· Expected back in {currentDoctor.unavailableUntil}</span>}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenUnavailableModal}
                className="px-2.5 py-1 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs transition-colors cursor-pointer"
              >
                Edit Reason
              </button>
              <button
                type="button"
                onClick={handleSetAvailable}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Go Available</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Main Tab Content Area ── */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 w-full min-w-0 max-w-full overflow-x-hidden no-scrollbar">
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

      {/* ── DOCTOR AVAILABILITY & REASON ENTRY MODAL ── */}
      {isAvailabilityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 font-heading">
                    Set Cabin Availability Status
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Notify Reception, OPD Triage & waiting patients of your cabin status and return time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAvailabilityModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Reason Presets */}
            <div className="space-y-2">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Select Quick Reason Preset
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REASON_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setAbsenceReason(preset.label);
                      setReturnDuration(preset.duration);
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                      absenceReason === preset.label
                        ? 'bg-rose-50 border-rose-400 text-rose-900 ring-2 ring-rose-400/20'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{preset.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-medium">{preset.duration}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Or Enter Specific Reason
              </label>
              <input
                type="text"
                value={absenceReason}
                onChange={(e) => setAbsenceReason(e.target.value)}
                placeholder="e.g. In Emergency Ward rounds, back shortly..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] focus:border-[#0B5A54] font-medium"
              />
            </div>

            {/* Duration Selector */}
            <div className="space-y-2">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Expected Absence Duration / Back in</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DURATION_PRESETS.map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setReturnDuration(dur)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      returnDuration === dur
                        ? 'bg-[#0B5A54] text-white border-[#0B5A54] shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {dur}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSetAvailable}
                className="px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Set Available Instead</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAvailabilityModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSetUnavailable}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Save & Mark Not Available</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Logout Warning Confirmation Modal ── */}
      {showLogoutWarning && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowLogoutWarning(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X Button */}
            <button
              onClick={() => setShowLogoutWarning(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Warning Icon Badge */}
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto shadow-sm shadow-red-500/10">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>

            {/* Heading & Details */}
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading">
                Confirm Cabin Sign Out?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to sign out from the Doctor Clinical Workspace? Active consultation state and live token calls for your cabin will be paused.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutWarning(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutWarning(false);
                  handleLogout();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Yes, Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorLayout;
