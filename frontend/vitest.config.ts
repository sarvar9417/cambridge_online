import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The theme module reads localStorage, matchMedia and documentElement, so
    // it needs a DOM rather than the default node environment.
    environment: 'jsdom',
  },
});
