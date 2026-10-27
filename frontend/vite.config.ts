import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Local API used by `npm run dev`: the Spring API (default) or the Vercel demo function
// started with `npm run dev:api` in the repository root (VITE_API_PROXY=http://localhost:3601).
const apiTarget = process.env.VITE_API_PROXY ?? 'http://localhost:8080';

// Same policy as vercel.json and nginx.conf, so `npm run preview` catches CSP violations early.
const csp = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5173, proxy: { '/api': apiTarget, '/actuator': apiTarget } },
  preview: { proxy: { '/api': apiTarget }, headers: { 'Content-Security-Policy': csp } },
  test: { environment: 'jsdom', setupFiles: ['./src/setupTests.ts'], css: false },
});
