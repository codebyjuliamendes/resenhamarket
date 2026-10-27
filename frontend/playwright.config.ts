import { defineConfig, devices } from '@playwright/test';

// Os testes ponta a ponta usam a API real (Spring Boot + PostgreSQL) com a demonstração "todos".
// Suba a API antes (porta 8080); o Vite em modo preview repassa /api para ela.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /celular\.spec\.ts/ },
    { name: 'celular', use: { ...devices['Pixel 7'] }, testMatch: /celular\.spec\.ts/ },
  ],
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
