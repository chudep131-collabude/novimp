'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import { UserPlus, Wallet, Zap } from 'lucide-react';
import { staggerContainer, fadeInUp } from '@/lib/motion';

const steps = [
  {
    step: '01',
    icon: UserPlus,
    title: 'Create your account',
    description:
      'Sign up in under 60 seconds  no credit card needed. Verify your email and your dashboard is ready to go.',
  },
  {
    step: '02',
    icon: Wallet,
    title: 'Top up your wallet',
    description:
      'Deposit via your preferred payment method. Your balance is shared across all services  proxies, numbers, and SMM.',
  },
  {
    step: '03',
    icon: Zap,
    title: 'Place an order',
    description:
      'Browse services, configure your order, and track delivery in real time from your dashboard. Delivery times vary by service type.',
  },
];

export function HowItWorksSection() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="how-it-works" className="py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">

          {/* Left  image */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-3xl shadow-2xl">
              <Image
                src="/images/social-media2.jpg"
                alt="Person using social media on their phone"
                width={700}
                height={500}
                className="h-full w-auto object-cover object-center lg:h-[500px] lg:w-full"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              {/* Decorative overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-heading/50 to-transparent" />
            </div>

          </motion.div>

          {/* Right  steps */}
          <div>
            {/* Section header */}
            <div className="mb-10">
              <span className="mb-3 inline-block rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Simple process
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Up and running in minutes
              </h2>
              <p className="mt-4 text-muted-foreground">
                Three steps from sign-up to first delivery. No contracts, no setup fees.
              </p>
            </div>

            <motion.div
              ref={ref}
              variants={staggerContainer}
              initial="hidden"
              animate={inView ? 'show' : 'hidden'}
              className="space-y-8"
            >
              {steps.map(({ step, icon: Icon, title, description }, i) => (
                <motion.div key={step} variants={fadeInUp} className="flex gap-5">
                  {/* Step indicator + connector */}
                  <div className="flex flex-col items-center">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary shadow-sm">
                      <Icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    {i < steps.length - 1 && (
                      <div className="mt-2 w-px flex-1 bg-border" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-8">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">
                      Step {step}
                    </span>
                    <h3 className="mt-1 text-lg font-semibold text-foreground">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
