'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthBrand } from '@/components/auth/auth-brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api';
import { useResetPassword } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { ArrowLeft, Check, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';

const CODE_LENGTH = 6;
const emptyCode = () => Array<string>(CODE_LENGTH).fill('');

const PASSWORD_RULES: { key: string; label: string; test: (v: string) => boolean }[] = [
  { key: 'length', label: '12+ characters', test: (v) => v.length >= 12 },
  { key: 'uppercase', label: 'Uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { key: 'lowercase', label: 'Lowercase letter', test: (v) => /[a-z]/.test(v) },
  { key: 'number', label: 'Number', test: (v) => /\d/.test(v) },
  { key: 'special', label: 'Special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .max(128)
      .regex(/[A-Z]/, 'Add an uppercase letter')
      .regex(/[a-z]/, 'Add a lowercase letter')
      .regex(/\d/, 'Add a number')
      .regex(/[^A-Za-z0-9]/, 'Add a special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string[]>(emptyCode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const resetPassword = useResetPassword();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const password = watch('newPassword') ?? '';
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const strength = Math.round((passed / PASSWORD_RULES.length) * 100);
  const codeComplete = code.every((d) => d !== '');

  const handleCodeChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setCode((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }
    if (digits.length === 1) {
      setCode((prev) => {
        const next = [...prev];
        next[index] = digits;
        return next;
      });
      if (index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
      return;
    }
    setCode((prev) => {
      const next = [...prev];
      for (let i = 0; i < digits.length && index + i < CODE_LENGTH; i++) {
        next[index + i] = digits[i];
      }
      return next;
    });
    inputsRef.current[Math.min(index + digits.length, CODE_LENGTH - 1)]?.focus();
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputsRef.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  const onSubmit = async (values: PasswordFormValues) => {
    if (!codeComplete) {
      toast({ variant: 'destructive', title: 'Enter your 6-digit code' });
      return;
    }
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email missing',
        description: 'Go back and re-enter your email.',
      });
      return;
    }
    try {
      await resetPassword.mutateAsync({
        email,
        code: code.join(''),
        newPassword: values.newPassword,
      });
      setDone(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Reset failed',
        description: getErrorMessage(error, 'Invalid or expired code. Please try again.'),
      });
    }
  };

  if (done) {
    return (
      <div className="animate-fade-in text-center">
        <AuthBrand />
        <Card className="border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl">
          <CardContent className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="mb-2 text-xl font-bold">Password reset</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Your password has been updated. You can now sign in with your new credentials.
            </p>
            <Button className="w-full" onClick={() => router.push('/login')}>
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <AuthBrand />

      <Card className="border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
          <CardDescription>
            Enter the 6-digit code we sent to{' '}
            <span className="font-medium text-foreground">{email || 'your email'}</span> and choose
            a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* OTP boxes */}
            <div className="space-y-2">
              <Label>Reset code</Label>
              <div className="flex justify-center gap-2">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    aria-label={`Digit ${i + 1}`}
                    className={cn(
                      'h-12 w-11 rounded-lg border bg-background/50 text-center text-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
                      digit ? 'border-primary' : 'border-border',
                    )}
                  />
                ))}
              </div>
              {!codeComplete && (
                <p className="text-center text-xs text-muted-foreground">
                  Check your email for the 6-digit code
                </p>
              )}
            </div>

            {/* New password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  aria-invalid={!!errors.newPassword}
                  className="bg-background/50 pr-10"
                  {...register('newPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs text-destructive">{errors.newPassword.message}</p>
              )}
              {password.length > 0 && (
                <>
                  <Progress
                    value={strength}
                    className="h-1.5"
                    aria-label={`Password strength ${strength}%`}
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    {PASSWORD_RULES.map((rule) => {
                      const ok = rule.test(password);
                      return (
                        <div
                          key={rule.key}
                          className={cn(
                            'flex items-center gap-1.5 text-xs',
                            ok ? 'text-emerald-500' : 'text-muted-foreground',
                          )}
                        >
                          {ok ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                          )}
                          <span>{rule.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  aria-invalid={!!errors.confirmPassword}
                  className="bg-background/50 pr-10"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide' : 'Show'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !codeComplete}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset password'
              )}
            </Button>
          </form>

          <div className="mt-6">
            <Link
              href="/forgot-password"
              className="flex items-center justify-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Resend code
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
