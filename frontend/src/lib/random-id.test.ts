import { afterEach, expect, it, vi } from 'vitest';
import { randomId } from './random-id';

afterEach(() => vi.unstubAllGlobals());

it('uses the browser UUID generator when available', () => {
  const uuid = 'b0f4d2b1-1f62-43af-9e54-05402d1d1c4a';
  vi.stubGlobal('crypto', { randomUUID: () => uuid });
  expect(randomId()).toBe(uuid);
});

it('creates distinct UUID v4 identifiers on HTTP LAN origins without randomUUID', () => {
  const getRandomValues = crypto.getRandomValues.bind(crypto);
  vi.stubGlobal('crypto', { getRandomValues });
  const ids = Array.from({ length: 100 }, randomId);
  expect(new Set(ids).size).toBe(100);
  for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
