import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
import { createApp } from './app.js';
import { config } from './config.js';
import { ConsoleMailer, type EmailMessage, type Mailer } from './lib/email/mailer.js';
import { clearRateLimits } from './middleware/rate-limit.js';
import { MemoryAuthRepository } from './repositories/auth-repository.memory.js';
import { AuthService } from './services/auth-service.js';

/** Captures what would have been sent, so a test can follow the link. */
class RecordingMailer implements Mailer {
  readonly configured = true;
  sent: EmailMessage[] = [];
  async send(message: EmailMessage) {
    this.sent.push(message);
    return { delivered: true };
  }
  get lastResetToken() {
    const match = this.sent.at(-1)?.text.match(/reset-password\?token=([\w-]+)/);
    return match?.[1] ?? null;
  }
}

const OWNER_ID = '22605ad7-b3df-4249-9b58-052f5d830fd8';
const SCHOOL_ID = '3b55a939-fba8-48f3-b54a-68949aa6e898';
const CLASS_ID = 'f0c8f1cb-9a5c-4f5b-9a45-3f9b0f4b2d11';

describe('registration, approval and password recovery', () => {
  let repository: MemoryAuthRepository;
  let mailer: RecordingMailer;
  let app: ReturnType<typeof createApp>;
  let passwordHash: string;

  const ownerToken = async (id = OWNER_ID, role: 'owner' | 'teacher' | 'student' = 'owner', tv = 1) =>
    new SignJWT({ role, schoolId: SCHOOL_ID, tv })
      .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('15m')
      .sign(new TextEncoder().encode(config.JWT_SECRET));

  const registerBody = (overrides: Record<string, unknown> = {}) => ({
    fullName: 'Aziza Karimova',
    email: 'aziza@maktab.uz',
    username: 'aziza',
    password: 'secure-password',
    note: '11-A sinf, 2-guruh',
    ...overrides,
  });

  beforeAll(async () => {
    passwordHash = await argon2.hash('secure-password', { memoryCost: 4096, timeCost: 1 });
  });

  beforeEach(() => {
    clearRateLimits();
    repository = new MemoryAuthRepository();
    repository.add({
      id: OWNER_ID, schoolId: SCHOOL_ID, role: 'owner', fullName: 'Sarvar',
      passwordHash, email: 'sarvar@maktab.uz', username: 'sarvar',
    });
    repository.classes.set(CLASS_ID, { schoolId: SCHOOL_ID });
    mailer = new RecordingMailer();
    app = createApp(new AuthService(repository, mailer, 'https://campath.uz'), undefined, undefined, repository);
  });

  describe('registration', () => {
    it('accepts a registration but does not hand back a session', async () => {
      const response = await request(app).post('/api/v1/auth/register').send(registerBody());
      expect(response.status).toBe(202);
      expect(response.body.status).toBe('pending');
      // The whole point of approval is that this account cannot be used yet.
      expect(response.body.accessToken).toBeUndefined();
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('stores the password hashed, never in the clear', async () => {
      await request(app).post('/api/v1/auth/register').send(registerBody());
      const created = [...repository.users.values()].find((user) => user.username === 'aziza')!;
      expect(created.passwordHash).not.toContain('secure-password');
      expect(created.passwordHash.startsWith('$argon2')).toBe(true);
      expect(await argon2.verify(created.passwordHash, 'secure-password')).toBe(true);
    });

    it('keeps the applicant note for the approver to read', async () => {
      await request(app).post('/api/v1/auth/register').send(registerBody());
      const created = [...repository.users.values()].find((user) => user.username === 'aziza')!;
      expect(created.note).toBe('11-A sinf, 2-guruh');
      // It is a claim, not a grant: the role is still the default.
      expect(created.role).toBe('student');
    });

    it('tells email and username collisions apart, since only one is the applicant to fix', async () => {
      await request(app).post('/api/v1/auth/register').send(registerBody());
      clearRateLimits();
      const sameEmail = await request(app).post('/api/v1/auth/register')
        .send(registerBody({ username: 'aziza2' }));
      expect(sameEmail.status).toBe(409);
      expect(sameEmail.body.error.code).toBe('email_taken');

      clearRateLimits();
      const sameUsername = await request(app).post('/api/v1/auth/register')
        .send(registerBody({ email: 'boshqa@maktab.uz' }));
      expect(sameUsername.status).toBe(409);
      expect(sameUsername.body.error.code).toBe('username_taken');
    });

    it('refuses a role claim smuggled into the body', async () => {
      const response = await request(app).post('/api/v1/auth/register')
        .send(registerBody({ role: 'owner' }));
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('validation_error');
    });
  });

  describe('signing in before approval', () => {
    it('says the account is waiting, and only once the password is right', async () => {
      await request(app).post('/api/v1/auth/register').send(registerBody());
      clearRateLimits();

      const wrongPassword = await request(app).post('/api/v1/auth/login')
        .send({ identifier: 'aziza@maktab.uz', password: 'wrong-password-here' });
      // A wrong password must not reveal that this address has an account at all.
      expect(wrongPassword.status).toBe(401);
      expect(wrongPassword.body.error.code).toBe('invalid_credentials');

      clearRateLimits();
      const rightPassword = await request(app).post('/api/v1/auth/login')
        .send({ identifier: 'aziza@maktab.uz', password: 'secure-password' });
      expect(rightPassword.status).toBe(403);
      expect(rightPassword.body.error.code).toBe('account_pending');
      expect(rightPassword.headers['set-cookie']).toBeUndefined();
    });

    it('passes the rejection reason back so the applicant knows what to fix', async () => {
      await request(app).post('/api/v1/auth/register').send(registerBody());
      const pending = [...repository.users.values()].find((user) => user.username === 'aziza')!;
      await request(app).post(`/api/v1/admin/users/${pending.id}/reject`)
        .set('authorization', `Bearer ${await ownerToken()}`)
        .send({ reason: 'Bu maktab o‘quvchisi emas' });

      clearRateLimits();
      const response = await request(app).post('/api/v1/auth/login')
        .send({ identifier: 'aziza@maktab.uz', password: 'secure-password' });
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('account_rejected');
      expect(response.body.error.detail).toBe('Bu maktab o‘quvchisi emas');
    });
  });

  describe('approval', () => {
    const registerPending = async () => {
      await request(app).post('/api/v1/auth/register').send(registerBody());
      clearRateLimits();
      return [...repository.users.values()].find((user) => user.username === 'aziza')!;
    };

    it('lets the owner approve, set the role and place the student in a class', async () => {
      const pending = await registerPending();
      const response = await request(app).post(`/api/v1/admin/users/${pending.id}/approve`)
        .set('authorization', `Bearer ${await ownerToken()}`)
        .send({ role: 'student', classId: CLASS_ID });

      expect(response.status).toBe(200);
      expect(response.body.user.status).toBe('active');
      expect(repository.enrollments).toContainEqual({ classId: CLASS_ID, userId: pending.id, as: 'student' });
      // The class decides the school; a self-registered account had none.
      expect(repository.users.get(pending.id)!.schoolId).toBe(SCHOOL_ID);

      const login = await request(app).post('/api/v1/auth/login')
        .send({ identifier: 'aziza@maktab.uz', password: 'secure-password' });
      expect(login.status).toBe(200);
    });

    it('enrols an approved teacher as a teacher of the class, not a student of it', async () => {
      const pending = await registerPending();
      await request(app).post(`/api/v1/admin/users/${pending.id}/approve`)
        .set('authorization', `Bearer ${await ownerToken()}`)
        .send({ role: 'teacher', classId: CLASS_ID });
      expect(repository.enrollments).toContainEqual({ classId: CLASS_ID, userId: pending.id, as: 'teacher' });
    });

    it('refuses a second approval of the same row', async () => {
      const pending = await registerPending();
      const token = await ownerToken();
      await request(app).post(`/api/v1/admin/users/${pending.id}/approve`)
        .set('authorization', `Bearer ${token}`).send({ role: 'student' });
      const again = await request(app).post(`/api/v1/admin/users/${pending.id}/approve`)
        .set('authorization', `Bearer ${token}`).send({ role: 'owner' });
      expect(again.status).toBe(409);
      expect(again.body.error.code).toBe('user_not_pending');
      // The role from the first decision stands.
      expect(repository.users.get(pending.id)!.role).toBe('student');
    });

    it('does not let a teacher approve anyone or hand out roles', async () => {
      const pending = await registerPending();
      const teacher = repository.add({
        id: randomUUID(), schoolId: SCHOOL_ID, role: 'teacher', fullName: 'Teacher', passwordHash,
        email: 'teacher@maktab.uz',
      });
      const token = await ownerToken(teacher.id, 'teacher');
      for (const path of ['approve', 'reject', 'role', 'status']) {
        const response = await request(app).post(`/api/v1/admin/users/${pending.id}/${path}`)
          .set('authorization', `Bearer ${token}`)
          .send({ role: 'owner', reason: 'x', status: 'suspended' });
        expect(response.status).toBe(403);
      }
      expect(repository.users.get(pending.id)!.status).toBe('pending');
    });

    it('refuses to let an owner suspend or demote themselves', async () => {
      const token = await ownerToken();
      const suspend = await request(app).post(`/api/v1/admin/users/${OWNER_ID}/status`)
        .set('authorization', `Bearer ${token}`).send({ status: 'suspended' });
      const demote = await request(app).post(`/api/v1/admin/users/${OWNER_ID}/role`)
        .set('authorization', `Bearer ${token}`).send({ role: 'student' });
      expect(suspend.status).toBe(409);
      expect(demote.status).toBe(409);
      expect(repository.users.get(OWNER_ID)!.role).toBe('owner');
    });

    it('ends the sessions of a suspended user rather than waiting for their token to expire', async () => {
      const pending = await registerPending();
      await request(app).post(`/api/v1/admin/users/${pending.id}/approve`)
        .set('authorization', `Bearer ${await ownerToken()}`).send({ role: 'student' });
      const login = await request(app).post('/api/v1/auth/login')
        .send({ identifier: 'aziza@maktab.uz', password: 'secure-password' });
      const accessToken = login.body.accessToken as string;

      await request(app).post(`/api/v1/admin/users/${pending.id}/status`)
        .set('authorization', `Bearer ${await ownerToken()}`)
        .send({ status: 'suspended', reason: 'Vaqtincha' });

      const after = await request(app).get('/api/v1/auth/me')
        .set('authorization', `Bearer ${accessToken}`);
      expect(after.status).toBe(401);
    });
  });

  describe('password recovery', () => {
    const approvedStudent = async () => {
      await request(app).post('/api/v1/auth/register').send(registerBody());
      clearRateLimits();
      const pending = [...repository.users.values()].find((user) => user.username === 'aziza')!;
      await request(app).post(`/api/v1/admin/users/${pending.id}/approve`)
        .set('authorization', `Bearer ${await ownerToken()}`).send({ role: 'student' });
      return pending;
    };

    it('answers identically for a known and an unknown address', async () => {
      await approvedStudent();
      const known = await request(app).post('/api/v1/auth/password/forgot').send({ email: 'aziza@maktab.uz' });
      clearRateLimits();
      const unknown = await request(app).post('/api/v1/auth/password/forgot').send({ email: 'yoq@maktab.uz' });
      expect(known.status).toBe(unknown.status);
      expect(known.body).toEqual(unknown.body);
      // Only one of them actually produced a message.
      expect(mailer.sent).toHaveLength(1);
    });

    it('resets the password through the emailed link and ends every old session', async () => {
      await approvedStudent();
      const login = await request(app).post('/api/v1/auth/login')
        .send({ identifier: 'aziza', password: 'secure-password' });
      const oldAccessToken = login.body.accessToken as string;

      clearRateLimits();
      await request(app).post('/api/v1/auth/password/forgot').send({ email: 'aziza@maktab.uz' });
      const token = mailer.lastResetToken!;
      expect(token).toBeTruthy();

      const reset = await request(app).post('/api/v1/auth/password/reset')
        .send({ token, password: 'a-brand-new-password' });
      expect(reset.status).toBe(204);

      clearRateLimits();
      const withOld = await request(app).post('/api/v1/auth/login')
        .send({ identifier: 'aziza', password: 'secure-password' });
      expect(withOld.status).toBe(401);

      clearRateLimits();
      const withNew = await request(app).post('/api/v1/auth/login')
        .send({ identifier: 'aziza', password: 'a-brand-new-password' });
      expect(withNew.status).toBe(200);

      // Whoever forced the reset should not keep the access they already had.
      const stale = await request(app).get('/api/v1/auth/me').set('authorization', `Bearer ${oldAccessToken}`);
      expect(stale.status).toBe(401);
    });

    it('burns the token on first use', async () => {
      await approvedStudent();
      clearRateLimits();
      await request(app).post('/api/v1/auth/password/forgot').send({ email: 'aziza@maktab.uz' });
      const token = mailer.lastResetToken!;
      await request(app).post('/api/v1/auth/password/reset').send({ token, password: 'first-new-password' });
      const second = await request(app).post('/api/v1/auth/password/reset')
        .send({ token, password: 'second-new-password' });
      expect(second.status).toBe(410);
      expect(second.body.error.code).toBe('reset_invalid');
    });

    it('invalidates an earlier link when a new one is requested', async () => {
      await approvedStudent();
      clearRateLimits();
      await request(app).post('/api/v1/auth/password/forgot').send({ email: 'aziza@maktab.uz' });
      const first = mailer.lastResetToken!;
      clearRateLimits();
      await request(app).post('/api/v1/auth/password/forgot').send({ email: 'aziza@maktab.uz' });
      const second = mailer.lastResetToken!;
      expect(second).not.toBe(first);

      const stale = await request(app).post('/api/v1/auth/password/reset')
        .send({ token: first, password: 'new-password-here' });
      expect(stale.status).toBe(410);
    });

    it('lets a teacher issue a code by hand when email never arrives', async () => {
      const student = await approvedStudent();
      const teacher = repository.add({
        id: randomUUID(), schoolId: SCHOOL_ID, role: 'teacher', fullName: 'Teacher', passwordHash,
        email: 'teacher@maktab.uz',
      });
      const response = await request(app).post(`/api/v1/admin/users/${student.id}/reset-code`)
        .set('authorization', `Bearer ${await ownerToken(teacher.id, 'teacher')}`).send({});
      expect(response.status).toBe(200);
      expect(response.body.token).toBeTruthy();

      const reset = await request(app).post('/api/v1/auth/password/reset')
        .send({ token: response.body.token, password: 'issued-by-teacher' });
      expect(reset.status).toBe(204);
    });

    it('will not issue a reset code for an account that was never approved', async () => {
      await request(app).post('/api/v1/auth/register').send(registerBody());
      clearRateLimits();
      const pending = [...repository.users.values()].find((user) => user.username === 'aziza')!;
      const response = await request(app).post(`/api/v1/admin/users/${pending.id}/reset-code`)
        .set('authorization', `Bearer ${await ownerToken()}`).send({});
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('user_not_active');
    });

    it('says so rather than pretending when no email provider is configured', async () => {
      const offline = createApp(
        new AuthService(repository, new ConsoleMailer(() => {}), 'https://campath.uz'),
        undefined, undefined, repository,
      );
      const response = await request(offline).post('/api/v1/auth/password/forgot')
        .send({ email: 'sarvar@maktab.uz' });
      expect(response.status).toBe(202);
      expect(response.body.emailConfigured).toBe(false);
      expect(response.body.message).toMatch(/o‘qituvchi/i);
    });

    it('does not fail the request when the provider is down', async () => {
      const broken: Mailer = {
        configured: true,
        send: vi.fn(async () => ({ delivered: false, reason: 'resend_unreachable' })),
      };
      const app2 = createApp(new AuthService(repository, broken, 'https://campath.uz'), undefined, undefined, repository);
      const response = await request(app2).post('/api/v1/auth/password/forgot')
        .send({ email: 'sarvar@maktab.uz' });
      // The token is stored either way, so the teacher-issued path still works.
      expect(response.status).toBe(202);
      expect(repository.resetTokens).toHaveLength(1);
    });
  });
});
