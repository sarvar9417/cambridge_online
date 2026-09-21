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
    const response = await request(app).get('/');
    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBeDefined();
  });

  it('refunds a server failure when requested', async () => {
    const app = express();
    app.post('/login', rateLimit({ windowMs: 60_000, max: 1, refundOnServerError: true }), (_req, res) => {
      res.status(500).json({ error: 'database failed' });
    });

    expect((await request(app).post('/login')).status).toBe(500);
    expect((await request(app).post('/login')).status).toBe(500);
  });

  it('still counts client failures when server-error refunds are enabled', async () => {
    const app = express();
    app.post('/login', rateLimit({ windowMs: 60_000, max: 1, refundOnServerError: true }), (_req, res) => {
      res.status(401).json({ error: 'invalid credentials' });
    });

    expect((await request(app).post('/login')).status).toBe(401);
    const limited = await request(app).post('/login');
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('rate_limited');
  });
});
