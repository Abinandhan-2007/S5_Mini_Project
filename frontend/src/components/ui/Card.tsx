import React from 'react';
import { clsx } from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'accent' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className,
  ...props
}) => {
  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  const variants = {
    default: 'bg-white rounded-2xl shadow-xs border border-[#E4E7EC] hover:border-[#0B5A54]/30 transition-all duration-150',
    accent: 'bg-white rounded-2xl shadow-xs border border-[#E4E7EC] relative overflow-hidden card-left-accent transition-all duration-150',
    gradient: 'bg-gradient-teal text-white rounded-2xl shadow-xs border-0',
  };

  return (
    <div
      className={clsx(
        variants[variant],
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
