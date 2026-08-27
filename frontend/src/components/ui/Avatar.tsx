import React, { useState } from 'react';
import { clsx } from 'clsx';
import { User } from 'lucide-react';

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
  const [imageError, setImageError] = useState(false);

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-24 h-24 text-xl',
  };

  return (
    <div
      className={clsx(
        'relative rounded-full overflow-hidden shrink-0 bg-[#E3F3F1] flex items-center justify-center border border-[#0B5A54]/10 shadow-2xs',
        sizes[size],
        hasRing && 'ring-2 ring-[#0B5A54] ring-offset-2',
        className
      )}
      {...props}
    >
      {!imageError && src ? (
        <img
          src={src}
          alt={alt}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <User className="w-1/2 h-1/2 text-[#0B5A54]" />
      )}
    </div>
  );
};
