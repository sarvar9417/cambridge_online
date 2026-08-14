import { Test } from '@nestjs/testing';
import { DiscoveryService, MetadataScanner, ModulesContainer, Reflector } from '@nestjs/core';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { IS_PUBLIC_KEY } from '../src/common/public.decorator.js';
import { REDIS_CLIENT } from '../src/redis.module.js';
import { S3_CLIENT } from '../src/storage.module.js';

/**
 * BLOCKING TEST — CI fails and deploy is blocked if this fails.
 *
 * R1's default-deny only holds if `@Public()` stays rare and deliberate. This
 * walks every controller route the application actually registers and asserts
 * that the public set is exactly the five agreed endpoints. Adding a sixth is a
 * decision, not an accident, and it has to be made here first.
 *
 * Human review does not catch a forgotten guard; this does.
 */
const ALLOWED_PUBLIC_ROUTES = new Set([
  'POST /auth/login',
  'POST /auth/refresh',
  'POST /auth/redeem-invite',
  'GET /health',
  'GET /ready',
]);

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL', 'OPTIONS', 'HEAD', 'SEARCH'];

interface DiscoveredRoute {
  signature: string;
  isPublic: boolean;
}

async function discoverRoutes(): Promise<DiscoveredRoute[]> {
  process.env.DATABASE_URL ??= 'postgresql://unused:unused@127.0.0.1:1/unused';
  process.env.JWT_SECRET ??= 'test-only-access-secret-at-least-32-chars';

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(REDIS_CLIENT)
    .useValue({ ping: async () => 'PONG', quit: async () => undefined })
    .overrideProvider(S3_CLIENT)
    .useValue({ headBucket: async () => ({}) })
    .compile();

  // DiscoveryService walks the ModulesContainer, not the testing module itself.
  const discovery = new DiscoveryService(moduleRef.get(ModulesContainer));
  const scanner = new MetadataScanner();
  const reflector = new Reflector();
  const routes: DiscoveredRoute[] = [];

  for (const wrapper of discovery.getControllers()) {
    const instance = wrapper.instance as Record<string, unknown> | undefined;
    if (!instance) continue;

    const controller = wrapper.metatype as (new (...args: never[]) => unknown) | undefined;
    if (!controller) continue;

    const controllerPath = Reflect.getMetadata(PATH_METADATA, controller) ?? '';
    const controllerPublic = Boolean(reflector.get(IS_PUBLIC_KEY, controller));

    const prototype = Object.getPrototypeOf(instance) as object;
    for (const methodName of scanner.getAllMethodNames(prototype)) {
      const handler = (instance as Record<string, (...args: never[]) => unknown>)[methodName];
      if (typeof handler !== 'function') continue;

      const routePath = Reflect.getMetadata(PATH_METADATA, handler);
      if (routePath === undefined) continue;

      const methodIndex = Reflect.getMetadata(METHOD_METADATA, handler) as number | undefined;
      const method = HTTP_METHODS[methodIndex ?? 0] ?? 'GET';
      const full = `/${[controllerPath, routePath].filter((part) => part && part !== '/').join('/')}`;

      routes.push({
        signature: `${method} ${full}`,
        isPublic: controllerPublic || Boolean(reflector.get(IS_PUBLIC_KEY, handler)),
      });
    }
  }

  await moduleRef.close();
  return routes;
}

describe('route coverage (BLOCKING)', () => {
  it('registers at least the auth and health surface', async () => {
    const routes = await discoverRoutes();
    const signatures = routes.map((route) => route.signature);

    // A discovery bug that found nothing would make every other assertion here
    // vacuously pass, so prove the walker actually sees routes.
    expect(signatures).toContain('POST /auth/login');
    expect(signatures).toContain('GET /auth/me');
    expect(signatures).toContain('GET /ready');
  });

  it('exposes no route publicly beyond the agreed five', async () => {
    const routes = await discoverRoutes();
    const unexpected = routes
      .filter((route) => route.isPublic)
      .map((route) => route.signature)
      .filter((signature) => !ALLOWED_PUBLIC_ROUTES.has(signature));

    expect(unexpected).toEqual([]);
  });

  it('leaves every other route behind the global guards', async () => {
    const routes = await discoverRoutes();
    const guarded = routes.filter((route) => !route.isPublic).map((route) => route.signature);

    expect(guarded).toContain('GET /auth/me');
    expect(guarded).toContain('PATCH /auth/me');
    expect(guarded).toContain('POST /auth/logout');
    for (const signature of guarded) {
      expect(ALLOWED_PUBLIC_ROUTES.has(signature)).toBe(false);
    }
  });
});
