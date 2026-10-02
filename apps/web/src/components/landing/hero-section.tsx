'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { ArrowRight, Network, Smartphone, BarChart3, AtSign, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedCount } from '@/components/ui/animated-number';

const stats = [
  { value: 95000, suffix: '+', label: 'Orders delivered', decimals: 0 },
  { value: 12000, suffix: '+', label: 'Active users',     decimals: 0 },
  { value: 99.9,  suffix: '%', label: 'Uptime SLA',       decimals: 1 },
];

const pills = [
  {
    icon: Network,
    label: 'Proxies',
    bg: 'bg-blue-500 border-blue-400 text-white',
  },
  {
    icon: Smartphone,
    label: 'Virtual Numbers',
    bg: 'bg-emerald-500 border-emerald-400 text-white',
  },
  {
    icon: BarChart3,
    label: 'SMM Services',
    bg: 'bg-violet-500 border-violet-400 text-white',
  },
  {
    icon: AtSign,
    label: 'Temp Email',
    bg: 'bg-orange-500 border-orange-400 text-white',
  },
];

export function HeroSection() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Only swap after hydration before that show dark image (default theme is dark)
  const isLight = mounted && resolvedTheme === 'light';

  // All text colours adapt to whichever background is visible
  const heading    = isLight ? 'text-[#1E2A4A]'    : 'text-white';
  const body       = isLight ? 'text-[#39445A]/85' : 'text-white/80';
  const subtle     = isLight ? 'text-[#39445A]/55' : 'text-white/45';
  const statsBg    = isLight
    ? 'divide-[#1E2A4A]/10 border-[#1E2A4A]/10 bg-white/60 backdrop-blur-md'
    : 'divide-white/10 border-white/10 bg-black/35 backdrop-blur-md';
  const statNum    = isLight ? 'text-[#1E2A4A]'    : 'text-white';
  const statLabel  = isLight ? 'text-[#39445A]/55' : 'text-white/55';
  const outlineBtn = isLight
    ? 'border-[#1E2A4A]/20 bg-white/60 text-[#1E2A4A] hover:bg-white/80 hover:text-[#1E2A4A] backdrop-blur-sm'
    : 'border-white/25 bg-black/25 text-white hover:bg-white/15 hover:text-white backdrop-blur-sm';

  return (
    <section className="relative w-full overflow-hidden h-[750px] sm:h-[800px] lg:h-[860px] bg-[#0d1117]">

      {/* ── Background images — cover the section, don't drive height ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/landing.png"
        alt=""
        aria-hidden
        width={1768}
        height={890}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-center select-none pointer-events-none transition-opacity duration-500"
        style={{ opacity: isLight ? 0 : 1 }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/landing light.png"
        alt=""
        aria-hidden
        width={1768}
        height={890}
        decoding="async"
        className="absolute inset-0 block h-full w-full select-none pointer-events-none object-cover transition-opacity duration-500"
        style={{ opacity: isLight ? 1 : 0 }}
      />

      {/* Bottom fade into page background */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-background to-transparent" />

      {/* ── Content absolutely positioned over the images ── */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-5 pb-16 pt-24 text-center sm:pb-10 sm:pt-20 lg:px-8">

        {/* Category pills — desktop only */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 hidden sm:flex flex-wrap justify-center gap-2"
        >
          {pills.map(({ icon: Icon, label, bg }) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider shadow-sm ${bg}`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </span>
          ))}
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.07 }}
          className={`mx-auto max-w-3xl text-balance text-5xl font-bold leading-[1.08] tracking-[-0.02em] sm:text-6xl lg:text-7xl ${heading}`}
        >
          One platform.{' '}
          <br className="hidden sm:block" />
          <span
            style={{
              background: 'linear-gradient(135deg, #FF4B2B 0%, #FF8C42 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Every digital service.
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.13 }}
          className={`mx-auto mt-5 max-w-xl text-balance text-lg leading-relaxed ${body}`}
        >
          Residential &amp; datacenter proxies, virtual phone numbers, and social
          media growth all under one roof, with transparent pricing.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Button
            size="lg"
            asChild
            className="h-12 gap-2 rounded-xl bg-primary px-8 text-[15px] font-bold shadow-md transition-colors hover:bg-primary/90"
          >
            <Link href="/register">
              Sign Up <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className={`h-12 rounded-xl px-8 text-[15px] font-medium ${outlineBtn}`}
          >
            <Link href="/login">Sign in</Link>
          </Button>
        </motion.div>

        {/* Trust note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className={`mt-3 flex items-center justify-center gap-1.5 text-xs ${subtle}`}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          No credit card required &nbsp;·&nbsp; Instant activation
        </motion.p>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.28 }}
          className={`mx-auto mt-10 grid w-full max-w-lg grid-cols-3 divide-x overflow-hidden rounded-2xl border shadow-xl ${statsBg}`}
        >
          {stats.map(({ value, suffix, label, decimals }) => (
            <div key={label} className="flex flex-col items-center px-4 py-4">
              <span className={`text-2xl font-bold tabular-nums tracking-tight sm:text-3xl ${statNum}`}>
                <AnimatedCount
                  value={value}
                  format={(n) =>
                    decimals
                      ? n.toFixed(decimals) + suffix
                      : Math.round(n).toLocaleString('en-US') + suffix
                  }
                />
              </span>
              <span className={`mt-1 text-[11px] font-medium ${statLabel}`}>{label}</span>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
