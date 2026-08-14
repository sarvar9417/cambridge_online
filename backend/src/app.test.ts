import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './app.js';

describe('API access', () => {
  it('exposes health publicly', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('mounts PostgreSQL readiness publicly', () => {
    const publicMounts = (app.locals.routeMounts as Array<{path:string;public:boolean}>).filter((item) => item.public).map((item) => item.path);
    expect(publicMounts).toContain('/api/v1/ready');
  });

  it('protects all routes mounted after auth middleware', async () => {
    const response = await request(app).get('/api/v1/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('unauthorized');
  });

  it('has no unexpected public router mount', () => {
    const publicMounts = (app.locals.routeMounts as Array<{path:string;public:boolean}>).filter((item) => item.public).map((item) => item.path);
    expect(publicMounts).toEqual(['/api/v1/health','/api/v1/ready','/api/v1/auth']);
  });
});
