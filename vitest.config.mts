import { defineConfig } from 'vitest/config';

// Tests of the Vercel demo function (api/). The frontend has its own Vitest setup in frontend/.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    env: { API_LOG: 'off' },
  },
});
