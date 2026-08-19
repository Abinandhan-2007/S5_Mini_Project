import React from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, leftIcon, options, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full text-left space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-[#0B5A54] pointer-events-none flex items-center justify-center z-10">
              {leftIcon}
            </div>
          )}
          <select
            id={selectId}
            ref={ref}
            className={clsx(
              'w-full bg-white border text-[#111827] text-xs sm:text-sm font-medium rounded-xl transition-all duration-150 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] shadow-2xs cursor-pointer',
              leftIcon ? 'pl-10' : 'pl-3.5',
              'pr-10 py-2.5',
              error ? 'border-rose-400 focus:border-rose-500' : 'border-[#E4E7EC]',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 text-[#9CA3AF] pointer-events-none flex items-center justify-center">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="text-[11px] text-rose-500 font-medium pt-0.5">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
