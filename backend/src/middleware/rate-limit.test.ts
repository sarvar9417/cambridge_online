import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearRateLimits, rateLimit } from './rate-limit.js';
describe('rate limiter', () => {
  beforeEach(clearRateLimits);
  it('allows requests under limit', async () => {
    const app = express();
    app.use(rateLimit({ windowMs: 1000, max: 2 }));
    app.get('/', (_q, r) => r.sendStatus(204));
    expect((await request(app).get('/')).status).toBe(204);
    expect((await request(app).get('/')).status).toBe(204);
  });
  it('returns 429 over limit', async () => {
    const app = express();
    app.use(rateLimit({ windowMs: 1000, max: 1 }));
    app.get('/', (_q, r) => r.sendStatus(204));
    await request(app).get('/');
    const r = await request(app).get('/');
    expect(r.status).toBe(429);
    expect(r.headers['retry-after']).toBeDefined();
  });
});
