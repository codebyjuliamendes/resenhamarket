import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// `npm run demo`: serve a API simulada de api/server.ts (a mesma da Vercel) dentro do Vite,
// com os dados de demonstração em memória. Não precisa de Java, Docker nem banco.
const mockApiPath = fileURLToPath(new URL('../api/server.ts', import.meta.url));

function mockApi(): Plugin {
  return {
    name: 'resenha-mock-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        try {
          const mod = await server.ssrLoadModule(mockApiPath);
          await mod.default(req, res);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: mode === 'demo' ? [react(), mockApi()] : [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: mode === 'demo' ? undefined : { '/api': 'http://localhost:8080', '/actuator': 'http://localhost:8080' },
  },
  test: { environment: 'jsdom', setupFiles: ['./src/setupTests.ts'], css: false },
}));
