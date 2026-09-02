import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import doctorAvatar from '../../assets/doctor_avatar.png';
import { Home, Building2, Activity, User } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * System Theme-Aware Executive Bottom Navigation Capsule
 * Automatically detects System Dark / Light Mode preference and updates background,
 * icon, text, and active pill colors seamlessly.
 * Health AI is accessed via a prominent floating 3D mascot button above the Profile nav item.
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
    { path: '/home', label: 'Home', icon: Home },
    { path: '/history', label: 'History', icon: Activity },
    { path: '/hospitals', label: 'Hospitals', icon: Building2 },
    { path: '/profile', label: 'Profile', icon: User },
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
            right: 'calc(50% - 180px)',
            zIndex: 50,
          }}
          className="sm:right-[calc(50%-202px)] sm:!bottom-[100px]"
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
          'fixed bottom-5 sm:bottom-6 left-0 right-0 z-40 w-[calc(100%-1.5rem)] max-w-[330px] sm:max-w-[370px] mx-auto rounded-full px-2 py-1.5 backdrop-blur-2xl transition-all duration-300 select-none cursor-pointer',
          isDarkMode
            ? 'bg-slate-900/85 border border-slate-700/80 shadow-[0_16px_36px_rgba(0,0,0,0.5)] ring-1 ring-white/10'
            : 'bg-white/85 border border-white/80 shadow-[0_14px_36px_rgba(11,90,84,0.16)] ring-1 ring-black/5'
        )}
      >
        <div className="flex justify-between items-center w-full gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={clsx(
                  'flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-full transition-all duration-300 active:scale-95 group border-0 outline-none cursor-pointer relative',
                  isActive
                    ? isDarkMode
                      ? 'bg-white/6 border border-white/10 text-teal-300'
                      : 'bg-[#0B5A54]/8 border border-[#0B5A54]/12 text-[#0B5A54]'
                    : isDarkMode
                    ? 'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-white/5'
                    : 'bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
                )}
              >
                {/* Sleek Icon Container */}
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={clsx(
                      'w-4 h-4 sm:w-4.5 sm:h-4.5 transition-all duration-200',
                      isActive
                        ? isDarkMode
                          ? 'text-teal-300 stroke-[2.4] scale-105'
                          : 'text-[#0B5A54] stroke-[2.4] scale-105'
                        : isDarkMode
                        ? 'text-slate-400 stroke-[1.8] group-hover:text-slate-200 group-hover:scale-105'
                        : 'text-slate-500 stroke-[1.8] group-hover:text-slate-800 group-hover:scale-105'
                    )}
                  />
                </div>

                {/* Theme-Aware Neutral Text Label (Uncolored) */}
                <span
                  className={clsx(
                    'text-[8.5px] sm:text-[9px] mt-0.5 font-heading transition-all duration-150 tracking-tight truncate max-w-[54px]',
                    isActive
                      ? isDarkMode
                        ? 'font-bold text-white'
                        : 'font-bold text-slate-900'
                      : isDarkMode
                      ? 'font-medium text-slate-400 group-hover:text-slate-200'
                      : 'font-medium text-slate-500 group-hover:text-slate-800'
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
