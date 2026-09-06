// frontend/src/portals/superadmin/SuperAdminLogin.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  CheckCircle2,
  Globe2,
} from 'lucide-react';
import { superadminService } from '../../services/superadminService';
import { useStaffStore } from '../../store/staffStore';

export const SuperAdminLogin: React.FC = () => {
  const [email, setEmail] = useState('superadmin@carepulse.com');
  const [password, setPassword] = useState('SuperAdmin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStaffAuth = useStaffStore((s) => s.setStaffAuth);
  const navigate = useNavigate();

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
      setError(err?.message || 'Invalid SuperAdmin credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail('superadmin@carepulse.com');
    setPassword('SuperAdmin@123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Accents */}
      <div className="absolute top-[-15%] left-[-10%] w-96 h-96 bg-[#0B5A54]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-96 h-96 bg-teal-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-8 z-10"
      >
        {/* Top Header Badge */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0B5A54] to-teal-600 flex items-center justify-center text-white shadow-lg shadow-[#0B5A54]/40 mb-4">
            <Globe2 className="w-7 h-7" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Global Platform Root
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SuperAdmin Portal</h1>
          <p className="text-sm text-slate-400 mt-1">
            Top-level authority over hospitals, facilities, and administrators
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              SuperAdmin Email or Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="superadmin@carepulse.com or SA101"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] focus:border-transparent transition-all placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Master Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-800/80 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5A54] focus:border-transparent transition-all placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 mt-2 bg-gradient-to-r from-[#0B5A54] to-teal-600 hover:from-[#094843] hover:to-teal-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-[#0B5A54]/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Access Network Control</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Assistant */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Root Credentials:</span>
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-teal-400 hover:text-teal-300 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3" />
              Auto Fill Demo
            </button>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-left font-mono text-xs text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Email:</span>
              <span>superadmin@carepulse.com</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Code:</span>
              <span className="text-teal-400 font-bold">SA101</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Password:</span>
              <span>SuperAdmin@123</span>
            </div>
          </div>
        </div>

        {/* Portal Switching Link */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => navigate('/staff/login')}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            Switch to Hospital Staff Portal (Admin / Doctor / Receptionist)
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SuperAdminLogin;
