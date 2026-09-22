import React, { useState } from 'react';
import { clsx } from 'clsx';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hasRing?: boolean;
  fallbackSrc?: string;
  fallbackText?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  size = 'md',
  hasRing = false,
  fallbackSrc,
  fallbackText,
  className,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);

  const sizes = {
    sm: 'w-8 h-8 text-xs font-bold',
    md: 'w-10 h-10 text-sm font-black',
    lg: 'w-14 h-14 text-base font-black',
    xl: 'w-24 h-24 sm:w-28 sm:h-28 text-3xl sm:text-4xl font-black font-heading',
  };

  const initial = (fallbackText || alt || '')
    .replace(/^Dr\.\s*/i, '')
    .trim()
    .charAt(0)
    .toUpperCase();

  const showImage = !imageError && Boolean(src);
  const imageToRender = showImage ? src : fallbackSrc;

  return (
    <div
      className={clsx(
        'relative rounded-full overflow-hidden shrink-0 flex items-center justify-center select-none shadow-2xs',
        sizes[size],
        hasRing && 'ring-2 ring-[#0B5A54] ring-offset-2',
        imageToRender
          ? 'bg-[#E3F3F1] border border-[#0B5A54]/10'
          : 'bg-gradient-to-br from-[#0B5A54] via-[#0D6E67] to-[#14B8A6] text-white',
        className
      )}
      {...props}
    >
      {imageToRender ? (
        <img
          src={imageToRender}
          alt={alt || 'Avatar'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="leading-none select-none drop-shadow-xs">{initial || 'P'}</span>
      )}
    </div>
  );
};

