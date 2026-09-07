// frontend/src/portals/superadmin/SuperAdminLayout.tsx
import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Globe2,
  ChevronRight,
  Server,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { HospitalManagement } from './HospitalManagement';
import { AdminManagement } from './AdminManagement';
import { AuditLog } from './AuditLog';

export type SuperAdminTab = 'dashboard' | 'hospitals' | 'admins' | 'audit';

export const SuperAdminLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [autoOpenHospitalModal, setAutoOpenHospitalModal] = useState(false);
  const [autoOpenAdminModal, setAutoOpenAdminModal] = useState(false);
  const [preselectedHospitalId, setPreselectedHospitalId] = useState<string | undefined>(undefined);

  const currentStaff = useStaffStore((s) => s.currentStaff);
  const logoutStaff = useStaffStore((s) => s.logoutStaff);
  const navigate = useNavigate();

  // Auth Guard: Only SuperAdmin permitted
  if (!currentStaff || currentStaff.role !== 'superadmin') {
    return <Navigate to="/staff/superadmin" replace />;
  }

  const handleOpenAddAdmin = (hospId?: string) => {
    setPreselectedHospitalId(hospId);
    setAutoOpenAdminModal(true);
    setActiveTab('admins');
  };

  const handleOpenAddHospital = () => {
    setAutoOpenHospitalModal(true);
    setActiveTab('hospitals');
  };

  const handleLogout = () => {
    logoutStaff();
    navigate('/staff/superadmin');
  };

  const navItems: { id: SuperAdminTab; label: string; icon: React.FC<{ className?: string }>; tag: string }[] = [
    { id: 'dashboard', label: 'Network Overview', icon: LayoutDashboard, tag: 'LIVE' },
    { id: 'hospitals', label: 'Hospital Facilities', icon: Building2, tag: 'H001+' },
    { id: 'admins', label: 'Hospital Administrators', icon: ShieldCheck, tag: 'A101+' },
    { id: 'audit', label: 'Platform Audit Log', icon: ClipboardList, tag: 'LOGS' },
  ];

  return (
    <div className="min-h-screen bg-[#F6F8F7] flex font-sans text-slate-800 antialiased selection:bg-[#0B5A54] selection:text-white">
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Persistent Left Command Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Platform Root Header */}
        <div className="h-20 px-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0B5A54] to-teal-700 border border-teal-800 flex items-center justify-center text-white shadow-xs">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base tracking-tight font-heading">
                  CarePulse
                </span>
                <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold tracking-wider bg-teal-50 text-[#0B5A54] border border-teal-200 uppercase">
                  ROOT
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Scope: SA101 Platform</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Network Status Quick Telemetry */}
        <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-[#0B5A54]" />
              Network Protocol
            </span>
            <span className="font-mono text-emerald-700 font-bold">ONLINE 99.9%</span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">
            Platform Governance
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0B5A54] text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span className="tracking-tight">{item.label}</span>
                </div>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white font-bold'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {item.tag}
                </span>
              </button>
            );
          })}
        </div>

        {/* User Footer Profile Card */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0B5A54] to-teal-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                SA
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate font-heading">
                  {currentStaff.name || 'Platform SuperAdmin'}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono mt-0.5">
                  <span className="text-[#0B5A54] font-bold">{currentStaff.staff_code || 'SA101'}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-400 text-[10px]">Root Level</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        {/* Top Control Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="hover:text-slate-800 transition-colors">CarePulse Global</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-slate-900 font-bold capitalize font-heading">
                {activeTab === 'dashboard'
                  ? 'Overview'
                  : activeTab === 'hospitals'
                  ? 'Hospital Facilities'
                  : activeTab === 'admins'
                  ? 'Hospital Administrators'
                  : 'Platform Audit Log'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
          </div>
        </header>

        {/* Tab Content Container */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <SuperAdminDashboard
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenAddHospital={handleOpenAddHospital}
              onOpenAddAdmin={(hospId) => handleOpenAddAdmin(hospId)}
            />
          )}

          {activeTab === 'hospitals' && (
            <HospitalManagement
              onOpenAddAdminForHospital={(hospId) => handleOpenAddAdmin(hospId)}
              autoOpenAddModal={autoOpenHospitalModal}
              onResetAutoOpen={() => setAutoOpenHospitalModal(false)}
            />
          )}

          {activeTab === 'admins' && (
            <AdminManagement
              preselectedHospitalId={preselectedHospitalId}
              autoOpenAddModal={autoOpenAdminModal}
              onResetAutoOpen={() => {
                setAutoOpenAdminModal(false);
                setPreselectedHospitalId(undefined);
              }}
            />
          )}

          {activeTab === 'audit' && <AuditLog />}
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
