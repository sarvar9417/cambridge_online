import argon2 from 'argon2';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import type { AuthRepository, AuthUser, RefreshRecord } from './repositories/auth-repository.js';
import type { ClassesRepository } from './repositories/classes-repository.js';
import { AuthService } from './services/auth-service.js';

class MemoryAuthRepository implements AuthRepository {
  user!: AuthUser;
  refreshRecords = new Map<string, RefreshRecord>();
  revokedAll = 0;

  async findByIdentifier(identifier: string) {
    return ['sarvar@example.com', 'sarvar'].includes(identifier) ? this.user : null;
  }

  async findById(id: string) {
    return this.user.id === id && this.user.isActive ? this.user : null;
  }

  async storeRefreshToken(userId: string, rawToken: string, expiresAt: Date) {
    this.refreshRecords.set(rawToken, {
      id: crypto.randomUUID(), userId, tokenVersion: this.user.tokenVersion,
      revokedAt: null, expiresAt, user: this.user,
    });
  }

  async findRefreshToken(rawToken: string) {
    return this.refreshRecords.get(rawToken) ?? null;
  }

  async rotateRefreshToken(recordId: string, userId: string, rawToken: string, expiresAt: Date) {
    const previous = [...this.refreshRecords.values()].find((record) => record.id === recordId);
    if (!previous || previous.revokedAt) throw new Error('refresh_already_used');
    previous.revokedAt = new Date();
    await this.storeRefreshToken(userId, rawToken, expiresAt);
  }

  async revokeRefreshToken(rawToken: string) {
    const record = this.refreshRecords.get(rawToken);
    if (record) record.revokedAt ??= new Date();
  }

  async revokeAllSessions() {
    this.revokedAll += 1;
    for (const record of this.refreshRecords.values()) record.revokedAt ??= new Date();
    this.user.tokenVersion += 1;
  }

  async updateLastLogin() {}

  async redeemInvite(input: { code:string; fullName:string; username:string; passwordHash:string }) {
    if (input.code !== 'VALID-CODE') throw new Error('invite_invalid');
    this.user = { ...this.user, id: crypto.randomUUID(), role: 'student', fullName: input.fullName, passwordHash: input.passwordHash, tokenVersion: 1 };
    return this.user;
  }
  async changePassword(_userId:string,passwordHash:string){this.user.passwordHash=passwordHash;await this.revokeAllSessions()}
}

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
    repository = new MemoryAuthRepository();
    repository.user = {
      id: '22605ad7-b3df-4249-9b58-052f5d830fd8',
      schoolId: '3b55a939-fba8-48f3-b54a-68949aa6e898',
      role: 'owner',
      fullName: 'Sarvar',
      passwordHash,
      tokenVersion: 1,
      isActive: true,
      email: 'sarvar@example.com',
      username: 'sarvar',
    } as AuthUser & { email: string; username: string };
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
