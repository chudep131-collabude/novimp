import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Extend Axios request config to type the retry flag we use in the interceptor.
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

/** Maximum length for user-facing error messages. Prevents leaking stack traces. */
const MAX_ERROR_MESSAGE_LENGTH = 300;

/**
 * Extract a human-readable message from an API/axios error so it can be shown
 * in a toast. Falls back to a generic string. Output is capped at
 * MAX_ERROR_MESSAGE_LENGTH characters to prevent leaking server internals.
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const err = error as AxiosError<{ message?: string | string[] }>;
  const message = err?.response?.data?.message;

  let result: string;
  if (Array.isArray(message)) {
    result = message.join(', ');
  } else if (typeof message === 'string' && message.length > 0) {
    result = message;
  } else if (err?.message) {
    result = err.message;
  } else {
    result = fallback;
  }

  // Cap length to avoid leaking stack traces or verbose server responses
  return result.length > MAX_ERROR_MESSAGE_LENGTH
    ? result.slice(0, MAX_ERROR_MESSAGE_LENGTH) + '…'
    : result;
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const response = await axios.post('/api/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

