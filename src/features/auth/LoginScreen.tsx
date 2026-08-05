import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Phone, Lock, ArrowRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useCarePulseStore } from '../../lib/store';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const login = useCarePulseStore((s) => s.login);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      login(phone || '+91 98765 43210');
      setIsLoading(false);
      navigate('/home');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4 py-8 sm:px-6 w-full">
      <div className="w-full max-w-sm sm:max-w-md space-y-5">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-teal flex items-center justify-center text-white shadow-xs">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-[#0B5A54] tracking-tight">CarePulse</h1>
            <p className="text-xs font-medium text-[#6B7280]">Empathetic healthcare at your fingertips</p>
          </div>
        </div>

        {/* Main Login Card */}
        <Card padding="lg" className="shadow-xs border border-[#E4E7EC] bg-[#F8FAFC]/90 space-y-4">
          <div className="text-left space-y-1 pb-1 border-b border-[#E4E7EC]/60">
            <h2 className="text-base sm:text-lg font-bold font-heading text-[#111827]">Welcome back</h2>
            <p className="text-xs text-[#6B7280] leading-snug">Log in to manage appointments & health records</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Number Input */}
            <div className="space-y-1.5 text-left">
              <Input
                label="PHONE NUMBER"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                leftIcon={<Phone className="w-4 h-4 text-[#0B5A54]" />}
                required
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">
                  PASSWORD
                </label>
                <button
                  type="button"
                  onClick={() => alert('Password reset link sent to your registered phone!')}
                  className="text-[11px] font-bold text-[#0B5A54] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                isPassword
                leftIcon={<Lock className="w-4 h-4 text-[#0B5A54]" />}
                placeholder="Enter password"
                required
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="mt-1 text-xs font-bold py-3 rounded-xl shadow-2xs"
            >
              LOGIN
            </Button>

            {/* Divider */}
            <div className="relative my-3 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E4E7EC]" />
              </div>
              <span className="relative bg-[#F8FAFC] px-3 text-[10px] font-extrabold text-[#9CA3AF] uppercase tracking-wider">
                OR
              </span>
            </div>

            {/* Google Sign-in */}
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
              className="flex items-center justify-center gap-2 font-bold text-xs text-[#111827] bg-white border border-[#E4E7EC] shadow-2xs py-2.5 rounded-xl hover:bg-gray-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.35 7.37 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.6H1.24C.45 8.17 0 9.99 0 12s.45 3.83 1.24 5.4s3.28 3.13 5.28 3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.65 1.24 6.6l4.04 3.13c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </Button>
          </form>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-3 pt-1">
          <p className="text-xs font-semibold text-[#6B7280]">
            New user?{' '}
            <button
              onClick={() => navigate('/register')}
              className="font-bold text-[#0B5A54] hover:underline ml-0.5"
            >
              Sign Up
            </button>
          </p>

          <div className="flex justify-center items-center gap-1.5 pt-1">
            <div className="w-6 h-1 rounded-full bg-[#0B5A54]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]/40" />
          </div>
        </div>
      </div>
    </div>
  );
};
