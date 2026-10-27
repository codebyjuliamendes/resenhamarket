import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, TOKEN_KEY, type LoginResponse, type Usuario } from '../api/client';

type Auth = { user: Usuario | null; notice: string; login: (email: string, senha: string) => Promise<void>; logout: (notice?: string) => void };
const Context = createContext<Auth | null>(null);
const USER_KEY = 'resenha.user';
const EXPIRES_KEY = 'resenha.expiresAt';

function storedUser(): Usuario | null {
  try {
    const expiresAt = Number(sessionStorage.getItem(EXPIRES_KEY) || 0);
    if (expiresAt && expiresAt <= Date.now()) return null;
    return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<Usuario | null>(storedUser);
  const [notice, setNotice] = useState('');

  const logout = useCallback((message = '') => {
    [TOKEN_KEY, USER_KEY, EXPIRES_KEY].forEach((key) => sessionStorage.removeItem(key));
    queryClient.clear();
    setNotice(message);
    setUser(null);
  }, [queryClient]);

  useEffect(() => {
    const expired = () => logout('Sua sessão expirou. Entre novamente para continuar.');
    window.addEventListener('resenha:unauthorized', expired);
    return () => window.removeEventListener('resenha:unauthorized', expired);
  }, [logout]);

  useEffect(() => {
    if (!user) return;
    const remaining = Number(sessionStorage.getItem(EXPIRES_KEY) || 0) - Date.now();
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => logout('Sua sessão expirou. Entre novamente para continuar.'), remaining);
    return () => window.clearTimeout(timer);
  }, [user, logout]);

  const login = useCallback(async (email: string, senha: string) => {
    const data = await api<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) });
    sessionStorage.setItem(TOKEN_KEY, data.token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
    sessionStorage.setItem(EXPIRES_KEY, String(Date.now() + data.expiraEm * 1000));
    setNotice('');
    setUser(data.usuario);
  }, []);

  const value = useMemo(() => ({ user, notice, login, logout }), [user, notice, login, logout]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const context = useContext(Context);
  if (!context) throw new Error('AuthProvider ausente');
  return context;
}
