'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/components/auth/auth-provider';
import { TelegramLoginButton } from '@/components/auth/telegram-login';
import { ThemeLogo } from '@/components/theme-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { StaggerList, StaggerItem } from '@/components/motion';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      await login(values.email.trim(), values.password);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: getErrorMessage(error, 'Invalid email or password.'),
      });
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast({
      title: 'Not implemented',
      description: `Sign in with ${provider} will be available soon.`,
    });
  };

  return (
    <div className="mx-auto w-full max-w-[400px]">
      {/* Mobile Logo (hidden on lg since sidebar has it) */}
      <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
        <ThemeLogo width={40} height={40} className="rounded-xl" />
        <span className="text-xl font-bold tracking-tight">NoviMP</span>
      </div>

      <StaggerList className="flex flex-col gap-6">
        <StaggerItem>
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>
        </StaggerItem>

        {/* Telegram (visible only inside the Telegram Mini App renders nothing on web) */}
        <StaggerItem>
          <TelegramLoginButton
            autoLogin
            onSuccess={({ accessToken, refreshToken }) => {
              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', refreshToken);
              window.location.href = '/home';
            }}
          />
        </StaggerItem>

        {/* Email/Password form */}
        <StaggerItem>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive" role="alert">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive" role="alert">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </StaggerItem>

        <StaggerItem>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don&apos;t have an account?</span>{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </StaggerItem>
      </StaggerList>
    </div>
  );
}
