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
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { apiPost, apiFetch } from '../../lib/apiFetch';

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION TIMINGS & DESIGN SYSTEM CONFIG
// ─────────────────────────────────────────────────────────────────────────────
export const STAFF_LOGIN_CONFIG = {
  introDurationMs: 2800,
  taglineDelayMs: 600,
  transitionDurationMs: 800,
  blobBreathingDuration: 7,
  staggerDelay: 0.08,
  microTransitionMs: 200,
  tokens: {
    primaryTeal: '#0F5A52',
    darkTeal: '#0B3F3A',
    deepTealStart: '#0B4F4A',
    deepTealMid: '#0F6B5E',
    deepTealEnd: '#0A3D3A',
    accentEmerald: '#14B8A6',
    mintTint: '#E6F6F3',
    backgroundLight: '#F7FAFA',
    textMain: '#0F172A',
    textMuted: '#64748B',
    errorRed: '#DC2626',
    successGreen: '#16A34A',
  },
};

interface StaffPortalLoginProps {
  defaultRole?: 'admin' | 'receptionist' | 'doctor';
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 1: WELCOME INTRO SCREEN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface WelcomeIntroProps {
  onTransitionComplete: () => void;
}

const WelcomeIntro: React.FC<WelcomeIntroProps> = ({ onTransitionComplete }) => {
  const [isExpanding, setIsExpanding] = useState(false);

  useEffect(() => {
    // Stage 1 lasts ~2.8 seconds, then initiates the seamless expansion dissolve
    const timer = setTimeout(() => {
      setIsExpanding(true);
    }, STAFF_LOGIN_CONFIG.introDurationMs);

    return () => clearTimeout(timer);
  }, []);

  const handleAnimationEnd = () => {
    if (isExpanding) {
      onTransitionComplete();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#FAFCFC] overflow-hidden select-none"
      initial={{ opacity: 1 }}
      animate={{ opacity: isExpanding ? 0 : 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={handleAnimationEnd}
    >
      {/* Dynamic Ambient Background Elements */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#FAFCFC]/60 to-[#F2F8F7] pointer-events-none" />

      {/* ── Center Soft Blurred Gradient "Aura" Blob ── */}
      <motion.div
        className="absolute w-[360px] h-[360px] sm:w-[500px] sm:h-[500px] md:w-[620px] md:h-[620px] rounded-full pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 35% 35%, rgba(20, 184, 166, 0.78) 0%, transparent 55%),
            radial-gradient(circle at 65% 30%, rgba(45, 212, 191, 0.72) 0%, transparent 50%),
            radial-gradient(circle at 45% 70%, rgba(15, 90, 82, 0.85) 0%, transparent 60%),
            radial-gradient(circle at 75% 70%, rgba(56, 189, 248, 0.55) 0%, transparent 55%),
            radial-gradient(circle at 25% 65%, rgba(254, 240, 138, 0.45) 0%, transparent 45%)
          `,
          filter: 'blur(75px)',
        }}
        initial={{ scale: 0.92, opacity: 0, rotate: 0 }}
        animate={
          isExpanding
            ? {
                scale: 3.2,
                opacity: 0,
                transition: { duration: 0.85, ease: [0.4, 0, 0.2, 1] },
              }
            : {
                scale: [1, 1.07, 0.98, 1.05, 1],
                opacity: 0.9,
                rotate: [0, 6, -5, 4, 0],
                transition: {
                  duration: STAFF_LOGIN_CONFIG.blobBreathingDuration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                },
              }
        }
      />

      {/* ── Subtle Secondary Atmospheric Mint Halo ── */}
      <motion.div
        className="absolute w-[280px] h-[280px] sm:w-[400px] sm:h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(167, 243, 208, 0.6) 0%, rgba(15, 90, 82, 0.2) 60%, transparent 80%)',
          filter: 'blur(50px)',
        }}
        animate={{
          scale: isExpanding ? 2.5 : [1.02, 0.96, 1.04, 1.02],
          opacity: isExpanding ? 0 : [0.6, 0.85, 0.6],
        }}
        transition={{
          duration: isExpanding ? 0.8 : 5,
          repeat: isExpanding ? 0 : Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* ── Center Typography Content ── */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
        {/* Main "Welcome" Heading */}
        <motion.h1
          className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tight drop-shadow-[0_10px_35px_rgba(11,79,74,0.45)] font-heading"
          initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
          animate={
            isExpanding
              ? {
                  opacity: 0,
                  y: -20,
                  scale: 1.06,
                  filter: 'blur(6px)',
                  transition: { duration: 0.5, ease: 'easeIn' },
                }
              : {
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
                }
          }
        >
          Welcome
        </motion.h1>

        {/* Tagline Subtext */}
        <motion.p
          className="mt-3.5 text-xs sm:text-sm md:text-base font-bold text-[#0D9488] tracking-widest uppercase bg-white/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-teal-100/80 shadow-xs"
          initial={{ opacity: 0, y: 14 }}
          animate={
            isExpanding
              ? {
                  opacity: 0,
                  y: -10,
                  transition: { duration: 0.4 },
                }
              : {
                  opacity: 1,
                  y: 0,
                  transition: {
                    delay: STAFF_LOGIN_CONFIG.taglineDelayMs / 1000,
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1],
                  },
                }
          }
        >
          CarePulse Staff Portal
        </motion.p>
      </div>

      {/* Optional Quick Skip Button for Repeat Visits */}
      <motion.button
        type="button"
        onClick={() => setIsExpanding(true)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        whileHover={{ opacity: 1, scale: 1.04 }}
        className="absolute bottom-8 text-xs font-semibold text-slate-400 hover:text-[#0F5A52] px-3 py-1.5 rounded-lg border border-slate-200/60 bg-white/50 backdrop-blur-xs transition-all cursor-pointer"
      >
        Skip intro &rarr;
      </motion.button>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 2: MAIN SPLIT-SCREEN STAFF PORTAL LOGIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export const StaffPortalLogin: React.FC<StaffPortalLoginProps> = () => {
  // Determine if intro has already been shown this session or if reduced motion is requested
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

  const triggerShake = () => {
    setShakeError(true);
    setTimeout(() => setShakeError(false), 500);
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
      // 1. Attempt API backend staff login if available (accepts username or email)
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
          const hospId = data.staff.hospitalId || data.staff.hospital_id || (data.staff.role === 'superadmin' ? 'hosp-1' : undefined);
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
            if (userRole === 'superadmin') navigate('/superadmin');
            else if (userRole === 'admin') navigate('/admin');
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
      // Fallback to client-side store verification
    }

    // 2. Check SuperAdmin Credentials (API or Local Fallback)
    if (
      cleanId === 'superadmin' ||
      cleanId === 'superadmin@carepulse.com' ||
      cleanId === 'sa101' ||
      cleanId === 'sa'
    ) {
      try {
        const saRes = await apiPost('/superadmin/login', {
          email: cleanId,
          username: cleanId,
          identifier: cleanId,
          password: cleanPassword,
        });
        if (saRes.ok) {
          const saData = await saRes.json();
          if (saData && saData.staff) {
            const token = saData.token || 'token-superadmin-session';
            localStorage.setItem('superadmin_token', token);
            sessionStorage.setItem('superadmin_token', token);
            setStaffAuth(
              {
                id: saData.staff.id || 'superadmin-1',
                name: saData.staff.name || 'Platform SuperAdmin',
                email: saData.staff.email || 'superadmin@carepulse.com',
                role: 'superadmin',
                department: saData.staff.department || 'Global Platform Operations',
                avatarUrl: saData.staff.avatarUrl,
                staff_code: saData.staff.staff_code || 'SA101',
                staffCode: saData.staff.staff_code || 'SA101',
                phone: saData.staff.phone,
                hospital_id: undefined,
                hospitalId: undefined,
              },
              token
            );
            setIsLoading(false);
            setSuccessInfo({ role: 'superadmin', name: saData.staff.name || 'Platform SuperAdmin' });
            setTimeout(() => navigate('/superadmin'), 650);
            return;
          }
        }
      } catch {}

      if (cleanPassword === 'SuperAdmin@123' || cleanPassword === 'superadmin' || cleanPassword === 'superaadmin') {
        const fallbackToken = 'token-superadmin-session';
        localStorage.setItem('superadmin_token', fallbackToken);
        sessionStorage.setItem('superadmin_token', fallbackToken);
        setStaffAuth(
          {
            id: 'superadmin-1',
            name: 'Platform SuperAdmin',
            email: 'superadmin@carepulse.com',
            role: 'superadmin',
            department: 'Global Platform Operations',
            staff_code: 'SA101',
            staffCode: 'SA101',
            hospitalId: undefined,
            hospital_id: undefined,
          },
          fallbackToken
        );
        setIsLoading(false);
        setSuccessInfo({ role: 'superadmin', name: 'Platform SuperAdmin' });
        setTimeout(() => navigate('/superadmin'), 650);
        return;
      }
    }

    // 3. Check Admin Credentials (Username or Email)
    const adminEmail = (adminProfile.email || 'admin@carepulse.com').toLowerCase();
    const adminPass = adminProfile.password || 'Admin@123';
    const adminUser = (adminProfile.username || 'admin').toLowerCase();

    if (
      (cleanId === 'admin' ||
        cleanId === 'superadmin' ||
        cleanId === 'bag' ||
        cleanId === 'bag@carepulse.com' ||
        cleanId === 'a001101' ||
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
    } catch {}
    setShowIntro(false);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col font-sans bg-[#F7FAFA] text-slate-900 selection:bg-[#0F5A52] selection:text-white relative overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────────
          STAGE 1: WELCOME INTRO OVERLAY
      ───────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showIntro && <WelcomeIntro onTransitionComplete={onIntroComplete} />}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────
          STAGE 2: SPLIT-SCREEN SAAS LOGIN WORKSPACE
      ───────────────────────────────────────────────────────────────── */}
      <div className="min-h-screen min-h-[100dvh] flex flex-col lg:flex-row w-full flex-1">
        {/* ═══════════════════════════════════════════════════════════════
            LEFT PANEL — Premium Brand Hero (50% Width on Desktop)
        ═══════════════════════════════════════════════════════════════ */}
        <motion.div
          className="relative lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #0B4F4A 0%, #0F6B5E 45%, #0A3D3A 100%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Subtle Precision Grid Texture */}
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #FFFFFF 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Atmospheric Radial Glows for Layered Depth */}
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none opacity-40"
            style={{
              background: 'radial-gradient(circle, rgba(45, 212, 191, 0.4) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
          <div
            className="absolute -bottom-24 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none opacity-30"
            style={{
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, transparent 70%)',
              filter: 'blur(70px)',
            }}
          />

          {/* Floating Faint Glass Orb Micro-animation */}
          <motion.div
            className="absolute top-1/3 right-12 w-44 h-44 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-3xl pointer-events-none hidden lg:block"
            animate={{
              y: [-12, 14, -12],
              rotate: [0, 10, -8, 0],
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* ── TOP BAR: Header & Role-Based Access Tag ── */}
          <motion.div
            className="relative z-10 flex items-center justify-between w-full"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Top-Left Logo Block */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center border border-white/80 shrink-0">
                <svg
                  className="w-5 h-5 text-[#0F5A52]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 21h18" />
                  <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
                  <path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
                  <path d="M10 9h4" />
                  <path d="M12 7v4" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-black tracking-wider text-sm font-heading">
                    CAREPULSE
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-200 border border-teal-300/30 tracking-widest">
                    STAFF
                  </span>
                </div>
                <p className="text-[11px] text-teal-100/70 font-medium">Unified Staff Portal</p>
              </div>
            </div>

            {/* Top-Right Glass Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-[10px] font-bold text-white/90 tracking-wider shadow-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ROLE-BASED ACCESS</span>
            </div>
          </motion.div>

          {/* ── CENTER HERO: Branding & Role Capabilities ── */}
          <div className="relative z-10 my-auto py-8 lg:py-12 flex flex-col items-start max-w-xl">
            {/* Center Logo Emblem */}
            <motion.div
              className="w-14 h-14 rounded-2xl bg-white shadow-xl shadow-teal-950/25 flex items-center justify-center mb-6 border border-white/90"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.6 }}
            >
              <svg
                className="w-7 h-7 text-[#0F5A52]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 21h18" />
                <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
                <path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
                <path d="M10 9h4" />
                <path d="M12 7v4" />
              </svg>
            </motion.div>

            <motion.h2
              className="text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-tight font-heading"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.6 }}
            >
              CarePulse Staff
            </motion.h2>

            <motion.p
              className="mt-3 text-sm sm:text-base text-teal-100/80 font-medium leading-relaxed max-w-md"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.6 }}
            >
              Single sign-on for Hospital Administrators, Clinical Physicians, Nurses, and Front-Desk Receptionists.
            </motion.p>

            {/* Three Glassmorphism Role Cards */}
            <div className="mt-8 sm:mt-10 w-full space-y-3">
              {[
                {
                  id: 'admin',
                  title: 'Hospital Admin Command',
                  desc: 'KPI intelligence, staff oversight & wings',
                  icon: <Building2 className="w-4 h-4 text-emerald-300" />,
                },
                {
                  id: 'doctor',
                  title: 'Doctor Clinical Workspace',
                  desc: 'Patient queues, diagnostics & Rx notes',
                  icon: <Stethoscope className="w-4 h-4 text-teal-300" />,
                },
                {
                  id: 'receptionist',
                  title: 'Receptionist Front-Desk',
                  desc: 'Fast token ticketing & patient check-in',
                  icon: <ClipboardList className="w-4 h-4 text-cyan-300" />,
                },
              ].map((role, idx) => (
                <motion.div
                  key={role.id}
                  className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/12 backdrop-blur-md shadow-xs transition-all duration-200 cursor-default hover:-translate-y-0.5"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.44 + idx * STAFF_LOGIN_CONFIG.staggerDelay, duration: 0.55 }}
                >
                  <div className="w-9 h-9 rounded-xl bg-teal-400/20 border border-teal-300/20 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                    {role.icon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide leading-tight">
                      {role.title}
                    </h4>
                    <p className="text-[11px] text-teal-100/70 font-medium leading-tight truncate mt-0.5">
                      {role.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── BOTTOM FOOTER: Encryption & Version ── */}
          <motion.div
            className="relative z-10 flex items-center justify-between text-teal-200/60 text-xs pt-6 border-t border-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>256-bit encrypted authentication</span>
            </div>
            <span className="font-mono text-[11px] tracking-wider text-teal-300/70">
              Role Router v2.0
            </span>
          </motion.div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            RIGHT PANEL — Pure Light Floating Login Form (50% Width)
        ═══════════════════════════════════════════════════════════════ */}
        <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-14 relative bg-[#F7FAFA]">
          {/* Faint Pastel Wash Background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-50"
            style={{
              background: 'radial-gradient(ellipse at 80% 20%, rgba(20, 184, 166, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(56, 189, 248, 0.06) 0%, transparent 60%)',
            }}
          />

          {/* ── Centered Floating White Card ── */}
          <motion.div
            className={`relative z-10 w-full max-w-[460px] bg-white rounded-[26px] p-7 sm:p-9 md:p-10 border border-slate-100 shadow-[0_20px_50px_rgba(15,90,82,0.08),0_1px_3px_rgba(0,0,0,0.04)] ${
              shakeError ? 'animate-shake' : ''
            }`}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="space-y-1.5 text-left mb-7">
              <h3 className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight font-heading">
                Staff Sign In
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-500 font-medium leading-relaxed">
                Enter your work credentials. System auto-routes to your portal.
              </p>
            </div>

            {/* Error Alert Row */}
            <AnimatePresence>
              {error && (
                <motion.div
                  role="alert"
                  aria-live="assertive"
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Toast State */}
            <AnimatePresence>
              {successInfo && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-5 flex items-center gap-3 p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-[#0F5A52] text-xs font-bold"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="leading-tight">Welcome back, {successInfo.name}!</p>
                    <p className="text-[11px] font-medium text-teal-700 mt-0.5">
                      Routing to {successInfo.role.toUpperCase()} workspace...
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sign-In Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Field 1: Username / Work Email */}
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="staff-identifier"
                  className="block text-xs font-bold text-slate-700 tracking-wide"
                >
                  Username or Work Email
                </label>
                <div className="relative group">
                  <User className="w-4 h-4 text-slate-400 group-focus-within:text-[#0F5A52] absolute left-4 top-1/2 -translate-y-1/2 transition-colors pointer-events-none" />
                  <input
                    id="staff-identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setError(null);
                    }}
                    placeholder="e.g. kmchadmin@gmail.com, doc, rec"
                    className="w-full h-[52px] pl-11 pr-4 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-[14px] text-xs sm:text-[13px] font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-[#0F5A52] focus:ring-4 focus:ring-[#0F5A52]/10 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="staff-password"
                    className="block text-xs font-bold text-slate-700 tracking-wide"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotIdentifier(identifier);
                      setIsForgotModalOpen(true);
                    }}
                    className="text-xs font-bold text-[#0F5A52] hover:text-[#0B3F3A] hover:underline cursor-pointer transition-colors"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-[#0F5A52] absolute left-4 top-1/2 -translate-y-1/2 transition-colors pointer-events-none" />
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
                    className="w-full h-[52px] pl-11 pr-12 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-[14px] text-xs sm:text-[13px] font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-[#0F5A52] focus:ring-4 focus:ring-[#0F5A52]/10 focus:bg-white transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember This Device Checkbox */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="w-4 h-4 rounded-md border-slate-300 text-[#0F5A52] focus:ring-[#0F5A52]/20 cursor-pointer accent-[#0F5A52]"
                  />
                  <span className="text-xs font-semibold text-slate-600">
                    Remember this device
                  </span>
                </label>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isLoading || !!successInfo}
                className="group relative w-full h-[52px] rounded-[14px] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:shadow-[#0F5A52]/25 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]"
                style={{
                  background: 'linear-gradient(135deg, #0B4F4A 0%, #0F5A52 50%, #0A3D3A 100%)',
                }}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
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
                    <span>Verifying credentials…</span>
                  </div>
                ) : successInfo ? (
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                    <span>Signing in…</span>
                  </div>
                ) : (
                  <>
                    <span>SIGN IN TO PORTAL</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </button>

              {/* Helper Subtext */}
              <p className="text-center text-[11px] text-slate-400 font-medium pt-1">
                Need access? Contact your hospital administrator.
              </p>
            </form>
          </motion.div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          FORGOT PASSWORD ASSISTANCE MODAL
      ───────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isForgotModalOpen && (
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
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0F5A52] flex items-center justify-center border border-teal-100">
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
                    className="w-full h-11 rounded-xl bg-[#0F5A52] hover:bg-[#0B3F3A] text-white text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Auto-Fill Credentials & Sign In</span>
                  </button>
                </div>
              ) : null}

              {/* Status Notices */}
              {forgotSuccessMessage && !resolvedResult && (
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-800 font-medium flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0F5A52] shrink-0 mt-0.5" />
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
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0F5A52] focus:bg-white transition-all"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 h-11 rounded-xl bg-[#0F5A52] hover:bg-[#0B3F3A] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
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
        )}
      </AnimatePresence>
    </div>
  );
};

export default StaffPortalLogin;
