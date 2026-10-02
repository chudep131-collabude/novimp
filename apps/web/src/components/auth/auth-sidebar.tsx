'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ThemeLogo } from '@/components/theme-logo';
const images = [
  '/images/proxy.jpg',
  '/images/phone number.jpg',
  '/images/social-media.jpg',
];

export function AuthSidebar() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative hidden h-full w-full overflow-hidden lg:block">
      {/* All images stacked only opacity changes, no mount/unmount = no blink */}
      {images.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <Image
            src={src}
            alt=""
            aria-hidden
            fill
            className="object-cover object-center"
            priority={i === 0}
            sizes="50vw"
          />
        </div>
      ))}

      {/* Permanent dark overlay */}
      <div className="absolute inset-0 z-10 bg-black/45" />

      {/* Brand mark */}
      <div className="absolute left-10 top-10 z-20">
        <a href="/" aria-label="NoviMP home" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <ThemeLogo width={36} height={36} className="rounded-lg" />
          <span className="text-xl font-bold tracking-tight text-white">NoviMP</span>
        </a>
      </div>

      {/* Tagline */}
      <div className="absolute bottom-10 left-10 right-10 z-20">
        <h2 className="mb-3 text-3xl font-bold leading-snug text-white">
          The all-in-one digital<br />services platform.
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-white/75">
          Access high-quality proxies, virtual phone numbers, and social media
          tools all under one powerful platform.
        </p>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-10 right-10 z-20 flex gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
