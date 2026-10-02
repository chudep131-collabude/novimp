import * as React from 'react';
import Link from 'next/link';
import { ThemeLogo } from '@/components/theme-logo';

const footerLinks = {
  Services: [
    { label: 'Proxies', href: '/register' },
    { label: 'Virtual Numbers', href: '/register' },
    { label: 'SMM Services', href: '/register' },
  ],
  Company: [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Terms & Conditions', href: '/terms' },
  ],
  Account: [
    { label: 'Sign in', href: '/login' },
    { label: 'Register', href: '/register' },
    { label: 'Support', href: '/register' },
  ],
};

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60 bg-card">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <ThemeLogo width={32} height={32} className="rounded-lg" />
              <span className="text-base font-bold tracking-tight text-foreground">NoviMP</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Buy proxies, virtual numbers, and social media services in one place.
              Transparent pricing, no contracts.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group}
              </h4>
              <ul className="space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} NoviMP. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/register" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
