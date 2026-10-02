import type { Metadata } from 'next';
import { LandingNav } from '@/components/landing/landing-nav';
import { HeroSection } from '@/components/landing/hero-section';
import { StatsSection } from '@/components/landing/stats-section';
import { ServicesSection } from '@/components/landing/services-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { FaqSection } from '@/components/landing/faq-section';
import { CtaSection } from '@/components/landing/cta-section';
import { LandingFooter } from '@/components/landing/landing-footer';

export const metadata: Metadata = {
  title: 'NoviMP Premium Digital Services Marketplace',
  description:
    'Buy residential proxies, virtual phone numbers, and social media growth services in one place. Instant delivery, transparent pricing, no contracts.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <HeroSection />
      <StatsSection />
      <ServicesSection />
      <HowItWorksSection />
      <FaqSection />
      <CtaSection />
      <LandingFooter />
    </div>
  );
}
