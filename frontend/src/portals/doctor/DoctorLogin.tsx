// src/portals/doctor/DoctorLogin.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Stethoscope,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

export const DoctorLogin: React.FC = () => {
  const [identifier, setIdentifier] = useState('olivia.w@carepulse.com');
  const [password, setPassword] = useState('doc123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doctors = useStaffStore((s) => s.doctors);
  const setStaffAuth = useStaffStore((s) => s.setStaffAuth);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    // Check doctors in store
    const matchedDoc = doctors.find(
      (d) =>
        d.email?.toLowerCase() === cleanId ||
        d.username?.toLowerCase() === cleanId ||
        d.id.toLowerCase() === cleanId ||
        (cleanId.includes('olivia') && d.name.toLowerCase().includes('olivia')) ||
        (cleanId.includes('marcus') && d.name.toLowerCase().includes('marcus')) ||
        (cleanId.includes('sophia') && d.name.toLowerCase().includes('sophia'))
    );

    if (matchedDoc && (cleanPass === matchedDoc.password || cleanPass === 'doc123' || cleanPass === 'doctor' || cleanPass === 'Doctor@123')) {
      setStaffAuth(
        {
          id: matchedDoc.id,
          name: matchedDoc.name,
          email: matchedDoc.email,
          role: 'doctor',
          department: matchedDoc.department,
          staff_code: matchedDoc.staff_code || matchedDoc.staffCode || 'D001101',
          avatarUrl: matchedDoc.photo,
        },
        'mock-doc-token-auth'
      );
      setIsLoading(false);
      navigate('/doctor');
      return;
    }

    // Default fallback doctor for instant preview
    if (cleanId === 'doctor' || cleanId === 'doc' || cleanId.includes('carepulse')) {
      const defaultDoc = doctors[0] || {
        id: 'doc-1',
        name: 'Dr. Olivia Wilson',
        email: 'olivia.w@carepulse.com',
        department: 'Cardiology',
        staff_code: 'D001101',
      };
      setStaffAuth(
        {
          id: defaultDoc.id,
          name: defaultDoc.name,
          email: defaultDoc.email,
          role: 'doctor',
          department: defaultDoc.department,
          staff_code: defaultDoc.staff_code || 'D001101',
          avatarUrl: defaultDoc.photo,
        },
        'mock-doc-token-auth'
      );
      setIsLoading(false);
      navigate('/doctor');
      return;
    }

    setIsLoading(false);
    setError('Invalid doctor credentials. Please check your Doctor Email/ID and Password.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#062c29] to-[#0b4843] flex items-center justify-center p-4 selection:bg-[#0B5A54] selection:text-white relative overflow-hidden font-sans">
      {/* Background Decorative Rings */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 overflow-hidden z-10">
        
        {/* Left Form Column */}
        <div className="md:col-span-7 p-7 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Top Brand Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0B5A54] to-[#14B8A6] flex items-center justify-center shadow-lg shadow-teal-900/20">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black text-slate-900 tracking-tight">CarePulse</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-[#0B5A54] border border-teal-200">
                    Physician
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Outpatient Consultation Portal</p>
              </div>
            </div>

            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Doctor Sign In</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">Access your consultation cabin, live queue, and EMR records.</p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Doctor ID / Work Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. olivia.w@carepulse.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] focus:border-transparent transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Cabin Access Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B5A54] focus:border-transparent transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0B5A54] focus:ring-[#0B5A54] border-slate-300 rounded-sm"
                  />
                  <span>Remember this device</span>
                </label>
                <span className="text-[#0B5A54] hover:underline font-bold cursor-pointer">
                  Forgot password?
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#0B5A54] to-[#14B8A6] text-white font-bold text-sm shadow-lg shadow-teal-900/25 hover:shadow-xl hover:shadow-teal-900/35 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enter Consultation Cabin</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Doctor Portal · CarePulse Health</span>
            <div className="flex items-center gap-1 text-teal-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>HIPAA Compliant</span>
            </div>
          </div>
        </div>

        {/* Right Feature Panel (Desktop widescreen view, hidden on tablet portrait) */}
        <div className="hidden md:flex md:col-span-5 bg-gradient-to-br from-[#0B5A54] to-[#063b37] p-8 text-white flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-teal-200 text-xs font-semibold backdrop-blur-sm border border-white/10 mb-6">
              <Building2 className="w-3.5 h-3.5 text-teal-300" />
              <span>CarePulse OPD Systems</span>
            </div>
            
            <h2 className="text-xl font-black leading-snug tracking-tight mb-2">
              High-Precision Clinical Workspace
            </h2>
            <p className="text-teal-100/70 text-xs leading-relaxed mb-6">
              Streamline patient consultations with instant vitals flags, real-time SOAP note templates, digital prescription builder, and EMR vault access.
            </p>

            <div className="space-y-3">
              {[
                { title: 'Live Cabin Queue & TTS Calling', desc: 'Call patients with high-fidelity audio chimes and voice announcements.' },
                { title: 'Structured SOAP Documentation', desc: 'Subjective, Objective, Assessment, and Plan fields with fast presets.' },
                { title: 'Full Longitudinal EMR History', desc: 'Instant search across past visits, prior prescriptions, and allergies.' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-white">{item.title}</p>
                    <p className="text-[11px] text-teal-200/80 leading-tight mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-white/10">
            <p className="text-[11px] text-teal-200/70">
              Quick Doctor Credentials: <strong className="text-white">olivia.w@carepulse.com</strong> / <strong className="text-white">doc123</strong>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DoctorLogin;
