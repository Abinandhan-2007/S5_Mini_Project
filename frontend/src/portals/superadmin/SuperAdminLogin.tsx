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
    <div className="min-h-screen bg-[#041613] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-[#00DC82] selection:text-[#051B17]">
      {/* Dynamic Background Grid & Glows */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#00DC82_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-[#00DC82]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] bg-[#0B5A54]/25 rounded-full blur-3xl pointer-events-none" />

      {/* Main Command Console Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-[#051B17] border border-[#0D3831] backdrop-blur-2xl rounded-2xl shadow-2xl p-8 z-10"
      >
        {/* Top Header Badge */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0D3831] to-[#051B17] border border-[#16564B] flex items-center justify-center text-[#00DC82] shadow-inner mb-4">
            <Globe2 className="w-7 h-7" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded font-mono text-[10px] font-bold tracking-widest bg-[#00DC82]/15 text-[#00DC82] border border-[#00DC82]/30 uppercase mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            ROOT INFRASTRUCTURE LEVEL 0
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-heading">
            SuperAdmin Console
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Platform governance, hospital provisioning &amp; administrator credentialing
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-mono flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
              Root Identifier / Email
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
                className="w-full pl-10 pr-4 py-2.5 bg-[#08231E] border border-[#11453D] text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00DC82] focus:border-transparent transition-all placeholder:text-slate-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
              Master Access Key
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
                className="w-full pl-10 pr-10 py-2.5 bg-[#08231E] border border-[#11453D] text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00DC82] focus:border-transparent transition-all placeholder:text-slate-500 font-mono"
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
            className="w-full py-3 px-4 mt-2 bg-[#00DC82] hover:bg-[#00c776] text-[#051B17] font-bold rounded-xl text-xs font-mono shadow-lg shadow-[#00DC82]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-[#051B17]/30 border-t-[#051B17] rounded-full animate-spin" />
            ) : (
              <>
                <span>AUTHENTICATE ROOT ACCESS</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Assistant */}
        <div className="mt-6 pt-5 border-t border-[#0D3831] text-center">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
            <span>Demo Root Access:</span>
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-[#00DC82] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3" />
              Auto-Fill
            </button>
          </div>
          <div className="bg-[#03110E] p-3 rounded-xl border border-[#0D3831] text-left font-mono text-[11px] text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Identity:</span>
              <span className="text-slate-300">superadmin@carepulse.com</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Role Code:</span>
              <span className="text-[#00DC82] font-bold">SA101</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Key:</span>
              <span className="text-slate-300">SuperAdmin@123</span>
            </div>
          </div>
        </div>

        {/* Portal Switching Link */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => navigate('/staff/login')}
            className="text-xs text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer font-mono"
          >
            <Building2 className="w-3.5 h-3.5 text-[#00DC82]" />
            <span>Switch to Hospital Staff Portal</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SuperAdminLogin;
