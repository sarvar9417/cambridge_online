import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Testcontainers pulls and boots postgres:16 on the first run.
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
});
