'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type User = {
  id: string;
  email: string;
  role: string;
  tenantId: string;
};

type AuthValue = {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | undefined>(undefined);

const STORAGE_KEY = 'fairflow_auth_v1';

type StoredAuth = { token: string; user: User };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as StoredAuth;
        setToken(parsed.token);
        setUser(parsed.user);
      }
    } catch (error) {
      console.warn('Failed to restore auth session', error);
    } finally {
      setHydrated(true);
    }
  }, []);

  const persist = useCallback((nextToken: string | null, nextUser: User | null) => {
    if (typeof window === 'undefined') return;
    if (nextToken && nextUser) {
      const value: StoredAuth = { token: nextToken, user: nextUser };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        return { ok: false as const, error: data?.error || 'INVALID_LOGIN' };
      }
      setToken(data.token);
      setUser(data.user);
      persist(data.token, data.user);
      return { ok: true as const };
    } catch (error) {
      console.error('Login failed', error);
      return { ok: false as const, error: 'NETWORK_ERROR' };
    }
  }, [persist]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    persist(null, null);
  }, [persist]);

  const value = useMemo<AuthValue>(
    () => ({ token, user, hydrated, login, logout }),
    [token, user, hydrated, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
