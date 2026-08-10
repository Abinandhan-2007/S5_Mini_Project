import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Building2, Activity, Sparkles, User } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * System Theme-Aware Executive Bottom Navigation Capsule
 * Automatically detects System Dark / Light Mode preference and updates background,
 * icon, text, and active pill colors seamlessly.
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
    { path: '/health-ai', label: 'Health AI', icon: Sparkles, isAi: true },
    { path: '/history', label: 'History', icon: Activity },
    { path: '/hospitals', label: 'Hospitals', icon: Building2 },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  if (['/login', '/register'].includes(location.pathname)) {
    return null;
  }

  return (
    <nav
      className={clsx(
        'fixed bottom-5 sm:bottom-6 left-0 right-0 z-40 w-[calc(100%-2rem)] max-w-[350px] sm:max-w-md mx-auto rounded-full px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-2xl transition-all duration-300 select-none cursor-pointer',
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
                'flex-1 flex flex-col items-center justify-center py-1.5 px-1.5 rounded-2xl transition-all duration-200 active:scale-95 group border-0 outline-none cursor-pointer',
                isActive
                  ? isDarkMode
                    ? 'bg-[#0B5A54]/80 shadow-2xs border border-teal-500/30'
                    : 'bg-[#E3F3F1]/90 shadow-2xs'
                  : isDarkMode
                  ? 'bg-transparent hover:bg-slate-800/60'
                  : 'bg-transparent hover:bg-slate-50'
              )}
            >
              {/* Reduced Sleek Icon Container */}
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

                {item.isAi && !isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse ring-1 ring-white" />
                )}
              </div>

              {/* Refined Theme-Aware Text Label */}
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
  );
};
