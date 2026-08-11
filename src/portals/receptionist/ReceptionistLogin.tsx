import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useStaffStore } from '../../store/staffStore';

export const ReceptionistLogin: React.FC = () => {
  const [email, setEmail] = useState('receptionist@carepulse.com');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const setStaffAuth = useStaffStore((s) => s.setStaffAuth);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setStaffAuth(
        {
          id: 'rec-101',
          name: 'Emily Watson',
          email,
          role: 'receptionist',
        },
        'token-receptionist-xyz'
      );
      setIsLoading(false);
      navigate('/receptionist');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-[#0B5A54] text-white flex items-center justify-center mx-auto shadow-lg shadow-teal-900/10">
            <Activity className="w-8 h-8 animate-pulse" />
          </div>

          <span className="inline-block px-3 py-1 bg-teal-50 text-[#0B5A54] font-bold rounded-full text-xs border border-teal-200">
            Receptionist Staff Portal
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-heading">CarePulse Staff Login</h1>
          <p className="text-xs text-slate-500">Access clinic reception dashboard & live queue controller.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Receptionist Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5A54]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-[#0B5A54] hover:bg-[#084540] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider mt-2 hover:scale-[1.01]"
          >
            {isLoading ? 'Authenticating Staff...' : 'Login to Reception Desk'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Authorized CarePulse Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReceptionistLogin;
