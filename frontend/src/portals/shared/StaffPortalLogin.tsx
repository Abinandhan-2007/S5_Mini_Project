import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
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
  Zap,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { apiPost, apiFetch } from '../../lib/apiFetch';
import { CarePulseLogo } from '../../components/brand/CarePulseLogo';

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS & CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
export const STAFF_THEME = {
  primary: '#0B5A54',
  primaryDark: '#062E29',
  primaryLight: '#0F766E',
  accent: '#14B8A6',
  accentCyan: '#2DD4BF',
  mint: '#E3F3F1',
  bgCanvas: '#F8FAFC',
  cardBg: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  error: '#DC2626',
  success: '#16A34A',
};

export const STAFF_ANIMATION_CONFIG = {
  introDurationMs: 2400,
  logoDelayMs: 300,
  transitionDurationMs: 600,
};

interface StaffPortalLoginProps {
  defaultRole?: 'admin' | 'receptionist' | 'doctor';
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 1: WELCOME SCREEN (SOPHISTICATED LUMINOUS MEDICAL AURA)
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
      onClick={() => setIsFading(true)}
      className="fixed inset-0 z-50 flex flex-col justify-between items-center bg-[#031A17] p-8 sm:p-12 select-none overflow-hidden cursor-pointer"
      initial={{ opacity: 1 }}
      animate={{ opacity: isFading ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={handleAnimationEnd}
    >
      {/* Top Bar: Brand Logo */}
      <div className="w-full max-w-6xl flex items-center justify-start relative z-20">
        <CarePulseLogo
          variant="horizontal"
          size="sm"
          theme="dark"
          subtitle="Hospital Staff Workspace"
          subtitleClassName="text-teal-200/90 font-bold text-xs"
        />
      </div>

      {/* Centerpiece: Luminous Multi-Color Medical Fluid Core */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto w-full">
        <div className="relative flex items-center justify-center">
          <motion.div
            className="relative w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] md:w-[540px] md:h-[540px] flex items-center justify-center"
            animate={
              isFading
                ? { scale: 1.25, opacity: 0, transition: { duration: 0.6 } }
                : { rotate: [0, 360], scale: [0.97, 1.04, 0.97] }
            }
            transition={{
              rotate: { duration: 22, repeat: Infinity, ease: 'linear' },
              scale: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            {/* Luminous glow circles */}
            <div
              className="absolute -top-6 left-12 w-64 h-64 sm:w-80 sm:h-80 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, #F59E0B 0%, #D97706 50%, transparent 100%)',
                filter: 'blur(65px)',
                opacity: 0.8,
              }}
            />
            <div
              className="absolute top-10 left-8 w-72 h-72 sm:w-96 sm:h-96 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, #0B5A54 0%, #0F766E 55%, transparent 100%)',
                filter: 'blur(70px)',
                opacity: 0.95,
              }}
            />
            <div
              className="absolute bottom-2 left-6 w-60 h-60 sm:w-80 sm:h-80 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, #10B981 0%, #059669 60%, transparent 100%)',
                filter: 'blur(65px)',
                opacity: 0.88,
              }}
            />
            <div
              className="absolute top-6 -right-6 w-64 h-64 sm:w-80 sm:h-80 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, #06B6D4 0%, #14B8A6 60%, transparent 100%)',
                filter: 'blur(65px)',
                opacity: 0.9,
              }}
            />
          </motion.div>

          {/* Typography Over Aura */}
          <motion.div
            className="absolute z-20 flex flex-col items-center text-center pointer-events-none"
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={
              isFading
                ? { opacity: 0, y: -16, filter: 'blur(6px)', transition: { duration: 0.35 } }
                : { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8 } }
            }
          >
            <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight font-heading drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
              Welcome
            </h1>
            <p className="text-teal-200/90 text-sm sm:text-base font-medium mt-2 tracking-wide">
              Initializing Clinical Workspace…
            </p>
          </motion.div>
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="w-full h-8 relative z-20" />
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 2: LEFT 50% CLINICAL COMMAND CENTER SHOWCASE PANEL
// ─────────────────────────────────────────────────────────────────────────────
interface ShowcasePanelProps {
  detectedRole: 'admin' | 'doctor' | 'receptionist' | null;
  onSelectRole: (role: 'admin' | 'doctor' | 'receptionist') => void;
}

const CAROUSEL_SLIDES = [
  {
    tag: 'CLINICAL EXCELLENCE',
    title: 'Precision patient care with zero department friction.',
    desc: 'Unified workspaces coordinating physicians, hospital administrators, and front-desk triage in real time.',
  },
  {
    tag: 'INTELLIGENT TRIAGE',
    title: 'Algorithmic token ticketing & live vital telemetry.',
    desc: 'Instant zero-wait routing with automated specialty assignments and live bedside status monitors.',
  },
  {
    tag: 'ENTERPRISE SECURITY',
    title: 'Role-enforced cryptographic boundaries & 256-bit AES.',
    desc: 'Strict compliance with healthcare confidentiality standards, complete audit trails, and HIPAA protocols.',
  },
];

const ShowcasePanel: React.FC<ShowcasePanelProps> = ({ detectedRole, onSelectRole }) => {
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="w-full h-full min-h-screen flex flex-col justify-between p-8 sm:p-12 lg:p-14 relative overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse 90% 70% at 20% -10%, #0D5B51 0%, #063834 40%, #021C19 100%)',
      }}
    >
      {/* Background Precision Engineering Dot Pattern */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #FFFFFF 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Ambient Volumetric Glow Orbs */}
      <div
        className="absolute -top-28 -left-28 w-[450px] h-[450px] rounded-full pointer-events-none opacity-30 animate-glow-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(45, 212, 191, 0.45) 0%, transparent 70%)',
          filter: 'blur(90px)',
        }}
      />
      <div
        className="absolute -bottom-28 -right-28 w-[500px] h-[500px] rounded-full pointer-events-none opacity-25"
        style={{
          background: 'radial-gradient(circle, #14B8A6 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />

      {/* Top Bar: Brand Logo */}
      <div className="relative z-10 flex items-center justify-start w-full">
        <CarePulseLogo
          variant="horizontal"
          size="sm"
          theme="dark"
          subtitle="Hospital Enterprise Workspace"
          subtitleClassName="text-teal-200/90 font-bold text-xs"
        />
      </div>

      {/* ── Center: Clean & Simple Hospital Showcase Card ── */}
      <div className="relative z-10 my-auto py-8 flex flex-col items-center justify-center w-full max-w-md mx-auto">
        <motion.div
          className="w-full rounded-3xl bg-white/[0.08] backdrop-blur-2xl border border-white/20 shadow-[0_24px_64px_rgba(0,0,0,0.45)] p-7 sm:p-8 text-white relative overflow-hidden flex flex-col items-center text-center"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Top specular highlight line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          {/* 3D Hospital Emblem */}
          <div className="relative p-3 rounded-2xl bg-white/10 border border-white/20 shadow-xl backdrop-blur-md">
            <img
              src="/logo-icon.png"
              alt="CarePulse"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_4px_16px_rgba(16,185,129,0.3)]"
            />
          </div>

          {/* Headline & Subtitle */}
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading mt-5">
            CarePulse Platform
          </h2>
          <p className="text-xs sm:text-sm text-teal-200/90 font-medium mt-1.5 max-w-xs leading-relaxed">
            Unified healthcare operating workspace for clinical encounters, triage routing, and hospital administration.
          </p>

          {/* Clean Role Context Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <button
              type="button"
              onClick={() => onSelectRole('doctor')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                detectedRole === 'doctor'
                  ? 'bg-emerald-400 text-slate-950 shadow-md ring-2 ring-emerald-300/40'
                  : 'bg-white/10 text-teal-100 hover:bg-white/20 border border-white/10'
              }`}
            >
              Doctor OPD
            </button>
            <button
              type="button"
              onClick={() => onSelectRole('admin')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                detectedRole === 'admin'
                  ? 'bg-emerald-400 text-slate-950 shadow-md ring-2 ring-emerald-300/40'
                  : 'bg-white/10 text-teal-100 hover:bg-white/20 border border-white/10'
              }`}
            >
              Hospital Admin
            </button>
            <button
              type="button"
              onClick={() => onSelectRole('receptionist')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                detectedRole === 'receptionist'
                  ? 'bg-emerald-400 text-slate-950 shadow-md ring-2 ring-emerald-300/40'
                  : 'bg-white/10 text-teal-100 hover:bg-white/20 border border-white/10'
              }`}
            >
              Triage Reception
            </button>
          </div>

          {/* Card Footer Status */}
          <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between w-full text-xs text-teal-200/80">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">All Systems Operational</span>
            </div>
            <span className="font-mono text-[11px] text-teal-300 font-bold">256-bit AES</span>
          </div>
        </motion.div>
      </div>

      {/* ── Bottom Section: Narrative Highlights Carousel & Compliance Trust Strip ── */}
      <div className="relative z-10 space-y-4 max-w-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="space-y-2 text-left"
          >
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-white/10 border border-white/15 text-[10px] font-extrabold uppercase tracking-widest text-teal-200">
              <Sparkles className="w-3 h-3 text-emerald-300" />
              <span>{CAROUSEL_SLIDES[activeSlide].tag}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug font-heading">
              {CAROUSEL_SLIDES[activeSlide].title}
            </h3>
            <p className="text-xs sm:text-sm text-teal-100/80 font-normal leading-relaxed">
              {CAROUSEL_SLIDES[activeSlide].desc}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Pagination Progress Bars */}
        <div className="flex items-center gap-2 pt-1">
          {CAROUSEL_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                activeSlide === idx
                  ? 'w-10 bg-gradient-to-r from-emerald-400 to-teal-200'
                  : 'w-2.5 bg-white/25 hover:bg-white/50'
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
// STAGE 2: RIGHT 50% ENTERPRISE EXECUTIVE LOGIN FORM PANEL
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
  detectedRole: 'admin' | 'doctor' | 'receptionist' | null;
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
  detectedRole,
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
    <div className="w-full h-full min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-[#F8FAFC] select-none overflow-y-auto relative">
      {/* Background Ambient Subtle Highlight */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(20, 184, 166, 0.08) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-[420px] w-full mx-auto my-auto relative z-10 py-4 sm:py-6">
        {/* Heading & Subtitle */}
        <div className="space-y-1.5 mb-7 text-left">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-heading">
            Staff Sign In
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Enter your credentials to access your hospital workspace and patient records.
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
              className="mb-5 flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold shadow-xs"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-left leading-snug">
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Feedback */}
        <AnimatePresence>
          {successInfo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 flex items-center gap-3 p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-[#0B5A54] text-xs font-bold shadow-xs"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-left">
                <p className="leading-tight">Welcome, {successInfo.name}!</p>
                <p className="text-[11px] font-medium text-teal-700 mt-0.5">
                  Redirecting to {successInfo.role.toUpperCase()} Workspace…
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Sign In Form ── */}
        <form onSubmit={handleLogin} className={`space-y-4 ${shakeError ? 'animate-shake' : ''}`}>
          {/* Field 1: Username / Email */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label
                htmlFor="staff-username"
                className="block text-xs font-bold text-slate-700"
              >
                Staff Username or Email
              </label>
              {detectedRole && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B5A54] bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  {detectedRole} account
                </span>
              )}
            </div>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0B5A54] transition-colors pointer-events-none">
                {detectedRole === 'doctor' ? (
                  <Stethoscope className="w-4 h-4 text-[#0B5A54]" />
                ) : detectedRole === 'admin' ? (
                  <Building2 className="w-4 h-4 text-[#0B5A54]" />
                ) : detectedRole === 'receptionist' ? (
                  <ClipboardList className="w-4 h-4 text-[#0B5A54]" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>

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
                className="w-full h-12 pl-10 pr-9 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-[#0B5A54] focus:ring-4 focus:ring-[#14B8A6]/20 transition-all shadow-2xs disabled:bg-slate-50 disabled:cursor-not-allowed"
              />

              {identifier && (
                <button
                  type="button"
                  onClick={() => setIdentifier('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
                  aria-label="Clear username"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Field 2: Password */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label
                htmlFor="staff-password"
                className="block text-xs font-bold text-slate-700"
              >
                Security Password
              </label>
              <button
                type="button"
                onClick={onOpenForgotModal}
                className="text-xs font-bold text-[#0B5A54] hover:text-[#08423D] hover:underline cursor-pointer transition-colors"
              >
                Forgot Password?
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
                className="w-full h-12 pl-10 pr-11 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-[#0B5A54] focus:ring-4 focus:ring-[#14B8A6]/20 transition-all shadow-2xs disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Caps Lock Alert Banner */}
            {isCapsLockOn && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Caps Lock is ON</span>
              </div>
            )}
          </div>

          {/* Remember this device */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="w-4 h-4 rounded-md border-slate-300 text-[#0B5A54] focus:ring-[#0B5A54]/25 cursor-pointer accent-[#0B5A54]"
              />
              <span className="text-xs font-semibold text-slate-600">
                Keep me signed in on this workstation (30 days)
              </span>
            </label>
          </div>

          {/* Submit CTA Button with High-End Styling */}
          <button
            type="submit"
            disabled={isLoading || !!successInfo}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#0B5A54] via-[#0D6E66] to-[#0F766E] hover:from-[#08423D] hover:to-[#0D5B51] text-white font-black text-sm shadow-md hover:shadow-lg hover:shadow-teal-950/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group relative overflow-hidden"
          >
            {/* Top subtle highlight shimmer */}
            <div className="absolute inset-x-0 top-0 h-px bg-white/30" />

            {isLoading ? (
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Verifying credentials…</span>
              </div>
            ) : successInfo ? (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                <span>Authorized · Redirecting…</span>
              </div>
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer Line */}
      <div className="text-center pt-4 select-none relative z-10">
        <p className="text-[11px] text-slate-400 font-medium">
          © 2026 CarePulse
        </p>
      </div>
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
      clean.includes('kmch') ||
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
    } catch {}

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
          if (userRole === 'superadmin') {
            setError(
              'SuperAdmin accounts cannot sign in through the Staff Portal. Please use the SuperAdmin Console (/superadmin/login).'
            );
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
          const hospName =
            data.staff.hospitalName || data.staff.hospital_name || 'CarePulse Medical Center';
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

    // 2. Guard: SuperAdmin Accounts
    if (
      cleanId === 'superadmin' ||
      cleanId === 'superadmin@carepulse.com' ||
      cleanId === 'sa101' ||
      cleanId === 'sa'
    ) {
      setError(
        'SuperAdmin accounts cannot sign in through the Staff Portal. Please use the SuperAdmin Console (/superadmin/login).'
      );
      triggerShake();
      setIsLoading(false);
      return;
    }

    // Guard: Patient Accounts
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

    // 3. Check Admin Credentials
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
      const isBag =
        cleanId === 'bag' || cleanId === 'bag@carepulse.com' || cleanPassword === 'bitsathy';
      setStaffAuth(
        {
          id: isBag ? 'admin-bag' : 'admin-1',
          name: isBag
            ? 'BAG Hospital Administrator'
            : adminProfile.name || 'Hospital Administrator',
          email: isBag ? 'bag@carepulse.com' : adminProfile.email || 'admin@carepulse.com',
          role: 'admin',
          department: isBag
            ? 'Hospital Administration & Operations'
            : 'Chief Medical Administration',
          hospitalId: isBag ? 'hosp-bag' : undefined,
          hospital_id: isBag ? 'hosp-bag' : undefined,
        },
        'token-admin-session'
      );
      setIsLoading(false);
      setSuccessInfo({
        role: 'admin',
        name: isBag ? 'BAG Administrator' : 'Hospital Administrator',
      });
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
      ((cleanId === 'doc' ||
        cleanId === 'doc@carepulse.com' ||
        cleanId === 'doctor' ||
        cleanId === 'doctor@carepulse.com' ||
        cleanId === 'd001101' ||
        cleanId === 'doc-1') &&
        (cleanPassword === 'doc123' ||
          cleanPassword === 'bitsathy' ||
          cleanPassword === 'Doctor@123' ||
          cleanPassword === 'doctor'))
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
      ((cleanId === 'rec' ||
        cleanId === 'rec@carepulse.com' ||
        cleanId === 'receptionist' ||
        cleanId === 'receptionist@carepulse.com' ||
        cleanId === 'rep1' ||
        cleanId === 'rep1@carepulse.com' ||
        cleanId === 'r001101' ||
        cleanId === 'rec-1') &&
        (cleanPassword === 'password123' ||
          cleanPassword === 'bitsathy' ||
          cleanPassword === 'rep123' ||
          cleanPassword === 'receptionist'))
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
      (cleanId === 'nurse' ||
        cleanId === 'nurse@carepulse.com' ||
        cleanId.startsWith('n00') ||
        cleanId === 'sarah') &&
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
            `Ticket status: Pending review by Hospital Administrator. Submitted: ${
              data.createdAt || 'recently'
            }. Please ask your on-duty Admin or check again shortly.`
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
    } catch {}
    setShowIntro(false);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col font-sans bg-[#F8FAFC] text-slate-900 selection:bg-[#0B5A54] selection:text-white relative overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────────
          STAGE 1: FULL-SCREEN WELCOME INTRO OVERLAY
      ───────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showIntro && <WelcomeOverlay onDismiss={onIntroComplete} />}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────
          STAGE 2: SPLIT-SCREEN ENTERPRISE LAYOUT
      ───────────────────────────────────────────────────────────────── */}
      {/* Mobile Top Header (< 1024px) */}
      <div className="lg:hidden w-full bg-[#063834] px-5 py-4 flex items-center justify-between text-white shrink-0 border-b border-teal-900/40 shadow-sm">
        <CarePulseLogo
          variant="horizontal"
          size="sm"
          theme="dark"
          subtitle="Hospital Staff Workspace"
          subtitleClassName="text-teal-200/90 font-bold text-[10px]"
        />

        <button
          type="button"
          onClick={() => setShowMobileRoles((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 transition-colors cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick Roles</span>
          {showMobileRoles ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Collapsed Mobile Roles Drawer */}
      <AnimatePresence>
        {showMobileRoles && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#0A443C] px-5 py-3 border-b border-teal-800/80 space-y-2 overflow-hidden text-left shrink-0 text-white"
          >
            <div className="grid grid-cols-3 gap-2 py-1">
              <button
                type="button"
                onClick={() => {
                  handleSelectPreset('doctor');
                  setShowMobileRoles(false);
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-center text-xs font-bold transition-colors cursor-pointer"
              >
                Doctor (doc123)
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSelectPreset('admin');
                  setShowMobileRoles(false);
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-center text-xs font-bold transition-colors cursor-pointer"
              >
                Admin (Admin@123)
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSelectPreset('receptionist');
                  setShowMobileRoles(false);
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-center text-xs font-bold transition-colors cursor-pointer"
              >
                Reception (pwd123)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edge-to-Edge Full Screen 50% / 50% Split */}
      <div className="flex-1 flex flex-col lg:flex-row w-full min-h-screen min-h-[100dvh]">
        {/* LEFT 50%: Clinical Command Center Showcase Panel */}
        <div className="hidden lg:flex lg:w-1/2 min-h-screen">
          <ShowcasePanel detectedRole={detectedRole} onSelectRole={handleSelectPreset} />
        </div>

        {/* RIGHT 50%: Clean Executive SaaS Login Form Panel */}
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
            detectedRole={detectedRole}
            handleLogin={handleLogin}
            onOpenForgotModal={() => {
              setForgotIdentifier(identifier);
              setIsForgotModalOpen(true);
            }}
            onSelectPreset={handleSelectPreset}
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          FORGOT PASSWORD ASSISTANCE MODAL (MODERN EXECUTIVE WORKFLOW)
      ───────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isForgotModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200/90 shadow-2xl space-y-4"
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0B5A54] flex items-center justify-center border border-teal-100 shadow-2xs">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm sm:text-base font-black text-slate-900 font-heading">
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
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 text-left">
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
                <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-medium flex items-start gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 text-[#0B5A54] shrink-0 mt-0.5" />
                  <span>{forgotSuccessMessage}</span>
                </div>
              )}

              {pendingNotice && !resolvedResult && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium flex items-start gap-2 text-left">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{pendingNotice}</span>
                </div>
              )}

              {forgotError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-start gap-2 text-left">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{forgotError}</span>
                </div>
              )}

              {/* Action Form */}
              <form onSubmit={handleForgotSubmit} className="space-y-3.5 text-xs text-left">
                <div className="space-y-1">
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
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0B5A54] focus:bg-white transition-all shadow-2xs"
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
                    className="px-4 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
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
        )}
      </AnimatePresence>
    </div>
  );
};

export default StaffPortalLogin;
