import React, { useState, useRef, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Stethoscope,
  UserCheck,
  Building2,
  Ticket,
  CalendarCheck,
  BarChart3,
  Settings,
  User,
  LogOut,
  Bell,
  Search,
  Activity,
  Menu,
  X,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { AdminDashboard } from './AdminDashboard';
import { AdminDoctorManagement } from './AdminDoctorManagement';
import { AdminReceptionistMgmt } from './AdminReceptionistMgmt';
import { AdminHospitalManagement } from './AdminHospitalManagement';
import { AdminTokenSlotMgmt } from './AdminTokenSlotMgmt';
import { AdminPatientBookings } from './AdminPatientBookings';
import { AdminReportsAnalytics } from './AdminReportsAnalytics';
import { AdminSettingsProfile } from './AdminSettingsProfile';

type AdminTab =
  | 'dashboard'
  | 'doctors'
  | 'receptionists'
  | 'hospitals'
  | 'tokens'
  | 'bookings'
  | 'reports'
  | 'settings'
  | 'profile';

export const AdminLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [autoOpenHospitalModal, setAutoOpenHospitalModal] = useState(false);
  const [autoOpenReceptionistModal, setAutoOpenReceptionistModal] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const handleNavigateTab = (tab: string, autoOpenModal?: boolean) => {
    setActiveTab(tab as AdminTab);
    if (tab === 'hospitals' && autoOpenModal) {
      setAutoOpenHospitalModal(true);
    }
    if (tab === 'receptionists' && autoOpenModal) {
      setAutoOpenReceptionistModal(true);
    }
  };

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const currentStaff = useStaffStore((s) => s.currentStaff);
  const adminProfile = useStaffStore((s) => s.adminProfile);
  const hospitalSettings = useStaffStore((s) => s.hospitalSettings);
  const logoutStaff = useStaffStore((s) => s.logoutStaff);
  const navigate = useNavigate();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleLogout = () => {
    logoutStaff();
    navigate('/admin/login');
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

  // 8 Main Navigation Items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'doctors', label: 'Doctors', icon: Stethoscope },
    { id: 'receptionists', label: 'Receptionists', icon: UserCheck },
    { id: 'hospitals', label: 'Hospitals', icon: Building2 },
    { id: 'tokens', label: 'Tokens & Slots', icon: Ticket },
    { id: 'bookings', label: 'Patient Bookings', icon: CalendarCheck },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings & Facility', icon: Settings },
  ];

  // Auth Guard
  if (!currentStaff || currentStaff.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans selection:bg-[#0B5A54] selection:text-white">
      {/* ══════════════════════════════════════════════════════════════════
          FIXED LEFT SIDEBAR NAVIGATION
      ══════════════════════════════════════════════════════════════════ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/90 flex flex-col justify-between p-5 transition-transform duration-300 lg:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Brand Header */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0B5A54] flex items-center justify-center text-white shadow-md shadow-teal-900/15">
                <Activity className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-base font-black text-slate-900 tracking-tight font-heading leading-tight">
                  CarePulse
                </h1>
                <span className="text-[10px] text-teal-700 font-extrabold uppercase tracking-wider block">
                  Admin Command Center
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Facility Badge */}
          <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200/70 flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-[#0B5A54] shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-black text-slate-900 truncate font-heading">{hospitalSettings.name}</p>
              <p className="text-[10px] text-slate-500 truncate font-medium">Enterprise Central Hub</p>
            </div>
          </div>

          {/* Navigation Links with Active Brand Indicator Bar */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as AdminTab);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer group relative ${
                    isActive
                      ? 'bg-[#0B5A54] text-white shadow-md shadow-teal-900/15'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`} />
                    <span>{item.label}</span>
                  </div>

                  {isActive && (
                    <span className="w-1.5 h-4 rounded-full bg-teal-300 shadow-xs" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Profile Card + Pinned Logout Button */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div
            onClick={() => setActiveTab('profile')}
            className="p-2.5 rounded-2xl bg-slate-50 hover:bg-teal-50/70 border border-slate-200/80 transition-all cursor-pointer flex items-center gap-3"
          >
            <div className="relative">
              <img
                src={adminProfile.avatarUrl}
                alt={adminProfile.name}
                className="w-10 h-10 rounded-xl object-cover border border-slate-200"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-900 truncate font-heading">{adminProfile.name}</p>
              <p className="text-[10px] text-slate-400 truncate font-semibold">{adminProfile.department}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN CONTENT SHELL WITH TOP HEADER BAR
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0">
        {/* Sticky Header Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-6 py-3.5 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Global search across doctors, receptionists, tickets..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] transition-all"
              />
            </div>
          </div>

          {/* Right Header Items: Notification & User Dropdown */}
          <div className="flex items-center gap-3">
            {/* Notification Bell with Unread Dot & Popover */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/80 transition-colors relative cursor-pointer"
                title="Hospital Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl p-4 shadow-2xl border border-slate-200 space-y-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black text-slate-900 font-heading">Hospital Notifications</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">3 New</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-xl bg-teal-50/60 border border-teal-100">
                      <p className="font-bold text-[#0B5A54]">Dr. Olivia Wilson at 92% capacity</p>
                      <p className="text-[10px] text-slate-500">10:00 AM slot peak saturation</p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="font-bold text-slate-800">Shift check-in recorded</p>
                      <p className="text-[10px] text-slate-500">Desk B-2 Anna Mathews</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Admin User Profile Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <img
                  src={adminProfile.avatarUrl}
                  alt={adminProfile.name}
                  className="w-8 h-8 rounded-xl object-cover border border-slate-200 shadow-2xs"
                />
                <span className="hidden sm:inline text-xs font-black text-slate-900 font-heading">
                  {adminProfile.name.split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl p-2 shadow-2xl border border-slate-200 space-y-1 z-50 animate-in fade-in zoom-in-95 text-xs font-bold">
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Admin Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Hospital Settings</span>
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-5 sm:p-7 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && <AdminDashboard onNavigateTab={handleNavigateTab} />}
          {activeTab === 'doctors' && <AdminDoctorManagement onShowToast={showToast} />}
          {activeTab === 'receptionists' && (
            <AdminReceptionistMgmt
              onShowToast={showToast}
              autoOpenAdd={autoOpenReceptionistModal}
              onCloseAutoOpen={() => setAutoOpenReceptionistModal(false)}
            />
          )}
          {activeTab === 'hospitals' && (
            <AdminHospitalManagement
              onShowToast={showToast}
              autoOpenAdd={autoOpenHospitalModal}
              onCloseAutoOpen={() => setAutoOpenHospitalModal(false)}
            />
          )}
          {activeTab === 'tokens' && <AdminTokenSlotMgmt onShowToast={showToast} />}
          {activeTab === 'bookings' && <AdminPatientBookings onShowToast={showToast} />}
          {activeTab === 'reports' && <AdminReportsAnalytics onShowToast={showToast} />}
          {activeTab === 'settings' && <AdminSettingsProfile onShowToast={showToast} />}
          {activeTab === 'profile' && <AdminSettingsProfile onShowToast={showToast} />}
        </main>
      </div>

      {/* ── Toast Notification Container ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-slate-800 animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
