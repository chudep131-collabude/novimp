'use client';

import { createContext, useContext, useEffect, useCallback, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { isAdminRole, isStaffRole, type UserRole } from '@/lib/types';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  role: UserRole;
  status: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Any privileged back-office role (can reach /admin). */
  isStaff: boolean;
  /** ADMIN or SUPER_ADMIN full console access. */
  isAdmin: boolean;
  /** Scoped sub-admin roles. */
  isSupport: boolean;
  isFinance: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithTelegram: (initData: string) => Promise<void>;
  register: (data: RegisterData) => Promise<{ email: string }>;
  logout: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Routes that do not require authentication. Centralised here so new public
 * pages are never accidentally missed when updating the auth guard.
 */
export const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/verify',
  '/forgot-password',
  '/reset-password',
  '/terms',
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchUser();
    } else {
      // Auto-login from Telegram Mini App if initData is present
      const tgInitData = window.Telegram?.WebApp?.initData;
      if (tgInitData) {
        loginWithTelegram(tgInitData).catch(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    }
    // Safety net: never leave the app in a perpetual loading state
    const timeout = setTimeout(() => setIsLoading(false), 10_000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      const isPublic = PUBLIC_PATHS.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
      );
      if (!isPublic) {
        router.push('/login');
      }
    }
  }, [isLoading, user, pathname, router]);

  const fetchUser = async () => {
    try {
      const response = await api.get('/users/me');
      setUser(response.data);
    } catch (err: any) {
      // If we got a non-401 error (network, 500, etc.) just clear state.
      // 401s are handled by the axios interceptor which refreshes the token
      // and retries — if the retry also fails it redirects to /login itself.
      if (err?.response?.status !== 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(user);
    router.push('/home');
  };

  const loginWithTelegram = useCallback(async (initData: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/telegram', { initData });
      const { accessToken, refreshToken, user: tgUser } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(tgUser);
      router.push('/home');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const register = async (data: RegisterData) => {
    const response = await api.post<{ userId: string; email: string; requiresVerification?: boolean }>('/auth/register', data);
    const email = response.data?.email ?? data.email;

    if (response.data?.requiresVerification === false) {
      // Dev mode: account is auto-verified, go straight to login
      router.push('/login');
      return { email };
    }

    // Production: remember email for the verify screen
    try {
      localStorage.setItem('pendingVerificationEmail', email);
    } catch {
      /* storage unavailable verify page falls back to manual entry */
    }
    router.push('/verify');
    return { email };
  };

  const logout = async () => {
    // Revoke the server-side session so the token can no longer be used
    // even if it has not yet expired. Fire-and-forget clear local state
    // regardless of whether the API call succeeds.
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors (e.g. already expired token) we still clear locally
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isStaff: isStaffRole(user?.role),
        isAdmin: isAdminRole(user?.role),
        isSupport: user?.role === 'SUPPORT',
        isFinance: user?.role === 'FINANCE',
        login,
        loginWithTelegram,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

