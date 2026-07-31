/**
 * Auth context — holds the current user, login/logout, and refresh.
 */
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { SafeUser } from '../types';
import { authApi, saveSession, clearSession, getStoredUser } from '../api/client';

interface AuthCtx {
  user: SafeUser | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<SafeUser>;
  register: (data: any) => Promise<SafeUser>;
  logout: () => void;
  setUser: (u: SafeUser) => void;
}
const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<SafeUser | null>(getStoredUser());
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (phone: string, password: string) => {
    const { token, user: u } = await authApi.login(phone, password);
    saveSession(token, u);
    setUserState(u);
    return u;
  }, []);

  const register = useCallback(async (data: any) => {
    const { token, user: u } = await authApi.register(data);
    saveSession(token, u);
    setUserState(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUserState(null);
  }, []);

  const setUser = useCallback((u: SafeUser) => setUserState(u), []);

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
