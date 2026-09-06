import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SmartMedicineLensCardProps {
  onScan?: () => void;
  className?: string;
}

export const SmartMedicineLensCard: React.FC<SmartMedicineLensCardProps> = ({
  onScan,
  className = '',
}) => {
  const navigate = useNavigate();

  const handleLaunchScanner = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onScan) {
      onScan();
    } else {
      navigate('/prescriptions/scan');
    }
  };

  return (
    <div
      onClick={handleLaunchScanner}
      role="button"
      tabIndex={0}
      className={`
        relative overflow-hidden cursor-pointer group select-none
        rounded-[24px] p-5 sm:p-5.5
        bg-[linear-gradient(135deg,#042824_0%,#0B5A54_55%,#064e45_100%)]
        text-white border border-teal-400/30
        shadow-[0_10px_30px_rgba(4,40,36,0.3)]
        hover:shadow-[0_14px_35px_rgba(20,184,166,0.25)]
        hover:border-teal-300/50
        transition-all duration-300 ease-out active:scale-[0.99]
        flex flex-col justify-between min-h-[140px]
        ${className}
      `}
    >
      {/* Background Ambient Glowing Backlights */}
      <div className="absolute inset-0 bg-[radial-gradient(#14B8A6_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
      <div className="absolute right-4 -bottom-6 w-48 h-48 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none group-hover:bg-emerald-400/35 transition-all duration-500" />
      <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-teal-500/15 blur-2xl pointer-events-none" />

      {/* 3D Floating Glass Medicine Capsule Background Artwork on Right */}
      <div className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-32 h-32 sm:w-36 sm:h-36 pointer-events-none select-none">
        <svg
          viewBox="0 0 120 120"
          fill="none"
          className="w-full h-full transform group-hover:scale-105 transition-transform duration-700 ease-out"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Capsule Top Half Mint Glass Gradient */}
            <linearGradient id="glassPillMint" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#A7F3D0" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#34D399" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.9" />
            </linearGradient>

            {/* Capsule Bottom Half Cyan Glass Gradient */}
            <linearGradient id="glassPillCyan" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#0EA5E9" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0369A1" stopOpacity="0.8" />
            </linearGradient>

            {/* Ambient Radial Core Glow */}
            <radialGradient id="opticCoreGlow" cx="60" cy="60" r="45" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34D399" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#14B8A6" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0B5A54" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ambient Optical Glow Halo */}
          <circle cx="60" cy="60" r="48" fill="url(#opticCoreGlow)" />

          {/* Live Circling Outer Halo Ring (Clockwise) */}
          <g className="origin-[60px_60px] animate-[spin_10s_linear_infinite]">
            <circle cx="60" cy="60" r="46" stroke="#2DD4BF" strokeWidth="1" strokeDasharray="6 8" opacity="0.4" />
            {/* Orbiting Satellite Glowing Nodes */}
            <circle cx="60" cy="14" r="2" fill="#6EE7B7" />
            <circle cx="60" cy="106" r="1.5" fill="#38BDF8" />
          </g>

          {/* Live Circling Inner Precision Ring (Counter-Clockwise) */}
          <g className="origin-[60px_60px] animate-[spin_16s_linear_infinite_reverse]">
            <circle cx="60" cy="60" r="36" stroke="#34D399" strokeWidth="0.8" strokeDasharray="3 5" opacity="0.35" />
            <circle cx="96" cy="60" r="1.8" fill="#A7F3D0" />
            <circle cx="24" cy="60" r="1.2" fill="#2DD4BF" />
          </g>

          {/* 3D Floating Glass Capsule (Tilted 38°) */}
          <g transform="rotate(-38 60 60)">
            {/* Capsule Drop Shadow Glow */}
            <rect x="44" y="24" width="32" height="72" rx="16" fill="#042824" fillOpacity="0.4" />

            {/* Top Half of Capsule (Luminous Mint Glass) */}
            <path
              d="M 44 40 C 44 31.1634 51.1634 24 60 24 C 68.8366 24 76 31.1634 76 40 V 60 H 44 V 40 Z"
              fill="url(#glassPillMint)"
              stroke="#A7F3D0"
              strokeWidth="1.5"
            />

            {/* Bottom Half of Capsule (Translucent Cyan Glass) */}
            <path
              d="M 44 60 H 76 V 80 C 76 88.8366 68.8366 96 60 96 C 51.1634 96 44 88.8366 44 80 V 60 Z"
              fill="url(#glassPillCyan)"
              stroke="#7DD3FC"
              strokeWidth="1.5"
            />

            {/* Capsule Center Divider Ring */}
            <line x1="43" y1="60" x2="77" y2="60" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.95" />

            {/* Top Specular Curved Glass Reflection */}
            <path
              d="M 49 32 C 52 28 57 27 63 27"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* Vertical Specular Glass Highlight Glint */}
            <line x1="49" y1="36" x2="49" y2="82" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
          </g>

          {/* Subtle Ambient Light Particles */}
          <circle cx="28" cy="46" r="1.5" fill="#6EE7B7" opacity="0.6" />
          <circle cx="92" cy="74" r="1.5" fill="#38BDF8" opacity="0.6" />
          <circle cx="86" cy="38" r="1.2" fill="#A7F3D0" opacity="0.4" />
        </svg>
      </div>

      {/* Top Header Row */}
      <div className="relative z-10 space-y-0.5 text-left">
        <h3 className="text-lg sm:text-[19px] font-black font-heading text-white tracking-tight leading-snug">
          Smart Medicine Lens
        </h3>
        <p className="text-xs sm:text-[12.5px] text-white/75 font-medium leading-tight">
          Scan any medicine — get instant info
        </p>
      </div>

      {/* Bottom Action Row - Centered Open Button */}
      <div className="relative z-10 pt-3 flex justify-center items-center">
        <button
          type="button"
          onClick={handleLaunchScanner}
          className="
            py-2 px-6 rounded-full
            bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-300
            text-[#042824] font-black text-xs sm:text-[13px] tracking-wide
            shadow-[0_0_18px_rgba(52,211,153,0.35)]
            hover:shadow-[0_0_25px_rgba(52,211,153,0.6)]
            group-hover:scale-[1.03] active:scale-[0.96]
            transition-all duration-200 cursor-pointer
          "
        >
          <span className="font-heading">Open</span>
        </button>
      </div>
    </div>
  );
};
