import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Os mesmos cabeçalhos de segurança da Vercel (vercel.json) e do nginx; o preview os aplica para os testes ponta a ponta.
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5173, proxy: { '/api': 'http://localhost:8080', '/actuator': 'http://localhost:8080' } },
  preview: { headers: securityHeaders },
  // Fontes e imagens sempre como arquivos: a CSP (font-src 'self') não aceita data: URIs.
  build: { assetsInlineLimit: 0 },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    coverage: { provider: 'v8', include: ['src/**/*.{ts,tsx}'], exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/test-utils.tsx', 'src/setupTests.ts', 'src/vite-env.d.ts'], reporter: ['text-summary', 'html', 'lcov'], thresholds: { lines: 85, statements: 85, branches: 65, functions: 55 } },
  },
});
