'use client';

import { cn } from '@/lib/utils';
import { ImgHTMLAttributes } from 'react';

interface Icon3DProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'size'> {
  /** Filename in /public/icons/3d/ (e.g., 'phone.png') */
  src: string;
  /** Accessible alt text */
  alt: string;
  /** Preset size or use className for custom */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Disable hover animation */
  noHover?: boolean;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-12 w-12',
};

export function Icon3D({ 
  src, 
  alt, 
  size = 'md',
  noHover = false,
  className,
  ...props 
}: Icon3DProps) {
  return (
    <img
      src={`/icons/3d/${src}`}
      alt={alt}
      loading="lazy"
      draggable={false}
      className={cn(
        'select-none',
        sizeClasses[size],
        !noHover && 'transform-gpu transition-transform duration-200 hover:scale-110 hover:-rotate-3',
        'drop-shadow-lg',
        className
      )}
      {...props}
    />
  );
}
