'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fadeInUp, staggerContainer } from '@/lib/motion';

export function CtaSection() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <motion.div
          ref={ref}
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? 'show' : 'hidden'}
          className="relative overflow-hidden rounded-3xl px-8 py-16 text-center shadow-xl sm:px-14"
          style={{
            background: 'linear-gradient(135deg, #1a1f3a 0%, #2d1f3a 50%, #1a1424 100%)',
          }}
        >
          {/* Background gradient blobs */}
          <div aria-hidden className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
          <div aria-hidden className="absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />

          {/* Dot grid overlay */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative">
            <motion.div variants={fadeInUp} className="mb-2 flex justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg">
                <Zap className="h-6 w-6 text-white" />
              </span>
            </motion.div>

            <motion.h2
              variants={fadeInUp}
              className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Ready to get started?
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-base text-white/70">
              Join thousands of users already using NoviMP for proxies,
              numbers, and social growth no contracts, cancel anytime.
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                asChild
                className="gap-2 bg-primary px-8 text-base font-semibold shadow-md hover:bg-primary-hover"
              >
                <Link href="/register">
                  Create free account <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white/25 bg-white/10 px-8 text-base text-white hover:bg-white/20 hover:text-white"
              >
                <Link href="/login">Sign in</Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
