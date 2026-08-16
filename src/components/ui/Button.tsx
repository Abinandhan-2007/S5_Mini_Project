import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger-tint';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/25 shadow-2xs hover:shadow-xs';

  const variants = {
    primary: 'bg-[#0B5A54] text-white hover:bg-[#08423D]',
    secondary: 'bg-[#14B8A6] text-white hover:bg-[#0F766E]',
    outline: 'border border-[#0B5A54] text-[#0B5A54] bg-white hover:bg-[#E3F3F1]',
    ghost: 'text-[#6B7280] hover:text-[#0B5A54] hover:bg-[#E3F3F1]/50 shadow-none',
    'danger-tint': 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1 rounded-lg',
    md: 'px-4 py-2.5 text-xs sm:text-sm gap-1.5 rounded-xl font-bold',
    lg: 'px-5 py-3 text-xs sm:text-sm gap-2 rounded-xl font-bold uppercase tracking-wider',
  };

  return (
    <button
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-current mr-1" />
      ) : (
        <>
          {leftIcon && <span className="inline-flex items-center justify-center shrink-0">{leftIcon}</span>}
          {typeof children === 'string' ? <span>{children}</span> : children}
          {rightIcon && <span className="inline-flex items-center justify-center shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
