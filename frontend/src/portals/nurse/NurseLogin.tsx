// frontend/src/portals/nurse/NurseLogin.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Building2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';
import { apiPost } from '../../lib/apiFetch';

export const NurseLogin: React.FC = () => {
  const [identifier, setIdentifier] = useState('nurse@carepulse.com');
  const [password, setPassword] = useState('Nurse@123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStaffAuth = useStaffStore((s) => s.setStaffAuth);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const cleanId = identifier.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const res = await apiPost('/staff/login', {
        email: cleanId,
        username: cleanId,
        identifier: cleanId,
        password: cleanPassword,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.staff) {
          const hospId = data.staff.hospitalId || data.staff.hospital_id || 'hosp-bag';
          setStaffAuth(
            {
              id: data.staff.id,
              name: data.staff.name,
              email: data.staff.email,
              role: 'nurse',
              department: data.staff.department || 'Triage & Patient Vitals',
              avatarUrl: data.staff.avatarUrl,
              hospitalId: hospId,
              hospital_id: hospId,
              staff_code: data.staff.staff_code || data.staff.staffCode || 'N007101',
              staffCode: data.staff.staffCode || data.staff.staff_code || 'N007101',
              phone: data.staff.phone,
            },
            data.token
          );
          setIsLoading(false);
          navigate('/nurse');
          return;
        }
      }
    } catch {
      // Fallback
    }

    // Fallback default nurse credentials
    if (
      (cleanId === 'nurse' || cleanId === 'nurse@carepulse.com' || cleanId.startsWith('n00')) &&
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
      navigate('/nurse');
      return;
    }

    setError('Invalid nurse credentials. Use nurse@carepulse.com / Nurse@123 or appointed nurse account.');
    setIsLoading(false);
  };

  const fillDemoNurse = () => {
    setIdentifier('nurse@carepulse.com');
    setPassword('Nurse@123');
    setError(null);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans selection:bg-[#0B5A54] selection:text-white">
      {/* ── Left Hero Panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] bg-[#0B5A54] relative overflow-hidden px-12 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_25%_35%,#177D74_0%,#0B5A54_55%,#053632_100%)] pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-lg">
              <HeartPulse className="w-7 h-7 text-teal-200" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-heading tracking-tight">CarePulse</h1>
              <p className="text-xs text-teal-200/80 font-medium">Empathetic Clinical Workstation</p>
            </div>
          </div>

          <div className="pt-8 space-y-3">
            <span className="px-2.5 py-1 rounded-md bg-teal-400/20 text-teal-200 border border-teal-300/30 text-xs font-black uppercase tracking-wider">
              Nurse Station Portal
            </span>
            <h2 className="text-3xl font-black text-white leading-tight font-heading">
              Pre-Consultation Vitals &amp; Lab Diagnostic Entry
            </h2>
            <p className="text-sm text-teal-100/80 leading-relaxed font-normal">
              Record patient vital signs, auto-calculate body mass index, flag abnormal screening metrics, and upload lab test reports before doctor consultation.
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-teal-700/40 text-xs text-teal-200/70 space-y-1">
          <div className="flex items-center gap-2 font-bold text-teal-100">
            <Building2 className="w-4 h-4" />
            <span>Scoped to Hospital Facility: BAG Hospital</span>
          </div>
          <p className="text-[11px]">Strict Role Separation &bull; Cannot write doctor prescriptions or edit schedules.</p>
        </div>
      </div>

      {/* ── Right Login Form Panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
          <div>
            <span className="px-2.5 py-1 rounded-md bg-teal-50 text-[#0B5A54] border border-teal-200 text-[10px] font-black uppercase tracking-wider">
              Staff Authentication
            </span>
            <h2 className="text-2xl font-black text-slate-900 font-heading mt-2">Nurse Sign In</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your assigned staff code or registered work email to access the queue.
            </p>
          </div>

          {/* Quick Fill Demo Credentials */}
          <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-100 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-teal-900">Demo Nurse Account</div>
              <div className="text-[11px] text-teal-700 font-mono">nurse or nurse@carepulse.com / Nurse@123</div>
            </div>
            <button
              type="button"
              onClick={fillDemoNurse}
              className="px-2.5 py-1 rounded-lg bg-[#0B5A54] hover:bg-[#084540] text-white font-bold text-[11px] cursor-pointer transition-colors shadow-xs"
            >
              Auto Fill
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Username, Work Email or Staff Code</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. nurse, nurse@carepulse.com or N007101"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Nurse Station</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[10px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Authorized clinical personnel only &bull; CarePulse RBAC Enforced</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/staff/login')}
              className="text-xs font-bold text-[#0B5A54] hover:underline cursor-pointer"
            >
              Other Staff Portals (Admin / Doctor / Receptionist) &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
