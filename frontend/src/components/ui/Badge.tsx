import React from 'react';
import { clsx } from 'clsx';
import { Star } from 'lucide-react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'tint' | 'primary' | 'success' | 'warning' | 'rating' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'tint',
  size = 'sm',
  className,
  ...props
}) => {
  const base = 'inline-flex items-center font-semibold rounded-pill uppercase tracking-wider';

  const sizes = {
    sm: 'px-2.5 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
  };

  const variants = {
    tint: 'bg-[#E3F3F1] text-[#0B5A54]',
    primary: 'bg-[#0B5A54] text-white',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/60',
    rating: 'bg-amber-50 text-amber-800 border border-amber-200/60 normal-case font-bold gap-1',
    outline: 'border border-[#E4E7EC] text-[#6B7280] bg-white',
  };

  return (
    <span className={clsx(base, sizes[size], variants[variant], className)} {...props}>
      {variant === 'rating' && <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />}
      {children}
    </span>
  );
};
