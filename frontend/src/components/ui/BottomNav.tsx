import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import doctorAvatar from '../../assets/doctor_avatar.png';
import { Home, Building2, Activity, User, Camera } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * System Theme-Aware Executive Bottom Navigation Capsule
 * Automatically detects System Dark / Light Mode preference and updates background,
 * icon, text, and active pill colors seamlessly.
 * Health AI is accessed via a prominent floating 3D mascot button above the Profile nav item.
 * Center button allows fast one-tap access to the Medicine Scanner.
 */
export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Detect system dark mode preference in real-time
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const navItems = [
    { path: '/home', label: 'Home', icon: Home, isCenter: false },
    { path: '/history', label: 'History', icon: Activity, isCenter: false },
    { path: '/prescriptions/scan', label: 'Scan', icon: Camera, isCenter: true },
    { path: '/hospitals', label: 'Hospitals', icon: Building2, isCenter: false },
    { path: '/profile', label: 'Profile', icon: User, isCenter: false },
  ];

  const isHealthAiActive = location.pathname.startsWith('/health-ai');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleClickHealthAi = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      navigate('/health-ai');
      setIsTransitioning(false);
    }, 160);
  };

  if (['/login', '/register'].includes(location.pathname)) {
    return null;
  }

  return (
    <>
      {/* Floating AI Doctor Mascot — Large transparent 3D character above Profile button (hidden when already on Health AI screen) */}
      {!isHealthAiActive && (
        <div
          style={{
            position: 'fixed',
            bottom: '92px',
            right: 'calc(50% - 176px)',
            zIndex: 50,
          }}
          className="sm:right-[calc(50%-230px)] sm:!bottom-[100px]"
        >
          <button
            id="health-ai-avatar-btn"
            onClick={handleClickHealthAi}
            title="Health AI"
            className={clsx(
              'relative flex flex-col items-center justify-center transition-all duration-300 ease-out select-none cursor-pointer outline-none border-0 bg-transparent group p-0',
              isTransitioning
                ? 'scale-115 -translate-y-3 brightness-110'
                : 'hover:scale-108 hover:-translate-y-1 active:scale-95'
            )}
          >
            {/* Large Realistic 3D Doctor Character with transparent background */}
            <div className={clsx(
              "relative w-[76px] h-[76px] sm:w-[84px] sm:h-[84px] flex items-center justify-center transition-all duration-300 ease-out",
              isTransitioning && "rotate-2 scale-105"
            )}>
              <img
                src={doctorAvatar}
                alt="Health AI Doctor"
                className={clsx(
                  "w-full h-full object-contain transition-all duration-300",
                  isTransitioning
                    ? "filter drop-shadow-[0_14px_28px_rgba(20,184,166,0.55)] brightness-110"
                    : "filter drop-shadow-[0_8px_16px_rgba(11,90,84,0.32)] group-hover:brightness-105"
                )}
              />
            </div>

            {/* Label below the avatar - Fixed premium style */}
            <span
              className={clsx(
                'text-[9.5px] font-bold tracking-tight px-2.5 py-0.5 rounded-full shadow-[0_2px_8px_rgba(11,90,84,0.18)] -mt-1 backdrop-blur-md transition-all duration-300 border',
                isTransitioning
                  ? 'bg-teal-600/95 text-white border-teal-400/60 shadow-teal-500/40 scale-105'
                  : isDarkMode
                  ? 'bg-slate-900/90 text-teal-300 border-teal-500/30'
                  : 'bg-white/95 text-[#0B5A54] border-teal-100/80'
              )}
            >
              Health AI
            </span>
          </button>
        </div>
      )}

      {/* Main nav capsule */}
      <nav
        className={clsx(
          'fixed bottom-5 sm:bottom-6 left-0 right-0 z-40 w-[calc(100%-1.5rem)] max-w-[380px] sm:max-w-lg mx-auto rounded-full px-2.5 py-1.5 sm:px-5 sm:py-2 backdrop-blur-2xl transition-all duration-300 select-none cursor-pointer',
          isDarkMode
            ? 'bg-slate-900/85 border border-slate-700/80 shadow-[0_16px_36px_rgba(0,0,0,0.5)] ring-1 ring-white/10'
            : 'bg-white/85 border border-white/80 shadow-[0_14px_36px_rgba(11,90,84,0.16)] ring-1 ring-black/5'
        )}
      >
        <div className="flex justify-between items-center w-full gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname.startsWith(item.path) ||
              (item.isCenter &&
                (location.pathname.startsWith('/medicine/info-lookup') ||
                  location.pathname.startsWith('/prescriptions/scan') ||
                  location.pathname.startsWith('/prescriptions/info-lookup')));

            if (item.isCenter) {
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex-1 flex flex-col items-center justify-center -translate-y-1 sm:-translate-y-1.5 transition-all duration-200 active:scale-95 group border-0 outline-none cursor-pointer"
                  title="Scan Medicine"
                >
                  <div
                    className={clsx(
                      'w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shadow-md transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-tr from-[#0B5A54] via-[#14837A] to-[#14B8A6] text-white ring-2 ring-[#14B8A6]/60 scale-105 shadow-teal-600/40'
                        : isDarkMode
                        ? 'bg-gradient-to-tr from-teal-700 to-teal-500 text-white hover:scale-105 shadow-black/40'
                        : 'bg-gradient-to-tr from-[#0B5A54] via-[#10726A] to-[#14B8A6] text-white hover:scale-105 shadow-[0_4px_12px_rgba(11,90,84,0.3)]'
                    )}
                  >
                    <Camera className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white stroke-[2.2]" />
                  </div>

                  <span
                    className={clsx(
                      'text-[8.5px] sm:text-[9px] mt-0.5 font-heading transition-all duration-150 tracking-tight font-black',
                      isActive
                        ? isDarkMode
                          ? 'text-emerald-300'
                          : 'text-[#0B5A54]'
                        : isDarkMode
                        ? 'text-slate-300 group-hover:text-white'
                        : 'text-[#0B5A54] group-hover:text-[#084540]'
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={clsx(
                  'flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 active:scale-95 group border-0 outline-none cursor-pointer',
                  isActive
                    ? isDarkMode
                      ? 'bg-[#0B5A54]/80 shadow-2xs border border-teal-500/30'
                      : 'bg-[#E3F3F1]/90 shadow-2xs'
                    : isDarkMode
                    ? 'bg-transparent hover:bg-slate-800/60'
                    : 'bg-transparent hover:bg-slate-50'
                )}
              >
                {/* Sleek Icon Container */}
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={clsx(
                      'w-4 h-4 sm:w-4.5 sm:h-4.5 transition-all duration-200',
                      isActive
                        ? isDarkMode
                          ? 'text-emerald-300 stroke-[2.4] scale-105'
                          : 'text-[#0B5A54] stroke-[2.4] scale-105'
                        : isDarkMode
                        ? 'text-slate-400 stroke-[1.8] group-hover:text-slate-100'
                        : 'text-slate-500 stroke-[1.8] group-hover:text-slate-900'
                    )}
                  />
                </div>

                {/* Theme-Aware Text Label */}
                <span
                  className={clsx(
                    'text-[8.5px] sm:text-[9px] mt-0.5 font-heading transition-all duration-150 tracking-tight truncate max-w-[54px]',
                    isActive
                      ? isDarkMode
                        ? 'font-black text-emerald-300'
                        : 'font-black text-[#0B5A54]'
                      : isDarkMode
                      ? 'font-semibold text-slate-400 group-hover:text-slate-100'
                      : 'font-semibold text-slate-500 group-hover:text-slate-900'
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

