'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  Network,
  Smartphone,
  BarChart3,
  AtSign,
  CheckCircle2,
  ArrowRight,
  Wifi,
  Server,
  Instagram,
  Youtube,
  Twitter,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { staggerContainer, fadeInUp } from '@/lib/motion';

const services = [
  {
    id: 'proxy',
    icon: Network,
    label: 'Proxies',
    tagline: 'Rotate undetected at scale',
    description:
      'Residential, ISP, and datacenter proxies from 190+ countries. Sticky or rotating sessions perfect for scraping, ad verification, and geo-unlocking.',
    image: '/images/proxy.jpg',
    imageHover: '/images/proxy1.jpg',
    imageBg: null,
    color: 'bg-blue-500 text-white',
    borderAccent: 'group-hover:border-blue-300/60',
    cta: '/register',
    highlights: [
      { icon: Wifi,         text: 'Residential real IPs, max trust' },
      { icon: Server,       text: 'Datacenter blazing speed, bulk pricing' },
      { icon: CheckCircle2, text: '190+ country coverage' },
      { icon: CheckCircle2, text: 'Fast provisioning' },
    ],
  },
  {
    id: 'numbers',
    icon: Smartphone,
    label: 'Virtual Numbers',
    tagline: 'Receive SMS, skip restrictions',
    description:
      'Temporary and long-term virtual phone numbers for OTP verification on any platform. Supported in 50+ countries with real-time delivery.',
    image: '/images/phone number.jpg',
    imageHover: null,
    imageBg: null,
    color: 'bg-emerald-500 text-white',
    borderAccent: 'group-hover:border-success/40',
    cta: '/register',
    highlights: [
      { icon: CheckCircle2, text: '50+ countries, 300+ operators' },
      { icon: CheckCircle2, text: 'Real-time SMS delivery' },
      { icon: CheckCircle2, text: 'Works with any platform' },
      { icon: CheckCircle2, text: 'Pay only for what you use' },
    ],
  },
  {
    id: 'email',
    icon: AtSign,
    label: 'Temp Email',
    tagline: 'Disposable inbox, zero tracking',
    description:
      'Generate temporary email addresses instantly. Perfect for testing, sign-ups, or protecting your privacy. No registration required, free to use.',
    image: '/images/mail.jpg',
    imageHover: null,
    imageBg: null,
    color: 'bg-violet-500 text-white',
    borderAccent: 'group-hover:border-purple-300/60',
    cta: '/email',
    highlights: [
      { icon: Sparkles,     text: 'Instant inbox creation no sign-up' },
      { icon: Shield,       text: 'Anonymous & privacy-focused' },
      { icon: Zap,          text: 'Auto-refreshing live inbox' },
      { icon: CheckCircle2, text: 'Free forever, no limits' },
    ],
  },
  {
    id: 'smm',
    icon: BarChart3,
    label: 'SMM Services',
    tagline: 'Grow your social presence',
    description:
      'Followers, likes, views, and engagement across Instagram, YouTube, TikTok, Twitter, and more. Fast delivery, real-looking accounts.',
    image: '/images/social-media1.jpg',
    imageHover: null,
    imageBg: null,
    color: 'bg-orange-500 text-white',
    borderAccent: 'group-hover:border-primary/40',
    cta: '/register',
    highlights: [
      { icon: Instagram,    text: 'Instagram followers & reels views' },
      { icon: Youtube,      text: 'YouTube subscribers & watch time' },
      { icon: Twitter,      text: 'Twitter/X followers & impressions' },
      { icon: CheckCircle2, text: '1 000+ services available' },
    ],
  },
];

export function ServicesSection() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduceMotion = useReducedMotion();

  return (
    <section id="services" className="py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Section header */}
        <div className="mx-auto mb-14 max-w-xl text-center">
          <span className="mb-3 inline-block rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            What we offer
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Four verticals, one account
          </h2>
          <p className="mt-4 text-muted-foreground">
            Top up your wallet once and spend across all services proxies,
            numbers, email, and social media growth without juggling separate subscriptions.
          </p>
        </div>

        {/* Cards */}
        <motion.div
          ref={ref}
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? 'show' : 'hidden'}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {services.map((svc) => (
            <motion.div
              key={svc.id}
              variants={fadeInUp}
              className="group"
              whileHover={reduceMotion ? undefined : {
                y: -4,
                transition: { type: 'spring', stiffness: 300, damping: 24 },
              }}
              whileTap={reduceMotion ? undefined : { scale: 0.985 }}
            >
              <Card
                className={`flex h-full flex-col overflow-hidden border-2 border-transparent transition-all duration-300 ${svc.borderAccent} hover:shadow-xl`}
              >
                {/* Image header */}
                <div className="relative h-44 w-full overflow-hidden">
                  {svc.image ? (
                    <>
                      {/* Primary image  always visible, scales on hover */}
                      <Image
                        src={svc.image}
                        alt={svc.label}
                        fill
                        className={`object-cover object-center transition-all duration-500 ${
                          svc.imageHover
                            ? 'group-hover:opacity-0'
                            : ''
                        }`}
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      {/* Hover image  crossfades in on hover (proxy only) */}
                      {svc.imageHover && (
                        <Image
                          src={svc.imageHover}
                          alt=""
                          aria-hidden
                          fill
                          className="object-cover object-center opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      )}
                      {/* gradient scrim */}
                      <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-card/20 to-transparent" />
                    </>
                  ) : (
                    <div className={`h-full w-full ${svc.imageBg} flex items-center justify-center`} />
                  )}

                  {/* Floating label chip */}
                  <span className={`absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-md ${svc.color}`}>
                    <svc.icon className="h-3 w-3" />
                    {svc.label}
                  </span>
                </div>

                <CardContent className="flex flex-1 flex-col p-6">
                  <h3 className="text-xl font-bold text-foreground">{svc.tagline}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {svc.description}
                  </p>

                  {/* Feature list */}
                  <ul className="mt-5 flex-1 space-y-2.5">
                    {svc.highlights.map(({ icon: Icon, text }) => (
                      <li key={text} className="flex items-center gap-2.5 text-sm">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button asChild variant="outline" className="mt-6 w-full gap-2">
                    <Link href={svc.cta}>
                      Explore {svc.label} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
