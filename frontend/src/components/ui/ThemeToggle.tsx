import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../lib/theme';

interface ThemeToggleProps {
  /** 'icon' = icon-only square button, 'pill' = label + icon pill */
  variant?: 'icon' | 'pill';
  className?: string;
}

/**
 * ThemeToggle — universal dark/light mode toggle button.
 * Used in all staff portal top-bars and the patient app's settings.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'icon', className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  if (variant === 'pill') {
    return (
      <button
        onClick={toggleTheme}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none
          ${isDark
            ? 'bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          } ${className}`}
      >
        {isDark ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Light Mode</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-slate-500" />
            <span>Dark Mode</span>
          </>
        )}
      </button>
    );
  }

  // Default: icon-only compact button
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all cursor-pointer select-none
        ${isDark
          ? 'bg-slate-700 border-slate-600 text-amber-400 hover:bg-slate-600'
          : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
        } ${className}`}
    >
      {isDark
        ? <Sun className="w-4 h-4" />
        : <Moon className="w-4 h-4" />
      }
    </button>
  );
};
