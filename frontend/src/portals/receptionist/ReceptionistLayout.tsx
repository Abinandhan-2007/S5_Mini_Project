
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  UserCheck,
  Stethoscope,
  Ticket,
  Settings,
  LogOut,
  Bell,
  Search,
  Activity,
  Menu,
  X,
  ChevronDown,
  UserPlus,
  Clock,
  Calendar,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { ReceptionistDashboard } from './ReceptionistDashboard';
import { PatientBookings } from './PatientBookings';
import { PatientCheckIn } from './PatientCheckIn';
import { DoctorManagement } from './DoctorManagement';
import { TokenManagement } from './TokenManagement';
import { ReceptionistProfile } from './ReceptionistProfile';
import { ReceptionistNotifications } from './ReceptionistNotifications';
import { NewAppointmentModal } from './NewAppointmentModal';
import { usePolling } from '../../lib/usePolling';

export type ReceptionistTab =
  | 'dashboard'
  | 'bookings'
  | 'checkin'
  | 'doctors'
  | 'tokens'
  | 'queue'
  | 'notifications'
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const currentStaff = useStaffStore((s) => s.currentStaff);
  const profile = useStaffStore((s) => s.receptionistProfile);
  const hospitalSettings = useStaffStore((s) => s.hospitalSettings);
  const doctors = useStaffStore((s) => s.doctors);
  const tokens = useStaffStore((s) => s.tokens);
  const fetchDoctors = useStaffStore((s) => s.fetchDoctors);
  const fetchTokens = useStaffStore((s) => s.fetchTokens);
  const logoutStaff = useStaffStore((s) => s.logoutStaff);
  const navigate = useNavigate();

  // Real-time live date & time clock
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      );
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Automatic robust background polling for receptionist token queue & doctors
  usePolling(
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

  // Global search filtering across tokens and doctors
  const filteredSearchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return { tokens: [], doctors: [] };
    return {
      tokens: tokens.filter(
        (t) =>
          t.tokenNumber?.toLowerCase().includes(q) ||
          t.patientName?.toLowerCase().includes(q) ||
          t.patientPhone?.toLowerCase().includes(q) ||
          t.doctorName?.toLowerCase().includes(q)
      ).slice(0, 4),
      doctors: doctors.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.specialty?.toLowerCase().includes(q) ||
          d.roomNumber?.toLowerCase().includes(q)
      ).slice(0, 3),
    };
  }, [globalSearch, tokens, doctors]);

  const showToast = (_msg?: string) => {
    // Floating toast popup disabled per design directive
  };

  const handleLogout = () => {
    logoutStaff();
    navigate('/staff/login');
  };

  const handleNavigateTab = (tab: string) => {
    if (tab === 'queue') {
      setActiveTab('tokens');
    } else {
      setActiveTab(tab as ReceptionistTab);
    }
    setIsMobileSidebarOpen(false);
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

  // Categorized Navigation Sections (Token Management positioned directly below Doctors & Slot Capacity)
  const navSections: NavSection[] = [
    {
      groupTitle: 'FRONT DESK & QUEUE',
      items: [
        { id: 'dashboard', label: 'OPD Command Center', icon: LayoutDashboard },
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
        },
        {
          id: 'tokens',
          label: 'Token Management',
          icon: Ticket,
        },
      ],
    },
    {
      groupTitle: 'COMMUNICATION & ALERTS',
      items: [
        {
          id: 'notifications',
          label: 'Notifications & Alerts',
          icon: Bell,
          badge: '3 New',
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
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
      case 'tokens':
      case 'queue':
        return {
          title: 'Token & Slot Management Desk',
          breadcrumb: 'Front Desk / Time Slots & Live Token Queue',
        };
      case 'notifications':
        return {
          title: 'Desk Notifications & Clinical Alerts',
          breadcrumb: 'Front Desk / Alerts & Announcements',
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
    <div className="min-h-screen bg-[#F8FAFB] flex font-sans text-slate-800 antialiased selection:bg-[#0B5A54] selection:text-white w-full max-w-full overflow-x-hidden">
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
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
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
                    const isActive = activeTab === item.id || (item.id === 'tokens' && activeTab === 'queue');

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer group relative ${
                          isActive
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
                            className={`w-4 h-4 shrink-0 transition-transform ${
                              isActive
                                ? 'text-[#0B5A54] scale-105'
                                : 'text-slate-400 group-hover:text-slate-600 group-hover:scale-105'
                            }`}
                          />
                          <span className="truncate tracking-tight">{item.label}</span>
                        </div>

                        {/* Optional Count Badge */}
                        {item.badge && (
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.2 rounded-full border shadow-2xs shrink-0 ${
                              item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'
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

        {/* ── Sidebar Footer: Logout Button ── */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/40 shrink-0">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full py-2.5 px-3 rounded-2xl bg-rose-50/80 hover:bg-rose-100 text-rose-700 font-extrabold text-xs border border-rose-200/90 shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA & TOP BAR
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
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

          <div className="flex items-center gap-3">
            {/* Global Premium Search Bar (Expanded Width) */}
            <div className="relative hidden md:block w-80 md:w-96 lg:w-[400px] xl:w-[460px] group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none text-slate-400 group-focus-within:text-[#0B5A54] transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search patient, phone, #TOK-001, doctor..."
                className="w-full pl-10 pr-20 py-2.5 bg-slate-50/90 hover:bg-white focus:bg-white border border-slate-200/90 rounded-2xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-[#0B5A54] transition-all shadow-2xs"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {globalSearch && (
                  <button
                    onClick={() => setGlobalSearch('')}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-slate-400 bg-white border border-slate-200/80 px-2 py-0.5 rounded-lg shadow-2xs pointer-events-none">
                  ⌘K
                </kbd>
              </div>

              {/* Instant Search Results Dropdown */}
              {globalSearch.trim().length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white rounded-3xl border border-slate-200 shadow-2xl p-3 z-50 animate-in fade-in duration-150 space-y-2.5 max-h-80 overflow-y-auto">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-2">
                    <span>Matching Results ({filteredSearchResults.tokens.length + filteredSearchResults.doctors.length})</span>
                    <button
                      onClick={() => setGlobalSearch('')}
                      className="text-slate-400 hover:text-slate-700 text-[10.5px] uppercase font-bold cursor-pointer hover:underline"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Token Results */}
                  {filteredSearchResults.tokens.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        handleNavigateTab('tokens');
                        setGlobalSearch('');
                      }}
                      className="p-2.5 rounded-2xl hover:bg-teal-50/70 border border-transparent hover:border-teal-200 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs group/item"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-2.5 py-1 bg-[#0B5A54] text-white font-mono font-black text-[11px] rounded-xl shadow-2xs">
                          {t.tokenNumber}
                        </span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 group-hover/item:text-[#0B5A54] transition-colors truncate">
                            {t.patientName}
                          </p>
                          <p className="text-[10.5px] text-slate-400 truncate">
                            With Dr. {t.doctorName} • {t.timeSlot}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full shrink-0 border ${
                        t.status === 'In Consultation'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : t.status === 'Waiting'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  ))}

                  {/* Doctor Results */}
                  {filteredSearchResults.doctors.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => {
                        handleNavigateTab('doctors');
                        setGlobalSearch('');
                      }}
                      className="p-2.5 rounded-2xl hover:bg-teal-50/70 border border-transparent hover:border-teal-200 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs group/item"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 text-[#0B5A54] font-black text-xs flex items-center justify-center shrink-0 border border-teal-200">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 group-hover/item:text-[#0B5A54] transition-colors truncate">
                            {d.name}
                          </p>
                          <p className="text-[10.5px] text-slate-400 truncate">
                            {d.specialty} • {d.roomNumber}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full shrink-0 border ${
                        d.isAvailable
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {d.isAvailable ? 'On Duty' : 'Off Duty'}
                      </span>
                    </div>
                  ))}

                  {filteredSearchResults.tokens.length === 0 && filteredSearchResults.doctors.length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                      <p className="font-bold text-slate-600">No matching patient tokens or doctors found</p>
                      <p className="text-[11px]">Search by token (#TOK-001), patient name, or doctor name.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live Current Date & Time Display */}
            <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-700 shadow-2xs font-sans">
              <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-[#0B5A54]" />
                <span>{currentDate || 'Today'}</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5 font-mono font-black text-slate-900">
                <Clock className="w-3.5 h-3.5 text-[#0B5A54]" />
                <span>{currentTime || '09:00 AM'}</span>
              </div>
            </div>

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
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotifOpen(false);
                      setActiveTab('notifications');
                    }}
                    className="w-full py-2 bg-teal-50 hover:bg-teal-100 text-[#0B5A54] font-black text-xs rounded-xl border border-teal-200 transition-colors cursor-pointer text-center block"
                  >
                    View All Notifications & Alerts →
                  </button>
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
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Main Tab Content Area ── */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 w-full max-w-[1600px] mx-auto overflow-x-hidden no-scrollbar">
          {activeTab === 'dashboard' && (
            <ReceptionistDashboard
              onNavigateTab={handleNavigateTab}
              onShowToast={showToast}
              onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
            />
          )}

          {activeTab === 'bookings' && (
            <PatientBookings
              onShowToast={showToast}
              onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
            />
          )}

          {activeTab === 'checkin' && (
            <PatientCheckIn
              onShowToast={showToast}
              onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
            />
          )}

          {activeTab === 'doctors' && (
            <DoctorManagement onShowToast={showToast} />
          )}

          {(activeTab === 'tokens' || activeTab === 'queue') && (
            <TokenManagement
              onShowToast={showToast}
              onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
            />
          )}
          {activeTab === 'notifications' && (
            <ReceptionistNotifications
              onShowToast={showToast}
              onNavigateTab={handleNavigateTab}
            />
          )}
          {activeTab === 'profile' && (
            <ReceptionistProfile onShowToast={showToast} />
          )}
        </main>
      </div>

      {/* Global New Walk-In Appointment Modal */}
      <NewAppointmentModal
        isOpen={isNewAppointmentOpen}
        onClose={() => setIsNewAppointmentOpen(false)}
        onSuccess={() => {
          showToast('Walk-in patient registered and token issued successfully!');
        }}
      />

      {/* ══════════════════════════════════════════════════════════════════
          LOGOUT CONFIRMATION WARNING MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 text-center animate-in zoom-in-95 duration-200 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <LogOut className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 font-heading">
                Confirm Terminal Sign Out?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to sign out from the Receptionist Desk terminal at{' '}
                <strong className="text-slate-900 font-extrabold">{profile.clinicName || 'CarePulse Central Hospital'}</strong>.
              </p>
              <p className="text-[11px] text-slate-500 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                Live queues, token counts, and doctor cabin schedules will remain saved.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs transition-all cursor-pointer"
              >
                Stay Logged In
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all cursor-pointer active:scale-95"
              >
                Sign Out Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistLayout;
