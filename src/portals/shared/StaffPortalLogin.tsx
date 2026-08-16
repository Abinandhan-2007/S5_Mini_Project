import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, ArrowRight, Eye, EyeOff,
  ShieldCheck, AlertCircle, Activity,
  ClipboardList, Stethoscope, CalendarCheck
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import dbRaw from '../../../database/database.json';

interface StaffRecord {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'receptionist' | 'doctor';
}

interface StaffPortalLoginProps {
  defaultRole?: 'receptionist' | 'doctor';
}

const STAFF_LIST: StaffRecord[] = (dbRaw as { staff?: StaffRecord[] }).staff ?? [];

export const StaffPortalLogin: React.FC<StaffPortalLoginProps> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStaffAuth = useStaffStore((s) => s.setStaffAuth);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      const match = STAFF_LIST.find(
        (s) =>
          s.email.toLowerCase() === email.trim().toLowerCase() &&
          s.password === password
      );

      if (!match) {
        setError('Incorrect email or password. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      setStaffAuth(
        { id: match.id, name: match.name, email: match.email, role: match.role },
        `token-${match.role}-${match.id}`
      );
      setIsLoading(false);
      navigate(match.role === 'receptionist' ? '/receptionist' : '/doctor');
    }, 800);
  };

  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-[#0B5A54] selection:text-white">

      {/* ══════════════════════════════════════════════════════════════════
          LEFT PANEL — Brand Hero with CarePulse App Logo
      ══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] bg-[#0B5A54] relative overflow-hidden px-10 py-10">
        {/* Ambient gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_25%_35%,#177D74_0%,#0B5A54_55%,#053632_100%)] pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-teal-300/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 right-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* ── Top Header ───────────────────────────────────────── */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-md shadow-md">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-extrabold text-lg tracking-tight font-heading block leading-none">
                CarePulse
              </span>
              <span className="text-[10px] text-teal-200/70 uppercase tracking-widest font-semibold">
                Healthcare Network
              </span>
            </div>
          </div>
        </div>

        {/* ── Center: Official App Logo + Tagline + Feature Highlights ── */}
        <div className="relative z-10 flex flex-col items-center text-center my-auto py-8">
          {/* Logo Disc - standard CarePulse design */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative mb-6"
          >
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-teal-400/25 to-teal-900/40 border border-white/25 backdrop-blur-xl flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
              <Activity className="w-12 h-12 text-white drop-shadow-md" strokeWidth={2.2} />
            </div>
            <div className="absolute inset-0 rounded-3xl bg-teal-300/20 blur-xl scale-125 pointer-events-none" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-2 mb-8 max-w-xs"
          >
            <h1 className="text-3xl font-black text-white tracking-tight font-heading">
              CarePulse
            </h1>
            <p className="text-sm text-teal-100/70 font-medium leading-relaxed">
              Empathetic healthcare at your fingertips. Secure portal for doctors and clinic receptionists.
            </p>
          </motion.div>

          {/* Feature Highlight Pills */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="w-full max-w-[280px] space-y-2.5"
          >
            {[
              { icon: <ClipboardList className="w-4 h-4" />, title: 'Receptionist Desk', desc: 'Patient check-in & token queue' },
              { icon: <Stethoscope className="w-4 h-4" />, title: 'Doctor Workspace', desc: 'Consultation & active appointments' },
              { icon: <CalendarCheck className="w-4 h-4" />, title: 'Smart Scheduling', desc: 'Real-time slot & capacity sync' },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/[0.08] border border-white/10 backdrop-blur-md text-left transition-all hover:bg-white/[0.12]"
              >
                <div className="w-8 h-8 rounded-xl bg-teal-400/20 flex items-center justify-center text-teal-300 shrink-0">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white leading-tight">{item.title}</p>
                  <p className="text-[10px] text-teal-200/60 leading-tight truncate">{item.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Bottom: Security Footer ─────────────────────────── */}
        <div className="relative z-10 flex items-center justify-between text-teal-200/50 text-xs pt-4 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>256-bit encrypted authentication</span>
          </div>
          <span className="text-[10px] text-teal-300/40 font-mono">v1.0.0</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          RIGHT PANEL — Clean White Login Card
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#F8FAFC] relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-slate-200/50 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-[420px]"
        >
          {/* Logo on Mobile/Tablet */}
          <div className="lg:hidden flex flex-col items-center text-center space-y-2 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-teal flex items-center justify-center text-white shadow-lg shadow-teal-900/15">
              <Activity className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-2xl font-black font-heading text-[#0B5A54] tracking-tight">CarePulse</h1>
              <p className="text-xs font-semibold text-slate-400">Empathetic healthcare at your fingertips</p>
            </div>
          </div>

          {/* Elevated Card */}
          <div className="bg-white rounded-3xl shadow-[0_12px_40px_rgba(15,23,42,0.06)] border border-slate-200/80 p-8 sm:p-10">

            {/* Header */}
            <div className="mb-7">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight font-heading">
                Sign In
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Enter your work credentials to access your portal.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">

              {/* Work Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 tracking-wide">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="staff-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    placeholder="yourname@carepulse.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="staff-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] focus:bg-white transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 mt-2 rounded-xl bg-[#0B5A54] hover:bg-[#094843] active:bg-[#073834] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-teal-900/15 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Security Notice */}
            <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-400 text-[11px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Authorized personnel only</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StaffPortalLogin;
