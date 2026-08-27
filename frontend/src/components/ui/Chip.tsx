import React from 'react';
import { clsx } from 'clsx';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  children,
  active = false,
  size = 'md',
  icon,
  className,
  ...props
}) => {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex items-center font-semibold rounded-pill transition-all duration-150 shrink-0 focus:outline-none active:scale-95 shadow-2xs',
        size === 'sm' ? 'px-2.5 py-1 text-[11px] gap-1' : 'px-3 py-1.5 text-xs gap-1.5',
        active
          ? 'bg-[#0B5A54] text-white font-bold'
          : 'bg-white border border-[#E4E7EC] text-[#6B7280] hover:bg-[#E3F3F1]/50 hover:text-[#0B5A54]',
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
