import React from 'react';
import { clsx } from 'clsx';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hasRing?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  size = 'md',
  hasRing = false,
  className,
  ...props
}) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-24 h-24',
  };

  return (
    <div
      className={clsx(
        'relative rounded-full overflow-hidden shrink-0 bg-[#E3F3F1]',
        sizes[size],
        hasRing && 'ring-2 ring-[#0B5A54] ring-offset-2',
        className
      )}
      {...props}
    >
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </div>
  );
};
