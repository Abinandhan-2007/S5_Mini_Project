// frontend/src/portals/superadmin/SuperAdminLayout.tsx
import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Globe2,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { LiveIndicator } from '../../components/ui/LiveIndicator';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { HospitalManagement } from './HospitalManagement';
import { AdminManagement } from './AdminManagement';

export type SuperAdminTab = 'dashboard' | 'hospitals' | 'admins';

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

  const navItems: { id: SuperAdminTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Network Overview', icon: LayoutDashboard },
    { id: 'hospitals', label: 'Hospital Facilities', icon: Building2 },
    { id: 'admins', label: 'Hospital Administrators', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex font-sans text-slate-800 antialiased selection:bg-[#0B5A54] selection:text-white">
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0B5A54] to-teal-600 flex items-center justify-center text-white shadow-sm">
              <Globe2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                CarePulse
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-teal-50 text-[#0B5A54] border border-teal-200">
                  ROOT
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Global Network Control</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            PLATFORM GOVERNANCE
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0B5A54] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* User Footer Profile */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                SA
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {currentStaff.name || 'Platform SuperAdmin'}
                </div>
                <div className="text-[10px] font-mono text-[#0B5A54] font-semibold">
                  {currentStaff.staff_code || 'SA101'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>CarePulse Global</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-slate-900 font-semibold capitalize">
                {activeTab === 'dashboard' ? 'Overview' : activeTab}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LiveIndicator label="Global Network Active" variant="pill" />

            <button
              type="button"
              onClick={handleOpenAddHospital}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B5A54] hover:bg-[#084843] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Hospital</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddAdmin()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Appoint Admin</span>
            </button>
          </div>
        </header>

        {/* Tab Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
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
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
