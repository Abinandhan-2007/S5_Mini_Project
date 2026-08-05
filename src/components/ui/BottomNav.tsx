import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Building2, Activity, Sparkles, User } from 'lucide-react';
import { clsx } from 'clsx';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

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
    <nav className="fixed bottom-3 sm:bottom-4 left-0 right-0 z-40 w-[calc(100%-2.5rem)] max-w-[340px] sm:max-w-md mx-auto bg-white/95 backdrop-blur-xl border border-[#E4E7EC] rounded-full px-2 py-1.5 shadow-[0_8px_24px_rgba(11,90,84,0.12)] ring-1 ring-[#0B5A54]/10 transition-all duration-200 select-none">
      <div className="flex justify-between items-center w-full px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex-1 flex flex-col items-center justify-center py-1 px-1 transition-all duration-150 active:scale-95 group focus:outline-none focus:bg-transparent active:bg-transparent bg-transparent border-0 outline-none"
            >
              {/* Icon Container - Pure Clean Icon Without Background Circle */}
              <div className="relative flex items-center justify-center bg-transparent">
                <Icon
                  className={clsx(
                    'w-4.5 h-4.5 sm:w-5 sm:h-5 transition-colors duration-200',
                    isActive ? 'text-[#0B5A54] stroke-[2.4]' : 'text-[#6B7280] stroke-[1.8] group-hover:text-[#0B5A54]'
                  )}
                />

                {item.isAi && !isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse ring-1 ring-white" />
                )}
              </div>

              {/* Text Label */}
              <span
                className={clsx(
                  'text-[9.5px] mt-0.5 font-heading transition-colors duration-150 tracking-tight truncate max-w-[58px]',
                  isActive ? 'font-extrabold text-[#0B5A54]' : 'font-semibold text-[#6B7280] group-hover:text-[#111827]'
                )}
              >
                {item.label}
              </span>

              {/* Active Indicator Dot Below Label */}
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[#0B5A54] mt-0.5 animate-in fade-in zoom-in-75" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
