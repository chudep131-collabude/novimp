'use client';

import * as React from 'react';
import { motion, useInView } from 'framer-motion';
import { BarChart3, Users, Globe, Clock } from 'lucide-react';
import { AnimatedCount } from '@/components/ui/animated-number';
import { staggerContainer, fadeInUp } from '@/lib/motion';

const stats = [
  {
    icon: BarChart3,
    value: 95000,
    suffix: '+',
    label: 'Orders processed',
    color: 'bg-primary/15 text-primary',
  },
  {
    icon: Users,
    value: 12000,
    suffix: '+',
    label: 'Registered users',
    color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: Globe,
    value: 190,
    suffix: '+',
    label: 'Countries covered',
    color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  },
  {
    icon: Clock,
    value: 99.9,
    suffix: '%',
    decimals: 1,
    label: 'Platform uptime',
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
];

/* ── Avatar data — real illustrated avatars via DiceBear CDN ───── */
const AVATARS = [
  { seed: 'Alex',    style: 'avataaars' },
  { seed: 'Maria',   style: 'avataaars' },
  { seed: 'James',   style: 'avataaars' },
  { seed: 'Sofia',   style: 'avataaars' },
  { seed: 'Liam',    style: 'avataaars' },
  { seed: 'Emma',    style: 'avataaars' },
  { seed: 'Noah',    style: 'avataaars' },
  { seed: 'Olivia',  style: 'avataaars' },
  { seed: 'Ethan',   style: 'avataaars' },
  { seed: 'Ava',     style: 'avataaars' },
  { seed: 'Mason',   style: 'avataaars' },
  { seed: 'Isabella',style: 'avataaars' },
  { seed: 'Lucas',   style: 'avataaars' },
  { seed: 'Mia',     style: 'avataaars' },
  { seed: 'Logan',   style: 'avataaars' },
  { seed: 'Amelia',  style: 'avataaars' },
  { seed: 'Aiden',   style: 'avataaars' },
  { seed: 'Harper',  style: 'avataaars' },
  { seed: 'Jackson', style: 'avataaars' },
  { seed: 'Evelyn',  style: 'avataaars' },
];

const BG_COLORS = [
  'b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc',
  'ffdfbf', 'c1f0c1', 'f4e0b6', 'e0c1f4',
];

function avatarUrl(seed: string, style: string, i: number) {
  const bg = BG_COLORS[i % BG_COLORS.length];
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}&radius=50`;
}

function AvatarMarquee() {
  const doubled = [...AVATARS, ...AVATARS];

  return (
    <div className="mt-14">
      <p className="mb-5 text-center text-sm font-medium text-muted-foreground">
        Joined by customers from all over the world
      </p>

      <div className="relative overflow-hidden">
        {/* Fade masks */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-card to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-card to-transparent" />

        {/* Scrolling strip */}
        <div className="animate-marquee">
          {doubled.map((av, i) => (
            <div
              key={i}
              className="mx-1.5 shrink-0 overflow-hidden rounded-full ring-2 ring-background shadow-md transition-transform hover:scale-110 hover:z-10"
              style={{ width: 48, height: 48 }}
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl(av.seed, av.style, i % BG_COLORS.length)}
                alt=""
                width={48}
                height={48}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">12,000+</span> active customers · growing every day
      </p>
    </div>
  );
}

export function StatsSection() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="border-y border-border/60 bg-card py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Section header */}
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Trusted by thousands worldwide
          </h2>
          <p className="mt-3 text-muted-foreground">
            Numbers that reflect real usage, real reliability, and real results.
          </p>
        </div>

        {/* Stat cards */}
        <motion.div
          ref={ref}
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? 'show' : 'hidden'}
          className="grid grid-cols-2 gap-6 lg:grid-cols-4"
        >
          {stats.map(({ icon: Icon, value, suffix, decimals, label, color }) => (
            <motion.div
              key={label}
              variants={fadeInUp}
              className="flex flex-col items-center rounded-2xl border border-border/60 bg-background p-6 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <span className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                <AnimatedCount
                  value={value}
                  format={(n) =>
                    decimals
                      ? n.toFixed(decimals) + suffix
                      : Math.round(n).toLocaleString('en-US') + suffix
                  }
                />
              </span>
              <span className="mt-2 text-sm text-muted-foreground">{label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Animated avatar crowd */}
        <AvatarMarquee />
      </div>
    </section>
  );
}
