import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { requireClassAccess, requireRoles } from './middleware/auth.js';

const actor = { id:'user-id', role:'teacher' as const, schoolId:'school-id', fullName:'Teacher' };
const actorMiddleware: express.RequestHandler = (req,_res,next) => { req.actor=actor; next(); };

describe('authorization middleware', () => {
  it('requireRoles allows an included role', async () => {
    const app=express();app.use(actorMiddleware,requireRoles('teacher','owner'));app.get('/x',(_q,r)=>r.sendStatus(204));
    expect((await request(app).get('/x')).status).toBe(204);
  });
  it('requireRoles rejects a role outside the list', async () => {
    const app=express();app.use(actorMiddleware,requireRoles('owner'));app.get('/x',(_q,r)=>r.sendStatus(204));
    expect((await request(app).get('/x')).status).toBe(403);
  });
  it('requireRoles rejects a missing actor', async () => {
    const app=express();app.use(requireRoles('owner'));app.get('/x',(_q,r)=>r.sendStatus(204));
    expect((await request(app).get('/x')).status).toBe(401);
  });
  it('requireClassAccess allows visible class', async () => {
    const query=vi.fn().mockResolvedValue({rowCount:1});const app=express();app.use(actorMiddleware);app.get('/classes/:classId',requireClassAccess({query} as unknown as Pool),(_q,r)=>r.sendStatus(204));
    expect((await request(app).get('/classes/visible')).status).toBe(204);
  });
  it('requireClassAccess hides inaccessible class as 404', async () => {
    const query=vi.fn().mockResolvedValue({rowCount:0});const app=express();app.use(actorMiddleware);app.get('/classes/:classId',requireClassAccess({query} as unknown as Pool),(_q,r)=>r.sendStatus(204));
    expect((await request(app).get('/classes/hidden')).status).toBe(404);
  });
  it('class access query includes teacher, owner and student scopes', async () => {
    const query=vi.fn().mockResolvedValue({rowCount:1});const app=express();app.use(express.json(),actorMiddleware);app.post('/x',requireClassAccess({query} as unknown as Pool,'body'),(_q,r)=>r.sendStatus(204));
    await request(app).post('/x').send({classId:'class-id'});const [sql,values]=query.mock.calls[0]!;
    expect(sql).toContain("$2='student'");expect(sql).toContain('class_teachers');expect(values).toEqual(['class-id','teacher','school-id','user-id']);
  });
});
