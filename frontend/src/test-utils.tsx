import { vi } from 'vitest';
import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './components/Toast';

export function renderWithProviders(ui: ReactElement, route = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider><ToastProvider>{ui}</ToastProvider></AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

type Route = { method?: string; path: string | RegExp; status?: number; body: unknown };
/** Simula a API: cada rota responde com o corpo e o status dados; chamadas sem rota falham o teste. */
export function mockApi(routes: Route[]) {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const path = url.replace(/^\/api\/v1/, '');
    const route = routes.find((r) => (r.method ?? 'GET') === method && (typeof r.path === 'string' ? path.split('?')[0] === r.path : r.path.test(path)));
    if (!route) throw new Error(`Rota não simulada: ${method} ${url}`);
    return jsonResponse(route.body, route.status ?? 200);
  });
  return { calls, spy };
}

export function signIn(perfil: 'ADMINISTRADOR' | 'OPERADOR' = 'ADMINISTRADOR') {
  sessionStorage.setItem('resenha.token', 'token-de-teste');
  sessionStorage.setItem('resenha.user', JSON.stringify({ id: 1, nome: perfil === 'ADMINISTRADOR' ? 'Administradora Demo' : 'Operador Demo', email: 'x@resenha.dev', perfil }));
  sessionStorage.setItem('resenha.expiresAt', String(Date.now() + 3_600_000));
}
