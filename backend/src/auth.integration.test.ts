import argon2 from 'argon2';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { MemoryAuthRepository } from './repositories/auth-repository.memory.js';
import type { ClassesRepository } from './repositories/classes-repository.js';
import { AuthService } from './services/auth-service.js';
import { clearRateLimits } from './middleware/rate-limit.js';
import { SignJWT } from 'jose';
import { config } from './config.js';

const cookieValue = (setCookie: string[] | string | undefined) => {
  const values = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const cookie = values.find((value) => value.startsWith('campath_refresh='));
  if (!cookie) throw new Error('Refresh cookie missing');
  return cookie.split(';')[0]!;
};

describe('authentication flow', () => {
  let repository: MemoryAuthRepository;
  let app: ReturnType<typeof createApp>;
  let passwordHash: string;

  beforeAll(async () => { passwordHash = await argon2.hash('secure-password', { memoryCost: 4096, timeCost: 1 }); });

  beforeEach(async () => {
    clearRateLimits();
    repository = new MemoryAuthRepository();
    repository.add({
      id: '22605ad7-b3df-4249-9b58-052f5d830fd8',
      schoolId: '3b55a939-fba8-48f3-b54a-68949aa6e898',
      role: 'owner',
      fullName: 'Sarvar',
      passwordHash,
      email: 'sarvar@example.com',
      username: 'sarvar',
    });
    app = createApp(new AuthService(repository));
  });

  it('rejects an invalid login body', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({ identifier: '', password: 'x' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('validation_error');
  });

  it('logs in, sets an httpOnly refresh cookie, and authorizes me', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({
      identifier: 'sarvar', password: 'secure-password',
    });
    expect(login.status).toBe(200);
    expect(login.headers['set-cookie']?.[0]).toContain('HttpOnly');

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ fullName: 'Sarvar', role: 'owner' });
  });

  it('rejects an expired access token with 401',async()=>{
    const token=await new SignJWT({role:repository.user.role,schoolId:repository.user.schoolId,tv:repository.user.tokenVersion})
      .setProtectedHeader({alg:'HS256'}).setSubject(repository.user.id).setIssuedAt().setExpirationTime(Math.floor(Date.now()/1000)-1)
      .sign(new TextEncoder().encode(config.JWT_SECRET));
    const response=await request(app).get('/api/v1/auth/me').set('Authorization',`Bearer ${token}`);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('invalid_token');
  });

  it('rotates refresh tokens and revokes all sessions on reuse', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({
      identifier: 'sarvar@example.com', password: 'secure-password',
    });
    const firstCookie = cookieValue(login.headers['set-cookie']);

    const refreshed = await request(app).post('/api/v1/auth/refresh').set('Cookie', firstCookie);
    expect(refreshed.status).toBe(200);
    expect(cookieValue(refreshed.headers['set-cookie'])).not.toBe(firstCookie);

    const reused = await request(app).post('/api/v1/auth/refresh').set('Cookie', firstCookie);
    expect(reused.status).toBe(410);
    expect(reused.body.error.code).toBe('refresh_reused');
    expect(repository.revokedAll).toBe(1);

    const oldAccess = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(oldAccess.status).toBe(401);
  });

  it('rejects an ordinarily revoked refresh token with 401',async()=>{
    const login=await request(app).post('/api/v1/auth/login').send({identifier:'sarvar',password:'secure-password'});
    const cookie=cookieValue(login.headers['set-cookie']);
    const logout=await request(app).post('/api/v1/auth/logout').set('Authorization',`Bearer ${login.body.accessToken}`).set('Cookie',cookie);
    expect(logout.status).toBe(204);
    const refresh=await request(app).post('/api/v1/auth/refresh').set('Cookie',cookie);
    expect(refresh.status).toBe(401);
    expect(refresh.body.error.code).toBe('invalid_refresh');
    expect(repository.revokedAll).toBe(0);
  });

  it('rejects role elevation in the strict profile DTO',async()=>{
    repository.user.role='student';
    const login=await request(app).post('/api/v1/auth/login').send({identifier:'sarvar',password:'secure-password'});
    const response=await request(app).patch('/api/v1/auth/me').set('Authorization',`Bearer ${login.body.accessToken}`).send({role:'teacher'});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('validation_error');
    expect(repository.user.role).toBe('student');
  });

  it('updates only allowed profile fields',async()=>{
    const login=await request(app).post('/api/v1/auth/login').send({identifier:'sarvar',password:'secure-password'});
    const response=await request(app).patch('/api/v1/auth/me').set('Authorization',`Bearer ${login.body.accessToken}`).send({fullName:'Sarvar Aliev'});
    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({fullName:'Sarvar Aliev',role:'owner'});
  });

  it('passes the authenticated actor to the classes repository', async () => {
    repository.user.role = 'student';
    repository.user.fullName = 'Aziz Karimov';
    const seenActors: string[] = [];
    const classes: ClassesRepository = {
      async findVisible(actor) {
        seenActors.push(actor.id);
        return [{
          id: '2fe20e05-75b3-43a7-ac45-a81cb52b4ca8',
          name: '10-A CS', grade: 10, level: 'AS', academicYear: '2026/2027', studentCount: 6,
        }];
      },
      async findOne(){return null},async enroll(){throw new Error('not used')},
    };
    app = createApp(new AuthService(repository), classes);
    const login = await request(app).post('/api/v1/auth/login').send({
      identifier: 'sarvar', password: 'secure-password',
    });
    const response = await request(app)
      .get('/api/v1/classes')
      .set('Authorization', `Bearer ${login.body.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(seenActors).toEqual([repository.user.id]);
  });

  it('returns 404 for a class outside the teacher scope',async()=>{
    repository.user.role='teacher';
    const classes:ClassesRepository={findVisible:async()=>[],findOne:async()=>null,enroll:async()=>{throw new Error('not used')}};
    app=createApp(new AuthService(repository),classes);
    const login=await request(app).post('/api/v1/auth/login').send({identifier:'sarvar',password:'secure-password'});
    const response=await request(app).get('/api/v1/classes/2fe20e05-75b3-43a7-ac45-a81cb52b4ca8').set('Authorization',`Bearer ${login.body.accessToken}`);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('not_found');
  });

  it('redeems an invite once and creates a session', async () => {
    const response = await request(app).post('/api/v1/auth/redeem-invite').send({
      code: 'VALID-CODE', fullName: 'New Student', username: 'new.student', password: 'secure-password',
    });
    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ role: 'student', fullName: 'New Student' });
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
  });

  it('rejects an invalid or already-used invite with 410', async () => {
    const response = await request(app).post('/api/v1/auth/redeem-invite').send({
      code: 'EXPIRED-CODE', fullName: 'New Student', username: 'new.student', password: 'secure-password',
    });
    expect(response.status).toBe(410);
    expect(response.body.error.code).toBe('invite_invalid');
  });
  it('changes password and revokes the old access token',async()=>{const login=await request(app).post('/api/v1/auth/login').send({identifier:'sarvar',password:'secure-password'});const changed=await request(app).post('/api/v1/auth/change-password').set('Authorization',`Bearer ${login.body.accessToken}`).send({currentPassword:'secure-password',newPassword:'new-secure-password'});expect(changed.status).toBe(204);const old=await request(app).get('/api/v1/auth/me').set('Authorization',`Bearer ${login.body.accessToken}`);expect(old.status).toBe(401);const next=await request(app).post('/api/v1/auth/login').send({identifier:'sarvar',password:'new-secure-password'});expect(next.status).toBe(200)});
});
