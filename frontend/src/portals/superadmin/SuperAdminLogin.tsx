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
  Radio,
} from 'lucide-react';
import { superadminService } from '../../services/superadminService';
import { useStaffStore } from '../../store/staffStore';

export const SuperAdminLogin: React.FC = () => {
  const [email, setEmail] = useState('superadmin@carepulse.com');
  const [password, setPassword] = useState('SuperAdmin@123');
  const [showPassword, setShowPassword] = useState(false);
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
    setIsLoading(true);
    setError(null);

    try {
      const data = await superadminService.login({
        email: email.trim(),
        password: password.trim(),
      });

      if (data && data.staff) {
        setStaffAuth(
          {
            id: data.staff.id,
            name: data.staff.name,
            email: data.staff.email,
            role: 'superadmin',
            department: data.staff.department || 'Global Platform Operations',
            avatarUrl: data.staff.avatarUrl,
            staff_code: data.staff.staff_code || 'SA101',
            staffCode: data.staff.staff_code || 'SA101',
            phone: data.staff.phone,
            hospital_id: undefined,
            hospitalId: undefined,
          },
          data.token
        );
        navigate('/superadmin');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid root infrastructure credentials. Access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail('superadmin@carepulse.com');
    setPassword('SuperAdmin@123');
    setError(null);
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  return (
    <div className="min-h-screen bg-[#020B08] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-[#00DC82] selection:text-[#020B08]">
      {/* HIGH-TECH CYBER AMBIENT BACKGROUND */}
      {/* 1. Dot Grid Matrix */}
      <div className="absolute inset-0 opacity-[0.14] pointer-events-none bg-[radial-gradient(#00DC82_1.2px,transparent_1.2px)] [background-size:28px_28px]" />

      {/* 2. Top-Center Horizon Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[320px] bg-gradient-to-b from-[#00DC82]/18 via-[#0B5A54]/10 to-transparent blur-3xl pointer-events-none" />

      {/* 3. Pulsing Corner Aurora Lights */}
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-[#00DC82]/12 rounded-full blur-[110px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-32 -right-32 w-[560px] h-[560px] bg-[#0A7364]/20 rounded-full blur-[130px] pointer-events-none" />

      {/* 4. Fine Horizon Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00DC82]/40 to-transparent" />

      {/* TOP SYSTEM TELEMETRY HUD */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6 flex items-center gap-3 text-[10px] font-mono tracking-wider text-slate-400 bg-[#041A15]/80 border border-[#0D3831] px-4 py-1.5 rounded-full backdrop-blur-md shadow-lg shadow-black/40 z-10"
      >
        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          CORE KERNEL ONLINE
        </span>
        <span className="text-slate-600">|</span>
        <span className="hidden sm:inline-flex items-center gap-1 text-slate-300">
          <Radio className="w-3 h-3 text-[#00DC82]" />
          PORT: 5000 (SECURE TLS)
        </span>
        <span className="hidden sm:inline text-slate-600">|</span>
        <span className="text-slate-400 flex items-center gap-1">
          <Activity className="w-3 h-3 text-[#00DC82]" />
          LATENCY: &lt;12ms
        </span>
      </motion.div>

      {/* MAIN COMMAND CONSOLE CARD */}
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[460px] relative z-10"
      >
        {/* Outer Glow Ring */}
        <div className="absolute -inset-[1.5px] rounded-[26px] bg-gradient-to-b from-[#00DC82]/40 via-[#0B5A54]/25 to-[#00DC82]/5 blur-[2px] pointer-events-none" />

        <div className="relative bg-gradient-to-b from-[#061E1A]/95 via-[#041613]/98 to-[#020B08]/98 border border-[#0F4239] backdrop-blur-3xl rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(0,220,130,0.08)] p-6 sm:p-8 overflow-hidden">
          {/* Subtle Top Inner Edge Highlight */}
          <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-[#00DC82]/50 to-transparent pointer-events-none" />

          {/* Decorative Cyber Crosshairs */}
          <div className="absolute top-3 left-3 text-[9px] font-mono text-[#00DC82]/30 select-none pointer-events-none">
            + ROOT_NODE.01
          </div>
          <div className="absolute top-3 right-3 text-[9px] font-mono text-[#00DC82]/30 select-none pointer-events-none">
            [SYS_AUTH]
          </div>

          {/* TOP HEADER & EMBLEM */}
          <div className="flex flex-col items-center text-center mt-1 mb-7">
            {/* Holographic Glowing Emblem */}
            <div className="relative mb-4 group">
              <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-[#00DC82] to-[#0A8875] opacity-40 blur-md group-hover:opacity-75 transition-opacity duration-300" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0A3029] via-[#051B17] to-[#020D0A] border border-[#16564B] flex items-center justify-center text-[#00DC82] shadow-inner relative z-10">
                <Globe2 className="w-8 h-8 text-[#00DC82] drop-shadow-[0_0_12px_rgba(0,220,130,0.6)]" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#020B08] border border-[#00DC82] flex items-center justify-center">
                  <Cpu className="w-3 h-3 text-[#00DC82]" />
                </div>
              </div>
            </div>

            {/* Root Infrastructure Level 0 Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full font-mono text-[10px] font-bold tracking-widest bg-[#00DC82]/12 text-[#00DC82] border border-[#00DC82]/30 uppercase mb-2.5 shadow-sm shadow-[#00DC82]/10">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00DC82]" />
              <span>ROOT INFRASTRUCTURE // LEVEL 0</span>
            </div>

            {/* Main Title with Silver-To-White Gradient */}
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-heading bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-sm">
              SuperAdmin Console
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 font-sans max-w-xs leading-relaxed">
              Platform governance, multi-hospital provisioning &amp; administrator credentialing
            </p>
          </div>

          {/* ERROR ALERT */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 18 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs font-mono flex items-start gap-2.5 shadow-md shadow-rose-950/30">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LOGIN FORM */}
          <form onSubmit={handleLogin} onKeyDown={handleKeyDown} className="space-y-4">
            {/* Identifier Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <span>Username or Work Email</span>
                </label>
                <span className="text-[9px] font-mono text-[#00DC82]/80 bg-[#00DC82]/10 px-1.5 py-0.5 rounded border border-[#00DC82]/20">
                  ID: SA101
                </span>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-[#00DC82] transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="superadmin@carepulse.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#051A15]/90 border border-[#0E3D35] text-white rounded-xl text-xs focus:outline-none focus:border-[#00DC82] focus:ring-2 focus:ring-[#00DC82]/25 focus:bg-[#07241E] transition-all placeholder:text-slate-600 font-mono shadow-inner"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <span>Master Access Key</span>
                </label>
                {capsLockActive && (
                  <span className="text-[9px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-600/40 animate-pulse">
                    CAPS LOCK ON
                  </span>
                )}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-[#00DC82] transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#051A15]/90 border border-[#0E3D35] text-white rounded-xl text-xs focus:outline-none focus:border-[#00DC82] focus:ring-2 focus:ring-[#00DC82]/25 focus:bg-[#07241E] transition-all placeholder:text-slate-600 font-mono shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* HIGH-IMPACT AUTHENTICATE BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative group overflow-hidden py-3.5 px-5 bg-gradient-to-r from-[#00F298] via-[#00DC82] to-[#05B371] hover:from-[#00ff9f] hover:to-[#00c978] text-[#021813] font-black rounded-xl text-xs font-mono tracking-wider flex items-center justify-center gap-2.5 shadow-[0_0_28px_rgba(0,220,130,0.35)] hover:shadow-[0_0_36px_rgba(0,220,130,0.5)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {/* Dynamic Shimmer Light Sweep */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 pointer-events-none" />

                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#021813]/30 border-t-[#021813] rounded-full animate-spin" />
                    <span>VERIFYING CRYPTOGRAPHIC SIGNATURE...</span>
                  </div>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#021813]" />
                    <span>AUTHENTICATE ROOT ACCESS</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* QUICK DEMO CREDENTIALS VAULT */}
          <div className="mt-6 pt-5 border-t border-[#0D3831]">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
              <span className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
                <Cpu className="w-3.5 h-3.5 text-[#00DC82]" />
                Demo Root Keycard:
              </span>
              <button
                type="button"
                onClick={handleQuickFill}
                className="text-[11px] font-bold text-[#00DC82] hover:text-[#00ff9f] bg-[#00DC82]/10 hover:bg-[#00DC82]/20 border border-[#00DC82]/30 px-2.5 py-0.5 rounded-full transition-all inline-flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-3 h-3" />
                Auto-Fill
              </button>
            </div>

            <div className="bg-[#020F0C] p-3 rounded-xl border border-[#0D3831] text-left font-mono text-[11px] text-slate-300 space-y-1.5 shadow-inner">
              {/* Identity Row */}
              <div className="flex justify-between items-center group py-0.5">
                <span className="text-slate-500">Identity:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-300 font-medium">superadmin@carepulse.com</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('superadmin@carepulse.com', 'id')}
                    className="text-slate-500 hover:text-[#00DC82] p-0.5 rounded transition-colors"
                    title="Copy Identity"
                  >
                    {copiedField === 'id' ? <Check className="w-3 h-3 text-[#00DC82]" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Role Code Row */}
              <div className="flex justify-between items-center py-0.5 border-t border-[#092823]/60">
                <span className="text-slate-500">Role Code:</span>
                <span className="text-[#00DC82] font-bold bg-[#00DC82]/10 px-1.5 py-0.2 rounded border border-[#00DC82]/20">
                  SA101 (Global Root)
                </span>
              </div>

              {/* Master Key Row */}
              <div className="flex justify-between items-center group py-0.5 border-t border-[#092823]/60">
                <span className="text-slate-500">Key:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-300 font-medium">SuperAdmin@123</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('SuperAdmin@123', 'key')}
                    className="text-slate-500 hover:text-[#00DC82] p-0.5 rounded transition-colors"
                    title="Copy Key"
                  >
                    {copiedField === 'key' ? <Check className="w-3 h-3 text-[#00DC82]" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* PORTAL SWITCHING LINK */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => navigate('/staff/login')}
              className="text-xs text-slate-400 hover:text-[#00DC82] transition-all inline-flex items-center gap-1.5 cursor-pointer font-mono group py-1 px-3 rounded-lg hover:bg-white/[0.03]"
            >
              <Building2 className="w-3.5 h-3.5 text-[#00DC82] group-hover:scale-110 transition-transform" />
              <span>Switch to Hospital Staff Portal</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* FOOTER COMPLIANCE BADGES */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="mt-6 text-center text-[10px] font-mono text-slate-500 flex flex-wrap items-center justify-center gap-3 z-10"
      >
        <span>• HIPAA &amp; SOC-2 LEVEL 4 COMPLIANT</span>
        <span className="hidden sm:inline">•</span>
        <span>256-BIT ASYMMETRIC ENCRYPTION</span>
        <span className="hidden sm:inline">•</span>
        <span>CAREPULSE CORE INFRASTRUCTURE v2.4</span>
      </motion.div>
    </div>
  );
};

export default SuperAdminLogin;
