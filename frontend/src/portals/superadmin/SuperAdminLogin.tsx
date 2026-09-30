// frontend/src/portals/superadmin/SuperAdminLogin.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  CheckCircle2,
  Globe2,
  Cpu,
  Copy,
  Check,
  Activity,
  Sparkles,
  Shield,
  LockKeyhole,
} from 'lucide-react';
import { superadminService } from '../../services/superadminService';
import { useStaffStore } from '../../store/staffStore';

export const SuperAdminLogin: React.FC = () => {
  const [identifier, setIdentifier] = useState('superadmin@carepulse.com');
  const [password, setPassword] = useState('SuperAdmin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [capsLockActive, setCapsLockActive] = useState(false);

  const setStaffAuth = useStaffStore((s) => s.setStaffAuth);
  const navigate = useNavigate();

  // Caps lock detection
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    const cleanId = identifier.trim();
    const cleanPassword = password.trim();

    if (!cleanId || !cleanPassword) {
      setError('Please provide both username/email and master passkey.');
      setIsLoading(false);
      return;
    }

    try {
      const data = await superadminService.login({
        email: cleanId,
        username: cleanId,
        identifier: cleanId,
        password: cleanPassword,
      });

      if (data && data.staff) {
        setStaffAuth(
          {
            id: data.staff.id,
            name: data.staff.name || 'System SuperAdmin',
            email: data.staff.email || 'superadmin@carepulse.com',
            role: 'superadmin',
            department: data.staff.department || 'Global Platform Governance',
            avatarUrl: data.staff.avatarUrl,
            staff_code: data.staff.staff_code || 'SA101',
            staffCode: data.staff.staff_code || 'SA101',
            phone: data.staff.phone,
            hospital_id: undefined,
            hospitalId: undefined,
          },
          data.token
        );

        if (rememberSession) {
          localStorage.setItem('superadmin_remembered_id', cleanId);
        }

        navigate('/superadmin');
      } else {
        throw new Error('SuperAdmin authentication failed: incomplete profile returned.');
      }
    } catch (err: any) {
      setError(
        err?.message ||
        'Root infrastructure credentials rejected. Access denied to privileged partition.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = () => {
    setIdentifier('superadmin@carepulse.com');
    setPassword('SuperAdmin@123');
    setError(null);
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  return (
    <div className="min-h-screen bg-[#060B11] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans selection:bg-teal-500 selection:text-black">
      {/* ─────────────────────────────────────────────────────────────
          ATMOSPHERIC CYBER/EXECUTIVE AMBIENT BACKGROUND
      ───────────────────────────────────────────────────────────── */}
      {/* 1. Fine cryptographic matrix dot pattern */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none bg-[radial-gradient(#14B8A6_1.5px,transparent_1.5px)] [background-size:28px_28px]" />

      {/* 2. Top-center surgical teal glow */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-teal-500/15 via-emerald-600/10 to-transparent blur-[120px] pointer-events-none" />

      {/* 3. Deep corner atmospheric orbs */}
      <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-emerald-950/25 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-teal-950/30 rounded-full blur-[140px] pointer-events-none" />

      {/* 4. Fine horizon laser accent */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-teal-400/50 to-transparent pointer-events-none" />

      {/* ─────────────────────────────────────────────────────────────
          TOP EXECUTIVE NAVIGATION & TELEMETRY BAR
      ───────────────────────────────────────────────────────────── */}
      <header className="relative z-20 w-full max-w-7xl mx-auto flex items-center justify-between gap-4 py-2">
        {/* Brand identity pill */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 via-emerald-600/10 to-slate-900 border border-teal-500/30 flex items-center justify-center text-teal-300 shadow-sm shadow-teal-500/10">
            <Globe2 className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base tracking-tight font-heading">
                CarePulse
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/30 uppercase">
                ROOT SOVEREIGN
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
              Multi-Hospital Platform Enclave
            </p>
          </div>
        </div>

        {/* Live Security HUD Indicator */}
        <div className="hidden md:flex items-center gap-2.5 text-[11px] font-mono text-slate-300 bg-slate-900/80 border border-slate-800 px-3.5 py-1.5 rounded-full backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-emerald-400 font-semibold tracking-wide">ZERO-TRUST ACTIVE</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">ENCLAVE TLS 1.3</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">LATENCY &lt;10ms</span>
        </div>

        {/* Return to Hospital Staff Login Button */}
        <button
          type="button"
          onClick={() => navigate('/staff/login')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold transition-all hover:border-slate-600 cursor-pointer shadow-xs active:scale-95"
        >
          <Building2 className="w-3.5 h-3.5 text-teal-400" />
          <span>Hospital Staff Portal</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          MAIN STAGE: TWO-PANEL EXECUTIVE COCKPIT
      ───────────────────────────────────────────────────────────── */}
      <main className="relative z-10 w-full max-w-7xl mx-auto my-auto py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* ── LEFT COLUMN: PLATFORM AUTHORITY & NETWORK OVERVIEW ── */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 space-y-6 sm:space-y-8 text-left"
        >
          {/* Level 0 Privileged Access Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-300 font-mono text-xs font-bold tracking-wider uppercase shadow-xs">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>ROOT INFRASTRUCTURE GATEWAY // LEVEL 0</span>
          </div>

          {/* Primary High-Impact Headline */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-heading tracking-tight text-white leading-[1.12]">
              Global Healthcare{' '}
              <span className="bg-gradient-to-r from-teal-300 via-emerald-400 to-teal-200 bg-clip-text text-transparent">
                Command Console
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-xl">
              Authoritative administration gateway for multi-hospital orchestration, network-wide staff credentialing, and immutable HIPAA compliance audit streams.
            </p>
          </div>

          {/* Telemetry Indicator Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            {/* Card 1 */}
            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/90 backdrop-blur-md">
              <div className="flex items-center gap-2 text-teal-400 mb-1">
                <Building2 className="w-4 h-4" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">FACILITIES</span>
              </div>
              <p className="text-lg font-black text-white">Multi-Center</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Live routing &amp; sync</p>
            </div>

            {/* Card 2 */}
            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/90 backdrop-blur-md">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <Shield className="w-4 h-4" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">GOVERNANCE</span>
              </div>
              <p className="text-lg font-black text-white">Zero-Trust</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Role clearance L0</p>
            </div>

            {/* Card 3 */}
            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/90 backdrop-blur-md">
              <div className="flex items-center gap-2 text-teal-400 mb-1">
                <Activity className="w-4 h-4" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">AUDIT LEDGER</span>
              </div>
              <p className="text-lg font-black text-white">Immutable</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Real-time telemetry</p>
            </div>
          </div>

          {/* Institutional Compliance Ribbon */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              HIPAA Compliant
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              SOC-2 Type II
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              256-Bit Asymmetric Vault
            </span>
          </div>
        </motion.div>

        {/* ── RIGHT COLUMN: AUTHENTICATION ENCLAVE CONSOLE ── */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 w-full max-w-[500px] mx-auto lg:ml-auto"
        >
          {/* Frosted Titanium Card with Glowing Aura */}
          <div className="relative group">
            {/* Ambient outer gradient ring */}
            <div className="absolute -inset-0.5 rounded-[28px] bg-gradient-to-b from-teal-500/30 via-emerald-600/10 to-teal-500/5 blur-md pointer-events-none transition-all group-hover:from-teal-500/40" />

            <div className="relative bg-[#0A111A]/95 border border-teal-500/25 backdrop-blur-2xl rounded-[26px] p-6 sm:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.85)]">
              {/* Inner edge subtle shine */}
              <div className="absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent pointer-events-none" />

              {/* Console Header */}
              <div className="mb-6 text-left">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                    <LockKeyhole className="w-3.5 h-3.5 text-teal-400" />
                    <span>SUPERADMIN AUTHENTICATION</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                    ID: SA101
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight">
                  Root Access Verification
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-normal leading-relaxed">
                  Provide master administrator credentials to unlock multi-facility platform controls.
                </p>
              </div>

              {/* Error Alert Banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs font-mono flex items-start gap-2.5 shadow-md shadow-rose-950/20">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      <span className="leading-relaxed">{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Authentication Form */}
              <form onSubmit={handleLogin} onKeyDown={handleKeyDown} className="space-y-4 text-left">
                {/* Identifier Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 tracking-wide font-sans">
                      Username or Work Email
                    </label>
                    <span className="text-[10px] font-mono text-teal-400/80">
                      superadmin / sa101
                    </span>
                  </div>
                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-teal-400 transition-colors">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      placeholder="superadmin@carepulse.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#060D15]/90 border border-slate-700/80 text-white rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 focus:bg-[#07111D] transition-all placeholder:text-slate-600 shadow-inner"
                    />
                  </div>
                </div>

                {/* Master Passkey Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 tracking-wide font-sans">
                      Master Passkey
                    </label>
                    {capsLockActive && (
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-600/40 animate-pulse">
                        CAPS LOCK ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-teal-400 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-[#060D15]/90 border border-slate-700/80 text-white rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 focus:bg-[#07111D] transition-all placeholder:text-slate-600 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
                      title={showPassword ? 'Hide passkey' : 'Show passkey'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Session Option Checkbox */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-200 transition-colors">
                    <input
                      type="checkbox"
                      checked={rememberSession}
                      onChange={(e) => setRememberSession(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-400/20 cursor-pointer"
                    />
                    <span>Remember sovereign workstation</span>
                  </label>
                  <span className="text-[11px] font-mono text-teal-400/90 font-medium">
                    TLS Protected
                  </span>
                </div>

                {/* Authenticate Submit CTA */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full relative group/btn overflow-hidden py-3 px-5 bg-gradient-to-r from-teal-400 via-emerald-500 to-teal-500 hover:from-teal-300 hover:to-emerald-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm font-mono tracking-wider flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(20,184,166,0.35)] hover:shadow-[0_0_32px_rgba(20,184,166,0.5)] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 cursor-pointer"
                  >
                    {/* Shimmer Light Sweep Effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 pointer-events-none" />

                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                        <span>VERIFYING PRIVILEGED SIGNATURE...</span>
                      </div>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-slate-950" />
                        <span>AUTHENTICATE ROOT ACCESS</span>
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Demo Credentials & Quick Auto-Fill */}
              <div className="mt-6 pt-5 border-t border-slate-800/80 text-left">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="flex items-center gap-1.5 text-slate-300 font-semibold font-mono text-[11px]">
                    <Cpu className="w-3.5 h-3.5 text-teal-400" />
                    Demo Root Passcard:
                  </span>
                  <button
                    type="button"
                    onClick={handleQuickFill}
                    className="text-[11px] font-bold text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-2.5 py-0.5 rounded-full transition-all inline-flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Auto-Fill
                  </button>
                </div>

                <div className="bg-[#050B12] p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1.5 shadow-inner">
                  {/* Identity Row */}
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500">Identity:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-300 font-medium">superadmin@carepulse.com</span>
                      <button
                        type="button"
                        onClick={() => handleCopy('superadmin@carepulse.com', 'id')}
                        className="text-slate-500 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                        title="Copy Identifier"
                      >
                        {copiedField === 'id' ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Role Row */}
                  <div className="flex justify-between items-center py-0.5 border-t border-slate-800/60">
                    <span className="text-slate-500">Role:</span>
                    <span className="text-teal-400 font-bold bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20 text-[10px]">
                      superadmin (Global Enclave)
                    </span>
                  </div>

                  {/* Passkey Row */}
                  <div className="flex justify-between items-center py-0.5 border-t border-slate-800/60">
                    <span className="text-slate-500">Passkey:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-300 font-medium">SuperAdmin@123</span>
                      <button
                        type="button"
                        onClick={() => handleCopy('SuperAdmin@123', 'key')}
                        className="text-slate-500 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                        title="Copy Key"
                      >
                        {copiedField === 'key' ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Portal Switch Link */}
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => navigate('/staff/login')}
                  className="text-xs text-slate-400 hover:text-teal-300 transition-all inline-flex items-center gap-1.5 cursor-pointer font-sans group py-1 px-3 rounded-lg hover:bg-slate-800/50"
                >
                  <Building2 className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110 transition-transform" />
                  <span>Looking for Doctor, Nurse, or Reception desk? Switch to Staff Portal &rarr;</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          FOOTER COMPLIANCE & PROTOCOL BADGES
      ───────────────────────────────────────────────────────────── */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto py-3 border-t border-slate-800/60 text-center text-[10px] font-mono text-slate-500 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        <span>• HIPAA LEVEL 4 HEALTH DATA PROTECTION</span>
        <span className="hidden sm:inline">•</span>
        <span>SOC-2 TYPE II AUDIT CERTIFIED</span>
        <span className="hidden sm:inline">•</span>
        <span>256-BIT ASYMMETRIC ENCRYPTION</span>
        <span className="hidden sm:inline">•</span>
        <span>CAREPULSE ROOT PLATFORM v2.4</span>
      </footer>
    </div>
  );
};

export default SuperAdminLogin;
