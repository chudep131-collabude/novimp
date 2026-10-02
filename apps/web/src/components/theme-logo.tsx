'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface ThemeLogoProps {
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
}

/**
 * Renders /novilogo.png in dark mode and /novilogo-light.png in light mode.
 * Falls back to the dark logo until the theme is resolved on the client.
 */
export function ThemeLogo({
  width = 32,
  height = 32,
  className = 'rounded-lg',
  alt = 'NoviMP',
}: ThemeLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const src =
    mounted && resolvedTheme === 'light'
      ? '/novilogo-light.png'
      : '/novilogo.png';

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}
