import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus, Bell, User, LogOut } from 'lucide-react';
import { ReceptionistDashboard } from './ReceptionistDashboard';
import { DoctorManagement } from './DoctorManagement';
import { PatientBookings } from './PatientBookings';
import { TokenManagement } from './TokenManagement';
import { ReceptionistProfile } from './ReceptionistProfile';
import { NewAppointmentModal } from './NewAppointmentModal';
import { useStaffStore } from '../../store/staffStore';

type NavTab = 'home' | 'doctors' | 'bookings' | 'tokens' | 'profile';

export const ReceptionistLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const profile = useStaffStore((s) => s.receptionistProfile);
  const fetchDoctors = useStaffStore((s) => s.fetchDoctors);
  const fetchTokens = useStaffStore((s) => s.fetchTokens);
  const currentStaff = useStaffStore((s) => s.currentStaff);
  const logoutStaff = useStaffStore((s) => s.logoutStaff);
  const navigate = useNavigate();

  useEffect(() => {
    // Initial fetch on mount
    fetchDoctors();
    fetchTokens();

    // Live polling every 3.5 seconds to sync patient bookings in real time
    const interval = setInterval(() => {
      fetchTokens();
    }, 3500);

    return () => clearInterval(interval);
  }, [fetchDoctors, fetchTokens]);

  // Role-based auth guard
  if (!currentStaff || currentStaff.role !== 'receptionist') {
    return <Navigate to="/receptionist/login" replace />;
  }

  const handleLogout = () => {
    logoutStaff();
    navigate('/receptionist/login');
  };

  const navItems: { id: NavTab; label: string }[] = [
    { id: 'home', label: 'Dashboard' },
    { id: 'doctors', label: 'Doctors' },
    { id: 'bookings', label: 'Patient Bookings' },
    { id: 'tokens', label: 'Token Queue' },
    { id: 'profile', label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-[#0B5A54] selection:text-white">
      {/* Floating Encapsulated Capsule Header Bar */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-slate-200/90 via-slate-100/90 to-teal-100/30 backdrop-blur-md border-b border-slate-300/60 py-5 sm:py-6 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex items-center justify-between gap-6">
          
          {/* Left Outlined Pill Brand Badge */}
          <div
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/95 shadow-sm border border-slate-200/80 cursor-pointer select-none group hover:border-[#0B5A54]/40 transition-all"
            onClick={() => setActiveTab('home')}
          >
            <span className="text-base font-black tracking-tight text-slate-900 font-heading group-hover:text-[#0B5A54] transition-colors">
              CarePulse
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {/* Center Encapsulated White Capsule Navigation Bar (CarePulse Teal Active #0B5A54) */}
          <nav className="hidden md:flex items-center bg-white/95 backdrop-blur-md p-2 rounded-full border border-slate-200/80 shadow-md gap-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`transition-all duration-200 text-sm whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0B5A54] text-white font-extrabold rounded-full px-6 py-2.5 shadow-sm scale-[1.02]'
                      : 'text-slate-600 font-bold hover:text-[#0B5A54] hover:bg-slate-100/70 px-5 py-2.5 rounded-full'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Encapsulated Capsule & Circular Icon Buttons */}
          <div className="flex items-center gap-3.5">
            {/* New Appointment Encapsulated Pill Button */}
            <button
              onClick={() => setIsNewAppointmentOpen(true)}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-white/95 hover:bg-white text-slate-800 font-bold rounded-full border border-slate-200/80 shadow-sm text-sm transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 text-[#0B5A54] stroke-[3]" />
              <span>Appointment</span>
            </button>

            {/* Circular Notification Bell Button */}
            <button
              onClick={() => setActiveTab('home')}
              className="relative w-11 h-11 rounded-full bg-white/95 hover:bg-white shadow-sm border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-[#0B5A54] transition-all hover:scale-105"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-amber-400 rounded-full border-2 border-white" />
            </button>

            {/* Circular User Profile Button */}
            <button
              onClick={() => setActiveTab('profile')}
              className="w-11 h-11 rounded-full bg-white/95 shadow-sm border border-slate-200/80 flex items-center justify-center hover:scale-105 transition-all overflow-hidden"
              title={profile.name}
            >
              <User className="w-5 h-5 text-slate-700" />
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation Strip */}
        <div className="md:hidden flex items-center justify-around bg-white/95 px-3 py-2.5 border-t border-slate-200/80 overflow-x-auto text-xs gap-2 mt-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all ${
                  isActive ? 'bg-[#0B5A54] text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-8 py-8 space-y-8">
        {activeTab === 'home' && <ReceptionistDashboard />}
        {activeTab === 'doctors' && <DoctorManagement />}
        {activeTab === 'bookings' && <PatientBookings />}
        {activeTab === 'tokens' && <TokenManagement />}
        {activeTab === 'profile' && <ReceptionistProfile />}
      </main>

      {/* Global New Appointment Modal */}
      <NewAppointmentModal isOpen={isNewAppointmentOpen} onClose={() => setIsNewAppointmentOpen(false)} />
    </div>
  );
};

export default ReceptionistLayout;
