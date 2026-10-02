'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { AuthBrand } from '@/components/auth/auth-brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { api, getErrorMessage } from '@/lib/api';
import { ArrowLeft, CheckCircle2, Loader2, Mail, RefreshCw } from 'lucide-react';
import { FadeIn } from '@/components/motion';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

const emptyCode = () => Array<string>(CODE_LENGTH).fill('');

export default function VerifyPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string[]>(emptyCode);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Prefill the email captured at registration (never sent in the URL).
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pendingVerificationEmail');
      if (stored) setEmail(stored);
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Resend cooldown ticker.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const verify = useMutation({
    mutationFn: (payload: { email: string; code: string }) =>
      api.post('/auth/verify-email', payload).then((r) => r.data),
    onSuccess: () => {
      setVerified(true);
      try {
        localStorage.removeItem('pendingVerificationEmail');
      } catch {
        /* storage unavailable */
      }
      toast({
        title: 'Email verified',
        description: 'Your account is active. You can now sign in.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: getErrorMessage(error, 'That code is not valid or has expired.'),
      });
    },
  });

  const resend = useMutation({
    mutationFn: (payload: { email: string }) =>
      api.post('/auth/resend-verification', payload).then((r) => r.data),
    onSuccess: () => {
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setCode(emptyCode());
      inputsRef.current[0]?.focus();
      toast({
        title: 'New code sent',
        description: 'Check your inbox for the latest 6-digit code.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not resend code',
        description: getErrorMessage(error, 'Please try again in a moment.'),
      });
    },
  });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const codeComplete = code.every((digit) => digit !== '');

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');

    if (!digits) {
      setCode((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    // Single keystroke  advance to the next box.
    if (digits.length === 1) {
      setCode((prev) => {
        const next = [...prev];
        next[index] = digits;
        return next;
      });
      if (index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
      return;
    }

    // Paste / autofill of multiple digits  distribute from this box onwards.
    setCode((prev) => {
      const next = [...prev];
      for (let i = 0; i < digits.length && index + i < CODE_LENGTH; i += 1) {
        next[index + i] = digits[i];
      }
      return next;
    });
    inputsRef.current[Math.min(index + digits.length, CODE_LENGTH - 1)]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputsRef.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !codeComplete) return;
    verify.mutate({ email: email.trim(), code: code.join('') });
  };

  if (verified) {
    return (
      <FadeIn className="text-center">
        <AuthBrand />
        <Card className="border-border/50 bg-card/80 shadow-lg backdrop-blur-xl">
          <CardContent className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" aria-hidden />
            </div>
            <h2 className="mb-2 text-xl font-bold">Email verified</h2>
            <p className="mb-6 text-muted-foreground">
              Your account is now active. You can start using the platform.
            </p>
            <Button className="w-full" size="lg" asChild>
              <Link href="/login">Continue to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <AuthBrand />

      <Card className="border-border/50 bg-card/80 shadow-lg backdrop-blur-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to your email address. Enter it below to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label>Verification code</Label>
              <div className="flex justify-center gap-2">
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => {
                      inputsRef.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="h-12 w-12 text-center text-xl font-bold tabular-nums bg-background/50"
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={verify.isPending || !codeComplete || !emailValid}
              size="lg"
            >
              {verify.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify email'
              )}
            </Button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-3 text-sm">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!emailValid || resend.isPending || cooldown > 0}
              onClick={() => resend.mutate({ email: email.trim() })}
            >
              {resend.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </Button>

            <div className="flex items-center gap-4 text-muted-foreground">
              <Link
                href="/login"
                className="inline-flex items-center transition-colors hover:text-foreground"
              >
                <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
                Back to sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center transition-colors hover:text-foreground"
              >
                <Mail className="mr-1 h-4 w-4" aria-hidden />
                Use another email
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
