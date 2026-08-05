import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  isPassword?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, isPassword = false, type = 'text', className, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full text-left space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-[#0B5A54] pointer-events-none flex items-center justify-center z-10">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={inputType}
            className={clsx(
              'w-full bg-white border text-[#111827] text-xs sm:text-sm font-medium rounded-xl transition-all duration-150 placeholder:text-xs placeholder:font-normal placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] shadow-2xs',
              leftIcon ? 'pl-10' : 'pl-3.5',
              isPassword ? 'pr-10' : 'pr-3.5',
              'py-2.5',
              error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : 'border-[#E4E7EC]',
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-[#9CA3AF] hover:text-[#111827] focus:outline-none p-1 z-10 flex items-center justify-center"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {error && <p className="text-[11px] text-rose-500 font-medium pt-0.5">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
