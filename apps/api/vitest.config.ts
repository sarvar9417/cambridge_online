import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * NestJS resolves constructor dependencies from `design:paramtypes`, which only
 * exists when the compiler emits decorator metadata. esbuild — vitest's default
 * transform — does not emit it, so every injected dependency arrives as
 * `undefined`. SWC does emit it, hence this plugin.
 */
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: false,
    setupFiles: ['./test/setup.ts'],
    // CLAUDE.md fixes the blocking test's filename as `authz.e2e-spec.ts`,
    // which the default `*.spec.ts` glob does not match.
    include: ['src/**/*.test.ts', 'test/**/*.spec.ts', 'test/**/*-spec.ts'],
    // Testcontainers pulls and boots postgres:16 on the first run.
    testTimeout: 60_000,
    hookTimeout: 180_000,
    // Containers are expensive; one worker keeps a single database in play.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
