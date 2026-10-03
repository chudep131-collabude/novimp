'use client';

import * as React from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { staggerContainer, fadeInUp } from '@/lib/motion';

const faqs = [
  {
    q: 'What payment methods do you accept?',
    a: 'We accept major cryptocurrencies (BTC, ETH, USDT) and card payments via our secure payment gateway. All deposits go into your account wallet and can be spent across any service.',
  },
  {
    q: 'How quickly are orders fulfilled?',
    a: 'Delivery time depends on the service. Proxy provisioning and virtual number assignments are typically fast. SMM services begin processing shortly after ordering and complete based on the order size and service tier  progress is tracked in real time from your dashboard.',
  },
  {
    q: 'Are the proxies really residential?',
    a: 'Yes. Residential proxies are sourced from real devices via an ethical peer network, giving them genuine ISP-assigned IP addresses that are indistinguishable from organic traffic.',
  },
  {
    q: 'Can I get a refund if a service doesn\'t work?',
    a: 'Absolutely. If a virtual number receives no SMS within the validity window, or if a proxy is not functional on delivery, the refund is automatic if the order is not completed. All refunds are credited to your account balance; we do not provide external refunds.',
  },
  {
    q: 'What platforms do your SMM services support?',
    a: 'Instagram, YouTube, TikTok, Twitter/X, Facebook, Telegram, Spotify, and more. We list over 1 000 distinct service SKUs across these platforms, updated regularly.',
  },
  {
    q: 'Is there a minimum deposit?',
    a: 'The minimum deposit is $5. There are no monthly fees or subscriptions  you only pay for what you order.',
  },

];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-foreground transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{q}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-4 pr-8 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqSection() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="faq" className="border-t border-border/60 py-24">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <span className="mb-3 inline-block rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            FAQ
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Common questions
          </h2>
          <p className="mt-4 text-muted-foreground">
            Can't find your answer? Open a support ticket from your dashboard.
          </p>
        </div>

        {/* Accordion */}
        <motion.div
          ref={ref}
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? 'show' : 'hidden'}
          className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card px-6 shadow-sm"
        >
          {faqs.map(({ q, a }) => (
            <motion.div key={q} variants={fadeInUp}>
              <FaqItem q={q} a={a} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
