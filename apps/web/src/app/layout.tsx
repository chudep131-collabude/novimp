import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Nunito } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import { Providers } from '@/components/providers';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NoviMP Premium Digital Services',
  description: 'Buy proxies, virtual numbers, and social media services in one place. Transparent pricing, no contracts.',
  icons: {
    icon: [
      { url: '/novilogo.png', media: '(prefers-color-scheme: dark)' },
      { url: '/novilogo-light.png', media: '(prefers-color-scheme: light)' },
    ],
    apple: '/novilogo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${nunito.variable} ${GeistMono.variable} font-sans`}>
        {/* Telegram Mini App SDK — loads after hydration, before user interaction */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
