<<<<<<< Updated upstream
import React, { useState } from 'react';
=======
import React, { useState, useRef, useEffect } from 'react';
>>>>>>> Stashed changes
import { Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  CalendarCheck,
  Stethoscope,
  UserCheck,
  Settings,
  LogOut,
  Bell,
  Search,
  Activity,
  Menu,
  X,
  CheckCircle2,
  ChevronDown,
  Plus,
  Volume2,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { ReceptionistDashboard } from './ReceptionistDashboard';
import { TokenManagement } from './TokenManagement';
import { PatientBookings } from './PatientBookings';
import { DoctorManagement } from './DoctorManagement';
import { PatientCheckIn } from './PatientCheckIn';
import { ReceptionistProfile } from './ReceptionistProfile';
import { NewAppointmentModal } from './NewAppointmentModal';
<<<<<<< Updated upstream
import { useStaffStore } from '../../store/staffStore';
import { usePolling } from '../../lib/usePolling';
import { LiveIndicator } from '../../components/ui/LiveIndicator';
=======
>>>>>>> Stashed changes

export type ReceptionistTab =
  | 'dashboard'
  | 'queue'
  | 'bookings'
  | 'checkin'
  | 'doctors'
  | 'profile';

interface NavSection {
  groupTitle: string;
  items: {
    id: ReceptionistTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }[];
}

export const ReceptionistLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReceptionistTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const currentStaff = useStaffStore((s) => s.currentStaff);
  const profile = useStaffStore((s) => s.receptionistProfile);
  const hospitalSettings = useStaffStore((s) => s.hospitalSettings);
  const doctors = useStaffStore((s) => s.doctors);
  const tokens = useStaffStore((s) => s.tokens);
  const fetchDoctors = useStaffStore((s) => s.fetchDoctors);
  const fetchTokens = useStaffStore((s) => s.fetchTokens);
  const callNextToken = useStaffStore((s) => s.callNextToken);
  const logoutStaff = useStaffStore((s) => s.logoutStaff);
  const navigate = useNavigate();

<<<<<<< Updated upstream
  // Automatic robust background polling for receptionist token queue & doctors
  const { isPolling, lastUpdated, refetch } = usePolling(
    async () => {
      await Promise.all([
        fetchTokens(undefined, true),
        fetchDoctors(true),
      ]);
    },
    {
      interval: 7000,
      enabled: !!currentStaff && currentStaff.role === 'receptionist',
    }
  );
=======
  // Polling for live tokens and doctors
  useEffect(() => {
    fetchDoctors();
    fetchTokens();

    const interval = setInterval(() => {
      fetchTokens();
    }, 3500);

    return () => clearInterval(interval);
  }, [fetchDoctors, fetchTokens]);
>>>>>>> Stashed changes

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleLogout = () => {
    logoutStaff();
    navigate('/staff/login');
  };

  const handleNavigateTab = (tab: string) => {
    setActiveTab(tab as ReceptionistTab);
    setIsMobileSidebarOpen(false);
  };

  const handleQuickCallNext = async () => {
    const waitingTokens = tokens.filter((t) => t.status === 'Waiting');
    if (waitingTokens.length === 0) {
      showToast('No patients currently waiting in queue.');
      return;
    }
    await callNextToken();
    showToast(`Calling next token: ${waitingTokens[0].tokenNumber} (${waitingTokens[0].patientName})`);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auth Guard
  if (!currentStaff || currentStaff.role !== 'receptionist') {
    return <Navigate to="/staff/login" replace />;
  }

  const staffDisplayName = currentStaff?.name || profile.name || 'Reception Desk';

  const waitingCount = tokens.filter((t) => t.status === 'Waiting').length;
  const activeDoctorsCount = doctors.filter((d) => d.isAvailable).length;

  // Categorized Navigation Sections
  const navSections: NavSection[] = [
    {
      groupTitle: 'FRONT DESK & QUEUE',
      items: [
        { id: 'dashboard', label: 'OPD Command Center', icon: LayoutDashboard },
        {
          id: 'queue',
          label: 'Live Token Queue',
          icon: Ticket,
          badge: waitingCount > 0 ? `${waitingCount}` : undefined,
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        },
        {
          id: 'bookings',
          label: 'Patient Bookings',
          icon: CalendarCheck,
          badge: tokens.length > 0 ? `${tokens.length}` : undefined,
          badgeColor: 'bg-teal-50 text-[#0B5A54] border-teal-200',
        },
        {
          id: 'checkin',
          label: 'Express Check-In & Vitals',
          icon: UserCheck,
        },
      ],
    },
    {
      groupTitle: 'CLINICAL OPERATIONS',
      items: [
        {
          id: 'doctors',
          label: 'Doctors & Slot Capacity',
          icon: Stethoscope,
          badge: activeDoctorsCount > 0 ? `${activeDoctorsCount} On-Duty` : undefined,
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        },
      ],
    },
    {
      groupTitle: 'DESK SETTINGS',
      items: [
        { id: 'profile', label: 'Desk Settings & Profile', icon: Settings },
      ],
    },
  ];

  // Header Title & Breadcrumb Context
  const getHeaderContext = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'OPD Command Dashboard',
          breadcrumb: 'Front Desk / Live Overview',
        };
      case 'queue':
        return {
          title: 'Live Token Queue Desk',
          breadcrumb: 'Front Desk / Token Calling & Queue Stream',
        };
      case 'bookings':
        return {
          title: 'Patient Bookings & Roster',
          breadcrumb: 'Front Desk / Online & Walk-In Registry',
        };
      case 'checkin':
        return {
          title: 'Express Check-In & Vitals',
          breadcrumb: 'Front Desk / Patient Arrival & Triage',
        };
      case 'doctors':
        return {
          title: 'Doctor Directory & Slot Capacities',
          breadcrumb: 'Front Desk / Physicians & Cabin Seats',
        };
      case 'profile':
        return {
          title: 'Desk Settings & Receptionist Profile',
          breadcrumb: 'Front Desk / Profile & Shift Configurations',
        };
      default:
        return {
          title: 'Receptionist Front Desk Portal',
          breadcrumb: 'Front Desk / CarePulse',
        };
    }
  };

  const headerContext = getHeaderContext();

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex font-sans text-slate-800 antialiased selection:bg-[#0B5A54] selection:text-white">
      {/* ── Toast Feedback Notification ── */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0B5A54] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-teal-400/30 flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-300 font-bold text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PERSISTENT EXECUTIVE SIDEBAR NAVIGATION (Matching Admin Portal)
      ══════════════════════════════════════════════════════════════════ */}
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* ── CarePulse Brand Header ── */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0B5A54] to-teal-800 text-white flex items-center justify-center shadow-md shadow-teal-900/15 ring-2 ring-teal-500/10 shrink-0">
                <Activity className="w-5 h-5 text-teal-200" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-black text-slate-900 font-heading tracking-tight">
                    CarePulse
                  </h1>
                  <span className="bg-teal-50 text-[#0B5A54] text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-teal-200/80 shrink-0">
                    Front Desk
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-semibold tracking-tight truncate max-w-[135px]">
                  {hospitalSettings.name || 'OPD Reception Center'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 lg:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Primary Action Quick Trigger in Sidebar ── */}
          <div className="p-3 border-b border-slate-100/80">
            <button
              onClick={() => {
                setIsNewAppointmentOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-[#0B5A54] to-teal-800 hover:from-[#084540] hover:to-[#0B5A54] text-white rounded-xl font-bold text-xs shadow-md shadow-teal-900/10 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-teal-200 stroke-[2.5]" />
              <span>+ Walk-In Patient</span>
            </button>
          </div>

<<<<<<< Updated upstream
  {/* Right Action Encapsulated Capsule & Circular Icon Buttons */ }
  <div className="flex items-center gap-3">
    {/* Live Polling Sync Indicator */}
    <LiveIndicator
      lastUpdated={lastUpdated}
      isPolling={isPolling}
      onRefresh={refetch}
      label="Live Sync"
    />

    {/* New Appointment Encapsulated Pill Button */}
=======
          {/* ── Categorized Navigation Links ── */}
    <nav className="p-3 space-y-4 overflow-y-auto flex-1 no-scrollbar">
      {navSections.map((section) => (
        <div key={section.groupTitle} className="space-y-1">
          {/* Section Header */}
          <div className="px-2.5 pb-1 pt-0.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-mono">
              {section.groupTitle}
            </span>
          </div>

          {/* Section Links */}
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer group relative ${isActive
                      ? 'bg-teal-50/90 text-[#0B5A54] font-black shadow-2xs border border-teal-200/70'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Active Accent Bar */}
                    {isActive && (
                      <div className="w-1.5 h-4 bg-[#0B5A54] rounded-full shrink-0 -ml-0.5" />
                    )}

                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform ${isActive
                          ? 'text-[#0B5A54] scale-105'
                          : 'text-slate-400 group-hover:text-slate-600 group-hover:scale-105'
                        }`}
                    />
                    <span className="truncate tracking-tight">{item.label}</span>
                  </div>

                  {/* Optional Count Badge */}
                  {item.badge && (
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.2 rounded-full border shadow-2xs shrink-0 ${item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'
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

  {/* ── Sidebar Footer: Live OPD Health & Receptionist Profile Card ── */ }
  <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/40 shrink-0">
    {/* Live OPD Status Widget */}
    <div className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between shadow-2xs">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[11px] font-black text-slate-700">OPD Live Desk</span>
      </div>
      <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
        {waitingCount} Waiting
      </span>
    </div>

    {/* Receptionist Profile Card */}
    <div
      onClick={() => setActiveTab('profile')}
      className="p-2.5 rounded-2xl bg-white border border-slate-200/80 hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between group"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative shrink-0">
          <img
            src={profile.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80'}
            alt={staffDisplayName}
            className="w-8 h-8 rounded-xl object-cover border border-slate-200 shadow-xs"
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border-2 border-white rounded-full" />
        </div>
        <div className="truncate">
          <p className="text-xs font-black text-slate-900 truncate font-heading group-hover:text-[#0B5A54] transition-colors">
            {staffDisplayName}
          </p>
          <p className="text-[10px] text-slate-400 font-bold truncate flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-[#0B5A54]" />
            Desk Administrator
          </p>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleLogout();
        }}
        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
        title="Sign Out"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
      </aside >

{/* ══════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA & TOP BAR
      ══════════════════════════════════════════════════════════════════ */}
  < div className = "flex-1 lg:pl-64 flex flex-col min-h-screen" >
    {/* ── Executive Top Bar ── */ }
    < header className = "sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4" >
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

          <div className="flex items-center gap-3">
            {/* Global Search Bar */}
            <div className="relative hidden md:block w-64 lg:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search patient, phone, #TOK-001..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-slate-400 bg-slate-200/70 px-1.5 py-0.5 rounded">
                ⌘K
              </kbd>
            </div>

            {/* Quick Action: Call Next Token */}
            <button
              onClick={handleQuickCallNext}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-extrabold rounded-xl border border-amber-200 text-xs shadow-2xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              title="Call the next waiting patient in queue"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-700" />
              <span>Call Next</span>
            </button>

            {/* Quick Action: New Walk-In Patient */}
>>>>>>> Stashed changes
            <button
              onClick={() => setIsNewAppointmentOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold rounded-xl text-xs shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ Walk-In</span>
            </button>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2.5 rounded-xl border border-slate-200/90 text-slate-600 hover:bg-slate-50 relative cursor-pointer transition-colors"
                title="Live Desk Alerts"
              >
                <Bell className="w-4 h-4" />
                {waitingCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0B5A54]" />
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl border border-slate-200 shadow-2xl p-4 z-50 animate-in fade-in duration-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-black text-slate-900 font-heading">
                      Live Desk Alerts
                    </span>
                    <span className="text-[10px] font-black text-[#0B5A54] bg-teal-50 px-2 py-0.5 rounded-full">
                      {waitingCount} In Hall
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-teal-50/50 border border-teal-100">
                      <p className="font-black text-slate-900">OPD Live Stream Synchronized</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {activeDoctorsCount} physicians active across clinical consultation cabins.
                      </p>
                      <span className="text-[9px] text-slate-400 font-bold block mt-1">Live Now</span>
                    </div>
                    {waitingCount > 0 && (
                      <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
                        <p className="font-black text-amber-900">Queue Alert</p>
                        <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                          {waitingCount} patient(s) waiting for consultation call.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-[#0B5A54] text-white flex items-center justify-center font-black text-xs font-heading shadow-xs">
                  {(staffDisplayName || 'R').charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-3xl border border-slate-200 shadow-2xl p-2 z-50 animate-in fade-in duration-200 text-xs font-bold text-slate-700 space-y-1">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-black text-slate-900 font-heading">{staffDisplayName}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      {profile.email || 'receptionist@carepulse.com'}
                    </p>
                    <p className="text-[9px] text-[#0B5A54] font-extrabold mt-0.5">
                      {profile.shift || 'Morning Shift'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Desk Settings & Profile</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header >

  {/* ── Main Tab Content Area ── */ }
  < main className = "flex-1 p-4 sm:p-6 w-full no-scrollbar" >
    { activeTab === 'dashboard' && (
      <ReceptionistDashboard
        onNavigateTab={handleNavigateTab}
        onShowToast={showToast}
        onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
      />
    )}

{
  activeTab === 'queue' && (
    <TokenManagement
      onShowToast={showToast}
      onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
    />
  )
}

{
  activeTab === 'bookings' && (
    <PatientBookings
      onShowToast={showToast}
      onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
    />
  )
}

{
  activeTab === 'checkin' && (
    <PatientCheckIn
      onShowToast={showToast}
      onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
    />
  )
}

{
  activeTab === 'doctors' && (
    <DoctorManagement onShowToast={showToast} />
  )
}

{
  activeTab === 'profile' && (
    <ReceptionistProfile onShowToast={showToast} />
  )
}
        </main >
      </div >

  {/* Global New Walk-In Appointment Modal */ }
  < NewAppointmentModal
isOpen = { isNewAppointmentOpen }
onClose = {() => setIsNewAppointmentOpen(false)}
onSuccess = {() => {
  showToast('Walk-in patient registered and token issued successfully!');
}}
      />
    </div >
  );
};

export default ReceptionistLayout;
