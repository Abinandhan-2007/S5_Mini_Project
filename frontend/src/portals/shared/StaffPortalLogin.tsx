import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  ClipboardList,
  Stethoscope,
  Building2,
  CheckCircle2,
  KeyRound,
  X,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Activity,
  Heart,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { apiPost, apiFetch } from '../../lib/apiFetch';
import { CarePulseLogo } from '../../components/brand/CarePulseLogo';

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS (PATIENT APP CAREPULSE GREEN PALETTE)
// ─────────────────────────────────────────────────────────────────────────────
export const STAFF_THEME = {
  primary: '#0B5A54',
  primaryDark: '#08423D',
  primaryLight: '#0F766E',
  accent: '#14B8A6',
  accentCyan: '#2DD4BF',
  mint: '#E3F3F1',
  bgCanvas: '#F8FBFA',
  cardBg: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  error: '#DC2626',
  success: '#16A34A',
};

export const STAFF_ANIMATION_CONFIG = {
  introDurationMs: 2600,
  logoDelayMs: 400,
  transitionDurationMs: 700,
};

interface StaffPortalLoginProps {
  defaultRole?: 'admin' | 'receptionist' | 'doctor';
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 1: WELCOME SCREEN (FULL-SCREEN MULTI-COLOR MESH AURA)
// ─────────────────────────────────────────────────────────────────────────────
interface WelcomeOverlayProps {
  onDismiss: () => void;
}

const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({ onDismiss }) => {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFading(true);
    }, STAFF_ANIMATION_CONFIG.introDurationMs);

    return () => clearTimeout(timer);
  }, []);

  const handleAnimationEnd = () => {
    if (isFading) {
      onDismiss();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col justify-between items-center bg-[#F8FBFA] p-8 sm:p-12 select-none overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: isFading ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={handleAnimationEnd}
    >
      {/* Top Bar: Brand Logo & Status */}
      <div className="w-full max-w-6xl flex items-center justify-between relative z-20">
        <CarePulseLogo
          variant="horizontal"
          size="sm"
          theme="light"
          subtitle="Staff Workspace"
          subtitleClassName="text-slate-500 font-bold text-xs"
        />
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-[#0B5A54] text-xs font-semibold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>CarePulse v2.4</span>
        </div>
      </div>

      {/* ── Seamless Multi-Color Fluid Glowing Mesh Aura ── */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto w-full">
        <div className="relative flex items-center justify-center">
          {/* Breathing & rotating organic color aura */}
          <motion.div
            className="relative w-[360px] h-[360px] sm:w-[480px] sm:h-[480px] md:w-[560px] md:h-[560px] flex items-center justify-center"
            animate={
              isFading
                ? { scale: 1.3, opacity: 0, transition: { duration: 0.65 } }
                : { rotate: [0, 360], scale: [0.96, 1.05, 0.96] }
            }
            transition={{
              rotate: { duration: 24, repeat: Infinity, ease: 'linear' },
              scale: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            {/* 1. Golden Amber Glow (Top / Top-Left) */}
            <div
              className="absolute -top-8 left-14 w-60 h-60 sm:w-80 sm:h-80 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, #FBBF24 0%, #F59E0B 60%, transparent 100%)',
                filter: 'blur(60px)',
                opacity: 0.9,
              }}
            />

            {/* 2. Deep Patient App Green & Emerald Bloom (Center / Bottom) */}
            <div
              className="absolute top-12 left-10 w-64 h-64 sm:w-88 sm:h-88 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, #0B5A54 0%, #0F766E 55%, transparent 100%)',
                filter: 'blur(65px)',
                opacity: 0.95,
              }}
            />

            {/* 3. Vivid Mint & Spring Green Accent (Bottom-Left) */}
            <div
              className="absolute bottom-2 left-6 w-56 h-56 sm:w-76 sm:h-76 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, #10B981 0%, #059669 60%, transparent 100%)',
                filter: 'blur(60px)',
                opacity: 0.88,
              }}
            />

            {/* 4. Radiant Cyan & Sky Blue (Right Edge) */}
            <div
              className="absolute top-8 -right-4 w-60 h-60 sm:w-80 sm:h-80 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, #06B6D4 0%, #14B8A6 60%, transparent 100%)',
                filter: 'blur(65px)',
                opacity: 0.92,
              }}
            />

            {/* 5. Center Iridescent Melting Core */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 sm:w-72 sm:h-72 rounded-full pointer-events-none"
              style={{
                background:
                  'conic-gradient(from 180deg at 50% 50%, #0B5A54, #FBBF24, #06B6D4, #10B981, #0B5A54)',
                filter: 'blur(50px)',
                opacity: 0.85,
              }}
            />
          </motion.div>

          {/* Crisp, Bold "Welcome" Typography Centered on the Aura */}
          <motion.h1
            className="absolute z-20 text-6xl sm:text-7xl md:text-8xl font-black text-white tracking-tight font-heading drop-shadow-[0_4px_24px_rgba(8,66,61,0.4)] select-none pointer-events-none"
            initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
            animate={
              isFading
                ? { opacity: 0, y: -16, filter: 'blur(6px)', transition: { duration: 0.4 } }
                : { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8 } }
            }
          >
            Welcome
          </motion.h1>
        </div>
      </div>

      {/* Bottom Skip Control */}
      <div className="w-full flex justify-center relative z-20">
        <button
          type="button"
          onClick={() => setIsFading(true)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-4 py-1.5 rounded-full border border-slate-200/90 bg-white/80 hover:bg-white backdrop-blur-xs transition-all shadow-xs cursor-pointer active:scale-95"
        >
          Skip intro &rarr;
        </button>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 2: LEFT 50% FULL-SCREEN SHOWCASE PANEL (PATIENT APP GREEN PALETTE)
// ─────────────────────────────────────────────────────────────────────────────
interface ShowcasePanelProps {
  detectedRole: 'admin' | 'doctor' | 'receptionist' | null;
}

const CAROUSEL_SLIDES = [
  {
    tag: 'CLINICAL EXCELLENCE',
    title: 'Share your care with speed and compassion.',
    desc: 'Unified workspaces for hospital administrators, doctors, and triage receptionists.',
  },
  {
    tag: 'REAL-TIME TRIAGE',
    title: 'Instant token ticketing & live vitals.',
    desc: 'Seamless zero-wait patient routing with instant department synchronization.',
  },
  {
    tag: 'ENTERPRISE SECURITY',
    title: 'Role-based access & 256-bit protection.',
    desc: 'Strict compliance with healthcare data protection and patient confidentiality.',
  },
];

const ShowcasePanel: React.FC<ShowcasePanelProps> = ({ detectedRole }) => {
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-advance carousel every 4.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="w-full h-full min-h-screen flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative overflow-hidden select-none"
      style={{
        background: 'linear-gradient(150deg, #063834 0%, #0B5A54 50%, #0F766E 100%)',
      }}
    >
      {/* Precision Dot Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #FFFFFF 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Ambient background soft light accents in patient app teal */}
      <div
        className="absolute -top-24 -left-24 w-96 h-96 rounded-full pointer-events-none opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(45, 212, 191, 0.4) 0%, transparent 70%)',
          filter: 'blur(70px)',
        }}
      />
      <div
        className="absolute -bottom-24 -right-24 w-[450px] h-[450px] rounded-full pointer-events-none opacity-25"
        style={{
          background: 'radial-gradient(circle, #14B8A6 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Top Bar: Brand Logo */}
      <div className="relative z-10 flex items-center justify-between w-full">
        <CarePulseLogo
          variant="horizontal"
          size="sm"
          theme="dark"
          subtitle="Unified Staff Portal"
          subtitleClassName="text-teal-200/90 font-bold text-xs"
        />

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs font-semibold text-white">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Role Router Active</span>
        </div>
      </div>

      {/* ── Center: Dribbble Style Orbital Showcase ── */}
      <div className="relative z-10 my-auto py-10 flex flex-col items-center justify-center">
        <div className="relative w-72 h-64 sm:w-80 sm:h-72 flex items-center justify-center">
          {/* Subtle Orbital Ring Track */}
          <div className="absolute inset-2 rounded-full border border-teal-300/20 border-dashed pointer-events-none animate-spin-slow" />

          {/* Central Preview Card Tile */}
          <motion.div
            className="relative z-10 w-52 sm:w-60 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 shadow-2xl p-4 flex flex-col justify-between text-white"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-400/25 flex items-center justify-center border border-teal-300/30">
                  <Activity className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight">CarePulse Live</h4>
                  <p className="text-[10px] text-teal-200">OPD & Emergency</p>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>

            <div className="my-3 py-2 px-2.5 rounded-xl bg-black/20 border border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-teal-100">Patient Flow</span>
              <span className="font-bold text-emerald-300">99.4% On-Time</span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-teal-200">
              <span>Auto-routing active</span>
              <span className="font-mono font-bold text-white">256-bit AES</span>
            </div>
          </motion.div>

          {/* Orbit Node 1 (Top Left): Instant Triage */}
          <motion.div
            className="absolute -top-1 left-2 sm:left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-slate-800 text-xs font-bold shadow-lg border border-white/50"
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-[11px]">Instant Triage</span>
          </motion.div>

          {/* Orbit Node 2 (Top Right): Vital Sync */}
          <motion.div
            className="absolute top-2 -right-2 sm:-right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-slate-800 text-xs font-bold shadow-lg border border-white/50"
            animate={{ y: [4, -4, 4] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span className="text-[11px]">Vital Sync</span>
          </motion.div>

          {/* Orbit Node 3 (Bottom Left): Doctor Presets */}
          <motion.div
            className={`absolute bottom-3 -left-3 sm:-left-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg border transition-all ${detectedRole === 'doctor'
                ? 'bg-emerald-400 text-slate-900 border-white ring-2 ring-emerald-300'
                : 'bg-white text-slate-800 border-white/50'
              }`}
            animate={{ y: [-3, 3, -3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Stethoscope className="w-3.5 h-3.5 text-[#0B5A54]" />
            <span className="text-[11px]">Dr. Wilson · On Duty</span>
          </motion.div>

          {/* Orbit Node 4 (Bottom Right): Security Shield */}
          <motion.div
            className="absolute -bottom-2 right-4 sm:right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-slate-800 text-xs font-bold shadow-lg border border-white/50"
            animate={{ y: [3, -3, 3] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-[11px]">HIPAA Compliant</span>
          </motion.div>
        </div>
      </div>

      {/* ── Bottom Carousel: Headline, Description & Pagination Dots ── */}
      <div className="relative z-10 space-y-4 max-w-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="space-y-2"
          >
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-teal-200">
              {CAROUSEL_SLIDES[activeSlide].tag}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight font-heading">
              {CAROUSEL_SLIDES[activeSlide].title}
            </h3>
            <p className="text-xs sm:text-sm text-teal-100/80 font-normal leading-relaxed">
              {CAROUSEL_SLIDES[activeSlide].desc}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Pagination Dots */}
        <div className="flex items-center gap-2 pt-2">
          {CAROUSEL_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveSlide(idx)}
              className={`transition-all duration-300 rounded-full cursor-pointer ${activeSlide === idx
                  ? 'w-7 h-2 bg-white'
                  : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 2: RIGHT 50% FULL-SCREEN SAAS LOGIN FORM (PATIENT APP GREEN ACCENTS)
// ─────────────────────────────────────────────────────────────────────────────
interface LoginFormPanelProps {
  identifier: string;
  setIdentifier: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (fn: (prev: boolean) => boolean) => void;
  rememberDevice: boolean;
  setRememberDevice: (val: boolean) => void;
  isLoading: boolean;
  error: string | null;
  setError: (val: string | null) => void;
  shakeError: boolean;
  successInfo: { role: string; name: string } | null;
  handleLogin: (e: React.FormEvent) => void;
  onOpenForgotModal: () => void;
  onSelectPreset: (role: 'admin' | 'doctor' | 'receptionist') => void;
}

const LoginFormPanel: React.FC<LoginFormPanelProps> = ({
  identifier,
  setIdentifier,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  rememberDevice,
  setRememberDevice,
  isLoading,
  error,
  setError,
  shakeError,
  successInfo,
  handleLogin,
  onOpenForgotModal,
  onSelectPreset,
}) => {
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  const handleKeyModifier = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  return (
    <div className="w-full h-full min-h-screen flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-white select-none overflow-y-auto">
      <div className="max-w-md w-full mx-auto my-auto">
        {/* Header: Log In */}
        <div className="space-y-1.5 mb-8 text-left">
          <h2 className="text-3xl sm:text-[34px] font-black text-slate-900 tracking-tight font-heading">
            Log In
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Enter your credentials to access your hospital workspace.
          </p>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              role="alert"
              aria-live="assertive"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Feedback */}
        <AnimatePresence>
          {successInfo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 flex items-center gap-3 p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-[#0B5A54] text-xs font-bold"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="leading-tight">Welcome, {successInfo.name}!</p>
                <p className="text-[11px] font-medium text-teal-700 mt-0.5">
                  Routing to {successInfo.role.toUpperCase()} portal...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sign In Form */}
        <form onSubmit={handleLogin} className={`space-y-4 sm:space-y-5 ${shakeError ? 'animate-shake' : ''}`}>
          {/* Field 1: Username / Email */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="staff-username"
              className="block text-xs font-bold text-slate-700"
            >
              Username
            </label>
            <div className="relative group">
              <User className="w-4 h-4 text-slate-400 group-focus-within:text-[#0B5A54] absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none" />
              <input
                id="staff-username"
                type="text"
                required
                disabled={isLoading}
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. kmchadmin@gmail.com, doc, rec"
                className="w-full h-12 pl-10 pr-4 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:bg-white focus:border-[#0B5A54] focus:ring-4 focus:ring-[#14B8A6]/20 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Field 2: Password */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label
                htmlFor="staff-password"
                className="block text-xs font-bold text-slate-700"
              >
                Password
              </label>
              <button
                type="button"
                onClick={onOpenForgotModal}
                className="text-xs font-bold text-[#0B5A54] hover:text-[#08423D] hover:underline cursor-pointer transition-colors"
              >
                Forgot?
              </button>
            </div>
            <div className="relative group">
              <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-[#0B5A54] absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none" />
              <input
                id="staff-password"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLoading}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyModifier}
                onKeyUp={handleKeyModifier}
                placeholder="••••••••••••"
                className="w-full h-12 pl-10 pr-11 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:bg-white focus:border-[#0B5A54] focus:ring-4 focus:ring-[#14B8A6]/20 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Caps Lock Alert */}
            {isCapsLockOn && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Caps Lock is ON</span>
              </div>
            )}
          </div>

          {/* Remember this device */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#0B5A54] focus:ring-[#0B5A54]/25 cursor-pointer accent-[#0B5A54]"
              />
              <span className="text-xs font-semibold text-slate-600">
                Remember this device
              </span>
            </label>
          </div>

          {/* Submit CTA Button in Patient App Green Palette */}
          <button
            type="submit"
            disabled={isLoading || !!successInfo}
            className="w-full h-12 rounded-xl bg-[#0B5A54] hover:bg-[#08423D] text-white font-bold text-sm shadow-md hover:shadow-lg hover:shadow-teal-950/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Verifying credentials…</span>
              </div>
            ) : successInfo ? (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                <span>Redirecting…</span>
              </div>
            ) : (
              <>
                <span>Log In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* ── Role Preset Switcher in Patient App Teal Palette ── */}
        <div className="mt-7 space-y-3.5">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Quick Role Access
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => onSelectPreset('doctor')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0B5A54] border border-teal-200/80 text-xs font-bold transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            >
              <Stethoscope className="w-3.5 h-3.5 shrink-0 text-[#0B5A54]" />
              <span>Doctor</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectPreset('admin')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0B5A54] border border-teal-200/80 text-xs font-bold transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            >
              <Building2 className="w-3.5 h-3.5 shrink-0 text-[#0B5A54]" />
              <span>Admin</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectPreset('receptionist')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0B5A54] border border-teal-200/80 text-xs font-bold transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            >
              <ClipboardList className="w-3.5 h-3.5 shrink-0 text-[#0B5A54]" />
              <span>Reception</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Line */}
      <p className="text-center text-[11px] text-slate-400 font-medium pt-6 select-none">
        © CarePulse Health Systems · Secure Hospital Platform · v2.4
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FULL-SCREEN STAFF PORTAL LOGIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export const StaffPortalLogin: React.FC<StaffPortalLoginProps> = ({ defaultRole }) => {
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (
        sessionStorage.getItem('carepulse_staff_intro_seen') === 'true' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return false;
      }
    } catch {
      return false;
    }
    return true;
  });

  const [identifier, setIdentifier] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('carepulse_remembered_staff') || '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('carepulse_remember_device') === 'true';
      } catch {
        return true;
      }
    }
    return true;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ role: string; name: string } | null>(null);
  const [shakeError, setShakeError] = useState(false);
  const [showMobileRoles, setShowMobileRoles] = useState(false);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [resolvedResult, setResolvedResult] = useState<{
    staffName?: string;
    staffRole?: string;
    temporaryPassword?: string;
    resolvedAt?: string;
  } | null>(null);
  const [copiedTempPass, setCopiedTempPass] = useState(false);

  const doctors = useStaffStore((s) => s.doctors);
  const receptionists = useStaffStore((s) => s.receptionists);
  const adminProfile = useStaffStore((s) => s.adminProfile);
  const currentStaff = useStaffStore((s) => s.currentStaff);
  const setStaffAuth = useStaffStore((s) => s.setStaffAuth);
  const navigate = useNavigate();

  // If defaultRole was specified via props and identifier is blank, pre-fill
  useEffect(() => {
    if (defaultRole && !identifier) {
      if (defaultRole === 'doctor') {
        setIdentifier('doc@carepulse.com');
        setPassword('doc123');
      } else if (defaultRole === 'admin') {
        setIdentifier('kmchadmin@gmail.com');
        setPassword('Admin@123');
      } else if (defaultRole === 'receptionist') {
        setIdentifier('rec@carepulse.com');
        setPassword('password123');
      }
    }
  }, [defaultRole]);

  // Redirect if already authenticated
  useEffect(() => {
    if (currentStaff) {
      if (currentStaff.role === 'doctor') navigate('/doctor', { replace: true });
      else if (currentStaff.role === 'receptionist') navigate('/receptionist', { replace: true });
      else if (currentStaff.role === 'admin') navigate('/admin', { replace: true });
      else if (currentStaff.role === 'nurse') navigate('/nurse', { replace: true });
      else if (currentStaff.role === 'superadmin') navigate('/superadmin', { replace: true });
    }
  }, [currentStaff, navigate]);

  // Determine role pattern match from username for real-time highlighting
  const getDetectedRole = (idStr: string): 'admin' | 'doctor' | 'receptionist' | null => {
    const clean = idStr.trim().toLowerCase();
    if (!clean) return null;
    if (
      clean.includes('admin') ||
      clean.includes('bag') ||
      clean.startsWith('a00') ||
      clean.includes('superadmin') ||
      clean.startsWith('sa')
    ) {
      return 'admin';
    }
    if (
      clean.includes('doc') ||
      clean.includes('dr') ||
      clean.startsWith('d00') ||
      clean.includes('wilson') ||
      clean.includes('cardio')
    ) {
      return 'doctor';
    }
    if (
      clean.includes('rec') ||
      clean.includes('rep') ||
      clean.startsWith('r00') ||
      clean.includes('front') ||
      clean.includes('desk')
    ) {
      return 'receptionist';
    }
    return null;
  };

  const detectedRole = successInfo
    ? (successInfo.role as 'admin' | 'doctor' | 'receptionist')
    : getDetectedRole(identifier);

  const triggerShake = () => {
    setShakeError(true);
    setTimeout(() => setShakeError(false), 500);
  };

  // Quick Preset Role Handler
  const handleSelectPreset = (role: 'admin' | 'doctor' | 'receptionist') => {
    setError(null);
    if (role === 'doctor') {
      setIdentifier('doc@carepulse.com');
      setPassword('doc123');
    } else if (role === 'admin') {
      setIdentifier('kmchadmin@gmail.com');
      setPassword('Admin@123');
    } else if (role === 'receptionist') {
      setIdentifier('rec@carepulse.com');
      setPassword('password123');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const cleanId = identifier.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Persist remembered username
    try {
      if (rememberDevice) {
        localStorage.setItem('carepulse_remember_device', 'true');
        localStorage.setItem('carepulse_remembered_staff', identifier.trim());
      } else {
        localStorage.removeItem('carepulse_remember_device');
        localStorage.removeItem('carepulse_remembered_staff');
      }
    } catch { }

    let serverError: string | null = null;
    try {
      // 1. Attempt API backend staff login
      const res = await apiPost('/staff/login', {
        email: cleanId,
        username: cleanId,
        identifier: cleanId,
        password: cleanPassword,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.staff) {
          const userRole = data.staff.role;
          // Guard: SuperAdmin accounts are not allowed in Staff Login
          if (userRole === 'superadmin') {
            setError('SuperAdmin accounts cannot sign in through the Staff Portal. Please use the SuperAdmin Console (/superadmin/login).');
            triggerShake();
            setIsLoading(false);
            return;
          }
          if (!['admin', 'doctor', 'receptionist', 'nurse'].includes(userRole)) {
            setError('Access restricted to authorized hospital staff only.');
            triggerShake();
            setIsLoading(false);
            return;
          }
          const hospId = data.staff.hospitalId || data.staff.hospital_id;
          const hospName = data.staff.hospitalName || data.staff.hospital_name || 'CarePulse Medical Center';
          setStaffAuth(
            {
              id: data.staff.id,
              name: data.staff.name,
              email: data.staff.email,
              role: userRole,
              department: data.staff.department,
              avatarUrl: data.staff.avatarUrl,
              hospitalId: hospId,
              hospital_id: hospId,
              hospitalName: hospName,
              hospital_name: hospName,
              doctorId: data.staff.doctorId || data.staff.doctor_id,
              doctor_id: data.staff.doctor_id || data.staff.doctorId,
              staff_code: data.staff.staff_code || data.staff.staffCode,
              staffCode: data.staff.staffCode || data.staff.staff_code,
              phone: data.staff.phone,
            },
            data.token
          );
          setIsLoading(false);
          setSuccessInfo({ role: userRole, name: data.staff.name || 'Staff Member' });
          setTimeout(() => {
            if (userRole === 'admin') navigate('/admin');
            else if (userRole === 'doctor') navigate('/doctor');
            else if (userRole === 'nurse') navigate('/nurse');
            else navigate('/receptionist');
          }, 650);
          return;
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData && (errData.detail || errData.error)) {
          serverError = errData.detail || errData.error;
        }
      }
    } catch {
      // Continue to local verification
    }

    // 2. Guard: SuperAdmin Accounts must use the dedicated SuperAdmin Console
    if (
      cleanId === 'superadmin' ||
      cleanId === 'superadmin@carepulse.com' ||
      cleanId === 'sa101' ||
      cleanId === 'sa'
    ) {
      setError('SuperAdmin accounts cannot sign in through the Staff Portal. Please use the SuperAdmin Console (/superadmin/login).');
      triggerShake();
      setIsLoading(false);
      return;
    }

    // Guard: Patient Accounts must use the Patient App
    if (
      cleanId === 'sarah' ||
      cleanId === 'sarah jenkins' ||
      cleanId === 'sarah.j@carepulse.com' ||
      cleanId === 'sarah.jenkins@example.com' ||
      cleanId === '+91 98765 43210' ||
      cleanId === '9876543210'
    ) {
      setError('Patient accounts cannot sign in through the Staff Portal. Please use the Patient App.');
      triggerShake();
      setIsLoading(false);
      return;
    }

    // 3. Check Admin Credentials (Username or Email)
    const adminEmail = (adminProfile.email || 'admin@carepulse.com').toLowerCase();
    const adminPass = adminProfile.password || 'Admin@123';
    const adminUser = (adminProfile.username || 'admin').toLowerCase();

    if (
      (cleanId === 'admin' ||
        cleanId === 'bag' ||
        cleanId === 'bag@carepulse.com' ||
        cleanId === 'a001101' ||
        cleanId === 'kmchadmin@gmail.com' ||
        cleanId === adminEmail ||
        cleanId === adminUser ||
        cleanId === 'admin@carepulse.com') &&
      (cleanPassword === adminPass ||
        cleanPassword === 'bitsathy' ||
        cleanPassword === 'Admin@123' ||
        cleanPassword === 'admin123' ||
        cleanPassword === 'admin')
    ) {
      const isBag = cleanId === 'bag' || cleanId === 'bag@carepulse.com' || cleanPassword === 'bitsathy';
      setStaffAuth(
        {
          id: isBag ? 'admin-bag' : 'admin-1',
          name: isBag ? 'BAG Hospital Administrator' : (adminProfile.name || 'Hospital Administrator'),
          email: isBag ? 'bag@carepulse.com' : (adminProfile.email || 'admin@carepulse.com'),
          role: 'admin',
          department: isBag ? 'Hospital Administration & Operations' : 'Chief Medical Administration',
          hospitalId: isBag ? 'hosp-bag' : undefined,
          hospital_id: isBag ? 'hosp-bag' : undefined,
        },
        'token-admin-session'
      );
      setIsLoading(false);
      setSuccessInfo({ role: 'admin', name: isBag ? 'BAG Administrator' : 'Hospital Administrator' });
      setTimeout(() => navigate('/admin'), 650);
      return;
    }

    // 4. Check Doctor Credentials
    const matchedDoc = doctors.find(
      (d) =>
        (d.email && d.email.toLowerCase() === cleanId) ||
        (d.username && d.username.toLowerCase() === cleanId) ||
        (d.email && d.email.toLowerCase().split('@')[0] === cleanId) ||
        (d.staff_code && d.staff_code.toLowerCase() === cleanId) ||
        (d.staffCode && d.staffCode.toLowerCase() === cleanId) ||
        (d.id && d.id.toLowerCase() === cleanId)
    );
    if (
      (matchedDoc && cleanPassword === (matchedDoc.password || 'doc123')) ||
      ((cleanId === 'doc' || cleanId === 'doc@carepulse.com' || cleanId === 'doctor' || cleanId === 'doctor@carepulse.com' || cleanId === 'd001101' || cleanId === 'doc-1') &&
        (cleanPassword === 'doc123' || cleanPassword === 'bitsathy' || cleanPassword === 'Doctor@123' || cleanPassword === 'doctor'))
    ) {
      const doc = matchedDoc || {
        id: 'doc-1',
        name: 'Dr. Olivia Wilson',
        email: 'doc@carepulse.com',
        department: 'Cardiology',
        photo: '/doctor_default.jpg',
        hospital_id: 'hosp-bag',
        staff_code: 'D001101',
      };
      const hospId = (doc as any).hospital_id || (doc as any).hospitalId || 'hosp-bag';
      setStaffAuth(
        {
          id: doc.id,
          name: doc.name,
          email: doc.email,
          role: 'doctor',
          department: doc.department,
          avatarUrl: (doc as any).photo || (doc as any).avatarUrl,
          hospitalId: hospId,
          hospital_id: hospId,
          doctorId: doc.id,
          doctor_id: doc.id,
          staff_code: (doc as any).staff_code || (doc as any).staffCode || 'D001101',
          staffCode: (doc as any).staffCode || (doc as any).staff_code || 'D001101',
        },
        `token-doctor-${doc.id}`
      );
      setIsLoading(false);
      setSuccessInfo({ role: 'doctor', name: doc.name });
      setTimeout(() => navigate('/doctor'), 650);
      return;
    }

    // 5. Check Receptionist Credentials
    const matchedRec = receptionists.find(
      (r) =>
        (r.email && r.email.toLowerCase() === cleanId) ||
        (r.username && r.username.toLowerCase() === cleanId) ||
        (r.email && r.email.toLowerCase().split('@')[0] === cleanId) ||
        (r.staff_code && r.staff_code.toLowerCase() === cleanId) ||
        (r.staffCode && r.staffCode.toLowerCase() === cleanId) ||
        (r.id && r.id.toLowerCase() === cleanId)
    );
    if (
      (matchedRec && cleanPassword === (matchedRec.password || 'password123')) ||
      ((cleanId === 'rec' || cleanId === 'rec@carepulse.com' || cleanId === 'receptionist' || cleanId === 'receptionist@carepulse.com' || cleanId === 'rep1' || cleanId === 'rep1@carepulse.com' || cleanId === 'r001101' || cleanId === 'rec-1') &&
        (cleanPassword === 'password123' || cleanPassword === 'bitsathy' || cleanPassword === 'rep123' || cleanPassword === 'receptionist'))
    ) {
      const rec = matchedRec || {
        id: 'rec-1',
        name: 'Front Desk Receptionist',
        email: 'rec@carepulse.com',
        department: 'Front Desk & Registrations',
        hospital_id: 'hosp-bag',
        hospital_name: 'BAG Hospital',
        hospitalName: 'BAG Hospital',
        staff_code: 'R001101',
      };
      const hospId = (rec as any).hospital_id || (rec as any).hospitalId || 'hosp-bag';
      const hospName = (rec as any).hospitalName || (rec as any).hospital_name || 'BAG Hospital';
      setStaffAuth(
        {
          id: rec.id,
          name: rec.name,
          email: rec.email,
          role: 'receptionist',
          department: rec.department,
          hospitalId: hospId,
          hospital_id: hospId,
          hospitalName: hospName,
          hospital_name: hospName,
          staff_code: (rec as any).staff_code || (rec as any).staffCode || 'R001101',
          staffCode: (rec as any).staffCode || (rec as any).staff_code || 'R001101',
        },
        `token-receptionist-${rec.id}`
      );
      setIsLoading(false);
      setSuccessInfo({ role: 'receptionist', name: rec.name });
      setTimeout(() => navigate('/receptionist'), 650);
      return;
    }

    // 6. Check Nurse Credentials
    if (
      (cleanId === 'nurse' || cleanId === 'nurse@carepulse.com' || cleanId.startsWith('n00') || cleanId === 'sarah') &&
      (cleanPassword === 'Nurse@123' || cleanPassword === 'nurse123' || cleanPassword === 'nurse')
    ) {
      setStaffAuth(
        {
          id: 'nurse-bag-1',
          name: 'Nurse Sarah Jenkins',
          email: 'nurse@carepulse.com',
          role: 'nurse',
          department: 'Triage & Patient Vitals',
          hospitalId: 'hosp-bag',
          hospital_id: 'hosp-bag',
          staff_code: 'N007101',
          staffCode: 'N007101',
        },
        'token-nurse-session'
      );
      setIsLoading(false);
      setSuccessInfo({ role: 'nurse', name: 'Nurse Sarah Jenkins' });
      setTimeout(() => navigate('/nurse'), 650);
      return;
    }

    setError(serverError || 'Invalid username or password. Please verify your credentials.');
    setIsLoading(false);
    triggerShake();
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const idClean = forgotIdentifier.trim();
    if (!idClean) return;

    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccessMessage(null);
    setResolvedResult(null);
    setPendingNotice(null);

    try {
      const res = await apiPost('/staff/forgot-password', {
        identifier: idClean,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForgotSuccessMessage(
          data.message ||
          `Assistance ticket #${data.requestId} has been logged! Your Hospital Administrator received an urgent security notification.`
        );
        setPendingNotice(
          'Your ticket is now queued in the Hospital Admin portal. Once the administrator approves it, click "Check Reset Status" below to get your temporary password.'
        );
      } else {
        setForgotError(
          data.detail ||
          data.message ||
          'No matching staff account found. Please check your username or work email.'
        );
      }
    } catch (err: any) {
      setForgotError(err.message || 'Unable to communicate with the authentication server.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    const idClean = forgotIdentifier.trim();
    if (!idClean) {
      setForgotError('Please enter your username or work email to check reset status.');
      return;
    }

    setCheckingStatus(true);
    setForgotError(null);
    try {
      const res = await apiFetch(
        `/staff/forgot-password/status?identifier=${encodeURIComponent(idClean)}`
      );
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.status === 'Resolved') {
          setResolvedResult({
            staffName: data.staffName,
            staffRole: data.staffRole,
            temporaryPassword: data.temporaryPassword || 'CarePulse#2026',
            resolvedAt: data.resolvedAt,
          });
          setForgotSuccessMessage('Password reset approved by Hospital Administrator!');
          setPendingNotice(null);
        } else {
          setResolvedResult(null);
          setPendingNotice(
            `Ticket status: Pending review by Hospital Administrator. Submitted: ${data.createdAt || 'recently'}. Please ask your on-duty Admin or check again shortly.`
          );
        }
      } else {
        setForgotError(data.detail || 'No active reset request found for this account.');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Unable to check reset ticket status.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleApplyTemporaryPassword = () => {
    if (resolvedResult?.temporaryPassword) {
      setIdentifier(forgotIdentifier.trim());
      setPassword(resolvedResult.temporaryPassword);
      setIsForgotModalOpen(false);
    }
  };

  const handleCopyTempPassword = () => {
    if (resolvedResult?.temporaryPassword) {
      navigator.clipboard.writeText(resolvedResult.temporaryPassword);
      setCopiedTempPass(true);
      setTimeout(() => setCopiedTempPass(false), 2000);
    }
  };

  const onIntroComplete = () => {
    try {
      sessionStorage.setItem('carepulse_staff_intro_seen', 'true');
    } catch { }
    setShowIntro(false);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col font-sans bg-white text-slate-900 selection:bg-[#0B5A54] selection:text-white relative overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────────
          STAGE 1: FULL-SCREEN WELCOME INTRO OVERLAY
      ───────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showIntro && <WelcomeOverlay onDismiss={onIntroComplete} />}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────
          STAGE 2: FULL SCREEN 50% / 50% SPLIT-SCREEN LAYOUT
      ───────────────────────────────────────────────────────────────── */}
      {/* Mobile Collapsed Top Header (< 1024px) */}
      <div className="lg:hidden w-full bg-[#063834] px-5 py-4 flex items-center justify-between text-white shrink-0 border-b border-teal-900/40">
        <CarePulseLogo
          variant="horizontal"
          size="sm"
          theme="dark"
          subtitle="Staff Portal"
          subtitleClassName="text-teal-200/90 font-bold text-[10px]"
        />

        <button
          type="button"
          onClick={() => setShowMobileRoles((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 transition-colors cursor-pointer"
        >
          <span>Staff Roles</span>
          {showMobileRoles ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Collapsed Mobile Roles Drawer */}
      <AnimatePresence>
        {showMobileRoles && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#0B5A54] px-5 py-3 border-b border-teal-800/80 space-y-2 overflow-hidden text-left shrink-0 text-white"
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              <Building2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Admin: kmchadmin@gmail.com / Admin@123</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold">
              <Stethoscope className="w-4 h-4 text-teal-300 shrink-0" />
              <span>Doctor: doc@carepulse.com / doc123</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold">
              <ClipboardList className="w-4 h-4 text-cyan-300 shrink-0" />
              <span>Receptionist: rec@carepulse.com / password123</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edge-to-Edge Full Screen 50% / 50% Split */}
      <div className="flex-1 flex flex-col lg:flex-row w-full min-h-screen min-h-[100dvh]">
        {/* LEFT 50%: Patient App Green Showcase Panel */}
        <div className="hidden lg:flex lg:w-1/2 min-h-screen">
          <ShowcasePanel detectedRole={detectedRole} />
        </div>

        {/* RIGHT 50%: Clean SaaS Login Form Panel */}
        <div className="w-full lg:w-1/2 min-h-screen flex flex-col">
          <LoginFormPanel
            identifier={identifier}
            setIdentifier={setIdentifier}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            rememberDevice={rememberDevice}
            setRememberDevice={setRememberDevice}
            isLoading={isLoading}
            error={error}
            setError={setError}
            shakeError={shakeError}
            successInfo={successInfo}
            handleLogin={handleLogin}
            onOpenForgotModal={() => {
              setForgotIdentifier(identifier);
              setIsForgotModalOpen(true);
            }}
            onSelectPreset={handleSelectPreset}
          />

        </div >
      </div >

  {/* ─────────────────────────────────────────────────────────────────
          FORGOT PASSWORD ASSISTANCE MODAL
      ───────────────────────────────────────────────────────────────── */}
  <AnimatePresence>
{
  isForgotModalOpen && (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <motion.div
        className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-4"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0B5A54] flex items-center justify-center border border-teal-100">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 font-heading">
                Staff Password Assistance
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Admin-verified ticket assistance workflow
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsForgotModalOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resolved Credentials Card */}
        {resolvedResult ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Your Administrator approved temporary access!</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200/80 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Temporary Password
                </p>
                <p className="font-mono font-bold text-xs sm:text-sm text-slate-900 mt-0.5">
                  {resolvedResult.temporaryPassword}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyTempPassword}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedTempPass ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleApplyTemporaryPassword}
              className="w-full h-11 rounded-xl bg-[#0B5A54] hover:bg-[#08423D] text-white text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Auto-Fill Credentials & Sign In</span>
            </button>
          </div>
        ) : null}

        {/* Status Notices */}
        {forgotSuccessMessage && !resolvedResult && (
          <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-medium flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0B5A54] shrink-0 mt-0.5" />
            <span>{forgotSuccessMessage}</span>
          </div>
        )}

        {pendingNotice && !resolvedResult && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{pendingNotice}</span>
          </div>
        )}

        {forgotError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{forgotError}</span>
          </div>
        )}

        {/* Action Form */}
        <form onSubmit={handleForgotSubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1 text-left">
            <label className="text-slate-700 font-bold block text-[11px]">
              Staff Username, Work Email, or Staff ID
            </label>
            <input
              type="text"
              required
              value={forgotIdentifier}
              onChange={(e) => {
                setForgotIdentifier(e.target.value);
                setForgotError(null);
              }}
              placeholder="e.g. kmchadmin@gmail.com, D001101, doc"
              className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0B5A54] focus:bg-white transition-all"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={forgotLoading}
              className="flex-1 h-11 rounded-xl bg-[#0B5A54] hover:bg-[#08423D] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
            >
              {forgotLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Log Reset Ticket'
              )}
            </button>

            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={checkingStatus}
              className="px-3.5 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
            >
              {checkingStatus ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Check Status</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
      </AnimatePresence >
    </div >
  );
};

export default StaffPortalLogin;
