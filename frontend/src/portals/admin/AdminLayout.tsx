import React, { useState, useRef, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Stethoscope,
  UserCheck,
  HeartPulse,
  CalendarCheck,
  BarChart3,
  Megaphone,
  Settings,
  User,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { usePolling } from '../../lib/usePolling';
import { AdminDashboard } from './AdminDashboard';
import { AdminDoctorManagement } from './AdminDoctorManagement';
import { AdminReceptionistMgmt } from './AdminReceptionistMgmt';
import { AdminNurseManagement } from './AdminNurseManagement';
import { AdminDepartmentManagement } from './AdminDepartmentManagement';
import { AdminAppointmentOverview } from './AdminAppointmentOverview';
import { AdminReportsAnalytics } from './AdminReportsAnalytics';
import { AdminAnnouncements } from './AdminAnnouncements';
import { AdminSettingsProfile } from './AdminSettingsProfile';
import { CarePulseLogo } from '../../components/brand/CarePulseLogo';

export type AdminTab =
  | 'dashboard'
  | 'doctors'
  | 'receptionists'
  | 'nurses'
  | 'departments'
  | 'appointments'
  | 'reports'
  | 'announcements'
  | 'settings';

interface NavSection {
  groupTitle: string;
  items: {
    id: AdminTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }[];
}

export const AdminLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [autoOpenDoctorAdd, setAutoOpenDoctorAdd] = useState(false);
  const [autoOpenReceptionistAdd, setAutoOpenReceptionistAdd] = useState(false);
  const [autoOpenNurseAdd, setAutoOpenNurseAdd] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const currentStaff = useStaffStore((s) => s.currentStaff);
  const adminProfile = useStaffStore((s) => s.adminProfile);
  const hospitalSettings = useStaffStore((s) => s.hospitalSettings);
  const doctors = useStaffStore((s) => s.doctors);
  const receptionists = useStaffStore((s) => s.receptionists);
  const nurses = useStaffStore((s) => s.nurses);
  const departments = useStaffStore((s) => s.departments);
  const tokens = useStaffStore((s) => s.tokens);
  const announcements = useStaffStore((s) => s.announcements);
  const fetchDoctors = useStaffStore((s) => s.fetchDoctors);
  const fetchTokens = useStaffStore((s) => s.fetchTokens);
  const fetchReceptionists = useStaffStore((s) => s.fetchReceptionists);
  const fetchNurses = useStaffStore((s) => s.fetchNurses);
  const logoutStaff = useStaffStore((s) => s.logoutStaff);
  const navigate = useNavigate();

  // Automatic robust background polling for Admin metrics and operations
  usePolling(
    async () => {
      await Promise.all([
        fetchTokens(undefined, true),
        fetchDoctors(true),
        fetchReceptionists(),
        fetchNurses(),
      ]);
    },
    {
      interval: 8000,
      enabled: !!currentStaff && currentStaff.role === 'admin',
    }
  );

  const adminDisplayName =
    currentStaff?.name ||
    adminProfile.name ||
    (currentStaff?.email ? currentStaff.email.split('@')[0] : 'Admin');

  const showToast = (_msg?: string) => {
    // Floating toast popup disabled per design directive
  };

  const handleLogout = () => {
    logoutStaff();
    navigate('/staff/login');
  };

  const handleNavigateTab = (tab: string, autoOpenModal?: boolean) => {
    setActiveTab(tab as AdminTab);
    if (tab === 'doctors' && autoOpenModal) {
      setAutoOpenDoctorAdd(true);
    }
    if (tab === 'receptionists' && autoOpenModal) {
      setAutoOpenReceptionistAdd(true);
    }
    if (tab === 'nurses' && autoOpenModal) {
      setAutoOpenNurseAdd(true);
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

  // Categorized Navigation Sections
  const navSections: NavSection[] = [
    {
      groupTitle: 'COMMAND & KPI',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
      ],
    },
    {
      groupTitle: 'CLINICAL OPERATIONS',
      items: [
        {
          id: 'doctors',
          label: 'Doctor Management',
          icon: Stethoscope,
          badge: doctors.length > 0 ? `${doctors.length}` : undefined,
          badgeColor: 'bg-teal-50 text-[#0B5A54] border-teal-200',
        },
        {
          id: 'receptionists',
          label: 'Receptionist Management',
          icon: UserCheck,
          badge: receptionists.length > 0 ? `${receptionists.length}` : undefined,
          badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
        },
        {
          id: 'nurses',
          label: 'Nursing Team',
          icon: HeartPulse,
          badge: nurses.length > 0 ? `${nurses.length}` : undefined,
          badgeColor: 'bg-teal-50 text-[#0B5A54] border-teal-200',
        },
        {
          id: 'departments',
          label: 'Department Management',
          icon: Layers,
          badge: departments.length > 0 ? `${departments.length}` : undefined,
          badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        },
        {
          id: 'appointments',
          label: 'Appointment Overview',
          icon: CalendarCheck,
          badge: tokens.length > 0 ? `${tokens.length}` : undefined,
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        },
      ],
    },
    {
      groupTitle: 'COMMUNICATION & SYSTEM',
      items: [
        {
          id: 'announcements',
          label: 'Notifications',
          icon: Megaphone,
          badge: announcements.length > 0 ? `${announcements.length}` : undefined,
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        },
        { id: 'settings', label: 'Settings & Profile', icon: Settings },
      ],
    },
  ];

  // Auth Guard
  if (!currentStaff || currentStaff.role !== 'admin') {
    return <Navigate to="/staff/login" replace />;
  }

  // Header Title & Contextual CTA Mapping
  const getHeaderContext = () => {
    const hospName =
      currentStaff?.hospitalName ||
      currentStaff?.hospital_name ||
      adminProfile.hospitalName ||
      hospitalSettings.name ||
      'CarePulse Central';

    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Hospital Dashboard',
          breadcrumb: `${hospName} / Overview`,
        };
      case 'doctors':
        return {
          title: 'Doctor Management',
          breadcrumb: `${hospName} / Physicians & Schedules`,
        };
      case 'receptionists':
        return {
          title: 'Receptionist Management',
          breadcrumb: `${hospName} / Front-Desk Desks`,
        };
      case 'departments':
        return {
          title: 'Department Management',
          breadcrumb: `${hospName} / Clinical Specialties`,
        };
      case 'appointments':
        return {
          title: 'Appointment Overview',
          breadcrumb: `${hospName} / Calendar & Master List`,
        };
      case 'reports':
        return {
          title: 'Reports & Analytics',
          breadcrumb: `${hospName} / KPI Intelligence`,
        };
      case 'announcements':
        return {
          title: 'Hospital Notifications',
          breadcrumb: `${hospName} / Broadcast Alerts`,
        };
      case 'settings':
        return {
          title: 'Settings & Profile',
          breadcrumb: `${hospName} / System Configuration`,
        };
      default:
        return {
          title: 'Hospital Administrative Portal',
          breadcrumb: hospName,
        };
    }
  };

  const headerContext = getHeaderContext();

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex font-sans text-slate-800 antialiased selection:bg-[#0B5A54] selection:text-white">
      {/* ══════════════════════════════════════════════════════════════════
          PERSISTENT PREMIUM DESKTOP & MOBILE SIDEBAR NAVIGATION
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
            <CarePulseLogo
              variant="horizontal"
              size="sm"
              theme="auto"
              badge="Admin"
              subtitle={currentStaff?.hospitalName || currentStaff?.hospital_name || adminProfile.hospitalName || hospitalSettings.name || 'Hospital Administration'}
              onClick={() => setActiveTab('dashboard')}
            />

            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 lg:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
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
                    const isActive = activeTab === item.id;

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

        {/* ── Sidebar Footer: Live Health & Profile Card ── */}
        <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/40 shrink-0">
          {/* Live System Status Widget */}
          <div className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-black text-slate-700">Hospital Live</span>
            </div>
            <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Active
            </span>
          </div>

          {/* Super Admin Profile Card */}
          <div
            onClick={() => setActiveTab('settings')}
            className="p-2.5 rounded-2xl bg-white border border-slate-200/80 hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0B5A54] to-teal-800 text-white flex items-center justify-center font-black text-xs shadow-xs font-heading">
                  {(adminDisplayName || 'A').charAt(0).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-slate-900 truncate font-heading group-hover:text-[#0B5A54] transition-colors">
                  {adminDisplayName}
                </p>
                <p className="text-[10px] text-slate-400 font-bold truncate flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#0B5A54]" />
                  <span>Admin ID:</span>
                  <span className="font-mono text-[#0B5A54] font-black">
                    {currentStaff?.staff_code || currentStaff?.staffCode || 'A001101'}
                  </span>
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
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA & TOP BAR
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden min-w-0">
        {/* ── Top Bar ── */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-3.5 sm:px-8 py-3.5 flex items-center justify-between gap-2.5 sm:gap-4">
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
            <div className="relative hidden md:block w-64 lg:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Global search (doctors, desks, patients)..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54]"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-slate-400 bg-slate-200/70 px-1.5 py-0.5 rounded">
                ⌘K
              </kbd>
            </div>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2.5 rounded-xl border border-slate-200/90 text-slate-600 hover:bg-slate-50 relative cursor-pointer transition-colors"
                title="System Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0B5A54]" />
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl border border-slate-200 shadow-2xl p-4 z-50 animate-in fade-in duration-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-black text-slate-900 font-heading">
                      Notifications & Alerts
                    </span>
                    <span className="text-[10px] font-black text-[#0B5A54] bg-teal-50 px-2 py-0.5 rounded-full">
                      2 New
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-teal-50/50 border border-teal-100">
                      <p className="font-black text-slate-900">Dr. Olivia Wilson Shift Complete</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        14 Cardiology slots finished successfully.
                      </p>
                      <span className="text-[9px] text-slate-400 font-bold block mt-1">10m ago</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                      <p className="font-black text-slate-900">Digital Token Queue Sync</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        All reception desks operating under live token stream.
                      </p>
                      <span className="text-[9px] text-slate-400 font-bold block mt-1">45m ago</span>
                    </div>
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
                  {(adminDisplayName || 'A').charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-3xl border border-slate-200 shadow-2xl p-2 z-50 animate-in fade-in duration-200 text-xs font-bold text-slate-700 space-y-1">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-black text-slate-900 font-heading">{adminDisplayName}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      {currentStaff?.email || 'admin@carepulse.com'}
                    </p>
                    <p className="text-[10px] font-mono font-bold text-[#0B5A54] bg-teal-50 px-2 py-0.5 rounded mt-1 inline-block border border-teal-100">
                      Admin ID: {currentStaff?.staff_code || currentStaff?.staffCode || 'A001101'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Profile & Settings</span>
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
        </header>

        {/* ── Main Tab Content Area ── */}
        <main className="flex-1 p-3.5 sm:p-6 w-full max-w-full overflow-x-hidden min-w-0 no-scrollbar">
          {activeTab === 'dashboard' && (
            <AdminDashboard onNavigateTab={handleNavigateTab} />
          )}

          {activeTab === 'doctors' && (
            <AdminDoctorManagement
              onShowToast={showToast}
              autoOpenAddModal={autoOpenDoctorAdd}
            />
          )}

          {activeTab === 'receptionists' && (
            <AdminReceptionistMgmt
              onShowToast={showToast}
              autoOpenAdd={autoOpenReceptionistAdd}
            />
          )}

          {activeTab === 'nurses' && (
            <AdminNurseManagement
              onShowToast={showToast}
              autoOpenAdd={autoOpenNurseAdd}
            />
          )}

          {activeTab === 'departments' && (
            <AdminDepartmentManagement
              onShowToast={showToast}
            />
          )}

          {activeTab === 'appointments' && (
            <AdminAppointmentOverview onShowToast={showToast} />
          )}

          {activeTab === 'reports' && (
            <AdminReportsAnalytics onShowToast={showToast} />
          )}

          {activeTab === 'announcements' && (
            <AdminAnnouncements onShowToast={showToast} />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsProfile onShowToast={showToast} />
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
