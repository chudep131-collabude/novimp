'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthBrand } from '@/components/auth/auth-brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api';
import { useForgotPassword } from '@/lib/queries';
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const forgotPassword = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await forgotPassword.mutateAsync(values.email.trim());
      setSentEmail(values.email.trim());
      setSent(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Request failed',
        description: getErrorMessage(error, 'Could not send the reset code. Please try again.'),
      });
    }
  };

  if (sent) {
    return (
      <div className="animate-fade-in text-center">
        <AuthBrand />
        <Card className="border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl">
          <CardContent className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="mb-2 text-xl font-bold">Check your inbox</h2>
            <p className="mb-1 text-sm text-muted-foreground">
              We sent a password-reset code to
            </p>
            <p className="mb-6 font-medium">{sentEmail}</p>
            <p className="mb-6 text-xs text-muted-foreground">
              The code expires in 15 minutes. Check your spam folder if you don&apos;t see it.
            </p>
            <Button asChild className="w-full">
              <Link href={`/reset-password?email=${encodeURIComponent(sentEmail)}`}>
                Enter reset code
              </Link>
            </Button>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Use a different email
              </button>
            </div>
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
          <CardTitle className="text-2xl font-bold">Forgot password?</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a 6-digit reset code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  aria-invalid={!!errors.email}
                  className="bg-background/50 pl-9"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting} size="lg">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                'Send reset code'
              )}
            </Button>
          </form>

          <div className="mt-6">
            <Link
              href="/login"
              className="flex items-center justify-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
