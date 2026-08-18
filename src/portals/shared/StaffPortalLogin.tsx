import React, { useState, useMemo } from 'react';
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
  Activity,
  ClipboardList,
  Stethoscope,
  Building2,
  CheckCircle2,
  KeyRound,
  X,
  Sparkles,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { apiPost } from '../../lib/apiFetch';

interface StaffPortalLoginProps {
  defaultRole?: 'admin' | 'receptionist' | 'doctor';
}

export const StaffPortalLogin: React.FC<StaffPortalLoginProps> = ({ defaultRole = 'receptionist' }) => {
  const [identifier, setIdentifier] = useState(() => {
    if (defaultRole === 'admin') return 'admin';
    if (defaultRole === 'doctor') return 'olivia.w';
    return 'emma.davis';
  });
  const [password, setPassword] = useState(() => {
    if (defaultRole === 'admin') return 'Admin@123';
    if (defaultRole === 'doctor') return 'doc123';
    return 'Password@123';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const doctors = useStaffStore((s) => s.doctors);
  const receptionists = useStaffStore((s) => s.receptionists);
  const adminProfile = useStaffStore((s) => s.adminProfile);
  const setStaffAuth = useStaffStore((s) => s.setStaffAuth);
  const navigate = useNavigate();

  // Dynamic live role detection based on identifier input
  const detectedRole = useMemo(() => {
    const clean = identifier.trim().toLowerCase();
    if (!clean) return null;

    if (clean === 'admin' || clean === 'superadmin' || clean.includes('admin') || clean === adminProfile.email?.toLowerCase()) {
      return { role: 'admin', label: 'Hospital Administrator', color: 'bg-teal-50 text-[#0B5A54] border-teal-200', icon: ShieldCheck };
    }

    const isDoc = doctors.some(
      (d) =>
        d.username?.toLowerCase() === clean ||
        d.email.toLowerCase() === clean ||
        clean.startsWith('dr.') ||
        clean.startsWith('doc') ||
        d.name.toLowerCase().includes(clean)
    );
    if (isDoc || clean === 'doctor') {
      return { role: 'doctor', label: 'Clinical Physician / Doctor', color: 'bg-sky-50 text-sky-700 border-sky-200', icon: Stethoscope };
    }

    const isRec = receptionists.some(
      (r) =>
        r.username?.toLowerCase() === clean ||
        r.email.toLowerCase() === clean ||
        r.staffId?.toLowerCase() === clean ||
        clean.startsWith('rec') ||
        r.name.toLowerCase().includes(clean)
    );
    if (isRec || clean === 'receptionist') {
      return { role: 'receptionist', label: 'Front-Desk Receptionist', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: ClipboardList };
    }

    return null;
  }, [identifier, adminProfile, doctors, receptionists]);

  const handleQuickFill = (role: 'admin' | 'doctor' | 'receptionist') => {
    setError(null);
    if (role === 'admin') {
      setIdentifier('admin');
      setPassword('Admin@123');
    } else if (role === 'doctor') {
      setIdentifier('olivia.w');
      setPassword('doc123');
    } else {
      setIdentifier('emma.davis');
      setPassword('Password@123');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const cleanId = identifier.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      // 1. Attempt API backend staff login if available
      const res = await apiPost('/staff/login', { email: cleanId, password: cleanPassword });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.staff) {
          setStaffAuth(
            {
              id: data.staff.id,
              name: data.staff.name,
              email: data.staff.email,
              role: data.staff.role,
              department: data.staff.department,
              avatarUrl: data.staff.avatarUrl,
            },
            data.token
          );
          setIsLoading(false);
          if (data.staff.role === 'admin') navigate('/admin');
          else if (data.staff.role === 'doctor') navigate('/doctor');
          else navigate('/receptionist');
          return;
        }
      }
    } catch {
      // Fallback to client-side store verification
    }

    // 2. Check Admin Credentials
    const adminEmail = (adminProfile.email || 'admin@carepulse.com').toLowerCase();
    const adminPass = adminProfile.password || 'Admin@123';
    const adminUser = (adminProfile.username || 'admin').toLowerCase();

    if (
      (cleanId === 'admin' ||
        cleanId === 'superadmin' ||
        cleanId === adminEmail ||
        cleanId === adminUser ||
        cleanId === 'admin@carepulse.com') &&
      (cleanPassword === adminPass ||
        cleanPassword === 'Admin@123' ||
        cleanPassword === 'admin123' ||
        cleanPassword === 'admin')
    ) {
      setStaffAuth(
        {
          id: 'admin-1',
          name: adminProfile.name || 'Hospital Administrator',
          email: adminProfile.email || 'admin@carepulse.com',
          role: 'admin',
          department: 'Chief Medical Administration',
        },
        'token-admin-session'
      );
      setIsLoading(false);
      navigate('/admin');
      return;
    }

    // 3. Check Doctor Credentials
    const matchedDoctor = doctors.find(
      (d) =>
        d.username?.toLowerCase() === cleanId ||
        d.email.toLowerCase() === cleanId ||
        (cleanId === 'doctor' && d.id === 'doc-1') ||
        (cleanId === 'olivia.w' && d.id === 'doc-1')
    );

    if (
      matchedDoctor &&
      (cleanPassword === matchedDoctor.password ||
        cleanPassword === 'doc123' ||
        cleanPassword === 'password123' ||
        cleanPassword === 'Doctor@123' ||
        cleanPassword === 'doctor')
    ) {
      setStaffAuth(
        {
          id: matchedDoctor.id,
          name: matchedDoctor.name,
          email: matchedDoctor.email,
          role: 'doctor',
          department: matchedDoctor.department,
          avatarUrl: matchedDoctor.photo,
        },
        `token-doctor-${matchedDoctor.id}`
      );
      setIsLoading(false);
      navigate('/doctor');
      return;
    }

    // 4. Check Receptionist Credentials
    const matchedReceptionist = receptionists.find(
      (r) =>
        r.username?.toLowerCase() === cleanId ||
        r.email.toLowerCase() === cleanId ||
        r.staffId?.toLowerCase() === cleanId ||
        (cleanId === 'receptionist' && r.id === 'rec-1') ||
        (cleanId === 'emma.davis' && r.id === 'rec-1')
    );

    if (
      matchedReceptionist &&
      (cleanPassword === matchedReceptionist.password ||
        cleanPassword === 'Password@123' ||
        cleanPassword === 'password123' ||
        cleanPassword === 'receptionist' ||
        cleanPassword === 'rec123')
    ) {
      setStaffAuth(
        {
          id: matchedReceptionist.id,
          name: matchedReceptionist.name,
          email: matchedReceptionist.email,
          role: 'receptionist',
          department: 'Front Desk Registration',
        },
        `token-receptionist-${matchedReceptionist.id}`
      );
      setIsLoading(false);
      navigate('/receptionist');
      return;
    }

    // 5. Generic fallback for quick demo matching
    if (cleanId === 'doctor@carepulse.com' && (cleanPassword === 'password123' || cleanPassword === 'doc123')) {
      const doc = doctors[0] || { id: 'doc-1', name: 'Dr. Olivia Wilson', email: 'olivia.w@carepulse.com', department: 'Cardiology' };
      setStaffAuth(
        { id: doc.id, name: doc.name, email: doc.email, role: 'doctor', department: doc.department },
        'token-doctor-session'
      );
      setIsLoading(false);
      navigate('/doctor');
      return;
    }

    if (cleanId === 'receptionist@carepulse.com' && (cleanPassword === 'password123' || cleanPassword === 'Password@123')) {
      const rec = receptionists[0] || { id: 'rec-1', name: 'Emma Davis', email: 'emma.davis@carepulse.com' };
      setStaffAuth(
        { id: rec.id, name: rec.name, email: rec.email, role: 'receptionist', department: 'Front Desk' },
        'token-receptionist-session'
      );
      setIsLoading(false);
      navigate('/receptionist');
      return;
    }

    setError('Invalid username or password. Please verify your credentials or select a demo role.');
    setIsLoading(false);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSent(true);
    setTimeout(() => {
      setForgotSent(false);
      setIsForgotModalOpen(false);
    }, 2800);
  };

  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-[#0B5A54] selection:text-white">
      {/* ══════════════════════════════════════════════════════════════════
          LEFT PANEL — Premium Brand Hero with CarePulse App Logo
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

        {/* Top Header */}
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
                Unified Staff Portal
              </span>
            </div>
          </div>

          <span className="bg-white/10 text-teal-200 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-white/15 backdrop-blur-sm">
            Role-Based Access
          </span>
        </div>

        {/* Center: Official App Logo + Tagline + Feature Highlights */}
        <div className="relative z-10 flex flex-col items-center text-center my-auto py-8">
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
              CarePulse Staff
            </h1>
            <p className="text-sm text-teal-100/70 font-medium leading-relaxed">
              Single sign-on for Administrators, Clinical Physicians, and Front-Desk Receptionists.
            </p>
          </motion.div>

          {/* Feature Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="w-full max-w-[300px] space-y-2.5"
          >
            {[
              {
                icon: <Building2 className="w-4 h-4" />,
                title: 'Hospital Admin Command',
                desc: 'KPI intelligence, staff oversight & wings',
              },
              {
                icon: <Stethoscope className="w-4 h-4" />,
                title: 'Doctor Clinical Workspace',
                desc: 'Patient queues, diagnostics & Rx notes',
              },
              {
                icon: <ClipboardList className="w-4 h-4" />,
                title: 'Receptionist Front-Desk',
                desc: 'Fast token ticketing & patient check-in',
              },
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

        {/* Bottom: Security Footer */}
        <div className="relative z-10 flex items-center justify-between text-teal-200/50 text-xs pt-4 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>256-bit encrypted authentication</span>
          </div>
          <span className="text-[10px] text-teal-300/40 font-mono">Role Router v2.0</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          RIGHT PANEL — Clean Universal Staff Sign-In Card
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 bg-[#F8FAFC] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-slate-200/50 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-[430px]"
        >
          {/* Logo on Mobile/Tablet */}
          <div className="lg:hidden flex flex-col items-center text-center space-y-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#0B5A54] flex items-center justify-center text-white shadow-md">
              <Activity className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-xl font-black font-heading text-[#0B5A54] tracking-tight">CarePulse Staff</h1>
              <p className="text-xs font-semibold text-slate-400">Unified Hospital Portal Login</p>
            </div>
          </div>

          {/* Elevated Card */}
          <div className="bg-white rounded-3xl shadow-[0_12px_40px_rgba(15,23,42,0.06)] border border-slate-200/80 p-7 sm:p-9 space-y-5">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight font-heading">
                  Staff Sign In
                </h2>
                {detectedRole && (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border animate-in fade-in ${detectedRole.color}`}
                  >
                    <detectedRole.icon className="w-3 h-3" />
                    <span>{detectedRole.label.split(' ')[0]}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Enter your work credentials. System auto-routes to your portal.
              </p>
            </div>

            {/* Quick Demo Role Selector */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#0B5A54]" />
                  <span>1-Click Demo Login:</span>
                </span>
                <span className="text-[9px] text-slate-400 font-semibold">Select to autofill</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin')}
                  className="py-2 px-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer text-center bg-white hover:bg-teal-50 text-slate-700 hover:text-[#0B5A54] border border-slate-200 hover:border-teal-200 shadow-2xs flex flex-col items-center gap-0.5"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#0B5A54]" />
                  <span className="font-black">Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('doctor')}
                  className="py-2 px-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer text-center bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-200 shadow-2xs flex flex-col items-center gap-0.5"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                  <span className="font-black">Doctor</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('receptionist')}
                  className="py-2 px-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer text-center bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-200 shadow-2xs flex flex-col items-center gap-0.5"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-black">Receptionist</span>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username or Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 tracking-wide">
                  Username or Work Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="staff-identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setError(null);
                    }}
                    placeholder="e.g. admin, emma.davis, olivia.w"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 tracking-wide">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotIdentifier(identifier);
                      setIsForgotModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-[#0B5A54] hover:underline cursor-pointer"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="staff-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] focus:bg-white transition-all shadow-2xs"
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
                className="w-full py-3 mt-1 rounded-xl bg-[#0B5A54] hover:bg-[#084540] active:bg-[#063935] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    <span>Authenticating & Routing...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Security Notice & Patient App Link */}
            <div className="pt-4 border-t border-slate-100 flex flex-col items-center justify-center gap-2 text-center">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Authorized clinical and administrative personnel only</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-xs font-bold text-[#0B5A54] hover:underline cursor-pointer"
              >
                Are you a patient? Go to Patient App &rarr;
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Forgot Password Modal ── */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#0B5A54]" />
                <h3 className="text-sm font-black text-slate-900 font-heading">
                  Staff Password Assistance
                </h3>
              </div>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotSent ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2 animate-in fade-in">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="text-xs font-black text-emerald-800">Assistance Request Sent</h4>
                <p className="text-[11px] text-emerald-700 font-medium">
                  A password reset link or internal IT ticket has been logged for your staff account.
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3 text-xs font-bold text-slate-700">
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Enter your staff username or work email. Your department administrator or IT lead will verify your account.
                </p>
                <input
                  type="text"
                  required
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="Username or work email"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-bold text-xs shadow-md cursor-pointer"
                  >
                    Send Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPortalLogin;
