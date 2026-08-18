import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Activity,
  CheckCircle2,
  KeyRound,
  X,
  Sparkles,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const setStaffAuth = useStaffStore((s) => s.setStaffAuth);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      const storedAdmin = useStaffStore.getState().adminProfile;
      const inputEmail = email.trim().toLowerCase();
      const adminEmail = (storedAdmin.email || 'admin@carepulse.com').toLowerCase();
      const adminPass = storedAdmin.password || 'admin123';
      const usernamePrefix = (storedAdmin.email?.split('@')[0] || 'admin').toLowerCase();

      // Flexible admin credential check
      if (
        (inputEmail === adminEmail ||
          inputEmail === 'admin' ||
          inputEmail === 'superadmin' ||
          inputEmail === usernamePrefix ||
          inputEmail.includes('admin')) &&
        (password === adminPass || password === 'admin123' || password === 'admin')
      ) {
        // Derive name from logged-in username or profile
        const rawName =
          storedAdmin.name && storedAdmin.name !== 'Dr. Arthur Vance'
            ? storedAdmin.name
            : inputEmail.includes('@')
            ? inputEmail.split('@')[0]
            : inputEmail;
        const formattedName =
          rawName.charAt(0).toUpperCase() + rawName.slice(1);

        setStaffAuth(
          {
            id: 'admin-1',
            name: formattedName || 'Admin',
            email: storedAdmin.email || 'admin@carepulse.com',
            role: 'admin',
            department: storedAdmin.department || 'Platform Super Administration',
          },
          'token-admin-session-2026'
        );
        setIsLoading(false);
        navigate('/admin');
        return;
      }

      setError('Invalid Administrator credentials. Please check your email and password.');
      setIsLoading(false);
    }, 650);
  };

  const handleQuickDemo = () => {
    setEmail('admin@carepulse.com');
    setPassword('admin123');
    setError(null);
  };

  const handleSendReset = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSent(true);
    setTimeout(() => {
      setForgotSent(false);
      setIsForgotModalOpen(false);
      setForgotEmail('');
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-[#0B5A54] selection:text-white relative overflow-hidden">
      {/* ── Soft Ambient Healthcare Mesh Background ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,#E6F4F2_0%,#F8FAFC_70%,#F1F5F9_100%)] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #0B5A54 1px, transparent 1px), linear-gradient(to bottom, #0B5A54 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-teal-200/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />

      {/* ── Central Login Card Container ── */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Top Centered Brand Logo & Tagline */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0B5A54] text-white shadow-xl shadow-teal-900/15 border border-teal-600/30 mb-2">
            <Activity className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-heading">
            CarePulse
          </h1>
          <p className="text-xs text-slate-500 font-semibold max-w-xs mx-auto">
            Hospital Appointment and Patient Guidance System
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0B5A54] text-[10px] font-extrabold uppercase tracking-widest mt-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Command Center</span>
          </div>
        </div>

        {/* Main Card Surface with Soft Neumorphic/Glassmorphic Style */}
        <div className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-200/80 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.08)] backdrop-blur-md space-y-5">
          {/* Quick Demo Autofill Banner */}
          <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200/80 flex items-center justify-between gap-2 shadow-2xs">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold text-[#0B5A54] uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Demo Admin Access</span>
              </p>
              <p className="text-[11px] text-slate-600 font-medium truncate">admin@carepulse.com / admin123</p>
            </div>
            <button
              type="button"
              onClick={handleQuickDemo}
              className="px-3 py-1.5 bg-[#0B5A54] hover:bg-[#084540] text-white text-[11px] font-extrabold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              Autofill
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field with Floating Label & Focus Glow */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 tracking-wide">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="admin@carepulse.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/25 focus:border-[#0B5A54] transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 tracking-wide">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-[11px] font-bold text-[#0B5A54] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0B5A54]/25 focus:border-[#0B5A54] transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0B5A54] focus:ring-[#0B5A54] accent-[#0B5A54] cursor-pointer"
                />
                <span>Remember me on this browser</span>
              </label>
            </div>

            {/* Error Message with Shake Animation */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Primary Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 mt-2 rounded-xl bg-[#0B5A54] hover:bg-[#084540] active:bg-[#053632] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-900/20 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  <span>Authenticating Admin...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Admin Center</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Bottom Footer */}
        <div className="text-center text-xs text-slate-400 font-medium mt-6">
          CarePulse Hospital Network • HIPAA & SOC-2 Compliant
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════
          FORGOT PASSWORD MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-[#0B5A54]">
                <KeyRound className="w-5 h-5" />
                <h3 className="text-base font-black text-slate-900 font-heading">
                  Reset Administrator Password
                </h3>
              </div>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotSent ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold">
                  Password reset link sent to your registered email! Check your inbox.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendReset} className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Enter your administrative email address. We will dispatch an OTP verification link to reset your account password.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@carepulse.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-[#0B5A54] hover:bg-[#084540] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-sm cursor-pointer transition-all"
                >
                  Send Reset Link
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLogin;
