import React from 'react';

export interface CarePulseLogoProps {
  variant?: 'horizontal' | 'icon' | 'stacked';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'dark' | 'auto';
  subtitle?: string;
  subtitleClassName?: string;
  badge?: string;
  className?: string;
  onClick?: () => void;
}

export const CarePulseLogo: React.FC<CarePulseLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  theme = 'auto',
  subtitle = 'Empathetic Healthcare',
  subtitleClassName,
  badge,
  className = '',
  onClick,
}) => {
  // Dimension maps based on size prop
  const markDimensions = {
    xs: { w: 26, h: 26, markScale: 'w-6.5 h-6.5' },
    sm: { w: 34, h: 34, markScale: 'w-8 h-8' },
    md: { w: 42, h: 42, markScale: 'w-10 h-10' },
    lg: { w: 54, h: 54, markScale: 'w-14 h-14' },
    xl: { w: 72, h: 72, markScale: 'w-18 h-18' },
  }[size];

  const titleSizes = {
    xs: 'text-sm font-black tracking-tight',
    sm: 'text-base font-black tracking-tight',
    md: 'text-lg sm:text-xl font-black tracking-tight',
    lg: 'text-2xl sm:text-3xl font-black tracking-tight',
    xl: 'text-3xl sm:text-4xl font-black tracking-tight',
  }[size];

  const subSizes = {
    xs: 'text-[9px]',
    sm: 'text-[10px]',
    md: 'text-[11px]',
    lg: 'text-xs',
    xl: 'text-sm',
  }[size];

  // Theme color definitions
  const isDark = theme === 'dark';
  const titleColor = isDark ? 'text-white' : 'text-slate-900';
  const subtitleColor = isDark ? 'text-teal-200/90' : 'text-slate-500';
  const badgeClasses = isDark
    ? 'bg-teal-900/60 border-teal-500/40 text-teal-200'
    : 'bg-teal-50/90 border-teal-200 text-[#0B5A54]';

  // Standalone hospital medical emblem (official high-res 3D brand asset with resilient SVG fallback)
  const LogoMark = (
    <div
      className="relative flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 select-none"
      style={{ width: markDimensions.w, height: markDimensions.h }}
    >
      <img
        src="/logo-icon.png"
        alt="CarePulse Logo"
        className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(11,90,84,0.18)]"
        onError={(e) => {
          const imgEl = e.currentTarget;
          imgEl.style.display = 'none';
          const fallback = imgEl.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = 'block';
        }}
      />
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full hidden"
      >
        <rect width="100" height="100" rx="24" fill="#FFFFFF" />
        <g transform="translate(6, 11) scale(0.88)">
          {/* Left Wing */}
          <path
            d="M12,40 C12,28 20,24 28,24 L28,78 C20,78 12,72 12,62 Z"
            fill="#0A4D46"
          />
          <rect x="16" y="38" width="8" height="9" rx="2.5" fill="#D1FAE5" />
          <rect x="16" y="52" width="8" height="9" rx="2.5" fill="#D1FAE5" />

          {/* Right Wing */}
          <path
            d="M72,24 C80,24 88,28 88,40 L88,62 C88,72 80,78 72,78 Z"
            fill="#0A4D46"
          />
          <rect x="76" y="38" width="8" height="9" rx="2.5" fill="#D1FAE5" />
          <rect x="76" y="52" width="8" height="9" rx="2.5" fill="#D1FAE5" />

          {/* Center Main Building Pavilion */}
          <path
            d="M26,28 C26,15 36,11 50,11 C64,11 74,15 74,28 L74,80 C74,80 62,80 58,80 C58,66 56,58 50,58 C44,58 42,66 42,80 L26,80 Z"
            fill="#0B5A54"
          />

          {/* Top-Left Accent Dot */}
          <circle cx="34.5" cy="22" r="3.2" fill="#A7F3D0" />

          {/* Luminous Medical Cross */}
          <path
            d="M46.5,18 L53.5,18 L53.5,23.5 L59,23.5 L59,28.5 L53.5,28.5 L53.5,34 L46.5,34 L46.5,28.5 L41,28.5 L41,23.5 L46.5,23.5 Z"
            fill="#FFFFFF"
          />

          {/* Windows */}
          <rect x="31" y="38" width="10.5" height="9" rx="2.5" fill="#FFFFFF" />
          <rect x="58.5" y="38" width="10.5" height="9" rx="2.5" fill="#FFFFFF" />
          <rect x="31" y="52" width="10.5" height="9" rx="2.5" fill="#FFFFFF" />
          <rect x="58.5" y="52" width="10.5" height="9" rx="2.5" fill="#FFFFFF" />

          {/* Arched Entrance Portal Double-Door */}
          <path
            d="M42.5,80 C42.5,67 45.5,59.5 50,59.5 C54.5,59.5 57.5,67 57.5,80"
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            opacity="0.9"
          />
          <line x1="50" y1="60" x2="50" y2="80" stroke="#10B981" strokeWidth="1.5" opacity="0.8" />
        </g>
      </svg>
    </div>
  );

  if (variant === 'icon') {
    return (
      <div
        className={`inline-flex items-center justify-center cursor-pointer ${className}`}
        onClick={onClick}
        title="CarePulse"
      >
        {LogoMark}
      </div>
    );
  }

  if (variant === 'stacked') {
    return (
      <div
        className={`flex flex-col items-center text-center group cursor-pointer ${className}`}
        onClick={onClick}
      >
        <div
          className={`mb-2.5 p-1 rounded-2xl shrink-0 transition-transform group-hover:scale-105 ${
            isDark
              ? 'bg-white shadow-md border border-white/60 ring-2 ring-teal-400/30'
              : 'bg-white shadow-xs border border-slate-200/90 ring-2 ring-teal-50/80'
          }`}
        >
          {LogoMark}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`font-heading font-black tracking-tight ${titleSizes} ${titleColor}`}>
            CAREPULSE
          </span>
          {badge && (
            <span className={`px-2 py-0.5 text-[9px] uppercase font-black tracking-wider rounded-full border shadow-2xs ${badgeClasses}`}>
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className={`font-semibold tracking-wide ${subSizes} ${subtitleColor}`}>
            {subtitle}
          </p>
        )}
      </div>
    );
  }

  // Default: variant === 'horizontal'
  // [Hospital Mark on Left] + [Text "CAREPULSE" on Right]
  return (
    <div
      className={`inline-flex items-center gap-3 group select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div
        className={`p-1 rounded-2xl shrink-0 transition-transform group-hover:scale-105 ${
          isDark
            ? 'bg-white shadow-md border border-white/60 ring-2 ring-teal-400/30'
            : 'bg-white shadow-xs border border-slate-200/90 ring-2 ring-teal-50/80'
        }`}
      >
        {LogoMark}
      </div>

      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-2 leading-none">
          <span className={`font-heading font-black tracking-tight ${titleSizes} ${titleColor}`}>
            CAREPULSE
          </span>
          {badge && (
            <span
              className={`px-2 py-0.5 text-[9.5px] uppercase font-black tracking-wider rounded-full border shadow-2xs shrink-0 ${badgeClasses}`}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className={`tracking-normal mt-0.5 truncate ${subSizes} ${subtitleClassName || `${subtitleColor} font-bold`}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default CarePulseLogo;
