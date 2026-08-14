import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { createReadyRouter } from './routes/health.js';

describe('readiness', () => {
  it('returns ok when PostgreSQL responds', async () => {
    const app=express();app.use('/ready',createReadyRouter({query:vi.fn().mockResolvedValue({rows:[{one:1}]})} as unknown as Pool));
    const response=await request(app).get('/ready');
    expect(response.status).toBe(200);expect(response.body).toEqual({status:'ok',database:'ok',capabilities:{}});
  });
  it('returns 503 when PostgreSQL is unavailable', async () => {
    const app=express();app.use('/ready',createReadyRouter({query:vi.fn().mockRejectedValue(new Error('down'))} as unknown as Pool));
    const response=await request(app).get('/ready');
    expect(response.status).toBe(503);expect(response.body.database).toBe('error');
  });
  it('returns 503 when database configuration is missing', async () => {
    const app=express();app.use('/ready',createReadyRouter(null));
    expect((await request(app).get('/ready')).status).toBe(503);
  });
});
