import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Local API used by `npm run dev`: the Spring API (default) or the Vercel demo function
// started with `npm run dev:api` in the repository root (VITE_API_PROXY=http://localhost:3601).
const apiTarget = process.env.VITE_API_PROXY ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5173, proxy: { '/api': apiTarget, '/actuator': apiTarget } },
  preview: { proxy: { '/api': apiTarget } },
  test: { environment: 'jsdom', setupFiles: ['./src/setupTests.ts'], css: false },
});
