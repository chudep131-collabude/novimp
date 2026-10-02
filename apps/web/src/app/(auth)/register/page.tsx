'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/components/auth/auth-provider';
import { AuthBrand } from '@/components/auth/auth-brand';
import { TelegramLoginButton } from '@/components/auth/telegram-login';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { FadeIn } from '@/components/motion';

/** Matches the API's RegisterDto (min length 12). */
const registerSchema = z.object({
  firstName: z.string().trim().max(60, 'Too long').optional(),
  lastName: z.string().trim().max(60, 'Too long').optional(),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must be 128 characters or fewer')
    .regex(/[A-Z]/, 'Add an uppercase letter')
    .regex(/[a-z]/, 'Add a lowercase letter')
    .regex(/\d/, 'Add a number')
    .regex(/[^A-Za-z0-9]/, 'Add a special character'),
  acceptTerms: z
    .boolean()
    .refine((v) => v === true, 'You must accept the Terms & Conditions to continue'),
});

type RegisterValues = z.infer<typeof registerSchema>;

const PASSWORD_RULES: { key: string; label: string; test: (v: string) => boolean }[] = [
  { key: 'length', label: '12+ characters', test: (v) => v.length >= 12 },
  { key: 'uppercase', label: 'Uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { key: 'lowercase', label: 'Lowercase letter', test: (v) => /[a-z]/.test(v) },
  { key: 'number', label: 'Number', test: (v) => /\d/.test(v) },
  { key: 'special', label: 'Special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', firstName: '', lastName: '', acceptTerms: false },
  });

  const password = watch('password') ?? '';
  const acceptTerms = watch('acceptTerms');
  const passed = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  const strength = Math.round((passed / PASSWORD_RULES.length) * 100);

  const onSubmit = async (values: RegisterValues) => {
    try {
      const { email } = await registerUser({
        email: values.email.trim(),
        password: values.password,
        firstName: values.firstName?.trim() || undefined,
        lastName: values.lastName?.trim() || undefined,
      });
      toast({
        title: 'Account created',
        description: `Welcome! You can now sign in with ${email}.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: getErrorMessage(error, 'Unable to create your account.'),
      });
    }
  };

  return (
    <FadeIn>
      <AuthBrand />

      <Card className="border-border/50 bg-card/80 shadow-lg backdrop-blur-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create account</CardTitle>
          <CardDescription>Start your journey with us today</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Telegram Quick Register renders only inside Telegram Mini App */}
          <TelegramLoginButton
            autoLogin
            onSuccess={({ accessToken, refreshToken }) => {
              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', refreshToken);
              window.location.href = '/home';
            }}
          />

          {/* Only shown when TelegramLoginButton is visible */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or register with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  placeholder="John"
                  aria-invalid={!!errors.firstName}
                  className="bg-background/50"
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive" role="alert">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  placeholder="Doe"
                  aria-invalid={!!errors.lastName}
                  className="bg-background/50"
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive" role="alert">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                aria-invalid={!!errors.email}
                className="bg-background/50"
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-destructive" role="alert">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  aria-invalid={!!errors.password}
                  className="bg-background/50 pr-10"
                  {...register('password')}
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
              {errors.password && (
                <p className="text-xs text-destructive" role="alert">{errors.password.message}</p>
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
                            ok ? 'text-success' : 'text-muted-foreground',
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

            {/* Terms & Conditions acceptance */}
            <div className="space-y-1.5">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  aria-invalid={!!errors.acceptTerms}
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0 rounded border accent-primary',
                    errors.acceptTerms && 'outline outline-2 outline-destructive',
                  )}
                  {...register('acceptTerms')}
                />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  I have read and agree to the{' '}
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline underline-offset-4 hover:no-underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms &amp; Conditions
                  </Link>
                  . I understand that wallet deposits are non-refundable except as stated therein.
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="text-xs text-destructive" role="alert">{errors.acceptTerms.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !acceptTerms}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
