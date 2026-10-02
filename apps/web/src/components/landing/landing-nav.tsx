'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ThemeLogo } from '@/components/theme-logo';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

const links = [
  { label: 'Services',     href: '#services' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'FAQ',          href: '#faq' },
];

export function LandingNav() {
  const { scrollY } = useScroll();
  // Navbar transitions from fully transparent to glass as you scroll
  const navBg   = useTransform(scrollY, [0, 72], ['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']);
  const blur    = useTransform(scrollY, [0, 72], [0, 1]);
  const border  = useTransform(scrollY, [0, 72], [0, 1]);

  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
        style={{ backgroundColor: navBg }}
      >
        {/* Glass blur layer always dark-tinted since nav sits over images */}
        <motion.div
          className="absolute inset-0 bg-black/20 backdrop-blur-xl"
          style={{ opacity: blur }}
          aria-hidden
        />
        {/* Bottom separator */}
        <motion.div
          className="absolute inset-x-0 bottom-0 h-px bg-white/15"
          style={{ opacity: border }}
          aria-hidden
        />

        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        {/* Wordmark */}
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ThemeLogo width={32} height={32} className="rounded-lg" />
            <span className="text-[17px] font-bold tracking-tight text-white drop-shadow-sm">
              NoviMP
            </span>
          </Link>

          {/* Desktop links */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-md px-3.5 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle className="text-white/80 hover:bg-white/10 hover:text-white" />
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-white/85 hover:bg-white/10 hover:text-white"
            >
              <Link href="/login">Sign in</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-primary font-semibold shadow-md hover:bg-primary-hover"
            >
              <Link href="/register">Get started</Link>
            </Button>
          </div>

          {/* Mobile row: theme + burger */}
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle className="text-white/80 hover:bg-white/10 hover:text-white" />
            <button
              className="rounded-md p-2 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-nav"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-x-0 top-16 z-40 border-b border-white/10 bg-[#0d1224]/95 px-5 pb-5 pt-3 backdrop-blur-xl md:hidden"
          >
            <nav className="flex flex-col">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                variant="outline"
                asChild
                className="w-full border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white"
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild className="w-full font-semibold">
                <Link href="/register">Get started free</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
