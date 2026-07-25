import { defineConfig } from 'vitest/config';

// Scoped to promo/ so the Worker unit suite (src/**/*.test.ts) and this one never collect each other.
export default defineConfig({
  test: {
    include: ['promo/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000,
  },
});
