'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

/** Minimal shape of window.Telegram.WebApp we care about */
interface TelegramWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
  colorScheme: 'light' | 'dark';
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

interface TelegramUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status: string;
}

interface Props {
  /** Called after a successful Telegram login with tokens + user */
  onSuccess: (tokens: { accessToken: string; refreshToken: string; user: TelegramUser }) => void;
  /** If true, attempts auto-login silently without user interaction */
  autoLogin?: boolean;
}

export function TelegramLoginButton({ onSuccess, autoLogin = false }: Props) {
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Telegram.WebApp is available only inside the Mini App
    const tg = window.Telegram?.WebApp;
    if (tg?.initData) {
      setIsInTelegram(true);
      tg.ready();
      tg.expand();
      if (autoLogin) {
        handleTelegramLogin(tg.initData);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLogin]);

  const handleTelegramLogin = useCallback(
    async (initData?: string) => {
      const tg = window.Telegram?.WebApp;
      const data = initData ?? tg?.initData;
      if (!data) return;

      setIsLoading(true);
      try {
        const response = await api.post<{
          accessToken: string;
          refreshToken: string;
          user: TelegramUser;
        }>('/auth/telegram', { initData: data });
        onSuccess(response.data);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Telegram login failed',
          description: getErrorMessage(error, 'Could not authenticate with Telegram.'),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess],
  );

  if (!isInTelegram) return null;

  return (
    <Button
      id="btn-telegram-login"
      type="button"
      variant="outline"
      className="h-11 w-full gap-2 border-[#2AABEE]/40 bg-[#2AABEE]/10 text-[#2AABEE] transition-all hover:bg-[#2AABEE]/20 hover:border-[#2AABEE]/60 focus-visible:ring-[#2AABEE]/40"
      onClick={() => handleTelegramLogin()}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        /* Telegram paper-plane icon */
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      )}
      Continue with Telegram
    </Button>
  );
}
